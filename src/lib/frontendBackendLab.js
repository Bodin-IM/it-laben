/**
 * Ren modell av en melding mellom Svelte og Express.
 *
 * Ingen nettverkskall, timere, DOM- eller Node-API-er brukes. makeRun lager
 * komplette snapshots for hvert undervisningstrinn. Kalleren velger selv
 * når et trinn vises; modellen endrer aldri input eller tidligere trinn.
 */

/** @typedef {'post' | 'get'} Kind */
/** @typedef {'frontend' | 'backend'} Side */
/** @typedef {{ avsender: string, tekst: string }} Melding */
/**
 * Input kan også være ugyldig. Typene kontrolleres på samme måte som i
 * Express-utdraget; verdiene skal være JSON-kompatible.
 *
 * @typedef {{ avsender: unknown, tekst: unknown }} Payload
 */
/** @typedef {{ avsender: unknown, tekst?: unknown, message?: unknown }} RequestBody */
/** @typedef {{ beskjed: string, melding?: Melding }} PostResponse */
/** @typedef {PostResponse | Melding[]} ResponseBody */
/** @typedef {{ id: string, text: string, title: string, explanation: string }} CodeLine */
/**
 * Alle tilstandsverdier er inkludert i hvert trinn, også før svaret finnes.
 * status er frontendens statusvariabel, mens httpStatus er HTTP-statuskoden.
 * status endres først når frontend behandler svaret.
 *
 * body-feltene viser JSON-innhold som JavaScript-verdier, ikke rå HTTP-tekst.
 * requestBody er null ved GET. responseBody og httpStatus er null før backend
 * svarer. Arrays, meldingsobjekter og body-felt deler ikke referanser med input
 * eller med de andre snapshottene.
 *
 * @typedef {{
 *   id: string,
 *   side: Side,
 *   lineIds: string[],
 *   title: string,
 *   explanation: string,
 *   serverMessages: Melding[],
 *   clientMessages: Melding[],
 *   status: string,
 *   httpStatus: 200 | 201 | 400 | null,
 *   requestBody: RequestBody | null,
 *   responseBody: ResponseBody | null
 * }} RunStep
 */

/** Samme eksempelverdier som på den opprinnelige backend-siden. */
export const EXAMPLE_MESSAGE = Object.freeze({
	avsender: 'Gruppe 1',
	tekst: 'Hei fra oss!'
});

/** @type {Readonly<Record<Side, string>>} */
export const CODE_CONTEXTS = Object.freeze({
	frontend:
		'Utdrag fra en Svelte 5-komponent: legg funksjonen i <script> og HTML-delen under. avsender, tekst, meldinger og status er $state-variabler. API er adressen til deres Express-backend, for eksempel http://localhost:3000.',
	backend:
		'Utdrag fra samme Express-app: app er opprettet med express(), og meldinger er en felles liste i serverminnet. CORS er satt opp for frontend-adressen. Middleware og ruter registreres én gang før app.listen(3000).'
});

/**
 * @param {string} id
 * @param {string} text
 * @param {string} title
 * @param {string} explanation
 * @returns {CodeLine}
 */
function line(id, text, title, explanation) {
	return { id, text, title, explanation };
}

/**
 * Fokuserte kodeutdrag med stabile linje-ID-er.
 *
 * Den valgfrie wrongKey-parameteren endrer bare objektlinjen i frontendens
 * POST-utdrag. Dermed samsvarer den viste koden med feilforsøket der message
 * sendes i stedet for tekst. ID-en til linjen er den samme i begge tilfeller.
 *
 * Utdragene bruker oppsettet beskrevet i CODE_CONTEXTS. GET-ruten er med vilje
 * bare tre linjer: den gjør én ting og trenger ingen kunstig ekstra kode.
 * Hver ikke-tomme linje har en norsk tittel og forklaring.
 *
 * @param {Kind} kind
 * @param {Side} side
 * @param {boolean} [wrongKey=false]
 * @returns {CodeLine[]}
 */
