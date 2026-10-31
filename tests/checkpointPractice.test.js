import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { assessmentBanks } from '../server/assessment-bank.js';
import { checkpointPractice } from '../server/checkpoint-practice.js';
import { issueCheckpointQuestions, pendingDto, publicResult } from '../server/checkpoint-questions.js';
import { openDatabase } from '../server/database.js';
import { catalog, CONTENT_VERSION } from '../server/catalog.js';
import { openCheckpoint, gradeCheckpoint, checkpointState } from '../server/checkpoints.js';
import { openPracticeCheckpoint, submitPractice, learningActivity } from '../server/practice.js';
import { moduleLink } from '../src/lib/moduleNavigation.js';

test('alle 39 Backend-varianter gir en konkret øvelse med en eksisterende side og et observasjonsspørsmål', () => {
	let count = 0;
	for (const [activityId, bank] of Object.entries(assessmentBanks)) for (const question of bank.questions) {
		const practice = checkpointPractice(activityId, question.id);
		assert.ok(practice?.title && practice.instruction && practice.lookFor, `${activityId}:${question.id}`);
		const url = new URL(moduleLink(practice.href, 'backend'), 'https://it-laben.invalid');
		assert.equal(url.origin, 'https://it-laben.invalid');
		assert.equal(url.searchParams.get('modul'), 'backend');
		assert.ok(existsSync(new URL(`../src/routes${url.pathname}+page.svelte`, import.meta.url)));
		if (url.hash) assert.ok(readFileSync(new URL('../src/lib/components/ExerciseLab.svelte', import.meta.url), 'utf8').includes(`id="${url.hash.slice(1)}"`));
		count++;
	}
	assert.equal(count, 39);
	assert.equal(checkpointPractice('unknown', 'original'), null);
	assert.equal(checkpointPractice('oving-5', 'unknown'), null);
	assert.equal(checkpointPractice('__proto__', 'constructor'), null);
	assert.notEqual(checkpointPractice('oving-5', 'broken-json').instruction, checkpointPractice('oving-5', 'order').instruction);
});

test('åpne fagsjekker deler ikke hjelpekoblinger, kilde-ID, fasit eller forklaringer', () => {
	const questions = issueCheckpointQuestions('oving-7');
	const row = { id: 'pending', activity_id: 'oving-7', sequence: 1,
		questions_json: JSON.stringify(questions), submitted_at: null };
	assert.equal(publicResult(row), null);
	for (const question of pendingDto(row).questions)
		assert.deepEqual(Object.keys(question).sort(), ['choices', 'id', 'prompt']);
	const answers = Object.fromEntries(questions.map((q, i) => [q.id,
		i === 0 ? q.correctChoiceId : q.choices.find((c) => c.id !== q.correctChoiceId).id]));
	const completed = { ...row, submitted_at: 100, answers_json: JSON.stringify(answers), score: 1, passed: 0 };
	const original = structuredClone(completed);
	const result = publicResult(completed);
	assert.equal(result.questions[0].practice, undefined);
	assert.ok(result.questions[1].practice);
	assert.equal(result.questions[1].sourceId, undefined);
	assert.deepEqual(completed, original);
	assert.deepEqual([result.score, result.total, result.passed], [1, 2, false]);
	questions[1].sourceId = 'retired-question';
	assert.equal(publicResult({ ...completed, questions_json: JSON.stringify(questions) }).questions[1].practice, null);
});

function fixture(t) {
	const db = openDatabase(':memory:');
	t.after(() => db.close());
	db.prepare('INSERT INTO users(id,nickname,created_at) VALUES (?,?,?)').run('learner', 'Eksempel', 1);
	return db;
}
const wrongAnswers = (questions) => Object.fromEntries(questions.map((q) => [q.id, q.choices.find((c) => c.id !== q.correctChoiceId).id]));

test('ordinært resultat får øvelser også ved ny henting, uten å endre døgnsgrense, poeng eller forsøk', (t) => {
	const db = fixture(t), activity = catalog.find((item) => item.id === 'oving-5');
	db.prepare('INSERT INTO progress VALUES (?,?,?,?,?,?)').run('learner', activity.id, 'review', 1, 1, null);
	const opened = openCheckpoint(db, 'learner', activity, 'check-v2', 1000);
	const stored = db.prepare('SELECT * FROM checkpoint_attempts WHERE id=?').get(opened.assessment.id);
	const answers = wrongAnswers(JSON.parse(stored.questions_json));
	const graded = gradeCheckpoint(db, 'learner', activity, 'check-v2', stored.id, answers, 2000);
	assert.equal(graded.passed, false);
	assert.ok(graded.result.questions.every((q) => q.practice?.href.startsWith('/oving-5/')));
	const state = checkpointState(db, 'learner', activity, 'check-v2', 3000);
	assert.equal(state.canStart, false);
	assert.equal(state.nextAttemptAt, 2000 + 86400000);
	assert.deepEqual(state.lastResult, graded.result);
	assert.throws(() => openCheckpoint(db, 'learner', activity, 'check-v2', 3000), { code: 'CHECKPOINT_COOLDOWN' });
	assert.equal(db.prepare('SELECT count(*) AS n FROM checkpoint_attempts').get().n, 1);
	assert.equal(db.prepare('SELECT count(*) AS n FROM rewards').get().n, 0);
});

test('øvingsmodus beriker også eldre resultater uten å skrive om lagret historie eller gi XP', (t) => {
	const db = fixture(t);
	db.prepare('INSERT INTO user_roles VALUES (?,?,?)').run('learner', 'teacher', 1);
	const opened = openPracticeCheckpoint(db, 'learner', 'oving-8', { objectiveId: 'check-v2' }, 1000);
	const row = db.prepare('SELECT * FROM practice_runs WHERE id=?').get(opened.assessment.id);
	const body = { eventId: randomUUID(), version: CONTENT_VERSION, activityId: 'oving-8',
		objectiveId: 'check-v2', kind: 'check', attemptId: row.id, solution: wrongAnswers(JSON.parse(row.snapshot_json)) };
	const result = submitPractice(db, 'learner', 'oving-8', body, 2000);
	assert.ok(result.assessmentResult.questions.every((q) => q.practice));
	const legacy = structuredClone(result.assessmentResult);
	for (const q of legacy.questions) delete q.practice;
	db.prepare('UPDATE practice_runs SET result_json=? WHERE id=?').run(JSON.stringify(legacy), row.id);
	const state = learningActivity(db, 'learner', 'oving-8', 3000).objectives.find((q) => q.id === 'check-v2').assessment;
	assert.ok(state.lastResult.questions.every((q) => q.practice));
	assert.equal(state.nextAttemptAt, null);
	assert.equal(state.canStart, true);
	assert.equal(db.prepare('SELECT result_json FROM practice_runs WHERE id=?').get(row.id).result_json, JSON.stringify(legacy));
	const retry = submitPractice(db, 'learner', 'oving-8', { ...body, eventId: randomUUID() }, 4000);
	assert.ok(retry.assessmentResult.questions.every((q) => q.practice));
	assert.equal(db.prepare('SELECT count(*) AS n FROM rewards').get().n, 0);
	assert.equal(db.prepare('SELECT count(*) AS n FROM checkpoint_attempts').get().n, 0);
});
