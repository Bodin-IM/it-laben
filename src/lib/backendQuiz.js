/**
 * Formativ repetisjon av de ti backend-øvingsarkene. Fasit er offentlig;
 * dette er øving, ikke en servervurdert fagsjekk eller en kilde til XP.
 * Kilder, avgrensninger og lærerbruk: docs/backend-oppsummering.md.
 * @typedef {{text:string, feedback:string}} Choice
 * @typedef {{id:string, exercise:number, title:string, prompt:string, code?:string,
 * hint:string, choices:Choice[], correct:number, pages:string}} Question
 * @typedef {{attempts:number[], revealed:boolean}} Answer
 * @typedef {Record<string, Answer>} Answers
 */

export const backendTopics = [
	{ number: 1, title: 'Server og ruter', href: '/backend/' },
	{ number: 2, title: 'Sende meldinger', href: '/backend/' },
	{ number: 3, title: 'Frontend og backend', href: '/backend/' },
	{ number: 4, title: 'Data og ID-er', href: '/backend/' },
	{ number: 5, title: 'Lagring i JSON-fil', href: '/oving-5/' },
	{ number: 6, title: 'CRUD', href: '/oving-6/' },
	{ number: 7, title: 'Validering og feil', href: '/oving-7/' },
	{ number: 8, title: 'Registrering og pålogging', href: '/oving-8/' },
	{ number: 9, title: 'Tilgangskontroll', href: '/oving-9/' },
	{ number: 10, title: 'Drift og publisering', href: '/oving-10/' }
];

