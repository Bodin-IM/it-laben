/**
 * Ren modell for «To nettlesere, én chat».
 * Hvert forsøk starter fra brettets tilstand. Kodekortene utfører bare sine
 * egne requests; POST oppdaterer aldri den andre nettleseren automatisk.
 * Modellen bruker ikke ekte nettverk, cookies, lagring eller tidsstyring.
 */

/** @typedef {'lever' | 'oppdater' | 'rom'} LevelId */
/** @typedef {'ada' | 'noah'} Actor */
/** @typedef {'frontend' | 'backend'} Side */
/** @typedef {'ada-post' | 'noah-get-generelt' | 'noah-get-gaming' | 'ada-get-generelt'} ActionId */
/** @typedef {{id:number, rom:string, avsender:string, tekst:string}} Message */
/** @typedef {{rom:string, avsender:string, tekst:string}} MessageData */
/** @typedef {{room:string, messages:Message[]}} ClientState */
/** @typedef {{serverMessages:Message[], ada:ClientState, noah:ClientState, nextId:number}} State */
/** @typedef {{id:LevelId, number:number, title:string, brief:string, goal:string, hint:string, lesson:string, target:MessageData}} Level */
/** @typedef {{id:ActionId, actor:Actor, method:'GET'|'POST', room:string, title:string, description:string, call:string}} Card */
/** @typedef {{id:string, text:string, title:string, explanation:string}} CodeLine */
/** @typedef {{id:string, label:string, passed:boolean}} GoalCheck */
/** @typedef {{success:boolean, title:string, explanation:string, checks:GoalCheck[], lesson:string}} Result */
/** @typedef {{beskjed:string, melding:Message} | Message[]} ResponseBody */
/**
 * Snapshots og HTTP-data deler ingen objekter med andre trinn eller resultatet.
 * actionIndex er nullbasert. phase:'response' er et HTTP-svar til actor;
 * phase:'client' er browserens behandling av dette svaret.
 * @typedef {State & {
 *   id:string, actionIndex:number, actionId:ActionId, actor:Actor,
 *   side:Side, phase:'request'|'server'|'response'|'client', lineIds:string[],
 *   title:string, explanation:string, method:'GET'|'POST', path:string,
 *   requestBody:MessageData|null, responseBody:ResponseBody|null, httpStatus:number|null
 * }} Step
 */
/** @typedef {{steps:Step[], finalState:State, result:Result}} Attempt */

export const MAX_ACTIONS = 6;

/** @type {ReadonlyArray<Readonly<Level>>} */
export const LEVELS = Object.freeze([
	Object.freeze({
		id: 'lever',
		number: 1,
		title: 'Noah mangler meldingen',
		brief:
			'Ada har skrevet «Hei Noah!». Meldingen er ikke sendt, og Noah viser sin gamle liste fra Generelt.',
		goal: 'Lagre Adas melding én gang i Generelt, og få den fram i Noahs nettleser.',
		hint: 'Undersøk hvor meldingen finnes nå. Hvilken handling endrer serveren, og hvilken endrer Noahs liste?',
		lesson: 'POST lagrer på backend. En GET fra Noah henter en ny kopi til akkurat hans nettleser.',
		target: Object.freeze({ rom: 'generelt', avsender: 'Ada', tekst: 'Hei Noah!' })
	}),
	Object.freeze({
		id: 'oppdater',
		number: 2,
		title: 'Allerede sendt',
		brief:
			'Adas melding ligger allerede på backend i Generelt. Ada ser den, men Noah viser fortsatt en eldre liste.',
		goal: 'Få den eksisterende meldingen fram hos Noah uten å lage en ekstra kopi på serveren.',
		hint: 'Se i serverens liste før du sender noe. Hvilken nettleser mangler en oppdatert kopi?',
		lesson:
			'En melding som allerede er lagret, trenger ikke sendes på nytt. Hver nettleser henter sin egen kopi.',
		target: Object.freeze({ rom: 'generelt', avsender: 'Ada', tekst: 'Hei Noah!' })
	}),
	Object.freeze({
		id: 'rom',
		number: 3,
		title: 'Et annet rom',
		brief:
			'Adas melding ligger allerede i Gaming. Noah viser Generelt, og den listen inneholder andre meldinger.',
		goal: 'Vis Gaming og Adas eksisterende melding hos Noah. Behold bare én kopi av meldingen på serveren.',
		hint: 'Sammenlign rommet på meldingen med rommet i Noahs GET-request.',
		lesson: 'GET må be om riktig rom. Svaret oppdaterer bare nettleseren som sendte requesten.',
		target: Object.freeze({ rom: 'gaming', avsender: 'Ada', tekst: 'Hei Noah!' })
	})
]);

