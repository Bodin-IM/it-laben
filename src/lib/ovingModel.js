/**
 * Rene, deterministiske undervisningsmodeller. Ingen nettverk, filsystem,
 * cookies eller ekte autentisering. Hvert forsøk starter med egne eksempeldata.
 * Trinnene eier snapshots, slik at Forrige/Neste aldri utfører handlingen på nytt.
 */
/** @typedef {{title:string, text:string, file:string, code:string[][], data:Record<string,unknown>, status:string}} Step */
/** @typedef {Record<string,string>} Values */
const jsonCopy = (/** @type {unknown} */ value) => JSON.parse(JSON.stringify(value));
const initialMessages = () => [
	{ id: 'm1', avsender: 'Ada', tekst: 'Hei!', opprettet: '2026-01-12T09:00:00.000Z' },
	{ id: 'm2', avsender: 'Noah', tekst: 'Hei!', opprettet: '2026-01-12T09:01:00.000Z' }
];
/** @param {Record<string,unknown>} initial */
function recorder(initial) {
	const data = jsonCopy(initial);
	/** @type {Step[]} */
	const steps = [];
	let status = 'Ingen svar ennå';
	/** @param {string} title @param {string} text @param {string} file @param {string[][]} code @param {Record<string,unknown>} [patch] @param {string} [response] */
	const add = (title, text, file, code, patch = {}, response) => {
		Object.assign(data, jsonCopy(patch));
		if (response !== undefined) status = response;
		steps.push({ title, text, file, code, data: jsonCopy(data), status });
	};
	return { steps, add };
}
/** @param {unknown} text */
export function textError(text) {
	if (typeof text !== 'string') return 'Teksten må være en streng.';
	if (!text.trim()) return 'Skriv en melding.';
	if (text.trim().length > 500) return 'Meldingen kan ha maks 500 tegn.';
	return '';
}

/** @param {Values} v */
function storage(v) {
	const old = initialMessages();
	const saving = ['save', 'fail'].includes(v.scenario);
	const raw =
		v.scenario === 'missing'
			? null
			: v.scenario === 'broken'
				? '[{ "tekst": "Hei!" }'
				: v.scenario === 'object'
					? '{ "tekst": "Hei!" }'
					: JSON.stringify(old, null, 2);
	const { steps, add } = recorder({
		'Minne · meldinger': saving ? old : null,
		'Disk · meldinger.json': raw,
		'Midlertidig fil': null
	});
	if (saving) {
		add(
			'Requesten kommer inn',
			'Eksempeldataene ligger allerede både i minnet og på disk. Vi utforsker lagringen etter at ruten har kontrollert teksten.',
			'server.js · POST /meldinger',
			[
				['const tekst = req.body?.tekst;', 'Les teksten fra JSON-body.'],
				['if (typeof tekst !== "string" || !tekst.trim()) {', 'Kontroller typen før trim kalles.'],
				[
					'  return res.status(400).json({ beskjed: "Skriv en melding." });',
					'return stopper ruten før noe lagres.'
				],
				['}', 'Slutten på valideringen.']
			],
			{ 'Request-body': { avsender: 'Ada', tekst: v.text } }
		);
		if (typeof v.text !== 'string' || !v.text.trim()) {
			add(
				'Ingen melding å lagre',
				'Valideringen avviser tom tekst. Minne og fil er uendret.',
				'server.js',
				[
					[
						'return res.status(400).json({ beskjed: "Skriv en melding." });',
						'En feil i input gir 400, ikke 500.'
					]
				],
				{},
				'400 Bad Request'
			);
			return steps;
		}
		const message = {
			id: 'm3',
			avsender: 'Ada',
			tekst: v.text.trim(),
			opprettet: '2026-01-12T09:02:00.000Z'
		};
		const next = [...old, message];
		add(
			'Lag en ny liste',
			'Den gamle listen endres ikke. Ny ID og tidspunkt er faste eksempelverdier i denne modellen.',
			'server.js',
			[
				[
					'const melding = { id: randomUUID(), avsender, tekst: tekst.trim(),',
					'Den ekte backend lager en ny ID. avsender er allerede validert.'
				],
				['  opprettet: new Date().toISOString() };', 'Tidspunktet lagres i UTC.'],
				[
					'const nyListe = [...meldinger, melding];',
					'Kopier listen og legg til meldingen uten å endre meldinger.'
				]
			],
			{ 'Arbeidskopi · nyListe': next }
		);
		add(
			'Gjør listen om til filtekst',
			'JSON.stringify lager tekst. Minne og den egentlige datafilen er fortsatt uendret.',
			'lagring.js · inne i lagreListe',
			[
				[
					'const fil = new URL(navn, mappe);',
					'navn kommer fra serverkoden, ikke fra brukerens request.'
				],
				[
					'const midlertidig = new URL(navn + ".tmp", mappe);',
					'Midlertidig fil ligger i samme mappe som datafilen.'
				],
				[
					'const tekst = JSON.stringify(liste, null, 2);',
					'2 gir lesbart innrykk. Listeobjektet blir JSON-tekst.'
				]
			],
			{ 'JSON-tekst til skriving': JSON.stringify(next, null, 2) }
		);
		if (v.scenario === 'fail') {
			add(
				'Skrivingen feiler',
				'Her simulerer vi at writeFileSync kaster en feil før den nye filen skrives. Ruten hopper til catch.',
				'lagring.js',
				[
					[
						'writeFileSync(midlertidig, tekst);',
						'Dette forsøket simulerer manglende skrivetilgang. Ingen vellykket skriving.'
					]
				]
			);
			add(
				'Svar med feil',
				'Den gamle listen blir stående. Serveren skal ikke bekrefte en melding som ikke er lagret.',
				'server.js · catch',
				[
					[
						'res.status(500).json({ beskjed: "Kunne ikke lagre." });',
						'Lagringsfeil på serveren gir 500. meldinger = nyListe ble ikke kjørt.'
					]
				],
				{},
				'500 Internal Server Error'
			);
		} else {
			add(
				'Skriv til den midlertidige filen',
				'Bare .tmp-filen inneholder den nye listen foreløpig.',
				'lagring.js',
				[
					[
						'writeFileSync(midlertidig, tekst);',
						'Node venter til filoperasjonen er ferdig. Den gamle meldinger.json er fortsatt urørt.'
					]
				],
				{ 'Midlertidig fil': JSON.stringify(next, null, 2) }
			);
			add(
				'Erstatt datafilen',
				'Nå ligger den nye listen i meldinger.json. Rename i samme filsystem gjør at leseren ser den gamle eller nye filen, ikke en halvskrevet JSON-fil.',
				'lagring.js',
				[
					[
						'renameSync(midlertidig, fil);',
						'Bytt den midlertidige filen inn som datafil. Dette er ikke en erstatning for backup eller en database.'
					]
				],
				{ 'Disk · meldinger.json': JSON.stringify(next, null, 2), 'Midlertidig fil': null }
			);
			add(
				'Oppdater minnet',
				'lagreListe har fullført. Først nå bytter vi listen som backend bruker.',
				'server.js · etter lagreListe',
				[['meldinger = nyListe;', 'Minnet tar i bruk den lagrede listen.']],
				{ 'Minne · meldinger': next }
			);
			add(
				'Bekreft lagringen',
				'Requesten får et 201-svar. En senere omstart kan lese meldingen fra filen.',
				'server.js',
				[['res.status(201).json(melding);', '201 betyr at ressursen er opprettet.']],
				{},
				'201 Created'
			);
		}
	} else {
		add(
			'Start med tomt minne',
			'En ny Node-prosess har ikke den gamle listen. Filen på disk er utgangspunktet.',
			'server.js',
			[
				[
					'let meldinger = lesListe("meldinger.json");',
					'Kallet skjer ved oppstart, før serveren begynner å svare.'
				]
			]
		);
		if (raw === null) {
			add(
				'Filen mangler',
				'readFileSync kaster ENOENT. Bare denne feilen skal gi en tom liste.',
				'lagring.js · catch',
				[
					[
						'if (feil.code === "ENOENT") return [];',
						'En helt ny app har kanskje ingen datafil ennå.'
					],
					['throw feil;', 'Andre feil sendes videre. Denne linjen nås ikke for ENOENT.']
				],
				{ 'Minne · meldinger': [] },
				'Oppstart OK · ingen HTTP-request'
			);
		} else {
			add(
				'Les filteksten',
				'readFileSync gir tekst. Ingen JavaScript-liste er laget ennå.',
				'lagring.js',
				[
					['const tekst = readFileSync(fil, "utf8");', 'utf8 gjør at filinnholdet leses som tekst.']
				],
				{ 'Lest filtekst': raw }
			);
			if (v.scenario === 'broken') {
				add(
					'JSON.parse stopper oppstarten',
					'JSON mangler en avsluttende hakeparentes. Feilen skal undersøkes; den gamle filen beholdes.',
					'lagring.js',
					[
						['const liste = JSON.parse(tekst);', 'Ugyldig JSON kaster SyntaxError.'],
						['throw feil;', 'catch sender feilen videre fordi dette ikke er ENOENT.']
					],
					{},
					'Oppstart feilet · SyntaxError'
				);
			} else if (v.scenario === 'object') {
				add(
					'Gyldig JSON, feil datatype',
					'Objektet kan parses, men appen trenger en liste. Oppstarten stopper før meldinger får en verdi.',
					'lagring.js',
					[
						['const liste = JSON.parse(tekst);', 'Et objekt er gyldig JSON.'],
						[
							'if (!Array.isArray(liste)) throw new Error("Forventet en liste");',
							'Sjekk formen før resten av appen tar dataene i bruk.'
						]
					],
					{},
					'Oppstart feilet · forventet liste'
				);
			} else {
				add(
					'Les listen inn i minnet',
					'Dataene overlever omstart fordi de ligger i filen. Oppstarten oppretter ingen HTTP-response.',
					'lagring.js',
					[
						['const liste = JSON.parse(tekst);', 'Gjør JSON-tekst om til JavaScript-data.'],
						[
							'if (!Array.isArray(liste)) throw new Error("Forventet en liste");',
							'Godta bare en liste.'
						],
						['return liste;', 'Listen blir verdien til meldinger i server.js.']
					],
					{ 'Minne · meldinger': old },
					'Oppstart OK · ingen HTTP-request'
				);
			}
		}
	}
	return steps;
}

