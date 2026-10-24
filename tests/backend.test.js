import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../server/database.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
import { backupDatabase } from '../server/backup.js';

const solutions = {
	'redd-chatten': {
		tekst: ['normalize-text', 'guard-text', 'save-body', 'reply-created'],
		avsender: ['guard-login', 'normalize-text', 'guard-text', 'save-session', 'reply-created'],
		sletting: [
			'guard-login',
			'find-id',
			'guard-found',
			'guard-owner-session',
			'delete-id',
			'reply-deleted'
		]
	},
	meldingsdetektiven: {
		kontrakt: { textKey: 'tekst', validation: 'behold' },
		visning: { roomFilter: 'selected', assign: 'replace' },
		session: { postCredentials: 'include', readCredentials: 'include', identity: 'session' },
		dobbel: { eventHandling: 'form', merge: 'replace' }
	},
	chat: {
		lever: ['ada-post', 'noah-get-generelt'],
		oppdater: ['noah-get-generelt'],
		rom: ['noah-get-gaming']
	}
};

async function fixture(t, { persistent = false, secure = false, limits = false } = {}) {
	const dir = mkdtempSync(join(tmpdir(), 'itlab-test-'));
	const filename = persistent ? join(dir, 'test.sqlite') : ':memory:';
	let now = Date.now();
	const config = readConfig(
		secure ? { NODE_ENV: 'production', APP_ORIGIN: 'https://itlab.example.test' } : {}
	);
	const db = openDatabase(filename);
	const server = createApp({ db, config, clock: () => now, limits }).listen(0, '127.0.0.1');
	await once(server, 'listening');
	const base = `http://127.0.0.1:${server.address().port}`;
	t.after(async () => {
		await new Promise((resolve) => server.close(resolve));
		db.close();
		rmSync(dir, { recursive: true, force: true });
	});
	function client() {
		return {
			cookie: '',
			csrf: '',
			user: null,
			key: null,
			async request(path, body, { origin = config.origin, csrf = true, headers = {} } = {}) {
				const response = await fetch(base + path, {
					method: body === undefined ? 'GET' : 'POST',
					headers: {
						...(body === undefined ? {} : { 'Content-Type': 'application/json', Origin: origin }),
						...(this.cookie ? { Cookie: this.cookie } : {}),
						...(csrf && this.csrf ? { 'X-CSRF-Token': this.csrf } : {}),
						...(secure ? { 'X-Forwarded-Proto': 'https' } : {}),
						...headers
					},
					body: body === undefined ? undefined : JSON.stringify(body)
				});
				const cookie = response.headers.getSetCookie()[0];
				if (cookie) this.cookie = cookie.split(';')[0];
				const result = await response.json();
				if (result.csrfToken) this.csrf = result.csrfToken;
				if (result.user) this.user = result.user;
				if (result.recoveryKey) this.key = result.recoveryKey;
				return { status: response.status, result, headers: response.headers };
			},
			async create() {
				const response = await this.request('/api/auth/create', { remember: true });
				assert.equal(response.status, 201);
				return response;
			},
			async event(body) {
				return this.request('/api/progress', {
					eventId: randomUUID(),
					version: 1,
					accountId: this.user?.id ?? 'anonymous',
					...body
				});
			}
		};
	}
	return {
		db,
		dir,
		filename,
		base,
		config,
		client,
		advance: (ms) => {
			now += ms;
		}
	};
}

const review = {
	kind: 'review',
	activityId: 'frontend-backend',
	objectiveId: 'review',
	confirmed: true
};

test('konto: kun nøkkelhash på serveren, beskyttet cookie og gjenbrukbar innlogging', async (t) => {
	const f = await fixture(t, { persistent: true });
	const a = f.client();
	const created = await a.create();
	assert.match(created.headers.getSetCookie()[0], /HttpOnly/i);
	assert.match(created.headers.getSetCookie()[0], /SameSite=Lax/i);
	assert.equal(created.result.summary.xp, 0);
	const stored = f.db.prepare('SELECT hash FROM recovery_keys').get().hash;
	assert.notEqual(stored, a.key.key);
	assert.equal(stored.length, 64);
	assert.equal(readFileSync(f.filename).includes(Buffer.from(a.key.key)), false);
	const b = f.client();
	const login = await b.request('/api/auth/key', { key: a.key.key, remember: true });
	assert.equal(login.status, 200);
	assert.equal(login.result.user.id, a.user.id);
	const c = f.client();
	assert.equal((await c.request('/api/auth/key', { key: a.key.key })).status, 200);
});

