import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { backendModuleExamples } from '../src/lib/backendModuleExamples.js';

const examples = backendModuleExamples.filter((example) => ['valider-melding', 'felles-feilbehandling', 'vis-feilmelding'].includes(example.id));
const code = (example, file) => example.files.find((item) => item.id === file).lines.map((line) => line.text).join('\n');

// Run the displayed route/handler code with controlled storage, not a real HTTP parser.
function server(example) {
	const routes = new Map(), middleware = [], logged = [];
	let disk = '[]', failWrite = false, id = 0;
	const app = { use(handler) { if (typeof handler === 'function') middleware.push(handler); }, listen() {} };
	for (const method of ['get', 'post', 'patch', 'delete']) app[method] = (path, handler) => routes.set(`${method} ${path}`, handler);
	runInNewContext(code(example, 'backend').replace(/^import .*;\n/gm, ''), {
		express: Object.assign(() => app, { json() {} }), cors() {},
		console: { error(error) { logged.push(error); } }, randomUUID: () => `m-${++id}`,
		readFileSync: () => disk,
		writeFileSync(path, json) { if (failWrite) throw new Error('Internal disk detail'); disk = json; }
	});
	function request(method, path, body, id, error) {
		let status = 200, result, replies = 0;
		const res = { status(value) { status = value; return res; }, json(value) { result = structuredClone(value); replies++; return res; }, end() { replies++; return res; } };
		const req = { body, params: { id } };
		const next = (error) => middleware.find((handler) => handler.length === 4)(error, req, res, next);
		if (error) next(error);
		else (routes.get(`${method} ${path}`) ?? middleware.find((handler) => handler.length === 2))(req, res, next);
		assert.equal(replies, 1, 'each request gets exactly one response');
		return { status, result };
	}
	return { request, logged, fail: (value) => { failWrite = value; }, snapshot: () => ({ disk, memory: request('get', '/meldinger').result }) };
}

test('del 7: both write routes reject invalid input and all mutations forward storage failures', () => {
	for (const example of examples) {
		const api = server(example), send = (tekst, avsender = 'Ada') => api.request('post', '/meldinger', { avsender, tekst });
		assert.equal(send('  Hei!  ').status, 201);
		assert.equal(api.snapshot().memory[0].tekst, 'Hei!');
		for (const tekst of [undefined, null, 123, '', '   ', 'x'.repeat(501)]) {
			const before = api.snapshot();
			assert.equal(send(tekst).status, 400);
			assert.equal(api.request('patch', '/meldinger/:id', { tekst }, 'm-1').status, 400);
			assert.deepEqual(api.snapshot(), before);
		}
		assert.equal(send('x'.repeat(500), 'a'.repeat(40)).status, 201);
		assert.equal(api.request('patch', '/meldinger/:id', { tekst: '  ' + 'x'.repeat(500) + '  ' }, 'm-1').status, 200);
		for (const avsender of [undefined, 123, '', ' ', 'a'.repeat(41)]) assert.equal(api.request('post', '/meldinger', { avsender, tekst: 'Hei' }).status, 400);
		assert.equal(api.request('patch', '/meldinger/:id', { tekst: 'Ny' }, 'ukjent').status, 404);
		assert.equal(api.request('delete', '/meldinger/:id', undefined, 'ukjent').status, 404);
		assert.equal(api.request('get', '/ukjent').status, 404);
		for (const [type, status] of [['entity.parse.failed', 400], ['entity.too.large', 413]]) {
			const before = api.snapshot();
			assert.equal(api.request('', '', undefined, undefined, { type }).status, status);
			assert.deepEqual(api.snapshot(), before);
		}
		api.fail(true);
		const before = api.snapshot();
		for (const [method, path] of [['post', '/meldinger'], ['patch', '/meldinger/:id'], ['delete', '/meldinger/:id']]) {
			assert.deepEqual(api.request(method, path, { avsender: 'Ada', tekst: 'Ny' }, 'm-1'), { status: 500, result: { beskjed: 'En serverfeil oppstod.' } });
			assert.deepEqual(api.snapshot(), before);
		}
		assert.equal(api.logged.length, 3);
		api.fail(false);
		assert.deepEqual(api.request('delete', '/meldinger/:id', undefined, 'm-1'), { status: 204, result: undefined });
		assert.equal(api.snapshot().memory.some((melding) => melding.id === 'm-1'), false);
	}
});

test('del 7: frontend preserves drafts on errors and handles real JSON responses and empty 204', async () => {
	for (const example of examples) {
		const api = server(example);
		let offline = false;
		const context = {
			$state: (value) => value, onMount() {}, Error, structuredClone,
			fetch: async (url, options = {}) => {
				if (offline) throw new Error('Ingen kontakt med backend.');
				const path = new URL(url).pathname;
				const id = path.split('/')[2];
				const response = api.request((options.method ?? 'get').toLowerCase(), id ? '/meldinger/:id' : path, options.body ? JSON.parse(options.body) : undefined, id);
				return response.status === 204 ? new Response(null, { status: 204 }) : Response.json(response.result, { status: response.status });
			}
		};
		const script = code(example, 'frontend').split('<script>')[1].split('</script>')[0].replace(/^\s*import .*;\n/gm, '');
		runInNewContext(script + '\nglobalThis.ui = { sendMelding, endreMelding, slettMelding, draft(value) { tekst = value; }, edit(id, value) { redigerer = id; nyTekst = value; }, read() { return structuredClone({ meldinger, tekst, nyTekst, redigerer, status, jobber }); } };', context);
		const ui = context.ui;
		ui.draft('   ');
		await ui.sendMelding();
		assert.equal(ui.read().tekst, '   ');
		assert.equal(ui.read().status, 'Skriv en melding.');
		ui.draft('Hei!');
		await ui.sendMelding();
		assert.equal(ui.read().tekst, '');
		assert.equal(ui.read().status, 'Meldingen er sendt.');
		ui.edit('m-1', ' ');
		await ui.endreMelding('m-1');
		assert.equal(ui.read().redigerer, 'm-1');
		assert.equal(ui.read().nyTekst, ' ');
		assert.equal(ui.read().meldinger[0].tekst, 'Hei!');
		ui.edit('m-1', 'Ny');
		await ui.endreMelding('m-1');
		assert.equal(ui.read().meldinger[0].tekst, 'Ny');
		assert.equal(ui.read().status, 'Meldingen er endret.');
		api.fail(true);
		await ui.slettMelding('m-1');
		assert.equal(ui.read().meldinger.length, 1);
		assert.equal(ui.read().status, 'En serverfeil oppstod.');
		api.fail(false);
		await ui.slettMelding('m-1');
		assert.equal(ui.read().meldinger.length, 0);
		assert.equal(ui.read().status, 'Meldingen er slettet.');
		offline = true;
		ui.draft('Behold meg');
		await ui.sendMelding();
		assert.equal(ui.read().tekst, 'Behold meg');
		assert.equal(ui.read().status, 'Ingen kontakt med backend.');
		assert.equal(ui.read().jobber, false);
		offline = false;
		await ui.sendMelding();
		assert.equal(ui.read().status, 'Meldingen er sendt.');
	}
});
