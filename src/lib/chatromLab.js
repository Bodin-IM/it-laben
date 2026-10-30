/**
 * Ren undervisningsmodell for rom, session-avsender og sletting i en chat.
 *
 * Modellen bruker ingen cookies, nettverk, nettleser- eller Node-API-er.
 * planRun beregner uavhengige snapshots; UI-et bestemmer når de vises.
 * Både kjørevalg og tilstand kopieres før kjøringen planlegges.
 */

/** @typedef {'rooms' | 'session' | 'delete'} Kind */
/** @typedef {'frontend' | 'backend'} Side */
/** @typedef {'generelt' | 'gaming'} Room */
/** @typedef {'ada' | 'noah' | 'none'} SessionChoice */
/** @typedef {{ id: string, navn: string }} Bruker */
/** @typedef {{ id: number, rom: string, avsenderId: string, avsender: string, tekst: string }} Melding */
/** @typedef {{ id: string, text: string, title: string, explanation: string }} CodeLine */
/**
 * clientRoom er rommet den viste frontend-kopien faktisk ble hentet fra.
 * Å velge et annet rom endrer ikke denne kopien før et GET-svar behandles.
 * nextId er serverens teller. Sletting reduserer aldri telleren.
 *
 * @typedef {{
 *   serverMessages: Melding[],
 *   clientMessages: Melding[],
 *   clientRoom: string | null,
 *   nextId: number
 * }} LabState
 */
/**
 * Valgt session betyr en bruker som allerede er autentisert i øvelsen.
 * credentials=false tilsvarer eksplisitt credentials:"omit".
 * spoofSender legger til falske avsenderfelt i POST-bodyen, uten å endre
 * brukeren backend finner i sessionen.
 *
 * @typedef {{
 *   room: string,
 *   session: SessionChoice,
 *   credentials: boolean,
 *   text: string,
 *   messageId: number | string,
 *   spoofSender: boolean
 * }} RunOptions
 */
/** @typedef {{ rom: unknown, tekst: unknown, avsender?: unknown, avsenderId?: unknown }} RequestBody */
/** @typedef {{ beskjed: string, melding?: Melding, slettetId?: number }} MessageResponse */
/** @typedef {MessageResponse | Melding[]} ResponseBody */
/**
 * status er frontendens tekstvariabel, og er tom frem til frontend håndterer
 * et svar. httpStatus gjelder requesten som vises nå. mutationStatus beholder
 * POST-/DELETE-statusen når en etterfølgende GET har startet.
 *
 * requestUser fylles først når backend har mottatt requesten og
 * session-middleware har gjort brukeren tilgjengelig. null ved starten av en
 * request betyr at backend ennå ikke har slått opp brukeren i denne requesten.
 * Etter backendsteget betyr null at requesten ikke hadde en innlogget bruker.
 * GET er offentlig og filtrerer på rom uavhengig av denne brukeren.
 *
 * Body-feltene inneholder JSON-verdier, ikke rå HTTP-tekst.
 *
 * @typedef {{
 *   status: string,
 *   httpStatus: number | null,
 *   mutationStatus: number | null,
 *   requestMethod: 'GET' | 'POST' | 'DELETE',
 *   requestPath: string,
 *   requestBody: RequestBody | null,
 *   responseBody: ResponseBody | null,
 *   requestUser: Bruker | null
 * }} Trace
 */
/**
 * Alle tilstands- og sporingsfelter finnes i hvert trinn. Ingen arrays,
 * brukerobjekter, meldingsobjekter eller body-felt deler referanse med input
 * eller andre trinn. codeKind angir hvilket utdrag lineIds tilhører; et
 * POST-/DELETE-forsøk kan derfor vise den felles GET-koden under oppdateringen.
 *
 * @typedef {LabState & Trace & {
 *   id: string,
 *   side: Side,
 *   codeKind: Kind,
 *   lineIds: string[],
 *   title: string,
 *   explanation: string
 * }} RunStep
 */

/** @type {ReadonlyArray<Readonly<{ id: Room, navn: string }>>} */
export const ROOMS = Object.freeze([
	Object.freeze({ id: 'generelt', navn: 'Generelt' }),
	Object.freeze({ id: 'gaming', navn: 'Gaming' })
]);

/** @type {Readonly<Record<'ada' | 'noah', Readonly<Bruker>>>} */
export const USERS = Object.freeze({
	ada: Object.freeze({ id: 'elev-ada', navn: 'Ada' }),
	noah: Object.freeze({ id: 'elev-noah', navn: 'Noah' })
});

/** @type {Readonly<RunOptions>} */
export const DEFAULT_OPTIONS = Object.freeze({
	room: 'generelt',
	session: 'ada',
	credentials: true,
	text: 'Hei fra meg!',
	messageId: 1,
	spoofSender: false
});

/** @type {Readonly<Record<Side, string>>} */
export const CODE_CONTEXTS = Object.freeze({
	frontend:
		'Utdrag fra <script> i Svelte 5. API er adressen til Express, for eksempel http://localhost:3000. rom, tekst, meldinger, vistRom og status er $state-variabler. Knytt visRom, sendMelding og slettMelding(melding.id) til brukerhendelser. Den felles funksjonen hentRom vises i Rom-utdraget og legges inn én gang. Valget om cookies gjelder også denne funksjonen.',
	backend:
		'Utdrag fra samme Express-app. JSON-middleware, CORS og express-session må stå før rutene, som på sessions-siden. req.session.bruker = { id, navn } opprettes etter ekte autentisering. meldinger er én felles liste i serverminnet. nesteId starter over høyeste eksisterende id og økes ved hver POST; sletting endrer ikke telleren. Registrer hver rute én gang.'
});

/**
 * @param {string} prefix
 * @param {Array<[string, string, string, string]>} rows
 * @returns {CodeLine[]}
 */
function lines(prefix, rows) {
	return rows.map(([id, text, title, explanation]) => ({
		id: prefix + '-' + id,
		text,
		title,
		explanation
	}));
}

/**
 * Fokuserte, sammenhengende utdrag fra samme Svelte-/Express-løsning.
 * credentials og spoofSender påvirker den viste frontendkoden, ikke linje-ID-ene.
 * Alle ikke-tomme linjer kan forklares, også avslutninger av blokker.
 *
 * @param {Kind} kind
 * @param {Side} side
 * @param {Partial<RunOptions>} [options={}]
 * @returns {CodeLine[]}
 */