/** @type {Question[]} */
export const backendQuestions = [
	{
		id: 'server-svar',
		exercise: 1,
		title: 'Hvor havner svaret?',
		pages: '1–2',
		prompt:
			'Ada besøker GET /info. «Gruppe 1» vises i serverterminalen, men forespørselen blir stående og vente. Hvilken endring sender gruppedataene tilbake til nettleseren?',
		code: 'app.get("/info", (req, res) => {\n  console.log({ gruppe: "Gruppe 1" });\n});',
		hint: 'Skill mellom å skrive til serverens terminal og å svare klienten som venter.',
		correct: 1,
		choices: [
			{
				text: 'Bytt linjen til return { gruppe: "Gruppe 1" };',
				feedback:
					'Et vanlig return avslutter funksjonen, men Express sender ikke returverdien som HTTP-svar. Bruk responsobjektet til å sende data.'
			},
			{
				text: 'Bytt linjen til res.json({ gruppe: "Gruppe 1" });',
				feedback:
					'res.json() sender gruppedataene som JSON i HTTP-svaret. console.log() skrev bare til terminalen på serveren.'
			},
			{
				text: 'Bytt linjen til req.body = { gruppe: "Gruppe 1" };',
				feedback:
					'req beskriver den innkommende forespørselen. Å sette req.body sender ikke et svar tilbake til klienten.'
			},
			{
				text: 'Bytt linjen til JSON.stringify({ gruppe: "Gruppe 1" });',
				feedback:
					'JSON.stringify() lager en tekststreng, men sender den ikke over nettverket. Klienten venter fortsatt på et HTTP-svar.'
			}
		]
	},
	{
		id: 'server-rute',
		exercise: 1,
		title: 'Riktig adresse til ruten',
		pages: '2',
		prompt:
			'Noahs backend kjører på 10.100.0.14 og lytter på 0.0.0.0, port 3000. Han har laget GET /gruppe. Hvilken adresse skal Ada på en annen maskin åpne for å bruke denne ruten?',
		hint: 'Adressen må identifisere både riktig maskin, riktig port og riktig rute.',
		correct: 3,
		choices: [
			{
				text: 'http://localhost:3000/gruppe',
				feedback:
					'localhost viser til Adas egen maskin når hun åpner adressen. Backend kjører på Noahs maskin.'
			},
			{
				text: 'http://10.100.0.14:3000/',
				feedback:
					'Maskin og port stemmer, men stien / velger forsideruten. Oppgaven gjelder ruten /gruppe.'
			},
			{
				text: 'http://0.0.0.0:3000/gruppe',
				feedback:
					'0.0.0.0 er lytteadressen i serveroppsettet. Ada trenger servermaskinens faktiske IP-adresse for å kontakte den over nettverket.'
			},
			{
				text: 'http://10.100.0.14:3000/gruppe',
				feedback:
					'IP-adressen velger Noahs maskin, port 3000 velger serveren, og /gruppe velger ruten. Nettleseren sender en GET når Ada åpner adressen.'
			}
		]
	},
	{
		id: 'melding-json',
		exercise: 2,
		title: 'JSON som ikke blir lest',
		pages: '2–3',
		prompt:
			'Klienten sender gyldig JSON med Content-Type: application/json. I POST-ruten er req.body likevel undefined. Hva retter feilen i dette oppsettet?',
		code: 'app.post("/meldinger", (req, res) => {\n  console.log(req.body);\n  res.json({ beskjed: "Mottatt" });\n});\napp.use(express.json());',
		hint: 'Se på rekkefølgen forespørselen møter middleware og ruter i.',
		correct: 0,
		choices: [
			{
				text: 'Flytt express.json() slik at den kjører før POST-ruten.',
				feedback:
					'express.json() må lese body før ruten bruker req.body. Express behandler middleware og ruter i rekkefølgen de er registrert.'
			},
			{
				text: 'Les req.params i stedet for req.body inne i POST-ruten.',
				feedback:
					'req.params inneholder navngitte deler av rutestien, for eksempel :id. JSON-feltene fra klienten hører til i req.body.'
			},
			{
				text: 'Bytt Content-Type fra application/json til text/plain.',
				feedback:
					'Klienten sender JSON, så application/json passer. text/plain får ikke express.json() til å lese JSON-data før ruten.'
			},
			{
				text: 'Bruk JSON.stringify(req.body) før du leser feltene.',
				feedback:
					'JSON.stringify() gjør eksisterende data om til tekst. Det leser ikke forespørselen og kan ikke hente tilbake en body som ennå ikke er tolket.'
			}
		]
	},
	{
		id: 'melding-mottaker',
		exercise: 2,
		title: 'Hvilken innboks?',
		pages: '1, 4',
		prompt:
			'Gruppe A sender en gåte med POST til gruppe B sin /meldinger. B svarer med 201 og en bekreftelse. Begge bruker serveren fra øving 2. Hva har skjedd?',
		hint: 'Et HTTP-svar og en ny POST til en innboks er to forskjellige handlinger.',
		correct: 2,
		choices: [
			{
				text: 'Gåten ligger hos A; B har bare bekreftet at adressen virker.',
				feedback:
					'POST-en ble sendt til B sin server. Ruten legger derfor gåten i B sitt array, ikke i A sitt.'
			},
			{
				text: 'Gåten ligger hos begge; 201 bekrefter at serverne er synkronisert.',
				feedback:
					'201 bekrefter opprettelse hos mottakeren. Øvingsserverne synkroniserer ikke innboksene automatisk.'
			},
			{
				text: 'Gåten ligger hos B; bekreftelsen er HTTP-svaret på A sin POST.',
				feedback:
					'B lagrer gåten i sin innboks og svarer på forespørselen. Hvis B vil sende en melding til A sin innboks, må B gjøre en ny POST til A.'
			},
			{
				text: 'Gåten ligger hos B; bekreftelsen er en ny melding i A sin innboks.',
				feedback:
					'Bekreftelsen returneres til klienten som sendte POST-en. Den blir ikke automatisk lagret gjennom A sin POST-rute.'
			}
		]
	},
	{
		id: 'frontend-localhost',
		exercise: 3,
		title: 'Virker bare på egen PC',
		pages: '2',
		prompt:
			'Svelte og Express kjører på maskin A. En medelev åpner Svelte-siden på maskin B, men klikk på Hent prøver å kontakte localhost:3000. Hvorfor?',
		hint: 'Hvor kjører JavaScript-funksjonen som blir kalt når medeleven klikker?',
		correct: 3,
		choices: [
			{
				text: 'Vite tolker localhost som maskin A og sender kallet til frontendporten.',
				feedback:
					'Dette fetch-kallet gjøres i nettleseren, ikke av Vite. En eksplisitt URL med port 3000 blir heller ikke automatisk sendt til frontendporten.'
			},
			{
				text: 'CORS oversetter localhost til maskinen som leverte Svelte-siden.',
				feedback:
					'CORS bestemmer om nettleseren får lese svar på tvers av originer. Det endrer ikke hvilken maskin URL-en peker til.'
			},
			{
				text: 'Express oppfatter localhost som maskin A fordi den kjører backend.',
				feedback:
					'URL-en tolkes hos klienten som sender forespørselen. Express på A får ikke dette kallet hvis nettleseren på B kontakter sin egen maskin.'
			},
			{
				text: 'Nettleseren på B kjører fetch og tolker localhost som maskin B.',
				feedback:
					'Klikkfunksjonen kjører hos den som besøker siden. API-adressen må derfor peke på backendmaskinens adresse når andre skal teste.'
			}
		]
	},
	{
		id: 'frontend-origin',
		exercise: 3,
		title: 'Hvilken origin skal tillates?',
		pages: '1–2',
		prompt:
			'Frontend åpnes på http://10.100.0.14:5173. API-et ligger på http://10.100.0.20:3000. Ada bruker en PC med IP 10.100.0.30. Hvilken origin må backend tillate for denne frontend-siden?',
		hint: 'Origin består av protokoll, vertsnavn og port i adressen til nettsiden.',
		correct: 1,
		choices: [
			{
				text: 'http://10.100.0.20:3000',
				feedback:
					'Dette er API-adressen. CORS må tillate origin til nettsiden som gjør kallet, som her har en annen IP og port.'
			},
			{
				text: 'http://10.100.0.14:5173',
				feedback:
					'Dette er frontendens origin i adressefeltet. Adas egen IP er ikke origin bare fordi hun bruker nettleseren der.'
			},
			{
				text: 'http://10.100.0.30:5173',
				feedback:
					'Adas PC kjører nettleseren, men siden er hentet fra 10.100.0.14:5173. CORS bruker sidens origin, ikke klientmaskinens IP.'
			},
			{
				text: 'http://10.100.0.14:3000',
				feedback:
					'IP-adressen til frontend stemmer, men porten er feil. Port er en del av origin, så 3000 og 5173 er forskjellige originer.'
			}
		]
	},
	{
		id: 'data-stabil-id',
		exercise: 4,
		title: 'Samme melding etter sortering',
		pages: '1',
		prompt:
			'To meldinger har samme avsender og tekst. Listen kan sorteres eller filtreres. Hvilken verdi bør frontend ta vare på for å kunne hente akkurat den valgte meldingen senere?',
		hint: 'Verdien må skille meldingene fra hverandre og være den samme når listen endres.',
		correct: 2,
		choices: [
			{
				text: 'Plassen meldingen har i arrayet når brukeren klikker.',
				feedback:
					'Arrayindeksen kan peke på en annen melding etter sortering, filtrering eller sletting. Den er ikke en stabil identitet.'
			},
			{
				text: 'Avsendernavnet som står på den valgte meldingen.',
				feedback:
					'En avsender kan ha flere meldinger. Navnet identifiserer derfor ikke akkurat denne meldingen.'
			},
			{
				text: 'ID-en backend ga meldingen da den ble opprettet.',
				feedback:
					'En unik og stabil ID følger meldingen selv om plasseringen endres. Den kan brukes i GET /meldinger/:id.'
			},
			{
				text: 'Meldingsteksten som vises ved siden av avsenderen.',
				feedback:
					'Flere meldinger kan ha lik tekst, og teksten kan senere redigeres. Den er derfor uegnet som stabil identifikator.'
			}
		]
	},
	{
		id: 'data-tomt-utvalg',
		exercise: 4,
		title: 'Tom liste eller manglende melding?',
		pages: '2–3',
		prompt:
			'Ingen meldinger har avsender «Ada», og ID-en «ukjent» finnes ikke. Hvilke svar gir rutene fra øving 4 på GET /meldinger?avsender=Ada og GET /meldinger/ukjent?',
		hint: 'Skill mellom å be om et utvalg og å be om én bestemt ressurs.',
		correct: 0,
		choices: [
			{
				text: 'Avsendersøket gir 200 med []; ID-oppslaget gir 404.',
				feedback:
					'Søket ble utført, men utvalget er tomt. ID-oppslaget ber om én bestemt melding som ikke finnes, og gir derfor 404.'
			},
			{
				text: 'Avsendersøket gir 404; ID-oppslaget gir 200 med [].',
				feedback:
					'Dette bytter om på rutene. filter() gir et tomt array ved ingen treff, mens en manglende bestemt ID håndteres med 404.'
			},
			{
				text: 'Begge gir 404 fordi ingen meldinger passer til søket.',
				feedback:
					'Et tomt søkeresultat er fortsatt et vellykket svar fra listeruten. I øvingen er det den manglende bestemte ID-en som gir 404.'
			},
			{
				text: 'Begge gir 200 med [] fordi ingen meldinger ble funnet.',
				feedback:
					'Listeruten returnerer et array, men ID-ruten returnerer ett objekt eller 404. Den bruker ikke [] for å si at ID-en mangler.'
			}
		]
	},
	{
		id: 'lagring-omstart',
		exercise: 5,
		title: 'Filen finnes, listen er tom',
		pages: '1, 3',
		prompt:
			'Meldingene blir skrevet riktig til meldinger.json, og filen har innhold etter omstart. GET returnerer likevel []. Serveren starter med let meldinger = []. Hva mangler?',
		hint: 'GET leser arrayet i minnet. Tenk på hvordan det arrayet får innhold ved oppstart.',
		correct: 1,
		choices: [
			{
				text: 'Frontend må sende alle tidligere meldinger på nytt etter hver omstart.',
				feedback:
					'De tidligere meldingene finnes allerede på disk. Å sende dem på nytt kan lage duplikater og løser ikke at serveren mangler innlesing.'
			},
			{
				text: 'Serveren må lese JSON-filen inn i meldinger ved oppstart.',
				feedback:
					'Lagring på disk fyller ikke minnet automatisk. let meldinger = lesListe("meldinger.json") gjenoppretter listen som GET-ruten bruker.'
			},
			{
				text: 'Serveren må bruke const i stedet for let for å beholde arrayet.',
				feedback:
					'const begrenser om variabelen kan tilordnes på nytt. Verken const eller let bevarer minnet når prosessen stopper.'
			},
			{
				text: 'GET-ruten må skrive det tomme arrayet til filen før den svarer.',
				feedback:
					'Da overskrives de lagrede meldingene med en tom liste. Serveren trenger å lese de eksisterende dataene før den bruker dem.'
			}
		]
	},
	{
		id: 'lagring-feil',
		exercise: 5,
		title: 'Hva om skrivingen feiler?',
		pages: '2–3',
		prompt:
			'En gyldig POST er klar, men lagreListe() kaster en feil fordi datafilen ikke kan skrives. Hvordan skal ruten fra øving 5 behandle dette?',
		hint: 'Klienten bør bare få en lagringsbekreftelse når lagringen faktisk har lykkes.',
		correct: 2,
		choices: [
			{
				text: 'Behold den nye listen i minnet og send 201, siden POST-en var gyldig.',
				feedback:
					'Gyldige data er ikke det samme som lagrede data. 201 ville bekreftet en endring som kan forsvinne ved omstart.'
			},
			{
				text: 'Behold den gamle listen og send 400, siden meldingen ikke ble lagret.',
				feedback:
					'Den gamle listen bør beholdes, men meldingen var gyldig. 400 ville feilaktig peke på klientens data som årsak.'
			},
			{
				text: 'Behold den gamle listen i minnet og send 500 med en feilmelding.',
				feedback:
					'Ruten oppdaterer først minnet etter vellykket lagring. Ved skrivefeil beholdes gammel liste, og 500 forteller at serveren ikke kunne fullføre.'
			},
			{
				text: 'Behold den nye listen i minnet og send 202, så vil filen bli oppdatert senere.',
				feedback:
					'202 lager ingen kø eller automatisk nytt lagringsforsøk. Denne ruten har ingen slik mekanisme, så den må melde skrivefeilen og beholde gammel liste.'
			}
		]
	},
	{
		id: 'crud-patch',
		exercise: 6,
		title: 'Rett teksten, behold meldingen',
		pages: '1–2',
		prompt:
			'Ada vil rette en skrivefeil i meldingen med ID abc. ID, avsender og opprettelsestidspunkt skal beholdes. Hvilken forespørsel passer til API-et i øving 6?',
		hint: 'Se etter metoden og ruten for å endre deler av en eksisterende melding.',
		correct: 3,
		choices: [
			{
				text: 'POST /meldinger med body { "tekst": "Rettet tekst" }',
				feedback:
					'POST-ruten oppretter en ny melding. Den retter ikke meldingen abc og vil i denne øvingen også kreve avsender.'
			},
			{
				text: 'PATCH /meldinger med body { "id": "abc", "tekst": "Rettet tekst" }',
				feedback:
					'Øvingens PATCH-rute leser ID fra /meldinger/:id. En ID i body erstatter ikke ruteparameteren.'
			},
			{
				text: 'PUT /meldinger/abc med body { "tekst": "Rettet tekst" }',
				feedback:
					'PUT kan brukes i andre API-er, men denne appen har en PATCH-rute for tekstendring. Det er API-ets faktiske ruter klienten må følge.'
			},
			{
				text: 'PATCH /meldinger/abc med body { "tekst": "Rettet tekst" }',
				feedback:
					'ID-en i stien velger meldingen. PATCH-ruten erstatter teksten, beholder de andre feltene og lagrer den oppdaterte listen.'
			}
		]
	},
	{
		id: 'crud-sletting',
		exercise: 6,
		title: 'Slettingen overlever ikke omstart',
		pages: '1–3',
		prompt:
			'DELETE fjerner meldingen fra backendens array og svarer 200. En ny GET bekrefter at den er borte. Etter omstart kommer den tilbake fra JSON-filen. Hvilken del mangler i DELETE-ruten?',
		hint: 'Sammenlign hva slettingen endret i minnet, med hva serveren leser ved oppstart.',
		correct: 0,
		choices: [
			{
				text: 'Lagre listen uten meldingen til fil før slettingen bekreftes.',
				feedback:
					'Sletting må også lagres. Ellers leser serveren den gamle listen fra disk ved neste oppstart, og meldingen kommer tilbake.'
			},
			{
				text: 'Hent meldingslisten en ekstra gang fra frontend etter sletting.',
				feedback:
					'En ny GET viste allerede at meldingen var borte i minnet. Flere hentinger endrer ikke den gamle JSON-filen på disk.'
			},
			{
				text: 'Bytt svarkoden fra 200 til 201 når slettingen er utført.',
				feedback:
					'Statuskoden skriver ikke data til fil. Dessuten betyr 201 opprettet, mens denne ruten sletter en eksisterende melding.'
			},
			{
				text: 'Fjern også meldingens HTML-element fra nettleserens visning.',
				feedback:
					'Visningen bestemmer ikke hvilke data serveren leser etter omstart. Problemet er at slettingen ikke ble lagret på disk.'
			}
		]
	},
	{
		id: 'validering-type',
		exercise: 7,
		title: 'Et tall i tekstfeltet',
		pages: '1, 3',
		prompt:
			'Frontend krever meldingstekst, men et API-verktøy sender { "tekst": 123 }. Hvilken kontroll bør backend gjøre før dataene brukes eller lagres?',
		hint: 'Kontrollen må tåle at klienten sender en annen datatype enn skjemaet forventer.',
		correct: 2,
		choices: [
			{
				text: 'Kall tekst.trim() først, og kontroller deretter om verdien er en streng.',
				feedback:
					'Et tall har ikke strengmetoden trim(). Typekontrollen må komme først, slik at ugyldige data gir en forståelig 400-feil i stedet for et krasj.'
			},
			{
				text: 'Godta verdien når Content-Type er JSON, siden formatet er kontrollert.',
				feedback:
					'Gyldig JSON kan inneholde tall, objekter og null. JSON-formatet garanterer ikke at feltet tekst er en streng som oppfyller reglene.'
			},
			{
				text: 'Kontroller strengtypen først, deretter tom tekst og tillatt lengde.',
				feedback:
					'Backend sjekker typeof før trim() og lengde. API-verktøy kan omgå frontend, så kontrollen må også skje på serveren før lagring.'
			},
			{
				text: 'Kontroller bare at feltet tekst finnes, siden frontend sjekker innholdet.',
				feedback:
					'At feltet finnes sier ikke at innholdet er gyldig. Forespørselen kan komme direkte fra et API-verktøy uten frontendens kontroller.'
			}
		]
	},
	{
		id: 'validering-fetch',
		exercise: 7,
		title: 'HTTP-feil som ikke havner i catch',
		pages: '3',
		prompt:
			'Backend avviser en melding med status 400 og JSON-feltet beskjed. fetch() ligger i try/catch, men frontend viser fortsatt «Sendt». Hva bør frontend gjøre?',
		hint: 'En mottatt HTTP-feil og en forespørsel uten nettverkskontakt håndteres forskjellig av fetch.',
		correct: 3,
		choices: [
			{
				text: 'Les svar.json() en gang til for å få fetch til å kaste HTTP-feilen.',
				feedback:
					'JSON-lesing kontrollerer ikke om statuskoden betyr suksess. Body skal dessuten normalt bare leses én gang.'
			},
			{
				text: 'Flytt bare «Sendt» etter fetch, siden await avviser alle 400-svar.',
				feedback:
					'fetch avviser ikke automatisk ved status 400. await kan gi et vanlig Response-objekt selv om serveren avviste handlingen.'
			},
			{
				text: 'Sjekk om svar finnes; et Response-objekt betyr at meldingen ble lagret.',
				feedback:
					'Et Response-objekt betyr at klienten mottok et svar. Også avviste handlinger kan ha et slikt svar med feilkode og forklaring.'
			},
			{
				text: 'Les JSON én gang, sjekk svar.ok, og vis beskjed når svaret er en feil.',
				feedback:
					'svar.ok skiller vellykkede HTTP-svar fra blant annet 400. Vis backendens beskjed og behold teksten i feltet, slik at eleven kan rette den.'
			}
		]
	},
	{
		id: 'innlogging-hash',
		exercise: 8,
		title: 'Samme passord, ulik hash',
		pages: '3–4',
		prompt:
			'Brukerfilen inneholder en bcrypt-hash. Noah lager en ny hash av innskrevet passord og sammenligner de to strengene. De er forskjellige selv med riktig passord. Hva bør han gjøre?',
		hint: 'bcrypt bruker salt. Tenk på forskjellen mellom å lage en hash og å kontrollere et passord mot en hash.',
		correct: 1,
		choices: [
			{
				text: 'Bruke samme faste salt for alle brukere, slik at hashstrengene kan sammenlignes.',
				feedback:
					'Nye salter forklarer hvorfor hashene kan bli forskjellige. Løsningen er å bruke bcrypt sin sammenligningsfunksjon, ikke å gi alle et felles salt.'
			},
			{
				text: 'Bruke bcrypt.compareSync(passord, bruker.passordHash) ved innlogging.',
				feedback:
					'bcrypt.compareSync() kontrollerer passordet mot den lagrede hashen med dens salt og innstillinger. To nygenererte hashstrenger trenger ikke være like.'
			},
			{
				text: 'Dekryptere den lagrede hashen og sammenligne resultatet med passordet.',
				feedback:
					'En passordhash er ikke kryptering som skal reverseres. Passordet kontrolleres mot hashen med bcrypt sin sammenligningsfunksjon.'
			},
			{
				text: 'Lagre en hash uten salt, slik at samme passord alltid gir samme tekst.',
				feedback:
					'Salt er en tilsiktet del av passordhashingen. Det skal beholdes; en egnet sammenligningsfunksjon håndterer kontrollen.'
			}
		]
	},
	{
		id: 'innlogging-omstart',
		exercise: 8,
		title: 'Brukeren finnes, innloggingen er borte',
		pages: '1, 5–6',
		prompt:
			'I øvingsoppsettet ligger brukere i JSON-fil og sesjoner i minnet. Etter omstart finnes Ada i brukerfilen, men GET /meg gir 401. Hva forklarer dette best?',
		hint: 'Registrert brukerkonto og aktiv innloggingssesjon lagres på forskjellige steder.',
		correct: 0,
		choices: [
			{
				text: 'Kontoen er bevart, men sesjonen er borte; Ada må logge inn på nytt.',
				feedback:
					'Brukerfilen overlever omstart, mens sesjonene i dette oppsettet forsvinner. En gammel cookie kan ikke gjenopprette serverens bortfalte sesjon.'
			},
			{
				text: 'Cookie betyr at sesjonen er bevart; /meg må hente passordet fra cookien.',
				feedback:
					'Sesjonscookien brukes til å knytte forespørselen til en sesjon på serveren. Den inneholder ikke passordet og erstatter ikke en slettet sesjon.'
			},
			{
				text: 'Kontoen er ugyldig etter omstart; Ada må registrere samme bruker på nytt.',
				feedback:
					'Kontoen ligger fortsatt i JSON-filen. Ny registrering er ikke nødvendig, og samme brukernavn vil normalt bli avvist som opptatt.'
			},
			{
				text: 'Hashet passord endres ved omstart; Ada må få laget et nytt passord.',
				feedback:
					'Den lagrede passordhashen blir ikke automatisk endret av omstart. Det er sesjonen i minnet som mangler.'
			}
		]
	},
	{
		id: 'tilgang-eier',
		exercise: 9,
		title: 'Hvem bestemmer eieren?',
		pages: '2–3',
		prompt:
			'Ada er innlogget, men sender POST /meldinger med eierId og avsender satt til Noah i JSON-body. Hvor skal backend hente meldingens eier og avsender i øving 9?',
		hint: 'Hvilken informasjonskilde er kontrollert av serveren, og hvilken kan klienten endre?',
		correct: 3,
		choices: [
			{
				text: 'Fra eierId og avsender i body, så lenge brukeren de peker til finnes.',
				feedback:
					'At Noah finnes gir ikke Ada rett til å sende som Noah. Body er klientstyrt og kan ikke brukes som bevis på innlogget identitet.'
			},
			{
				text: 'Fra brukernavnet som frontend viser ved siden av Logg ut-knappen.',
				feedback:
					'Visningen i frontend kan endres og er ikke en autoritativ identitet for backend. Serveren må bruke den kontrollerte innloggingen.'
			},
			{
				text: 'Fra eierId i body, men bare dersom CORS har tillatt frontendens origin.',
				feedback:
					'CORS er ikke kontroll av hvem brukeren er eller hva de eier. Også en tillatt frontend kan sende manipulert body.'
			},
			{
				text: 'Fra req.bruker, som backend har funnet ved hjelp av den kontrollerte sesjonen.',
				feedback:
					'krevInnlogging finner brukeren via sesjonen. Backend setter eierId og avsender fra denne brukeren og lar ikke klienten velge en annen identitet.'
			}
		]
	},
	{
		id: 'tilgang-direkte',
		exercise: 9,
		title: 'Skjult knapp, direkte forespørsel',
		pages: '2–3',
		prompt:
			'Ada er innlogget. Hun har ingen sletteknapp på Noahs melding, men sender DELETE til dens ID med et API-verktøy og sin egen gyldige sesjonscookie. Hva skal backend gjøre i øving 9?',
		hint: 'Ada er identifisert, men eier ikke meldingen. Vurder både kontrollsted og statuskode.',
		correct: 2,
		choices: [
			{
				text: 'Avvise med 401 fordi Ada ikke er innlogget som meldingens eier.',
				feedback:
					'Ada har gyldig innlogging. I denne appen brukes 403 når en innlogget bruker ikke har tillatelse, og 401 når gyldig innlogging mangler.'
			},
			{
				text: 'Slette med 200 fordi gyldig innlogging gir tilgang til DELETE-ruten.',
				feedback:
					'Innlogging alene gir ikke eierskap. Backend må også sammenligne meldingens eierId med den innloggede brukerens ID.'
			},
			{
				text: 'Avvise med 403 etter eierkontrollen og beholde meldingen uendret.',
				feedback:
					'Backend kontrollerer eierskap ved hver beskyttet endring. Ada er innlogget, men har ikke rett til å slette Noahs melding, så denne ruten gir 403.'
			},
			{
				text: 'Avvise med 404 fordi meldingen er skjult for Adas sletteknapp.',
				feedback:
					'Meldingen finnes og kan leses i denne appen. En skjult knapp gjør ikke ressursen ukjent; eierkontrollen gir 403 ved denne handlingen.'
			}
		]
	},
	{
		id: 'drift-bygg',
		exercise: 10,
		title: 'Ny kildekode, gammel nettside',
		pages: '1, 3',
		prompt:
			'I oppsettet fra øving 10 leverer Express frontendbygget fra public. Du endrer Svelte-kildekoden, men brukerne får fortsatt gammel side. Hva må du gjøre for å publisere endringen?',
		hint: 'Skill mellom kildefilen du redigerer og filene Express faktisk sender til nettleseren.',
		correct: 0,
		choices: [
			{
				text: 'Bygg frontend på nytt og erstatt byggefiler i public med det nye bygget.',
				feedback:
					'Express leverer de ferdigbygde filene. Kildeendringen blir synlig når et nytt frontendbygg legges i public. Behold data og .env utenfor denne utskiftingen.'
			},
			{
				text: 'Start Node-tjenesten på nytt, slik at Express kompilerer Svelte-koden.',
				feedback:
					'Express kompilerer ikke Svelte-kildekoden ved omstart. Med de samme gamle filene i public vil serveren fortsatt levere det gamle bygget.'
			},
			{
				text: 'Kopier den endrede Svelte-kildefilen til public ved siden av index.html.',
				feedback:
					'En rå Svelte-fil erstatter ikke JavaScript- og CSS-filene fra bygget. Frontend må bygges, og de ferdige filene må oppdateres.'
			},
			{
				text: 'Kjør npm ci i backendmappen for å oppdatere filene som nettleseren får.',
				feedback:
					'npm ci installerer avhengigheter fra låsefilen. Det bygger og publiserer ikke automatisk Svelte-endringen i public.'
			}
		]
	},
	{
		id: 'drift-tjeneste',
		exercise: 10,
		title: 'Tilgjengelig etter omstart',
		pages: '3–4',
		prompt:
			'Appen virker når node server.js kjøres manuelt. Målet er at den starter automatisk etter omstart av Ubuntu-serveren. Hvilken løsning følger øving 10?',
		hint: 'Tenk på hva som skal starte prosessen når ingen har en terminal åpen.',
		correct: 1,
		choices: [
			{
				text: 'Opprett tjenesten og kjør systemctl start, så er automatisk oppstart også aktivert.',
				feedback:
					'start starter tjenesten nå. Tjenesten må i tillegg aktiveres for oppstart, slik øvingen gjør med enable --now.'
			},
			{
				text: 'Sett opp og aktiver systemd-tjenesten, og test at den kommer opp etter omstart.',
				feedback:
					'En aktivert systemd-tjeneste kan starte appen ved oppstart med riktig bruker, mappe og miljø. Stopp den manuelle prosessen først, og verifiser med status, logger og en klienttest.'
			},
			{
				text: 'Sett Restart=on-failure i tjenesten, så trengs ingen aktivering ved oppstart.',
				feedback:
					'Restart=on-failure håndterer feil i en startet tjeneste. Det erstatter ikke aktivering som får tjenesten startet når maskinen starter.'
			},
			{
				text: 'Legg tjenestefilen på plass og kjør daemon-reload, så starter appen automatisk.',
				feedback:
					'daemon-reload får systemd til å lese tjenestedefinisjonene på nytt. Det starter eller aktiverer ikke tjenesten alene.'
			}
		]
	}
];

