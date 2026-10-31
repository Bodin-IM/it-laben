import { publicationFor } from './modulePublication.js';

/** @typedef {import('./progression.js').ActivityProgress} ActivityProgress */
/** @typedef {import('./progression.js').ObjectiveProgress} ObjectiveProgress */
/** @typedef {{id:string,title:string,subject:string,steps:{id:string,kind:string,href:string,description:string,subject?:string,followUp?:{activityId:string,objectiveId:string,instruction:string,href?:string}}[]}} RecommendationModule */
/** @typedef {{id:string,title:string,href:string,description:string,reason:string,action:string,moduleId:string}} Recommendation */

/** Read-only recommendation: publication controls navigation, never completion or XP.
 * Modules without account progress lead to their overview; we cannot infer their next task.
 * @param {ActivityProgress[]} progress
 * @param {RecommendationModule[]} modules In teaching order, with resolved public content.
 * @param {import('./modulePublication.js').ModulePublication[]} publications
 * @param {string} [subject]
 * @returns {Recommendation|null}
 */
export function recommendNextActivity(progress, modules, publications, subject = 'alle') {
	const relevant = modules.filter((module) =>
		module.steps.some((step) => step.kind !== 'undervisning' &&
			(subject === 'alle' || (step.subject ?? module.subject) === subject))
	);
	const active = relevant.filter((module) => publicationFor(module.id, publications).status === 'active');
	// Completed modules are a clearly labelled fallback. Upcoming/missing records never qualify.
	const selected = active.length ? active : relevant.filter(
		(module) => publicationFor(module.id, publications).status === 'completed'
	);
	/** @type {{suggestion:Recommendation,updatedAt:number}[]} */
	const learning = [];
	/** @type {Recommendation[]} */
	const checks = [];
	/** @type {{suggestion:Recommendation,hasTracked:boolean}[]} */
	const overviews = [];
	const seen = new Set();
	for (const module of selected) {
		const reason = active.length ? `Aktiv modul: ${module.title}.` : `Repetisjon i ${module.title}.`;
		/** @param {ActivityProgress} activity @param {ObjectiveProgress} objective @param {string} description @param {string} [href] */
		function add(activity, objective, description, href = activity.href) {
			const id = `${activity.id}:${objective.id}`;
			if (seen.has(id) || objective.completedAt !== null || objective.available === false) return;
			if (objective.kind === 'check' && !objective.assessment?.canStart) return;
			seen.add(id);
			const url = new URL(href, 'https://it-laben.invalid');
			url.searchParams.set('modul', module.id);
			if (objective.kind === 'attempt') url.searchParams.set('oppdrag', objective.id);
			if (objective.kind === 'check') url.hash = `fagsjekk-${objective.id}`;
			// Only resume work on this objective. A finished text mission must not pull
			// the untouched login mission ahead of the lessons that introduce sessions.
			const updatedAt = activity.status === 'started' ? objective.updatedAt ?? 0 : 0;
			const suggestion = {
				id, moduleId: module.id,
				title: objective.kind === 'review' ? activity.title : `${activity.title} · ${objective.title}`,
				href: url.pathname + url.search + url.hash,
				description: objective.kind === 'check' ? 'Prøv spørsmålene til aktiviteten du har arbeidet med.' : description,
				reason: `${reason} ${updatedAt && objective.kind !== 'check' ? 'Du har påbegynt denne aktiviteten.' : 'Forslaget følger modulens arbeidsrekkefølge.'}`,
				action: objective.kind === 'check' ? 'Prøv fagsjekken' : updatedAt ? 'Fortsett aktiviteten' : 'Åpne oppgaven'
			};
			if (objective.kind === 'check') checks.push(suggestion);
			else learning.push({ suggestion, updatedAt });
		}
		let untracked = false;
		let hasTracked = false;
		for (const step of module.steps) {
			if (step.kind === 'undervisning' || (subject !== 'alle' && (step.subject ?? module.subject) !== subject)) continue;
			const activity = progress.find((item) => item.id === step.id);
			if (!activity) { untracked = true; continue; }
			hasTracked = true;
			const pending = activity.objectives.find((item) => item.required && item.completedAt === null);
			if (pending) add(activity, pending, step.description);
			for (const check of activity.objectives.filter((item) => item.kind === 'check')) add(activity, check, step.description);
			// A focused follow-up does not pull later missions forward or create a new progress ID.
			if (!pending && step.followUp) {
				const followActivity = progress.find((item) => item.id === step.followUp?.activityId);
				const objective = followActivity?.objectives.find((item) => item.id === step.followUp?.objectiveId);
				if (followActivity && objective) add(followActivity, objective, step.followUp.instruction, step.followUp.href);
			}
		}
		if (untracked) overviews.push({ hasTracked, suggestion: {
			id: module.id, moduleId: module.id, title: module.title,
			href: `/moduler/${module.id}/#forlop`, action: 'Velg en del i modulen',
			description: 'Åpne arbeidsrekkefølgen og velg delen du skal jobbe med.',
			reason: `${reason} Neste del kan ikke bestemmes fra kontoprogressen.`
		} });
	}
	const started = learning.filter((item) => item.updatedAt > 0).sort((a, b) => b.updatedAt - a.updatedAt);
	return started[0]?.suggestion ?? learning[0]?.suggestion ??
		overviews.find((item) => !item.hasTracked)?.suggestion ?? checks[0] ?? overviews[0]?.suggestion ?? null;
}
