import { lessons } from '#lib/ovingene.js';
import { databaseActivities } from '#lib/databaseCourse.js';

// Aktiviteter med serverlagret fremgang. Fri repetisjon legges til i repetisjonsaktiviteter.
export const fag = [
	{ id: 'utvikling', navn: 'Utvikling', beskrivelse: 'Kode, nettsider og data', symbol: '{ }' },
	{ id: 'drift', navn: 'Driftsstøtte', beskrivelse: 'Nettverk, servere og systemer', symbol: '▤' }
];

export const innholdsformater = [
	{ id: 'leksjon', navn: 'Øvinger', entall: 'Øving', sokeord: 'leksjon forklaring øvelse' },
	{ id: 'spill', navn: 'Oppdrag og spill', entall: 'Oppdrag', sokeord: 'oppdrag spill utfordring' },
	{ id: 'aktivitet', navn: 'Aktiviteter', entall: 'Aktivitet', sokeord: 'aktivitet oppgave' }
];

/** @param {string} id */
export function innholdsformat(id) {
	return (
		innholdsformater.find((item) => item.id === id) ?? { id, navn: id, entall: id, sokeord: id }
	);
}

/**
 * @typedef {Object} Aktivitet
 * @property {string} id
 * @property {string} tittel
 * @property {string} beskrivelse
 * @property {string} href
 * @property {'utvikling' | 'drift'} fag
 * @property {'student'} audience
 * @property {'leksjon' | 'spill'} format
 * @property {string} type
 * @property {string[]} emner
 * @property {string[]} sokeord
 * @property {string} symbol
 * @property {{kind:'review'|'challenge'|'checkpoint'|'timed',adapter?:string}} tracking
 */

/** @type {Record<number, string[]>} */
const ovingsEmner = {
	5: ['Fillagring', 'JSON', 'Omstart'],
	6: ['CRUD', 'PATCH', 'DELETE'],
	7: ['Validering', 'JSON', 'HTTP-feil'],
	8: ['Session', 'Cookie', 'Innlogging'],
	9: ['Innlogging', 'Eierskap', 'Tilgang'],
	10: ['Publisering', 'systemd', 'Backup']
};

