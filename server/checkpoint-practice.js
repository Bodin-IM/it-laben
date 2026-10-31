// Server-owned links from submitted questions to public practice. Never sent with an open test.
const exercise = (number, instruction, lookFor) => ({
	title: `Prøv i øving ${number}`,
	href: `/oving-${number}/#forsok`,
	instruction,
	lookFor
});
const practice = {
	refresh: {
		title: 'Prøv meldingens reise', href: '/spill/chat/',
		instruction: 'Send én melding fra Ada. Undersøk backend og Noahs liste før og etter at Noah henter meldingene.',
		lookFor: 'Hvilken forespørsel endrer backend, og hvilken oppdaterer Noahs visning?'
	},
	response: exercise(7, 'Kjør «Tom tekst», og sammenlign med «500 tegn». Følg begge helt til svaret når frontend.', 'Når kan frontend vise at meldingen er lagret?'),
	rooms: {
		title: 'Prøv romvalg', href: '/chatrom/',
		instruction: 'Hent meldinger fra Generelt og Gaming. Sammenlign rommet i forespørselen med meldingene i svaret.',
		lookFor: 'Hva må endres i forespørselen for å hente det andre rommet?'
	},
	restart: exercise(5, 'Velg «Start serveren på nytt» og følg innlesingen fra fil til minne.', 'Hvor kommer meldingene i den nye prosessens minne fra?'),
	write: exercise(5, 'Sammenlign «Lagre en melding» og «Skrivingen feiler». Følg både listen, filen og HTTP-svaret.', 'Hvilke steg blir ikke utført når filskrivingen feiler?'),
	broken: exercise(5, 'Sammenlign «Filen finnes ikke» og «Filen har ugyldig JSON».', 'Hvorfor gir bare det ene tilfellet en tom liste?'),
	missingId: exercise(6, 'Velg DELETE og ID-en «ukjent». Kjør helt til svaret.', 'Hvilke meldinger finnes før og etter forsøket?'),
	patch: exercise(6, 'Velg PATCH, en kjent ID og en ny tekst. Følg endringen og den påfølgende GET-forespørselen.', 'Hvilken melding endres, og når viser frontend den nye teksten?'),
	json: exercise(7, 'Velg «Ugyldig JSON» og følg kjøringen fra parseren.', 'Kommer forespørselen frem til den vanlige rutekoden eller lagringen?'),
	type: exercise(7, 'Kjør «tekst er tallet 123», og sammenlign med «500 tegn».', 'Hvilken kontroll må skje før trim kan brukes?'),
	whitespace: exercise(7, 'Sammenlign «Bare mellomrom» og «Tom tekst». Se på tekstverdien før og etter trim.', 'Er det nok at feltet finnes, og endres meldingslisten?'),
	cookie: exercise(8, 'Sammenlign «Spør /meg med cookie» og «Spør /meg uten cookie».', 'Hvilken informasjon får backend i hver forespørsel?'),
	register: exercise(8, 'Sammenlign «Registrer en ny bruker» og «Logg inn med riktig passord».', 'Når opprettes brukeren, og når opprettes en innlogget session?'),
	sessionRestart: exercise(8, 'Velg «Omstart: hva overlever?» og følg brukerfil, sessions og cookie.', 'Hvorfor kan brukeren finnes selv om /meg gir 401?'),
	identity: exercise(9, 'Velg Ada, POST og falsk eier i body. Sammenlign innsendt body med meldingen som lagres.', 'Hvor henter backend avsenderen og eier-ID-en?'),
	ownership: exercise(9, 'Velg DELETE og m1. Sammenlign kjøring som Ada og Noah.', 'Undersøk både statuskode og om meldingen fortsatt finnes etter avvisning.'),
	guest: exercise(9, 'Velg gjest og DELETE på m1. Sammenlign med Noah på samme melding.', 'Hvor stoppes hver forespørsel, og hvorfor er 401 og 403 forskjellige?'),
	publish: exercise(10, 'Sammenlign «Endre kildekode uten å bygge» og «Bygg og publiser ny frontend».', 'Hvilken versjon blir faktisk levert til nettleseren?'),
	localhost: exercise(10, 'Velg «Besøk fra en annen PC». Følg adressen nettleseren prøver å kontakte.', 'Hvilken maskin peker localhost til i dette forsøket?'),
	service: exercise(10, 'Sammenlign «Start Node-prosessen på nytt» og «Start VM-en på nytt med systemd».', 'Skill mellom det som starter prosessen og det som bevarer dataene.'),
	contract: {
		title: 'Undersøk meldingskontrakten', href: '/spill/meldingsdetektiven/',
		instruction: 'Åpne saken om feil feltnavn. Sammenlign request-body med feltet backend leser, og prøv en retting.',
		lookFor: 'Er den forventede teksten både lagret og vist etterpå?'
	},
	duplicate: {
		title: 'Undersøk dobbel innsending', href: '/spill/meldingsdetektiven/',
		instruction: 'Åpne saken om doble meldinger. Tell POST-forespørslene fra ett trykk før du endrer hendelsesoppsettet.',
		lookFor: 'Gir ett trykk én forespørsel og én ny melding etter rettingen?'
	}
};
const topics = {
	'frontend-backend': { original: 'refresh', request: 'refresh', response: 'response' },
	chatrom: { original: 'rooms', filter: 'rooms', delete: 'ownership' },
	fillagring: { original: 'restart', load: 'restart', durable: 'write' },
	sessions: { original: 'cookie', 'forged-user': 'identity', 'missing-cookie': 'cookie' },
	'oving-5': { original: 'write', order: 'write', 'broken-json': 'broken' },
	'oving-6': { original: 'missingId', patch: 'patch', refresh: 'patch' },
	'oving-7': { original: 'json', type: 'type', whitespace: 'whitespace' },
	'oving-8': { original: 'cookie', register: 'register', restart: 'sessionRestart' },
	'oving-9': { original: 'ownership', 'before-delete': 'ownership', guest: 'guest' },
	'oving-10': { original: 'publish', localhost: 'localhost', service: 'service' },
	'redd-chatten': { validate: 'whitespace', sender: 'identity', ownership: 'ownership' },
	meldingsdetektiven: { contract: 'contract', duplicate: 'duplicate', session: 'cookie' },
	chat: { deliver: 'refresh', 'already-stored': 'refresh', room: 'rooms' }
};

export function checkpointPractice(activityId, sourceId) {
	if (!Object.hasOwn(topics, activityId) || !Object.hasOwn(topics[activityId], sourceId)) return null;
	return { ...practice[topics[activityId][sourceId]] };
}
