import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { storageSteps, storageSaveCode, storagePostCode, storageReadCode, storageCatchCode, storageRepairedCode, storageSafeReadCode, storageTestError } from '../src/lib/storageExercise.js';
import { storageExample } from '../src/lib/backendCodeExamples.js';
import { readPartnerState } from '../src/lib/partnerContext.js';
import { partnerPageById } from '../src/lib/partnerPages.js';
import { pageWork } from '../server/lab-partner/page-context.js';
import { buildPartnerMessages } from '../server/lab-partner/context.js';

const initial = [{ id: 'm1', avsender: 'Ada', tekst: 'Behold meg' }];
const imports = 'import { readFileSync, writeFileSync } from "node:fs";\nconst fil = "./meldinger.json";';
function workspace(t) {
	const dir = mkdtempSync(join(tmpdir(), 'storage-guide-'));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	const filename = join(dir, 'meldinger.json');
	function run(code) {
		writeFileSync(join(dir, 'test.mjs'), imports + '\n' + code);
		return spawnSync(process.execPath, ['test.mjs'], { cwd: dir, encoding: 'utf8' });
	}
	return { filename, run, seed: () => writeFileSync(filename, JSON.stringify(initial)) };
}

// Execute the exact displayed snippets in a temporary project, not an alternate model.
test('eksemplene lagrer egen melding og leser samme fil etter omstart', (t) => {
	const { filename, run, seed } = workspace(t);
	seed();
	const saved = run([
		storageReadCode, storageSaveCode,
		'const nyMelding = { id: "m2", avsender: "Ada", tekst: "Min egen melding" };',
		'const res = { status() { return this; }, json() {} };', storagePostCode
	].join('\n'));
	assert.equal(saved.status, 0, saved.stderr);
	const readBack = run(storageReadCode + '\nconsole.log(JSON.stringify(meldinger));');
	assert.equal(readBack.status, 0, readBack.stderr);
	const messages = JSON.parse(readBack.stdout);
	assert.deepEqual(messages[0], initial[0]);
	assert.equal(messages[1].tekst, 'Min egen melding');
	assert.deepEqual(messages, JSON.parse(readFileSync(filename, 'utf8')));
});

test('try/catch angrer ikke push; nyListe bevarer minnet ved testfeilen og normal sending virker', (t) => {
	const { filename, run, seed } = workspace(t);
	for (const route of [storageCatchCode, storageRepairedCode]) for (const fail of [true, false]) {
		seed();
		const save = fail ? storageSaveCode.replace('{', '{\n  ' + storageTestError) : storageSaveCode;
		const result = run([
			storageReadCode, save,
			'const nyMelding = { id: "m2", avsender: "Ada", tekst: "Ny melding" };',
			'let status; const res = { status(value) { status = value; return this; }, json() {} };',
			route, 'console.log(JSON.stringify({ status, meldinger }));'
		].join('\n'));
		assert.equal(result.status, 0, result.stderr);
		const output = JSON.parse(result.stdout);
		assert.equal(output.status, fail ? 500 : 201);
		assert.equal(output.meldinger.length, fail && route === storageRepairedCode ? 1 : 2);
		const file = JSON.parse(readFileSync(filename, 'utf8'));
		if (fail) assert.deepEqual(file, initial);
		else assert.deepEqual(file, output.meldinger);
	}
});

test('oppstartseksemplet bevarer eksisterende data og skiller manglende fil fra feil innhold', (t) => {
	const { filename, run, seed } = workspace(t);
	const code = storageSafeReadCode + '\nconsole.log(JSON.stringify(meldinger));';
	seed();
	const valid = run(code);
	assert.equal(valid.status, 0, valid.stderr);
	assert.deepEqual(JSON.parse(valid.stdout), initial);
	for (const invalid of ['[broken', '{}']) {
		writeFileSync(filename, invalid);
		assert.notEqual(run(code).status, 0);
		assert.equal(readFileSync(filename, 'utf8'), invalid);
	}
	rmSync(filename);
	const missing = run(code);
	assert.equal(missing.status, 0, missing.stderr);
	assert.deepEqual(JSON.parse(missing.stdout), []);
	assert.equal(existsSync(filename), false);
});

test('Labpartner får sidens eksempler og prøveoppgaver, uten påståtte elevresultater', () => {
	const page = partnerPageById('oving-5'), state = { version: 1, values: {} };
	assert.equal(page.kind, 'storage-guide');
	assert.deepEqual(readPartnerState(page.id, state), state);
	const work = pageWork(page, state);
	assert.deepEqual(work.examples.map((item) => item.code), storageSteps.map((step) => step.code));
	assert.equal(work.feedback, undefined);
	assert.equal(work.viewedEvent, undefined);
	assert.match(work.limit, /IKKE hvilken del eleven leser/);
	assert.doesNotThrow(() => buildPartnerMessages({ question: 'Hva gjør del 4?', history: [], snapshot: {
		version: 2, activityId: 'page-help', pageId: page.id, moduleId: 'backend', state, running: false, events: []
	} }));
	for (const values of [{ text: 'PRIVATE' }, { file: 'PRIVATE' }, { task: 0, mode: 'original', source: 'post', event: null, line: null, revision: 0 }])
		assert.throws(() => readPartnerState(page.id, { version: 1, values }));
});

test('nedlastingen bevarer startskriptet som det separate eksemplet i øving 6 trenger', () => {
	assert.equal(readFileSync(new URL('../static/eksempler/lagre.mjs', import.meta.url), 'utf8').trim(), storageExample.code.trim());
});
