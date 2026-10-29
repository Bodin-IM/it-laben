import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
	equipment,
	queryFilter,
	queryIds,
	inspectQuery,
	queryPasses,
	initialAttempts,
	completedQueries,
	restoreAttempts,
	starterCode
} from '../src/lib/databaseCourse.js';
import { readPartnerState } from '../src/lib/partnerContext.js';
import { partnerPageById } from '../src/lib/partnerPages.js';
import { pageWork, pageTask } from '../server/lab-partner/page-context.js';
import { buildPartnerMessages } from '../server/lab-partner/context.js';
import { moduler, moduleProgress } from '../src/lib/moduler.js';
import { completeDatabaseExample } from '../src/lib/databaseIntro.js';

const all = { kategori: 'all', tilgjengelig: 'all', dagspris: 'all' };
const camera = { ...all, kategori: 'kamera' };
const available = { ...camera, tilgjengelig: 'true' };
const budget = { ...all, tilgjengelig: 'true', dagspris: '200' };
const state = (values) => ({ version: 1, values });
const work = () => ({
	taskId: 'ledig',
	choices: available,
	prediction: ['K101'],
	run: { choices: { ...camera, tilgjengelig: 'text-true' }, prediction: ['K101'] },
	inspectedId: 'K101',
	action: 'filter-changed',
	hintCount: 0
});

test('databaseøving: datatype, kombinerte krav og inkluderende tallgrense gir forklarlige resultater', () => {
	assert.deepEqual(
		queryIds(all),
		equipment.map((item) => item._id)
	);
	assert.deepEqual(queryIds(camera), ['K101', 'K102', 'K103']);
	assert.deepEqual(queryIds(available), ['K101', 'K103']);
	assert.deepEqual(queryIds(budget), ['M201', 'L301']); // Include price exactly 200, exclude unavailable 80.
	assert.deepEqual(queryIds({ ...available, tilgjengelig: 'text-true' }), []);
	const inspected = inspectQuery({ ...available, tilgjengelig: 'text-true' })[0];
	assert.equal(inspected.checks[0].matches, true);
	assert.equal(inspected.checks[1].matches, false);
	assert.match(inspected.checks[1].explanation, /boolsk.*tekst/);
	assert.deepEqual(queryFilter(budget), { tilgjengelig: true, dagspris: { $lte: 200 } });
	assert.equal(queryPasses('kamera', { ...camera, dagspris: '500' }), true); // Equivalent result in this dataset is valid.
	assert.equal(queryPasses('ledig', camera), false);
	assert.equal(queryPasses('budsjett', { ...budget, dagspris: '100' }), false);
	assert.equal(queryPasses('missing', all), false);
	for (const invalid of [
		null,
		[],
		{},
		{ ...all, uri: 'secret' },
		{ ...all, kategori: '$where' },
		{ ...all, dagspris: '-1' }
	])
		assert.throws(() => queryFilter(invalid));
});

test('databaseøving: lagring bevarer forsøk, men gammel kjøring, falske flagg og gamle versjoner gir ikke ferdigstatus', () => {
	const attempts = initialAttempts();
	for (const [id, choices] of [
		['kamera', camera],
		['ledig', available],
		['budsjett', budget]
	])
		attempts[id] = { choices, run: { choices, prediction: [] } };
	assert.deepEqual(completedQueries(attempts), ['kamera', 'ledig', 'budsjett']); // Prediction is formative, not a gate.
	const restored = restoreAttempts(JSON.parse(JSON.stringify({ version: 1, attempts })));
	assert.deepEqual(restored, attempts);
	restored.ledig.choices = camera;
	assert.deepEqual(completedQueries(restored), ['kamera', 'budsjett']);
	assert.deepEqual(completedQueries(restoreAttempts({ version: 2, attempts })), []);
	assert.deepEqual(
		completedQueries(
			restoreAttempts({
				version: 1,
				attempts: { kamera: { passed: true, choices: camera, run: null } }
			})
		),
		[]
	);
	assert.deepEqual(
		completedQueries(
			restoreAttempts({
				version: 1,
				attempts: {
					kamera: { choices: camera, run: { choices: camera, prediction: ['PRIVATE_DATA'] } }
				}
			})
		),
		[]
	);
	const module = moduler.find((item) => item.id === 'databaser');
	assert.deepEqual(moduleProgress(module, [{ id: 'database-praksis', status: 'passed' }]), {
		completed: 0,
		total: 0,
		started: false
	});
});

