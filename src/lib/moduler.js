import { aktiviteter, fag } from '#lib/innhold.js';
import { teachingPlans } from '#lib/teaching.js';

/** @typedef {{kind:'undervisning'|'oving'|'oppdrag',id:string}} ModuleStep */
/** @typedef {{id:string,title:string,description:string,subject:string,goals:string[],prerequisites:string,steps:ModuleStep[],resources:{label:string,href:string}[]}} Module */

// Modules group existing content. Activity IDs, assessment rules and XP stay in their own catalogues.
/** @type {Module[]} */
export const moduler = [
	{
		id: 'meldingens-reise',
		title: 'Meldingens reise',
		description:
			'Følg en melding fra nettleseren til serveren og tilbake. Prøv selv og få chatten til å virke.',
		subject: 'utvikling',
		goals: [
			'Skille mellom GET og POST.',
			'Forklare hvor dataene finnes før og etter en forespørsel.'
		],
		prerequisites: 'Du kjenner variabler, objekter og funksjoner i JavaScript.',
		steps: [
			{ kind: 'undervisning', id: 'meldingens-reise' },
			{ kind: 'oving', id: 'frontend-backend' },
			{ kind: 'oppdrag', id: 'chat' }
		],
		resources: []
	},
	{
		id: 'data-og-lagring',
		title: 'Data og lagring',
		description:
			'Ta vare på data gjennom endringer og omstart. Undersøk lagring, CRUD og validering.',
		subject: 'utvikling',
		goals: [
			'Forklare forskjellen på minne og fil.',
			'Undersøke hvordan data endres og valideres før lagring.'
		],
		prerequisites: 'Du har arbeidet med GET, POST og JSON, for eksempel i Meldingens reise.',
		steps: [
			{ kind: 'undervisning', id: 'data-som-overlever' },
			{ kind: 'oving', id: 'fillagring' },
			{ kind: 'oving', id: 'oving-5' },
			{ kind: 'oving', id: 'oving-6' },
			{ kind: 'oving', id: 'oving-7' }
		],
		resources: [{ label: 'Repeter frontend og backend', href: '/backend/' }]
	},
	{
		id: 'innlogging-og-tilgang',
		title: 'Innlogging og tilgang',
		description:
			'Finn ut hvem brukeren er, og hvem som får endre data. Bruk det du har lært til å reparere chatten.',
		subject: 'utvikling',
		goals: [
			'Forklare sammenhengen mellom cookie og session.',
			'Undersøke avsender, eierskap og tilgang på serveren.'
		],
		prerequisites: 'Du kjenner dataflyt, fillagring og validering fra de to første modulene.',
		steps: [
			{ kind: 'undervisning', id: 'hvem-er-logget-inn' },
			{ kind: 'oving', id: 'sessions' },
			{ kind: 'oving', id: 'oving-8' },
			{ kind: 'oving', id: 'oving-9' },
			{ kind: 'oving', id: 'chatrom' },
			{ kind: 'oppdrag', id: 'redd-chatten' },
			{ kind: 'oppdrag', id: 'meldingsdetektiven' }
		],
		resources: [{ label: 'Repeter validering', href: '/oving-7/' }]
	},
	{
		id: 'fra-kode-til-drift',
		title: 'Fra kode til drift',
		description:
			'Fra kildekode til en kjørende tjeneste. Undersøk publisering, omstart, localhost og backup.',
		subject: 'drift',
		goals: [
			'Skille mellom kildekode, frontendbygg og kjørende serverprosess.',
			'Forklare hva som skjer ved publisering, omstart og gjenoppretting.'
		],
		prerequisites:
			'Du kjenner frontend, backend, fillagring og innlogging fra utvikling. Gjennomgangen henter eksempler derfra.',
		steps: [
			{ kind: 'undervisning', id: 'fra-kode-til-tjeneste' },
			{ kind: 'oving', id: 'oving-10' }
		],
		resources: [
			{ label: 'Repeter minne og fillagring', href: '/fillagring/' },
			{ label: 'Repeter sessions', href: '/sessions/' }
		]
	}
];