/** @type {Aktivitet[]} */
export const aktiviteter = [
	{
		id: 'frontend-backend',
		audience: 'student',
		tracking: { kind: 'review' },
		tittel: 'Frontend møter backend',
		beskrivelse: 'Send en melding, hent den tilbake og følg koden mellom nettleser og server.',
		href: '/backend/',
		fag: 'utvikling',
		format: 'leksjon',
		type: 'Interaktiv kodelab',
		emner: ['fetch', 'GET / POST', 'req.body'],
		sokeord: ['HTTP', 'request', 'forespørsel', 'Svelte', 'Express', 'meldinger', 'chat'],
		symbol: '↔'
	},
	{
		id: 'chatrom',
		audience: 'student',
		tracking: { kind: 'review' },
		tittel: 'Bygg videre på chatten',
		beskrivelse:
			'Hent riktig chatrom, bruk session som avsender og kontroller hvem som får slette.',
		href: '/chatrom/',
		fag: 'utvikling',
		format: 'leksjon',
		type: 'Tre kodeforsøk',
		emner: ['Chatrom', 'Session', 'DELETE'],
		sokeord: ['innlogging', 'pålogging', 'eierskap', 'tilgang', 'sletting', 'backend', 'Express'],
		symbol: '#'
	},
	{
		id: 'fillagring',
		audience: 'student',
		tracking: { kind: 'review' },
		tittel: 'Lagring i JSON-fil',
		beskrivelse: 'Følg data fra minne til fil og undersøk hva som overlever en omstart.',
		href: '/fillagring/',
		fag: 'utvikling',
		format: 'leksjon',
		type: 'Interaktiv kodelab',
		emner: ['JSON', 'Fillagring', 'Omstart'],
		sokeord: ['lagre', 'filer', 'persistens', 'backend', 'Node', 'fs', 'chat'],
		symbol: '{}'
	},
	{
		id: 'sessions',
		audience: 'student',
		tracking: { kind: 'review' },
		tittel: 'Sessions og pålogging',
		beskrivelse: 'Følg en innlogging steg for steg og utforsk samspillet mellom cookie og session.',
		href: '/sessions/',
		fag: 'utvikling',
		format: 'leksjon',
		type: 'Stegvis forklaring',
		emner: ['Session', 'Cookie', 'credentials'],
		sokeord: ['innlogging', 'login', 'autentisering', 'bruker', 'backend', 'Express'],
		symbol: 'ID'
	},
	{
		id: 'nattvakt',
		audience: 'student',
		tracking: { kind: 'timed', adapter: 'production-v1' },
		tittel: 'Nattevakten – redd produksjonen',
		beskrivelse: 'Åtte minutter. Fire feil. Ta vakten, følg sporene og få chatten klar før åpning.',
		href: '/spill/nattvakt/',
		fag: 'utvikling',
		format: 'spill',
		type: 'Hardcore · 8 minutter',
		emner: ['Feilsøking', 'Tidspress', 'Produksjon'],
		sokeord: [
			'hardcore',
			'utfordring',
			'nattvakt',
			'nattevakten',
			'session',
			'fillagring',
			'eierskap',
			'backend'
		],
		symbol: '08'
	},
	{
		id: 'meldingsdetektiven',
		audience: 'student',
		tracking: { kind: 'challenge', adapter: 'meldingsdetektiven' },
		tittel: 'Meldingsdetektiven',
		beskrivelse: 'Finn spor i kode, requests og serverdata. Rett feilen og test løsningen.',
		href: '/spill/meldingsdetektiven/',
		fag: 'utvikling',
		format: 'spill',
		type: '4 feilsøkingssaker',
		emner: ['Feilsøking', 'Frontend', 'Backend'],
		sokeord: ['chat', 'meldinger', 'HTTP', 'fetch', 'request', 'forespørsel', 'Svelte', 'Express'],
		symbol: '?'
	},
	{
		id: 'redd-chatten',
		audience: 'student',
		tracking: { kind: 'challenge', adapter: 'redd-chatten' },
		tittel: 'Redd chatten',
		beskrivelse: 'Reparer serverkoden og test om chatten tåler både meldinger og feilforsøk.',
		href: '/spill/redd-chatten/',
		fag: 'utvikling',
		format: 'spill',
		type: '3 kodeoppdrag',
		emner: ['Backend', 'Validering', 'Session'],
		sokeord: ['Express', 'innlogging', 'pålogging', 'sletting', 'DELETE', 'eierskap', 'tilgang'],
		symbol: '{}'
	},
	{
		id: 'chat',
		audience: 'student',
		tracking: { kind: 'challenge', adapter: 'chat' },
		tittel: 'To nettlesere, én chat',
		beskrivelse: 'Velg handlingene som får meldingen fra Ada fram til Noah, via serveren.',
		href: '/spill/chat/',
		fag: 'utvikling',
		format: 'spill',
		type: '3 dataflytoppdrag',
		emner: ['Dataflyt', 'GET / POST', 'Chatrom'],
		sokeord: ['HTTP', 'request', 'forespørsel', 'frontend', 'backend', 'meldinger'],
		symbol: '↔'
	},
	...lessons.map(
		/** @returns {Aktivitet} */
		(lesson) => ({
			id: `oving-${lesson.number}`,
			audience: 'student',
			tracking: { kind: 'review' },
			tittel: `Øving ${lesson.number}: ${lesson.title}`,
			beskrivelse: lesson.question,
			href: `/oving-${lesson.number}/`,
			fag: lesson.category === 'Driftsstøtte' ? 'drift' : 'utvikling',
			format: 'leksjon',
			type: 'Interaktiv kodelab',
			emner: ovingsEmner[lesson.number] ?? [],
			sokeord: [lesson.intro, lesson.context, lesson.takeaway, 'Backend', 'Øving 5–10'],
			symbol: String(lesson.number).padStart(2, '0')
		})
	)
];

// Offentlig, formativ øving uten fagsjekk, opplåsing eller XP.
// Behold den utenfor serverkatalogen og vis alt samlet i forsiden.
export const repetisjonsaktiviteter = [
	{
		id: 'backend-oppsummering',
		tittel: 'Backend: oppsummering av øving 1–10',
		beskrivelse:
			'Følg dataene fra første rute til drift. Velg svar, få forklaringer og prøv igjen.',
		href: '/aktiviteter/backend-oppsummering/',
		fag: 'utvikling',
		audience: 'student',
		format: 'aktivitet',
		type: '20 flervalgsspørsmål',
		emner: ['Backend', 'Repetisjon', 'Øving 1–10'],
		sokeord: [
			'quiz',
			'multiple choice',
			'flervalg',
			'oppsummering',
			'JSON',
			'CRUD',
			'session',
			'innlogging',
			'tilgang',
			'drift'
		],
		symbol: '?'
	}
];

export const altElevinnhold = [...aktiviteter, ...repetisjonsaktiviteter, ...databaseActivities];
