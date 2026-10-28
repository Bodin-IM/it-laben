import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../server/database.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
import { backupDatabase } from '../server/backup.js';
import { modulePublications } from '../server/modules.js';
import { moduler } from '../src/lib/moduler.js';
import { publicationFor, orderedModules, visibleModules } from '../src/lib/modulePublication.js';

// Migration 010 preserves these existing modules; later additions start upcoming.
const migratedModuleIds = new Set([
	'meldingens-reise',
	'data-og-lagring',
	'innlogging-og-tilgang',
	'fra-kode-til-drift'
]);
const initialPublications = () =>
	moduler.map((module) => ({
		id: module.id,
		status: migratedModuleIds.has(module.id) ? 'active' : 'upcoming',
		revision: 0,
		updatedAt: null
	}));

async function fixture(t, { env = {}, prepare } = {}) {
	const directory = mkdtempSync(join(tmpdir(), 'itlab-module-publication-'));
	const filename = join(directory, 'test.sqlite');
	if (prepare) prepare(filename);
	const db = openDatabase(filename),
		config = readConfig(env);
	const server = createApp({ db, config, limits: false }).listen(0, '127.0.0.1');
	await once(server, 'listening');
	t.after(async () => {
		await new Promise((resolve) => server.close(resolve));
		db.close();
		rmSync(directory, { recursive: true, force: true });
	});
	const origin = `http://127.0.0.1:${server.address().port}`;
	function client() {
		let cookie = '',
			csrf = '';
		return {
			id: null,
			async request(path, body, headers = {}) {
				const response = await fetch(`${origin}/api${path}`, {
					method: body === undefined ? 'GET' : 'POST',
					headers: {
						Cookie: cookie,
						Origin: config.origin,
						'Content-Type': 'application/json',
						'X-CSRF-Token': csrf,
						'X-Forwarded-Proto': config.secure ? 'https' : 'http',
						...headers
					},
					body: body === undefined ? undefined : JSON.stringify({ accountId: this.id, ...body })
				});
				cookie = response.headers.getSetCookie()[0]?.split(';')[0] ?? cookie;
				const result = await response.json();
				csrf = result.csrfToken ?? csrf;
				this.id = result.user?.id ?? this.id;
				return { status: response.status, headers: response.headers, ...result };
			},
			set(moduleId, status, expectedRevision, extra = {}, headers = {}) {
				return this.request(
					`/teacher/modules/${moduleId}`,
					{ status, expectedRevision, ...extra },
					headers
				);
			}
		};
	}
	async function staff(role = 'teacher') {
		const actor = client();
		await actor.request('/auth/create', {});
		db.prepare('INSERT INTO user_roles VALUES (?,?,0)').run(actor.id, role);
		return actor;
	}
	return { db, config, origin, filename, directory, client, staff };
}

test('modulpublisering: aktive vises først, ferdige beholdes og nye moduler starter skjult', () => {
	const modules = [{ id: 'old' }, { id: 'future' }, { id: 'now' }, { id: 'new' }];
	const records = [
		{ id: 'old', status: 'completed', revision: 2, updatedAt: 20 },
		{ id: 'future', status: 'upcoming', revision: 1, updatedAt: 10 },
		{ id: 'now', status: 'active', revision: 1, updatedAt: 10 }
	];
	assert.deepEqual(publicationFor('new', records), {
		id: 'new',
		status: 'upcoming',
		revision: 0,
		updatedAt: null
	});
	assert.deepEqual(
		orderedModules(modules, records).map((module) => module.id),
		['now', 'old', 'future', 'new']
	);
	assert.deepEqual(
		visibleModules(modules, records).map((module) => module.id),
		['now', 'old']
	);
	assert.deepEqual(
		modules.map((module) => module.id),
		['old', 'future', 'now', 'new']
	);
	assert.deepEqual(visibleModules(modules), []);
});