export function codeLines(kind, side, options = {}) {
	const credentials = (options.credentials ?? true) ? 'include' : 'omit';
	const cookieExplanation =
		credentials === 'include'
			? 'Be nettleseren ta med cookies når cookie-reglene tillater det. Session-middleware kan da slå opp den innloggede brukeren.'
			: 'omit ber nettleseren utelate cookies også på samme origin. Sessionen kan fortsatt finnes på serveren, men denne requesten bærer ikke ID-en.';

	if (kind === 'rooms' && side === 'frontend') {
		return lines('rf', [
			[
				'function',
				'async function hentRom(valgtRom) {',
				'Felles funksjon for GET',
				'Denne funksjonen brukes både ved rombytte og etter vellykket sending eller sletting. Den returnerer data; kalleren oppdaterer visningen.'
			],
			[
				'url',
				'  const url = API + "/meldinger?rom=" + encodeURIComponent(valgtRom);',
				'Send valgt rom i query',
				'encodeURIComponent gjør romnavnet trygt som én query-verdi. Backend leser verdien som req.query.rom.'
			],
			[
				'fetch',
				'  const svar = await fetch(url, { credentials: "' + credentials + '" });',
				'Hent rommet',
				'GET er standardmetoden til fetch. ' +
					cookieExplanation +
					' Denne GET-ruten krever likevel ikke innlogging.'
			],
			[
				'json',
				'  const mottatt = await svar.json();',
				'Les JSON-svaret',
				'Nettleseren parser responsen til en ny JavaScript-verdi. Den deler ikke minne med backendens liste.'
			],
			[
				'ok',
				'  if (!svar.ok) throw new Error(mottatt.beskjed);',
				'Sjekk HTTP-status',
				'fetch kaster ikke automatisk ved 400. Denne kontrollen gjør et mislykket HTTP-svar til en feil som kalleren kan håndtere.'
			],
			[
				'return',
				'  return mottatt;',
				'Gi listen tilbake',
				'Et vellykket svar returneres til funksjonen som kalte hentRom. Hjelpefunksjonen endrer ikke meldinger selv.'
			],
			[
				'end',
				'}',
				'Avslutt hjelpefunksjonen',
				'Funksjonen kjører først når den kalles, ikke bare fordi den er definert.'
			],
			['blank', '', '', ''],
			[
				'handler',
				'async function visRom() {',
				'Funksjonen til romvalget',
				'Kall visRom fra en knapp eller endringshendelsen til romvelgeren. Øvelsen behandler én request om gangen.'
			],
			[
				'room',
				'  const valgtRom = rom;',
				'Husk rommet for denne kjøringen',
				'En lokal verdi binder requesten og svaret til det samme rommet. I en større app må overlappende rombytter også håndteres.'
			],
			[
				'reset',
				'  status = "";',
				'Klargjør statusfeltet',
				'En gammel bekreftelse fjernes før en ny henting starter. Den gamle listen blir foreløpig stående.'
			],
			[
				'try',
				'  try {',
				'Forsøk å hente',
				'Feil fra nettverket, JSON-parsing eller HTTP-sjekken går til catch.'
			],
			[
				'load',
				'    const hentet = await hentRom(valgtRom);',
				'Vent på rommets liste',
				'Kallet bruker hjelpefunksjonen over. Frontend-listen er uendret mens funksjonen venter.'
			],
			[
				'list',
				'    meldinger = hentet;',
				'Bytt ut frontendens kopi',
				'Bare frontend-listen erstattes. Backend beholder meldinger fra alle rom.'
			],
			[
				'shown-room',
				'    vistRom = valgtRom;',
				'Merk hvilket rom kopien gjelder',
				'Visningen kan nå si at listen faktisk er hentet fra dette rommet.'
			],
			[
				'status',
				'    status = "Viser " + hentet.length + " meldinger i " + valgtRom + ".";',
				'Vis resultatet av GET',
				'Bekreftelsen settes etter at frontend har mottatt og tatt i bruk listen.'
			],
			[
				'catch',
				'  } catch (feil) {',
				'Fang opp feil',
				'Hvis hentRom kaster en feil, blir den gamle frontend-listen beholdt.'
			],
			[
				'error',
				'    const beskjed = feil instanceof Error ? feil.message : "Ukjent feil";',
				'Finn en lesbar beskjed',
				'Error-objekter har message. Reservebeskjeden dekker andre kastede verdier.'
			],
			[
				'error-status',
				'    status = "Feil: " + beskjed;',
				'Vis feilen',
				'Status beskriver feilen. Det lages ingen tom eller falsk ny romliste.'
			],
			['catch-end', '  }', 'Avslutt feilhåndteringen', 'Her slutter catch-blokken.'],
			[
				'handler-end',
				'}',
				'Avslutt hendelsesfunksjonen',
				'Funksjonen er klar til neste brukerhendelse.'
			]
		]);
	}

	if (kind === 'rooms' && side === 'backend') {
		return lines('rb', [
			[
				'route',
				'app.get("/meldinger", (req, res) => {',
				'Motta GET',
				'Express velger denne ruten for GET /meldinger. Query-verdien hentes inne i ruten.'
			],
			[
				'room',
				'  const rom = req.query.rom;',
				'Les rommet fra query',
				'Klienten foreslår rommet. Backend må kontrollere verdien før den brukes.'
			],
			[
				'check',
				'  if (typeof rom !== "string" || !["generelt", "gaming"].includes(rom)) {',
				'Tillat bare kjente rom',
				'Kontrollen avviser både feil type, manglende rom og ukjente romnavn. Query-data fra klienten er ikke automatisk gyldige.'
			],
			[
				'bad',
				'    return res.status(400).json({ beskjed: "Velg et gyldig rom." });',
				'Stopp med 400',
				'return avslutter ruten. Ingen meldinger filtreres eller endres etter denne feilen.'
			],
			['check-end', '  }', 'Avslutt romkontrollen', 'Bare requests med gyldig rom kommer videre.'],
			[
				'filter',
				'  const filtrert = meldinger.filter(melding => melding.rom === rom);',
				'Velg rommets meldinger',
				'filter lager en ny liste med treffene. Den felles meldinger-listen på serveren inneholder fortsatt alle rom.'
			],
			[
				'response',
				'  res.json(filtrert);',
				'Svar med 200 og JSON',
				'Express sender de filtrerte dataene som JSON med status 200. Klienten får data over HTTP, ikke en referanse til serverminnet.'
			],
			[
				'end',
				'});',
				'Avslutt GET-ruten',
				'Ruten registreres én gang og kan deretter håndtere mange requests.'
			]
		]);
	}

	if (kind === 'session' && side === 'frontend') {
		return lines('sf', [
			[
				'function',
				'async function sendMelding() {',
				'Funksjonen til send-knappen',
				'Kall funksjonen fra en brukerhendelse. Den sender én ny melding og henter deretter rommet på nytt.'
			],
			[
				'room',
				'  const valgtRom = rom;',
				'Husk valgt rom',
				'Både POST-bodyen og den etterfølgende GET bruker denne verdien.'
			],
			[
				'reset',
				'  status = "";',
				'Klargjør statusfeltet',
				'Fjern gammel status før en ny sending starter.'
			],
			[
				'try',
				'  try {',
				'Forsøk å sende og oppdatere',
				'Både POST-feil og feil i den etterfølgende GET fanges opp. En GET-feil ruller ikke tilbake en allerede lagret melding.'
			],
			[
				'data',
				options.spoofSender
					? '    const data = { rom: valgtRom, tekst, avsender: "Admin", avsenderId: "elev-admin" };'
					: '    const data = { rom: valgtRom, tekst };',
				'Lag POST-bodyen',
				options.spoofSender
					? 'Dette forsøket sender falske avsenderfelt. Backend bruker dem aldri: navn og eier-ID hentes fra req.session.bruker.'
					: 'Bodyen inneholder rom og meldingstekst. Frontend trenger ikke oppgi hvem som er innlogget.'
			],
			[
				'fetch',
				'    const svar = await fetch(API + "/meldinger", {',
				'Send til backend',
				'await venter på POST-responsen. Frontend-listen blir ikke oppdatert av selve fetch-kallet.'
			],
			[
				'method',
				'      method: "POST",',
				'Velg POST',
				'Denne metoden ber backend opprette en ny melding.'
			],
			[
				'credentials',
				'      credentials: "' + credentials + '",',
				'Velg om cookies sendes',
				cookieExplanation
			],
			[
				'headers',
				'      headers: { "Content-Type": "application/json" },',
				'Oppgi bodyformatet',
				'JSON-middleware på backend bruker denne headeren til å behandle JSON-bodyen.'
			],
			[
				'body',
				'      body: JSON.stringify(data)',
				'Gjør objektet om til JSON',
				'HTTP-requesten får tekst som body. express.json() gjør den om til req.body på backend.'
			],
			[
				'fetch-end',
				'    });',
				'Avslutt fetch-kallet',
				'Her avsluttes requestinnstillingene og kallet til fetch.'
			],
			[
				'json',
				'    const mottatt = await svar.json();',
				'Les bekreftelsen eller feilen',
				'Også et 400- eller 401-svar fra disse rutene har en JSON-body med beskjed.'
			],
			[
				'ok',
				'    if (!svar.ok) throw new Error(mottatt.beskjed);',
				'Kontroller POST-statusen',
				'fetch kaster ikke automatisk ved 400 eller 401. Koden må stoppe før ny henting når POST ble avvist.'
			],
			[
				'refresh',
				'    meldinger = await hentRom(valgtRom);',
				'Hent frontendens nye kopi',
				'Et 201-svar betyr at backend har lagret meldingen. Denne separate GET-requesten oppdaterer romlisten; hjelpefunksjonen står i Rom-utdraget.'
			],
			[
				'shown-room',
				'    vistRom = valgtRom;',
				'Merk hvilken liste som vises',
				'Verdien oppdateres først etter vellykket GET, slik at romnavnet passer til listen.'
			],
			[
				'status',
				'    status = mottatt.beskjed + " Viser " + meldinger.length + " meldinger i " + valgtRom + ".";',
				'Vis bekreftelsen',
				'POST-beskjeden og antallet fra GET vises sammen. Status settes først når begge requestene er fullført.'
			],
			[
				'catch',
				'  } catch (feil) {',
				'Håndter feilen',
				'Ved feil beholdes frontendens forrige liste. En fullført POST kan likevel allerede ha endret backend.'
			],
			[
				'error',
				'    const beskjed = feil instanceof Error ? feil.message : "Ukjent feil";',
				'Finn feilmeldingen',
				'Feilen fra HTTP-kontrollen, JSON-parsing eller nettverket blir gjort lesbar.'
			],
			[
				'error-status',
				'    status = "Feil: " + beskjed;',
				'Vis feilen i frontend',
				'HTTP-feil vises uttrykkelig i stedet for at sendingen ser vellykket ut.'
			],
			['catch-end', '  }', 'Avslutt feilhåndteringen', 'Her slutter catch-blokken.'],
			['end', '}', 'Avslutt send-funksjonen', 'Neste melding krever en ny brukerhendelse.']
		]);
	}

	if (kind === 'session' && side === 'backend') {
		return lines('sb', [
			[
				'route',
				'app.post("/meldinger", (req, res) => {',
				'Motta POST',
				'Ruten forutsetter at JSON- og session-middleware allerede er registrert.'
			],
			[
				'user',
				'  const bruker = req.session?.bruker;',
				'Hent identiteten fra sessionen',
				'Session-middleware har slått opp session-ID-en fra cookien. Navn og stabil bruker-ID kommer fra serverens session-data, ikke fra bodyen.'
			],
			[
				'check-user',
				'  if (!bruker) {',
				'Krev innlogging',
				'Hvis requesten ikke har en session med bruker, får den ikke opprette meldinger.'
			],
			[
				'unauthorized',
				'    return res.status(401).json({ beskjed: "Logg inn først." });',
				'Stopp uinnlogget sending',
				'401 kommer før behandling av meldingsinnholdet. return hindrer at noe legges til.'
			],
			[
				'auth-end',
				'  }',
				'Avslutt innloggingskontrollen',
				'En allerede autentisert bruker kan gå videre til valideringen.'
			],
			[
				'room',
				'  const rom = req.body?.rom;',
				'Les rommet fra bodyen',
				'?. tåler manglende body. Rommet må likevel kontrolleres.'
			],
			[
				'text',
				'  const tekst = req.body?.tekst;',
				'Les meldingsteksten',
				'Backend leser bare tekst og rom fra bodyen. Eventuelle avsenderfelt blir ignorert.'
			],
			[
				'valid-room-type',
				'  if (typeof rom !== "string" ||',
				'Kontroller romtypen',
				'Et rom må være en streng. Kortslutning med || beskytter resten av kontrollen.'
			],
			[
				'valid-room',
				'      !["generelt", "gaming"].includes(rom) ||',
				'Kontroller romnavnet',
				'Bare de to rommene som denne appen kjenner, godtas.'
			],
			[
				'valid-text',
				'      typeof tekst !== "string" || !tekst.trim()) {',
				'Krev tekst med innhold',
				'Feil type, tom tekst og bare mellomrom avvises. trim kalles først etter typekontrollen.'
			],
			[
				'invalid',
				'    return res.status(400).json({ beskjed: "Velg et gyldig rom og skriv tekst." });',
				'Stopp ugyldig input',
				'400 betyr at requesten er ugyldig. Den felles meldingslisten og ID-telleren er uendret.'
			],
			['valid-end', '  }', 'Avslutt valideringen', 'Gyldig input går videre til opprettelsen.'],
			[
				'new',
				'  const nyMelding = {',
				'Lag den serverstyrte meldingen',
				'Backend bygger et nytt objekt med bare feltene appen skal lagre.'
			],
			[
				'id',
				'    id: nesteId++,',
				'Gi meldingen en stabil ID',
				'Serverens teller økes én gang. ID-en er ikke en arrayindeks og brukes ikke på nytt ved sletting.'
			],
			[
				'room-value',
				'    rom,',
				'Lagre rommet',
				'Rommet er allerede validert og blir del av meldingen.'
			],
			[
				'owner',
				'    avsenderId: bruker.id, avsender: bruker.navn,',
				'Sett eier og visningsnavn fra session',
				'Den stabile bruker-ID-en brukes ved eierkontroll. Selv en body med avsender Admin kan ikke overstyre disse verdiene.'
			],
			[
				'trim',
				'    tekst: tekst.trim()',
				'Lagre den ryddede teksten',
				'Mellomrom før og etter innholdet fjernes på serveren.'
			],
			[
				'new-end',
				'  };',
				'Avslutt meldingsobjektet',
				'Objektet har nå ID, rom, eier, visningsnavn og tekst.'
			],
			[
				'push',
				'  meldinger.push(nyMelding);',
				'Legg meldingen i felles serverminne',
				'Meldinger i andre rom beholdes. Frontendens liste endres ikke av denne linjen.'
			],
			[
				'response',
				'  res.status(201).json({ beskjed: "Meldingen er lagret.", melding: nyMelding });',
				'Bekreft med 201',
				'Svaret inneholder den faktisk lagrede meldingen med serverens ID og sessionens avsender.'
			],
			[
				'end',
				'});',
				'Avslutt POST-ruten',
				'Ruten registreres én gang og kjører på nytt for hver POST.'
			]
		]);
	}

	if (kind === 'delete' && side === 'frontend') {
		return lines('df', [
			[
				'function',
				'async function slettMelding(id) {',
				'Motta meldingens stabile ID',
				'Kall for eksempel slettMelding(melding.id) fra slett-knappen. Ikke send posisjonen i en filtrert liste.'
			],
			[
				'room',
				'  const valgtRom = rom;',
				'Husk rommet som skal oppdateres',
				'DELETE velger en melding med ID. Etterpå hentes dette rommet på nytt.'
			],
			[
				'reset',
				'  status = "";',
				'Klargjør statusfeltet',
				'Fjern forrige bekreftelse før en ny request starter.'
			],
			[
				'try',
				'  try {',
				'Forsøk å slette og oppdatere',
				'Feil fra både DELETE og den etterfølgende GET fanges opp.'
			],
			[
				'url',
				'    const url = API + "/meldinger/" + encodeURIComponent(id);',
				'Legg ID-en i stien',
				'Express leser dette som req.params.id. Backend kontrollerer både ID og eier selv.'
			],
			[
				'fetch',
				'    const svar = await fetch(url, {',
				'Send sletteforespørselen',
				'En request ber serveren slette. Frontend fjerner ikke meldingen på egen hånd før serveren har svart.'
			],
			[
				'method',
				'      method: "DELETE",',
				'Velg DELETE',
				'Metoden skiller sletteruten fra GET og POST. Det trengs ingen body i dette eksemplet.'
			],
			[
				'credentials',
				'      credentials: "' + credentials + '"',
				'Send session-ID hvis tillatt',
				cookieExplanation
			],
			[
				'fetch-end',
				'    });',
				'Avslutt fetch-kallet',
				'Her avsluttes requestinnstillingene og kallet til fetch.'
			],
			[
				'json',
				'    const mottatt = await svar.json();',
				'Les JSON-svaret',
				'Denne ruten bruker 200 med JSON ved suksess, slik at svar.json() passer også da.'
			],
			[
				'ok',
				'    if (!svar.ok) throw new Error(mottatt.beskjed);',
				'Kontroller DELETE-statusen',
				'fetch avviser ikke automatisk 401, 403 eller 404. Denne sjekken hindrer at frontend later som slettingen lyktes.'
			],
			[
				'refresh',
				'    meldinger = await hentRom(valgtRom);',
				'Hent listen etter sletting',
				'Dette er en ny GET-request. Før den er fullført, kan frontend fortsatt vise den gamle kopien med den slettede meldingen.'
			],
			[
				'shown-room',
				'    vistRom = valgtRom;',
				'Merk rommet til den nye listen',
				'Rommarkeringen oppdateres sammen med den ferdig hentede listen.'
			],
			[
				'status',
				'    status = mottatt.beskjed + " Viser " + meldinger.length + " meldinger i " + valgtRom + ".";',
				'Vis bekreftelse og oppdatert antall',
				'DELETE-beskjeden beholdes, selv om den siste requesten var GET med status 200.'
			],
			[
				'catch',
				'  } catch (feil) {',
				'Fang opp avvisning eller hentefeil',
				'Den gamle frontend-listen beholdes. En allerede gjennomført sletting rulles ikke tilbake hvis neste GET feiler.'
			],
			[
				'error',
				'    const beskjed = feil instanceof Error ? feil.message : "Ukjent feil";',
				'Finn feilmeldingen',
				'Backendens beskjed blir tilgjengelig gjennom feilen som HTTP-sjekken kastet.'
			],
			[
				'error-status',
				'    status = "Feil: " + beskjed;',
				'Vis feilen',
				'Status gjør det tydelig at hele forløpet ikke ble fullført uten feil.'
			],
			['catch-end', '  }', 'Avslutt feilhåndteringen', 'Her slutter catch-blokken.'],
			[
				'end',
				'}',
				'Avslutt slettefunksjonen',
				'En ny sletting krever et nytt kall med en konkret meldings-ID.'
			]
		]);
	}

	if (kind === 'delete' && side === 'backend') {
		return lines('db', [
			[
				'route',
				'app.delete("/meldinger/:id", (req, res) => {',
				'Motta DELETE med en ID',
				'Express gjør stidelen etter /meldinger/ tilgjengelig som req.params.id.'
			],
			[
				'user',
				'  const bruker = req.session?.bruker;',
				'Hent innlogget bruker',
				'Identiteten kommer fra serverens session-data. Frontend kan ikke velge eier ved å sende et navn.'
			],
			[
				'check-user',
				'  if (!bruker) {',
				'Krev innlogging først',
				'En request uten innlogget session stoppes før ID- eller eierkontroll.'
			],
			[
				'unauthorized',
				'    return res.status(401).json({ beskjed: "Logg inn først." });',
				'Svar 401',
				'Ingen melding slettes. Manglende cookie kan gi dette svaret selv om en session fortsatt finnes på serveren.'
			],
			[
				'auth-end',
				'  }',
				'Avslutt innloggingskontrollen',
				'Bare en innlogget bruker får fortsette.'
			],
			[
				'raw-id',
				'  const rawId = req.params.id;',
				'Les ID-en som tekst',
				'Verdier fra URL-stien er tekst. De må kontrolleres før de brukes som tall.'
			],
			[
				'valid-id',
				'  if (typeof rawId !== "string" || !/^[1-9]\\d*$/.test(rawId) ||',
				'Krev et positivt heltall i stien',
				'Mønsteret avviser blant annet tekst, desimaltall, 0 og delvis numeriske verdier som 1abc.'
			],
			[
				'safe-id',
				'      !Number.isSafeInteger(Number(rawId))) {',
				'Krev en nøyaktig heltallsverdi',
				'JavaScript må kunne representere ID-en nøyaktig; svært store tall avvises.'
			],
			[
				'invalid-id',
				'    return res.status(400).json({ beskjed: "Ugyldig meldings-ID." });',
				'Svar 400 ved ugyldig ID',
				'Ingen oppslag eller mutasjon skjer når ID-formatet er ugyldig.'
			],
			['id-check-end', '  }', 'Avslutt ID-kontrollen', 'En gyldig ID kan nå gjøres om til tall.'],
			[
				'id',
				'  const id = Number(rawId);',
				'Gjør ID-en om til tall',
				'Kontrollen over gjør at hele strengen er et gyldig, positivt heltall.'
			],
			[
				'find',
				'  const melding = meldinger.find(melding => melding.id === id);',
				'Finn meldingen med denne ID-en',
				'Oppslaget bruker meldings-ID, ikke indeks. Filtrering av rom eller tidligere sletting endrer ikke identiteten.'
			],
			[
				'not-found',
				'  if (!melding) {',
				'Kontroller at meldingen finnes',
				'En gammel frontend-kopi kan peke på en ID som allerede er slettet.'
			],
			[
				'not-found-response',
				'    return res.status(404).json({ beskjed: "Meldingen finnes ikke." });',
				'Svar 404',
				'Det finnes ingen melding med denne gyldige ID-en. Serverlisten forblir uendret.'
			],
			[
				'not-found-end',
				'  }',
				'Avslutt oppslagskontrollen',
				'Eierkontrollen gjelder den konkrete meldingen som ble funnet.'
			],
			[
				'owner',
				'  if (melding.avsenderId !== bruker.id) {',
				'Kontroller eieren på serveren',
				'Sammenlign to stabile ID-er. Et visningsnavn eller en skjult knapp i frontend gir ingen tilgangskontroll.'
			],
			[
				'forbidden',
				'    return res.status(403).json({ beskjed: "Du kan bare slette egne meldinger." });',
				'Svar 403 til en annen eier',
				'Brukeren er innlogget, men har ikke lov til å slette denne meldingen.'
			],
			['owner-end', '  }', 'Avslutt eierkontrollen', 'Bare eieren når frem til mutasjonen.'],
			[
				'remove',
				'  meldinger = meldinger.filter(melding => melding.id !== id);',
				'Fjern akkurat denne meldingen',
				'Den felles serverlisten beholder alle andre meldinger, også meldinger i andre rom. nesteId endres ikke.'
			],
			[
				'response',
				'  res.json({ beskjed: "Meldingen er slettet.", slettetId: id });',
				'Svar 200 med JSON',
				'Klienten får en bekreftelse med den slettede ID-en. Denne ruten bruker ikke 204.'
			],
			[
				'end',
				'});',
				'Avslutt DELETE-ruten',
				'Ruten registreres én gang og utfører alle kontrollene på nytt for hver request.'
			]
		]);
	}

	throw new RangeError('Ukjent kodeutdrag.');
}