/** @type {Readonly<Record<Side, string>>} */
export const CODE_CONTEXTS = Object.freeze({
	frontend:
		'Utdrag fra den valgte nettleserens Svelte-komponent. API er adressen til Express. meldinger, vistRom og status er egne $state-verdier i hver nettleser. Kortet kaller funksjonen; det styrer ikke kode i den andre nettleseren. Spillet bruker faste øvingsdata uten innlogging.',
	backend:
		'Utdrag fra samme Express-app. express.json() og eventuelt CORS-oppsett kjører før rutene. meldinger er den felles serverlisten, og nesteId er en stigende teller. Begge rutene registreres én gang. I en chat med innlogging hentes avsenderen fra sessionen, som på chatrom-siden.'
});

/** @param {string} levelId @returns {Readonly<Level>} */
function levelFor(levelId) {
	const level = LEVELS.find((item) => item.id === levelId);
	if (!level) throw new RangeError('Ukjent spillbrett: ' + levelId);
	return level;
}

/** @param {Message[]} messages @returns {Message[]} */
function copyMessages(messages) {
	return messages.map((message) => ({ ...message }));
}
/** @param {State} state @returns {State} */
function copyState(state) {
	return {
		serverMessages: copyMessages(state.serverMessages),
		ada: { room: state.ada.room, messages: copyMessages(state.ada.messages) },
		noah: { room: state.noah.room, messages: copyMessages(state.noah.messages) },
		nextId: state.nextId
	};
}
/** @param {ResponseBody|null} body @returns {ResponseBody|null} */
function copyResponse(body) {
	if (body === null) return null;
	return Array.isArray(body) ? copyMessages(body) : { ...body, melding: { ...body.melding } };
}
/** @param {Actor} actor */
function actorName(actor) {
	return actor === 'ada' ? 'Ada' : 'Noah';
}
/** @param {string} room */
function roomName(room) {
	return room === 'generelt' ? 'Generelt' : 'Gaming';
}

/** @param {string} levelId @returns {Card[]} */
export function actionsFor(levelId) {
	const level = levelFor(levelId);
	return [
		{
			id: 'ada-post',
			actor: 'ada',
			method: 'POST',
			room: level.target.rom,
			title: 'Ada sender til ' + roomName(level.target.rom),
			description: 'Lagrer en ny «Hei Noah!» på backend. Henter ingen ny liste.',
			call: 'await sendMelding();'
		},
		{
			id: 'noah-get-generelt',
			actor: 'noah',
			method: 'GET',
			room: 'generelt',
			title: 'Noah henter Generelt',
			description: 'Henter Generelt fra serveren til Noahs egen visning.',
			call: 'await hentRom("generelt");'
		},
		{
			id: 'noah-get-gaming',
			actor: 'noah',
			method: 'GET',
			room: 'gaming',
			title: 'Noah henter Gaming',
			description: 'Henter Gaming fra serveren til Noahs egen visning.',
			call: 'await hentRom("gaming");'
		},
		{
			id: 'ada-get-generelt',
			actor: 'ada',
			method: 'GET',
			room: 'generelt',
			title: 'Ada henter Generelt',
			description: 'Oppdaterer Adas liste. Noahs nettleser har fortsatt sin egen kopi.',
			call: 'await hentRom("generelt");'
		}
	];
}