test('modulpublisering: offentlig lesing røper bare status, bruker aldri elevøkten og krever HTTPS i produksjon', async (t) => {
	const f = await fixture(t, {
		env: { NODE_ENV: 'production', APP_ORIGIN: 'https://school.test' }
	});
	const student = f.client();
	const created = await student.request('/auth/create', {});
	f.db.prepare('UPDATE sessions SET last_seen_at=0,expires_at=1 WHERE user_id=?').run(student.id);
	const sessions = f.db.prepare('SELECT * FROM sessions').all();
	const result = await student.request('/modules');
	assert.equal(result.status, 200);
	assert.equal(result.headers.get('cache-control'), 'no-store');
	assert.equal(result.headers.get('set-cookie'), null);
	assert.equal(result.headers.get('vary'), null);
	assert.deepEqual(f.db.prepare('SELECT * FROM sessions').all(), sessions);
	assert.deepEqual(result.modules, initialPublications());
	for (const row of result.modules)
		assert.deepEqual(Object.keys(row).sort(), ['id', 'revision', 'status', 'updatedAt']);
	assert.ok(!JSON.stringify(result.modules).includes(student.id));
	assert.ok(!JSON.stringify(result.modules).includes(created.recoveryKey.key));
	const insecure = await student.request('/modules', undefined, { 'X-Forwarded-Proto': 'http' });
	assert.equal(insecure.status, 400);
	assert.equal(insecure.error.code, 'HTTPS_REQUIRED');
	assert.equal(insecure.modules, undefined);
	assert.equal(insecure.headers.get('set-cookie'), null);
	assert.deepEqual(f.db.prepare('SELECT * FROM sessions').all(), sessions);
	assert.equal(
		(await student.request('/me', undefined, { 'X-Forwarded-Proto': 'http' })).status,
		400
	);
	assert.equal(
		(await student.request('/modules', {}, { 'X-Forwarded-Proto': 'http' })).status,
		400
	);
	const head = await fetch(`${f.origin}/api/modules`, {
		method: 'HEAD',
		headers: { 'X-Forwarded-Proto': 'https' }
	});
	assert.equal(head.status, 200);
	assert.equal(await head.text(), '');
	assert.equal(head.headers.get('set-cookie'), null);
});

test('modulpublisering: innlogging, lærerrolle, konto, CSRF, Origin og validering kreves ved endring', async (t) => {
	const f = await fixture(t),
		student = f.client(),
		teacher = await f.staff(),
		admin = await f.staff('admin');
	assert.equal((await student.set('meldingens-reise', 'upcoming', 0)).status, 401);
	await student.request('/auth/create', {});
	assert.equal((await student.set('meldingens-reise', 'upcoming', 0)).status, 403);
	assert.equal(
		(await teacher.set('meldingens-reise', 'upcoming', 0, { accountId: student.id })).status,
		409
	);
	assert.equal(
		(await teacher.set('meldingens-reise', 'upcoming', 0, {}, { 'X-CSRF-Token': '' })).status,
		403
	);
	assert.equal(
		(await teacher.set('meldingens-reise', 'upcoming', 0, {}, { Origin: 'https://foreign.test' }))
			.status,
		403
	);
	assert.equal((await teacher.set('unknown-module', 'active', 0)).status, 404);
	for (const status of ['done', '__proto__', '', null, 1, ['active']])
		assert.equal((await teacher.set('meldingens-reise', status, 0)).status, 400);
	for (const revision of [-1, 0.5, '0', null, Number.MAX_SAFE_INTEGER + 1])
		assert.equal((await teacher.set('meldingens-reise', 'upcoming', revision)).status, 400);
	assert.equal((await admin.set('data-og-lagring', 'upcoming', 0)).status, 200);
	f.db.prepare('DELETE FROM user_roles WHERE user_id=?').run(teacher.id);
	assert.equal((await teacher.set('meldingens-reise', 'upcoming', 0)).status, 403);
	assert.equal(publicationFor('meldingens-reise', modulePublications(f.db).modules).revision, 0);
});

test('modulpublisering: kommende, aktiv og ferdig endrer ikke elevprogresjon, poeng eller andre moduler', async (t) => {
	const f = await fixture(t),
		teacher = await f.staff(),
		student = f.client();
	await student.request('/auth/create', {});
	f.db
		.prepare('INSERT INTO progress VALUES (?,?,?,?,?,?)')
		.run(student.id, 'frontend-backend', 'existing-work', 10, 10, '{"saved":true}');
	f.db
		.prepare('INSERT INTO rewards VALUES (?,?,?,25,?,10)')
		.run(randomUUID(), student.id, 'existing-reward', 'Behold poeng');
	const progress = f.db.prepare('SELECT * FROM progress').all();
	const rewards = f.db.prepare('SELECT * FROM rewards').all();
	const original = (await teacher.request('/modules')).modules;
	let revision = 0;
	for (const status of ['upcoming', 'active', 'completed']) {
		const result = await teacher.set('meldingens-reise', status, revision++);
		assert.equal(result.status, 200);
		const record = publicationFor('meldingens-reise', result.modules);
		assert.equal(record.status, status);
		assert.equal(record.revision, revision);
		assert.ok(Number.isSafeInteger(record.updatedAt));
		assert.deepEqual(
			result.modules.filter((module) => module.id !== 'meldingens-reise'),
			original.filter((module) => module.id !== 'meldingens-reise')
		);
		assert.deepEqual(f.db.prepare('SELECT * FROM progress').all(), progress);
		assert.deepEqual(f.db.prepare('SELECT * FROM rewards').all(), rewards);
	}
	assert.equal(
		f.db.prepare("SELECT COUNT(*) AS n FROM teacher_actions WHERE action LIKE 'module-%'").get().n,
		3
	);
	assert.ok(
		visibleModules(moduler, modulePublications(f.db).modules).some(
			(module) => module.id === 'meldingens-reise'
		)
	);
});

