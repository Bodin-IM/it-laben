<script>
	import { onMount } from 'svelte';
	import CodeExplanation from '#lib/components/CodeExplanation.svelte';
	import { codeLines, makeRun, EXAMPLE_MESSAGE, CODE_CONTEXTS } from '#lib/frontendBackendLab.js';

	/** @typedef {{ avsender: string, tekst: string }} Melding */
	/** @typedef {{ text: string, type: string }} Token */
	/** @type {'post' | 'get'} */
	let handling = $state('post');
	/** @type {'frontend' | 'backend'} */
	let side = $state('frontend');
	/** @type {string} */
	let avsender = $state(EXAMPLE_MESSAGE.avsender);
	/** @type {string} */
	let tekst = $state(EXAMPLE_MESSAGE.tekst);
	let feilNokkel = $state(false);
	/** @type {Melding[]} */
	let serverMeldinger = $state([]);
	/** @type {Melding[]} */
	let klientMeldinger = $state([]);
	/** @type {ReturnType<typeof makeRun>} */
	let plan = $state([]);
	let steg = $state(0);
	let forberedt = $state(false);
	/** @type {string | null} */
	let valgtId = $state(null);
	/** @type {HTMLElement | null} */
	let valgtKnapp = $state(null);
	/** @type {HTMLElement | undefined} */
	let forklaringskolonne = $state();
	let smalSkjerm = $state(false);
	let visData = $state(false);

	const forklaringsId = 'linjeforklaring';
	let kode = $derived(codeLines(handling, side, feilNokkel));
	let valgt = $derived(kode.find((linje) => linje.id === valgtId));
	let aktuelt = $derived(steg > 0 ? plan[steg - 1] : null);
	let underveis = $derived(steg > 0 && steg < plan.length);
	let ferdig = $derived(plan.length > 0 && steg === plan.length);
	let metode = $derived.by(() => (handling === 'post' ? 'POST' : 'GET'));
	let sideNavn = $derived.by(() => (side === 'frontend' ? 'Frontend' : 'Backend'));
	let erFeil = $derived(ferdig && aktuelt?.httpStatus === 400);
	let ulikeLister = $derived(JSON.stringify(serverMeldinger) !== JSON.stringify(klientMeldinger));
	let overskrift = $derived.by(() => {
		if (aktuelt) return aktuelt.title;
		if (forberedt) return 'Klar for et nytt forsøk.';
		return handling === 'post' ? 'Start i nettleseren.' : 'Be om listen fra serveren.';
	});
	let stegTekst = $derived.by(() => {
		if (aktuelt) return aktuelt.explanation;
		if (handling === 'get')
			return 'Trykk «Hent meldinger». GET ber om listen som ligger på serveren akkurat nå.';
		return 'Endre gjerne teksten. Trykk «Send melding», og følg det som skjer én kodebit om gangen.';
	});

	onMount(() => {
		const media = window.matchMedia('(max-width: 900px)');
		function oppdaterSkjerm() {
			smalSkjerm = media.matches;
			lukkForklaring();
		}
		oppdaterSkjerm();
		media.addEventListener('change', oppdaterSkjerm);
		return () => media.removeEventListener('change', oppdaterSkjerm);
	});

	function lukkForklaring() {
		valgtId = null;
		valgtKnapp = null;
	}

	/** @param {string} id @param {MouseEvent & {currentTarget: EventTarget & HTMLButtonElement}} event */
	function forklar(id, event) {
		if (valgtId === id) {
			lukkForklaring();
			return;
		}
		valgtKnapp = event.currentTarget;
		valgtId = id;
	}

	function klargjor() {
		if (underveis) return;
		plan = [];
		steg = 0;
		forberedt = true;
		lukkForklaring();
	}

	/** @param {'post' | 'get'} neste */
	function velgHandling(neste) {
		if (underveis || neste === handling) return;
		klargjor();
		handling = neste;
		side = 'frontend';
	}

	/** @param {'frontend' | 'backend'} neste */
	function velgSide(neste) {
		lukkForklaring();
		side = neste;
	}

	function start() {
		if (underveis) return;
		lukkForklaring();
		plan = makeRun(handling, { avsender, tekst }, serverMeldinger, klientMeldinger, feilNokkel);
		steg = 0;
		forberedt = false;
		nesteSteg();
	}

	function nesteSteg() {
		if (steg >= plan.length) return;
		lukkForklaring();
		const neste = plan[steg];
		side = neste.side;
		serverMeldinger = neste.serverMessages.map((melding) => ({ ...melding }));
		klientMeldinger = neste.clientMessages.map((melding) => ({ ...melding }));
		if (neste.id === 'post-status') tekst = '';
		steg += 1;
	}

	function kjorFerdig() {
		while (steg < plan.length) nesteSteg();
	}

	function nullstill() {
		lukkForklaring();
		plan = [];
		steg = 0;
		serverMeldinger = [];
		klientMeldinger = [];
		handling = 'post';
		side = 'frontend';
		avsender = EXAMPLE_MESSAGE.avsender;
		tekst = EXAMPLE_MESSAGE.tekst;
		feilNokkel = false;
		forberedt = false;
	}

	/** @param {unknown} verdi */
	function json(verdi) {
		return JSON.stringify(verdi, null, 2);
	}

	/** @param {string} kilde @returns {Token[]} */
	function fargelegg(kilde) {
		const monster =
			/\/\/.*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:import|from|const|let|if|return|async|await|function|try|catch|throw|new|typeof)\b|\b(?:fetch|stringify|json|push|trim|status|post|get|use|Error|JSON|express)\b|\b\d+\b/g;
		/** @type {Token[]} */
		const deler = [];
		let slutt = 0;
		for (const treff of kilde.matchAll(monster)) {
			const i = treff.index ?? 0;
			if (i > slutt) deler.push({ text: kilde.slice(slutt, i), type: 'vanlig' });
			const ord = treff[0];
			const type = ord.startsWith('//')
				? 'kommentar'
				: /^["'`]/.test(ord)
					? 'streng'
					: /^\d+$/.test(ord)
						? 'tall'
						: /^(import|from|const|let|if|return|async|await|function|try|catch|throw|new|typeof)$/.test(
									ord
							  )
							? 'nokkelord'
							: 'funksjon';
			deler.push({ text: ord, type });
			slutt = i + ord.length;
		}
		if (slutt < kilde.length) deler.push({ text: kilde.slice(slutt), type: 'vanlig' });
		return deler;
	}