/** @param {string} levelId @param {string} actionId @returns {Card} */
function actionFor(levelId, actionId) {
	const action = actionsFor(levelId).find((item) => item.id === actionId);
	if (!action) throw new RangeError('Ukjent kodekort: ' + actionId);
	return action;
}

/** @param {string} levelId @returns {State} */
export function initialState(levelId) {
	const level = levelFor(levelId);
	/** @type {Message[]} */
	const seed = [
		{ id: 1, rom: 'generelt', avsender: 'Noah', tekst: 'Jeg er inne i Generelt.' },
		{ id: 2, rom: 'gaming', avsender: 'Noah', tekst: 'Klar for en runde?' }
	];
	const oldGeneral = copyMessages(seed.filter((message) => message.rom === 'generelt'));
	if (level.id !== 'lever') seed.push({ id: 3, ...level.target });
	const adaRoom = level.id === 'rom' ? 'gaming' : 'generelt';
	return {
		serverMessages: copyMessages(seed),
		ada: {
			room: adaRoom,
			messages: copyMessages(seed.filter((message) => message.rom === adaRoom))
		},
		noah: { room: 'generelt', messages: oldGeneral },
		nextId: level.id === 'lever' ? 3 : 4
	};
}

/** @param {Message} message @param {MessageData} target */
function matchesTarget(message, target) {
	return (
		message.rom === target.rom &&
		message.avsender === target.avsender &&
		message.tekst === target.tekst
	);
}
/** @param {Message} a @param {Message} b */
function sameMessage(a, b) {
	return a.id === b.id && a.rom === b.rom && a.avsender === b.avsender && a.tekst === b.tekst;
}

/**
 * Målvurdering basert på data, ikke en fasitsekvens. Historikken brukes bare
 * til en presis forklaring når forsøket ikke når målet.
 * @param {Readonly<Level>} level
 * @param {State} state
 * @param {Card[]} cards
 * @returns {Result}
 */
function assess(level, state, cards) {
	const stored = state.serverMessages.filter((message) => matchesTarget(message, level.target));
	const visible = state.noah.messages.filter((message) => matchesTarget(message, level.target));
	const oneStored = stored.length === 1;
	const rightRoom = state.noah.room === level.target.rom;
	const exactVisible =
		visible.length === 1 && stored.some((message) => sameMessage(message, visible[0]));
	const checks = [
		{ id: 'stored-once', label: 'Adas melding ligger én gang på backend.', passed: oneStored },
		{
			id: 'right-room',
			label: 'Noah viser ' + roomName(level.target.rom) + '.',
			passed: rightRoom
		},
		{
			id: 'visible',
			label: 'Noah viser den samme meldingen som ligger på backend.',
			passed: exactVisible
		}
	];
	const success = checks.every((check) => check.passed);
	if (success)
		return {
			success,
			checks,
			title: 'Oppdrag fullført!',
			explanation:
				'Adas melding finnes én gang i ' +
				roomName(level.target.rom) +
				' på backend, og Noah viser den samme meldingen i sin egen kopi.',
			lesson: level.lesson
		};
	let explanation;
	if (stored.length === 0) {
		explanation =
			'Adas «Hei Noah!» finnes ikke på backend ennå. En GET kan bare hente meldinger som allerede er lagret.';
	} else if (stored.length > 1) {
		explanation =
			'Adas melding ligger ' +
			stored.length +
			' ganger på backend. Hver POST lagrer en ny melding, selv om teksten er lik. Oppdraget krever én kopi.';
	} else if (!rightRoom) {
		explanation =
			'Meldingen ligger i ' +
			roomName(level.target.rom) +
			', men Noah viser ' +
			roomName(state.noah.room) +
			'. Meldinger fra det andre rommet følger ikke med i denne listen.';
	} else {
		const lastNoahGet = cards.reduce(
			(last, card, index) => (card.actor === 'noah' && card.method === 'GET' ? index : last),
			-1
		);
		const lastPost = cards.reduce(
			(last, card, index) => (card.method === 'POST' ? index : last),
			-1
		);
		if (lastNoahGet >= 0 && lastNoahGet < lastPost) {
			explanation =
				'Meldingen finnes på backend. Noah hentet listen før den ble lagret, så hans kopi inneholder fortsatt de gamle meldingene.';
		} else if (cards.some((card) => card.id === 'ada-get-generelt') && lastNoahGet < 0) {
			explanation =
				'Ada hentet en ny liste til sin nettleser. Noah har en egen kopi som ikke ble oppdatert av Adas GET.';
		} else {
			explanation =
				'Meldingen finnes på backend, men mangler i Noahs kopi. Svaret på en POST går tilbake til den som sendte den; det oppdaterer ikke Noahs liste.';
		}
	}
	return { success, checks, title: 'Målet er ikke nådd ennå', explanation, lesson: level.lesson };
}

