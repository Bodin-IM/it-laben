/**
 * Meldingsdetektiven: fire uavhengige feilsøkingssaker.
 * Hver prøve starter med egne data. Alle hendelser er kopierte snapshots.
 * Modellen gjør ingen requests, bruker ingen DOM, eval, lagring eller timere.
 */

/** @typedef {'kontrakt'|'visning'|'session'|'dobbel'} CaseId */
/** @typedef {'frontend'|'backend'} Side */
/** @typedef {{id:number,rom:string,avsender:string,tekst:string}} Message */
/** @typedef {{id:string,label:string,preview:string}} Choice */
/** @typedef {{id:string,label:string,side:Side,choices:Choice[]}} Patch */
/** @typedef {{id:string,text:string,title:string,explanation:string,patchId?:string}} CodeLine */
/** @typedef {{id:CaseId,number:number,title:string,report:string,goal:string,lead:string,hint:string,lesson:string,context:string,initialProbeId:string}} DetectiveCase */
/** @typedef {{id:string,label:string,description:string,actionLabel:string}} Probe */
/** @typedef {{id:string,label:string,passed:boolean,detail:string}} Check */
/** @typedef {'frontend'|'request'|'backend'|'response'|'view'} Stage */
/** @typedef {{id:string,stage:Stage,title:string,detail:string,side:Side,lineIds:string[],method:'GET'|'POST'|null,url:string|null,status:number|null,requestBody:unknown,responseBody:unknown,sentCookie:boolean|null,cookieJar:string|null,server:Message[],browser:Message[],logs:string[]}} Event */
/** @typedef {{probeId:string,title:string,summary:string,passed:boolean,checks:Check[],events:Event[],before:{server:Message[],browser:Message[]},after:{server:Message[],browser:Message[]},requestCount:number}} ProbeRun */
/** @typedef {{success:boolean,passed:number,total:number,results:ProbeRun[]}} Verification */
/** @typedef {{id:string,navn:string}} User */
/** @typedef {{method:'GET'|'POST',url:string,requestBody:unknown,sentCookie:boolean,cookieJar:string,status?:number|null,responseBody?:unknown}} HttpMeta */
/** @typedef {{prefix:string,server:Message[],browser:Message[],before:{server:Message[],browser:Message[]},events:Event[],logs:string[],requestCount:number,nextId:number,cookieJar:string}} Runtime */

/** @template T @param {T} value @returns {T} */
function copy(value) {
	return structuredClone(value);
}

/** @type {ReadonlyArray<Readonly<DetectiveCase>>} */
export const CASES = Object.freeze([
	Object.freeze({
		id: 'kontrakt',
		number: 1,
		title: 'Meldingen som blir avvist',
		report: '«Jeg har skrevet en melding, men får bare 400.»',
		goal: 'Send riktig innhold gjennom API-et, og behold avvisningen av tom tekst.',
		lead: 'Sammenlign request-body med det backend faktisk leser.',
		hint: 'Et feltnavn er en del av avtalen mellom frontend og backend. Et 201-svar beviser ikke alene at riktig innhold er lagret.',
		lesson:
			'Undersøk både status, innhold og serverdata. Frontend og backend må bruke samme feltnavn, og valideringen beskytter dataene.',
		context:
			'En lokal simulering med Ada som avsender. GET etter en vellykket POST er allerede på plass. API-et forventer tekst i feltet tekst.',
		initialProbeId: 'vanlig'
	}),
	Object.freeze({
		id: 'visning',
		number: 2,
		title: '200 OK, men feil chat',
		report: '«Noah skrev i Gaming. Jeg får 200, men meldingen kommer ikke fram.»',
		goal: 'Vis bare det valgte rommet, og hold visningen riktig ved rombytte og gjentatt oppdatering.',
		lead: 'GET blir allerede sendt. Følg både innholdet i svaret og variabelen som vises.',
		hint: 'Velg forskjellige rom. Sammenlign URL, response-body og listen som Svelte faktisk bruker.',
		lesson:
			'200 forteller at requesten lyktes. Riktig visning krever både riktig serverutvalg og at den viste state-verdien oppdateres.',
		context:
			'Serveren har rommene Generelt og Gaming. Arbeid er et gyldig, tomt rom. Browseren begynner med en gammel kopi fra Generelt. Hver prøve starter på nytt.',
		initialProbeId: 'gaming'
	}),
	Object.freeze({
		id: 'session',
		number: 3,
		title: 'Innlogget, men får 401',
		report: '«Jeg er innlogget. Likevel sier chatten at jeg må logge inn.»',
		goal: 'La Ada og Noah sende og lese som innloggede brukere. Gjester skal fortsatt få 401.',
		lead: 'Se etter forskjellen mellom en cookie i nettleseren og en cookie som faktisk sendes.',
		hint: 'POST og GET er to egne requests. Sammenlign cookie-lageret, request-cookien og session-oppslaget for hver av dem.',
		lesson:
			'En lagret cookie er ikke nødvendigvis med i requesten. Hver fetch har egne innstillinger, og backend bestemmer identiteten fra sessionen.',
		context:
			'Alt bruker samme origin og den relative URL-en /api/meldinger. Ada og Noah har gyldige sessions fra før. Både sending og lesing krever innlogging. CORS og oppsett av innlogging er ikke en del av saken.',
		initialProbeId: 'ada'
	}),
	Object.freeze({
		id: 'dobbel',
		number: 4,
		title: 'Én melding, flere kopier',
		report: '«Jeg trykker én gang, men meldingen dukker opp flere ganger.»',
		goal: 'Én innsending skal gi én POST og én lagret melding, både med klikk og Enter. Visningen skal samsvare med serveren.',
		lead: 'Skill mellom to meldinger med ulike ID-er og samme ID vist flere ganger.',
		hint: 'Tell POST-requests først. Tell deretter lagrede ID-er og viste ID-er hver for seg. Prøv også Enter og en melding fra en annen bruker.',
		lesson:
			'En feil kan ligge både i hendelsene som starter sending og i behandlingen av svaret. Få først riktig antall requests, og sammenlign så browserlisten med serveren.',
		context:
			'Skjemaet har ett tekstfelt. En implisitt innsending med Enter kan aktivere submit-knappen og skjemaets submit. Feltet tømmes ikke og knappen deaktiveres ikke. Ved samtidige kall viser sporet en kjøring der begge GET-listene tilordnes før kallene fortsetter etter await hentMeldinger().',
		initialProbeId: 'klikk'
	})
]);

/** @type {Record<CaseId,Record<string,string>>} */
const INITIAL = {
	kontrakt: { textKey: 'melding', validation: 'behold' },
	visning: { roomFilter: 'general', assign: 'local' },
	session: { postCredentials: 'omit', readCredentials: 'omit', identity: 'session' },
	dobbel: { eventHandling: 'both', merge: 'append-after-get' }
};

/** @param {string} id @param {string} label @param {string} preview @returns {Choice} */
function choice(id, label, preview) {
	return { id, label, preview };
}

/** @param {string} caseId @returns {Readonly<DetectiveCase>} */
function caseFor(caseId) {
	const found = CASES.find((item) => item.id === caseId);
	if (!found) throw new RangeError('Ukjent sak: ' + caseId);
	return found;
}

/** @param {string} caseId @returns {Record<string,string>} */
export function initialSettings(caseId) {
	return { ...INITIAL[caseFor(caseId).id] };
}

