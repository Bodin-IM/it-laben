import { storageSetupCode, storageSaveCode, storageSafeReadCode, storageRepairedCode } from '#lib/storageExercise.js';

/** Complete, read-only teaching examples. These strings are never executed by IT-laben.
 * Shared fragments keep the six examples consistent while each displayed file stands on its own.
 * @typedef {'get'|'post'|'storage'|'save'|'patch'|'delete'} Topic
 * @typedef {[text:string, explanation:string, important?:boolean]} Row
 */
/** @type {Record<string,string>} */
const storageNotes = {
	'import { readFileSync, writeFileSync } from "node:fs";': 'Henter lese- og skrivefunksjonene fra Node.js. node:fs følger med Node og trenger ingen installasjon. Denne koden skal kjøres i backend.',
	'const fil = "./meldinger.json";': 'Velger filen som både leses og skrives. Stien er relativ til mappen du starter Node fra. Start serveren fra backendmappen hver gang.',
	'function lagreMeldinger(liste) {': 'Lager en funksjon som tar imot listen som skal lagres. Parameteren liste får verdien fra funksjonskallet.',
	'const json = JSON.stringify(liste, null, 2);': 'Gjør JavaScript-listen om til JSON-tekst. 2 gir innrykk; listen i minnet endres ikke.',
	'writeFileSync(fil, json, "utf8");': 'Skriver JSON-teksten til filstien i fil med UTF-8. Dette erstatter filinnholdet. En skrivefeil kaster en feil før funksjonen er ferdig.',
	'const tekst = readFileSync(fil, "utf8");': 'Leser hele filen som tekst. En manglende eller utilgjengelig fil kaster en feil.',
	'try {': 'Forsøker operasjonene i blokken. Hvis en av dem kaster en feil, hopper kjøringen til catch.',
	'res.status(201).json(nyMelding);': 'Sender HTTP 201 Created og selve den nye meldingen som JSON. Frontend må lese dette svarformatet. Linjen nås bare hvis lagringen lyktes.',
	'} catch (feil) {': 'Tar imot feilen som ble kastet i try-blokken. Linjene som gjensto i try blir hoppet over.',
	'res.status(500).json({ beskjed: "Kunne ikke lagre." });': 'Svarer med en serverfeil. I dette eksemplet er meldinger fortsatt uendret fordi minnet først byttes etter vellykket lagring. Et feilsvar angrer ikke endringer i seg selv.',
	'const nyListe = [...meldinger, nyMelding];': 'Lager en ny liste med de gamle meldingene og den nye. Den eksisterende listen meldinger beholdes foreløpig.',
	'lagreMeldinger(nyListe);': 'Lagrer arbeidskopien. Hvis lagringen feiler, hopper kjøringen til catch før meldinger endres.',
	'meldinger = nyListe;': 'Bytter listen i minnet først etter at lagringskallet har returnert uten feil.',
	'function lesMeldinger() {': 'Samler innlesing og feilbehandling i en funksjon som skal returnere en liste.',
	'const liste = JSON.parse(tekst);': 'Gjør JSON-tekst om til JavaScript-data. At JSON er gyldig, betyr ikke nødvendigvis at verdien er en liste.',
	'if (!Array.isArray(liste)) throw new Error("Forventet en liste");': 'Avviser for eksempel et JSON-objekt eller et tall. Resten av chatkoden forventer en liste.',
	'return liste;': 'Returnerer den innleste listen og avslutter funksjonen.',
	'if (feil.code === "ENOENT") return [];': 'Bare feilkoden for manglende fil gir en tom startliste. Linjen skriver ikke noe til disk.',
	'throw feil;': 'Sender andre feil videre, blant annet ødelagt JSON og manglende lesetilgang. Oppstarten stoppes i stedet for å skjule feilen.',
	'let meldinger = lesMeldinger();': 'Kaller innlesingsfunksjonen ved oppstart og bruker returverdien som chatens liste i minnet.',
	'}': 'Avslutter den innrykkede kodeblokken. En avsluttende klamme lagrer eller sender ingenting i seg selv.'
};

