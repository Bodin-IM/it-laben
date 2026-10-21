<script>
	// Hele øvingen er en lokal simulering. Ingen ekte cookies eller innlogging opprettes.
	/** @typedef {'A' | 'B'} ProfilId */
	/** @typedef {{ id: string, navn: string }} Bruker */
	/** @typedef {{ navn: string, cookie: string | null, bekreftetNavn: string | null }} Profil */
	/** @typedef {{ id: string, bruker: Bruker }} DemoSession */
	/** @typedef {'logginn' | 'meg' | 'loggut'} Handling */
	/**
	 * @typedef {{
	 *   handling: Handling, profil: ProfilId, metode: 'GET' | 'POST', sti: string,
	 *   navn: string, cookie: string | null, credentials: boolean
	 * }} DemoRequest
	 */
	/**
	 * @typedef {{
	 *   status: number, body: { bruker: Bruker } | { beskjed: string } | null,
	 *   settCookie: string | null, slettCookie: boolean
	 * }} DemoResponse
	 */

	/** @returns {Record<ProfilId, Profil>} */
	const nyeProfiler = () => ({
		A: { navn: 'Ada', cookie: null, bekreftetNavn: null },
		B: { navn: 'Noah', cookie: null, bekreftetNavn: null }
	});
	const profilerId = /** @type {ProfilId[]} */ (['A', 'B']);
	let profiler = $state(nyeProfiler());
	/** @type {ProfilId} */
	let valgtProfil = $state('A');
	let profil = $derived(profiler[valgtProfil]);
	/** @type {DemoSession[]} */
	let sessioner = $state([]);
	let sendCredentials = $state(true);
	let fase = $state(0);
	let opptatt = $derived(fase === 1 || fase === 2);
	let nesteId = $state(1);
	/** @type {DemoRequest | null} */
	let request = $state(null);
	/** @type {DemoResponse | null} */
	let response = $state(null);
	let reqSession = $state('// Venter på en request.');
	let oppslattId = $state('');
	let forklaring = $state('Start med «Hent /meg» før du logger inn. Hva kan serveren vite om deg?');
	let ferdig = $state([false, false, false]);
	let kodevalg = $state('oppsett');
	const flytsteg = ['Nettleseren sender', 'Backend behandler', 'Nettleseren mottar'];
	/** @param {unknown} verdi */
	const json = (verdi) => JSON.stringify(verdi, null, 2) ?? 'null';

	/** @param {string} tekst */
	function tømRequest(tekst) {
		request = null;
		response = null;
		fase = 0;
		oppslattId = '';
		reqSession = '// Venter på en request.';
		forklaring = tekst;
	}
	/** @param {ProfilId} id */
	function byttProfil(id) {
		valgtProfil = id;
		tømRequest('Du bruker nå profil ' + id + '. Den har sin egen cookie. Prøv «Hent /meg».');
	}
	/** @param {Handling} handling */
	function start(handling) {
		if (opptatt || (handling === 'logginn' && !profil.navn.trim())) return;
		request = {
			handling,
			profil: valgtProfil,
			metode: handling === 'meg' ? 'GET' : 'POST',
			sti: handling === 'meg' ? '/meg' : handling === 'logginn' ? '/logginn' : '/loggut',
			navn: profil.navn.trim(),
			cookie: sendCredentials ? profil.cookie : null,
			credentials: sendCredentials
		};
		response = null;
		reqSession = '// Requesten er på vei til backend.';
		oppslattId = '';
		fase = 1;
		forklaring = request.cookie
			? 'Nettleseren legger session-ID-en i Cookie-headeren. Nå må backend slå opp denne ID-en.'
			: !sendCredentials
				? 'Disse adressene har ulike origins. Uten credentials: "include" sender fetch ingen session-cookie.'
				: 'Requesten har ingen session-cookie. Backend har derfor ingen tidligere innlogging å slå opp.';
	}
	function neste() {
		const aktiv = request;
		if (!aktiv || !opptatt) return;
		if (fase === 1) {
			const funnet = sessioner.find((session) => session.id === aktiv.cookie);
			oppslattId = funnet?.id ?? '';
			reqSession = funnet
				? json({ cookie: { httpOnly: true, sameSite: 'lax', path: '/' }, bruker: funnet.bruker })
				: '{\n  cookie: { /* cookie-innstillinger */ }\n}\n// req.session.bruker er undefined.';

			if (aktiv.handling === 'logginn') {
				// Korte, synlige demo-ID-er. Ekte session-ID-er genereres tilfeldig av middleware.
				const biter = ['q7Kp2x', 'v4Lm8a', 'n9Rh3c', 't6Ws5b'];
				const id = 'demo_' + biter[(nesteId - 1) % biter.length] + '_' + nesteId++;
				const bruker = { id: 'elev-' + aktiv.profil.toLowerCase(), navn: aktiv.navn };
				sessioner = [...sessioner.filter((session) => session.id !== aktiv.cookie), { id, bruker }];
				oppslattId = id;
				reqSession = json({ cookie: { httpOnly: true, sameSite: 'lax', path: '/' }, bruker });
				response = { status: 200, body: { bruker }, settCookie: id, slettCookie: false };
				forklaring =
					'I demoen godtar vi visningsnavnet. Backend lager en ny session-ID og lagrer brukeren på serveren. I ekte pålogging må identiteten kontrolleres først.';
			} else if (aktiv.handling === 'meg') {
				response = {
					status: funnet ? 200 : 401,
					body: funnet ? { bruker: funnet.bruker } : { beskjed: 'Du er ikke logget inn.' },
					settCookie: null,
					slettCookie: false
				};
				forklaring = funnet
					? 'Backend fant sessionen. Middleware gjør brukerdataene tilgjengelige i req.session, og /meg kan svare med brukeren.'
					: aktiv.cookie
						? 'Cookie kom frem, men ID-en finnes ikke lenger i sessionlageret. /meg svarer 401.'
						: 'Ingen session-ID fulgte requesten. req.session har ingen innlogget bruker, så /meg svarer 401.';
			} else {
				sessioner = sessioner.filter((session) => session.id !== aktiv.cookie);
				reqSession =
					'// req.session.destroy() er utført for denne requesten.\n// Andre sessioner er fortsatt i lageret.';
				response = { status: 204, body: null, settCookie: null, slettCookie: true };
				forklaring = funnet
					? 'Backend fjerner sessionen fra lageret. Svaret ber også nettleseren fjerne cookien med samme navn og path.'
					: 'Backend fant ingen innlogget session for denne requesten. Svaret ber likevel nettleseren fjerne session-cookien.';
			}
			fase = 2;
			return;
		}
		const svar = response;
		if (!svar) return;
		const mottaker = profiler[aktiv.profil];
		if (aktiv.credentials) {
			if (svar.settCookie) mottaker.cookie = svar.settCookie;
			if (svar.slettCookie) mottaker.cookie = null;
		}
		mottaker.bekreftetNavn = svar.body && 'bruker' in svar.body ? svar.body.bruker.navn : null;
		fase = 3;
		if (aktiv.handling === 'logginn') {
			forklaring = aktiv.credentials
				? 'Profil ' +
					aktiv.profil +
					' lagrer session-ID-en fra Set-Cookie. Navnet ligger i sessiondata på serveren. Prøv nå «Hent /meg».'
				: 'Serveren har laget en session, men nettleseren lagrer ikke Set-Cookie uten credentials: "include" i dette oppsettet. Prøv «Hent /meg».';
		} else if (aktiv.handling === 'meg') {
			forklaring =
				svar.status === 200
					? '200 OK. Frontend kan vise brukeren fra svarbodyen. Neste forespørsel må også sende cookie og kontrolleres på backend.'
					: aktiv.cookie
						? '401. Nettleseren sendte en ID, men serveren hadde ingen gyldig session til den. En cookie alene beviser ikke at du er logget inn.'
						: '401. Backend fikk ingen session-ID. Se på Cookie-headeren og credentials-innstillingen før du leter videre.';
		} else {
			forklaring = aktiv.credentials
				? '204 No Content. Sessionen er fjernet, og nettleseren har slettet cookien. «Hent /meg» vil nå gi 401.'
				: '204, men cookien ble verken sendt eller fjernet. En tidligere session kan fortsatt finnes. Slå på credentials og prøv «Hent /meg».';
		}
	}
	/** @param {string} id */
	function laUtløpe(id) {
		const gammel = sessioner.find((session) => session.id === id);
		sessioner = sessioner.filter((session) => session.id !== id);
		tømRequest(
			'Sessionen til ' +
				(gammel?.bruker.navn ?? 'brukeren') +
				' er nå utløpt på serveren. Demoen lar cookien bli igjen, slik at neste «Hent /meg» viser hva en utdatert ID gir.'
		);
	}
	function nullstill() {
		profiler = nyeProfiler();
		valgtProfil = 'A';
		sessioner = [];
		sendCredentials = true;
		nesteId = 1;
		tømRequest('Alt er nullstilt. Start med «Hent /meg» før du logger inn.');
	}
	let requestTekst = $derived.by(() =>
		request
			? [
					request.metode + ' ' + request.sti,
					'Origin: http://localhost:5173',
					...(request.handling === 'logginn' ? ['Content-Type: application/json'] : []),
					request.cookie ? 'Cookie: itlab.sid=' + request.cookie : '// Ingen Cookie-header',
					'',
					request.handling === 'logginn' ? json({ visningsnavn: request.navn }) : '// Ingen body'
				].join('\n')
			: '// Send en forespørsel fra nettleserpanelet.'
	);
	let responseTekst = $derived.by(() =>
		response
			? [
					String(response.status) +
						(response.status === 200
							? ' OK'
							: response.status === 401
								? ' Unauthorized'
								: ' No Content'),
					'Access-Control-Allow-Origin: http://localhost:5173',
					'Access-Control-Allow-Credentials: true',
					...(response.settCookie
						? ['Set-Cookie: itlab.sid=' + response.settCookie + '; Path=/; HttpOnly; SameSite=Lax']
						: []),
					...(response.slettCookie
						? [
								'Set-Cookie: itlab.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax'
							]
						: []),
					'',
					response.body ? json(response.body) : '// Ingen body ved 204'
				].join('\n')
			: '// Venter på at backend skal behandle requesten.'
	);

	const kodebiter = [
		{
			id: 'oppsett',
			navn: '1. Middleware',
			sted: 'EXPRESS-BACKEND',
			tittel: 'Gi Express et sessionlager.',
			intro:
				'Installer express-session og cors i backend-prosjektet. Legg middleware før rutene som bruker req.session.',
			kode: [
				'import express from "express";',
				'import session from "express-session";',
				'import cors from "cors";',
				'',
				'const app = express();',
				'const secret = process.env.SESSION_SECRET;',
				'if (!secret) throw new Error("SESSION_SECRET mangler");',
				'',
				'app.use(cors({',
				'  origin: "http://localhost:5173",',
				'  credentials: true',
				'}));',
				'app.use(express.json());',
				'',
				'const cookieOptions = {',
				'  path: "/",',
				'  httpOnly: true,',
				'  sameSite: "lax",',
				'  secure: false // Kun den lokale HTTP-øvelsen.',
				'};',
				'',
				'app.use(session({',
				'  name: "itlab.sid",',
				'  secret,',
				'  resave: false,',
				'  saveUninitialized: false,',
				'  cookie: { ...cookieOptions, maxAge: 30 * 60 * 1000 }',
				'}));',
				'',
				'// Påloggingsruter og beskyttede ruter kommer her.',
				'app.listen(3000);'
			].join('\n'),
			forklaring:
				'saveUninitialized: false gjør at en ny, uendret session ikke lagres. resave: false unngår å lagre den på nytt bare fordi en forespørsel ble lest. maxAge er cookiens levetid i millisekunder.'
		},
		{
			id: 'innlogging',
			navn: '2. Etter pålogging',
			sted: 'INNE I POST /logginn',
			tittel: 'Kontroller identiteten før du lagrer brukeren.',
			intro:
				'Dette er et utdrag etter vellykket autentisering. Variabelen bruker må komme fra en reell kontroll av innloggingen, ikke bare kopieres fra req.body. Demoen over hopper over denne kontrollen.',
			kode: [
				'// Inne i en påloggingsrute med (req, res, next).',
				'// Identiteten er allerede kontrollert.',
				'// bruker er brukeren som kontrollen fant.',
				'',
				'req.session.regenerate((feil) => {',
				'  if (feil) return next(feil);',
				'',
				'  req.session.bruker = {',
				'    id: bruker.id,',
				'    navn: bruker.navn',
				'  };',
				'',
				'  req.session.save((feil) => {',
				'    if (feil) return next(feil);',
				'    res.json({ bruker: req.session.bruker });',
				'  });',
				'});'
			].join('\n'),
			forklaring:
				'regenerate gir en ny session-ID etter pålogging. Dataene lagres før svaret sendes. Lagre den informasjonen du trenger for å kjenne igjen brukeren; passordet skal ikke ligge i sessionen.'
		},
		{
			id: 'ruter',
			navn: '3. /meg og utlogging',
			sted: 'EXPRESS-BACKEND',
			tittel: 'Kontroller sessionen ved hver beskyttet request.',
			intro:
				'Middleware finner sessionen før ruten kjører. Ruten avgjør om brukeren får tilgang. Det holder ikke å skjule en knapp i frontend.',
			kode: [
				'app.get("/meg", (req, res) => {',
				'  if (!req.session.bruker) {',
				'    return res.status(401).json({',
				'      beskjed: "Du er ikke logget inn."',
				'    });',
				'  }',
				'  res.json({ bruker: req.session.bruker });',
				'});',
				'',
				'app.post("/loggut", (req, res, next) => {',
				'  req.session.destroy((feil) => {',
				'    if (feil) return next(feil);',
				'    // Samme navn og cookieOptions som i oppsettet.',
				'    // Ikke ta med maxAge eller expires her.',
				'    res.clearCookie("itlab.sid", cookieOptions);',
				'    res.sendStatus(204);',
				'  });',
				'});'
			].join('\n'),
			forklaring:
				'destroy fjerner sessionen på serveren. clearCookie ber nettleseren slette cookien. Cookienavn, path og eventuell domain må samsvare med cookien som ble satt.'
		},
		{
			id: 'frontend',
			navn: '4. Fetch',
			sted: 'SVELTE-FRONTEND',
			tittel: 'La nettleseren ta med cookien.',
			intro:
				'Når frontend og backend har ulike origins, bruker vi credentials: "include" på pålogging, henting og utlogging. Nettleseren setter Cookie-headeren selv.',
			kode: [
				'const API = "http://localhost:3000";',
				'',
				'// POST /logginn: send deres faktiske innloggingsfelt.',
				'const svar = await fetch(API + "/logginn", {',
				'  method: "POST",',
				'  credentials: "include",',
				'  headers: { "Content-Type": "application/json" },',
				'  body: JSON.stringify({ brukernavn, passord })',
				'});',
				'if (!svar.ok) throw new Error("Innloggingen mislyktes");',
				'',
				'// GET /meg: spør backend hvem du er.',
				'async function hentMeg() {',
				'  const svar = await fetch(API + "/meg", {',
				'    credentials: "include"',
				'  });',
				'  if (svar.status === 401) return null;',
				'  if (!svar.ok) throw new Error("Kunne ikke hente bruker");',
				'  return (await svar.json()).bruker;',
				'}',
				'',
				'// POST /loggut: 204 har ingen JSON-body.',
				'async function loggUt() {',
				'  const svar = await fetch(API + "/loggut", {',
				'    method: "POST",',
				'    credentials: "include"',
				'  });',
				'  if (!svar.ok) throw new Error("Kunne ikke logge ut");',
				'}'
			].join('\n'),
			forklaring:
				'Dette er separate utdrag til funksjonene deres, ikke én blokk som skal kjøres når siden lastes. Kall funksjonene fra hendelser, fang feil og oppdater Svelte-state med svaret.'
		}
	];
	let aktivKode = $derived(kodebiter.find((bit) => bit.id === kodevalg) ?? kodebiter[0]);
	const forsøk = [
		{
			tittel: 'Følg én innlogging',
			oppgave:
				'Hent /meg før pålogging. Logg så inn i A, fullfør reisen og hent /meg igjen. Hvilke headere går hver vei?',
			hint: 'Set-Cookie kommer i svaret fra serveren. Cookie følger senere forespørsler fra nettleseren. Selve navnet finnes i sessiondata på serveren.'
		},
		{
			tittel: 'To profiler, to identiteter',
			oppgave:
				'Logg inn som Ada i A og Noah i B. Bytt mellom profilene og hent /meg. Logg ut av A. Hva skjer med B?',
			hint: 'A og B har hvert sitt cookielager. Utlogging fjerner sessionen som hører til ID-en requesten sendte. To vanlige faner i samme profil deler normalt cookie.'
		},
		{
			tittel: 'Finn to grunner til 401',
			oppgave:
				'Logg inn, slå av credentials og hent /meg. Slå dem på igjen. La deretter sessionen utløpe på serveren og hent /meg på nytt.',
			hint: 'I første tilfelle mangler Cookie-headeren. I andre tilfelle sendes en cookie, men sessionen bak ID-en finnes ikke lenger. Samme statuskode kan ha ulike årsaker.'
		}
	];