test('databasepartner: serveren skiller nytt filter fra gammelt resultat og begrenser delingen', () => {
	const page = partnerPageById('database-finn');
	const result = pageWork(page, state(work()));
	assert.equal(result.oldRun, true);
	assert.deepEqual(result.lastRun.result, []);
	assert.equal(result.inspectedDocument.matches, false);
	assert.ok(!JSON.stringify(result).includes('expected'));
	assert.ok(!JSON.stringify(result).includes('correct'));
	assert.match(result.code, /true/);
	assert.equal(pageWork(page, state({ ...work(), run: null })).lastRun, undefined);
	const sameRun = pageWork(page, state({ ...work(), run: { choices: available, prediction: [] } }));
	assert.equal(sameRun.oldRun, false);
	assert.deepEqual(sameRun.lastRun.result, ['K101', 'K103']);
	for (const patch of [
		{ uri: 'PRIVATE_URI' },
		{ taskId: 'secret-assessment' },
		{ choices: { ...available, password: 'secret' } },
		{ run: { choices: available, prediction: [], result: ['FORGED'] } },
		{ inspectedId: 'PRIVATE' },
		{ action: 'run-command' },
		{ hintCount: 999 }
	])
		assert.throws(() => readPartnerState(page.id, state({ ...work(), ...patch })));
	assert.throws(() => readPartnerState(page.id, { version: 99, values: work() }));
	const practical = partnerPageById('database-praksis');
	const context = pageTask(practical, 'databaser');
	assert.match(context.limit, /IKKE elevens lokale kode/);
	assert.equal(pageWork(practical, state({ phase: 'oppsett' })).referenceCode, undefined);
	assert.equal(pageWork(practical, state({ phase: 'kode' })).referenceCode, starterCode);
	assert.throws(() =>
		readPartnerState(practical.id, state({ phase: 'kode', code: 'PRIVATE_CODE' }))
	);
	assert.throws(() => pageTask(practical, 'innlogging-og-tilgang'));
	for (const pageId of ['database-grunnlag', 'database-finn', 'database-praksis']) {
		const values =
			pageId === 'database-grunnlag'
				? { section: 'typer' }
				: pageId === 'database-finn'
					? work()
					: { phase: 'kode' };
		const messages = buildPartnerMessages({
			question: 'Hva kan jeg prøve?',
			history: [],
			snapshot: {
				version: 2,
				activityId: 'page-help',
				pageId,
				moduleId: 'databaser',
				state: state(values),
				running: false,
				events: []
			}
		});
		assert.ok(JSON.stringify(messages).length < 22000);
	}
});

test('databasestart: nedlastingen følger samme datasett og kode, uten faktiske nøkler eller destruktiv klargjøring', () => {
	const files = JSON.parse(
		execFileSync(
			'python3',
			[
				'-c',
				"import zipfile,json; z=zipfile.ZipFile('static/ressurser/utstyrsboden-start.zip'); print(json.dumps({n.split('/')[-1]:z.read(n).decode() for n in z.namelist()}))"
			],
			{ encoding: 'utf8' }
		)
	);
	assert.deepEqual(JSON.parse(files['utstyr.json']), equipment);
	assert.equal(files['finn.mjs'], starterCode);
	assert.equal(files['eksempel.mjs'], completeDatabaseExample);
	assert.equal(files['.env'], undefined);
	assert.match(files['.gitignore'], /^\.env\n/);
	assert.match(files['klargjor.mjs'], /\$setOnInsert/);
	assert.doesNotMatch(files['klargjor.mjs'], /deleteMany|dropDatabase|replaceOne/);
	for (const name of ['finn.mjs', 'klargjor.mjs', 'eksempel.mjs'])
		execFileSync(process.execPath, ['--check', '--input-type=module'], { input: files[name] });
});

test('databaseinnføring: kodeeksempler og synlige steg stemmer med data uten å endre øvingsdatasettet', async () => {
	const { readExample, flowExample, insertExample, newEquipment } =
		await import('../src/lib/databaseIntro.js');
	const original = JSON.stringify(equipment);
	assert.deepEqual(
		readExample('kamera').rows.map((item) => item._id),
		['K101', 'K102', 'K103']
	);
	assert.deepEqual(
		readExample('ledige').rows.map((item) => item._id),
		['K101', 'K103']
	);
	assert.deepEqual(readExample('ingen').rows, []);
	assert.match(readExample('ledige').code, /"tilgjengelig": true/);
	assert.equal(insertExample(0).saved, false);
	assert.equal(insertExample(0).count, 6);
	assert.equal(insertExample(0).result, null);
	assert.equal(insertExample(1).count, 7);
	assert.equal(insertExample(1).result, null);
	assert.deepEqual(
		insertExample(2).result.map((item) => item._id),
		['M201', 'M202', newEquipment._id]
	);
	for (let step = 0; step < 5; step++) {
		assert.equal(flowExample('hente', step).count, 6);
		assert.equal(flowExample('lagre', step).count, step < 2 ? 6 : 7);
	}
	assert.equal(insertExample(0).count, 6);
	assert.equal(JSON.stringify(equipment), original);
	assert.throws(() => readExample('arbitrary-code'));
	assert.throws(() => insertExample(3));
	assert.throws(() => flowExample('delete', 0));
	assert.throws(() => flowExample('hente', -1));
});

