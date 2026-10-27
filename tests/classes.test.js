import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtempSync, rmSync, readdirSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../server/database.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
import { backupDatabase } from '../server/backup.js';
import { leaderboard } from '../server/leaderboard.js';

async function fixture(t, prepare) {
	const directory = mkdtempSync(join(tmpdir(), 'itlab-classes-'));
	const filename = join(directory, 'test.sqlite');
	if (prepare) prepare(filename);
	const db = openDatabase(filename);
	const config = readConfig({});
	const server = createApp({ db, config, limits: false }).listen(0, '127.0.0.1');
	await once(server, 'listening');
	t.after(async () => {
		await new Promise((resolve) => server.close(resolve));
		db.close();
		rmSync(directory, { recursive: true, force: true });
	});
	function client() {
		let cookie = '',
			csrf = '';
		return {
			id: null,
			async request(path, body, headers = {}) {
				const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
					method: body === undefined ? 'GET' : 'POST',
					headers: {
						Cookie: cookie,
						Origin: config.origin,
						'Content-Type': 'application/json',
						'X-CSRF-Token': csrf,
						...headers
					},
					body: body === undefined ? undefined : JSON.stringify({ accountId: this.id, ...body })
				});
				cookie = response.headers.getSetCookie()[0]?.split(';')[0] ?? cookie;
				const result = await response.json();
				csrf = result.csrfToken ?? csrf;
				this.id = result.user?.id ?? this.id;
				return { status: response.status, ...result };
			},
			choose(classCode, extras = {}) {
				return this.request('/me/class', { classCode, confirmed: true, ...extras });
			}
		};
	}
	return { db, directory, filename, client };
}

test('klassevalg: riktig elev og bekreftelse kreves, første valg låses også ved konkurrerende innsendinger', async (t) => {
	const f = await fixture(t),
		student = f.client(),
		other = f.client();
	assert.equal((await f.client().choose('2ITA')).status, 401);
	const created = await student.request('/auth/create', { classCode: '2ITB' });
	assert.equal(created.user.classCode, null);
	await other.request('/auth/create', {});
	for (const classCode of ['', '2ITC', '2ita', null, 1, ['2ITA']])
		assert.equal((await student.choose(classCode)).status, 400);
	for (const confirmed of [false, 'true', null])
		assert.equal((await student.choose('2ITA', { confirmed })).status, 400);
	assert.equal((await student.choose('2ITA', { accountId: other.id })).status, 409);
	assert.equal(
		(
			await student.request(
				'/me/class',
				{ classCode: '2ITA', confirmed: true },
				{ 'X-CSRF-Token': '' }
			)
		).status,
		403
	);
	assert.equal(
		(
			await student.request(
				'/me/class',
				{ classCode: '2ITA', confirmed: true },
				{ Origin: 'https://foreign.test' }
			)
		).status,
		403
	);
	for (const role of ['teacher', 'admin']) {
		f.db
			.prepare('INSERT OR REPLACE INTO user_roles VALUES (?,?,?)')
			.run(other.id, role, Date.now());
		assert.equal((await other.choose('2ITA')).status, 403);
	}
	const secondDevice = f.client();
	assert.equal(
		(await secondDevice.request('/auth/key', { key: created.recoveryKey.key })).status,
		200
	);
	const results = await Promise.all([student.choose('2ITA'), secondDevice.choose('2ITB')]);
	assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
	const saved = results.find((r) => r.status === 200).user.classCode;
	assert.equal((await student.choose(saved)).status, 200); // Retry after a lost response.
	const conflict = await student.choose(saved === '2ITA' ? '2ITB' : '2ITA');
	assert.equal(conflict.error.code, 'CLASS_LOCKED');
	assert.equal((await secondDevice.request('/me')).user.classCode, saved);
	await student.request('/me/leaderboard', { visible: false, classCode: null, xp: 9000 });
	assert.equal((await student.request('/me')).user.classCode, saved);
	assert.equal((await student.request('/me')).summary.xp, 0);
});

