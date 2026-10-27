<script>
	import PageLinks from '#lib/components/PageLinks.svelte';
	import ModuleContext from '#lib/components/ModuleContext.svelte';
	import { avatarFeedback } from '#lib/avatarFeedback.js';
	import InteractiveCode from '#lib/components/InteractiveCode.svelte';
	import { initState, codeLines, planRun, USERS, ROOMS, DEFAULT_OPTIONS } from '#lib/chatromLab.js';

	/** @typedef {'rooms' | 'session' | 'delete'} Kind */
	/** @typedef {'frontend' | 'backend'} Side */
	/** @type {{id: Kind, number: string, title: string, method: string, goal: string, question: string}[]} */
	const modules = [
		{
			id: 'rooms',
			number: '01',
			title: 'Velg rom',
			method: 'GET',
			goal: 'Hent bare meldingene som tilhører rommet du har valgt.',
			question: 'Hva må frontend sende for at backend skal vite hvilket rom du vil se?'
		},
		{
			id: 'session',
			number: '02',
			title: 'Send som innlogget',
			method: 'POST',
			goal: 'La backend finne avsenderen i sessionen når en melding sendes.',
			question: 'Kan noen bytte avsender ved å endre det som sendes fra nettleseren?'
		},
		{
			id: 'delete',
			number: '03',
			title: 'Slett egen melding',
			method: 'DELETE',
			goal: 'Bruk meldings-ID og sjekk eierskap før backend sletter.',
			question: 'Hva stopper en bruker fra å slette en annens melding?'
		}
	];

	/** @type {Kind} */
	let kind = $state('rooms');
	/** @type {Side} */
	let side = $state('frontend');
	/** @type {string} */
	let room = $state(DEFAULT_OPTIONS.room);
	/** @type {'ada' | 'noah' | 'none'} */
	let session = $state(DEFAULT_OPTIONS.session);
	/** @type {string} */
	let text = $state(DEFAULT_OPTIONS.text);
	/** @type {number | string} */
	let messageId = $state(DEFAULT_OPTIONS.messageId);
	let credentials = $state(true);
	let spoofSender = $state(false);
	let unknownRoom = $state(false);
	let unknownMessage = $state(false);
	let lab = $state(initState());
	/** @type {ReturnType<typeof planRun>} */
	let plan = $state([]);
	let step = $state(0);
	let revision = $state(0);
	let showData = $state(false);

	let current = $derived(step > 0 ? plan[step - 1] : null);
	let busy = $derived(step > 0 && step < plan.length);
	let finished = $derived(plan.length > 0 && step === plan.length);
	let module = $derived(modules.find((item) => item.id === kind) ?? modules[0]);
	let options = $derived({
		room: unknownRoom ? 'ukjent' : room,
		session,
		text,
		messageId: unknownMessage ? 999 : messageId,
		credentials,
		spoofSender
	});
	let codeKind = $derived(current?.codeKind ?? kind);
	let lines = $derived(codeLines(codeKind, side, options));
	let codeLabel = $derived.by(() => {
		if (codeKind === 'rooms') return `GET /meldinger?rom=${options.room}`;
		if (codeKind === 'session') return 'POST /meldinger';
		return `DELETE /meldinger/${options.messageId}`;
	});
	let roomMessages = $derived(lab.serverMessages.filter((message) => message.rom === room));
	let selectedExists = $derived(roomMessages.some((message) => message.id === Number(messageId)));
	let sameList = $derived(
		lab.clientRoom === room && JSON.stringify(lab.clientMessages) === JSON.stringify(roomMessages)
	);
	let refreshed = $derived(
		kind !== 'rooms' && current?.requestMethod === 'GET' && current.mutationStatus !== null
	);
	let error = $derived(Boolean(current?.httpStatus && current.httpStatus >= 400));
	let activeExperiments = $derived(!credentials || spoofSender || unknownRoom || unknownMessage);
	let user = $derived(session === 'none' ? null : USERS[session]);
	let startLabel = $derived.by(() =>
		kind === 'rooms' ? 'Hent rommet' : kind === 'session' ? 'Send melding' : 'Slett melding'
	);

	/** @param {unknown} value */
	function json(value) {
		return JSON.stringify(value, null, 2);
	}
	/** @param {string | null} id */
	function roomName(id) {
		return ROOMS.find((item) => item.id === id)?.navn ?? (id === null ? 'Ikke hentet ennå' : id);
	}

	function prepare() {
		if (busy) return;
		plan = [];
		step = 0;
		revision += 1;
	}

	function chooseTarget() {
		const candidates = lab.serverMessages.filter((message) => message.rom === room);
		const owner = session === 'none' ? null : USERS[session].id;
		messageId =
			candidates.find((message) => message.avsenderId === owner)?.id ?? candidates[0]?.id ?? 1;
	}

	/** @param {Kind} next */
	function changeKind(next) {
		if (busy || kind === next) return;
		prepare();
		kind = next;
		side = 'frontend';
		credentials = true;
		spoofSender = false;
		unknownRoom = false;
		unknownMessage = false;
		if (next === 'delete') chooseTarget();
	}

	/** @param {Event & {currentTarget: EventTarget & HTMLSelectElement}} event */
	function changeRoom(event) {
		if (busy) return;
		prepare();
		room = event.currentTarget.value;
		chooseTarget();
	}

	/** @param {Side} next */
	function changeSide(next) {
		side = next;
		revision += 1;
	}

	function start() {
		avatarFeedback(
			'chatrom',
			'working',
			'Følg meldingen og legg merke til hvilket rom den havner i.'
		);
		if (busy) return;
		plan = planRun(lab, kind, { ...options });
		step = 0;
		nextStep();
	}

	function nextStep() {
		if (step >= plan.length) return;
		const next = plan[step];
		lab = {
			serverMessages: next.serverMessages.map((message) => ({ ...message })),
			clientMessages: next.clientMessages.map((message) => ({ ...message })),
			clientRoom: next.clientRoom,
			nextId: next.nextId
		};
		side = next.side;
		step += 1;
		revision += 1;
	}

	function finish() {
		while (step < plan.length) nextStep();
	}

	function reset() {
		lab = initState();
		plan = [];
		step = 0;
		room = DEFAULT_OPTIONS.room;
		session = DEFAULT_OPTIONS.session;
		text = DEFAULT_OPTIONS.text;
		messageId = DEFAULT_OPTIONS.messageId;
		credentials = true;
		spoofSender = false;
		unknownRoom = false;
		unknownMessage = false;
		side = 'frontend';
		revision += 1;
	}

	// The alternative room structure is an independent, local experiment.
	function initialRoomLists() {
		return [
			{
				id: 'generelt',
				navn: 'Generelt',
				meldinger: [{ id: 1, avsenderId: 'elev-ada', avsender: 'Ada', tekst: 'Hei alle sammen!' }]
			},
			{
				id: 'gaming',
				navn: 'Gaming',
				meldinger: [
					{ id: 2, avsenderId: 'elev-noah', avsender: 'Noah', tekst: 'Noen som vil spille?' }
				]
			}
		];
	}
	let roomLists = $state(initialRoomLists());
	let nestedNextId = $state(3);
	let nestedRoom = $state('generelt');
	let nestedText = $state('En melding i dette rommet.');
	let nestedStatus = $state('');
	let nestedSelected = $derived(roomLists.find((item) => item.id === nestedRoom));
	const nestedGet = `app.get("/meldinger", (req, res) => {
  const rom = romListe.find(r => r.id === req.query.rom);
  if (!rom) return res.status(404).json({ beskjed: "Rommet finnes ikke." });
  res.json(rom.meldinger);
});`;

	function addNested() {
		const value = nestedText.trim();
		if (!value) {
			nestedStatus = 'Skriv en melding først.';
			return;
		}
		if (!nestedSelected) return;
		nestedSelected.meldinger.push({
			id: nestedNextId++,
			avsenderId: 'elev-ada',
			avsender: 'Ada',
			tekst: value
		});
		nestedStatus = `Lagt til i ${nestedSelected.navn}. Det andre rommet er uendret.`;
	}
