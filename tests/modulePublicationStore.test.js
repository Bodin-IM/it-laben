import test from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'svelte/store';
import { ApiError } from '../src/lib/lab.js';
import { createModulePublicationStore } from '../src/lib/modulePublicationStore.js';

const record = (id, status = 'active', revision = 0) => ({
	id,
	status,
	revision,
	updatedAt: revision ? 1000 + revision : null
});
const response = (...modules) => ({ modules });
function deferred() {
	let resolve, reject;
	const promise = new Promise((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}

test('moduloversikten hentes anonymt uten cookies, og offentlig HTTP kaller ikke API-et', async (t) => {
	const requests = [];
	t.mock.method(globalThis, 'fetch', async (url, options) => {
		requests.push({ url, options });
		return Response.json(response(record('a')));
	});
	const secure = createModulePublicationStore({ disabled: () => false });
	await secure.refresh();
	assert.equal(get(secure).ready, true);
	assert.equal(requests[0].url, '/api/modules');
	assert.equal(requests[0].options.credentials, 'omit');
	assert.equal(requests[0].options.cache, 'no-store');
	assert.equal(requests[0].options.body, undefined);
	const publicHttp = createModulePublicationStore({ disabled: () => true });
	await publicHttp.refresh();
	assert.equal(get(publicHttp).ready, false);
	await assert.rejects(publicHttp.update('a', 'active', 0), { code: 'HTTPS_REQUIRED' });
	assert.equal(requests.length, 1);
});

test('mislykket første innlasting gjetter ingen status; vellykket nytt forsøk åpner oversikten', async () => {
	let fail = true;
	const store = createModulePublicationStore({
		disabled: () => false,
		read: async () => {
			if (fail) throw new Error('connection lost');
			return response(record('a', 'completed'));
		}
	});
	await store.refresh();
	assert.equal(get(store).ready, false);
	assert.equal(get(store).loading, false);
	assert.ok(get(store).error);
	assert.deepEqual(get(store).modules, []);
	fail = false;
	await store.refresh();
	assert.equal(get(store).ready, true);
	assert.equal(get(store).error, '');
	assert.equal(get(store).modules[0].status, 'completed');
	fail = true;
	await store.refresh();
	assert.equal(get(store).ready, true);
	assert.ok(get(store).error);
	assert.equal(get(store).modules[0].status, 'completed');
});

test('ugyldige eller dupliserte moduldata forkastes uten å vise kommende moduler', async () => {
	for (const invalid of [
		null,
		{},
		response(record('a', 'unknown')),
		response(record('a', 'active', -1)),
		response(record('a'), record('a')),
		response({ id: 'a', status: 'active', revision: 0 })
	]) {
		const store = createModulePublicationStore({
			disabled: () => false,
			read: async () => invalid
		});
		await store.refresh();
		assert.equal(get(store).ready, false);
		assert.deepEqual(get(store).modules, []);
		assert.ok(get(store).error);
	}
});

test('en treg lesing kan ikke overskrive en lagret endring, og parallelle lesinger samles', async () => {
	const slowRead = deferred();
	let reads = 0;
	const store = createModulePublicationStore({
		disabled: () => false,
		read: () => {
			reads++;
			return slowRead.promise;
		},
		write: async () => response(record('a', 'completed', 1))
	});
	const first = store.refresh();
	const sameRead = store.refresh();
	await Promise.resolve();
	assert.equal(reads, 1);
	await store.update('a', 'completed', 0);
	slowRead.resolve(response(record('a')));
	await Promise.all([first, sameRead]);
	assert.deepEqual(get(store).modules, [record('a', 'completed', 1)]);
	assert.equal(get(store).loading, false);
});

test('samtidige lagringer av to moduler beholder begge endringer når svarene kommer i omvendt rekkefølge', async () => {
	const firstSave = deferred(),
		secondSave = deferred();
	const store = createModulePublicationStore({
		disabled: () => false,
		read: async () => response(record('a'), record('b')),
		write: (id) => (id === 'a' ? firstSave.promise : secondSave.promise)
	});
	await store.refresh();
	const a = store.update('a', 'completed', 0);
	const b = store.update('b', 'upcoming', 0);
	secondSave.resolve(response(record('a', 'completed', 1), record('b', 'upcoming', 1)));
	await b;
	firstSave.resolve(response(record('a', 'completed', 1), record('b')));
	await a;
	assert.deepEqual(get(store).modules, [record('a', 'completed', 1), record('b', 'upcoming', 1)]);
});

test('revisjonskonflikt henter siste status og krever at læreren velger på nytt; andre feil beholdes', async () => {
	let failure = new ApiError(
		'Endret av en annen lærer. Hent siste status.',
		409,
		'MODULE_CONFLICT'
	);
	let reads = 0,
		writes = 0;
	const store = createModulePublicationStore({
		disabled: () => false,
		read: async () => {
			reads++;
			return response(record('a', 'upcoming', 2));
		},
		write: async () => {
			writes++;
			throw failure;
		}
	});
	await assert.rejects(store.update('a', 'completed', 0), { code: 'MODULE_CONFLICT' });
	assert.equal(reads, 1);
	assert.equal(writes, 1);
	assert.deepEqual(get(store).modules, [record('a', 'upcoming', 2)]);
	failure = new ApiError('En annen profil er nå innlogget.', 409, 'ACCOUNT_CHANGED');
	await assert.rejects(store.update('a', 'active', 2), { code: 'ACCOUNT_CHANGED' });
	assert.equal(reads, 1);
	assert.equal(writes, 2);
	assert.equal(get(store).modules[0].status, 'upcoming');
});

test('en ny lesing kan følge gjenopprettet database med lavere revisjon', async () => {
	let latest = record('a', 'completed', 8);
	const store = createModulePublicationStore({
		disabled: () => false,
		read: async () => response(latest)
	});
	await store.refresh();
	latest = record('a', 'active', 3);
	await store.refresh();
	assert.deepEqual(get(store).modules, [latest]);
});
