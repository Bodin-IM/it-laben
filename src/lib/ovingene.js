// Øvingsarkene er kilden. Alle forsøk kjøres lokalt som undervisningsmodeller.
import { validationTransfer } from '#lib/backendValidation.js';
import { backendProjectGuides } from '#lib/backendProjectGuides.js';
/** @typedef {{value: string, label: string}} Choice */
/** @typedef {{key: string, label: string, kind: string, value: string, choices?: Choice[]}} Field */
/** @typedef {{title: string, label: string, instruction: string, observe: string, hint: string, answer: string, start: Record<string,string>}} Task */
/** @typedef {{title: string, code: string, explanation: string}} Example */
/** @typedef {{instruction: string, check: string, guide?:import("./backendProjectGuides.js").ProjectGuide}} Transfer */
/** @typedef {{number: number, title: string, question: string, intro: string, category: string, fields: Field[], tasks: Task[], firstTask?:number, example: Example, transfer: Transfer, takeaway: string, context: string, related: {href: string, label: string}[]}} Lesson */
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
		example: {
			title: 'Bekreft først etter lagring',
			code: 'const nyListe = [...meldinger, melding];\nlagreListe("meldinger.json", nyListe);\nmeldinger = nyListe;\nres.status(201).json(melding);',
			explanation: 'Utdrag fra ruten: Den nye listen lagres før den erstatter minnet og serveren svarer. I forsøket åpner vi lagreListe og følger filskrivingen.'
		},
		transfer: {
			guide: backendProjectGuides[5],
			instruction: 'Lagre chatmeldingene i en JSON-fil i eget prosjekt. La en mislykket lagring beholde den gamle listen i minnet.',
			check: 'Send en melding, start backend på nytt og hent listen. Prøv deretter en kontrollert skrivefeil i testmiljøet: ingen ny melding skal vises som lagret.'
		},
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
				label: 'Følg lagringen',
				start: { scenario: 'save' },
				instruction: 'Skriv en melding og kjør «Lagre en melding». Gå stegvis gjennom koden og finn når meldingen kommer i den varige filen.',
				observe: 'Når endres filen, når endres minnet, og når får nettleseren svar?',
				hint: 'Sammenlign nyListe, .tmp-filen og meldinger.json.',
				answer:
					'writeFileSync skriver først til .tmp. renameSync erstatter den egentlige filen. Deretter oppdateres minnet, og til slutt sendes 201.'
			},
			{
				title: 'Undersøk en feil ved lagring',
				label: 'Lagringsfeil',
				start: { scenario: 'fail' },
				instruction: 'Velg «Skrivingen feiler» og kjør. Følg hva som skjer med meldingen når serveren ikke får lagret filen.',
				observe: 'Sammenlign serverens svar, listen i minnet og datafilen med det vellykkede forsøket.',
				hint: 'Velg «Skrivingen feiler». Følg minnet helt til siste steg.',
				answer:
					'Serveren svarer 500. Den gamle listen og den gamle datafilen beholdes. meldinger = nyListe kjøres aldri.'
			},
			{
				title: 'Sammenlign manglende og ødelagt fil',
				label: 'Oppstart',
				start: { scenario: 'missing' },
				instruction: 'Kjør først «Filen finnes ikke», deretter «Filen har ugyldig JSON». Undersøk hvorfor oppstarten håndterer dem forskjellig.',
				observe: 'Hvilket forsøk får en tom liste, og hvilket stopper oppstarten for å beskytte dataene?',
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
		example: {
			title: 'Finn meldingen med ID',
			code: 'const nyListe = meldinger.map((melding) =>\n  melding.id === req.params.id\n    ? { ...melding, tekst }\n    : melding\n);',
			explanation: 'map går gjennom listen. Bare meldingen med ID-en fra adressen får ny tekst; de andre beholdes. Forsøket viser også lagringen og oppdateringen i nettleseren.'
		},
		transfer: {
			guide: backendProjectGuides[6],
			instruction: 'Legg til endring og sletting med meldings-ID i din egen chat. Hent listen på nytt etter en vellykket endring.',
			check: 'Lag to meldinger med samme tekst. Endre bare den ene, og slett deretter en ukjent ID. Forklar hvorfor tekst eller plass i listen ikke er en trygg ID.'
		},
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
				label: 'Endre',
				start: { method: 'PATCH', id: 'm2', disk: 'ok' },
				instruction: 'Velg PATCH, finn Noahs meldings-ID og skriv en ny tekst. Kjør og følg oppdateringen helt tilbake til nettleseren.',
				observe: 'Adas melding skal være uendret. Noahs melding skal ha ny tekst, men samme ID og avsender.',
				hint: 'Velg m2. Sammenlign ID, avsender og opprettet før og etter.',
				answer:
					'map lager en ny liste. Bare objektet med riktig ID erstattes. Spredningssyntaksen kopierer de andre egenskapene.'
			},
			{
				title: 'Slett en ID som ikke finnes',
				label: 'Slette',
				start: { method: 'DELETE', id: 'ukjent', disk: 'ok' },
				instruction: 'Velg DELETE og en ukjent ID. Kjør og finn hvor requesten stopper.',
				observe: 'Hvilket svar får nettleseren? Ble noen av de eksisterende meldingene endret?',
				hint: 'Velg DELETE og ukjent.',
				answer:
					'Du får 404 før lagring. Å slette samme ID én gang til i den ekte appen gir også 404.'
			},
			{
				title: 'Stopp før siste GET',
				label: 'Oppdater visningen',
				start: { method: 'PATCH', id: 'm2', disk: 'ok' },
				instruction: 'Kjør en vellykket endring av en melding. Stopp rett etter svaret fra backend, og gå så videre til siste GET.',
				observe: 'Sammenlign serverens liste med nettleserens liste før og etter GET.',
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
		firstTask: 3,
		title: 'Stopp feil før de lagres',
		question: 'Hvor skal en ugyldig request stoppe?',
		category: 'Utvikling',
		intro:
			'Send gyldig og ugyldig JSON gjennom Express. Følg forskjellen på en feil i JSON, en ugyldig verdi og en server som ikke svarer.',
		context:
			'POST /meldinger med express.json({ limit: "10kb" }), tekstFeil og felles feilmiddleware. Koden viser de relevante delene av requestkjeden.',
		example: {
			title: 'Sjekk typen før du bruker teksten',
			code: 'if (typeof tekst !== "string") {\n  return "Tekst må være en streng";\n}\nif (!tekst.trim()) {\n  return "Tekst kan ikke være tom";\n}',
			explanation: 'Utdrag fra valideringen: Et tall har ingen trim-metode. Rekkefølgen gjør at ugyldig innhold kan avvises kontrollert, før det når lagringen.'
		},
		transfer: validationTransfer,
		fields: [
			select('scenario', 'Prøv en feiltype', [
				['custom', 'Bruk JSON-feltet nedenfor'],
				['empty', 'Bare mellomrom'],
				['blank', 'Tom tekst'],
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
				label: 'Grensetester',
				start: { scenario: '500' },
				instruction: 'Kjør ett forsøk med 500 tegn og ett med 501. Finn kontrollen som avgjør om meldingen kan lagres.',
				observe: 'Sammenlign HTTP-status og serverlisten. Hvilken side av grensen godtas?',
				hint: 'Kjør både 500 og 501 tegn.',
				answer:
					'500 godtas, 501 avvises med 400. JavaScripts length teller UTF-16-kodeenheter, så enkelte emoji teller som to.'
			},
			{
				title: 'Send et tall som tekst',
				label: 'Datatype',
				start: { scenario: 'number' },
				instruction: 'Velg «tekst er tallet 123» og kjør. Følg valideringen og finn hvorfor koden sjekker typen før den bruker trim.',
				observe: 'Requesten skal avvises kontrollert, og serverlisten skal være uendret.',
				hint: 'Hvorfor kommer typeof før trim?',
				answer:
					'Tallet 123 har ingen trim-metode. En typesjekk først gir en kontrollert 400-feil i stedet for et krasj.'
			},
			{
				title: 'Sammenlign 400 og avslått backend',
				label: 'Feilsvar',
				start: { scenario: 'blank' },
				instruction: 'Kjør «Tom tekst» og deretter «Backend er avslått». Undersøk hva frontend mottar i de to forsøkene.',
				observe: 'Hvilket forsøk gir et HTTP-svar, og hvilket går direkte til catch uten et svar?',
				hint: 'Se på svaret og frontend-koden.',
				answer:
					'fetch gir et Response-objekt ved HTTP 400; du må sjekke svar.ok. Ved nettverksfeil blir promise avvist, og catch håndterer feilen uten en HTTP-status.'
			},
			{
				title: 'Hvorfor er mellomrom ikke en melding?',
				label: 'Mellomrom',
				start: { scenario: 'empty' },
				instruction: 'Velg «Bare mellomrom». Forutsi om listen vil endres, og kjør steg for steg. Sammenlign deretter med vanlig tekst i JSON-feltet.',
				observe: 'Se lengden før og etter trim, HTTP-svaret og om minnet og filen endres.',
				hint: 'En streng med tre mellomrom har lengde 3. Hva blir lengden etter trim?',
				answer: 'Etter trim er strengen tom. Kontrollen gir HTTP 400 og return stopper ruten før lagring. En vanlig melding skal fortsatt kunne lagres med 201.'
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
		example: {
			title: 'Sessionen knytter requesten til en bruker',
			code: 'const brukerId = req.session.brukerId;\nif (!brukerId) {\n  return res.status(401).json({ feil: "Ikke innlogget" });\n}',
			explanation: 'Cookie-ID-en brukes av session-middleware til å finne req.session. Selve innloggingen må ha kontrollert passordet og lagt brukerId i sessionen først.'
		},
		transfer: {
			guide: backendProjectGuides[8],
			instruction: 'Koble registrering, innlogging, /meg og utlogging sammen i egen app med eksempelbrukere.',
			check: 'Prøv /meg før innlogging, etter innlogging og etter utlogging. Undersøk deretter hva som skjer etter omstart. Forklar hvor brukeren, sessionen og cookien finnes.'
		},
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
				title: 'Sammenlign registrering og innlogging',
				label: 'Bruker og session',
				start: { scenario: 'register' },
				instruction: 'Kjør «Registrer en ny bruker» og deretter «Logg inn med riktig passord». Sammenlign hva de to handlingene oppretter.',
				observe: 'Se på brukere.json, sessionlageret og cookien. En registrert bruker er ikke automatisk innlogget.',
				hint: 'Sammenlign brukere.json med sessionlageret.',
				answer:
					'Nei. Registrering lagrer en bruker med passordhash. Innlogging kontrollerer passordet, regenererer sessionen og lagrer brukerId.'
			},
			{
				title: 'Sammenlign med og uten cookie',
				label: 'Cookie',
				start: { scenario: 'meg' },
				instruction: 'Sammenlign «Spør /meg med cookie» og «Spør /meg uten cookie». Finn hvordan backend kobler requesten til riktig session.',
				observe: 'Hvorfor kan serveren ha en gyldig session, men likevel svare 401 på en request?',
				hint: 'Velg «Spør /meg uten cookie».',
				answer:
					'Requesten har ingen session-ID. /meg svarer 401 selv om en annen session fortsatt ligger på serveren. Ved ulike origins trengs credentials: "include" og riktig CORS-oppsett.'
			},
			{
				title: 'Start serveren på nytt',
				label: 'Omstart',
				start: { scenario: 'restart' },
				instruction: 'Velg «Omstart: hva overlever?» og kjør. Undersøk hva som finnes igjen når serverprosessen starter på nytt.',
				observe: 'Sammenlign brukeren på disk, sessionen i minnet og den gamle cookien.',
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
		example: {
			title: 'Innlogging og eierskap er to kontroller',
			code: 'if (melding.eierId !== req.bruker.id) {\n  return res.status(403).json({ feil: "Ikke din melding" });\n}\n// Først nå kan meldingen endres eller slettes.',
			explanation: 'Her er brukeren allerede innlogget og meldingen funnet. Backend må likevel undersøke eierskap før data endres. Å skjule en knapp i frontend gir ikke denne beskyttelsen.'
		},
		transfer: {
			guide: backendProjectGuides[9],
			instruction: 'Beskytt endring og sletting i egen chat. Hent identiteten fra sessionen på serveren, og kontroller hvem som eier meldingen.',
			check: 'Prøv med eier, en annen innlogget bruker og en gjest. Send også en request utenom knappene i nettsiden. Sjekk både svaret og at avviste forsøk lar data være uendret.'
		},
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
				label: 'Innlogging',
				start: { actor: 'guest', method: 'GET' },
				instruction: 'Velg gjest som avsender. Kjør først GET, deretter POST, og undersøk hvor de to requestene slipper gjennom eller stopper.',
				observe: 'Kan en gjest lese? Kan samme gjest opprette en melding? Finn kontrollen som avgjør dette.',
				hint: 'Sammenlign GET og POST.',
				answer:
					'Alle får lese med GET. En gjest får 401 på POST, PATCH og DELETE fordi krevInnlogging stopper requesten.'
			},
			{
				title: 'La Noah slette Adas melding',
				label: 'Eierskap',
				start: { actor: 'noah', method: 'DELETE', id: 'm1' },
				instruction: 'Velg Noah, DELETE og Adas meldings-ID. Kjør og undersøk om innlogging alene gir lov til å slette.',
				observe: 'Se forskjellen på å være innlogget og å eie meldingen. Adas melding skal fortsatt finnes.',
				hint: 'Noah er logget inn, men eier ikke m1.',
				answer:
					'Innloggingen godtas, men eiersjekken gir 403. Ingen data slettes. En skjult knapp gir ingen slik beskyttelse på backend.'
			},
			{
				title: 'Forsøk å velge avsender selv',
				label: 'Falsk avsender',
				start: { actor: 'ada', method: 'POST', forge: 'yes' },
				instruction: 'Velg Ada og POST. Send falsk eier i body og følg hvilken identitet backend bruker når meldingen opprettes.',
				observe: 'Sammenlign avsenderen i request-body med eieren av den lagrede meldingen.',
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
		example: {
			title: 'Serveren leverer publiserte filer',
			code: 'app.get("/meldinger", (req, res) => {\n  res.json(meldinger);\n});\napp.use(express.static("public"));',
			explanation: 'Express svarer på API-kall og leverer frontendfilene fra public. En endring i frontendens kildekode kommer ikke hit før du bygger og publiserer filene.'
		},
		transfer: {
			guide: backendProjectGuides[10],
			instruction: 'Publiser egen app i lærerens avtalte testmiljø. Dokumenter bygging, publisering, oppstart som tjeneste og plasseringen av data og hemmeligheter.',
			check: 'Åpne appen fra en annen PC, prøv en endring og kontroller tjenesten etter omstart. Gjenopprett en backup i testmiljøet og forklar hvilke data som bevares.'
		},
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
				label: 'Publisering',
				start: { scenario: 'source' },
				instruction: 'Velg «Endre kildekode uten å bygge» og kjør. Sammenlign deretter med «Bygg og publiser ny frontend».',
				observe: 'Når blir endringen synlig for nettleseren? Følg kildekoden, byggmappen og public hver for seg.',
				hint: 'Sammenlign kildekode og serverens public-mappe.',
				answer:
					'Nettleseren henter de publiserte filene. En endring i kildekoden blir synlig først etter nytt bygg og kopiering til serveren.'
			},
			{
				title: 'Sammenlign restart og omstart av VM',
				label: 'Omstart',
				start: { scenario: 'restart' },
				instruction: 'Kjør «Start Node-prosessen på nytt» og «Start VM-en på nytt med systemd». Finn hvem som starter tjenesten, og hvilke data som overlever.',
				observe: 'Se forskjellen på JSON-filer på disk, sessions i minnet og tjenestens kjørestatus.',
				hint: 'Se på hva systemd gjør, og hva som skjer med data og sessions.',
				answer:
					'systemd starter tjenesten etter reboot når den er enabled. JSON-filene bevares. Sessions i minnet forsvinner når Node-prosessen stopper.'
			},
			{
				title: 'Finn riktig localhost',
				label: 'Fra en annen PC',
				start: { scenario: 'localhost' },
				instruction: 'Velg «Besøk fra en annen PC» og kjør. Følg hvilken maskin nettleseren prøver å kontakte.',
				observe: 'Hva betyr localhost på elevens PC, og hvor går et relativt kall til /meldinger?',
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

/** Start values for an explicit new attempt; never mutate the catalogue or saved progress.
 * @param {Lesson} lesson
 * @param {number} [taskIndex]
 * @returns {Record<string,string>}
 */
export function taskStartValues(lesson, taskIndex = lesson.firstTask ?? 0) {
	const task = lesson.tasks[taskIndex];
	if (!task) throw new RangeError('Ukjent oppgave i øvingen.');
	return { ...Object.fromEntries(lesson.fields.map((field) => [field.key, field.value])), ...task.start };
}
