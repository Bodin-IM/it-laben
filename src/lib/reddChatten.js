/**
 * Ren, deterministisk modell for «Redd chatten».
 * En kodeblokk har samme virkning som Express-koden eleven ser.
 * Hver prøverequest får sin egen startkopi. Return stanser videre kjøring,
 * men en lagring eller sletting som allerede har skjedd, blir ikke rullet tilbake.
 * Ingen eval, nettverk, cookies, DOM, tilfeldighet eller tidsstyring brukes her.
 */

/** @typedef {'tekst'|'avsender'|'sletting'} MissionId */
/** @typedef {'read'|'guard'|'write'|'respond'} Category */
/** @typedef {{id:string,navn:string}} User */
/** @typedef {{id:number,rom?:string,tekst:unknown,avsenderId?:string,avsender?:string}} Message */
/** @typedef {{tekst?:unknown,rom?:string,avsenderId?:string,avsender?:string}} Body */
/** @typedef {{body:Body,session:{bruker?:User},params:{id?:string}}} Request */
/** @typedef {{id:string,text:string,title:string,explanation:string}} CodeLine */
/** @typedef {{id:string,group:string,title:string,category:Category,lines:CodeLine[],explanation:string}} Block */
/** @typedef {{does:string,why:string,transfer:string}} Takeaway */
/** @typedef {{id:MissionId,number:number,title:string,brief:string,goal:string,requirements:string[],contract:string[],hint:string,method:'POST'|'DELETE',path:string,maxBlocks:number,startProgram:string[],available:string[],lesson:string,takeaway:Takeaway}} Mission */
/** @typedef {{status:number,response:unknown,messages:Message[]}} Expected */
/** @typedef {{id:string,name:string,actor:string,kind:'normal'|'edge'|'misuse',brief:string,request:Request,expected:Expected,initialMessages:Message[]}} Case */
/** @typedef {{blockId:string,index:number,executed:boolean,stopped:boolean,explanation:string,status:number|null,response:unknown,messages:Message[],variables:Record<string,unknown>}} ExecutionStep */
/** @typedef {{caseId:string,passed:boolean,status:number|null,response:unknown,before:Message[],after:Message[],trace:ExecutionStep[],feedback:string,expectedSummary:string,actualSummary:string,faultBlockId:string|null,error:string|null}} CaseResult */
/** @typedef {{results:CaseResult[],passed:number,total:number,success:boolean}} Run */
/** @typedef {{messages:Message[],nextId:number,tekst:unknown,lagret:Message|undefined,melding:Message|undefined,id:number,status:number|null,response:unknown,finished:boolean,error:string|null}} Runtime */
/** @typedef {{lineIds:string[],title:string,explanation:string}} Checkpoint */
/** @typedef {{id:string,phase:'arrive'|'step'|'skip'|'done',blockId:string|null,lineIds:string[],title:string,explanation:string,variables:Record<string,unknown>,messages:Message[],status:number|null,response:unknown,finished:boolean,executedBlockIds:string[],skippedBlockIds:string[]}} WalkthroughFrame */
/** @typedef {{caseId:string,request:Request,frames:WalkthroughFrame[],result:CaseResult}} Walkthrough */

/** @template T @param {T} value @returns {T} */
function copy(value) {
	return structuredClone(value);
}

/**
 * @param {string} id
 * @param {string} group
 * @param {string} title
 * @param {Category} category
 * @param {string[]} source
 * @param {string} explanation
 * @param {string[]} [notes]
 * @returns {Block}
 */
function block(id, group, title, category, source, explanation, notes = []) {
	return {
		id,
		group,
		title,
		category,
		explanation,
		lines: source.map((text, index) => ({
			id: `${id}-${index + 1}`,
			text,
			title,
			explanation: notes[index] ?? explanation
		}))
	};
}

