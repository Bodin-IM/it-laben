import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
	backendQuestions as questions,
	backendTopics as topics,
	answerQuestion,
	revealQuestion,
	isResolved,
	quizSummary
} from '../src/lib/backendQuiz.js';
import { altElevinnhold, aktiviteter, repetisjonsaktiviteter } from '../src/lib/innhold.js';
import { catalog } from '../server/catalog.js';

test('alle ti øvinger har to spørsmål med fire ulike alternativer og ett gyldig fasitsvar', () => {
	assert.equal(questions.length, 20);
	assert.equal(new Set(questions.map((q) => q.id)).size, 20);
	for (const topic of topics) {
		assert.equal(questions.filter((q) => q.exercise === topic.number).length, 2);
		assert.ok(existsSync(new URL(`../src/routes${topic.href}+page.svelte`, import.meta.url)));
	}
	const positions = [0, 0, 0, 0];
	for (const q of questions) {
		assert.equal(q.choices.length, 4);
		assert.equal(new Set(q.choices.map((c) => c.text)).size, 4);
		assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
		assert.ok(q.hint && q.pages && q.choices.every((c) => c.feedback));
		positions[q.correct]++;
	}
	assert.deepEqual(positions, [5, 5, 5, 5]);
});

test('nytt forsøk endrer ikke førstesvaret, og dobbel innsending telles ikke', () => {
	const q = questions[0];
	const wrong = (q.correct + 1) % 4;
	const first = answerQuestion({}, q.id, wrong);
	assert.equal(isResolved(q, first[q.id]), false);
	assert.strictEqual(answerQuestion(first, q.id, wrong), first);
	const corrected = answerQuestion(first, q.id, q.correct);
	assert.deepEqual(first[q.id].attempts, [wrong]);
	assert.deepEqual(corrected[q.id].attempts, [wrong, q.correct]);
	assert.deepEqual(quizSummary(corrected, [q]), {
		first: 0,
		improved: 1,
		revealed: 0,
		remaining: 0
	});
	assert.equal(isResolved(q, corrected[q.id]), true);
	assert.strictEqual(answerQuestion(corrected, q.id, wrong), corrected);
	assert.strictEqual(revealQuestion(corrected, q.id), corrected);
});

test('vist fasit regnes som gjennomgått, men aldri som riktig førstesvar eller rettet svar', () => {
	const [q1, q2] = questions;
	let state = revealQuestion({}, q1.id);
	state = answerQuestion(state, q2.id, (q2.correct + 1) % 4);
	state = revealQuestion(state, q2.id);
	assert.deepEqual(quizSummary(state, [q1, q2]), {
		first: 0,
		improved: 0,
		revealed: 2,
		remaining: 0
	});
	assert.strictEqual(answerQuestion(state, q1.id, q1.correct), state);
	assert.strictEqual(revealQuestion(state, q1.id), state);
	assert.equal(isResolved(q1, state[q1.id]), true);
});

test('oppsummeringen skiller ubesvarte og uløste spørsmål fra rette svar og vist forklaring', () => {
	let state = {};
	state = answerQuestion(state, questions[0].id, questions[0].correct);
	state = answerQuestion(state, questions[1].id, 0);
	assert.deepEqual(quizSummary(state), { first: 1, improved: 0, revealed: 0, remaining: 19 });
	assert.strictEqual(answerQuestion(state, 'ukjent', 0), state);
	assert.strictEqual(revealQuestion(state, 'ukjent'), state);
	for (const invalid of [-1, 4, NaN, 0.5])
		assert.strictEqual(answerQuestion(state, questions[2].id, invalid), state);
	assert.deepEqual(quizSummary({}), { first: 0, improved: 0, revealed: 0, remaining: 20 });
});

test('repetisjonen er synlig i elevinnholdet uten å opprette XP- eller vurderingsaktivitet', () => {
	const activity = repetisjonsaktiviteter.find((item) => item.id === 'backend-oppsummering');
	assert.ok(activity);
	assert.ok(altElevinnhold.includes(activity));
	assert.equal(activity.format, 'aktivitet');
	assert.ok(existsSync(new URL(`../src/routes${activity.href}+page.svelte`, import.meta.url)));
	assert.ok(!catalog.some((item) => item.id === activity.id));
	assert.equal(catalog.length, aktiviteter.length);
	assert.equal(new Set(altElevinnhold.map((item) => item.id)).size, altElevinnhold.length);
	assert.equal(new Set(altElevinnhold.map((item) => item.href)).size, altElevinnhold.length);
});