test('progresjon: start gir ingen XP; belønning gis én gang, også med nye hendelses-ID-er', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	const start = await a.event({ ...review, kind: 'start', confirmed: undefined });
	assert.equal(start.result.summary.xp, 0);
	assert.equal(
		start.result.summary.progress.find((p) => p.id === 'frontend-backend').status,
		'started'
	);
	const body = {
		eventId: randomUUID(),
		version: 1,
		accountId: a.user.id,
		...review,
		points: 999999
	};
	const first = await a.request('/api/progress', body);
	assert.equal(first.result.summary.xp, 15);
	assert.equal(first.result.newRewards.length, 1);
	const duplicate = await a.request('/api/progress', body);
	assert.equal(duplicate.result.duplicate, true);
	assert.equal(duplicate.result.summary.xp, 15);
	assert.equal((await a.request('/api/progress', { ...body, activityId: 'sessions' })).status, 409);
	const parallel = await Promise.all(Array.from({ length: 8 }, () => a.event(review)));
	assert.ok(parallel.every((r) => r.result.summary.xp === 15));
	assert.equal(f.db.prepare('SELECT count(*) AS n FROM rewards').get().n, 1);
	assert.equal(f.db.prepare('SELECT count(*) AS n FROM achievements').get().n, 1);
});

test('tilgang: CSRF, Origin, pålogging og kontoavgrensning håndheves', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	assert.equal((await a.request('/api/progress', { ...review }, { csrf: false })).status, 403);
	assert.equal(
		(await a.request('/api/auth/logout', {}, { origin: 'https://evil.example' })).status,
		403
	);
	assert.equal(
		(
			await a.request(
				'/api/auth/logout',
				{},
				{ headers: { 'X-CSRF-Token': 'ø'.repeat(a.csrf.length) } }
			)
		).status,
		403
	);
	const b = f.client();
	await b.create();
	assert.equal((await a.event({ ...review, accountId: b.user.id })).status, 409);
	const anonymous = f.client();
	assert.equal((await anonymous.event(review)).status, 401);
	await a.event(review);
	const mine = await b.request('/api/me');
	assert.equal(mine.result.summary.xp, 0);
	const old = a.cookie;
	await a.request('/api/auth/logout', {});
	a.cookie = old;
	assert.equal((await a.request('/api/me')).result.user, null);
});

test('ny nøkkel sperrer gammel fil og andre økter, men beholder fremgangen', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await a.event(review);
	const oldKey = a.key.key,
		b = f.client();
	await b.request('/api/auth/key', { key: oldKey });
	const rotated = await a.request('/api/auth/rotate-key', {});
	assert.equal(rotated.status, 200);
	assert.equal((await b.request('/api/me')).result.user, null);
	const c = f.client();
	assert.equal((await c.request('/api/auth/key', { key: oldKey })).status, 401);
	const restored = await c.request('/api/auth/key', { key: rotated.result.recoveryKey.key });
	assert.equal(restored.result.summary.xp, 15);
	assert.equal((await a.request('/api/me')).result.user.id, c.user.id);
});

test('serveren kontrollerer alle tre spill, bonus og achievements; nullstilling tar ikke bort poeng', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	let result;
	for (const [activityId, objectives] of Object.entries(solutions)) {
		for (const [objectiveId, solution] of Object.entries(objectives)) {
			result = await a.event({ kind: 'attempt', activityId, objectiveId, solution });
			assert.equal(result.status, 200, JSON.stringify(result.result));
			assert.equal(result.result.passed, true, `${activityId}/${objectiveId}`);
		}
	}
	assert.equal(result.result.summary.xp, 325);
	assert.equal(result.result.summary.achievements.filter((a) => a.earnedAt !== null).length, 4);
	const failed = await a.event({
		kind: 'attempt',
		activityId: 'redd-chatten',
		objectiveId: 'tekst',
		solution: ['save-body', 'guard-present', 'reply-created'],
		passed: true,
		points: 99999
	});
	assert.equal(failed.result.passed, false);
	assert.equal(failed.result.summary.xp, 325);
	assert.equal(
		failed.result.summary.progress.find((p) => p.id === 'redd-chatten').status,
		'passed'
	);
	await a.event(review);
	result = await a.event({ ...review, activityId: 'oving-10' });
	assert.equal(result.result.summary.xp, 355);
	assert.equal(result.result.summary.achievements.filter((a) => a.earnedAt !== null).length, 6);
});

test('ugyldige løsninger og innholdsversjoner kan ikke gi poeng', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	for (const body of [
		{ kind: 'attempt', activityId: 'redd-chatten', objectiveId: 'tekst', solution: ['unknown'] },
		{ kind: 'review', activityId: 'redd-chatten', objectiveId: 'tekst', confirmed: true },
		{ ...review, activityId: 'unknown' },
		{
			kind: 'attempt',
			activityId: 'meldingsdetektiven',
			objectiveId: 'kontrakt',
			solution: { textKey: 'tekst', validation: 'behold', surprise: 'oops' }
		}
	])
		assert.equal((await a.event(body)).status, 400);
	assert.equal((await a.event({ ...review, version: 999 })).status, 409);
	assert.equal((await a.request('/api/me')).result.summary.xp, 0);
});