/** @param {string} code @param {Set<string>} marked @returns {Row[]} */
function storageLines(code, marked) {
	return code.split('\n').map((text) => {
		const key = text.trim();
		if (key && !storageNotes[key]) throw new Error(`Mangler linjeforklaring: ${key}`);
		return [text, storageNotes[key] ?? '', marked.has(key)];
	});
}

/** @param {Row[]} rows @returns {import('./moduleCodeExamples.js').ExampleLine[]} */
function lines(rows) {
	return rows.map(([text, explanation, important = false], index) => ({
		id: `line-${index + 1}`, text, title: `Linje ${index + 1}`, explanation, important
	}));
}

/** @param {Topic} topic @returns {Row[]} */
function backend(topic) {
	const persistent = !['get', 'post'].includes(topic);
	const changing = topic === 'patch' || topic === 'delete';
	const storageFocus = new Set(topic === 'storage' ? [
		'const tekst = readFileSync(fil, "utf8");', 'const liste = JSON.parse(tekst);',
		'let meldinger = lesMeldinger();', 'const json = JSON.stringify(liste, null, 2);', 'writeFileSync(fil, json, "utf8");'
	] : []);
	/** @type {Row[]} */
	const rows = [
		['import express from "express";', 'Henter Express, som tar imot HTTP-forespørsler. Installer pakken i backendmappen.'],
		['import cors from "cors";', 'Henter CORS-middleware. Den lar nettleseren lese svar fra en backend på en annen origin enn frontend.'],
		...(topic !== 'get' ? /** @type {Row[]} */ ([['import { randomUUID } from "node:crypto";', 'Henter Nodes innebygde funksjon for å lage en unik meldings-ID på serveren.']]) : []),
		...(persistent ? storageLines(storageSetupCode, storageFocus) : []),
		['', ''],
		['const app = express();', 'Oppretter Express-appen. Ruter og middleware registreres på denne appen.'],
		['app.use(cors({ origin: "http://localhost:5173" }));', 'Tillater nettleserkall fra denne frontend-adressen. Bruk den faktiske adressen og porten hvis frontend kjører et annet sted. CORS er ikke innlogging eller tilgangskontroll.'],
		['app.use(express.json());', 'Leser JSON-bodyen før rutene kjører, slik at feltene finnes i req.body.'],
		['', ''],
		...(persistent ? [
			...storageLines(storageSafeReadCode, storageFocus), /** @type {Row} */ (['', '']),
			...storageLines(storageSaveCode, storageFocus)
		] : /** @type {Row[]} */ ([
			['let meldinger = [', 'Listen finnes i serverens minne. Denne varianten starter på nytt med eksempeldataene når serveren startes igjen.'],
			['  { id: "m1", avsender: "Ada", tekst: "Hei fra backend!" }', 'Én startmelding med ID, avsender og tekst. GET sender disse feltene til frontend.'],
			['];', 'Avslutter listen med startdata.']
		])),
		['', ''],
		['app.get("/meldinger", (req, res) => {', 'Express kjører funksjonen når frontend sender GET til /meldinger.', topic === 'get'],
		['  res.json(meldinger);', 'Sender hele listen som JSON med status 200. Frontend leser den med svar.json().', topic === 'get'],
		['});', 'Avslutter og registrerer GET-ruten. Den venter nå på en forespørsel.']
	];
	if (topic !== 'get') rows.push(
		['', ''],
		['app.post("/meldinger", (req, res) => {', 'Mottar en ny melding fra frontendens send-knapp.'],
		['  const avsender = req.body?.avsender;', 'Leser avsender fra JSON-bodyen. ?. gjør at manglende body gir undefined.'],
		['  const tekst = req.body?.tekst;', 'Leser tekst fra bodyen. Feltnavnet må være det samme som frontend sender.'],
		['  if (typeof avsender !== "string" || !avsender.trim()) {', 'Avviser manglende navn, feil datatype og navn med bare mellomrom. Typekontrollen skjer før trim.'],
		['    return res.status(400).json({ beskjed: "Skriv et avsendernavn." });', 'Sender en forklaring med status 400. return stopper ruten før noe endres.'],
		['  }', 'Avslutter kontrollen av avsender.'],
		['  if (typeof tekst !== "string" || !tekst.trim() || tekst.trim().length > 500) {', 'Krever en tekst på 1–500 tegn etter at mellomrom i kantene er fjernet. Backend kontrollerer selv om frontend også begrenser feltet.'],
		['    return res.status(400).json({ beskjed: "Skriv en melding på 1–500 tegn." });', 'Avviser teksten med et JSON-svar før listen eller filen endres.'],
		['  }', 'Avslutter tekstkontrollen.'],
		['  const nyMelding = { id: randomUUID(), avsender: avsender.trim(), tekst: tekst.trim() };', 'Serveren lager ID-en og det ferdige objektet. ID-en brukes senere når én bestemt melding skal endres eller slettes.', topic === 'post'],
		...(persistent ? storageLines(storageRepairedCode, new Set(topic === 'save' ? [
			'const nyListe = [...meldinger, nyMelding];', 'lagreMeldinger(nyListe);', 'meldinger = nyListe;', 'res.status(201).json(nyMelding);'
		] : [])).map(([text, explanation, important]) => /** @type {Row} */ ([`  ${text}`, explanation, important])) : /** @type {Row[]} */ ([
			['  meldinger = [...meldinger, nyMelding];', 'Lager en ny liste med de gamle meldingene og den nye meldingen til slutt.', true],
			['  res.status(201).json(nyMelding);', 'Bekrefter oppretting med status 201 og sender det nye objektet, inkludert ID, til frontend.', true]
		])),
		['});', 'Avslutter og registrerer POST-ruten.']
	);
	if (changing) rows.push(
		['', ''],
		[`app.${topic}("/meldinger/:id", (req, res) => {`, `Registrerer ${topic.toUpperCase()}-ruten. :id tar imot ID-en som frontend legger i adressen.`, true],
		['  const melding = meldinger.find(m => m.id === req.params.id);', 'Finner meldingen med samme ID som i request-adressen, ikke ved å sammenligne teksten.', true],
		['  if (!melding) return res.status(404).json({ beskjed: "Meldingen finnes ikke." });', 'Stopper med 404 hvis ID-en er ukjent. Ingen data blir endret.'],
		...(topic === 'patch' ? /** @type {Row[]} */ ([
			['  const tekst = req.body?.tekst;', 'Henter den nye teksten som frontend sendte i PATCH-bodyen.'],
			['  if (typeof tekst !== "string" || !tekst.trim() || tekst.trim().length > 500) {', 'Kontrollerer den nye teksten før et endret objekt lages.'],
			['    return res.status(400).json({ beskjed: "Skriv en melding på 1–500 tegn." });', 'Avviser ugyldig tekst. Den gamle meldingen beholdes.'],
			['  }', 'Avslutter valideringen av endringen.'],
			['  const endret = { ...melding, tekst: tekst.trim() };', 'Kopierer feltene i meldingen og erstatter bare tekst. ID og avsender beholdes; originalobjektet endres ikke.', true],
			['  const nyListe = meldinger.map(m => m.id === req.params.id ? endret : m);', 'map lager en ny liste. Bare meldingen med riktig ID erstattes av endret; alle andre beholdes.', true]
		]) : /** @type {Row[]} */ ([
			['  const nyListe = meldinger.filter(m => m.id !== req.params.id);', 'filter lager en ny liste med alle meldinger unntatt den valgte ID-en. Den gamle listen er fortsatt uendret.', true]
		])),
		['  try {', 'Forsøker å lagre den nye listen før serverens minne endres.'],
		['    lagreMeldinger(nyListe);', 'Skriver den nye listen til JSON-filen. Ved skrivefeil går kjøringen til catch.'],
		['    meldinger = nyListe;', 'Tar den nye listen i bruk i minnet først etter vellykket lagring.'],
		...(topic === 'patch' ? /** @type {Row[]} */ ([
			['    res.json(endret);', 'Sender det bekreftede meldingsobjektet med status 200. Frontend bruker objektet til å oppdatere visningen.', true]
		]) : /** @type {Row[]} */ ([
			['    res.status(204).end();', 'Bekrefter slettingen med 204 No Content. Svaret har ingen JSON-body; frontend skal derfor ikke kalle svar.json() ved suksess.', true]
		])),
		['  } catch (feil) {', 'Fanger en feil ved lagringen. Minnet er uendret hvis lagreMeldinger kastet feilen.'],
		['    res.status(500).json({ beskjed: "Kunne ikke lagre." });', 'Sender et feilsvar. Frontend beholder sin liste og viser beskjeden.'],
		['  }', 'Avslutter feilhåndteringen.'],
		['});', 'Avslutter og registrerer ruten for den valgte ID-en.']
	);
	rows.push(['', ''], ['app.listen(3000, () => console.log("Backend kjører på http://localhost:3000"));', 'Starter HTTP-serveren etter at alle ruter er registrert. La denne terminalen kjøre mens frontend brukes.']);
	return rows;
}