/** @param {Values} v */
function crud(v) {
	const old = initialMessages();
	const method = v.method === 'DELETE' ? 'DELETE' : 'PATCH';
	const message = old.find((m) => m.id === v.id);
	const { steps, add } = recorder({
		'Minne · meldinger': old,
		'Disk · meldinger.json': old,
		'Nettleserens liste': old
	});
	add(
		'Send en request med ID',
		'To meldinger har lik tekst. ID-en i adressen avgjør hvilken du jobber med.',
		'Frontend · fetch',
		[
			[
				'const svar = await fetch(API + "/meldinger/" + id, {',
				'id kommer fra meldingen eleven valgte.'
			],
			['  method: "' + method + '",', 'PATCH endrer teksten. DELETE fjerner meldingen.'],
			...(method === 'PATCH'
				? [
						['  headers: { "Content-Type": "application/json" },', 'Fortell at body er JSON.'],
						['  body: JSON.stringify({ tekst: nyTekst })', 'Send den nye teksten.']
					]
				: []),
			['});', 'Vent på svaret fra backend.']
		],
		{
			Request: {
				method,
				path: '/meldinger/' + v.id,
				...(method === 'PATCH' ? { body: { tekst: v.text } } : {})
			}
		}
	);
	add(
		'Finn riktig ID',
		'Serveren søker etter ID, ikke etter tekst eller plass i arrayet.',
		'server.js · ruten',
		[
			[
				method === 'PATCH'
					? 'const melding = meldinger.find(m => m.id === req.params.id);'
					: 'const finnes = meldinger.some(m => m.id === req.params.id);',
				method === 'PATCH' ? 'find gir objektet eller undefined.' : 'some gir true eller false.'
			],
			[
				method === 'PATCH'
					? 'if (!melding) return res.status(404).json({ beskjed: "Fant ikke meldingen." });'
					: 'if (!finnes) return res.status(404).json({ beskjed: "Fant ikke meldingen." });',
				'En ukjent ID stopper requesten før lagring.'
			]
		],
		{ 'Funnet melding': message ?? null },
		message ? undefined : '404 Not Found'
	);
	if (!message) return steps;
	if (method === 'PATCH') {
		const valid = typeof v.text === 'string' && v.text.trim();
		add(
			'Kontroller teksten',
			'Øving 6 sjekker streng og tom tekst. Lengdegrensen kommer i øving 7.',
			'server.js',
			[
				['const tekst = req.body?.tekst;', 'Les tekst fra body.'],
				['if (typeof tekst !== "string" || !tekst.trim()) {', 'Typen sjekkes før trim.'],
				[
					'  return res.status(400).json({ beskjed: "Skriv en melding." });',
					'Avvis uten å endre data.'
				],
				['}', 'Fortsett bare når teksten er gyldig.']
			],
			{},
			valid ? undefined : '400 Bad Request'
		);
		if (!valid) return steps;
	}
	const changed = { ...message, tekst: v.text?.trim() };
	const next =
		method === 'DELETE'
			? old.filter((m) => m.id !== v.id)
			: old.map((m) => (m.id === v.id ? changed : m));
	add(
		'Lag en ny liste',
		method === 'PATCH'
			? 'ID, avsender og opprettet beholdes. Bare teksten erstattes.'
			: 'Listen inneholder alle meldingene unntatt den valgte ID-en.',
		'server.js',
		method === 'PATCH'
			? [
					[
						'const endret = { ...melding, tekst: tekst.trim() };',
						'Kopier objektet og erstatt tekst.'
					],
					[
						'const nyListe = meldinger.map(m => m.id === req.params.id ? endret : m);',
						'map returnerer en ny liste.'
					]
				]
			: [
					[
						'const nyListe = meldinger.filter(m => m.id !== req.params.id);',
						'Behold alle som ikke har ID-en.'
					]
				],
		{ 'Arbeidskopi · nyListe': next }
	);
	if (v.disk === 'fail') {
		add(
			'Lagringen feiler',
			'Den nye listen tas aldri i bruk. Både frontend, minne og fil beholder de gamle dataene.',
			'server.js · catch',
			[
				[
					'res.status(500).json({ beskjed: "Kunne ikke lagre." });',
					'catch svarer med en feil. Ingen vellykket lagring skal vises i frontend.'
				]
			],
			{},
			'500 Internal Server Error'
		);
		return steps;
	}
	add(
		'Lagre før minnet oppdateres',
		'lagreListe fullfører filbyttet fra øving 5. Nettleseren har fortsatt sin gamle liste.',
		'server.js',
		[
			[
				'lagreListe("meldinger.json", nyListe);',
				'Hvis dette kaster en feil, kjøres ingen av de neste linjene i try.'
			]
		],
		{ 'Disk · meldinger.json': next }
	);
	add(
		'Ta i bruk listen og svar',
		'Backend har nå de nye dataene. Et 200-svar endrer ikke automatisk listen i Svelte.',
		'server.js',
		[
			['meldinger = nyListe;', 'Oppdater minnet etter lagringen.'],
			[
				method === 'PATCH'
					? 'res.json({ beskjed: "Meldingen er endret.", melding: endret });'
					: 'res.json({ beskjed: "Meldingen er slettet." });',
				'res.json bruker status 200 hvis ingen annen status er satt.'
			]
		],
		{ 'Minne · meldinger': next },
		'200 OK'
	);
	add(
		'Hent listen på nytt',
		'Nå viser frontend samme liste som backend. Det er en ny GET-request.',
		'Frontend · etter fetch',
		[
			['const data = await svar.json();', 'Les responsens JSON én gang.'],
			[
				'if (!svar.ok) throw new Error(data.beskjed);',
				'Gå til catch hvis PATCH eller DELETE feilet.'
			],
			[
				'await hentMeldinger();',
				'Denne funksjonen sender GET /meldinger og oppdaterer Svelte-listen.'
			]
		],
		{ 'Nettleserens liste': next },
		'200 OK · deretter GET 200'
	);
	return steps;
}

