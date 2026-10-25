import { randomUUID } from 'node:crypto';
import { transaction } from './database.js';
import { timedChallenges } from '../src/lib/timedChallenges.js';
import { createNightwatch, publicScenario, validateDraft, gradeNightwatch } from './nightwatch.js';

/** Register future operations scenarios here; timing, storage and rewards remain shared. */
export const timedAdapters = {
	'production-v1': {
		create: createNightwatch,
		public: publicScenario,
		validate: validateDraft,
		grade: gradeNightwatch
	}
};
for (const item of timedChallenges) {
	if (
		!timedAdapters[item.adapter] ||
		item.durationMs <= 0 ||
		item.cooldownMs < item.durationMs ||
		item.points <= 0
	)
		throw new Error(`Ugyldig tidsutfordring: ${item.id}`);
}
function problem(code, message, status = 409, retryAt = null) {
	return Object.assign(new Error(message), { code, status, retryAt });
}
export function timedDefinition(activityId) {
	const definition = timedChallenges.find((item) => item.id === activityId);
	if (!definition) throw new TypeError('Ukjent tidsutfordring.');
	return definition;
}
function prerequisites(db, userId, definition) {
	return definition.prerequisites.map((item) => ({
		...item,
		completed:
			db
				.prepare(
					'SELECT completed_at FROM progress WHERE user_id=? AND activity_id=? AND objective_id=?'
				)
				.get(userId, item.activityId, item.objectiveId)?.completed_at != null
	}));
}
function latest(db, userId, activityId) {
	return db
		.prepare(
			'SELECT * FROM timed_attempts WHERE user_id=? AND activity_id=? ORDER BY started_at DESC,rowid DESC LIMIT 1'
		)
		.get(userId, activityId);
}
function finish(db, row, definition, answers, now, expired = false) {
	const adapter = timedAdapters[definition.adapter];
	const incidents = adapter.grade(JSON.parse(row.scenario_json), answers);
	if (
		!Array.isArray(incidents) ||
		!incidents.length ||
		new Set(incidents.map((item) => item.id)).size !== incidents.length ||
		incidents.some(
			(item) =>
				typeof item.passed !== 'boolean' ||
				!Array.isArray(item.checks) ||
				!item.checks.length ||
				item.checks.some((check) => typeof check.passed !== 'boolean') ||
				item.passed !== item.checks.every((check) => check.passed)
		)
	)
		throw new Error('En tidsvalidator må gi synkrone kontrollresultater med true eller false.');
	const passed = !expired && incidents.every((item) => item.passed);
	const reason = expired ? 'expired' : passed ? 'passed' : 'failed';
	const endedAt = expired ? row.deadline_at : now;
	const report = {
		attemptId: row.id,
		reason,
		passed,
		score: incidents.filter((item) => item.passed).length,
		total: incidents.length,
		elapsedMs: endedAt - row.started_at,
		endedAt,
		incidents
	};
	db.prepare(
		`UPDATE timed_attempts SET status=?,final_answers_json=?,draft_json=?,ended_at=?,report_json=?,revision=revision+1 WHERE id=? AND status='active'`
	).run(
		reason,
		JSON.stringify(answers),
		JSON.stringify(answers),
		endedAt,
		JSON.stringify(report),
		row.id
	);
	return report;
}
/** Expiration is deterministic and survives process restart; no in-memory job owns the clock. */
function expire(db, row, definition, now) {
	if (row?.status === 'active' && now >= row.deadline_at) {
		finish(db, row, definition, JSON.parse(row.draft_json), now, true);
		return db.prepare('SELECT * FROM timed_attempts WHERE id=?').get(row.id);
	}
	return row;
}
function state(db, userId, definition, now) {
	const row = expire(db, latest(db, userId, definition.id), definition, now);
	const required = prerequisites(db, userId, definition);
	const best = db
		.prepare(
			"SELECT MIN(ended_at-started_at) AS ms FROM timed_attempts WHERE user_id=? AND activity_id=? AND status='passed'"
		)
		.get(userId, definition.id);
	return {
		unlocked: required.every((item) => item.completed),
		prerequisites: required,
		active:
			row?.status === 'active'
				? {
						id: row.id,
						startedAt: row.started_at,
						deadlineAt: row.deadline_at,
						revision: row.revision,
						scenario: timedAdapters[definition.adapter].public(JSON.parse(row.scenario_json)),
						answers: JSON.parse(row.draft_json)
					}
				: null,
		report: row?.report_json ? JSON.parse(row.report_json) : null,
		nextAttemptAt:
			row && now < row.started_at + definition.cooldownMs
				? row.started_at + definition.cooldownMs
				: null,
		attempts: Number(
			db
				.prepare('SELECT count(*) AS n FROM timed_attempts WHERE user_id=? AND activity_id=?')
				.get(userId, definition.id).n
		),
		bestMs: best.ms ?? null
	};
}
export function getTimedState(db, userId, activityId, now = Date.now()) {
	const definition = timedDefinition(activityId);
	return transaction(db, () => ({ serverNow: now, state: state(db, userId, definition, now) }));
}
export function startTimedChallenge(db, userId, activityId, startId, now = Date.now()) {
	const definition = timedDefinition(activityId);
	if (typeof startId !== 'string' || !/^[0-9a-f-]{36}$/i.test(startId))
		throw new TypeError('Starten mangler en gyldig hendelses-ID.');
	return transaction(db, () => {
		const current = state(db, userId, definition, now);
		const previousStart = db
			.prepare('SELECT id FROM timed_attempts WHERE user_id=? AND activity_id=? AND start_key=?')
			.get(userId, activityId, startId);
		if (previousStart || current.active) return { serverNow: now, state: current };
		if (!current.unlocked)
			throw problem('TIMED_LOCKED', 'Bestå de tre forberedende fagsjekkene før du starter vakten.');
		if (current.nextAttemptAt)
			throw problem(
				'TIMED_COOLDOWN',
				'Du har brukt dagens vakt. Neste forsøk åpner 24 timer etter starten.',
				429,
				current.nextAttemptAt
			);
		const previous = latest(db, userId, activityId);
		const scenario = timedAdapters[definition.adapter].create(
			previous ? JSON.parse(previous.scenario_json) : null
		);
		db.prepare(
			`INSERT INTO timed_attempts (id,user_id,activity_id,start_key,started_at,deadline_at,status,scenario_json) VALUES (?,?,?,?,?,?,'active',?)`
		).run(
			randomUUID(),
			userId,
			activityId,
			startId,
			now,
			now + definition.durationMs,
			JSON.stringify(scenario)
		);
		db.prepare(
			`INSERT INTO progress (user_id,activity_id,objective_id,updated_at) VALUES (?,?,?,?)
			ON CONFLICT(user_id,activity_id,objective_id) DO UPDATE SET updated_at=excluded.updated_at`
		).run(userId, activityId, definition.objectiveId, now);
		return { serverNow: now, state: state(db, userId, definition, now) };
	});
}
function ownAttempt(db, userId, activityId, attemptId) {
	const row =
		typeof attemptId === 'string'
			? db
					.prepare('SELECT * FROM timed_attempts WHERE id=? AND user_id=? AND activity_id=?')
					.get(attemptId, userId, activityId)
			: null;
	if (!row)
		throw problem(
			'TIMED_UNKNOWN',
			'Denne vakten finnes ikke på profilen din. Oppdater statusen.',
			404
		);
	return row;
}
export function saveTimedDraft(db, userId, activityId, body, now = Date.now()) {
	const definition = timedDefinition(activityId);
	return transaction(db, () => {
		let row = ownAttempt(db, userId, activityId, body.attemptId);
		row = expire(db, row, definition, now);
		if (row.status !== 'active')
			return { serverNow: now, state: state(db, userId, definition, now) };
		const answers = timedAdapters[definition.adapter].validate(
			JSON.parse(row.scenario_json),
			body.answers
		);
		if (!Number.isInteger(body.revision))
			throw new TypeError('Utkastet mangler en gyldig versjon.');
		if (body.revision !== row.revision) {
			if (body.revision < row.revision && JSON.stringify(answers) === row.draft_json)
				return { serverNow: now, state: state(db, userId, definition, now) };
			throw problem(
				'TIMED_DRAFT_CONFLICT',
				'Arbeidet er endret i en annen fane. Hent det lagrede utkastet før du fortsetter.'
			);
		}
		db.prepare('UPDATE timed_attempts SET draft_json=?,revision=revision+1 WHERE id=?').run(
			JSON.stringify(answers),
			row.id
		);
		return { serverNow: now, state: state(db, userId, definition, now) };
	});
}
/** Called inside the progress/XP/receipt transaction. Client clocks and passed/points flags are ignored. */
export function gradeTimedSubmission(db, userId, activityId, attemptId, answers, now = Date.now()) {
	const definition = timedDefinition(activityId);
	const row = ownAttempt(db, userId, activityId, attemptId);
	if (row.status !== 'active') {
		if (row.status === 'expired')
			return { passed: false, timedReport: JSON.parse(row.report_json) };
		const canonical = JSON.stringify(
			timedAdapters[definition.adapter].validate(JSON.parse(row.scenario_json), answers, true)
		);
		if (canonical !== row.final_answers_json)
			throw problem('TIMED_SUBMITTED', 'Vaktrapporten er levert. Svarene kan ikke endres etterpå.');
		return { passed: row.status === 'passed', timedReport: JSON.parse(row.report_json) };
	}
	if (now >= row.deadline_at) {
		const report = finish(db, row, definition, JSON.parse(row.draft_json), now, true);
		return { passed: false, timedReport: report };
	}
	const canonical = timedAdapters[definition.adapter].validate(
		JSON.parse(row.scenario_json),
		answers,
		true
	);
	const report = finish(db, row, definition, canonical, now);
	return { passed: report.passed, timedReport: report };
}
