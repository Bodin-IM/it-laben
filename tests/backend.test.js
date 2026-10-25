import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { setTeacherRole } from '../server/learning-access.js';
import { openDatabase } from '../server/database.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
import { backupDatabase } from '../server/backup.js';
import { reconcileAchievements, summary, submit } from '../server/progress.js';

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

function historicalDatabase(filename, count) {
	const db = new DatabaseSync(filename);
	db.exec(
		'PRAGMA foreign_keys=ON; CREATE TABLE migrations(name TEXT PRIMARY KEY,hash TEXT NOT NULL,applied_at INTEGER NOT NULL)'
	);
	const files = [
		'001_initial.sql',
		'002_lab_profile.sql',
		'003_checkpoint_attempts.sql',
		'004_timed_challenges.sql'
	];
	for (const name of files.slice(0, count)) {
		const sql = readFileSync(new URL(`../server/migrations/${name}`, import.meta.url), 'utf8');
		db.exec(sql);
		db.prepare('INSERT INTO migrations VALUES (?,?,?)').run(
			name,
			createHash('sha256').update(sql).digest('hex'),
			Date.now()
		);
	}
	return db;
}

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
					version: 2,
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

async function openQuiz(f, client, activityId = 'frontend-backend') {
	const opened = await client.request('/api/checkpoints/open', {
		accountId: client.user.id,
		activityId,
		objectiveId: 'check-v2'
	});
	assert.equal(opened.status, 200, JSON.stringify(opened.result));
	const assessment = opened.result.assessment;
	const row = f.db.prepare('SELECT * FROM checkpoint_attempts WHERE id=?').get(assessment.id);
	const questions = JSON.parse(row.questions_json);
	const solution = Object.fromEntries(questions.map((item) => [item.id, item.correctChoiceId]));
	return {
		opened,
		assessment,
		row,
		questions,
		body: { kind: 'check', activityId, objectiveId: 'check-v2', attemptId: assessment.id, solution }
	};
}
async function passQuiz(f, client, activityId = 'frontend-backend') {
	const { body } = await openQuiz(f, client, activityId);
	const response = await client.event(body);
	assert.equal(response.status, 200, JSON.stringify(response.result));
	assert.equal(response.result.passed, true);
	return response;
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

test('progresjon: klikk gir ingen XP; bestått fagsjekk frigjør poengene én gang', async (t) => {
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
		version: 2,
		accountId: a.user.id,
		...review,
		points: 999999
	};
	const first = await a.request('/api/progress', body);
	assert.equal(first.result.summary.xp, 0);
	assert.equal(first.result.newRewards.length, 0);
	assert.equal(
		first.result.summary.progress.find((item) => item.id === review.activityId).pendingXp,
		15
	);
	const duplicate = await a.request('/api/progress', body);
	assert.equal(duplicate.result.duplicate, true);
	assert.equal(duplicate.result.summary.xp, 0);
	assert.equal((await a.request('/api/progress', { ...body, activityId: 'sessions' })).status, 409);
	const parallel = await Promise.all(Array.from({ length: 8 }, () => a.event(review)));
	assert.ok(parallel.every((r) => r.result.summary.xp === 0));
	const passed = await passQuiz(f, a);
	assert.equal(passed.result.summary.xp, 25);
	assert.equal(passed.result.newRewards.length, 2);
	assert.equal((await a.event(review)).result.summary.xp, 25);
	assert.equal(f.db.prepare('SELECT count(*) AS n FROM rewards').get().n, 2);
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
	await passQuiz(f, a);
	const oldKey = a.key.key,
		b = f.client();
	await b.request('/api/auth/key', { key: oldKey });
	const rotated = await a.request('/api/auth/rotate-key', {});
	assert.equal(rotated.status, 200);
	assert.equal((await b.request('/api/me')).result.user, null);
	const c = f.client();
	assert.equal((await c.request('/api/auth/key', { key: oldKey })).status, 401);
	const restored = await c.request('/api/auth/key', { key: rotated.result.recoveryKey.key });
	assert.equal(restored.result.summary.xp, 25);
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
		const before = (await a.request('/api/me')).result.summary;
		assert.equal(before.progress.find((item) => item.id === activityId).creditEligible, false);
		result = await passQuiz(f, a, activityId);
	}
	assert.equal(result.result.summary.xp, 355);
	assert.equal(result.result.summary.achievements.filter((a) => a.earnedAt !== null).length, 6);
	const failed = await a.event({
		kind: 'attempt',
		activityId: 'redd-chatten',
		objectiveId: 'tekst',
		solution: ['save-body', 'guard-present', 'reply-created'],
		passed: true,
		points: 99999
	});
	assert.equal(failed.result.passed, false);
	assert.equal(failed.result.summary.xp, 355);
	assert.equal(
		failed.result.summary.progress.find((p) => p.id === 'redd-chatten').status,
		'passed'
	);
	await a.event(review);
	result = await a.event({ ...review, activityId: 'oving-10' });
	assert.equal(result.result.summary.xp, 355);
	await passQuiz(f, a);
	result = await passQuiz(f, a, 'oving-10');
	assert.equal(result.result.summary.xp, 405);
	assert.equal(result.result.summary.achievements.filter((a) => a.earnedAt !== null).length, 8);
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
	assert.equal(
		(await a.request('/api/me/lab', { colorId: 'ocean', featuredAchievementId: 'first-review' }))
			.status,
		200
	);
	await passQuiz(f, a);
	const backup = join(f.dir, 'backup.sqlite');
	backupDatabase(f.filename, backup);
	const restored = openDatabase(backup);
	try {
		assert.equal(restored.prepare('SELECT count(*) AS n FROM users').get().n, 1);
		assert.equal(restored.prepare('SELECT sum(points) AS xp FROM rewards').get().xp, 25);
		assert.equal(restored.prepare('SELECT count(*) AS n FROM checkpoint_attempts').get().n, 1);
		assert.equal(restored.prepare('SELECT count(*) AS n FROM sessions').get().n, 1);
		assert.ok(restored.prepare('SELECT completed_at FROM progress').get().completed_at);
		assert.equal(restored.prepare('SELECT color_id FROM lab_profiles').get().color_id, 'ocean');
		assert.throws(() => backupDatabase(f.filename, backup));
	} finally {
		restored.close();
	}
	const restarted = openDatabase(f.filename);
	assert.equal(restarted.prepare('SELECT count(*) AS n FROM migrations').get().n, 6);
	restarted.close();
});

