import { randomUUID, createHash } from 'node:crypto';
import { transaction } from './database.js';
import { catalog, checkSubmission, CONTENT_VERSION } from './catalog.js';
import { timedDefinition, timedAdapters, buildTimedReport } from './timed-challenges.js';
import { checkpointState } from './checkpoints.js';
import { progressSnapshot } from './progress.js';
import {
	publicResult,
	pendingDto,
	issueCheckpointQuestions,
	canonicalAnswers
} from './checkpoint-questions.js';
import {
	practiceAccess,
	requirePractice,
	learningError,
	openingAccess
} from './learning-access.js';

export function learningActivity(
	db,
	userId,
	activityId,
	now = Date.now(),
	mode = 'practice',
	openingId = null
) {
	const activity = catalog.find((item) => item.id === activityId);
	if (!activity) throw new TypeError('Ukjent aktivitet.');
	if (mode === 'teaching') {
		const opening = openingAccess(db, activityId, openingId, 'teaching', now);
		if (!opening)
			throw learningError('OPENING_UNKNOWN', 'Denne undervisningsåpningen finnes ikke.');
		const normal = progressSnapshot(db, userId, now).find((item) => item.id === activityId);
		return {
			...normal,
			objectives: normal.objectives.map((item) =>
				item.kind === 'check'
					? { ...item, assessment: checkpointState(db, userId, activity, item.id, now, openingId) }
					: item
			)
		};
	}
	const rows = db
		.prepare('SELECT * FROM practice_progress WHERE user_id=? AND activity_id=?')
		.all(userId, activityId);
	const objectives = activity.objectives.map((item) => {
		const row = rows.find((value) => value.objective_id === item.id);
		return {
			...item,
			completedAt: row?.completed_at ?? null,
			updatedAt: row?.updated_at ?? null,
			solution: row?.solution_json ? JSON.parse(row.solution_json) : null,
			...(item.kind === 'check'
				? { assessment: practiceCheckState(db, userId, activityId, item.id, now) }
				: {})
		};
	});
	const required = objectives.filter((item) => item.required);
	const completed = required.filter((item) => item.completedAt !== null).length;
	return {
		...activity,
		objectives,
		completed,
		total: required.length,
		checksCompleted: objectives.filter((item) => item.kind === 'check' && item.completedAt !== null)
			.length,
		checksTotal: objectives.filter((item) => item.kind === 'check').length,
		creditEligible: false,
		pendingXp: 0,
		status:
			completed === required.length
				? activity.completionEvidence === 'reviewed'
					? 'reviewed'
					: 'passed'
				: rows.length
					? 'started'
					: 'new'
	};
}
function latest(db, userId, activityId, objectiveId) {
	return db
		.prepare(
			'SELECT * FROM practice_runs WHERE user_id=? AND activity_id=? AND objective_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1'
		)
		.get(userId, activityId, objectiveId);
}
function ownRun(db, userId, activityId, objectiveId, attemptId) {
	const row =
		typeof attemptId === 'string'
			? db
					.prepare(
						'SELECT * FROM practice_runs WHERE id=? AND user_id=? AND activity_id=? AND objective_id=?'
					)
					.get(attemptId, userId, activityId, objectiveId)
			: null;
	if (!row || row.status === 'abandoned')
		throw learningError(
			'PRACTICE_UNKNOWN',
			'Dette øvingsforsøket finnes ikke eller er erstattet. Oppdater siden.',
			404
		);
	return row;
}
function checkpointRow(row) {
	return {
		id: row.id,
		sequence: row.revision + 1,
		questions_json: row.snapshot_json,
		submitted_at: row.ended_at,
		answers_json: row.final_json,
		score: row.result_json ? JSON.parse(row.result_json).score : null,
		passed: row.status === 'passed' ? 1 : 0
	};
}
function practiceCheckState(db, userId, activityId, objectiveId, now) {
	const access = practiceAccess(db, userId, activityId, now);
	const row = latest(db, userId, activityId, objectiveId);
	return {
		completed: row?.status === 'passed',
		prerequisitesMet: access.allowed || row?.status === 'active',
		canStart: access.allowed || row?.status === 'active',
		hasPending: row?.status === 'active',
		nextAttemptAt: null,
		lastResult: row?.result_json ? JSON.parse(row.result_json) : null,
		practice: true,
		openingClosed: !access.allowed
	};
}
export function openPracticeCheckpoint(db, userId, activityId, body, now = Date.now()) {
	const activity = catalog.find((item) => item.id === activityId);
	if (!activity?.objectives.some((item) => item.id === body.objectiveId && item.kind === 'check'))
		throw new TypeError('Ukjent fagsjekk.');
	return transaction(db, () => {
		const previous = latest(db, userId, activityId, body.objectiveId);
		if (previous?.status === 'active' && !body.reset)
			return {
				assessment: pendingDto(checkpointRow(previous)),
				activity: learningActivity(db, userId, activityId, now)
			};
		const access = requirePractice(db, userId, activityId, now);
		if (previous?.status === 'active')
			db.prepare("UPDATE practice_runs SET status='abandoned',ended_at=? WHERE id=?").run(
				now,
				previous.id
			);
		const questions = issueCheckpointQuestions(
			activityId,
			previous ? JSON.parse(previous.snapshot_json) : []
		);
		const id = randomUUID();
		db.prepare(
			"INSERT INTO practice_runs(id,user_id,activity_id,objective_id,kind,opening_id,start_key,created_at,status,snapshot_json) VALUES (?,?,?,?,'check',?,?,?,'active',?)"
		).run(
			id,
			userId,
			activityId,
			body.objectiveId,
			access.opening?.id ?? null,
			randomUUID(),
			now,
			JSON.stringify(questions)
		);
		db.prepare(
			'DELETE FROM practice_progress WHERE user_id=? AND activity_id=? AND objective_id=?'
		).run(userId, activityId, body.objectiveId);
		const row = db.prepare('SELECT * FROM practice_runs WHERE id=?').get(id);
		return {
			assessment: pendingDto(checkpointRow(row)),
			activity: learningActivity(db, userId, activityId, now)
		};
	});
}
function finishTimed(db, row, answers, now, expired = false) {
	const definition = timedDefinition(row.activity_id);
	const report = buildTimedReport(
		JSON.parse(row.snapshot_json),
		definition,
		{ id: row.id, started_at: row.created_at, deadline_at: row.deadline_at },
		answers,
		now,
		expired
	);
	db.prepare(
		'UPDATE practice_runs SET status=?,final_json=?,draft_json=?,ended_at=?,result_json=?,revision=revision+1 WHERE id=?'
	).run(
		report.reason,
		JSON.stringify(answers),
		JSON.stringify(answers),
		report.endedAt,
		JSON.stringify(report),
		row.id
	);
	return report;
}
function expire(db, row, now) {
	if (row?.status === 'active' && row.deadline_at !== null && now >= row.deadline_at) {
		finishTimed(db, row, JSON.parse(row.draft_json), now, true);
		return db.prepare('SELECT * FROM practice_runs WHERE id=?').get(row.id);
	}
	return row;
}
function timedState(db, userId, activityId, now) {
	const definition = timedDefinition(activityId);
	const row = expire(db, latest(db, userId, activityId, definition.objectiveId), now);
	const access = practiceAccess(db, userId, activityId, now);
	return {
		unlocked: access.allowed || !!row,
		access: {
			mode: 'practice',
			canStart: access.allowed,
			canRestart: access.allowed,
			closed: !access.allowed,
			used: false,
			endsAt: access.opening?.closesAt ?? null,
			teacher: access.teacher
		},
		prerequisites: [],
		active:
			row?.status === 'active'
				? {
						id: row.id,
						startedAt: row.created_at,
						deadlineAt: row.deadline_at,
						untimed: row.deadline_at === null,
						revision: row.revision,
						scenario: timedAdapters[definition.adapter].public(JSON.parse(row.snapshot_json)),
						answers: JSON.parse(row.draft_json)
					}
				: null,
		report: row?.result_json ? JSON.parse(row.result_json) : null,
		nextAttemptAt: null,
		bestMs: null,
		attempts: Number(
			db
				.prepare('SELECT count(*) AS n FROM practice_runs WHERE user_id=? AND activity_id=?')
				.get(userId, activityId).n
		)
	};
}
export function getPracticeTimed(db, userId, activityId, now = Date.now()) {
	return transaction(db, () => ({
		serverNow: now,
		state: timedState(db, userId, activityId, now)
	}));
}
export function startPracticeTimed(db, userId, activityId, body, now = Date.now()) {
	const definition = timedDefinition(activityId);
	if (typeof body.startId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.startId))
		throw new TypeError('Starten mangler hendelses-ID.');
	return transaction(db, () => {
		const current = timedState(db, userId, activityId, now);
		if (
			db
				.prepare('SELECT id FROM practice_runs WHERE user_id=? AND activity_id=? AND start_key=?')
				.get(userId, activityId, body.startId)
		)
			return { serverNow: now, state: current };
		if (current.active && !body.reset) return { serverNow: now, state: current };
		const access = requirePractice(db, userId, activityId, now);
		if (body.untimed === true && !access.teacher)
			throw learningError('TEACHER_REQUIRED', 'Test uten tidsfrist krever lærertilgang.', 403);
		const previous = latest(db, userId, activityId, definition.objectiveId);
		if (current.active)
			db.prepare("UPDATE practice_runs SET status='abandoned',ended_at=? WHERE id=?").run(
				now,
				current.active.id
			);
		const snapshot = timedAdapters[definition.adapter].create(
			previous ? JSON.parse(previous.snapshot_json) : null
		);
		db.prepare(
			"INSERT INTO practice_runs(id,user_id,activity_id,objective_id,kind,opening_id,start_key,created_at,deadline_at,status,snapshot_json) VALUES (?,?,?,?,'timed',?,?,?,?,'active',?)"
		).run(
			randomUUID(),
			userId,
			activityId,
			definition.objectiveId,
			access.opening?.id ?? null,
			body.startId,
			now,
			body.untimed === true ? null : now + definition.durationMs,
			JSON.stringify(snapshot)
		);
		return { serverNow: now, state: timedState(db, userId, activityId, now) };
	});
}
export function savePracticeTimed(db, userId, activityId, body, now = Date.now()) {
	const definition = timedDefinition(activityId);
	return transaction(db, () => {
		const row = expire(
			db,
			ownRun(db, userId, activityId, definition.objectiveId, body.attemptId),
			now
		);
		if (row.status !== 'active')
			return { serverNow: now, state: timedState(db, userId, activityId, now) };
		const answers = timedAdapters[definition.adapter].validate(
			JSON.parse(row.snapshot_json),
			body.answers
		);
		if (!Number.isInteger(body.revision)) throw new TypeError('Utkastet mangler versjon.');
		if (body.revision !== row.revision) {
			if (body.revision < row.revision && JSON.stringify(answers) === row.draft_json)
				return { serverNow: now, state: timedState(db, userId, activityId, now) };
			throw learningError(
				'TIMED_DRAFT_CONFLICT',
				'Arbeidet er endret i en annen fane. Hent det lagrede utkastet før du fortsetter.'
			);
		}
		db.prepare('UPDATE practice_runs SET draft_json=?,revision=revision+1 WHERE id=?').run(
			JSON.stringify(answers),
			row.id
		);
		return { serverNow: now, state: timedState(db, userId, activityId, now) };
	});
}
function gradeRun(db, userId, activity, objective, body, now) {
	const row = ownRun(db, userId, activity.id, objective.id, body.attemptId);
	if (objective.kind === 'check') {
		const questions = JSON.parse(row.snapshot_json);
		const canonical = canonicalAnswers(questions, body.solution);
		if (row.status !== 'active') {
			if (row.final_json !== canonical)
				throw learningError(
					'PRACTICE_SUBMITTED',
					'Øvingsforsøket er levert. Åpne et nytt forsøk for å prøve igjen.'
				);
			return { passed: row.status === 'passed', assessmentResult: JSON.parse(row.result_json) };
		}
		const score = questions.filter(
			(item) => body.solution[item.id] === item.correctChoiceId
		).length;
		const passed = score === questions.length;
		const result = publicResult({
			...checkpointRow(row),
			submitted_at: now,
			answers_json: canonical,
			score,
			passed: passed ? 1 : 0
		});
		db.prepare(
			'UPDATE practice_runs SET status=?,final_json=?,result_json=?,ended_at=? WHERE id=?'
		).run(passed ? 'passed' : 'failed', canonical, JSON.stringify(result), now, row.id);
		return { passed, assessmentResult: result };
	}
	if (row.status !== 'active') {
		if (
			row.status !== 'expired' &&
			JSON.stringify(
				timedAdapters[timedDefinition(activity.id).adapter].validate(
					JSON.parse(row.snapshot_json),
					body.answers,
					true
				)
			) !== row.final_json
		)
			throw learningError('PRACTICE_SUBMITTED', 'Øvingsforsøket er allerede levert.');
		return { passed: row.status === 'passed', timedReport: JSON.parse(row.result_json) };
	}
	const expired = row.deadline_at !== null && now >= row.deadline_at;
	const answers = expired
		? JSON.parse(row.draft_json)
		: timedAdapters[timedDefinition(activity.id).adapter].validate(
				JSON.parse(row.snapshot_json),
				body.answers,
				true
			);
	const report = finishTimed(db, row, answers, now, expired);
	return { passed: report.passed, timedReport: report };
}
export function submitPractice(db, userId, activityId, body, now = Date.now()) {
	if (
		typeof body?.eventId !== 'string' ||
		!/^[0-9a-f-]{36}$/i.test(body.eventId) ||
		body.version !== CONTENT_VERSION ||
		body.activityId !== activityId
	)
		throw new TypeError('Ugyldig øvingsinnsending.');
	const hash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
	return transaction(db, () => {
		const previous = db
			.prepare('SELECT * FROM practice_receipts WHERE user_id=? AND event_id=?')
			.get(userId, body.eventId);
		if (previous) {
			if (hash !== previous.request_hash)
				throw learningError('EVENT_CONFLICT', 'Hendelsen er allerede brukt til andre valg.');
			return {
				...JSON.parse(previous.result_json),
				duplicate: true,
				activity: learningActivity(db, userId, activityId, now)
			};
		}
		const activity = catalog.find((item) => item.id === activityId);
		const objective = activity?.objectives.find((item) => item.id === body.objectiveId);
		if (
			!objective ||
			(body.kind !== objective.kind && !(body.kind === 'start' && objective.kind === 'review'))
		)
			throw new TypeError('Ukjent øvingsoppdrag.');
		let result;
		let solution = null;
		if (['check', 'timed'].includes(objective.kind))
			result = gradeRun(db, userId, activity, objective, body, now);
		else {
			requirePractice(db, userId, activityId, now);
			const checked = checkSubmission(body, { db, userId, now });
			result = { passed: checked.passed };
			solution = checked.solution;
		}
		db.prepare(
			`INSERT INTO practice_progress VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,activity_id,objective_id) DO UPDATE SET completed_at=excluded.completed_at,updated_at=excluded.updated_at,solution_json=excluded.solution_json`
		).run(
			userId,
			activityId,
			objective.id,
			result.passed ? now : null,
			now,
			solution === null ? null : JSON.stringify(solution)
		);
		const receipt = { ...result, newRewards: [], newAchievements: [] };
		db.prepare('INSERT INTO practice_receipts VALUES (?,?,?,?,?)').run(
			userId,
			body.eventId,
			hash,
			JSON.stringify(receipt),
			now
		);
		return {
			...receipt,
			duplicate: false,
			activity: learningActivity(db, userId, activityId, now)
		};
	});
}
