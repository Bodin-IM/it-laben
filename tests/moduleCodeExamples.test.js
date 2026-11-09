import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { moduleCodeExamples, moduleCodeExampleSelection } from '../src/lib/moduleCodeExamples.js';
import { runInNewContext } from 'node:vm';
import { compile } from 'svelte/compiler';
import { storageSetupCode, storageSaveCode, storageSafeReadCode, storageRepairedCode } from '../src/lib/storageExercise.js';
import { connectionCode, readExamples, readExample, insertCode } from '../src/lib/databaseIntro.js';
import { readPartnerState, ADAPTER_VERSION } from '../src/lib/partnerContext.js';
import { partnerPageById } from '../src/lib/partnerPages.js';
import { pageWork } from '../server/lab-partner/page-context.js';

const code = (file) => file.lines.map((line) => line.text).join('\n');

test('module examples provide complete frontend files, shared storage code and valid source links', () => {
	const backend = moduleCodeExamples('backend'), database = moduleCodeExamples('databaser');
	for (const example of backend) {
		const frontend = example.files.find((file) => file.id === 'frontend');
		const server = example.files.find((file) => file.id === 'backend');
		assert.doesNotThrow(() => compile(code(frontend), { filename: '+page.svelte', generate: 'client' }), example.id);
		assert.ok(server.lines.some((line) => line.important), 'the central server lines are marked');
		assert.ok(frontend.lines.some((line) => line.important), 'the matching frontend lines are marked');
	}
	const storage = code(backend.find((item) => item.id === 'json-fil').files[0]);
	for (const block of [storageSetupCode, storageSafeReadCode, storageSaveCode]) assert.ok(storage.includes(block));
	const saved = code(backend.find((item) => item.id === 'lagre-melding').files[0]);
	assert.ok(saved.includes(storageRepairedCode.split('\n').map((line) => `  ${line}`).join('\n')));
	assert.equal(code(database.find((item) => item.id === 'mongo-tilkobling').files[0]), connectionCode);
	assert.equal(code(database.find((item) => item.id === 'mongo-innsetting').files[0]), insertCode);
	for (const source of readExamples) {
		assert.equal(code(database.find((item) => item.id === 'mongo-hente').files.find((file) => file.id === source.id)), readExample(source.id).code);
	}
	for (const list of [backend, database]) {
		assert.equal(new Set(list.map((item) => item.id)).size, list.length);
		for (const example of list) {
			for (const id of example.relatedIds ?? []) assert.ok(id !== example.id && list.some((item) => item.id === id), id);
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

test('the displayed backend files accept frontend payloads and confirm only saved changes', () => {
	for (const example of moduleCodeExamples('backend')) {
		const source = code(example.files.find((file) => file.id === 'backend'));
		const persistent = source.includes('readFileSync');
		let disk, failWrite = false, nextId = 0;
		const start = () => {
			const routes = new Map();
			const app = { use() {}, listen() {} };
			for (const method of ['get', 'post', 'patch', 'delete']) app[method] = (path, handler) => routes.set(`${method} ${path}`, handler);
			const express = Object.assign(() => app, { json() {} });
			runInNewContext(source.replace(/^import .*;\n/gm, ''), {
				express, cors() {}, console, randomUUID: () => `m-${++nextId}`,
				readFileSync() { if (disk === undefined) throw Object.assign(new Error('Missing'), { code: 'ENOENT' }); return disk; },
				writeFileSync(path, json) { if (failWrite) throw new Error('Disk full'); disk = json; }
			});
			return (method, path, body, id) => {
				let status = 200, result, ended = false;
				const res = { status(value) { status = value; return res; }, json(value) { result = structuredClone(value); return res; }, end() { ended = true; return res; } };
				routes.get(`${method} ${path}`)({ body, params: { id } }, res);
				return { status, result, ended };
			};
		};
		let request = start();
		const initial = request('get', '/meldinger').result;
		assert.ok(Array.isArray(initial));
		if (example.id === 'get-meldinger') continue;
		assert.equal(request('post', '/meldinger', { avsender: 'Ada', tekst: '  ' }).status, 400);
		assert.deepEqual(request('get', '/meldinger').result, initial);
		const created = request('post', '/meldinger', { avsender: ' Ada ', tekst: ' Hei! ' });
		assert.equal(created.status, 201);
		assert.deepEqual(created.result, { id: 'm-1', avsender: 'Ada', tekst: 'Hei!' });
		if (persistent) request = start();
		assert.equal(request('get', '/meldinger').result.at(-1).id, created.result.id);
		if (example.id === 'endre-melding') {
			assert.equal(request('patch', '/meldinger/:id', { tekst: 'ny' }, 'ukjent').status, 404);
			assert.equal(request('patch', '/meldinger/:id', { tekst: 42 }, 'm-1').status, 400);
			failWrite = true;
			assert.equal(request('patch', '/meldinger/:id', { tekst: 'ny' }, 'm-1').status, 500);
			assert.equal(request('get', '/meldinger').result[0].tekst, 'Hei!');
			failWrite = false;
			assert.deepEqual(request('patch', '/meldinger/:id', { tekst: ' Vi sees! ' }, 'm-1').result, { id: 'm-1', avsender: 'Ada', tekst: 'Vi sees!' });
			assert.equal(start()('get', '/meldinger').result[0].tekst, 'Vi sees!');
		} else if (example.id === 'slett-melding') {
			failWrite = true;
			assert.equal(request('delete', '/meldinger/:id', undefined, 'm-1').status, 500);
			assert.equal(request('get', '/meldinger').result.length, 1);
			failWrite = false;
			assert.deepEqual(request('delete', '/meldinger/:id', undefined, 'm-1'), { status: 204, result: undefined, ended: true });
			assert.equal(request('delete', '/meldinger/:id', undefined, 'm-1').status, 404);
			assert.equal(start()('get', '/meldinger').result.length, 0);
		} else if (persistent) {
			failWrite = true;
			assert.equal(request('post', '/meldinger', { avsender: 'Ada', tekst: 'Ulagret' }).status, 500);
			assert.equal(request('get', '/meldinger').result.length, 1);
			assert.equal(start()('get', '/meldinger').result.length, 1);
		}
	}
});

test('shared example links retain their topic and database variant after regrouping', () => {
	for (const id of ['fil-lagre', 'fil-omstart', 'fil-oppstart']) {
		const { example, file } = moduleCodeExampleSelection('backend', id, 'backend');
		assert.equal(example.id, 'json-fil');
		assert.ok(code(file).includes(storageSaveCode));
		assert.ok(code(file).includes(storageSafeReadCode));
	}
	for (const id of ['fil-skrivefeil', 'fil-endre-koden']) {
		assert.equal(moduleCodeExampleSelection('backend', id, null).example.id, 'lagre-melding');
	}
	for (const source of readExamples) {
		for (const fileId of [null, 'node']) {
			const { example, file } = moduleCodeExampleSelection('databaser', `mongo-${source.id}`, fileId);
			assert.equal(example.id, 'mongo-hente');
			assert.equal(code(file), readExample(source.id).code);
			const work = pageWork(partnerPageById('module-databaser'), {
				version: ADAPTER_VERSION, values: { exampleId: example.id, fileId: file.id, lineId: null }
			});
			assert.equal(work.example.code, code(file));
		}
	}
	assert.equal(moduleCodeExampleSelection('databaser', 'mongo-hente', 'ledige').file.id, 'ledige');
	assert.equal(moduleCodeExampleSelection('databaser', 'mongo-hente', 'ukjent').file.id, 'alle');
	for (const [moduleId, exampleId] of [['backend', 'mongo-alle'], ['databaser', 'fil-lagre'], ['__proto__', 'fil-lagre'], ['backend', '__proto__']]) {
		assert.deepEqual(moduleCodeExampleSelection(moduleId, exampleId, null), { example: undefined, file: undefined });
	}
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
