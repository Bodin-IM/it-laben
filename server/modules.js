import { moduler } from '../src/lib/moduler.js';
import { isModuleStatus, publicationFor } from '../src/lib/modulePublication.js';
import { transaction } from './database.js';
import { requireTeacher, learningError } from './learning-access.js';

/** Public metadata contains no profile IDs, teacher notes, or student progress. */
export function modulePublications(db) {
	const records = db
		.prepare(
			'SELECT module_id AS id,status,revision,updated_at AS updatedAt FROM module_publication'
		)
		.all();
	return { modules: moduler.map((module) => publicationFor(module.id, records)) };
}

export function setModulePublication(db, actorId, moduleId, body, now = Date.now()) {
	requireTeacher(db, actorId);
	if (!moduler.some((module) => module.id === moduleId))
		throw learningError('MODULE_NOT_FOUND', 'Modulen finnes ikke.', 404);
	if (!isModuleStatus(body.status)) throw new TypeError('Velg kommende, aktiv eller ferdig modul.');
	if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0)
		throw new TypeError('Oppdater moduloversikten før du endrer status.');
	return transaction(db, () => {
		const current = db
			.prepare('SELECT status,revision FROM module_publication WHERE module_id=?')
			.get(moduleId) ?? { status: 'upcoming', revision: 0 };
		// A repeated latest change is safe after a lost response. Older versions must
		// still be refreshed, even when a later edit happens to use the same status.
		const retry = current.status === body.status && current.revision === body.expectedRevision + 1;
		if (current.revision !== body.expectedRevision && !retry)
			throw learningError(
				'MODULE_CONFLICT',
				'Modulstatusen er endret i en annen fane eller av en annen lærer. Oppdater oversikten og prøv igjen.'
			);
		if (current.status === body.status) return modulePublications(db);
		db.prepare(
			`INSERT INTO module_publication(module_id,status,revision,updated_at,updated_by)
			 VALUES (?,?,?,?,?) ON CONFLICT(module_id) DO UPDATE SET
			 status=excluded.status,revision=excluded.revision,
			 updated_at=excluded.updated_at,updated_by=excluded.updated_by`
		).run(moduleId, body.status, current.revision + 1, now, actorId);
		db.prepare(
			'INSERT INTO teacher_actions(actor_id,action,target_id,created_at) VALUES (?,?,?,?)'
		).run(actorId, `module-${body.status}`, moduleId, now);
		return modulePublications(db);
	});
}
