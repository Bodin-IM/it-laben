import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export function openDatabase(filename) {
	if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
	const db = new DatabaseSync(filename);
	db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
	if (filename !== ':memory:') chmodSync(filename, 0o600);
	db.exec(
		'CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, hash TEXT NOT NULL, applied_at INTEGER NOT NULL)'
	);
	const directory = fileURLToPath(new URL('./migrations/', import.meta.url));
	const files = readdirSync(directory)
		.filter((name) => /^\d+_.*\.sql$/.test(name))
		.sort();
	const applied = db.prepare('SELECT name FROM migrations').all();
	if (applied.some((row) => !files.includes(row.name))) {
		db.close();
		throw new Error('Databasen er nyere enn API-et. Bruk en kompatibel serverversjon.');
	}
	for (const name of files) {
		const sql = readFileSync(join(directory, name), 'utf8');
		const hash = createHash('sha256').update(sql).digest('hex');
		const previous = db.prepare('SELECT hash FROM migrations WHERE name=?').get(name);
		if (previous) {
			if (previous.hash !== hash) {
				db.close();
				throw new Error(`Migrasjonen ${name} er endret etter bruk.`);
			}
			continue;
		}
		transaction(db, () => {
			db.exec(sql);
			db.prepare('INSERT INTO migrations VALUES (?,?,?)').run(name, hash, Date.now());
		});
	}
	return db;
}

export function transaction(db, callback) {
	db.exec('BEGIN IMMEDIATE');
	try {
		const result = callback();
		db.exec('COMMIT');
		return result;
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}
}
