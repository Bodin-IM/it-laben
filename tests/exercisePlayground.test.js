import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons, taskStartValues } from '../src/lib/ovingene.js';
import { buildTrace } from '../src/lib/ovingModel.js';
import { messageChanges, messageList, playgroundChoices, playgroundResultIndex } from '../src/lib/exercisePlayground.js';

test('alle hurtigvalg bruker eksisterende forsøk; tall og tekst kan sammenlignes', () => {
	for (const lesson of lessons.filter((item) => [5, 7].includes(item.number))) {
		lesson.tasks.forEach((_, task) => {
			for (const choice of playgroundChoices(lesson, task)) {
				assert.ok(lesson.fields[0].choices.some((item) => item.value === choice.value));
				const trace = buildTrace(lesson.number, { ...taskStartValues(lesson, task), scenario: choice.value });
				assert.ok(trace.length > 1);
			}
		});
	}
	const lesson = lessons.find((item) => item.number === 7);
	const values = taskStartValues(lesson, 1);
	assert.match(buildTrace(7, values).at(-1).status, /^400/);
	assert.match(buildTrace(7, { ...values, scenario: 'custom' }).at(-1).status, /^201/);
});

test('en vellykket endring venter på GET; avviste forsøk viser feilen direkte', () => {
	const lesson = lessons.find((item) => item.number === 6);
	for (const method of ['PATCH', 'DELETE']) {
		const trace = buildTrace(6, { ...taskStartValues(lesson), method });
		const index = playgroundResultIndex(6, trace);
		assert.match(trace[index].status, /^200/);
		assert.notDeepEqual(trace[index].data['Minne · meldinger'], trace[index].data['Nettleserens liste']);
		assert.deepEqual(trace[index + 1].data['Minne · meldinger'], trace[index + 1].data['Nettleserens liste']);
	}
	for (const patch of [{ id: 'ukjent' }, { text: '   ' }, { disk: 'fail' }]) {
		const trace = buildTrace(6, { ...taskStartValues(lesson), ...patch });
		assert.equal(playgroundResultIndex(6, trace), trace.length - 1);
		assert.deepEqual(trace.at(-1).data['Minne · meldinger'], trace[0].data['Minne · meldinger']);
	}
});

test('meldingskort skiller identiske tekster med ID og markerer bare faktiske endringer', () => {
	const before = [{ id: 'm1', avsender: 'Ada', tekst: 'Hei!' }, { id: 'm2', avsender: 'Noah', tekst: 'Hei!' }];
	const copy = structuredClone(before);
	const edit = messageChanges(before, [before[0], { ...before[1], tekst: 'Ny tekst' }]);
	assert.deepEqual(edit.messages.map((item) => item.change), ['', 'Endret']);
	assert.equal(edit.removed.length, 0);
	const deletion = messageChanges(before, [before[1]]);
	assert.deepEqual(deletion.removed.map((item) => item.id), ['m1']);
	assert.equal(deletion.messages[0].change, '');
	const added = messageChanges(before, [...before, { id: 'm3', avsender: 'Ada', tekst: 'Hei!' }]);
	assert.equal(added.messages[2].change, 'Ny');
	assert.deepEqual(before, copy);
});

test('kortvisningen skiller manglende/ødelagt liste fra en faktisk tom liste', () => {
	for (const value of [null, '{', '{"tekst":"Hei"}', '[1]', '[{"id":"m1"}]']) {
		assert.equal(messageList(value), null);
		assert.equal(messageChanges([], value).messages, null);
	}
	assert.deepEqual(messageList('[]'), []);
	const lesson = lessons.find((item) => item.number === 5);
	for (const scenario of ['save', 'fail', 'restart', 'missing', 'broken', 'object']) {
		const trace = buildTrace(5, { ...taskStartValues(lesson), scenario });
		assert.equal(playgroundResultIndex(5, trace), trace.length - 1);
		const last = trace.at(-1);
		const disk = messageList(last.data['Disk · meldinger.json']);
		if (scenario === 'save') assert.equal(disk.length, 3);
		if (scenario === 'fail') assert.equal(disk.length, 2);
		if (['missing', 'broken', 'object'].includes(scenario)) assert.equal(disk, null);
	}
});
