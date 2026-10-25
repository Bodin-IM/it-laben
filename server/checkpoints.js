import { randomUUID } from 'node:crypto';
import { assessmentPolicy } from '../src/lib/assessmentPolicy.js';
import { transaction } from './database.js';
import {
	publicResult,
	pendingDto,
	issueCheckpointQuestions,
	canonicalAnswers
} from './checkpoint-questions.js';
import { openingAccess, requireTeachingOpening, learningError } from './learning-access.js';

function problem(code, message, status = 409, retryAt = null) {
	return Object.assign(new Error(message), { code, status, retryAt });
}

function prerequisiteState(db, userId, activity) {
	const completed = new Set(
		db
			.prepare(
				'SELECT objective_id FROM progress WHERE user_id=? AND activity_id=? AND completed_at IS NOT NULL'
			)
			.all(userId, activity.id)
			.map((row) => row.objective_id)
	);
	return activity.objectives
		.filter((item) => item.required && item.kind !== 'check')
		.every((item) => completed.has(item.id));
}

function lastSubmission(db, userId, activityId, objectiveId, openingId = null) {
	return db
		.prepare(
			`SELECT * FROM checkpoint_attempts WHERE user_id=? AND activity_id=? AND objective_id=?
		AND opening_id IS ? AND submitted_at IS NOT NULL ORDER BY sequence DESC LIMIT 1`
		)
		.get(userId, activityId, objectiveId, openingId);
}

export function checkpointState(
	db,
	userId,
	activity,
	objectiveId,
	now = Date.now(),
	openingId = null
) {
	const globalCompleted =
		db
			.prepare(
				'SELECT completed_at FROM progress WHERE user_id=? AND activity_id=? AND objective_id=?'
			)
			.get(userId, activity.id, objectiveId)?.completed_at != null;
	const last = lastSubmission(db, userId, activity.id, objectiveId, openingId);
	const pending = db
		.prepare(
			'SELECT id FROM checkpoint_attempts WHERE user_id=? AND activity_id=? AND objective_id=? AND opening_id IS ? AND submitted_at IS NULL'
		)
		.get(userId, activity.id, objectiveId, openingId);
	const opening = openingId ? openingAccess(db, activity.id, openingId, 'teaching', now) : null;
	const completed = openingId ? last?.passed === 1 : globalCompleted;
	const prerequisitesMet = openingId
		? !!(pending || last || opening?.active)
		: prerequisiteState(db, userId, activity);
	const retryAt = !openingId && last ? last.submitted_at + assessmentPolicy.cooldownMs : null;
	return {
		completed,
		prerequisitesMet,
		canStart:
			!completed &&
			prerequisitesMet &&
			(!openingId || !last) &&
			(retryAt === null || now >= retryAt),
		openingId,
		openingUsed: !!openingId && !!last,
		openingClosed: !!openingId && !opening?.active,
		hasPending: !!pending,
		nextAttemptAt: !completed && retryAt !== null && now < retryAt ? retryAt : null,
		lastResult: publicResult(last)
	};
}