export function codeLines(kind, side, wrongKey = false) {
	if (kind === 'post' && side === 'frontend') {
		return [
			line(
				'fp-function',
				'async function sendMelding() {',
				'Funksjonen til send-knappen',
				'async gjør at funksjonen kan vente på fetch og på at svarbodyen blir lest.'
			),
			line(
				'fp-try',
				'  try {',
				'Forsøk å sende',
				'Feil som kastes i denne blokken håndteres i catch.'
			),
			line(
				'fp-object',
				wrongKey
					? '    const data = { avsender, message: tekst };'
					: '    const data = { avsender, tekst };',
				'Lag objektet som skal sendes',
				wrongKey
					? 'Feltet heter nå message, mens backend forventer tekst. Verdien fra tekstfeltet får ikke automatisk riktig feltnavn.'
					: 'Kortformen { avsender, tekst } lager to felt med verdiene fra Svelte-variablene.'
			),
			line(
				'fp-fetch',
				'    const svar = await fetch(API + "/meldinger", {',
				'Send requesten',
				'API og stien bestemmer hvilken backend-rute som mottar requesten. await venter på responsen.'
			),
			line(
				'fp-method',
				'      method: "POST",',
				'Velg POST',
				'POST brukes her for å sende en ny melding til backend.'
			),
			line(
				'fp-header',
				'      headers: { "Content-Type": "application/json" },',
				'Fortell at bodyen er JSON',
				'Headeren gjør det mulig for riktig middleware på backend å behandle JSON-bodyen.'
			),
			line(
				'fp-body',
				'      body: JSON.stringify(data)',
				'Gjør objektet om til tekst',
				'JSON.stringify lager JSON-teksten som sendes som requestens body.'
			),
			line(
				'fp-fetch-end',
				'    });',
				'Avslutt fetch-kallet',
				'Her avsluttes innstillingene og kallet til fetch.'
			),
			line(
				'fp-json',
				'    const mottatt = await svar.json();',
				'Les JSON-svaret',
				'Svarbodyen leses og parses til et JavaScript-objekt. Et 400-svar kan også ha en JSON-body.'
			),
			line(
				'fp-ok',
				'    if (!svar.ok) throw new Error(mottatt.beskjed);',
				'Kontroller HTTP-status',
				'fetch kaster ikke automatisk ved 400. svar.ok er false, og denne linjen kaster en feil med forklaringen fra backend.'
			),
			line(
				'fp-status',
				'    status = mottatt.beskjed;',
				'Vis bekreftelsen',
				'Frontend viser beskjeden fra POST-svaret. Listen meldinger er fortsatt uendret.'
			),
			line(
				'fp-clear',
				'    tekst = "";',
				'Tøm meldingsfeltet',
				'Etter vellykket sending tømmes tekstvariabelen som inputfeltet er bundet til. Dette henter ikke listen.'
			),
			line(
				'fp-catch',
				'  } catch (feil) {',
				'Håndter feilen',
				'En feil fra fetch, parsing eller den eksplisitte HTTP-sjekken havner her.'
			),
			line(
				'fp-error-message',
				'    const beskjed = feil instanceof Error ? feil.message : "Ukjent feil";',
				'Finn en lesbar feilmelding',
				'Error-objekter har en message. En reservebeskjed brukes hvis noe annet er kastet.'
			),
			line(
				'fp-error-status',
				'    status = "Kunne ikke sende: " + beskjed;',
				'Vis at sendingen feilet',
				'Statusfeltet viser feilen. Koden legger ingen melding i frontend-listen.'
			),
			line('fp-catch-end', '  }', 'Avslutt feilhåndteringen', 'Her slutter catch-blokken.'),
			line(
				'fp-end',
				'}',
				'Avslutt send-funksjonen',
				'Funksjonen er definert, men kjøres først når send-knappen brukes.'
			),
			line('fp-blank', '', '', ''),
			line(
				'fp-html',
				'// HTML-delen i samme Svelte-fil:',
				'Bytt til komponentens HTML',
				'Linjene under hører utenfor script-taggen i den samme Svelte-komponenten.'
			),
			line(
				'fp-sender-input',
				'<input bind:value={avsender} />',
				'Koble avsenderfeltet',
				'bind:value holder inputfeltet og variabelen avsender oppdatert med samme verdi.'
			),
			line(
				'fp-text-input',
				'<input bind:value={tekst} />',
				'Koble tekstfeltet',
				'bind:value holder inputfeltet og variabelen tekst oppdatert med samme verdi.'
			),
			line(
				'fp-button',
				'<button onclick={sendMelding}>Send melding</button>',
				'Start fra en hendelse',
				'onclick kaller sendMelding når brukeren trykker på knappen, ikke ved sidelast.'
			)
		];
	}
	if (kind === 'post' && side === 'backend') {
		return [
			line(
				'bp-json',
				'app.use(express.json());',
				'Registrer JSON-middleware',
				'Registreres før rutene. Middleware parser JSON-bodyen for hver relevant request og gjør verdien tilgjengelig som req.body.'
			),
			line('bp-blank', '', '', ''),
			line(
				'bp-route',
				'app.post("/meldinger", (req, res) => {',
				'Motta POST på riktig sti',
				'Express kaller denne funksjonen når både metoden POST og stien /meldinger passer.'
			),
			line(
				'bp-sender',
				'  const avsender = req.body?.avsender;',
				'Les avsender fra bodyen',
				'Feltet avsender hentes fra objektet som JSON-middleware har laget. ?. beskytter mot manglende req.body.'
			),
			line(
				'bp-text',
				'  const tekst = req.body?.tekst;',
				'Les feltet tekst',
				'Backend leter etter nøkkelen tekst. Et felt som heter message blir ikke oversatt automatisk.'
			),
			line(
				'bp-check-sender',
				'  if (typeof avsender !== "string" ||',
				'Kontroller typen til avsender',
				'En avsender som ikke er en streng gjør kontrollen ugyldig. || betyr at ett av avvikene er nok.'
			),
			line(
				'bp-check-text',
				'      typeof tekst !== "string" ||',
				'Kontroller typen til tekst',
				'Manglende tekst gir undefined og passerer ikke denne kontrollen.'
			),
			line(
				'bp-check-empty',
				'      !avsender.trim() || !tekst.trim()) {',
				'Avvis tomme felt',
				'trim fjerner mellomrom i kantene. En tom streng eller bare mellomrom blir avvist.'
			),
			line(
				'bp-bad-return',
				'    return res.status(400).json({',
				'Svar 400 og stopp ruten',
				'return avslutter før push. Ingen melding legges til hvis kontrollen feiler.'
			),
			line(
				'bp-bad-message',
				'      beskjed: "Avsender og tekst må fylles ut."',
				'Forklar feilen i JSON',
				'Frontend kan lese denne beskjeden fra responsen, selv om HTTP-status er 400.'
			),
			line(
				'bp-bad-end',
				'    });',
				'Avslutt feilsvaret',
				'JSON-objektet og res.json-kallet avsluttes her.'
			),
			line(
				'bp-check-end',
				'  }',
				'Fortsett bare med gyldig input',
				'Hvis ingen av kontrollene feilet, fortsetter ruten under denne blokken.'
			),
			line(
				'bp-object',
				'  const melding = {',
				'Lag meldingen som skal lagres',
				'Backend lager et nytt objekt fra de kontrollerte feltene.'
			),
			line(
				'bp-trim-sender',
				'    avsender: avsender.trim(),',
				'Rydd avsenderen',
				'Meldingen lagres uten unødvendige mellomrom først og sist i avsenderen.'
			),
			line(
				'bp-trim-text',
				'    tekst: tekst.trim()',
				'Rydd meldingsteksten',
				'Meldingen lagres uten unødvendige mellomrom først og sist i teksten.'
			),
			line(
				'bp-object-end',
				'  };',
				'Fullfør meldingsobjektet',
				'Objektet er nå klart for listen på backend.'
			),
			line(
				'bp-push',
				'  meldinger.push(melding);',
				'Endre bare backend-listen',
				'push legger meldingen bakerst i serverens array. Frontend-listen er en annen liste.'
			),
			line(
				'bp-response',
				'  res.status(201).json({',
				'Bekreft opprettelsen med 201',
				'Svaret sendes tilbake til requesten som opprettet meldingen.'
			),
			line(
				'bp-response-message',
				'    beskjed: "Meldingen er mottatt!",',
				'Legg ved en bekreftelse',
				'Denne beskjeden kan frontend bruke i statusfeltet.'
			),
			line(
				'bp-response-data',
				'    melding',
				'Returner den nye meldingen',
				'POST-svaret inneholder bare den nye meldingen og beskjeden, ikke hele listen.'
			),
			line('bp-response-end', '  });', 'Avslutt POST-svaret', 'Express sender objektet som JSON.'),
			line(
				'bp-end',
				'});',
				'Avslutt rutefunksjonen',
				'Ruten er registrert. Den kjøres på nytt når en ny POST-request kommer.'
			)
		];
	}
	if (side === 'frontend') {
		return [
			line(
				'fg-function',
				'async function hentMeldinger() {',
				'Funksjonen til hent-knappen',
				'Denne funksjonen starter en egen GET-request når brukeren ber om listen.'
			),
			line(
				'fg-try',
				'  try {',
				'Forsøk å hente',
				'Feil fra requesten eller behandlingen av svaret håndteres i catch.'
			),
			line(
				'fg-fetch',
				'    const svar = await fetch(API + "/meldinger");',
				'Send GET uten body',
				'Når method ikke oppgis, bruker fetch GET. Ingen ny melding sendes med requesten.'
			),
			line(
				'fg-ok',
				'    if (!svar.ok) throw new Error("HTTP " + svar.status);',
				'Kontroller svaret',
				'Et vellykket 200-svar lar funksjonen fortsette. Andre HTTP-feil håndteres eksplisitt.'
			),
			line(
				'fg-json',
				'    meldinger = await svar.json();',
				'Oppdater frontend-listen',
				'JSON-svaret blir en egen JavaScript-liste i nettleseren. Den deler ikke minne med backend.'
			),
			line(
				'fg-status',
				'    status = "Meldingene er hentet.";',
				'Vis at henting er ferdig',
				'Status oppdateres etter at frontend har lest listen.'
			),
			line(
				'fg-catch',
				'  } catch (feil) {',
				'Håndter hentefeil',
				'En feil fra nettverket, HTTP-sjekken eller JSON-parsingen håndteres her.'
			),
			line(
				'fg-error-message',
				'    const beskjed = feil instanceof Error ? feil.message : "Ukjent feil";',
				'Finn en lesbar feilmelding',
				'Error-objektets beskjed brukes hvis den finnes, ellers brukes en reservebeskjed.'
			),
			line(
				'fg-error-status',
				'    status = "Kunne ikke hente: " + beskjed;',
				'Vis feilen',
				'Frontend viser feilmeldingen i statusfeltet.'
			),
			line('fg-catch-end', '  }', 'Avslutt feilhåndteringen', 'Her slutter catch-blokken.'),
			line(
				'fg-end',
				'}',
				'Avslutt hent-funksjonen',
				'Funksjonen kjøres fra knappen, ikke automatisk etter POST.'
			),
			line('fg-blank', '', '', ''),
			line(
				'fg-html',
				'// HTML-delen i samme Svelte-fil:',
				'Bytt til komponentens HTML',
				'Linjene under hører utenfor script-taggen i den samme Svelte-komponenten.'
			),
			line(
				'fg-button',
				'<button onclick={hentMeldinger}>Hent meldinger</button>',
				'Hent med en egen knapp',
				'Dette er en separat handling fra send-knappen.'
			),
			line(
				'fg-each',
				'{#each meldinger as melding}',
				'Vis hver melding',
				'Svelte går gjennom frontend-listen og gjentar innholdet under for hvert element.'
			),
			line(
				'fg-item',
				'  <p>{melding.avsender}: {melding.tekst}</p>',
				'Vis avsender og tekst',
				'Verdiene i frontend-listen settes inn på nettsiden.'
			),
			line(
				'fg-each-end',
				'{/each}',
				'Avslutt gjentakelsen',
				'Svelte oppdaterer denne delen når meldinger får nye data.'
			)
		];
	}
	return [
		line(
			'bg-route',
			'app.get("/meldinger", (req, res) => {',
			'Motta GET på /meldinger',
			'Dette er GET-ruten i den samme Express-appen. Den bruker samme serverliste som POST-ruten.'
		),
		line(
			'bg-response',
			'  res.json(meldinger);',
			'Send hele listen med 200',
			'Express sender serverlisten som JSON. Standardstatus er 200, og serverlisten endres ikke.'
		),
		line(
			'bg-end',
			'});',
			'Avslutt GET-ruten',
			'Backend har svart. Frontend må selv lese svaret og oppdatere sin egen liste.'
		)
	];
}

