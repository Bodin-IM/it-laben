import test from 'node:test';
import assert from 'node:assert/strict';
import { backendEvaluationCases } from '../server/lab-partner/evaluation-cases.js';
import { evaluatePartner } from '../server/lab-partner/evaluate.js';
import { buildPartnerMessages } from '../server/lab-partner/context.js';
import { requestPartnerAnswer, partnerModelOptions } from '../server/lab-partner/model-client.js';
import { readPartnerConfig } from '../server/config.js';
import { assessmentBanks } from '../server/assessment-bank.js';

const settings = readPartnerConfig({ LAB_PARTNER_MODEL: 'local-example', LAB_PARTNER_THINK: 'false',
	LAB_PARTNER_API_TOKEN: 'private-token-test', LAB_PARTNER_OLLAMA_URL: 'http://127.0.0.1:11434/api/chat' });
const response = (content = 'Undersøk listen før og etter kjøringen.') => new Response(JSON.stringify({
	done: true, message: { role: 'assistant', content }
}));

test('14 kvalitetsprøver bygger ekte kontekst uten nettverk, elevdata eller vurderingsbank', async (t) => {
	t.mock.method(globalThis, 'fetch', () => { throw new Error('Dry run must not contact a model'); });
	const cases = backendEvaluationCases();
	assert.equal(new Set(cases.map((c) => c.id)).size, 14);
	const report = await evaluatePartner({ dryRun: true });
	assert.equal(report.mode, 'contexts-only');
	assert.equal(report.results.length, 0);
	assert.equal(report.model, null);
	for (const item of report.cases) {
		assert.deepEqual(item.messages, buildPartnerMessages(cases.find((c) => c.id === item.id).body));
		assert.ok(item.expected.length && item.avoid.length);
		for (const bank of Object.values(assessmentBanks)) for (const question of bank.questions)
			assert.ok(!JSON.stringify(item.messages).includes(question.prompt));
		for (const criterion of item.expected) assert.ok(!JSON.stringify(item.messages).includes(criterion));
	}
	const work = (id) => JSON.parse(report.cases.find((c) => c.id === id).messages[1].content.split('\n')[1]);
	assert.equal(work('ikke-kjort').viewedStep, null);
	assert.equal(work('ett-steg').feedback, undefined);
	assert.equal(work('gammelt-forsok').lastTest.isCurrent, false);
	assert.equal(work('bestatt-test').lastTest.coverage.passed, work('bestatt-test').lastTest.coverage.total);
	assert.match(work('lagringsfeil').feedback.result, /500/);
	const other = buildPartnerMessages({ question: 'Forklar dette', history: [], snapshot: {
		activityId: 'page-help', version: 1, pageId: 'database-grunnlag', running: false, events: []
	} });
	assert.doesNotMatch(other[0].content, /Tilpass forslag til den avtalte Svelte\/Express-appen/);
	assert.match(report.cases[0].messages[0].content, /Tilpass forslag til den avtalte Svelte\/Express-appen/);
});

test('modellprøven bruker API-innstillinger og svargrenser, men rapporterer ingen automatisk faglig godkjenning', async (t) => {
	const calls = [];
	t.mock.method(globalThis, 'fetch', async (url, options) => {
		calls.push({ url, options }); return response();
	});
	const cases = backendEvaluationCases().slice(0, 1);
	const report = await evaluatePartner({ settings, cases, repeat: 2 });
	assert.equal(calls.length, 2);
	for (const call of calls) {
		const payload = JSON.parse(call.options.body);
		assert.deepEqual(payload.messages, buildPartnerMessages(cases[0].body));
		assert.deepEqual(payload.options, partnerModelOptions);
		assert.equal(payload.think, false);
		assert.equal(payload.stream, false);
		assert.equal(call.options.redirect, 'error');
		assert.equal(call.options.headers.Authorization, 'Bearer private-token-test');
	}
	assert.ok(report.results.every((r) => r.answer && r.review === null && !r.error));
	assert.doesNotMatch(JSON.stringify(report), /private-token-test|127\.0\.0\.1:11434/);
	assert.match(report.quality, /Ikke faglig vurdert/);
	await assert.rejects(evaluatePartner({ settings: { enabled: false } }), /ikke konfigurert/);
});

test('felles modellklient avviser feilformat, tomme svar og for store svar som før', async (t) => {
	const variants = [response(''), response('x'.repeat(3001)), new Response('{'),
		new Response(JSON.stringify({ done: false, message: { role: 'assistant', content: 'venter' } })),
		new Response(JSON.stringify({ done: true, message: { role: 'user', content: 'feil rolle' } })),
		new Response('x'.repeat(65537)), new Response('opptatt', { status: 503 })];
	t.mock.method(globalThis, 'fetch', async () => variants.shift());
	const count = variants.length;
	for (let i = 0; i < count; i++)
		await assert.rejects(requestPartnerAnswer(settings, [], new AbortController()));
});

test('tidsavbrudd og avbrudd lagres som feil uten gjentatte kall eller rå tjenestedetaljer', async (t) => {
	let calls = 0;
	t.mock.method(globalThis, 'fetch', (_url, options) => new Promise((_resolve, reject) => {
		calls++;
		options.signal.addEventListener('abort', () => reject(new Error('secret endpoint details')), { once: true });
	}));
	const cases = backendEvaluationCases().slice(0, 1);
	const report = await evaluatePartner({ settings: { ...settings, timeoutMs: 5 }, cases });
	assert.equal(report.results[0].error, 'PARTNER_TIMEOUT');
	assert.equal(calls, 1);
	assert.doesNotMatch(JSON.stringify(report), /secret endpoint details/);
	const controller = new AbortController();
	controller.abort();
	const cancelled = await evaluatePartner({ settings, cases, signal: controller.signal });
	assert.equal(cancelled.results.length, 0);
	assert.equal(cancelled.cancelled, true);
	assert.equal(calls, 1);
	const during = new AbortController();
	const timer = setTimeout(() => during.abort(), 5);
	try {
		const partial = await evaluatePartner({ settings, cases, repeat: 2, signal: during.signal });
		assert.equal(partial.cancelled, true);
		assert.equal(partial.results.length, 1);
		assert.equal(partial.results[0].error, 'CANCELLED');
		assert.equal(calls, 2);
	} finally { clearTimeout(timer); }
});