test('sletting fjerner hele profilen og gjør nøkkelfilen ubrukelig', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await a.event(review);
	await a.request('/api/me/lab', { colorId: 'ocean', featuredAchievementId: 'first-review' });
	await passQuiz(f, a);
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
		'receipts',
		'lab_profiles',
		'checkpoint_attempts',
		'timed_attempts',
		'practice_runs',
		'practice_progress',
		'practice_receipts',
		'user_roles'
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

test('labkort: kosmetiske valg krever egne opptjente merker og følger kontoen på en annen enhet', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	assert.equal(
		(await a.request('/api/me/lab', { colorId: 'iris', featuredAchievementId: null })).status,
		400
	);
	assert.equal(
		(await a.request('/api/me/lab', { colorId: 'ocean', featuredAchievementId: 'session-guard' }))
			.status,
		400
	);
	assert.equal(
		(await a.request('/api/me/lab', { colorId: 'invalid', featuredAchievementId: null })).status,
		400
	);
	await a.event({
		kind: 'attempt',
		activityId: 'redd-chatten',
		objectiveId: 'avsender',
		solution: solutions['redd-chatten'].avsender
	});
	await a.event({
		kind: 'attempt',
		activityId: 'meldingsdetektiven',
		objectiveId: 'session',
		solution: solutions.meldingsdetektiven.session
	});
	const saved = await a.request('/api/me/lab', {
		colorId: 'iris',
		featuredAchievementId: 'session-guard'
	});
	assert.equal(saved.status, 200);
	assert.equal(saved.result.summary.lab.colorId, 'iris');
	assert.equal(saved.result.summary.lab.featuredAchievementId, 'session-guard');
	const b = f.client();
	const other = await b.request('/api/auth/key', { key: a.key.key });
	assert.equal(other.result.summary.lab.colorId, 'iris');
	assert.equal(other.result.summary.xp, 0);
	const c = f.client();
	await c.create();
	assert.equal((await c.request('/api/me')).result.summary.lab.colorId, 'forest');
	assert.equal(
		(await c.request('/api/me/lab', { colorId: 'iris', featuredAchievementId: 'session-guard' }))
			.status,
		400
	);
});

test('oppgradering: nye merker etterregistreres for tidligere fullførte oppdrag uten ekstra XP', async (t) => {
	const f = await fixture(t, { persistent: true });
	const a = f.client();
	await a.create();
	await a.event({
		kind: 'attempt',
		activityId: 'redd-chatten',
		objectiveId: 'avsender',
		solution: solutions['redd-chatten'].avsender
	});
	await a.event({
		kind: 'attempt',
		activityId: 'meldingsdetektiven',
		objectiveId: 'session',
		solution: solutions.meldingsdetektiven.session
	});
	f.db.prepare("DELETE FROM achievements WHERE achievement_id='session-guard'").run();
	const before = summary(f.db, a.user.id);
	const firstBadge = before.achievements.find((item) => item.id === 'first-solution').earnedAt;
	assert.equal(reconcileAchievements(f.db), 1);
	assert.equal(reconcileAchievements(f.db), 0);
	const after = summary(f.db, a.user.id);
	assert.equal(after.xp, 0);
	assert.equal(
		after.achievements.find((item) => item.id === 'first-solution').earnedAt,
		firstBadge
	);
	assert.ok(after.achievements.find((item) => item.id === 'session-guard').earnedAt);
	// Build a real version-1 database, then upgrade its existing users and progress.
	const legacyPath = join(f.dir, 'legacy.sqlite');
	const old = historicalDatabase(legacyPath, 1);
	for (const table of ['users', 'progress', 'rewards', 'achievements']) {
		for (const row of f.db.prepare(`SELECT * FROM ${table}`).all()) {
			const values =
				table === 'users' ? [row.id, row.nickname, row.created_at] : Object.values(row);
			old
				.prepare(`INSERT INTO ${table} VALUES (${values.map(() => '?').join(',')})`)
				.run(...values);
		}
	}
	old.close();
	const upgraded = openDatabase(legacyPath);
	try {
		assert.equal(summary(upgraded, a.user.id).xp, 0);
		assert.equal(summary(upgraded, a.user.id).lab.colorId, 'forest');
		assert.equal(upgraded.prepare('SELECT count(*) AS n FROM migrations').get().n, 6);
	} finally {
		upgraded.close();
	}
});

test('fagsjekker: serverutstedt forsøk krever forkunnskap, skjuler fasit og gjenbrukes på tvers av økter', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	const openBody = {
		accountId: a.user.id,
		activityId: 'frontend-backend',
		objectiveId: 'check-v2'
	};
	assert.equal((await f.client().request('/api/checkpoints/open', openBody)).status, 401);
	assert.equal((await a.request('/api/checkpoints/open', openBody, { csrf: false })).status, 403);
	assert.equal(
		(await a.request('/api/checkpoints/open', openBody, { origin: 'https://evil.test' })).status,
		403
	);
	assert.equal(
		(await a.request('/api/checkpoints/open', openBody)).result.error.code,
		'ASSESSMENT_PREREQUISITE'
	);
	assert.equal(f.db.prepare('SELECT count(*) AS n FROM checkpoint_attempts').get().n, 0);
	await a.event(review);
	const quiz = await openQuiz(f, a);
	assert.equal(quiz.assessment.questions.length, 2);
	assert.deepEqual(Object.keys(quiz.assessment.questions[0]).sort(), ['choices', 'id', 'prompt']);
	assert.deepEqual(Object.keys(quiz.assessment.questions[0].choices[0]).sort(), ['id', 'label']);
	assert.equal(
		quiz.opened.result.summary.progress
			.find((item) => item.id === review.activityId)
			.objectives.find((item) => item.kind === 'check').assessment.lastResult,
		null
	);
	const b = f.client();
	await b.request('/api/auth/key', { key: a.key.key, remember: true });
	const resumed = await b.request('/api/checkpoints/open', openBody);
	assert.deepEqual(resumed.result.assessment, quiz.assessment);
	for (const solution of [
		{},
		{ choice: 'fetch' },
		[],
		{ ...quiz.body.solution, extra: 'x' },
		Object.fromEntries(quiz.questions.map((item) => [item.id, 'invalid']))
	])
		assert.equal((await a.event({ ...quiz.body, solution })).status, 400);
	assert.equal(
		f.db.prepare('SELECT submitted_at FROM checkpoint_attempts').get().submitted_at,
		null
	);
	assert.equal(
		(await a.event({ ...quiz.body, attemptId: randomUUID() })).result.error.code,
		'ASSESSMENT_UNKNOWN'
	);
	const c = f.client();
	await c.create();
	assert.equal((await c.event(quiz.body)).result.error.code, 'ASSESSMENT_UNKNOWN');
	assert.equal(
		(await c.request('/api/checkpoints/open', openBody)).result.error.code,
		'ACCOUNT_CHANGED'
	);
	assert.equal((await passQuiz(f, b)).result.summary.xp, 25);
});

