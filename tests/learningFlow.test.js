import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendNextActivity } from '../src/lib/moduleRecommendation.js';
import { attemptStorageStatus } from '../src/lib/attemptStorageStatus.js';
import { buildTrace, validationFeedback } from '../src/lib/ovingModel.js';
import { evaluateCase, evaluateProgram, initialProgram } from '../src/lib/reddChatten.js';
import { validationFollowUp } from '../src/lib/backendValidation.js';

const objective = (id = 'review', options = {}) => ({
	id, title: id, kind: 'review', evidence: 'reviewed', required: true, points: 15,
	completedAt: null, updatedAt: null, solution: null, ...options
});
const activity = (id, options = {}) => ({
	id, title: id, href: `/${id}/`, subject: 'utvikling', format: 'leksjon',
	completionEvidence: 'reviewed', status: 'new', completed: 0, total: 1,
	checksCompleted: 0, checksTotal: 0, creditEligible: false, pendingXp: 0,
	objectives: [objective()], ...options
});
const module = (id, steps, subject = 'utvikling') => ({
	id, title: id, subject,
	steps: steps.map((step) => typeof step === 'string'
		? { id: step, kind: 'oving', href: `/${step}/`, description: `Arbeid med ${step}.` }
		: { kind: 'oving', href: `/${step.id}/`, description: `Arbeid med ${step.id}.`, ...step })
});
const publication = (id, status = 'active') => ({ id, status, revision: 1, updatedAt: 1 });

test('neste steg følger aktiv modul og undervisningsrekkefølge uten å endre progresjon', () => {
	const progress = [activity('gammel'), activity('andre'), activity('forste')];
	const modules = [module('ferdig', ['gammel']), module('aktiv', ['forste', 'andre'])];
	const before = structuredClone({ progress, modules });
	const result = recommendNextActivity(progress, modules, [publication('ferdig', 'completed'), publication('aktiv')]);
	assert.equal(result.id, 'forste:review');
	assert.equal(result.href, '/forste/?modul=aktiv');
	assert.match(result.reason, /Aktiv modul/);
	assert.equal(result.action, 'Åpne oppgaven');
	assert.deepEqual({ progress, modules }, before);
});

test('påbegynt arbeid i aktiv modul kommer før gamle fagsjekker og tidligere moduler', () => {
	const check = objective('check-v2', { kind: 'check', required: false, evidence: 'checked', assessment: { canStart: true } });
	const progress = [
		activity('gammel', { status: 'started', objectives: [objective('review', { updatedAt: 900 })] }),
		activity('forste', { status: 'reviewed', objectives: [objective('review', { completedAt: 1 }), check] }),
		activity('andre', { status: 'started', objectives: [objective('review', { updatedAt: 20 })] })
	];
	const result = recommendNextActivity(progress, [module('ferdig', ['gammel']), module('aktiv', ['forste', 'andre'])],
		[publication('ferdig', 'completed'), publication('aktiv')]);
	assert.equal(result.id, 'andre:review');
	assert.equal(result.action, 'Fortsett aktiviteten');
});

test('kommende og manglende modulstatus gir ingen anbefaling, ferdig merkes som repetisjon', () => {
	const progress = [activity('oppgave')], modules = [module('backend', ['oppgave'])];
	assert.equal(recommendNextActivity(progress, modules, []), null);
	assert.equal(recommendNextActivity(progress, modules, [publication('backend', 'upcoming')]), null);
	assert.match(recommendNextActivity(progress, modules, [publication('backend', 'completed')]).reason, /Repetisjon/);
});

test('driftsøving i Backend beholder eget fag og følger Backend sin status', () => {
	const progress = [activity('utvikling'), activity('drift', { subject: 'drift' })];
	const modules = [module('backend', ['utvikling', { id: 'drift', subject: 'drift' }])];
	assert.equal(recommendNextActivity(progress, modules, [publication('backend')], 'drift').id, 'drift:review');
	assert.equal(recommendNextActivity(progress, modules, [publication('backend', 'upcoming')], 'drift'), null);
});

test('ukjent lokal fremgang gir moduloversikt og ingen påstått fortsettelse', () => {
	const result = recommendNextActivity([], [module('database', ['lokal-oving'])], [publication('database')]);
	assert.equal(result.href, '/moduler/database/#forlop');
	assert.equal(result.action, 'Velg en del i modulen');
	assert.match(result.reason, /kan ikke bestemmes/);
});

test('validering foreslår bare tekstreparasjonen på det tidlige steget', () => {
	const progress = [activity('oving-7', { status: 'reviewed', objectives: [objective('review', { completedAt: 1 })] }),
		activity('sessions'), activity('redd-chatten', { objectives: [
			objective('tekst', { kind: 'attempt', evidence: 'passed' }),
			objective('avsender', { kind: 'attempt', evidence: 'passed' })
		] })];
	const modules = [module('backend', [{ id: 'oving-7', followUp: { activityId: 'redd-chatten', objectiveId: 'tekst', instruction: 'Reparer teksten.' } }, 'sessions', 'redd-chatten'])];
	assert.equal(recommendNextActivity(progress, modules, [publication('backend')]).href,
		'/redd-chatten/?modul=backend&oppdrag=tekst');
	progress[2].objectives[0].completedAt = 2;
	progress[2].objectives[0].updatedAt = 2;
	progress[2].status = 'started';
	assert.equal(recommendNextActivity(progress, modules, [publication('backend')]).id, 'sessions:review');
});

