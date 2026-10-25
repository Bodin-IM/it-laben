import { randomInt, randomUUID, randomBytes } from 'node:crypto';
import { checkpoints } from '../src/lib/checkpoints.js';
import { assessmentPolicy } from '../src/lib/assessmentPolicy.js';
import { assessmentBanks } from './assessment-bank.js';

for (const definition of checkpoints) {
	const bank = assessmentBanks[definition.activityId];
	if (
		!bank ||
		bank.questions.length <= assessmentPolicy.questionsPerAttempt ||
		new Set(bank.questions.map((item) => item.id)).size !== bank.questions.length ||
		bank.questions.some(
			(item) =>
				item.choices.length < 3 || item.choices.filter((choice) => choice.correct).length !== 1
		)
	)
		throw new Error(
			`Fagsjekken ${definition.activityId}:${definition.id} trenger en gyldig og variert spørsmålsbank.`
		);
}

function shuffle(items) {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

export function publicResult(row) {
	if (!row) return null;
	const questions = JSON.parse(row.questions_json);
	const answers = JSON.parse(row.answers_json);
	return {
		id: row.id,
		submittedAt: row.submitted_at,
		score: row.score,
		total: questions.length,
		passed: row.passed === 1,
		questions: questions.map((item) => ({
			prompt: item.prompt,
			selectedLabel: item.choices.find((choice) => choice.id === answers[item.id]).label,
			correctLabel: item.choices.find((choice) => choice.id === item.correctChoiceId).label,
			explanation: item.explanation,
			correct: answers[item.id] === item.correctChoiceId
		}))
	};
}

export function pendingDto(row) {
	return {
		id: row.id,
		number: row.sequence,
		questions: JSON.parse(row.questions_json).map((item) => ({
			id: item.id,
			prompt: item.prompt,
			choices: item.choices
		}))
	};
}

export function issueCheckpointQuestions(activityId, previousQuestions = []) {
	const bank = assessmentBanks[activityId];
	if (!bank) throw new Error('Spørsmålsbanken mangler.');
	const pool = shuffle(bank.questions);
	const selected = pool.slice(0, assessmentPolicy.questionsPerAttempt);
	const priorIds = new Set(previousQuestions.map((item) => item.sourceId));
	if (selected.every((item) => priorIds.has(item.id)) && pool.length > selected.length)
		selected[randomInt(selected.length)] = pool[selected.length];
	const questions = selected.map((item) => {
		let choices = shuffle(item.choices);
		const prior = previousQuestions.find((question) => question.sourceId === item.id);
		if (
			prior &&
			choices.findIndex((choice) => choice.correct) ===
				prior.choices.findIndex((choice) => choice.id === prior.correctChoiceId)
		)
			choices = [...choices.slice(1), choices[0]];
		const issued = choices.map((choice) => ({
			id: randomBytes(12).toString('hex'),
			label: choice.label,
			correct: choice.correct
		}));
		return {
			id: randomUUID(),
			sourceId: item.id,
			prompt: item.prompt,
			explanation: item.explanation,
			correctChoiceId: issued.find((choice) => choice.correct).id,
			choices: issued.map(({ id, label }) => ({ id, label }))
		};
	});
	return questions;
}

export function canonicalAnswers(questions, answers) {
	if (
		!answers ||
		typeof answers !== 'object' ||
		Array.isArray(answers) ||
		Object.keys(answers).length !== questions.length ||
		questions.some(
			(item) =>
				!Object.hasOwn(answers, item.id) ||
				!item.choices.some((choice) => choice.id === answers[item.id])
		)
	)
		throw new TypeError('Velg ett svar på hvert spørsmål før du leverer.');
	const canonical = JSON.stringify(
		Object.fromEntries(Object.entries(answers).sort(([a], [b]) => a.localeCompare(b)))
	);
	return canonical;
}
