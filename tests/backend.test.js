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
	assert.equal(restarted.prepare('SELECT count(*) AS n FROM migrations').get().n, 3);
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
		'checkpoint_attempts'
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
	// Simulate the previous schema and verify the additive migration preserves existing data.
	f.db.exec(
		"DROP TABLE checkpoint_attempts; DROP TABLE lab_profiles; DELETE FROM migrations WHERE name IN ('002_lab_profile.sql','003_checkpoint_attempts.sql')"
	);
	const upgraded = openDatabase(f.filename);
	try {
		assert.equal(summary(upgraded, a.user.id).xp, 0);
		assert.equal(summary(upgraded, a.user.id).lab.colorId, 'forest');
		assert.equal(upgraded.prepare('SELECT count(*) AS n FROM migrations').get().n, 3);
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
	assert.equal(old.maximumXp, 615);
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
	assert.equal(passed.result.summary.maximumXp, 615);
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
