import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createStorageState, runStorage, storageLines, storageReadLines, storageSaveLines, storagePostLines, storageSetupCode, storageEvents, storageTasks } from '../src/lib/storageExercise.js';
import { readPartnerState } from '../src/lib/partnerContext.js';
import { partnerPageById } from '../src/lib/partnerPages.js';
import { pageWork } from '../server/lab-partner/page-context.js';
import { buildPartnerMessages } from '../server/lab-partner/context.js';

const end = (state, options) => runStorage(state, options).at(-1).state;

test('egen melding følger samme fil gjennom flere sendinger og omstart; snapshots er uavhengige', () => {
	const initial = createStorageState(), original = structuredClone(initial);
	const trace = runStorage(initial, { action: 'send', mode: 'original', text: 'Min egen melding' });
	const stored = trace.at(-1).state;
	const restarted = end(stored, { action: 'restart', mode: 'original' });
	assert.equal(restarted.memory.at(-1).tekst, 'Min egen melding');
	assert.equal(restarted.file, stored.file);
	const second = end(restarted, { action: 'send', mode: 'repaired', text: 'En til' });
	assert.deepEqual(JSON.parse(second.file).map((item) => item.tekst), ['Hei!', 'Hei!', 'Min egen melding', 'En til']);
	assert.equal(new Set(second.memory.map((item) => item.id)).size, 4);
	assert.deepEqual(initial, original);
	trace[0].state.memory[0].tekst = 'Endret snapshot';
	assert.equal(stored.memory[0].tekst, 'Hei!');
	assert.equal(initial.memory[0].tekst, 'Hei!');
});

test('skrivefeilen skiller kodevariantene, og kodebytte reparerer ikke tidligere ulagrede data', () => {
	const initial = createStorageState();
	const original = end(initial, { action: 'send', mode: 'original', text: 'Ulagret', fail: true });
	assert.equal(original.memory.length, initial.memory.length + 1);
	assert.equal(original.file, initial.file);
	const repaired = end(initial, { action: 'send', mode: 'repaired', text: 'Ulagret', fail: true });
	assert.deepEqual(repaired.memory, initial.memory);
	assert.equal(repaired.file, initial.file);
	const stillDirty = end(original, { action: 'send', mode: 'repaired', text: 'Ny feil', fail: true });
	assert.deepEqual(stillDirty.memory, original.memory);
	const clean = end(stillDirty, { action: 'restart', mode: 'repaired' });
	assert.deepEqual(clean.memory, initial.memory);
	const retry = runStorage(clean, { action: 'send', mode: 'repaired', text: 'Nå virker det' });
	assert.equal(retry.at(-1).status, '201 · Meldingen er lagret');
	assert.deepEqual(retry.at(-1).state.memory, JSON.parse(retry.at(-1).state.file));
	const renamed = retry.find((item) => item.id === 'rename');
	assert.deepEqual(renamed.state.memory, clean.memory);
	assert.equal(JSON.parse(renamed.state.file).length, clean.memory.length + 1);
});

test('oppstartsfeil bruker kopier; ødelagt JSON overskrives ikke med en tom liste', () => {
	const initial = end(createStorageState(), { action: 'send', mode: 'repaired', text: 'Behold meg' });
	const before = structuredClone(initial);
	const missing = runStorage(initial, { action: 'missing', mode: 'repaired' });
	assert.deepEqual(missing.at(-1).state.memory, []);
	assert.equal(missing.at(-1).state.file, null);
	const broken = runStorage(initial, { action: 'broken', mode: 'repaired' });
	assert.equal(broken.at(-1).state.running, false);
	assert.equal(broken.at(-1).state.file, broken[0].state.file);
	assert.deepEqual(initial, before);
	assert.equal(end(initial, { action: 'restart', mode: 'repaired' }).memory.at(-1).tekst, 'Behold meg');
});

