import { databaseFailure } from './databaseErrors.js';
// Public learning content shared by the activity, starter project and server-owned guidance.
export const DATABASE_VERSION = 1;
export const databaseActivities = [
	{
		id: 'database-grunnlag',
		tittel: 'Databaser fra grunnen av',
		beskrivelse:
			'Se hvor databasen hører hjemme, og les kode som kobler til, henter og lagrer data før du øver selv.',
		href: '/databaser/grunnlag/',
		type: 'Teori og eksempel',
		format: 'leksjon'
	},
	{
		id: 'database-finn',
		tittel: 'Finn riktig utstyr',
		beskrivelse:
			'Forutsi, kjør og reparer tre søk i Utstyrsboden. Se hvorfor dokumenter blir med eller faller utenfor.',
		href: '/databaser/finn-utstyr/',
		type: 'Tre grunnøvinger',
		format: 'leksjon'
	},
	{
		id: 'database-verksted',
		tittel: 'Utstyrsboden · dataverksted',
		beskrivelse: 'Lag testdata, reparer datatyper og bygg et register som svarer på konkrete behov.',
		href: '/databaser/utstyrsboden/',
		type: 'Tre interaktive oppdrag',
		format: 'leksjon'
	},
	{
		id: 'database-praksis',
		tittel: 'Kod ditt eget register',
		beskrivelse:
			'Bruk det du har øvd på i Node.js mot en ekte MongoDB. Skriv egne søk og test dem.',
		href: '/databaser/praksis/',
		type: 'Praktisk kodeoppgave',
		format: 'aktivitet'
	}
].map((item) => ({
	...item,
	fag: 'utvikling',
	audience: 'student',
	emner: ['MongoDB', 'Databaser', 'Dokumenter', 'Søk'],
	sokeord: [
		'NoSQL',
		'SQL',
		'MySQL',
		'collection',
		'find',
		'insertOne',
		'MongoClient',
		'tilkobling',
		'frontend',
		'backend',
		'Node.js',
		'Utstyrsboden'
	],
	symbol: '{ }'
}));

export const equipment = [
	{ _id: 'K101', navn: 'Kamera Nord', kategori: 'kamera', tilgjengelig: true, dagspris: 250 },
	{ _id: 'K102', navn: 'Kamera Sør', kategori: 'kamera', tilgjengelig: false, dagspris: 150 },
	{ _id: 'K103', navn: 'Kamera Studio', kategori: 'kamera', tilgjengelig: true, dagspris: 450 },
	{ _id: 'M201', navn: 'Mikrofon Tale', kategori: 'mikrofon', tilgjengelig: true, dagspris: 100 },
	{ _id: 'M202', navn: 'Mikrofon Scene', kategori: 'mikrofon', tilgjengelig: false, dagspris: 80 },
	{ _id: 'L301', navn: 'Lys Panel', kategori: 'lys', tilgjengelig: true, dagspris: 200 }
];

export const queryOptions = {
	kategori: [
		{ value: 'all', label: 'Ingen betingelse' },
		{ value: 'kamera', label: '"kamera"' },
		{ value: 'mikrofon', label: '"mikrofon"' },
		{ value: 'lys', label: '"lys"' }
	],
	tilgjengelig: [
		{ value: 'all', label: 'Ingen betingelse' },
		{ value: 'true', label: 'true – boolsk verdi' },
		{ value: 'false', label: 'false – boolsk verdi' },
		{ value: 'text-true', label: '"true" – tekst' }
	],
	dagspris: [
		{ value: 'all', label: 'Ingen betingelse' },
		{ value: '100', label: 'Høyst 100 kr' },
		{ value: '200', label: 'Høyst 200 kr' },
		{ value: '250', label: 'Høyst 250 kr' },
		{ value: '500', label: 'Høyst 500 kr' }
	]
};
/** @typedef {{kategori:string,tilgjengelig:string,dagspris:string}} QueryChoices */
/** @typedef {{choices:QueryChoices, prediction:string[]}} QueryRun */
/** @typedef {{choices:QueryChoices,run:QueryRun|null}} QueryAttempt */

