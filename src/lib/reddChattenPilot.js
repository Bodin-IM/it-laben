import { blocksFor } from './reddChatten.js';

// A narrower starting point than the original game: the guard exists, but whitespace passes.
export const PILOT_START = ['guard-text', 'save-body', 'reply-created'];
export const PILOT_BLOCKS = blocksFor('tekst').filter((block) =>
	['normalize-text', 'guard-text', 'guard-present', 'save-body', 'reply-created'].includes(block.id)
);
export const STEPS = [
	{
		title: 'Se et eksempel',
		short: 'Se',
		description: 'Følg en vanlig melding fra request til svar.'
	},
	{
		title: 'Forutsi resultatet',
		short: 'Forutsi',
		description: 'Hva gjør den samme koden med bare mellomrom?'
	},
	{
		title: 'Undersøk feilen',
		short: 'Undersøk',
		description: 'Finn verdien som slipper gjennom. Lag en egen test.'
	},
	{
		title: 'Reparer chatten',
		short: 'Reparer',
		description: 'Endre koden og prøv både vanlige meldinger og feiltilfeller.'
	},
	{
		title: 'Forklar løsningen',
		short: 'Forklar',
		description: 'Sett ord på hvorfor ugyldige meldinger ikke blir lagret.'
	},
	{
		title: 'Bruk det på et romnavn',
		short: 'Prøv selv',
		description: 'Bruk det samme prinsippet i en ny rute, med mindre støtte.'
	}
];
export const HINTS = [
	'Se på tekst akkurat når if-testen kjører. Er "   " det samme som "" i JavaScript?',
	'trim() fjerner mellomrom foran og bak en streng. Undersøk teksten etter rydding, før meldinger.push kjører.',
	'Et løsningsprinsipp: rydd teksten → avvis tomt innhold med return → lagre → svar 201. Typekontrollen i «Rydd teksten» håndterer også et manglende felt og tall.'
];

/** @typedef {import('./reddChatten.js').Block} Block */
/** @type {Block[]} */
export const ROOM_BLOCKS = [
	{
		id: 'clean',
		group: 'clean',
		title: 'Behandle navnet',
		category: 'read',
		lines: [
			{
				id: 'clean-1',
				text: 'navn = typeof navn === "string" ? navn.trim() : "";',
				title: 'Behandle navnet',
				explanation: 'Fjerner mellomrom rundt strenger. Andre verdier blir tom tekst.'
			}
		],
		explanation: 'Klargjør navnet uten å lagre eller sende svar.'
	},
	{
		id: 'guard',
		group: 'guard',
		title: 'Kontroller navnet',
		category: 'guard',
		lines: [
			{
				id: 'guard-1',
				text: 'if (!navn) return res.status(400).json({ feil: "Skriv et romnavn" });',
				title: 'Kontroller navnet',
				explanation: 'En falsy verdi avslutter ruten med 400. Tidligere endringer blir ikke angret.'
			}
		],
		explanation: 'Avviser falsy verdier og avslutter ruten.'
	},
	{
		id: 'save',
		group: 'save',
		title: 'Opprett rommet',
		category: 'write',
		lines: [
			{
				id: 'save-1',
				text: 'opprettet = { id: nesteId++, navn };',
				title: 'Opprett rommet',
				explanation: 'Lager romobjektet med navnet slik det er nå.'
			},
			{
				id: 'save-2',
				text: 'rom.push(opprettet);',
				title: 'Lagre rommet',
				explanation: 'Legger rommet i listen med en gang.'
			}
		],
		explanation: 'Oppretter og lagrer et rom med den nåværende verdien.'
	},
	{
		id: 'reply',
		group: 'reply',
		title: 'Send svaret',
		category: 'respond',
		lines: [
			{
				id: 'reply-1',
				text: 'return res.status(201).json(opprettet);',
				title: 'Send svaret',
				explanation: 'Sender romobjektet og avslutter ruten.'
			}
		],
		explanation: 'Bekrefter opprettelsen. Lagringen må allerede ha skjedd.'
	}
];
export const ROOM_START = ['save', 'guard', 'reply'];
export const ROOM_FRAME = {
	opening: ['app.post("/rom", (req, res) => {', '  let navn = req.body.navn;', '  let opprettet;'],
	closing: ['});']
};
export const ROOM_CASES = [
	{ id: 'normal', name: 'Vanlig romnavn', value: 'Gaming' },
	{ id: 'around', name: 'Mellomrom rundt navnet', value: '  Verkstedet  ' },
	{ id: 'empty', name: 'Tomt navn', value: '' },
	{ id: 'space', name: 'Bare mellomrom', value: '   ' },
	{ id: 'missing', name: 'Navnet mangler', value: undefined },
	{ id: 'number', name: 'Et tall', value: 42 }
];

/** The interpreter executes only the visible, predefined blocks; never arbitrary JavaScript.
 * @param {string[]} program @param {unknown} value
 */
export function evaluateRoom(program, value) {
	if (
		!validProgram(
			program,
			ROOM_BLOCKS.map((item) => item.id),
			4
		)
	)
		throw new TypeError('Ugyldig romprogram');
	/** @type {{id:number,navn:unknown}[]} */
	const rooms = [{ id: 1, navn: 'Generelt' }];
	let name = value;
	/** @type {{id:number,navn:unknown}|undefined} */
	let created;
	/** @type {number|null} */
	let status = null;
	/** @type {unknown} */
	let response = null;
	for (const id of program) {
		if (status !== null) break;
		if (id === 'clean') name = typeof name === 'string' ? name.trim() : '';
		if (id === 'guard' && !name) {
			status = 400;
			response = { feil: 'Skriv et romnavn' };
		}
		if (id === 'save') {
			created = { id: 2, navn: name };
			rooms.push(created);
		}
		if (id === 'reply') {
			status = 201;
			response = created ?? null;
		}
	}
	const valid = typeof value === 'string' && value.trim().length > 0;
	const expectedRooms = valid
		? [
				{ id: 1, navn: 'Generelt' },
				{ id: 2, navn: value.trim() }
			]
		: [{ id: 1, navn: 'Generelt' }];
	const expectedResponse = valid ? expectedRooms[1] : { feil: 'Skriv et romnavn' };
	const passed =
		status === (valid ? 201 : 400) &&
		JSON.stringify(rooms) === JSON.stringify(expectedRooms) &&
		JSON.stringify(response) === JSON.stringify(expectedResponse);
	const feedback = passed
		? valid
			? 'Rommet ble lagret én gang med ryddet navn. Svaret inneholder rommet og status 201.'
			: 'Navnet ble avvist med 400. Romlisten er uendret.'
		: !valid && rooms.length > 1
			? `Status ${status ?? 'mangler'}, men rommet ligger allerede i listen. Se hvilken linje som endret data før svaret.`
			: status === null
				? 'Ruten nådde slutten uten å sende svar.'
				: valid && rooms.length === 1
					? 'Et gyldig romnavn skal bli lagret én gang før svaret sendes.'
					: valid
						? 'Sammenlign det lagrede navnet og svarinnholdet med kravet: ryddet navn, én lagring og 201.'
						: `Denne verdien skal få 400 uten å endre listen. Koden ga ${status}.`;
	return { passed, status, rooms, response, feedback };
}

/** @param {unknown} value @param {string[]} allowed @param {number} max */
export function validProgram(value, allowed, max) {
	return (
		Array.isArray(value) &&
		value.length <= max &&
		value.every((id) => typeof id === 'string' && allowed.includes(id)) &&
		new Set(value).size === value.length
	);
}
