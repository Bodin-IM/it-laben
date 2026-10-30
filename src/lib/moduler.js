import { aktiviteter, altElevinnhold, fag } from '#lib/innhold.js';
import { teachingPlans } from '#lib/teaching.js';

/** @typedef {{kind:'undervisning'|'teori'|'oving'|'oppdrag'|'praksis'|'repetisjon',id:string,section?:string,subject?:string,practice?:{instruction:string,check:string}}} ModuleStep */
/** @typedef {{id:string,title:string,description:string,subject:string,goals:string[],prerequisites:string,steps:ModuleStep[],resources:{label:string,href:string}[],continuation?:{title:string,description:string}[]}} Module */

// Modules group existing content. Activity IDs, assessment rules and XP stay in their own catalogues.
/** @type {Module[]} */
const originalModules = [
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
			{
				kind: 'oppdrag', id: 'chat',
				practice: {
					instruction: 'Lag POST og GET for meldinger i egen Express-backend, og kall rutene fra frontend med fetch.',
					check: 'Send fra én nettleser og hent fra en annen. Forklar hvorfor meldingen ikke vises hos mottakeren før frontend henter den.'
				}
			}
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
			{
				kind: 'oving', id: 'oving-7',
				practice: {
					instruction: 'Legg til JSON-fillagring, endring med ID og validering i egen chat. Avvis ugyldige requests før data endres.',
					check: 'Undersøk en omstart, to meldinger med samme tekst, en lengdegrense og en lagringsfeil. Sammenlign HTTP-svar og data.'
				}
			}
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
			{
				kind: 'oppdrag', id: 'meldingsdetektiven',
				practice: {
					instruction: 'Bruk innlogging og eierskap i egen chat. Sessionen skal bestemme hvem som sender og hvem som får endre data.',
					check: 'Test som eier, annen bruker og gjest i separate nettleserprofiler. Send en falsk eier i body, og vis at backend fortsatt beskytter dataene.'
				}
			}
		],
		resources: [{ label: 'Repeter validering', href: '/oving-7/' }]
	},
	{
		id: 'databaser',
		title: 'Databaser – fra tabeller til dokumenter',
		description:
			'Start med hva en database er og hvor den hører hjemme. Les kode for tilkobling, henting og innsetting, øv på søk og bruk MongoDB i eget prosjekt.',
		subject: 'utvikling',
		goals: [
			'Forklare sammenhengen mellom frontend, backend og database.',
			'Sammenligne en enkel tabellmodell med dokumenter i MongoDB.',
			'Lage filtre og forklare hvorfor dokumenter blir med i resultatet.',
			'Koble til og hente data fra en ekte database med Node.js, og undersøke et eksempel på innsetting.'
		],
		prerequisites:
			'Du kjenner variabler, objekter og lister i JavaScript og har møtt frontend og backend. MySQL repeteres som sammenligning. Node.js-driveren, await og tilkobling forklares før kodeoppgaven.',
		steps: [
			{ kind: 'teori', id: 'database-grunnlag' },
			{ kind: 'oving', id: 'database-finn' },
			{ kind: 'praksis', id: 'database-praksis' }
		],
		resources: [{ label: 'Repeter JSON og lagring', href: '/fillagring/' }],
		continuation: [
			{
				title: 'Runde 2 · Endre data kontrollert',
				description:
					'Øv på innsetting, oppdatering, sletting og validering. Bygg deretter disse funksjonene i eget register.'
			},
			{
				title: 'Runde 3 · Fra database til nettside',
				description: 'Undersøk dataflyten, og koble MongoDB til Express og Svelte.'
			},
			{
				title: 'Runde 4 · Nye behov og egen datamodell',
				description:
					'Sammenlign innebygde dokumenter og referanser. Utvid med utlån, og prøv en ny oppgave med mindre støtte.'
			}
		]
	}
];

// The old URLs remain valid; the former modules are now sections of Backend.
/** @type {Readonly<Record<string,{id:string,start:number}>>} */
export const moduleAliases = Object.freeze({
	'meldingens-reise': { id: 'backend', start: 1 },
	'data-og-lagring': { id: 'backend', start: 4 },
	'innlogging-og-tilgang': { id: 'backend', start: 9 },
	'fra-kode-til-drift': { id: 'backend', start: 16 }
});

