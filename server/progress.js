import { randomUUID, createHash } from 'node:crypto';
import { transaction } from './database.js';
import { catalog, checkSubmission, achievementDefinitions, CONTENT_VERSION } from './catalog.js';

export function summary(db, userId) {
	const rows = db.prepare('SELECT * FROM progress WHERE user_id=?').all(userId);
	const progress = catalog.map((activity) => {
		const objectives = activity.objectives.map((objective) => {
			const row = rows.find(
				(value) => value.activity_id === activity.id && value.objective_id === objective.id
			);
			return {
				...objective,
				completedAt: row?.completed_at ?? null,
				updatedAt: row?.updated_at ?? null,
				solution: row?.solution_json ? JSON.parse(row.solution_json) : null
			};
		});
		const completed = objectives.filter((value) => value.completedAt !== null).length;
		return {
			...activity,
			objectives,
			completed,
			total: objectives.length,
			status:
				completed === objectives.length
					? activity.format === 'spill'
						? 'passed'
						: 'reviewed'
					: rows.some((value) => value.activity_id === activity.id)
						? 'started'
						: 'new'
		};
	});
	const earned = db.prepare('SELECT * FROM achievements WHERE user_id=?').all(userId);
	const xp = Number(
		db.prepare('SELECT COALESCE(SUM(points),0) AS xp FROM rewards WHERE user_id=?').get(userId).xp
	);
	const recentRewards = db
		.prepare(
			'SELECT id, points, title, created_at AS createdAt FROM rewards WHERE user_id=? ORDER BY created_at DESC, rowid DESC LIMIT 20'
		)
		.all(userId);
	return {
		version: CONTENT_VERSION,
		xp,
		level: Math.floor(xp / 100) + 1,
		nextLevelAt: (Math.floor(xp / 100) + 1) * 100,
		progress,
		achievements: achievementDefinitions.map((item) => ({
			...item,
			earnedAt: earned.find((value) => value.achievement_id === item.id)?.earned_at ?? null
		})),
		recentRewards
	};
}

export function submit(db, userId, body, now = Date.now()) {
	if (typeof body?.eventId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.eventId))
		throw new TypeError('Innsendingen mangler en gyldig hendelses-ID.');
	const requestHash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
	return transaction(db, () => {
		const previous = db
			.prepare('SELECT * FROM receipts WHERE user_id=? AND event_id=?')
			.get(userId, body.eventId);
		if (previous) {
			if (previous.request_hash !== requestHash) {
				const error = new Error('Samme hendelse kan ikke brukes til en annen løsning.');
				error.code = 'EVENT_CONFLICT';
				throw error;
			}
			return { ...JSON.parse(previous.result_json), duplicate: true, summary: summary(db, userId) };
		}
		const { activity, passed, solution } = checkSubmission(body);
		db.prepare(
			`INSERT INTO progress (user_id,activity_id,objective_id,completed_at,updated_at,solution_json) VALUES (?,?,?,?,?,?)
      ON CONFLICT(user_id,activity_id,objective_id) DO UPDATE SET
      completed_at=COALESCE(progress.completed_at,excluded.completed_at),updated_at=excluded.updated_at,solution_json=excluded.solution_json`
		).run(
			userId,
			activity.id,
			body.objectiveId,
			passed ? now : null,
			now,
			solution === null ? null : JSON.stringify(solution)
		);
		const newRewards = [];
		const award = (key, points, title) => {
			const id = randomUUID();
			const added = db
				.prepare('INSERT OR IGNORE INTO rewards VALUES (?,?,?,?,?,?)')
				.run(id, userId, key, points, title, now);
			if (Number(added.changes) > 0) newRewards.push({ id, points, title });
		};
		if (passed)
			award(
				`objective:${activity.id}:${body.objectiveId}`,
				activity.format === 'spill' ? 25 : 15,
				activity.format === 'spill'
					? activity.objectives.find((item) => item.id === body.objectiveId).title
					: activity.title
			);
		let current = summary(db, userId);
		const gameComplete = (id) =>
			current.progress.some((item) => item.id === id && item.status === 'passed');
		if (activity.format === 'spill' && gameComplete(activity.id))
			award(`game:${activity.id}:complete`, 25, `${activity.title} fullført`);
		const eligible = {
			'first-review': current.progress.some((item) => item.status === 'reviewed'),
			'first-solution': current.progress.some(
				(item) => item.format === 'spill' && item.completed > 0
			),
			'redd-chatten': gameComplete('redd-chatten'),
			meldingsdetektiven: gameComplete('meldingsdetektiven'),
			chat: gameComplete('chat'),
			'both-subjects': ['utvikling', 'drift'].every((subject) =>
				current.progress.some(
					(item) => item.subject === subject && ['passed', 'reviewed'].includes(item.status)
				)
			)
		};
		const newAchievements = [];
		for (const definition of achievementDefinitions) {
			if (eligible[definition.id]) {
				const added = db
					.prepare('INSERT OR IGNORE INTO achievements VALUES (?,?,?)')
					.run(userId, definition.id, now);
				if (Number(added.changes) > 0) newAchievements.push(definition);
			}
		}
		const receipt = { passed, newRewards, newAchievements };
		db.prepare('INSERT INTO receipts VALUES (?,?,?,?,?)').run(
			userId,
			body.eventId,
			requestHash,
			JSON.stringify(receipt),
			now
		);
		current = summary(db, userId);
		return { ...receipt, duplicate: false, summary: current };
	});
}