</script>

<svelte:head>
	<title>Frontend møter backend 2 · IT-laben</title>
	<meta
		name="description"
		content="Send en melding, følg koden og hent den tilbake. Klikk på en kodelinje for en forklaring rett ved linjen."
	/>
</svelte:head>

<div class="side">
	<header class="sidehode">
		<a class="logo" href="/" aria-label="IT-laben – forside"
			><span class="logoikon" aria-hidden="true">IT</span> IT-laben<span class="punkt">.</span></a
		>
		<a class="original" href="/backend/">Se første versjon <span aria-hidden="true">↗</span></a>
	</header>
	<main>
		<section class="intro" aria-labelledby="tittel">
			<p class="overlinje">FRONTEND MØTER BACKEND <span>2 · TEST</span></p>
			<h1 id="tittel">Fra klikk til melding.</h1>
			<p class="ingress">Send den til serveren. Hent den tilbake. Følg koden underveis.</p>
		</section>

		<section class="lab" aria-label="Interaktiv kode for frontend og backend">
			<div class="forsokslinje">
				<div class="forsoksvalg" role="group" aria-label="Velg forsøk">
					<button
						class:valgt={handling === 'post'}
						aria-pressed={handling === 'post'}
						disabled={underveis}
						onclick={() => velgHandling('post')}
						><span class="nummer">1</span> Send til serveren <code>POST</code></button
					>
					<button
						class:valgt={handling === 'get'}
						aria-pressed={handling === 'get'}
						disabled={underveis}
						onclick={() => velgHandling('get')}
						><span class="nummer">2</span> Hent til nettsiden <code>GET</code></button
					>
				</div>
				<button
					class="tekstknapp nullstill"
					onclick={nullstill}
					title="Tøm begge listene og begynn på nytt">Nullstill alt</button
				>
			</div>

			{#if handling === 'post'}
				<div class="proveverdier">
					<p>Verdier i frontend <span>endre og prøv</span></p>
					<label
						><code>avsender</code><input
							bind:value={avsender}
							oninput={klargjor}
							disabled={underveis}
							maxlength="32"
							spellcheck="false"
							aria-label="Avsender"
						/></label
					>
					<label class="meldingsfelt"
						><code>tekst</code><input
							bind:value={tekst}
							oninput={klargjor}
							disabled={underveis}
							maxlength="160"
							spellcheck="false"
							aria-label="Meldingstekst"
						/></label
					>
				</div>
			{:else}
				<div class="getverdier">
					<code>GET /meldinger</code>
					<p>Ingen melding sendes med. Vi ber om listen.</p>
				</div>
			{/if}

			<div class="arbeidsflate">
				<div class="editor">
					<div class="editorhode">
						<div class="sidevalg" role="group" aria-label="Velg kode å se på">
							<button
								class:aktiv={side === 'frontend'}
								aria-pressed={side === 'frontend'}
								onclick={() => velgSide('frontend')}
								><span class="sideprikk front" aria-hidden="true"></span> Frontend
								<small>+page.svelte</small></button
							>
							<button
								class:aktiv={side === 'backend'}
								aria-pressed={side === 'backend'}
								onclick={() => velgSide('backend')}
								><span class="sideprikk back" aria-hidden="true"></span> Backend
								<small>server.js</small></button
							>
						</div>
						<span class="utdrag">UTDRAG</span>
					</div>
					<div class="kjorverktoy">
						<div class="kjorhandlinger">
							{#if underveis}
								<button class="primaer" onclick={nesteSteg}
									><span aria-hidden="true">→</span> Neste steg</button
								>
								<button class="sekundaer" onclick={kjorFerdig}>Kjør ferdig</button>
							{:else}
								<button class="primaer" onclick={start}
									><span aria-hidden="true">▶</span>
									{handling === 'post' ? 'Send melding' : 'Hent meldinger'}</button
								>
							{/if}
						</div>
						<p class="stegteller">
							{plan.length ? `Steg ${steg} av ${plan.length}` : 'Kjør steg for steg'}<span
								>{aktuelt
									? aktuelt.side === 'frontend'
										? 'i nettleseren'
										: 'på serveren'
									: metode + ' /meldinger'}</span
							>
						</p>
					</div>
					<div class="steginfo" class:feil={erFeil} aria-live="polite" aria-atomic="true">
						<div class="stegoverskrift">
							<strong>{overskrift}</strong>{#if aktuelt?.httpStatus}<span
									class="httpstatus"
									data-testid="http-status">{aktuelt.httpStatus}</span
								>{/if}
						</div>
						<p>{stegTekst}</p>
						{#if aktuelt?.status}
							<p class="statusverdi">
								<code>status</code><span data-testid="frontend-status">{aktuelt.status}</span>
							</p>
						{/if}
						{#if aktuelt && side !== aktuelt.side}<button
								class="folglinje"
								onclick={() => velgSide(aktuelt.side)}
								>Tilbake til koden i dette steget <span aria-hidden="true">↗</span></button
							>{/if}
					</div>
					<div class="kodehjelp">
						<span>Klikk på en linje for forklaring <span aria-hidden="true">↗</span></span><span
							class="kjorelegende"><i aria-hidden="true">→</i> Utført steg</span
						>
					</div>
					<div class="kodeliste" aria-label={`${sideNavn}: ${metode}-kode`}>
						{#each kode as linje, i (linje.id)}
							{@const aktiv = aktuelt?.side === side && aktuelt.lineIds.includes(linje.id)}
							<div
								class="linjerad"
								class:markert={valgtId === linje.id}
								class:utfort={aktiv}
								data-line-id={linje.id}
							>
								{#if linje.text.trim()}
									<button
										class="kodelinje"
										data-explanation-for={forklaringsId}
										aria-label={`Forklar ${sideNavn.toLowerCase()} linje ${i + 1}: ${linje.text}`}
										aria-expanded={valgtId === linje.id}
										aria-controls={valgtId === linje.id ? forklaringsId : undefined}
										aria-describedby={valgtId === linje.id ? forklaringsId + '-body' : undefined}
										onclick={(event) => forklar(linje.id, event)}
									>
										<span class="linjenummer" aria-hidden="true">{i + 1}</span><span
											class="kjorepil"
											aria-hidden="true">{aktiv ? '→' : ''}</span
										><code
											>{#each fargelegg(linje.text) as bit}<span class={bit.type}>{bit.text}</span
												>{/each}</code
										><span class="forklaringsmerke" aria-hidden="true"
											>{valgtId === linje.id ? '←' : '?'}</span
										>
									</button>
								{:else}<div class="tomlinje" aria-hidden="true">
										<span class="linjenummer">{i + 1}</span>
									</div>{/if}
								{#if smalSkjerm && valgtId === linje.id}
									<div class="inlineforklaring">
										<CodeExplanation
											anchor={valgtKnapp}
											id={forklaringsId}
											title={linje.title}
											explanation={linje.explanation}
											label={`${sideNavn} · linje ${i + 1}`}
											onclose={lukkForklaring}
											mode="inline"
										/>
									</div>
								{/if}
							</div>
						{/each}
					</div>
					<div class="kodefot">
						<span
							class="sideprikk"
							class:front={side === 'frontend'}
							class:back={side === 'backend'}
							aria-hidden="true"
						></span><span
							>{side === 'frontend' ? 'Kjører i nettleseren' : 'Kjører på serveren'} <b>·</b>
							{metode} /meldinger</span
						>
					</div>
				</div>
				<aside
					class="forklaringskolonne"
					bind:this={forklaringskolonne}
					aria-label="Forklaring ved kodelinjen"
				>
					{#if !smalSkjerm && valgt}
						<CodeExplanation
							anchor={valgtKnapp}
							boundary={forklaringskolonne}
							id={forklaringsId}
							title={valgt.title}
							explanation={valgt.explanation}
							label={`${sideNavn} · linje ${kode.findIndex((linje) => linje.id === valgtId) + 1}`}
							onclose={lukkForklaring}
						/>
					{/if}
					{#if !smalSkjerm}
						<div class="forklaringshint" class:skjult={Boolean(valgt)} aria-hidden={Boolean(valgt)}>
							<span class="peker" aria-hidden="true">↖</span>
							<p>
								<strong>Lurer du på en linje?</strong>Trykk på koden. Forklaringen åpner her, rett
								ved linjen du velger.
							</p>
							<small>Du kan lese forklaringer uten å kjøre koden.</small>
						</div>
					{/if}
				</aside>
			</div>

			<div class="resultatlinje" class:ulikt={ulikeLister}>
				<div class="tallpar">
					<span>Backend <b data-testid="server-count">{serverMeldinger.length}</b></span><span
						class="skille"
						aria-hidden="true">/</span
					><span>Frontend <b data-testid="client-count">{klientMeldinger.length}</b></span><small
						>meldinger i hver sin liste</small
					>
				</div>
				{#if ferdig && handling === 'post' && !erFeil}<button
						class="tekstknapp hentneste"
						onclick={() => velgHandling('get')}
						>Nå: hent til nettsiden <span aria-hidden="true">→</span></button
					>{/if}
				<button
					class="tekstknapp"
					aria-expanded={visData}
					aria-controls="dataoversikt"
					onclick={() => (visData = !visData)}
					>{visData ? 'Skjul data' : 'Se dataene'}
					<span aria-hidden="true">{visData ? '−' : '+'}</span></button
				>
			</div>
			{#if visData}
				<div class="dataoversikt" id="dataoversikt">
					<section>
						<p class="datamerke">PÅ SERVEREN</p>
						<h2><code>meldinger</code> i backend</h2>
						<pre data-testid="server-data"><code>{json(serverMeldinger)}</code></pre>
					</section>
					<section>
						<p class="datamerke">I NETTLESEREN</p>
						<h2>Dette viser nettsiden</h2>
						<div class="meldingsliste" data-testid="client-view">
							{#each klientMeldinger as melding}<p>
									<strong>{melding.avsender}</strong><span>{melding.tekst}</span>
								</p>{:else}<p class="tomliste">Ingen meldinger å vise.</p>{/each}
						</div>
					</section>
					<section class="nettverksdata">
						<p class="datamerke">DENNE REQUESTEN</p>
						<div class="requestpar">
							<div>
								<h2>{metode} · {aktuelt?.id === 'post-object' ? 'planlagt body' : 'body'}</h2>
								{#if handling === 'get'}<p class="tomliste">
										Ingen body i denne GET-requesten.
									</p>{:else if aktuelt?.requestBody}<pre data-testid="request-body"><code
											>{json(aktuelt.requestBody)}</code
										></pre>{:else}<p class="tomliste">Ikke sendt ennå.</p>{/if}
							</div>
							<div>
								<h2>Svar {aktuelt?.httpStatus ?? ''}</h2>
								{#if aktuelt?.responseBody}<pre data-testid="response-body"><code
											>{json(aktuelt.responseBody)}</code
										></pre>{:else}<p class="tomliste">Ikke mottatt ennå.</p>{/if}
							</div>
						</div>
					</section>
				</div>
			{/if}
		</section>

		<div class="fordypning">
			<details>
				<summary><span>Prøv en feil</span><small>Hva stopper backend?</small></summary>
				<div class="detaljinnhold">
					<p>
						Send en tom tekst, eller bytt navn på feltet i JSON-objektet. Se hvilken linje som
						stopper meldingen.
					</p>
					<label class="feilvalg"
						><input
							type="checkbox"
							bind:checked={feilNokkel}
							onchange={klargjor}
							disabled={underveis || handling !== 'post'}
						/><span>Send <code>message: tekst</code> i stedet for <code>tekst</code></span></label
					>
					{#if handling === 'get'}<p class="detaljhint">
							Velg «Send til serveren» for å prøve feilen.
						</p>{:else}<p class="detaljhint">
							Se at objektlinjen i frontend endrer seg. Frontend-listen og tidligere meldinger
							beholdes.
						</p>{/if}
					<p class="tenk">Blir meldingen lagt til før backend svarer med 400?</p>
				</div>
			</details>
			<details>
				<summary
					><span>Koble til eget prosjekt</span><small>Hvor hører utdragene hjemme?</small></summary
				>
				<div class="detaljinnhold prosjekt">
					<div>
						<h2>Frontend · Svelte</h2>
						<p>{CODE_CONTEXTS.frontend}</p>
						<pre><code
								>{'const API = "http://localhost:3000";\nlet avsender = $state("");\nlet tekst = $state("");\nlet meldinger = $state([]);\nlet status = $state("");'}</code
							></pre>
						<p>
							Inputfeltene bruker <code>bind:value</code>. Knappene kaller <code>sendMelding</code>
							og <code>hentMeldinger</code>.
						</p>
						<pre><code
								>{'<input bind:value={avsender} />\n<input bind:value={tekst} />\n<button onclick={sendMelding}>Send</button>\n<button onclick={hentMeldinger}>Hent</button>\n<p>{status}</p>\n{#each meldinger as melding}\n  <p>{melding.avsender}: {melding.tekst}</p>\n{/each}'}</code
							></pre>
					</div>
					<div>
						<h2>Backend · Express</h2>
						<p>{CODE_CONTEXTS.backend}</p>
						<pre><code
								>{'import express from "express";\nconst app = express();\nconst meldinger = [];\n\n// Legg POST- og GET-rutene her.\n\napp.listen(3000);'}</code
							></pre>
						<p>
							<code>express.json()</code> må stå før POST-ruten. <code>meldinger</code> er én felles liste
							for begge rutene, i serverens minne.
						</p>
						<p>
							På en annen maskin erstatter du <code>localhost</code> med serverens adresse. Bruk CORS-oppsettet
							fra prosjektet når frontend og backend har ulik origin.
						</p>
					</div>
					<p class="kildelenker">
						Les mer: <a
							href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch"
							>fetch hos MDN ↗</a
						><a href="https://expressjs.com/en/5x/api.html">Express-dokumentasjonen ↗</a>
					</p>
				</div>
			</details>
		</div>
		<p class="simuleringsnote">
			Dette er en simulering i nettleseren. Ingen meldinger sendes til en ekte server. «Nullstill
			alt» eller en oppdatering av siden tømmer begge listene.
		</p>
		<footer>
			<a href="/">← Flere forsøk i IT-laben</a><span>Prøv. Les koden. Prøv igjen.</span>
		</footer>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f4f5ef;
	}
	.side {
		--blekk: #193c3b;
		--gronn: #087f79;
		--kant: #d8e0d5;
		min-height: 100vh;
		color: var(--blekk);
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
	button,
	input {
		font: inherit;
	}
	button {
		cursor: pointer;
	}
	button:disabled {
		cursor: default;
		opacity: 0.5;
	}
	button,
	a,
	input,
	summary {
		-webkit-tap-highlight-color: transparent;
	}
	button:focus-visible,
	a:focus-visible,
	input:focus-visible,
	summary:focus-visible {
		outline: 3px solid #bd6e31;
		outline-offset: 3px;
	}
	a {
		color: inherit;
	}
	code,
	pre {
		font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
	}
	.sidehode,
	main {
		width: min(1240px, calc(100% - 64px));
		margin-inline: auto;
	}
	.sidehode {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-block: 25px;
		border-bottom: 1px solid var(--kant);
	}
	.logo {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 21px;
		font-weight: 780;
		text-decoration: none;
		letter-spacing: -0.7px;
	}
	.logoikon {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		background: var(--blekk);
		color: #f0f5d8;
		font-size: 13px;
		border-radius: 7px;
		letter-spacing: -0.5px;
	}
	.punkt {
		color: var(--gronn);
		margin-left: -8px;
	}
	.original {
		font-size: 12px;
		text-decoration: none;
		color: #576e61;
	}
	.original span {
		margin-left: 6px;
	}
	.intro {
		padding-block: 32px 27px;
	}
	.overlinje {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0 0 12px;
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 1.6px;
	}
	.overlinje span {
		padding: 4px 7px;
		border: 1px solid #bdccaf;
		border-radius: 4px;
		background: #e9eedf;
		font-size: 9px;
		letter-spacing: 0.8px;
	}
	h1 {
		margin: 0;
		font-size: clamp(30px, 4vw, 44px);
		letter-spacing: -1.8px;
		line-height: 1.15;
		font-weight: 740;
	}
	.ingress {
		margin: 12px 0 0;
		color: #5a6f62;
		font-size: 16px;
		line-height: 1.6;
	}
	.forsokslinje {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: center;
		margin-bottom: 18px;
	}
	.forsoksvalg {
		display: flex;
		gap: 8px;
	}
	.forsoksvalg button {
		display: flex;
		align-items: center;
		gap: 9px;
		min-height: 45px;
		border: 1px solid var(--kant);
		border-radius: 8px;
		background: #fffdf7;
		color: #567064;
		padding: 8px 13px;
		font-size: 13px;
		font-weight: 600;
	}
	.forsoksvalg button.valgt {
		border-color: #195d50;
		background: #e1ebd8;
		color: #184b40;
		box-shadow: inset 0 0 0 1px #195d50;
	}
	.forsoksvalg button:disabled {
		opacity: 0.7;
	}
	.forsoksvalg button.valgt:disabled {
		opacity: 1;
	}
	.nummer {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border: 1px solid currentColor;
		border-radius: 50%;
		font-size: 11px;
	}
	.forsoksvalg code {
		font-size: 10px;
		font-weight: 600;
		opacity: 0.7;
		margin-left: 5px;
	}
	.tekstknapp {
		padding: 7px 0;
		border: 0;
		color: #245b4c;
		background: transparent;
		font-size: 12px;
		font-weight: 650;
	}
	.tekstknapp:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.nullstill {
		color: #68776a;
		font-weight: 500;
		white-space: nowrap;
	}
	.proveverdier,
	.getverdier {
		display: flex;
		align-items: center;
		gap: 18px;
		padding: 14px 18px;
		background: #e9ede3;
		border: 1px solid var(--kant);
		border-radius: 9px 9px 0 0;
	}
	.proveverdier > p {
		margin: 0;
		font-size: 11px;
		font-weight: 650;
		flex: 0 0 128px;
		line-height: 1.6;
	}
	.proveverdier > p span {
		display: block;
		font-weight: 400;
		color: #697a69;
	}
	.proveverdier label {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}
	.proveverdier label code {
		font-size: 12px;
		color: #4e6a58;
	}
	.proveverdier input {
		width: 150px;
		min-width: 0;
		border: 1px solid #c7d2bf;
		background: #fcfcf6;
		color: #284c40;
		border-radius: 5px;
		padding: 8px 10px;
		font-size: 13px;
	}
	.proveverdier .meldingsfelt {
		flex: 1;
	}
	.meldingsfelt input {
		width: 100%;
	}
	.getverdier {
		min-height: 68px;
	}
	.getverdier > code {
		font-size: 12px;
		font-weight: 650;
	}
	.getverdier p {
		margin: 0;
		color: #5d7364;
		font-size: 13px;
	}
	.arbeidsflate {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 292px;
		column-gap: 24px;
		align-items: stretch;
	}
	.editor {
		min-width: 0;
		background: #132f2c;
		color: #e7eee1;
		border-radius: 0 0 9px 9px;
		overflow: clip;
	}
	.editorhode {
		display: flex;
		align-items: stretch;
		justify-content: space-between;
		border-bottom: 1px solid #39534a;
		background: #1c3c34;
		padding-inline: 12px;
		min-height: 54px;
		gap: 10px;
	}
	.sidevalg {
		display: flex;
		gap: 4px;
	}
	.sidevalg button {
		border: 0;
		border-bottom: 2px solid transparent;
		border-radius: 4px 4px 0 0;
		background: transparent;
		color: #a6b7a5;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 13px 10px;
		font-size: 12px;
		font-weight: 650;
	}
	.sidevalg button.aktiv {
		color: #eef3df;
		border-bottom-color: #cee19e;
		background: #2a493c;
	}
	.sidevalg small {
		font-size: 10px;
		font-weight: 400;
		color: #a9baa7;
		margin-left: 4px;
	}
	.sideprikk {
		display: inline-block;
		flex: 0 0 auto;
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}
	.sideprikk.front {
		background: #a5d6cb;
	}
	.sideprikk.back {
		background: #e0bc7e;
	}
	.utdrag {
		align-self: center;
		color: #a0b09f;
		font-size: 9px;
		letter-spacing: 1px;
		padding-right: 6px;
	}
	.kjorverktoy {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 18px 12px;
		gap: 12px;
	}
	.kjorhandlinger {
		display: flex;
		gap: 9px;
		align-items: center;
	}
	.primaer,
	.sekundaer {
		border-radius: 5px;
		padding: 10px 13px;
		font-size: 12px;
		font-weight: 700;
		border: 1px solid transparent;
	}
	.primaer {
		background: #d7e7ab;
		color: #253f2b;
		box-shadow: 0 2px 0 #0d221c;
	}
	.primaer:hover {
		background: #e7f1c8;
	}
	.primaer span {
		margin-right: 5px;
	}
	.sekundaer {
		border-color: #58715d;
		color: #d4e0c8;
		background: transparent;
	}
	.sekundaer:hover {
		background: #28473b;
	}
	.stegteller {
		margin: 0;
		text-align: right;
		font-size: 11px;
		color: #d4e1c6;
		white-space: nowrap;
	}
	.stegteller span {
		display: block;
		margin-top: 4px;
		font-size: 10px;
		color: #9db59d;
	}
	.steginfo {
		padding: 12px 16px;
		margin: 0 18px 13px;
		border: 1px solid #4d6749;
		border-left: 3px solid #bcd789;
		border-radius: 5px;
		background: #243f33;
	}
	.stegoverskrift {
		display: flex;
		gap: 8px;
		align-items: center;
		justify-content: space-between;
	}
	.stegoverskrift strong {
		font-size: 13px;
		font-weight: 650;
		color: #e0eacb;
	}
	.steginfo p {
		margin: 5px 0 0;
		font-size: 12px;
		line-height: 1.6;
		color: #c5d4b9;
		max-width: 70ch;
	}
	.steginfo.feil {
		border-color: #ae7b56;
		background: #473e2c;
	}
	.steginfo .statusverdi {
		display: flex;
		gap: 10px;
		align-items: baseline;
		margin-top: 10px;
		padding-top: 8px;
		border-top: 1px solid #70815b55;
		color: #edf2d7;
	}
	.statusverdi code {
		font-size: 10px;
		color: #b6c8a7;
	}
	.httpstatus {
		padding: 3px 6px;
		color: #d9e9b7;
		border: 1px solid #708459;
		border-radius: 4px;
		font:
			11px 'SFMono-Regular',
			Consolas,
			monospace;
	}
	.feil .httpstatus {
		color: #f0ceac;
		border-color: #b1906e;
	}
	.folglinje {
		background: none;
		border: 0;
		color: #e7deb6;
		font-size: 11px;
		padding: 8px 0 0;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.kodehjelp {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		border-top: 1px solid #304a3f;
		padding: 11px 18px 8px;
		font-size: 10px;
		color: #b0c0ac;
	}
	.kjorelegende {
		font-size: 9px;
		white-space: nowrap;
		color: #bdcea9;
	}
	.kjorelegende i {
		color: #d7e9a7;
		font-size: 13px;
		font-style: normal;
		padding-right: 4px;
	}
	.kodeliste {
		overflow-x: auto;
		padding: 5px 0 18px;
		scrollbar-color: #557357 #172f28;
		scrollbar-width: thin;
	}
	.linjerad {
		width: 100%;
		position: relative;
	}
	.kodelinje {
		display: flex;
		align-items: center;
		width: max-content;
		min-width: 100%;
		min-height: 27px;
		padding: 2px 16px 2px 0;
		border: 0;
		border-left: 3px solid transparent;
		background: transparent;
		color: #e3ebd8;
		text-align: left;
		line-height: 23px;
	}
	.kodelinje:hover {
		background: #274a3b;
	}
	.kodelinje:focus-visible {
		outline: 2px solid #e2be89;
		outline-offset: -3px;
	}
	.linjenummer {
		display: inline-block;
		width: 37px;
		min-width: 37px;
		padding-right: 6px;
		text-align: right;
		color: #829a85;
		font:
			10px/23px 'SFMono-Regular',
			Consolas,
			monospace;
		user-select: none;
	}
	.kjorepil {
		display: inline-block;
		width: 22px;
		min-width: 22px;
		text-align: center;
		color: #d4e8a1;
		font-size: 14px;
	}
	.kodelinje code {
		white-space: pre;
		font-size: 13px;
		line-height: 23px;
		tab-size: 2;
	}
	.forklaringsmerke {
		margin-left: auto;
		padding-left: 20px;
		min-width: 32px;
		font-size: 11px;
		color: #b4d0b5;
		opacity: 0;
	}
	.kodelinje:hover .forklaringsmerke,
	.kodelinje:focus-visible .forklaringsmerke,
	.markert .forklaringsmerke {
		opacity: 1;
	}
	.utfort > .kodelinje {
		background: #345239;
		border-left-color: #c6df8c;
	}
	.markert > .kodelinje {
		background: #3c5c50;
		box-shadow:
			inset 0 1px 0 #9dbaa8,
			inset 0 -1px 0 #9dbaa8;
		border-left-color: #a5d6cb;
	}
	.markert .linjenummer {
		color: #d6e9d2;
	}
	.tomlinje {
		height: 18px;
		padding-left: 3px;
	}
	.tomlinje .linjenummer {
		line-height: 18px;
	}
	.nokkelord {
		color: #9cded1;
	}
	.streng {
		color: #e0d29f;
	}
	.funksjon {
		color: #e6bd8c;
	}
	.tall {
		color: #d8c0e4;
	}
	.kommentar {
		color: #8fa98d;
		font-style: italic;
	}
	.kodefot {
		display: flex;
		align-items: center;
		gap: 7px;
		border-top: 1px solid #334d40;
		padding: 10px 18px;
		color: #b1c3a6;
		font-size: 10px;
	}
	.kodefot b {
		margin-inline: 5px;
		color: #768f75;
	}
	.forklaringskolonne {
		min-width: 0;
		position: relative;
	}
	.forklaringshint {
		margin-top: 255px;
		max-width: 254px;
		padding: 5px 10px;
		color: #6b7c69;
	}
	.forklaringshint.skjult {
		/* Keep the same space when the explanation replaces this hint. */
		visibility: hidden;
	}
	.peker {
		display: block;
		font-size: 30px;
		line-height: 1;
		color: #5e7c68;
		margin-bottom: 14px;
	}
	.forklaringshint p {
		font-size: 13px;
		line-height: 1.7;
		margin: 0;
	}
	.forklaringshint strong {
		display: block;
		color: #365c49;
		font-size: 14px;
		font-weight: 650;
		margin-bottom: 5px;
	}
	.forklaringshint small {
		display: block;
		margin-top: 15px;
		font-size: 11px;
		line-height: 1.6;
		color: #697a68;
	}
	.inlineforklaring {
		position: sticky;
		left: 0;
		width: 100%;
		padding: 4px 12px 12px;
	}
	.resultatlinje {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
		padding: 14px 0 16px;
		border-bottom: 1px solid var(--kant);
	}
	.tallpar {
		display: flex;
		align-items: center;
		gap: 11px;
		font-size: 11px;
		color: #60715e;
	}
	.tallpar > span:not(.skille) {
		display: inline-flex;
		align-items: center;
		gap: 7px;
	}
	.tallpar b {
		display: inline-grid;
		place-items: center;
		min-width: 22px;
		height: 22px;
		padding-inline: 5px;
		background: #e4eadd;
		border: 1px solid #d0dac3;
		border-radius: 4px;
		font-weight: 650;
		color: #3e5840;
	}
	.ulikt .tallpar b {
		background: #f0e7cc;
		border-color: #dbcaa1;
		color: #685834;
	}
	.skille {
		color: #a1ad97;
	}
	.tallpar small {
		margin-left: 4px;
		color: #70806b;
		font-size: 10px;
	}
	.hentneste {
		margin-left: auto;
		margin-right: 18px;
	}
	.dataoversikt {
		display: grid;
		grid-template-columns: 1fr 1fr;
		margin-top: 18px;
		gap: 16px;
	}
	.dataoversikt > section {
		min-width: 0;
		border: 1px solid var(--kant);
		background: #fffdf6;
		padding: 18px;
		border-radius: 8px;
	}
	.datamerke {
		margin: 0 0 8px;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 1.2px;
		color: #79866f;
	}
	.dataoversikt h2 {
		margin: 0 0 12px;
		font-size: 13px;
		font-weight: 650;
	}
	.dataoversikt h2 code {
		font-size: 12px;
	}
	.dataoversikt pre,
	.prosjekt pre {
		margin: 0;
		font-size: 11px;
		line-height: 1.7;
		padding: 14px;
		background: #edf1e6;
		border-radius: 5px;
		overflow-x: auto;
		color: #3b5942;
		max-height: 280px;
	}
	.dataoversikt .nettverksdata {
		grid-column: 1 / -1;
	}
	.requestpar {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 20px;
	}
	.requestpar > div {
		min-width: 0;
	}
	.tomliste {
		color: #73816c;
		font-size: 12px;
		line-height: 1.7;
	}
	.meldingsliste {
		max-height: 280px;
		overflow-y: auto;
	}
	.meldingsliste p:not(.tomliste) {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 11px 12px;
		margin: 0 0 9px;
		background: #ecf1e2;
		border-radius: 5px;
		font-size: 12px;
		overflow-wrap: anywhere;
	}
	.meldingsliste strong {
		font-size: 10px;
	}
	.fordypning {
		margin-top: 22px;
		border-top: 1px solid var(--kant);
	}
	details {
		border-bottom: 1px solid var(--kant);
	}
	summary {
		padding: 17px 3px;
		font-size: 13px;
		font-weight: 650;
		cursor: pointer;
	}
	summary span {
		margin-left: 7px;
	}
	summary small {
		font-size: 11px;
		font-weight: 400;
		color: #7a866e;
		margin-left: 15px;
	}
	.detaljinnhold {
		padding: 0 16px 20px 20px;
		max-width: 850px;
		font-size: 13px;
		line-height: 1.8;
	}
	.detaljinnhold p {
		margin: 0 0 14px;
	}
	.detaljinnhold code {
		font-size: 11px;
		background: #e6eddd;
		padding: 1px 3px;
		border-radius: 3px;
	}
	.feilvalg {
		display: flex;
		align-items: start;
		gap: 8px;
		width: fit-content;
		border: 1px solid #cbd7bd;
		border-radius: 6px;
		background: #e8eedf;
		padding: 10px 14px;
	}
	.feilvalg input {
		accent-color: #2b674f;
		margin-top: 5px;
	}
	.detaljinnhold .detaljhint {
		color: #6e7e65;
		font-size: 11px;
		margin-top: 10px;
	}
	.detaljinnhold .tenk {
		margin-top: 18px;
		padding-left: 13px;
		border-left: 2px solid #a8be91;
		color: #506747;
		font-weight: 600;
	}
	.prosjekt {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 22px;
		max-width: none;
	}
	.prosjekt h2 {
		font-size: 15px;
		margin: 0 0 10px;
	}
	.prosjekt > div {
		min-width: 0;
	}
	.prosjekt pre {
		margin-bottom: 15px;
	}
	.prosjekt pre code {
		padding: 0;
		background: transparent;
	}
	.kildelenker {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		grid-column: 1 / -1;
		font-size: 11px;
	}
	.kildelenker a {
		text-underline-offset: 3px;
	}
	.simuleringsnote {
		margin: 19px 0 30px;
		max-width: 95ch;
		font-size: 11px;
		line-height: 1.7;
		color: #77816d;
	}
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		padding-block: 22px 30px;
		border-top: 1px solid var(--kant);
		font-size: 11px;
		color: #6c7e68;
	}
	footer a {
		text-decoration: none;
	}
	@media (max-width: 1100px) {
		.sidehode,
		main {
			width: min(1240px, calc(100% - 40px));
		}
		.arbeidsflate {
			grid-template-columns: minmax(0, 1fr) 260px;
			gap: 20px;
		}
		.sidevalg small {
			display: none;
		}
		.proveverdier {
			gap: 14px;
		}
		.proveverdier > p {
			flex-basis: 115px;
		}
		.proveverdier input {
			width: 130px;
		}
		.meldingsfelt input {
			width: 100%;
		}
		.tallpar small {
			display: none;
		}
	}
	@media (max-width: 900px) {
		.linjerad {
			display: contents;
		}
		.arbeidsflate {
			display: block;
		}
		.forklaringskolonne {
			display: none;
		}
		.sidevalg small {
			display: inline;
		}
		.kodelinje {
			min-height: 32px;
		}
		.kodelinje code {
			font-size: 12px;
		}
		.kjorverktoy {
			position: sticky;
			top: 0;
			z-index: 4;
			background: #132f2c;
			box-shadow: 0 3px 8px #10251b22;
		}
	}
	@media (max-width: 620px) {
		.sidehode,
		main {
			width: calc(100% - 28px);
		}
		.sidehode {
			padding-block: 18px;
		}
		.logo {
			font-size: 19px;
		}
		.original {
			font-size: 10px;
		}
		.intro {
			padding-block: 24px 22px;
		}
		.overlinje {
			gap: 8px;
			font-size: 9px;
			letter-spacing: 1px;
		}
		.overlinje span {
			font-size: 8px;
		}
		h1 {
			font-size: 32px;
			letter-spacing: -1.3px;
		}
		.ingress {
			font-size: 13px;
			margin-top: 9px;
		}
		.forsokslinje {
			align-items: flex-start;
			gap: 8px;
			margin-bottom: 12px;
			flex-wrap: wrap;
		}
		.forsoksvalg {
			flex: 1 1 100%;
			gap: 7px;
		}
		.forsoksvalg button {
			flex: 1;
			min-width: 0;
			padding: 9px 8px;
			gap: 6px;
			font-size: 10px;
			white-space: nowrap;
		}
		.forsoksvalg code {
			display: none;
		}
		.nummer {
			width: 19px;
			height: 19px;
			min-width: 19px;
			font-size: 9px;
		}
		.nullstill {
			margin-left: auto;
			font-size: 10px;
			padding: 2px 0;
		}
		.proveverdier {
			display: grid;
			grid-template-columns: 1fr;
			gap: 9px;
			padding: 11px 13px 14px;
		}
		.proveverdier > p {
			display: flex;
			justify-content: space-between;
			font-size: 10px;
		}
		.proveverdier label {
			display: grid;
			grid-template-columns: 64px minmax(0, 1fr);
			gap: 8px;
		}
		.proveverdier label code {
			font-size: 11px;
		}
		.proveverdier input {
			width: 100%;
			padding: 7px 9px;
			font-size: 13px;
		}
		.getverdier {
			flex-direction: column;
			gap: 8px;
			align-items: flex-start;
			padding: 16px;
		}
		.getverdier p {
			font-size: 12px;
		}
		.editorhode {
			padding-inline: 5px;
			min-height: 48px;
			gap: 0;
		}
		.sidevalg {
			flex: 1;
			gap: 0;
		}
		.sidevalg button {
			flex: 1;
			padding: 10px;
			font-size: 11px;
			gap: 6px;
		}
		.sidevalg small,
		.utdrag {
			display: none;
		}
		.kjorverktoy {
			padding: 12px;
			gap: 6px;
		}
		.kjorhandlinger {
			gap: 6px;
		}
		.primaer,
		.sekundaer {
			font-size: 11px;
			padding: 9px 10px;
		}
		.primaer span {
			margin-right: 3px;
		}
		.stegteller {
			font-size: 10px;
		}
		.stegteller span {
			font-size: 9px;
		}
		.steginfo {
			margin: 0 12px 10px;
			padding: 10px 11px;
		}
		.stegoverskrift strong {
			font-size: 12px;
		}
		.steginfo p {
			font-size: 11px;
			line-height: 1.65;
		}
		.kodehjelp {
			padding-inline: 12px;
			font-size: 9px;
		}
		.kjorelegende {
			font-size: 8px;
		}
		.linjenummer {
			min-width: 28px;
			width: 28px;
			padding-right: 4px;
			font-size: 9px;
		}
		.kjorepil {
			min-width: 17px;
			width: 17px;
			font-size: 12px;
		}
		.kodelinje code {
			font-size: 11px;
		}
		.kodelinje {
			padding-right: 12px;
		}
		.kodefot {
			padding-inline: 12px;
			font-size: 9px;
		}
		.resultatlinje {
			gap: 10px 15px;
			padding-block: 14px;
		}
		.tallpar {
			font-size: 10px;
			gap: 8px;
		}
		.resultatlinje > .tekstknapp:not(.hentneste) {
			margin-left: auto;
		}
		.hentneste {
			order: 3;
			flex-basis: 100%;
			margin: 0;
			text-align: left;
			font-size: 11px;
		}
		.dataoversikt,
		.requestpar,
		.prosjekt {
			grid-template-columns: minmax(0, 1fr);
		}
		.dataoversikt > section {
			padding: 15px;
		}
		summary {
			font-size: 12px;
		}
		summary small {
			display: block;
			margin: 6px 0 0 21px;
			font-size: 10px;
		}
		.detaljinnhold {
			font-size: 12px;
			padding-inline: 5px;
		}
		.feilvalg {
			padding: 10px;
		}
		.simuleringsnote {
			font-size: 10px;
		}
		footer {
			font-size: 10px;
			align-items: flex-start;
		}
		footer span {
			max-width: 110px;
			text-align: right;
		}
	}
</style>