/** @param {string} caseId @returns {Patch[]} */
export function patchesFor(caseId) {
	const id = caseFor(caseId).id;
	if (id === 'kontrakt')
		return [
			{
				id: 'textKey',
				label: 'Feltnavn i request-body',
				side: 'frontend',
				choices: [
					choice('melding', 'melding', 'body: JSON.stringify({ melding: tekst })'),
					choice('tekst', 'tekst', 'body: JSON.stringify({ tekst: tekst })'),
					choice('message', 'message', 'body: JSON.stringify({ message: tekst })')
				]
			},
			{
				id: 'validation',
				label: 'Kontroll av tekst på backend',
				side: 'backend',
				choices: [
					choice(
						'behold',
						'Behold kontrollen',
						'if (!tekst) return res.status(400).json({ feil: "Skriv en melding" });'
					),
					choice('fjern', 'Fjern kontrollen', '// Ingen kontroll av tom tekst')
				]
			}
		];
	if (id === 'visning')
		return [
			{
				id: 'roomFilter',
				label: 'Meldinger som backend returnerer',
				side: 'backend',
				choices: [
					choice(
						'general',
						'Generelt',
						'const utvalg = meldinger.filter((m) => m.rom === "generelt");'
					),
					choice(
						'selected',
						'Rommet i query',
						'const utvalg = meldinger.filter((m) => m.rom === rom);'
					),
					choice('gaming', 'Gaming', 'const utvalg = meldinger.filter((m) => m.rom === "gaming");'),
					choice('all', 'Alle rom', 'const utvalg = meldinger;')
				]
			},
			{
				id: 'assign',
				label: 'Hva frontend gjør med GET-svaret',
				side: 'frontend',
				choices: [
					choice('local', 'Les til lokal variabel', 'const nyeMeldinger = await svar.json();'),
					choice('replace', 'Erstatt listen', 'meldinger = await svar.json();'),
					choice(
						'append',
						'Legg til i listen',
						'meldinger = [...meldinger, ...(await svar.json())];'
					)
				]
			}
		];
	if (id === 'session')
		return [
			{
				id: 'postCredentials',
				label: 'Credentials i POST',
				side: 'frontend',
				choices: ['omit', 'same-origin', 'include'].map((value) =>
					choice(value, value, `credentials: "${value}"`)
				)
			},
			{
				id: 'readCredentials',
				label: 'Credentials i privat GET',
				side: 'frontend',
				choices: ['omit', 'same-origin', 'include'].map((value) =>
					choice(value, value, `credentials: "${value}"`)
				)
			},
			{
				id: 'identity',
				label: 'Kilde til avsender på backend',
				side: 'backend',
				choices: [
					choice('session', 'Session', 'const avsender = req.session.bruker.navn;'),
					choice('body', 'Request-body', 'const avsender = req.body.avsender;')
				]
			}
		];
	return [
		{
			id: 'eventHandling',
			label: 'Hvem starter sendingen?',
			side: 'frontend',
			choices: [
				choice(
					'both',
					'Skjema og knapp',
					'<form onsubmit={sendFraSkjema}>\n  <button type="submit" onclick={sendMelding}>Send</button>\n</form>'
				),
				choice(
					'form',
					'Skjema',
					'<form onsubmit={sendFraSkjema}>\n  <button type="submit">Send</button>\n</form>'
				),
				choice(
					'button',
					'Knapp',
					'<form onsubmit={(event) => event.preventDefault()}>\n  <button type="button" onclick={sendMelding}>Send</button>\n</form>'
				)
			]
		},
		{
			id: 'merge',
			label: 'Visning etter vellykket POST',
			side: 'frontend',
			choices: [
				choice(
					'append-after-get',
					'Hent, og legg til POST-svaret',
					'await hentMeldinger();\nmeldinger = [...meldinger, lagret];'
				),
				choice('replace', 'Hent og erstatt', 'await hentMeldinger();'),
				choice('local-only', 'Bruk bare POST-svaret', 'meldinger = [...meldinger, lagret];')
			]
		}
	];
}

/** @param {string} caseId @param {Record<string,string>} settings */
function validateSettings(caseId, settings) {
	const patches = patchesFor(caseId);
	if (!settings || typeof settings !== 'object' || Array.isArray(settings))
		throw new TypeError('Innstillingene må være et objekt.');
	for (const key of Object.keys(settings))
		if (!patches.some((patch) => patch.id === key)) throw new RangeError('Ukjent endring: ' + key);
	for (const patch of patches)
		if (!patch.choices.some((option) => option.id === settings[patch.id]))
			throw new RangeError('Ugyldig valg for ' + patch.id + ': ' + settings[patch.id]);
}

/** @param {string} caseId @param {Record<string,string>} settings @returns {string} */
export function settingsKey(caseId, settings) {
	validateSettings(caseId, settings);
	return JSON.stringify([
		caseId,
		...patchesFor(caseId).map((patch) => [patch.id, settings[patch.id]])
	]);
}

/** @param {string} id @param {string} text @param {string} title @param {string} explanation @param {string} [patchId] @returns {CodeLine} */
function line(id, text, title, explanation, patchId) {
	return { id, text, title, explanation, ...(patchId ? { patchId } : {}) };
}

/** @param {string} prefix @returns {CodeLine[]} */
function viewLines(prefix) {
	return [
		line(
			prefix + '-each',
			'{#each meldinger as melding}',
			'Listen som vises',
			'Denne each-blokken bruker state-verdien meldinger. Hver forekomst i listen blir en rad.'
		),
		line(
			prefix + '-row',
			'  <p>#{melding.id} · {melding.avsender}: {melding.tekst}</p>',
			'En synlig melding',
			'ID, avsender og tekst gjengis fra hvert objekt. To objekter med samme ID kan derfor vises to ganger i dette ukoblede each-eksemplet.'
		),
		line(prefix + '-end-each', '{/each}', 'Slutt på listen', 'Avslutter visningen av meldingene.')
	];
}

/** @param {Record<string,string>} settings @param {Side} side @returns {CodeLine[]} */
function contractCode(settings, side) {
	if (side === 'backend')
		return [
			line(
				'k-b-route',
				'app.post("/api/meldinger", (req, res) => {',
				'POST-ruten',
				'Express kjører denne funksjonen for en POST til adressen.'
			),
			line(
				'k-b-read',
				'  const tekst = typeof req.body.tekst === "string" ? req.body.tekst.trim() : "";',
				'Teksten backend leser',
				'Backend leser egenskapen tekst. Bare en streng blir beholdt, og trim fjerner mellomrom rundt den.'
			),
			line(
				'k-b-validate',
				settings.validation === 'behold'
					? '  if (!tekst) return res.status(400).json({ feil: "Skriv en melding" });'
					: '  // Ingen kontroll av tom tekst',
				'Kontroll før lagring',
				'Denne plassen kan avslutte requesten før serverlisten endres. Return stanser videre kjøring av ruten.',
				'validation'
			),
			line(
				'k-b-message',
				'  const melding = { id: nesteId++, rom: "generelt", avsender: "Ada", tekst };',
				'Bygg melding',
				'Objektet bruker teksten som nettopp ble lest. Neste ID økes for hver melding som blir opprettet.'
			),
			line(
				'k-b-save',
				'  meldinger.push(melding);',
				'Lagring',
				'Push endrer serverlisten med en gang.'
			),
			line(
				'k-b-response',
				'  return res.status(201).json(melding);',
				'Svar på POST',
				'Den lagrede meldingen sendes som JSON med status 201.'
			),
			line('k-b-end', '});', 'Slutt på POST-ruten', 'Avslutter funksjonen som håndterer sending.'),
			line(
				'k-b-get',
				'app.get("/api/meldinger", (req, res) => {',
				'GET-ruten',
				'GET leser meldinger fra serveren.'
			),
			line(
				'k-b-room',
				'  const rom = String(req.query.rom ?? "generelt");',
				'Rom fra query',
				'Parameteren etter spørsmålstegnet bestemmer hvilket rom det spørres om.'
			),
			line(
				'k-b-list',
				'  res.json(meldinger.filter((m) => m.rom === rom));',
				'Svar med rommet',
				'Svaret inneholder en kopi av meldingene som passer med rommet.'
			),
			line('k-b-get-end', '});', 'Slutt på GET-ruten', 'Avslutter lesingen.')
		];
	return [
		line(
			'k-f-script',
			'<script>',
			'Svelte-komponenten',
			'Koden i script kjører i denne nettleseren.'
		),
		line(
			'k-f-text',
			'  let tekst = $state("Hei fra Ada!");',
			'Tekstfeltet',
			'Bindingen holder teksten eleven har skrevet.'
		),
		line(
			'k-f-state',
			'  let meldinger = $state([]);',
			'Listen i nettleseren',
			'Each-blokken nedenfor viser denne reaktive listen.'
		),
		line(
			'k-f-status',
			'  let status = $state("");',
			'Status i frontend',
			'Status er en egen tekstverdi og endrer ikke serverdata.'
		),
		line(
			'k-f-send',
			'  async function sendMelding() {',
			'Sendefunksjonen',
			'Funksjonen starter én POST hver gang den kalles.'
		),
		line(
			'k-f-fetch',
			'    const svar = await fetch("/api/meldinger", {',
			'Request-adressen',
			'Fetch starter requesten. Await venter på svaret fra serveren.'
		),
		line(
			'k-f-options',
			'      method: "POST", headers: { "Content-Type": "application/json" },',
			'Metode og innholdstype',
			'Requesten sender JSON med POST.'
		),
		line(
			'k-f-body',
			`      body: JSON.stringify({ ${settings.textKey}: tekst })`,
			'Feltene som sendes',
			'Objektnøkkelen blir feltnavnet i JSON-body. Variabelen tekst gir verdien.',
			'textKey'
		),
		line(
			'k-f-fetch-end',
			'    });',
			'Request-oppsettet avsluttes',
			'Serveren mottar de innstillingene som står i objektet.'
		),
		line(
			'k-f-result',
			'    status = `POST ${svar.status}`;',
			'HTTP-statusen',
			'Denne verdien viser statusen, men kontrollerer ikke meldingens innhold.'
		),
		line(
			'k-f-follow',
			'    if (svar.ok) await hentMeldinger();',
			'Les etter vellykket sending',
			'En 2xx-status fører til en egen GET. Ved et feilsvar beholdes listen som allerede vises.'
		),
		line('k-f-send-end', '  }', 'Slutt på sending', 'Avslutter sendefunksjonen.'),
		line(
			'k-f-read',
			'  async function hentMeldinger() {',
			'Hentefunksjonen',
			'Dette er en egen request etter sendingen.'
		),
		line(
			'k-f-get',
			'    const svar = await fetch("/api/meldinger?rom=generelt");',
			'GET fra Generelt',
			'URL-en inneholder rommet som skal hentes.'
		),
		line(
			'k-f-get-guard',
			'    if (!svar.ok) return;',
			'Stopp ved feilsvar',
			'En mislykket GET erstatter ikke listen.'
		),
		line(
			'k-f-assign',
			'    meldinger = await svar.json();',
			'Oppdater Svelte-state',
			'JSON-listen fra serveren erstatter state-verdien som vises.'
		),
		line('k-f-read-end', '  }', 'Slutt på henting', 'Avslutter hentefunksjonen.'),
		line('k-f-script-end', '</script>', 'Slutt på script', 'Resten er grensesnittet.'),
		line(
			'k-f-input',
			'<input aria-label="Melding" bind:value={tekst} />',
			'Skriv melding',
			'Feltet er bundet til tekst.'
		),
		line(
			'k-f-button',
			'<button onclick={sendMelding}>Send</button>',
			'Start sending',
			'Et klikk kaller sendefunksjonen.'
		),
		line('k-f-feedback', '<p>{status}</p>', 'Vis status', 'Status vises som vanlig tekst.'),
		...viewLines('k-f')
	];
}