test('fagsjekker: 2 av 2 kreves, innsendt forsøk låses i 24 timer og neste forsøk varierer', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await a.event(review);
	const first = await openQuiz(f, a);
	const question = first.questions[0];
	const wrong = {
		...first.body.solution,
		[question.id]: question.choices.find((item) => item.id !== question.correctChoiceId).id
	};
	const event = { ...first.body, solution: wrong, eventId: randomUUID() };
	const failed = await a.event(event);
	assert.equal(failed.status, 200);
	assert.equal(failed.result.passed, false);
	assert.equal(failed.result.assessmentResult.score, 1);
	assert.equal(failed.result.summary.xp, 0);
	const activity = failed.result.summary.progress.find((item) => item.id === review.activityId);
	const state = activity.objectives.find((item) => item.kind === 'check').assessment;
	assert.equal(activity.status, 'reviewed');
	assert.equal(activity.pendingXp, 15);
	assert.equal(state.nextAttemptAt - state.lastResult.submittedAt, 86400000);
	assert.ok(state.lastResult.questions.every((item) => item.explanation && item.correctLabel));
	assert.equal((await a.event(event)).result.duplicate, true);
	const newEventSameAttempt = await a.event({ ...event, eventId: randomUUID() });
	assert.equal(newEventSameAttempt.result.summary.xp, 0);
	assert.deepEqual(newEventSameAttempt.result.assessmentResult, failed.result.assessmentResult);
	assert.equal((await a.event(first.body)).result.error.code, 'ASSESSMENT_ALREADY_SUBMITTED');
	const openBody = { accountId: a.user.id, activityId: review.activityId, objectiveId: 'check-v2' };
	const blocked = await a.request('/api/checkpoints/open', openBody);
	assert.equal(blocked.status, 429);
	assert.equal(blocked.result.error.retryAt, state.nextAttemptAt);
	assert.equal(blocked.headers.get('Retry-After'), '86400');
	// A fresh session on another device and another event ID cannot reset the timer.
	const b = f.client();
	await b.request('/api/auth/key', { key: a.key.key, remember: true });
	assert.equal((await b.request('/api/checkpoints/open', openBody)).status, 429);
	f.advance(86400000 - 1);
	assert.equal((await b.request('/api/checkpoints/open', openBody)).status, 429);
	f.advance(1);
	const second = await openQuiz(f, b);
	assert.notEqual(second.assessment.id, first.assessment.id);
	assert.equal(second.assessment.number, 2);
	assert.ok(
		second.questions.some(
			(item) => !first.questions.some((previous) => previous.sourceId === item.sourceId)
		)
	);
	for (const item of second.questions) {
		const previous = first.questions.find((other) => other.sourceId === item.sourceId);
		if (previous)
			assert.notEqual(
				item.choices.findIndex((choice) => choice.id === item.correctChoiceId),
				previous.choices.findIndex((choice) => choice.id === previous.correctChoiceId)
			);
	}
	const passed = await b.event(second.body);
	assert.equal(passed.result.summary.xp, 25);
	assert.equal(passed.result.newRewards.length, 2);
	assert.equal(
		passed.result.summary.progress.find((item) => item.id === review.activityId).pendingXp,
		0
	);
	assert.equal((await b.event(second.body)).result.summary.xp, 25);
	assert.equal((await b.request('/api/checkpoints/open', openBody)).result.assessment, null);
	assert.equal(f.db.prepare('SELECT count(*) AS n FROM checkpoint_attempts').get().n, 2);
});

test('fagsjekker: parallelle leveringer kan ikke prøve flere svar i samme forsøk', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await a.event(review);
	const quiz = await openQuiz(f, a);
	const variants = quiz.questions[0].choices.map((choice) => ({
		...quiz.body,
		solution: { ...quiz.body.solution, [quiz.questions[0].id]: choice.id }
	}));
	const results = await Promise.all(variants.map((body) => a.event(body)));
	assert.equal(results.filter((item) => item.status === 200).length, 1);
	assert.equal(
		results.filter((item) => item.result.error?.code === 'ASSESSMENT_ALREADY_SUBMITTED').length,
		2
	);
	assert.equal(
		f.db
			.prepare('SELECT count(*) AS n FROM checkpoint_attempts WHERE submitted_at IS NOT NULL')
			.get().n,
		1
	);
	const xp = (await a.request('/api/me')).result.summary.xp;
	assert.ok(xp === 0 || xp === 25);
});

test('fagsjekker: døgnsgrensen gjelder per aktivitet og konto, og spill krever alle oppdrag før sjekken', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await a.event(review);
	const quiz = await openQuiz(f, a);
	const wrong = Object.fromEntries(
		quiz.questions.map((item) => [
			item.id,
			item.choices.find((choice) => choice.id !== item.correctChoiceId).id
		])
	);
	await a.event({ ...quiz.body, solution: wrong });
	await a.event({ ...review, activityId: 'sessions' });
	assert.equal((await passQuiz(f, a, 'sessions')).result.summary.xp, 25);
	const b = f.client();
	await b.create();
	await b.event(review);
	assert.equal((await passQuiz(f, b)).result.summary.xp, 25);
	const openGame = { accountId: a.user.id, activityId: 'redd-chatten', objectiveId: 'check-v2' };
	assert.equal(
		(await a.request('/api/checkpoints/open', openGame)).result.error.code,
		'ASSESSMENT_PREREQUISITE'
	);
	for (const [objectiveId, solution] of Object.entries(solutions['redd-chatten'])) {
		const saved = await a.event({
			kind: 'attempt',
			activityId: 'redd-chatten',
			objectiveId,
			solution
		});
		assert.equal(saved.result.summary.xp, 25);
	}
	const passed = await passQuiz(f, a, 'redd-chatten');
	assert.equal(passed.result.summary.xp, 135); // 3×25 +25 bonus +10 quiz, plus the other lesson.
});

test('oppgradering: gamle poeng beholdes, men gamle sjekkformat kan ikke gi nye XP', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await a.event(review);
	for (const [objectiveId, points] of [
		['review', 15],
		['check-v1', 10]
	]) {
		f.db
			.prepare('INSERT INTO rewards VALUES (?,?,?,?,?,?)')
			.run(
				randomUUID(),
				a.user.id,
				`objective:frontend-backend:${objectiveId}`,
				points,
				'Tidligere opptjent',
				Date.now()
			);
	}
	f.db
		.prepare('INSERT INTO progress VALUES (?,?,?,?,?,?)')
		.run(a.user.id, review.activityId, 'check-v1', Date.now(), Date.now(), '{"choice":"fetch"}');
	const old = (await a.request('/api/me')).result.summary;
	assert.equal(old.xp, 25);
	assert.equal(old.maximumXp, 665);
	assert.equal(
		(
			await a.event({
				kind: 'check',
				activityId: review.activityId,
				objectiveId: 'check-v1',
				solution: { choice: 'fetch' },
				version: 1
			})
		).status,
		409
	);
	assert.equal(
		(
			await a.event({
				kind: 'check',
				activityId: review.activityId,
				objectiveId: 'check-v2',
				solution: { choice: 'fetch' }
			})
		).result.error.code,
		'ASSESSMENT_UNKNOWN'
	);
	const passed = await passQuiz(f, a);
	assert.equal(passed.result.summary.xp, 35);
	assert.equal(passed.result.newRewards.length, 1);
	assert.equal(passed.result.summary.maximumXp, 665);
});

test('fagsjekker: feil før commit ruller tilbake både forsøk, progresjon og XP', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await a.event(review);
	const quiz = await openQuiz(f, a);
	f.db.exec(
		"CREATE TRIGGER receipt_failure BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT, 'test transaction rollback'); END"
	);
	assert.throws(
		() =>
			submit(f.db, a.user.id, {
				...quiz.body,
				eventId: randomUUID(),
				accountId: a.user.id,
				version: 2
			}),
		/test transaction rollback/
	);
	assert.equal(
		f.db.prepare('SELECT submitted_at FROM checkpoint_attempts').get().submitted_at,
		null
	);
	assert.equal(f.db.prepare('SELECT count(*) AS n FROM rewards').get().n, 0);
	assert.equal(
		f.db.prepare("SELECT count(*) AS n FROM progress WHERE objective_id='check-v2'").get().n,
		0
	);
	f.db.exec('DROP TRIGGER receipt_failure');
	assert.equal((await a.event(quiz.body)).result.summary.xp, 25);
});

test('oppgradering: ventende gjennomganger og spillforsøk fra forrige klient lagres uten å omgå XP-kravet', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	const reviewed = await a.event({ ...review, version: 1 });
	assert.equal(reviewed.status, 200);
	assert.equal(reviewed.result.summary.xp, 0);
	const game = await a.event({
		kind: 'attempt',
		activityId: 'chat',
		objectiveId: 'lever',
		solution: solutions.chat.lever,
		version: 1
	});
	assert.equal(game.result.passed, true);
	assert.equal(game.result.summary.xp, 0);
	assert.equal((await passQuiz(f, a)).result.summary.xp, 25);
});