export const queryTasks = [
	{
		id: 'kamera',
		title: 'Finn alle kameraene',
		brief: 'Finn alle kameraene, både ledige og utlånte. Mikrofoner og lys skal ikke være med.',
		goal: 'Bruke en feltverdi til å velge dokumenter.',
		initial: { kategori: 'all', tilgjengelig: 'all', dagspris: 'all' },
		hints: [
			'Se på feltet kategori i dokumentene.',
			'En betingelse på kategori er nok. Tilgjengelighet skal ikke begrense dette søket.'
		]
	},
	{
		id: 'ledig',
		title: 'Reparer søket etter ledige kameraer',
		brief:
			'Dette søket bruker teksten "true". Finn årsaken til at det ikke finner de ledige kameraene, og reparer filteret.',
		goal: 'Skille mellom tekst og boolske verdier, og kombinere betingelser.',
		initial: { kategori: 'kamera', tilgjengelig: 'text-true', dagspris: 'all' },
		hints: [
			'Sammenlign datatypen i dokumentet med datatypen i filteret.',
			'true er en boolsk verdi. "true" er tekst. De er ikke like i dette søket.'
		]
	},
	{
		id: 'budsjett',
		title: 'Finn utstyr til en liten produksjon',
		brief:
			'Finn alt ledig utstyr med dagspris på høyst 200 kr, uansett kategori. Utstyr som koster akkurat 200 kr skal være med.',
		goal: 'Kombinere en boolsk betingelse med en tallgrense i en ny situasjon.',
		initial: { kategori: 'all', tilgjengelig: 'all', dagspris: 'all' },
		hints: [
			'Du trenger to betingelser. Kategori skal ikke begrense søket.',
			'$lte betyr mindre enn eller lik. Bruk denne sammen med tilgjengelig: true.'
		]
	}
];
export const databasePhases = ['oppsett', 'data', 'kode', 'forklar'];
export const databaseTheory = {
	goals: [
		'Forklare hva en database gjør, og skille frontend, backend og lagring.',
		'Lese Node.js-kode som kobler til, henter og legger inn dokumenter.',
		'Kjenne igjen collection, dokument, felt og _id.',
		'Forklare forskjellen på tekst, tall og boolske verdier.',
		'Lese et filter og forutsi hvilke dokumenter det finner.'
	],
	principles: [
		'En database er en organisert samling data. Et databasesystem håndterer lagring og spørringer. Et objekt i minnet er ikke automatisk lagret.',
		'Frontend snakker HTTP/JSON med backend. Backend kontrollerer tilgang og data og bruker MongoDB-driveren mot databasen. Tilkoblingshemmeligheter blir på serversiden.',
		'MongoClient.connect kobler til. db og collection velger hvor vi arbeider, men henter ingen dokumenter. insertOne legger inn et dokument og bekrefter insertedId. En brukt _id gir feil, ikke overskriving.',
		'MongoDB er en dokumentdatabase, én type NoSQL. Sammenlign med relasjonsmodellen fra MySQL; modellene har ulike egenskaper.',
		'En collection inneholder dokumenter. Et dokument har felter og verdier, og kan også inneholde lister og andre dokumenter.',
		'MongoDB lagrer BSON, et binært dokumentformat med flere datatyper enn JSON. Vi viser enkle JSON-eksempler her.',
		'_id identifiserer dokumentet. I øvingen velger vi korte tekst-ID-er selv. Hvis _id utelates ved innsetting, lager driveren vanligvis en ObjectId.',
		'Et fleksibelt skjema fjerner ikke behovet for modellering og validering.',
		'Filteret {} finner alle dokumenter. Flere felt i samme filter må alle passe. $lte betyr mindre enn eller lik.',
		'find() gir en markør (cursor). I Node.js henter await ...toArray() dokumentene til en liste. Bruk små datasett her.'
	]
};