/** @param {Record<string,string>} settings @param {Side} side @returns {CodeLine[]} */
function viewCode(settings, side) {
	const filter = {
		general: 'meldinger.filter((m) => m.rom === "generelt")',
		selected: 'meldinger.filter((m) => m.rom === rom)',
		gaming: 'meldinger.filter((m) => m.rom === "gaming")',
		all: 'meldinger'
	}[settings.roomFilter];
	if (side === 'backend')
		return [
			line(
				'v-b-route',
				'app.get("/api/meldinger", (req, res) => {',
				'GET-ruten',
				'Requesten er en lesing. Den endrer ikke serverlisten.'
			),
			line(
				'v-b-room',
				'  const rom = String(req.query.rom ?? "generelt");',
				'Rommet i URL-en',
				'Query-parameteren blir lagt i variabelen rom.'
			),
			line(
				'v-b-filter',
				`  const utvalg = ${filter};`,
				'Velg meldinger til svaret',
				'Dette uttrykket bestemmer hvilke objekter responsen inneholder.',
				'roomFilter'
			),
			line(
				'v-b-response',
				'  res.json(utvalg);',
				'GET-svaret',
				'Express sender utvalget med standardstatus 200. 200 sier ikke hvilket rom objektene tilhører.'
			),
			line('v-b-end', '});', 'Slutt på ruten', 'Avslutter håndteringen av denne GET-requesten.')
		];
	const assignment = {
		local: 'const nyeMeldinger = await svar.json();',
		replace: 'meldinger = await svar.json();',
		append: 'meldinger = [...meldinger, ...(await svar.json())];'
	}[settings.assign];
	return [
		line(
			'v-f-script',
			'<script>',
			'Svelte-komponenten',
			'Denne nettleseren holder sin egen kopi av listen.'
		),
		line(
			'v-f-state',
			'  let meldinger = $state([]);',
			'Listen som vises',
			'Markupen bruker meldinger, ikke enhver lokal variabel i funksjonene.'
		),
		line(
			'v-f-room',
			'  let valgtRom = $state("generelt");',
			'Valgt rom',
			'Valget i grensesnittet lagres separat fra meldingslisten.'
		),
		line(
			'v-f-function',
			'  async function hentRom(rom = valgtRom) {',
			'Hent et rom',
			'Funksjonen kan kalles ved både rombytte og oppdatering.'
		),
		line(
			'v-f-choice',
			'    valgtRom = rom;',
			'Oppdater romvalget',
			'Romvalget endres før svaret er mottatt. Den gamle meldingslisten finnes fortsatt nå.'
		),
		line(
			'v-f-get',
			'    const svar = await fetch(`/api/meldinger?rom=${encodeURIComponent(valgtRom)}`);',
			'GET med query',
			'URL-en bruker rommet brukeren valgte.'
		),
		line(
			'v-f-guard',
			'    if (!svar.ok) return;',
			'Kontroller HTTP-status',
			'Et vellykket svar kan nå leses som JSON.'
		),
		line(
			'v-f-assign',
			`    ${assignment}`,
			'Behandle JSON-svaret',
			'Se hvilken variabel som får data, og om gamle objekter blir beholdt.',
			'assign'
		),
		line(
			'v-f-end',
			'  }',
			'Slutt på henting',
			'Funksjonens lokale variabler forsvinner når kjøringen avsluttes.'
		),
		line('v-f-script-end', '</script>', 'Slutt på script', 'Grensesnittet bruker state-verdiene.'),
		line(
			'v-f-select',
			'<select bind:value={valgtRom} onchange={() => hentRom()}>',
			'Bytt rom',
			'Valget starter en GET for dette rommet.'
		),
		line(
			'v-f-options',
			'  <option value="generelt">Generelt</option><option value="gaming">Gaming</option><option value="arbeid">Arbeid</option>',
			'Tilgjengelige rom',
			'Arbeid er et gyldig rom selv om det ikke har noen meldinger.'
		),
		line('v-f-select-end', '</select>', 'Slutt på romvalg', 'Avslutter nedtrekkslisten.'),
		line(
			'v-f-refresh',
			'<button onclick={() => hentRom()}>Oppdater</button>',
			'Hent på nytt',
			'Oppdater henter samme rom en gang til.'
		),
		...viewLines('v-f')
	];
}

