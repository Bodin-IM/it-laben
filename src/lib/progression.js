/** Shared progression configuration; all completion is calculated by the API. */
export const rewardPolicy = {
	reviewed: 15,
	checked: 10,
	passed: 25,
	completionBonus: 25,
	xpPerLevel: 100
};

/** @typedef {'reviewed'|'checked'|'passed'} Evidence */
/** @typedef {{id:string,title:string,kind:string,evidence:Evidence,required:boolean,points:number,completedAt:number|null,updatedAt:number|null,solution:string[]|Record<string,string>|null,assessment?:import('./assessmentPolicy.js').AssessmentState,available?:boolean}} ObjectiveProgress */
/** @typedef {{id:string,title:string,href:string,subject:string,format:string,completionEvidence:Evidence,status:string,completed:number,total:number,checksCompleted:number,checksTotal:number,creditEligible:boolean,pendingXp:number,objectives:ObjectiveProgress[]}} ActivityProgress */
/** @typedef {{type:'activity',activityId:string}|{type:'objective',activityId:string,objectiveId:string}|{type:'count',scope:'activities'|'objectives',target:number,subject?:string,format?:string,evidence?:Evidence}|{type:'all',goals:Goal[]}} Goal */
/** @typedef {{id:string,title:string,href:string,subject:string,evidence:Evidence,completed:boolean,completedAt:number|null}} Requirement */
/** @typedef {{completed:number,total:number,requirements:Requirement[],next:Requirement|null}} GoalProgress */
/** @typedef {{id:string,title:string,description:string,symbol:string,subjects:string[],optional?:boolean,goal:Goal}} AchievementDefinition */
/** @typedef {AchievementDefinition & GoalProgress & {earnedAt:number|null}} AchievementState */
/** @typedef {{id:string,title:string,description:string,symbol:string,subject:string,goal:Goal}} TrackDefinition */
/** @typedef {TrackDefinition & GoalProgress} TrackState */

/** @type {AchievementDefinition[]} */
export const achievementDefinitions = [
	{
		id: 'first-review',
		title: 'Første aha',
		description: 'Gjennomgå en leksjon.',
		symbol: '✦',
		subjects: [],
		goal: { type: 'count', scope: 'activities', format: 'leksjon', evidence: 'reviewed', target: 1 }
	},
	{
		id: 'first-solution',
		title: 'Første løsning',
		description: 'Bestå et spilloppdrag.',
		symbol: '✓',
		subjects: [],
		goal: { type: 'count', scope: 'objectives', evidence: 'passed', target: 1 }
	},
	{
		id: 'redd-chatten',
		title: 'Kode-redder',
		description: 'Bestå alle tre oppdragene i Redd chatten.',
		symbol: '{}',
		subjects: ['utvikling'],
		goal: { type: 'activity', activityId: 'redd-chatten' }
	},
	{
		id: 'meldingsdetektiven',
		title: 'Meldingsdetektiv',
		description: 'Oppklar alle fire sakene.',
		symbol: '?',
		subjects: ['utvikling'],
		goal: { type: 'activity', activityId: 'meldingsdetektiven' }
	},
	{
		id: 'chat',
		title: 'Meldingen er framme',
		description: 'Løs alle tre oppdragene i To nettlesere, én chat.',
		symbol: '↔',
		subjects: ['utvikling'],
		goal: { type: 'activity', activityId: 'chat' }
	},
	{
		id: 'both-subjects',
		title: 'Begge sider av IT',
		description: 'Gjennomgå eller bestå en aktivitet i både utvikling og driftsstøtte.',
		symbol: 'IT',
		subjects: ['utvikling', 'drift'],
		optional: true,
		goal: {
			type: 'all',
			goals: ['utvikling', 'drift'].map((subject) => ({
				type: 'count',
				scope: 'activities',
				target: 1,
				subject
			}))
		}
	},
	{
		id: 'session-guard',
		title: 'Sesjonsvakt',
		description: 'Finn riktig avsender i Redd chatten og løs «Innlogget, men får 401».',
		symbol: 'ID',
		subjects: ['utvikling'],
		goal: {
			type: 'all',
			goals: [
				{ type: 'objective', activityId: 'redd-chatten', objectiveId: 'avsender' },
				{ type: 'objective', activityId: 'meldingsdetektiven', objectiveId: 'session' }
			]
		}
	},
	{
		id: 'request-journey',
		title: 'Fra klikk til svar',
		description: 'Lever meldingen, reparer request-kontrakten og stopp tomme meldinger.',
		symbol: '→',
		subjects: ['utvikling'],
		goal: {
			type: 'all',
			goals: [
				{ type: 'objective', activityId: 'chat', objectiveId: 'lever' },
				{ type: 'objective', activityId: 'meldingsdetektiven', objectiveId: 'kontrakt' },
				{ type: 'objective', activityId: 'redd-chatten', objectiveId: 'tekst' }
			]
		}
	},
	{
		id: 'nattvakt-v1',
		title: 'Nattvakt',
		description: 'Gjør alle fire reparasjonene og få produksjonen klar innen åtte minutter.',
		symbol: '08',
		subjects: ['utvikling'],
		optional: true,
		goal: { type: 'objective', activityId: 'nattvakt', objectiveId: 'shift-v1' }
	}
];

