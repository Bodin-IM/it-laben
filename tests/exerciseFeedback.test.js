import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons, taskStartValues } from '../src/lib/ovingene.js';
import { buildTrace, validationFeedback } from '../src/lib/ovingModel.js';
import { exerciseFeedback } from '../src/lib/exerciseFeedback.js';
import { backendProjectGuides } from '../src/lib/backendProjectGuides.js';
import { lessonChoices } from '../src/lib/partnerContext.js';
import { partnerPageById } from '../src/lib/partnerPages.js';
import { pageTask, pageWork } from '../server/lab-partner/page-context.js';
import { buildPartnerMessages } from '../server/lab-partner/context.js';

const lessonFor = (number) => lessons.find((lesson) => lesson.number === number);
const run = (number, values = {}) => buildTrace(number, { ...taskStartValues(lessonFor(number)), ...values });
const describe = (number, values = {}) => exerciseFeedback(number, run(number, values));
function unchanged(trace) {
	for (const field of ['Minne · meldinger', 'Disk · meldinger.json'])
		assert.deepEqual(trace.at(-1).data[field], trace[0].data[field], field);
}

test('alle tilgjengelige forsøk får konkret respons uten å endre kjøring eller oppgavemetadata', () => {
	const catalogue = structuredClone(lessons);
	for (const lesson of lessons) {
		let variants = [taskStartValues(lesson)];
		for (const field of lesson.fields.filter((field) => field.kind === 'select'))
			variants = variants.flatMap((values) => field.choices.map((choice) => ({ ...values, [field.key]: choice.value })));
		for (const values of variants) {
			const trace = buildTrace(lesson.number, values), before = structuredClone(trace);
			const result = exerciseFeedback(lesson.number, trace);
			assert.ok(result?.result && result.cause && result.next, JSON.stringify({ number: lesson.number, values }));
			assert.doesNotMatch(JSON.stringify(result), /undefined|NaN/);
			assert.deepEqual(trace, before);
		}
	}
	assert.deepEqual(lessons, catalogue);
	assert.equal(exerciseFeedback(5, []), null);
	assert.equal(exerciseFeedback(99, run(5)), null);
});

test('lagringsrespons skiller avvist tekst, skrivefeil, lagret melding og omstart', () => {
	const saved = run(5);
	assert.match(exerciseFeedback(5, saved).result, /2 til 3/);
	assert.equal(saved.at(-1).data['Minne · meldinger'].length, 3);
	assert.equal(JSON.parse(saved.at(-1).data['Disk · meldinger.json']).length, 3);
	for (const [values, code] of [[{ text: '   ' }, '400'], [{ scenario: 'fail' }, '500']]) {
		const trace = run(5, values);
		unchanged(trace);
		assert.ok(exerciseFeedback(5, trace).result.includes(code));
	}
	assert.match(describe(5, { scenario: 'restart' }).result, /lest fra filen.*ikke sendt noe HTTP/);
	assert.match(describe(5, { scenario: 'missing' }).result, /ingen ny datafil/i);
	assert.equal(run(5, { scenario: 'missing' }).at(-1).data['Disk · meldinger.json'], null);
	assert.match(describe(5, { scenario: 'broken' }).cause, /JSON-formatet/);
	assert.match(describe(5, { scenario: 'object' }).cause, /objekt/);
});

test('CRUD-respons beskriver riktig ID, metode og oppdatering av frontend', () => {
	for (const method of ['PATCH', 'DELETE']) for (const id of ['m1', 'm2']) {
		const trace = run(6, { method, id });
		const result = exerciseFeedback(6, trace);
		assert.ok(result.result.includes(`${method} /meldinger/${id}`));
		assert.deepEqual(trace.at(-1).data['Nettleserens liste'], trace.at(-1).data['Minne · meldinger']);
		assert.match(result.next, /før siste GET/);
	}
	for (const [values, code] of [[{ id: 'ukjent' }, '404'], [{ text: ' ' }, '400'], [{ disk: 'fail' }, '500']]) {
		const trace = run(6, values);
		unchanged(trace);
		assert.ok(exerciseFeedback(6, trace).result.includes(code));
	}
});

test('validering beholder sin eksisterende respons, også ved parser- og nettverksfeil', () => {
	for (const choice of lessonFor(7).fields.find((field) => field.key === 'scenario').choices) {
		const trace = run(7, { scenario: choice.value });
		assert.deepEqual(exerciseFeedback(7, trace), validationFeedback(trace));
	}
});

test('registreringsrespons forklarer den konkrete inputfeilen uten å gjengi passord', () => {
	for (const [values, cause] of [
		[{ username: 'x', password: 'PRIVATE_VALID_837' }, /brukernavnet/],
		[{ username: 'ada', password: 'X9!pv' }, /kortere enn 12/],
		[{ username: 'ada', password: 'ø'.repeat(37) }, /72 UTF-8-byte/]
	]) {
		const trace = run(8, values);
		assert.equal(trace.at(-1).data['Disk · brukere.json'].length, 0);
		const response = exerciseFeedback(8, trace);
		assert.match(response.result, /400/);
		assert.match(response.cause, cause);
		assert.ok(!JSON.stringify(response).includes(values.password));
	}
	assert.match(describe(8).result, /fortsatt ikke innlogget/);
	assert.match(describe(8, { scenario: 'duplicate' }).result, /409/);
	assert.deepEqual(run(8).at(-1).data.Sessionlager, {});
});

