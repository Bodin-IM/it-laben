/**
 * Public question content. Correct answers live only in server/checkpoints.js.
 * Keep activityId + id stable. A new question/variant gets a new id.
 * @typedef {{id:string,label:string}} CheckChoice
 * @typedef {{activityId:string,id:string,title:string,prompt:string,choices:CheckChoice[],hint:string,explanation:string}} Checkpoint
 */

/** @type {Checkpoint[]} */
export const checkpoints = [
	{
		activityId: 'frontend-backend',
		id: 'check-v1',
		title: 'Hvem oppdaterer Noah?',
		prompt:
			'Ada har sendt meldingen, og backend har lagret den. Noahs liste er fortsatt gammel. Hva må skje?',
		choices: [
			{ id: 'send-again', label: 'Ada må sende samme melding med POST én gang til.' },
			{
				id: 'fetch',
				label: 'Noahs nettleser må hente meldingene med GET og oppdatere listen sin.'
			},
			{ id: 'wait', label: 'En lagret melding dukker automatisk opp i alle nettlesere.' }
		],
		hint: 'Serverens data og listen i Noahs nettleser er to forskjellige ting.',
		explanation:
			'POST endrer data på serveren. Noah må også hente de nye dataene og vise dem i sin egen nettleser.'
	},
	{
		activityId: 'chatrom',
		id: 'check-v1',
		title: 'Riktig rom',
		prompt:
			'Noah bytter fra Generelt til Gaming. Hva må forespørselen som henter meldinger fortelle backend?',
		choices: [
			{ id: 'room', label: 'Hvilket rom Noah vil hente meldinger fra.' },
			{ id: 'color', label: 'Hvilken farge romknappen har.' },
			{ id: 'nothing', label: 'Ingenting. Backend leser den valgte knappen i nettleseren.' }
		],
		hint: 'Backend kan bare bruke informasjon den selv har, eller mottar i forespørselen.',
		explanation:
			'Valgt rom må følge forespørselen, for eksempel som en del av URL-en. Backend bruker dette til å velge riktig innhold.'
	},
	{
		activityId: 'fillagring',
		id: 'check-v1',
		title: 'Etter omstarten',
		prompt:
			'En melding finnes bare i en variabel i Node-prosessen. Hva skjer når prosessen stoppes og startes på nytt?',
		choices: [
			{ id: 'cookie', label: 'Nettleserens cookie gjenoppretter automatisk alle meldingene.' },
			{ id: 'disk', label: 'Variabelen blir automatisk en fil på disk.' },
			{
				id: 'memory',
				label:
					'Meldingen er borte fra prosessens minne og må hentes fra varig lagring hvis den skal tilbake.'
			}
		],
		hint: 'Sammenlign minnet til en prosess med en fil som er skrevet til disk.',
		explanation:
			'Prosessens minne forsvinner ved omstart. Data som skal overleve må lagres varig og leses inn igjen.'
	},
	{
		activityId: 'sessions',
		id: 'check-v1',
		title: 'Hvem husker brukeren?',
		prompt:
			'I en vanlig innlogging med serverlagret session, hvor finner backend hvilken bruker en gyldig session tilhører?',
		choices: [
			{ id: 'body', label: 'I et valgfritt avsendernavn som klienten sender i body.' },
			{
				id: 'session',
				label: 'I serverens session-data, ved hjelp av session-identifikatoren fra cookien.'
			},
			{ id: 'button', label: 'I teksten på innloggingsknappen.' }
		],
		hint: 'Skill mellom identifikatoren nettleseren sender, og opplysningene serveren stoler på.',
		explanation:
			'Cookien identifiserer en session. Backend slår den opp og bruker identiteten som er knyttet til sessionen på serveren.'
	},
	{
		activityId: 'oving-5',
		id: 'check-v1',
		title: 'Skrivingen feiler',
		prompt:
			'Du lager neste versjon av meldingslisten, men skrivingen til fil feiler. Hva bør skje med den aktive listen i minnet?',
		choices: [
			{ id: 'keep', label: 'Behold den gamle listen, og fortell klienten at lagringen feilet.' },
			{ id: 'replace', label: 'Bytt til den nye listen og svar at alt er lagret.' },
			{ id: 'clear', label: 'Tøm listen for å gjøre plass til et nytt forsøk.' }
		],
		hint: 'Et suksessvar og aktivt minne bør stemme med det som faktisk ble lagret.',
		explanation:
			'Når lagringen feiler, skal vi ikke late som endringen er varig. Den aktive listen beholdes og klienten får en feil.'
	},
	{
		activityId: 'oving-6',
		id: 'check-v1',
		title: 'ID-en finnes ikke',
		prompt:
			'En DELETE-request peker på en meldings-ID som ikke finnes. Hva er riktig oppførsel i øvingen?',
		choices: [
			{ id: 'last', label: 'Slett siste melding i listen i stedet.' },
			{ id: 'all', label: 'Slett alle meldingene, siden ID-en ikke kunne finnes.' },
			{ id: 'missing', label: 'Svar at meldingen ikke finnes, og behold de andre meldingene.' }
		],
		hint: 'En ID peker på én bestemt melding. En manglende ID gir ikke tillatelse til å velge en annen.',
		explanation: 'En ukjent ID gir 404 i øvingen. Ingen andre meldinger skal endres eller slettes.'
	},
	{
		activityId: 'oving-7',
		id: 'check-v1',
		title: 'Før rutekoden',
		prompt:
			'Klienten sender ødelagt JSON med Content-Type: application/json. Hvor bør dette oppdages i Express-oppsettet?',
		choices: [
			{ id: 'after-save', label: 'Etter at meldingen er lagt til i filen.' },
			{ id: 'parser', label: 'I JSON-parseren før den vanlige rutekoden behandler body.' },
			{ id: 'browser', label: 'Bare i nettleseren; backend skal godta all tekst.' }
		],
		hint: 'Body må kunne leses som JSON før rutekoden kan behandle feltene i den.',
		explanation:
			'JSON-parseren oppdager ugyldig JSON før den vanlige rutekoden. Feilen håndteres uten at meldingen lagres.'
	},
	{
		activityId: 'oving-8',
		id: 'check-v1',
		title: 'Cookien ble igjen',
		prompt:
			'Nettleseren har en gyldig session-cookie, men sender den ikke med neste beskyttede forespørsel. Hva kan backend gjøre?',
		choices: [
			{
				id: 'guess',
				label: 'Gjette hvem brukeren er fra den siste innloggingen på hele serveren.'
			},
			{ id: 'name', label: 'Stole på et brukernavn i en tilfeldig body.' },
			{
				id: 'guest',
				label: 'Behandle forespørselen som uten innlogging og avvise den beskyttede handlingen.'
			}
		],
		hint: 'Det holder ikke at cookien finnes lokalt. Forespørselen må kunne knyttes til sessionen.',
		explanation:
			'Uten session-identifikatoren kan ikke backend knytte forespørselen til den innloggede brukeren. Den beskyttede handlingen avvises.'
	},
	{
		activityId: 'oving-9',
		id: 'check-v1',
		title: 'Skjult knapp',
		prompt:
			'Frontend skjuler sletteknappen på andre brukeres meldinger. Hvilken kontroll trengs fremdeles?',
		choices: [
			{
				id: 'owner',
				label: 'Backend må kontrollere innlogging og eierskap før den sletter meldingen.'
			},
			{ id: 'none', label: 'Ingen. En skjult knapp gjør forespørselen umulig.' },
			{ id: 'after', label: 'Backend kan kontrollere eieren etter at meldingen er slettet.' }
		],
		hint: 'En klient kan sende en request uten å bruke knappen som nettsiden viser.',
		explanation:
			'Frontend hjelper brukeren, men backend håndhever tilgangen. Kontrollen må skje før data blir endret.'
	},
	{
		activityId: 'oving-10',
		id: 'check-v1',
		title: 'Koden er endret',
		prompt:
			'Du endrer Svelte-koden i en løsning som publiserer et statisk produksjonsbygg. Hva må skje før eleven ser den nye versjonen?',
		choices: [
			{ id: 'restart-browser', label: 'Det holder å starte elevens nettleser på nytt.' },
			{
				id: 'build',
				label:
					'Den nye koden må bygges, og det vellykkede bygget må publiseres som den aktive versjonen.'
			},
			{ id: 'source', label: 'Nginx leser automatisk Svelte-kildefilene som eleven åpner siden.' }
		],
		hint: 'Skill mellom kildekoden og de ferdigbygde filene som webserveren leverer.',
		explanation:
			'Et statisk nettsted leverer ferdigbygde filer. Ny kildekode blir synlig når et nytt bygg er publisert og nettleseren henter det.'
	}
];

/** @param {string} activityId */
export const checkpointsFor = (activityId) =>
	checkpoints.filter((item) => item.activityId === activityId);