const BLOCKS = [
	block(
		'normalize-text',
		'normalization',
		'Rydd teksten',
		'read',
		['tekst = typeof tekst === "string" ? tekst.trim() : "";'],
		'Trim fjerner mellomrom før og etter teksten. Tall og manglende tekst blir en tom streng. Dette klargjør teksten, men sender ikke et svar og lagrer ingenting.'
	),
	block(
		'guard-text',
		'text-guard',
		'Krev innhold i teksten',
		'guard',
		['if (!tekst) return res.status(400).json({ feil: "Skriv en melding" });'],
		'En tom streng er falsy og gir 400. En streng med bare mellomrom er truthy før trim. Return stopper resten av ruten, men gjør ikke tidligere lagring ugjort.'
	),
	block(
		'guard-present',
		'text-guard',
		'Krev at feltet finnes',
		'guard',
		['if (tekst === undefined) return res.status(400).json({ feil: "Skriv en melding" });'],
		'Denne kontrollen spør bare om tekst-feltet mangler. Tom streng, mellomrom og tall er fortsatt verdier som finnes.'
	),
	block(
		'guard-login',
		'authentication',
		'Krev innlogging',
		'guard',
		['if (!req.session.bruker) return res.status(401).json({ feil: "Logg inn" });'],
		'Sessionen er etablert på serveren ved innlogging. En gjest får 401, og return stanser kjøringen før senere kode. Kontrollen må skje før kode som trenger en innlogget bruker.'
	),
	block(
		'save-body',
		'save',
		'Lagre med avsender fra body',
		'write',
		[
			'lagret = { id: nesteId++, rom: req.body.rom, tekst,',
			'  avsenderId: req.body.avsenderId, avsender: req.body.avsender };',
			'meldinger.push(lagret);'
		],
		'Body kommer fra nettleseren, og nettleseren kan endre avsenderfeltene. Push lagrer med en gang. En avvisning lenger ned fjerner ikke meldingen igjen.',
		[
			'Dette bygger en ny melding med neste ledige ID og teksten slik den er akkurat nå. Neste ID økes med én.',
			'Her velges identiteten fra request-body. Den som sender requesten, kan selv skrive disse feltene.',
			'Push endrer serverlisten nå. Return eller en feil i senere kode ruller ikke denne endringen tilbake.'
		]
	),
	block(
		'save-session',
		'save',
		'Lagre med avsender fra session',
		'write',
		[
			'lagret = { id: nesteId++, rom: req.body.rom, tekst,',
			'  avsenderId: req.session.bruker.id, avsender: req.session.bruker.navn };',
			'meldinger.push(lagret);'
		],
		'Avsenderen hentes fra den innloggede brukeren på serveren. Body kan fortsatt inneholde et annet navn uten å bestemme avsenderen. En gjest har ingen bruker å hente ID og navn fra.',
		[
			'Dette bygger meldingen med ny ID, valgt rom og teksten etter de blokkene som allerede har kjørt.',
			'Den etablerte sessionen bestemmer identiteten. Dersom bruker mangler, stopper denne linjen med en kodefeil.',
			'Push lagrer meldingen i serverlisten. Alle kontroller som skal hindre lagring, må ha virket før denne linjen.'
		]
	),
	block(
		'reply-created',
		'response',
		'Svar med lagret melding · 201',
		'respond',
		['return res.status(201).json(lagret);'],
		'201 betyr at en ressurs er opprettet. Her sendes den lagrede meldingen tilbake, og return stanser ruten. Dersom ingen melding er lagret ennå, finnes det ingen melding å sende.'
	),
	block(
		'reply-ok',
		'response',
		'Svar med lagret melding · 200',
		'respond',
		['return res.status(200).json(lagret);'],
		'Dette sender et vellykket 200-svar. API-avtalen i dette oppdraget krever 201 når en melding er opprettet. Statuskoden lagrer ikke data av seg selv.'
	),
	block(
		'reject-all',
		'unconditional-rejection',
		'Svar med avvisning · 400',
		'respond',
		['return res.status(400).json({ feil: "Skriv en melding" });'],
		'Her er det ingen if-test. Alle som når blokken, blir avvist, også brukere som har sendt en gyldig melding.'
	),
	block(
		'find-id',
		'lookup',
		'Finn meldingen med ID',
		'read',
		['melding = meldinger.find((item) => item.id === id);'],
		'Find leter etter et objekt med denne ID-en. ID er en varig identifikator og trenger ikke være lik plasseringen i arrayet. Hvis ingen passer, blir melding undefined.'
	),
	block(
		'find-index',
		'lookup',
		'Finn meldingen på arrayplass',
		'read',
		['melding = meldinger[id];'],
		'Klammeparentesene bruker tallet som arrayindeks: 0 er første plass. Meldings-ID-ene i prøvene er blant annet 11 og 24, og er ikke arrayplassene.'
	),
	block(
		'guard-found',
		'existence',
		'Krev at meldingen finnes',
		'guard',
		['if (!melding) return res.status(404).json({ feil: "Meldingen finnes ikke" });'],
		'Denne kontrollen avviser en ukjent melding med 404. Variabelen melding må først fylles av et oppslag. Før oppslaget er den også undefined.'
	),
	block(
		'guard-owner-session',
		'ownership',
		'Sammenlign eier med session',
		'guard',
		[
			'if (melding.avsenderId !== req.session.bruker.id)',
			'  return res.status(403).json({ feil: "Dette er ikke din melding" });'
		],
		'Meldingens lagrede avsenderId sammenlignes med den innloggede brukeren. Både meldingen og brukeren må finnes før egenskapene deres kan leses. Kontroll etter sletting kan gi 403 selv om data allerede er borte.'
	),
	block(
		'guard-owner-body',
		'ownership',
		'Sammenlign eier med body',
		'guard',
		[
			'if (melding.avsenderId !== req.body.avsenderId)',
			'  return res.status(403).json({ feil: "Dette er ikke din melding" });'
		],
		'Dette sammenligner med en påstand fra nettleseren. Noah kan sende Adas ID i body. At påstanden passer med meldingen, beviser ikke hvem som er innlogget.'
	),
	block(
		'delete-id',
		'deletion',
		'Slett meldingen med ID',
		'write',
		['meldinger = meldinger.filter((item) => item.id !== id);'],
		'Filter beholder alle meldinger unntatt den med valgt ID. Serverlisten endres nå. En eierkontroll eller avvisning senere gjør ikke slettingen ugjort.'
	),
	block(
		'delete-index',
		'deletion',
		'Slett fra arrayplass',
		'write',
		['meldinger.splice(id, 1);'],
		'Splice fjerner ett element på denne arrayplassen. Det leter ikke etter et objekt med samme ID. En plass utenfor arrayet fjerner ingenting.'
	),
	block(
		'reply-deleted',
		'response',
		'Bekreft sletting · 200',
		'respond',
		['return res.json({ slettet: id });'],
		'JSON-svaret bruker standardstatus 200 og return stanser ruten. Svaret hevder at denne ID-en ble slettet. Selve slettingen må allerede ha skjedd.'
	)
];