test('klassepoeng: hele deltakerlisten telles, mens skjulte, deaktiverte, ansatte og elever uten klasse utelates', async (t) => {
	const f = await fixture(t),
		guest = f.client();
	assert.deepEqual((await guest.request('/leaderboard')).classes, [
		{ classCode: '2ITA', participants: 0, xp: 0 },
		{ classCode: '2ITB', participants: 0, xp: 0 }
	]);
	const ids = [];
	for (let i = 0; i < 16; i++) {
		const id = randomUUID();
		ids.push(id);
		f.db
			.prepare(
				'INSERT INTO users(id,nickname,created_at,name_assigned,leaderboard_visible,class_code) VALUES (?,?,0,1,1,?)'
			)
			.run(id, `Testelev ${i}`, i === 12 ? null : i < 11 ? '2ITA' : '2ITB');
		f.db
			.prepare('INSERT INTO rewards VALUES (?,?,?,10,?,0)')
			.run(randomUUID(), id, 'test', 'Testpoeng');
	}
	f.db.prepare('UPDATE users SET leaderboard_visible=0 WHERE id=?').run(ids[13]);
	f.db.prepare('UPDATE users SET disabled_at=1 WHERE id=?').run(ids[14]);
	f.db.prepare("INSERT INTO user_roles VALUES (?,'teacher',0)").run(ids[15]);
	const board = await guest.request('/leaderboard');
	assert.equal(board.entries.length, 10);
	assert.equal(board.total, 13); // Unassigned students still appear in the individual board.
	assert.deepEqual(board.classes, [
		{ classCode: '2ITA', participants: 11, xp: 110 },
		{ classCode: '2ITB', participants: 1, xp: 10 }
	]);
	assert.deepEqual((await guest.request('/leaderboard?page=2')).classes, board.classes);
	f.db.prepare('UPDATE rewards SET points=110 WHERE user_id=?').run(ids[11]);
	assert.deepEqual(
		(await guest.request('/leaderboard')).classes.map((c) => c.xp),
		[110, 110]
	);
	f.db.prepare('UPDATE rewards SET points=120 WHERE user_id=?').run(ids[11]);
	assert.deepEqual(
		(await guest.request('/leaderboard')).classes.map((c) => c.xp),
		[110, 120]
	);
	for (const item of board.classes)
		assert.deepEqual(Object.keys(item).sort(), ['classCode', 'participants', 'xp']);
	for (const id of ids) assert.ok(!JSON.stringify(board).includes(id));
});

test('klassemigrasjon: eksisterende profil, nøkkel, skjult status og XP beholdes; valg følger omstart og backup', async (t) => {
	const userId = randomUUID(),
		key = 'itlab_' + 'A'.repeat(43);
	const f = await fixture(t, (filename) => {
		const old = new DatabaseSync(filename);
		old.exec(
			'CREATE TABLE migrations(name TEXT PRIMARY KEY, hash TEXT NOT NULL, applied_at INTEGER NOT NULL)'
		);
		const directory = new URL('../server/migrations/', import.meta.url);
		for (const name of readdirSync(directory)
			.filter((n) => /^00[1-8]_/.test(n))
			.sort()) {
			const sql = readFileSync(new URL(name, directory), 'utf8');
			old.exec(sql);
			old
				.prepare('INSERT INTO migrations VALUES (?,?,0)')
				.run(name, createHash('sha256').update(sql).digest('hex'));
		}
		old
			.prepare(
				'INSERT INTO users(id,nickname,created_at,name_assigned,leaderboard_visible,leaderboard_preference_set) VALUES (?,?,0,1,0,1)'
			)
			.run(userId, 'Eksisterende Elev 1234');
		old
			.prepare('INSERT INTO recovery_keys VALUES (?,?,0)')
			.run(createHash('sha256').update(key).digest('hex'), userId);
		old
			.prepare('INSERT INTO rewards VALUES (?,?,?,25,?,0)')
			.run(randomUUID(), userId, 'legacy', 'Behold poeng');
		old.close();
	});
	const student = f.client(),
		login = await student.request('/auth/key', { key });
	assert.equal(login.user.classCode, null);
	assert.equal(login.user.id, userId);
	assert.equal(login.user.leaderboardVisible, false);
	assert.equal(login.summary.xp, 25);
	assert.equal((await student.choose('2ITB')).status, 200);
	assert.deepEqual(
		(await student.request('/leaderboard')).classes.map((c) => c.xp),
		[0, 0]
	);
	await student.request('/me/leaderboard', { visible: true });
	assert.deepEqual(
		(await student.request('/leaderboard')).classes.map((c) => c.xp),
		[0, 25]
	);
	const reopened = openDatabase(f.filename);
	assert.equal(
		reopened.prepare('SELECT class_code FROM users WHERE id=?').get(userId).class_code,
		'2ITB'
	);
	assert.equal(leaderboard(reopened).classes[1].xp, 25);
	reopened.close();
	const backupPath = join(f.directory, 'backup.sqlite');
	backupDatabase(f.filename, backupPath);
	const backup = openDatabase(backupPath);
	assert.equal(
		backup.prepare('SELECT class_code FROM users WHERE id=?').get(userId).class_code,
		'2ITB'
	);
	assert.equal(leaderboard(backup).classes[1].xp, 25);
	assert.equal(backup.prepare('SELECT COUNT(*) AS n FROM recovery_keys').get().n, 1);
	backup.close();
	const restored = await fixture(t, (filename) => copyFileSync(backupPath, filename));
	const restoredStudent = restored.client();
	assert.equal((await restoredStudent.request('/auth/key', { key })).user.classCode, '2ITB');
	assert.equal((await restoredStudent.choose('2ITA')).error.code, 'CLASS_LOCKED');
});
