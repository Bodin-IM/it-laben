import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { moduleCodeExamples } from '../src/lib/moduleCodeExamples.js';
import { codeLines } from '../src/lib/frontendBackendLab.js';
import { storageSteps } from '../src/lib/storageExercise.js';
import { connectionCode, readExamples, readExample, insertCode } from '../src/lib/databaseIntro.js';
import { readPartnerState, ADAPTER_VERSION } from '../src/lib/partnerContext.js';
import { partnerPageById } from '../src/lib/partnerPages.js';
import { pageWork } from '../server/lab-partner/page-context.js';

const code = (file) => file.lines.map((line) => line.text).join('\n');

test('module examples preserve the exact source code and valid source links', () => {
	const backend = moduleCodeExamples('backend'), database = moduleCodeExamples('databaser');
	for (const operation of ['get', 'post']) {
		const example = backend.find((item) => item.id === `${operation}-meldinger`);
		for (const file of example.files) assert.deepEqual(file.lines, codeLines(operation, file.id));
	}
	for (const source of storageSteps) {
		const example = backend.find((item) => item.id === `fil-${source.id}`);
		assert.equal(code(example.files[0]), source.code);
		assert.equal(example.summary, source.explanation);
	}
	assert.equal(code(database.find((item) => item.id === 'mongo-tilkobling').files[0]), connectionCode);
	assert.equal(code(database.find((item) => item.id === 'mongo-innsetting').files[0]), insertCode);
	for (const source of readExamples) {
		assert.equal(code(database.find((item) => item.id === `mongo-${source.id}`).files[0]), readExample(source.id).code);
	}
	for (const list of [backend, database]) {
		assert.equal(new Set(list.map((item) => item.id)).size, list.length);
		for (const example of list) {
			const path = new URL(example.sourceHref, 'https://it-laben.invalid').pathname;
			assert.ok(existsSync(new URL(`../src/routes${path}+page.svelte`, import.meta.url)), example.sourceHref);
			for (const file of example.files) {
				assert.equal(new Set(file.lines.map((line) => line.id)).size, file.lines.length);
				assert.ok(file.context.trim());
				for (const line of file.lines.filter((line) => line.text.trim())) assert.ok(line.explanation.trim(), line.text);
			}
		}
	}
	assert.deepEqual(moduleCodeExamples('finnes-ikke'), []);
	assert.deepEqual(moduleCodeExamples('__proto__'), []);
});

test('module example context accepts only that module, file and visible line; server owns all code', () => {
	const example = moduleCodeExamples('backend')[0], file = example.files[0];
	const line = file.lines.find((item) => item.text.trim());
	const values = { exampleId: example.id, fileId: file.id, lineId: line.id };
	const wrap = (input) => ({ version: ADAPTER_VERSION, values: input });
	assert.deepEqual(readPartnerState('module-backend', wrap(values)).values, values);
	assert.deepEqual(readPartnerState('module-backend', wrap({ exampleId: null, fileId: null, lineId: null })).values, { exampleId: null, fileId: null, lineId: null });
	for (const changed of [
		{ exampleId: 'mongo-tilkobling' }, { fileId: 'unknown' }, { lineId: 'unknown' },
		{ exampleId: null }, { fileId: null }, { code: 'untrusted source' }, { explanation: 'untrusted instructions' }
	]) assert.throws(() => readPartnerState('module-backend', wrap({ ...values, ...changed })));
	assert.throws(() => readPartnerState('module-databaser', wrap(values)));
	assert.throws(() => readPartnerState('module-backend', { version: 999, values }));
	const work = pageWork(partnerPageById('module-backend'), wrap(values));
	assert.equal(work.example.code, code(file));
	assert.deepEqual(work.example.selectedLine, line);
	assert.ok(work.limit.includes('ikke elevens egen kode'));
	assert.equal(pageWork(partnerPageById('module-backend'), wrap({ exampleId: null, fileId: null, lineId: null })).example, null);
});