/** @param {Record<string,string>} settings @param {Side} side @returns {CodeLine[]} */
function sessionCode(settings, side) {
	if (side === 'backend')
		return [
			line(
				's-b-post',
				'app.post("/api/meldinger", (req, res) => {',
				'Privat POST',
				'Denne ruten krever en etablert session.'
			),
			line(
				's-b-post-auth',
				'  if (!req.session.bruker) return res.status(401).json({ feil: "Logg inn" });',
				'Hvem er innlogget?',
				'Session-middleware har slått opp cookien før ruten kjører. Ingen bruker gir 401.'
			),
			line(
				's-b-identity',
				`  const avsender = ${settings.identity === 'session' ? 'req.session.bruker.navn' : 'req.body.avsender'};`,
				'Avsenderen på meldingen',
				'Dette velger hvilket navn som blir lagret. Request-body er data fra nettleseren; sessionen er etablert på serveren.',
				'identity'
			),
			line(
				's-b-text',
				'  const tekst = typeof req.body.tekst === "string" ? req.body.tekst.trim() : "";',
				'Les teksten',
				'Innholdet ryddes før det lagres.'
			),
			line(
				's-b-validate',
				'  if (!tekst) return res.status(400).json({ feil: "Skriv en melding" });',
				'Valider innhold',
				'Innlogging gjør ikke tom tekst gyldig.'
			),
			line(
				's-b-message',
				'  const melding = { id: nesteId++, rom: "generelt", avsender, tekst };',
				'Ny melding',
				'Meldingen bruker navnet og teksten som ble valgt ovenfor.'
			),
			line('s-b-save', '  meldinger.push(melding);', 'Lagre meldingen', 'Serverlisten endres her.'),
			line(
				's-b-post-response',
				'  res.status(201).json(melding);',
				'POST-svar',
				'Den lagrede meldingen returneres som JSON.'
			),
			line('s-b-post-end', '});', 'Slutt på POST', 'Avslutter sendingen.'),
			line(
				's-b-get',
				'app.get("/api/meldinger", (req, res) => {',
				'Privat GET',
				'Også lesing av denne klassens chat krever innlogging.'
			),
			line(
				's-b-get-auth',
				'  if (!req.session.bruker) return res.status(401).json({ feil: "Logg inn" });',
				'Ny kontroll for GET',
				'GET er en egen request og får et eget session-oppslag.'
			),
			line(
				's-b-get-response',
				'  res.json(meldinger);',
				'Les den private listen',
				'En innlogget bruker får meldingene med 200.'
			),
			line('s-b-get-end', '});', 'Slutt på GET', 'Avslutter lesingen.')
		];
	return [
		line(
			's-f-script',
			'<script>',
			'Svelte-komponenten',
			'Prøven utfører sending og oppdatering som to brukerhandlinger.'
		),
		line(
			's-f-state',
			'  let meldinger = $state([]);',
			'Privat liste',
			'Dette er listen som brukeren ser.'
		),
		line(
			's-f-text',
			'  let tekst = $state("Hei fra Ada!");',
			'Teksten i skjemaet',
			'Prøvene bruker forskjellige tekster.'
		),
		line(
			's-f-name',
			'  let avsender = $state("Ada");',
			'Navnefelt i body',
			'Et felt i skjemaet er ikke bevis på hvem som er innlogget.'
		),
		line('s-f-status', '  let status = $state("");', 'Status', 'Viser sist mottatte HTTP-status.'),
		line('s-f-post-function', '  async function sendMelding() {', 'Send', 'Én fetch utfører POST.'),
		line(
			's-f-post-fetch',
			'    const svar = await fetch("/api/meldinger", {',
			'Samme origin',
			'En relativ URL bruker samme origin som siden.'
		),
		line(
			's-f-post-method',
			'      method: "POST", headers: { "Content-Type": "application/json" },',
			'POST med JSON',
			'Dette bestemmer metode og innholdstype.'
		),
		line(
			's-f-post-credentials',
			`      credentials: "${settings.postCredentials}",`,
			'Credentials for POST',
			'Denne innstillingen gjelder akkurat denne fetch-requesten. Den endrer ikke cookien som allerede ligger i nettleseren.',
			'postCredentials'
		),
		line(
			's-f-post-body',
			'      body: JSON.stringify({ tekst, avsender })',
			'Påstander fra frontend',
			'Backend mottar både tekst og et navnefelt fra skjemaet.'
		),
		line(
			's-f-post-close',
			'    });',
			'Venter på POST-svar',
			'Requesten fullføres med den valgte innstillingen.'
		),
		line(
			's-f-post-result',
			'    status = `POST ${svar.status}`;',
			'Les POST-status',
			'Et 401-svar betyr at denne requesten ikke fikk tilgang.'
		),
		line('s-f-post-end', '  }', 'Slutt på sending', 'Lesing er en separat handling nedenfor.'),
		line(
			's-f-get-function',
			'  async function hentMeldinger() {',
			'Oppdater listen',
			'Dette starter en egen privat GET.'
		),
		line(
			's-f-get-fetch',
			'    const svar = await fetch("/api/meldinger", {',
			'Samme adresse, egen request',
			'GET må også kunne knyttes til en innlogget bruker.'
		),
		line(
			's-f-get-credentials',
			`      credentials: "${settings.readCredentials}"`,
			'Credentials for GET',
			'GET bruker sine egne fetch-innstillinger.',
			'readCredentials'
		),
		line('s-f-get-close', '    });', 'Venter på GET-svar', 'Denne requesten har sitt eget svar.'),
		line(
			's-f-get-result',
			'    status = `GET ${svar.status}`;',
			'Les GET-status',
			'Statusen gjelder lesingen.'
		),
		line(
			's-f-get-guard',
			'    if (!svar.ok) return;',
			'Behold visningen ved feil',
			'Et feilsvar blir ikke brukt som meldingsliste.'
		),
		line(
			's-f-assign',
			'    meldinger = await svar.json();',
			'Vis JSON-listen',
			'Ved et vellykket svar erstattes listen.'
		),
		line('s-f-get-end', '  }', 'Slutt på henting', 'Avslutter oppdateringen.'),
		line(
			's-f-script-end',
			'</script>',
			'Slutt på script',
			'Grensesnittet kan starte begge handlingene.'
		),
		line(
			's-f-input',
			'<input aria-label="Melding" bind:value={tekst} />',
			'Meldingsfelt',
			'Dette er innholdet som sendes.'
		),
		line(
			's-f-send-button',
			'<button onclick={sendMelding}>Send</button>',
			'Send-knappen',
			'Starter POST uavhengig av GET.'
		),
		line(
			's-f-read-button',
			'<button onclick={hentMeldinger}>Oppdater</button>',
			'Oppdater-knappen',
			'Starter GET, også om en tidligere POST ble avvist.'
		),
		line(
			's-f-feedback',
			'<p>{status}</p>',
			'Vis status',
			'Denne teksten viser den sist mottatte HTTP-statusen.'
		),
		...viewLines('s-f')
	];
}

