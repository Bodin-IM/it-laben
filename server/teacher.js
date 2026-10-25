import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { openDatabase } from './database.js';
import { setTeacherRole } from './learning-access.js';

process.umask(0o077);
const [action, userId, ...extra] = process.argv.slice(2);
const filename = resolve(process.env.ITLAB_DB_PATH || 'data/it-laben.sqlite');
try {
	if (
		!['grant', 'revoke', 'list'].includes(action) ||
		extra.length ||
		(action !== 'list' && !/^[0-9a-f-]{36}$/i.test(userId ?? '')) ||
		(action === 'list' && userId)
	)
		throw new Error('Bruk: npm run teacher -- list | grant <profil-ID> | revoke <profil-ID>');
	if (!existsSync(filename))
		throw new Error(
			'Databasen finnes ikke. Sett ITLAB_DB_PATH til serverens eksisterende database.'
		);
	const db = openDatabase(filename);
	try {
		if (action === 'list')
			console.table(
				db
					.prepare(
						"SELECT u.id AS profilId,u.nickname AS kallenavn,COALESCE(r.role,'student') AS rolle FROM users u LEFT JOIN user_roles r ON r.user_id=u.id ORDER BY u.created_at"
					)
					.all()
			);
		else {
			setTeacherRole(db, userId, action === 'grant');
			console.log(
				action === 'grant' ? 'Lærertilgang er gitt. Oppdater Min lab.' : 'Lærertilgang er fjernet.'
			);
		}
	} finally {
		db.close();
	}
} catch (error) {
	console.error(error.message);
	process.exitCode = 1;
}