test('fagsjekk anbefales bare når tilgjengelig, og sperret oppgave hoppes ikke over innad i et spill', () => {
	const check = objective('check-v2', { kind: 'check', required: false, evidence: 'checked', assessment: { canStart: false } });
	const progress = [activity('oving', { objectives: [objective('review', { completedAt: 1 }), check] })];
	const modules = [module('backend', ['oving'])], records = [publication('backend')];
	assert.equal(recommendNextActivity(progress, modules, records), null);
	check.assessment.canStart = true;
	assert.equal(recommendNextActivity(progress, modules, records).href, '/oving/?modul=backend#fagsjekk-check-v2');
	assert.equal(recommendNextActivity(progress, [module('backend', ['oving', 'repetisjon'])], records).id, 'oving:check-v2');
	check.available = false;
	assert.equal(recommendNextActivity(progress, modules, records), null);
	progress[0].objectives = [objective('forste', { kind: 'attempt', available: false }), objective('andre', { kind: 'attempt' })];
	assert.equal(recommendNextActivity(progress, modules, records), null);
});

test('overgangen til reparasjon bevarer valgt forløp og eksisterende oppdrags-ID', () => {
	const progress = [activity('oving-7', { objectives: [objective('review', { completedAt: 1 })] }),
		activity('redd-chatten', { href: '/spill/redd-chatten/', objectives: [objective('tekst', { kind: 'attempt' })] })];
	const result = recommendNextActivity(progress, [module('backend', [{ id: 'oving-7', followUp: validationFollowUp }])], [publication('backend')]);
	const url = new URL(result.href, 'https://it-laben.invalid');
	assert.equal(url.pathname, '/spill/redd-chatten/');
	assert.equal(url.searchParams.get('oppdrag'), 'tekst');
	assert.equal(url.searchParams.get('forlop'), 'validering');
	assert.equal(url.searchParams.get('modul'), 'backend');
});

test('lagringsstatus krever bekreftet identisk kode og skiller kø, feil og gjest', () => {
	const state = { signedIn: true, loaded: true, pending: false, error: false, storageWarning: false,
		program: ['normalize-text', 'guard-text'], savedSolution: ['normalize-text', 'guard-text'] };
	assert.equal(attemptStorageStatus(state).label, 'Denne koden er lagret på kontoen');
	assert.match(attemptStorageStatus({ ...state, program: ['guard-text'] }).label, /ikke bekreftet/);
	assert.match(attemptStorageStatus({ ...state, pending: true }).label, /Lagrer/);
	assert.match(attemptStorageStatus({ ...state, pending: true, storageWarning: true }).detail, /Hold fanen åpen/);
	assert.equal(attemptStorageStatus({ ...state, error: true }).label, 'Lagring er ikke bekreftet');
	assert.equal(attemptStorageStatus({ ...state, loaded: false }).label, 'Lagring er ikke bekreftet');
	assert.equal(attemptStorageStatus({ ...state, signedIn: false }).label, 'Bare i denne fanen');
});

test('valideringsrespons samsvarer med data ved normal sending, tom tekst og mellomrom', () => {
	for (const scenario of ['blank', 'empty']) {
		const trace = buildTrace(7, { scenario, body: '' });
		assert.deepEqual(trace.at(-1).data['Minne · meldinger'], trace[0].data['Minne · meldinger']);
		assert.match(validationFeedback(trace).result, /400/);
		assert.match(validationFeedback(trace).cause, /0 etterpå/);
	}
	const valid = buildTrace(7, { scenario: 'custom', body: '{"avsender":"Ada","tekst":"Hei!"}' });
	assert.match(validationFeedback(valid).result, /201/);
	assert.equal(valid.at(-1).data['Minne · meldinger'].length, valid[0].data['Minne · meldinger'].length + 1);
	for (const scenario of ['number', '501', 'malformed', 'large', 'disk', 'route', 'offline']) {
		const trace = buildTrace(7, { scenario, body: '' });
		assert.deepEqual(trace.at(-1).data['Minne · meldinger'], trace[0].data['Minne · meldinger']);
		assert.ok(validationFeedback(trace).next);
	}
	assert.equal(validationFeedback([]), null);
});

test('tilbakemelding om feil lagring gir neste undersøkelse uten å endre godkjenningsreglene', () => {
	const failed = evaluateCase('tekst', initialProgram('tekst'), 'mellomrom');
	assert.equal(failed.passed, false);
	assert.match(failed.feedback, /Undersøk tekstverdien/);
	const repaired = evaluateProgram('tekst', ['normalize-text', 'guard-text', 'save-body', 'reply-created']);
	assert.equal(repaired.success, true);
	assert.ok(repaired.results.every((result) => result.passed));
});