async function prepareShift(f, client) {
	for (const activityId of ['frontend-backend', 'sessions', 'fillagring']) {
		await client.event({ ...review, activityId });
		await passQuiz(f, client, activityId);
	}
}
async function startShift(f, client, startId = randomUUID()) {
	const response = await client.request('/api/timed/nattvakt/start', {
		accountId: client.user.id,
		startId
	});
	assert.equal(response.status, 200, JSON.stringify(response.result));
	const row = f.db
		.prepare('SELECT * FROM timed_attempts WHERE id=?')
		.get(response.result.state.active.id);
	const snapshot = JSON.parse(row.scenario_json);
	const expected = {
		field: snapshot.field,
		validation: 'content',
		cookies: 'both',
		identity: 'session',
		startup: 'load',
		write: 'durable'
	};
	const sequence = [
		'guard-login',
		'find-id',
		'guard-found',
		'guard-owner-session',
		'delete-id',
		'reply-deleted'
	];
	const answers = Object.fromEntries(
		snapshot.incidents
			.flatMap((item) => item.tasks)
			.map((task) => [
				task.id,
				task.type === 'order'
					? sequence.map((action) =>
							Object.keys(task.values).find((id) => task.values[id] === action)
						)
					: Object.keys(task.values).find((id) => task.values[id] === expected[task.key])
			])
	);
	return {
		response,
		row,
		snapshot,
		answers,
		body: {
			kind: 'timed',
			activityId: 'nattvakt',
			objectiveId: 'shift-v1',
			attemptId: row.id,
			answers
		}
	};
}

test('nattvakt: forberedelser, innlogging, CSRF og konto eier start, utkast og innlevering', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	const initial = await a.request('/api/timed/nattvakt');
	assert.equal(initial.result.state.unlocked, false);
	assert.equal(initial.result.state.active, null);
	assert.equal(initial.result.state.attempts, 0);
	assert.equal(
		(await a.request('/api/timed/nattvakt/start', { accountId: a.user.id, startId: randomUUID() }))
			.result.error.code,
		'TIMED_LOCKED'
	);
	assert.equal((await f.client().request('/api/timed/nattvakt')).status, 401);
	await prepareShift(f, a);
	assert.equal(
		(
			await a.request(
				'/api/timed/nattvakt/start',
				{ accountId: a.user.id, startId: randomUUID() },
				{ csrf: false }
			)
		).status,
		403
	);
	const run = await startShift(f, a);
	const b = f.client();
	await b.create();
	assert.equal((await b.event(run.body)).result.error.code, 'TIMED_UNKNOWN');
	assert.equal(
		(
			await b.request('/api/timed/nattvakt/draft', {
				accountId: b.user.id,
				attemptId: run.row.id,
				revision: 0,
				answers: {}
			})
		).result.error.code,
		'TIMED_UNKNOWN'
	);
	assert.equal(
		(await b.request('/api/timed/nattvakt/start', { accountId: a.user.id, startId: randomUUID() }))
			.result.error.code,
		'ACCOUNT_CHANGED'
	);
	assert.equal((await a.event({ ...run.body, kind: 'attempt', solution: [] })).status, 400);
	assert.equal((await a.event({ ...run.body, version: 1 })).status, 409);
	assert.equal(
		(await a.event({ ...run.body, attemptId: randomUUID() })).result.error.code,
		'TIMED_UNKNOWN'
	);
});

test('nattvakt: én start på tvers av faner og enheter, uforanderlig frist og ingen fasit før levering', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await prepareShift(f, a);
	const startId = randomUUID();
	const runs = await Promise.all(
		Array.from({ length: 5 }, () =>
			a.request('/api/timed/nattvakt/start', { accountId: a.user.id, startId })
		)
	);
	assert.ok(runs.every((run) => run.status === 200));
	const run = runs[0].result.state.active;
	assert.ok(runs.every((item) => item.result.state.active.id === run.id));
	assert.equal(run.deadlineAt - run.startedAt, 480000);
	assert.equal(f.db.prepare('SELECT count(*) AS n FROM timed_attempts').get().n, 1);
	const publicText = JSON.stringify(run);
	assert.equal(publicText.includes('"values"'), false);
	assert.equal(publicText.includes('"expected"'), false);
	assert.equal(publicText.includes('"solution"'), false);
	const b = f.client();
	await b.request('/api/auth/key', { key: a.key.key, remember: true });
	f.advance(120000);
	const resumed = (await b.request('/api/timed/nattvakt')).result;
	assert.equal(resumed.state.active.id, run.id);
	assert.equal(resumed.state.active.deadlineAt, run.deadlineAt);
	assert.equal(resumed.serverNow - run.startedAt, 120000);
	assert.equal(
		(await b.request('/api/timed/nattvakt/start', { accountId: b.user.id, startId: randomUUID() }))
			.result.state.active.id,
		run.id
	);
	assert.equal((await a.request('/api/me')).result.summary.xp, 75);
});

test('nattvakt: utkast gir ingen svarfasit; versjonskontroll og idempotent lagring beskytter andre faner', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await prepareShift(f, a);
	const run = await startShift(f, a);
	const firstTask = run.snapshot.incidents[0].tasks[0];
	const answers = { [firstTask.id]: run.answers[firstTask.id] };
	const body = { accountId: a.user.id, attemptId: run.row.id, revision: 0, answers };
	const saved = await a.request('/api/timed/nattvakt/draft', body);
	assert.equal(saved.status, 200);
	assert.equal(saved.result.state.active.revision, 1);
	assert.equal(saved.result.state.report, null);
	assert.deepEqual(saved.result.state.active.answers, answers);
	assert.equal(
		(await a.request('/api/timed/nattvakt/draft', body)).result.state.active.revision,
		1
	);
	assert.equal(
		(await a.request('/api/timed/nattvakt/draft', { ...body, answers: {} })).result.error.code,
		'TIMED_DRAFT_CONFLICT'
	);
	assert.equal(
		(
			await a.request('/api/timed/nattvakt/draft', {
				...body,
				revision: 1,
				answers: { x: 'forged' }
			})
		).status,
		400
	);
	assert.equal((await a.event({ ...run.body, answers })).status, 400);
	assert.equal(f.db.prepare('SELECT status FROM timed_attempts').get().status, 'active');
	assert.equal((await a.request('/api/me')).result.summary.xp, 75);
});

test('nattvakt: samlet retting gir 50 XP og merke én gang, uendrede svar kan gjeninnsendes etter nettbrudd', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await prepareShift(f, a);
	const run = await startShift(f, a);
	f.advance(90000);
	const body = { ...run.body, eventId: randomUUID(), points: 99999, passed: true, elapsedMs: 1 };
	const first = await a.event(body);
	assert.equal(first.status, 200, JSON.stringify(first.result));
	assert.equal(first.result.passed, true);
	assert.equal(first.result.summary.xp, 125);
	assert.equal(first.result.timedReport.elapsedMs, 90000);
	assert.equal(first.result.timedReport.score, 4);
	assert.ok(
		first.result.timedReport.incidents.every((item) => item.checks.every((check) => check.passed))
	);
	assert.equal(first.result.newRewards.length, 1);
	assert.equal(first.result.newRewards[0].points, 50);
	assert.ok(first.result.summary.achievements.find((item) => item.id === 'nattvakt-v1').earnedAt);
	assert.equal((await a.event(body)).result.duplicate, true);
	const retry = await a.event({ ...body, eventId: randomUUID() });
	assert.equal(retry.result.summary.xp, 125);
	assert.equal(retry.result.newRewards.length, 0);
	const changed = { ...run.answers };
	const task = run.snapshot.incidents[0].tasks[0];
	changed[task.id] = task.choices.find((item) => item.id !== changed[task.id]).id;
	assert.equal(
		(await a.event({ ...run.body, answers: changed })).result.error.code,
		'TIMED_SUBMITTED'
	);
	const status = (await a.request('/api/timed/nattvakt')).result.state;
	assert.equal(status.active, null);
	assert.equal(status.bestMs, 90000);
	assert.equal(status.nextAttemptAt, run.row.started_at + 86400000);
	assert.equal(first.result.summary.maximumXp, 655);
});