/**
 * @param {string} levelId
 * @param {string[]} actionIds
 * @returns {Attempt}
 */
export function planAttempt(levelId, actionIds) {
	const level = levelFor(levelId);
	if (!Array.isArray(actionIds) || actionIds.some((id) => typeof id !== 'string')) {
		throw new TypeError('Et forsøk må være en liste med kodekort.');
	}
	if (actionIds.length > MAX_ACTIONS)
		throw new RangeError('Et forsøk kan ha høyst ' + MAX_ACTIONS + ' handlinger.');
	const cards = actionIds.map((id) => actionFor(levelId, id));
	const work = initialState(levelId);
	/** @type {Step[]} */
	const steps = [];
	for (const [actionIndex, card] of cards.entries()) {
		const actor = actorName(card.actor);
		const isPost = card.method === 'POST';
		const path = isPost ? '/meldinger' : '/meldinger?rom=' + encodeURIComponent(card.room);
		const requestBody = isPost ? { ...level.target } : null;
		/** @type {ResponseBody|null} */
		let responseBody = null;
		/** @type {number|null} */
		let httpStatus = null;
		/**
		 * @param {Step['phase']} phase @param {Side} side @param {string[]} lineIds
		 * @param {string} title @param {string} explanation
		 */
		function add(phase, side, lineIds, title, explanation) {
			steps.push({
				...copyState(work),
				id: 'action-' + actionIndex + '-' + phase,
				actionIndex,
				actionId: card.id,
				actor: card.actor,
				side,
				phase,
				lineIds: [...lineIds],
				title,
				explanation,
				method: card.method,
				path,
				requestBody: requestBody ? { ...requestBody } : null,
				responseBody: copyResponse(responseBody),
				httpStatus
			});
		}
		add(
			'request',
			'frontend',
			isPost ? ['pf-data', 'pf-fetch', 'pf-body'] : ['gf-url', 'gf-fetch'],
			actor + ' sender ' + card.method,
			isPost
				? 'Adas nettleser sender rom, avsender og tekst til backend. Ingen meldingsliste er endret ennå.'
				: actor +
						' ber backend om ' +
						roomName(card.room) +
						'. Nettleseren viser fortsatt sin forrige kopi.'
		);
		if (isPost) {
			const created = { id: work.nextId++, ...level.target };
			work.serverMessages.push(created);
			add(
				'server',
				'backend',
				['pb-new', 'pb-push'],
				'Backend lagrer en ny melding',
				'POST legger «Hei Noah!» i ' +
					roomName(card.room) +
					' med ID ' +
					created.id +
					'. Ada og Noah har fortsatt sine egne, uendrede lister.'
			);
			responseBody = { beskjed: 'Meldingen er lagret.', melding: { ...created } };
			httpStatus = 201;
			add(
				'response',
				'backend',
				['pb-response'],
				'201 tilbake til Ada',
				'Backend sender en JSON-bekreftelse til Ada, som startet requesten. Dette svaret sendes ikke til Noah.'
			);
			add(
				'client',
				'frontend',
				['pf-json', 'pf-ok', 'pf-status'],
				'Ada leser bekreftelsen',
				'Ada får beskjed om at meldingen er lagret. Denne funksjonen henter ingen ny liste og endrer ikke det Noah viser.'
			);
		} else {
			const filtered = copyMessages(
				work.serverMessages.filter((message) => message.rom === card.room)
			);
			add(
				'server',
				'backend',
				['gb-room', 'gb-filter'],
				'Backend finner ' + roomName(card.room),
				'GET velger de ' +
					filtered.length +
					' meldingene som tilhører rommet. Den felles serverlisten endres ikke.'
			);
			responseBody = filtered;
			httpStatus = 200;
			add(
				'response',
				'backend',
				['gb-response'],
				'200 tilbake til ' + actor,
				'Backend sender rommets meldinger som JSON til ' +
					actor +
					'. Dataene er fortsatt ikke tatt i bruk av nettleseren.'
			);
			work[card.actor] = { room: card.room, messages: copyMessages(filtered) };
			add(
				'client',
				'frontend',
				['gf-json', 'gf-ok', 'gf-list', 'gf-room'],
				actor + ' viser den hentede listen',
				actor +
					' leser svaret og erstatter sin egen kopi med ' +
					filtered.length +
					' meldinger fra ' +
					roomName(card.room) +
					'. Den andre nettleseren beholder sin liste.'
			);
		}
	}
	return { steps, finalState: copyState(work), result: assess(level, work, cards) };
}

