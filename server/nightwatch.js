import { randomInt, randomUUID } from 'node:crypto';
import { evaluateProgram, blocksFor, casesFor } from '../src/lib/reddChatten.js';
import { textError } from '../src/lib/ovingModel.js';

function shuffle(items) {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}
function task(key, title, entries, type = 'select') {
	const values = {};
	const choices = shuffle(entries).map(([value, label, code]) => {
		const id = randomUUID();
		values[id] = value;
		return { id, label, ...(code ? { code } : {}) };
	});
	return { id: randomUUID(), key, title, type, choices, values };
}

export function createNightwatch(previous = null) {
	const fields = ['tekst', 'innhold', 'melding'];
	const field = shuffle(fields.filter((item) => item !== previous?.field))[0];
	const wrongField = fields.find((item) => item !== field);
	const person = shuffle(['Ada', 'Mina', 'Iben', 'Noah'])[0];
	const file = shuffle(['chat-data.json', 'meldinger.json', 'romhistorikk.json'])[0];
	const room = shuffle(['Gaming', 'Verksted', 'Prosjekt'])[0];
	const id = randomInt(20, 90);
	const deletion = blocksFor('sletting');
	const actions = [
		'guard-login',
		'find-id',
		'guard-found',
		'guard-owner-session',
		'delete-id',
		'reply-deleted'
	];
	return {
		field,
		file,
		person,
		room,
		name: `${room} / NODE-${id}`,
		incidents: [
			{
				id: 'contract',
				title: 'Meldinger blir avvist',
				signal: 'POST /meldinger → 400',
				file: 'frontend.js → server.js',
				logs: [
					`07:52:04 INN  ${JSON.stringify({ [wrongField]: 'God morgen!', rom: room })}`,
					`07:52:04 UT   400 — ${field} mangler`,
					'07:52:05 KRAV Tom tekst skal fortsatt avvises før lagring.'
				],
				code: `// Backendens kontrakt\nconst verdi = req.body.${field};\nif (typeof verdi !== "string" || !verdi.trim()) {\n  return res.status(400).json({ feil: "Skriv en melding" });\n}\n// Frontend sender nå: { ${wrongField}: tekst, rom }`,
				tasks: [
					task(
						'field',
						'Hvilken request-body følger kontrakten?',
						fields
							.concat('message')
							.map((value) => [
								value,
								`Send feltet ${value}`,
								`JSON.stringify({ ${value}: tekst, rom })`
							])
					),
					task('validation', 'Hvilken kontroll skal beholdes før lagring?', [
						[
							'content',
							'Kontroller type og trimmet innhold',
							'typeof verdi === "string" && verdi.trim().length > 0'
						],
						['present', 'Kontroller bare at feltet finnes', 'verdi !== undefined'],
						['truthy', 'Kontroller bare truthy-verdi', 'Boolean(verdi)']
					])
				]
			},
			{
				id: 'session',
				title: 'Innlogget, men får 401',
				signal: 'Cookie finnes · request-cookie mangler',
				file: 'frontend.js / innlogging',
				logs: [
					`07:53:11 NETTLESER ${person} har en gyldig session-cookie.`,
					'07:53:12 POST request-cookie: ingen → 401',
					'07:53:13 GET  request-cookie: ingen → 401',
					'07:53:14 TEST En request forsøker å sende en annen avsender i body.'
				],
				code: `// Begge requests går til samme origin som nettsiden.\n// Ruten krever innlogging både ved POST og GET.\nfetch("/api/meldinger", {\n  method: "POST", credentials: "omit", body\n});\nfetch("/api/meldinger", { credentials: "omit" });`,
				tasks: [
					task('cookies', 'Hvordan skal de to forespørslene sende cookies?', [
						[
							'both',
							'Send session-cookien med både POST og GET',
							'credentials: "same-origin" // på begge'
						],
						['post', 'Send session-cookien bare med POST', 'POST: "same-origin" / GET: "omit"'],
						['get', 'Send session-cookien bare med GET', 'POST: "omit" / GET: "same-origin"']
					]),
					task('identity', 'Hvor skal backend hente den betrodde avsenderen?', [
						['session', 'Fra den gyldige sessionen', 'req.session.bruker.id'],
						['body', 'Fra avsender-ID i request-body', 'req.body.avsenderId'],
						['latest', 'Fra brukeren som sist logget inn', 'sistInnloggedeBruker.id']
					])
				]
			},
			{
				id: 'ownership',
				title: 'Feil bruker får slette',
				signal: '403 returneres · meldingen er allerede borte',
				file: 'server.js / DELETE /meldinger/:id',
				logs: [
					`07:54:03 DELETE /meldinger/${id} — bruker er ikke eier.`,
					'07:54:03 DATA Meldingen ble fjernet.',
					'07:54:03 UT   403 — avvist for sent.',
					'07:54:04 KRAV Gjest: 401 før oppslag. Ukjent ID: 404. Feil eier: 403 uten endring.'
				],
				code: 'meldinger = meldinger.filter((item) => item.id !== id);\nif (melding.avsenderId !== req.session.bruker.id) {\n  return res.status(403).json({ feil: "Ikke din melding" });\n}',
				tasks: [
					task(
						'deletion',
						'Sett alle seks blokkene i en trygg rekkefølge.',
						actions.map((value) => {
							const block = deletion.find((item) => item.id === value);
							return [value, block.title, block.lines.map((line) => line.text).join('\n')];
						}),
						'order'
					)
				]
			},
			{
				id: 'storage',
				title: 'Omstart tømmer chatten',
				signal: 'Prosess oppe · historikk mangler',
				file: `server.js / ${file}`,
				logs: [
					`07:55:20 DISK ${file} finnes med tidligere meldinger.`,
					'07:55:21 START Prosessen setter meldinger = []. Ingen fil leses.',
					'07:55:24 POST 201 sendes før filskrivingen er ferdig.',
					'07:55:24 DISK Skrivefeil. Nettleseren har allerede fått bekreftet lagring.'
				],
				code: `let meldinger = []; // ved hver oppstart\n\nmeldinger.push(nyMelding);\nres.status(201).json(nyMelding);\nawait skrivFil("${file}", meldinger);`,
				tasks: [
					task('startup', 'Hvordan skal oppstarten hente tilbake historikken?', [
						[
							'load',
							'Les og kontroller den eksisterende JSON-filen',
							`meldinger = await lesOgKontrollerJSON("${file}");`
						],
						['empty', 'Behold tom liste; filen er allerede på disk', 'meldinger = [];'],
						['overwrite', 'Skriv en ny tom fil ved oppstart', `await skrivFil("${file}", []);`]
					]),
					task('write', 'Når skal aktivt minne og suksessvaret oppdateres?', [
						[
							'durable',
							'Etter vellykket lagring av neste liste',
							'const neste = [...meldinger, nyMelding];\nawait lagreAtomisk(neste);\nmeldinger = neste;\nreturn res.status(201).json(nyMelding);'
						],
						[
							'early',
							'Oppdater minnet og svar før filskriving',
							'meldinger.push(nyMelding);\nres.status(201).json(nyMelding);\nawait lagreAtomisk(meldinger);'
						],
						[
							'memory',
							'Behold endringen i minnet hvis filskriving feiler',
							'meldinger.push(nyMelding);\ntry { await lagreAtomisk(meldinger); }\ncatch { return res.status(201).json(nyMelding); }'
						]
					])
				]
			}
		]
	};
}