test('nattvakt: feil svar avslutter vakten; nye valg og nye hendelses-ID-er gir ikke flere forsøk', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await prepareShift(f, a);
	const run = await startShift(f, a);
	const task = run.snapshot.incidents[0].tasks[0];
	const answers = {
		...run.answers,
		[task.id]: task.choices.find((item) => item.id !== run.answers[task.id]).id
	};
	const failed = await a.event({ ...run.body, answers, passed: true, points: 99999 });
	assert.equal(failed.result.passed, false);
	assert.equal(failed.result.summary.xp, 75);
	assert.equal(failed.result.timedReport.score, 3);
	assert.equal(
		failed.result.summary.progress.find((item) => item.id === 'nattvakt').objectives[0].available,
		false
	);
	assert.equal(failed.result.timedReport.incidents[0].passed, false);
	assert.ok(failed.result.timedReport.incidents[0].solution.length);
	assert.equal((await a.event(run.body)).result.error.code, 'TIMED_SUBMITTED');
	const blocked = await a.request('/api/timed/nattvakt/start', {
		accountId: a.user.id,
		startId: randomUUID()
	});
	assert.equal(blocked.status, 429);
	assert.equal(blocked.result.error.code, 'TIMED_COOLDOWN');
	assert.equal((await a.request('/api/timed/nattvakt')).result.state.bestMs, null);
});

test('nattvakt: serverfristen avviser sen levering selv med riktige svar og forfalsket klienttid', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await prepareShift(f, a);
	const run = await startShift(f, a);
	await a.request('/api/timed/nattvakt/draft', {
		accountId: a.user.id,
		attemptId: run.row.id,
		revision: 0,
		answers: run.answers
	});
	f.advance(480000);
	const late = await a.event({
		...run.body,
		submittedAt: run.row.started_at + 1,
		deadlineAt: Date.now() + 86400000,
		passed: true
	});
	assert.equal(late.result.passed, false);
	assert.equal(late.result.summary.xp, 75);
	assert.equal(late.result.timedReport.reason, 'expired');
	assert.equal(late.result.timedReport.elapsedMs, 480000);
	assert.equal(late.result.timedReport.score, 4); // Correct draft, but the deadline was missed.
	assert.equal((await a.request('/api/timed/nattvakt')).result.state.report.reason, 'expired');
});

test('nattvakt: utløp ved gjenåpning og nøyaktig 24 timer fra start åpner ny variert vakt uten nye XP', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await prepareShift(f, a);
	const first = await startShift(f, a);
	f.advance(1000);
	await a.event(first.body);
	f.advance(86400000 - 1001);
	assert.equal(
		(await a.request('/api/timed/nattvakt/start', { accountId: a.user.id, startId: randomUUID() }))
			.status,
		429
	);
	f.advance(1);
	const second = await startShift(f, a);
	assert.notEqual(second.snapshot.field, first.snapshot.field);
	assert.notEqual(second.row.id, first.row.id);
	f.advance(500);
	const passed = await a.event(second.body);
	assert.equal(passed.result.passed, true);
	assert.equal(passed.result.summary.xp, 125);
	assert.equal(passed.result.newRewards.length, 0);
	assert.equal((await a.request('/api/timed/nattvakt')).result.state.bestMs, 500);
	f.advance(86400000);
	const third = await startShift(f, a);
	f.advance(480000);
	const expired = (await a.request('/api/timed/nattvakt')).result.state;
	assert.equal(expired.active, null);
	assert.equal(expired.report.reason, 'expired');
	assert.equal((await a.event(third.body)).result.summary.xp, 125);
});

test('nattvakt: teknisk feil ruller tilbake retting, poeng og kvittering; backup beholder frist, utkast og rapport', async (t) => {
	const f = await fixture(t, { persistent: true });
	const a = f.client();
	await a.create();
	await prepareShift(f, a);
	const run = await startShift(f, a);
	await a.request('/api/timed/nattvakt/draft', {
		accountId: a.user.id,
		attemptId: run.row.id,
		revision: 0,
		answers: run.answers
	});
	const backup = join(f.dir, 'active-shift.sqlite');
	backupDatabase(f.filename, backup);
	const restored = openDatabase(backup);
	try {
		const row = restored.prepare('SELECT * FROM timed_attempts').get();
		assert.equal(row.deadline_at, run.row.deadline_at);
		assert.equal(row.status, 'active');
		assert.deepEqual(JSON.parse(row.draft_json), run.answers);
	} finally {
		restored.close();
	}
	f.db.exec(
		"CREATE TRIGGER timed_receipt_failure BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT, 'rollback shift'); END"
	);
	assert.throws(
		() =>
			submit(f.db, a.user.id, {
				...run.body,
				eventId: randomUUID(),
				version: 2,
				accountId: a.user.id
			}),
		/rollback shift/
	);
	assert.equal(f.db.prepare('SELECT status FROM timed_attempts').get().status, 'active');
	assert.equal(summary(f.db, a.user.id).xp, 75);
	f.db.exec('DROP TRIGGER timed_receipt_failure');
	assert.equal((await a.event(run.body)).result.summary.xp, 125);
	const reportBackup = join(f.dir, 'reported-shift.sqlite');
	backupDatabase(f.filename, reportBackup);
	const reported = openDatabase(reportBackup);
	try {
		assert.equal(
			JSON.parse(reported.prepare('SELECT report_json FROM timed_attempts').get().report_json)
				.passed,
			true
		);
	} finally {
		reported.close();
	}
	await a.request('/api/me/delete', { confirm: 'SLETT' });
	assert.equal(f.db.prepare('SELECT count(*) AS n FROM timed_attempts').get().n, 0);
});

test('nattvakt: feil i session, blokkorden eller lagring avvises også når de andre rettingene er riktige', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await prepareShift(f, a);
	const run = await startShift(f, a);
	const { gradeNightwatch, validateDraft } = await import('../server/nightwatch.js');
	for (const key of ['cookies', 'identity', 'deletion', 'startup', 'write']) {
		const task = run.snapshot.incidents
			.flatMap((item) => item.tasks)
			.find((item) => item.key === key);
		const answers = {
			...run.answers,
			[task.id]:
				task.type === 'order'
					? [...run.answers[task.id]].reverse()
					: task.choices.find((choice) => choice.id !== run.answers[task.id]).id
		};
		const report = gradeNightwatch(run.snapshot, validateDraft(run.snapshot, answers, true));
		assert.equal(report.filter((item) => !item.passed).length, 1, key);
	}
	const order = run.snapshot.incidents[2].tasks[0];
	const duplicate = [...run.answers[order.id]];
	duplicate[0] = duplicate[1];
	assert.throws(
		() => validateDraft(run.snapshot, { ...run.answers, [order.id]: duplicate }, true),
		TypeError
	);
});