export const moduleTypes = {
	undervisning: { label: 'Undervisning', plural: 'gjennomganger', singular: 'gjennomgang' },
	oving: { label: 'Øving', plural: 'øvinger', singular: 'øving' },
	oppdrag: { label: 'Oppdrag', plural: 'oppdrag', singular: 'oppdrag' }
};

/** @param {Module} module */
export function moduleContents(module) {
	return module.steps.map((step) => {
		if (step.kind === 'undervisning') {
			const plan = teachingPlans.find((item) => item.id === step.id);
			if (!plan) throw new Error(`Ukjent undervisningsopplegg: ${step.id}`);
			return {
				...step,
				title: plan.title,
				description: plan.description,
				href: '',
				teacherHref: `/laerer/undervisning/?opplegg=${plan.id}`,
				lessons: plan.lessonIds.flatMap((id) => {
					const lesson = aktiviteter.find((item) => item.id === id);
					return lesson ? [{ title: lesson.tittel, href: lesson.href }] : [];
				}),
				format: '',
				minutes: plan.minutes
			};
		}
		const activity = aktiviteter.find((item) => item.id === step.id);
		if (!activity) throw new Error(`Ukjent modulaktivitet: ${step.id}`);
		return {
			...step,
			title: activity.tittel,
			description: activity.beskrivelse,
			href: activity.href,
			teacherHref: '',
			lessons: [],
			format: activity.format,
			minutes: 0
		};
	});
}

/** @param {Module} module */
export function moduleSummary(module) {
	return Object.entries(moduleTypes)
		.flatMap(([kind, type]) => {
			const count = module.steps.filter((step) => step.kind === kind).length;
			return count ? [`${count} ${count === 1 ? type.singular : type.plural}`] : [];
		})
		.join(' · ');
}

/** Reading an overview or attending a lesson is never inferred as completion.
 * @param {Module} module
 * @param {{id:string,status:string}[]} [progress]
 */
export function moduleProgress(module, progress = []) {
	const ids = [
		...new Set(module.steps.filter((step) => step.kind !== 'undervisning').map((step) => step.id))
	];
	const done = (/** @type {string} */ id) =>
		progress.some((item) => item.id === id && ['reviewed', 'passed'].includes(item.status));
	return {
		completed: ids.filter(done).length,
		total: ids.length,
		started: ids.some((id) =>
			progress.some(
				(item) => item.id === id && ['started', 'reviewed', 'passed'].includes(item.status)
			)
		)
	};
}

/** Catch broken links and accidental reclassification when extending the catalogue. */
export function validateModules(modules = moduler) {
	const ids = new Set();
	for (const module of modules) {
		if (
			ids.has(module.id) ||
			!/^[a-z0-9-]+$/.test(module.id) ||
			!module.steps.length ||
			!fag.some((item) => item.id === module.subject)
		)
			throw new Error(`Ugyldig modul: ${module.id}`);
		ids.add(module.id);
		const steps = new Set();
		for (const step of module.steps) {
			const key = `${step.kind}:${step.id}`;
			if (!(step.kind in moduleTypes) || steps.has(key))
				throw new Error(`Ugyldig modulsteg: ${key}`);
			steps.add(key);
			if (step.kind !== 'undervisning') {
				const activity = aktiviteter.find((item) => item.id === step.id);
				if (
					!activity ||
					activity.fag !== module.subject ||
					(step.kind === 'oving') !== (activity.format === 'leksjon')
				)
					throw new Error(`Feil innholdstype eller fag: ${key}`);
			}
		}
		moduleContents(module);
		for (const resource of module.resources)
			if (!aktiviteter.some((item) => item.href === resource.href))
				throw new Error(`Ukjent modulressurs: ${resource.href}`);
	}
}
validateModules();