/** @type {TrackDefinition[]} */
export const trackDefinitions = [
	{
		id: 'dataflow',
		title: 'Fra klikk til svar',
		description: 'Følg meldingen fra nettleseren, gjennom serveren og tilbake.',
		symbol: '↔',
		subject: 'utvikling',
		goal: {
			type: 'all',
			goals: [
				{ type: 'activity', activityId: 'frontend-backend' },
				{ type: 'objective', activityId: 'frontend-backend', objectiveId: 'check-v2' },
				{ type: 'activity', activityId: 'chat' },
				{ type: 'objective', activityId: 'meldingsdetektiven', objectiveId: 'kontrakt' },
				{ type: 'objective', activityId: 'meldingsdetektiven', objectiveId: 'visning' }
			]
		}
	},
	{
		id: 'robust-backend',
		title: 'Robust backend',
		description: 'Ta vare på data og stopp feil før de blir lagret.',
		symbol: '{}',
		subject: 'utvikling',
		goal: {
			type: 'all',
			goals: [
				{ type: 'activity', activityId: 'fillagring' },
				{ type: 'objective', activityId: 'fillagring', objectiveId: 'check-v2' },
				{ type: 'activity', activityId: 'oving-5' },
				{ type: 'objective', activityId: 'oving-5', objectiveId: 'check-v2' },
				{ type: 'activity', activityId: 'oving-6' },
				{ type: 'activity', activityId: 'oving-7' },
				{ type: 'objective', activityId: 'redd-chatten', objectiveId: 'tekst' },
				{ type: 'objective', activityId: 'meldingsdetektiven', objectiveId: 'dobbel' }
			]
		}
	},
	{
		id: 'identity',
		title: 'Innlogging og tilgang',
		description: 'Undersøk hvem brukeren er, og hvem som får endre data.',
		symbol: 'ID',
		subject: 'utvikling',
		goal: {
			type: 'all',
			goals: [
				{ type: 'activity', activityId: 'sessions' },
				{ type: 'objective', activityId: 'sessions', objectiveId: 'check-v2' },
				{ type: 'activity', activityId: 'oving-8' },
				{ type: 'activity', activityId: 'oving-9' },
				{ type: 'activity', activityId: 'chatrom' },
				{ type: 'objective', activityId: 'redd-chatten', objectiveId: 'avsender' },
				{ type: 'objective', activityId: 'meldingsdetektiven', objectiveId: 'session' },
				{ type: 'objective', activityId: 'redd-chatten', objectiveId: 'sletting' }
			]
		}
	},
	{
		id: 'operations',
		title: 'Fra kode til drift',
		description: 'Begynn med bygg, publisering og kjørende tjenester. Flere driftsoppdrag kommer.',
		symbol: '▤',
		subject: 'drift',
		goal: {
			type: 'all',
			goals: [
				{ type: 'activity', activityId: 'oving-10' },
				{ type: 'objective', activityId: 'oving-10', objectiveId: 'check-v2' }
			]
		}
	}
];

export const labColors = [
	{ id: 'forest', title: 'Skog', color: '#88cfaa', background: '#142b25', requires: null },
	{ id: 'ocean', title: 'Hav', color: '#83c8ed', background: '#142733', requires: null },
	{
		id: 'copper',
		title: 'Kobber',
		color: '#edb77f',
		background: '#33271d',
		requires: 'first-solution'
	},
	{ id: 'iris', title: 'Iris', color: '#bdb1f1', background: '#28213b', requires: 'session-guard' }
];

/** @param {ActivityProgress} activity @param {ObjectiveProgress} objective @returns {Requirement} */
function requirement(activity, objective) {
	return {
		id: `${activity.id}:${objective.id}`,
		title:
			objective.kind === 'review'
				? activity.title
				: `${activity.title} · ${objective.kind === 'check' ? 'Fagsjekk: ' : ''}${objective.title}`,
		href:
			objective.kind === 'attempt'
				? `${activity.href}?oppdrag=${encodeURIComponent(objective.id)}`
				: `${activity.href}${objective.kind === 'check' ? `#fagsjekk-${objective.id}` : ''}`,
		subject: activity.subject,
		evidence: objective.evidence,
		completed: objective.completedAt !== null,
		completedAt: objective.completedAt
	};
}

