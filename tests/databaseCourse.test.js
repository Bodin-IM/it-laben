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
	assert.equal(files['.env'], undefined);
	assert.match(files['.gitignore'], /^\.env\n/);
	assert.match(files['klargjor.mjs'], /\$setOnInsert/);
	assert.doesNotMatch(files['klargjor.mjs'], /deleteMany|dropDatabase|replaceOne/);
	for (const name of ['finn.mjs', 'klargjor.mjs'])
		execFileSync(process.execPath, ['--check', '--input-type=module'], { input: files[name] });
});
