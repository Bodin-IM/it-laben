// Public, curated help only. Never add assessment answers, account data or DOM content.
import { altElevinnhold, fag } from '#lib/innhold.js';
import { moduler, moduleContents } from '#lib/moduler.js';
import { lessons } from '#lib/ovingene.js';

/** @type {Record<string,string>} */
const kinds = {
	'frontend-backend': 'backend',
	chatrom: 'chatroom',
	fillagring: 'storage',
	sessions: 'session',
	chat: 'chat',
	meldingsdetektiven: 'detective',
	'redd-chatten': 'repair',
	nattvakt: 'challenge',
	'backend-oppsummering': 'quiz',
	'database-grunnlag': 'database-theory',
	'database-finn': 'database-query',
	'database-praksis': 'database-practice'
};

/** @typedef {{id:string,path:string,title:string,summary:string,topics:string[],tips:string[],kind?:string,contents?:{title:string,description:string,links:{title:string,href:string}[]}[]}} PartnerPage */
/** @type {PartnerPage[]} */
export const partnerPages = [
	{
		id: 'site-help',
		path: '',
		title: 'Hjelp i IT-laben',
		summary: 'Utforsk fag, moduler og aktiviteter i IT-laben.',
		topics: ['Navigasjon'],
		tips: [
			'Velg et fag i menyen. Modulene samler undervisning, øvinger og oppdrag i en anbefalt rekkefølge.',
			'Åpne et tema og les målet før du starter. I Min lab finner du profilen og fremgangen din.'
		]
	},
	{
		id: 'home',
		path: '/',
		title: 'Fagoversikten',
		summary: 'Finn moduler og aktiviteter i utvikling og driftsstøtte.',
		topics: ['Fag', 'Moduler'],
		tips: [
			'Velg faget du arbeider med. Start med en modul hvis du ønsker en sammenhengende rekkefølge.',
			'Lenger ned finner du enkeltøvinger, spill og repetisjon. Søk eller filtrer når du leter etter et bestemt tema.'
		]
	},
	{
		id: 'start',
		path: '/kom-i-gang/',
		title: 'Kom i gang',
		summary: 'Introduksjon til IT-laben og hvordan du bruker aktivitetene.',
		topics: ['Arbeidsmåter'],
		tips: [
			'Les målet for aktiviteten og prøv ett valg om gangen. Forklar hva du forventer før du tester.',
			'Sammenlign resultatet med forventningen din. Bruk forklaringen eller hintet til å planlegge neste forsøk.'
		]
	},
	{
		id: 'profile',
		path: '/min-lab/',
		title: 'Min lab',
		summary: 'Profil, klassevalg, fremgang og personlige innstillinger.',
		topics: ['Profil', 'Fremgang'],
		tips: [
			'Her kan du opprette eller åpne profilen din og tilpasse avatar, farge og opplevelse.',
			'Velg riktig klasse: 2ITA eller 2ITB. Klassevalget låses etter at det er lagret. Kontakt læreren hvis noe er feil.',
			'Poeng og gjennomføring viser aktivitet, men dokumenterer ikke alene forståelse. Forklar også hvordan og hvorfor løsningen virker.'
		]
	},
	{
		id: 'leaderboard',
		path: '/toppliste/',
		title: 'Topplisten',
		summary: 'Oversikt over poeng og hvilken klasse som leder.',
		topics: ['Klasse', 'Poeng'],
		tips: [
			'Topplisten viser aktivitet og poeng. Den er ikke en karakter eller en fullstendig vurdering av hva noen kan.',
			'I Min lab kan du velge klasse og styre om du vil være synlig på topplisten. Labpartneren henter ikke andre elevers profiler.'
		]
	},
	...fag.map((subject) => ({
		id: `subject-${subject.id}`,
		path: `/?fag=${subject.id}`,
		title: subject.navn,
		summary: subject.beskrivelse,
		topics: [subject.navn],
		tips: [
			'Start med en modul for å få undervisning og aktiviteter i sammenheng.',
			'Velg en enkeltøving lenger ned hvis du vil repetere et bestemt tema.'
		]
	})),
	...moduler.map((module) => ({
		id: `module-${module.id}`,
		kind: 'overview',
		contents: moduleContents(module).map((step) => ({
			title: step.title,
			description: step.description,
			links: step.href ? [{ title: step.title, href: step.href }] : step.lessons
		})),
		path: `/moduler/${module.id}/`,
		title: module.title,
		summary: module.description,
		topics: module.goals,
		tips: [
			`Forkunnskaper: ${module.prerequisites}`,
			'Følg modulens steg og bruk målene til å forklare hva du har undersøkt. Prøv deretter en beslektet oppgave med mindre hjelp.'
		]
	})),
	...altElevinnhold.map((activity) => {
		const lesson = lessons.find((item) => `oving-${item.number}` === activity.id);
		return {
			id: activity.id,
			kind: lesson ? 'lesson' : (kinds[activity.id] ?? 'overview'),
			path: activity.href,
			title: activity.tittel,
			summary: lesson?.intro ?? activity.beskrivelse,
			topics: activity.emner,
			tips: lesson
				? [lesson.context, ...lesson.tasks.slice(0, 2).map((task) => task.hint)]
				: [
						'Les målet og forutsi hva som vil skje før du gjør et valg.',
						'Prøv én endring om gangen. Sammenlign resultatet med forventningen din og bruk sidens forklaringer eller hint.'
					]
		};
	}),
	{
		id: 'rescue-pilot',
		kind: 'pilot',
		path: '/spill/redd-chatten/pilot/',
		title: 'Redd chatten: pilot',
		summary: 'Utforsk og reparer meldingsflyt.',
		topics: ['Backend', 'Dataflyt'],
		tips: [
			'Forutsi hva koden gjør og undersøk én endring om gangen.',
			'Bruk testsituasjonene til å forklare forskjellen på forventet og faktisk resultat.'
		]
	}
];
/** @param {string} id */
export function partnerPageById(id) {
	return partnerPages.find((item) => item.id === id);
}
/** Only recognised routes and subject filters are sent; arbitrary query values are excluded.
 * @param {string} pathname @param {string|null} [subject] */
export function partnerPageFor(pathname, subject = null) {
	if (!partnerAllowed(pathname)) return null;
	const path = pathname.replace(/\/$/, '') + '/';
	if (path === '/' && fag.some((item) => item.id === subject))
		return partnerPageById(`subject-${subject}`) ?? partnerPages[0];
	return partnerPages.find((item) => item.path === path) ?? partnerPages[0];
}

/** Lærer- og administrasjonssider skal ikke ha KI-veiledning. @param {string} pathname */
export function partnerAllowed(pathname) {
	return !/^\/(laerer|admin)(\/|$)/.test(pathname);
}