/** @param {string} name @param {string} description @param {Row[]} body @param {boolean} [id] @returns {Row[]} */
function requestFunction(name, description, body, id = false) {
	return [
		...(id ? /** @type {Row[]} */ ([['  /** @param {string} id */', 'Dokumenterer at parameteren id er en tekstverdi. ID-en kommer fra meldingen som vises i listen.']]) : []),
		[`  async function ${name}(${id ? 'id' : ''}) {`, description],
		['    if (jobber) return;', 'Hindrer at denne siden starter flere forespørsler samtidig.'],
		['    jobber = true;', 'Markerer at en forespørsel pågår. Knappene deaktiveres til den er ferdig.'],
		['    status = "";', 'Fjerner statusen fra forrige forsøk.'],
		['    try {', 'Samler sending og behandling av svaret. Feil som kastes, går til catch.'],
		...body.map(([text, explanation, important]) => /** @type {Row} */ ([`      ${text}`, explanation, important])),
		['    } catch (feil) {', 'Håndterer nettverksfeil, ugyldig JSON eller en HTTP-feil som koden har kastet.'],
		['      status = feil instanceof Error ? feil.message : "Noe gikk galt.";', 'Viser en lesbar feilmelding. Inndata og eksisterende liste blir ikke tømt ved feil.'],
		['    } finally {', 'Denne blokken kjøres både ved suksess og ved feil.'],
		['      jobber = false;', 'Aktiverer knappene igjen, slik at eleven kan fortsette eller prøve på nytt.'],
		['    }', 'Avslutter finally-blokken.'],
		['  }', `Avslutter ${name}. Funksjonen er klar til å bli kalt.`],
		['', '']
	];
}