test('hvert modellsteg viser en linje som finnes i valgt kode; konteksten deler ingen elevtekst', () => {
	const page = partnerPageById('oving-5');
	assert.equal(page.kind, 'storage-course');
	for (const mode of ['original', 'repaired']) for (const action of ['send', 'restart', 'missing', 'broken']) for (const fail of [false, true]) {
		for (const frame of runStorage(createStorageState(), { mode, action, fail, text: 'PRIVATE_MESSAGE' })) {
			assert.ok(storageLines(mode, frame.source).some((line) => line.id === frame.line));
			const state = { version: 1, values: { task: 3, mode, source: frame.source, event: frame.id, line: frame.line, revision: 1 } };
			assert.deepEqual(readPartnerState(page.id, state), state);
			const work = pageWork(page, state);
			assert.deepEqual(work.viewedEvent, storageEvents[frame.id]);
			assert.equal(work.feedback, undefined); // No reconstruction of unseen chat history.
			const messages = buildPartnerMessages({ question: 'Hva gjør denne linjen?', history: [], snapshot: { version: 2, activityId: 'page-help', pageId: page.id, moduleId: 'backend', state, running: false, events: [] } });
			assert.ok(!JSON.stringify(messages).includes('PRIVATE_MESSAGE'));
		}
	}
	const values = { task: 0, mode: 'original', source: 'post', event: null, line: null, revision: 0 };
	for (const patch of [{ text: 'secret' }, { file: 'secret' }, { task: storageTasks.length }, { mode: 'eval' }, { source: 'other' }, { event: 'fake' }, { event: 'errorRepaired' }, { event: 'next' }, { event: 'commit' }, { mode: 'repaired', event: 'push' }, { line: 'read' }, { revision: -1 }])
		assert.throws(() => readPartnerState(page.id, { version: 1, values: { ...values, ...patch } }));
	assert.throws(() => readPartnerState(page.id, { version: 1, values: { choices: { scenario: 'save', text: 'text' }, step: 1, line: 0, task: 0 } }));
});

test('den viste koden kan lagre og lese samme fil og håndterer den kontrollerte skrivefeilen', (t) => {
	const dir = mkdtempSync(join(tmpdir(), 'storage-exercise-'));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	const filename = join(dir, 'meldinger.json'), initial = createStorageState().file;
	function run(code) {
		writeFileSync(join(dir, 'test.mjs'), code);
		const result = spawnSync(process.execPath, ['test.mjs'], { cwd: dir, encoding: 'utf8' });
		return result;
	}
	for (const mode of ['original', 'repaired']) for (const fail of [false, true]) {
		writeFileSync(filename, initial);
		const saveLines = storageSaveLines(mode).map((item) => item.code);
		if (fail) saveLines.splice(1, 0, '  throw new Error("Test: skrivingen feiler");');
		const code = [
			'import { readFileSync, writeFileSync, renameSync } from "node:fs";',
			'const fil = "./meldinger.json";', ...storageReadLines.map((item) => item.code), ...saveLines,
			'const nyMelding = { id: "m3", avsender: "Ada", tekst: "Egen tekst" };',
			'let status; const res = { status(value) { status = value; return this; }, json() {} };',
			...storagePostLines(mode).map((item) => item.code), 'console.log(JSON.stringify({ status, meldinger }));'
		].join('\n');
		const result = run(code);
		assert.equal(result.status, 0, result.stderr);
		const output = JSON.parse(result.stdout);
		assert.equal(output.status, fail ? 500 : 201);
		assert.equal(output.meldinger.length, fail && mode === 'repaired' ? 2 : 3);
		assert.equal(JSON.parse(readFileSync(filename, 'utf8')).length, fail ? 2 : 3);
		const restart = run(storageSetupCode + '\nconsole.log(JSON.stringify(meldinger));');
		assert.equal(restart.status, 0, restart.stderr);
		assert.deepEqual(JSON.parse(restart.stdout), JSON.parse(readFileSync(filename, 'utf8')));
	}
	writeFileSync(filename, '[broken');
	assert.notEqual(run(storageSetupCode).status, 0);
	assert.equal(readFileSync(filename, 'utf8'), '[broken');
	rmSync(filename);
	const missing = run(storageSetupCode + '\nconsole.log(JSON.stringify(meldinger));');
	assert.equal(missing.status, 0, missing.stderr);
	assert.deepEqual(JSON.parse(missing.stdout), []);
});