/** @param {Record<string,string>} settings @param {Side} side @returns {CodeLine[]} */
function duplicateCode(settings, side) {
	if (side === 'backend')
		return [
			line(
				'd-b-post',
				'app.post("/api/meldinger", (req, res) => {',
				'Én request om gangen',
				'Hver POST som når ruten, er en egen innsending for serveren.'
			),
			line(
				'd-b-text',
				'  const tekst = typeof req.body.tekst === "string" ? req.body.tekst.trim() : "";',
				'Les teksten',
				'Teksten ryddes før lagring.'
			),
			line(
				'd-b-guard',
				'  if (!tekst) return res.status(400).json({ feil: "Skriv en melding" });',
				'Validering',
				'Tom tekst avvises før det opprettes en melding.'
			),
			line(
				'd-b-message',
				'  const melding = { id: nesteId++, rom: "generelt", avsender: "Ada", tekst };',
				'Én ny ID',
				'Hver gjennomkjøring får sin egen ID, også om to requests har samme tekst.'
			),
			line(
				'd-b-save',
				'  meldinger.push(melding);',
				'Lagre denne requesten',
				'Serveren legger til ett objekt per gyldig POST.'
			),
			line(
				'd-b-response',
				'  res.status(201).json(melding);',
				'Bekreft lagringen',
				'Dette svaret inneholder objektet som akkurat ble lagret.'
			),
			line('d-b-end', '});', 'Slutt på POST', 'En ny POST kjører ruten på nytt.'),
			line(
				'd-b-get',
				'app.get("/api/meldinger", (req, res) => {',
				'Hent listen',
				'GET oppretter ikke nye meldinger.'
			),
			line(
				'd-b-get-response',
				'  res.json(meldinger.filter((m) => m.rom === "generelt"));',
				'Hele rommet',
				'Svaret inneholder alle meldinger som nå er lagret i Generelt.'
			),
			line('d-b-get-end', '});', 'Slutt på GET', 'Avslutter henting.')
		];
	const merge =
		settings.merge === 'local-only'
			? '    meldinger = [...meldinger, lagret];'
			: '    await hentMeldinger();';
	const form =
		settings.eventHandling === 'button'
			? '<form onsubmit={(event) => event.preventDefault()}>'
			: '<form onsubmit={sendFraSkjema}>';
	const button =
		settings.eventHandling === 'both'
			? '  <button type="submit" onclick={sendMelding}>Send</button>'
			: settings.eventHandling === 'form'
				? '  <button type="submit">Send</button>'
				: '  <button type="button" onclick={sendMelding}>Send</button>';
	return [
		line(
			'd-f-script',
			'<script>',
			'Svelte-komponenten',
			'Feltet tømmes ikke og knappen låses ikke i dette eksemplet.'
		),
		line(
			'd-f-state',
			'  let meldinger = $state([]);',
			'Listen i nettleseren',
			'Listen har sin egen verdi, adskilt fra serverlisten.'
		),
		line(
			'd-f-text',
			'  let tekst = $state("Hei fra Ada!");',
			'Meldingsfeltet',
			'Flere kall kan lese samme verdi før brukeren endrer den.'
		),
		line(
			'd-f-send',
			'  async function sendMelding() {',
			'Én POST per funksjonskall',
			'Hvert kall kjører fetch, også om et annet kall allerede venter på svar.'
		),
		line(
			'd-f-fetch',
			'    const svar = await fetch("/api/meldinger", {',
			'Send til backend',
			'Await gjør ikke funksjonen til en lås for nye kall.'
		),
		line(
			'd-f-options',
			'      method: "POST", headers: { "Content-Type": "application/json" },',
			'JSON-request',
			'Metode og innholdstype beskriver requesten.'
		),
		line(
			'd-f-body',
			'      body: JSON.stringify({ tekst })',
			'Kopi av teksten',
			'Body bygges når dette funksjonskallet starter requesten.'
		),
		line(
			'd-f-fetch-end',
			'    });',
			'Venter på svar',
			'Andre hendelseshandlere kan kjøre mens requesten venter.'
		),
		line(
			'd-f-guard',
			'    if (!svar.ok) return;',
			'Stopp ved feil',
			'En avvist sending går ikke videre til oppdateringen.'
		),
		line(
			'd-f-saved',
			'    const lagret = await svar.json();',
			'Objektet fra POST',
			'Dette objektet har samme ID som meldingen som allerede ligger på serveren.'
		),
		line(
			'd-f-merge',
			merge,
			'Oppdater etter sending',
			'Denne koden bestemmer om frontend henter hele listen eller bruker POST-objektet lokalt.',
			'merge'
		),
		...(settings.merge === 'append-after-get'
			? [
					line(
						'd-f-append',
						'    meldinger = [...meldinger, lagret];',
						'Legg til POST-objektet',
						'Spredningen beholder alle objektene som finnes i meldinger akkurat nå og legger til ett til.'
					)
				]
			: []),
		line('d-f-send-end', '  }', 'Slutt på sendefunksjonen', 'Avslutter dette kallet.'),
		line(
			'd-f-get-function',
			'  async function hentMeldinger() {',
			'Hent siste serverliste',
			'Funksjonen erstatter den lokale listen når svaret kommer.'
		),
		line(
			'd-f-get',
			'    const svar = await fetch("/api/meldinger?rom=generelt");',
			'GET fra Generelt',
			'Leser både egne og andres meldinger.'
		),
		line(
			'd-f-get-guard',
			'    if (!svar.ok) return;',
			'Kontroller GET',
			'Et feilsvar brukes ikke som liste.'
		),
		line(
			'd-f-get-state',
			'    meldinger = await svar.json();',
			'Erstatt listen',
			'Denne tilordningen erstatter alle objektene som var der før.'
		),
		line('d-f-get-end', '  }', 'Slutt på henting', 'Avslutter GET-funksjonen.'),
		line(
			'd-f-submit',
			'  function sendFraSkjema(event) { event.preventDefault(); void sendMelding(); }',
			'Skjemaets handler',
			'PreventDefault stanser vanlig sidenavigasjon, men fjerner ikke et klikk som allerede har kjørt.'
		),
		line(
			'd-f-script-end',
			'</script>',
			'Slutt på script',
			'Hendelsene kobles til markupen nedenfor.'
		),
		line(
			'd-f-form',
			form,
			'Skjemaets submit',
			'Submit kan komme fra et klikk eller en implisitt innsending med Enter.',
			'eventHandling'
		),
		line(
			'd-f-input',
			'  <input aria-label="Melding" bind:value={tekst} />',
			'Ett tekstfelt',
			'Med ett tekstfelt kan Enter sende inn skjemaet.'
		),
		line(
			'd-f-button',
			button,
			'Knappens type og handler',
			'Type og onclick bestemmer hva knappen gjør før en eventuell submit.'
		),
		line('d-f-form-end', '</form>', 'Slutt på skjemaet', 'Avslutter området som kan sende submit.'),
		...viewLines('d-f')
	];
}

/** @param {string} caseId @param {Record<string,string>} settings @param {Side} side @returns {CodeLine[]} */
export function codeFor(caseId, settings, side) {
	validateSettings(caseId, settings);
	if (side !== 'frontend' && side !== 'backend') throw new RangeError('Ukjent kodeside: ' + side);
	return caseId === 'kontrakt'
		? contractCode(settings, side)
		: caseId === 'visning'
			? viewCode(settings, side)
			: caseId === 'session'
				? sessionCode(settings, side)
				: duplicateCode(settings, side);
}

/** @param {string} caseId @returns {Probe[]} */
export function probesFor(caseId) {
	const id = caseFor(caseId).id;
	if (id === 'kontrakt')
		return [
			{
				id: 'vanlig',
				label: 'Vanlig melding',
				description: 'Ada sender «Hei fra Ada!» og ser på listen etterpå.',
				actionLabel: 'Send meldingen'
			},
			{
				id: 'tom',
				label: 'Tom melding',
				description: 'Ada sender bare mellomrom. Det skal ikke opprettes en melding.',
				actionLabel: 'Prøv tom tekst'
			},
			{
				id: 'annen',
				label: 'En annen tekst',
				description: 'Ada sender en annen melding med mellomrom rundt teksten.',
				actionLabel: 'Send en annen tekst'
			}
		];
	if (id === 'visning')
		return [
			{
				id: 'gaming',
				label: 'Åpne Gaming',
				description: 'Bytt fra en gammel Generelt-visning til Gaming.',
				actionLabel: 'Åpne Gaming'
			},
			{
				id: 'generelt',
				label: 'Oppdater Generelt',
				description:
					'Noahs nye melding ligger i Generelt på serveren, men mangler i den gamle browserlisten.',
				actionLabel: 'Oppdater Generelt'
			},
			{
				id: 'rombytte',
				label: 'Bytt fram og tilbake',
				description: 'Hent Gaming, så Generelt, så Gaming igjen.',
				actionLabel: 'Prøv tre rombytter'
			},
			{
				id: 'oppdater',
				label: 'Oppdater to ganger',
				description: 'Hent Generelt to ganger uten at serveren endres.',
				actionLabel: 'Oppdater to ganger'
			},
			{
				id: 'tomt',
				label: 'Et tomt rom',
				description: 'Arbeid finnes som rom, men har ingen meldinger. Listen skal bli tom.',
				actionLabel: 'Åpne Arbeid'
			}
		];
	if (id === 'session')
		return [
			{
				id: 'ada',
				label: 'Innlogget som Ada',
				description:
					'Ada har en gyldig session-cookie. Hun sender en melding og trykker deretter Oppdater.',
				actionLabel: 'Send og oppdater som Ada'
			},
			{
				id: 'noah',
				label: 'Innlogget som Noah',
				description: 'Noahs cookie peker på Noah. Skjemaet påstår Ada. Han sender og oppdaterer.',
				actionLabel: 'Send og oppdater som Noah'
			},
			{
				id: 'gjest',
				label: 'Uten innlogging',
				description:
					'Gjesten har ingen session-cookie, men skriver Ada i skjemaet. Både sending og privat lesing skal avvises.',
				actionLabel: 'Prøv som gjest'
			}
		];
	return [
		{
			id: 'klikk',
			label: 'Ett klikk',
			description: 'Ada klikker Send én gang.',
			actionLabel: 'Klikk Send én gang'
		},
		{
			id: 'enter',
			label: 'Enter i tekstfeltet',
			description: 'Ada trykker Enter én gang uten å klikke med musen.',
			actionLabel: 'Send med Enter'
		},
		{
			id: 'servernytt',
			label: 'En annen skrev først',
			description:
				'Noah har lagt til en melding på serveren siden Ada sist hentet listen. Ada sender sin melding.',
			actionLabel: 'Send med utdatert liste'
		},
		{
			id: 'gjenta',
			label: 'To bevisste innsendinger',
			description: 'Ada sender to forskjellige meldinger, én etter den andre.',
			actionLabel: 'Send to meldinger'
		}
	];
}

/** @type {Message[]} */
const SEED = [
	{ id: 11, rom: 'generelt', avsender: 'Ada', tekst: 'Hei, alle sammen!' },
	{ id: 24, rom: 'gaming', avsender: 'Noah', tekst: 'Hvem blir med på en runde?' },
	{ id: 37, rom: 'generelt', avsender: 'Noah', tekst: 'Jeg er her nå.' }
];

/** @param {Message[]} messages @param {string} room */
function inRoom(messages, room) {
	return messages.filter((message) => message.rom === room);
}

