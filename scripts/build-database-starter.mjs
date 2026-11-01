// Run when the teaching dataset or starter code changes. Python is only used to package the ZIP.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { equipment, starterCode } from '../src/lib/databaseCourse.js';
import { databaseFailure, connectionCheckCode } from '../src/lib/databaseErrors.js';
import { completeDatabaseExample } from '../src/lib/databaseIntro.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), 'it-laben-database-'));
const folder = join(temporary, 'utstyrsboden-start');
const target = join(root, 'static/ressurser/utstyrsboden-start.zip');
mkdirSync(folder);
mkdirSync(join(root, 'static/ressurser'), { recursive: true });
const setupCode = `import { MongoClient } from 'mongodb';
import { readFile } from 'node:fs/promises';

const databaseFailure = ${databaseFailure.toString()};

const uri = process.env.MONGODB_URI;
const database = process.env.MONGODB_DATABASE;
if (!uri || !database) {
  console.error('[OPPSETT] Fyll inn MONGODB_URI og MONGODB_DATABASE i .env.');
  process.exit(1);
}
let client;
let stage = 'data';
try {
  const data = JSON.parse(await readFile(new URL('./utstyr.json', import.meta.url), 'utf8'));
  if (!Array.isArray(data) || data.length > 100 || data.some((item) =>
    !item || typeof item._id !== 'string' || !item._id.trim() ||
    typeof item.navn !== 'string' || typeof item.kategori !== 'string' ||
    typeof item.tilgjengelig !== 'boolean' || typeof item.dagspris !== 'number' ||
    !Number.isFinite(item.dagspris) || item.dagspris < 0) ||
    new Set(data.map((item) => item._id)).size !== data.length) {
    throw new Error('Kontroller feltene og unike tekst-ID-er i utstyr.json.');
  }
  stage = 'kobling';
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  stage = 'lagring';
  const utstyr = client.db(database).collection('utstyr');
  let inserted = 0;
  for (const item of data) {
    // Bare nye ID-er legges til. Eksisterende dokumenter blir ikke overskrevet.
    const result = await utstyr.updateOne({ _id: item._id }, { $setOnInsert: item }, { upsert: true });
    inserted += result.upsertedCount;
  }
  console.log('Nye dokumenter lagt til:', inserted);
  console.log('Eksisterende dokumenter er beholdt. Kjør finn.mjs for å undersøke dataene.');
} catch (error) {
  console.error(databaseFailure(error, stage));
  console.error('Klargjøringen kan ha lagt til noen av dokumentene. Kjør den på nytt etter retting; eksisterende ID-er blir ikke overskrevet.');
  process.exitCode = 1;
} finally {
  await client?.close();
}
`;
const files = {
	'package.json':
		JSON.stringify(
			{
				name: 'utstyrsboden-start',
				private: true,
				version: '1.0.0',
				type: 'module',
				engines: { node: '>=22' },
				scripts: {
					data: 'node --env-file=.env klargjor.mjs',
					start: 'node --env-file=.env finn.mjs'
				}
			},
			null,
			2
		) + '\n',
	'.env.example':
		'# Eksemplet gjelder MongoDB på din egen maskin. Bruk adressen og din database fra læreren.\nMONGODB_URI=mongodb://127.0.0.1:27017\nMONGODB_DATABASE=utstyrsboden_oving\n',
	'.gitignore': '.env\n.env.*\n!.env.example\nnode_modules/\n',
	'utstyr.json': JSON.stringify(equipment, null, 2) + '\n',
	'sjekk.mjs': connectionCheckCode,
	'finn.mjs': starterCode,
	'eksempel.mjs': completeDatabaseExample,
	'klargjor.mjs': setupCode,
	'LES-MEG.md': `# Utstyrsboden – første kodeoppgave

Bruk oppgaveteksten i IT-laben: /databaser/praksis/.
Du trenger Node.js 22 eller nyere og tilgang til en MongoDB-database for deg eller gruppen.

1. Åpne denne mappen i editoren og terminalen.
2. Kjør \\CMDINSTALL.
3. Kopier .env.example til .env. Fyll inn URI og databasenavn fra læreren.
4. Kjør node --env-file=.env sjekk.mjs. [KLAR] betyr at forbindelse og lesing virker, også hvis collectionen er tom.
5. Kjør \\CMDSETUP.
6. Kjør \\CMDFIND.
7. Skriv egne filtre i finn.mjs. Start med alle mikrofoner, og deretter ledige kameraer til høyst 300 kr.

Vil du først kjøre det forklarte eksemplet fra teorien? Kjør node --env-file=.env eksempel.mjs etter klargjøringen.
Det henter kameraer, legger inn Mikrofon Bord (M203) og henter mikrofonene på nytt. I en ny database
er det da sju dokumenter. Gjentakelse overskriver ikke M203 og legger ikke til en ny kopi med samme ID.
De tre mikrofonene er M201, M202 og M203. Egne søk i finn.mjs bruker dataene som faktisk ligger i databasen.

Klargjøringen legger bare til dokumenter med nye ID-er. Den overskriver og sletter ikke eksisterende data.
I en tom collection skal startdatasettet gi seks dokumenter. Vil du legge til et eget fiktivt dokument,
utvid utstyr.json med en ubrukt tekst-ID og kjør klargjøringen igjen. Bruk samme felter og datatyper.

Feilsøk med koden foran meldingen: [OPPSETT], [KONTAKT], [INNLOGGING], [TILGANG], [STARTDATA], [LAGRING] eller [LESING].
Hvis Node sier at .env eller en .mjs-fil ikke finnes, åpne terminalen i mappen med filene.
Hvis PowerShell blokkerer npm.ps1, bruk npm.cmd install mongodb eller Ledetekst.

En gyldig spørring uten treff gir en tom liste. En teknisk feil gir en feilmelding og avslutter med feilkode.
Behold koden og resultater fra kjøringer, og forklar hvorfor ett dokument blir med og et annet faller utenfor.

Del aldri .env, passord eller hele tilkoblingsstrengen. 127.0.0.1 betyr din egen maskin.
Hvis MongoDB kjører på skoleserveren, skal du bruke adressen og begrenset tilgang fra læreren.
MongoDB skal ikke kontaktes direkte fra frontend; denne øvingen kjører i Node.js.
Dette er bare fiktive øvingsdata. Prosjektet gir ikke automatisk vurdering eller XP i IT-laben.
`
		.replace('\\CMDINSTALL', '`npm install mongodb`')
		.replace('\\CMDSETUP', '`node --env-file=.env klargjor.mjs`')
		.replace('\\CMDFIND', '`node --env-file=.env finn.mjs`')
};
try {
	for (const [name, content] of Object.entries(files)) writeFileSync(join(folder, name), content);
	execFileSync('python3', [
		'-c',
		`import pathlib, sys, zipfile
source, target = pathlib.Path(sys.argv[1]), sys.argv[2]
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(source.iterdir()):
        info = zipfile.ZipInfo('utstyrsboden-start/' + path.name, (2026, 10, 28, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, path.read_bytes())
`,
		folder,
		target
	]);
	console.log('Oppdatert static/ressurser/utstyrsboden-start.zip');
} finally {
	rmSync(temporary, { recursive: true, force: true });
}