</script>

<svelte:head>
	<title>Sessions og cookies · IT-laben</title>
	<meta
		name="description"
		content="Utforsk hvordan en session-ID i en cookie kobler nettleseren til sessiondata på serveren. En interaktiv øving med Svelte og Express for Vg2 IT."
	/>
</svelte:head>

<div class="side">
	<header>
		<a class="tilbake" href="/"
			><span aria-hidden="true">←</span> IT-laben<span class="skille"> / </span><span class="fag"
				>Vg2 IT</span
			></a
		>
		<span class="merke"><i aria-hidden="true"></i> SE. PRØV. FORSTÅ.</span>
	</header>
	<main>
		<section class="intro">
			<div>
				<p class="overlinje">UTVIKLING / SESSIONS OG COOKIES</p>
				<h1>Hvordan husker<br /><em>serveren deg?</em></h1>
				<p class="ingress">
					Du logger inn, og neste forespørsel vet fortsatt hvem du er. Følg den lille ID-en som
					kobler nettleseren til informasjonen på serveren.
				</p>
				<a class="hopp" href="#simulering">Prøv en innlogging <span aria-hidden="true">↓</span></a>
			</div>
			<div class="introkort" aria-label="Cookie med ID peker til brukerdata på serveren">
				<p class="overlinje">SAMME ID. TO ULIKE STEDER.</p>
				<div class="introledd">
					<span>NETTLESER</span><b>Cookie</b><code>itlab.sid = q7Kp…</code>
				</div>
				<div class="kobling"><span aria-hidden="true">↓</span> Slå opp ID-en</div>
				<div class="introledd serverledd">
					<span>SERVER</span><b>Sessiondata</b><code>{'q7Kp… → { navn: "Ada" }'}</code>
				</div>
				<p class="kortfot">ID-en gir ingen mening uten sessionen på serveren.</p>
			</div>
		</section>

		<div class="grunnlag">
			<article>
				<span class="nummer">01</span>
				<h2>HTTP husker ikke</h2>
				<p>
					HTTP er tilstandsløst. Hver request må ha med det backend trenger for å knytte den til en
					innlogging.
				</p>
			</article>
			<article>
				<span class="nummer">02</span>
				<h2>Cookien bærer en ID</h2>
				<p>
					Nettleseren lagrer en cookie for backend. Med <code>express-session</code> inneholder den en
					ID, mens brukerdataene ligger på serveren.
				</p>
			</article>
			<article>
				<span class="nummer">03</span>
				<h2>Backend sjekker igjen</h2>
				<p>
					Session-middleware slår opp ID-en. Ruten kan så lese <code>req.session.bruker</code> og avgjøre
					om requesten får tilgang.
				</p>
			</article>
		</div>

		<section class="demo" id="simulering" aria-labelledby="demotittel">
			<div class="seksjonstopp">
				<div>
					<p class="overlinje">INTERAKTIV SIMULERING</p>
					<h2 id="demotittel">Følg en session.</h2>
				</div>
				<button class="diskret" onclick={nullstill} disabled={opptatt}>↶ Nullstill demo</button>
			</div>
			<p class="demomerknad">
				<b>Kun en lokal øvingsdemo.</b> Vi godtar et valgt visningsnavn uten å kontrollere passord. Ingen
				ekte innlogging, nettverkskall eller cookies opprettes på IT-laben.
			</p>
			<div class="flyt">
				<ol aria-label="Forespørselens tre steg">
					{#each flytsteg as steg, i}
						<li
							class:aktiv={fase === i + 1}
							class:ferdig={fase > i + 1}
							aria-current={fase === i + 1 ? 'step' : undefined}
						>
							<span>{fase > i + 1 ? '✓' : i + 1}</span>{steg}
						</li>
					{/each}
				</ol>
				<button class="primaer neste" onclick={neste} disabled={!opptatt}
					>{fase === 2 ? 'Motta svaret →' : 'Behandle på backend →'}</button
				>
			</div>
			<div class="demogrid">
				<article class="nettleser panel">
					<div class="paneltopp"><b>Nettleseren</b><span>FRONTEND</span></div>
					<div class="panelinnhold">
						<p class="adresse">http://localhost:5173</p>
						<div class="profilvalg" role="group" aria-label="Velg nettleserprofil">
							{#each profilerId as id}
								<button
									class:valgt={valgtProfil === id}
									aria-pressed={valgtProfil === id}
									onclick={() => byttProfil(id)}
									disabled={opptatt}
									><span class="profilbokstav">{id}</span><span
										>Profil {id}<small>{profiler[id].cookie ? 'Har cookie' : 'Ingen cookie'}</small
										></span
									></button
								>
							{/each}
						</div>
						<p class="liten profilforklaring">
							Separate nettleserprofiler, ikke to faner. Vanlige faner i samme profil deler normalt
							cookies.
						</p>
						<label for="visningsnavn">Visningsnavn i demoen</label>
						<input
							id="visningsnavn"
							bind:value={profiler[valgtProfil].navn}
							maxlength="24"
							disabled={opptatt}
							autocomplete="off"
						/>
						<div class="handlingsknapper">
							<button
								class="primaer"
								onclick={() => start('logginn')}
								disabled={opptatt || !profil.navn.trim()}>Logg inn (demo)</button
							>
							<button onclick={() => start('meg')} disabled={opptatt}>Hent /meg</button>
							<button onclick={() => start('loggut')} disabled={opptatt}>Logg ut</button>
						</div>
						<div class="cookieboks">
							<div class="litenoverskrift">
								<b>Cookie for backend</b><span>{profil.cookie ? 'LAGRET' : 'TOMT'}</span>
							</div>
							<code>{profil.cookie ? 'itlab.sid=' + profil.cookie : 'Ingen session-cookie'}</code>
							<p>Her ligger en ID. Brukerens navn og øvrige sessiondata ligger på serveren.</p>
						</div>
						<div class="sistbekreftet">
							<span>Sist bekreftet i et svar</span><b>{profil.bekreftetNavn ?? 'Ingen bruker'}</b>
						</div>
						<p class="liten">
							Denne visningen er frontend-state. Den vet ikke om sessionen er utløpt før backend
							blir spurt igjen.
						</p>
					</div>
				</article>

				<article class="server panel">
					<div class="paneltopp"><b>Serveren</b><span>NODE + EXPRESS</span></div>
					<div class="panelinnhold">
						<p class="adresse">http://localhost:3000</p>
						<div class="litenoverskrift">
							<h3>Sessionlager</h3>
							<span>{sessioner.length} {sessioner.length === 1 ? 'SESSION' : 'SESSIONER'}</span>
						</div>
						<div class="sessionliste">
							{#each sessioner as session (session.id)}
								<div class="sessionrad" class:treff={oppslattId === session.id}>
									<div class="sessionid">
										<span aria-hidden="true">↳</span><code>{session.id}</code><span
											class="treffmerke">{oppslattId === session.id ? 'VALGT' : ''}</span
										>
									</div>
									<div class="sessiondata">
										<code>{json({ bruker: session.bruker })}</code><button
											class="utløp"
											onclick={() => laUtløpe(session.id)}
											disabled={opptatt}>La utløpe</button
										>
									</div>
								</div>
							{:else}
								<div class="tomt">
									<span aria-hidden="true">{'{ }'}</span><b>Ingen lagrede sessioner</b>
									<p>Logg inn og se hva backend lagrer.</p>
								</div>
							{/each}
						</div>
						<p class="liten">
							«La utløpe» fjerner sessionen på serveren. I denne testen lar vi en gammel cookie bli
							igjen i nettleseren.
						</p>
						<div class="reqsession">
							<div class="litenoverskrift"><b>req.session</b><span>DENNE REQUESTEN</span></div>
							<pre>{reqSession}</pre>
						</div>
						<p class="liten">
							Uten innlogget bruker kan Express ha en tom, ulagret session. <code
								>req.session.bruker</code
							>
							er da <code>undefined</code>.
						</p>
					</div>
				</article>
			</div>

			<div class="forklaring" role="status" aria-atomic="true">
				<span aria-hidden="true">{fase ? String(fase).padStart(2, '0') : '→'}</span>
				<p>{forklaring}</p>
			</div>

			<div class="credentials">
				<div>
					<label class="bryter"
						><input
							type="checkbox"
							checked={sendCredentials}
							disabled={opptatt}
							onchange={(event) => {
								sendCredentials = event.currentTarget.checked;
								tømRequest(
									'Innstillingen gjelder neste request. Prøv «Hent /meg» og se om Cookie-headeren følger med.'
								);
							}}
						/><span>Ta med credentials</span><code
							>{sendCredentials ? '"include"' : '"same-origin" (standard)'}</code
						></label
					>
					<p class="liten">
						Innstilling for neste fetch. Port 5173 og 3000 er ulike origins. CORS er riktig satt opp
						i demoen.
					</p>
				</div>
				<span class="testtips">Prøv etter at du har logget inn ↗</span>
			</div>
			<div class="httpgrid">
				<div class="httpkort">
					<div class="litenoverskrift">
						<h3>Request <span aria-hidden="true">↗</span></h3>
						<span>{request ? 'FRA PROFIL ' + request.profil : 'NETTLESER → SERVER'}</span>
					</div>
					<pre>{requestTekst}</pre>
				</div>
				<div class="httpkort">
					<div class="litenoverskrift">
						<h3>Response <span aria-hidden="true">↙</span></h3>
						<span class:feilstatus={response?.status === 401}
							>{response ? String(response.status) : 'SERVER → NETTLESER'}{fase === 2
								? ' · PÅ VEI'
								: ''}</span
						>
					</div>
					<pre>{responseTekst}</pre>
				</div>
			</div>
			<p class="liten demofot">
				HTTP-utdragene er forenklet. Ekte session-ID-er er lange og tilfeldige. Signaturen og
				URL-kodingen som express-session bruker i cookieverdien, er utelatt her. Nettleseren
				håndterer <code>Cookie</code> og <code>Set-Cookie</code>; frontend setter ikke disse
				headerne selv.
			</p>
		</section>

		<section class="oppgaver" aria-labelledby="forsøktittel">
			<div class="seksjonstopp">
				<div>
					<p class="overlinje">PRØV. FORKLAR. TEST IGJEN.</p>
					<h2 id="forsøktittel">Tre små forsøk.</h2>
				</div>
				<span class="antall">{ferdig.filter(Boolean).length} / 3 prøvd</span>
			</div>
			<div class="forsøkgrid">
				{#each forsøk as forsøk, i}
					<article>
						<span class="forsøknummer">0{i + 1}</span>
						<h3>{forsøk.tittel}</h3>
						<p>{forsøk.oppgave}</p>
						<details>
							<summary>Vis et hint <span aria-hidden="true">+</span></summary>
							<p>{forsøk.hint}</p>
						</details>
						<label class="sjekk"
							><input type="checkbox" bind:checked={ferdig[i]} />Jeg kan forklare hva som skjedde.</label
						>
					</article>
				{/each}
			</div>
		</section>

		<section class="kodehjelp" aria-labelledby="kodetittel">
			<div class="seksjonstopp">
				<div>
					<p class="overlinje">FRA SIMULERING TIL EGET PROSJEKT</p>
					<h2 id="kodetittel">De små delene du trenger.</h2>
				</div>
				<span class="antall">SVELTE + EXPRESS</span>
			</div>
			<p class="seksjonsintro">
				Sessionpakken skal installeres i <b>deres Express-backend</b>. Kodebitene hører hjemme i
				elevprosjektet; de skal ikke legges inn i IT-labens Svelte-app.
			</p>
			<div class="installasjon">
				<span>I backend-mappen</span><code>npm install express-session cors</code>
			</div>
			<div class="kodeflate">
				<nav class="kodemeny" aria-label="Velg kodeforklaring">
					{#each kodebiter as bit}<button
							class:valgt={kodevalg === bit.id}
							aria-pressed={kodevalg === bit.id}
							onclick={() => (kodevalg = bit.id)}
							>{bit.navn}<span aria-hidden="true">→</span></button
						>{/each}
				</nav>
				<article class="kodeinnhold">
					<p class="overlinje">{aktivKode.sted}</p>
					<h3>{aktivKode.tittel}</h3>
					<p>{aktivKode.intro}</p>
					<div class="kodevindu">
						<div>
							<span aria-hidden="true">● ● ●</span><span
								>{aktivKode.id === 'frontend' ? 'FRONTEND / UTDRAG' : 'BACKEND / UTDRAG'}</span
							>
						</div>
						<pre><code>{aktivKode.kode}</code></pre>
					</div>
					<p class="kodeforklaring">{aktivKode.forklaring}</p>
				</article>
			</div>
			<details class="secret">
				<summary>Hvor kommer SESSION_SECRET fra? <span aria-hidden="true">+</span></summary>
				<p>
					Generer en tilfeldig verdi én gang. Legg den som <code>SESSION_SECRET=verdien</code> i
					backendens <code>.env</code>, og legg <code>.env</code> i <code>.gitignore</code>.
					Hemmeligheten brukes til å signere session-cookien og skal bare være kjent for serveren.
				</p>
				<pre><code
						>{"node -e \"console.log(require('node:crypto').randomBytes(32).toString('hex'))\""}</code
					></pre>
				<p>
					Last miljøfilen når backend startes, for eksempel med <code
						>node --env-file=.env server.js</code
					> i en Node-versjon som støtter dette. Bruk samme secret videre; ikke generer en ny for hver
					request.
				</p>
			</details>
			<details class="secret">
				<summary>Koble det til chatten deres <span aria-hidden="true">+</span></summary>
				<p>
					<b>Prøv selv:</b> En bruker sender en melding og endrer <code>avsender</code> i request-bodyen
					til en annens navn. Hvordan hindrer backend at meldingen får feil avsender?
				</p>
				<p>
					<b>Hint:</b> Kontroller først at <code>req.session.bruker</code> finnes. Hent deretter
					avsender fra den bekreftede sessionen, for eksempel
					<code>const avsender = req.session.bruker.navn;</code>, og ikke fra
					<code>req.body.avsender</code>.
				</p>
			</details>
		</section>

		<section class="forstå" aria-labelledby="forståtittel">
			<div class="forklaringskort">
				<p class="overlinje">NÅR FRONTEND OG BACKEND ER SEPARATE</p>
				<h2 id="forståtittel">Tre innstillinger må passe sammen.</h2>
				<div class="innstillingsliste">
					<div>
						<span>01</span>
						<p>
							<b>Fetch: credentials</b><br /><code>"include"</code> lar nettleseren sende cookies og
							ta imot <code>Set-Cookie</code> også ved ulike origins.
						</p>
					</div>
					<div>
						<span>02</span>
						<p>
							<b>Backend: CORS</b><br />Tillat den konkrete frontend-adressen og bruk
							<code>credentials: true</code>. <code>origin: "*"</code> kan ikke brukes for et svar med
							credentials.
						</p>
					</div>
					<div>
						<span>03</span>
						<p>
							<b>Cookie: SameSite og Secure</b><br />Cookie-reglene gjelder fortsatt.
							<code>credentials: "include"</code>
							overstyrer ikke <code>SameSite</code> eller krav om HTTPS.
						</p>
					</div>
				</div>
				<p class="påminnelse">
					CORS er ikke pålogging. Beskyttede ruter må fortsatt kontrollere sessionen og brukerens
					tilgang.
				</p>
			</div>
			<aside class="sideforklaring">
				<p class="overlinje">ORIGIN OG SITE ER FORSKJELLIGE BEGREPER</p>
				<h3>Ulik port betyr ulik origin.</h3>
				<div class="adressepar">
					<code>http://localhost:5173</code><code>http://localhost:3000</code>
				</div>
				<p>
					Disse har <b>ulike origins</b>, men er <b>same-site</b>. Derfor kan en
					<code>SameSite=Lax</code>-cookie fungere her når fetch og CORS er satt opp riktig.
				</p>
				<p>
					Ved forespørsler mellom ulike sites vil <code>Lax</code> normalt blokkere cookien i fetch.
					Et bevisst oppsett med <code>SameSite=None</code> krever <code>Secure</code> og HTTPS, og nettleserens
					regler for tredjepartscookies kan fortsatt begrense det.
				</p>
				<p class="liten">
					<code>HttpOnly</code> hindrer JavaScript i å lese cookien. Nettleseren kan likevel sende
					den med fetch. Du skal derfor ikke hente session-ID-en med <code>document.cookie</code>.
				</p>
			</aside>
		</section>

		<section class="videre">
			<div>
				<p class="overlinje">FØR EN LØSNING TAS I BRUK</p>
				<h2>Øvelsen er et startpunkt.</h2>
			</div>
			<p>
				Standardlageret <code>MemoryStore</code> er for utvikling og øving. Sessiondata forsvinner
				ved omstart. En løsning i drift trenger reell autentisering, HTTPS med
				<code>secure: true</code>, et egnet sessionlager og tilgangskontroll. Bak en reverse proxy
				må Express også settes opp til å stole på den riktige proxyen. Vurder CSRF-beskyttelse for
				handlinger som endrer data.
			</p>
		</section>
		<section class="kilder" aria-labelledby="kildetittel">
			<h2 id="kildetittel">Les videre i dokumentasjonen</h2>
			<div>
				<a
					href="https://expressjs.com/en/resources/middleware/session/"
					target="_blank"
					rel="noreferrer">express-session <span aria-hidden="true">↗</span></a
				><a
					href="https://expressjs.com/en/resources/middleware/cors/"
					target="_blank"
					rel="noreferrer">CORS i Express <span aria-hidden="true">↗</span></a
				><a
					href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#including_credentials"
					target="_blank"
					rel="noreferrer">Fetch og credentials <span aria-hidden="true">↗</span></a
				><a
					href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies"
					target="_blank"
					rel="noreferrer">HTTP-cookies <span aria-hidden="true">↗</span></a
				>
			</div>
		</section>
		<footer>
			<a href="/">← Tilbake til IT-laben</a>
			<p>Følg ID-en. Finn dataene. Sjekk svaret.</p>
		</footer>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f4f5ef;
	}
	.side {
		--ink: #193c3b;
		--teal: #087f79;
		--muted: #657b71;
		--border: #d9e2d6;
		min-height: 100vh;
		color: var(--ink);
		background: radial-gradient(ellipse at 85% 0, #dcebdd, transparent 28%);
		font-family:
			Inter,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
	}
	.side,
	.side * {
		box-sizing: border-box;
	}
	header,
	main {
		width: min(1200px, calc(100% - 72px));
		margin: 0 auto;
	}
	header {
		height: 83px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--border);
		gap: 18px;
	}
	a {
		color: inherit;
		text-decoration: none;
	}
	.tilbake {
		font-weight: 750;
		font-size: 16px;
		white-space: nowrap;
	}
	.tilbake > span:first-child {
		margin-right: 8px;
	}
	.skille {
		margin: 0 8px;
		color: #a1b59c;
	}
	.fag {
		font-size: 12px;
		color: var(--muted);
		font-weight: 500;
	}
	.merke {
		display: flex;
		align-items: center;
		gap: 9px;
		font: 9px monospace;
		letter-spacing: 1.4px;
		color: var(--muted);
	}
	.merke i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--teal);
	}
	h1,
	h2,
	h3,
	p {
		margin-top: 0;
	}
	p {
		line-height: 1.7;
	}
	button,
	input {
		font: inherit;
	}
	button {
		cursor: pointer;
		padding: 10px 13px;
		border: 1px solid #cfded2;
		border-radius: 7px;
		color: var(--ink);
		background: #fffdf9;
		font-size: 12px;
		font-weight: 650;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	button:hover:not(:disabled) {
		background: #e5eee2;
		border-color: #9ebca2;
	}
	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.primaer {
		color: white;
		background: var(--teal);
		border-color: var(--teal);
	}
	.primaer:hover:not(:disabled) {
		background: #066560;
		border-color: #066560;
	}
	.diskret {
		background: transparent;
	}
	a:focus-visible,
	button:focus-visible,
	input:focus-visible,
	summary:focus-visible {
		outline: 3px solid #bd6e31;
		outline-offset: 4px;
	}
	code,
	pre {
		font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
	}
	p code {
		font-size: 0.9em;
		color: #096c65;
		overflow-wrap: anywhere;
	}
	pre {
		margin: 0;
		font-size: 11px;
		line-height: 1.7;
		tab-size: 2;
	}
	.overlinje {
		color: var(--teal);
		font-size: 10px;
		line-height: 1.6;
		font-weight: 750;
		letter-spacing: 1.7px;
		margin-bottom: 15px;
	}
	.intro {
		padding: 62px 0 48px;
		display: grid;
		grid-template-columns: 1.3fr 0.8fr;
		gap: 80px;
		align-items: center;
	}
	h1 {
		font-size: clamp(46px, 5.6vw, 75px);
		line-height: 1.04;
		letter-spacing: -3.4px;
		margin-bottom: 24px;
		font-weight: 750;
	}
	h1 em {
		color: var(--teal);
		font-style: normal;
	}
	.ingress {
		max-width: 560px;
		color: var(--muted);
		font-size: 16px;
		margin-bottom: 22px;
	}
	.hopp {
		display: inline-flex;
		gap: 24px;
		align-items: center;
		font-size: 12px;
		font-weight: 700;
		border-bottom: 1px solid #b9ceba;
		padding: 8px 0;
	}
	.hopp span {
		font-size: 18px;
		color: var(--teal);
	}
	.introkort {
		padding: 24px;
		border: 1px solid #d0dfcc;
		border-radius: 13px;
		background: #edf3e6;
		transform: rotate(1deg);
	}
	.introkort .overlinje {
		font-size: 8px;
		margin-bottom: 18px;
	}
	.introledd {
		background: #fffdf8;
		border: 1px solid #d5e1cf;
		border-radius: 8px;
		padding: 17px;
		display: grid;
		gap: 7px;
	}
	.introledd > span {
		font: 8px monospace;
		color: var(--muted);
		letter-spacing: 1.4px;
	}
	.introledd b {
		font-size: 18px;
		letter-spacing: -0.3px;
	}
	.introledd code {
		font-size: 11px;
		color: var(--teal);
		overflow-wrap: anywhere;
	}
	.serverledd {
		background: #e2eddb;
	}
	.kobling {
		font-size: 10px;
		color: var(--muted);
		padding: 10px 15px;
	}
	.kobling span {
		color: var(--teal);
		font-size: 19px;
		margin-right: 10px;
	}
	.kortfot {
		font-size: 10px;
		color: var(--muted);
		margin: 14px 0 0;
	}
	.grunnlag {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 28px;
		margin: 0 0 46px;
		padding: 25px 0;
		border-block: 1px solid var(--border);
	}
	.grunnlag article {
		padding-left: 40px;
		position: relative;
	}
	.nummer {
		position: absolute;
		left: 0;
		top: 2px;
		color: #91aa85;
		font: 13px monospace;
	}
	.grunnlag h2 {
		font-size: 15px;
		letter-spacing: -0.2px;
		margin: 0 0 9px;
	}
	.grunnlag p {
		font-size: 12px;
		color: var(--muted);
		margin: 0;
	}
	section {
		scroll-margin-top: 20px;
	}
	.demo {
		padding: 25px;
		border: 1px solid #cfdccd;
		border-radius: 14px;
		background: #fffefa;
	}
	.seksjonstopp {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
	}
	.seksjonstopp .overlinje {
		margin-bottom: 8px;
	}
	h2 {
		font-size: 28px;
		letter-spacing: -0.8px;
		margin-bottom: 0;
	}
	h3 {
		font-size: 19px;
		letter-spacing: -0.4px;
	}
	.demomerknad {
		border-left: 3px solid #a7bea0;
		background: #f0f4e9;
		border-radius: 0 5px 5px 0;
		font-size: 11px;
		color: #5d7465;
		padding: 12px 14px;
		margin: 20px 0;
	}
	.flyt {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		padding: 0 0 20px;
		margin-bottom: 20px;
		border-bottom: 1px solid var(--border);
	}
	.flyt ol {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		gap: 9px;
		flex-wrap: wrap;
	}
	.flyt li {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 8px 9px;
		background: #f0f3eb;
		color: #7e9177;
		border-radius: 5px;
		font-size: 10px;
	}
	.flyt li > span {
		font: 11px monospace;
	}
	.flyt li.aktiv {
		background: #dceee1;
		color: #18664e;
		box-shadow: inset 0 -2px #359071;
	}
	.flyt li.ferdig {
		color: #368064;
	}
	.neste {
		min-width: 175px;
		white-space: nowrap;
	}
	.demogrid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		align-items: stretch;
	}
	.panel {
		border: 1px solid var(--border);
		border-radius: 10px;
		overflow: hidden;
		min-width: 0;
	}
	.paneltopp {
		padding: 14px 18px;
		background: #e9f1e6;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
	}
	.paneltopp b {
		font-size: 15px;
	}
	.paneltopp > span {
		font: 8px monospace;
		letter-spacing: 1px;
		color: #6d8568;
	}
	.server .paneltopp {
		background: #f1eadb;
	}
	.server .paneltopp > span {
		color: #998163;
	}
	.panelinnhold {
		padding: 18px;
	}
	.adresse {
		font: 10px monospace;
		color: #738774;
		margin-bottom: 18px;
	}
	.profilvalg {
		display: flex;
		gap: 9px;
	}
	.profilvalg button {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 10px;
		text-align: left;
		min-width: 0;
	}
	.profilvalg button.valgt {
		border-color: #63a08b;
		background: #e4f1e7;
		box-shadow: 0 0 0 1px #63a08b;
	}
	.profilbokstav {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 7px;
		background: #dde8d7;
		color: #476747;
		font-size: 13px;
		flex-shrink: 0;
	}
	.profilvalg small {
		display: block;
		font-size: 9px;
		color: var(--muted);
		font-weight: 450;
		margin-top: 3px;
	}
	.liten {
		font-size: 10px;
		color: var(--muted);
		line-height: 1.65;
		margin: 10px 0 0;
	}
	.profilforklaring {
		margin-bottom: 19px;
	}
	label {
		font-size: 11px;
		font-weight: 650;
	}
	input:not([type='checkbox']) {
		width: 100%;
		min-width: 0;
		padding: 11px 12px;
		border: 1px solid #cbd9c7;
		border-radius: 6px;
		font-size: 13px;
		color: var(--ink);
		background: white;
		margin-top: 7px;
	}
	input[type='checkbox'] {
		accent-color: var(--teal);
		width: 15px;
		height: 15px;
		flex-shrink: 0;
		cursor: pointer;
	}
	.handlingsknapper {
		display: flex;
		gap: 7px;
		flex-wrap: wrap;
		margin: 14px 0 21px;
	}
	.handlingsknapper button {
		padding: 9px 11px;
		font-size: 11px;
	}
	.cookieboks {
		background: #eff4e9;
		border: 1px dashed #b8cdb0;
		border-radius: 8px;
		padding: 15px;
	}
	.litenoverskrift {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 11px;
	}
	.litenoverskrift b {
		font-size: 11px;
	}
	.litenoverskrift h3 {
		font-size: 14px;
		margin: 0;
		letter-spacing: -0.2px;
	}
	.litenoverskrift > span {
		font: 8px monospace;
		letter-spacing: 0.5px;
		color: #71856c;
		white-space: nowrap;
	}
	.cookieboks > code {
		display: block;
		padding: 9px 0 4px;
		font-size: 12px;
		color: #096c65;
		overflow-wrap: anywhere;
	}
	.cookieboks p {
		font-size: 10px;
		margin: 8px 0 0;
		color: var(--muted);
	}
	.sistbekreftet {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 18px;
		font-size: 10px;
	}
	.sistbekreftet span {
		color: var(--muted);
	}
	.sistbekreftet b {
		font-size: 12px;
	}
	.sessionliste {
		display: grid;
		gap: 8px;
		max-height: 268px;
		overflow-y: auto;
		padding: 2px;
	}
	.sessionrad {
		border: 1px solid #dce3d5;
		background: #f9faf4;
		border-radius: 7px;
		overflow: hidden;
	}
	.sessionrad.treff {
		border-color: #6fa78a;
		box-shadow: 0 0 0 1px #6fa78a;
	}
	.sessionid {
		display: flex;
		align-items: center;
		gap: 8px;
		border-bottom: 1px solid #dfe7d8;
		padding: 9px 10px;
		color: var(--teal);
	}
	.sessionid code {
		font-size: 11px;
		overflow-wrap: anywhere;
	}
	.treffmerke {
		font: 8px monospace;
		letter-spacing: 1px;
		margin-left: auto;
	}
	.sessiondata {
		display: flex;
		gap: 8px;
		align-items: flex-end;
		justify-content: space-between;
		padding: 11px;
	}
	.sessiondata code {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font-size: 10px;
		line-height: 1.7;
		min-width: 0;
	}
	.utløp {
		font-size: 9px;
		padding: 6px 8px;
		white-space: nowrap;
		background: #fff9ef;
		color: #886138;
		border-color: #e6d8c0;
	}
	.tomt {
		text-align: center;
		padding: 28px 18px;
		background: #f3f5ed;
		border: 1px dashed #d1ddc8;
		border-radius: 7px;
	}
	.tomt > span {
		display: block;
		font: 27px monospace;
		color: #9eb495;
		margin-bottom: 12px;
	}
	.tomt b {
		font-size: 12px;
		font-weight: 550;
	}
	.tomt p {
		font-size: 10px;
		color: var(--muted);
		margin: 7px 0 0;
	}
	.reqsession {
		padding: 13px;
		background: #f1f3eb;
		border-radius: 7px;
		margin-top: 19px;
	}
	.reqsession pre {
		font-size: 10px;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		color: #526b59;
	}
	.forklaring {
		display: flex;
		align-items: center;
		gap: 18px;
		padding: 18px;
		margin: 22px 0 0;
		border-radius: 8px;
		background: #e4f0df;
		border-left: 3px solid #70a16b;
	}
	.forklaring > span {
		font: 26px monospace;
		color: #78a36c;
		flex-shrink: 0;
	}
	.forklaring p {
		font-size: 12px;
		margin: 0;
	}
	.credentials {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		padding: 20px 0;
		border-bottom: 1px solid var(--border);
		margin-bottom: 20px;
	}
	.bryter {
		display: flex;
		gap: 9px;
		align-items: center;
		flex-wrap: wrap;
		cursor: pointer;
	}
	.bryter code {
		font-size: 10px;
		color: #687f64;
		font-weight: 450;
	}
	.credentials .liten {
		margin-top: 5px;
	}
	.testtips {
		font-size: 10px;
		color: #8f7954;
		white-space: nowrap;
	}
	.httpgrid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 18px;
	}
	.httpkort {
		min-width: 0;
		padding: 16px;
		border: 1px solid #dfe6d9;
		border-radius: 8px;
		background: #f7f8f1;
	}
	.httpkort h3 span {
		color: var(--teal);
		margin-left: 5px;
	}
	.httpkort pre {
		font-size: 10px;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		color: #527060;
	}
	.litenoverskrift > .feilstatus {
		color: #a45338;
	}
	.demofot {
		margin-top: 17px;
	}
	.oppgaver,
	.kodehjelp {
		margin-top: 55px;
	}
	.antall {
		padding: 8px 11px;
		border: 1px solid #d4dfce;
		border-radius: 5px;
		font: 9px monospace;
		color: var(--muted);
		white-space: nowrap;
	}
	.forsøkgrid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 18px;
		margin-top: 24px;
	}
	.forsøkgrid article {
		display: flex;
		flex-direction: column;
		padding: 22px;
		background: #fffdf8;
		border: 1px solid var(--border);
		border-radius: 10px;
	}
	.forsøknummer {
		font: 25px monospace;
		color: #a8b99c;
		margin-bottom: 19px;
	}
	.forsøkgrid h3 {
		font-size: 18px;
		margin-bottom: 12px;
	}
	.forsøkgrid p {
		font-size: 12px;
		color: var(--muted);
	}
	details {
		border-top: 1px solid var(--border);
	}
	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		padding: 13px 0;
		cursor: pointer;
		list-style: none;
		font-size: 11px;
		font-weight: 650;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary > span {
		color: var(--teal);
		font-size: 16px;
		font-weight: 450;
	}
	details[open] summary > span {
		transform: rotate(45deg);
	}
	.forsøkgrid details {
		margin-top: auto;
	}
	.forsøkgrid details p {
		font-size: 11px;
	}
	.sjekk {
		display: flex;
		gap: 9px;
		align-items: center;
		font-size: 10px;
		line-height: 1.6;
		color: #657b60;
		padding-top: 13px;
		margin-top: 3px;
		border-top: 1px solid var(--border);
		cursor: pointer;
		font-weight: 500;
	}
	.seksjonsintro {
		font-size: 13px;
		color: var(--muted);
		max-width: 770px;
		margin: 17px 0 20px;
	}
	.installasjon {
		display: inline-flex;
		align-items: center;
		gap: 20px;
		padding: 13px 16px;
		background: #e6eedf;
		border-radius: 7px;
		font-size: 11px;
		margin-bottom: 24px;
		max-width: 100%;
	}
	.installasjon > span {
		color: #738a66;
		font-size: 10px;
	}
	.installasjon > code {
		overflow-wrap: anywhere;
	}
	.kodeflate {
		display: grid;
		grid-template-columns: 215px minmax(0, 1fr);
		border: 1px solid #d2decf;
		border-radius: 12px;
		overflow: hidden;
		background: #fffdf9;
	}
	.kodemeny {
		padding: 17px;
		border-right: 1px solid #d8e3d3;
		background: #ecf2e6;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 8px;
	}
	.kodemeny button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		text-align: left;
		padding: 12px 10px;
		font-size: 11px;
		border-color: transparent;
		background: transparent;
	}
	.kodemeny button.valgt {
		background: #fffdf8;
		border-color: #c6d9c3;
		color: #096f67;
		box-shadow: 0 2px 5px #2d482b08;
	}
	.kodemeny button > span {
		opacity: 0.35;
	}
	.kodemeny button.valgt > span {
		opacity: 1;
	}
	.kodeinnhold {
		min-width: 0;
		padding: 27px;
	}
	.kodeinnhold .overlinje {
		font-size: 9px;
		margin-bottom: 10px;
	}
	.kodeinnhold h3 {
		font-size: 23px;
		margin-bottom: 13px;
	}
	.kodeinnhold > p:not(.overlinje) {
		font-size: 12px;
		color: var(--muted);
	}
	.kodevindu {
		border: 1px solid #2e5146;
		border-radius: 8px;
		overflow: hidden;
		margin-top: 20px;
	}
	.kodevindu > div {
		display: flex;
		justify-content: space-between;
		padding: 11px 16px;
		background: #24473c;
		color: #94b297;
		font: 8px monospace;
		letter-spacing: 1px;
	}
	.kodevindu > div > span:first-child {
		color: #6d8d70;
		letter-spacing: 4px;
	}
	.kodevindu pre {
		padding: 18px;
		overflow-x: auto;
		background: #173d32;
		color: #d8ebc7;
		font-size: 11px;
		line-height: 1.8;
	}
	.kodeforklaring {
		margin: 17px 0 0;
		padding-left: 13px;
		border-left: 2px solid #c3d7b9;
	}
	.secret {
		margin-top: 17px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: #f8faf2;
		padding: 0 18px;
	}
	.secret summary {
		font-size: 12px;
		padding: 16px 0;
	}
	.secret p {
		font-size: 12px;
		color: var(--muted);
	}
	.secret pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		padding: 12px;
		background: #eaf1e3;
		border-radius: 5px;
		margin-bottom: 15px;
	}
	.forstå {
		display: grid;
		grid-template-columns: 1.2fr 1fr;
		gap: 28px;
		margin-top: 55px;
	}
	.forklaringskort {
		border: 1px solid #d4dfcd;
		background: #fffdf8;
		border-radius: 10px;
		padding: 26px;
	}
	.forklaringskort h2 {
		font-size: 26px;
		line-height: 1.18;
		max-width: 390px;
	}
	.innstillingsliste {
		margin-top: 23px;
	}
	.innstillingsliste > div {
		display: flex;
		gap: 15px;
		margin-top: 17px;
	}
	.innstillingsliste > div > span {
		font: 12px monospace;
		color: #8eab80;
		padding-top: 3px;
	}
	.innstillingsliste p {
		font-size: 12px;
		color: var(--muted);
		margin: 0;
	}
	.innstillingsliste b {
		color: var(--ink);
	}
	.påminnelse {
		font-size: 11px;
		padding-top: 16px;
		margin: 22px 0 0;
		border-top: 1px solid var(--border);
		color: var(--muted);
	}
	.sideforklaring {
		padding: 26px;
		background: #e9efdf;
		border-radius: 10px;
	}
	.sideforklaring .overlinje {
		font-size: 8px;
	}
	.sideforklaring h3 {
		font-size: 23px;
		margin-bottom: 20px;
	}
	.sideforklaring p {
		font-size: 12px;
		color: #61745c;
	}
	.sideforklaring .liten {
		font-size: 11px;
		padding-top: 16px;
		border-top: 1px solid #d1ddc7;
	}
	.adressepar {
		display: grid;
		gap: 7px;
		margin-bottom: 18px;
	}
	.adressepar code {
		font-size: 11px;
		padding: 8px 10px;
		border: 1px solid #cedcc4;
		border-radius: 5px;
		background: #f3f7ed;
		overflow-wrap: anywhere;
	}
	.videre {
		display: grid;
		grid-template-columns: 0.8fr 1.5fr;
		align-items: start;
		gap: 35px;
		padding: 30px 0;
		margin-top: 45px;
		border-block: 1px solid var(--border);
	}
	.videre .overlinje {
		font-size: 9px;
	}
	.videre h2 {
		font-size: 24px;
	}
	.videre > p {
		color: var(--muted);
		font-size: 12px;
		margin: 0;
	}
	.kilder {
		padding: 30px 0;
	}
	.kilder h2 {
		font-size: 14px;
		letter-spacing: 0;
		margin-bottom: 15px;
	}
	.kilder > div {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.kilder a {
		display: flex;
		justify-content: space-between;
		gap: 15px;
		font-size: 11px;
		padding: 9px 11px;
		background: #f9fbf3;
		border: 1px solid #d9e2d2;
		border-radius: 5px;
	}
	.kilder a:hover {
		background: #e7efdf;
	}
	.kilder a > span {
		color: var(--teal);
	}
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		border-top: 1px solid var(--border);
		padding: 27px 0 38px;
		font-size: 11px;
	}
	footer a {
		font-weight: 650;
	}
	footer p {
		color: var(--muted);
		margin: 0;
		font-size: 10px;
	}
	@media (max-width: 1050px) {
		.intro {
			gap: 35px;
			grid-template-columns: 1.25fr 0.8fr;
		}
		h1 {
			font-size: 58px;
		}
		.introkort {
			padding: 19px;
		}
		.flyt {
			align-items: flex-start;
		}
		.flyt ol {
			gap: 6px;
		}
		.flyt li {
			font-size: 9px;
			padding: 8px;
		}
		.neste {
			min-width: 150px;
			font-size: 10px;
		}
		.demo {
			padding: 20px;
		}
		.demogrid {
			gap: 15px;
		}
		.panelinnhold {
			padding: 15px;
		}
		.testtips {
			display: none;
		}
		.forsøkgrid {
			gap: 13px;
		}
		.forsøkgrid article {
			padding: 19px;
		}
		.kodeflate {
			grid-template-columns: 190px minmax(0, 1fr);
		}
		.kodemeny {
			padding: 12px;
		}
		.kodeinnhold {
			padding: 22px;
		}
	}
	@media (max-width: 780px) {
		header,
		main {
			width: calc(100% - 36px);
		}
		.merke {
			font-size: 8px;
			letter-spacing: 1px;
		}
		.intro {
			padding-top: 42px;
			gap: 26px;
		}
		h1 {
			font-size: 46px;
			letter-spacing: -2px;
		}
		.ingress {
			font-size: 14px;
		}
		.introkort {
			padding: 15px;
		}
		.introkort .overlinje {
			font-size: 7px;
			letter-spacing: 1px;
		}
		.introledd {
			padding: 12px;
		}
		.introledd code {
			font-size: 9px;
		}
		.grunnlag {
			gap: 18px;
		}
		.grunnlag article {
			padding-left: 0;
		}
		.nummer {
			position: static;
			display: block;
			margin-bottom: 10px;
		}
		.grunnlag h2 {
			font-size: 13px;
		}
		.grunnlag p {
			font-size: 11px;
		}
		.flyt {
			flex-wrap: wrap;
		}
		.flyt ol {
			flex: 1 1 100%;
		}
		.flyt li {
			flex: 1;
			font-size: 9px;
		}
		.neste {
			width: 100%;
		}
		.demogrid {
			grid-template-columns: 1fr;
		}
		.panelinnhold {
			padding: 18px;
		}
		.sessionliste {
			max-height: 260px;
		}
		.httpgrid {
			grid-template-columns: 1fr;
		}
		.forsøkgrid {
			grid-template-columns: 1fr;
			gap: 13px;
		}
		.forsøkgrid article {
			position: relative;
			padding: 22px 22px 20px 65px;
		}
		.forsøknummer {
			position: absolute;
			left: 20px;
			top: 24px;
			font-size: 22px;
		}
		.forsøkgrid p {
			margin-bottom: 13px;
		}
		.kodeflate {
			grid-template-columns: 1fr;
		}
		.kodemeny {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			border-right: 0;
			border-bottom: 1px solid var(--border);
			gap: 6px;
		}
		.kodemeny button {
			font-size: 11px;
			padding: 10px;
		}
		.forstå {
			grid-template-columns: 1fr;
			gap: 18px;
		}
		.videre {
			grid-template-columns: 1fr;
			gap: 20px;
		}
		.videre .overlinje {
			margin-bottom: 10px;
		}
	}
	@media (max-width: 540px) {
		header {
			height: 70px;
		}
		.tilbake {
			font-size: 14px;
		}
		.merke {
			display: none;
		}
		.intro {
			grid-template-columns: 1fr;
			padding: 37px 0 28px;
			gap: 25px;
		}
		h1 {
			font-size: clamp(40px, 10.3vw, 54px);
			letter-spacing: -2.3px;
		}
		.overlinje {
			font-size: 9px;
			letter-spacing: 1.3px;
		}
		.introkort {
			transform: none;
			padding: 18px;
		}
		.introkort .overlinje {
			font-size: 8px;
		}
		.introledd {
			display: grid;
			grid-template-columns: 1fr 1fr;
			align-items: center;
			gap: 5px 10px;
		}
		.introledd > span {
			grid-column: 1 / -1;
		}
		.introledd b {
			font-size: 15px;
		}
		.introledd code {
			font-size: 10px;
			text-align: right;
		}
		.kobling {
			padding: 7px 12px;
		}
		.grunnlag {
			grid-template-columns: 1fr;
			gap: 19px;
			padding: 23px 0;
			margin-bottom: 28px;
		}
		.grunnlag article {
			padding-left: 36px;
		}
		.nummer {
			position: absolute;
			margin: 0;
		}
		.grunnlag h2 {
			font-size: 14px;
			margin-bottom: 5px;
		}
		.grunnlag p {
			font-size: 12px;
		}
		.demo {
			padding: 15px;
			border-radius: 10px;
		}
		.seksjonstopp {
			align-items: flex-start;
			gap: 10px;
		}
		h2 {
			font-size: 25px;
		}
		.seksjonstopp > button {
			font-size: 10px;
			padding: 8px 9px;
			max-width: 100px;
		}
		.demomerknad {
			font-size: 10px;
			padding: 10px 11px;
		}
		.flyt li {
			font-size: 8px;
			gap: 5px;
			padding: 7px 5px;
			line-height: 1.45;
		}
		.panelinnhold {
			padding: 14px;
		}
		.paneltopp {
			padding: 13px 14px;
		}
		.profilvalg button {
			padding: 9px;
		}
		.handlingsknapper {
			gap: 6px;
		}
		.handlingsknapper button {
			padding: 9px 10px;
			font-size: 10px;
		}
		.forklaring {
			padding: 14px;
			gap: 12px;
		}
		.forklaring > span {
			font-size: 20px;
		}
		.forklaring p {
			font-size: 11px;
		}
		.credentials {
			padding: 17px 0;
		}
		.bryter {
			font-size: 11px;
			gap: 7px;
		}
		.bryter code {
			font-size: 9px;
		}
		.httpkort {
			padding: 13px;
		}
		.httpkort pre {
			font-size: 9px;
		}
		.demofot {
			font-size: 9px;
		}
		.oppgaver,
		.kodehjelp,
		.forstå {
			margin-top: 36px;
		}
		.antall {
			font-size: 8px;
			padding: 7px;
		}
		.seksjonstopp > .antall {
			max-width: 110px;
			white-space: normal;
			text-align: right;
			line-height: 1.5;
		}
		.forsøkgrid article {
			padding: 19px 16px 18px 53px;
		}
		.forsøknummer {
			left: 16px;
			top: 22px;
			font-size: 19px;
		}
		.forsøkgrid h3 {
			font-size: 17px;
		}
		.installasjon {
			align-items: flex-start;
			flex-direction: column;
			gap: 7px;
			width: 100%;
			font-size: 10px;
		}
		.kodeinnhold {
			padding: 18px 15px;
		}
		.kodeinnhold h3 {
			font-size: 21px;
		}
		.kodevindu pre {
			padding: 14px;
			font-size: 10px;
		}
		.kodemeny {
			padding: 10px;
		}
		.kodemeny button {
			font-size: 10px;
		}
		.secret {
			padding-inline: 14px;
		}
		.secret pre {
			font-size: 10px;
		}
		.forklaringskort,
		.sideforklaring {
			padding: 22px;
		}
		.forklaringskort h2 {
			font-size: 24px;
		}
		.videre {
			margin-top: 30px;
		}
		footer {
			flex-direction: column;
			align-items: flex-start;
			gap: 10px;
			padding-block: 23px 30px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		button {
			transition: none;
		}
	}
</style>