/** @type {ReadonlyArray<Readonly<Mission>>} */
export const MISSIONS = Object.freeze([
	Object.freeze({
		id: 'tekst',
		number: 1,
		title: 'Stopp tomme meldinger',
		brief: 'Chatten fylles med tomme bobler. Ruten lagrer før den undersøker hva som ble sendt.',
		goal: 'Slipp inn ordentlige meldinger, og stopp tom tekst uten å lagre noe.',
		requirements: [
			'Gyldig tekst lagres én gang, ryddes for mellomrom foran og bak, og får 201.',
			'Tom tekst, bare mellomrom, manglende tekst og tall får 400.',
			'En avvist request skal ikke endre serverlisten.'
		],
		contract: [
			'Gyldig tekst lagres én gang, uten mellomrom foran eller bak, og returneres med 201.',
			'Tom tekst, bare mellomrom, manglende tekst og tall gir 400 uten å endre serverlisten.',
			'I denne runden er avsenderfeltene gitt. Innlogging kommer i neste oppdrag.'
		],
		hint: 'Se hva som finnes i serverlisten etter en avvisning. Undersøk også forskjellen på tom tekst og mellomrom.',
		method: 'POST',
		path: '/meldinger',
		maxBlocks: 5,
		startProgram: ['save-body', 'guard-present', 'reply-created'],
		available: [
			'normalize-text',
			'guard-text',
			'guard-present',
			'save-body',
			'reply-created',
			'reply-ok',
			'reject-all'
		],
		lesson:
			'Rydd teksten, vurder den, og la bare gyldige data nå lagringen. En feilkode ruller ikke tilbake det som allerede er lagret.',
		takeaway: {
			does: 'I prøvene lagrer ruten gyldig tekst én gang og svarer 201. Ugyldig tekst får 400, og serverlisten er uendret.',
			why: 'Teksten blir ryddet og kontrollert før lagring. Ved ugyldig tekst stopper return kjøringen før meldinger.push(lagret).',
			transfer:
				'Kontroller data før du endrer noe. Et feilsvar gjør ikke en lagring som allerede har skjedd, ugjort.'
		}
	}),
	Object.freeze({
		id: 'avsender',
		number: 2,
		title: 'Hvem skrev egentlig dette?',
		brief: 'Teksten er under kontroll. Nå påstår enkelte nettlesere at de er en annen bruker.',
		goal: 'La innloggede brukere sende som seg selv, og avvis gjester før data endres.',
		requirements: [
			'Gyldige meldinger fra innloggede brukere får 201 med avsenderen fra sessionen.',
			'Avsenderen i body skal ikke bestemme hvem meldingen lagres som.',
			'Gjester får 401. Ugyldig tekst fra innloggede får 400. Ingen avvisning lagrer data.'
		],
		contract: [
			'En innlogget bruker med gyldig tekst får 201 og én lagret melding med identiteten fra sessionen.',
			'Avsenderfeltene i body kan være falske eller mangle. De skal ikke bestemme avsenderen.',
			'Gjester får alltid 401. Innloggede med ugyldig tekst får 400. Ingen avvisning skal lagre noe.'
		],
		hint: 'Sammenlign body med sessionen i prøven som later som den er en annen. Hvilken identitet bestemmer koden din?',
		method: 'POST',
		path: '/meldinger',
		maxBlocks: 6,
		startProgram: ['normalize-text', 'guard-text', 'save-body', 'reply-created'],
		available: [
			'normalize-text',
			'guard-text',
			'guard-present',
			'guard-login',
			'save-body',
			'save-session',
			'reply-created',
			'reply-ok',
			'reject-all'
		],
		lesson:
			'Nettleseren foreslår innholdet. Backend bruker en etablert session til å bestemme hvem som sender, og sjekker tilgang før data endres.',
		takeaway: {
			does: 'I prøvene lagres meldinger med brukeren fra sessionen, også når body påstår noe annet. Gjester avvises uten at serverlisten endres.',
			why: 'Innlogging og tekst kontrolleres før lagring. Avsenderen hentes fra sessionen som serveren opprettet ved innlogging.',
			transfer:
				'La nettleseren sende innhold, og bruk sessionen på serveren til å fastslå hvem som handler.'
		}
	}),
	Object.freeze({
		id: 'sletting',
		number: 3,
		title: 'Slett bare ditt eget',
		brief:
			'En bruker får beskjed om at sletting er nektet. Likevel er meldingen borte fra chatten.',
		goal: 'Tillat sletting av egen melding, og beskytt alle andre meldinger.',
		requirements: [
			'En innlogget eier kan slette sin melding med ID og få 200 som bekreftelse.',
			'Gjester får 401, ukjent ID gir 404, og andres meldinger gir 403.',
			'En avvisning skal la alle meldinger være i fred, selv om body påstår en annen identitet.'
		],
		contract: [
			'En innlogget eier kan slette akkurat sin melding. Svar med 200 og { slettet: id }.',
			'Gjester får 401, ukjente ID-er gir 404, og andres meldinger gir 403. Ingen av disse skal endre data.',
			'ID er ikke arrayplass. Identiteten skal komme fra sessionen, selv om body påstår noe annet.'
		],
		hint: '403 er bare et svar. Undersøk når meldingen faktisk forsvant. Finn også ut hva melding inneholder før eieren kontrolleres.',
		method: 'DELETE',
		path: '/meldinger/:id',
		maxBlocks: 6,
		startProgram: ['find-id', 'delete-id', 'guard-owner-body', 'reply-deleted'],
		available: [
			'guard-login',
			'find-id',
			'find-index',
			'guard-found',
			'guard-owner-session',
			'guard-owner-body',
			'delete-id',
			'delete-index',
			'reply-deleted'
		],
		lesson:
			'Finn ressursen og kontroller tilgang før den endres. Et riktig HTTP-svar er ikke nok dersom serveren allerede har slettet feil data.',
		takeaway: {
			does: 'I prøvene kan en innlogget eier slette akkurat sin melding. Gjester, ukjente ID-er og forsøk på å slette andres meldinger lar serverlisten være uendret.',
			why: 'Ruten bruker ID til å finne meldingen og sessionen til å kontrollere eierskap. Kontrollene skjer før sletting.',
			transfer:
				'Sjekk både svaret og hva som skjedde med dataene. 403 beskytter bare meldingen dersom slettingen ikke allerede har skjedd.'
		}
	})
]);

/** @param {string} missionId @returns {Readonly<Mission>} */
function missionFor(missionId) {
	const mission = MISSIONS.find((item) => item.id === missionId);
	if (!mission) throw new RangeError('Ukjent oppdrag: ' + missionId);
	return mission;
}

/** @param {string} missionId @returns {Block[]} */
export function blocksFor(missionId) {
	const mission = missionFor(missionId);
	return mission.available.map((id) => {
		const entry = BLOCKS.find((item) => item.id === id);
		if (!entry) throw new RangeError('Ukjent kodeblokk: ' + id);
		return copy(entry);
	});
}

/** @param {string} missionId @returns {string[]} */
export function initialProgram(missionId) {
	return [...missionFor(missionId).startProgram];
}

/** @param {string} missionId @returns {{opening:string[],closing:string[]}} */
export function routeFrame(missionId) {
	const mission = missionFor(missionId);
	return {
		opening:
			mission.method === 'POST'
				? [
						'app.post("/meldinger", (req, res) => {',
						'  let tekst = req.body.tekst;',
						'  let lagret;'
					]
				: [
						'app.delete("/meldinger/:id", (req, res) => {',
						'  const id = Number(req.params.id);',
						'  let melding;'
					],
		closing: ['});']
	};
}