/** Interpret the completed trace, not current form fields or a guessed success state.
 * @param {Step[]} trace
 * @returns {{result:string,cause:string,next:string}|null}
 */
export function validationFeedback(trace) {
	const last = trace.at(-1);
	if (!last) return null;
	if (last.status.startsWith('201')) return {
		result: 'Meldingen ble lagret, og backend svarte 201.',
		cause: 'Verdiene ble kontrollert før filen og minnet ble oppdatert.',
		next: 'Prøv samme rute med bare mellomrom. Undersøk at den avvises uten å endre listen.'
	};
	if (last.status.startsWith('400')) {
		const error = last.data.Validering;
		const empty = error === 'Skriv en melding.';
		return {
			result: 'Requesten ble avvist med 400. Minnet og filen er uendret.',
			cause: empty
				? `Teksten hadde ${last.data['Tekstlengde før trim']} tegn før trim og 0 etterpå. return stoppet ruten før lagring.`
				: typeof error === 'string'
					? `${error} Valideringen stoppet requesten før lagring.`
					: 'JSON-parseren kunne ikke lese innholdet. Selve ruten ble ikke kjørt.',
			next: empty ? 'Prøv en vanlig melding med samme kontroll, og sammenlign svar og data.'
				: typeof error === 'string' ? 'Rett verdien som ble avvist, og prøv igjen. Undersøk også grensen eller datatypen som utløste feilen.'
					: 'Rett JSON-formatet først. Undersøk deretter hva som skjer med gyldig JSON og en ugyldig verdi.'
		};
	}
	if (last.status.startsWith('413')) return {
		result: 'Backend svarte 413. Ingen melding ble lagret.',
		cause: 'Requesten oversteg parserens grense på 10 kB og nådde ikke valideringen i ruten.',
		next: 'Prøv 501 tegn. Hvorfor gir en for lang melding nå 400 i stedet for 413?'
	};
	if (last.status.startsWith('500')) return {
		result: 'Backend svarte 500. Den gamle listen ble beholdt.',
		cause: 'Input var gyldig, men filen kunne ikke lagres. Minnet ble derfor ikke byttet ut.',
		next: 'Sammenlign med vanlig sending. Finn linjen som bekrefter lagring, og forklar hvorfor den ikke skal kjøres ved feil.'
	};
	if (last.status.startsWith('404')) return {
		result: 'Backend svarte 404. Ingen melding ble lagret.',
		cause: 'Ingen av rutene passet med request-adressen.',
		next: 'Sammenlign adressen i fetch med adressen backend lytter på, og prøv den riktige ruten.'
	};
	return {
		result: 'Frontend fikk ikke et HTTP-svar. Ingen melding ble lagret.',
		cause: 'Backend var avslått i dette forsøket. fetch ble avvist og catch tok over.',
		next: 'Sammenlign med tom tekst mot en kjørende backend. Hvorfor kan svar.ok sjekkes i det forsøket?'
	};
}