test('nattvakt: en ugyldig framtidig validator kan ikke godkjenne med truthy-verdier eller tomme kontroller', async (t) => {
	const f = await fixture(t);
	const a = f.client();
	await a.create();
	await prepareShift(f, a);
	const run = await startShift(f, a);
	const { timedAdapters } = await import('../server/timed-challenges.js');
	const adapter = timedAdapters['production-v1'];
	const original = adapter.grade;
	try {
		for (const result of [
			[],
			[{ id: 'x', passed: 'false', checks: [{ passed: false }] }],
			[{ id: 'x', passed: true, checks: [] }],
			[{ id: 'x', passed: true, checks: [{ passed: false }] }],
			Promise.resolve([])
		]) {
			adapter.grade = () => result;
			assert.throws(
				() =>
					submit(f.db, a.user.id, {
						...run.body,
						eventId: randomUUID(),
						version: 2,
						accountId: a.user.id
					}),
				/tidsvalidator/
			);
			assert.equal(f.db.prepare('SELECT status FROM timed_attempts').get().status, 'active');
			assert.equal(summary(f.db, a.user.id).xp, 75);
		}
	} finally {
		adapter.grade = original;
	}
});

async function teacherClient(f) {
	const teacher = f.client();
	await teacher.create();
	setTeacherRole(f.db, teacher.user.id, true);
	assert.equal((await teacher.request('/api/me')).result.user.role, 'teacher');
	return teacher;
}
async function openActivity(teacher, activityId, mode = 'practice', minutes = 30) {
	const id = randomUUID();
	const response = await teacher.request('/api/teacher/openings', {
		accountId: teacher.user.id,
		id,
		activityId,
		mode,
		minutes
	});
	assert.equal(response.status, 200, JSON.stringify(response.result));
	return id;
}
async function practiceEvent(client, activityId, body) {
	return client.request(`/api/practice/${activityId}/progress`, {
		eventId: randomUUID(),
		version: 2,
		accountId: client.user.id,
		activityId,
		...body
	});
}
async function practiceQuiz(f, client, activityId = 'frontend-backend', reset = false) {
	const opened = await client.request(`/api/practice/${activityId}/checkpoints/open`, {
		accountId: client.user.id,
		objectiveId: 'check-v2',
		reset
	});
	assert.equal(opened.status, 200, JSON.stringify(opened.result));
	const row = f.db
		.prepare('SELECT * FROM practice_runs WHERE id=?')
		.get(opened.result.assessment.id);
	const questions = JSON.parse(row.snapshot_json);
	return {
		opened,
		row,
		body: {
			kind: 'check',
			objectiveId: 'check-v2',
			attemptId: row.id,
			solution: Object.fromEntries(questions.map((item) => [item.id, item.correctChoiceId]))
		}
	};
}
function shiftAnswers(snapshot) {
	const expected = {
		field: snapshot.field,
		validation: 'content',
		cookies: 'both',
		identity: 'session',
		startup: 'load',
		write: 'durable'
	};
	const sequence = [
		'guard-login',
		'find-id',
		'guard-found',
		'guard-owner-session',
		'delete-id',
		'reply-deleted'
	];
	return Object.fromEntries(
		snapshot.incidents
			.flatMap((item) => item.tasks)
			.map((task) => [
				task.id,
				task.type === 'order'
					? sequence.map((action) =>
							Object.keys(task.values).find((id) => task.values[id] === action)
						)
					: Object.keys(task.values).find((id) => task.values[id] === expected[task.key])
			])
	);
}

test('lærer: serverrollen følger profilen og kan ikke velges av nettleseren; tilgang sjekkes ved hvert kall', async (t) => {
	const f = await fixture(t);
	const student = f.client();
	await student.request('/api/auth/create', {
		nickname: 'Lærer',
		remember: true,
		role: 'teacher',
		teacher: true
	});
	assert.equal((await student.request('/api/me')).result.user.role, 'student');
	assert.equal((await student.request('/api/teacher')).status, 403);
	assert.equal(
		(
			await student.request('/api/teacher/openings', {
				accountId: student.user.id,
				id: randomUUID(),
				activityId: 'nattvakt',
				mode: 'practice',
				minutes: 60,
				role: 'teacher'
			})
		).status,
		403
	);
	setTeacherRole(f.db, student.user.id, true);
	assert.equal((await student.request('/api/teacher')).status, 200);
	const other = f.client();
	await other.request('/api/auth/key', { key: student.key.key });
	assert.equal((await other.request('/api/me')).result.user.role, 'teacher');
	assert.equal(
		(
			await student.request(
				'/api/teacher/openings',
				{ accountId: student.user.id },
				{ csrf: false }
			)
		).status,
		403
	);
	setTeacherRole(f.db, student.user.id, false);
	assert.equal((await other.request('/api/teacher')).status, 403);
	assert.equal((await student.request('/api/me')).result.user.role, 'student');
});

test('åpninger: tidsgrenser, erstatning, idempotent opprettelse, manuell stenging og historikk styres på serveren', async (t) => {
	const f = await fixture(t);
	const teacher = await teacherClient(f);
	const body = {
		accountId: teacher.user.id,
		id: randomUUID(),
		activityId: 'frontend-backend',
		mode: 'practice',
		minutes: 30
	};
	assert.equal((await teacher.request('/api/teacher/openings', body)).status, 200);
	assert.equal((await teacher.request('/api/teacher/openings', body)).status, 200);
	assert.equal(f.db.prepare('SELECT count(*) AS n FROM activity_openings').get().n, 1);
	assert.equal(
		(await teacher.request('/api/teacher/openings', { ...body, minutes: 60 })).status,
		409
	);
	for (const change of [{ activityId: 'missing' }, { mode: 'admin' }, { minutes: 500 }])
		assert.equal(
			(await teacher.request('/api/teacher/openings', { ...body, id: randomUUID(), ...change }))
				.status,
			400
		);
	const next = await openActivity(teacher, 'frontend-backend', 'teaching', 60);
	const publicOpenings = (await f.client().request('/api/me')).result.openings;
	assert.equal(publicOpenings.length, 1);
	assert.equal(publicOpenings[0].id, next);
	assert.equal(Object.hasOwn(publicOpenings[0], 'created_by'), false);
	await teacher.request(`/api/teacher/openings/${next}/close`, { accountId: teacher.user.id });
	await teacher.request(`/api/teacher/openings/${next}/close`, { accountId: teacher.user.id });
	assert.equal((await teacher.request('/api/me')).result.openings.length, 0);
	const timed = await openActivity(teacher, 'sessions');
	f.advance(30 * 60000);
	assert.equal((await teacher.request('/api/me')).result.openings.length, 0);
	assert.equal(
		(await teacher.request('/api/teacher')).result.openings.find((item) => item.id === timed)
			.closedAt,
		null
	);
});