/** @param {string} missionId @param {string[]} program @returns {Block[]} */
function validateProgram(missionId, program) {
	const mission = missionFor(missionId);
	if (!Array.isArray(program)) throw new TypeError('Programmet må være en liste med kodeblokker.');
	if (program.length > mission.maxBlocks)
		throw new RangeError(`Oppdraget har plass til ${mission.maxBlocks} kodeblokker.`);
	const available = blocksFor(missionId);
	const groups = new Set();
	return program.map((id) => {
		const entry = available.find((item) => item.id === id);
		if (!entry) throw new RangeError('Kodeblokken er ikke tilgjengelig i dette oppdraget: ' + id);
		if (groups.has(entry.group))
			throw new RangeError('Velg én variant av samme oppgave: ' + entry.title);
		groups.add(entry.group);
		return entry;
	});
}

/** @param {string} missionId @param {string[]} program @returns {string} */
export function programCode(missionId, program) {
	const blocks = validateProgram(missionId, program);
	const frame = routeFrame(missionId);
	return [
		...frame.opening,
		...blocks.flatMap((entry) => entry.lines.map((line) => '  ' + line.text)),
		...frame.closing
	].join('\n');
}

/** @type {Message[]} */
const SEED = [
	{ id: 11, rom: 'generelt', tekst: 'Velkommen til chatten!', avsenderId: 'ada', avsender: 'Ada' },
	{ id: 24, rom: 'gaming', tekst: 'Hvem blir med?', avsenderId: 'noah', avsender: 'Noah' },
	{ id: 37, rom: 'generelt', tekst: 'Jeg er klar.', avsenderId: 'mina', avsender: 'Mina' }
];

/** @type {Record<string,User>} */
const USERS = {
	ada: { id: 'ada', navn: 'Ada' },
	noah: { id: 'noah', navn: 'Noah' },
	mina: { id: 'mina', navn: 'Mina' }
};

/** @param {User|undefined} user @param {Body} body @param {string} [id] @returns {Request} */
function request(user, body, id) {
	return {
		body: copy(body),
		session: user ? { bruker: copy(user) } : {},
		params: id === undefined ? {} : { id }
	};
}

/**
 * Expected values are built from the task contract, not from the candidate program.
 * @param {string} id @param {string} name @param {string} actor
 * @param {Case['kind']} kind @param {string} brief @param {Request} req
 * @param {number} status @param {User|undefined} savedAs
 * @returns {Case}
 */
function postCase(id, name, actor, kind, brief, req, status, savedAs) {
	const messages = copy(SEED);
	/** @type {unknown} */
	let response;
	if (status === 201) {
		const inserted = {
			id: 38,
			rom: req.body.rom ?? 'generelt',
			tekst: typeof req.body.tekst === 'string' ? req.body.tekst.trim() : '',
			avsenderId: savedAs?.id,
			avsender: savedAs?.navn
		};
		messages.push(inserted);
		response = copy(inserted);
	} else response = { feil: status === 401 ? 'Logg inn' : 'Skriv en melding' };
	return {
		id,
		name,
		actor,
		kind,
		brief,
		request: copy(req),
		expected: { status, response, messages },
		initialMessages: copy(SEED)
	};
}

/** @param {User} user @param {unknown} tekst @returns {Body} */
function messageBody(user, tekst) {
	return { rom: 'generelt', tekst, avsenderId: user.id, avsender: user.navn };
}

/** @returns {Case[]} */
function textCases() {
	return [
		postCase(
			'vanlig',
			'En vanlig melding',
			'Ada',
			'normal',
			'Ada skriver «Hei, alle sammen!».',
			request(USERS.ada, messageBody(USERS.ada, 'Hei, alle sammen!')),
			201,
			USERS.ada
		),
		postCase(
			'tom',
			'Tom melding',
			'Noah',
			'edge',
			'Noah trykker send uten å skrive noe.',
			request(USERS.noah, messageBody(USERS.noah, '')),
			400,
			undefined
		),
		postCase(
			'mellomrom',
			'Bare mellomrom',
			'Mina',
			'edge',
			'Mina sender tre mellomrom. Er dette innhold?',
			request(USERS.mina, messageBody(USERS.mina, '   ')),
			400,
			undefined
		),
		postCase(
			'luft-rundt',
			'Tekst med luft rundt',
			'Noah',
			'normal',
			'Noah sender «  Er dere klare?  ». Selve meldingen skal beholdes.',
			request(USERS.noah, messageBody(USERS.noah, '  Er dere klare?  ')),
			201,
			USERS.noah
		),
		postCase(
			'mangler',
			'Feltet mangler',
			'Mina',
			'edge',
			'Requesten inneholder ikke noe tekst-felt.',
			request(USERS.mina, { rom: 'generelt', avsenderId: 'mina', avsender: 'Mina' }),
			400,
			undefined
		),
		postCase(
			'tall',
			'Tall som tekst',
			'Ada',
			'edge',
			'Tekst-feltet inneholder tallet 42, ikke en streng.',
			request(USERS.ada, messageBody(USERS.ada, 42)),
			400,
			undefined
		)
	];
}

