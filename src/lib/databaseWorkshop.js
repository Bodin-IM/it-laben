// Bounded experiments with public, fictitious data. No MongoDB connection or arbitrary code execution.
import { equipment, inspectQuery, sameIds } from './databaseCourse.js';

/** @typedef {Record<string,string>} WorkshopChoices */
/** @typedef {{choices:WorkshopChoices,run:WorkshopChoices|null}} WorkshopAttempt */
/** @typedef {Record<string,string|number|boolean|undefined> & {_id:string,navn:string}} WorkshopDocument */
/** @typedef {{id:string,title:string,brief:string,goal:string,initial:WorkshopChoices,controls:{key:string,label:string,options:{value:string,label:string}[]}[],hints:string[],transfer:string,theory:string}} WorkshopTask */
/** @param {string} value @param {string} [label] */
const option = (value, label = value) => ({ value, label });
/** @type {WorkshopTask[]} */
export const workshopTasks = [
	{
		id: 'skill', title: 'To søk, samme resultat?',
		brief: 'Lag ett nytt utstyr som gjør at de to søkene finner forskjellige dokumenter.',
		goal: 'Lage testdata som avslører en forskjell mellom to filtre.',
		initial: { kategori: 'mikrofon', dagspris: '200' },
		controls: [
			{ key: 'kategori', label: 'Type utstyr', options: [option('kamera', 'Kamera'), option('mikrofon', 'Mikrofon'), option('lys', 'Lys')] },
			{ key: 'dagspris', label: 'Dagspris', options: ['100', '200', '500', '501', '600', '900'].map((v) => option(v, `${v} kr`)) }
		],
		hints: ['Hva krever søk B som søk A ikke krever?', 'Prøv et kamera på hver side av prisgrensen. Akkurat 500 er med i begge søk.'],
		transfer: 'Legg til et fiktivt kamera i egen database og sammenlign de to filtrene. Prøv også akkurat 500 kr.',
		theory: 'filter'
	},
	{
		id: 'typer', title: 'Hvor ble utstyret av?',
		brief: 'Søket skal finne både mikrofonen og lyset. Reparer datatypene i de importerte dokumentene.',
		goal: 'Undersøke hvordan tekst, tall og boolske verdier påvirker et søk.',
		initial: { tilgjengelig: 'tekst', dagspris: 'tekst' },
		controls: [
			{ key: 'tilgjengelig', label: 'M201 · tilgjengelig', options: [option('tekst', '"true" · tekst'), option('boolsk', 'true · boolsk')] },
			{ key: 'dagspris', label: 'L301 · dagspris', options: [option('tekst', '"200" · tekst'), option('tall', '200 · tall')] }
		],
		hints: ['Åpne et dokument og sammenlign typen med verdien i filteret.', 'Filteret bruker true uten anførselstegn og en tallgrense. Undersøk ett felt om gangen.'],
		transfer: 'Lag ett dokument med pris som tekst i øvingsdatabasen. Sammenlign med et dokument der prisen er et tall. Rett typen og kjør på nytt.',
		theory: 'typer'
	},
	{
		id: 'modell', title: 'Bygg et register som virker',
		brief: 'Finn Kamera Mini med ID K402, og finn ledige enheter til høyst 300 kr. Velg feltene registeret trenger.',
		goal: 'Velge felt ut fra konkrete behov og skille en modellbetegnelse fra én bestemt enhet.',
		initial: { identitet: 'navn', dagspris: 'uten', tilgjengelig: 'uten', kategori: 'uten' },
		controls: [
			{ key: 'identitet', label: 'Finn det bestemte kameraet med', options: [option('navn', 'navn: "Kamera Mini"'), option('id', '_id: "K402"')] },
			{ key: 'dagspris', label: 'Feltet dagspris', options: [option('uten', 'Utelat'), option('med', 'Ta med tall')] },
			{ key: 'tilgjengelig', label: 'Feltet tilgjengelig', options: [option('uten', 'Utelat'), option('med', 'Ta med boolsk verdi')] },
			{ key: 'kategori', label: 'Feltet kategori', options: [option('uten', 'Utelat'), option('med', 'Ta med tekst')] }
		],
		hints: ['To enheter kan hete det samme. Se hvor mange dokumenter det første søket finner.', 'Behovet for ledig utstyr under en prisgrense krever opplysninger om både pris og tilgjengelighet.'],
		transfer: 'Lag tre fiktive supporthenvendelser i en egen collection. Velg felter for å finne åpne saker med høy prioritet, og identifiser én bestemt sak.',
		theory: 'dokument'
	}
];