/** @param {Values} v */
function validation(v) {
	let raw = v.scenario === 'custom' ? v.body : '{"avsender":"Ada","tekst":"Hei fra laben!"}';
	if (v.scenario === 'empty') raw = '{"avsender":"Ada","tekst":"   "}';
	if (v.scenario === 'blank') raw = '{"avsender":"Ada","tekst":""}';
	if (v.scenario === 'number') raw = '{"avsender":"Ada","tekst":123}';
	if (['500', '501', 'large'].includes(v.scenario))
		raw = JSON.stringify({
			avsender: 'Ada',
			tekst: 'a'.repeat(v.scenario === 'large' ? 11000 : Number(v.scenario))
		});
	if (v.scenario === 'malformed') raw = '{ "avsender": "Ada", "tekst": "Hei!"';
	const old = initialMessages();
	const { steps, add } = recorder({
		'Minne · meldinger': old,
		'Disk · meldinger.json': old,
		'Request-body': raw
	});
	add(
		'Frontend sender requesten',
		'Hvert forsøk starter med samme meldingsliste. Vi følger hvor requesten stopper.',
		'Frontend',
		[
			[
				'const svar = await fetch(API + "/meldinger", options);',
				'options inneholder POST, Content-Type og JSON-body. fetch kan gi et HTTP-feilsvar uten å kaste.'
			]
		]
	);
	if (v.scenario === 'offline') {
		add(
			'Ingen HTTP-response',
			'Backend er avslått i dette forsøket. Nettverksfeilen håndteres av catch; svar.ok kan ikke sjekkes.',
			'Frontend · catch',
			[
				[
					'status = "Kunne ikke kontakte serveren.";',
					'Vis en nettverksfeil. Behold teksten slik at eleven kan prøve igjen.'
				]
			],
			{},
			'Nettverksfeil · ingen HTTP-status'
		);
		return steps;
	}
	/** @type {any} */ let body;
	let parserError = '';
	if (new TextEncoder().encode(raw).length > 10240) parserError = 'entity.too.large';
	else {
		try {
			// express.json/body-parser treats an empty JSON body as {}.
			body = raw.length === 0 ? {} : JSON.parse(raw);
			if (body === null || typeof body !== 'object') parserError = 'entity.parse.failed';
		} catch {
			parserError = 'entity.parse.failed';
		}
	}
	add(
		'Express leser JSON før ruten',
		'Parseren har en grense på 10 kB. Ugyldig eller for stor JSON går til feilmiddleware før rutekoden.',
		'server.js · før rutene',
		[
			[
				'app.use(express.json({ limit: "10kb" }));',
				'Middleware kjører i registrert rekkefølge. Standard strict-modus godtar objekter og lister.'
			]
		],
		{ 'req.body': parserError ? 'Ikke tilgjengelig' : body }
	);
	if (parserError) {
		const large = parserError === 'entity.too.large';
		add(
			'Feilmiddleware svarer',
			large
				? 'Body er større enn 10 kB. Ingen rutekode eller lagring kjøres.'
				: 'JSON kan ikke parses. Ruten kjører aldri, og dataene forblir uendret.',
			'server.js · etter rutene',
			[
				[
					'app.use((feil, req, res, next) => {',
					'Fire parametere gjør dette til Express-feilmiddleware.'
				],
				['  if (feil.type === "' + parserError + '") {', 'Sjekk feiltypen fra parseren.'],
				[
					'    return res.status(' +
						(large ? 413 : 400) +
						').json({ beskjed: "' +
						(large ? 'For mye data.' : 'Ugyldig JSON.') +
						'" });',
					'Send en forståelig beskjed til frontend.'
				],
				['  }', 'Andre feil håndteres videre i samme middleware.'],
				['});', 'Registrer dette etter rutene og 404-håndteringen.']
			],
			{},
			large ? '413 Content Too Large' : '400 Bad Request'
		);
	} else if (v.scenario === 'route') {
		add(
			'Ingen rute passer',
			'I dette forsøket sendes requesten til /finnes-ikke. 404-fallbacken ligger etter alle API-rutene.',
			'server.js',
			[
				['app.use((req, res) => {', 'Nås bare hvis ingen tidligere rute har svart.'],
				['  res.status(404).json({ beskjed: "Fant ikke ruten." });', 'En ukjent URL gir 404.'],
				['});', 'Vanlig middleware trenger ikke fire parametere.']
			],
			{ 'Request-adresse': '/finnes-ikke' },
			'404 Not Found'
		);
	} else {
		const avsender = body?.avsender;
		const nameError =
			typeof avsender !== 'string' || !avsender.trim() || avsender.trim().length > 40;
		const error = nameError ? 'Avsender må ha 1–40 tegn.' : textError(body?.tekst);
		add(
			'Kontroller verdiene',
			'Gyldig JSON kan fortsatt inneholde ugyldige verdier. POST sjekker avsender; POST og PATCH bruker samme tekstFeil.',
			'server.js · tekstFeil og POST',
			[
				[
					'if (typeof tekst !== "string") return "Teksten må være en streng.";',
					'Stopp før trim hvis tekst ikke er en streng.'
				],
				['if (!tekst.trim()) return "Skriv en melding.";', 'Bare mellomrom regnes som tom tekst.'],
				[
					'if (tekst.trim().length > 500) return "Maks 500 tegn.";',
					'Mål teksten etter trim. length teller UTF-16-kodeenheter.'
				],
				['return "";', 'Tom feiltekst betyr at valideringen godtar verdien.']
			],
			{
				Validering: error || 'Godkjent',
				'Tekstlengde før trim': typeof body?.tekst === 'string' ? body.tekst.length : 'Ikke en streng',
				'Tekstlengde etter trim':
					typeof body?.tekst === 'string' ? body.tekst.trim().length : 'Ikke en streng'
			}
		);
		if (error) {
			add(
				'Avvis før lagring',
				'Feil input gir 400. Minnet og filen er uendret.',
				'server.js · POST',
				[
					[
						'if (beskjed) return res.status(400).json({ beskjed });',
						'return gjør at koden som lager og lagrer meldingen hoppes over.'
					]
				],
				{},
				'400 Bad Request'
			);
		} else if (v.scenario === 'disk') {
			add(
				'Send lagringsfeilen videre',
				'Input var gyldig, men lagreListe kastet en feil. Ingen ny liste tas i bruk.',
				'server.js · catch',
				[
					['next(feil);', 'Gi feilen til felles feilmiddleware.'],
					['// I feilmiddleware:', 'Utdrag fra den generelle feilgrenen.'],
					['console.error(feil);', 'Detaljene hører hjemme i serverloggen.'],
					[
						'res.status(500).json({ beskjed: "Noe gikk galt på serveren." });',
						'Ikke send interne filstier eller stack trace til brukeren.'
					]
				],
				{},
				'500 Internal Server Error'
			);
		} else {
			const next = [
				...old,
				{
					id: 'm3',
					avsender: avsender.trim(),
					tekst: body.tekst.trim(),
					opprettet: '2026-01-12T09:02:00.000Z'
				}
			];
			add(
				'Lagre den gyldige meldingen',
				'Alle kontrollene er bestått. Filen lagres før minnet byttes og 201 sendes.',
				'server.js',
				[
					['lagreListe("meldinger.json", nyListe);', 'nyListe inneholder den validerte meldingen.'],
					['meldinger = nyListe;', 'Minnet oppdateres bare etter vellykket lagring.'],
					['res.status(201).json(melding);', 'Bekreft opprettingen.']
				],
				{ 'Minne · meldinger': next, 'Disk · meldinger.json': next },
				'201 Created'
			);
		}
	}
	add(
		'Frontend sjekker svaret',
		'Alle disse HTTP-svarene kom fram. Ved en feil beholdes input; bare en vellykket sending tømmer feltet.',
		'Frontend · inne i try',
		[
			[
				'const data = await svar.json();',
				'Les responsen én gang, også når status er 400, 413 eller 500.'
			],
			['if (!svar.ok) throw new Error(data.beskjed);', 'Kast en feil til catch ved HTTP-feil.'],
			['nyTekst = "";', 'Denne linjen kjøres bare ved et vellykket svar.']
		]
	);
	return steps;
}

