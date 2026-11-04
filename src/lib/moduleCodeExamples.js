import { codeLines, CODE_CONTEXTS } from '#lib/frontendBackendLab.js';
import { storageSteps } from '#lib/storageExercise.js';
import { buildTrace } from '#lib/ovingModel.js';
import { connectionCode, connectionExplanations, readExamples, readExample, insertCode } from '#lib/databaseIntro.js';

/** @typedef {{id:string,text:string,title:string,explanation:string}} ExampleLine */
/** @typedef {{id:string,label:string,context:string,lines:ExampleLine[]}} ExampleFile */
/** @typedef {{id:string,title:string,summary:string,sourceTitle:string,sourceHref:string,files:ExampleFile[]}} ModuleExample */

/** Preserve the source text exactly; explanations are keyed by content, never by shifting line numbers.
 * @param {string} code @param {(text:string)=>string} explain @returns {ExampleLine[]} */
function annotated(code, explain) {
	return code.split('\n').map((text, index) => ({
		id: `line-${index + 1}`, text, title: `Linje ${index + 1}`,
		explanation: text.trim() ? explain(text.trim()) : ''
	}));
}

/** @type {Record<string,string>} */
const storageNotes = {
	'function lagreMeldinger(liste) {': 'Lager en funksjon som tar imot listen som skal lagres. Parameteren liste får verdien fra funksjonskallet.',
	'const json = JSON.stringify(liste, null, 2);': 'Gjør JavaScript-listen om til JSON-tekst. 2 gir innrykk; listen i minnet endres ikke.',
	'writeFileSync(fil, json, "utf8");': 'Skriver JSON-teksten til filstien i fil med UTF-8. Dette erstatter filinnholdet. En skrivefeil kaster en feil før funksjonen er ferdig.',
	'const tekst = readFileSync(fil, "utf8");': 'Leser hele filen som tekst. En manglende eller utilgjengelig fil kaster en feil.',
	'let meldinger = JSON.parse(tekst);': 'Tolker JSON-teksten til JavaScript-data og legger resultatet i meldinger. Ugyldig JSON kaster en feil; denne linjen kontrollerer ikke at resultatet er en liste.',
	'try {': 'Forsøker operasjonene i blokken. Hvis en av dem kaster en feil, hopper kjøringen til catch.',
	'meldinger.push(nyMelding);': 'Endrer listen i minnet med én gang. Hvis lagringen senere feiler, blir ikke denne endringen automatisk angret.',
	'lagreMeldinger(meldinger);': 'Ber lagringsfunksjonen skrive den allerede endrede listen til filen.',
	'res.status(201).json(nyMelding);': 'Sender HTTP 201 Created og den nye meldingen som JSON. Denne linjen nås bare hvis linjene før den ikke kastet en feil.',
	'} catch (feil) {': 'Tar imot feilen som ble kastet i try-blokken. Linjene som gjensto i try blir hoppet over.',
	'res.status(500).json({ beskjed: "Kunne ikke lagre." });': 'Svarer klienten med en serverfeil. Feilsvaret i seg selv angrer ingen tidligere endringer i minnet.',
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

/** Missing teaching annotations must be discovered when the source changes, not silently replaced with generic text.
 * @param {Record<string,string>} notes @param {string} text */
function note(notes, text) {
	if (!notes[text]) throw new Error(`Mangler linjeforklaring i kodeeksemplene: ${text}`);
	return notes[text];
}

/** @param {'get'|'post'} operation @returns {ModuleExample} */
function messageExample(operation) {
	return {
		id: `${operation}-meldinger`,
		title: operation === 'get' ? 'Hent meldinger med GET' : 'Send en melding med POST',
		summary: operation === 'get' ? 'Følg listen fra Express-ruten til frontend.' : 'Send JSON fra frontend og les feltene i backend.',
		sourceTitle: 'Frontend møter backend', sourceHref: '/backend/',
		files: /** @type {const} */ (['frontend', 'backend']).map((side) => ({
			id: side, label: side === 'frontend' ? 'Frontend · +page.svelte' : 'Backend · server.js',
			context: CODE_CONTEXTS[side], lines: codeLines(operation, side)
		}))
	};
}

/** Use one existing, annotated model step. It is explicitly an excerpt, not a reconstructed whole route.
 * @param {'PATCH'|'DELETE'} method @returns {ModuleExample} */
function editMessages(method) {
	const step = buildTrace(6, { method, id: 'm2', text: 'Vi sees!', disk: 'ok' }).find((item) => item.title === 'Lag en ny liste');
	if (!step) throw new Error('Øving 6 mangler kodeeksemplet for listeendring.');
	return {
		id: method === 'PATCH' ? 'endre-melding' : 'slett-melding',
		title: method === 'PATCH' ? 'Endre én melding med map' : 'Slett én melding med filter',
		summary: step.text, sourceTitle: 'Øving 6 · Endre riktig melding', sourceHref: '/oving-6/',
		files: [{ id: 'backend', label: 'server.js · utdrag', context: `Inne i ${method}-ruten, etter at ID-en er funnet${method === 'PATCH' ? ' og teksten er kontrollert' : ''}. Listen må deretter lagres før minnet oppdateres. Tilgangskontroll kommer i øving 9.`,
			lines: step.code.map(([text, explanation], index) => ({ id: `line-${index + 1}`, text, title: step.title, explanation })) }]
	};
}

/** @param {string} text */
function connectionNote(text) {
	const match = connectionExplanations.find(([fragment]) => text.includes(fragment));
	if (!match) throw new Error(`Mangler MongoDB-forklaring: ${text}`);
	return match[1];
}

/** @param {string} text */
function queryNote(text) {
	if (text.startsWith('const filter')) return 'Lager filterobjektet. Et tomt objekt betyr at søket ikke begrenses av noen felt.';
	if (text.includes('"kategori"')) return 'Dokumentet må ha denne verdien i feltet kategori for å bli med i resultatet.';
	if (text.includes('"tilgjengelig"')) return 'Krever den boolske verdien true. Teksten "true" er en annen datatype.';
	if (text.includes('"dagspris"')) return 'Legger en betingelse på dagspris. Operatoren i objektet under bestemmer sammenligningen.';
	if (text.includes('"$lte"')) return '$lte betyr mindre enn eller lik. Prisen må være høyst tallet som står her.';
	if (text === '}' || text === '};') return 'Avslutter filterobjektet eller den indre prisbetingelsen. Alle feltene i filteret må passe samtidig.';
	if (text.includes('utstyr.find(filter).toArray()')) return 'find lager et søk i collectionen. toArray henter treffene til en liste. await venter på resultatet; ingen dokumenter blir endret.';
	if (text === 'console.table(resultat);') return 'Skriver den hentede listen som en tabell i Node-terminalen. Dette viser ikke dataene på en nettside.';
	throw new Error(`Mangler søkeforklaring: ${text}`);
}

/** @type {Record<string,string>} */
const insertNotes = {
	'const nyttUtstyr = {': 'Lager et JavaScript-objekt i minnet. Det er ennå ikke lagret i MongoDB.',
	'"_id": "M203",': 'Velger en fast eksempel-ID. _id må være unik; bruk av samme ID igjen blir avvist.',
	'"navn": "Mikrofon Bord",': 'Setter navnet til en tekstverdi.',
	'"kategori": "mikrofon",': 'Feltet kategori kan brukes av søk som skal finne mikrofoner.',
	'"tilgjengelig": true,': 'Lagrer en boolsk verdi, ikke teksten "true". Dette må stemme med typen som brukes i filteret.',
	'"dagspris": 120': 'Lagrer dagsprisen som et tall, slik at den kan sammenlignes med andre tall.',
	'};': 'Avslutter objektet. Dataene finnes fortsatt bare i programmet.',
	'const bekreftelse = await utstyr.insertOne(nyttUtstyr);': 'Ber MongoDB lagre ett dokument og venter på bekreftelsen. En feil kaster et unntak; den må håndteres i programmet rundt utdraget.',
	"console.log('Lagret med ID:', bekreftelse.insertedId);": 'Skriver den bekreftede ID-en i terminalen. Linjen nås først etter at insertOne har lykkes.'
};

/** Curated examples reuse the module's actual public code. No student state or new progression.
 * @type {Record<string,ModuleExample[]>} */
const examples = {
	backend: [
		messageExample('get'), messageExample('post'),
		...storageSteps.map((step) => ({
			id: `fil-${step.id}`, title: step.title, summary: step.explanation,
			sourceTitle: 'Øving 5 · Ta vare på meldingene', sourceHref: `/oving-5/#${step.id}`,
			files: [{ id: 'backend', label: 'server.js · utdrag', context: `${step.placement} Bruk testkopien av chatten fra Fillagring, med readFileSync/writeFileSync fra node:fs, filstien fil og de eksisterende rutene.`, lines: annotated(step.code, (text) => note(storageNotes, text)) }]
		})),
		editMessages('PATCH'), editMessages('DELETE')
	],
	databaser: [
		{ id: 'mongo-tilkobling', title: 'Koble Node.js til MongoDB', summary: 'Åpne en forbindelse og velg database og collection.',
			sourceTitle: 'Databasegrunnlag · Koble til med kode', sourceHref: '/databaser/grunnlag/#tilkobling',
			files: [{ id: 'node', label: 'Node.js · tilkobling', context: 'Serversidekode i en ES-modul. Installer mongodb og sett MONGODB_URI og MONGODB_DATABASE i ditt lokale miljø. Bruk en egen øvingsdatabase. Se oppsett og feilbehandling i grunnlaget.', lines: annotated(connectionCode, connectionNote) }] },
		...readExamples.map((item) => {
			const source = readExample(item.id);
			return { id: `mongo-${item.id}`, title: item.label, summary: item.explanation,
				sourceTitle: 'Databasegrunnlag · Hente data', sourceHref: '/databaser/grunnlag/#filter',
				files: [{ id: 'node', label: 'Node.js · databasesøk', context: 'Kjør etter tilkoblingen. utstyr er en referanse til collectionen med modulens seks eksempeldokumenter. Dette er serverkode, ikke kode som skal kjøres i nettleseren.', lines: annotated(source.code, queryNote) }] };
		}),
		{ id: 'mongo-innsetting', title: 'Legg inn ett dokument', summary: 'Lag et objekt, lagre det og vent på bekreftet ID.',
			sourceTitle: 'Databasegrunnlag · Legge inn data', sourceHref: '/databaser/grunnlag/#lagre',
			files: [{ id: 'node', label: 'Node.js · insertOne', context: 'Kjør etter tilkoblingen i egen øvingsdatabase. Eksemplet bruker fast ID M203; en brukt ID gir feil. Feilbehandling og fullstendig oppsett finnes i grunnlagets hele kodeeksempel.', lines: annotated(insertCode, (text) => note(insertNotes, text)) }] }
	]
};

/** @param {string} moduleId @returns {ModuleExample[]} */
export const moduleCodeExamples = (moduleId) => Object.hasOwn(examples, moduleId) ? examples[moduleId] : [];