export function publicScenario(snapshot) {
	return {
		name: snapshot.name,
		incidents: snapshot.incidents.map((incident) => ({
			id: incident.id,
			title: incident.title,
			signal: incident.signal,
			file: incident.file,
			code: incident.code,
			logs: incident.logs,
			tasks: incident.tasks.map(({ id, title, type, choices }) => ({ id, title, type, choices }))
		}))
	};
}

/** Validate structure only: saving or malformed input never reveals grading. */
export function validateDraft(snapshot, answers, complete = false) {
	const tasks = snapshot.incidents.flatMap((incident) => incident.tasks);
	if (
		!answers ||
		typeof answers !== 'object' ||
		Array.isArray(answers) ||
		Object.keys(answers).some((id) => !tasks.some((task) => task.id === id))
	)
		throw new TypeError('Ugyldige valg for denne vakten.');
	for (const task of tasks) {
		const answer = answers[task.id];
		if (answer === undefined && !complete) continue;
		if (task.type === 'order') {
			if (
				!Array.isArray(answer) ||
				answer.length > task.choices.length ||
				new Set(answer).size !== answer.length ||
				answer.some((id) => !task.choices.some((choice) => choice.id === id)) ||
				(complete && answer.length !== task.choices.length)
			)
				throw new TypeError('Sett alle kodeblokkene i rekkefølge før innlevering.');
		} else if (!task.choices.some((choice) => choice.id === answer))
			throw new TypeError('Velg en retting for hvert punkt før innlevering.');
	}
	return Object.fromEntries(Object.entries(answers).sort(([a], [b]) => a.localeCompare(b)));
}
const check = (name, passed, detail) => ({ name, passed, detail });
const expected = {
	field: null,
	validation: 'content',
	cookies: 'both',
	identity: 'session',
	startup: 'load',
	write: 'durable'
};
const lessons = {
	contract: { href: '/backend/', title: 'Frontend møter backend' },
	session: { href: '/sessions/', title: 'Sessions og pålogging' },
	ownership: { href: '/oving-9/', title: 'Eierskap og tilgang' },
	storage: { href: '/oving-5/', title: 'Trygg fillagring' }
};
const explanations = {
	contract:
		'Feltnavnet er en del av API-kontrakten. Gyldig tekst må nå riktig felt, og tom tekst må avvises før lagring.',
	session:
		'En cookie som finnes i nettleseren må også følge hver request. Backend bestemmer avsenderen fra sessionen, og gjester skal fortsatt avvises.',
	ownership:
		'Autentiser før oppslag, kontroller at meldingen finnes og at brukeren eier den, og slett først når kontrollene har godkjent handlingen.',
	storage:
		'Les eksisterende data ved oppstart. Lagre neste liste før aktivt minne endres og klienten får suksess. En skrivefeil skal bevare gamle data.'
};

