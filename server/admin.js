import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { openDatabase } from './database.js';
import { setAdminRole } from './learning-access.js';

process.umask(0o077);
const [action, userId, ...extra] = process.argv.slice(2);
try {
	if (
		!['grant', 'revoke', 'list'].includes(action) ||
		extra.length ||
		(action !== 'list' && !/^[0-9a-f-]{36}$/i.test(userId ?? '')) ||
		(action === 'list' && userId)
	)
		throw new Error('Bruk: npm run admin -- list | grant <profil-ID> | revoke <profil-ID>');
	const filename = resolve(process.env.ITLAB_DB_PATH || 'data/it-laben.sqlite');
	if (!existsSync(filename))
		throw new Error('Databasen finnes ikke. Sett ITLAB_DB_PATH til API-ets eksisterende database.');
	const db = openDatabase(filename);
	try {
		if (action === 'list')
			console.table(
				db
					.prepare(
						'SELECT u.id AS profilId,u.nickname AS brukernavn,r.role AS rolle FROM users u JOIN user_roles r ON r.user_id=u.id ORDER BY u.created_at'
					)
					.all()
			);
		else {
			setAdminRole(db, userId, action === 'grant');
			console.log(
				action === 'grant'
					? 'Administratorrollen er gitt. Oppdater Min lab.'
					: 'Profilen er nå lærer. Oppdater Min lab.'
			);
		}
	} finally {
		db.close();
	}
} catch (error) {
	console.error(error.message);
	process.exitCode = 1;
}
