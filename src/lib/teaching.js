import { altElevinnhold, fag } from '#lib/innhold.js';

/** @typedef {{id:string,audience:'teacher',title:string,description:string,subject:string,minutes:number,goals:string[],lessonIds:string[],selfWorkIds:string[]}} TeachingPlan */
/** @typedef {{activityId:string,minutes:number,focus:string,questions:string[],notes:string[]}} TeachingStep */
/** @typedef {{planId:string,preparation:string[],steps:TeachingStep[],wrapUp:string[]}} TeachingGuide */
/** @typedef {{plans:TeachingPlan[],guides:TeachingGuide[]}} TeachingLibrary */
/** @typedef {{id:string,tittel:string,beskrivelse:string,href:string,fag:string,format:'leksjon',audience:'student'|'teacher'}} PresentationLesson */

/** Teacher-only lesson pages can be registered here without student tracking or XP. @type {PresentationLesson[]} */
export const teacherLessons = [];

export function buildPresentationLessons(activities = altElevinnhold, resources = teacherLessons) {
	const students = activities
		.filter((item) => item.format === 'leksjon')
		.map(
			/** @returns {PresentationLesson} */
			(item) => ({
				id: item.id,
				tittel: item.tittel,
				beskrivelse: item.beskrivelse,
				href: item.href,
				fag: item.fag,
				format: 'leksjon',
				audience: 'student'
			})
		);
	const ids = new Set(activities.map((item) => item.id)),
		paths = new Set(activities.map((item) => item.href));
	for (const resource of resources) {
		if (
			ids.has(resource.id) ||
			paths.has(resource.href) ||
			resource.audience !== 'teacher' ||
			resource.format !== 'leksjon' ||
			!fag.some((item) => item.id === resource.fag) ||
			!resource.href.startsWith('/') ||
			resource.href.startsWith('//')
		)
			throw new Error(`Ugyldig lærerleksjon: ${resource.id}`);
		ids.add(resource.id);
		paths.add(resource.href);
	}
	return [...students, ...resources];
}
export const presentationLessons = buildPresentationLessons();

/** @type {TeachingPlan[]} */
export const teachingPlans = [
	{
		id: 'meldingens-reise',
		audience: 'teacher',
		title: 'Meldingens reise',
		subject: 'utvikling',
		minutes: 35,
		description:
			'Vis hvordan en melding går fra nettleseren til serveren, og hvorfor et nytt GET-kall trengs.',
		goals: [
			'Skille mellom POST og GET.',
			'Forklare forskjellen mellom data i nettleseren og på serveren.'
		],
		lessonIds: ['frontend-backend'],
		selfWorkIds: ['chat']
	},
	{
		id: 'hvem-er-logget-inn',
		audience: 'teacher',
		title: 'Hvem er logget inn?',
		subject: 'utvikling',
		minutes: 45,
		description: 'Gå gjennom cookie, session og eierskap med korte forsøk og spørsmål til klassen.',
		goals: [
			'Følge sammenhengen mellom cookie og session.',
			'Forklare hvorfor serveren bestemmer avsender og eierskap.'
		],
		lessonIds: ['sessions', 'oving-8', 'oving-9', 'chatrom'],
		selfWorkIds: ['oving-8', 'oving-9', 'redd-chatten', 'meldingsdetektiven']
	},
	{
		id: 'data-som-overlever',
		audience: 'teacher',
		title: 'Data som overlever',
		subject: 'utvikling',
		minutes: 40,
		description: 'Undersøk minne, fil og omstart sammen, før elevene prøver trygg lagring selv.',
		goals: [
			'Forutsi hva som overlever en omstart.',
			'Forklare hvorfor lagring må lykkes før minnet endres.'
		],
		lessonIds: ['fillagring', 'oving-5', 'oving-6'],
		selfWorkIds: ['oving-5', 'oving-6']
	},
	{
		id: 'backend-validering',
		audience: 'teacher',
		title: 'Validering: undersøk, reparer og bruk selv',
		subject: 'utvikling',
		minutes: 25,
		description: 'Følg mellomrom, feil datatype og lengdegrense fra request til lagring. Fortsett med reparasjon og egen kode.',
		goals: ['Velge tester på begge sider av en grense.', 'Forklare hvorfor ugyldige data skal avvises før lagring.'],
		lessonIds: ['oving-7'],
		selfWorkIds: ['oving-7', 'redd-chatten']
	},
	{
		id: 'backend-publisering',
		audience: 'teacher',
		title: 'Publiser og kontroller egen chat',
		subject: 'drift',
		minutes: 25,
		description: 'Skill kildekode, bygg og kjørende prosess. Forbered praktisk publisering, omstart og gjenoppretting.',
		goals: ['Forklare hvilken versjon nettleseren får.', 'Teste tjenesten fra en annen PC og etter omstart.'],
		lessonIds: ['oving-10'],
		selfWorkIds: ['oving-10']
	},
	{
		id: 'utstyrsboden', audience: 'teacher', title: 'Utstyrsboden: finn, undersøk og bygg', subject: 'utvikling', minutes: 40,
		description: 'La elevene undersøke søk, lage testdata og velge felt før de bruker MongoDB i eget prosjekt.',
		goals: ['Forklare hvorfor dokumenter blir med i et søk.', 'Lage testdata som skiller to filtre.', 'Velge felt ut fra hva registeret skal kunne svare på.'],
		lessonIds: ['database-finn', 'database-verksted'], selfWorkIds: ['database-finn', 'database-verksted', 'database-praksis']
	}

];

/** Validate metadata independently of learning/XP definitions. */
export function validateTeachingPlans(
	plans = teachingPlans,
	activities = altElevinnhold,
	resources = buildPresentationLessons(activities)
) {
	const ids = new Set();
	for (const plan of plans) {
		if (
			ids.has(plan.id) ||
			activities.some((item) => item.id === plan.id) ||
			resources.some((item) => item.id === plan.id) ||
			plan.audience !== 'teacher' ||
			!fag.some((item) => item.id === plan.subject) ||
			!Number.isInteger(plan.minutes) ||
			plan.minutes <= 0 ||
			!plan.lessonIds.length ||
			new Set(plan.lessonIds).size !== plan.lessonIds.length
		)
			throw new Error(`Ugyldig undervisningsopplegg: ${plan.id}`);
		ids.add(plan.id);
		for (const id of plan.lessonIds) {
			const activity = resources.find((item) => item.id === id);
			if (!activity || activity.format !== 'leksjon')
				throw new Error(`Opplegget ${plan.id} trenger en leksjon: ${id}`);
		}
		for (const id of plan.selfWorkIds)
			if (!activities.some((item) => item.id === id)) throw new Error(`Ukjent selvarbeid: ${id}`);
	}
}
validateTeachingPlans();

/** @param {string} href @param {string|null} [planId] */
export function presentationLink(href, planId = null) {
	const url = new URL(href, 'https://itlab.invalid');
	url.searchParams.delete('modus');
	url.searchParams.delete('apning');
	url.searchParams.delete('utenTid');
	url.searchParams.set('visning', 'presentasjon');
	if (planId) url.searchParams.set('opplegg', planId);
	else url.searchParams.delete('opplegg');
	return url.pathname + url.search + url.hash;
}

/** @param {string} href */
export function studentLessonLink(href) {
	const url = new URL(href, 'https://itlab.invalid');
	for (const name of ['visning', 'opplegg', 'modus', 'apning', 'utenTid'])
		url.searchParams.delete(name);
	return url.pathname + url.search + url.hash;
}
