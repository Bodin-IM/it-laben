import test from 'node:test';
import assert from 'node:assert/strict';
import { searchCatalogue } from '../src/lib/catalogueSearch.js';
import { altElevinnhold } from '../src/lib/innhold.js';
import { moduler } from '../src/lib/moduler.js';

test('felles søk viser hele katalogen og beholder bare valgt fag', () => {
	assert.equal(searchCatalogue().modules.length, moduler.length);
	assert.equal(searchCatalogue().activities.length, altElevinnhold.length);
	const drift = searchCatalogue({ subject: 'drift' });
	assert.deepEqual(drift.modules, []);
	assert.deepEqual(
		drift.activities.map((x) => x.id),
		['oving-10']
	);
});
test('søk finner moduler via innholdet og aktiviteter via norske eller normaliserte ord', () => {
	assert.ok(searchCatalogue({ query: 'SESSION' }).modules.some((x) => x.id === 'backend'));
	assert.deepEqual(searchCatalogue({ query: 'øving 10' }), searchCatalogue({ query: 'oving 10' }));
	assert.deepEqual(
		searchCatalogue({ query: 'øving 10' }).modules.map((module) => module.id),
		['backend']
	);
	assert.equal(
		searchCatalogue({ query: '  multiple  choice  ' }).activities[0].id,
		'backend-oppsummering'
	);
	assert.ok(searchCatalogue({ query: 'lagring' }).modules.some((x) => x.id === 'backend'));
});
test('aktivitetstype avgrenser aktivitetene uten å skjule relevante moduler', () => {
	const all = searchCatalogue({ subject: 'utvikling', query: 'session' });
	const games = searchCatalogue({ subject: 'utvikling', query: 'session', format: 'spill' });
	assert.deepEqual(games.modules, all.modules);
	assert.ok(games.activities.length);
	assert.ok(games.activities.every((x) => x.fag === 'utvikling' && x.format === 'spill'));
});
test('søk krever alle ordene og håndterer tomme treff uten å endre katalogen', () => {
	const before = JSON.stringify({ altElevinnhold, moduler });
	assert.deepEqual(searchCatalogue({ query: 'session ord-som-ikke-finnes' }), {
		modules: [],
		activities: []
	});
	assert.equal(JSON.stringify({ altElevinnhold, moduler }), before);
});

test('elevenes søk skjuler kommende moduler og viser aktive før tidligere, også ved fagvalg', () => {
	const statusById = {
		backend: 'completed',
		databaser: 'active'
	};
	const publications = moduler.map((module) => ({
		id: module.id,
		status: statusById[module.id] ?? 'upcoming',
		revision: 1,
		updatedAt: 1000
	}));
	const result = searchCatalogue({ publications });
	assert.deepEqual(
		result.modules.map((module) => module.id),
		['databaser', 'backend']
	);
	assert.deepEqual(
		searchCatalogue({ publications, subject: 'utvikling' }).modules.map((module) => module.id),
		['databaser', 'backend']
	);
	const upcoming = publications.map((record) => ({ ...record, status: 'upcoming' }));
	assert.deepEqual(searchCatalogue({ publications: upcoming, query: 'MongoDB' }).modules, []);
	assert.deepEqual(searchCatalogue({ publications: upcoming, query: 'øving 10' }).modules, []);
	assert.deepEqual(result.activities, searchCatalogue().activities);
	assert.deepEqual(searchCatalogue({ publications: [] }).modules, []);
});
