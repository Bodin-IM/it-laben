import { createHash } from 'node:crypto';
import { transaction } from './database.js';
import { catalog, rewardPolicy } from './catalog.js';
import { summary } from './progress.js';
import { requireTeacher, requireAdmin, userRole, learningError } from './learning-access.js';
import { generateUsername } from './usernames.js';

const DAY = 86400000;
const studentWhere = 'NOT EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id=u.id)';
const metricsCte = `WITH xp AS (
 SELECT user_id,SUM(points) AS xp FROM rewards GROUP BY user_id
), events AS (
 SELECT user_id,updated_at AS at FROM progress
 UNION ALL SELECT user_id,COALESCE(submitted_at,issued_at) FROM checkpoint_attempts
 UNION ALL SELECT user_id,COALESCE(ended_at,started_at) FROM timed_attempts
 UNION ALL SELECT user_id,updated_at FROM practice_progress
 UNION ALL SELECT user_id,COALESCE(ended_at,created_at) FROM practice_runs
), worked AS (SELECT user_id,MAX(at) AS last_worked_at FROM events GROUP BY user_id)
`;

function studentDto(row, completed = 0, checks = 0) {
	return {
		id: row.id,
		nickname: row.nickname,
		createdAt: row.created_at,
		disabledAt: row.disabled_at,
		lastWorkedAt: row.last_worked_at ?? null,
		xp: Number(row.xp ?? 0),
		level: Math.floor(Number(row.xp ?? 0) / rewardPolicy.xpPerLevel) + 1,
		completed,
		checksCompleted: checks,
		leaderboardVisible: row.leaderboard_visible === 1
	};
}

function totals(db, ids) {
	const rows = db
		.prepare(
			`SELECT p.user_id,p.activity_id,p.objective_id,p.completed_at FROM progress p
 JOIN users u ON u.id=p.user_id WHERE ${studentWhere}
 ${ids ? `AND u.id IN (${ids.map(() => '?').join(',') || 'NULL'})` : 'AND u.disabled_at IS NULL'}`
		)
		.all(...(ids ?? []));
	const byUser = new Map();
	for (const row of rows) {
		if (!byUser.has(row.user_id)) byUser.set(row.user_id, new Map());
		byUser.get(row.user_id).set(`${row.activity_id}:${row.objective_id}`, row.completed_at);
	}
	const users = new Map();
	const activities = catalog.map(({ id, title, href, subject, format, completionEvidence }) => ({
		id,
		title,
		href,
		subject,
		format,
		completionEvidence,
		started: 0,
		completed: 0,
		checksCompleted: 0
	}));
	for (const [userId, progress] of byUser) {
		let completed = 0,
			checks = 0;
		catalog.forEach((activity, index) => {
			const required = activity.objectives.filter((item) => item.required);
			const started = activity.objectives.some((item) => progress.has(`${activity.id}:${item.id}`));
			const done =
				required.length > 0 &&
				required.every((item) => progress.get(`${activity.id}:${item.id}`) != null);
			const passedChecks = activity.objectives.filter(
				(item) => item.kind === 'check' && progress.get(`${activity.id}:${item.id}`) != null
			).length;
			completed += Number(done);
			checks += passedChecks;
			activities[index].started += Number(started);
			activities[index].completed += Number(done);
			activities[index].checksCompleted += passedChecks;
		});
		users.set(userId, { completed, checks });
	}
	return { users, activities };
}

export function teacherOverview(db, actorId, now = Date.now()) {
	requireTeacher(db, actorId);
	const counts = db
		.prepare(
			`${metricsCte} SELECT COUNT(*) AS students,
 COALESCE(SUM(u.disabled_at IS NULL),0) AS enabled,
 COALESCE(SUM(u.disabled_at IS NOT NULL),0) AS disabled,
 COALESCE(SUM(u.disabled_at IS NULL AND w.last_worked_at>=?),0) AS activeWeek
 FROM users u LEFT JOIN worked w ON w.user_id=u.id WHERE ${studentWhere}`
		)
		.get(now - 7 * DAY);
	const progress = totals(db);
	return {
		serverNow: now,
		...counts,
		completed: progress.activities.reduce((n, item) => n + item.completed, 0),
		checksCompleted: progress.activities.reduce((n, item) => n + item.checksCompleted, 0),
		activities: progress.activities
	};
}