/** @param {unknown} raw @returns {raw is QueryChoices} */
export function validChoices(raw) {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
	const value = /** @type {Record<string,unknown>} */ (raw);
	return (
		Object.keys(value).length === 3 &&
		Object.entries(queryOptions).every(([key, options]) =>
			options.some((option) => option.value === value[key])
		)
	);
}
/** @param {QueryChoices} choices */
export function queryFilter(choices) {
	if (!validChoices(choices)) throw new TypeError('Ukjente filtervalg.');
	/** @type {Record<string,unknown>} */
	const filter = {};
	if (choices.kategori !== 'all') filter.kategori = choices.kategori;
	if (choices.tilgjengelig !== 'all')
		filter.tilgjengelig =
			choices.tilgjengelig === 'text-true' ? 'true' : choices.tilgjengelig === 'true';
	if (choices.dagspris !== 'all') filter.dagspris = { $lte: Number(choices.dagspris) };
	return filter;
}
/** This is a bounded teaching model, not an interpreter for arbitrary MongoDB queries.
 * @param {QueryChoices} choices @param {typeof equipment} [data] */
export function inspectQuery(choices, data = equipment) {
	queryFilter(choices); // Enforce the same allowlist everywhere.
	return data.map((document) => {
		const checks = [
			...(choices.kategori === 'all'
				? []
				: [
						{
							field: 'kategori',
							matches: document.kategori === choices.kategori,
							explanation: `kategori er "${document.kategori}". Filteret krever "${choices.kategori}".`
						}
					]),
			...(choices.tilgjengelig === 'all'
				? []
				: [
						{
							field: 'tilgjengelig',
							matches:
								choices.tilgjengelig !== 'text-true' &&
								document.tilgjengelig === (choices.tilgjengelig === 'true'),
							explanation:
								choices.tilgjengelig === 'text-true'
									? `tilgjengelig er ${document.tilgjengelig} (boolsk). Filteret krever "true" (tekst). Ulike datatyper matcher ikke her.`
									: `tilgjengelig er ${document.tilgjengelig}. Filteret krever ${choices.tilgjengelig}.`
						}
					]),
			...(choices.dagspris === 'all'
				? []
				: [
						{
							field: 'dagspris',
							matches: document.dagspris <= Number(choices.dagspris),
							explanation: `dagspris er ${document.dagspris}. Filteret krever høyst ${choices.dagspris}.`
						}
					])
		];
		return { document, matches: checks.every((check) => check.matches), checks };
	});
}
/** @param {QueryChoices} choices */
export const queryIds = (choices) =>
	inspectQuery(choices)
		.filter((row) => row.matches)
		.map((row) => row.document._id);
/** @param {QueryChoices} choices */
export const queryCode = (choices) =>
	`const filter = ${JSON.stringify(queryFilter(choices), null, 2)};\nconst resultat = await utstyr.find(filter).toArray();`;
/** @param {QueryChoices} a @param {QueryChoices} b */
export const sameQuery = (a, b) =>
	Object.keys(queryOptions).every(
		(key) =>
			a[/** @type {keyof QueryChoices} */ (key)] === b[/** @type {keyof QueryChoices} */ (key)]
	);
/** @param {string[]} a @param {string[]} b */
export const sameIds = (a, b) =>
	a.length === b.length && [...a].sort().every((id, index) => id === [...b].sort()[index]);
/** @param {string} id @param {QueryChoices} choices */
export function queryPasses(id, choices) {
	if (!queryTasks.some((task) => task.id === id) || !validChoices(choices)) return false;
	const wanted = equipment
		.filter((item) =>
			id === 'kamera'
				? item.kategori === 'kamera'
				: id === 'ledig'
					? item.kategori === 'kamera' && item.tilgjengelig
					: item.tilgjengelig && item.dagspris <= 200
		)
		.map((item) => item._id);
	return sameIds(queryIds(choices), wanted);
}
/** @returns {Record<string,QueryAttempt>} */
export const initialAttempts = () =>
	Object.fromEntries(
		queryTasks.map((task) => [task.id, { choices: { ...task.initial }, run: null }])
	);