/** @param {Question} question @param {Answer|undefined} answer */
export function isResolved(question, answer) {
	return Boolean(answer?.revealed || answer?.attempts.at(-1) === question.correct);
}

/** @param {Answers} answers @param {string} id @param {number} choice @returns {Answers} */
export function answerQuestion(answers, id, choice) {
	const question = backendQuestions.find((item) => item.id === id);
	if (!question || !Number.isInteger(choice) || !question.choices[choice]) return answers;
	const previous = answers[id];
	if (isResolved(question, previous) || previous?.attempts.at(-1) === choice) return answers;
	return {
		...answers,
		[id]: { attempts: [...(previous?.attempts ?? []), choice], revealed: false }
	};
}

/** @param {Answers} answers @param {string} id @returns {Answers} */
export function revealQuestion(answers, id) {
	const question = backendQuestions.find((item) => item.id === id);
	if (!question || isResolved(question, answers[id])) return answers;
	return { ...answers, [id]: { attempts: answers[id]?.attempts ?? [], revealed: true } };
}

/** @param {Answers} answers @param {Question[]} questions */
export function quizSummary(answers, questions = backendQuestions) {
	const first = questions.filter((q) => answers[q.id]?.attempts[0] === q.correct).length;
	const improved = questions.filter((q) => {
		const a = answers[q.id];
		return a && !a.revealed && a.attempts.length > 1 && a.attempts.at(-1) === q.correct;
	}).length;
	const revealed = questions.filter((q) => answers[q.id]?.revealed).length;
	return { first, improved, revealed, remaining: questions.length - first - improved - revealed };
}
