import test from 'node:test';
import assert from 'node:assert/strict';
import { backendContinuation } from '../src/lib/backendCourse.js';
import { moduler, moduleContents, moduleProgress, moduleAliases } from '../src/lib/moduler.js';
import { recommendNextActivity } from '../src/lib/moduleRecommendation.js';
import { lessons, taskStartValues } from '../src/lib/ovingene.js';
import { buildTrace } from '../src/lib/ovingModel.js';
import { teachingPlans, validateTeachingPlans } from '../src/lib/teaching.js';
import { teachingGuides, validateTeachingGuides } from '../server/teaching.js';
import { lessonChoices, readPartnerState } from '../src/lib/partnerContext.js';
import { buildPartnerMessages } from '../server/lab-partner/context.js';
import { makeRun } from '../src/lib/frontendBackendLab.js';
import { createState, planRun, advance } from '../src/lib/fillagring.js';
import { planAttempt } from '../src/lib/chatSpill.js';
import { initialSettings, verifyCase } from '../src/lib/meldingsdetektiven.js';

const backend = moduler.find((module) => module.id === 'backend');
const contents = moduleContents(backend);
const url = (href) => new URL(href, 'https://it-laben.invalid');

test('videre-lenker følger hele Backend-forløpet og bevarer gamle delankre', () => {
	const expected = [
		['frontend-backend', '/spill/chat/'], ['chat', '/fillagring/'],
		['fillagring', '/oving-5/'], ['oving-5', '/oving-6/'], ['oving-6', '/oving-7/'],
		['sessions', '/oving-8/'], ['oving-8', '/oving-9/'], ['oving-9', '/chatrom/'],
		['chatrom', '/spill/redd-chatten/'], ['redd-chatten', '/spill/meldingsdetektiven/'],
		['meldingsdetektiven', '/oving-10/'], ['oving-10', '/aktiviteter/backend-oppsummering/']
	];
	for (const [id, path] of expected) {
		const links = backendContinuation(id);
		assert.equal(url(links.next.href).pathname, path, id);
		assert.equal(url(links.next.href).searchParams.get('modul'), 'backend');
		assert.equal(links.backHref, `/moduler/backend/#del-${contents.findIndex((step) => step.id === id) + 1}`);
	}
	assert.equal(backendContinuation('frontend-backend').previous, null);
	assert.equal(backendContinuation('backend-oppsummering').next, null);
	assert.equal(backendContinuation('nattvakt'), null);
	assert.equal(backendContinuation('database-finn'), null);
	assert.deepEqual(Object.values(moduleAliases).map((alias) => alias.start), [1, 4, 9, 16]);
});

test('validering går via tekstreparasjon og egen kode før sessions, uten lenkesløyfe', () => {
	const repair = url(backendContinuation('oving-7').next.href);
	assert.equal(repair.pathname, '/spill/redd-chatten/');
	assert.equal(repair.searchParams.get('oppdrag'), 'tekst');
	assert.equal(repair.searchParams.get('forlop'), 'validering');
	const project = url(backendContinuation('redd-chatten', true).next.href);
	assert.equal(project.pathname, '/oving-7/');
	assert.equal(project.hash, '#eget-prosjekt');
	assert.equal(url(backendContinuation('oving-7', false, true).next.href).pathname, '/sessions/');
	assert.equal(url(backendContinuation('redd-chatten').next.href).pathname, '/spill/meldingsdetektiven/');
});

test('valgfri Nattevakt påvirker verken modulteller eller forslag til nødvendig arbeid', () => {
	const progress = contents.filter((step) => step.kind !== 'undervisning').map((step) => ({
		id: step.id, title: step.title, href: step.href, subject: step.subject ?? backend.subject,
		status: step.optional ? 'started' : 'passed',
		objectives: [{ id: 'test', kind: 'attempt', required: true, completedAt: step.optional ? null : 1, updatedAt: 2 }]
	}));
	const before = structuredClone(progress);
	assert.deepEqual(moduleProgress(backend, progress), { completed: 13, total: 13, started: true });
	assert.equal(recommendNextActivity(progress, [{ ...backend, steps: contents }], [{ id: 'backend', status: 'active' }]), null);
	assert.deepEqual(progress, before);
});