/** @param {Topic} topic @returns {Row[]} */
function frontend(topic) {
	const sending = topic !== 'get', editing = topic === 'patch', deleting = topic === 'delete';
	const sendFocus = ['post', 'save'].includes(topic), getFocus = topic === 'get' || topic === 'storage';
	/** @type {Row[]} */
	const rows = [
		['<script>', 'Starter JavaScript-delen av +page.svelte. Tilstand og funksjoner hører hjemme her.'],
		['  import { onMount } from "svelte";', 'Henter funksjonen som lar oss laste meldingene når siden er åpnet i nettleseren.'],
		['  const API = "http://localhost:3000";', 'Adressen til Express-serveren i Backend-fanen. localhost betyr maskinen nettleseren kjører på; bruk serverens adresse ved arbeid mellom PC-er.'],
		['  /** @type {{id:string, avsender:string, tekst:string}[]} */', 'Beskriver feltene i en melding for editoren. Dette er en kommentar, ikke data eller validering.'],
		['  let meldinger = $state([]);', 'Starter med en tom, reaktiv liste. Svelte oppdaterer HTML-listen når meldinger endres.', getFocus],
		['  let status = $state("");', 'Holder bekreftelsen eller feilen som vises på siden.'],
		['  let jobber = $state(false);', 'Holder rede på om en forespørsel pågår.'],
		...(sending ? /** @type {Row[]} */ ([
			['  let avsender = $state("Ada");', 'Startverdien i navnefeltet. Den er et fritt øvingsnavn, ikke en verifisert innlogget bruker.'],
			['  let tekst = $state("");', 'Holder teksten fra feltet for en ny melding.']
		]) : []),
		...(editing ? /** @type {Row[]} */ ([
			['  let redigerer = $state("");', 'Holder ID-en til meldingen som redigeres. En tom tekst betyr at ingen redigeringsfelt er åpent.'],
			['  let nyTekst = $state("");', 'Et eget utkast til endringen, slik at den lagrede meldingen ikke endres før backend har godkjent den.']
		]) : []),
		['', ''],
		...requestFunction('hentMeldinger', 'Definerer henting av listen. Kalles ved åpning av siden og fra Hent meldinger-knappen.', [
			['const svar = await fetch(API + "/meldinger");', 'Sender GET til backend. Uten method bruker fetch GET.', getFocus],
			['const mottatt = await svar.json();', 'Leser JSON-bodyen som JavaScript-data. Backendens GET returnerer en liste.', getFocus],
			['if (!svar.ok) throw new Error(mottatt.beskjed || "Kunne ikke hente meldingene.");', 'Kontrollerer HTTP-status. fetch avviser ikke automatisk et 400- eller 500-svar.'],
			['meldinger = mottatt;', 'Bytter frontend-listen med listen som kom fra backend. Svelte tegner listen på nytt.', getFocus]
		])
	];
	if (sending) rows.push(...requestFunction('sendMelding', 'Definerer funksjonen som send-knappen bruker for å opprette en melding.', [
		['const svar = await fetch(API + "/meldinger", {', 'Sender en forespørsel til samme sti som app.post i Backend-fanen.', sendFocus],
		['  method: "POST",', 'Velger POST for å opprette en ny melding.', sendFocus],
		['  headers: { "Content-Type": "application/json" },', 'Forteller backend at bodyen inneholder JSON.'],
		['  body: JSON.stringify({ avsender, tekst })', 'Gjør feltenes verdier om til JSON. Navnene avsender og tekst må passe med req.body i backend.', sendFocus],
		['});', 'Avslutter fetch-innstillingene og venter på svaret.'],
		['const mottatt = await svar.json();', 'Leser svaret. Ved suksess er dette selve meldingsobjektet, med ID fra serveren.'],
		['if (!svar.ok) throw new Error(mottatt.beskjed);', 'Ved et feilsvar hopper koden til catch før listen oppdateres eller tekstfeltet tømmes.'],
		['meldinger = [...meldinger, mottatt];', 'Legger bare det bekreftede objektet fra backend til i frontend-listen.', sendFocus],
		['tekst = "";', 'Tømmer feltet etter vellykket sending.'],
		['status = "Meldingen er sendt.";', 'Viser bekreftelse etter at serveren har svart med suksess.']
	]));
	if (editing) rows.push(...requestFunction('endreMelding', 'Tar imot ID-en fra Lagre endring-knappen og sender redigeringsutkastet til backend.', [
		['const svar = await fetch(API + "/meldinger/" + encodeURIComponent(id), {', 'Legger meldings-ID-en i adressen. Express henter den som req.params.id. encodeURIComponent gjør verdien trygg som URL-del.', true],
		['  method: "PATCH",', 'Velger delvis oppdatering av meldingen med denne ID-en.', true],
		['  headers: { "Content-Type": "application/json" },', 'Angir at den nye teksten sendes som JSON.'],
		['  body: JSON.stringify({ tekst: nyTekst })', 'Sender redigeringsutkastet under feltnavnet tekst, som PATCH-ruten forventer.', true],
		['});', 'Avslutter forespørselen og venter på svaret.'],
		['const mottatt = await svar.json();', 'Leser den oppdaterte meldingen eller en feilmelding fra backend.'],
		['if (!svar.ok) throw new Error(mottatt.beskjed);', 'Stopper oppdateringen av frontend hvis serveren avviste endringen. Redigeringsfeltet og utkastet beholdes.'],
		['meldinger = meldinger.map(m => m.id === mottatt.id ? mottatt : m);', 'Erstatter bare den bekreftede meldingen i frontend-listen. Serverens map endret backend-listen; denne linjen oppdaterer nettsiden.', true],
		['redigerer = "";', 'Lukker redigeringsfeltet etter at endringen er bekreftet.'],
		['status = "Meldingen er endret.";', 'Viser at backend har lagret endringen.']
	], true));
	if (deleting) rows.push(...requestFunction('slettMelding', 'Tar imot ID-en fra sletteknappen til én bestemt melding i each-løkken.', [
		['const svar = await fetch(API + "/meldinger/" + encodeURIComponent(id), {', 'Sender ID-en som del av adressen. Express leser den med req.params.id.', true],
		['  method: "DELETE"', 'Velger sletting. Det trengs ingen body, fordi ID-en allerede finnes i adressen.', true],
		['});', 'Venter på at backend bekrefter eller avviser slettingen.'],
		['if (!svar.ok) {', 'Ved et feilsvar må frontend lese forklaringen før den prøver å endre listen.'],
		['  const mottatt = await svar.json();', 'Leser JSON fra feilsvaret. Denne linjen kjøres ikke for det vellykkede, tomme 204-svaret.'],
		['  throw new Error(mottatt.beskjed);', 'Går til catch. Den lokale meldingen beholdes når slettingen ble avvist.'],
		['}', 'Avslutter kontrollen av feilsvar. Ved suksess trengs ingen svar.json().'],
		['meldinger = meldinger.filter(m => m.id !== id);', 'Fjerner meldingen fra nettsiden først etter at backend har bekreftet slettingen.', true],
		['status = "Meldingen er slettet.";', 'Viser at slettingen er bekreftet.']
	], true));
	rows.push(
		['  onMount(() => { hentMeldinger(); });', 'Henter listen én gang når komponenten vises i nettleseren. Kallet skjer ikke under serverrendering.'],
		['</script>', 'Avslutter JavaScript-delen. Linjene under er det eleven ser på nettsiden.'],
		['', ''],
		['<h1>Meldinger</h1>', 'Viser sidens overskrift.'],
		['<button onclick={hentMeldinger} disabled={jobber}>Hent meldinger</button>', 'Lar brukeren hente serverens liste på nytt. Knappen kaller funksjonen når den trykkes.', getFocus],
		['<p role="status">{status}</p>', 'Viser bekreftelse eller feil. role=status lar hjelpemidler formidle oppdateringen.'],
		...(sending ? /** @type {Row[]} */ ([
			['<label>Navn <input bind:value={avsender} disabled={jobber} /></label>', 'Knytter navnefeltet til avsender. Verdien brukes i POST-bodyen.'],
			['<label>Melding <input bind:value={tekst} maxlength="500" disabled={jobber} /></label>', 'Knytter meldingsfeltet til tekst. Backend kontrollerer verdien på nytt.', sendFocus],
			['<button onclick={sendMelding} disabled={jobber}>Send melding</button>', 'Kobler send-knappen til sendMelding. Ingen forespørsel sendes bare ved at funksjonen defineres.', sendFocus]
		]) : []),
		['', ''],
		['<ul>', 'Starter listen som viser meldingene fra backend.'],
		['  {#each meldinger as melding (melding.id)}', 'Lager ett listeelement per melding. Den stabile ID-en lar Svelte kjenne igjen meldingen når listen endres.', getFocus || editing || deleting],
		['    <li>', 'Starter visningen av én melding. Knappene under tilhører denne meldingen.'],
		['      <p><strong>{melding.avsender}:</strong> {melding.tekst}</p>', 'Viser avsender og tekst. Svelte viser verdiene som tekst, ikke som innlimt HTML.', getFocus],
		...(editing ? /** @type {Row[]} */ ([
			['      {#if redigerer === melding.id}', 'Viser redigeringsfeltet bare for meldingen som er valgt.'],
			['        <label>Ny tekst <input bind:value={nyTekst} maxlength="500" disabled={jobber} /></label>', 'Feltet endrer utkastet nyTekst, som sendes i PATCH-bodyen.', true],
			['        <button onclick={() => endreMelding(melding.id)} disabled={jobber}>Lagre endring</button>', 'Sender akkurat denne meldingens ID til endreMelding. Derfor ligger knappen inne i each-løkken.', true],
			['        <button onclick={() => redigerer = ""} disabled={jobber}>Avbryt</button>', 'Lukker redigeringen uten å sende eller lagre noe.'],
			['      {:else}', 'Viser en redigeringsknapp når denne meldingen ikke redigeres.'],
			['        <button onclick={() => { redigerer = melding.id; nyTekst = melding.tekst; }} disabled={jobber}>Endre</button>', 'Husker hvilken melding som skal endres og kopierer dagens tekst inn i utkastet.', true],
			['      {/if}', 'Avslutter valget mellom redigeringsfelt og Endre-knapp.']
		]) : []),
		...(deleting ? /** @type {Row[]} */ ([
			['      <button onclick={() => slettMelding(melding.id)} disabled={jobber}>Slett</button>', 'Knappen ligger inne i each-løkken og sender denne meldingens ID til slettMelding.', true]
		]) : []),
		['    </li>', 'Avslutter visningen av denne meldingen.'],
		['  {:else}', 'Dette vises hvis meldinger er en tom liste.'],
		['    <li>Ingen meldinger ennå.</li>', 'Viser en tydelig tomtilstand. I skriveeksemplene kan en ny melding sendes med feltene over.'],
		['  {/each}', 'Avslutter løkken. Når meldinger endres, oppdaterer Svelte innholdet her.'],
		['</ul>', 'Avslutter meldingslisten.']
	);
	return rows;
}