/** @param {Melding[]} messages @returns {Melding[]} */
function copyMessages(messages) {
	return messages.map((message) => ({ ...message }));
}

/** @param {LabState} state @returns {LabState} */
function copyState(state) {
	return {
		serverMessages: copyMessages(state.serverMessages),
		clientMessages: copyMessages(state.clientMessages),
		clientRoom: state.clientRoom,
		nextId: state.nextId
	};
}

/**
 * Kopier JSON-kompatible verdier uten en rekursiv typealias.
 * Dette beskytter også feilforsøk med objekter i body-felt som skulle vært tekst.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function copyValue(value) {
	if (Array.isArray(value)) return value.map(copyValue);
	if (value && typeof value === 'object') {
		/** @type {Record<string, unknown>} */
		const result = {};
		for (const [key, entry] of Object.entries(value)) result[key] = copyValue(entry);
		return result;
	}
	return value;
}

/** @param {RequestBody | null} body @returns {RequestBody | null} */
function copyRequestBody(body) {
	if (!body) return null;
	const result = { rom: copyValue(body.rom), tekst: copyValue(body.tekst) };
	return {
		...result,
		...('avsender' in body ? { avsender: copyValue(body.avsender) } : {}),
		...('avsenderId' in body ? { avsenderId: copyValue(body.avsenderId) } : {})
	};
}