/** @returns {Case[]} */
function authorCases() {
	return [
		postCase(
			'ada',
			'Ada er innlogget',
			'Ada',
			'normal',
			'Sessionen og body sier begge Ada.',
			request(USERS.ada, messageBody(USERS.ada, 'Hei fra Ada!')),
			201,
			USERS.ada
		),
		postCase(
			'noah',
			'Noah er innlogget',
			'Noah',
			'normal',
			'Noah har en egen session og litt luft rundt teksten.',
			request(USERS.noah, messageBody(USERS.noah, '  Gaming etter skolen?  ')),
			201,
			USERS.noah
		),
		postCase(
			'gjest',
			'Ingen session',
			'Gjest',
			'misuse',
			'En gjest påstår i body at den er Ada, men er ikke innlogget.',
			request(undefined, messageBody(USERS.ada, 'Jeg slipper vel inn?')),
			401,
			undefined
		),
		postCase(
			'later-som-noah',
			'Ada påstår hun er Noah',
			'Ada',
			'misuse',
			'Sessionen sier Ada. Avsenderfeltene i body sier Noah.',
			request(USERS.ada, messageBody(USERS.noah, 'Hvem står som avsender?')),
			201,
			USERS.ada
		),
		postCase(
			'later-som-admin',
			'Noah påstår han er Admin',
			'Noah',
			'misuse',
			'Noahs session er uendret, men body bruker et annet navn og en annen ID.',
			request(USERS.noah, {
				rom: 'generelt',
				tekst: 'Se på navnet mitt!',
				avsenderId: 'admin',
				avsender: 'Admin'
			}),
			201,
			USERS.noah
		),
		postCase(
			'uten-navn',
			'Ingen avsender i body',
			'Mina',
			'normal',
			'Mina er innlogget. Frontend sender bare rom og tekst.',
			request(USERS.mina, { rom: 'generelt', tekst: 'Sessionen vet hvem jeg er.' }),
			201,
			USERS.mina
		),
		postCase(
			'tom',
			'Innlogget, men tom tekst',
			'Ada',
			'edge',
			'En innlogging gjør ikke en tom melding gyldig.',
			request(USERS.ada, messageBody(USERS.ada, '   ')),
			400,
			undefined
		),
		postCase(
			'gjest-og-tom',
			'Gjest med tom tekst',
			'Gjest',
			'misuse',
			'API-avtalen sier at en gjest skal få 401, også med ugyldig tekst.',
			request(undefined, messageBody(USERS.ada, '')),
			401,
			undefined
		)
	];
}

/** @param {string} id @param {string} name @param {string} actor @param {Case['kind']} kind @param {string} brief @param {Request} req @param {number} status @returns {Case} */
function deleteCase(id, name, actor, kind, brief, req, status) {
	const messageId = Number(req.params.id);
	const messages = status === 200 ? SEED.filter((item) => item.id !== messageId) : SEED;
	const response =
		status === 200
			? { slettet: messageId }
			: {
					feil:
						status === 401
							? 'Logg inn'
							: status === 404
								? 'Meldingen finnes ikke'
								: 'Dette er ikke din melding'
				};
	return {
		id,
		name,
		actor,
		kind,
		brief,
		request: copy(req),
		expected: { status, response, messages: copy(messages) },
		initialMessages: copy(SEED)
	};
}

/** @returns {Case[]} */
function deletionCases() {
	return [
		deleteCase(
			'egen-ada',
			'Ada sletter sin melding',
			'Ada',
			'normal',
			'Melding 11 er Adas. Hun er innlogget som Ada.',
			request(USERS.ada, { avsenderId: 'ada' }, '11'),
			200
		),
		deleteCase(
			'egen-noah',
			'Noah sletter sin melding',
			'Noah',
			'normal',
			'Melding 24 er Noahs. Andre meldinger skal bli igjen.',
			request(USERS.noah, { avsenderId: 'noah' }, '24'),
			200
		),
		deleteCase(
			'andres',
			'Noah prøver Adas melding',
			'Noah',
			'misuse',
			'Noah ber om å slette melding 11, som tilhører Ada.',
			request(USERS.noah, { avsenderId: 'noah' }, '11'),
			403
		),
		deleteCase(
			'falsk-eier',
			'Noah endrer body til Ada',
			'Noah',
			'misuse',
			'Sessionen sier Noah, men body påstår Ada for å slette melding 11.',
			request(USERS.noah, { avsenderId: 'ada' }, '11'),
			403
		),
		deleteCase(
			'ukjent',
			'Meldingen finnes ikke',
			'Mina',
			'edge',
			'Mina ber om ID 999. Ingen melding har den ID-en.',
			request(USERS.mina, { avsenderId: 'mina' }, '999'),
			404
		),
		deleteCase(
			'gjest',
			'En gjest prøver å slette',
			'Gjest',
			'misuse',
			'Body påstår Ada, men det finnes ingen innlogget bruker.',
			request(undefined, { avsenderId: 'ada' }, '11'),
			401
		),
		deleteCase(
			'gjest-ukjent',
			'Gjest og ukjent ID',
			'Gjest',
			'misuse',
			'En gjest skal få 401 før ruten gir informasjon om meldingen finnes.',
			request(undefined, { avsenderId: 'ada' }, '999'),
			401
		),
		deleteCase(
			'arrayplass',
			'ID er ikke arrayplass',
			'Ada',
			'edge',
			'Ada ber om ID 0. Første arrayplass er 0, men meldingens ID er 11.',
			request(USERS.ada, { avsenderId: 'ada' }, '0'),
			404
		)
	];
}

/** @param {string} missionId @returns {Case[]} */
export function casesFor(missionId) {
	const mission = missionFor(missionId);
	return mission.id === 'tekst'
		? textCases()
		: mission.id === 'avsender'
			? authorCases()
			: deletionCases();
}

/** @param {unknown} body @returns {unknown} */
function jsonBody(body) {
	if (body === undefined) return null;
	return JSON.parse(JSON.stringify(body));
}

/** @param {Runtime} runtime @param {number} status @param {unknown} body */
function respond(runtime, status, body) {
	runtime.status = status;
	runtime.response = jsonBody(body);
	runtime.finished = true;
}

/**
 * The optional checkpoint observes a real intermediate state, without changing execution.
 * @param {string} id @param {Runtime} runtime @param {Request} req
 * @param {(checkpoint:Checkpoint)=>void} [oncheckpoint]
 * @returns {string}
 */
