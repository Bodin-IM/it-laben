// Public, curated help only. Never add assessment answers, account data or DOM content.
import { altElevinnhold, fag } from '#lib/innhold.js';
import { moduler, moduleContents } from '#lib/moduler.js';
import { guideSteps } from '#lib/studentGuide.js';
import { lessons } from '#lib/ovingene.js';

/** @type {Record<string,string>} */
const kinds = {
	'vlan-lab': 'vlan',
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
			'Åpne «Finn enkeltoppgaver» for øvinger, spill og repetisjon. Søk eller filtrer når du leter etter et bestemt tema.'
		]
	},
	{
		id: 'tutorial',
		path: '/tutorial/',
		kind: 'tutorial',
		title: 'Slik bruker du IT-laben',
		summary: 'En veiledning med et lokalt prøveforsøk. Ingen poeng eller lagring av forsøket.',
		topics: ['Navigasjon', 'Testing', 'Hint', 'Fremgang'],
		tips: guideSteps.map((step) => `${step.title}: ${step.text}`)
	},
	{
		id: 'start',
		path: '/kom-i-gang/',
		title: 'Kom i gang med Min lab',
		summary: 'Hjelp med sikker tilkobling og innlogging i Min lab.',
		topics: ['Arbeidsmåter'],
		tips: [
			'Følg sidens veiledning for sikker tilkobling til Min lab.',
			'For hjelp til oppgavene: åpne Slik bruker du IT-laben på /tutorial/.'
		]
	},
	{
		id: 'profile',
		path: '/min-lab/',
		title: 'Min lab',
		summary: 'Fremgang, fagspor og merker. Innstillinger samler profil- og utseendevalg.',
		topics: ['Profil', 'Fremgang'],
		tips: [
			'Min lab samler fremgang, fagspor og merker. Aktivitetslisten kan åpnes når du vil se alle aktivitetene.',
			'Åpne Innstillinger via tannhjulet i toppmenyen for labkort, lyd, klasse og nøkkelfil. Velg riktig klasse: 2ITA eller 2ITB. Klassevalget låses etter lagring; kontakt læreren hvis noe er feil.',
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
			'Under Innstillinger → Klasse og toppliste kan du velge klasse og styre synligheten din. Labpartneren henter ikke andre elevers profiler.'
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
			tips: activity.id === 'vlan-lab'
				? [
						'Velg en PC eller switch i kartet. Gjør én endring, prøv ping og undersøk hendelsene.',
						'PVID velger VLAN for umerket trafikk inn. Tagged/untagged beskriver hvordan trafikken sendes ut. En trunk frakter VLAN mellom switcher; den ruter ikke mellom IP-nett.'
					]
				: lesson
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