/** @param {string} prefix @param {Message[]} server @param {Message[]} browser @param {string} [cookieJar] @returns {Runtime} */
function start(prefix, server, browser, cookieJar = '(ingen)') {
	return {
		prefix,
		server: copy(server),
		browser: copy(browser),
		before: { server: copy(server), browser: copy(browser) },
		events: [],
		logs: [],
		requestCount: 0,
		nextId: Math.max(0, ...server.map((message) => message.id)) + 1,
		cookieJar
	};
}

/** @param {Runtime} runtime @param {Stage} stage @param {string} title @param {string} detail @param {Side} side @param {string[]} lineIds @param {Partial<HttpMeta>} [meta] */
function emit(runtime, stage, title, detail, side, lineIds, meta = {}) {
	if (stage === 'request') runtime.requestCount++;
	runtime.logs.push(`${title}: ${detail}`);
	runtime.events.push({
		id: `${runtime.prefix}-${runtime.events.length + 1}`,
		stage,
		title,
		detail,
		side,
		lineIds: [...lineIds],
		method: meta.method ?? null,
		url: meta.url ?? null,
		status: meta.status ?? null,
		requestBody: copy(meta.requestBody ?? null),
		responseBody: copy(meta.responseBody ?? null),
		sentCookie: meta.sentCookie ?? null,
		cookieJar: meta.cookieJar ?? runtime.cookieJar,
		server: copy(runtime.server),
		browser: copy(runtime.browser),
		logs: [...runtime.logs]
	});
}

/** @param {Runtime} runtime @param {'GET'|'POST'} method @param {string} url @param {unknown} body @param {boolean} [sentCookie] @returns {HttpMeta} */
function http(runtime, method, url, body, sentCookie = false) {
	return { method, url, requestBody: copy(body), sentCookie, cookieJar: runtime.cookieJar };
}

/** @param {Runtime} runtime @param {HttpMeta} meta @param {number} status @param {unknown} body @param {string} lineId @returns {HttpMeta} */
function response(runtime, meta, status, body, lineId) {
	const result = { ...meta, status, responseBody: copy(body) };
	emit(
		runtime,
		'response',
		`${meta.method} ${status}`,
		`Backend sendte ${JSON.stringify(body)}.`,
		'backend',
		[lineId],
		result
	);
	return result;
}

/** @param {Message[]} actual @param {Message[]} expected */
function sameMessages(actual, expected) {
	return (
		actual.length === expected.length &&
		actual.every((message, index) => {
			const wanted = expected[index];
			return (
				message.id === wanted.id &&
				message.rom === wanted.rom &&
				message.avsender === wanted.avsender &&
				message.tekst === wanted.tekst
			);
		})
	);
}

/** @param {string} id @param {string} label @param {boolean} passed @param {string} detail @returns {Check} */
function check(id, label, passed, detail) {
	return { id, label, passed, detail };
}

/** @param {Runtime} runtime @param {Probe} probe @param {Check[]} checks @returns {ProbeRun} */
function finish(runtime, probe, checks) {
	const failed = checks.find((item) => !item.passed);
	return {
		probeId: probe.id,
		title: probe.label,
		summary: failed ? failed.detail : 'Prøven oppfyller alle kravene.',
		passed: !failed,
		checks: copy(checks),
		events: copy(runtime.events),
		before: copy(runtime.before),
		after: { server: copy(runtime.server), browser: copy(runtime.browser) },
		requestCount: runtime.requestCount
	};
}

/** @param {Runtime} runtime @param {string} room @param {string} prefix @returns {{meta:HttpMeta,list:Message[]}} */
function getRoom(runtime, room, prefix) {
	const meta = http(runtime, 'GET', `/api/meldinger?rom=${encodeURIComponent(room)}`, null);
	emit(
		runtime,
		'request',
		'GET sendes',
		`Browseren ber om rommet ${room}.`,
		'frontend',
		[prefix + '-get'],
		meta
	);
	const list = copy(inRoom(runtime.server, room));
	emit(
		runtime,
		'backend',
		'GET behandles',
		`${list.length} meldinger passer med rommet ${room}.`,
		'backend',
		[prefix === 'k-f' ? 'k-b-list' : 'd-b-get-response'],
		meta
	);
	return {
		meta: response(runtime, meta, 200, list, prefix === 'k-f' ? 'k-b-list' : 'd-b-get-response'),
		list
	};
}

/** @param {Record<string,string>} settings @param {Probe} probe @returns {ProbeRun} */
function runContract(settings, probe) {
	const text =
		probe.id === 'tom' ? '   ' : probe.id === 'annen' ? '  Vi sees etter lunsj!  ' : 'Hei fra Ada!';
	const runtime = start('kontrakt-' + probe.id, SEED, inRoom(SEED, 'generelt'));
	const body = { [settings.textKey]: text };
	const meta = http(runtime, 'POST', '/api/meldinger', body);
	emit(runtime, 'frontend', 'Body bygges', JSON.stringify(body), 'frontend', ['k-f-body'], meta);
	emit(
		runtime,
		'request',
		'POST sendes',
		`JSON-body har feltene ${Object.keys(body).join(', ')}.`,
		'frontend',
		['k-f-fetch', 'k-f-options', 'k-f-body'],
		meta
	);
	const raw = body.tekst;
	const parsed = typeof raw === 'string' ? raw.trim() : '';
	emit(
		runtime,
		'backend',
		'Backend leser tekst',
		`req.body.tekst er ${raw === undefined ? 'undefined' : JSON.stringify(raw)}. Verdien etter lesing er ${JSON.stringify(parsed)}.`,
		'backend',
		['k-b-read'],
		meta
	);
	let postStatus;
	if (settings.validation === 'behold' && !parsed) {
		postStatus = 400;
		emit(
			runtime,
			'backend',
			'Teksten avvises',
			'Teksten er tom. Serverlisten er uendret.',
			'backend',
			['k-b-validate'],
			meta
		);
		const reply = response(runtime, meta, 400, { feil: 'Skriv en melding' }, 'k-b-validate');
		emit(
			runtime,
			'view',
			'Frontend viser 400',
			'svar.ok er false. Den eksisterende listen beholdes.',
			'frontend',
			['k-f-result', 'k-f-follow'],
			reply
		);
	} else {
		postStatus = 201;
		const saved = { id: runtime.nextId++, rom: 'generelt', avsender: 'Ada', tekst: parsed };
		runtime.server.push(saved);
		emit(
			runtime,
			'backend',
			'Melding lagres',
			`ID ${saved.id} er lagret med tekst ${JSON.stringify(saved.tekst)}.`,
			'backend',
			['k-b-message', 'k-b-save'],
			meta
		);
		const reply = response(runtime, meta, 201, saved, 'k-b-response');
		emit(
			runtime,
			'frontend',
			'Frontend leser 201',
			'svar.ok er true. Hentefunksjonen kalles.',
			'frontend',
			['k-f-result', 'k-f-follow'],
			reply
		);
		const read = getRoom(runtime, 'generelt', 'k-f');
		runtime.browser = copy(read.list);
		emit(
			runtime,
			'view',
			'Listen erstattes',
			`Browseren viser ID-ene ${runtime.browser.map((message) => message.id).join(', ')}.`,
			'frontend',
			['k-f-assign'],
			read.meta
		);
	}
	const valid = probe.id !== 'tom';
	const expectedServer = valid
		? [...copy(SEED), { id: 38, rom: 'generelt', avsender: 'Ada', tekst: text.trim() }]
		: copy(SEED);
	const expectedBrowser = valid ? inRoom(expectedServer, 'generelt') : runtime.before.browser;
	return finish(runtime, probe, [
		check(
			'status',
			'Riktig svar på innsendingen',
			postStatus === (valid ? 201 : 400),
			`POST svarte ${postStatus}; denne teksten skal få ${valid ? 201 : 400}.`
		),
		check(
			'server',
			'Riktig innhold og antall på serveren',
			sameMessages(runtime.server, expectedServer),
			valid
				? `Serveren skal ha én ny melding med teksten ${JSON.stringify(text.trim())}. Den har ${runtime.server.length - SEED.length} nye meldinger.`
				: `Tom tekst skal ikke lagres. Serveren har ${runtime.server.length - SEED.length} nye meldinger.`
		),
		check(
			'browser',
			'Riktig innhold i nettleseren',
			sameMessages(runtime.browser, expectedBrowser),
			valid
				? 'Nettleseren skal vise serverens Generelt-liste med den nye teksten, uten ekstra eller manglende meldinger.'
				: 'En avvist sending skal beholde den opprinnelige visningen.'
		)
	]);
}