/** @param {ResponseBody | null} body @returns {ResponseBody | null} */
function copyResponseBody(body) {
	if (!body) return null;
	if (Array.isArray(body)) return copyMessages(body);
	return { ...body, ...(body.melding ? { melding: { ...body.melding } } : {}) };
}

/** @param {Trace} trace @returns {Trace} */
function copyTrace(trace) {
	return {
		...trace,
		requestBody: copyRequestBody(trace.requestBody),
		responseBody: copyResponseBody(trace.responseBody),
		requestUser: trace.requestUser ? { ...trace.requestUser } : null
	};
}

/** @param {unknown} room @returns {room is Room} */
function isRoom(room) {
	return typeof room === 'string' && ROOMS.some((item) => item.id === room);
}

/** @param {RunOptions} options @returns {Bruker | null} */
function resolveUser(options) {
	if (!options.credentials || options.session === 'none') return null;
	const user = USERS[options.session];
	return user ? { ...user } : null;
}

/**
 * Begynn med samme lille chat som i den opprinnelige romøvelsen, med Ada og
 * Noah som kjente eiere. Frontend har ikke hentet noen liste ennå.
 *
 * @returns {LabState}
 */
export function initState() {
	return {
		serverMessages: [
			{
				id: 1,
				rom: 'generelt',
				avsenderId: USERS.ada.id,
				avsender: USERS.ada.navn,
				tekst: 'Hei alle sammen!'
			},
			{
				id: 2,
				rom: 'gaming',
				avsenderId: USERS.noah.id,
				avsender: USERS.noah.navn,
				tekst: 'Noen som vil spille etter skolen?'
			},
			{
				id: 3,
				rom: 'generelt',
				avsenderId: USERS.noah.id,
				avsender: USERS.noah.navn,
				tekst: 'Jeg tester chatten.'
			}
		],
		clientMessages: [],
		clientRoom: null,
		nextId: 4
	};
}

