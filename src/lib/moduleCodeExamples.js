import { codeLines, CODE_CONTEXTS } from '#lib/frontendBackendLab.js';
import { storageSetupCode, storageSaveCode, storageSafeReadCode, storageRepairedCode } from '#lib/storageExercise.js';
import { buildTrace } from '#lib/ovingModel.js';
import { connectionCode, connectionExplanations, readExample, insertCode } from '#lib/databaseIntro.js';

/** @typedef {{id:string,text:string,title:string,explanation:string}} ExampleLine */
/** @typedef {{id:string,label:string,context:string,lines:ExampleLine[]}} ExampleFile */
/** @typedef {{id:string,title:string,summary:string,sourceTitle:string,sourceHref:string,files:ExampleFile[],relatedIds?:string[]}} ModuleExample */

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
			lines: step.code.map(([text, explanation], index) => ({ id: `line-${index + 1}`, text, title: step.title, explanation })) }],
		relatedIds: ['json-fil']
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
		{
			id: 'json-fil', title: 'Lese og skrive en JSON-fil',
			summary: 'Samlet oppsett for fillagring: velg filen, les listen ved oppstart og lag en funksjon som skriver listen tilbake.',
			sourceTitle: 'Øving 5 · Ta vare på meldingene', sourceHref: '/oving-5/',
			files: [{ id: 'backend', label: 'server.js · før rutene',
				context: 'Legg dette før rutene i en Node.js-server med ES-moduler. Erstatt tidligere innlesing, meldinger-liste og lagreMeldinger-funksjon. En manglende fil gir en tom liste; filen opprettes ved første lagring. Skrivefunksjonen må kalles når data endres. Eksemplet bruker synkron filtilgang for én lokal øvingsserver.',
				lines: annotated([storageSetupCode, storageSafeReadCode, storageSaveCode].join('\n\n'), (text) => note(storageNotes, text)) }],
			relatedIds: ['lagre-melding']
		},
		{
			id: 'lagre-melding', title: 'Lagre en ny melding',
			summary: 'Lag en ny liste, skriv den til fil og oppdater minnet før du svarer klienten. Ved skrivefeil beholdes den gamle listen i minnet.',
			sourceTitle: 'Øving 5 · Ta vare på meldingene', sourceHref: '/oving-5/#endre-koden',
			files: [{ id: 'backend', label: 'server.js · inne i POST /meldinger',
				context: 'Bruk oppsettet fra «Lese og skrive en JSON-fil». Sett blokken i den eksisterende POST-ruten, etter at nyMelding er laget og kontrollert. Den erstatter push, lagringskall og svar. res kommer fra Express-ruten. Her er svaret selve meldingsobjektet; tilpass svarformatet til frontend.',
				lines: annotated(storageRepairedCode, (text) => note(storageNotes, text)) }],
			relatedIds: ['json-fil', 'post-meldinger']
		},
		editMessages('PATCH'), editMessages('DELETE')
	],
	databaser: [
		{ id: 'mongo-tilkobling', title: 'Koble Node.js til MongoDB', summary: 'Åpne en forbindelse og velg database og collection.',
			sourceTitle: 'Databasegrunnlag · Koble til med kode', sourceHref: '/databaser/grunnlag/#tilkobling',
			files: [{ id: 'node', label: 'Node.js · tilkobling', context: 'Serversidekode i en ES-modul. Installer mongodb og sett MONGODB_URI og MONGODB_DATABASE i ditt lokale miljø. Bruk en egen øvingsdatabase. Se oppsett og feilbehandling i grunnlaget.', lines: annotated(connectionCode, connectionNote) }] },
		{
			id: 'mongo-hente', title: 'Hente og filtrere dokumenter',
			summary: 'Bruk find til å hente en liste. Velg et tomt filter, ett vilkår, flere vilkår eller en prisgrense.',
			sourceTitle: 'Databasegrunnlag · Hente data', sourceHref: '/databaser/grunnlag/#filter',
			files: [
				{ id: 'alle', label: 'Alle dokumenter' },
				{ id: 'kamera', label: 'Ett vilkår' },
				{ id: 'ledige', label: 'Flere vilkår' },
				{ id: 'ingen', label: 'Prisgrense' }
			].map(({ id, label }) => {
				const source = readExample(id);
				return { id, label,
					context: `Kjør i Node.js etter tilkoblingen, der utstyr er referansen til collectionen. Variantene erstatter hverandre. Med modulens eksempeldata: ${source.explanation}`,
					lines: annotated(source.code, queryNote) };
			}),
			relatedIds: ['mongo-tilkobling']
		},
		{ id: 'mongo-innsetting', title: 'Legg inn ett dokument', summary: 'Lag et objekt, lagre det og vent på bekreftet ID.',
			sourceTitle: 'Databasegrunnlag · Legge inn data', sourceHref: '/databaser/grunnlag/#lagre',
			files: [{ id: 'node', label: 'Node.js · insertOne', context: 'Kjør etter tilkoblingen i egen øvingsdatabase. Eksemplet bruker fast ID M203; en brukt ID gir feil. Feilbehandling og fullstendig oppsett finnes i grunnlagets hele kodeeksempel.', lines: annotated(insertCode, (text) => note(insertNotes, text)) }],
			relatedIds: ['mongo-tilkobling', 'mongo-hente'] }
	]
};

/** @param {string} moduleId @returns {ModuleExample[]} */
export const moduleCodeExamples = (moduleId) => Object.hasOwn(examples, moduleId) ? examples[moduleId] : [];

/** Keep previously shared example URLs useful after curating the catalogue.
 * Aliases are scoped to their module; partner context always receives canonical IDs.
 * @type {Record<string,Record<string,{id:string,fileId?:string}>>} */
const aliases = {
	backend: {
		'fil-lagre': { id: 'json-fil' },
		'fil-omstart': { id: 'json-fil' },
		'fil-oppstart': { id: 'json-fil' },
		'fil-skrivefeil': { id: 'lagre-melding' },
		'fil-endre-koden': { id: 'lagre-melding' }
	},
	databaser: {
		'mongo-alle': { id: 'mongo-hente', fileId: 'alle' },
		'mongo-kamera': { id: 'mongo-hente', fileId: 'kamera' },
		'mongo-ledige': { id: 'mongo-hente', fileId: 'ledige' },
		'mongo-ingen': { id: 'mongo-hente', fileId: 'ingen' }
	}
};

/** @param {string} moduleId @param {string|null} exampleId @param {string|null} fileId */
export function moduleCodeExampleSelection(moduleId, exampleId, fileId) {
	const moduleAliases = Object.hasOwn(aliases, moduleId) ? aliases[moduleId] : {};
	const alias = exampleId && Object.hasOwn(moduleAliases, exampleId) ? moduleAliases[exampleId] : null;
	const example = moduleCodeExamples(moduleId).find((item) => item.id === (alias?.id ?? exampleId));
	const selectedFile = alias?.fileId && (!fileId || fileId === 'node') ? alias.fileId : fileId;
	const file = example?.files.find((item) => item.id === selectedFile) ?? example?.files[0];
	return { example, file };
}
