import { aktiviteter } from '../src/lib/innhold.js';
import { MISSIONS, evaluateProgram } from '../src/lib/reddChatten.js';
import { CASES, verifyCase } from '../src/lib/meldingsdetektiven.js';
import { LEVELS, planAttempt } from '../src/lib/chatSpill.js';

export const CONTENT_VERSION = 1;
export const catalog = aktiviteter.map((activity) => ({
	id: activity.id,
	title: activity.tittel,
	href: activity.href,
	subject: activity.fag,
	format: activity.format,
	objectives:
		activity.format === 'leksjon'
			? [{ id: 'review', title: 'Gjennomgått' }]
			: (activity.id === 'redd-chatten'
					? MISSIONS
					: activity.id === 'meldingsdetektiven'
						? CASES
						: LEVELS
				).map((item) => ({ id: item.id, title: item.title }))
}));

export const achievementDefinitions = [
	{ id: 'first-review', title: 'Første aha', description: 'Gjennomgå en leksjon.', symbol: '✦' },
	{
		id: 'first-solution',
		title: 'Første løsning',
		description: 'Bestå et spilloppdrag.',
		symbol: '✓'
	},
	{
		id: 'redd-chatten',
		title: 'Kode-redder',
		description: 'Bestå alle tre oppdragene i Redd chatten.',
		symbol: '{}'
	},
	{
		id: 'meldingsdetektiven',
		title: 'Meldingsdetektiv',
		description: 'Oppklar alle fire sakene.',
		symbol: '?'
	},
	{
		id: 'chat',
		title: 'Meldingen er framme',
		description: 'Løs alle tre oppdragene i To nettlesere, én chat.',
		symbol: '↔'
	},
	{
		id: 'both-subjects',
		title: 'Begge sider av IT',
		description: 'Fullfør en aktivitet i både utvikling og driftsstøtte.',
		symbol: 'IT'
	}
];

export function checkSubmission(body) {
	if (!body || typeof body !== 'object' || Array.isArray(body))
		throw new TypeError('Ugyldig innsending.');
	if (body.version !== CONTENT_VERSION) {
		const error = new Error('Oppgaven er oppdatert. Last siden på nytt og prøv igjen.');
		error.code = 'CONTENT_VERSION';
		throw error;
	}
	const activity = catalog.find((item) => item.id === body.activityId);
	if (!activity) throw new TypeError('Ukjent aktivitet.');
	if (!activity.objectives.some((item) => item.id === body.objectiveId))
		throw new TypeError('Ukjent deloppdrag.');
	if (activity.format === 'leksjon') {
		if (body.kind === 'start') return { activity, passed: false, solution: null };
		if (body.kind !== 'review' || body.confirmed !== true)
			throw new TypeError('Bekreft at du har gjennomgått leksjonen.');
		return { activity, passed: true, solution: null };
	}
	if (body.kind !== 'attempt') throw new TypeError('Et spill må kontrolleres med en løsning.');
	const solution = body.solution;
	if (activity.id === 'meldingsdetektiven') {
		if (
			!solution ||
			typeof solution !== 'object' ||
			Array.isArray(solution) ||
			Object.values(solution).some((value) => typeof value !== 'string' || value.length > 80)
		)
			throw new TypeError('Ugyldige kodevalg.');
		return { activity, passed: verifyCase(body.objectiveId, solution).success, solution };
	}
	if (
		!Array.isArray(solution) ||
		solution.length > 20 ||
		solution.some((value) => typeof value !== 'string' || value.length > 80)
	)
		throw new TypeError('Ugyldig løsning.');
	return {
		activity,
		passed:
			activity.id === 'redd-chatten'
				? evaluateProgram(body.objectiveId, solution).success
				: planAttempt(body.objectiveId, solution).result.success,
		solution
	};
}
