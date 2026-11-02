import test from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'svelte/store';
import { moduler } from '../src/lib/moduler.js';
import { publicModules } from '../src/lib/publicModules.js';
import { createPublicModulePublicationStore } from '../src/lib/modulePublicationStore.js';
import { visibleModules, publicationFor } from '../src/lib/modulePublication.js';

test('public modules are available immediately and only deliberately published modules are visible', () => {
	const store = createPublicModulePublicationStore(publicModules);
	const initial = get(store);
	assert.equal(initial.ready, true);
	assert.equal(initial.loading, false);
	assert.equal(initial.error, '');
	assert.deepEqual(visibleModules(moduler, initial.modules).map((module) => module.id), ['backend', 'databaser']);
	for (const record of initial.modules) assert.ok(moduler.some((module) => module.id === record.id));
	assert.equal(publicationFor('future-module', initial.modules).status, 'upcoming');
	store.dispose();
});

test('public catalogue refresh and attempted status changes never contact a backend', async () => {
	const originalFetch = globalThis.fetch;
	let requests = 0;
	globalThis.fetch = async () => { requests++; throw new Error('No backend'); };
	try {
		const store = createPublicModulePublicationStore(publicModules);
		const before = get(store);
		await store.refresh();
		await assert.rejects(store.update(), { code: 'PUBLIC_EDITION' });
		assert.deepEqual(get(store), before);
		assert.equal(requests, 0);
		store.dispose();
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('public catalogue rejects invalid or duplicate records before showing content', () => {
	assert.throws(() => createPublicModulePublicationStore([publicModules[0], publicModules[0]]));
	assert.throws(() => createPublicModulePublicationStore([{ ...publicModules[0], revision: -1 }]));
});