/** @param {Melding} melding @returns {Melding} */
function copyMessage(melding) {
	return { avsender: melding.avsender, tekst: melding.tekst };
}

/** @param {Melding[]} messages @returns {Melding[]} */
function copyMessages(messages) {
	return messages.map(copyMessage);
}

/** @param {unknown} value @returns {unknown} */
function copyValue(value) {
	if (Array.isArray(value)) return value.map(copyValue);
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copyValue(item)]));
	}
	return value;
}

/** @param {RequestBody | null} body @returns {RequestBody | null} */
function copyRequest(body) {
	if (!body) return null;
	/** @type {RequestBody} */
	const copied = { avsender: copyValue(body.avsender) };
	if ('tekst' in body) copied.tekst = copyValue(body.tekst);
	if ('message' in body) copied.message = copyValue(body.message);
	return copied;
}

/** @param {ResponseBody | null} body @returns {ResponseBody | null} */
function copyResponse(body) {
	if (body === null) return null;
	if (Array.isArray(body)) return copyMessages(body);
	return body.melding
		? { beskjed: body.beskjed, melding: copyMessage(body.melding) }
		: { beskjed: body.beskjed };
}

/**
 * Lag en hel undervisningsrunde fra kopier av de oppgitte verdiene.
 *
 * POST med gyldig input gir åtte trinn og 201. Feil input gir sju trinn og
 * 400 uten push. I begge tilfeller er frontend-listen uendret gjennom hele
 * POST-runden. GET gir fire trinn og kopierer listen først i siste trinn.
 *
 * wrongKey simulerer at frontend sender message i stedet for tekst. Bodyen
 * og den synlige objektlinjen må derfor bruke samme wrongKey-verdi.
 *
 * Snapshots kan rendres eller undersøkes uten Svelte. Å endre ett snapshot
 * endrer ikke de andre, de opprinnelige listene eller den opprinnelige inputen.
 *
 * @param {Kind} kind
 * @param {Payload} payload
 * @param {Melding[]} serverMessages
 * @param {Melding[]} clientMessages
 * @param {boolean} [wrongKey=false]
 * @returns {RunStep[]}
 */