/**
 * Planlegg ett avgrenset forsøk uten å endre state eller options.
 *
 * GET: send → valider → filtrer/svar → kontroller svaret → oppdater klienten.
 * POST/DELETE: send → session → input/oppslag → mutasjon/svar → HTTP-sjekk
 * → separat GET → GET-svar → oppdater klienten.
 *
 * Avvisning stopper før mutasjon og før ny GET. Feil i en GET etter en
 * vellykket mutasjon ruller ikke tilbake backend; mutationStatus bevares.
 * Det simuleres ikke nettverksbrudd eller parallelle requests.
 *
 * @param {LabState} state
 * @param {Kind} kind
 * @param {Partial<RunOptions>} [options={}]
 * @returns {RunStep[]}
 */
export function planRun(state, kind, options = {}) {
	if (kind !== 'rooms' && kind !== 'session' && kind !== 'delete') {
		throw new RangeError('Ukjent chatmodul.');
	}
	const work = copyState(state);
	const input = { ...DEFAULT_OPTIONS, ...options };
	/** @type {RunStep[]} */
	const steps = [];
	/** @type {Trace} */
	const trace = {
		status: '',
		httpStatus: null,
		mutationStatus: null,
		requestMethod: 'GET',
		requestPath: '',
		requestBody: null,
		responseBody: null,
		requestUser: null
	};

	/**
	 * @param {string} id
	 * @param {Kind} codeKind
	 * @param {Side} side
	 * @param {string[]} lineIds
	 * @param {string} title
	 * @param {string} explanation
	 */
	function add(id, codeKind, side, lineIds, title, explanation) {
		steps.push({
			...copyState(work),
			...copyTrace(trace),
			id,
			codeKind,
			side,
			lineIds: [...lineIds],
			title,
			explanation
		});
	}

	/**
	 * @param {number} httpStatus
	 * @param {ResponseBody} body
	 * @param {boolean} [mutation=false]
	 */
	function respond(httpStatus, body, mutation = false) {
		trace.httpStatus = httpStatus;
		trace.responseBody = copyResponseBody(body);
		if (mutation) trace.mutationStatus = httpStatus;
	}

	/**
	 * En ny request har ennå ikke noe svar eller serveroppslått bruker.
	 * Den primære mutationsstatusen beholdes hvis dette er en oppfølgende GET.
	 */
	function beginGet() {
		trace.requestMethod = 'GET';
		trace.requestPath = '/meldinger?rom=' + encodeURIComponent(input.room);
		trace.requestBody = null;
		trace.responseBody = null;
		trace.httpStatus = null;
		trace.requestUser = null;
	}

	/**
	 * @param {Kind} failedKind
	 * @param {string} message
	 * @param {string} explanation
	 */
	function frontendFailure(failedKind, message, explanation) {
		const prefix = failedKind === 'rooms' ? 'rf' : failedKind === 'session' ? 'sf' : 'df';
		add(
			failedKind + '-check-error',
			failedKind,
			'frontend',
			[prefix + '-json', prefix + '-ok'],
			'Frontend sjekker HTTP-statusen',
			'fetch har gitt et svar med status ' +
				trace.httpStatus +
				'. svar.ok er false, så koden kaster en feil med backendens beskjed.'
		);
		trace.status = 'Feil: ' + message;
		add(
			failedKind + '-error',
			failedKind,
			'frontend',
			[prefix + '-error', prefix + '-error-status'],
			'Vis feilen og behold listen',
			explanation
		);
	}

	/**
	 * Kjør den felles GET etter en vellykket POST/DELETE. Bare tre ekstra
	 * undervisningstrinn trengs: GET-kall, backend-svar, callerens oppdatering.
	 *
	 * @param {'session' | 'delete'} mutationKind
	 * @param {string} confirmation
	 */
	function refreshAfterMutation(mutationKind, confirmation) {
		const prefix = mutationKind === 'session' ? 'sf' : 'df';
		beginGet();
		add(
			mutationKind + '-refresh-request',
			'rooms',
			'frontend',
			['rf-url', 'rf-fetch'],
			'Hent rommet med en egen GET',
			'POST/DELETE er ferdig med status ' +
				trace.mutationStatus +
				'. hentRom spør nå etter ' +
				input.room +
				', som ble valgt før kjøringen. Frontend viser fortsatt sin forrige kopi.'
		);
		trace.requestUser = resolveUser(input);
		if (!isRoom(input.room)) {
			respond(400, { beskjed: 'Velg et gyldig rom.' });
			add(
				mutationKind + '-refresh-invalid',
				'rooms',
				'backend',
				['rb-check', 'rb-bad'],
				'GET avviser et ukjent rom',
				'Mutasjonen er allerede utført. Denne separate romhentingen får 400 og endrer ingen meldinger.'
			);
			trace.status = 'Feil: Velg et gyldig rom.';
			add(
				mutationKind + '-refresh-error',
				mutationKind,
				'frontend',
				[prefix + '-catch', prefix + '-error-status'],
				'Mutasjonen er utført, men listen er ikke hentet',
				'hentRom sjekker svar.ok og kaster en feil. Frontend beholder sin forrige liste. Status ' +
					trace.mutationStatus +
					' for den gjennomførte mutasjonen rulles ikke tilbake.'
			);
			return;
		}
		const filtered = copyMessages(
			work.serverMessages.filter((message) => message.rom === input.room)
		);
		respond(200, filtered);
		add(
			mutationKind + '-refresh-response',
			'rooms',
			'backend',
			['rb-check', 'rb-filter', 'rb-response'],
			'Backend sender det valgte rommet',
			'GET validerer rommet og sender ' +
				filtered.length +
				' meldinger med 200. Den felles serverlisten inneholder fortsatt meldingene fra begge rom.'
		);
		work.clientMessages = copyMessages(filtered);
		work.clientRoom = input.room;
		trace.status = confirmation + ' Viser ' + filtered.length + ' meldinger i ' + input.room + '.';
		add(
			mutationKind + '-complete',
			mutationKind,
			'frontend',
			[prefix + '-refresh', prefix + '-shown-room', prefix + '-status'],
			'Vis den oppdaterte frontend-kopien',
			'hentRom har lest JSON og kontrollert svar.ok. Først nå erstattes frontend-listen. Bekreftelsen fra ' +
				(mutationKind === 'session' ? 'POST 201' : 'DELETE 200') +
				' og resultatet av den separate GET vises sammen.'
		);
	}

	if (kind === 'rooms') {
		beginGet();
		add(
			'rooms-request',
			'rooms',
			'frontend',
			['rf-room', 'rf-url', 'rf-fetch'],
			'Spør backend om valgt rom',
			'Frontend sender GET for ' +
				input.room +
				'. Valg av rom har ennå ikke endret frontend-listen eller den felles listen på serveren.'
		);
		trace.requestUser = resolveUser(input);
		if (!isRoom(input.room)) {
			respond(400, { beskjed: 'Velg et gyldig rom.' });
			add(
				'rooms-invalid',
				'rooms',
				'backend',
				['rb-room', 'rb-check', 'rb-bad'],
				'Backend avviser rommet',
				'Rommet mangler eller er ugyldig. Ruten svarer 400 før filter kjøres; ingen av listene endres.'
			);
			frontendFailure(
				'rooms',
				'Velg et gyldig rom.',
				'Det ugyldige rommet erstatter ikke frontendens forrige liste eller rommerking. Serveren beholder alle meldinger.'
			);
			return steps;
		}
		add(
			'rooms-validate',
			'rooms',
			'backend',
			['rb-room', 'rb-check'],
			'Backend kontrollerer query-verdien',
			'req.query.rom er en streng med det tillatte rommet ' +
				input.room +
				'. Denne GET-ruten er offentlig og krever ikke innlogging.'
		);
		const filtered = copyMessages(
			work.serverMessages.filter((message) => message.rom === input.room)
		);
		respond(200, filtered);
		add(
			'rooms-response',
			'rooms',
			'backend',
			['rb-filter', 'rb-response'],
			'Filtrer uten å fjerne andre rom',
			'filter lager en liste med ' +
				filtered.length +
				' meldinger fra ' +
				input.room +
				'. Den sendes med 200; den felles serverlisten er urørt.'
		);
		add(
			'rooms-check',
			'rooms',
			'frontend',
			['rf-json', 'rf-ok', 'rf-return'],
			'Les og kontroller GET-svaret',
			'JSON-dataene blir en ny verdi i nettleseren. svar.ok er true, så hentRom gir listen tilbake til visRom.'
		);
		work.clientMessages = copyMessages(filtered);
		work.clientRoom = input.room;
		trace.status = 'Viser ' + filtered.length + ' meldinger i ' + input.room + '.';
		add(
			'rooms-complete',
			'rooms',
			'frontend',
			['rf-list', 'rf-shown-room', 'rf-status'],
			'Oppdater bare frontendens kopi',
			'Frontend viser nå ' +
				input.room +
				'. Meldinger i det andre rommet finnes fortsatt på serveren og kan hentes med en ny GET.'
		);
		return steps;
	}

	const isPost = kind === 'session';
	const backPrefix = isPost ? 'sb' : 'db';
	trace.requestMethod = isPost ? 'POST' : 'DELETE';
	trace.requestPath = isPost ? '/meldinger' : '/meldinger/' + encodeURIComponent(input.messageId);
	if (isPost) {
		trace.requestBody = {
			rom: copyValue(input.room),
			tekst: copyValue(input.text),
			...(input.spoofSender ? { avsender: 'Admin', avsenderId: 'elev-admin' } : {})
		};
	}
	add(
		kind + '-request',
		kind,
		'frontend',
		isPost ? ['sf-data', 'sf-fetch', 'sf-credentials'] : ['df-url', 'df-fetch', 'df-credentials'],
		isPost ? 'Send tekst og rom til backend' : 'Be backend slette en konkret ID',
		(isPost
			? 'POST sender bodyen som JSON. ' +
				(input.spoofSender
					? 'De falske avsenderfeltene blir sendt, men gir ingen rett til å velge identitet. '
					: 'Ingen avsender trengs i bodyen. ')
			: 'DELETE bruker meldings-ID ' + input.messageId + ', ikke posisjonen i frontend-listen. ') +
			(input.credentials
				? 'Requesten får ta med session-cookien hvis det finnes en.'
				: 'credentials: "omit" utelater cookie-ID-en; dette sletter ikke en eksisterende session.')
	);

	const user = resolveUser(input);
	trace.requestUser = user ? { ...user } : null;
	if (!user) {
		respond(401, { beskjed: 'Logg inn først.' }, true);
		add(
			kind + '-unauthorized',
			kind,
			'backend',
			[backPrefix + '-user', backPrefix + '-check-user', backPrefix + '-unauthorized'],
			'Ingen innlogget bruker i requesten',
			input.session !== 'none' && !input.credentials
				? 'En session for den valgte brukeren kan fortsatt finnes, men cookie-ID-en ble utelatt. req.session?.bruker mangler i denne requesten, så backend svarer 401.'
				: 'Sessionen har ingen innlogget bruker. Backend svarer 401 før meldingsinnhold, ID eller eier vurderes.'
		);
		frontendFailure(
			kind,
			'Logg inn først.',
			'Frontend viser 401-feilen og starter ingen ny GET. Både serverlisten, frontend-listen og ID-telleren er uendret.'
		);
		return steps;
	}
	add(
		kind + '-session',
		kind,
		'backend',
		[backPrefix + '-user', backPrefix + '-check-user'],
		'Backend finner ' + user.navn + ' i sessionen',
		'Session-middleware har gjort brukeren ' +
			user.id +
			' tilgjengelig som req.session.bruker. Identiteten kommer fra serverens session-data.'
	);

	if (isPost) {
		const body = trace.requestBody;
		if (!body || !isRoom(body.rom) || typeof body.tekst !== 'string' || !body.tekst.trim()) {
			respond(400, { beskjed: 'Velg et gyldig rom og skriv tekst.' }, true);
			add(
				'session-invalid',
				'session',
				'backend',
				['sb-valid-room-type', 'sb-valid-text', 'sb-invalid'],
				'Backend avviser ugyldig innhold',
				'En innlogget bruker må også sende et kjent rom og tekst med innhold. 400 kommer før ny ID og push; ingen melding blir lagret.'
			);
			frontendFailure(
				'session',
				'Velg et gyldig rom og skriv tekst.',
				'Frontend viser valideringsfeilen og starter ingen GET. Begge listene og ID-telleren er uendret.'
			);
			return steps;
		}
		add(
			'session-validate',
			'session',
			'backend',
			['sb-room', 'sb-valid-room', 'sb-valid-text'],
			'Kontroller rom og tekst',
			'Rommet er tillatt og teksten har innhold. Backend leser ikke avsender eller avsenderId fra bodyen, selv om feltene er sendt.'
		);
		const newMessage = {
			id: work.nextId++,
			rom: body.rom,
			avsenderId: user.id,
			avsender: user.navn,
			tekst: body.tekst.trim()
		};
		work.serverMessages.push({ ...newMessage });
		respond(201, { beskjed: 'Meldingen er lagret.', melding: newMessage }, true);
		add(
			'session-created',
			'session',
			'backend',
			['sb-owner', 'sb-push', 'sb-response'],
			'Lagre som ' + user.navn + ' og svar 201',
			'Ny melding ' +
				newMessage.id +
				' eies av ' +
				user.id +
				' og ligger i ' +
				newMessage.rom +
				'.' +
				(input.spoofSender ? ' De falske Admin-feltene er ignorert.' : '') +
				' Andre rom beholdes, mens frontend fortsatt viser sin gamle kopi.'
		);
		add(
			'session-check',
			'session',
			'frontend',
			['sf-json', 'sf-ok'],
			'POST lyktes; listen må fortsatt hentes',
			'Frontend leser 201-svaret og kontrollerer svar.ok. Bekreftelsen er ikke en oppdatert romliste, så neste linje kaller hentRom.'
		);
		refreshAfterMutation('session', 'Meldingen er lagret.');
		return steps;
	}

	const rawId = String(input.messageId);
	if (!/^[1-9]\d*$/.test(rawId) || !Number.isSafeInteger(Number(rawId))) {
		respond(400, { beskjed: 'Ugyldig meldings-ID.' }, true);
		add(
			'delete-invalid-id',
			'delete',
			'backend',
			['db-valid-id', 'db-safe-id', 'db-invalid-id'],
			'Avvis en ugyldig ID med 400',
			'ID-en fra URL-stien er ikke et gyldig positivt heltall. Ingen melding blir slått opp eller slettet.'
		);
		frontendFailure(
			'delete',
			'Ugyldig meldings-ID.',
			'Frontend viser ID-feilen. Ingen GET startes, og alle meldinger beholdes.'
		);
		return steps;
	}
	const id = Number(rawId);
	const message = work.serverMessages.find((entry) => entry.id === id);
	if (!message) {
		respond(404, { beskjed: 'Meldingen finnes ikke.' }, true);
		add(
			'delete-not-found',
			'delete',
			'backend',
			['db-find', 'db-not-found', 'db-not-found-response'],
			'Ingen melding med denne ID-en',
			'ID ' +
				id +
				' har gyldig format, men finnes ikke i serverlisten. Backend svarer 404; en gammel frontend-kopi kan fortsatt inneholde ID-en.'
		);
		frontendFailure(
			'delete',
			'Meldingen finnes ikke.',
			'Frontend viser 404 og beholder sin forrige liste. En ny romhenting kan brukes for å oppdatere en gammel kopi.'
		);
		return steps;
	}
	add(
		'delete-find',
		'delete',
		'backend',
		['db-valid-id', 'db-id', 'db-find'],
		'Finn melding ' + id + ' med stabil ID',
		'Oppslaget finner meldingen i ' +
			message.rom +
			', uavhengig av plasseringen i en filtrert liste. Backend har ennå ikke slettet noe.'
	);
	if (message.avsenderId !== user.id) {
		respond(403, { beskjed: 'Du kan bare slette egne meldinger.' }, true);
		add(
			'delete-forbidden',
			'delete',
			'backend',
			['db-owner', 'db-forbidden'],
			'Innlogget, men ikke eier: 403',
			'Meldingen eies av ' +
				message.avsenderId +
				', mens sessionen tilhører ' +
				user.id +
				'. Kontrollen skjer på serveren; en frontendknapp kan ikke overstyre den.'
		);
		frontendFailure(
			'delete',
			'Du kan bare slette egne meldinger.',
			'Frontend viser eierfeilen og starter ingen GET. Meldingen og alle andre rom beholdes.'
		);
		return steps;
	}
	work.serverMessages = work.serverMessages.filter((entry) => entry.id !== id);
	respond(200, { beskjed: 'Meldingen er slettet.', slettetId: id }, true);
	add(
		'delete-removed',
		'delete',
		'backend',
		['db-owner', 'db-remove', 'db-response'],
		'Eieren får slette: 200 med JSON',
		user.id +
			' eier melding ' +
			id +
			', så backend fjerner akkurat den. Alle andre meldinger og nextId beholdes. Frontend kan fortsatt vise den gamle kopien til GET er ferdig.'
	);
	add(
		'delete-check',
		'delete',
		'frontend',
		['df-json', 'df-ok'],
		'Kontroller bekreftelsen fra DELETE',
		'Frontend leser JSON-bodyen og ser at svar.ok er true. Slettingen er gjort på backend; den synlige romlisten må hentes på nytt.'
	);
	refreshAfterMutation('delete', 'Meldingen er slettet.');
	return steps;
}

