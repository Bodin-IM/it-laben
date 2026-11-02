/** Øving 5: one simulated chat file through send, restart and repair.
 * Pure snapshots; no eval, real files, network, account storage or grading.
 * @typedef {'original'|'repaired'} StorageMode
 * @typedef {'send'|'restart'|'missing'|'broken'} StorageAction
 * @typedef {{id:string,avsender:string,tekst:string}} Message
 * @typedef {{memory:Message[]|null,file:string|null,running:boolean,nextId:number}} StorageState
 * @typedef {{id:string,source:string,line:string,title:string,text:string,status:string,state:StorageState,working:Message[]|null,json:string|null,temp:string|null}} StorageFrame
 * @typedef {{id:string,code:string,explanation:string}} CodeLine
 */
const json = (/** @type {unknown} */ value) => JSON.stringify(value, null, 2);
const copy = (/** @type {StorageState} */ state) => /** @type {StorageState} */ (JSON.parse(JSON.stringify(state)));

export const storageTasks = [
	{ label: 'Lagre', title: 'Få din melding inn i JSON-filen', instruction: 'Skriv en melding du kjenner igjen. Send den og følg lagringen med Neste steg.', observe: 'Hvilken linje endrer listen, og hvilken skriver filen?', hint: 'Følg lagreMeldinger. JSON.stringify lager teksten; writeFileSync og renameSync endrer filene.', answer: 'JSON.stringify lager tekst. writeFileSync skriver den midlertidige filen. renameSync erstatter meldinger.json med den ferdig skrevne filen.', start: { scenario: 'save' }, project: 'Finn lagringskallet i POST-ruten i egen chat. Send en melding og åpne meldinger.json.' },
	{ label: 'Omstart', title: 'Kommer den samme meldingen tilbake?', instruction: 'Start serveren på nytt her. Følg hvordan minnet tømmes og den samme JSON-filen leses inn.', observe: 'Finn igjen meldingen du sendte i del 1.', hint: 'Filen beholdes ved omstart. readFileSync leser tekst, og JSON.parse lager listen igjen.', answer: 'Minnet er nytt etter omstart. Meldingen kommer tilbake fordi den ble lagret i filen og lest inn ved oppstart.', start: { scenario: 'restart' }, project: 'Stopp og start din egen backend. Hent med GET og finn den samme meldingen.' },
	{ label: 'Skrivefeil', title: 'Hva skjer når filen ikke kan skrives?', instruction: 'Bruk «Endre minnet først», skriv en ny melding og send med skrivefeil. Sammenlign minnet med filen.', observe: 'Kan GET hente en melding som ikke ble lagret?', hint: 'Finn linjen som endrer meldinger. Skjer det før eller etter lagringskallet?', answer: 'push endrer minnet før lagring. Når skrivingen feiler, blir den ulagrede meldingen likevel liggende i minnet.', start: { scenario: 'fail' }, project: 'I en testkopi av egen chat: la lagringsfunksjonen kaste en feil før skriving. Undersøk både GET, filen og feilsvaret.' },
	{ label: 'Endre koden', title: 'La lagringen lykkes før minnet endres', instruction: 'Trykk «Start serveren på nytt» for å fjerne den ulagrede meldingen. Velg så «Lagre ny liste først». Prøv både skrivefeil og vanlig lagring.', observe: 'Hvilken linje blir ikke kjørt når lagringen feiler?', hint: 'Lag nyListe uten push. Gi listen til lagreMeldinger. Bytt meldinger først når kallet har fullført.', answer: 'En ny liste kan lages uten å endre den aktive listen. Ved feil hopper kjøringen til catch før meldinger = nyListe.', start: { scenario: 'fail' }, project: 'Gjør samme endring i POST-ruten og la lagreMeldinger ta imot listen. Prøv feilen igjen, fjern testfeilen og prøv normal lagring.' },
	{ label: 'Oppstart', title: 'En manglende fil er noe annet enn ødelagt JSON', instruction: 'Start en testkopi uten fil. Sammenlign med en testkopi med ødelagt JSON. Chatfilen fra de første delene beholdes.', observe: 'Hvilken situasjon kan gi en tom liste, og hvilken må undersøkes?', hint: 'Bare ENOENT betyr at filen mangler. En eksisterende fil kan inneholde data vi må ta vare på.', answer: 'Manglende fil gir en tom liste. Ugyldig JSON stopper oppstarten og beholdes for undersøkelse.', start: { scenario: 'missing' }, project: 'Prøv manglende og ødelagt fil i en separat testmappe. Den ødelagte filen skal ikke overskrives med [].' }
];