/** @param {string} id @param {unknown} raw @returns {raw is WorkshopChoices} */
export function validWorkshopChoices(id, raw) {
	const task = workshopTasks.find((item) => item.id === id);
	if (!task || !raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
	const values = /** @type {Record<string,unknown>} */ (raw);
	return Object.keys(values).length === task.controls.length && task.controls.every((control) =>
		control.options.some((item) => item.value === values[control.key]));
}

/** @param {string} id @param {WorkshopChoices} choices @returns {WorkshopDocument[]} */
export function workshopDocuments(id, choices) {
	if (!validWorkshopChoices(id, choices)) throw new TypeError('Ukjente verkstedvalg.');
	if (id === 'skill') return [...equipment.map((item) => ({ ...item })), {
		_id: 'TEST1', navn: 'Ditt prøveutstyr', kategori: choices.kategori, tilgjengelig: true, dagspris: Number(choices.dagspris)
	}];
	if (id === 'typer') return [
		{ ...equipment[3], tilgjengelig: choices.tilgjengelig === 'boolsk' ? true : 'true' },
		{ ...equipment[5], dagspris: choices.dagspris === 'tall' ? 200 : '200' }
	];
	return [450, 250].map((price, index) => ({
		_id: `K40${index + 1}`, navn: 'Kamera Mini',
		...(choices.dagspris === 'med' ? { dagspris: price } : {}),
		...(choices.tilgjengelig === 'med' ? { tilgjengelig: true } : {}),
		...(choices.kategori === 'med' ? { kategori: 'kamera' } : {})
	}));
}

/** Numeric comparison in this teaching model does not coerce strings or missing fields.
 * @param {WorkshopDocument} item @param {number} limit */
const affordable = (item, limit) => item.tilgjengelig === true && typeof item.dagspris === 'number' && item.dagspris <= limit;

/** @param {string} id @param {WorkshopChoices} choices */
export function runWorkshop(id, choices) {
	const documents = workshopDocuments(id, choices);
	if (id === 'skill') {
		const a = documents.filter((d) => d.kategori === 'kamera');
		const b = a.filter((d) => typeof d.dagspris === 'number' && d.dagspris <= 500);
		const passed = !sameIds(a.map((d) => d._id), b.map((d) => d._id));
		return { documents, passed, groups: [{ label: 'Søk A · alle kameraer', documents: a }, { label: 'Søk B · kameraer til høyst 500 kr', documents: b }],
			code: 'const a = await utstyr.find({ kategori: "kamera" }).toArray();\nconst b = await utstyr.find({ kategori: "kamera", dagspris: { $lte: 500 } }).toArray();',
			result: passed ? 'Det nye dokumentet skiller søkene.' : 'Søkene finner fortsatt de samme dokumentene.',
			cause: passed ? `TEST1 er et kamera til ${choices.dagspris} kr. Bare søk A finner det.` : choices.kategori !== 'kamera' ? 'Begge søkene krever kamera. Det nye utstyret faller utenfor begge.' : 'Prisen er innenfor grensen i søk B. Begge søkene finner det nye kameraet.',
			next: passed ? 'Prøv akkurat 500 kr. Hva endres?' : 'Endre én egenskap ved prøveutstyret og sammenlign igjen.' };
	}
	if (id === 'typer') {
		const found = documents.filter((d) => affordable(d, 200));
		const missing = documents.filter((d) => !affordable(d, 200));
		return { documents, passed: found.length === 2, groups: [{ label: 'Ledig utstyr til høyst 200 kr', documents: found }],
			code: 'const resultat = await utstyr.find({ tilgjengelig: true, dagspris: { $lte: 200 } }).toArray();',
			result: `${found.length} av 2 dokumenter ble funnet.`,
			cause: missing.length ? missing.map((d) => d._id === 'M201' ? 'M201 har tilgjengelig som tekst, mens filteret krever boolsk true.' : 'L301 har pris som tekst. Tallgrensen sammenligner tall.').join(' ') : 'Begge dokumentene har boolsk true og en tallpris innenfor grensen.',
			next: missing.length ? 'Rett én datatype. Kjør det samme søket igjen.' : 'Vis hvilken endring som fikk hvert dokument med. Bruk riktige typer når nye data registreres.' };
	}
	const selected = documents.filter((d) => choices.identitet === 'id' ? d._id === 'K402' : d.navn === 'Kamera Mini');
	const found = documents.filter((d) => affordable(d, 300));
	const passed = selected.length === 1 && selected[0]._id === 'K402' && found.length === 1 && found[0]._id === 'K402';
	return { documents, passed, groups: [{ label: 'Én bestemt enhet · ønsket ID K402', documents: selected }, { label: 'Ledige enheter til høyst 300 kr', documents: found }],
		code: `const enhet = await utstyr.find(${choices.identitet === 'id' ? '{ _id: "K402" }' : '{ navn: "Kamera Mini" }'}).toArray();\nconst ledige = await utstyr.find({ tilgjengelig: true, dagspris: { $lte: 300 } }).toArray();`,
		result: passed ? 'Registeret støtter begge behovene.' : 'Registeret trenger en justering.',
		cause: selected.length !== 1 ? 'Navnesøket finner to kameraer med samme navn. ID-ene skiller enhetene.' : found.length !== 1 ? 'Søket trenger feltene dagspris og tilgjengelig. Et manglende felt passer ikke betingelsen.' : 'ID-en velger én enhet. Pris og tilgjengelighet lar oss finne utstyret som passer. Kategori er valgfritt for disse to behovene.',
		next: passed ? 'Hvilket nytt behov ville gjort kategori nyttig? Prøv med og uten feltet.' : selected.length !== 1 ? 'Prøv en egenskap som er unik for enheten.' : 'Ta med opplysningene det andre søket trenger, og prøv igjen.' };
}

/** @returns {Record<string,WorkshopAttempt>} */
export const initialWorkshop = () => Object.fromEntries(workshopTasks.map((t) => [t.id, { choices: { ...t.initial }, run: null }]));
/** @param {unknown} raw */
export function restoreWorkshop(raw) {
	const result = initialWorkshop();
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
	const saved = /** @type {Record<string,any>} */ (raw);
	if (saved.version !== 1) return result;
	for (const task of workshopTasks) {
		const attempt = saved.attempts?.[task.id];
		if (!attempt || !validWorkshopChoices(task.id, attempt.choices)) continue;
		result[task.id] = { choices: { ...attempt.choices }, run: validWorkshopChoices(task.id, attempt.run) ? { ...attempt.run } : null };
	}
	return result;
}
/** @param {WorkshopChoices} a @param {WorkshopChoices|null} b */
export const sameWorkshop = (a, b) => !!b && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((key) => a[key] === b[key]);

/** Short feedback derived from the actual search, reused by UI and partner context.
 * @param {string} id @param {import('./databaseCourse.js').QueryChoices} choices */
export function queryFeedback(id, choices) {
	const rows = inspectQuery(choices);
	const wanted = equipment.filter((d) => id === 'kamera' ? d.kategori === 'kamera' : id === 'ledig' ? d.kategori === 'kamera' && d.tilgjengelig : d.tilgjengelig && d.dagspris <= 200);
	const missing = wanted.find((d) => !rows.find((row) => row.document._id === d._id)?.matches);
	const extra = rows.find((row) => row.matches && !wanted.some((d) => d._id === row.document._id));
	const focus = missing ?? extra?.document;
	return { focusId: focus?._id ?? null,
		cause: missing ? `${missing.navn} mangler. ${rows.find((row) => row.document._id === missing._id)?.checks.find((check) => !check.matches)?.explanation}` : extra ? `${extra.document.navn} ble med, men passer ikke bestillingen.` : 'Resultatet passer bestillingen i disse seks dokumentene.',
		next: focus ? `Undersøk ${focus._id} og endre én betingelse.` : 'Forklar hvorfor ett dokument er med og et annet faller utenfor.' };
}
