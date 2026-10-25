import { checkpoints } from '../src/lib/checkpoints.js';

// Only this server-side module knows the correct choice. New variants need new IDs.
const answers = {
	'frontend-backend:check-v1': 'fetch',
	'chatrom:check-v1': 'room',
	'fillagring:check-v1': 'memory',
	'sessions:check-v1': 'session',
	'oving-5:check-v1': 'keep',
	'oving-6:check-v1': 'missing',
	'oving-7:check-v1': 'parser',
	'oving-8:check-v1': 'guest',
	'oving-9:check-v1': 'owner',
	'oving-10:check-v1': 'build'
};

for (const question of checkpoints) {
	const key = `${question.activityId}:${question.id}`;
	if (!question.choices.some((choice) => choice.id === answers[key]))
		throw new Error(`Fagsjekken ${key} mangler et gyldig serversvar.`);
}

export function validateCheckpoint(activityId, objectiveId, solution) {
	const question = checkpoints.find(
		(item) => item.activityId === activityId && item.id === objectiveId
	);
	if (
		!question ||
		!solution ||
		Array.isArray(solution) ||
		Object.keys(solution).length !== 1 ||
		!question.choices.some((item) => item.id === solution.choice)
	)
		throw new TypeError('Velg ett av svaralternativene i fagsjekken.');
	return solution.choice === answers[`${activityId}:${objectiveId}`];
}
