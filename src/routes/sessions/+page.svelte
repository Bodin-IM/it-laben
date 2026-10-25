<script>
	import { avatarFeedback } from '#lib/avatarFeedback.js';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import AccountLink from '#lib/components/AccountLink.svelte';
	import SessionStepCode from '#lib/components/SessionStepCode.svelte';

	// En lokal undervisningsmodell. Ingen cookies, innlogging eller nettverkskall opprettes.
	/** @typedef {'grunnlag' | 'ekstra' | 'kode'} Del */
	/** @typedef {'profiler' | 'cookie' | 'utlopt'} Forsok */
	/** @typedef {'A' | 'B'} ProfilId */
	/** @typedef {{ id: string, navn: string }} Bruker */
	/** @typedef {{ id: string, bruker: Bruker }} Session */
	/** @typedef {{ tittel: string, request: string, response: string, session: string }} Spor */
	/** @typedef {{ status: number, tittel: string, tekst: string }} Resultat */

	const adaId = 'q7Kp2x';
	const noahId = 'v4Lm8a';
	const ada = { id: 'elev-ada', navn: 'Ada' };
	const noah = { id: 'elev-noah', navn: 'Noah' };
	const profilvalg = /** @type {ProfilId[]} */ (['A', 'B']);
	/** @type {Del} */
	let del = $state('grunnlag');
	let trinn = $state(0);
	/** @type {Forsok} */
	let forsok = $state('profiler');
	/** @type {ProfilId} */
	let profil = $state('A');
	/** @type {Record<ProfilId, string | null>} */
	let cookies = $state({ A: null, B: null });
	/** @type {Session[]} */
	let sessioner = $state([]);
	/** @type {Spor[]} */
	let spor = $state([]);
	/** @type {Resultat | null} */
	let resultat = $state(null);
	let credentials = $state(false);
	let visDetaljer = $state(false);
	let kodevalg = $state('oppsett');
	let cookie = $derived(cookies[profil]);

	const trinnene = [
		{
			navn: 'Før innlogging',
			sporsmal: 'Vet serveren hvem du er?',
			start: 'Ingen er logget inn. Nettleseren har ingen cookie, og sessionlageret er tomt.',
			handling: 'Spør hvem jeg er',
			hint: 'Send GET /meg og se om serveren finner en bruker.'
		},
		{
			navn: 'Logg inn',
			sporsmal: 'Hva må lagres for å kjenne deg igjen?',
			start: 'Vi starter uten cookie og session. I øvelsen bruker vi visningsnavnet Ada.',
			handling: 'Logg inn som Ada',
			hint: 'Se etter samme ID i nettleseren og på serveren.'
		},
		{
			navn: 'Spør igjen',
			sporsmal: 'Hvordan finner serveren navnet ditt?',
			start:
				'Dette eksemplet starter med Ada innlogget: en cookie og en tilhørende session er lagt inn.',
			handling: 'Spør hvem jeg er',
			hint: 'Nettleseren sender ID-en. Serveren må slå den opp på nytt.'
		},
		{
			navn: 'Logg ut',
			sporsmal: 'Hvem er du etter utlogging?',
			start:
				'Dette eksemplet starter med Ada innlogget. Handlingen logger ut og sender så en ny GET /meg.',
			handling: 'Logg ut og spør på nytt',
			hint: 'Følg både cookien og sessionen når innloggingen avsluttes.'
		}
	];
	const forsokene = [
		{
			id: /** @type {Forsok} */ ('profiler'),
			navn: 'To profiler',
			sporsmal: 'Samme backend. Hvem får svar?',
			start: 'Ada er allerede logget inn i profil A, og Noah i profil B. De har hver sin cookie.',
			handling: 'Spør hvem jeg er',
			hint: 'Velg en profil og spør. Bare ID-en fra den valgte profilen sendes.'
		},
		{
			id: /** @type {Forsok} */ ('cookie'),
			navn: 'Cookie sendes ikke',
			sporsmal: 'Hvorfor får Ada 401 selv om sessionen finnes?',
			start: 'Ada har en cookie, og serveren har sessionen. Første forsøk sender ikke cookien.',
			handling: 'Spør hvem jeg er',
			hint: 'Prøv uten cookie. Slå deretter på bryteren og spør igjen.'
		},
		{
			id: /** @type {Forsok} */ ('utlopt'),
			navn: 'Session utløper',
			sporsmal: 'Er en cookie nok til å være innlogget?',
			start:
				'Ada er innlogget. Handlingen lar sessionen utløpe, beholder cookien og spør så backend.',
			handling: 'La sessionen utløpe og spør',
			hint: 'Se hva som skjer når ID-en fortsatt finnes i nettleseren, men ikke på serveren.'
		}
	];
	let aktivt = $derived.by(() =>
		del === 'ekstra'
			? (forsokene.find((item) => item.id === forsok) ?? forsokene[0])
			: trinnene[trinn]
	);
	/** @param {unknown} verdi */
	const json = (verdi) => JSON.stringify(verdi, null, 2) ?? 'null';

	function tomtSvar() {
		spor = [];
		resultat = null;
	}
	function tomModell() {
		cookies = { A: null, B: null };
		sessioner = [];
		profil = 'A';
		visDetaljer = false;
		tomtSvar();
	}
	function leggInnAda() {
		cookies.A = adaId;
		sessioner = [{ id: adaId, bruker: ada }];
	}
	/** @param {number} nummer */
	function velgTrinn(nummer) {
		trinn = nummer;
		tomModell();
		if (nummer >= 2) leggInnAda();
	}
	/** @param {Forsok} id */
	function velgForsok(id) {
		forsok = id;
		tomModell();
		leggInnAda();
		credentials = false;
		if (id === 'profiler') {
			cookies.B = noahId;
			sessioner = [...sessioner, { id: noahId, bruker: noah }];
		}
	}
	/** @param {Del} neste */
	function velgDel(neste) {
		del = neste;
		if (neste === 'grunnlag') velgTrinn(trinn);
		if (neste === 'ekstra') velgForsok(forsok);
	}
	/** @param {ProfilId} neste */
	function velgProfil(neste) {
		profil = neste;
		tomtSvar();
	}
	/** @param {string | null} id */
	function cookieHeader(id) {
		return id ? 'Cookie: itlab.sid=' + id : '// Ingen Cookie-header';
	}
	/** @param {Session | undefined} session */
	function sessionTekst(session) {
		return session
			? json({ bruker: session.bruker })
			: '// Ingen innlogget bruker.\n// req.session.bruker er undefined.';
	}
	function hentMeg() {
		const sendCookie = !(del === 'ekstra' && forsok === 'cookie' && !credentials);
		const sendtId = sendCookie ? cookies[profil] : null;
		const funnet = sessioner.find((session) => session.id === sendtId);
		const status = funnet ? 200 : 401;
		spor = [
			...spor,
			{
				tittel: 'GET /meg',
				request: ['GET /meg', 'Origin: http://localhost:5173', cookieHeader(sendtId)].join('\n'),
				response: [
					funnet ? '200 OK' : '401 Unauthorized',
					'Content-Type: application/json',
					'Access-Control-Allow-Origin: http://localhost:5173',
					'Access-Control-Allow-Credentials: true',
					'',
					json(funnet ? { bruker: funnet.bruker } : { beskjed: 'Du er ikke logget inn.' })
				].join('\n'),
				session: sessionTekst(funnet)
			}
		];
		resultat = {
			status,
			tittel: funnet
				? 'Serveren kjenner igjen ' + funnet.bruker.navn + '.'
				: 'Ingen innlogget bruker.',
			tekst: funnet
				? 'Nettleseren sendte ID-en ' +
					sendtId +
					'. Serveren fant ' +
					funnet.bruker.navn +
					' i sessionen og sendte brukeren tilbake.'
				: sendtId
					? 'ID-en ' + sendtId + ' ble sendt, men sessionen finnes ikke lenger.'
					: del === 'ekstra' && forsok === 'cookie'
						? 'Cookien ble ikke sendt. Cookien og sessionen finnes fortsatt. Slå på bryteren og prøv igjen.'
						: 'Ingen session-ID ble sendt. Backend finner derfor ingen innlogget bruker.'
		};
	}
	function loggInn() {
		const gammelId = cookies.A;
		leggInnAda();
		spor = [
			{
				tittel: 'POST /logginn — lokal demo',
				request: [
					'POST /logginn',
					'Origin: http://localhost:5173',
					'Content-Type: application/json',
					cookieHeader(gammelId),
					'',
					json({ visningsnavn: 'Ada' })
				].join('\n'),
				response: [
					'200 OK',
					'Content-Type: application/json',
					'Access-Control-Allow-Origin: http://localhost:5173',
					'Access-Control-Allow-Credentials: true',
					'Set-Cookie: itlab.sid=' + adaId + '; Path=/; HttpOnly; SameSite=Lax',
					'',
					json({ bruker: ada })
				].join('\n'),
				session: sessionTekst(sessioner[0])
			}
		];
		resultat = {
			status: 200,
			tittel: 'En ID i nettleseren. Ada på serveren.',
			tekst:
				'Serveren lagret Ada og sendte ID-en med Set-Cookie. Nettleseren lagret ID-en i en cookie.'
		};
	}
	function loggUtOgSpor() {
		const gammelId = cookies.A;
		sessioner = sessioner.filter((session) => session.id !== gammelId);
		cookies.A = null;
		spor = [
			{
				tittel: '1. POST /loggut',
				request: ['POST /loggut', 'Origin: http://localhost:5173', cookieHeader(gammelId)].join(
					'\n'
				),
				response: [
					'204 No Content',
					'Access-Control-Allow-Origin: http://localhost:5173',
					'Access-Control-Allow-Credentials: true',
					'Set-Cookie: itlab.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
					'',
					'// Ingen body ved 204.'
				].join('\n'),
				session:
					'// req.session.destroy() fjerner sessionen.\n// Svaret ber nettleseren slette cookien.'
			}
		];
		hentMeg();
		resultat = {
			status: 401,
			tittel: 'Utlogget. Neste forespørsel får 401.',
			tekst:
				'POST /loggut ga 204. Deretter fikk en ny GET /meg svaret 401 fordi innloggingen var avsluttet.'
		};
	}
	function kjor() {
		avatarFeedback(
			'sessions',
			'working',
			'Følg cookien og sessionen. Hvem kjenner serveren igjen?'
		);
		// Gjenta grunntrinnet fra det oppgitte utgangspunktet, uten skjulte forespørsler.
		if (del === 'grunnlag') {
			const aapneDetaljer = visDetaljer;
			velgTrinn(trinn);
			visDetaljer = aapneDetaljer;
			if (trinn === 1) loggInn();
			else if (trinn === 3) loggUtOgSpor();
			else hentMeg();
			return;
		}
		tomtSvar();
		if (forsok === 'utlopt') {
			sessioner = sessioner.filter((session) => session.id !== cookies.A);
		}
		hentMeg();
	}

	const kodebiter = [
		{
			id: 'oppsett',
			navn: '1. Oppsett',
			sted: 'EXPRESS-BACKEND',
			tittel: 'La middleware håndtere sessionen.',
			intro:
				'Installer express-session og cors i elevens Express-backend. Legg dette før rutene som bruker req.session.',
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
				'  secure: false // Bare i den lokale HTTP-laben.',
				'};',
				'app.use(session({',
				'  name: "itlab.sid", secret,',
				'  resave: false,',
				'  saveUninitialized: false,',
				'  cookie: { ...cookieOptions, maxAge: 30 * 60 * 1000 }',
				'}));',
				'',
				'// Legg rutene her.',
				'app.listen(3000);'
			].join('\n'),
			forklaring:
				'saveUninitialized: false hindrer lagring av nye, uendrede sessioner. resave: false unngår unødvendig lagring. HttpOnly hindrer JavaScript i å lese cookien; nettleseren kan fortsatt sende den.'
		},
		{
			id: 'innlogging',
			navn: '2. Innlogging',
			sted: 'INNE I POST /logginn',
			tittel: 'Lagre en bruker som faktisk er kontrollert.',
			intro:
				'Dette er et utdrag etter vellykket autentisering. bruker må komme fra en reell identitetskontroll. Et navn fra req.body er ikke nok.',
			kode: [
				'// Inne i ruten med (req, res, next).',
				'// bruker er allerede autentisert.',
				'req.session.regenerate((feil) => {',
				'  if (feil) return next(feil);',
				'  req.session.bruker = {',
				'    id: bruker.id,',
				'    navn: bruker.navn',
				'  };',
				'  req.session.save((feil) => {',
				'    if (feil) return next(feil);',
				'    res.json({ bruker: req.session.bruker });',
				'  });',
				'});'
			].join('\n'),
			forklaring:
				'regenerate gir en ny session-ID etter innlogging. Lagre brukerdata før svaret sendes. Passord skal ikke lagres i sessionen.'
		},
		{
			id: 'ruter',
			navn: '3. /meg og utlogging',
			sted: 'EXPRESS-BACKEND',
			tittel: 'Sjekk sessionen ved hver beskyttet request.',
			intro:
				'Middleware slår opp sessionen før ruten kjører. Ruten avgjør om den gir tilgang. cookieOptions er de samme innstillingene som i oppsettet.',
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
				'    res.clearCookie("itlab.sid", cookieOptions);',
				'    res.sendStatus(204);',
				'  });',
				'});'
			].join('\n'),
			forklaring:
				'destroy fjerner sessionen. clearCookie må bruke samme cookienavn, path og eventuell domain, uten maxAge/expires. I en chat hentes avsender fra req.session.bruker etter kontroll, ikke fra req.body.avsender.'
		},
		{
			id: 'fetch',
			navn: '4. Fetch',
			sted: 'SVELTE-FRONTEND',
			tittel: 'Send cookien med forespørselen.',
			intro:
				'Utdrag til egne hendelsesfunksjoner. Bruk credentials: "include" ved innlogging, henting og utlogging når frontend og backend har ulike origins.',
			kode: [
				'const API = "http://localhost:3000";',
				'',
				'// I deres innloggingsfunksjon:',
				'const svar = await fetch(API + "/logginn", {',
				'  method: "POST",',
				'  credentials: "include",',
				'  headers: { "Content-Type": "application/json" },',
				'  body: JSON.stringify({ brukernavn, passord })',
				'});',
				'if (!svar.ok) throw new Error("Innlogging mislyktes");',
				'',
				'async function hentMeg() {',
				'  const svar = await fetch(API + "/meg", {',
				'    credentials: "include"',
				'  });',
				'  if (svar.status === 401) return null;',
				'  if (!svar.ok) throw new Error("Kunne ikke hente bruker");',
				'  return (await svar.json()).bruker;',
				'}',
				'',
				'async function loggUt() {',
				'  const svar = await fetch(API + "/loggut", {',
				'    method: "POST", credentials: "include"',
				'  });',
				'  if (!svar.ok) throw new Error("Utlogging mislyktes");',
				'  // 204 har ingen JSON-body.',
				'}'
			].join('\n'),
			forklaring:
				'Nettleseren setter Cookie-headeren og tar imot Set-Cookie. Frontend gjør ikke dette selv. Kall funksjonene fra hendelser, fang feil og oppdater Svelte-state med svaret.'
		}
	];
	let aktivKode = $derived(kodebiter.find((bit) => bit.id === kodevalg) ?? kodebiter[0]);
