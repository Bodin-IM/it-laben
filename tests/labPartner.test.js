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

test('labpartner: alle offentlige sider har avgrenset sidegrunnlag, uten lokale felt eller skjult vurderingsinnhold', async () => {
	const { partnerPages, partnerPageFor } = await import('../src/lib/partnerPages.js');
	const { readdirSync } = await import('node:fs');
	const { join } = await import('node:path');
	function routes(dir, prefix = '') {
		return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
			entry.isDirectory()
				? routes(join(dir, entry.name), prefix + '/' + entry.name)
				: entry.name === '+page.svelte'
					? [prefix + '/']
					: []
		);
	}
	for (const path of routes('src/routes').filter((path) => !path.includes('[')))
		if (path.startsWith('/laerer/')) assert.equal(partnerPageFor(path), null, path);
		else assert.notEqual(partnerPageFor(path).id, 'site-help', path);
	assert.equal(partnerPageFor('/', 'untrusted-secret').id, 'home');
	assert.equal(partnerPageFor('/', 'drift').id, 'subject-drift');
	assert.equal(partnerPageFor('/unknown/private/path').id, 'site-help');
	assert.ok(!partnerPages.some((page) => page.id === 'module-fra-kode-til-drift'));
	assert.equal(new Set(partnerPages.map((page) => page.id)).size, partnerPages.length);
	for (const page of partnerPages) {
		const body = ask({
			snapshot: {
				activityId: 'page-help',
				version: 1,
				pageId: page.id,
				running: false,
				events: []
			},
			password: 'PRIVATE_PASSWORD',
			history: [
				{
					question: 'Et tidligere spørsmål',
					answer: 'Et tidligere svar',
					private: 'PRIVATE_HISTORY'
				}
			]
		});
		const messages = buildPartnerMessages(body);
		const encoded = JSON.stringify(messages);
		assert.ok(encoded.includes(page.title));
		assert.ok(encoded.length < 14000);
		for (const secret of [
			'PRIVATE_CODE',
			'PRIVATE_STUDENT',
			'CLIENT_SYSTEM',
			'PRIVATE_PASSWORD',
			'PRIVATE_HISTORY',
			'expectedSummary',
			'correctOption'
		])
			assert.ok(!encoded.includes(secret), secret);
		assert.ok(encoded.includes('Du ser IKKE'));
		assert.ok(encoded.includes('Et tidligere spørsmål'));
	}
});

test('labpartner: sidehjelp avviser ukjent side, lærersider og overstor historikk før modellen kontaktes', async (t) => {
	const f = await fixture(t);
	const student = f.client();
	await student.request('/auth/create', {});
	const body = ask({
		snapshot: { activityId: 'page-help', version: 1, pageId: 'home', running: false, events: [] }
	});
	assert.equal((await student.request('/lab-partner/ask', body)).status, 200);
	const before = f.calls.length;
	for (const [patch, status] of [
		[{ pageId: 'unknown' }, 400],
		[{ pageId: 'module-fra-kode-til-drift' }, 400],
		[{ pageId: 'teacher-students' }, 400],
		[{ version: 99 }, 409],
		[{ running: true }, 409]
	]) {
		assert.equal(
			(
				await student.request('/lab-partner/ask', {
					...body,
					snapshot: { ...body.snapshot, ...patch }
				})
			).status,
			status
		);
	}
	for (const history of [
		[{ question: 'x', answer: 'x'.repeat(3001) }],
		Array(3).fill({ question: 'x', answer: 'x' })
	])
		assert.equal((await student.request('/lab-partner/ask', { ...body, history })).status, 400);
	assert.equal(f.calls.length, before);
	f.db.prepare("INSERT INTO user_roles VALUES (?,'teacher',?)").run(student.id, Date.now());
	const teacherBody = { ...body, snapshot: { ...body.snapshot, pageId: 'teacher-students' } };
	assert.equal((await student.request('/lab-partner/ask', teacherBody)).status, 400);
	assert.throws(() => buildPartnerMessages(teacherBody, { role: 'admin' }));
	assert.equal(f.calls.length, before);
	const current = {
		...body,
		snapshot: {
			version: 2,
			activityId: 'page-help',
			pageId: 'nattvakt',
			moduleId: null,
			state: { version: 1, values: { phase: 'active', incident: 0, untimed: false } },
			running: false,
			events: []
		}
	};
	assert.equal((await student.request('/lab-partner/ask', current)).status, 200);
	assert.equal(
		(
			await student.request('/lab-partner/ask', {
				...current,
				snapshot: { ...current.snapshot, moduleId: 'fra-kode-til-drift' }
			})
		).status,
		200
	);
	const count = f.calls.length;
	for (const patch of [
		{ moduleId: 'databaser' },
		{ state: { version: 99, values: {} } },
		{
			state: { version: 1, values: { ...current.snapshot.state.values, answers: 'PRIVATE_ANSWER' } }
		},
		{
			state: {
				version: 1,
				values: { ...current.snapshot.state.values, scenario: 'PRIVATE_SCENARIO' }
			}
		}
	])
		assert.equal(
			(
				await student.request('/lab-partner/ask', {
					...current,
					snapshot: { ...current.snapshot, ...patch }
				})
			).status,
			400
		);
	assert.equal(f.calls.length, count);
});