test('modulpublisering: samtidige lærerendringer bruker versjon, og tapt svar kan prøves igjen', async (t) => {
	const f = await fixture(t),
		first = await f.staff(),
		second = await f.staff();
	const changes = await Promise.all([
		first.set('meldingens-reise', 'upcoming', 0),
		second.set('meldingens-reise', 'completed', 0)
	]);
	assert.deepEqual(changes.map((result) => result.status).sort(), [200, 409]);
	assert.equal(changes.find((result) => result.status === 409).error.code, 'MODULE_CONFLICT');
	const saved = publicationFor('meldingens-reise', modulePublications(f.db).modules);
	assert.equal(saved.revision, 1);
	assert.equal((await first.set('meldingens-reise', saved.status, 0)).status, 200);
	assert.equal((await first.set('meldingens-reise', saved.status, 1)).status, 200);
	assert.equal(
		f.db.prepare("SELECT COUNT(*) AS n FROM teacher_actions WHERE action LIKE 'module-%'").get().n,
		1
	);
	assert.equal((await second.set('meldingens-reise', 'active', 1)).status, 200);
	assert.equal((await second.set('meldingens-reise', saved.status, 2)).status, 200);
	assert.equal(
		(await first.set('meldingens-reise', saved.status, 0)).error.code,
		'MODULE_CONFLICT'
	);
	assert.equal(publicationFor('meldingens-reise', modulePublications(f.db).modules).revision, 3);
});

test('modulpublisering: oppgradering bevarer elever, og status overlever omstart, backup og slettet lærer', async (t) => {
	const userId = randomUUID();
	const f = await fixture(t, {
		prepare(filename) {
			const old = new DatabaseSync(filename);
			old.exec(
				'PRAGMA foreign_keys=ON; CREATE TABLE migrations(name TEXT PRIMARY KEY,hash TEXT NOT NULL,applied_at INTEGER NOT NULL)'
			);
			const directory = new URL('../server/migrations/', import.meta.url);
			for (const name of readdirSync(directory)
				.filter((name) => /^00[1-9]_/.test(name))
				.sort()) {
				const sql = readFileSync(new URL(name, directory), 'utf8');
				old.exec(sql);
				old
					.prepare('INSERT INTO migrations VALUES (?,?,0)')
					.run(name, createHash('sha256').update(sql).digest('hex'));
			}
			old
				.prepare(
					'INSERT INTO users(id,nickname,created_at,name_assigned,leaderboard_visible,class_code) VALUES (?,?,0,1,0,?)'
				)
				.run(userId, 'Eksisterende profil', '2ITA');
			old.close();
		}
	});
	const student = f.db.prepare('SELECT * FROM users WHERE id=?').get(userId);
	assert.equal(student.class_code, '2ITA');
	assert.equal(student.leaderboard_visible, 0);
	assert.equal(student.nickname, 'Eksisterende profil');
	assert.deepEqual(
		modulePublications(f.db).modules.map((module) => ({ ...module })),
		initialPublications()
	);
	const teacher = await f.staff();
	await teacher.set('data-og-lagring', 'completed', 0);
	const expected = modulePublications(f.db);
	const reopened = openDatabase(f.filename);
	assert.deepEqual(modulePublications(reopened), expected);
	reopened.close();
	const backupPath = join(f.directory, 'backup.sqlite');
	backupDatabase(f.filename, backupPath);
	const backup = openDatabase(backupPath);
	assert.deepEqual(modulePublications(backup), expected);
	assert.deepEqual(backup.prepare('SELECT * FROM users WHERE id=?').get(userId), student);
	backup.close();
	f.db.prepare('DELETE FROM users WHERE id=?').run(teacher.id);
	assert.deepEqual(modulePublications(f.db), expected);
	assert.equal(
		f.db
			.prepare("SELECT updated_by FROM module_publication WHERE module_id='data-og-lagring'")
			.get().updated_by,
		null
	);
});

test('modulpublisering: feil i statuslageret viser ingen antatt publisering eller interne detaljer', async (t) => {
	const f = await fixture(t);
	f.db.exec('DROP TABLE module_publication');
	const result = await f.client().request('/modules');
	assert.equal(result.status, 500);
	assert.equal(result.error.code, 'INTERNAL');
	assert.equal(result.modules, undefined);
	assert.ok(!result.error.message.includes('module_publication'));
});
