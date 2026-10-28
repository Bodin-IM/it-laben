import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { moduler, moduleContents, moduleProgress, validateModules } from '../src/lib/moduler.js';
import { aktiviteter } from '../src/lib/innhold.js';
import { catalog } from '../server/catalog.js';

test('moduler peker til eksisterende sider og gir ikke nye XP-aktiviteter', () => {
	validateModules();
	for (const module of moduler) {
		assert.ok(!catalog.some((item) => item.id === module.id));
		for (const step of moduleContents(module)) {
			const links = step.kind === 'undervisning' ? step.lessons : [step];
			for (const link of links)
				assert.ok(
					existsSync(new URL(`../src/routes${link.href}+page.svelte`, import.meta.url)),
					link.href
				);
		}
	}
	assert.equal(catalog.length, aktiviteter.length);
});

test('modulfremgang skiller undervisning og påbegynt arbeid fra gjennomgått eller bestått', () => {
	const module = moduler[0];
	assert.deepEqual(moduleProgress(module), { completed: 0, total: 14, started: false });
	assert.deepEqual(
		moduleProgress(module, [
			{ id: 'meldingens-reise', status: 'passed' },
			{ id: 'frontend-backend', status: 'started' },
			{ id: 'chat', status: 'new' },
			{ id: 'oving-10', status: 'passed' }
		]),
		{ completed: 1, total: 14, started: true }
	);
	const completed = [
		{ id: 'frontend-backend', status: 'reviewed' },
		{ id: 'chat', status: 'passed' }
	];
	assert.deepEqual(moduleProgress(module, completed), { completed: 2, total: 14, started: true });
	assert.equal(moduleProgress(module, [...completed, ...completed]).completed, 2);
});

test('modulkatalogen avviser brutte referanser, duplikater og feil innholdstype', () => {
	assert.throws(() => validateModules([moduler[0], moduler[0]]), /Ugyldig modul/);
	assert.throws(
		() => validateModules([{ ...moduler[0], steps: [{ kind: 'oving', id: 'finnes-ikke' }] }]),
		/Feil innholdstype/
	);
	assert.throws(
		() =>
			validateModules([{ ...moduler[0], steps: [{ kind: 'undervisning', id: 'finnes-ikke' }] }]),
		/Ukjent undervisningsopplegg/
	);
	assert.throws(
		() => validateModules([{ ...moduler[0], steps: [{ kind: 'oving', id: 'chat' }] }]),
		/Feil innholdstype/
	);
	assert.throws(
		() => validateModules([{ ...moduler[0], steps: [{ kind: 'oving', id: 'oving-10' }] }]),
		/Feil innholdstype eller fag/
	);
	assert.doesNotThrow(() =>
		validateModules([
			{ ...moduler[0], steps: [{ kind: 'oving', id: 'oving-10', subject: 'drift' }] }
		])
	);
	assert.throws(
		() =>
			validateModules([
				{ ...moduler[0], steps: [{ kind: 'oving', id: 'oving-10', subject: 'ukjent' }] }
			]),
		/Ugyldig modulsteg/
	);
});

test('offentlig modulinnhold inneholder bare felles undervisningsmetadata og elevlenker', () => {
	for (const module of moduler)
		for (const step of moduleContents(module)) {
			assert.ok(!('notes' in step));
			assert.ok(!('preparation' in step));
			if (step.kind === 'undervisning') {
				assert.match(step.teacherHref, /^\/laerer\/undervisning\/\?opplegg=/);
				assert.ok(step.lessons.every((lesson) => !lesson.href.includes('visning=presentasjon')));
			}
		}
});