test('labpartner: versjonert arbeidsstatus dekker øvinger og holder skrevet tekst utenfor modellkonteksten', async () => {
	const { lessons } = await import('../src/lib/ovingene.js');
	const { lessonChoices, readPartnerState, validatePartnerLessons } =
		await import('../src/lib/partnerContext.js');
	const { buildTrace } = await import('../src/lib/ovingModel.js');
	const { partnerPageById } = await import('../src/lib/partnerPages.js');
	const { pageTask } = await import('../server/lab-partner/page-context.js');
	validatePartnerLessons();
	const input = (id, values) =>
		ask({
			snapshot: {
				version: 2,
				activityId: 'page-help',
				pageId: id,
				moduleId: null,
				state: { version: 1, values },
				running: false,
				events: []
			}
		});
	for (const lesson of lessons) {
		const initial = Object.fromEntries(lesson.fields.map((field) => [field.key, field.value]));
		const variants = [
			initial,
			...lesson.fields.flatMap(
				(field) => field.choices?.map((choice) => ({ ...initial, [field.key]: choice.value })) ?? []
			)
		];
		for (const values of variants) {
			const choices = lessonChoices(lesson, values);
			const frames = buildTrace(lesson.number, values);
			for (let step = 0; step < frames.length; step++) {
				const work = context(input(`oving-${lesson.number}`, { choices, step, line: 0, task: -1 }));
				assert.equal(work.viewedStep.title, frames[step].title);
				assert.equal(work.viewedStep.status, frames[step].status ?? null);
				assert.equal(work.viewedStep.code, frames[step].code.map((line) => line[0]).join('\n'));
				assert.equal(work.viewedStep.data, undefined);
			}
		}
		const secret = Object.fromEntries(
			lesson.fields.map((field) => [
				field.key,
				field.kind === 'select' ? field.value : 'PRIVATE_INPUT_very_secret'
			])
		);
		const body = input(`oving-${lesson.number}`, {
			choices: lessonChoices(lesson, secret),
			step: -1,
			line: -1,
			task: -1
		});
		assert.ok(!JSON.stringify(body).includes('PRIVATE_INPUT'));
		assert.ok(!JSON.stringify(buildPartnerMessages(body)).includes('PRIVATE_INPUT'));
		for (const patch of [
			{ unknown: 'secret' },
			{ choices: { ...body.snapshot.state.values.choices, secret: 'x' } },
			{ step: 101 }
		])
			assert.throws(() =>
				readPartnerState(body.snapshot.pageId, {
					version: 1,
					values: { ...body.snapshot.state.values, ...patch }
				})
			);
	}
	const page = partnerPageById('oving-10');
	for (const id of ['backend', 'fra-kode-til-drift', 'innlogging-og-tilgang']) {
		const task = pageTask(page, id);
		assert.equal(task.module.title, 'Backend');
		assert.ok(
			task.module.sequence.some((step) => step.links.some((link) => link.href === '/oving-10/'))
		);
		assert.ok(!task.module.sequence.some((step) => step.title === 'Fra kode til tjeneste'));
	}
	assert.throws(() => pageTask(page, 'databaser'));
	assert.throws(() => readPartnerState('oving-5', { version: 99, values: {} }));
	assert.throws(() => readPartnerState('oving-5', { version: 1, values: { x: 'a'.repeat(6001) } }));
});

