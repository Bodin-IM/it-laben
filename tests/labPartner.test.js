import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createApp } from '../server/app.js';
import { openDatabase } from '../server/database.js';
import { readConfig } from '../server/config.js';
import { buildPartnerMessages } from '../server/lab-partner/context.js';
import { initialProgram, evaluateProgram, walkthroughCase } from '../src/lib/reddChatten.js';
import { PARTNER_VERSION, appendPartnerEvent, partnerSnapshotKey } from '../src/lib/labPartner.js';

const solved = ['normalize-text', 'guard-text', 'save-body', 'reply-created'];
function snapshot(overrides = {}) {
	return {
		version: PARTNER_VERSION,
		activityId: 'redd-chatten',
		missionId: 'tekst',
		program: initialProgram('tekst'),
		caseId: 'mellomrom',
		lastRun: null,
		inspection: null,
		running: false,
		events: [],
		...overrides
	};
}
const ask = (overrides = {}) => ({
	question: 'Hvorfor blir meldingen lagret?',
	snapshot: snapshot(),
	history: [],
	...overrides
});
const context = (body) => JSON.parse(buildPartnerMessages(body)[1].content.split('\n')[1]);
const reply = (
	res,
	content = 'Undersøk når listen endres. Prøv både vanlig tekst og mellomrom.'
) => {
	res.writeHead(200, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify({ message: { role: 'assistant', content }, done: true }));
};