test('alle oppgavestarter er gyldige valg, kan kjøres og bevarer metadata og labpartnerkontrakt', () => {
	const before = structuredClone(lessons);
	for (const lesson of lessons) for (let task = 0; task < lesson.tasks.length; task++) {
		const values = taskStartValues(lesson, task);
		assert.deepEqual(Object.keys(values).sort(), lesson.fields.map((field) => field.key).sort());
		for (const field of lesson.fields) if (field.kind === 'select')
			assert.ok(field.choices.some((choice) => choice.value === values[field.key]), `${lesson.number}: ${field.key}`);
		const trace = buildTrace(lesson.number, values);
		assert.ok(trace.length > 1);
		const state = { version: 1, values: { choices: lessonChoices(lesson, values), step: trace.length - 1, line: -1, task } };
		assert.doesNotThrow(() => readPartnerState(`oving-${lesson.number}`, state));
		const messages = buildPartnerMessages({ question: 'Hva bør jeg undersøke videre?', history: [], snapshot: {
			version: 2, activityId: 'page-help', pageId: `oving-${lesson.number}`, moduleId: 'backend',
			state, running: false, events: []
		} });
		assert.ok(messages.length >= 2); // Also exercises the server's 22 KB context bound.
		assert.ok(!JSON.stringify(messages).includes('preparation'));
		values[lesson.fields[0].key] = 'changed locally';
	}
	assert.deepEqual(lessons, before);
	assert.throws(() => taskStartValues(lessons[0], -1), RangeError);
});

test('første forsøk undersøker oppgaven eleven faktisk ser', () => {
	const run = (number) => buildTrace(number, taskStartValues(lessons.find((lesson) => lesson.number === number)));
	const patch = run(6);
	assert.equal(patch.at(-1).data['Minne · meldinger'][0].tekst, patch[0].data['Minne · meldinger'][0].tekst);
	assert.notEqual(patch.at(-1).data['Minne · meldinger'][1].tekst, patch[0].data['Minne · meldinger'][1].tekst);
	assert.equal(taskStartValues(lessons.find((lesson) => lesson.number === 7)).scenario, 'empty');
	assert.match(run(7).at(-1).status, /400/);
	const guest = taskStartValues(lessons.find((lesson) => lesson.number === 9));
	assert.equal(guest.actor, 'guest');
	assert.match(run(9).at(-1).status, /200/); // Public reading; writing requires login.
	assert.match(buildTrace(9, { ...guest, method: 'POST' }).at(-1).status, /401/);
	assert.equal(taskStartValues(lessons.find((lesson) => lesson.number === 10)).scenario, 'source');
});

test('læreropplegg dekker de veiledede øvingene i modulrekkefølge og har private veiledninger', () => {
	validateTeachingPlans();
	validateTeachingGuides();
	const plans = backend.teachingPlanIds.map((id) => teachingPlans.find((plan) => plan.id === id));
	assert.deepEqual(plans.flatMap((plan) => plan.lessonIds), contents.filter((step) => step.kind === 'oving').map((step) => step.id));
	assert.equal(teachingGuides.length, plans.length);
	for (const plan of plans) {
		assert.ok(!('notes' in plan) && !('preparation' in plan));
		assert.ok(teachingGuides.find((guide) => guide.planId === plan.id).wrapUp.length);
	}
});

test('dataflyten skiller sending fra henting og avviser feil kontrakt uten å endre data', () => {
	const message = { avsender: 'Ada', tekst: 'Hei' };
	const sent = makeRun('post', message, [], []).at(-1);
	assert.equal(sent.httpStatus, 201);
	assert.deepEqual(sent.serverMessages, [message]);
	assert.deepEqual(sent.clientMessages, []);
	const fetched = makeRun('get', message, sent.serverMessages, []).at(-1);
	assert.deepEqual(fetched.clientMessages, [message]);
	const rejected = makeRun('post', message, sent.serverMessages, [], true).at(-1);
	assert.equal(rejected.httpStatus, 400);
	assert.deepEqual(rejected.serverMessages, [message]);
});

test('fillagringsinnføringen viser forskjellen ved omstart med og uten lagring', () => {
	function run(state, action, saveEnabled = true) {
		for (const step of planRun(state, action, { saveEnabled, message: { avsender: 'Ada', tekst: 'Hei' } })) {
			const result = advance(state, step);
			assert.equal(result.failed, false);
			state = result.state;
		}
		return state;
	}
	for (const save of [true, false]) {
		const sent = run(run(createState(), 'start'), 'post', save);
		assert.equal(sent.messages.length, 1);
		assert.equal(run(sent, 'restart').messages.length, save ? 1 : 0);
	}
});

test('oppdragene krever fungerende dataflyt og lar feil repareres på nytt', () => {
	for (const [id, actions] of Object.entries({ lever: ['ada-post', 'noah-get-generelt'], oppdater: ['noah-get-generelt'], rom: ['noah-get-gaming'] })) {
		assert.equal(planAttempt(id, []).result.success, false);
		assert.equal(planAttempt(id, actions).result.success, true);
	}
	const repairs = {
		kontrakt: { textKey: 'tekst', validation: 'behold' },
		visning: { roomFilter: 'selected', assign: 'replace' },
		session: { postCredentials: 'include', readCredentials: 'include', identity: 'session' },
		dobbel: { eventHandling: 'form', merge: 'replace' }
	};
	for (const [id, repair] of Object.entries(repairs)) {
		assert.equal(verifyCase(id, initialSettings(id)).success, false);
		assert.equal(verifyCase(id, repair).success, true);
	}
});