test('samme 401 forklares forskjellig ved feil passord, manglende cookie, utlogging og omstart', () => {
	for (const [scenario, cause] of [
		['wrong', /passordkontrollen avviste/],
		['nocookie', /cookien ble ikke sendt/],
		['logout', /Utloggingen fjernet/],
		['restart', /Omstarten tømte/]
	]) assert.match(describe(8, { scenario }).cause, cause);
	assert.match(describe(8, { scenario: 'login' }).result, /opprettet en session.*GET \/meg ga 200/);
	assert.match(describe(8, { scenario: 'meg' }).result, /Brukerfilen ble ikke endret/);
});

test('tilgangsrespons skiller offentlig lesing, innlogging, manglende ID, eier og tekst', () => {
	assert.match(describe(9).cause, /leseruten er offentlig/);
	for (const [values, code, cause] of [
		[{ actor: 'guest', method: 'DELETE', id: 'ukjent' }, '401', /gjest/],
		[{ actor: 'ada', method: 'DELETE', id: 'ukjent' }, '404', /ID-en fantes ikke/],
		[{ actor: 'noah', method: 'DELETE', id: 'm1' }, '403', /Noah.*Ada/],
		[{ actor: 'ada', method: 'PATCH', id: 'm1', text: '   ' }, '400', /Teksten var ugyldig/]
	]) {
		const trace = run(9, values);
		unchanged(trace);
		const response = exerciseFeedback(9, trace);
		assert.ok(response.result.includes(code));
		assert.match(response.cause, cause);
	}
	assert.match(describe(9, { actor: 'ada', method: 'DELETE', id: 'm2' }).next, /som Noah/);
});

test('eierskapsrespons beskriver både tillatt sletting og ignorert eier fra body', () => {
	const post = run(9, { actor: 'ada', method: 'POST', forge: 'yes' });
	assert.equal(post.at(-1).data['Minne · meldinger'].at(-1).eierId, 'ada');
	assert.match(exerciseFeedback(9, post).result, /Ada som avsender/);
	const patch = run(9, { actor: 'ada', method: 'PATCH', id: 'm1', forge: 'yes' });
	assert.equal(patch.at(-1).data['Minne · meldinger'][0].eierId, 'ada');
	assert.match(exerciseFeedback(9, patch).result, /eier, avsender og ID ble beholdt/);
	const deleted = run(9, { actor: 'ada', method: 'DELETE', id: 'm1' });
	assert.ok(!deleted.at(-1).data['Minne · meldinger'].some((message) => message.id === 'm1'));
	assert.match(exerciseFeedback(9, deleted).result, /ble slettet/);
});

test('driftsrespons skiller riktig HTTP-svar fra riktig versjon og beskriver hele adresseforsøket', () => {
	for (const framework of ['kit', 'vite']) {
		assert.match(describe(10, { scenario: 'source', framework }).result, /200.*versjon 1/);
		assert.match(describe(10, { scenario: 'publish', framework }).result, /versjon 2/);
		const address = describe(10, { scenario: 'localhost', framework });
		assert.match(address.result, /først til elevens egen PC.*VM-en og ga 200/);
	}
	for (const scenario of ['restart', 'reboot']) {
		const trace = run(10, { scenario });
		assert.equal(trace.at(-1).data['Disk · data/'], trace[0].data['Disk · data/']);
		assert.match(exerciseFeedback(10, trace).result, /sessionlageret er tomt/);
	}
	assert.match(describe(10, { scenario: 'backup' }).result, /Melding B.*ikke med/);
});

test('responsen hører til det kjørte forsøket selv om input endres eller et nytt forsøk feiler', () => {
	const values = { ...taskStartValues(lessonFor(9)), actor: 'noah', method: 'DELETE', id: 'm1' };
	const first = buildTrace(9, values);
	const original = exerciseFeedback(9, first);
	values.actor = 'ada';
	assert.match(exerciseFeedback(9, buildTrace(9, values)).result, /ble slettet/);
	assert.deepEqual(exerciseFeedback(9, first), original);
	assert.match(original.result, /403/);
});

test('prosjektstøtten gjenbrukes av labpartneren og krever ingen ny progresjonsstatus', () => {
	for (const number of [5, 6, 8, 9, 10]) {
		const lesson = lessonFor(number), guide = backendProjectGuides[number];
		assert.equal(lesson.transfer.guide, guide);
		assert.deepEqual(pageTask(partnerPageById(`oving-${number}`), 'backend').transfer.guide, guide);
		assert.ok(guide.where && guide.firstChange && guide.prerequisite && guide.hint);
		assert.ok(guide.steps.length && guide.tests.length >= 2);
	}
	assert.equal(lessonFor(7).transfer.guide, undefined); // Existing dedicated project stays intact.
});

test('labpartneren får respons bare ved siste steg, innenfor kontekstgrensen og uten rå fritekst', () => {
	for (const lesson of lessons) {
		const values = taskStartValues(lesson);
		for (const field of lesson.fields) if (field.kind !== 'select') values[field.key] = 'PRIVATE_INPUT_EXAMPLE';
		const choices = lessonChoices(lesson, values), trace = buildTrace(lesson.number, values);
		const page = partnerPageById(`oving-${lesson.number}`);
		const state = (step) => ({ version: 1, values: { choices, step, line: -1, task: lesson.firstTask ?? 0 } });
		assert.equal(pageWork(page, state(-1)).feedback, undefined);
		assert.equal(pageWork(page, state(0)).feedback, undefined);
		const end = state(trace.length - 1);
		assert.ok(pageWork(page, end).feedback);
		assert.match(pageWork(page, end).feedbackSource, /rekonstruerte eksempeldata/);
		const messages = buildPartnerMessages({ question: 'Hjelp meg å forstå dette.', history: [], snapshot: {
			version: 2, activityId: 'page-help', pageId: page.id, moduleId: 'backend', state: end, running: false, events: []
		} });
		assert.ok(!JSON.stringify(messages).includes('PRIVATE_INPUT_EXAMPLE'));
	}
});