/** Stored work is local practice, never an assessment credential. Recompute from choices on load.
 * @param {unknown} raw @returns {Record<string,QueryAttempt>} */
export function restoreAttempts(raw) {
	const result = initialAttempts();
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
	const saved = /** @type {Record<string,any>} */ (raw);
	if (saved.version !== DATABASE_VERSION || !saved.attempts || typeof saved.attempts !== 'object')
		return result;
	for (const task of queryTasks) {
		const attempt = saved.attempts[task.id];
		if (!attempt || !validChoices(attempt.choices)) continue;
		result[task.id].choices = { ...attempt.choices };
		if (
			attempt.run &&
			validChoices(attempt.run.choices) &&
			Array.isArray(attempt.run.prediction) &&
			attempt.run.prediction.length <= equipment.length &&
			new Set(attempt.run.prediction).size === attempt.run.prediction.length &&
			attempt.run.prediction.every((/** @type {unknown} */ id) =>
				equipment.some((item) => item._id === id)
			)
		) {
			result[task.id].run = {
				choices: { ...attempt.run.choices },
				prediction: [...attempt.run.prediction]
			};
		}
	}
	return result;
}
/** @param {Record<string,QueryAttempt>} attempts */
export const completedQueries = (attempts) =>
	queryTasks
		.filter((task) => {
			const attempt = attempts[task.id];
			return (
				attempt?.run &&
				sameQuery(attempt.choices, attempt.run.choices) &&
				queryPasses(task.id, attempt.run.choices)
			);
		})
		.map((task) => task.id);

export const practicalRequirements = [
	'Hent alle dokumentene og vis resultatet med console.table().',
	'Skriv et søk som finner alle mikrofonene, også den som er utlånt.',
	'Skriv et søk som finner ledige kameraer med dagspris på høyst 300 kr.',
	'Lag et gyldig søk som gir en tom liste. Forklar hvorfor tomt resultat ikke er en tilkoblingsfeil.',
	'Legg til ett eget, fiktivt utstyrsdokument. Forutsi hvilke av søkene det påvirker, og kjør dem igjen.'
];
export const practiceChecks = [
	'De seks startdokumentene finnes. Har du kjørt eksempel.mjs, finnes også Mikrofon Bord med ID M203.',
	'M201 og M202 finnes, uavhengig av tilgjengelighet. M203 kommer også med hvis du har lagt den inn.',
	'Kamera Nord finnes av søket etter ledige kameraer til høyst 300 kr. De to andre kameraene faller utenfor av ulike grunner.',
	'Et gyldig søk uten treff gir [], mens en tilkoblingsfeil stopper kjøringen med en feilmelding.',
	'Det nye dokumentet blir med akkurat der feltverdiene passer.'
];
export const starterCode = `import { MongoClient } from 'mongodb';

const databaseFailure = ${databaseFailure.toString()};

const uri = process.env.MONGODB_URI;
const database = process.env.MONGODB_DATABASE;
if (!uri || !database) {
  console.error('[OPPSETT] Fyll inn MONGODB_URI og MONGODB_DATABASE i .env.');
  process.exit(1);
}
let client;
let stage = 'kobling';
try {
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  stage = 'lesing';
  const utstyr = client.db(database).collection('utstyr');

  // Endre filteret, kjør på nytt og undersøk resultatet.
  const filter = {};
  const resultat = await utstyr.find(filter).toArray();
  console.log('Dokumenter funnet:', resultat.length);
  console.table(resultat);
  if (resultat.length === 0) console.log('Søket ble kjørt, men fant ingen dokumenter. Undersøk filteret og om startdata er lagt inn i riktig database.');
} catch (error) {
  console.error(databaseFailure(error, stage));
  process.exitCode = 1;
} finally {
  await client?.close();
}
`;
