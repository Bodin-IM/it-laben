/** Runnable, introductory Node examples. The chat simulator keeps its own trace
 * and adds route handling, temporary files and error handling to these basics.
 * These strings are displayed/copied, never evaluated in the browser or API.
 * @typedef {{id:string,title:string,file:string,setup:string,code:string,outputTitle:string,output:string,explanation:string,tryNext:string,bridge:string}} CodeExample
 */
const fileImports = 'import { readFileSync, writeFileSync } from "node:fs";';
const filePath = 'const fil = "ovingsdata.json"; // I terminalens mappe';

/** @type {CodeExample} */
export const storageExample = {
	id: 'json-fil',
	title: 'Lagre en liste som JSON – og les den tilbake',
	file: 'lagre.mjs',
	setup: 'Lag filen i en tom øvingsmappe. Åpne terminalen i den mappen og kjør med Node.js. ovingsdata.json opprettes der og erstattes når du kjører på nytt.',
	code: `${fileImports}

${filePath}
const meldinger = [
  { id: "m1", avsender: "Ada", tekst: "Hei!" },
  { id: "m2", avsender: "Noah", tekst: "Hei!" }
];

// 1. Liste → JSON-tekst → fil
const json = JSON.stringify(meldinger, null, 2);
writeFileSync(fil, json, "utf8");

// 2. Fil → tekst → liste
const filtekst = readFileSync(fil, "utf8");
const lest = JSON.parse(filtekst);
console.log(lest[0].tekst); // Hei!`,
	outputTitle: 'Dette skrives til ovingsdata.json',
	output: JSON.stringify([{ id: 'm1', avsender: 'Ada', tekst: 'Hei!' }, { id: 'm2', avsender: 'Noah', tekst: 'Hei!' }], null, 2),
	explanation: 'stringify gjør listen til tekst. writeFileSync skriver teksten. readFileSync leser teksten, og parse lager en liste igjen. Tallet 2 gir innrykk i filen.',
	tryNext: 'Endre Adas tekst og kjør igjen. Åpne JSON-filen: hvilken verdi ble endret?',
	bridge: 'Dette viser de fire filoperasjonene alene. Chatkoden nedenfor bruker i tillegg en midlertidig fil før datafilen erstattes, og bekrefter bare etter vellykket lagring.'
};

/** @param {'PATCH'|'DELETE'} method @returns {CodeExample} */
function editExample(method) {
	const deleting = method === 'DELETE';
	return {
		id: deleting ? 'json-slett' : 'json-endre',
		title: deleting ? 'Fjern én ID og lagre resten' : 'Endre én melding og lagre listen',
		file: deleting ? 'slett.mjs' : 'endre.mjs',
		setup: 'Kjør først lagre.mjs fra øving 5. Lag denne filen i samme mappe og kjør fra den mappen i terminalen. Den leser og erstatter ovingsdata.json.',
		code: `${fileImports}
${filePath}

const meldinger = JSON.parse(readFileSync(fil, "utf8"));
const id = "m2"; // Noahs melding

${deleting ? '// Behold alle meldinger unntatt denne ID-en.\nconst nyListe = meldinger.filter(melding => melding.id !== id);' : '// Bare riktig ID får ny tekst. Resten beholdes.\nconst nyListe = meldinger.map((melding) => {\n  if (melding.id === id) {\n    return { ...melding, tekst: "Vi sees!" };\n  }\n  return melding;\n});'}

writeFileSync(fil, JSON.stringify(nyListe, null, 2), "utf8");
console.log(nyListe);`,
		outputTitle: 'Listen etter eksemplet · med startfilen fra øving 5',
		output: JSON.stringify(deleting ? [{ id: 'm1', avsender: 'Ada', tekst: 'Hei!' }] : [{ id: 'm1', avsender: 'Ada', tekst: 'Hei!' }, { id: 'm2', avsender: 'Noah', tekst: 'Vi sees!' }], null, 2),
		explanation: deleting ? 'filter lager en liste uten m2. writeFileSync lagrer hele den nye listen som JSON.' : 'map går gjennom listen. Hvis ID-en passer, kopierer ...melding feltene og tekst får en ny verdi. Ellers beholdes meldingen. Deretter lagres hele listen som JSON.',
		tryNext: 'Kjør lagre.mjs for å få startdata tilbake. Bytt id til "m1" og kjør dette skriptet. Hvem berøres nå?',
		bridge: 'Skriptet viser listeendringen og lagringen. Chatkoden nedenfor viser også ID fra request-adressen, 404 ved ukjent ID og GET for å oppdatere nettleseren.'
	};
}

/** @type {CodeExample} */
export const validationExample = {
	id: 'tekstkontroll',
	title: 'Kontroller teksten før du lagrer',
	file: 'valider.mjs',
	setup: 'Lag denne filen i øvingsmappen og kjør med Node.js. Den prøver tekstkontrollen og skriver bare i terminalen.',
	code: `function tekstFeil(tekst) {
  if (typeof tekst !== "string") return "Bruk tekst.";
  if (!tekst.trim()) return "Skriv en melding.";
  if (tekst.trim().length > 500) return "Maks 500 tegn.";
  return ""; // Ingen feil
}

const tekst = "   "; // Prøv også "Hei!" og 123
const beskjed = tekstFeil(tekst);
console.log(beskjed || "Meldingen kan lagres.");`,
	outputTitle: 'Terminalen med tre mellomrom som tekst',
	output: 'Skriv en melding.',
	explanation: 'typeof stopper tall før trim brukes. trim fjerner mellomrom rundt teksten. Tom eller for lang tekst gir en feilmelding. En tom feiltekst betyr at kontrollen godtar verdien.',
	tryNext: 'Bytt tekst til "Hei!", deretter 123. Kjør begge. Finn linjen som forklarer forskjellen.',
	bridge: 'I chatkoden nedenfor gir en feil et 400-svar og return før lagringen. Når kontrollene godtar meldingen, lagres listen som JSON.'
};

/** Same server-owned example is used by the page and Labpartner; no raw input.
 * @param {number} number @param {Record<string,string>} [values] @returns {CodeExample|null} */
export function backendCodeExample(number, values = {}) {
	if (number === 5) return storageExample;
	if (number === 6) return editExample(values.method === 'DELETE' ? 'DELETE' : 'PATCH');
	if (number === 7) return validationExample;
	return null;
}
