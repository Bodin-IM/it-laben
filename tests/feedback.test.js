import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/database.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
import { feedbackPage } from '../src/lib/feedback.js';
import { saveFeedback, listFeedback, setFeedbackStatus } from '../server/feedback.js';

function submission(overrides = {}) {
	return {
		id: randomUUID(),
		accountId: null,
		category: 'problem',
		message: 'Knappen reagerer ikke når jeg kjører testen.',
		pageHref: '/oving-5/?modul=backend',
		...overrides
	};
}
async function fixture(t, secure = false) {
	const db = openDatabase(':memory:');
	const config = readConfig(
		secure ? { NODE_ENV: 'production', APP_ORIGIN: 'https://it.example' } : {}
	);
	const server = createApp({ db, config, limits: false }).listen(0, '127.0.0.1');
	await once(server, 'listening');
	t.after(async () => {
		server.closeAllConnections();
		await new Promise((r) => server.close(r));
		db.close();
	});
	const base = `http://127.0.0.1:${server.address().port}`;
	function client() {
		return {
			cookie: '',
			csrf: '',
			user: null,
			async request(path, body, extra = {}) {
				const response = await fetch(base + path, {
					method: body === undefined ? 'GET' : 'POST',
					headers: {
						...(body !== undefined
							? { 'Content-Type': 'application/json', Origin: config.origin }
							: {}),
						...(this.cookie ? { Cookie: this.cookie } : {}),
						...(this.csrf ? { 'X-CSRF-Token': this.csrf } : {}),
						...extra
					},
					body: body === undefined ? undefined : JSON.stringify(body)
				});
				const cookie = response.headers.getSetCookie()[0];
				if (cookie) this.cookie = cookie.split(';')[0];
				const result = await response.json();
				if (result.csrfToken) this.csrf = result.csrfToken;
				if (result.user) this.user = result.user;
				return { status: response.status, result };
			},
			async create(role) {
				await this.request('/api/auth/create', {});
				if (role) db.prepare('INSERT INTO user_roles VALUES (?,?,0)').run(this.user.id, role);
				return this;
			}
		};
	}
	return { db, client };
}

test('feedback: kjent side og fag/modul/steg beholdes, vilkårlige parametre og fragmenter fjernes', () => {
	assert.deepEqual(feedbackPage('/tutorial/?tur=prov&token=hemmelig#svar'), {
		path: '/tutorial/',
		href: '/tutorial/?tur=prov',
		title: 'Slik bruker du IT-laben · Prøv'
	});
	assert.match(feedbackPage('/?fag=utvikling&sok=privat').title, /Utvikling/);
	assert.equal(
		feedbackPage('/oving-5/?modul=data-og-lagring&key=hemmelig').href,
		'/oving-5/?modul=backend'
	);
	assert.deepEqual(feedbackPage('/oving-10/?modul=fra-kode-til-drift&token=hemmelig'), {
		path: '/oving-10/',
		href: '/oving-10/?modul=backend',
		title: 'Øving 10: Fra kode til kjørende tjeneste · Backend'
	});
	for (const value of [
		'https://example.com/backend/',
		'//example.com/backend/',
		'/\\example.com/',
		'/laerer/elever/?elev=123',
		'/ukjent/',
		null
	])
		assert.equal(feedbackPage(value), null);
	assert.equal(feedbackPage('/backend/?modul=ukjent').href, '/backend/');
});

test('feedback: elev og gjest kan sende; bare admin kan lese og endre status', async (t) => {
	const { db, client } = await fixture(t);
	const guest = client(),
		student = await client().create(),
		other = await client().create(),
		teacher = await client().create('teacher'),
		admin = await client().create('admin');
	const body = submission({
		accountId: student.user.id,
		pageHref: '/oving-5/?modul=backend&token=hemmelig',
		message: '<script>alert(1)</script>\nBeskrivelse'
	});
	const response = await student.request('/api/feedback', body);
	assert.equal(response.status, 201);
	assert.deepEqual(Object.keys(response.result).sort(), ['createdAt', 'id']);
	assert.equal((await guest.request('/api/feedback', submission())).status, 201);
	const before = db.prepare('SELECT * FROM student_feedback WHERE id=?').get(body.id);
	assert.equal(before.user_id, student.user.id);
	assert.equal(before.page_href, '/oving-5/?modul=backend');
	assert.ok(!JSON.stringify(before).includes('hemmelig'));
	for (const [actor, status] of [
		[guest, 401],
		[student, 403],
		[other, 403],
		[teacher, 403]
	]) {
		assert.equal((await actor.request('/api/admin/feedback')).status, status);
		assert.equal(
			(
				await actor.request(`/api/admin/feedback/${body.id}/status`, {
					accountId: actor.user?.id ?? null,
					status: 'handled'
				})
			).status,
			status
		);
	}
	const inbox = await admin.request('/api/admin/feedback');
	assert.equal(inbox.status, 200);
	assert.equal(inbox.result.total, 2);
	assert.equal(
		inbox.result.items.find((item) => item.id === body.id).nickname,
		student.user.nickname
	);
	assert.equal(
		(
			await admin.request(`/api/admin/feedback/${body.id}/status`, {
				accountId: admin.user.id,
				status: 'handled'
			})
		).status,
		200
	);
	assert.equal((await admin.request('/api/admin/feedback?status=new')).result.total, 1);
	assert.equal(
		(await admin.request('/api/admin/feedback?status=handled')).result.items[0].id,
		body.id
	);
	assert.equal(
		(
			await admin.request(`/api/admin/feedback/${body.id}/status`, {
				accountId: admin.user.id,
				status: 'new'
			})
		).status,
		200
	);
	assert.equal(
		db.prepare('SELECT handled_at FROM student_feedback WHERE id=?').get(body.id).handled_at,
		null
	);
	assert.equal((await student.request('/api/me')).result.summary.xp, 0);
});