export function listStudents(db, actorId, query = {}, now = Date.now()) {
	requireTeacher(db, actorId);
	const search = query.q ?? '',
		status = query.status ?? 'active',
		page = Number(query.page ?? 1);
	if (
		typeof search !== 'string' ||
		search.length > 80 ||
		!['active', 'disabled', 'all'].includes(status) ||
		!Number.isInteger(page) ||
		page < 1 ||
		page > 100000
	)
		throw new TypeError('Ugyldig søk, status eller sidenummer.');
	const escape = String.fromCharCode(92);
	const pattern = `%${[...search.trim()].map((char) => ('%_'.includes(char) || char === escape ? escape + char : char)).join('')}%`;
	const condition = `${studentWhere} AND u.nickname LIKE ? ESCAPE '${escape}' ${status === 'all' ? '' : `AND u.disabled_at IS ${status === 'active' ? '' : 'NOT '}NULL`}`;
	const total = db.prepare(`SELECT COUNT(*) AS n FROM users u WHERE ${condition}`).get(pattern).n;
	const rows = db
		.prepare(
			`${metricsCte} SELECT u.*,COALESCE(x.xp,0) AS xp,w.last_worked_at
 FROM users u LEFT JOIN xp x ON x.user_id=u.id LEFT JOIN worked w ON w.user_id=u.id
 WHERE ${condition} ORDER BY u.nickname COLLATE NOCASE,u.id LIMIT 25 OFFSET ?`
		)
		.all(pattern, (page - 1) * 25);
	const progress = totals(
		db,
		rows.map((row) => row.id)
	);
	return {
		serverNow: now,
		total,
		page,
		pageSize: 25,
		activityCount: catalog.length,
		students: rows.map((row) =>
			studentDto(row, progress.users.get(row.id)?.completed, progress.users.get(row.id)?.checks)
		)
	};
}

function getStudent(db, id) {
	const row = db.prepare(`SELECT u.* FROM users u WHERE u.id=? AND ${studentWhere}`).get(id);
	if (!row)
		throw learningError(
			'STUDENT_NOT_FOUND',
			'Elevprofilen finnes ikke eller tilhører en lærer.',
			404
		);
	return row;
}

export function studentDetail(db, actorId, studentId, now = Date.now()) {
	requireTeacher(db, actorId);
	const row = getStudent(db, studentId);
	const full = summary(db, studentId, now);
	const metrics = db
		.prepare(
			`${metricsCte} SELECT COALESCE(x.xp,0) AS xp,w.last_worked_at
 FROM users u LEFT JOIN xp x ON x.user_id=u.id LEFT JOIN worked w ON w.user_id=u.id WHERE u.id=?`
		)
		.get(studentId);
	const completed = full.progress.filter((item) =>
		['reviewed', 'passed'].includes(item.status)
	).length;
	return {
		serverNow: now,
		student: studentDto(
			{ ...row, ...metrics },
			completed,
			full.subjects.reduce((n, item) => n + item.checksCompleted, 0)
		),
		activities: full.progress.map((activity) => ({
			id: activity.id,
			title: activity.title,
			href: activity.href,
			subject: activity.subject,
			format: activity.format,
			status: activity.status,
			completed: activity.completed,
			total: activity.total,
			checksCompleted: activity.checksCompleted,
			checksTotal: activity.checksTotal,
			objectives: activity.objectives.map((objective) => ({
				id: objective.id,
				title: objective.title,
				kind: objective.kind,
				completedAt: objective.completedAt,
				updatedAt: objective.updatedAt,
				nextAttemptAt: objective.assessment?.nextAttemptAt ?? null
			}))
		})),
		achievements: full.achievements
			.filter((item) => item.earnedAt !== null)
			.map(({ id, title, symbol, earnedAt }) => ({ id, title, symbol, earnedAt })),
		checks: db
			.prepare(
				`SELECT activity_id AS activityId,score,passed,submitted_at AS submittedAt,
 opening_id IS NOT NULL AS teaching FROM checkpoint_attempts WHERE user_id=? AND submitted_at IS NOT NULL ORDER BY submitted_at DESC,rowid DESC LIMIT 15`
			)
			.all(studentId),
		shifts: db
			.prepare(
				`SELECT activity_id AS activityId,status,started_at AS startedAt,ended_at AS endedAt,
 opening_id IS NOT NULL AS teaching FROM timed_attempts WHERE user_id=? ORDER BY started_at DESC,rowid DESC LIMIT 10`
			)
			.all(studentId)
	};
}

