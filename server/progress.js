import { randomUUID, createHash } from 'node:crypto';
import { transaction } from './database.js';
import {
	catalog,
	checkSubmission,
	achievementDefinitions,
	trackDefinitions,
	rewardPolicy,
	CONTENT_VERSION
} from './catalog.js';
import { evaluateGoal, labColors } from '../src/lib/progression.js';
import { fag } from '../src/lib/innhold.js';
import { checkpointState } from './checkpoints.js';
import { timedChallenges } from '../src/lib/timedChallenges.js';

export function progressSnapshot(db, userId, now = Date.now()) {
	const rows = db.prepare('SELECT * FROM progress WHERE user_id=?').all(userId);
	const byObjective = new Map(rows.map((row) => [`${row.activity_id}:${row.objective_id}`, row]));
	const startedActivities = new Set(rows.map((row) => row.activity_id));
	const timedHistory = new Map();
	for (const row of db
		.prepare(
			'SELECT activity_id,status,started_at,deadline_at FROM timed_attempts WHERE user_id=? ORDER BY started_at DESC,rowid DESC'
		)
		.all(userId))
		if (!timedHistory.has(row.activity_id)) timedHistory.set(row.activity_id, row);
	const awarded = new Set(
		db
			.prepare('SELECT reward_key FROM rewards WHERE user_id=?')
			.all(userId)
			.map((row) => row.reward_key)
	);
	return catalog.map((activity) => {
		const timed = timedChallenges.find((item) => item.id === activity.id);
		const lastShift = timedHistory.get(activity.id);
		const objectives = activity.objectives.map((objective) => {
			const row = byObjective.get(`${activity.id}:${objective.id}`);
			return {
				...objective,
				...(objective.kind === 'timed'
					? {
							available:
								(!lastShift ||
									(lastShift.status === 'active' && now < lastShift.deadline_at) ||
									now >= lastShift.started_at + timed.cooldownMs) &&
								timed.prerequisites.every(
									(item) =>
										byObjective.get(`${item.activityId}:${item.objectiveId}`)?.completed_at != null
								)
						}
					: {}),
				completedAt: row?.completed_at ?? null,
				updatedAt: row?.updated_at ?? null,
				solution: row?.solution_json ? JSON.parse(row.solution_json) : null,
				...(objective.kind === 'check'
					? { assessment: checkpointState(db, userId, activity, objective.id, now) }
					: {})
			};
		});
		const required = objectives.filter((value) => value.required);
		const completed = required.filter((value) => value.completedAt !== null).length;
		const checks = objectives.filter((value) => value.kind === 'check');
		const creditEligible =
			activity.creditMode === 'validated'
				? completed === required.length
				: checks.length > 0 && checks.every((value) => value.completedAt !== null);
		const pendingXp =
			objectives
				.filter(
					(value) =>
						value.completedAt !== null && !awarded.has(`objective:${activity.id}:${value.id}`)
				)
				.reduce((sum, value) => sum + value.points, 0) +
			(completed === required.length && !awarded.has(`game:${activity.id}:complete`)
				? activity.completionBonus
				: 0);
		return {
			...activity,
			objectives,
			completed,
			total: required.length,
			checksCompleted: checks.filter((value) => value.completedAt !== null).length,
			checksTotal: checks.length,
			creditEligible,
			pendingXp,
			status:
				completed === required.length
					? activity.completionEvidence === 'reviewed'
						? 'reviewed'
						: 'passed'
					: startedActivities.has(activity.id)
						? 'started'
						: 'new'
		};
	});
}

function awardAchievements(db, userId, progress, now) {
	const earned = [];
	for (const definition of achievementDefinitions) {
		const goal = evaluateGoal(definition.goal, progress);
		if (goal.total > 0 && goal.completed === goal.total) {
			const added = db
				.prepare('INSERT OR IGNORE INTO achievements VALUES (?,?,?)')
				.run(userId, definition.id, now);
			if (Number(added.changes) > 0) earned.push(definition);
		}
	}
	return earned;
}

/** Reconcile new definitions at startup, including users who finished before an upgrade. */
export function reconcileAchievements(db, now = Date.now()) {
	return transaction(db, () => {
		let added = 0;
		for (const user of db.prepare('SELECT id FROM users').all())
			added += awardAchievements(db, user.id, progressSnapshot(db, user.id), now).length;
		return added;
	});
}