/** @param {Record<string,string>} settings @param {Probe} probe @returns {ProbeRun} */
function runView(settings, probe) {
	const runtime = start('visning-' + probe.id, SEED, [SEED[0]]);
	const rooms =
		probe.id === 'rombytte'
			? ['gaming', 'generelt', 'gaming']
			: probe.id === 'oppdater'
				? ['generelt', 'generelt']
				: probe.id === 'tomt'
					? ['arbeid']
					: [probe.id === 'gaming' ? 'gaming' : 'generelt'];
	/** @type {Check[]} */
	const checks = [];
	for (const [index, room] of rooms.entries()) {
		emit(
			runtime,
			'frontend',
			'Rommet velges',
			`valgtRom er ${JSON.stringify(room)}. Den lokale listen har fortsatt ${runtime.browser.length} meldinger.`,
			'frontend',
			['v-f-choice']
		);
		const meta = http(runtime, 'GET', `/api/meldinger?rom=${room}`, null);
		emit(
			runtime,
			'request',
			'GET sendes',
			`Query inneholder rom=${room}.`,
			'frontend',
			['v-f-get'],
			meta
		);
		const selected =
			settings.roomFilter === 'all'
				? runtime.server
				: inRoom(
						runtime.server,
						settings.roomFilter === 'selected'
							? room
							: settings.roomFilter === 'general'
								? 'generelt'
								: 'gaming'
					);
		const list = copy(selected);
		emit(
			runtime,
			'backend',
			'Backend lager utvalget',
			`Query er ${room}. Utvalget inneholder ID-ene ${list.map((message) => message.id).join(', ') || '(ingen)'}.`,
			'backend',
			['v-b-room', 'v-b-filter'],
			meta
		);
		const reply = response(runtime, meta, 200, list, 'v-b-response');
		if (settings.assign === 'replace') runtime.browser = copy(list);
		else if (settings.assign === 'append') runtime.browser = [...runtime.browser, ...copy(list)];
		const action =
			settings.assign === 'local'
				? `nyeMeldinger har ${list.length} objekter. meldinger har fortsatt ${runtime.browser.length}.`
				: `meldinger har ${runtime.browser.length} objekter etter tilordningen.`;
		emit(
			runtime,
			'view',
			'GET-svaret leses',
			action,
			'frontend',
			['v-f-assign', 'v-f-each'],
			reply
		);
		const expected = inRoom(runtime.server, room);
		checks.push(
			check(
				'response-' + index,
				`Henting ${index + 1}: svar for ${room}`,
				sameMessages(list, expected),
				`200-svaret for ${room} skal inneholde ${expected.length} meldinger fra det rommet; det inneholder ${list.length}.`
			)
		);
		checks.push(
			check(
				'browser-' + index,
				`Henting ${index + 1}: riktig synlig liste`,
				sameMessages(runtime.browser, expected),
				`Etter henting ${index + 1} skal browseren vise ${expected.length} meldinger fra ${room}, én gang hver. Den viser ${runtime.browser.length}.`
			)
		);
	}
	checks.push(
		check(
			'server',
			'Lesing endrer ikke serverdata',
			sameMessages(runtime.server, SEED),
			'GET skal bevare meldingene på serveren.'
		)
	);
	return finish(runtime, probe, checks);
}

/** @param {Record<string,string>} settings @param {Probe} probe @returns {ProbeRun} */
function runSession(settings, probe) {
	/** @type {User|null} */
	const user =
		probe.id === 'gjest'
			? null
			: probe.id === 'noah'
				? { id: 'noah', navn: 'Noah' }
				: { id: 'ada', navn: 'Ada' };
	const cookieJar = user ? 'sid=demo-' + user.id : '(ingen)';
	const runtime = start('session-' + probe.id, SEED, [], cookieJar);
	const body = {
		tekst:
			probe.id === 'noah'
				? 'Noah er med!'
				: probe.id === 'gjest'
					? 'Jeg prøver uten innlogging.'
					: 'Ada er med!',
		avsender: 'Ada'
	};
	emit(
		runtime,
		'frontend',
		'Cookie-lageret leses',
		`Browserens cookie-lager er ${cookieJar}.`,
		'frontend',
		['s-f-post-credentials']
	);
	const postCookie = Boolean(user) && settings.postCredentials !== 'omit';
	const post = http(runtime, 'POST', '/api/meldinger', body, postCookie);
	emit(
		runtime,
		'request',
		'POST sendes',
		`credentials=${settings.postCredentials}. Cookie sendt: ${postCookie ? 'ja' : 'nei'}. Body påstår avsender ${body.avsender}.`,
		'frontend',
		['s-f-post-fetch', 's-f-post-credentials', 's-f-post-body'],
		post
	);
	const postUser = postCookie ? user : null;
	emit(
		runtime,
		'backend',
		'Session-oppslag for POST',
		postUser
			? `Cookien peker på ${postUser.navn}.`
			: 'Requesten har ingen session-cookie. Ingen sessionbruker ble funnet.',
		'backend',
		['s-b-post-auth'],
		post
	);
	let postStatus;
	if (!postUser) {
		postStatus = 401;
		const reply = response(runtime, post, 401, { feil: 'Logg inn' }, 's-b-post-auth');
		emit(
			runtime,
			'frontend',
			'POST-status vises',
			`Frontend mottok 401. Cookie-lageret er fortsatt ${cookieJar}.`,
			'frontend',
			['s-f-post-result'],
			reply
		);
	} else {
		postStatus = 201;
		const saved = {
			id: runtime.nextId++,
			rom: 'generelt',
			avsender: settings.identity === 'session' ? postUser.navn : body.avsender,
			tekst: body.tekst.trim()
		};
		runtime.server.push(saved);
		emit(
			runtime,
			'backend',
			'Melding lagres',
			`ID ${saved.id} ble lagret med avsender ${saved.avsender}. Sessionbrukeren er ${postUser.navn}.`,
			'backend',
			['s-b-identity', 's-b-message', 's-b-save'],
			post
		);
		const reply = response(runtime, post, 201, saved, 's-b-post-response');
		emit(
			runtime,
			'frontend',
			'POST-status vises',
			`Frontend mottok 201. Cookie-lageret er fortsatt ${cookieJar}.`,
			'frontend',
			['s-f-post-result'],
			reply
		);
	}
	emit(
		runtime,
		'frontend',
		'Brukeren trykker Oppdater',
		'GET starter som en egen brukerhandling, uavhengig av statusen på POST.',
		'frontend',
		['s-f-read-button']
	);
	const readCookie = Boolean(user) && settings.readCredentials !== 'omit';
	const read = http(runtime, 'GET', '/api/meldinger', null, readCookie);
	emit(
		runtime,
		'request',
		'Privat GET sendes',
		`credentials=${settings.readCredentials}. Cookie sendt: ${readCookie ? 'ja' : 'nei'}.`,
		'frontend',
		['s-f-get-fetch', 's-f-get-credentials'],
		read
	);
	const readUser = readCookie ? user : null;
	emit(
		runtime,
		'backend',
		'Session-oppslag for GET',
		readUser
			? `Cookien peker på ${readUser.navn}.`
			: 'Requesten har ingen session-cookie. Ingen sessionbruker ble funnet.',
		'backend',
		['s-b-get-auth'],
		read
	);
	let readStatus;
	if (!readUser) {
		readStatus = 401;
		const reply = response(runtime, read, 401, { feil: 'Logg inn' }, 's-b-get-auth');
		emit(
			runtime,
			'view',
			'GET avvises',
			`Browserlisten har fortsatt ${runtime.browser.length} meldinger. Cookie-lageret er fortsatt ${cookieJar}.`,
			'frontend',
			['s-f-get-result', 's-f-get-guard'],
			reply
		);
	} else {
		readStatus = 200;
		const reply = response(runtime, read, 200, runtime.server, 's-b-get-response');
		runtime.browser = copy(runtime.server);
		emit(
			runtime,
			'view',
			'Den private listen vises',
			`Browseren viser ${runtime.browser.length} meldinger etter en GET med session for ${readUser.navn}.`,
			'frontend',
			['s-f-get-result', 's-f-assign'],
			reply
		);
	}
	const expectedServer = user
		? [...copy(SEED), { id: 38, rom: 'generelt', avsender: user.navn, tekst: body.tekst.trim() }]
		: copy(SEED);
	const expectedBrowser = user ? expectedServer : [];
	return finish(runtime, probe, [
		check(
			'post',
			'Sending får riktig tilgang',
			postStatus === (user ? 201 : 401),
			`${probe.label}: POST skal få ${user ? 201 : 401}, og fikk ${postStatus}.`
		),
		check(
			'read',
			'Privat lesing får riktig tilgang',
			readStatus === (user ? 200 : 401),
			`${probe.label}: GET skal få ${user ? 200 : 401}, og fikk ${readStatus}.`
		),
		check(
			'identity',
			'Riktig lagring og avsender',
			sameMessages(runtime.server, expectedServer),
			user
				? `Én ny melding skal lagres som ${user.navn}, uansett navnefeltet i body.`
				: 'Gjesten skal ikke få lagret noen melding.'
		),
		check(
			'browser',
			'Riktig privat visning',
			sameMessages(runtime.browser, expectedBrowser),
			user
				? 'Den innloggede brukeren skal se serverlisten inkludert sin nye melding.'
				: 'Gjesten skal ikke få lese den private listen.'
		)
	]);
}

