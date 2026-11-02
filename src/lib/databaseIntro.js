import { databaseFailure } from './databaseErrors.js';
// Public worked examples. Shared by the page, download and server-owned partner context.
import { equipment, inspectQuery, queryCode } from '#lib/databaseCourse.js';

export const databaseSections = [
	{
		id: 'start',
		label: 'Hva er en database?',
		title: 'Data som skal finnes igjen',
		introduction:
			'Utstyrsboden trenger å vite hvilke kameraer, mikrofoner og lys skolen har. Opplysningene må finnes igjen i morgen og kunne brukes av flere elever.'
	},
	{
		id: 'dataflyt',
		label: 'Frontend → backend → database',
		title: 'Tre deler som samarbeider',
		introduction:
			'Nettsiden viser utstyret. Backend bestemmer hva brukeren får hente eller lagre. MongoDB tar vare på dataene og utfører søkene backend ber om.'
	},
	{
		id: 'dokument',
		label: 'Tabell og dokument',
		title: 'Samme utstyr, to måter å organisere data på',
		introduction:
			'MySQL og MongoDB er databasesystemer. Her sammenligner vi en enkel tabell i MySQL med et dokument i MongoDB. Du trenger ikke huske SQL-syntaksen for å følge eksemplet.'
	},
	{
		id: 'typer',
		label: 'Felter og datatyper',
		title: 'Verdien og typen hører sammen',
		introduction:
			'Et felt har et navn og en verdi. Datatypen forteller hvordan verdien kan brukes og sammenlignes. Start med de samme feltene i alle utstyrsdokumentene.'
	},
	{
		id: 'tilkobling',
		label: 'Koble til med kode',
		title: 'Node.js kobler til MongoDB',
		introduction:
			'Nå går vi fra oversikten til koden som bruker databasen. Dette er JavaScript som kjøres av Node.js på serversiden, ikke i +page.svelte eller i nettleseren.'
	},
	{
		id: 'filter',
		label: 'Hente data',
		title: 'Et filter velger dokumentene',
		introduction:
			'Når forbindelsen er klar, kan vi hente dokumenter fra collectionen utstyr. Les koden først. Undersøk deretter hvilke dokumenter den ville ha funnet i eksempeldataene.'
	},
	{
		id: 'lagre',
		label: 'Legge inn data',
		title: 'Fra et objekt i minnet til et lagret dokument',
		introduction:
			'Å lage et JavaScript-objekt lagrer det ikke i databasen. insertOne() ber MongoDB legge inn ett dokument. Vi venter på bekreftelsen før vi sier at det er lagret.'
	},
	{
		id: 'eksempel',
		label: 'Hele kodeeksemplet',
		title: 'Se delene i ett kjørbart program',
		introduction:
			'Her står tilkobling, henting og innsetting i samme Node.js-fil. Du kan lese eksemplet nå og kjøre det på egen maskin med en egen øvingsdatabase.'
	}
];

export const connectionCode = `import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const database = process.env.MONGODB_DATABASE;
const client = new MongoClient(uri);
await client.connect();

const db = client.db(database);
const utstyr = db.collection('utstyr');`;

export const connectionExplanations = [
	[
		'import',
		'Henter MongoClient fra pakken mongodb. Pakken er en driver: kode som lar Node.js kommunisere med MongoDB.'
	],
	[
		'process.env',
		'Leser adressen og databasenavnet fra miljøet. Med node --env-file=.env lastes de fra .env-filen.'
	],
	[
		'new MongoClient(uri)',
		'Lager en klient med adressen til MongoDB. Dette er ikke det samme som å ha hentet data.'
	],
	[
		'await client.connect()',
		'Kobler til. await lar neste linje vente til operasjonen er ferdig. Feil adresse eller manglende tilgang kan gi en feil her.'
	],
	['client.db(database)', 'Velger databasen vi vil arbeide i.'],
	[
		"db.collection('utstyr')",
		'Gir en referanse til collectionen. Variabelen utstyr er ikke en liste over dokumentene. Vi må gjøre et søk for å hente dem.'
	]
];