/** @param {string} id @param {string} code @param {string} explanation @returns {CodeLine} */
const line = (id, code, explanation) => ({ id, code, explanation });

/** The displayed route and model share stable line IDs. The request has already
 * produced and validated nyMelding, as in the preceding Fillagring activity.
 * @param {StorageMode} mode @returns {CodeLine[]} */
export function storagePostLines(mode) {
	return [
		line('route', '// I POST /meldinger, etter kontroll av nyMelding:', 'Bruk ruten du allerede har. nyMelding er objektet fra requesten, med ID, avsender og tekst.'),
		line('try', 'try {', 'En feil i lagringskallet sender kjøringen til catch.'),
		...(mode === 'original' ? [
			line('push', '  meldinger.push(nyMelding);', 'Dette endrer den aktive listen med en gang. Filen er fortsatt uendret.'),
			line('call', '  lagreMeldinger();', 'Funksjonen lagrer den aktive listen. Hvis den feiler, er minnet allerede endret.')
		] : [
			line('next', '  const nyListe = [...meldinger, nyMelding];', 'Lag en ny liste med de gamle meldingene og den nye. meldinger endres ikke.'),
			line('call', '  lagreMeldinger(nyListe);', 'Send den nye listen til funksjonen. Ved feil går kjøringen rett til catch.'),
			line('commit', '  meldinger = nyListe;', 'Først etter vellykket lagring tar backend den nye listen i bruk.')
		]),
		line('reply', '  res.status(201).json(nyMelding);', 'Bekreft meldingen etter at lagringskallet har fullført.'),
		line('catch', '} catch (feil) {', 'Her håndteres en feil fra lagringen.'),
		line('error', '  res.status(500).json({ beskjed: "Kunne ikke lagre." });', 'Gi et feilsvar. catch endrer ikke listen tilbake av seg selv.'),
		line('end', '}', 'Slutt på feilbehandlingen.')
	];
}

/** Complete helper, using the existing filename and function name.
 * Both variants use the same file replacement so only the list ordering changes.
 * @param {StorageMode} mode @returns {CodeLine[]} */
export function storageSaveLines(mode) {
	return [
		line('function', mode === 'original' ? 'function lagreMeldinger() {' : 'function lagreMeldinger(liste) {', mode === 'original' ? 'Den første varianten bruker meldinger fra serverens minne.' : 'Den nye varianten tar imot listen som skal lagres.'),
		line('stringify', `  const json = JSON.stringify(${mode === 'original' ? 'meldinger' : 'liste'}, null, 2);`, 'Lag JSON-tekst av hele listen. null, 2 gir lesbart innrykk; dette skriver ingen fil.'),
		line('temp', '  const midlertidig = fil + ".tmp";', 'Forbered filnavnet til en midlertidig fil i samme mappe.'),
		line('write', '  writeFileSync(midlertidig, json, "utf8");', 'Skriv JSON-teksten til den midlertidige filen. Den gamle datafilen beholdes foreløpig.'),
		line('rename', '  renameSync(midlertidig, fil);', 'Erstatt datafilen med den ferdig skrevne filen. Funksjonen kan deretter returnere til POST-ruten.'),
		line('end', '}', 'Lagringsfunksjonen er ferdig. Dette oppsettet brukes med én backendprosess.')
	];
}

