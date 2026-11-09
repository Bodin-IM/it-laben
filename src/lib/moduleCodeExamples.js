import { backendModuleExamples } from '#lib/backendModuleExamples.js';
import { connectionCode, connectionExplanations, readExample, insertCode } from '#lib/databaseIntro.js';

/** @typedef {{id:string,text:string,title:string,explanation:string,important?:boolean}} ExampleLine */
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

/** @param {Record<string,string>} notes @param {string} text */
function note(notes, text) {
	if (!notes[text]) throw new Error(`Mangler linjeforklaring i kodeeksemplene: ${text}`);
	return notes[text];
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

/** Curated public examples, with no student state or new progression.
 * @type {Record<string,ModuleExample[]>} */
const examples = {
	backend: backendModuleExamples,
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