async function fixture(t, env = {}, limits = false) {
	const calls = [];
	let respond = (req, res) => reply(res);
	const upstream = createServer(async (req, res) => {
		let data = '';
		for await (const chunk of req) data += chunk;
		calls.push({ body: JSON.parse(data), authorization: req.headers.authorization });
		respond(req, res);
	});
	upstream.listen(0, '127.0.0.1');
	await once(upstream, 'listening');
	const config = readConfig({
		LAB_PARTNER_MODEL: 'test-local:small',
		LAB_PARTNER_OLLAMA_URL: `http://127.0.0.1:${upstream.address().port}/api/chat`,
		LAB_PARTNER_API_TOKEN: 'test-only-secret',
		LAB_PARTNER_TIMEOUT_MS: '1000',
		...env
	});
	const db = openDatabase(':memory:');
	const server = createApp({ db, config, limits }).listen(0, '127.0.0.1');
	await once(server, 'listening');
	const base = `http://127.0.0.1:${server.address().port}/api`;
	t.after(async () => {
		server.closeAllConnections();
		upstream.closeAllConnections();
		await Promise.all([new Promise((r) => server.close(r)), new Promise((r) => upstream.close(r))]);
		db.close();
	});
	function client() {
		let cookie = '',
			csrf = '';
		return {
			id: null,
			async request(path, body, headers = {}, signal) {
				const response = await fetch(base + path, {
					method: body === undefined ? 'GET' : 'POST',
					signal,
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
			}
		};
	}
	return {
		db,
		config,
		calls,
		client,
		respond: (fn) => {
			respond = fn;
		}
	};
}

test('labpartner: feil forsøk, utestet endring og riktig kode får presis kontekst fra simulatoren', () => {
	const initial = initialProgram('tekst');
	const failed = context(
		ask({ snapshot: snapshot({ lastRun: { program: initial, caseId: null } }) })
	);
	assert.equal(failed.lastTest.isCurrent, true);
	assert.equal(failed.lastTest.selectedResult.passed, false);
	assert.equal(
		failed.lastTest.selectedResult.after.length,
		failed.lastTest.selectedResult.before.length + 1
	);
	const stale = context(
		ask({ snapshot: snapshot({ program: solved, lastRun: { program: initial, caseId: null } }) })
	);
	assert.equal(stale.lastTest.isCurrent, false);
	assert.equal(stale.lastTest.selectedResult.passed, false);
	assert.ok(stale.currentCode.includes('trim()'));
	const passed = context(
		ask({ snapshot: snapshot({ program: solved, lastRun: { program: solved, caseId: null } }) })
	);
	assert.equal(passed.lastTest.isCurrent, true);
	assert.deepEqual(passed.lastTest.coverage, { passed: 6, total: 6 });
	assert.equal(passed.lastTest.selectedResult.status, 400);
	assert.deepEqual(passed.lastTest.selectedResult.after, passed.lastTest.selectedResult.before);
	const frame = walkthroughCase('tekst', initial, 'mellomrom').frames[0];
	const viewed = context(
		ask({
			snapshot: snapshot({
				inspection: { kind: 'walkthrough', index: 0 },
				lastRun: { program: initial, caseId: null }
			})
		})
	);
	assert.equal(viewed.lastTest, null);
	assert.equal(viewed.viewedStep.title, frame.title);
	assert.equal(viewed.viewedStep.status, frame.status);
	assert.ok(!JSON.stringify(viewed).includes('expectedSummary'));
	assert.equal(evaluateProgram('tekst', solved).success, true);
	let events = [];
	for (let i = 0; i < 20; i++)
		events = appendPartnerEvent(events, { type: 'walkthrough-stepped', index: i });
	assert.equal(events.length, 10);
	assert.equal(events[0].index, 10);
	assert.notEqual(
		partnerSnapshotKey(snapshot()),
		partnerSnapshotKey(snapshot({ program: solved }))
	);
});

test('labpartner: innlogging, Origin, CSRF og konto kontrolleres; bare valgt oppgave sendes, uten XP eller elevdata', async (t) => {
	const f = await fixture(t, { LAB_PARTNER_THINK: 'false' });
	assert.equal((await f.client().request('/lab-partner/ask', ask())).status, 401);
	const student = f.client(),
		other = f.client();
	await student.request('/auth/create', {});
	await other.request('/auth/create', {});
	assert.equal(
		(await student.request('/lab-partner/ask', ask(), { Origin: 'https://other.example' })).status,
		403
	);
	assert.equal(
		(await student.request('/lab-partner/ask', ask(), { 'X-CSRF-Token': '' })).status,
		403
	);
	assert.equal(
		(await student.request('/lab-partner/ask', { ...ask(), accountId: other.id })).status,
		409
	);
	assert.equal(f.calls.length, 0);
	const response = await student.request(
		'/lab-partner/ask',
		ask({
			model: 'injected',
			systemPrompt: 'UNTRUSTED_OVERRIDE',
			snapshot: snapshot({
				events: [{ type: 'code-changed', before: initialProgram('tekst'), after: solved }],
				results: 'FORGED_PASS'
			})
		})
	);
	assert.equal(response.status, 200);
	assert.deepEqual(Object.keys(response).sort(), ['answer', 'status', 'version']);
	assert.equal(f.calls[0].authorization, 'Bearer test-only-secret');
	assert.equal(f.calls[0].body.model, 'test-local:small');
	assert.equal(f.calls[0].body.stream, false);
	assert.equal(f.calls[0].body.think, false);
	const prompt = JSON.stringify(f.calls[0].body.messages);
	for (const absent of [
		student.id,
		other.id,
		'test-only-secret',
		'UNTRUSTED_OVERRIDE',
		'FORGED_PASS',
		'csrf',
		'recoveryKey'
	])
		assert.ok(!prompt.includes(absent));
	assert.equal((await student.request('/me')).summary.xp, 0);
	assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM rewards').get().n, 0);
});

test('labpartner: ukjent innhold, utdatert versjon, farlig kode og for store forespørsler avvises før modellkallet', async (t) => {
	const f = await fixture(t),
		student = f.client();
	await student.request('/auth/create', {});
	const invalid = [
		[ask({ snapshot: snapshot({ missionId: 'unknown' }) }), 400],
		[ask({ snapshot: snapshot({ activityId: 'nattvakt' }) }), 400],
		[ask({ snapshot: snapshot({ version: 0 }) }), 409],
		[ask({ snapshot: snapshot({ running: true }) }), 409],
		[ask({ snapshot: snapshot({ program: ['process.exit()'] }) }), 400],
		[ask({ snapshot: snapshot({ caseId: 'private-assessment' }) }), 400],
		[ask({ snapshot: snapshot({ events: [{ type: 'system' }] }) }), 400],
		[ask({ snapshot: snapshot({ events: [{ type: 'line-explained', lineId: 'unknown' }] }) }), 400],
		[ask({ snapshot: snapshot({ inspection: { kind: 'trace', index: 9000 } }) }), 400],
		[ask({ snapshot: snapshot({ events: Array(11).fill({ type: 'reset' }) }) }), 400],
		[ask({ question: 'x'.repeat(801) }), 400],
		[ask({ history: Array(3).fill({ question: 'q', answer: 'a' }) }), 400],
		[ask({ question: 'x'.repeat(25000) }), 413]
	];
	for (const [body, status] of invalid)
		assert.equal((await student.request('/lab-partner/ask', body)).status, status);
	assert.equal(f.calls.length, 0);
	const disabled = await fixture(t, { LAB_PARTNER_MODEL: '' });
	const c = disabled.client();
	await c.request('/auth/create', {});
	assert.equal((await c.request('/lab-partner/status')).enabled, false);
	assert.equal((await c.request('/lab-partner/ask', ask())).error.code, 'PARTNER_DISABLED');
	assert.equal(disabled.calls.length, 0);
});

test('labpartner: ugyldige modellsvar, utilgjengelig tjeneste og tidsavbrudd gir nytt forsøk uten å lekke feilinnhold', async (t) => {
	const f = await fixture(t),
		student = f.client();
	await student.request('/auth/create', {});
	const failures = [
		(_req, res) => {
			res.writeHead(503);
			res.end('private-upstream-detail');
		},
		(_req, res) => res.end('<html>private-upstream-detail</html>'),
		(_req, res) => reply(res, ''),
		(_req, res) => reply(res, 'x'.repeat(3001)),
		(_req, res) => reply(res, 'x'.repeat(66000)),
		(_req, res) =>
			res.end(
				JSON.stringify({
					done: true,
					message: { role: 'tool', content: 'private-upstream-detail' }
				})
			),
		(_req, res) => {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.write('{');
		}
	];
	for (const failure of failures) {
		f.respond(failure);
		const response = await student.request('/lab-partner/ask', ask());
		assert.ok([502, 503, 504].includes(response.status));
		assert.ok(!JSON.stringify(response).includes('private-upstream-detail'));
		f.respond((_req, res) => reply(res));
		assert.equal((await student.request('/lab-partner/ask', ask())).status, 200);
	}
});

test('labpartner: én forespørsel per elev, avgrenset samtidighet og avbryt frigjør kapasiteten', async (t) => {
	const f = await fixture(t, { LAB_PARTNER_CONCURRENCY: '1', LAB_PARTNER_TIMEOUT_MS: '5000' });
	const a = f.client(),
		b = f.client();
	await a.request('/auth/create', {});
	await b.request('/auth/create', {});
	let started;
	const startedPromise = new Promise((resolve) => {
		started = resolve;
	});
	let disconnected;
	const disconnectedPromise = new Promise((resolve) => {
		disconnected = resolve;
	});
	f.respond((_req, res) => {
		res.on('close', disconnected);
		started();
	});
	const controller = new AbortController();
	const pending = a
		.request('/lab-partner/ask', ask(), {}, controller.signal)
		.catch((error) => error.name);
	await startedPromise;
	assert.equal((await a.request('/lab-partner/ask', ask())).error.code, 'PARTNER_ACTIVE');
	assert.equal((await b.request('/lab-partner/ask', ask())).error.code, 'PARTNER_BUSY');
	controller.abort();
	assert.equal(await pending, 'AbortError');
	await disconnectedPromise;
	f.respond((_req, res) => reply(res));
	assert.equal((await b.request('/lab-partner/ask', ask())).status, 200);
});

test('labpartner: konfigurasjon og spørsmålsgrense gjelder bare piloten', async (t) => {
	assert.equal(readConfig({}).labPartner.enabled, false);
	for (const env of [
		{ LAB_PARTNER_MODEL: 'some:cloud' },
		{ LAB_PARTNER_CONCURRENCY: '50' },
		{ LAB_PARTNER_THINK: 'sometimes' },
		{ LAB_PARTNER_OLLAMA_URL: 'file:///etc/passwd' }
	])
		assert.throws(() => readConfig(env));
	const f = await fixture(t, {}, true),
		a = f.client(),
		b = f.client();
	await a.request('/auth/create', {});
	await b.request('/auth/create', {});
	for (let i = 0; i < 8; i++)
		assert.equal((await a.request('/lab-partner/ask', ask())).status, 200);
	assert.equal((await a.request('/lab-partner/ask', ask())).error.code, 'PARTNER_RATE');
	assert.equal((await b.request('/lab-partner/ask', ask())).status, 200);
	assert.equal((await a.request('/me')).status, 200);
});
