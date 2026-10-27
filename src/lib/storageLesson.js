/** @type {Record<number, { title: string, text: string }>} */
export const forklaringer = {
	1: {
		title: 'Verktøy fra Node',
		text: 'node:fs følger med Node.js. existsSync sjekker om filen finnes, readFileSync leser, og writeFileSync skriver.'
	},
	2: {
		title: 'Hvilken fil?',
		text: './meldinger.json er relativ til mappen du starter Node fra. I hjelpearket starter du serveren fra backendmappen.'
	},
	4: {
		title: 'Finnes filen allerede?',
		text: '! betyr «ikke». Bare når filen mangler, går kjøringen inn i denne if-blokken. En eksisterende fil beholdes.'
	},
	5: {
		title: 'Opprett en tom liste',
		text: 'Filen får teksten []. Det er gyldig JSON for en tom liste. En helt tom fil ville ikke vært gyldig JSON.'
	},
	7: {
		title: 'Les tekst, så tolk JSON',
		text: 'readFileSync gir tekst fordi vi bruker utf8. JSON.parse tolker teksten. Hjelpearket forutsetter at filen inneholder en liste med meldinger.'
	},
	9: {
		title: 'En funksjon som venter',
		text: 'Her defineres lagreMeldinger. Koden inne i funksjonen kjører først når lagreMeldinger() blir kalt.'
	},
	10: {
		title: 'Hele listen blir lagret',
		text: 'JSON.stringify lager tekst av hele meldinger-listen. null, 2 gir innrykk. writeFileSync erstatter filinnholdet med denne teksten.'
	},
	14: {
		title: 'Endre listen i minnet',
		text: 'push legger nyMelding inn i arrayet. Dette endrer minnet til serverprosessen. Filen blir ikke endret av push.'
	},
	15: {
		title: 'Kallet som gjør forskjellen',
		text: 'Når denne linjen er på, hopper kjøringen inn i lagreMeldinger. Slå den av for å kommentere bort kallet og undersøke hva som skjer ved omstart.'
	},
	16: {
		title: 'Send svar til frontend',
		text: '201 betyr at denne ruten svarer at meldingen er opprettet. Ruten sender også dette svaret når lagringskallet er kommentert bort.'
	}
};

export const kilde = [
	'import { existsSync, readFileSync, writeFileSync } from "node:fs";',
	'const fil = "./meldinger.json";',
	'',
	'if (!existsSync(fil)) {',
	'  writeFileSync(fil, "[]", "utf8");',
	'}',
	'let meldinger = JSON.parse(readFileSync(fil, "utf8"));',
	'',
	'function lagreMeldinger() {',
	'  writeFileSync(fil, JSON.stringify(meldinger, null, 2), "utf8");',
	'}',
	'',
	'// I eksisterende POST /meldinger:',
	'meldinger.push(nyMelding);',
	'lagreMeldinger();',
	'res.status(201).json(nyMelding);'
];