test('feedback: Origin, CSRF, konto, validering og duplikatvern håndheves på backend', async (t) => {
	const { db, client } = await fixture(t);
	const student = await client().create(),
		guest = client();
	const body = submission({ accountId: student.user.id });
	assert.equal(
		(await guest.request('/api/feedback', submission(), { Origin: 'https://wrong.invalid' }))
			.status,
		403
	);
	assert.equal(
		(await student.request('/api/feedback', body, { 'X-CSRF-Token': 'wrong' })).status,
		403
	);
	assert.equal((await student.request('/api/feedback', { ...body, accountId: null })).status, 409);
	assert.equal((await guest.request('/api/feedback', body)).status, 409);
	for (const invalid of [
		{ message: '   ' },
		{ message: 'x'.repeat(2001) },
		{ category: 'unknown' },
		{ pageHref: '//evil.invalid/' },
		{ pageHref: '/laerer/' },
		{ pageTitle: 'Forged' },
		{ message: 'a\u0000b' },
		{ id: '1' }
	])
		assert.equal(
			(await student.request('/api/feedback', { ...body, ...invalid })).status,
			400,
			JSON.stringify(invalid)
		);
	assert.equal(db.prepare('SELECT COUNT(*) AS n FROM student_feedback').get().n, 0);
	const first = await student.request('/api/feedback', body);
	const retry = await student.request('/api/feedback', body);
	assert.deepEqual(retry, first);
	assert.equal(db.prepare('SELECT COUNT(*) AS n FROM student_feedback').get().n, 1);
	assert.equal(
		(await student.request('/api/feedback', { ...body, message: 'Endret' })).status,
		409
	);
	assert.equal((await guest.request('/api/feedback', { ...body, accountId: null })).status, 409);
});

test('feedback: HTTPS kreves i produksjon', async (t) => {
	const { client } = await fixture(t, true);
	const response = await client().request('/api/feedback', submission());
	assert.equal(response.status, 400);
	assert.equal(response.result.error.code, 'HTTPS_REQUIRED');
});

test('feedback: lagring over omstart, sideinndeling, statusgjentakelse og profilsletting', () => {
	const dir = mkdtempSync(join(tmpdir(), 'itlab-feedback-'));
	const filename = join(dir, 'lab.sqlite');
	let db = openDatabase(filename);
	try {
		db.prepare('INSERT INTO users(id,nickname,created_at) VALUES (?,?,0)').run(
			'student',
			'Test elev'
		);
		db.prepare('INSERT INTO users(id,nickname,created_at) VALUES (?,?,0)').run(
			'admin',
			'Test admin'
		);
		db.prepare('INSERT INTO user_roles VALUES (?,?,0)').run('admin', 'admin');
		const own = submission();
		saveFeedback(db, 'student', own, 1000);
		for (let i = 0; i < 23; i++) saveFeedback(db, null, submission(), 2000 + i);
		db.close();
		db = openDatabase(filename);
		const first = listFeedback(db, 'admin', { status: 'all' }),
			second = listFeedback(db, 'admin', { status: 'all', page: '2' });
		assert.equal(first.total, 24);
		assert.equal(first.items.length, 20);
		assert.equal(second.items.length, 4);
		assert.equal(new Set([...first.items, ...second.items].map((item) => item.id)).size, 24);
		setFeedbackStatus(db, 'admin', own.id, { status: 'handled' }, 3000);
		setFeedbackStatus(db, 'admin', own.id, { status: 'handled' }, 4000);
		assert.equal(listFeedback(db, 'admin', { status: 'handled' }).items[0].handledAt, 3000);
		assert.throws(() => listFeedback(db, 'admin', { page: '-1' }));
		assert.throws(() => listFeedback(db, 'admin', { status: "all' OR 1=1" }));
		assert.throws(() => setFeedbackStatus(db, 'admin', 'missing', { status: 'handled' }, 4000));
		db.prepare('DELETE FROM users WHERE id=?').run('student');
		assert.equal(listFeedback(db, 'admin', { status: 'all' }).total, 23);
	} finally {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	}
});

test('feedback: kontogrense hindrer spam, men tillater gjentakelse etter tapt svar', () => {
	const db = openDatabase(':memory:');
	try {
		db.prepare('INSERT INTO users(id,nickname,created_at) VALUES (?,?,0)').run(
			'student',
			'Test elev'
		);
		const body = submission();
		saveFeedback(db, 'student', body, 1000);
		for (let i = 0; i < 4; i++) saveFeedback(db, 'student', submission(), 1000);
		assert.throws(() => saveFeedback(db, 'student', submission(), 2000), {
			code: 'FEEDBACK_LIMIT'
		});
		assert.equal(saveFeedback(db, 'student', body, 2000).id, body.id);
		assert.ok(saveFeedback(db, 'student', submission(), 601001));
	} finally {
		db.close();
	}
});