test('husket og midlertidig pålogging utløper på serveren', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	const b = f.client();
	await b.request('/api/auth/key', { key: a.key.key, remember: false });
	f.advance(31 * 60000);
	assert.equal((await b.request('/api/me')).result.user, null);
	assert.ok((await a.request('/api/me')).result.user);
	f.advance(31 * 86400000);
	assert.equal((await a.request('/api/me')).result.user, null);
	const relogin = await a.request('/api/auth/key', { key: a.key.key, remember: true });
	assert.equal(relogin.status, 200);
	for (let i = 0; i < 7; i++) {
		f.advance(29 * 86400000);
		await a.request('/api/me');
	}
	assert.equal((await a.request('/api/me')).result.user, null);
});

test('backup av aktiv database bevarer konto, økt, poeng og progresjon', async (t) => {
	const f = await fixture(t, { persistent: true });
	const a = f.client();
	await a.create();
	await a.event(review);
	const backup = join(f.dir, 'backup.sqlite');
	backupDatabase(f.filename, backup);
	const restored = openDatabase(backup);
	try {
		assert.equal(restored.prepare('SELECT count(*) AS n FROM users').get().n, 1);
		assert.equal(restored.prepare('SELECT sum(points) AS xp FROM rewards').get().xp, 15);
		assert.equal(restored.prepare('SELECT count(*) AS n FROM sessions').get().n, 1);
		assert.ok(restored.prepare('SELECT completed_at FROM progress').get().completed_at);
		assert.throws(() => backupDatabase(f.filename, backup));
	} finally {
		restored.close();
	}
	const restarted = openDatabase(f.filename);
	assert.equal(restarted.prepare('SELECT count(*) AS n FROM migrations').get().n, 1);
	restarted.close();
});

test('sletting fjerner hele profilen og gjør nøkkelfilen ubrukelig', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await a.event(review);
	const key = a.key.key;
	assert.equal((await a.request('/api/me/delete', { confirm: 'wrong' })).status, 400);
	assert.equal((await a.request('/api/me/delete', { confirm: 'SLETT' })).status, 200);
	for (const table of [
		'users',
		'recovery_keys',
		'sessions',
		'progress',
		'rewards',
		'achievements',
		'receipts'
	])
		assert.equal(f.db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n, 0);
	assert.equal((await f.client().request('/api/auth/key', { key })).status, 401);
});

test('produksjon krever HTTPS og gir Secure-cookie; feil i forespørsler håndteres', async (t) => {
	assert.throws(
		() => readConfig({ NODE_ENV: 'production', APP_ORIGIN: 'http://localhost:8080' }),
		/HTTPS/
	);
	assert.throws(() => readConfig({ NODE_ENV: 'production' }), /APP_ORIGIN/);
	const f = await fixture(t, { secure: true });
	const a = f.client();
	const created = await a.create();
	assert.match(created.headers.getSetCookie()[0], /^__Host-itlab-session=/);
	assert.match(created.headers.getSetCookie()[0], /; Secure/);
	assert.equal((await fetch(f.base + '/api/health')).status, 400);
	assert.equal(
		(
			await fetch(f.base + '/api/auth/create', {
				method: 'POST',
				headers: {
					Origin: f.config.origin,
					'X-Forwarded-Proto': 'https',
					'Content-Type': 'application/json'
				},
				body: '{'
			})
		).status,
		400
	);
	assert.equal(
		(
			await fetch(f.base + '/api/auth/create', {
				method: 'POST',
				headers: {
					Origin: f.config.origin,
					'X-Forwarded-Proto': 'https',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ nickname: 'a'.repeat(9000) })
			})
		).status,
		413
	);
});

test('innlogging har en begrensning mot mange nøkkelforsøk', async (t) => {
	const f = await fixture(t, { limits: true });
	const a = f.client();
	for (let i = 0; i < 120; i++)
		assert.equal((await a.request('/api/auth/key', { key: 'invalid' })).status, 401);
	assert.equal((await a.request('/api/auth/key', { key: 'invalid' })).status, 429);
});

test('API-prosessen feiler tydelig når porten er opptatt', async (t) => {
	const f = await fixture(t);
	const child = spawn(process.execPath, ['server/index.js'], {
		cwd: new URL('..', import.meta.url),
		env: {
			...process.env,
			NODE_ENV: 'development',
			APP_ORIGIN: 'http://localhost:5173',
			API_PORT: new URL(f.base).port,
			ITLAB_DB_PATH: join(f.dir, 'port-test.sqlite')
		},
		stdio: ['ignore', 'pipe', 'pipe']
	});
	let output = '';
	child.stdout.on('data', (data) => {
		output += data;
	});
	child.stderr.on('data', (data) => {
		output += data;
	});
	const timeout = setTimeout(() => child.kill('SIGKILL'), 10000);
	try {
		const [code] = await once(child, 'exit');
		assert.equal(code, 1);
		assert.match(output, /EADDRINUSE/);
		assert.doesNotMatch(output, /API klar/);
	} finally {
		clearTimeout(timeout);
	}
});