/** @type {Module[]} */
export const moduler = [
	{
		id: 'backend',
		title: 'Backend',
		description:
			'Undersøk koden i simulatorene, reparer chatten og bygg videre i eget prosjekt. Start med dataflyten, og legg til lagring, innlogging og publisering.',
		subject: 'utvikling',
		goals: [
			'Forklare dataflyten mellom frontend og backend med GET og POST.',
			'Undersøke validering, CRUD og lagring i JSON-fil.',
			'Forklare og teste innlogging, avsender og tilgang på serveren.',
			'Skille mellom kildekode, frontendbygg og kjørende serverprosess.',
			'Forklare hva som skjer ved publisering, omstart og gjenoppretting.'
		],
		prerequisites:
			'Du kjenner variabler, objekter, lister og funksjoner i JavaScript. Start med Meldingens reise hvis frontend og backend er nytt for deg.',
		steps: [
			...originalModules.slice(0, 3).flatMap((module) =>
				module.steps.map((step, index) => ({
					...step,
					...(index === 0 ? { section: module.title } : {})
				}))
			),
			{
				kind: 'oving',
				id: 'oving-10',
				subject: 'drift',
				section: 'Publisering og drift',
				practice: {
					instruction: 'Publiser egen chat i det avtalte testmiljøet. Dokumenter bygging, publisering og kjøring som tjeneste.',
					check: 'Åpne appen fra en annen PC, start tjenesten og VM-en på nytt, og prøv gjenoppretting fra backup. Forklar hva som skjer med sessions og filer.'
				}
			},
			{
				kind: 'repetisjon',
				id: 'backend-oppsummering',
				section: 'Repetisjon og ekstra utfordring',
				practice: {
					instruction: 'Velg én rute i egen chat og forklar hele veien fra klikk til svar for en medelev. Lag deretter et nytt testtilfelle sammen.',
					check: 'Vis request, kontrollene på serveren, endringen i data og det frontend viser. Forklar både et gyldig og et avvist forsøk. Nattevakten nedenfor er en ekstra utfordring.'
				}
			},
			{ kind: 'oppdrag', id: 'nattvakt' }
		],
		resources: []
	},
	...originalModules.slice(3)
];

export const moduleTypes = {
	undervisning: { label: 'Undervisning', plural: 'gjennomganger', singular: 'gjennomgang' },
	teori: { label: 'Teori og eksempel', plural: 'teorideler', singular: 'teoridel' },
	oving: { label: 'Øving', plural: 'øvinger', singular: 'øving' },
	oppdrag: { label: 'Oppdrag', plural: 'oppdrag', singular: 'oppdrag' },
	repetisjon: { label: 'Repetisjon', plural: 'repetisjoner', singular: 'repetisjon' },
	praksis: { label: 'På egen maskin', plural: 'kodeoppgaver', singular: 'kodeoppgave' }
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
		const activity = altElevinnhold.find((item) => item.id === step.id);
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
		...new Set(
			module.steps
				.filter(
					(step) =>
						step.kind !== 'undervisning' && aktiviteter.some((activity) => activity.id === step.id)
				)
				.map((step) => step.id)
		)
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
			if (
				!(step.kind in moduleTypes) ||
				steps.has(key) ||
				(step.subject !== undefined && !fag.some((item) => item.id === step.subject))
			)
				throw new Error(`Ugyldig modulsteg: ${key}`);
			steps.add(key);
			if (step.kind !== 'undervisning') {
				const activity = altElevinnhold.find((item) => item.id === step.id);
				if (
					!activity ||
					activity.fag !== (step.subject ?? module.subject) ||
					(['oving', 'teori'].includes(step.kind)
						? activity.format !== 'leksjon'
						: ['praksis', 'repetisjon'].includes(step.kind)
							? activity.format !== 'aktivitet'
							: activity.format !== 'spill')
				)
					throw new Error(`Feil innholdstype eller fag: ${key}`);
			}
		}
		moduleContents(module);
		for (const resource of module.resources)
			if (!altElevinnhold.some((item) => item.href === resource.href))
				throw new Error(`Ukjent modulressurs: ${resource.href}`);
	}
}
validateModules();