/** @param {string} prefix @param {Array<[string,string,string,string]>} rows @returns {CodeLine[]} */
function explained(prefix, rows) {
	return rows.map(([id, text, title, explanation]) => ({
		id: prefix + '-' + id,
		text,
		title,
		explanation
	}));
}

/** @param {string} levelId @param {string} actionId @param {Side} side @returns {CodeLine[]} */
export function codeLines(levelId, actionId, side) {
	const level = levelFor(levelId);
	const card = actionFor(levelId, actionId);
	if (side !== 'frontend' && side !== 'backend') throw new RangeError('Ukjent kodeside.');
	if (card.method === 'POST' && side === 'frontend')
		return explained('pf', [
			[
				'actor',
				'// Ada: ' + card.call,
				'Koden tilhører Ada',
				'Kortet kaller funksjonen i Adas nettleser. Det finnes ingen felles frontend-variabel som automatisk oppdaterer Noah.'
			],
			[
				'function',
				'async function sendMelding() {',
				'Funksjonen bak send-kortet',
				'Én kjøring sender én POST. Den henter ikke meldingslisten etterpå.'
			],
			[
				'data',
				'  const data = ' + JSON.stringify(level.target) + ';',
				'Dataene i requesten',
				'Dette brettet bruker fast rom, avsender og tekst. Avsenderen er øvingsdata; i en innlogget chat henter backend identiteten fra sessionen.'
			],
			[
				'try',
				'  try {',
				'Prøv å sende',
				'Nettverksfeil, feil i JSON og HTTP-feil håndteres av catch.'
			],
			[
				'fetch',
				'    const svar = await fetch(API + "/meldinger", {',
				'Start requesten fra Ada',
				'API peker på backend. Svaret fra dette kallet kommer tilbake til Adas funksjon.'
			],
			[
				'method',
				'      method: "POST",',
				'Opprett en ny melding',
				'Hver vellykket POST lagrer en ny melding. Lik tekst gjør ikke to POST-requests til én.'
			],
			[
				'headers',
				'      headers: { "Content-Type": "application/json" },',
				'Fortell at bodyen er JSON',
				'express.json() på backend kan da lese JSON-teksten som req.body.'
			],
			[
				'body',
				'      body: JSON.stringify(data)',
				'Gjør objektet om til JSON',
				'Rom, avsender og tekst sendes som data i HTTP-bodyen.'
			],
			[
				'fetch-end',
				'    });',
				'Vent på svaret',
				'await fortsetter når backend har svart. Noahs nettleser har ikke sendt denne requesten.'
			],
			[
				'json',
				'    const mottatt = await svar.json();',
				'Les bekreftelsen',
				'Et vellykket POST-svar inneholder en beskjed og den lagrede meldingen, ikke en oppdatering til alle nettlesere.'
			],
			[
				'ok',
				'    if (!svar.ok) throw new Error(mottatt.beskjed);',
				'Kontroller HTTP-status',
				'fetch kaster ikke automatisk ved et HTTP-feilsvar. Denne kontrollen leder slike svar til catch.'
			],
			[
				'status',
				'    status = mottatt.beskjed;',
				'Vis bekreftelsen hos Ada',
				'Denne linjen endrer bare Adas statusfelt. Den setter verken Adas eller Noahs meldingsliste.'
			],
			[
				'catch',
				'  } catch (feil) {',
				'Håndter feil',
				'Feil vises i den nettleseren som prøvde å sende.'
			],
			[
				'error',
				'    status = feil instanceof Error ? feil.message : "Ukjent feil";',
				'Gi en lesbar feilmelding',
				'Funksjonen forklarer at sendingen feilet, i stedet for å vise en falsk bekreftelse.'
			],
			['catch-end', '  }', 'Avslutt feilhåndteringen', 'Her slutter catch-blokken.'],
			['end', '}', 'Avslutt funksjonen', 'En ny melding krever at sendMelding kalles på nytt.']
		]);
	if (card.method === 'POST' && side === 'backend')
		return explained('pb', [
			[
				'route',
				'app.post("/meldinger", (req, res) => {',
				'Ta imot POST',
				'Denne ruten kjører på serveren. JSON-middleware må være registrert før ruten.'
			],
			[
				'body',
				'  const { rom, avsender, tekst } = req.body ?? {};',
				'Les bodyen',
				'Faste øvingsdata fra kortet blir lest fra req.body. En virkelig innlogget chat bør hente avsenderen fra sessionen.'
			],
			[
				'check-room',
				'  if (!["generelt", "gaming"].includes(rom) ||',
				'Kontroller rommet',
				'Backend godtar bare et rom som finnes i denne øvelsen.'
			],
			[
				'check-sender',
				'      typeof avsender !== "string" || !avsender.trim() ||',
				'Kontroller avsenderfeltet',
				'Dette enkle eksemplet krever tekst i feltet. Det er validering av data, ikke autentisering.'
			],
			[
				'check-text',
				'      typeof tekst !== "string" || !tekst.trim()) {',
				'Kontroller meldingsteksten',
				'Tom tekst, bare mellomrom og verdier av feil type avvises.'
			],
			[
				'bad',
				'    return res.status(400).json({ beskjed: "Ugyldig melding." });',
				'Avvis ugyldige data',
				'return stopper ruten før en ny melding eller ID blir laget. Kortene i dette spillet sender gyldige øvingsdata.'
			],
			[
				'check-end',
				'  }',
				'Fortsett med gyldige data',
				'Når kontrollen er passert, kan backend opprette meldingen.'
			],
			[
				'new',
				'  const ny = { id: nesteId++, rom, avsender, tekst };',
				'Gi meldingen en egen ID',
				'En stigende teller gjør at to like tekster fortsatt er to forskjellige meldinger.'
			],
			[
				'push',
				'  meldinger.push(ny);',
				'Endre den felles serverlisten',
				'Meldingen ligger nå på backend. Denne linjen endrer ingen nettlesers lokale kopi.'
			],
			[
				'response',
				'  res.status(201).json({ beskjed: "Meldingen er lagret.", melding: ny });',
				'Svar til den som sendte',
				'Status 201 bekrefter opprettelsen. Svaret går til Adas POST-request og sendes ikke videre til Noah.'
			],
			[
				'end',
				'});',
				'Avslutt ruten',
				'Ruten registreres én gang og håndterer deretter hver POST som en ny request.'
			]
		]);
	if (side === 'frontend')
		return explained('gf', [
			[
				'actor',
				'// ' + actorName(card.actor) + ': ' + card.call,
				'Denne nettleseren utfører kortet',
				'Kortet kjører hos ' +
					actorName(card.actor) +
					' og ber om ' +
					roomName(card.room) +
					'. Den andre nettleseren blir ikke oppdatert.'
			],
			[
				'function',
				'async function hentRom(valgtRom) {',
				'Funksjonen bak hent-kortet',
				'Kortets romverdi sendes inn som valgtRom. Hver nettleser har sin egen funksjonskjøring og meldingsliste.'
			],
			[
				'try',
				'  try {',
				'Prøv å hente',
				'Feil fra requesten og behandlingen av svaret fanges opp av catch.'
			],
			[
				'url',
				'    const url = API + "/meldinger?rom=" + encodeURIComponent(valgtRom);',
				'Send romvalget i URL-en',
				'Query-verdien blir req.query.rom på backend. Riktig rom må sendes i akkurat denne requesten.'
			],
			[
				'fetch',
				'    const svar = await fetch(url);',
				'Send GET fra nettleseren',
				'GET er standardmetoden til fetch. Den ber om data som allerede finnes på backend.'
			],
			[
				'json',
				'    const mottatt = await svar.json();',
				'Les JSON-svaret',
				'Nettleseren lager sin egen JavaScript-liste fra responsen. Den deler ikke minne med backend.'
			],
			[
				'ok',
				'    if (!svar.ok) throw new Error(mottatt.beskjed);',
				'Kontroller svaret',
				'Ved en HTTP-feil skal den gamle visningen beholdes og en feil vises.'
			],
			[
				'list',
				'    meldinger = mottatt;',
				'Oppdater bare denne nettleserens liste',
				'Her erstattes den lokale kopien. Hvis kortet kjører hos Noah, er det Noahs meldinger som endres.'
			],
			[
				'room',
				'    vistRom = valgtRom;',
				'Vis hvilket rom listen gjelder',
				'Romnavnet oppdateres sammen med den hentede listen, slik at det passer til dataene.'
			],
			[
				'status',
				'    status = "Hentet " + meldinger.length + " meldinger.";',
				'Vis at hentingen er ferdig',
				'Antallet gjelder denne responsen, ikke alle meldingene som ligger på serveren.'
			],
			[
				'catch',
				'  } catch (feil) {',
				'Håndter feil',
				'Et mislykket forsøk oppdaterer ikke meldingslisten.'
			],
			[
				'error',
				'    status = feil instanceof Error ? feil.message : "Ukjent feil";',
				'Vis feilen lokalt',
				'Feilmeldingen settes bare i nettleseren som sendte requesten.'
			],
			['catch-end', '  }', 'Avslutt feilhåndteringen', 'Her slutter catch-blokken.'],
			[
				'end',
				'}',
				'Avslutt hent-funksjonen',
				'Neste henting krever et nytt kall; serverendringer vises ikke automatisk.'
			]
		]);
	return explained('gb', [
		[
			'route',
			'app.get("/meldinger", (req, res) => {',
			'Ta imot GET',
			'Den samme serverruten kan motta requests fra både Ada og Noah. Hver request har sitt eget svar.'
		],
		[
			'room',
			'  const rom = req.query.rom;',
			'Les rommet fra query',
			'Backend bruker rommet i URL-en til akkurat denne requesten.'
		],
		[
			'check',
			'  if (!["generelt", "gaming"].includes(rom)) {',
			'Kontroller romvalget',
			'Manglende eller ukjent rom avvises. Kortene ber om ett av de to kjente rommene.'
		],
		[
			'bad',
			'    return res.status(400).json({ beskjed: "Ukjent rom." });',
			'Avvis ukjent rom',
			'return stopper ruten før den lager en romliste.'
		],
		[
			'check-end',
			'  }',
			'Fortsett med et kjent rom',
			'Gyldig romvalg kommer videre til filtreringen.'
		],
		[
			'filter',
			'  const filtrert = meldinger.filter(melding => melding.rom === rom);',
			'Velg meldinger fra dette rommet',
			'filter lager en ny liste. Backendens felles liste beholder meldingene fra begge rom.'
		],
		[
			'response',
			'  res.json(filtrert);',
			'Svar 200 til den som spurte',
			'JSON-listen går tilbake til nettleseren som sendte denne GET-requesten. Den andre nettleseren får ingen ny liste.'
		],
		[
			'end',
			'});',
			'Avslutt GET-ruten',
			'En senere request kan få andre data hvis serverlisten er endret i mellomtiden.'
		]
	]);
}