</script>

<svelte:head>
	<title>Bygg videre på chatten – IT-laben</title>
	<meta
		name="description"
		content="Utforsk koden bak chatrom, avsender fra session og sletting av egne meldinger. Ett forsøk og én kodeforklaring om gangen."
	/>
</svelte:head>

<div class="side">
	<main id="hovedinnhold" tabindex="-1">
		<ModuleContext />
		<section class="intro" aria-labelledby="sidetittel">
			<p class="overlinje"><span></span> BYGG VIDERE PÅ CHATTEN</p>
			<h1 id="sidetittel">Samme chat.<br class="mobilbrudd" /> <em>Flere muligheter.</em></h1>
			<p class="ingress">
				Velg rom, finn avsenderen og slett en melding. Utforsk koden i tre små forsøk, med
				forklaringer der du klikker.
			</p>
			<p class="simulering">
				<span aria-hidden="true">◉</span> Simulering i nettleseren · ingen ekte innlogging eller nettverkskall
			</p>
		</section>

		<div class="modulvalg" role="group" aria-label="Velg kodeforsøk">
			{#each modules as item}
				<button
					type="button"
					class:valgt={kind === item.id}
					aria-pressed={kind === item.id}
					disabled={busy}
					onclick={() => changeKind(item.id)}
				>
					<span class="modulnummer">{item.number}</span><span class="modultekst"
						>{item.title}<small>{item.method}</small></span
					><span class="modulpil" aria-hidden="true">↗</span>
				</button>
			{/each}
		</div>

		<section class="forsok" aria-labelledby="forsoktittel">
			<div class="forsokhode">
				<div>
					<p class="overlinje">FORSØK {module.number} AV 03</p>
					<h2 id="forsoktittel">{module.title}</h2>
					<p>{module.goal}</p>
				</div>
				<button type="button" class="nullstill" onclick={reset}
					>Nullstill data <span aria-hidden="true">↺</span></button
				>
			</div>
			<div class="kontroller">
				<label
					>Rom<select value={room} onchange={changeRoom} disabled={busy}
						>{#each ROOMS as item}<option value={item.id}>{item.navn}</option>{/each}</select
					></label
				>
				{#if kind !== 'rooms'}
					<label
						>Innlogget i forsøket<select bind:value={session} onchange={prepare} disabled={busy}
							><option value="ada">Ada</option><option value="noah">Noah</option><option
								value="none">Ingen</option
							></select
						></label
					>
				{/if}
				{#if kind === 'session'}
					<label class="meldingfelt"
						>Melding<input
							bind:value={text}
							oninput={prepare}
							disabled={busy}
							placeholder="Skriv en melding …"
						/></label
					>
				{:else if kind === 'delete'}
					<label class="meldingfelt"
						>Melding som skal slettes<select
							bind:value={messageId}
							onchange={prepare}
							disabled={busy}
							>{#each roomMessages as message}<option value={message.id}
									>#{message.id} · {message.avsender}: {message.tekst}</option
								>{/each}{#if !selectedExists}<option value={messageId}
									>#{messageId} · finnes ikke i dette rommet</option
								>{/if}</select
						></label
					>
				{:else}
					<p class="kontrollhint">
						Romvalget blir sendt i URL-en.<br /><code>?rom={options.room}</code>
					</p>
				{/if}
			</div>
			{#if kind !== 'rooms'}<p class="sessionhint">
					Vi starter etter innlogging: {#if user}<code>req.session.bruker</code> kan inneholde
						<strong>{user.navn}</strong>.{:else}ingen bruker ligger i sessionen.{/if}
					<a href="/sessions/">Se hvordan sessionen opprettes ↗</a>
				</p>{/if}
			{#if activeExperiments}<p class="eksperimentvarsel">
					Et feilforsøk er aktivt. Se «Prøv en endring» nedenfor.
				</p>{/if}

			<div class="kjorefelt">
				<div class="kjoreknapper">
					{#if busy}<button type="button" class="hovedknapp" onclick={nextStep}
							>Neste steg <span aria-hidden="true">→</span></button
						><button type="button" class="sekundaerknapp" onclick={finish}>Kjør ferdig</button
						>{:else}<button type="button" class="hovedknapp" onclick={start}
							>{finished ? 'Prøv igjen' : startLabel} <span aria-hidden="true">→</span></button
						>{/if}
					<span class="stegteller"
						>{plan.length ? `Steg ${step} av ${plan.length}` : 'Klar til å utforske'}</span
					>
				</div>
				{#if refreshed}<span class="oppfolging"
						>{kind === 'session' ? 'Etter sending' : 'Etter sletting'}: hent rommet på nytt</span
					>{/if}
			</div>
			<div class="stegbeskrivelse" class:feil={error} aria-live="polite" aria-atomic="true">
				<div class="stegtekst">
					<h3>{current?.title ?? 'Les koden, eller start forsøket.'}</h3>
					<p>{current?.explanation ?? module.question}</p>
				</div>
				{#if current?.httpStatus}<span class="httpstatus" class:feil={error}
						>{#if refreshed && current.mutationStatus}<span
								>{module.method} {current.mutationStatus} →
							</span>{/if}{current.requestMethod}
						{current.httpStatus}</span
					>{/if}
			</div>

			<InteractiveCode
				{lines}
				{side}
				onsidechange={changeSide}
				activeSide={current?.side ?? null}
				activeLineIds={current?.lineIds ?? []}
				resetKey={`${kind}-${step}-${revision}`}
				label={codeLabel}
			/>

			<div class="resultatlinje" class:feil={error}>
				<p>
					<span class="resultatprikk" aria-hidden="true"></span><strong
						>{current?.status ||
							(lab.clientRoom === null
								? 'Frontend har ikke hentet meldinger ennå.'
								: `${lab.clientMessages.length} meldinger vises fra ${roomName(lab.clientRoom)}.`)}</strong
					>
				</p>
				<button
					type="button"
					aria-expanded={showData}
					aria-controls="forsokdata"
					onclick={() => (showData = !showData)}
					>{showData ? 'Skjul dataene' : 'Se dataene'}
					<span aria-hidden="true">{showData ? '−' : '+'}</span></button
				>
			</div>
			{#if showData}
				<div class="dataomrade" id="forsokdata">
					<section class="datakort" aria-labelledby="klienttittel">
						<div class="datakorthode">
							<h3 id="klienttittel">Dette viser frontend</h3>
							<span>{roomName(lab.clientRoom)}</span>
						</div>
						{#if lab.clientRoom === null}<p class="tomtekst">
								Listen fylles når frontend har lest et GET-svar.
							</p>{:else if lab.clientMessages.length === 0}<p class="tomtekst">
								Rommet er tomt.
							</p>{:else}<ul class="meldingsliste">
								{#each lab.clientMessages as message (message.id)}<li>
										<div><strong>{message.avsender}</strong><span>#{message.id}</span></div>
										<p>{message.tekst}</p>
									</li>{/each}
							</ul>{/if}
						{#if lab.clientRoom !== null && !sameList}<p class="datamerknad">
								Listen viser det siste GET-svaret. Et nytt romvalg eller en endring på backend vises
								først etter neste henting.
							</p>{/if}
					</section>
					<section class="datakort" aria-labelledby="servertittel">
						<div class="datakorthode">
							<h3 id="servertittel">Dette ligger på backend</h3>
							<span>{lab.serverMessages.length} totalt</span>
						</div>
						<pre><code>{json(lab.serverMessages)}</code></pre>
					</section>
					<section class="datakort" aria-labelledby="requesttittel">
						<div class="datakorthode">
							<h3 id="requesttittel">Request</h3>
							<span>{current?.requestMethod ?? 'Ikke sendt'}</span>
						</div>
						{#if current?.requestPath}<p class="requeststi"><code>{current.requestPath}</code></p>
							<pre><code
									>{current.requestBody === null
										? 'Ingen JSON-body i denne requesten.'
										: json(current.requestBody)}</code
								></pre>{:else}<p class="tomtekst">
								Start forsøket for å se hva frontend sender.
							</p>{/if}{#if current && current.requestMethod !== 'GET'}<p class="datalabel">
								Bruker lest fra sessionen på backend
							</p>
							{#if current.requestUser === null && current.httpStatus === null}
								<p class="tomtekst">Backend har ikke slått opp sessionen ennå.</p>
							{:else}
								<pre class="sessiondata"><code>{json(current.requestUser)}</code></pre>
							{/if}{/if}
					</section>
					<section class="datakort" aria-labelledby="responstittel">
						<div class="datakorthode">
							<h3 id="responstittel">Response</h3>
							<span>{current?.httpStatus ?? 'Venter'}</span>
						</div>
						{#if current?.responseBody !== null && current?.responseBody !== undefined}<pre><code
									>{json(current.responseBody)}</code
								></pre>{:else}<p class="tomtekst">Backend har ikke svart ennå.</p>{/if}
					</section>
				</div>
			{/if}

			<details class="tillegg eksperimenter">
				<summary
					><span><span class="tilleggsmerke">PRØV SELV</span>Prøv en endring</span><span
						aria-hidden="true">+</span
					></summary
				>
				<div class="tilleggsinnhold">
					{#if kind === 'rooms'}<p>
							Hent Generelt, bytt til Gaming og stopp før GET-svaret er lest. Hvilken liste viser
							frontend nå?
						</p>
						<label class="avkryssing"
							><input
								type="checkbox"
								bind:checked={unknownRoom}
								onchange={prepare}
								disabled={busy}
							/><span
								>Be om et rom som ikke finnes <small
									>Sender <code>?rom=ukjent</code>. Se hvor backend stopper requesten.</small
								></span
							></label
						>
					{:else}<label class="avkryssing"
							><input
								type="checkbox"
								bind:checked={credentials}
								onchange={prepare}
								disabled={busy}
							/><span
								>Send session-cookien med requesten <small
									>Koden bruker <code>credentials: "{credentials ? 'include' : 'omit'}"</code>. Prøv
									å slå dette av.</small
								></span
							></label
						>
						{#if kind === 'session'}<label class="avkryssing"
								><input
									type="checkbox"
									bind:checked={spoofSender}
									onchange={prepare}
									disabled={busy}
								/><span
									>Forsøk å sende et annet avsendernavn i body <small
										>Backend skal fortsatt bruke brukeren fra sessionen.</small
									></span
								></label
							>
							<p class="miniforsok">
								Prøv også «Ingen» som innlogget bruker, eller en melding med bare mellomrom. Finn
								linjen som stopper hvert forsøk.
							</p>
						{:else}<p>
								Velg Ada som innlogget og prøv å slette en av Noahs meldinger. Hvilken sammenligning
								beskytter meldingen?
							</p>
							<label class="avkryssing"
								><input
									type="checkbox"
									bind:checked={unknownMessage}
									onchange={prepare}
									disabled={busy}
								/><span
									>Bruk en meldings-ID som ikke finnes <small
										>Sender <code>DELETE /meldinger/999</code>.</small
									></span
								></label
							>{/if}
					{/if}
					{#if busy}<p class="datamerknad">
							Fullfør forsøket eller nullstill dataene før du endrer innstillingene.
						</p>{/if}
				</div>
			</details>
		</section>

		<section class="videre" aria-label="Fordypning">
			<details class="tillegg">
				<summary
					><span
						><span class="tilleggsmerke">KOBLE DET SAMMEN</span>Hva trenger dette i mitt eget
						prosjekt?</span
					><span aria-hidden="true">+</span></summary
				>
				<div class="tilleggsinnhold prosjekt">
					<p>
						Koden over viser funksjonene vi undersøker. I ditt prosjekt må de kobles til skjemaet,
						meldingslisten og Express-serveren.
					</p>
					<ol>
						<li>
							<strong>Lag et fungerende utgangspunkt.</strong>
							<a href="/backend/">Frontend møter backend</a>
							viser hvordan <code>fetch</code>, <code>req.body</code> og JSON-svar henger sammen.
						</li>
						<li>
							<strong>Opprett sessionen ved innlogging.</strong>
							<a href="/sessions/">Sessions og pålogging</a>
							viser cookie og <code>req.session.bruker</code>. I chatforsøket bruker vi en allerede
							opprettet session.
						</li>
						<li>
							<strong>Gi hver melding en egen ID.</strong> Lagre <code>id</code>, <code>rom</code>,
							<code>avsenderId</code>, <code>avsender</code> og <code>tekst</code>. ID-en skal være
							stabil selv om andre meldinger slettes.
						</li>
						<li>
							<strong>Legg til én funksjon om gangen.</strong> Start med romhenting, koble til session
							ved sending, og legg deretter til sletting med eiersjekk på backend.
						</li>
					</ol>
					<p>
						I frontend er <code>API</code> adressen til Express-serveren. Erklær <code>rom</code>,
						<code>tekst</code>, <code>meldinger</code>, <code>vistRom</code> og <code>status</code>
						som <code>$state</code>-verdier i Svelte-komponenten. <code>valgtRom</code> er en lokal
						kopi for hver kjøring. <code>hentRom(valgtRom)</code> er hjelpefunksjonen fra forsøk 1, og
						legges inn én gang.
					</p>
					<p>
						På Express-serveren må <code>express.json()</code>, session-middleware og eventuelt
						CORS-oppsett kjøre før rutene. Backend bruker <code>let meldinger</code> som felles
						liste og <code>let nesteId</code> som teller. Start telleren over den høyeste ID-en i listen,
						og behold verdien når en melding slettes.
					</p>
					<p>
						I forsøket er rommene åpne, og meldingene ligger i minnet. Romfiltrering er ikke en
						kontroll av hvem som får lese et privat rom. Vil du beholde data etter omstart, bygg
						videre med <a href="/fillagring/">lagring i JSON-fil</a>.
					</p>
					<p class="kildelenker">
						Les videre: <a
							href="https://expressjs.com/en/resources/middleware/session/"
							target="_blank"
							rel="noreferrer">Express: session</a
						>
						·
						<a
							href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch"
							target="_blank"
							rel="noreferrer">MDN: fetch og credentials</a
						>
						·
						<a
							href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/DELETE"
							target="_blank"
							rel="noreferrer">MDN: DELETE</a
						>
					</p>
				</div>
			</details>

			<details class="tillegg alternativ">
				<summary
					><span
						><span class="tilleggsmerke">EN ANNEN DATASTRUKTUR</span>Hva om hvert rom har sin egen
						liste?</span
					><span aria-hidden="true">+</span></summary
				>
				<div class="tilleggsinnhold">
					<p>
						Over har vi én felles meldingsliste og bruker <code>filter()</code> for å hente riktig
						rom. Her ligger listen inne i hvert rom. Da finner vi rommet med <code>find()</code> og
						bruker <code>rom.meldinger</code>.
					</p>
					<div class="alternativgrid">
						<div>
							<h3>Prøv den andre strukturen</h3>
							<p class="liten">Et eget forsøk. Det endrer ikke dataene i kodelaben over.</p>
							<label
								>Rom i dette forsøket<select
									bind:value={nestedRoom}
									onchange={() => (nestedStatus = '')}
									>{#each roomLists as item}<option value={item.id}>{item.navn}</option
										>{/each}</select
								></label
							><label
								>Melding fra Ada<input
									bind:value={nestedText}
									oninput={() => (nestedStatus = '')}
								/></label
							>
							<div class="alternativknapper">
								<button type="button" class="hovedknapp" onclick={addNested}
									>Legg til i rommet <span aria-hidden="true">+</span></button
								><button
									type="button"
									class="nullstill"
									onclick={() => {
										roomLists = initialRoomLists();
										nestedNextId = 3;
										nestedStatus = '';
									}}>Nullstill</button
								>
							</div>
							<p class="alternativstatus" aria-live="polite">
								{nestedStatus ||
									`${nestedSelected?.meldinger.length ?? 0} meldinger i ${nestedSelected?.navn ?? ''}.`}
							</p>
						</div>
						<pre class="lyskode"><code>{json(roomLists)}</code></pre>
					</div>
					<h3>GET finner rommet først</h3>
					<pre class="morkkode"><code>{nestedGet}</code></pre>
					<p>
						Responsen er fortsatt en liste med meldings-ID, avsender-ID, avsender og tekst. Frontend
						henter og viser listen på samme måte. Et tomt rom gir <code>[]</code>; et rom som ikke
						finnes gir her <code>404</code>. POST og DELETE må også tilpasses den nye
						lagringsstrukturen.
					</p>
				</div>
			</details>
		</section>

		<footer>
			<a href="/">← Tilbake til IT-laben</a>
			<p>Ta ett steg om gangen. Klikk når du lurer.</p>
		</footer>
		<PageLinks
			links={[
				{ href: '/backend/', label: 'Frontend og backend' },
				{ href: '/sessions/', label: 'Sessions' }
			]}
		/>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background: var(--color-page);
	}
	.side {
		--blekk: var(--color-text);
		--gronn: var(--color-accent);
		--dempa: var(--color-text-muted);
		--kant: var(--color-border);
		min-height: 100vh;
		color: var(--blekk);
		font-family:
			Inter,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		font-size: var(--font-body);
		line-height: var(--leading-body);
	}
	.side * {
		box-sizing: border-box;
	}
	main {
		width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		margin: 0 auto;
	}

	a {
		color: var(--gronn);
		text-underline-offset: 3px;
	}

	footer a:hover {
		text-decoration: underline;
	}
	.intro {
		padding: 40px 0 30px;
		max-width: 850px;
	}
	.overlinje {
		margin: 0 0 9px;
		font-size: var(--font-meta);
		font-weight: 750;
		letter-spacing: 1.8px;
		color: var(--gronn);
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.overlinje > span {
		width: 6px;
		height: 6px;
		background: var(--gronn);
		border-radius: 50%;
	}
	h1 {
		margin: 0;
		font-size: clamp(30px, 3.8vw, 49px);
		letter-spacing: -1.7px;
		line-height: 1.18;
		font-weight: 690;
	}
	h1 em {
		font-family: Georgia, serif;
		font-weight: 400;
		color: var(--gronn);
	}
	.mobilbrudd {
		display: none;
	}
	.ingress {
		max-width: 660px;
		margin: 15px 0 11px;
		color: var(--color-text-muted);
		font-size: var(--font-body);
	}
	.simulering {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: var(--font-meta);
		color: var(--dempa);
	}
	.simulering > span {
		color: var(--gronn);
	}
	button,
	input,
	select {
		font: inherit;
	}
	button {
		cursor: pointer;
	}
	button:disabled,
	input:disabled,
	select:disabled {
		cursor: default;
		opacity: 0.62;
	}
	button:focus-visible,
	a:focus-visible,
	summary:focus-visible,
	input:focus-visible,
	select:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.modulvalg {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		border: 1px solid var(--color-border);
		border-radius: 9px;
		overflow: hidden;
		margin-bottom: 30px;
	}
	.modulvalg button {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 17px 21px;
		border: 0;
		border-right: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--blekk);
		text-align: left;
	}
	.modulvalg button:last-child {
		border-right: 0;
	}
	.modulvalg button.valgt {
		background: var(--color-surface-active);
		box-shadow: inset 0 -3px var(--gronn);
	}
	.modulvalg button:not(:disabled):hover {
		background: var(--color-surface-hover);
	}
	.modulnummer {
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			SFMono-Regular,
			Menlo,
			monospace;
		color: var(--color-text-muted);
	}
	.modultekst {
		font-weight: 680;
		line-height: 1.4;
	}
	.modultekst small {
		display: block;
		color: var(--color-text-muted);
		font-size: var(--font-meta);
		letter-spacing: 1px;
		margin-top: 3px;
		font-weight: 600;
	}
	.modulpil {
		margin-left: auto;
		color: var(--color-text-muted);
		font-size: 19px;
	}
	.forsokhode {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 20px;
	}
	h2 {
		margin: 0;
		font-size: 25px;
		line-height: 1.3;
		letter-spacing: -0.6px;
	}
	.forsokhode .overlinje {
		margin-bottom: 5px;
		font-size: var(--font-meta);
	}
	.forsokhode p:last-child {
		margin: 7px 0 0;
		color: var(--dempa);
		font-size: var(--font-body);
	}
	.nullstill {
		border: 0;
		background: transparent;
		color: var(--color-text-muted);
		font-size: var(--font-small);
		padding: 9px 0 9px 12px;
		white-space: nowrap;
	}
	.nullstill:hover {
		color: var(--gronn);
		text-decoration: underline;
	}
	.nullstill span {
		margin-left: 8px;
		font-size: var(--font-body);
	}
	.kontroller {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 14px;
		margin-top: 22px;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: var(--font-small);
		font-weight: 650;
	}
	.kontroller label {
		min-width: 170px;
	}
	input,
	select {
		width: 100%;
		min-height: 42px;
		background: var(--color-surface-raised);
		color: var(--blekk);
		border: 1px solid var(--color-border);
		border-radius: 5px;
		padding: 9px 12px;
		font-size: var(--font-small);
	}
	select {
		padding-right: 28px;
	}
	input::placeholder {
		color: var(--color-text-subtle);
	}
	.meldingfelt {
		flex: 1 1 250px;
		max-width: 660px;
		min-width: 0 !important;
	}
	.kontrollhint {
		margin: 0;
		font-size: var(--font-body);
		line-height: var(--leading-body);
		color: var(--dempa);
		padding: 0 0 1px 2px;
	}
	code,
	pre {
		font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
	}
	p code,
	li code,
	label code {
		font-size: var(--font-code-small);
		padding: 1px 4px;
		background: var(--color-surface-soft);
		border-radius: 3px;
		overflow-wrap: anywhere;
	}
	.sessionhint {
		margin: 10px 0 0;
		color: var(--dempa);
		font-size: var(--font-meta);
	}
	.sessionhint a {
		margin-left: 6px;
		white-space: nowrap;
	}
	.eksperimentvarsel {
		font-size: var(--font-meta);
		color: var(--color-warning);
		margin: 9px 0 0;
	}
	.kjorefelt {
		margin-top: 22px;
		margin-bottom: 13px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px 20px;
	}
	.kjoreknapper {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
	}
	.hovedknapp {
		border: 1px solid var(--color-border);
		border-radius: 5px;
		padding: 10px 17px;
		background: var(--color-action);
		color: var(--color-on-action);
		font-weight: 700;
		font-size: var(--font-small);
	}
	.hovedknapp span {
		margin-left: 14px;
	}
	.hovedknapp:hover {
		background: var(--color-action-hover);
	}
	.sekundaerknapp {
		border: 1px solid var(--color-border);
		border-radius: 5px;
		padding: 10px 14px;
		background: transparent;
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.sekundaerknapp:hover {
		background: var(--color-surface-hover);
	}
	.stegteller {
		font-size: var(--font-meta);
		color: var(--color-text-muted);
		margin-left: 3px;
	}
	.oppfolging {
		font-size: var(--font-meta);
		color: var(--gronn);
	}
	.stegbeskrivelse {
		min-height: 94px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		padding: 15px 18px;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		border-radius: 7px;
		margin-bottom: 14px;
	}
	.stegbeskrivelse.feil {
		background: var(--color-warning-soft);
		border-color: var(--color-warning-border);
	}
	.stegtekst h3 {
		font-size: var(--font-body);
		margin: 0 0 4px;
	}
	.stegtekst p {
		margin: 0;
		font-size: var(--font-body);
		color: var(--color-text-muted);
		max-width: 840px;
	}
	.stegbeskrivelse.feil p {
		color: var(--color-warning);
	}
	.httpstatus {
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			SFMono-Regular,
			Menlo,
			monospace;
		background: var(--color-success-soft);
		color: var(--color-success);
		padding: 6px 8px;
		border-radius: 4px;
		white-space: nowrap;
		margin-top: 2px;
	}
	.httpstatus.feil {
		background: var(--color-warning-soft);
		color: var(--color-warning);
	}
	.httpstatus > span {
		color: inherit;
		opacity: 0.85;
	}
	.resultatlinje {
		margin-top: 14px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-surface);
		padding: 13px 17px;
		display: flex;
		align-items: center;
		gap: 18px;
		justify-content: space-between;
	}
	.resultatlinje p {
		margin: 0;
		display: flex;
		gap: 9px;
		align-items: baseline;
		font-size: var(--font-body);
	}
	.resultatlinje strong {
		font-weight: 560;
		overflow-wrap: anywhere;
	}
	.resultatprikk {
		flex: 0 0 6px;
		width: 6px;
		height: 6px;
		background: var(--color-success);
		border-radius: 50%;
	}
	.resultatlinje.feil {
		background: var(--color-warning-soft);
		border-color: var(--color-warning-border);
	}
	.resultatlinje.feil .resultatprikk {
		background: var(--color-warning);
	}
	.resultatlinje button {
		border: 0;
		background: transparent;
		padding: 0;
		font-size: var(--font-small);
		color: var(--gronn);
		white-space: nowrap;
	}
	.resultatlinje button span {
		margin-left: 9px;
	}
	.dataomrade {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
		margin-top: 14px;
	}
	.datakort {
		min-width: 0;
		background: var(--color-surface-raised);
		border: 1px solid var(--kant);
		border-radius: 7px;
		overflow: hidden;
	}
	.datakorthode {
		padding: 13px 15px;
		border-bottom: 1px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}
	.datakorthode h3 {
		font-size: var(--font-small);
		margin: 0;
	}
	.datakorthode > span {
		font-size: var(--font-meta);
		color: var(--dempa);
	}
	.datakort pre {
		max-height: 260px;
		margin: 0;
		padding: 14px 15px;
		font-size: var(--font-code);
		line-height: var(--leading-code);
		overflow: auto;
	}
	.tomtekst {
		font-size: var(--font-body);
		margin: 17px 15px;
		color: var(--color-text-muted);
	}
	.meldingsliste {
		list-style: none;
		padding: 0 15px;
		margin: 0;
		max-height: 260px;
		overflow-y: auto;
	}
	.meldingsliste li {
		padding: 12px 0;
		border-bottom: 1px solid var(--color-border);
	}
	.meldingsliste li:last-child {
		border-bottom: 0;
	}
	.meldingsliste li > div {
		display: flex;
		gap: 12px;
		align-items: center;
		font-size: var(--font-meta);
	}
	.meldingsliste li > div > span {
		color: var(--color-text-muted);
		font: var(--font-meta)/var(--leading-body) monospace;
	}
	.meldingsliste p {
		font-size: var(--font-body);
		margin: 4px 0 0;
		overflow-wrap: anywhere;
	}
	.datamerknad {
		color: var(--color-warning);
		font-size: var(--font-meta);
		margin: 12px 15px;
	}
	.requeststi {
		font-size: var(--font-meta);
		margin: 13px 15px 0;
		overflow-wrap: anywhere;
	}
	.datalabel {
		font-size: var(--font-meta);
		margin: 0 15px;
		color: var(--color-text-muted);
	}
	.datakort .sessiondata {
		padding-top: 5px;
	}
	.tillegg {
		border: 1px solid var(--kant);
		background: var(--color-surface-raised);
		border-radius: 7px;
		margin-top: 14px;
	}
	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		cursor: pointer;
		list-style: none;
		padding: 16px 19px;
		font-size: var(--font-small);
		font-weight: 650;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary > span:last-child {
		font-size: 20px;
		line-height: 1;
		color: var(--color-text-subtle);
		font-weight: 400;
		transition: transform 0.15s;
	}
	details[open] > summary > span:last-child {
		transform: rotate(45deg);
	}
	.tilleggsmerke {
		display: inline-block;
		min-width: 126px;
		margin-right: 16px;
		color: var(--color-text-muted);
		font-size: var(--font-meta);
		letter-spacing: 1px;
		font-weight: 700;
	}
	.tilleggsinnhold {
		padding: 3px 19px 18px;
		font-size: var(--font-body);
		color: var(--color-text-muted);
	}
	.tilleggsinnhold > p {
		max-width: 960px;
		margin: 9px 0 14px;
	}
	.tilleggsinnhold h3 {
		margin: 8px 0;
		color: var(--blekk);
		font-size: var(--font-small);
	}
	.avkryssing {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 0;
		font-size: var(--font-body);
		font-weight: 550;
	}
	.avkryssing input {
		width: 16px;
		height: 16px;
		min-height: 0;
		flex: 0 0 16px;
		margin: 3px 0 0;
		accent-color: var(--gronn);
	}
	.avkryssing small {
		display: block;
		font-size: var(--font-small);
		font-weight: 400;
		margin-top: 3px;
		color: var(--color-text-muted);
	}
	.tilleggsinnhold .miniforsok {
		font-size: var(--font-body);
		margin-top: 10px;
	}
	.videre {
		margin-top: 30px;
	}
	.prosjekt ol {
		margin: 15px 0;
		padding-left: 21px;
		max-width: 960px;
	}
	.prosjekt li {
		margin-bottom: 10px;
		padding-left: 5px;
	}
	.kildelenker {
		font-size: var(--font-small);
		padding-top: 8px;
		border-top: 1px solid var(--color-border);
	}
	.alternativgrid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
		gap: 30px;
		margin: 20px 0;
	}
	.alternativgrid label {
		margin-top: 12px;
	}
	.liten {
		font-size: var(--font-meta);
		margin: 4px 0;
	}
	.alternativknapper {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		margin-top: 15px;
	}
	.alternativstatus {
		font-size: var(--font-meta);
		min-height: 36px;
		color: var(--color-success);
	}
	.lyskode {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 16px;
		font-size: var(--font-code);
		overflow: auto;
		margin: 0;
		max-height: 380px;
	}
	.morkkode {
		background: #193a31;
		color: #dce8d5;
		border-radius: 7px;
		font-size: var(--font-code);
		overflow-x: auto;
		padding: 18px;
	}
	footer {
		margin-top: 45px;
		padding: 22px 0 30px;
		border-top: 1px solid var(--kant);
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: var(--font-small);
		color: var(--color-text-muted);
		gap: 20px;
	}
	footer a {
		text-decoration: none;
	}
	footer p {
		margin: 0;
	}
	@media (max-width: 1000px) {
		main {
			width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		}
		.modulvalg button {
			padding: 15px;
			gap: 11px;
		}
		.modulpil {
			display: none;
		}
		.modultekst {
			font-size: var(--font-small);
		}
	}
	@media (max-width: 700px) {
		main {
			width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		}

		.intro {
			padding: 27px 0 24px;
		}
		h1 {
			font-size: 37px;
			letter-spacing: -1.3px;
		}
		.mobilbrudd {
			display: block;
		}
		.ingress {
			font-size: var(--font-body);
			max-width: 420px;
		}
		.simulering {
			font-size: var(--font-meta);
		}
		.modulvalg {
			margin-bottom: 24px;
		}
		.modulvalg button {
			align-items: flex-start;
			flex-direction: column;
			gap: 4px;
			padding: 11px 10px;
		}
		.modulnummer {
			font-size: var(--font-meta);
		}
		.modultekst {
			font-size: var(--font-meta);
		}
		.modultekst small {
			font-size: var(--font-meta);
			margin-top: 6px;
		}
		.forsokhode {
			gap: 10px;
		}
		h2 {
			font-size: 22px;
		}
		.forsokhode p:last-child {
			font-size: var(--font-body);
		}
		.nullstill {
			font-size: var(--font-meta);
			padding-left: 0;
		}
		.nullstill span {
			margin-left: 3px;
		}
		.kontroller {
			margin-top: 17px;
			gap: 12px;
		}
		.kontroller label {
			min-width: 130px;
			flex: 1 1 130px;
		}
		.kontroller .meldingfelt {
			flex-basis: 100%;
		}
		.kontrollhint {
			flex: 1 1 120px;
			font-size: var(--font-body);
		}
		.sessionhint a {
			margin-left: 0;
			display: block;
			white-space: normal;
		}
		.kjorefelt {
			margin-top: 18px;
		}
		.stegbeskrivelse {
			padding: 13px;
			min-height: 110px;
			flex-direction: column;
			gap: 7px;
		}
		.stegtekst h3 {
			font-size: var(--font-body);
		}
		.stegtekst p {
			font-size: var(--font-body);
		}
		.httpstatus {
			font-size: var(--font-meta);
		}
		.stegteller {
			font-size: var(--font-meta);
		}
		.resultatlinje {
			align-items: flex-start;
			padding: 12px;
			gap: 12px;
		}
		.resultatlinje p,
		.resultatlinje button {
			font-size: var(--font-body);
		}
		.resultatlinje button span {
			margin-left: 3px;
		}
		.dataomrade {
			grid-template-columns: 1fr;
		}
		summary {
			padding: 14px;
			font-size: var(--font-small);
		}
		.tilleggsmerke {
			display: block;
			min-width: 0;
			font-size: var(--font-meta);
			margin: 0 0 3px;
		}
		.tilleggsinnhold {
			padding: 0 14px 15px;
			font-size: var(--font-body);
		}
		.avkryssing {
			font-size: var(--font-body);
		}
		.alternativgrid {
			grid-template-columns: 1fr;
			gap: 12px;
		}
		.morkkode {
			font-size: var(--font-code);
			padding: 13px;
		}
		footer {
			align-items: flex-start;
			flex-direction: column;
			gap: 7px;
			margin-top: 30px;
			font-size: var(--font-meta);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		summary > span:last-child {
			transition: none;
		}
	}
</style>
