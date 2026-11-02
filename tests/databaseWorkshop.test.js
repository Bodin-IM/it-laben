import test from 'node:test';
import assert from 'node:assert/strict';
import { workshopDocuments, runWorkshop, restoreWorkshop, initialWorkshop, sameWorkshop, queryFeedback } from '../src/lib/databaseWorkshop.js';
import { equipment } from '../src/lib/databaseCourse.js';
import { restoreJourney, resumeDatabase } from '../src/lib/databaseJourney.js';
import { databaseFailure, connectionCheckCode } from '../src/lib/databaseErrors.js';
import { readPartnerState } from '../src/lib/partnerContext.js';
import { partnerPageById } from '../src/lib/partnerPages.js';
import { pageWork } from '../server/lab-partner/page-context.js';
import { buildPartnerMessages } from '../server/lab-partner/context.js';
import { databaseEvaluationCases } from '../server/lab-partner/evaluation-cases.js';
import { catalog } from '../server/catalog.js';

test('verksted: egne testdata skiller to søk ved riktig kategori og på begge sider av grensen', () => {
	const original = JSON.stringify(equipment);
	for (const kategori of ['kamera', 'mikrofon', 'lys']) for (const dagspris of ['100', '200', '500', '501', '600', '900']) {
		const result = runWorkshop('skill', { kategori, dagspris });
		assert.equal(result.passed, kategori === 'kamera' && Number(dagspris) > 500);
		assert.equal(result.groups[0].documents.some((d) => d._id === 'TEST1'), kategori === 'kamera');
		assert.equal(result.groups[1].documents.some((d) => d._id === 'TEST1'), kategori === 'kamera' && Number(dagspris) <= 500);
	}
	assert.equal(JSON.stringify(equipment), original);
});

test('verksted: retting endrer datatype, ikke verdi; flere feltmodeller oppfyller samme behov', () => {
	assert.equal(runWorkshop('typer', { tilgjengelig: 'tekst', dagspris: 'tekst' }).groups[0].documents.length, 0);
	assert.deepEqual(runWorkshop('typer', { tilgjengelig: 'boolsk', dagspris: 'tekst' }).groups[0].documents.map((d) => d._id), ['M201']);
	assert.deepEqual(runWorkshop('typer', { tilgjengelig: 'tekst', dagspris: 'tall' }).groups[0].documents.map((d) => d._id), ['L301']);
	assert.equal(runWorkshop('typer', { tilgjengelig: 'boolsk', dagspris: 'tall' }).passed, true);
	for (const kategori of ['med', 'uten']) {
		const choices = { identitet: 'id', dagspris: 'med', tilgjengelig: 'med', kategori };
		assert.equal(runWorkshop('modell', choices).passed, true);
		assert.equal(runWorkshop('modell', { ...choices, identitet: 'navn' }).groups[0].documents.length, 2);
		assert.equal(runWorkshop('modell', { ...choices, dagspris: 'uten' }).passed, false);
		assert.equal(runWorkshop('modell', { ...choices, tilgjengelig: 'uten' }).passed, false);
	}
});

test('verksted: restaurering avgrenser data og bevarer utdatert kjøring uten å stole på bestått-flagg', () => {
	const attempts = initialWorkshop();
	attempts.skill = { choices: { kategori: 'kamera', dagspris: '500' }, run: { kategori: 'kamera', dagspris: '600' }, passed: true };
	const restored = restoreWorkshop({ version: 1, attempts });
	assert.equal(sameWorkshop(restored.skill.choices, restored.skill.run), false);
	assert.ok(!('passed' in restored.skill));
	assert.deepEqual(restoreWorkshop({ version: 2, attempts }), initialWorkshop());
	for (const invalid of [null, [], { kategori: '$where', dagspris: '600' }, { kategori: 'kamera', dagspris: '600', uri: 'SECRET' }])
		assert.throws(() => workshopDocuments('skill', invalid));
	assert.ok(!catalog.some((a) => a.id === 'database-verksted'));
});

test('databaseplass: bare kjente aktiviteter og steg blir lenker; lokalt bokmerke er ikke fullføring', () => {
	const saved = restoreJourney({ version: 1, positions: { 'database-verksted': 'modell', 'database-finn': 'https://evil.invalid', secret: 'TOKEN' }, last: 'database-verksted', passed: true });
	assert.deepEqual(saved.positions, { 'database-verksted': 'modell' });
	assert.equal(resumeDatabase(saved).href, '/databaser/utstyrsboden/?modul=databaser&oppdrag=modell');
	assert.equal(resumeDatabase(restoreJourney(null)), null);
	assert.equal(resumeDatabase(restoreJourney({ version: 1, last: 'ukjent', positions: {} })), null);
});

