import { aktiviteter, fag } from '../src/lib/innhold.js';
import { checkpoints } from '../src/lib/checkpoints.js';
import { rewardPolicy, achievementDefinitions, trackDefinitions } from '../src/lib/progression.js';
import { MISSIONS, evaluateProgram } from '../src/lib/reddChatten.js';
import { CASES, verifyCase } from '../src/lib/meldingsdetektiven.js';
import { LEVELS, planAttempt } from '../src/lib/chatSpill.js';
import { gradeCheckpoint } from './checkpoints.js';

// Version 2 requires a server-issued assessment before checkpoint submission.
export const CONTENT_VERSION = 2;
export { achievementDefinitions, trackDefinitions, rewardPolicy };

function orderedChoices(solution) {
	if (
		!Array.isArray(solution) ||
		solution.length > 20 ||
		solution.some((value) => typeof value !== 'string' || value.length > 80)
	)
		throw new TypeError('Ugyldig løsning.');
}

/** Explicit adapters: an unknown game can never fall back to another game's validator. */
export const challengeAdapters = {
	'redd-chatten': {
		objectives: MISSIONS,
		validate(id, solution) {
			orderedChoices(solution);
			return evaluateProgram(id, solution).success;
		}
	},
	meldingsdetektiven: {
		objectives: CASES,
		validate(id, solution) {
			if (
				!solution ||
				typeof solution !== 'object' ||
				Array.isArray(solution) ||
				Object.values(solution).some((value) => typeof value !== 'string' || value.length > 80)
			)
				throw new TypeError('Ugyldige kodevalg.');
			return verifyCase(id, solution).success;
		}
	},
	chat: {
		objectives: LEVELS,
		validate(id, solution) {
			orderedChoices(solution);
			return planAttempt(id, solution).result.success;
		}
	}
};

export function validateChallenge(adapter, objectiveId, solution) {
	const result = adapter.validate(objectiveId, solution);
	if (typeof result !== 'boolean')
		throw new Error('En oppdragsvalidator må returnere true eller false synkront.');
	return result;
}

export function buildCatalog(
	activities = aktiviteter,
	adapters = challengeAdapters,
	questions = checkpoints
) {
	const ids = new Set();
	const result = activities.map((activity) => {
		if (ids.has(activity.id))
			throw new Error(`Aktivitets-ID er brukt flere ganger: ${activity.id}`);
		ids.add(activity.id);
		const tracking = activity.tracking;
		if (!tracking || !['review', 'challenge', 'checkpoint'].includes(tracking.kind))
			throw new Error(`Aktiviteten ${activity.id} mangler en gyldig tracking-definisjon.`);
		const adapter = tracking.kind === 'challenge' ? adapters[tracking.adapter] : null;
		if (tracking.kind === 'challenge' && (!adapter || typeof adapter.validate !== 'function'))
			throw new Error(`Aktiviteten ${activity.id} mangler validator: ${tracking.adapter}`);
		const objectives =
			tracking.kind === 'review'
				? [
						{
							id: 'review',
							title: 'Gjennomgått',
							kind: 'review',
							evidence: 'reviewed',
							required: true,
							points: rewardPolicy.reviewed
						}
					]
				: tracking.kind === 'challenge'
					? adapter.objectives.map((item) => ({
							id: item.id,
							title: item.title,
							kind: 'attempt',
							evidence: 'passed',
							required: true,
							points: rewardPolicy.passed
						}))
					: [];
		objectives.push(
			...questions
				.filter((item) => item.activityId === activity.id)
				.map((item) => ({
					id: item.id,
					title: item.title,
					kind: 'check',
					evidence: 'checked',
					required: tracking.kind === 'checkpoint',
					points: rewardPolicy.checked
				}))
		);
		if (!objectives.length || new Set(objectives.map((item) => item.id)).size !== objectives.length)
			throw new Error(`Aktiviteten ${activity.id} har tomme eller dupliserte oppdrag.`);
		return {
			id: activity.id,
			title: activity.tittel,
			href: activity.href,
			subject: activity.fag,
			format: activity.format,
			completionEvidence:
				tracking.kind === 'review'
					? 'reviewed'
					: tracking.kind === 'checkpoint'
						? 'checked'
						: 'passed',
			completionBonus: tracking.kind === 'challenge' ? rewardPolicy.completionBonus : 0,
			adapter: tracking.adapter ?? null,
			objectives
		};
	});
	for (const question of questions) {
		if (!ids.has(question.activityId))
			throw new Error(`Fagsjekken peker på en ukjent aktivitet: ${question.activityId}`);
	}
	return result;
}

