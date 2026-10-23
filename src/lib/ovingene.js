// Øvingsarkene er kilden. Alle forsøk kjøres lokalt som undervisningsmodeller.
/** @typedef {{value: string, label: string}} Choice */
/** @typedef {{key: string, label: string, kind: string, value: string, choices?: Choice[]}} Field */
/** @typedef {{title: string, hint: string, answer: string}} Task */
/** @typedef {{number: number, title: string, question: string, intro: string, category: string, fields: Field[], tasks: Task[], takeaway: string, context: string, related: {href: string, label: string}[]}} Lesson */
/** @param {string} key @param {string} label @param {string[][]} choices @returns {Field} */
const select = (key, label, choices) => ({
	key,
	label,
	kind: 'select',
	value: choices[0][0],
	choices: choices.map(([value, label]) => ({ value, label }))
});
/** @param {string} key @param {string} label @param {string} value @param {string} [kind] @returns {Field} */
const input = (key, label, value, kind = 'text') => ({ key, label, value, kind });
/** @type {Lesson[]} */
export const lessons = [
	{
		number: 5,
		title: 'Fra minne til varig lagring',
		question: 'Når er meldingen egentlig lagret?',
		category: 'Utvikling',
		intro:
			'Følg en melding via en ny liste og en midlertidig fil. Se hvorfor filen må være lagret før serveren bekrefter endringen.',
		context:
			'Utdrag fra lagring.js og POST /meldinger. Filnavnet bestemmes av serveren. Synkron lagring er valgt for en liten øvelse med én serverprosess.',
		fields: [
			select('scenario', 'Velg forsøk', [
				['save', 'Lagre en melding'],
				['fail', 'Skrivingen feiler'],
				['restart', 'Start serveren på nytt'],
				['missing', 'Filen finnes ikke'],
				['broken', 'Filen har ugyldig JSON'],
				['object', 'JSON er et objekt, ikke en liste']
			]),
			input('text', 'Ny melding', 'Vi sees i laben!', 'textarea')
		],
		tasks: [
			{
				title: 'Finn øyeblikket data blir varige',
				hint: 'Sammenlign nyListe, .tmp-filen og meldinger.json.',
				answer:
					'writeFileSync skriver først til .tmp. renameSync erstatter den egentlige filen. Deretter oppdateres minnet, og til slutt sendes 201.'
			},
			{
				title: 'Prøv en skrivefeil',
				hint: 'Velg «Skrivingen feiler». Følg minnet helt til siste steg.',
				answer:
					'Serveren svarer 500. Den gamle listen og den gamle datafilen beholdes. meldinger = nyListe kjøres aldri.'
			},
			{
				title: 'Sammenlign manglende og ødelagt fil',
				hint: 'Bare én av feilene skal gi en tom liste.',
				answer:
					'ENOENT betyr at filen mangler og gir []. Ugyldig JSON eller feil datatype stopper oppstarten. Filen skal ikke overskrives med en tom liste.'
			}
		],
		takeaway:
			'Lag en ny liste → lagre filen → bytt listen i minnet → send svar. En feilet lagring skal ikke se ut som en vellykket endring.',
		related: [{ href: '/fillagring/', label: 'Grunnlag: minne, fil og omstart' }]
	},
	{
		number: 6,
		title: 'Endre og slette med CRUD',
		question: 'Hvordan treffer du riktig melding?',
		category: 'Utvikling',
		intro:
			'To meldinger har samme tekst, men ulik ID. Endre eller slett én av dem, og følg forskjellen mellom serverdata og listen i nettleseren.',
		context:
			'Utdrag fra øving 6. GET og POST har du fra før; her utforsker du PATCH og DELETE. Tilgangskontroll legges til i øving 9.',
		fields: [
			select('method', 'Handling', [
				['PATCH', 'PATCH · endre teksten'],
				['DELETE', 'DELETE · slett meldingen']
			]),
			select('id', 'ID i adressen', [
				['m1', 'm1 · Ada'],
				['m2', 'm2 · Noah'],
				['ukjent', 'ukjent · finnes ikke']
			]),
			input('text', 'Ny tekst ved PATCH', 'Nå er denne endret.', 'textarea'),
			select('disk', 'Lagring', [
				['ok', 'Filen kan lagres'],
				['fail', 'Filen kan ikke lagres']
			])
		],
		tasks: [
			{
				title: 'Endre bare Noahs melding',
				hint: 'Velg m2. Sammenlign ID, avsender og opprettet før og etter.',
				answer:
					'map lager en ny liste. Bare objektet med riktig ID erstattes. Spredningssyntaksen kopierer de andre egenskapene.'
			},
			{
				title: 'Slett en ID som ikke finnes',
				hint: 'Velg DELETE og ukjent.',
				answer:
					'Du får 404 før lagring. Å slette samme ID én gang til i den ekte appen gir også 404.'
			},
			{
				title: 'Stopp før siste GET',
				hint: 'Se på «Nettleserens liste» etter at backend har svart.',
				answer:
					'Serverens data er endret, men listen i frontend er fortsatt gammel. await hentMeldinger() henter den nye listen etter vellykket PATCH eller DELETE.'
			}
		],
		takeaway:
			'ID velger meldingen. map endrer ett objekt, filter fjerner ett objekt. Lagre før du bekrefter, og hent listen på nytt i frontend.',
		related: [{ href: '/spill/redd-chatten/', label: 'Prøv også: Redd chatten' }]
	},
	{
		number: 7,
		title: 'Stopp feil før de lagres',
		question: 'Hvor skal en ugyldig request stoppe?',
		category: 'Utvikling',
		intro:
			'Send gyldig og ugyldig JSON gjennom Express. Følg forskjellen på en feil i JSON, en ugyldig verdi og en server som ikke svarer.',
		context:
			'POST /meldinger med express.json({ limit: "10kb" }), tekstFeil og felles feilmiddleware. Koden viser de relevante delene av requestkjeden.',
		fields: [
			select('scenario', 'Prøv en feiltype', [
				['custom', 'Bruk JSON-feltet nedenfor'],
				['empty', 'Tom tekst'],
				['number', 'tekst er tallet 123'],
				['500', '500 tegn'],
				['501', '501 tegn'],
				['malformed', 'Ugyldig JSON'],
				['large', 'Over 10 kB'],
				['disk', 'Lagringsfeil'],
				['offline', 'Backend er avslått'],
				['route', 'Ukjent rute']
			]),
			input(
				'body',
				'Request-body ved eget forsøk',
				'{ "avsender": "Ada", "tekst": "Hei fra laben!" }',
				'textarea'
			)
		],
		tasks: [
			{
				title: 'Test grensen på 500 tegn',
				hint: 'Kjør både 500 og 501 tegn.',
				answer:
					'500 godtas, 501 avvises med 400. JavaScripts length teller UTF-16-kodeenheter, så enkelte emoji teller som to.'
			},
			{
				title: 'Send et tall som tekst',
				hint: 'Hvorfor kommer typeof før trim?',
				answer:
					'Tallet 123 har ingen trim-metode. En typesjekk først gir en kontrollert 400-feil i stedet for et krasj.'
			},
			{
				title: 'Sammenlign 400 og avslått backend',
				hint: 'Se på svaret og frontend-koden.',
				answer:
					'fetch gir et Response-objekt ved HTTP 400; du må sjekke svar.ok. Ved nettverksfeil blir promise avvist, og catch håndterer feilen uten en HTTP-status.'
			}
		],
		takeaway:
			'Parser → validering → lagring → svar. Ugyldige requests skal aldri endre data. Frontend leser JSON én gang og sjekker svar.ok.',
		related: []
	},
	{
		number: 8,
		title: 'Fra registrering til innlogging',
		question: 'Hva vet serveren om deg neste gang?',
		category: 'Utvikling',
		intro:
			'Skill mellom en bruker på disk, en session i minnet og en cookie i nettleseren. Følg registrering, passordkontroll og /meg.',
		context:
			'Forenklede utdrag fra øving 8 med bcryptjs og express-session. Hash og cookie-ID er symboler i denne simuleringen; ingen ekte passordkontroll eller innlogging utføres. Bruk bare eksempelverdier.',
		fields: [
			select('scenario', 'Velg forsøk', [
				['register', 'Registrer en ny bruker'],
				['duplicate', 'Registrer et brukt navn'],
				['login', 'Logg inn med riktig passord'],
				['wrong', 'Logg inn med feil passord'],
				['meg', 'Spør /meg med cookie'],
				['nocookie', 'Spør /meg uten cookie'],
				['logout', 'Logg ut og spør /meg'],
				['restart', 'Omstart: hva overlever?']
			]),
			input('username', 'Eksempel på brukernavn', 'ada'),
			input('password', 'Eksempel på passord · ikke bruk ditt eget', 'EtLangtDemoPassord!')
		],
		tasks: [
			{
				title: 'Blir du innlogget når du registrerer deg?',
				hint: 'Sammenlign brukere.json med sessionlageret.',
				answer:
					'Nei. Registrering lagrer en bruker med passordhash. Innlogging kontrollerer passordet, regenererer sessionen og lagrer brukerId.'
			},
			{
				title: 'La cookien bli igjen i nettleseren',
				hint: 'Velg «Spør /meg uten cookie».',
				answer:
					'Requesten har ingen session-ID. /meg svarer 401 selv om en annen session fortsatt ligger på serveren. Ved ulike origins trengs credentials: "include" og riktig CORS-oppsett.'
			},
			{
				title: 'Start serveren på nytt',
				hint: 'Hvilken informasjon ligger på disk?',
				answer:
					'Brukere og passordhash ligger i brukere.json. Standard sessionlager ligger i minnet og tømmes. En gammel cookie gir derfor ikke en innlogget bruker etter omstart.'
			}
		],
		takeaway:
			'Registrering lagrer brukeren. Innlogging beviser identiteten. Cookien peker til sessionen, som inneholder brukerId. Meldingsrutene blir ikke automatisk beskyttet.',
		related: [{ href: '/sessions/', label: 'Grunnlag: cookie og session' }]
	},
	{
		number: 9,
		title: 'Hvem får endre meldingen?',
		question: 'Holder det å skjule sletteknappen?',
		category: 'Utvikling',
		intro:
			'Send requests som Ada, Noah eller en gjest. Backend må kontrollere både innlogging og eierskap, selv når en request sendes utenom nettsiden.',
		context:
			'Modellen bruker session → krevInnlogging → rute. Ada eier m1, Noah eier m2. Bruk ulike nettleserprofiler eller et privat vindu i den ekte øvelsen; to vanlige faner deler innlogging.',
		fields: [
			select('actor', 'Hvem sender?', [
				['ada', 'Ada · innlogget'],
				['noah', 'Noah · innlogget'],
				['guest', 'Gjest · ingen innlogging']
			]),
			select('method', 'HTTP-metode', [
				['PATCH', 'PATCH · endre'],
				['DELETE', 'DELETE · slette'],
				['POST', 'POST · opprette'],
				['GET', 'GET · lese alle']
			]),
			select('id', 'Melding ved PATCH / DELETE', [
				['m1', 'm1 · eies av Ada'],
				['m2', 'm2 · eies av Noah'],
				['ukjent', 'ukjent · finnes ikke']
			]),
			input('text', 'Meldingstekst', 'En oppdatert melding.', 'textarea'),
			select('forge', 'Forsøk å sende falsk eier i body', [
				['no', 'Send vanlig body'],
				['yes', 'Send eierId: "noah" og avsender: "Noah"']
			])
		],
		tasks: [
			{
				title: 'Prøv som gjest',
				hint: 'Sammenlign GET og POST.',
				answer:
					'Alle får lese med GET. En gjest får 401 på POST, PATCH og DELETE fordi krevInnlogging stopper requesten.'
			},
			{
				title: 'La Noah slette Adas melding',
				hint: 'Noah er logget inn, men eier ikke m1.',
				answer:
					'Innloggingen godtas, men eiersjekken gir 403. Ingen data slettes. En skjult knapp gir ingen slik beskyttelse på backend.'
			},
			{
				title: 'Forsøk å velge avsender selv',
				hint: 'Velg Ada, POST og falsk eier i body.',
				answer:
					'Backend bruker req.bruker.id og req.bruker.brukernavn. Falsk eierId og avsender i body ignoreres. Den nye meldingen tilhører Ada.'
			}
		],
		takeaway:
			'401: du er ikke innlogget. 403: du er innlogget, men mangler tilgang. 404: meldingen finnes ikke. Backend tar avgjørelsen før data endres.',
		related: [{ href: '/chatrom/', label: 'Bygg videre med chatrom' }]
	},
	{
		number: 10,
		title: 'Fra kode til kjørende tjeneste',
		question: 'Hva må skje før eleven ser endringen?',
		category: 'Driftsstøtte',
		intro:
			'Følg kildekode, frontendbygg og serverprosess hver for seg. Prøv publisering, omstart og en nettleser som peker til feil localhost.',
		context:
			'Dette er elevappens Express-oppsett fra øving 10, simulert uten å kontakte en server. IT-laben selv er SvelteKit med statisk adapter og Nginx. Velg frontendtype for å se riktig byggmappe.',
		fields: [
			select('scenario', 'Velg driftssituasjon', [
				['publish', 'Bygg og publiser ny frontend'],
				['source', 'Endre kildekode uten å bygge'],
				['restart', 'Start Node-prosessen på nytt'],
				['reboot', 'Start VM-en på nytt med systemd'],
				['localhost', 'Besøk fra en annen PC'],
				['backup', 'Ta og gjenopprett en backup']
			]),
			select('framework', 'Frontend i elevprosjektet', [
				['kit', 'SvelteKit · konfigurert adapter-static'],
				['vite', 'Svelte med Vite · App.svelte']
			])
		],
		tasks: [
			{
				title: 'Endre kode uten et nytt bygg',
				hint: 'Sammenlign kildekode og serverens public-mappe.',
				answer:
					'Nettleseren henter de publiserte filene. En endring i kildekoden blir synlig først etter nytt bygg og kopiering til serveren.'
			},
			{
				title: 'Sammenlign restart og omstart av VM',
				hint: 'Se på hva systemd gjør, og hva som skjer med data og sessions.',
				answer:
					'systemd starter tjenesten etter reboot når den er enabled. JSON-filene bevares. Sessions i minnet forsvinner når Node-prosessen stopper.'
			},
			{
				title: 'Finn riktig localhost',
				hint: 'Hvilken maskin kjører nettleseren på?',
				answer:
					'localhost peker til maskinen som gjør forespørselen. Fra elevens PC er det elevens PC, ikke serveren. Relative /meldinger-kall bruker samme origin som nettsiden.'
			}
		],
		takeaway:
			'Bygg frontend → publiser bare de offentlige filene → kjør backend som en tjeneste → sjekk logger og backup. data/ og .env skal være utenfor public/.',
		related: []
	}
];