export function deleteUser(db, userId) {
	if (
		userRole(db, userId) === 'admin' &&
		db.prepare("SELECT COUNT(*) AS n FROM user_roles WHERE role='admin'").get().n <= 1
	)
		throw learningError(
			'ADMIN_LAST',
			'Gi en annen profil administratorrollen før den siste administratoren slettes.',
			409
		);
	db.prepare(
		"DELETE FROM teacher_actions WHERE action IN ('grant-teacher','revoke-teacher','grant-admin','revoke-admin') AND target_id=?"
	).run(userId);
	db.prepare('DELETE FROM users WHERE id=?').run(userId);
}

export function manageStudent(db, actorId, studentId, action, body, now = Date.now()) {
	if (action === 'rename') requireTeacher(db, actorId);
	else requireAdmin(db, actorId);
	if (
		!['rename', 'status', 'delete'].includes(action) ||
		typeof body.id !== 'string' ||
		!/^[0-9a-f-]{36}$/i.test(body.id)
	)
		throw new TypeError('Ugyldig elevhandling.');
	if (action === 'status' && typeof body.disabled !== 'boolean')
		throw new TypeError('Velg aktiv eller deaktivert profil.');
	const fingerprint = createHash('sha256')
		.update(
			JSON.stringify([actorId, studentId, action, body.confirmName ?? null, body.disabled ?? null])
		)
		.digest('hex');
	return transaction(db, () => {
		const previous = db.prepare('SELECT * FROM management_actions WHERE id=?').get(body.id);
		if (previous) {
			if (previous.request_hash !== fingerprint)
				throw learningError(
					'STUDENT_ACTION_CONFLICT',
					'Handlingen er allerede brukt til en annen endring.',
					409
				);
			return { ok: true };
		}
		const target = getStudent(db, studentId);
		if (body.confirmName !== target.nickname)
			throw learningError(
				'STUDENT_CHANGED',
				'Bekreft med elevens nåværende brukernavn. Oppdater profilen først.',
				409
			);
		if (action === 'rename')
			db.prepare('UPDATE users SET nickname=?,name_assigned=1 WHERE id=?').run(
				generateUsername(db),
				studentId
			);
		if (action === 'status') {
			db.prepare('UPDATE users SET disabled_at=? WHERE id=?').run(
				body.disabled ? now : null,
				studentId
			);
			if (body.disabled) db.prepare('DELETE FROM sessions WHERE user_id=?').run(studentId);
		}
		if (action === 'delete' && target.disabled_at === null)
			throw learningError('STUDENT_DISABLE_FIRST', 'Deaktiver elevprofilen før den slettes.', 409);
		db.prepare('INSERT INTO management_actions VALUES (?,?,?,?,?,?)').run(
			body.id,
			actorId,
			studentId,
			action,
			fingerprint,
			now
		);
		if (action === 'delete') deleteUser(db, studentId);
		return { ok: true };
	});
}