function execute(id, runtime, req, oncheckpoint) {
	switch (id) {
		case 'normalize-text': {
			runtime.tekst = typeof runtime.tekst === 'string' ? runtime.tekst.trim() : '';
			return runtime.tekst === ''
				? 'Etter rydding er teksten tom. Ingen data er lagret av denne blokken.'
				: 'Mellomrom rundt teksten er fjernet. Teksten har fortsatt innhold.';
		}
		case 'guard-text': {
			if (!runtime.tekst) {
				respond(runtime, 400, { feil: 'Skriv en melding' });
				return 'Teksten er falsy. Ruten svarer 400 og stopper her.';
			}
			return 'Teksten er truthy, så kontrollen lar kjøringen fortsette.';
		}
		case 'guard-present': {
			if (runtime.tekst === undefined) {
				respond(runtime, 400, { feil: 'Skriv en melding' });
				return 'Tekst-feltet mangler. Ruten svarer 400 og stopper her.';
			}
			return 'Tekst-feltet finnes. Denne kontrollen vurderer ikke innholdet.';
		}
		case 'guard-login': {
			if (!req.session.bruker) {
				respond(runtime, 401, { feil: 'Logg inn' });
				return 'Ingen innlogget bruker i sessionen. Ruten svarer 401 og stopper her.';
			}
			return `${req.session.bruker.navn} er innlogget ifølge sessionen. Kjøringen fortsetter.`;
		}
		case 'save-body':
		case 'save-session': {
			// Object properties are evaluated left to right in the displayed code.
			const nextId = runtime.nextId++;
			const user = req.session.bruker;
			if (id === 'save-session' && !user)
				throw new Error(
					'Sessionen har ingen bruker. ID og navn kan ikke leses før innlogging er kontrollert.'
				);
			runtime.lagret = {
				id: nextId,
				rom: req.body.rom,
				tekst: runtime.tekst,
				avsenderId: id === 'save-session' ? user?.id : req.body.avsenderId,
				avsender: id === 'save-session' ? user?.navn : req.body.avsender
			};
			oncheckpoint?.({
				lineIds: [`${id}-1`, `${id}-2`],
				title: 'Bygg meldingsobjektet',
				explanation: `lagret viser nå et nytt objekt med ID ${nextId}. Objektet har teksten slik den er akkurat nå. Det er ikke lagt i serverlisten ennå.`
			});
			runtime.messages.push(runtime.lagret);
			return `Melding ${nextId} er nå lagret${runtime.lagret.avsender ? ' som ' + runtime.lagret.avsender : ' uten avsendernavn'}. En senere avvisning gjør ikke dette ugjort.`;
		}
		case 'reply-created':
			respond(runtime, 201, runtime.lagret);
			return runtime.lagret
				? 'Svaret inneholder den lagrede meldingen. 201 og return avslutter ruten.'
				: 'Ruten svarer 201, men variabelen lagret er tom. Ingen melding følger med.';
		case 'reply-ok':
			respond(runtime, 200, runtime.lagret);
			return 'Ruten sender 200 og avslutter. Statuskoden lagrer ikke noe av seg selv.';
		case 'reject-all':
			respond(runtime, 400, { feil: 'Skriv en melding' });
			return 'Denne blokken avviser uten en if-test. Resten av ruten kjøres ikke.';
		case 'find-id': {
			runtime.melding = runtime.messages.find((item) => item.id === runtime.id);
			return runtime.melding
				? `Fant melding med ID ${runtime.melding.id}, skrevet av ${runtime.melding.avsender}.`
				: `Ingen melding har ID ${runtime.id}. Variabelen melding blir undefined.`;
		}
		case 'find-index': {
			runtime.melding = runtime.messages[runtime.id];
			return runtime.melding
				? `På arrayplass ${runtime.id} ligger melding ${runtime.melding.id}. Arrayplass og ID er ulike ting.`
				: `Arrayet har ingen plass ${runtime.id}. Variabelen melding blir undefined.`;
		}
		case 'guard-found': {
			if (!runtime.melding) {
				respond(runtime, 404, { feil: 'Meldingen finnes ikke' });
				return 'Variabelen melding er tom. Ruten svarer 404 og stopper her.';
			}
			return `Melding ${runtime.melding.id} finnes i variabelen. Kjøringen fortsetter.`;
		}
		case 'guard-owner-session':
		case 'guard-owner-body': {
			if (!runtime.melding)
				throw new Error(
					'Variabelen melding er undefined. Finn meldingen og håndter manglende treff før avsenderId leses.'
				);
			if (id === 'guard-owner-session' && !req.session.bruker)
				throw new Error(
					'Sessionen har ingen bruker. Innlogging må kontrolleres før bruker.id leses.'
				);
			const claimedId = id === 'guard-owner-session' ? req.session.bruker?.id : req.body.avsenderId;
			if (runtime.melding.avsenderId !== claimedId) {
				respond(runtime, 403, { feil: 'Dette er ikke din melding' });
				return 'Avsender-ID-ene er forskjellige. Ruten svarer 403, men tidligere endringer beholdes.';
			}
			return id === 'guard-owner-session'
				? 'Den innloggede brukeren eier meldingen. Kjøringen fortsetter.'
				: 'ID-en fra body passer med eieren. Blokken har ikke undersøkt hvem som er innlogget.';
		}
		case 'delete-id': {
			const before = runtime.messages.length;
			runtime.messages = runtime.messages.filter((item) => item.id !== runtime.id);
			return before === runtime.messages.length
				? `Ingen melding med ID ${runtime.id} ble fjernet.`
				: `Melding ${runtime.id} er fjernet fra serverlisten nå. En senere feilkode henter den ikke tilbake.`;
		}
		case 'delete-index': {
			const removed = runtime.messages.splice(runtime.id, 1);
			return removed.length
				? `Arrayplass ${runtime.id} ble fjernet. Meldingen på plassen hadde ID ${removed[0].id}.`
				: `Arrayplass ${runtime.id} ligger utenfor listen. Ingen melding ble fjernet.`;
		}
		case 'reply-deleted':
			respond(runtime, 200, { slettet: runtime.id });
			return `Ruten svarer 200 og hevder at melding ${runtime.id} ble slettet. Return stanser kjøringen.`;
		default:
			throw new RangeError('Ukjent kodeblokk: ' + id);
	}
}

/** @param {Case} testCase @param {Request} req @returns {Runtime} */
function initialRuntime(testCase, req) {
	return {
		messages: copy(testCase.initialMessages),
		nextId: Math.max(0, ...testCase.initialMessages.map((item) => item.id)) + 1,
		tekst: req.body.tekst,
		lagret: undefined,
		melding: undefined,
		id: Number(req.params.id),
		status: null,
		response: null,
		finished: false,
		error: null
	};
}

/** @param {unknown} a @param {unknown} b */
function equal(a, b) {
	return JSON.stringify(a) === JSON.stringify(b);
}

/** @param {Case} testCase */
function expectedSummary(testCase) {
	const expected = testCase.expected;
	if (expected.status === 201) return '201 · én ryddet melding med riktig avsender';
	if (expected.status === 200) return `200 · bare melding ${testCase.request.params.id} fjernes`;
	return `${expected.status} · ingen endring i serverlisten`;
}