export const readExamples = [
	{
		id: 'alle',
		label: 'Alt utstyret',
		choices: { kategori: 'all', tilgjengelig: 'all', dagspris: 'all' },
		explanation: 'Et tomt filter, {}, setter ingen betingelser. Alle seks dokumentene blir med.'
	},
	{
		id: 'kamera',
		label: 'Bare kameraer',
		choices: { kategori: 'kamera', tilgjengelig: 'all', dagspris: 'all' },
		explanation: 'Bare kategori må passe. Derfor blir både ledige og utlånte kameraer med.'
	},
	{
		id: 'ledige',
		label: 'Ledige kameraer',
		choices: { kategori: 'kamera', tilgjengelig: 'true', dagspris: 'all' },
		explanation:
			'Begge betingelsene må passe: kamera og tilgjengelig. Kamera Sør faller utenfor fordi tilgjengelig er false.'
	},
	{
		id: 'ingen',
		label: 'Et søk uten treff',
		choices: { kategori: 'kamera', tilgjengelig: 'true', dagspris: '100' },
		explanation:
			'Ingen ledige kameraer koster 100 kr eller mindre. En tom liste er et gyldig resultat, ikke en tilkoblingsfeil.'
	}
];
/** @param {string} id */
export function readExample(id) {
	const example = readExamples.find((item) => item.id === id);
	if (!example) throw new TypeError('Ukjent kodeeksempel.');
	return {
		...example,
		code: queryCode(example.choices) + '\nconsole.table(resultat);',
		rows: inspectQuery(example.choices)
			.filter((row) => row.matches)
			.map((row) => row.document)
	};
}

export const newEquipment = {
	_id: 'M203',
	navn: 'Mikrofon Bord',
	kategori: 'mikrofon',
	tilgjengelig: true,
	dagspris: 120
};
export const insertCode = `const nyttUtstyr = ${JSON.stringify(newEquipment, null, 2)};

const bekreftelse = await utstyr.insertOne(nyttUtstyr);
console.log('Lagret med ID:', bekreftelse.insertedId);`;
export const insertStages = [
	{
		title: '1. Objektet finnes bare i programmet',
		explanation:
			'const lager et objekt i Node.js-minnet. Collectionen har fortsatt de seks startdokumentene.',
		code: `const nyttUtstyr = ${JSON.stringify(newEquipment, null, 2)};`,
		saved: false
	},
	{
		title: '2. MongoDB bekrefter innsettingen',
		explanation:
			'Etter at await insertOne(...) har lykkes, finnes M203 i collectionen. Bekreftelsen inneholder ID-en; den er ikke en liste med alle dokumentene.',
		code: "const bekreftelse = await utstyr.insertOne(nyttUtstyr);\nconsole.log(bekreftelse.insertedId); // 'M203'",
		saved: true
	},
	{
		title: '3. Et nytt søk finner dokumentet',
		explanation:
			'Vi henter data på nytt. Den nye mikrofonen kommer med fordi kategori er mikrofon. Et søk etter kameraer ville fortsatt gitt tre treff.',
		code: "const mikrofoner = await utstyr.find({ kategori: 'mikrofon' }).toArray();\nconsole.table(mikrofoner);",
		saved: true
	}
];
/** Bounded illustration, not a live database. Never changes the shared exercise dataset. @param {number} step */
export function insertExample(step) {
	if (!Number.isInteger(step) || !insertStages[step])
		throw new TypeError('Ukjent innsettingssteg.');
	const stage = insertStages[step];
	const documents = stage.saved ? [...equipment, newEquipment] : [...equipment];
	return {
		...stage,
		count: documents.length,
		result: step === 2 ? documents.filter((item) => item.kategori === 'mikrofon') : null
	};
}