/** @type {{id: Kind, number: string, title: string, method: string, goal: string, instruction: string, question: string}[]} */
export const CHATROOM_LESSONS = [
	{
		id: 'rooms',
		number: '01',
		title: 'Velg rom',
		method: 'GET',
		goal: 'Hent bare meldingene som tilhører rommet du har valgt.',
		instruction: 'Velg et rom og trykk «Hent rommet». Følg stegene, bytt rom og hent igjen. Se hvilke meldinger backend sender tilbake.',
		question: 'Hva må frontend sende for at backend skal vite hvilket rom du vil se?'
	},
	{
		id: 'session',
		number: '02',
		title: 'Send som innlogget',
		method: 'POST',
		goal: 'La backend finne avsenderen i sessionen når en melding sendes.',
		instruction: 'Velg en innlogget bruker og send en melding. Prøv igjen uten innlogging. Sammenlign avsender, HTTP-svar og serverlisten.',
		question: 'Kan noen bytte avsender ved å endre det som sendes fra nettleseren?'
	},
	{
		id: 'delete',
		number: '03',
		title: 'Slett egen melding',
		method: 'DELETE',
		goal: 'Bruk meldings-ID og sjekk eierskap før backend sletter.',
		instruction: 'Velg en melding og prøv å slette den som eier, deretter som en annen bruker. Nullstill dataene mellom forsøkene, og kontroller både svaret og meldingslisten.',
		question: 'Hva stopper en bruker fra å slette en annens melding?'
	}
];