/** @type {{id:string,title:string,summary:string,topic:Topic,sourceTitle:string,sourceHref:string}[]} */
const topics = [
	{ id: 'get-meldinger', topic: 'get', title: 'Hent meldinger med GET', summary: 'Frontend henter listen fra Express og viser hver melding på siden.', sourceTitle: 'Frontend møter backend', sourceHref: '/backend/' },
	{ id: 'post-meldinger', topic: 'post', title: 'Send en melding med POST', summary: 'Fra tekstfelt og send-knapp til JSON, validering i Express og en ny melding på siden. Denne varianten lagrer bare i minnet.', sourceTitle: 'Frontend møter backend', sourceHref: '/backend/' },
	{ id: 'json-fil', topic: 'storage', title: 'Lese og skrive en JSON-fil', summary: 'En liten chat som leser meldinger ved oppstart og lagrer dem i meldinger.json. Frontend sender og viser meldinger som før.', sourceTitle: 'Øving 5 · Ta vare på meldingene', sourceHref: '/oving-5/' },
	{ id: 'lagre-melding', topic: 'save', title: 'Lagre en ny melding', summary: 'Følg en ny melding fra frontend til POST-ruten: lag en ny liste, lagre filen, oppdater minnet og bekreft til frontend.', sourceTitle: 'Øving 5 · Ta vare på meldingene', sourceHref: '/oving-5/#endre-koden' },
	{ id: 'endre-melding', topic: 'patch', title: 'Endre én melding med map', summary: 'Endre-knappen åpner et tekstfelt. PATCH sender ID og ny tekst til Express, som lagrer endringen før frontend oppdaterer listen.', sourceTitle: 'Øving 6 · Endre riktig melding', sourceHref: '/oving-6/' },
	{ id: 'slett-melding', topic: 'delete', title: 'Slett én melding med filter', summary: 'Hver melding har sin egen sletteknapp. DELETE sender ID-en til Express, som lagrer resten av listen og bekrefter før meldingen fjernes på siden.', sourceTitle: 'Øving 6 · Endre riktig melding', sourceHref: '/oving-6/' }
];

/** Every card contains a complete pair; cards replace each other, rather than being pasted together.
 * @type {import('./moduleCodeExamples.js').ModuleExample[]} */
export const backendModuleExamples = topics.map(({ topic, ...example }) => ({
	...example,
	files: [
		{ id: 'backend', label: 'Backend · server.js',
			context: 'Hele server.js i en egen backendmappe. Første gang: npm init -y, npm pkg set type=module og npm install express cors. Start med node server.js. Bruk én eksempelvariant om gangen.',
			lines: lines(backend(topic)) },
		{ id: 'frontend', label: 'Frontend · +page.svelte',
			context: 'Hele src/routes/+page.svelte i et SvelteKit-prosjekt med Svelte 5. Start frontend med npm run dev på http://localhost:5173, og la backend kjøre i en annen terminal.',
			lines: lines(frontend(topic)) }
	]
}));