/** @param {Values} v */
function registration(v) {
	const username = ['register', 'duplicate'].includes(v.scenario)
		? (v.username ?? '').trim().toLowerCase()
		: 'ada';
	const user = {
		id: 'u1',
		brukernavn: username || 'ada',
		passordHash: '[bcrypt-hash · symbol i modellen]'
	};
	const registered = v.scenario !== 'register';
	const loggedIn = ['meg', 'nocookie', 'logout', 'restart'].includes(v.scenario);
	const { steps, add } = recorder({
		'Disk · brukere.json': registered ? [user] : [],
		Sessionlager: loggedIn ? { 'sid-demo': { brukerId: 'u1' } } : {},
		'Nettleserens cookie': loggedIn ? 'backend.sid=sid-demo' : null
	});
	if (['register', 'duplicate'].includes(v.scenario)) {
		add(
			'Kontroller registreringen',
			'Brukernavnet normaliseres. Passordet skal ikke trimmes. Denne siden bruker bare eksempler og utfører ingen ekte hashing.',
			'server.js · POST /registrer',
			[
				[
					'const brukernavn = req.body.brukernavn.trim().toLowerCase();',
					'Koden forutsetter at typen allerede er kontrollert. Navnet skal ha 3–20 tegn: bokstaver a–z, tall eller _.'
				],
				[
					'if (!/^[a-z0-9_]{3,20}$/.test(brukernavn)) { /* svar 400 */ }',
					'Navnet normaliseres før kontroll og oppslag.'
				],
				[
					'if (passord.length < 12 || Buffer.byteLength(passord, "utf8") > 72) { /* svar 400 */ }',
					'Minst 12 tegn og maks 72 UTF-8-byte. Tegn og byte er ikke det samme.'
				]
			],
			{
				Kontroll: {
					brukernavn: username,
					passordlengde: v.password.length,
					passordbyte: new TextEncoder().encode(v.password).length
				}
			}
		);
		if (
			!/^[a-z0-9_]{3,20}$/.test(username) ||
			v.password.length < 12 ||
			new TextEncoder().encode(v.password).length > 72
		) {
			add(
				'Registrering avvist',
				'Brukernavn eller passordlengde er ugyldig. Ingen bruker eller session opprettes.',
				'server.js',
				[
					[
						'return res.status(400).json({ beskjed: "Kontroller brukernavn og passord." });',
						'Validering skjer før hashing og lagring.'
					]
				],
				{},
				'400 Bad Request'
			);
			return steps;
		}
		add(
			'Sjekk om navnet er opptatt',
			'Vi sammenligner med den normaliserte verdien, slik at Ada og ada ikke blir to kontoer.',
			'server.js',
			[
				[
					'const finnes = brukere.some(b => b.brukernavn === brukernavn);',
					'Søk etter det normaliserte navnet.'
				],
				[
					'if (finnes) return res.status(409).json({ beskjed: "Navnet er opptatt." });',
					'409 betyr konflikt med en eksisterende ressurs.'
				]
			],
			{},
			v.scenario === 'duplicate' ? '409 Conflict' : undefined
		);
		if (v.scenario === 'duplicate') return steps;
		add(
			'Lag en passordhash',
			'I den ekte backend lager bcryptjs en saltet hash. Hashen er et symbol her, og passordet lagres ikke i modellen.',
			'server.js',
			[
				[
					'const passordHash = bcrypt.hashSync(passord, 12);',
					'bcrypt lager salt og hash. 12 er kostfaktoren.'
				],
				[
					'const bruker = { id: randomUUID(), brukernavn, passordHash };',
					'Lagre aldri passordet i klartekst.'
				]
			],
			{ 'Ny bruker, ennå ikke lagret': user }
		);
		add(
			'Lagre brukeren',
			'Filen skrives før listen i minnet byttes. Ingen session opprettes av registreringsruten.',
			'server.js',
			[
				['const nyListe = [...brukere, bruker];', 'Lag en ny liste.'],
				['lagreListe("brukere.json", nyListe);', 'Samme lagringsfunksjon som i øving 5.'],
				['brukere = nyListe;', 'Bytt minnet etter vellykket lagring.'],
				[
					'res.status(201).json({ beskjed: "Brukeren er opprettet." });',
					'Returner aldri passordHash til frontend.'
				]
			],
			{ 'Disk · brukere.json': [user] },
			'201 Created · fortsatt ikke innlogget'
		);
	} else if (['login', 'wrong'].includes(v.scenario)) {
		add(
			'Send navn og passord',
			'Frontend sender eksempelverdiene til innloggingsruten. I en ekte app må passordet beskyttes med HTTPS utenfor det lokale testoppsettet.',
			'Frontend · POST /logginn',
			[
				[
					'const svar = await fetch(API + "/logginn", {',
					'Innlogging er en egen request etter registreringen.'
				],
				[
					'  method: "POST", credentials: "include",',
					'La nettleseren ta imot session-cookien ved ulike origins.'
				],
				['  headers: { "Content-Type": "application/json" },', 'Body er JSON.'],
				[
					'  body: JSON.stringify({ brukernavn, passord })',
					'Passordet brukes til kontroll, men skal ikke logges eller returneres.'
				],
				['});', 'Vent på resultatet fra backend.']
			]
		);
		add(
			'Kontroller identiteten',
			'Dette forsøket starter med én registrert eksempelbruker. Valget «riktig» eller «feil» passord bestemmer det simulerte bcrypt-resultatet.',
			'server.js · POST /logginn',
			[
				[
					'const bruker = brukere.find(b => b.brukernavn === brukernavn);',
					'Slå opp brukeren etter at input er validert.'
				],
				[
					'if (!bruker || !bcrypt.compareSync(passord, bruker.passordHash)) {',
					'bcrypt kontrollerer passordet mot den lagrede hashen.'
				],
				[
					'  return res.status(401).json({ beskjed: "Feil brukernavn eller passord." });',
					'Samme beskjed ved ukjent navn og feil passord.'
				],
				['}', 'Fortsett bare ved vellykket kontroll.']
			],
			{ 'Simulert passordkontroll': v.scenario === 'login' ? 'Godkjent' : 'Avvist' },
			v.scenario === 'wrong' ? '401 Unauthorized' : undefined
		);
		if (v.scenario === 'wrong') return steps;
		add(
			'Opprett en ny session',
			'Etter godkjent passord regenereres sessionen. Identiteten lagres som brukerId.',
			'server.js · inne i /logginn',
			[
				['req.session.regenerate((feil) => {', 'Lag en ny session-ID etter innlogging.'],
				['  if (feil) return next(feil);', 'Avbryt hvis sessionen ikke kan opprettes.'],
				[
					'  req.session.brukerId = bruker.id;',
					'Bruker-ID ligger på serveren. Ikke legg passordet i sessionen.'
				],
				['  // save og svar følger i callbacken', 'Neste steg fortsetter her.'],
				['});', 'regenerate er asynkron og tar en callback.']
			],
			{ 'Session under oppretting': { brukerId: 'u1' } }
		);
		add(
			'Lagre sessionen og send cookie',
			'session-middleware sender Set-Cookie når svaret sendes. Cookieverdien er signert i det ekte oppsettet; sid-demo er bare et symbol.',
			'server.js · inne i regenerate-callbacken',
			[
				['req.session.save((feil) => {', 'Vent på at sessionen er lagret.'],
				['  if (feil) return next(feil);', 'Ikke svar med suksess ved lagringsfeil.'],
				[
					'  res.json({ beskjed: "Du er logget inn." });',
					'Middleware sender cookie-headeren sammen med svaret.'
				],
				['});', 'Fullfør callbacken.']
			],
			{
				Sessionlager: { 'sid-demo': { brukerId: 'u1' } },
				'Nettleserens cookie': 'backend.sid=sid-demo',
				'Session under oppretting': 'Ferdig lagret'
			},
			'200 OK'
		);
		add(
			'Hent innlogget bruker',
			'Frontend bruker credentials: include på alle innloggingsrelaterte fetch-kall og henter /meg etter innlogging.',
			'Frontend',
			[
				[
					'const svar = await fetch(API + "/meg", { credentials: "include" });',
					'Ved ulike origins kreves også CORS med riktig origin og credentials: true.'
				],
				[
					'if (svar.status === 401) { meg = null; return; }',
					'Ingen innlogget bruker er en forventet tilstand.'
				],
				['if (!svar.ok) throw new Error("Kunne ikke hente bruker");', 'Håndter andre HTTP-feil.'],
				['meg = await svar.json();', '/meg gir bare id og brukernavn, aldri passordHash.']
			],
			{ 'Frontend · meg': { id: 'u1', brukernavn: user.brukernavn } },
			'GET /meg · 200 OK'
		);
	} else {
		add(
			'Start med en innlogget bruker',
			'En bruker ligger på disk, en session ligger i minnet, og nettleseren har en cookie. Dette er faste startdata for forsøket.',
			'server.js · session-oppsett',
			[
				[
					'app.use(session({ name: "backend.sid", secret: process.env.SESSION_SECRET,',
					'Secret kommer fra miljøet, ikke fra kildekoden. Resten av oppsettet følger nedenfor.'
				],
				[
					'  resave: false, saveUninitialized: false,',
					'Ikke lagre uendret eller ubrukt session unødvendig.'
				],
				[
					'  cookie: { httpOnly: true, sameSite: "lax", secure: false }',
					'secure: false gjelder lokal HTTP i øvelsen. HTTPS krever riktig cookie- og proxyoppsett.'
				],
				['}));', 'Standardlageret er i minnet og er ikke egnet som permanent produksjonslager.']
			]
		);
		if (v.scenario === 'logout') {
			add(
				'Fjern sessionen og cookien',
				'Serveren ødelegger sessionen. Svaret ber nettleseren fjerne den matchende cookien.',
				'server.js · POST /loggut',
				[
					['req.session.destroy((feil) => {', 'Fjern sessionen fra lageret.'],
					['  if (feil) return next(feil);', 'Ikke bekreft før operasjonen har lyktes.'],
					[
						'  res.clearCookie("backend.sid", cookieOptions);',
						'Bruk samme cookie-innstillinger, uten maxAge eller expires.'
					],
					[
						'  res.json({ beskjed: "Du er logget ut." });',
						'Øvingsarket bruker 200 og JSON i denne ruten.'
					],
					['});', 'Frontend kan deretter spørre /meg på nytt.']
				],
				{ Sessionlager: {}, 'Nettleserens cookie': null },
				'POST /loggut · 200 OK'
			);
		} else if (v.scenario === 'restart') {
			add(
				'Prosessen starter på nytt',
				'Brukerfilen bevares. Sessionlageret i minnet blir tomt, mens nettleseren fortsatt kan ha den gamle cookien.',
				'server.js · ved oppstart',
				[
					['let brukere = lesListe("brukere.json");', 'Brukere og passordhash lastes fra disk.'],
					[
						'// express-session starter med et nytt minnelager',
						'Den gamle sessionen ble ikke lagret i brukere.json.'
					]
				],
				{ Sessionlager: {} }
			);
		}
		const allowed = v.scenario === 'meg';
		add(
			'Nettleseren spør /meg',
			v.scenario === 'nocookie'
				? 'Cookien finnes lokalt, men sendes ikke i denne requesten mellom ulike origins.'
				: 'Nettleseren sender sin cookie hvis den har en, og cookie-reglene tillater det.',
			'Frontend',
			[
				[
					'const svar = await fetch(API + "/meg", {',
					'Spør serveren hvem den gjenkjenner i denne requesten.'
				],
				[
					'  credentials: "' + (v.scenario === 'nocookie' ? 'same-origin' : 'include') + '"',
					'include er nødvendig i øvelsens frontend/backend-oppsett med ulike origins. Det overstyrer ikke andre cookie-regler.'
				],
				['});', 'Dette endrer ikke i seg selv eksisterende sessioner.']
			],
			{
				'Cookie i denne requesten': ['nocookie', 'logout'].includes(v.scenario)
					? null
					: 'backend.sid=sid-demo'
			}
		);
		add(
			allowed ? 'Serveren finner brukeren' : 'Ingen innlogget bruker',
			allowed
				? 'Sessionen peker til brukeren. Bare offentlige brukerfelt sendes tilbake.'
				: 'Ingen gyldig brukerId finnes via denne requestens session. /meg svarer 401.',
			'server.js · GET /meg',
			[
				[
					'const bruker = brukere.find(b => b.id === req.session.brukerId);',
					'Session-middleware har gjort oppslaget før ruten kjører.'
				],
				[
					'if (!bruker) return res.status(401).json({ beskjed: "Ikke logget inn." });',
					'En cookie alene er ikke bevis på en gyldig session.'
				],
				['res.json({ id: bruker.id, brukernavn: bruker.brukernavn });', 'Send aldri passordHash.']
			],
			{ 'Frontend · meg': allowed ? { id: 'u1', brukernavn: user.brukernavn } : null },
			allowed ? '200 OK' : '401 Unauthorized'
		);
	}
	return steps;
}