export const flowExamples = {
	hente: [
		{
			active: 'frontend',
			title: '1. Nettsiden ber om kameraene',
			explanation:
				'Frontend sender en HTTP-forespørsel til backend. Den kjenner API-adressen, men får ikke databasepassordet.',
			code: "const svar = await fetch('/api/utstyr');",
			note: 'HTTP GET /api/utstyr → backend'
		},
		{
			active: 'backend',
			title: '2. Backend lager databasesøket',
			explanation:
				'I GET-ruten bruker Node.js en allerede åpnet forbindelse. Driveren sender filteret til MongoDB. Her velger ruten bare kameraer.',
			code: "const resultat = await utstyr\n  .find({ kategori: 'kamera' })\n  .toArray();",
			note: 'MongoDB-driver → søk etter kameraer'
		},
		{
			active: 'database',
			title: '3. Databasen finner tre kameraer',
			explanation:
				'MongoDB finner dokumentene som har kategori kamera. Mikrofoner og lys faller utenfor. Ingen dokumenter endres av søket.',
			code: null,
			note: 'Tre dokumenter → tilbake til backend'
		},
		{
			active: 'backend',
			title: '4. Backend svarer med JSON',
			explanation:
				'await har gitt backend en liste med dokumentene. Express sender listen tilbake som JSON i HTTP-svaret.',
			code: 'res.json(resultat);',
			note: 'HTTP 200 + JSON → frontend'
		},
		{
			active: 'frontend',
			title: '5. Nettsiden kan vise resultatet',
			explanation:
				'Frontend leser JSON-svaret til en JavaScript-liste. Svelte kan vise listen med en each-blokk. MongoDB har ikke sendt HTML til nettleseren.',
			code: "if (!svar.ok) throw new Error('Kunne ikke hente utstyr.');\nconst kameraer = await svar.json();",
			note: 'Svelte viser Kamera Nord, Kamera Sør og Kamera Studio.'
		}
	],
	lagre: [
		{
			active: 'frontend',
			title: '1. Nettsiden sender et nytt utstyr',
			explanation:
				'Frontend sender det fiktive eksemplet Mikrofon Bord som JSON. Dette er en forespørsel om lagring, ikke en bekreftelse på at det er lagret.',
			code: "const svar = await fetch('/api/utstyr', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(nyttUtstyr)\n});",
			note: 'HTTP POST + JSON → backend'
		},
		{
			active: 'backend',
			title: '2. Backend kontrollerer før innsetting',
			explanation:
				'Backend må kontrollere tilgangen og velge og validere feltene fra req.body: blant annet tekst, boolsk tilgjengelighet og ikke-negativ dagspris. Ugyldige data avvises. Her følger vi det gyldige eksemplet videre.',
			code: '// Etter tilgangskontroll og validering:\nconst bekreftelse = await utstyr.insertOne(nyttUtstyr);',
			note: 'MongoDB-driver → insertOne med godkjente data'
		},
		{
			active: 'database',
			title: '3. MongoDB lagrer dokumentet',
			explanation:
				'I eksemplet er M203 en ubrukt ID. MongoDB legger inn dokumentet og bekrefter ID-en. Collectionen har nå sju dokumenter. En brukt ID ville gitt feil i stedet for en ny rad.',
			code: null,
			note: 'Bekreftet ID: M203 → backend'
		},
		{
			active: 'backend',
			title: '4. Backend bekrefter lagringen',
			explanation:
				'Først etter at innsettingen har lykkes, sender backend 201 Created. En databasefeil skal ikke gi beskjed om at utstyret er lagret.',
			code: 'res.status(201).json({ id: bekreftelse.insertedId });',
			note: 'HTTP 201 + JSON → frontend'
		},
		{
			active: 'frontend',
			title: '5. Nettsiden viser bekreftelsen',
			explanation:
				'Frontend kontrollerer HTTP-svaret før den viser ID-en. Vil den oppdatere hele utstyrslisten, må den hente listen på nytt eller oppdatere sin lokale visning.',
			code: "if (!svar.ok) throw new Error('Kunne ikke lagre utstyret.');\nconst bekreftelse = await svar.json();\nconsole.log('Lagret med ID:', bekreftelse.id);",
			note: 'Mikrofon Bord er lagret i databasen, ikke bare vist i nettleseren.'
		}
	]
};
/** @param {string} operation @param {number} step */
export function flowExample(operation, step) {
	const frames = flowExamples[/** @type {keyof typeof flowExamples} */ (operation)];
	if (!frames || !Number.isInteger(step) || !frames[step])
		throw new TypeError('Ukjent dataflytsteg.');
	return {
		...frames[step],
		operation,
		step,
		count: equipment.length + (operation === 'lagre' && step >= 2 ? 1 : 0)
	};
}

export const completeDatabaseExample = `import { MongoClient } from 'mongodb';

const databaseFailure = ${databaseFailure.toString()};

// Kjør med: node --env-file=.env eksempel.mjs
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
  // 1. Koble til og velg hvor vi skal arbeide.
  await client.connect();
  stage = 'lesing';
  const utstyr = client.db(database).collection('utstyr');

  // 2. Hent kameraer fra de klargjorte eksempeldataene.
  const kameraer = await utstyr.find({ kategori: 'kamera' }).toArray();
  console.log('Kameraer:');
  console.table(kameraer);

  // 3. Legg inn ett nytt dokument i din egen øvingsdatabase.
  const nyttUtstyr = ${JSON.stringify(newEquipment, null, 2).replaceAll('\n', '\n  ')};
  stage = 'lagring';
  try {
    const bekreftelse = await utstyr.insertOne(nyttUtstyr);
    console.log('Lagret med ID:', bekreftelse.insertedId);
  } catch (feil) {
    if (feil.code !== 11000) throw feil;
    console.log('En unik verdi er allerede i bruk. Ingen data er overskrevet.');
  }

  // 4. Hent på nytt for å undersøke hva som faktisk ligger i databasen.
  stage = 'lesing';
  const mikrofoner = await utstyr.find({ kategori: 'mikrofon' }).toArray();
  console.log('Mikrofoner:');
  console.table(mikrofoner);
} catch (error) {
  console.error(databaseFailure(error, stage));
  process.exitCode = 1;
} finally {
  // Dette terminalprogrammet er ferdig. Dokumentene blir liggende.
  await client?.close();
}
`;