export function gradeNightwatch(snapshot, answers) {
	const selected = Object.fromEntries(
		snapshot.incidents
			.flatMap((incident) => incident.tasks)
			.map((task) => [
				task.key,
				Array.isArray(answers[task.id])
					? answers[task.id].map((id) => task.values[id])
					: task.values[answers[task.id]]
			])
	);
	const contractWorks = selected.field === snapshot.field;
	const valid = contractWorks && !textError(' God morgen! ');
	const rejectsWhitespace = selected.validation === 'content';
	const deletion =
		Array.isArray(selected.deletion) && selected.deletion.length === 6
			? evaluateProgram('sletting', selected.deletion)
			: null;
	const checks = {
		contract: [
			check('Gyldig melding kommer fram', !!valid, 'Body må bruke samme felt som backend leser.'),
			check(
				'Tom tekst og feil type avvises',
				rejectsWhitespace,
				'At et felt finnes eller er truthy, er ikke nok til å godkjenne teksten.'
			)
		],
		session: [
			check(
				'POST har en gyldig session',
				['both', 'post'].includes(selected.cookies),
				'POST må sende session-cookien.'
			),
			check(
				'GET har en gyldig session',
				['both', 'get'].includes(selected.cookies),
				'GET er en egen forespørsel og må også sende cookien.'
			),
			check(
				'Avsender kan ikke forfalskes i body',
				selected.identity === 'session',
				'Brukeren hentes fra den serverkontrollerte sessionen.'
			)
		],
		ownership: deletion
			? deletion.results.map((item) =>
					check(
						casesFor('sletting').find((sample) => sample.id === item.caseId).name,
						item.passed,
						item.passed ? 'Status og data stemmer med tilgangskravet.' : item.expectedSummary
					)
				)
			: [
					check('Trygg slettingsrute', false, 'Alle seks blokkene må settes i en trygg rekkefølge.')
				],
		storage: [
			check(
				'Historikk overlever omstart',
				selected.startup === 'load',
				'Backend må lese den eksisterende filen.'
			),
			check(
				'201 bekrefter fullført lagring',
				selected.write === 'durable',
				'Suksessvaret skal vente til lagringen har lyktes.'
			),
			check(
				'Skrivefeil bevarer aktivt minne',
				selected.write === 'durable',
				'Bygg neste liste uten å endre den aktive listen først.'
			)
		]
	};
	return snapshot.incidents.map((incident) => ({
		id: incident.id,
		title: incident.title,
		checks: checks[incident.id],
		passed: checks[incident.id].every((item) => item.passed),
		explanation: explanations[incident.id],
		lesson: lessons[incident.id],
		solution: incident.tasks.map((task) => {
			if (task.type === 'order')
				return 'Krev innlogging → finn ID → krev funn → krev eierskap → slett ID → svar.';
			const value = task.key === 'field' ? snapshot.field : expected[task.key];
			return task.choices.find((choice) => task.values[choice.id] === value).code;
		})
	}));
}