/** @param {Values} v */
function access(v) {
	const old = initialMessages().map((m, i) => ({ ...m, eierId: i === 0 ? 'ada' : 'noah' }));
	const actor =
		v.actor === 'guest' ? null : { id: v.actor, brukernavn: v.actor === 'ada' ? 'Ada' : 'Noah' };
	const method = v.method;
	const body = {
		tekst: v.text,
		...(v.forge === 'yes' ? { eierId: 'noah', avsender: 'Noah' } : {})
	};
	const { steps, add } = recorder({
		'Minne · meldinger': old,
		'Disk · meldinger.json': old,
		Session: actor ? { brukerId: actor.id } : null
	});
	add(
		'Send requesten direkte',
		'Vi sender til backend uten å bruke en skjult eller synlig redigeringsknapp. Backend må ta den samme avgjørelsen uansett.',
		'HTTP-request',
		[
			[
				method + ' /meldinger' + (['PATCH', 'DELETE'].includes(method) ? '/' + v.id : ''),
				'Metode og adresse bestemmer ruten. Dette er en requestlinje, ikke JavaScript.'
			],
			[
				'// Session: ' + (actor ? actor.brukernavn : 'ingen innlogging'),
				'I ekte HTTP sendes session-ID i en cookie, ikke dette kommentarfeltet.'
			]
		],
		{ 'Request-body': ['POST', 'PATCH'].includes(method) ? body : 'Ingen body' }
	);
	if (method === 'GET') {
		add(
			'Alle får lese',
			'GET /meldinger har ikke krevInnlogging. Både gjester og innloggede brukere får listen.',
			'server.js',
			[
				[
					'app.get("/meldinger", (req, res) => res.json(meldinger));',
					'Tilgangsreglene i denne øvelsen tillater offentlig lesing.'
				]
			],
			{},
			'200 OK'
		);
		return steps;
	}
	add(
		'Krev innlogging',
		'Middleware slår opp brukeren via sessionen. Det er ikke nok å sende et brukernavn i body.',
		'server.js · krevInnlogging',
		[
			[
				'const bruker = brukere.find(b => b.id === req.session.brukerId);',
				'Identiteten kommer fra serverens session.'
			],
			[
				'if (!bruker) return res.status(401).json({ beskjed: "Logg inn først." });',
				'return stopper gjesten her.'
			],
			['req.bruker = bruker;', 'Gjør den verifiserte brukeren tilgjengelig for ruten.'],
			['next();', 'Fortsett til ruten bare når en bruker ble funnet.']
		],
		{ 'req.bruker': actor },
		actor ? undefined : '401 Unauthorized'
	);
	if (!actor) return steps;
	const message = old.find((m) => m.id === v.id);
	if (method !== 'POST') {
		add(
			'Finn meldingen',
			'Innloggingen er godkjent. Nå leter ruten etter meldingen med ID-en i adressen.',
			'server.js · etter krevInnlogging',
			[
				[
					'const melding = meldinger.find(m => m.id === req.params.id);',
					'ID er stabil selv om teksten endres.'
				],
				[
					'if (!melding) return res.status(404).json({ beskjed: "Fant ikke meldingen." });',
					'En manglende melding gir 404 før eiersjekken.'
				]
			],
			{ 'Funnet melding': message ?? null },
			message ? undefined : '404 Not Found'
		);
		if (!message) return steps;
		const owner = message.eierId === actor.id;
		add(
			'Sammenlign eier med innlogget bruker',
			owner
				? 'ID-ene er like. Brukeren får fortsette.'
				: 'Brukeren er innlogget, men eier ikke meldingen. Requesten stopper før lagring.',
			'server.js',
			[
				[
					'if (melding.eierId !== req.bruker.id) {',
					'Sammenlign lagret eierId med identiteten fra sessionen.'
				],
				[
					'  return res.status(403).json({ beskjed: "Dette er ikke din melding." });',
					'En falsk eierId i body påvirker ikke denne sammenligningen.'
				],
				['}', 'Fortsett bare for eieren.']
			],
			{ Eiersjekk: { eierId: message.eierId, brukerId: actor.id, godkjent: owner } },
			owner ? undefined : '403 Forbidden'
		);
		if (!owner) return steps;
	}
	if (method !== 'DELETE' && textError(v.text)) {
		add(
			'Avvis ugyldig tekst',
			'Tilgangen var i orden, men teksten må fortsatt valideres. Ingen data endres.',
			'server.js',
			[
				['const beskjed = tekstFeil(req.body?.tekst);', 'Samme valideringsfunksjon som i øving 7.'],
				[
					'if (beskjed) return res.status(400).json({ beskjed });',
					'Tilgang er ikke det samme som gyldig input.'
				]
			],
			{},
			'400 Bad Request'
		);
		return steps;
	}
	const next =
		method === 'POST'
			? [
					...old,
					{
						id: 'm3',
						avsender: actor.brukernavn,
						eierId: actor.id,
						tekst: v.text.trim(),
						opprettet: '2026-01-12T09:02:00.000Z'
					}
				]
			: method === 'DELETE'
				? old.filter((m) => m.id !== v.id)
				: old.map((m) => (m.id === v.id ? { ...m, tekst: v.text.trim() } : m));
	add(
		'Lag den tillatte endringen',
		method === 'POST'
			? 'Backend velger eier og avsender. Verdier klienten sender i disse feltene ignoreres.'
			: 'Alle tilgangskontrollene er passert. Først nå lages den nye listen.',
		'server.js',
		method === 'POST'
			? [
					[
						'const melding = { id: randomUUID(), tekst: tekst.trim(),',
						'tekst er validert. ID genereres på serveren.'
					],
					[
						'  eierId: req.bruker.id, avsender: req.bruker.brukernavn,',
						'Identitet kommer fra den verifiserte brukeren.'
					],
					['  opprettet: new Date().toISOString() };', 'Tidspunkt settes på serveren.'],
					['const nyListe = [...meldinger, melding];', 'Lag en ny liste uten å endre den gamle.']
				]
			: method === 'DELETE'
				? [
						[
							'const nyListe = meldinger.filter(m => m.id !== req.params.id);',
							'Eiersjekken skjer før filter.'
						]
					]
				: [
						[
							'const endret = { ...melding, tekst: tekst.trim() };',
							'Behold eierId; ikke kopier vilkårlige felt fra body.'
						],
						[
							'const nyListe = meldinger.map(m => m.id === req.params.id ? endret : m);',
							'Bytt bare meldingen som ble funnet.'
						]
					],
		{ 'Arbeidskopi · nyListe': next }
	);
	add(
		'Lagre og bekreft',
		'Dette forsøket forutsetter vellykket lagring. Feil på disk håndteres som i øving 7 med next(feil).',
		'server.js',
		[
			['lagreListe("meldinger.json", nyListe);', 'Lagre først.'],
			['meldinger = nyListe;', 'Bytt deretter minnet.'],
			[
				method === 'POST'
					? 'res.status(201).json(melding);'
					: 'res.json({ beskjed: "Endringen er lagret." });',
				'Bekreft først når endringen er varig.'
			]
		],
		{ 'Minne · meldinger': next, 'Disk · meldinger.json': next },
		method === 'POST' ? '201 Created' : '200 OK'
	);
	return steps;
}