export function summary(db, userId, now = Date.now()) {
	const progress = progressSnapshot(db, userId, now);
	const activeRewardKeys = new Set(
		catalog.flatMap((item) => [
			...item.objectives.map((objective) => `objective:${item.id}:${objective.id}`),
			...(item.completionBonus ? [`game:${item.id}:complete`] : [])
		])
	);
	const historicalXp = db
		.prepare('SELECT reward_key,points FROM rewards WHERE user_id=?')
		.all(userId)
		.filter((row) => !activeRewardKeys.has(row.reward_key))
		.reduce((sum, row) => sum + row.points, 0);
	const earned = db.prepare('SELECT * FROM achievements WHERE user_id=?').all(userId);
	const xp = Number(
		db.prepare('SELECT COALESCE(SUM(points),0) AS xp FROM rewards WHERE user_id=?').get(userId).xp
	);
	const recentRewards = db
		.prepare(
			'SELECT id, points, title, created_at AS createdAt FROM rewards WHERE user_id=? ORDER BY created_at DESC, rowid DESC LIMIT 20'
		)
		.all(userId);
	const profile = db.prepare('SELECT * FROM lab_profiles WHERE user_id=?').get(userId);
	const achievements = achievementDefinitions.map((item) => ({
		...item,
		...evaluateGoal(item.goal, progress),
		earnedAt: earned.find((value) => value.achievement_id === item.id)?.earned_at ?? null
	}));
	return {
		version: CONTENT_VERSION,
		xp,
		level: Math.floor(xp / rewardPolicy.xpPerLevel) + 1,
		nextLevelAt: (Math.floor(xp / rewardPolicy.xpPerLevel) + 1) * rewardPolicy.xpPerLevel,
		xpPerLevel: rewardPolicy.xpPerLevel,
		maximumXp:
			historicalXp +
			catalog.reduce(
				(sum, item) =>
					sum + item.completionBonus + item.objectives.reduce((n, obj) => n + obj.points, 0),
				0
			),
		progress,
		achievements,
		tracks: trackDefinitions.map((item) => ({ ...item, ...evaluateGoal(item.goal, progress) })),
		subjects: fag.map((item) => {
			const activities = progress.filter((value) => value.subject === item.id);
			return {
				id: item.id,
				title: item.navn,
				total: activities.length,
				completed: activities.filter((value) => ['reviewed', 'passed'].includes(value.status))
					.length,
				checksTotal: activities.reduce((sum, value) => sum + value.checksTotal, 0),
				checksCompleted: activities.reduce((sum, value) => sum + value.checksCompleted, 0)
			};
		}),
		lab: {
			colorId: profile?.color_id ?? 'forest',
			featuredAchievementId: profile?.featured_achievement_id ?? null,
			colors: labColors.map((item) => ({
				...item,
				unlocked: !item.requires || earned.some((badge) => badge.achievement_id === item.requires)
			}))
		},
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
			return {
				...JSON.parse(previous.result_json),
				duplicate: true,
				summary: summary(db, userId, now)
			};
		}
		const { activity, passed, solution, assessmentResult, timedReport } = checkSubmission(body, {
			db,
			userId,
			now
		});
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
		let current = summary(db, userId, now);
		const savedActivity = current.progress.find((item) => item.id === activity.id);
		if (savedActivity.creditEligible) {
			for (const objective of savedActivity.objectives.filter((item) => item.completedAt !== null))
				award(
					`objective:${activity.id}:${objective.id}`,
					objective.points,
					objective.kind === 'review' ? activity.title : objective.title
				);
			if (activity.completionBonus && savedActivity.status === 'passed')
				award(
					`game:${activity.id}:complete`,
					activity.completionBonus,
					`${activity.title} fullført`
				);
		}
		const newAchievements = awardAchievements(db, userId, current.progress, now);
		const receipt = {
			passed,
			newRewards,
			newAchievements,
			...(assessmentResult ? { assessmentResult } : {}),
			...(timedReport ? { timedReport } : {})
		};
		db.prepare('INSERT INTO receipts VALUES (?,?,?,?,?)').run(
			userId,
			body.eventId,
			requestHash,
			JSON.stringify(receipt),
			now
		);
		current = summary(db, userId, now);
		return { ...receipt, duplicate: false, summary: current };
	});
}