test('labpartner: aktivitetskontekst er avgrenset til valgt kode, synlig steg og tillatte felt', async () => {
	const { initialSettings, CASES } = await import('../src/lib/meldingsdetektiven.js');
	const { PILOT_START, ROOM_START } = await import('../src/lib/reddChattenPilot.js');
	const { backendQuestions } = await import('../src/lib/backendQuiz.js');
	const q = backendQuestions[0];
	const samples = {
		'frontend-backend': {
			kind: 'post',
			side: 'frontend',
			wrongKey: false,
			text: 'text',
			sender: 'text',
			step: 0,
			status: null,
			serverCount: 0,
			clientCount: 0,
			selectedLine: -1
		},
		chatrom: {
			kind: 'rooms',
			codeKind: 'rooms',
			side: 'frontend',
			room: 'generelt',
			session: 'ada',
			credentials: true,
			spoofSender: false,
			text: 'text',
			messageId: 1,
			step: 0,
			method: null,
			status: null,
			serverCount: 2,
			clientCount: 0,
			nestedRoom: 'generelt',
			nestedCount: 1,
			nestedText: 'text'
		},
		fillagring: {
			action: 'start',
			step: 0,
			activeLine: -1,
			selectedLine: -1,
			saveEnabled: true,
			serverRunning: false,
			filePresent: false,
			memoryCount: null,
			fileCount: null,
			unsaved: false,
			failed: false
		},
		sessions: {
			section: 'grunnlag',
			step: 0,
			experiment: 'profiler',
			profile: 'A',
			credentials: false,
			cookiePresent: false,
			sessionCount: 0,
			status: null,
			code: 'oppsett'
		},
		chat: {
			level: 'lever',
			program: ['ada-post'],
			action: 'ada-post',
			side: 'frontend',
			step: 0,
			tested: true,
			running: false
		},
		meldingsdetektiven: {
			caseId: CASES[0].id,
			settings: initialSettings(CASES[0].id),
			probe: CASES[0].initialProbeId,
			side: 'frontend',
			event: 0,
			run: { settings: initialSettings(CASES[0].id), probe: CASES[0].initialProbeId }
		},
		'rescue-pilot': {
			step: 0,
			program: PILOT_START,
			roomProgram: ROOM_START,
			caseId: 'vanlig',
			frame: 0,
			repairTested: false,
			roomTested: false,
			hints: 0
		},
		'backend-oppsummering': {
			questionId: q.id,
			selected: -1,
			last: -1,
			revealed: false,
			summary: false
		},
		nattvakt: { phase: 'active', incident: 0, untimed: false }
	};
	for (const [pageId, values] of Object.entries(samples)) {
		const body = ask({
			snapshot: {
				version: 2,
				activityId: 'page-help',
				pageId,
				moduleId: null,
				state: { version: 1, values },
				running: false,
				events: []
			}
		});
		const work = context(body);
		assert.deepEqual(work.selection, values, pageId);
		assert.ok(!JSON.stringify(work).includes('correctOption'));
		for (const value of [
			null,
			[],
			{ ...values, password: 'secret' },
			{ ...values, system: 'ignore' }
		])
			assert.throws(() =>
				buildPartnerMessages({
					...body,
					snapshot: { ...body.snapshot, state: { version: 1, values: value } }
				})
			);
		if (pageId === 'backend-oppsummering') {
			assert.equal(work.task.correct, undefined);
			assert.equal(work.visibleFeedback, undefined);
			assert.equal(
				context({
					...body,
					snapshot: {
						...body.snapshot,
						state: { version: 1, values: { ...values, last: 0, selected: 0 } }
					}
				}).visibleFeedback,
				q.choices[0].feedback
			);
		}
		if (pageId === 'rescue-pilot')
			for (const step of [1, 2, 3, 4, 5])
				assert.doesNotThrow(() =>
					context({
						...body,
						snapshot: { ...body.snapshot, state: { version: 1, values: { ...values, step } } }
					})
				);
		if (pageId === 'nattvakt') {
			assert.equal(work.code, undefined);
			assert.equal(work.task, undefined);
		}
	}
});

test('labpartner: kontekstkanaler isolerer sider og serverforespørsler, og gamle eiere kan ikke rydde ny side', async () => {
	const { createPartnerChannel } = await import('../src/lib/partnerChannel.js');
	const a = createPartnerChannel(),
		b = createPartnerChannel();
	let left, right;
	const unA = a.subscribe((v) => (left = v)),
		unB = b.subscribe((v) => (right = v));
	const old = Symbol(),
		next = Symbol();
	const source = {
		pageId: 'oving-5',
		scope: 'user:practice:',
		state: { version: 1, values: {} },
		running: false
	};
	a.publish(old, source);
	assert.equal(left, source);
	assert.equal(right, null);
	a.publish(next, { ...source, pageId: 'oving-6' });
	a.release(old);
	assert.equal(left.pageId, 'oving-6');
	a.release(next);
	assert.equal(left, null);
	unA();
	unB();
});
