import { DatabaseSync } from 'node:sqlite';
import { resolve, dirname } from 'node:path';
import { mkdirSync, chmodSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function backupDatabase(source, destination) {
	if (!existsSync(source)) throw new Error('Databasen finnes ikke.');
	if (existsSync(destination))
		throw new Error('Backupfilen finnes allerede. Velg et nytt filnavn.');
	mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
	const db = new DatabaseSync(source, { readOnly: true });
	try {
		db.prepare('VACUUM INTO ?').run(destination);
		chmodSync(destination, 0o600);
	} finally {
		db.close();
	}
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	process.umask(0o077);
	const source = resolve(process.env.ITLAB_DB_PATH || 'data/it-laben.sqlite');
	const destination = resolve(
		process.argv[2] ||
			`data/backups/it-laben-${new Date().toISOString().replaceAll(':', '-')}.sqlite`
	);
	backupDatabase(source, destination);
	console.log(`Backup opprettet: ${destination}`);
}
