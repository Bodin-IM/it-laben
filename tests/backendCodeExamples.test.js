import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { backendCodeExample } from '../src/lib/backendCodeExamples.js';

function workspace(t) {
	const dir = mkdtempSync(join(tmpdir(), 'backend-code-example-'));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	return dir;
}
function run(dir, example, code = example.code) {
	const path = join(dir, example.file);
	writeFileSync(path, code);
	// The instructions put both files and the terminal in the same exercise folder.
	const result = spawnSync(process.execPath, [path], { cwd: dir, encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	return result.stdout.trim();
}

test('de viste fil-eksemplene kan lagre, lese, endre og slette samme JSON-fil', (t) => {
	const dir = workspace(t), example = backendCodeExample(5);
	assert.equal(run(dir, example), 'Hei!');
	const read = () => JSON.parse(readFileSync(join(dir, 'ovingsdata.json'), 'utf8'));
	assert.deepEqual(read(), JSON.parse(example.output));
	const original = read();
	const edit = backendCodeExample(6, { method: 'PATCH' });
	run(dir, edit);
	assert.deepEqual(read(), JSON.parse(edit.output));
	assert.deepEqual(read()[0], original[0]);
	assert.equal(read()[1].id, original[1].id);
	assert.equal(read()[1].avsender, original[1].avsender);
	const remove = backendCodeExample(6, { method: 'DELETE' });
	run(dir, remove);
	assert.deepEqual(read(), JSON.parse(remove.output));
	run(dir, example);
	assert.deepEqual(read(), original, 'lagre.mjs gjenoppretter startdataene som beskrevet');
});

test('det viste valideringseksemplet håndterer type, tom tekst og begge sider av grensen', (t) => {
	const dir = workspace(t), example = backendCodeExample(7);
	assert.equal(run(dir, example), example.output);
	for (const [value, expected] of [
		['Hei!', 'Meldingen kan lagres.'], ['  Hei!  ', 'Meldingen kan lagres.'],
		[123, 'Bruk tekst.'], ['', 'Skriv en melding.'],
		['a'.repeat(500), 'Meldingen kan lagres.'], ['a'.repeat(501), 'Maks 500 tegn.']
	]) {
		const code = example.code.replace('const tekst = "   ";', `const tekst = ${JSON.stringify(value)};`);
		assert.notEqual(code, example.code);
		assert.equal(run(dir, example, code), expected);
	}
});

test('kodeeksempler er avgrenset til 5–7 og bruker ikke rå felttekst', () => {
	assert.equal(backendCodeExample(8), null);
	assert.deepEqual(backendCodeExample(6, { method: 'PATCH', text: 'privat tekst' }), backendCodeExample(6));
	assert.equal(JSON.stringify(backendCodeExample(7, { body: 'privat tekst' })).includes('privat tekst'), false);
});
