import { randomInt, randomUUID, randomBytes } from 'node:crypto';
import { checkpoints } from '../src/lib/checkpoints.js';
import { assessmentPolicy } from '../src/lib/assessmentPolicy.js';
import { assessmentBanks } from './assessment-bank.js';
import { transaction } from './database.js';

for (const definition of checkpoints) {
	const bank = assessmentBanks[definition.activityId];
	if (
		!bank ||
		bank.questions.length <= assessmentPolicy.questionsPerAttempt ||
		new Set(bank.questions.map((item) => item.id)).size !== bank.questions.length ||
		bank.questions.some(
			(item) =>
				item.choices.length < 3 || item.choices.filter((choice) => choice.correct).length !== 1
		)
	)
		throw new Error(
			`Fagsjekken ${definition.activityId}:${definition.id} trenger en gyldig og variert spørsmålsbank.`
		);
}

function problem(code, message, status = 409, retryAt = null) {
	return Object.assign(new Error(message), { code, status, retryAt });
}

function shuffle(items) {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
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

function lastSubmission(db, userId, activityId, objectiveId) {
	return db
		.prepare(
			`SELECT * FROM checkpoint_attempts WHERE user_id=? AND activity_id=? AND objective_id=?
		AND submitted_at IS NOT NULL ORDER BY sequence DESC LIMIT 1`
		)
		.get(userId, activityId, objectiveId);
}

function publicResult(row) {
	if (!row) return null;
	const questions = JSON.parse(row.questions_json);
	const answers = JSON.parse(row.answers_json);
	return {
		id: row.id,
		submittedAt: row.submitted_at,
		score: row.score,
		total: questions.length,
		passed: row.passed === 1,
		questions: questions.map((item) => ({
			prompt: item.prompt,
			selectedLabel: item.choices.find((choice) => choice.id === answers[item.id]).label,
			correctLabel: item.choices.find((choice) => choice.id === item.correctChoiceId).label,
			explanation: item.explanation,
			correct: answers[item.id] === item.correctChoiceId
		}))
	};
}

export function checkpointState(db, userId, activity, objectiveId, now = Date.now()) {
	const completed =
		db
			.prepare(
				'SELECT completed_at FROM progress WHERE user_id=? AND activity_id=? AND objective_id=?'
			)
			.get(userId, activity.id, objectiveId)?.completed_at != null;
	const last = lastSubmission(db, userId, activity.id, objectiveId);
	const pending = db
		.prepare(
			'SELECT id FROM checkpoint_attempts WHERE user_id=? AND activity_id=? AND objective_id=? AND submitted_at IS NULL'
		)
		.get(userId, activity.id, objectiveId);
	const prerequisitesMet = prerequisiteState(db, userId, activity);
	const retryAt = last ? last.submitted_at + assessmentPolicy.cooldownMs : null;
	return {
		completed,
		prerequisitesMet,
		canStart: !completed && prerequisitesMet && (retryAt === null || now >= retryAt),
		hasPending: !!pending,
		nextAttemptAt: !completed && retryAt !== null && now < retryAt ? retryAt : null,
		lastResult: publicResult(last)
	};
}

function pendingDto(row) {
	return {
		id: row.id,
		number: row.sequence,
		questions: JSON.parse(row.questions_json).map((item) => ({
			id: item.id,
			prompt: item.prompt,
			choices: item.choices
		}))
	};
}

export function openCheckpoint(db, userId, activity, objectiveId, now = Date.now()) {
	if (!activity.objectives.some((item) => item.id === objectiveId && item.kind === 'check'))
		throw new TypeError('Ukjent fagsjekk. Last siden på nytt.');
	return transaction(db, () => {
		const state = checkpointState(db, userId, activity, objectiveId, now);
		if (state.completed) return { assessment: null, state };
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
				'SELECT * FROM checkpoint_attempts WHERE user_id=? AND activity_id=? AND objective_id=? AND submitted_at IS NULL'
			)
			.get(userId, activity.id, objectiveId);
		if (pending) return { assessment: pendingDto(pending), state };
		const bank = assessmentBanks[activity.id];
		if (!bank) throw new Error('Spørsmålsbanken mangler.');
		const previous = lastSubmission(db, userId, activity.id, objectiveId);
		const previousQuestions = previous ? JSON.parse(previous.questions_json) : [];
		const pool = shuffle(bank.questions);
		const selected = pool.slice(0, assessmentPolicy.questionsPerAttempt);
		const priorIds = new Set(previousQuestions.map((item) => item.sourceId));
		if (selected.every((item) => priorIds.has(item.id)) && pool.length > selected.length)
			selected[randomInt(selected.length)] = pool[selected.length];
		const questions = selected.map((item) => {
			let choices = shuffle(item.choices);
			const prior = previousQuestions.find((question) => question.sourceId === item.id);
			if (
				prior &&
				choices.findIndex((choice) => choice.correct) ===
					prior.choices.findIndex((choice) => choice.id === prior.correctChoiceId)
			)
				choices = [...choices.slice(1), choices[0]];
			const issued = choices.map((choice) => ({
				id: randomBytes(12).toString('hex'),
				label: choice.label,
				correct: choice.correct
			}));
			return {
				id: randomUUID(),
				sourceId: item.id,
				prompt: item.prompt,
				explanation: item.explanation,
				correctChoiceId: issued.find((choice) => choice.correct).id,
				choices: issued.map(({ id, label }) => ({ id, label }))
			};
		});
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
			'INSERT INTO checkpoint_attempts (id,user_id,activity_id,objective_id,sequence,issued_at,questions_json) VALUES (?,?,?,?,?,?,?)'
		).run(row.id, userId, activity.id, objectiveId, sequence, now, row.questions_json);
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
	if (
		!answers ||
		typeof answers !== 'object' ||
		Array.isArray(answers) ||
		Object.keys(answers).length !== questions.length ||
		questions.some(
			(item) =>
				!Object.hasOwn(answers, item.id) ||
				!item.choices.some((choice) => choice.id === answers[item.id])
		)
	)
		throw new TypeError('Velg ett svar på hvert spørsmål før du leverer.');
	const canonical = JSON.stringify(
		Object.fromEntries(Object.entries(answers).sort(([a], [b]) => a.localeCompare(b)))
	);
	if (row.submitted_at !== null) {
		if (canonical !== row.answers_json)
			throw problem(
				'ASSESSMENT_ALREADY_SUBMITTED',
				'Forsøket er allerede levert. Du kan ikke endre svarene etterpå.'
			);
		return { passed: row.passed === 1, duplicate: true, result: publicResult(row) };
	}
	const state = checkpointState(db, userId, activity, objectiveId, now);
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
		'UPDATE checkpoint_attempts SET submitted_at=?,answers_json=?,score=?,passed=? WHERE id=? AND submitted_at IS NULL'
	).run(now, canonical, score, passed ? 1 : 0, row.id);
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
