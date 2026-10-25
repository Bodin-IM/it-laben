import { randomInt } from 'node:crypto';
import { transaction } from './database.js';

export const adjectives = [
	'Lur',
	'Rask',
	'Rolig',
	'Modig',
	'Klar',
	'Trygg',
	'Klok',
	'Smart',
	'Vaken',
	'Leken',
	'Stødig',
	'Flittig',
	'Nysgjerrig',
	'Kreativ',
	'Oppfinnsom',
	'Flink',
	'Ivrig',
	'Tålmodig',
	'Snill',
	'Glad',
	'Lystig',
	'Skarp',
	'Driftig',
	'Varsom',
	'Smidig',
	'Listig',
	'Stille',
	'Stolt',
	'Livlig',
	'Solid',
	'Vennlig',
	'Fiffig'
];
export const animals = [
	'Oter',
	'Rev',
	'Ugle',
	'Gaupe',
	'Hauk',
	'Bever',
	'Ekorn',
	'Ravn',
	'Falk',
	'Laks',
	'Sel',
	'Elg',
	'Hjort',
	'Hare',
	'Mår',
	'Grevling',
	'Panda',
	'Pingvin',
	'Delfin',
	'Hval',
	'Tiger',
	'Løve',
	'Koala',
	'Vombat',
	'Geit',
	'Bison',
	'Zebra',
	'Gepard',
	'Panter',
	'Papegøye',
	'Isbjørn',
	'Alpakka'
];

/** A display name, never a credential. Call inside the account's write transaction. */
export function generateUsername(db, choose = randomInt) {
	for (let attempt = 0; attempt < 100; attempt++) {
		const name = `${adjectives[choose(adjectives.length)]} ${animals[choose(animals.length)]} ${1000 + choose(9000)}`;
		if (!db.prepare('SELECT 1 FROM users WHERE nickname=? COLLATE NOCASE').get(name)) return name;
	}
	throw new Error('Kunne ikke tildele et ledig brukernavn.');
}

export function assignExistingUsernames(db) {
	return transaction(db, () => {
		const users = db
			.prepare('SELECT id FROM users WHERE name_assigned=0 ORDER BY created_at,id')
			.all();
		for (const user of users)
			db.prepare('UPDATE users SET nickname=?,name_assigned=1 WHERE id=?').run(
				generateUsername(db),
				user.id
			);
		return users.length;
	});
}
