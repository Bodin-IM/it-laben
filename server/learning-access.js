import { transaction } from './database.js';

export function learningError(code, message, status = 409) {
	return Object.assign(new Error(message), { code, status });
}
export function isTeacher(db, userId) {
	return ['teacher', 'admin'].includes(userRole(db, userId));
}
export function userRole(db, userId) {
	return db.prepare('SELECT role FROM user_roles WHERE user_id=?').get(userId)?.role ?? 'student';
}
export function requireAdmin(db, userId) {
	if (userRole(db, userId) !== 'admin')
		throw learningError('ADMIN_REQUIRED', 'Denne handlingen krever administratorrollen.', 403);
}
export function requireTeacher(db, userId) {
	if (!isTeacher(db, userId))
		throw learningError('TEACHER_REQUIRED', 'Denne handlingen krever lærertilgang.', 403);
}
export function activeOpenings(db, now = Date.now()) {
	return db
		.prepare(
			'SELECT id,activity_id AS activityId,mode,created_at AS createdAt,closes_at AS closesAt FROM activity_openings WHERE closed_at IS NULL AND created_at<=? AND closes_at>? ORDER BY created_at DESC,rowid DESC'
		)
		.all(now, now);
}
export function openingAccess(db, activityId, openingId, mode, now = Date.now()) {
	if (typeof openingId !== 'string') return null;
	const row = db
		.prepare('SELECT * FROM activity_openings WHERE id=? AND activity_id=? AND mode=?')
		.get(openingId, activityId, mode);
	return row
		? { ...row, active: row.closed_at === null && row.created_at <= now && row.closes_at > now }
		: null;
}
export function requireTeachingOpening(db, activityId, openingId, now = Date.now()) {
	const opening = openingAccess(db, activityId, openingId, 'teaching', now);
	if (!opening?.active)
		throw learningError(
			'OPENING_CLOSED',
			'Undervisningsåpningen er stengt. Du kan fortsatt fullføre et forsøk du allerede har startet.'
		);
	return opening;
}
export function practiceAccess(db, userId, activityId, now = Date.now()) {
	const teacher = isTeacher(db, userId);
	const opening = activeOpenings(db, now).find(
		(item) => item.activityId === activityId && item.mode === 'practice'
	);
	return { allowed: teacher || !!opening, teacher, opening: opening ?? null };
}
export function requirePractice(db, userId, activityId, now = Date.now()) {
	const access = practiceAccess(db, userId, activityId, now);
	if (!access.allowed)
		throw learningError('PRACTICE_CLOSED', 'Åpen øving er stengt for denne aktiviteten.', 403);
	return access;
}
export function createOpening(db, userId, body, activityIds, now = Date.now()) {
	requireTeacher(db, userId);
	if (
		typeof body.id !== 'string' ||
		!/^[0-9a-f-]{36}$/i.test(body.id) ||
		!activityIds.includes(body.activityId) ||
		!['practice', 'teaching'].includes(body.mode) ||
		![30, 60].includes(body.minutes)
	)
		throw new TypeError('Velg aktivitet, åpningstype og 30 eller 60 minutter.');
	return transaction(db, () => {
		const previous = db.prepare('SELECT * FROM activity_openings WHERE id=?').get(body.id);
		if (previous) {
			if (
				previous.created_by !== userId ||
				previous.activity_id !== body.activityId ||
				previous.mode !== body.mode ||
				previous.closes_at - previous.created_at !== body.minutes * 60000
			)
				throw learningError(
					'OPENING_CONFLICT',
					'Den samme åpningen kan ikke brukes til andre innstillinger.'
				);
			return previous;
		}
		// A new explicit opening replaces the previous one, while already issued attempts keep their grants.
		for (const row of db
			.prepare(
				'SELECT id FROM activity_openings WHERE activity_id=? AND closed_at IS NULL AND closes_at>?'
			)
			.all(body.activityId, now)) {
			db.prepare('UPDATE activity_openings SET closed_at=?,closed_by=? WHERE id=?').run(
				now,
				userId,
				row.id
			);
			db.prepare(
				'INSERT INTO teacher_actions(actor_id,action,target_id,created_at) VALUES (?,?,?,?)'
			).run(userId, 'replace-opening', row.id, now);
		}
		db.prepare(
			'INSERT INTO activity_openings(id,activity_id,mode,created_by,created_at,closes_at) VALUES (?,?,?,?,?,?)'
		).run(body.id, body.activityId, body.mode, userId, now, now + body.minutes * 60000);
		db.prepare(
			'INSERT INTO teacher_actions(actor_id,action,target_id,created_at) VALUES (?,?,?,?)'
		).run(userId, 'open-activity', body.id, now);
		return db.prepare('SELECT * FROM activity_openings WHERE id=?').get(body.id);
	});
}
export function closeOpening(db, userId, openingId, now = Date.now()) {
	requireTeacher(db, userId);
	return transaction(db, () => {
		const row = db.prepare('SELECT * FROM activity_openings WHERE id=?').get(openingId);
		if (!row) throw new TypeError('Ukjent åpning.');
		if (row.closed_at === null) {
			db.prepare('UPDATE activity_openings SET closed_at=?,closed_by=? WHERE id=?').run(
				now,
				userId,
				row.id
			);
			db.prepare(
				'INSERT INTO teacher_actions(actor_id,action,target_id,created_at) VALUES (?,?,?,?)'
			).run(userId, 'close-opening', row.id, now);
		}
	});
}
export function setTeacherRole(db, userId, grant, now = Date.now()) {
	const user = db.prepare('SELECT id,disabled_at FROM users WHERE id=?').get(userId);
	if (!user) throw new TypeError('Profil-ID finnes ikke i denne databasen.');
	if (grant && user.disabled_at !== null)
		throw new TypeError('Aktiver profilen før den får en stabsrolle.');
	return transaction(db, () => {
		if (userRole(db, userId) === 'admin')
			throw new TypeError(
				'Profilen er administrator. Bruk administratorkommandoen for å endre rollen.'
			);
		if (grant)
			db.prepare("INSERT OR IGNORE INTO user_roles VALUES (?,'teacher',?)").run(userId, now);
		else db.prepare('DELETE FROM user_roles WHERE user_id=?').run(userId);
		db.prepare(
			'INSERT INTO teacher_actions(actor_id,action,target_id,created_at) VALUES (NULL,?,?,?)'
		).run(grant ? 'grant-teacher' : 'revoke-teacher', userId, now);
	});
}

export function setAdminRole(db, userId, grant, now = Date.now()) {
	const user = db.prepare('SELECT disabled_at FROM users WHERE id=?').get(userId);
	if (!user) throw new TypeError('Profil-ID finnes ikke i denne databasen.');
	if (user.disabled_at !== null) throw new TypeError('Aktiver profilen før den får en stabsrolle.');
	return transaction(db, () => {
		if (!grant && userRole(db, userId) !== 'admin')
			throw new TypeError('Profilen er ikke administrator.');
		if (
			!grant &&
			db.prepare("SELECT COUNT(*) AS n FROM user_roles WHERE role='admin'").get().n <= 1
		)
			throw new TypeError(
				'Gi en annen profil administratorrollen før den siste administratoren fjernes.'
			);
		db.prepare(
			'INSERT INTO user_roles VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role,granted_at=excluded.granted_at'
		).run(userId, grant ? 'admin' : 'teacher', now);
		db.prepare(
			'INSERT INTO teacher_actions(actor_id,action,target_id,created_at) VALUES (NULL,?,?,?)'
		).run(grant ? 'grant-admin' : 'revoke-admin', userId, now);
	});
}