test('verkstedpartner: ingen framtidig respons, gammel kjøring eller fritekst blir modellgrunnlag', () => {
	const page = partnerPageById('database-verksted');
	const choices = { kategori: 'kamera', dagspris: '600' };
	const state = (patch = {}) => ({ version: 1, values: { taskId: 'skill', choices, run: null, hintCount: 0, ...patch } });
	assert.equal(pageWork(page, state()).visibleResult, undefined);
	assert.equal(pageWork(page, state()).openHints.length, 0);
	assert.equal(pageWork(page, state({ run: choices })).visibleResult.groups[0].documents.length, 4);
	const old = pageWork(page, state({ run: { ...choices, dagspris: '500' } }));
	assert.equal(old.oldRun, true);
	assert.equal(old.visibleResult, undefined);
	for (const patch of [{ code: 'SECRET' }, { taskId: 'hidden-test' }, { hintCount: 9 }, { choices: { ...choices, name: 'PRIVATE' } }])
		assert.throws(() => readPartnerState(page.id, state(patch)));
	for (const sample of databaseEvaluationCases()) {
		const messages = buildPartnerMessages(sample.body);
		assert.ok(Buffer.byteLength(JSON.stringify(messages)) < 22000, sample.id);
		for (const criterion of sample.expected) assert.ok(!JSON.stringify(messages).includes(criterion));
	}
});

test('søk: responsen velger et konkret manglende eller uønsket dokument', () => {
	assert.equal(queryFeedback('kamera', { kategori: 'all', tilgjengelig: 'all', dagspris: 'all' }).focusId, 'M201');
	assert.equal(queryFeedback('ledig', { kategori: 'kamera', tilgjengelig: 'text-true', dagspris: 'all' }).focusId, 'K101');
	assert.equal(queryFeedback('budsjett', { kategori: 'all', tilgjengelig: 'true', dagspris: '200' }).focusId, null);
});

test('databasestart: feilkategorier utelater hemmeligheter; forbindelseskontrollen skriver ingen data', async () => {
	for (const [error, stage, category] of [
		[{ code: 18 }, 'kobling', 'INNLOGGING'], [{ code: 13 }, 'lesing', 'TILGANG'],
		[{ code: 11000 }, 'lagring', 'DUPLIKAT'], [{ name: 'MongoParseError' }, 'kobling', 'OPPSETT'],
		[{ name: 'MongoServerSelectionError' }, 'lesing', 'KONTAKT'], [{}, 'data', 'STARTDATA'], [{}, 'lagring', 'LAGRING'], [{}, 'lesing', 'LESING']
	]) {
		const message = databaseFailure({ ...error, message: 'PRIVATE_URI' }, stage);
		assert.ok(message.startsWith(`[${category}]`));
		assert.ok(!message.includes('PRIVATE_URI'));
	}
	const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
	const run = new AsyncFunction('MongoClient', 'process', 'console', connectionCheckCode.replace(/^import[^\n]+\n/, ''));
	const calls = [], messages = [];
	class Client {
		async connect() { calls.push('connect'); }
		db() { return { collection: () => ({ findOne: async () => { calls.push('read'); return null; } }) }; }
		async close() { calls.push('close'); }
	}
	const process = { env: { MONGODB_URI: 'test', MONGODB_DATABASE: 'test' }, exitCode: 0 };
	await run(Client, process, { log: (text) => messages.push(text), error: (text) => messages.push(text) });
	assert.deepEqual(calls, ['connect', 'read', 'close']);
	assert.ok(messages.some((m) => m.startsWith('[KLAR]')));
	class Denied extends Client { async connect() { throw Object.assign(Error('PRIVATE_URI'), { code: 18 }); } }
	calls.length = 0; messages.length = 0;
	await run(Denied, process, { log: (text) => messages.push(text), error: (text) => messages.push(text) });
	assert.deepEqual(calls, ['close']);
	assert.equal(process.exitCode, 1);
	assert.ok(messages[0].startsWith('[INNLOGGING]'));
	assert.ok(!messages.join('').includes('PRIVATE_URI'));
});