export function makeRun(kind, payload, serverMessages, clientMessages, wrongKey = false) {
	let server = copyMessages(serverMessages);
	let client = copyMessages(clientMessages);
	let status = '';
	/** @type {200 | 201 | 400 | null} */
	let httpStatus = null;
	/** @type {RequestBody | null} */
	let requestBody = null;
	/** @type {ResponseBody | null} */
	let responseBody = null;
	/** @type {RunStep[]} */
	const steps = [];

	/**
	 * @param {string} id
	 * @param {Side} side
	 * @param {string[]} lineIds
	 * @param {string} title
	 * @param {string} explanation
	 */
	function add(id, side, lineIds, title, explanation) {
		steps.push({
			id,
			side,
			lineIds: [...lineIds],
			title,
			explanation,
			serverMessages: copyMessages(server),
			clientMessages: copyMessages(client),
			status,
			httpStatus,
			requestBody: copyRequest(requestBody),
			responseBody: copyResponse(responseBody)
		});
	}

	if (kind === 'get') {
		add(
			'get-fetch',
			'frontend',
			['fg-fetch'],
			'Nettleseren ber om listen.',
			'fetch sender en egen GET-request til /meldinger. Den trenger ingen body, og frontend-listen er foreløpig uendret.'
		);

		httpStatus = 200;
		responseBody = copyMessages(server);
		add(
			'get-response',
			'backend',
			['bg-response'],
			'Backend sender hele listen.',
			'res.json(meldinger) sender serverlisten som JSON med status 200. Backend endrer ikke listen, og frontend har ennå ikke tatt svaret i bruk.'
		);

		add(
			'get-check',
			'frontend',
			['fg-ok'],
			'Frontend godtar 200-svaret.',
			'svar.ok er true for 200. Kontrollen slipper koden videre til å lese svarbodyen; listen i frontend er fortsatt den gamle.'
		);

		client = copyMessages(server);
		status = 'Meldingene er hentet.';
		add(
			'get-update',
			'frontend',
			['fg-json', 'fg-status', 'fg-each'],
			'Frontend får sin egen kopi.',
			'await svar.json() lager listen i nettleseren. Svelte oppdaterer visningen fra denne listen. Et senere push på backend endrer ikke denne kopien.'
		);
		return steps;
	}

	requestBody = wrongKey
		? { avsender: copyValue(payload.avsender), message: copyValue(payload.tekst) }
		: { avsender: copyValue(payload.avsender), tekst: copyValue(payload.tekst) };
	add(
		'post-object',
		'frontend',
		['fp-object'],
		'Inputverdiene samles i et objekt.',
		wrongKey
			? 'Denne gangen heter feltet message. Backend-koden forventer tekst; feltnavnene må stemme overens.'
			: 'Objektet får feltene avsender og tekst. Foreløpig er ingen liste endret og ingen request sendt.'
	);

	add(
		'post-fetch',
		'frontend',
		['fp-fetch', 'fp-body'],
		'Objektet sendes som JSON-tekst.',
		'JSON.stringify lager requestens body. fetch sender POST til /meldinger med Content-Type: application/json. Frontend venter på et svar.'
	);

	add(
		'post-body',
		'backend',
		['bp-sender', 'bp-text'],
		'Backend leser req.body.',
		'express.json-middleware har parset JSON-teksten. Ruten leser feltene avsender og tekst fra objektet i req.body.'
	);

	const avsender = requestBody.avsender;
	const tekst = requestBody.tekst;
	const valid =
		typeof avsender === 'string' &&
		typeof tekst === 'string' &&
		Boolean(avsender.trim()) &&
		Boolean(tekst.trim());

	add(
		'post-validation',
		'backend',
		['bp-check-sender', 'bp-check-text', 'bp-check-empty'],
		valid ? 'Begge feltene har gyldig innhold.' : 'Kontrollen finner en feil.',
		valid
			? 'Avsender og tekst er strenger med mer enn mellomrom. Ruten kan fortsette til å lage og lagre meldingen.'
			: 'Minst ett felt mangler, har feil type eller er tomt. Ruten skal svare 400 og stoppe før push; backend-listen er fortsatt uendret.'
	);

	if (!valid) {
		httpStatus = 400;
		responseBody = { beskjed: 'Avsender og tekst må fylles ut.' };
		add(
			'post-bad-response',
			'backend',
			['bp-bad-return', 'bp-bad-message'],
			'Backend svarer 400 og stopper.',
			'return sender feilmeldingen og avslutter ruten før push. Verken backend-listen eller frontend-listen endres.'
		);

		add(
			'post-bad-check',
			'frontend',
			['fp-json', 'fp-ok'],
			'Frontend oppdager HTTP-feilen.',
			'fetch har gitt et svar selv om status er 400. svar.json() leser beskjeden, og !svar.ok gjør at koden kaster en feil som catch håndterer.'
		);

		status = 'Kunne ikke sende: Avsender og tekst må fylles ut.';
		add(
			'post-error-status',
			'frontend',
			['fp-catch', 'fp-error-status'],
			'Feilen vises i frontend.',
			'catch setter statusfeltet til beskjeden fra backend. Det skjer ingen vellykket lagring og ingen oppdatering av frontend-listen.'
		);
		return steps;
	}

	const melding = { avsender: avsender.trim(), tekst: tekst.trim() };
	server = [...server, copyMessage(melding)];
	add(
		'post-push',
		'backend',
		['bp-trim-sender', 'bp-trim-text', 'bp-push'],
		'Meldingen legges til på backend.',
		'Backend rydder mellomrom i kantene og legger meldingen i sitt array. Listen i frontend er en annen liste og har ikke endret seg.'
	);

	httpStatus = 201;
	responseBody = { beskjed: 'Meldingen er mottatt!', melding: copyMessage(melding) };
	add(
		'post-response',
		'backend',
		['bp-response', 'bp-response-data'],
		'Backend bekrefter med 201.',
		'JSON-svaret inneholder en beskjed og den nye meldingen. Det følger POST-requesten tilbake; det henter ikke hele listen til frontend.'
	);

	add(
		'post-check',
		'frontend',
		['fp-json', 'fp-ok'],
		'Frontend leser og kontrollerer svaret.',
		'svar.json() gir bekreftelsen som et JavaScript-objekt. svar.ok er true ved 201, så ingen feil kastes.'
	);

	status = 'Meldingen er mottatt!';
	add(
		'post-status',
		'frontend',
		['fp-status', 'fp-clear'],
		'Status endres, men listen venter.',
		'Frontend viser bekreftelsen og tømmer tekstfeltet. Koden tildeler ikke noe til meldinger her. Bruk en egen GET-request for å hente den oppdaterte listen.'
	);
	return steps;
}