test('øving: lærer kan teste fagsjekker, gjennomganger og spill uten XP, achievements eller ordinære forsøk', async (t) => {
	const f = await fixture(t);
	const teacher = await teacherClient(f);
	const quiz = await practiceQuiz(f, teacher);
	const passed = await practiceEvent(teacher, 'frontend-backend', quiz.body);
	assert.equal(passed.result.passed, true);
	assert.equal(passed.result.newRewards.length, 0);
	assert.equal(
		passed.result.activity.objectives.find((item) => item.kind === 'check').assessment.completed,
		true
	);
	const newQuiz = await practiceQuiz(f, teacher, 'frontend-backend', true);
	assert.notEqual(newQuiz.row.id, quiz.row.id);
	assert.equal(
		(
			await teacher.event({
				...review,
				kind: 'check',
				objectiveId: 'check-v2',
				attemptId: newQuiz.row.id,
				solution: newQuiz.body.solution
			})
		).result.error.code,
		'ASSESSMENT_UNKNOWN'
	);
	assert.equal((await practiceEvent(teacher, 'frontend-backend', review)).result.passed, true);
	assert.equal(
		(
			await practiceEvent(teacher, 'redd-chatten', {
				kind: 'attempt',
				objectiveId: 'sletting',
				solution: solutions['redd-chatten'].sletting
			})
		).result.passed,
		true
	);
	for (const table of [
		'progress',
		'rewards',
		'achievements',
		'receipts',
		'checkpoint_attempts',
		'timed_attempts'
	])
		assert.equal(f.db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n, 0, table);
	assert.equal((await teacher.request('/api/me')).result.summary.xp, 0);
	assert.equal(
		(await teacher.request('/api/learning/redd-chatten?mode=practice')).result.activity.completed,
		1
	);
});

test('åpen øving: bare riktig aktivitet åpnes; sluttførte forsøk kan leses etter stenging uten å starte nye', async (t) => {
	const f = await fixture(t);
	const teacher = await teacherClient(f);
	const student = f.client();
	await student.create();
	assert.equal(
		(
			await student.request('/api/practice/frontend-backend/checkpoints/open', {
				accountId: student.user.id,
				objectiveId: 'check-v2'
			})
		).status,
		403
	);
	const id = await openActivity(teacher, 'frontend-backend');
	const quiz = await practiceQuiz(f, student);
	assert.equal(
		(
			await student.request('/api/practice/sessions/checkpoints/open', {
				accountId: student.user.id,
				objectiveId: 'check-v2'
			})
		).status,
		403
	);
	await teacher.request(`/api/teacher/openings/${id}/close`, { accountId: teacher.user.id });
	assert.equal((await practiceEvent(student, 'frontend-backend', quiz.body)).result.passed, true);
	assert.equal(
		(
			await student.request('/api/practice/frontend-backend/checkpoints/open', {
				accountId: student.user.id,
				objectiveId: 'check-v2',
				reset: true
			})
		).status,
		403
	);
	const other = f.client();
	await other.create();
	assert.equal((await practiceEvent(other, 'frontend-backend', quiz.body)).status, 404);
	assert.equal((await student.request('/api/me')).result.summary.xp, 0);
});

test('øvingsvakt: ingen forkunnskapskrav eller døgnsgrense, lærer kan teste uten frist og ordinær vakt forblir separat', async (t) => {
	const f = await fixture(t);
	const teacher = await teacherClient(f);
	const started = await teacher.request('/api/practice/nattvakt/timed/start', {
		accountId: teacher.user.id,
		startId: randomUUID(),
		untimed: true
	});
	assert.equal(started.status, 200);
	assert.equal(started.result.state.active.deadlineAt, null);
	const id = started.result.state.active.id;
	const row = f.db.prepare('SELECT * FROM practice_runs WHERE id=?').get(id);
	const answers = shiftAnswers(JSON.parse(row.snapshot_json));
	f.advance(86400000);
	assert.equal((await teacher.request('/api/practice/nattvakt/timed')).result.state.active.id, id);
	assert.equal(
		(
			await teacher.event({
				kind: 'timed',
				activityId: 'nattvakt',
				objectiveId: 'shift-v1',
				attemptId: id,
				answers
			})
		).status,
		404
	);
	const passed = await practiceEvent(teacher, 'nattvakt', {
		kind: 'timed',
		objectiveId: 'shift-v1',
		attemptId: id,
		answers
	});
	assert.equal(passed.result.passed, true);
	assert.equal((await teacher.request('/api/me')).result.summary.xp, 0);
	const again = await teacher.request('/api/practice/nattvakt/timed/start', {
		accountId: teacher.user.id,
		startId: randomUUID()
	});
	assert.notEqual(again.result.state.active.id, id);
	assert.equal(again.result.state.active.deadlineAt - again.result.state.active.startedAt, 480000);
	assert.equal(f.db.prepare('SELECT count(*) AS n FROM timed_attempts').get().n, 0);
	const student = f.client();
	await student.create();
	await openActivity(teacher, 'nattvakt');
	assert.equal(
		(
			await student.request('/api/practice/nattvakt/timed/start', {
				accountId: student.user.id,
				startId: randomUUID(),
				untimed: true
			})
		).status,
		403
	);
	const regularPractice = await student.request('/api/practice/nattvakt/timed/start', {
		accountId: student.user.id,
		startId: randomUUID()
	});
	assert.equal(
		regularPractice.result.state.active.deadlineAt - regularPractice.result.state.active.startedAt,
		480000
	);
});

test('undervisningssjekk: ett ekstra forsøk også under ordinær ventetid; feil kan ikke prøves om med ny hendelses-ID', async (t) => {
	const f = await fixture(t);
	const teacher = await teacherClient(f);
	const student = f.client();
	await student.create();
	await student.event(review);
	const ordinary = await openQuiz(f, student);
	const question = ordinary.questions[0];
	await student.event({
		...ordinary.body,
		solution: {
			...ordinary.body.solution,
			[question.id]: question.choices.find((item) => item.id !== question.correctChoiceId).id
		}
	});
	const openingId = await openActivity(teacher, 'frontend-backend', 'teaching');
	const opened = await student.request('/api/checkpoints/open', {
		accountId: student.user.id,
		activityId: 'frontend-backend',
		objectiveId: 'check-v2',
		openingId
	});
	assert.equal(opened.status, 200);
	const attempt = f.db
		.prepare('SELECT * FROM checkpoint_attempts WHERE id=?')
		.get(opened.result.assessment.id);
	assert.equal(attempt.opening_id, openingId);
	const questions = JSON.parse(attempt.questions_json);
	const answers = Object.fromEntries(
		questions.map((item) => [
			item.id,
			item.choices.find((choice) => choice.id !== item.correctChoiceId).id
		])
	);
	const body = {
		kind: 'check',
		activityId: 'frontend-backend',
		objectiveId: 'check-v2',
		attemptId: attempt.id,
		solution: answers
	};
	assert.equal((await student.event(body)).result.passed, false);
	assert.equal(
		(
			await student.request('/api/checkpoints/open', {
				accountId: student.user.id,
				activityId: 'frontend-backend',
				objectiveId: 'check-v2',
				openingId
			})
		).result.error.code,
		'OPENING_USED'
	);
	assert.equal(
		(
			await student.event({
				...body,
				solution: Object.fromEntries(questions.map((item) => [item.id, item.correctChoiceId]))
			})
		).result.error.code,
		'ASSESSMENT_ALREADY_SUBMITTED'
	);
	assert.equal(
		(
			await student.request('/api/checkpoints/open', {
				accountId: student.user.id,
				activityId: 'frontend-backend',
				objectiveId: 'check-v2'
			})
		).status,
		429
	);
	assert.equal((await student.request('/api/me')).result.summary.xp, 0);
});