export const storageReadLines = [
	line('read-function', 'function lesMeldinger() {', 'Kalles ved serverens oppstart. En eksisterende fil skal leses, ikke erstattes med startdata.'),
	line('read-try', '  try {', 'Vi skiller en manglende fil fra andre feil.'),
	line('read', '    const tekst = readFileSync(fil, "utf8");', 'Les filinnholdet som tekst.'),
	line('parse', '    const liste = JSON.parse(tekst);', 'Gjør JSON-teksten om til en JavaScript-verdi. Ødelagt JSON kaster en feil.'),
	line('array', '    if (!Array.isArray(liste)) throw new Error("Forventet en liste");', 'Resten av chatten trenger en liste, ikke for eksempel ett objekt.'),
	line('return', '    return liste;', 'Gi den innleste listen tilbake til oppstarten.'),
	line('read-catch', '  } catch (feil) {', 'Undersøk hva slags feil som oppstod.'),
	line('missing', '    if (feil.code === "ENOENT") return [];', 'Bare en manglende fil gir en tom liste. Ingen fil blir skrevet her.'),
	line('throw', '    throw feil;', 'Andre feil stopper oppstarten. Filen beholdes for undersøkelse.'),
	line('read-end', '  }', 'Slutt på feilbehandlingen.'),
	line('end', '}', 'Slutt på lesefunksjonen.'),
	line('load', 'let meldinger = lesMeldinger();', 'Kjør dette før rutene. GET kan fortsatt svare med res.json(meldinger).')
];

/** @param {StorageMode} mode @param {string} source */
export function storageLines(mode, source) {
	return source === 'read' ? storageReadLines : source === 'save' ? storageSaveLines(mode) : storagePostLines(mode);
}
/** Complete replacement for the old storage setup, not a second declaration. */
export const storageSetupCode = [
	'import { readFileSync, writeFileSync, renameSync } from "node:fs";',
	'const fil = "./meldinger.json"; // Start Node fra backendmappen.',
	'', ...storageReadLines.map((item) => item.code),
	'', ...storageSaveLines('repaired').map((item) => item.code)
].join('\n');

/** @returns {StorageState} */
export function createStorageState() {
	const memory = [{ id: 'm1', avsender: 'Ada', tekst: 'Hei!' }, { id: 'm2', avsender: 'Noah', tekst: 'Hei!' }];
	return { memory, file: json(memory), running: true, nextId: 3 };
}

/** Public descriptions of visible events; used by both UI and limited AI context. */
export const storageEvents = {
	request: ['post', 'route', 'Meldingen er klar', 'Objektet er laget og kontrollert av POST-ruten. Følg nå hva lagringskoden gjør.'],
	push: ['post', 'push', 'Minnet endres først', 'Meldingen er lagt til i den aktive listen. Filen er ennå uendret.'],
	next: ['post', 'next', 'En ny liste er klar', 'Arbeidskopien inneholder meldingen. Den aktive listen og filen er fortsatt uendret.'],
	call: ['post', 'call', 'Kall lagreMeldinger', 'Kjøringen går inn i lagringsfunksjonen.'],
	stringify: ['save', 'stringify', 'Listen blir JSON-tekst', 'Teksten er klar til skriving. Selve filen er fortsatt uendret.'],
	write: ['save', 'write', 'JSON-teksten skrives', 'Den midlertidige filen har den nye listen. Den gamle datafilen er foreløpig urørt.'],
	rename: ['save', 'rename', 'Datafilen er oppdatert', 'Den ferdig skrevne filen erstatter meldinger.json.'],
	commit: ['post', 'commit', 'Ta den lagrede listen i bruk', 'Lagringen lyktes. Nå oppdateres også den aktive listen i minnet.'],
	reply: ['post', 'reply', 'Meldingen er lagret', 'Minnet og JSON-filen inneholder nå samme liste. Prøv en omstart og finn meldingen igjen.'],
	failure: ['save', 'write', 'Skrivingen feiler før noe skrives', 'Dette kontrollerte forsøket kaster en feil før filskrivingen. Kjøringen hopper til catch.'],
	errorOriginal: ['post', 'error', 'Feilsvar, men minnet er endret', 'Minnet inneholder den nye meldingen, mens filen er uendret. catch angrer ikke push. Les filen på nytt før du prøver den forbedrede koden.'],
	errorRepaired: ['post', 'error', 'Forsøket endret verken minnet eller filen', 'Arbeidskopien ble ikke tatt i bruk. meldinger = nyListe ble hoppet over. Prøv også vanlig lagring med samme kode.'],
	restart: ['read', 'load', 'Prosessen får nytt minne', 'Den samme filen beholdes. Oppstarten skal lese den inn før backend tar imot requests.'],
	read: ['read', 'read', 'Filen leses som tekst', 'Dette er teksten som ligger i filen fra før.'],
	parse: ['read', 'parse', 'JSON blir en liste', 'Teksten er tolket. Oppstarten kontrollerer også at verdien er en liste.'],
	loaded: ['read', 'load', 'Listen er tilbake i minnet', 'GET kan nå hente den innleste listen. Finn igjen teksten du lagret.'],
	missing: ['read', 'missing', 'Filen mangler', 'ENOENT gir en tom liste. Oppstarten skriver ingen ny fil.'],
	broken: ['read', 'throw', 'Oppstarten stopper', 'Ugyldig JSON blir ikke erstattet med []. Undersøk filen; den kan inneholde data som må bevares.']
};