export function openCheckpoint(
	db,
	userId,
	activity,
	objectiveId,
	now = Date.now(),
	openingId = null
) {
	if (!activity.objectives.some((item) => item.id === objectiveId && item.kind === 'check'))
		throw new TypeError('Ukjent fagsjekk. Last siden på nytt.');
	return transaction(db, () => {
		const state = checkpointState(db, userId, activity, objectiveId, now, openingId);
		if (state.completed) return { assessment: null, state };
		if (openingId && state.openingUsed)
			throw learningError('OPENING_USED', 'Undervisningsforsøket i denne åpningen er brukt.');
		if (openingId && !state.hasPending) requireTeachingOpening(db, activity.id, openingId, now);
		if (!state.prerequisitesMet)
			throw problem(
				'ASSESSMENT_PREREQUISITE',
				'Gjennomgå leksjonen eller løs spilloppdragene før fagsjekken.'
			);
		if (!state.canStart)
			throw problem(
				'CHECKPOINT_COOLDOWN',
				'Forsøket er brukt. Les tilbakemeldingen og prøv igjen når det har gått 24 timer.',
				429,
				state.nextAttemptAt
			);
		const pending = db
			.prepare(
				'SELECT * FROM checkpoint_attempts WHERE user_id=? AND activity_id=? AND objective_id=? AND opening_id IS ? AND submitted_at IS NULL'
			)
			.get(userId, activity.id, objectiveId, openingId);
		if (pending) return { assessment: pendingDto(pending), state };
		const previous = lastSubmission(db, userId, activity.id, objectiveId, openingId);
		const questions = issueCheckpointQuestions(
			activity.id,
			previous ? JSON.parse(previous.questions_json) : []
		);
		const sequence =
			Number(
				db
					.prepare(
						'SELECT COALESCE(MAX(sequence),0) AS n FROM checkpoint_attempts WHERE user_id=? AND activity_id=? AND objective_id=?'
					)
					.get(userId, activity.id, objectiveId).n
			) + 1;
		const row = {
			id: randomUUID(),
			user_id: userId,
			activity_id: activity.id,
			objective_id: objectiveId,
			sequence,
			issued_at: now,
			questions_json: JSON.stringify(questions)
		};
		db.prepare(
			'INSERT INTO checkpoint_attempts (id,user_id,activity_id,objective_id,sequence,issued_at,questions_json,opening_id) VALUES (?,?,?,?,?,?,?,?)'
		).run(row.id, userId, activity.id, objectiveId, sequence, now, row.questions_json, openingId);
		return { assessment: pendingDto(row), state: { ...state, hasPending: true } };
	});
}

/** Called inside the same SQLite transaction as progress, XP and the event receipt. */
export function gradeCheckpoint(
	db,
	userId,
	activity,
	objectiveId,
	attemptId,
	answers,
	now = Date.now()
) {
	const row =
		typeof attemptId === 'string'
			? db
					.prepare(
						'SELECT * FROM checkpoint_attempts WHERE id=? AND user_id=? AND activity_id=? AND objective_id=?'
					)
					.get(attemptId, userId, activity.id, objectiveId)
			: null;
	if (!row)
		throw problem(
			'ASSESSMENT_UNKNOWN',
			'Åpne fagsjekken før du leverer. Last siden på nytt hvis forsøket er endret.',
			404
		);
	const questions = JSON.parse(row.questions_json);
	const canonical = canonicalAnswers(questions, answers);
	if (row.submitted_at !== null) {
		if (canonical !== row.answers_json)
			throw problem(
				'ASSESSMENT_ALREADY_SUBMITTED',
				'Forsøket er allerede levert. Du kan ikke endre svarene etterpå.'
			);
		return { passed: row.passed === 1, duplicate: true, result: publicResult(row) };
	}
	const state = checkpointState(db, userId, activity, objectiveId, now, row.opening_id);
	if (state.completed) throw problem('ASSESSMENT_COMPLETED', 'Fagsjekken er allerede bestått.');
	if (!state.prerequisitesMet)
		throw problem(
			'ASSESSMENT_PREREQUISITE',
			'Gjennomgå leksjonen eller løs spilloppdragene før fagsjekken.'
		);
	if (!state.canStart)
		throw problem(
			'CHECKPOINT_COOLDOWN',
			'Du må vente 24 timer etter forrige innsending før neste forsøk.',
			429,
			state.nextAttemptAt
		);
	const score = questions.filter((item) => answers[item.id] === item.correctChoiceId).length;
	const passed = score === questions.length;
	db.prepare(
		'UPDATE checkpoint_attempts SET submitted_at=?,answers_json=?,score=?,passed=? WHERE id=? AND opening_id IS ? AND submitted_at IS NULL'
	).run(now, canonical, score, passed ? 1 : 0, row.id, row.opening_id);
	return {
		passed,
		duplicate: false,
		result: publicResult({
			...row,
			submitted_at: now,
			answers_json: canonical,
			score,
			passed: passed ? 1 : 0
		})
	};
}