/** @param {Record<string,string>} settings @param {Probe} probe @returns {ProbeRun} */
function runDuplicate(settings, probe) {
	const server = copy(SEED);
	const browser = copy(inRoom(SEED, 'generelt'));
	if (probe.id === 'servernytt')
		server.push({
			id: 42,
			rom: 'generelt',
			avsender: 'Noah',
			tekst: 'Denne kom etter din siste oppdatering.'
		});
	const runtime = start('dobbel-' + probe.id, server, browser);
	const texts =
		probe.id === 'gjenta'
			? ['Første melding fra Ada.', 'Andre melding fra Ada.']
			: ['Hei fra Ada!'];
	const activation = probe.id === 'enter' ? 'Enter' : 'klikk';
	let postCount = 0;
	for (const [submission, text] of texts.entries()) {
		const calls =
			settings.eventHandling === 'both'
				? 2
				: settings.eventHandling === 'button' && activation === 'Enter'
					? 0
					: 1;
		const handlers =
			settings.eventHandling === 'both'
				? ['d-f-button', 'd-f-form', 'd-f-submit']
				: settings.eventHandling === 'form'
					? ['d-f-form', 'd-f-submit']
					: activation === 'Enter'
						? ['d-f-form']
						: ['d-f-button'];
		emit(
			runtime,
			'frontend',
			`Innsending ${submission + 1}: ${activation}`,
			settings.eventHandling === 'both'
				? `${activation} utløser knappens click og skjemaets submit. sendMelding kalles to ganger.`
				: calls === 0
					? 'Skjemaets submit stanser vanlig navigasjon. Ingen sendehandler kalles.'
					: 'sendMelding kalles én gang.',
			'frontend',
			handlers
		);
		/** @type {HttpMeta[]} */
		const pending = [];
		for (let call = 0; call < calls; call++) {
			const meta = http(runtime, 'POST', '/api/meldinger', { tekst: text });
			pending.push(meta);
			postCount++;
			emit(
				runtime,
				'request',
				`POST ${postCount} sendes`,
				`Dette funksjonskallet sender ${JSON.stringify(text)}.`,
				'frontend',
				['d-f-send', 'd-f-fetch', 'd-f-body'],
				meta
			);
		}
		/** @type {Message[]} */
		const savedMessages = [];
		for (const meta of pending) {
			const saved = { id: runtime.nextId++, rom: 'generelt', avsender: 'Ada', tekst: text.trim() };
			runtime.server.push(saved);
			savedMessages.push(copy(saved));
			emit(
				runtime,
				'backend',
				'POST lagres',
				`Denne requesten opprettet ID ${saved.id} med tekst ${JSON.stringify(saved.tekst)}.`,
				'backend',
				['d-b-text', 'd-b-message', 'd-b-save'],
				meta
			);
			response(runtime, meta, 201, saved, 'd-b-response');
		}
		/** @type {Array<{saved:Message,postReply:HttpMeta,read:{meta:HttpMeta,list:Message[]}}>} */
		const reads = [];
		for (const [index, saved] of savedMessages.entries()) {
			const postReply = { ...pending[index], status: 201, responseBody: copy(saved) };
			emit(
				runtime,
				'frontend',
				'POST-objektet leses',
				`Variabelen lagret har ID ${saved.id}.`,
				'frontend',
				['d-f-guard', 'd-f-saved'],
				postReply
			);
			if (settings.merge === 'local-only') {
				runtime.browser = [...runtime.browser, copy(saved)];
				emit(
					runtime,
					'view',
					'POST-objektet legges til',
					`Browseren har nå ID-ene ${runtime.browser.map((message) => message.id).join(', ')}. Ingen GET ble sendt av dette kallet.`,
					'frontend',
					['d-f-merge'],
					postReply
				);
			} else {
				emit(
					runtime,
					'frontend',
					'Hentefunksjonen kalles',
					'Dette sendekallet går videre til en egen GET.',
					'frontend',
					['d-f-merge'],
					postReply
				);
				const read = getRoom(runtime, 'generelt', 'd-f');
				reads.push({ saved, postReply, read });
			}
		}
		// Deterministic scheduling: both reads resolve before either caller continues
		// beyond await hentMeldinger(). Each assignment is still a distinct mutation.
		for (const { read } of reads) {
			runtime.browser = copy(read.list);
			emit(
				runtime,
				'view',
				'Listen erstattes fra GET',
				`Browseren har nå ID-ene ${runtime.browser.map((message) => message.id).join(', ')}.`,
				'frontend',
				['d-f-get-state'],
				read.meta
			);
		}
		if (settings.merge === 'append-after-get') {
			for (const { saved, postReply } of reads) {
				runtime.browser = [...runtime.browser, copy(saved)];
				emit(
					runtime,
					'view',
					'POST-objektet legges til etter GET',
					`ID ${saved.id} legges til. Browseren har nå ID-ene ${runtime.browser.map((message) => message.id).join(', ')}.`,
					'frontend',
					['d-f-append'],
					postReply
				);
			}
		}
	}
	let expectedId = Math.max(...server.map((message) => message.id)) + 1;
	const expectedServer = [
		...copy(server),
		...texts.map((text) => ({
			id: expectedId++,
			rom: 'generelt',
			avsender: 'Ada',
			tekst: text.trim()
		}))
	];
	const expectedBrowser = inRoom(expectedServer, 'generelt');
	const unique =
		new Set(runtime.browser.map((message) => message.id)).size === runtime.browser.length;
	return finish(runtime, probe, [
		check(
			'requests',
			'Én POST per innsending',
			postCount === texts.length,
			`${texts.length} bevisst${texts.length === 1 ? '' : 'e'} innsending${texts.length === 1 ? '' : 'er'} skal gi ${texts.length} POST. Det ble sendt ${postCount}.`
		),
		check(
			'server',
			'Én lagret melding per innsending',
			sameMessages(runtime.server, expectedServer),
			`Serveren skal ha ${texts.length} nye meldinger med hver sin ID. Den har ${runtime.server.length - server.length}.`
		),
		check(
			'unique',
			'Ingen ID vises flere ganger',
			unique,
			unique
				? 'Hver synlig ID forekommer én gang.'
				: 'Samme ID forekommer flere ganger i browserlisten. Dette er flere visninger av samme lagrede melding.'
		),
		check(
			'browser',
			'Visningen stemmer med siste serverdata',
			sameMessages(runtime.browser, expectedBrowser),
			`Browseren skal vise ${expectedBrowser.length} meldinger fra Generelt, inkludert andre brukeres meldinger og én per innsending. Den viser ${runtime.browser.length}.`
		)
	]);
}

/** @param {string} caseId @param {Record<string,string>} settings @param {string} probeId @returns {ProbeRun} */
export function runProbe(caseId, settings, probeId) {
	validateSettings(caseId, settings);
	const probe = probesFor(caseId).find((item) => item.id === probeId);
	if (!probe) throw new RangeError('Ukjent prøve: ' + probeId);
	return caseId === 'kontrakt'
		? runContract(settings, probe)
		: caseId === 'visning'
			? runView(settings, probe)
			: caseId === 'session'
				? runSession(settings, probe)
				: runDuplicate(settings, probe);
}

/** @param {string} caseId @param {Record<string,string>} settings @returns {Verification} */
export function verifyCase(caseId, settings) {
	validateSettings(caseId, settings);
	const results = probesFor(caseId).map((probe) => runProbe(caseId, settings, probe.id));
	const passed = results.filter((result) => result.passed).length;
	return { success: passed === results.length, passed, total: results.length, results };
}
