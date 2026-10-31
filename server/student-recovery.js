import { createHash, randomBytes } from 'node:crypto';
import { transaction } from './database.js';
import { requireAdmin, userRole, learningError } from './learning-access.js';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const expired = () => learningError('STUDENT_RECOVERY_EXPIRED', 'Filen er utløpt eller erstattet. Lag en ny nøkkelfil.', 409);

function recoverableStudent(db, actorId, studentId, confirmName) {
	requireAdmin(db, actorId);
	const student = db.prepare('SELECT id,nickname,disabled_at FROM users WHERE id=?').get(studentId);
	if (!student || userRole(db, studentId) !== 'student')
		throw learningError('STUDENT_NOT_FOUND', 'Velg en elevprofil. Lærere og administratorer kan ikke gjenopprettes her.', 404);
	if (student.disabled_at !== null)
		throw learningError('STUDENT_DISABLED', 'Aktiver elevprofilen før du lager en ny nøkkelfil.', 409);
	if (confirmName !== student.nickname)
		throw learningError('STUDENT_CHANGED', 'Elevprofilen er endret. Oppdater profilen og prøv igjen.', 409);
	return student;
}

function keysetHash(db, studentId) {
	return hash(JSON.stringify(db.prepare('SELECT hash FROM recovery_keys WHERE user_id=? ORDER BY hash').all(studentId).map((row) => row.hash)));
}

export function prepareStudentKey(db, actorId, studentId, body, origin, now = Date.now()) {
	return transaction(db, () => {
		const student = recoverableStudent(db, actorId, studentId, body.confirmName);
		const key = `itlab_${randomBytes(32).toString('base64url')}`;
		const expiresAt = now + 30 * 60000;
		db.prepare('DELETE FROM pending_admin_recovery_keys WHERE expires_at<=? OR user_id=?').run(now, studentId);
		db.prepare('INSERT INTO pending_admin_recovery_keys VALUES (?,?,?,?,?,?,?)').run(
			hash(key), studentId, actorId, student.nickname, keysetHash(db, studentId), now, expiresAt
		);
		return {
			recoveryKey: { format: 'it-laben-key', version: 1, key, createdAt: new Date(now).toISOString(), site: origin },
			expiresAt
		};
	});
}

export function activateStudentKey(db, actorId, studentId, body, now = Date.now()) {
	// Authorize before inspecting the submitted secret or an earlier receipt.
	requireAdmin(db, actorId);
	if (body.confirmed !== true || typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id) ||
		typeof body.key !== 'string' || !/^itlab_[A-Za-z0-9_-]{43}$/.test(body.key))
		throw new TypeError('Last ned filen og bekreft at den er lagret for riktig elevprofil.');
	const keyHash = hash(body.key);
	const fingerprint = hash(JSON.stringify([actorId, studentId, 'recover-key', body.confirmName, keyHash]));
	return transaction(db, () => {
		const student = recoverableStudent(db, actorId, studentId, body.confirmName);
		const previous = db.prepare('SELECT request_hash FROM management_actions WHERE id=?').get(body.id);
		if (previous) {
			if (previous.request_hash !== fingerprint)
				throw learningError('STUDENT_ACTION_CONFLICT', 'Handlingen er allerede brukt til en annen endring.', 409);
			if (!db.prepare('SELECT 1 FROM recovery_keys WHERE hash=? AND user_id=?').get(keyHash, studentId))
				throw learningError('STUDENT_KEY_CHANGED', 'Nøkkelen er byttet igjen. Denne filen kan ikke aktiveres på nytt.', 409);
			// Lost-response retry must not log out a pupil who has already used the new file.
			return { ok: true };
		}
		const pending = db.prepare('SELECT * FROM pending_admin_recovery_keys WHERE hash=? AND user_id=? AND actor_id=? AND expires_at>?')
			.get(keyHash, studentId, actorId, now);
		if (!pending || pending.nickname !== student.nickname || pending.keyset_hash !== keysetHash(db, studentId)) throw expired();
		db.prepare('DELETE FROM recovery_keys WHERE user_id=?').run(studentId);
		db.prepare('INSERT INTO recovery_keys VALUES (?,?,?)').run(keyHash, studentId, now);
		db.prepare('DELETE FROM sessions WHERE user_id=?').run(studentId);
		db.prepare('DELETE FROM pending_recovery_keys WHERE user_id=?').run(studentId);
		db.prepare('DELETE FROM pending_admin_recovery_keys WHERE user_id=?').run(studentId);
		db.prepare('INSERT INTO management_actions VALUES (?,?,?,?,?,?)').run(body.id, actorId, studentId, 'recover-key', fingerprint, now);
		return { ok: true };
	});
}