/** @param {Case} testCase @param {Runtime} runtime */
function actualSummary(testCase, runtime) {
	const added = runtime.messages.filter(
		(item) => !testCase.initialMessages.some((old) => old.id === item.id)
	);
	const removed = testCase.initialMessages.filter(
		(item) => !runtime.messages.some((next) => next.id === item.id)
	);
	const effect = added.length
		? `${added.length} ny melding${added.length === 1 ? '' : 'er'} lagret`
		: removed.length
			? `${removed.length} melding${removed.length === 1 ? '' : 'er'} fjernet`
			: 'ingen endring i serverlisten';
	return `${runtime.status === null ? 'Ingen svar' : runtime.status} · ${effect}`;
}

/** @param {Case} testCase @param {Runtime} runtime @param {boolean} passed */
function feedbackFor(testCase, runtime, passed) {
	if (passed)
		return testCase.expected.status >= 400
			? `Riktig avvisning: ${testCase.expected.status}. Serverlisten er uendret.`
			: testCase.expected.status === 201
				? 'Meldingen er lagret én gang med riktig innhold og avsender, og returnert med 201.'
				: 'Bare den riktige meldingen er slettet. Svaret bekrefter riktig ID med 200.';
	const expected = testCase.expected;
	const removed = testCase.initialMessages.filter(
		(item) => !runtime.messages.some((next) => next.id === item.id)
	);
	const added = runtime.messages.filter(
		(item) => !testCase.initialMessages.some((old) => old.id === item.id)
	);
	if (expected.status >= 400 && (removed.length || added.length)) {
		const subject = removed.length
			? `${removed[0].avsender ?? 'En bruker'}s melding ${removed[0].id}`
			: typeof added[0].tekst === 'string' && added[0].tekst.trim() === ''
				? 'en tom melding'
				: 'en melding';
		const change = removed.length ? 'slettet' : 'lagret';
		if (runtime.status !== null && runtime.status >= 400) {
			const cause = runtime.error ? 'En kodefeil' : 'En avvisning';
			return `${testCase.actor} fikk ${runtime.status}, men ${subject} ble likevel ${change}. ${cause} gjør ikke tidligere endringer ugjort.`;
		}
		return `${testCase.actor} fikk ${runtime.status ?? 'ikke noe svar'}, og ${subject} ble ${change}. Denne requesten skal få ${expected.status} uten å endre serverlisten.`;
	}
	if (runtime.error) return `Koden stoppet med 500. ${runtime.error}`;
	if (runtime.status === null)
		return 'Ruten ble ferdig uten å sende et svar. Nettleseren venter fortsatt, selv om serverdata kan ha blitt endret.';
	if (runtime.status !== expected.status)
		return `Requesten skulle få ${expected.status}, men fikk ${runtime.status}. ${expected.status === 401 ? 'Kontroller innlogging før andre avvisninger eller bruk av sessionen.' : expected.status === 201 ? 'En gyldig melding skal få slippe gjennom og bekreftes som opprettet.' : expected.status === 200 ? 'En innlogget eier skal kunne slette akkurat sin melding.' : 'Undersøk hvilken kontroll eller svarblokk requesten faktisk nådde.'}`;
	if (!equal(runtime.messages, expected.messages)) {
		if (expected.status === 201) {
			if (!added.length)
				return 'Svaret sier 201, men ingen ny melding finnes på serveren. Et vellykket svar erstatter ikke lagringen.';
			const wanted = expected.messages.at(-1);
			const saved = added[0];
			if (saved.avsenderId !== wanted?.avsenderId || saved.avsender !== wanted?.avsender)
				return `Svaret sier 201, men meldingen er lagret som ${saved.avsender ?? 'ukjent avsender'}. Sessionen sier ${testCase.request.session.bruker?.navn ?? 'ingen innlogget bruker'}. Undersøk hvor avsenderen hentes fra.`;
			return 'Meldingen er lagret, men teksten er ikke ryddet som avtalt. Se hva tekst inneholder akkurat når lagringsblokken kjører.';
		}
		if (expected.status === 200)
			return removed.length
				? `Svaret sier 200, men feil melding er slettet. ID-en i requesten er ikke en arrayplass.`
				: 'Svaret sier 200, men meldingen ligger fortsatt på serveren. Kontroller både hvilken melding som slettes og om slettingen skjer før return.';
		return 'HTTP-statusen passer, men serverlisten har feil innhold. Se hvilke blokker som endret data før svaret.';
	}
	return 'Serverdata og status stemmer, men svarinnholdet gjør ikke det. Send den lagrede meldingen eller den slettede ID-en slik API-avtalen beskriver.';
}

/** @param {string} missionId @param {string[]} program @param {string} caseId @returns {CaseResult} */
export function evaluateCase(missionId, program, caseId) {
	const blocks = validateProgram(missionId, program);
	const testCase = casesFor(missionId).find((item) => item.id === caseId);
	if (!testCase) throw new RangeError('Ukjent prøverequest: ' + caseId);
	const req = copy(testCase.request);
	const runtime = initialRuntime(testCase, req);
	/** @type {ExecutionStep[]} */
	const trace = [];
	/** @type {string|null} */
	let faultBlockId = null;
	for (const [index, entry] of blocks.entries()) {
		const executed = !runtime.finished;
		let explanation = 'Ikke kjørt. En tidligere blokk avsluttet ruten.';
		if (executed) {
			try {
				explanation = execute(entry.id, runtime, req);
			} catch (error) {
				runtime.error =
					error instanceof Error
						? error.message
						: 'En egenskap ble lest fra en verdi som ikke finnes.';
				runtime.status = 500;
				runtime.response = null;
				runtime.finished = true;
				faultBlockId = entry.id;
				explanation = 'Kodefeil: ' + runtime.error;
			}
		}
		trace.push({
			blockId: entry.id,
			index,
			executed,
			stopped: executed && runtime.finished,
			explanation,
			status: runtime.status,
			response: copy(runtime.response),
			messages: copy(runtime.messages),
			variables: copy({ tekst: runtime.tekst, lagret: runtime.lagret, melding: runtime.melding })
		});
	}
	const passed =
		!runtime.error &&
		runtime.status === testCase.expected.status &&
		equal(runtime.messages, testCase.expected.messages) &&
		equal(runtime.response, testCase.expected.response);
	if (!passed && faultBlockId === null) {
		// Focus a consequential executed block rather than judging a hardcoded order.
		const written = trace.find(
			(step) => step.executed && !equal(step.messages, testCase.initialMessages)
		);
		const stopped = trace.find((step) => step.stopped);
		const wrongData = !equal(runtime.messages, testCase.expected.messages);
		const lastExecuted = [...trace].reverse().find((step) => step.executed);
		faultBlockId = ((wrongData ? written : null) ?? stopped ?? lastExecuted)?.blockId ?? null;
	}
	return {
		caseId,
		passed,
		status: runtime.status,
		response: copy(runtime.response),
		before: copy(testCase.initialMessages),
		after: copy(runtime.messages),
		trace,
		feedback: feedbackFor(testCase, runtime, passed),
		expectedSummary: expectedSummary(testCase),
		actualSummary: actualSummary(testCase, runtime),
		faultBlockId,
		error: runtime.error
	};
}