test('undervisningsåpning: fagsjekk kan bestås uten forkunnskaper; allerede opptjent XP gis ikke igjen', async (t) => {
	const f = await fixture(t);
	const teacher = await teacherClient(f);
	const student = f.client();
	await student.create();
	async function complete(openingId) {
		const opened = await student.request('/api/checkpoints/open', {
			accountId: student.user.id,
			activityId: 'sessions',
			objectiveId: 'check-v2',
			openingId
		});
		assert.equal(opened.status, 200);
		const row = f.db
			.prepare('SELECT * FROM checkpoint_attempts WHERE id=?')
			.get(opened.result.assessment.id);
		const questions = JSON.parse(row.questions_json);
		return student.event({
			kind: 'check',
			activityId: 'sessions',
			objectiveId: 'check-v2',
			attemptId: row.id,
			solution: Object.fromEntries(questions.map((item) => [item.id, item.correctChoiceId]))
		});
	}
	const first = await complete(await openActivity(teacher, 'sessions', 'teaching'));
	assert.equal(first.result.summary.xp, 10);
	const second = await complete(await openActivity(teacher, 'sessions', 'teaching'));
	assert.equal(second.result.passed, true);
	assert.equal(second.result.summary.xp, 10);
	assert.equal(second.result.newRewards.length, 0);
});

test('undervisningsvakt: åpning gir ett forsøk uten forkunnskaper; frist og XP-validering beholdes etter stenging', async (t) => {
	const f = await fixture(t);
	const teacher = await teacherClient(f);
	const student = f.client();
	await student.create();
	const openingId = await openActivity(teacher, 'nattvakt', 'teaching');
	f.advance(29 * 60000);
	const started = await student.request('/api/timed/nattvakt/start', {
		accountId: student.user.id,
		startId: randomUUID(),
		openingId
	});
	assert.equal(started.status, 200);
	const row = f.db
		.prepare('SELECT * FROM timed_attempts WHERE id=?')
		.get(started.result.state.active.id);
	assert.equal(row.opening_id, openingId);
	assert.equal(row.deadline_at - row.started_at, 480000);
	f.advance(2 * 60000); // The opening closes, but the issued attempt still has six minutes.
	assert.equal(
		(await student.request(`/api/timed/nattvakt?openingId=${openingId}`)).result.state.active.id,
		row.id
	);
	const answers = shiftAnswers(JSON.parse(row.scenario_json));
	const passed = await student.event({
		kind: 'timed',
		activityId: 'nattvakt',
		objectiveId: 'shift-v1',
		attemptId: row.id,
		answers
	});
	assert.equal(passed.result.passed, true);
	assert.equal(passed.result.summary.xp, 50);
	assert.equal(
		(
			await student.request('/api/timed/nattvakt/start', {
				accountId: student.user.id,
				startId: randomUUID(),
				openingId
			})
		).result.error.code,
		'OPENING_USED'
	);
	const other = f.client();
	await other.create();
	assert.equal(
		(
			await other.request('/api/timed/nattvakt/start', {
				accountId: other.user.id,
				startId: randomUUID(),
				openingId
			})
		).result.error.code,
		'OPENING_CLOSED'
	);
	assert.equal((await student.request('/api/timed/nattvakt')).result.state.attempts, 0);
});

test('lærerdata: migrasjon fra versjon 4 bevarer vanlige forsøk, og øvingsdata og roller følger backup og sletting', async (t) => {
	const f = await fixture(t, { persistent: true });
	const teacher = await teacherClient(f);
	await practiceQuiz(f, teacher);
	const backup = join(f.dir, 'teacher-backup.sqlite');
	backupDatabase(f.filename, backup);
	const restored = openDatabase(backup);
	try {
		assert.equal(
			restored.prepare('SELECT role FROM user_roles WHERE user_id=?').get(teacher.user.id).role,
			'teacher'
		);
		assert.equal(restored.prepare('SELECT count(*) AS n FROM practice_runs').get().n, 1);
	} finally {
		restored.close();
	}
	await teacher.request('/api/me/delete', { confirm: 'SLETT' });
	assert.equal(f.db.prepare('SELECT count(*) AS n FROM user_roles').get().n, 0);
	assert.equal(f.db.prepare('SELECT count(*) AS n FROM practice_runs').get().n, 0);
	const path = join(f.dir, 'version4.sqlite');
	const old = historicalDatabase(path, 4);
	const id = randomUUID();
	old.prepare('INSERT INTO users VALUES (?,?,?)').run(id, 'Gammel elev', Date.now());
	old
		.prepare(
			"INSERT INTO checkpoint_attempts(id,user_id,activity_id,objective_id,sequence,issued_at,questions_json) VALUES (?,?,?,? ,1,?, '[]')"
		)
		.run(randomUUID(), id, 'sessions', 'check-v2', Date.now());
	old.close();
	const upgraded = openDatabase(path);
	try {
		assert.equal(
			upgraded.prepare('SELECT opening_id FROM checkpoint_attempts').get().opening_id,
			null
		);
		assert.equal(upgraded.prepare('SELECT count(*) AS n FROM migrations').get().n, 6);
	} finally {
		upgraded.close();
	}
});

test('lærerkommando: ekte serverkommando gir og fjerner rollen, og nekter en manglende database', async (t) => {
	const f = await fixture(t, { persistent: true });
	const user = f.client();
	await user.create();
	const command = (action, path = f.filename) =>
		spawnSync(process.execPath, ['server/teacher.js', action, user.user.id], {
			cwd: new URL('..', import.meta.url),
			env: { ...process.env, ITLAB_DB_PATH: path },
			encoding: 'utf8',
			timeout: 10000
		});
	assert.equal(command('grant').status, 0);
	assert.equal((await user.request('/api/me')).result.user.role, 'teacher');
	assert.equal(command('revoke').status, 0);
	assert.equal((await user.request('/api/me')).result.user.role, 'student');
	const missing = join(f.dir, 'must-not-create.sqlite');
	assert.equal(command('grant', missing).status, 1);
	assert.equal(existsSync(missing), false);
});

test('øving: kvitteringer er idempotente, og feil før commit ruller tilbake øvingsresultatet', async (t) => {
	const f = await fixture(t);
	const teacher = await teacherClient(f);
	const run = await practiceQuiz(f, teacher);
	const { submitPractice } = await import('../server/practice.js');
	const body = {
		...run.body,
		activityId: 'frontend-backend',
		eventId: randomUUID(),
		version: 2,
		accountId: teacher.user.id,
		mode: 'practice'
	};
	f.db.exec(
		"CREATE TRIGGER fail_practice_receipt BEFORE INSERT ON practice_receipts BEGIN SELECT RAISE(ABORT, 'rollback practice'); END"
	);
	assert.throws(
		() => submitPractice(f.db, teacher.user.id, 'frontend-backend', body),
		/rollback practice/
	);
	assert.equal(f.db.prepare('SELECT status FROM practice_runs').get().status, 'active');
	assert.equal(f.db.prepare('SELECT count(*) AS n FROM practice_progress').get().n, 0);
	f.db.exec('DROP TRIGGER fail_practice_receipt');
	const result = submitPractice(f.db, teacher.user.id, 'frontend-backend', body);
	assert.equal(result.passed, true);
	assert.equal(submitPractice(f.db, teacher.user.id, 'frontend-backend', body).duplicate, true);
	assert.equal(f.db.prepare('SELECT count(*) AS n FROM practice_receipts').get().n, 1);
	assert.equal(f.db.prepare('SELECT count(*) AS n FROM receipts').get().n, 0);
	assert.equal(summary(f.db, teacher.user.id).xp, 0);
});