/** @param {Goal} goal @param {ActivityProgress[]} progress @returns {GoalProgress} */
export function evaluateGoal(goal, progress) {
	/** @type {Requirement[]} */
	let requirements = [];
	let completed = 0;
	let total = 0;
	/** @type {Requirement|null} */
	let next = null;
	if (goal.type === 'all') {
		const parts = goal.goals.map((item) => evaluateGoal(item, progress));
		requirements = parts.flatMap((item) => item.requirements);
		completed = parts.reduce((sum, item) => sum + item.completed, 0);
		total = parts.reduce((sum, item) => sum + item.total, 0);
		next = parts.find((item) => item.completed < item.total)?.next ?? null;
	} else if (goal.type === 'activity' || goal.type === 'objective') {
		const activity = progress.find((item) => item.id === goal.activityId);
		if (activity) {
			requirements = activity.objectives
				.filter((item) => (goal.type === 'activity' ? item.required : item.id === goal.objectiveId))
				.map((item) => requirement(activity, item));
		}
		total = requirements.length;
		completed = requirements.filter((item) => item.completed).length;
	} else {
		const candidates = progress.filter(
			(item) =>
				(!goal.subject || item.subject === goal.subject) &&
				(!goal.format || item.format === goal.format)
		);
		if (goal.scope === 'objectives') {
			requirements = candidates.flatMap((activity) =>
				activity.objectives
					.filter((item) => !goal.evidence || item.evidence === goal.evidence)
					.map((item) => requirement(activity, item))
			);
		} else {
			requirements = candidates
				.filter((item) => !goal.evidence || item.completionEvidence === goal.evidence)
				.map((activity) => ({
					id: activity.id,
					title: activity.title,
					href: activity.href,
					subject: activity.subject,
					evidence: activity.completionEvidence,
					completed: activity.completed === activity.total && activity.total > 0,
					completedAt:
						activity.completed === activity.total
							? Math.max(
									0,
									...activity.objectives
										.filter((item) => item.required)
										.map((item) => item.completedAt ?? 0)
								)
							: null
				}));
		}
		total = goal.target;
		completed = Math.min(total, requirements.filter((item) => item.completed).length);
	}
	return {
		completed,
		total,
		requirements,
		next:
			completed < total
				? goal.type === 'all'
					? next
					: (requirements.find((item) => !item.completed) ?? null)
				: null
	};
}

/** @param {AchievementState[]} achievements @param {string} subject */
export function nearestAchievement(achievements, subject = 'alle') {
	const candidates = achievements.map((item) =>
		subject !== 'alle' && !item.subjects.length && item.goal.type === 'count'
			? {
					...item,
					next:
						item.requirements.find(
							(requirement) => !requirement.completed && requirement.subject === subject
						) ?? null
				}
			: item
	);
	return (
		candidates
			.filter(
				(item) =>
					item.earnedAt === null &&
					!item.optional &&
					item.next &&
					(subject === 'alle' ||
						((!item.subjects.length || item.subjects.includes(subject)) &&
							item.next.subject === subject))
			)
			.sort(
				(a, b) =>
					b.completed / b.total - a.completed / a.total ||
					a.total - a.completed - (b.total - b.completed)
			)[0] ?? null
	);
}

/** @param {ActivityProgress[]} progress @param {string} subject @returns {Requirement|null} */
export function nextActivity(progress, subject = 'alle') {
	const candidates = progress.filter((item) => subject === 'alle' || item.subject === subject);
	// Finish the understanding check before moving to another activity.
	for (const activity of candidates) {
		const check = activity.objectives.find(
			(item) => item.kind === 'check' && item.completedAt === null && item.assessment?.canStart
		);
		if (check) return requirement(activity, check);
	}
	const started = candidates
		.filter((item) => item.status === 'started')
		.sort(
			(a, b) =>
				Math.max(0, ...b.objectives.map((item) => item.updatedAt ?? 0)) -
				Math.max(0, ...a.objectives.map((item) => item.updatedAt ?? 0))
		);
	for (const activity of [...started, ...candidates]) {
		const objective = activity.objectives.find(
			(item) => item.required && item.completedAt === null && item.available !== false
		);
		if (objective) return requirement(activity, objective);
	}
	for (const activity of candidates) {
		const objective = activity.objectives.find(
			(item) => !item.required && item.completedAt === null
		);
		if (objective) return requirement(activity, objective);
	}
	return null;
}