/**
 * A learner-controlled walkthrough for the text mission. A frame is one meaningful
 * operation, which may span two source lines (object construction), rather than an
 * animation timer. Snapshots only contain values reached at that point in execution.
 * Existing evaluation and the walkthrough use the same execute() implementation.
 * @param {string} missionId @param {string[]} program @param {string} caseId
 * @returns {Walkthrough}
 */
export function walkthroughCase(missionId, program, caseId) {
	if (missionId !== 'tekst')
		throw new RangeError('Stegvis gjennomgang er tilgjengelig i det første oppdraget.');
	const blocks = validateProgram(missionId, program);
	const testCase = casesFor(missionId).find((item) => item.id === caseId);
	if (!testCase) throw new RangeError('Ukjent prøverequest: ' + caseId);
	const req = copy(testCase.request);
	const runtime = initialRuntime(testCase, req);
	/** @type {WalkthroughFrame[]} */
	const frames = [];
	/** @type {string[]} */
	const executedBlockIds = [];
	/** @type {string[]} */
	const skippedBlockIds = [];
	let textDeclared = false;
	let savedDeclared = false;

	/**
	 * @param {string} id @param {WalkthroughFrame['phase']} phase
	 * @param {string|null} blockId @param {string[]} lineIds
	 * @param {string} title @param {string} explanation
	 */
	function snapshot(id, phase, blockId, lineIds, title, explanation) {
		/** @type {Record<string,unknown>} */
		const variables = {};
		if (textDeclared) variables.tekst = runtime.tekst;
		if (savedDeclared) variables.lagret = runtime.lagret;
		frames.push({
			id: `${caseId}:${id}`,
			phase,
			blockId,
			lineIds: [...lineIds],
			title,
			explanation,
			variables: copy(variables),
			messages: copy(runtime.messages),
			status: runtime.status,
			response: copy(runtime.response),
			finished: runtime.finished,
			executedBlockIds: [...executedBlockIds],
			skippedBlockIds: [...skippedBlockIds]
		});
	}

	snapshot(
		'arrive',
		'arrive',
		null,
		['opening-1'],
		'Requesten kommer inn',
		'POST-requesten treffer /meldinger. Se hva nettleseren har sendt i req.body.tekst. Koden inne i ruten har ikke kjørt ennå.'
	);
	textDeclared = true;
	snapshot(
		'read-text',
		'step',
		null,
		['opening-2'],
		'Les teksten fra body',
		req.body.tekst === undefined
			? 'Body har ikke noe tekst-felt. Variabelen tekst opprettes med verdien undefined.'
			: 'Variabelen tekst får verdien fra req.body.tekst, akkurat slik nettleseren sendte den. Ingen rydding eller kontroll har skjedd ennå.'
	);
	savedDeclared = true;
	snapshot(
		'declare-saved',
		'step',
		null,
		['opening-3'],
		'Opprett variabelen lagret',
		'let lagret oppretter en variabel uten å gi den en melding. Verdien er undefined. Serverlisten er fortsatt uendret.'
	);

	for (const entry of blocks) {
		if (runtime.finished) {
			skippedBlockIds.push(entry.id);
			snapshot(
				`${entry.id}:skip`,
				'skip',
				entry.id,
				entry.lines.map((line) => line.id),
				'Ikke kjørt: ' + entry.title,
				'En tidligere return har avsluttet ruten. Denne blokken hoppes over, og verdiene blir ikke endret.'
			);
			continue;
		}
		executedBlockIds.push(entry.id);
		let explanation;
		try {
			explanation = execute(entry.id, runtime, req, (checkpoint) => {
				snapshot(
					`${entry.id}:construct`,
					'step',
					entry.id,
					checkpoint.lineIds,
					checkpoint.title,
					checkpoint.explanation
				);
			});
		} catch (error) {
			runtime.error = error instanceof Error ? error.message : 'En verdi kunne ikke leses.';
			runtime.status = 500;
			runtime.response = null;
			runtime.finished = true;
			explanation = 'Kodefeil: ' + runtime.error;
		}
		snapshot(
			`${entry.id}:execute`,
			'step',
			entry.id,
			entry.id === 'save-body' ? ['save-body-3'] : entry.lines.map((line) => line.id),
			entry.id === 'save-body' ? 'Legg objektet i serverlisten' : entry.title,
			explanation
		);
	}
	const result = evaluateCase(missionId, program, caseId);
	snapshot(
		'done',
		'done',
		null,
		runtime.status === null ? ['closing-1'] : [],
		runtime.status === null ? 'Ruten nådde slutten uten svar' : 'Requesten er ferdig behandlet',
		result.feedback
	);
	return { caseId, request: copy(req), frames, result };
}

/** @param {string} missionId @param {string[]} program @returns {Run} */
export function evaluateProgram(missionId, program) {
	validateProgram(missionId, program);
	const results = casesFor(missionId).map((testCase) =>
		evaluateCase(missionId, program, testCase.id)
	);
	const passed = results.filter((result) => result.passed).length;
	return { results, passed, total: results.length, success: passed === results.length };
}