/** @param {StorageState} initial @param {{action:StorageAction,mode:StorageMode,text?:string,fail?:boolean}} options @returns {StorageFrame[]} */
export function runStorage(initial, { action, mode, text = '', fail = false }) {
	const state = copy(initial);
	/** @type {StorageFrame[]} */ const frames = [];
	/** @type {Message[]|null} */ let working = null;
	/** @type {string|null} */ let serialized = null, temp = null;
	let status = action === 'send' ? 'Ingen svar ennå' : 'Oppstart · ingen HTTP-request';
	/** @param {keyof typeof storageEvents} id */
	function add(id) {
		const [source, activeLine, title, explanation] = storageEvents[id];
		frames.push({ id, source, line: activeLine, title, text: explanation, status, state: copy(state), working: working ? JSON.parse(JSON.stringify(working)) : null, json: serialized, temp });
	}
	if (action !== 'send') {
		// Fault cases use isolated copies, never the student's current chat file.
		if (action === 'missing') state.file = null;
		if (action === 'broken') state.file = '[{ "id": "m1", "avsender": "Ada", "tekst": "Ta vare på meg" }';
		state.running = false; state.memory = null;
		add('restart');
		if (state.file === null) {
			state.memory = []; state.running = true; status = 'Oppstart OK · tom liste'; add('missing');
			return frames;
		}
		add('read');
		try {
			const parsed = JSON.parse(state.file);
			if (!Array.isArray(parsed)) throw new Error('Forventet en liste');
			working = parsed; add('parse');
			state.memory = parsed; state.running = true; status = 'Oppstart OK'; add('loaded');
		} catch { status = 'Oppstart feilet · filen beholdes'; add('broken'); }
		return frames;
	}
	if (!state.running || !state.memory) throw new Error('Start serveren før du sender.');
	if (!text.trim() || text.trim().length > 500) throw new Error('Bruk en melding med 1–500 tegn.');
	add('request');
	const message = { id: `m${state.nextId++}`, avsender: 'Ada', tekst: text.trim() };
	if (mode === 'original') { state.memory.push(message); add('push'); }
	else { working = [...state.memory, message]; add('next'); }
	add('call');
	serialized = json(mode === 'original' ? state.memory : working); add('stringify');
	if (fail) {
		add('failure'); status = '500 · Kunne ikke lagre'; add(mode === 'original' ? 'errorOriginal' : 'errorRepaired');
	} else {
		temp = serialized; add('write');
		state.file = temp; temp = null; add('rename');
		if (mode === 'repaired') { state.memory = working; add('commit'); }
		status = '201 · Meldingen er lagret'; add('reply');
	}
	return frames;
}