test('databaseinnføring: partneren får bare kjent del og det viste resultatet, med støtte for eldre klienter', async () => {
	const { databaseSections, completeDatabaseExample } = await import('../src/lib/databaseIntro.js');
	const page = partnerPageById('database-grunnlag');
	assert.equal(readPartnerState(page.id, state({ section: 'typer' })).values.readShown, false);
	const before = pageWork(page, state({ section: 'filter', readId: 'ledige' }));
	assert.equal(before.resultShown, false);
	assert.equal(before.visibleResult, undefined);
	const shown = pageWork(page, state({ section: 'filter', readId: 'ledige', readShown: true }));
	assert.deepEqual(
		shown.visibleResult.documents.map((item) => item._id),
		['K101', 'K103']
	);
	assert.equal(pageWork(page, state({ section: 'lagre', insertStep: 0 })).viewedStep.count, 6);
	assert.equal(
		pageWork(page, state({ section: 'dataflyt', operation: 'lagre', flowStep: 1 })).viewedStep
			.count,
		6
	);
	assert.equal(pageWork(page, state({ section: 'eksempel' })).code, completeDatabaseExample);
	for (const values of [
		{ section: 'start', uri: 'PRIVATE_URI' },
		{ section: 'start', code: 'PRIVATE_CODE' },
		{ section: 'filter', readId: '$where' },
		{ section: 'filter', readShown: 'true' },
		{ section: 'dataflyt', flowStep: 5 },
		{ section: 'lagre', insertStep: 3 },
		{ section: 'unknown' }
	])
		assert.throws(() => readPartnerState(page.id, state(values)));
	for (const { id } of databaseSections) {
		const messages = buildPartnerMessages({
			question: 'Forklar denne delen.',
			history: [],
			snapshot: {
				version: 2,
				activityId: 'page-help',
				pageId: page.id,
				moduleId: 'databaser',
				state: state({ section: id }),
				running: false,
				events: []
			}
		});
		assert.ok(Buffer.byteLength(JSON.stringify(messages)) < 22000, id);
	}
});

test('databaseeksempel: kjørbar fil henter, setter inn og lukker; gjentakelse og feil overskriver ingenting', async () => {
	const { completeDatabaseExample, newEquipment } = await import('../src/lib/databaseIntro.js');
	const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
	const run = new AsyncFunction(
		'MongoClient',
		'process',
		'console',
		completeDatabaseExample.replace(/^import[^\n]+\n/, '')
	);
	const documents = structuredClone(equipment);
	const events = [],
		tables = [],
		messages = [];
	let failure = '';
	class Client {
		async connect() {
			events.push('connect');
			if (failure === 'connect') throw Error('SECRET_URI');
		}
		db() {
			return {
				collection: () => ({
					find: (filter) => ({
						toArray: async () => {
							events.push('find');
							return documents.filter((item) => item.kategori === filter.kategori);
						}
					}),
					insertOne: async (item) => {
						events.push('insert');
						if (failure === 'write') throw Error('SECRET_WRITE');
						if (documents.some((saved) => saved._id === item._id))
							throw Object.assign(Error('duplicate'), { code: 11000 });
						documents.push(structuredClone(item));
						return { insertedId: item._id };
					}
				})
			};
		}
		async close() {
			events.push('close');
		}
	}
	const processMock = {
		env: { MONGODB_URI: 'test', MONGODB_DATABASE: 'test' },
		exitCode: 0,
		exit: () => {
			throw Error('exit');
		}
	};
	const consoleMock = {
		log: (...args) => messages.push(args.join(' ')),
		error: (...args) => messages.push(args.join(' ')),
		table: (rows) => tables.push(structuredClone(rows))
	};
	await run(Client, processMock, consoleMock);
	assert.deepEqual(events, ['connect', 'find', 'insert', 'find', 'close']);
	assert.equal(tables[0].length, 3);
	assert.deepEqual(
		tables[1].map((item) => item._id),
		['M201', 'M202', newEquipment._id]
	);
	documents.find((item) => item._id === newEquipment._id).navn = 'Elevens endrede navn';
	await run(Client, processMock, consoleMock);
	assert.equal(documents.length, 7);
	assert.equal(documents.at(-1).navn, 'Elevens endrede navn');
	for (const kind of ['connect', 'write']) {
		failure = kind;
		events.length = 0;
		await run(Client, processMock, consoleMock);
		assert.equal(events.at(-1), 'close');
		assert.equal(processMock.exitCode, 1);
		assert.equal(documents.length, 7);
	}
	assert.ok(!messages.join('\n').includes('SECRET'));
	events.length = 0;
	await assert.rejects(run(Client, { ...processMock, env: {} }, consoleMock), /exit/);
	assert.deepEqual(events, []);
});