</script>

<svelte:head>
	<title>Sessions og pålogging · IT-laben</title>
	<meta
		name="description"
		content="Lær sessions i fire små forsøk. Se samme ID i nettleseren og på serveren, og prøv kode i eget Express-prosjekt."
	/>
</svelte:head>

<div class="side">
	<header class="ramme">
		<a class="tilbake" href="/"><span aria-hidden="true">←</span> IT-laben</a>
		<div class="headerhoyre">
			<a href="/backend/">Frontend møter backend <span aria-hidden="true">↗</span></a>
			<AccountLink /><ThemeToggle />
		</div>
	</header>
	<main class="ramme">
		<section class="intro" aria-labelledby="sidetittel">
			<div>
				<p class="overlinje">UTVIKLING · Vg2 IT</p>
				<h1 id="sidetittel">Sessions og pålogging</h1>
				<p class="ingress">
					Hvordan husker serveren deg? Nettleseren har en ID. Serveren bruker den til å finne
					brukeren. Prøv sammenhengen, ett spørsmål om gangen.
				</p>
				<p class="ovingslenke">
					<a href="/oving-8/">Øving 8: registrering, passordhash og innlogging fra øvingsarket →</a>
				</p>
			</div>
			<span class="intromerke" aria-hidden="true">ID <span>↔</span> bruker</span>
		</section>
		<nav class="hovedvalg" aria-label="Velg del av øvingen">
			<button
				class:valgt={del === 'grunnlag'}
				aria-pressed={del === 'grunnlag'}
				onclick={() => velgDel('grunnlag')}><span>01</span> Følg innloggingen</button
			>
			<button
				class:valgt={del === 'ekstra'}
				aria-pressed={del === 'ekstra'}
				onclick={() => velgDel('ekstra')}><span>02</span> Ekstra forsøk</button
			>
			<button
				class:valgt={del === 'kode'}
				aria-pressed={del === 'kode'}
				onclick={() => velgDel('kode')}><span>03</span> Bruk i eget prosjekt</button
			>
		</nav>

		{#if del !== 'kode'}
			<section class="oving" aria-labelledby="ovingtittel">
				<div class="seksjonstopp">
					<h2 id="ovingtittel">{del === 'grunnlag' ? 'Fire små trinn.' : 'Prøv én forskjell.'}</h2>
					<span class="lokalmerke">LOKAL SIMULERING</span>
				</div>
				<p class="demomerknad">
					Vi bruker et demonavn uten passordkontroll. Ingen ekte innlogging, cookies eller
					nettverkskall opprettes.
				</p>
				{#if del === 'grunnlag'}
					<div class="trinnvalg" role="group" aria-label="Velg trinn">
						{#each trinnene as item, i}
							<button
								class:aktiv={trinn === i}
								aria-pressed={trinn === i}
								onclick={() => velgTrinn(i)}><span>{i + 1}</span>{item.navn}</button
							>
						{/each}
					</div>
				{:else}
					<div class="forsokvalg" role="group" aria-label="Velg ekstra forsøk">
						{#each forsokene as item}
							<button
								class:aktiv={forsok === item.id}
								aria-pressed={forsok === item.id}
								onclick={() => velgForsok(item.id)}>{item.navn}</button
							>
						{/each}
					</div>
				{/if}
				<p class="navhint">
					Du kan hoppe fritt. Hvert valg setter opp eksemplet som beskrives under, uten å sende en
					request.
				</p>

				<div class="arbeidsflate">
					<div class="oppgave">
						<div class="sporsmal">
							<p class="overlinje">
								{del === 'grunnlag' ? 'TRINN ' + (trinn + 1) + ' AV 4' : 'EKSTRA FORSØK'}
							</p>
							<h3>{aktivt.sporsmal}</h3>
							<p class="utgangspunkt"><b>Utgangspunkt:</b> {aktivt.start}</p>
						</div>
						{#if del === 'ekstra' && forsok === 'profiler'}
							<div class="ekstrakontroll">
								<div class="profilvalg" role="group" aria-label="Velg nettleserprofil">
									{#each profilvalg as id}<button
											class:aktiv={profil === id}
											aria-pressed={profil === id}
											onclick={() => velgProfil(id)}>Profil {id}</button
										>{/each}
								</div>
								<p>
									Separate nettleserprofiler. Vanlige faner i samme profil deler normalt cookies.
								</p>
							</div>
						{:else if del === 'ekstra' && forsok === 'cookie'}
							<div class="ekstrakontroll">
								<label class="bryter"
									><input
										type="checkbox"
										checked={credentials}
										onchange={(event) => {
											credentials = event.currentTarget.checked;
											tomtSvar();
										}}
									/>Ta med cookien
									<code
										>{credentials ? 'credentials: "include"' : 'credentials: "same-origin"'}</code
									></label
								>
								<p>
									Frontend på localhost:5173 og backend på localhost:3000 har ulike origins. CORS er
									riktig satt opp i dette forsøket.
								</p>
							</div>
						{/if}
						<div class="handling">
							<button class="primaer" onclick={kjor}
								>{aktivt.handling}<span aria-hidden="true">→</span></button
							>
							<p>{resultat ? 'Du kan gjenta eller velge et annet trinn.' : aktivt.hint}</p>
						</div>
						<div
							class="resultat"
							class:harresultat={resultat !== null}
							role="status"
							aria-atomic="true"
						>
							{#if resultat}
								<span class="statuskode" class:avvist={resultat.status === 401}
									>{resultat.status}</span
								>
								<div>
									<h4>{resultat.tittel}</h4>
									<p>{resultat.tekst}</p>
								</div>
							{:else}
								<span class="venter" aria-hidden="true">↳</span>
								<p>Ingen request sendt ennå. Se utgangspunktet og koden før du prøver.</p>
							{/if}
						</div>
					</div>

					<div class="modellomrade">
						<div class="modell" aria-label="Cookie i nettleseren og sessiondata på serveren">
							<article class="nettleser">
								<div class="modellhode">
									<h3>
										Nettleseren{del === 'ekstra' && forsok === 'profiler' ? ' · ' + profil : ''}
									</h3>
									<span>COOKIE</span>
								</div>
								{#if cookie}
									<p class="feltetikett">Session-ID</p>
									<code class="idverdi">{cookie}</code>
									<p class="modelltekst">Cookien heter <code>itlab.sid</code>. Her ligger ID-en.</p>
								{:else}
									<div class="tomt">
										<span aria-hidden="true">—</span>
										<p>Ingen session-cookie</p>
									</div>
								{/if}
							</article>
							<div class="mellom" aria-hidden="true"><span>↔</span><small>ID → oppslag</small></div>
							<article class="server">
								<div class="modellhode">
									<h3>Serveren</h3>
									<span>SESSIONLAGER</span>
								</div>
								{#if sessioner.length}
									<div class="sessionliste">
										{#each sessioner as session (session.id)}
											<div class="sessionrad" class:samme={cookie === session.id}>
												<div><span>ID</span><code>{session.id}</code></div>
												<div><span>Bruker</span><b>{session.bruker.navn}</b></div>
											</div>
										{/each}
									</div>
								{:else}
									<div class="tomt">
										<span aria-hidden="true">—</span>
										<p>Ingen lagrede sessioner</p>
									</div>
								{/if}
							</article>
						</div>
						<p class="modellfot">
							HTTP er tilstandsløst: backend må finne brukerens session ved hver request. Brukerdata
							ligger på serveren.
						</p>
					</div>
				</div>

				<div class="kodevedtrinn">
					<SessionStepCode
						{trinn}
						ekstra={del === 'ekstra'}
						{forsok}
						{credentials}
						{resultat}
						navn={profil === 'A' ? ada.navn : noah.navn}
					/>
				</div>

				<details class="teknisk" bind:open={visDetaljer}>
					<summary
						><span>Se hva som sendes <small>HTTP og req.session</small></span><span
							class="pluss"
							aria-hidden="true">+</span
						></summary
					>
					{#if spor.length}
						<div class="spor">
							{#each spor as item}
								<article>
									<h3>{item.tittel}</h3>
									<div class="httpgrid">
										<div>
											<h4>Request · nettleser → server</h4>
											<pre>{item.request}</pre>
										</div>
										<div>
											<h4>Response · server → nettleser</h4>
											<pre>{item.response}</pre>
										</div>
									</div>
									<div class="reqsession">
										<h4>På serveren · req.session</h4>
										<pre>{item.session}</pre>
									</div>
								</article>
							{/each}
						</div>
					{:else}
						<p class="tomlogg">
							Bruk handlingsknappen først. Da vises requesten, svaret og brukerdataene som backend
							fant.
						</p>
					{/if}
					<p class="tekniskmerknad">
						Forenklet HTTP: nettleseren håndterer <code>Cookie</code> og <code>Set-Cookie</code>
						automatisk. Demo-ID-ene er korte; ekte ID-er genereres tilfeldig. Signatur, URL-koding, cookie-innstillinger
						i <code>req.session</code> og eventuell CORS-preflight er utelatt.
					</p>
				</details>
			</section>
		{:else}
			<section class="kodehjelp" aria-labelledby="kodetittel">
				<div class="seksjonstopp">
					<h2 id="kodetittel">Bruk det i eget prosjekt.</h2>
					<span class="lokalmerke">SVELTE + EXPRESS</span>
				</div>
				<p class="kodeintro">
					Disse utdragene er til elevprosjektet. Sessionpakken installeres i <b>Express-backenden</b
					>, og skal ikke legges inn i IT-labens Svelte-app.
				</p>
				<div class="installasjon">
					<span>I backend-mappen</span><code>npm install express-session cors</code>
				</div>
				<div class="kodevalg" role="group" aria-label="Velg kodeeksempel">
					{#each kodebiter as bit}<button
							class:aktiv={kodevalg === bit.id}
							aria-pressed={kodevalg === bit.id}
							onclick={() => (kodevalg = bit.id)}>{bit.navn}</button
						>{/each}
				</div>
				<article class="kodeinnhold">
					<p class="overlinje">{aktivKode.sted}</p>
					<h3>{aktivKode.tittel}</h3>
					<p>{aktivKode.intro}</p>
					<div class="kodevindu">
						<div><span aria-hidden="true">● ● ●</span><span>{aktivKode.sted}</span></div>
						<pre><code>{aktivKode.kode}</code></pre>
					</div>
					<p class="kodeforklaring">{aktivKode.forklaring}</p>
					{#if kodevalg === 'oppsett'}
						<aside class="kodenotat">
							<h4>Før du starter backend</h4>
							<p>
								Generer en tilfeldig hemmelighet én gang. Lagre den som <code
									>SESSION_SECRET=verdien</code
								>
								i backendens <code>.env</code>, og legg <code>.env</code> i <code>.gitignore</code>.
							</p>
							<pre><code
									>{"node -e \"console.log(require('node:crypto').randomBytes(32).toString('hex'))\""}</code
								></pre>
							<p>
								Start for eksempel med <code>node --env-file=.env server.js</code>. Bruk samme
								secret videre; ikke generer en ny ved hver request.
							</p>
							<p>
								<b>Kun lokal HTTP-lab:</b> <code>secure: false</code> og standardlageret MemoryStore
								er for øving. Drift trenger HTTPS, <code>secure: true</code>, et egnet sessionlager
								og riktig proxy-oppsett. Sessiondata i MemoryStore forsvinner ved omstart.
							</p>
						</aside>
					{:else if kodevalg === 'fetch'}
						<aside class="kodenotat">
							<h4>Ulik origin er ikke alltid ulik site</h4>
							<p>
								<code>http://localhost:5173</code> og <code>http://localhost:3000</code> er ulike
								origins, men same-site. <code>SameSite=Lax</code> kan derfor brukes i denne laben.
							</p>
							<p>
								Backend må tillate den konkrete frontend-adressen med CORS og <code
									>credentials: true</code
								>, som i oppsettet. <code>origin: "*"</code> kan ikke brukes her.
								<code>credentials: "include"</code> overstyrer ikke SameSite eller nettleserens øvrige
								cookie-regler.
							</p>
						</aside>
					{:else if kodevalg === 'innlogging'}
						<aside class="kodenotat">
							<h4>Autentisering og session er to deler</h4>
							<p>
								Sessionen husker en kontrollert innlogging. Den kontrollerer ikke passordet for deg.
								Demoen godtar «Ada» for å vise flyten; dette er ingen sikker påloggingsløsning.
							</p>
						</aside>
					{:else}
						<aside class="kodenotat">
							<h4>Backend bestemmer tilgangen</h4>
							<p>
								Kontroller session og nødvendige rettigheter i hver beskyttet rute. Å skjule en
								knapp i Svelte er ikke tilgangskontroll. Vurder også CSRF-beskyttelse for handlinger
								som endrer data.
							</p>
						</aside>
					{/if}
				</article>
				<div class="kilder">
					<span>Dokumentasjon</span><a
						href="https://expressjs.com/en/resources/middleware/session/"
						target="_blank"
						rel="noreferrer">express-session ↗</a
					><a
						href="https://expressjs.com/en/resources/middleware/cors/"
						target="_blank"
						rel="noreferrer">CORS ↗</a
					><a
						href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#including_credentials"
						target="_blank"
						rel="noreferrer">Fetch og credentials ↗</a
					>
				</div>
			</section>
		{/if}
		<footer>
			<a href="/">← Flere forsøk i IT-laben</a><span>Ett spørsmål om gangen</span>
		</footer>
	</main>
</div>

<style>
	.ovingslenke {
		max-width: 65ch;
		font-size: var(--font-small);
	}
	.ovingslenke a {
		color: var(--color-action);
		text-underline-offset: 3px;
	}
	:global(body) {
		margin: 0;
		background: var(--color-page);
	}
	.side {
		--ink: var(--color-text);
		--teal: var(--color-accent);
		--muted: var(--color-text-muted);
		--border: var(--color-border);
		min-height: 100vh;
		color: var(--ink);
		font-family:
			Inter,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		background: radial-gradient(ellipse at 90% 0, var(--color-page-glow), transparent 30%);
	}
	.side,
	.side * {
		box-sizing: border-box;
	}
	.ramme {
		width: min(1080px, calc(100% - 64px));
		margin-inline: auto;
	}
	header {
		flex-wrap: wrap;
		row-gap: 12px;
		min-height: 76px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		border-bottom: 1px solid var(--border);
	}
	a {
		color: inherit;
		text-decoration: none;
	}
	a:hover {
		color: var(--teal);
	}
	.tilbake {
		font-size: var(--font-small);
		font-weight: 750;
		white-space: nowrap;
	}
	.tilbake > span {
		margin-right: 7px;
	}
	.headerhoyre {
		flex-wrap: wrap;
		justify-content: flex-end;
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 20px;
	}
	.headerhoyre > a {
		font-size: var(--font-small);
	}
	h1,
	h2,
	h3,
	h4,
	p {
		margin-top: 0;
	}
	p {
		line-height: 1.65;
	}
	button,
	input {
		font: inherit;
	}
	button {
		cursor: pointer;
		color: var(--ink);
		background: var(--color-surface-raised);
		border: 1px solid var(--border);
		border-radius: 7px;
		padding: 10px 14px;
		font-size: var(--font-small);
		font-weight: 600;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	button:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-border);
	}
	a:focus-visible,
	button:focus-visible,
	input:focus-visible,
	summary:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}
	code,
	pre {
		font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
	}
	p code {
		font-size: var(--font-code-small);
		color: var(--color-accent);
		overflow-wrap: anywhere;
	}
	.intro {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		padding: 34px 0 27px;
	}
	.overlinje {
		color: var(--teal);
		font-size: var(--font-meta);
		font-weight: 750;
		letter-spacing: 1.5px;
		margin-bottom: 10px;
	}
	h1 {
		font-size: clamp(30px, 3.6vw, 43px);
		line-height: 1.15;
		letter-spacing: -1.5px;
		margin-bottom: 13px;
	}
	.ingress {
		font-size: var(--font-body);
		color: var(--muted);
		max-width: 680px;
		margin-bottom: 0;
	}
	.intromerke {
		display: flex;
		gap: 10px;
		align-items: center;
		color: var(--teal);
		font: var(--font-meta)/var(--leading-body) monospace;
		background: var(--color-surface-soft);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 20px;
		white-space: nowrap;
	}
	.intromerke > span {
		color: var(--color-text-subtle);
	}
	.hovedvalg {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
		margin-bottom: 22px;
	}
	.hovedvalg button {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 15px 17px;
		text-align: left;
		background: var(--color-surface);
		border-color: transparent;
	}
	.hovedvalg button > span {
		font: var(--font-small)/var(--leading-body) monospace;
		color: var(--color-text-subtle);
	}
	.hovedvalg button.valgt {
		color: var(--color-accent);
		border-color: var(--color-border-strong);
		background: var(--color-surface-active);
		box-shadow: inset 0 -3px var(--color-accent);
	}
	.oving,
	.kodehjelp {
		padding: 25px;
		background: var(--color-surface-raised);
		border: 1px solid var(--border);
		border-radius: 12px;
	}
	.seksjonstopp {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 15px;
	}
	h2 {
		font-size: 23px;
		letter-spacing: -0.6px;
		margin-bottom: 0;
	}
	.lokalmerke {
		font: var(--font-meta)/var(--leading-body) monospace;
		letter-spacing: 1px;
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	.demomerknad {
		font-size: var(--font-small);
		color: var(--muted);
		margin: 10px 0 20px;
		max-width: 800px;
	}
	.trinnvalg {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px;
	}
	.trinnvalg button {
		display: flex;
		align-items: center;
		gap: 10px;
		text-align: left;
		background: var(--color-surface);
	}
	.trinnvalg button > span {
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: var(--color-surface-soft);
		color: var(--color-text-muted);
		width: 25px;
		height: 25px;
		font: var(--font-small)/var(--leading-body) monospace;
		flex-shrink: 0;
	}
	button.aktiv {
		border-color: var(--color-border-strong);
		background: var(--color-surface-active);
		color: var(--color-accent);
	}
	.trinnvalg button.aktiv > span {
		background: var(--color-action);
		color: var(--color-on-action);
	}
	.forsokvalg,
	.kodevalg {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.navhint {
		font-size: var(--font-meta);
		color: var(--muted);
		margin: 10px 0 20px;
	}
	.oppgave {
		padding: 20px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		border-radius: 9px;
	}
	.sporsmal .overlinje {
		font-size: var(--font-meta);
		margin-bottom: 8px;
	}
	.sporsmal h3 {
		font-size: 22px;
		letter-spacing: -0.6px;
		line-height: 1.25;
		margin-bottom: 10px;
	}
	.utgangspunkt {
		font-size: var(--font-body);
		color: var(--muted);
		margin-bottom: 16px;
	}
	.utgangspunkt > b {
		font-weight: 600;
		color: var(--color-text-muted);
	}
	.handling {
		display: flex;
		align-items: center;
		gap: 18px;
	}
	.primaer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 26px;
		padding: 12px 16px;
		border-color: var(--color-action);
		background: var(--color-action);
		color: var(--color-on-action);
		white-space: nowrap;
	}
	.primaer:hover {
		background: var(--color-action-hover);
		border-color: var(--color-action-hover);
	}
	.handling > p {
		font-size: var(--font-body);
		color: var(--muted);
		margin: 0;
		max-width: 475px;
	}
	.resultat {
		display: flex;
		align-items: flex-start;
		gap: 13px;
		padding: 15px 0 0;
		margin-top: 16px;
		border-top: 1px solid var(--color-border);
	}
	.resultat h4 {
		font-size: var(--font-body);
		line-height: var(--leading-body);
		margin-bottom: 4px;
	}
	.resultat p {
		font-size: var(--font-body);
		color: var(--color-text-muted);
		margin-bottom: 0;
	}
	.resultat:not(.harresultat) p {
		font-size: var(--font-body);
		color: var(--color-text-muted);
	}
	.statuskode {
		font: var(--font-meta)/var(--leading-body) monospace;
		color: var(--color-success);
		background: var(--color-success-soft);
		padding: 7px 8px;
		border-radius: 5px;
		flex-shrink: 0;
	}
	.statuskode.avvist {
		color: var(--color-warning);
		background: var(--color-warning-soft);
	}
	.venter {
		font-size: 18px;
		color: var(--color-text-subtle);
		line-height: 1.2;
	}
	.ekstrakontroll {
		padding: 13px 0 16px;
		border-top: 1px solid var(--color-border);
	}
	.ekstrakontroll p {
		font-size: var(--font-body);
		margin: 9px 0 0;
		color: var(--muted);
	}
	.profilvalg {
		display: flex;
		gap: 8px;
	}
	.profilvalg button {
		padding-inline: 24px;
	}
	.bryter {
		display: flex;
		gap: 9px;
		align-items: center;
		flex-wrap: wrap;
		font-size: var(--font-small);
		font-weight: 600;
		cursor: pointer;
	}
	.bryter input {
		accent-color: var(--teal);
		width: 17px;
		height: 17px;
		cursor: pointer;
	}
	.bryter code {
		font-size: var(--font-meta);
		color: var(--color-text-muted);
		font-weight: 400;
		overflow-wrap: anywhere;
	}
	.modell {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 85px minmax(0, 1fr);
		gap: 0;
		align-items: stretch;
		margin-top: 20px;
	}
	.modell article {
		min-width: 0;
		border: 1px solid var(--color-border);
		border-radius: 9px;
		padding: 17px;
		background: var(--color-surface-raised);
	}
	.modell .server {
		background: var(--color-warning-soft);
		border-color: var(--color-warning-border);
	}
	.modellhode {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 16px;
	}
	.modellhode h3 {
		font-size: var(--font-body);
		letter-spacing: -0.25px;
		margin-bottom: 0;
	}
	.modellhode > span {
		font: var(--font-meta)/var(--leading-body) monospace;
		letter-spacing: 0.7px;
		color: var(--color-text-muted);
	}
	.server .modellhode > span {
		color: var(--color-warning);
	}
	.feltetikett {
		color: var(--muted);
		font-size: var(--font-meta);
		margin-bottom: 5px;
	}
	.idverdi {
		display: inline-block;
		background: var(--color-surface-active);
		color: var(--color-accent);
		border: 1px solid var(--color-border-strong);
		border-radius: 5px;
		padding: 6px 11px;
		font-size: 17px;
		letter-spacing: 0.5px;
	}
	.modelltekst {
		font-size: var(--font-body);
		color: var(--muted);
		margin: 10px 0 0;
	}
	.tomt {
		display: flex;
		align-items: center;
		gap: 14px;
		min-height: 70px;
		color: var(--color-text-subtle);
	}
	.tomt > span {
		font: 24px monospace;
		color: var(--color-text-subtle);
	}
	.tomt p {
		font-size: var(--font-body);
		margin-bottom: 0;
	}
	.mellom {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 7px;
		color: var(--color-text-subtle);
	}
	.mellom > span {
		font-size: 28px;
	}
	.mellom > small {
		font-size: var(--font-meta);
	}
	.sessionliste {
		display: grid;
		gap: 7px;
	}
	.sessionrad {
		display: grid;
		grid-template-columns: 1.2fr 1fr;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 9px 11px;
		gap: 14px;
		background: var(--color-surface-raised);
	}
	.sessionrad.samme {
		border-color: var(--color-border-strong);
		background: var(--color-surface-active);
	}
	.sessionrad > div {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.sessionrad span {
		font-size: var(--font-meta);
		color: var(--muted);
	}
	.sessionrad code {
		font-size: var(--font-body);
		color: var(--color-accent);
	}
	.sessionrad b {
		font-size: var(--font-body);
		font-weight: 650;
	}
	.modellfot {
		font-size: var(--font-meta);
		color: var(--muted);
		margin: 12px 0 19px;
	}
	.teknisk {
		border-top: 1px solid var(--border);
	}
	.kodevedtrinn {
		min-width: 0;
		margin: 20px 0;
	}
	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		cursor: pointer;
		list-style: none;
		font-size: var(--font-small);
		font-weight: 650;
		padding: 16px 0 0;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary small {
		font-size: var(--font-small);
		font-weight: 400;
		color: var(--color-text-muted);
		margin-left: 9px;
	}
	.pluss {
		flex-shrink: 0;
		line-height: 1;
		color: var(--teal);
		font-size: 21px;
		font-weight: 400;
	}
	details[open] .pluss {
		transform: rotate(45deg);
	}
	.spor {
		display: grid;
		gap: 22px;
		margin-top: 20px;
	}
	.spor article > h3 {
		font-size: var(--font-body);
		margin-bottom: 12px;
	}
	.httpgrid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 13px;
	}
	.httpgrid > div,
	.reqsession {
		min-width: 0;
		border: 1px solid var(--color-border);
		border-radius: 7px;
		background: var(--color-surface);
		padding: 14px;
	}
	.httpgrid h4,
	.reqsession h4 {
		font-size: var(--font-meta);
		color: var(--color-text-muted);
		margin-bottom: 13px;
	}
	.spor pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font-size: var(--font-code);
		line-height: var(--leading-code);
		color: var(--color-text-muted);
		margin: 0;
	}
	.reqsession {
		margin-top: 13px;
	}
	.tekniskmerknad,
	.tomlogg {
		font-size: var(--font-meta);
		color: var(--muted);
		margin: 17px 0 0;
	}
	.kodeintro {
		font-size: var(--font-body);
		color: var(--muted);
		margin: 14px 0 18px;
		max-width: 800px;
	}
	.installasjon {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 20px;
		border-radius: 7px;
		padding: 13px 15px;
		background: var(--color-surface);
		margin-bottom: 20px;
	}
	.installasjon > span {
		font-size: var(--font-meta);
		color: var(--color-text-muted);
	}
	.installasjon > code {
		font-size: var(--font-code);
		overflow-wrap: anywhere;
	}
	.kodevalg {
		padding-bottom: 20px;
		margin-bottom: 22px;
		border-bottom: 1px solid var(--border);
	}
	.kodevalg button {
		font-size: var(--font-small);
	}
	.kodeinnhold {
		max-width: 850px;
	}
	.kodeinnhold h3 {
		font-size: 23px;
		letter-spacing: -0.5px;
		margin-bottom: 12px;
	}
	.kodeinnhold > p {
		font-size: var(--font-body);
		color: var(--muted);
	}
	.kodeinnhold > .overlinje {
		color: var(--teal);
		font-size: var(--font-meta);
	}
	.kodevindu {
		border: 1px solid #2a5040;
		border-radius: 8px;
		overflow: hidden;
		margin-top: 20px;
	}
	.kodevindu > div {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 15px;
		background: #244737;
		color: #9ab892;
		padding: 11px 16px;
		font: var(--font-meta)/var(--leading-body) monospace;
		letter-spacing: 0.6px;
	}
	.kodevindu > div > span:first-child {
		color: #75916a;
		letter-spacing: 4px;
	}
	.kodevindu pre {
		font-size: var(--font-code);
		line-height: var(--leading-code);
		padding: 19px;
		margin: 0;
		background: #193c2f;
		color: #ddecce;
		overflow-x: auto;
		tab-size: 2;
	}
	.kodeforklaring {
		margin: 18px 0 22px;
		border-left: 3px solid var(--color-border);
		padding-left: 14px;
	}
	.kodenotat {
		padding: 17px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}
	.kodenotat h4 {
		font-size: var(--font-small);
		margin-bottom: 10px;
	}
	.kodenotat p {
		font-size: var(--font-body);
		color: var(--muted);
		margin-bottom: 12px;
	}
	.kodenotat p:last-child {
		margin-bottom: 0;
	}
	.kodenotat pre {
		font-size: var(--font-code);
		line-height: var(--leading-code);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		padding: 12px;
		margin: 0 0 12px;
		background: var(--color-surface-soft);
		border-radius: 5px;
		color: var(--color-text-muted);
	}
	.kilder {
		display: flex;
		flex-wrap: wrap;
		gap: 12px 18px;
		padding-top: 20px;
		margin-top: 24px;
		border-top: 1px solid var(--border);
		font-size: var(--font-small);
	}
	.kilder > span {
		color: var(--muted);
	}
	.kilder a {
		color: var(--teal);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	footer {
		display: flex;
		justify-content: space-between;
		gap: 20px;
		padding: 25px 0 35px;
		font-size: var(--font-meta);
	}
	footer > span {
		color: var(--color-text-muted);
	}
	@media (min-width: 1100px) {
		.arbeidsflate {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(min(100%, 28rem), 1fr));
			gap: 20px;
			align-items: start;
			margin-bottom: 20px;
		}
		.arbeidsflate .modell {
			margin-top: 0;
			grid-template-columns: minmax(0, 1fr) 32px minmax(0, 1fr);
		}
		.arbeidsflate .mellom > small {
			display: none;
		}
		.arbeidsflate .sessionrad {
			grid-template-columns: 1fr;
			gap: 9px;
		}
		.arbeidsflate .modellfot {
			margin-bottom: 0;
		}
	}
	@media (max-width: 900px) {
		.ramme {
			width: calc(100% - 40px);
		}
		.intromerke {
			display: none;
		}
		.hovedvalg button {
			font-size: var(--font-small);
			gap: 9px;
			padding: 14px;
		}
		.trinnvalg button {
			font-size: var(--font-small);
			gap: 8px;
			padding: 10px;
		}
		.modell {
			grid-template-columns: minmax(0, 1fr) 55px minmax(0, 1fr);
		}
		.mellom > small {
			display: none;
		}
		.handling {
			align-items: flex-start;
		}
	}
	@media (max-width: 650px) {
		.ramme {
			width: calc(100% - 28px);
		}
		header {
			min-height: 67px;
			gap: 12px;
		}
		.headerhoyre {
			gap: 12px;
		}
		.headerhoyre > a {
			font-size: var(--font-small);
		}
		.tilbake {
			font-size: var(--font-small);
		}
		.intro {
			padding: 27px 0 23px;
		}
		h1 {
			font-size: 34px;
			max-width: 500px;
			letter-spacing: -1.2px;
		}
		.ingress {
			font-size: var(--font-body);
		}
		.hovedvalg {
			gap: 6px;
			margin-bottom: 15px;
		}
		.hovedvalg button {
			flex-direction: column;
			align-items: flex-start;
			gap: 7px;
			font-size: var(--font-small);
			padding: 11px 10px;
			line-height: 1.4;
		}
		.hovedvalg button > span {
			font-size: var(--font-small);
		}
		.oving,
		.kodehjelp {
			padding: 17px;
		}
		h2 {
			font-size: 21px;
		}
		.lokalmerke {
			font-size: var(--font-meta);
			letter-spacing: 0.3px;
		}
		.demomerknad {
			font-size: var(--font-meta);
			margin-bottom: 17px;
		}
		.trinnvalg {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 7px;
		}
		.forsokvalg {
			gap: 6px;
		}
		.forsokvalg button {
			font-size: var(--font-small);
			padding: 9px 10px;
		}
		.navhint {
			font-size: var(--font-meta);
			margin-bottom: 16px;
		}
		.oppgave {
			padding: 16px;
		}
		.sporsmal h3 {
			font-size: 21px;
		}
		.utgangspunkt {
			font-size: var(--font-body);
		}
		.handling {
			flex-direction: column;
			gap: 10px;
		}
		.handling > p {
			font-size: var(--font-body);
		}
		.primaer {
			width: 100%;
			white-space: normal;
			text-align: left;
			font-size: var(--font-small);
		}
		.resultat {
			gap: 10px;
			padding-top: 13px;
			margin-top: 14px;
		}
		.resultat h4 {
			font-size: var(--font-body);
		}
		.resultat p {
			font-size: var(--font-body);
		}
		.statuskode {
			font-size: var(--font-meta);
			padding: 6px;
		}
		.modell {
			grid-template-columns: 1fr;
			margin-top: 16px;
		}
		.mellom {
			height: 34px;
		}
		.mellom > span {
			transform: rotate(90deg);
			font-size: 22px;
		}
		.modell article {
			padding: 15px;
		}
		.modellhode {
			margin-bottom: 12px;
		}
		.tomt {
			min-height: 40px;
		}
		.modellfot {
			font-size: var(--font-meta);
			margin-bottom: 15px;
		}
		summary {
			padding-right: 6px;
			font-size: var(--font-small);
		}
		summary small {
			display: block;
			margin: 5px 0 0;
			font-size: var(--font-small);
		}
		.httpgrid {
			grid-template-columns: 1fr;
		}
		.spor pre {
			font-size: var(--font-code);
		}
		.tekniskmerknad {
			font-size: var(--font-meta);
		}
		.bryter {
			font-size: var(--font-small);
		}
		.bryter code {
			font-size: var(--font-meta);
		}
		.ekstrakontroll p {
			font-size: var(--font-body);
		}
		.kodevalg {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 7px;
		}
		.kodevalg button {
			font-size: var(--font-small);
			padding: 10px;
			text-align: left;
		}
		.kodeinnhold h3 {
			font-size: 21px;
		}
		.kodeintro,
		.kodeinnhold > p {
			font-size: var(--font-body);
		}
		.kodevindu pre {
			font-size: var(--font-code);
			padding: 14px;
		}
		.kodevindu > div {
			padding-inline: 14px;
			font-size: var(--font-meta);
		}
		.installasjon > code {
			font-size: var(--font-code);
		}
		.kodenotat {
			padding: 14px;
		}
		.kodenotat p {
			font-size: var(--font-body);
		}
		footer {
			flex-direction: column;
			gap: 10px;
			font-size: var(--font-meta);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		button {
			transition: none;
		}
	}
	@media (max-width: 700px) {
		header {
			padding-block: 14px;
		}
		.headerhoyre {
			gap: 10px 14px;
		}
	}
	@media (max-width: 650px) {
		.hovedvalg {
			grid-template-columns: 1fr;
		}
		.hovedvalg button {
			flex-direction: row;
			align-items: center;
			min-height: 44px;
		}
		.trinnvalg button {
			gap: 6px;
			padding: 8px;
		}
		.trinnvalg button > span {
			width: 22px;
			height: 22px;
			flex: 0 0 22px;
		}
		.modellhode {
			flex-wrap: wrap;
			gap: 6px;
		}
	}
</style>