export const catalog = buildCatalog();

export function validateProgressionDefinitions(activities, achievements, tracks, subjects = fag) {
	const knownSubjects = new Set(subjects.map((item) => item.id));
	for (const activity of activities) {
		if (!knownSubjects.has(activity.subject)) throw new Error(`Ukjent fag: ${activity.subject}`);
	}
	function checkGoal(goal) {
		if (goal.type === 'all') {
			if (!goal.goals.length) throw new Error('Et mål kan ikke være tomt.');
			goal.goals.forEach(checkGoal);
		} else if (goal.type === 'activity' || goal.type === 'objective') {
			const activity = activities.find((item) => item.id === goal.activityId);
			if (!activity) throw new Error(`Ukjent aktivitet i mål: ${goal.activityId}`);
			if (
				goal.type === 'objective' &&
				!activity.objectives.some((item) => item.id === goal.objectiveId)
			)
				throw new Error(`Ukjent oppdrag i mål: ${goal.activityId}:${goal.objectiveId}`);
		} else if (goal.type === 'count') {
			if (
				!['activities', 'objectives'].includes(goal.scope) ||
				!Number.isInteger(goal.target) ||
				goal.target < 1
			)
				throw new Error('Et telle-mål må ha gyldig scope og positivt antall.');
			if (goal.subject && !knownSubjects.has(goal.subject))
				throw new Error(`Ukjent fag i mål: ${goal.subject}`);
			if (goal.evidence && !['reviewed', 'checked', 'passed'].includes(goal.evidence))
				throw new Error(`Ukjent bevistype i mål: ${goal.evidence}`);
			const matches = activities.filter(
				(item) =>
					(!goal.subject || item.subject === goal.subject) &&
					(!goal.format || item.format === goal.format)
			);
			const available =
				goal.scope === 'activities'
					? matches.filter((item) => !goal.evidence || item.completionEvidence === goal.evidence)
							.length
					: matches
							.flatMap((item) => item.objectives)
							.filter((item) => !goal.evidence || item.evidence === goal.evidence).length;
			if (available < goal.target)
				throw new Error('Et telle-mål krever flere publiserte oppdrag enn det finnes.');
		} else throw new Error(`Ukjent måltype: ${goal.type}`);
	}
	for (const definitions of [achievements, tracks]) {
		if (new Set(definitions.map((item) => item.id)).size !== definitions.length)
			throw new Error('Merker og fagspor må ha unike ID-er.');
		for (const definition of definitions) {
			checkGoal(definition.goal);
			for (const subject of definition.subjects ?? [definition.subject])
				if (!knownSubjects.has(subject)) throw new Error(`Ukjent fag i definisjon: ${subject}`);
		}
	}
}

validateProgressionDefinitions(catalog, achievementDefinitions, trackDefinitions);

export function checkSubmission(body, { db, userId, now }) {
	if (!body || typeof body !== 'object' || Array.isArray(body))
		throw new TypeError('Ugyldig innsending.');
	// Preserve queued work from the previous frontend; old checkpoint submissions cannot bypass v2.
	const compatibleWork = body.version === 1 && ['start', 'review', 'attempt'].includes(body.kind);
	if (body.version !== CONTENT_VERSION && !compatibleWork) {
		const error = new Error('Oppgaven er oppdatert. Last siden på nytt og prøv igjen.');
		error.code = 'CONTENT_VERSION';
		throw error;
	}
	const activity = catalog.find((item) => item.id === body.activityId);
	if (!activity) throw new TypeError('Ukjent aktivitet.');
	const objective = activity.objectives.find((item) => item.id === body.objectiveId);
	if (!objective) throw new TypeError('Ukjent deloppdrag.');
	if (body.kind === 'start' && objective.kind === 'review')
		return { activity, objective, passed: false, solution: null };
	if (body.kind !== objective.kind)
		throw new TypeError('Feil type innsending for dette oppdraget.');
	if (objective.kind === 'review') {
		if (body.confirmed !== true) throw new TypeError('Bekreft at du har gjennomgått leksjonen.');
		return { activity, objective, passed: true, solution: null };
	}
	if (objective.kind === 'check') {
		const graded = gradeCheckpoint(
			db,
			userId,
			activity,
			objective.id,
			body.attemptId,
			body.solution,
			now
		);
		return {
			activity,
			objective,
			passed: graded.passed,
			solution: null,
			assessmentResult: graded.result
		};
	}
	return {
		activity,
		objective,
		passed: validateChallenge(challengeAdapters[activity.adapter], objective.id, body.solution),
		solution: body.solution
	};
}
