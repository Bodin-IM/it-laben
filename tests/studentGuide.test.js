import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { guideSteps, tutorialResult } from '../src/lib/studentGuide.js';
import { readPartnerState } from '../src/lib/partnerContext.js';
import { partnerPageById } from '../src/lib/partnerPages.js';
import { pageWork } from '../server/lab-partner/page-context.js';
import { moduler } from '../src/lib/moduler.js';
import { altElevinnhold } from '../src/lib/innhold.js';

test('tutorial: feilforsøk, retting og gyldig melding gir forklarlig respons', () => {
	assert.equal(tutorialResult({ sample: 'spaces', trim: false }).status, 201);
	assert.equal(tutorialResult({ sample: 'spaces', trim: true }).status, 400);
	for (const trim of [true, false])
		assert.equal(tutorialResult({ sample: 'message', trim }).status, 201);
	assert.throws(() => tutorialResult({ sample: 'ukjent', trim: true }));
});

test('tutorial: konteksten skiller gamle resultater og avviser råtekst og falske resultater', () => {
	const page = partnerPageById('tutorial');
	const values = { sample: 'spaces', trim: true, run: { sample: 'spaces', trim: false } };
	const state = readPartnerState('tutorial', { version: 1, values });
	const work = pageWork(page, state);
	assert.equal(state.values.section, 'all');
	assert.equal(work.guideStep, null);
	for (const step of guideSteps) {
		const guided = readPartnerState('tutorial', {
			version: 1,
			values: { ...values, section: step.id }
		});
		assert.deepEqual(pageWork(page, guided).guideStep, step);
	}
	assert.equal(work.oldRun, true);
	assert.equal(work.lastRun.status, 201);
	assert.equal(pageWork(page, { version: 1, values: { ...values, run: null } }).lastRun, null);
	for (const bad of [
		{ ...values, text: 'hemmelig' },
		{ ...values, run: { ...values.run, status: 400 } },
		{ ...values, sample: 'private' },
		{ ...values, section: 'private' },
		{ ...values, section: { id: 'prov', text: 'hemmelig' } },
		{ ...values, trim: 'true' }
	]) {
		assert.throws(() => readPartnerState('tutorial', { version: 1, values: bad }));
	}
});

test('backend: samler utviklingsoppgavene og Øving 10, mens databaser har egen modul', () => {
	const backend = moduler.find((item) => item.id === 'backend');
	const ids = backend.steps.map((step) => step.id);
	for (const activity of altElevinnhold.filter(
		(item) => item.fag === 'utvikling' && !item.id.startsWith('database-')
	))
		assert.ok(ids.includes(activity.id), activity.id);
	assert.ok(ids.includes('oving-10'));
	assert.equal(altElevinnhold.find((item) => item.id === 'oving-10').fag, 'drift');
	assert.ok(!ids.some((id) => id.startsWith('database-')));
	assert.deepEqual(
		moduler.map((item) => item.id),
		['backend', 'databaser']
	);
});

test('backend: migrering beholder lærerens restriktive statusvalg og endrer ikke gammel historikk', () => {
	const sql = readFileSync(
		new URL('../server/migrations/011_backend_module.sql', import.meta.url),
		'utf8'
	);
	for (const [statuses, expected] of [
		[['active', 'active', 'active'], 'active'],
		[['completed', 'completed', 'completed'], 'completed'],
		[['active', 'completed', 'completed'], 'active'],
		[['active', 'upcoming', 'completed'], 'upcoming'],
		[['upcoming', 'upcoming', 'upcoming'], 'upcoming'],
		[['active'], 'upcoming']
	]) {
		const db = new DatabaseSync(':memory:');
		db.exec(
			'CREATE TABLE module_publication(module_id TEXT PRIMARY KEY,status TEXT,revision INTEGER DEFAULT 0)'
		);
		const ids = ['meldingens-reise', 'data-og-lagring', 'innlogging-og-tilgang'];
		statuses.forEach((status, i) =>
			db.prepare('INSERT INTO module_publication VALUES (?,?,7)').run(ids[i], status)
		);
		const before = db.prepare('SELECT * FROM module_publication').all();
		db.exec(sql);
		assert.equal(
			db.prepare("SELECT status FROM module_publication WHERE module_id='backend'").get().status,
			expected
		);
		assert.deepEqual(
			db.prepare("SELECT * FROM module_publication WHERE module_id!='backend'").all(),
			before
		);
		db.close();
	}
});
