/** Private question banks. Never import this module in frontend code.
 * Add variants here; keep source IDs stable so the next attempt can vary.
 */
function question(id, prompt, correct, wrongA, wrongB, explanation) {
	return {
		id,
		prompt,
		explanation,
		choices: [
			{ label: correct, correct: true },
			{ label: wrongA, correct: false },
			{ label: wrongB, correct: false }
		]
	};
}

export const assessmentBanks = {
	'frontend-backend': {
		questions: [
			question(
				'original',
				'Ada har sendt meldingen, og backend har lagret den. Noahs liste er fortsatt gammel. Hva må skje?',
				'Noahs nettleser må hente meldingene med GET og oppdatere listen sin.',
				'Ada må sende samme melding med POST én gang til.',
				'En lagret melding dukker automatisk opp i alle nettlesere.',
				'POST endrer data på serveren. Noah må også hente de nye dataene og vise dem i sin egen nettleser.'
			),
			question(
				'request',
				'Frontend endrer en lokal liste, men sender ingen request. Hva vet backend om endringen?',
				'Backend vet ikke om endringen før den får relevant informasjon i en request.',
				'Backend ser endringen fordi frontend og backend tilhører samme nettsted.',
				'Backend henter automatisk alle variablene i nettleseren med GET.',
				'Nettleserens minne og serverens minne er separate. En lokal endring blir ikke automatisk sendt til serveren.'
			),
			question(
				'response',
				'En POST-request blir avvist med 400. Hva bør frontend gjøre før den viser meldingen som lagret?',
				'Kontrollere svaret og vise feilen i stedet for å bekrefte lagring.',
				'Legge meldingen i alle brukeres lister og regne svaret som suksess.',
				'Bytte teksten på sendeknappen; da er dataene lagret på serveren.',
				'En sendt request er ikke det samme som en vellykket lagring. Frontend må håndtere serverens svar.'
			)
		]
	},
	chatrom: {
		questions: [
			question(
				'original',
				'Noah bytter fra Generelt til Gaming. Hva må forespørselen som henter meldinger fortelle backend?',
				'Hvilket rom Noah vil hente meldinger fra.',
				'Hvilken farge romknappen har.',
				'Ingenting. Backend leser den valgte knappen i nettleseren.',
				'Valgt rom må følge forespørselen, for eksempel som en del av URL-en. Backend bruker dette til å velge riktig innhold.'
			),
			question(
				'filter',
				'Backend har meldinger fra flere rom. Noah ber om Gaming. Hvilke meldinger bør svaret inneholde?',
				'Meldinger som tilhører Gaming, etter filtrering på backend.',
				'Alle meldinger; romnavnet i overskriften skjuler resten automatisk.',
				'Bare Noahs egne meldinger, uavhengig av rom.',
				'Romvalg og avsender er ulike ting. Backend skal hente meldinger for rommet forespørselen gjelder.'
			),
			question(
				'delete',
				'Noah kjenner ID-en til en av Adas meldinger. Er ID-en alene nok til å få slette den?',
				'Nei. Backend må også kontrollere innlogging og tillatelse før sletting.',
				'Ja. En kjent meldings-ID fungerer som tillatelse til å slette.',
				'Ja, dersom Noah først velger samme rom som Ada.',
				'En ID velger ressursen. Den beviser ikke at brukeren har lov til å endre eller slette den.'
			)
		]
	},
	fillagring: {
		questions: [
			question(
				'original',
				'En melding finnes bare i en variabel i Node-prosessen. Hva skjer når prosessen stoppes og startes på nytt?',
				'Meldingen er borte fra prosessens minne og må hentes fra varig lagring hvis den skal tilbake.',
				'Nettleserens cookie gjenoppretter automatisk alle meldingene.',
				'Variabelen blir automatisk en fil på disk.',
				'Prosessens minne forsvinner ved omstart. Data som skal overleve må lagres varig og leses inn igjen.'
			),
			question(
				'load',
				'Meldingene finnes i en JSON-fil etter omstart, men nettleseren viser en tom liste. Hva må backend gjøre for å kunne levere de lagrede meldingene?',
				'Lese og tolke filen, og bruke de innleste dataene når den behandler forespørselen.',
				'Gi filen navnet på nettleserens cookie.',
				'Starte nettleseren på nytt uten å lese filen.',
				'En fil på disk fyller ikke en variabel automatisk. Programmet må lese og behandle innholdet.'
			),
			question(
				'durable',
				'Serveren svarer at meldingen er lagret, men filskrivingen har ennå ikke lykkes. Hva er problemet?',
				'Klienten får bekreftet varig lagring som serveren ennå ikke har sikret.',
				'Ingen ting; et HTTP-svar skriver automatisk data til disk.',
				'Problemet ligger bare i fargen på meldingen i frontend.',
				'Suksessvaret bør stemme med det som faktisk er utført. Prosessminne alene gir ikke varig lagring.'
			)
		]
	},
	sessions: {
		questions: [
			question(
				'original',
				'I en vanlig innlogging med serverlagret session, hvor finner backend hvilken bruker en gyldig session tilhører?',
				'I serverens session-data, ved hjelp av session-identifikatoren fra cookien.',
				'I et valgfritt avsendernavn som klienten sender i body.',
				'I teksten på innloggingsknappen.',
				'Cookien identifiserer en session. Backend slår den opp og bruker identiteten som er knyttet til sessionen på serveren.'
			),
			question(
				'forged-user',
				'Klienten sender body.avsenderId med en annen brukers ID. Hvor bør en innlogget meldingsrute hente den betrodde avsenderen?',
				'Fra den gyldige sessionen på serveren.',
				'Fra body.avsenderId, siden klienten velger meldingen.',
				'Fra den siste brukeren som logget inn på hele serveren.',
				'Klienten kan endre body. Identiteten må komme fra en serverkontrollert innlogging.'
			),
			question(
				'missing-cookie',
				'En gyldig session-cookie finnes i nettleseren, men følger ikke en beskyttet request. Hva kan backend slutte?',
				'Denne requesten kan ikke knyttes til sessionen bare fordi cookien finnes lokalt.',
				'Brukeren må være innlogget i alle requests fra samme subnett.',
				'Et synlig brukernavn på nettsiden erstatter cookien.',
				'Det er informasjonen i den konkrete forespørselen backend kan kontrollere. En lokal cookie må faktisk sendes med.'
			)
		]
	},
	'oving-5': {
		questions: [
			question(
				'original',
				'Du lager neste versjon av meldingslisten, men skrivingen til fil feiler. Hva bør skje med den aktive listen i minnet?',
				'Behold den gamle listen, og fortell klienten at lagringen feilet.',
				'Bytt til den nye listen og svar at alt er lagret.',
				'Tøm listen for å gjøre plass til et nytt forsøk.',
				'Når lagringen feiler, skal vi ikke late som endringen er varig. Den aktive listen beholdes og klienten får en feil.'
			),
			question(
				'order',
				'Du vil lagre en ny versjon av meldingslisten. Hvilken rekkefølge hindrer at aktivt minne påstår noe annet enn den varige filen ved skrivefeil?',
				'Bygg neste liste, lagre den vellykket, og bytt deretter aktiv liste i minnet.',
				'Bytt aktiv liste, svar suksess og forsøk å lagre senere.',
				'Tøm først den aktive listen, og hopp over lagring ved feil.',
				'Hold den aktive listen urørt til filskrivingen er bekreftet. Da kan en skrivefeil håndteres uten en falsk aktiv endring.'
			),
			question(
				'broken-json',
				'En eksisterende meldingsfil inneholder ødelagt JSON. Hvorfor bør du skille dette fra at filen mangler?',
				'Filen kan inneholde data som må undersøkes; å behandle den som en ny tom fil kan skjule datatap.',
				'Ødelagt JSON betyr alltid at det aldri har vært lagret meldinger.',
				'Begge tilfeller bør uten videre overskrive filen med en tom liste.',
				'Manglende fil og ugyldig innhold er forskjellige feiltilstander. Behandle eksisterende data med omtanke.'
			)
		]
	},
	'oving-6': {
		questions: [
			question(
				'original',
				'En DELETE-request peker på en meldings-ID som ikke finnes. Hva er riktig oppførsel i øvingen?',
				'Svar at meldingen ikke finnes, og behold de andre meldingene.',
				'Slett siste melding i listen i stedet.',
				'Slett alle meldingene, siden ID-en ikke kunne finnes.',
				'En ukjent ID gir 404 i øvingen. Ingen andre meldinger skal endres eller slettes.'
			),
			question(
				'patch',
				'En PATCH-request gjelder én bestemt meldings-ID. Hvilken melding skal oppdateres?',
				'Meldingen som har denne ID-en, etter nødvendig kontroll.',
				'Meldingen som akkurat nå ligger på samme indeks som tallet i ID-en.',
				'Alle meldinger som inneholder samme ord i teksten.',
				'En stabil ID velger ressursen. Plasseringen i en liste kan endre seg og er ikke den samme som ID-en.'
			),
			question(
				'refresh',
				'Backend har slettet meldingen, men klientens gamle liste vises fortsatt. Hva trengs for at visningen skal stemme?',
				'Klienten må oppdatere visningsdataene, for eksempel ved å hente den nye listen med GET.',
				'Det holder at backend har endret sin egen liste; skjermen endres av seg selv.',
				'Klienten må slette alle meldinger for å være sikker.',
				'Backendens data og frontendens lokale visning må holdes i samsvar. I øvingen hentes listen på nytt.'
			)
		]
	},
	'oving-7': {
		questions: [
			question(
				'original',
				'Klienten sender ødelagt JSON med Content-Type: application/json. Hvor bør dette oppdages i Express-oppsettet?',
				'I JSON-parseren før den vanlige rutekoden behandler body.',
				'Etter at meldingen er lagt til i filen.',
				'Bare i nettleseren; backend skal godta all tekst.',
				'JSON-parseren oppdager ugyldig JSON før den vanlige rutekoden. Feilen håndteres uten at meldingen lagres.'
			),
			question(
				'type',
				'Et JSON-felt er et tall, men ruten forventer tekst og vil bruke trim(). Hva bør skje først?',
				'Kontroller at verdien er en streng før tekstmetoder brukes.',
				'Kall trim() først og stol på at alle JSON-verdier er strenger.',
				'Lagre tallet før det valideres.',
				'Gyldig JSON kan inneholde flere datatyper. At body kan leses, betyr ikke at feltet har forventet type.'
			),
			question(
				'whitespace',
				'En melding består av bare mellomrom. Hvorfor er det utilstrekkelig å kontrollere at feltet finnes?',
				'Feltet finnes, men innholdet blir tomt etter trimming og bør avvises.',
				'Et eksisterende felt er alltid en meningsfull melding.',
				'Mellomrom viser at brukeren er innlogget.',
				'Tilstedeværelse og gyldig innhold er ulike kontroller. Valider den teksten som faktisk skal brukes.'
			)
		]
	},
	'oving-8': {
		questions: [
			question(
				'original',
				'Nettleseren har en gyldig session-cookie, men sender den ikke med neste beskyttede forespørsel. Hva kan backend gjøre?',
				'Behandle forespørselen som uten innlogging og avvise den beskyttede handlingen.',
				'Gjette hvem brukeren er fra den siste innloggingen på hele serveren.',
				'Stole på et brukernavn i en tilfeldig body.',
				'Uten session-identifikatoren kan ikke backend knytte forespørselen til den innloggede brukeren. Den beskyttede handlingen avvises.'
			),
			question(
				'register',
				'I øvingen er registrering og innlogging to forskjellige operasjoner. Hva betyr en vellykket registrering alene?',
				'At brukeren er opprettet; en innlogget session må fortsatt opprettes gjennom innlogging.',
				'At alle nettlesere automatisk får en innlogget session.',
				'At nettleserens viste brukernavn blir et bevis på innlogging.',
				'Å opprette brukerdata er ikke automatisk det samme som å knytte en pålogget session til en nettleser.'
			),
			question(
				'restart',
				'Øvingen lagrer brukere i fil, men sessions bare i prosessminnet. Hva kan skje ved omstart?',
				'Brukerne kan fortsatt finnes, mens sessionene er borte og brukerne må logge inn igjen.',
				'Brukerfilen forsvinner alltid sammen med sessions.',
				'En cookie gjenoppretter automatisk en slettet session på serveren.',
				'Ulike data kan ha ulik lagring. En session-identifikator hjelper ikke hvis serverens tilhørende session er borte.'
			)
		]
	},
	'oving-9': {
		questions: [
			question(
				'original',
				'Frontend skjuler sletteknappen på andre brukeres meldinger. Hvilken kontroll trengs fremdeles?',
				'Backend må kontrollere innlogging og eierskap før den sletter meldingen.',
				'Ingen. En skjult knapp gjør forespørselen umulig.',
				'Backend kan kontrollere eieren etter at meldingen er slettet.',
				'Frontend hjelper brukeren, men backend håndhever tilgangen. Kontrollen må skje før data blir endret.'
			),
			question(
				'before-delete',
				'Ruten sletter en melding og sjekker deretter eierskap. Den svarer 403 når brukeren er feil. Er dette tilstrekkelig?',
				'Nei. Endringen kan allerede ha skjedd; tillatelsen må kontrolleres før sletting.',
				'Ja. Statuskoden 403 gjenoppretter automatisk meldingen.',
				'Ja, så lenge frontend skjuler meldingen etterpå.',
				'Et avvisningssvar retter ikke en endring som allerede er utført. Kontroller tilgangen før data endres.'
			),
			question(
				'guest',
				'En gjest uten gyldig session sender en request til en beskyttet endringsrute. Hva bør ruten gjøre?',
				'Avvise den beskyttede handlingen fordi brukeren ikke er autentisert.',
				'Bruke eieren som klienten foreslår i body.',
				'Endre data først og be om innlogging etterpå.',
				'En beskyttet endring krever en serverkontrollert innlogging før eierskap og selve endringen kan behandles.'
			)
		]
	},
	'oving-10': {
		questions: [
			question(
				'original',
				'Du endrer Svelte-koden i en løsning som publiserer et statisk produksjonsbygg. Hva må skje før eleven ser den nye versjonen?',
				'Den nye koden må bygges, og det vellykkede bygget må publiseres som den aktive versjonen.',
				'Det holder å starte elevens nettleser på nytt.',
				'Nginx leser automatisk Svelte-kildefilene som eleven åpner siden.',
				'Et statisk nettsted leverer ferdigbygde filer. Ny kildekode blir synlig når et nytt bygg er publisert og nettleseren henter det.'
			),
			question(
				'localhost',
				'Frontend kjører i elevens nettleser og ber om http://localhost:3001. Hvilken maskin viser localhost til der?',
				'Elevens egen maskin, fordi forespørselen starter i nettleseren der.',
				'Alltid Ubuntu-serveren som leverte nettsiden.',
				'DNS-serveren i elevens subnett.',
				'Localhost gjelder maskinen hvor forbindelsen opprettes. En adresse som virker på serveren er ikke automatisk riktig i klienten.'
			),
			question(
				'service',
				'En backend starter automatisk som en systemd-tjeneste etter omstart av serveren. Hva må i tillegg være på plass for at elevdata skal overleve?',
				'Varig lagring som backend leser og skriver, og som beholdes mellom oppstarter.',
				'Bare Restart=on-failure; dette lagrer alle variabler på disk.',
				'Bare et nytt frontendbygg; dette inneholder automatisk alle brukernes data.',
				'Å starte en prosess og å bevare data er ulike oppgaver. En tjeneste må bruke varig lagring for å hente tilbake elevdata.'
			)
		]
	},
	'redd-chatten': {
		questions: [
			question(
				'validate',
				'Tekstfeltet inneholder bare mellomrom. Hvilken kombinasjon stopper dette før lagring?',
				'Kontroller type, trim teksten og avvis tomt innhold før meldingen legges til.',
				'Lagre meldingen og send et feilsvar etterpå.',
				'Kontroller bare om body har et felt med riktig navn.',
				'Validering må gjelde innholdet som skal lagres, og må skje før sideeffekten.'
			),
			question(
				'sender',
				'En request har Adas session, men body påstår at avsenderen er Noah. Hvem skal backend bruke som avsender?',
				'Ada, fordi serverens gyldige session bestemmer identiteten.',
				'Noah, fordi body er det siste klienten sendte.',
				'Ingen bestemt bruker; backend skal bytte tilfeldig mellom navnene.',
				'Klientstyrte felt kan forfalskes. Bruk identiteten som backend har kontrollert gjennom sessionen.'
			),
			question(
				'ownership',
				'En slettingsrute svarer 403 til en bruker uten eierskap. Hva må testen også kontrollere?',
				'At meldingen faktisk fortsatt finnes og ikke ble slettet før feilsvaret.',
				'Bare at ordet «forbudt» er synlig på knappen.',
				'Bare at ruten returnerer en JSON-body, uavhengig av dataendringer.',
				'Riktig statuskode er ikke nok. En avvist handling skal også la de beskyttede dataene være urørt.'
			)
		]
	},
	meldingsdetektiven: {
		questions: [
			question(
				'contract',
				'Frontend sender et feltnavn backend ikke forventer. Hva er en god retting?',
				'Bruk en felles kontrakt for feltnavn og kontroller at riktig innhold både lagres og vises.',
				'Bytt bare HTTP-status til 201 uten å kontrollere feltet.',
				'Vis en grønn melding hver gang sendeknappen trykkes.',
				'En request må følge avtalen mellom klient og server. Bekreft resultatet i data og visning.'
			),
			question(
				'duplicate',
				'Ett trykk fører til to POST-requests. Hvor bør du begynne feilsøkingen?',
				'Undersøk om samme innsending håndteres både av skjemaet og av en egen klikkhendelse.',
				'Slett tilfeldige meldinger på backend til antallet ser riktig ut.',
				'Send en tredje POST-request for å oppdatere listen.',
				'Tell requests før du endrer lagringen. Dobbelt hendelsesoppsett kan sende samme handling flere ganger.'
			),
			question(
				'session',
				'POST virker som innlogget, men GET til samme beskyttede backend får 401. Hva bør undersøkes?',
				'Om session-cookien følger begge forespørslene, og hvilken session backend finner for hver av dem.',
				'Bare fargen på innloggingsknappen.',
				'Om det er nok å sende et brukernavn i meldingsfeltet.',
				'POST og GET er separate requests. En cookie som følger én av dem beviser ikke at den følger den andre.'
			)
		]
	},
	chat: {
		questions: [
			question(
				'deliver',
				'Ada sender en melding med POST. Hva må også skje for at Noah skal se den i denne chatmodellen?',
				'Noah må hente meldinger med GET og oppdatere den lokale visningen.',
				'Ada må sende samme melding flere ganger.',
				'Backend må starte hele nettleseren til Noah på nytt.',
				'POST endrer serverens data. Noahs nettleser må også hente og vise den nye listen.'
			),
			question(
				'already-stored',
				'Meldingen finnes allerede én gang på backend, men mangler i Noahs liste. Hvilken handling unngår en ekstra kopi?',
				'La Noah hente listen med GET uten å sende meldingen på nytt.',
				'La Ada sende meldingen med POST én gang til.',
				'Opprett en ny meldings-ID i frontend og kall det en oppdatering.',
				'Når lagringen allerede er riktig, må den lokale visningen oppdateres. En ny POST kan gi en ny lagret melding.'
			),
			question(
				'room',
				'Meldingen ligger i Gaming, men Noah henter Generelt. Hva bør endres for å finne meldingen?',
				'La Noah hente riktig rom i GET-requesten.',
				'Slett meldingen fra Gaming og opprett kopier i alle rom.',
				'Gi meldingen en tilfeldig avsender uten å endre forespørselen.',
				'GET må be om rommet som inneholder meldingen. Avsender og rom er ulike deler av dataene.'
			)
		]
	}
};