/** @param {Values} v */
function operations(v) {
	const kit = v.framework === 'kit';
	const folder = kit ? 'build' : 'dist';
	const source = kit ? 'src/routes/+page.svelte' : 'src/App.svelte';
	const { steps, add } = recorder({
		Kildekode: 'Versjon 2',
		'Lokalt frontendbygg': 'Versjon 1',
		'Server · public/': 'Versjon 1',
		'Node-prosess': 'Kjører',
		'Disk · data/': 'Meldinger og brukere bevart',
		Sessionlager: 'Ada er innlogget'
	});
	add(
		'Se hva som kjører',
		'Kildekoden er endret lokalt. Den publiserte nettsiden er fortsatt versjon 1. Øvelsen viser en Express-server som også leverer frontendfilene.',
		'Prosjektets mapper',
		[
			[source, 'Frontendens kildekode. Denne filen sendes ikke direkte til nettleseren.'],
			[
				folder + '/',
				'Byggmappe for den valgte frontendtypen. SvelteKit trenger konfigurert statisk adapter og prerendering.'
			],
			['public/', 'I elevens Express-app ligger det kopierte frontendbygget her.'],
			['data/ og .env', 'Disse skal ligge utenfor public. Ikke kopier dem til offentlig innhold.']
		]
	);
	if (v.scenario === 'publish') {
		add(
			'Bygg frontend lokalt',
			kit
				? 'Dette valget forutsetter adapter-static og prerendering som i IT-laben. Byggmappen er build/, ikke Vites dist/.'
				: 'Vanlig Svelte med Vite bygger til dist/. Dette er oppsettet App.svelte-eksemplet i øvingsarket viser.',
			'Terminal · frontendmappen',
			[
				['npm ci', 'Installer pakkene fra låsefilen. Utviklingspakkene trengs under bygging.'],
				[
					'npm run build',
					'Vite bygger prosjektet. SvelteKit-adapteren bestemmer utdata i Kit-prosjektet.'
				]
			],
			{ 'Lokalt frontendbygg': 'Versjon 2 · ' + folder + '/' }
		);
		add(
			'Publiser byggfilene',
			'Kopier innholdet i byggmappen til backendens public/ på VM-en. Ikke kopier selve kildekoden eller private data dit.',
			'Eksempel · fra utviklingsmaskinen',
			[
				[
					'scp -r ' + folder + '/. elev@SERVER:/sti/til/backend/public/',
					'Bytt SERVER og stien med egen VM. Tilpass filkopiering til miljøet.'
				]
			],
			{ 'Server · public/': 'Versjon 2' }
		);
		add(
			'Serveren leverer samme origin',
			'API-rutene registreres først, deretter statiske filer, så 404 og feilmiddleware. Frontend bruker relative API-adresser.',
			'server.js og frontend',
			[
				[
					'// Etter API-rutene, før 404:',
					'Rekkefølgen hindrer at en generell fallback tar API-requestene.'
				],
				[
					'app.use(express.static("public"));',
					'WorkingDirectory må være backendmappen i dette oppsettet.'
				],
				['// I frontend:', 'Frontend og API leveres fra samme origin.'],
				['const API = "";', 'fetch(API + "/meldinger") går til serveren nettsiden kom fra.']
			],
			{ 'Nettleseren ser': 'Versjon 2' },
			'Publisert bygg · last siden på nytt'
		);
	} else if (v.scenario === 'source') {
		add(
			'Rediger kildekoden',
			'Endringen er foreløpig bare i kildefilen. Ingen nye nettleserfiler er bygget eller publisert.',
			'Frontend · ' + source,
			[
				[
					'<h1>Versjon 2</h1>',
					'Denne teksten må gjennom bygget før den blir en del av de publiserte filene.'
				]
			]
		);
		add(
			'Last nettsiden på nytt',
			'Nettleseren får fremdeles public/ fra serveren. En omstart av Node bygger ikke frontend for deg.',
			'HTTP-request',
			[['GET /', 'Serveren leverer de eksisterende filene i public.']],
			{ 'Nettleseren ser': 'Versjon 1' },
			'200 OK · gammel frontend'
		);
	} else if (['restart', 'reboot'].includes(v.scenario)) {
		add(
			'Prosessen stopper',
			'JSON-filene ligger på disk. Sessionlageret i minnet forsvinner når Node stopper.',
			'Ubuntu-terminal',
			[
				[
					v.scenario === 'restart' ? 'sudo systemctl restart backend' : 'sudo reboot',
					v.scenario === 'restart'
						? 'Restart stopper og starter tjenesten. Navnet backend er et eksempel.'
						: 'Dette er en simulert reboot. Ingen kommando kjøres på din maskin.'
				]
			],
			{ 'Node-prosess': 'Stoppet', Sessionlager: 'Tomt' }
		);
		add(
			'systemd starter tjenesten',
			v.scenario === 'reboot'
				? 'Forutsetning: tjenesten er enabled og har riktig servicefil. Da starter den når VM-en starter.'
				: 'systemd starter Node på nytt fra riktig arbeidsmappe og med miljøvariablene.',
			'/etc/systemd/system/backend.service · utdrag',
			[
				['[Service]', 'Tjenesten må også ha Unit- og Install-seksjon fra øvingsarket.'],
				['User=elev', 'Bruk en vanlig tjenestebruker med nødvendige filrettigheter.'],
				['WorkingDirectory=/sti/til/backend', 'Absolutt sti til backendmappen.'],
				[
					'EnvironmentFile=/sti/til/backend/.env',
					'SESSION_SECRET og FRONTEND_ORIGIN holdes utenfor public og Git.'
				],
				[
					'ExecStart=/absolutt/sti/til/node server.js',
					'Finn Node-stien på VM-en med command -v node. Ikke kopier eksempelstien uendret.'
				],
				['Restart=on-failure', 'Start igjen ved prosessfeil, men undersøk årsaken i loggen.']
			],
			{ 'Node-prosess': 'Kjører igjen', Sessionlager: 'Tomt · brukeren må logge inn på nytt' }
		);
		add(
			'Kontroller tjenesten og loggen',
			'Dataene overlevde, men innloggingen gjorde ikke det. Kontroller både status, logg og et API-kall.',
			'Ubuntu-terminal',
			[
				['sudo systemctl status backend', 'Kontroller at tjenesten kjører.'],
				['sudo journalctl -u backend -n 50 --no-pager', 'Se de siste logglinjene.'],
				[
					'curl http://localhost:3000/meldinger',
					'Her kjøres curl på serveren, så localhost peker til serveren.'
				]
			],
			{},
			'Tjenesten kjører · /meg krever ny innlogging'
		);
	} else if (v.scenario === 'localhost') {
		add(
			'Nettleseren kontakter seg selv',
			'En elev åpner nettsiden på VM-en, men frontend peker fortsatt til localhost:3000. Requesten går til elevens egen PC.',
			'Frontend · feil adresse',
			[
				[
					'const API = "http://localhost:3000";',
					'localhost bestemmes av maskinen som kjører nettleseren. Det betyr ikke automatisk VM-en.'
				]
			],
			{ 'Request fra elevens PC': 'Elevens PC → elevens PC:3000' },
			'Feil mål · ingen forbindelse i eksemplet'
		);
		add(
			'Bruk nettsidens origin',
			'Når Express leverer både frontend og API, kan frontend bruke en relativ adresse.',
			'Frontend · samme origin',
			[
				['const API = "";', 'Bruk samme protokoll, vertsnavn og port som nettsiden.'],
				[
					'const svar = await fetch(API + "/meldinger");',
					'Requesten går nå til VM-en som leverte nettsiden.'
				]
			],
			{ 'Request fra elevens PC': 'Elevens PC → VM:3000/meldinger' },
			'200 OK'
		);
		add(
			'Bind serveren til nettverket',
			'Serveren må lytte på en adresse andre kan nå. FRONTEND_ORIGIN må samsvare med adressen i nettleseren; samme origin trenger ikke CORS.',
			'server.js og .env · eksempler',
			[
				[
					'app.listen(3000, "0.0.0.0");',
					'Lytt på nettverksgrensesnittene. VM-nettverk og brannmur må også tillate forbindelsen.'
				],
				[
					'// .env: FRONTEND_ORIGIN=http://SERVER:3000',
					'Dette er konfigurasjon, ikke JavaScript. Origin-kontrollen for POST/PATCH/DELETE beholdes.'
				]
			]
		);
	} else {
		add(
			'Stopp tjenesten og ta backup',
			'En enkel backup i denne øvelsen tas mens appen er stoppet, slik at filene ikke endres under kopiering. Backup ligger utenfor public.',
			'Ubuntu-terminal · eksempel',
			[
				['sudo systemctl stop backend', 'Stopp skriving til datafilene.'],
				[
					'cp -a data data-backup',
					'Kjør fra backendmappen. Bruk et nytt backupnavn og kontroller at kopieringen lyktes.'
				],
				['sudo systemctl start backend', 'Start igjen etter vellykket kopiering.']
			],
			{
				'Backup utenfor public': 'Meldinger og brukere ved tidspunkt A',
				Sessionlager: 'Tomt etter restart'
			}
		);
		add(
			'Nye data kommer til',
			'Etter backupen opprettes en ny melding. Den finnes i dagens data, men ikke i den gamle kopien.',
			'Tidslinje',
			[
				[
					'// Backup A → ny melding B',
					'En backup er et øyeblikksbilde, ikke en automatisk synkronisert kopi.'
				]
			],
			{ 'Disk · data/': 'Meldinger A + ny melding B, og brukere' }
		);
		add(
			'Gjenopprett det gamle tidspunktet',
			'I en ekte gjenoppretting stopper du tjenesten, sikrer dagens data, erstatter data fra backup og starter igjen. Her simuleres dette uten filoperasjoner.',
			'Gjenoppretting · arbeidsrekkefølge',
			[
				['// 1. Stopp tjenesten', 'Unngå at appen skriver under gjenoppretting.'],
				['// 2. Ta vare på dagens data før du erstatter dem', 'Gjør det mulig å angre.'],
				[
					'// 3. Gjenopprett backup og kontroller rettigheter',
					'Tjenestebrukeren må kunne lese og skrive data.'
				],
				[
					'// 4. Start og kontroller GET /meldinger',
					'Verifiser innholdet, ikke bare at prosessen kjører.'
				]
			],
			{ 'Disk · data/': 'Gjenopprettet A · melding B er ikke med', Sessionlager: 'Tomt' },
			'Gjenopprettet · nyere endringer mangler'
		);
	}
	return steps;
}

/** @param {number} number @param {Values} values @returns {Step[]} */
export function buildTrace(number, values) {
	const models = [storage, crud, validation, registration, access, operations];
	const run = models[number - 5];
	if (!run) throw new Error('Ukjent øving: ' + number);
	return run({ ...values });
}

