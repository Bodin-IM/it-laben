<script>
	import { avatarFeedback } from '#lib/avatarFeedback.js';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import AccountLink from '#lib/components/AccountLink.svelte';
	import { createState, planRun, advance } from '#lib/fillagring.js';

	/** @typedef {{ title: string, text: string, label: string, value: string }} Info */
	/** @typedef {{ text: string, type: string }} Token */
	/** @type {Record<number, { title: string, text: string }>} */
	const forklaringer = {
		1: {
			title: 'Verktøy fra Node',
			text: 'node:fs følger med Node.js. existsSync sjekker om filen finnes, readFileSync leser, og writeFileSync skriver.'
		},
		2: {
			title: 'Hvilken fil?',
			text: './meldinger.json er relativ til mappen du starter Node fra. I hjelpearket starter du serveren fra backendmappen.'
		},
		4: {
			title: 'Finnes filen allerede?',
			text: '! betyr «ikke». Bare når filen mangler, går kjøringen inn i denne if-blokken. En eksisterende fil beholdes.'
		},
		5: {
			title: 'Opprett en tom liste',
			text: 'Filen får teksten []. Det er gyldig JSON for en tom liste. En helt tom fil ville ikke vært gyldig JSON.'
		},
		7: {
			title: 'Les tekst, så tolk JSON',
			text: 'readFileSync gir tekst fordi vi bruker utf8. JSON.parse tolker teksten. Hjelpearket forutsetter at filen inneholder en liste med meldinger.'
		},
		9: {
			title: 'En funksjon som venter',
			text: 'Her defineres lagreMeldinger. Koden inne i funksjonen kjører først når lagreMeldinger() blir kalt.'
		},
		10: {
			title: 'Hele listen blir lagret',
			text: 'JSON.stringify lager tekst av hele meldinger-listen. null, 2 gir innrykk. writeFileSync erstatter filinnholdet med denne teksten.'
		},
		14: {
			title: 'Endre listen i minnet',
			text: 'push legger nyMelding inn i arrayet. Dette endrer minnet til serverprosessen. Filen blir ikke endret av push.'
		},
		15: {
			title: 'Kallet som gjør forskjellen',
			text: 'Når denne linjen er på, hopper kjøringen inn i lagreMeldinger. Slå den av for å kommentere bort kallet og undersøke hva som skjer ved omstart.'
		},
		16: {
			title: 'Send svar til frontend',
			text: '201 betyr at denne ruten svarer at meldingen er opprettet. Ruten sender også dette svaret når lagringskallet er kommentert bort.'
		}
	};

	const kilde = [
		'import { existsSync, readFileSync, writeFileSync } from "node:fs";',
		'const fil = "./meldinger.json";',
		'',
		'if (!existsSync(fil)) {',
		'  writeFileSync(fil, "[]", "utf8");',
		'}',
		'let meldinger = JSON.parse(readFileSync(fil, "utf8"));',
		'',
		'function lagreMeldinger() {',
		'  writeFileSync(fil, JSON.stringify(meldinger, null, 2), "utf8");',
		'}',
		'',
		'// I eksisterende POST /meldinger:',
		'meldinger.push(nyMelding);',
		'lagreMeldinger();',
		'res.status(201).json(nyMelding);'
	];
	const oppstartKode = kilde.slice(0, 7).join('\n');
	const lagringKode = kilde.slice(8, 11).join('\n');
	const postKode = kilde.slice(13).join('\n');

	let server = $state(createState());
	/** @type {ReturnType<typeof planRun>} */
	let plan = $state([]);
	let steg = $state(0);
	let feilet = $state(false);
	/** @type {'start' | 'post' | 'restart'} */
	let handling = $state('start');
	/** @type {number | null} */
	let aktivLinje = $state(null);
	/** @type {number | null} */
	let valgtLinje = $state(null);
	/** @type {Info} */
	let info = $state({
		title: 'Start med koden.',
		text: 'Kjør oppstarten ett steg om gangen. Første gang finnes verken filen eller meldinger-listen.',
		label: '',
		value: ''
	});
	let lagringPa = $state(true);
	let avsender = $state('Ada');
	let melding = $state('Hei fra Ada!');
	let visVerdier = $state(false);
	let forberedt = $state(false);

	let underveis = $derived(steg < plan.length && !feilet);
	let gyldigMelding = $derived(avsender.trim().length > 0 && melding.trim().length > 0);
	let antallIMinnet = $derived(Array.isArray(server.messages) ? server.messages.length : null);
	let filData = $derived.by(() => {
		if (server.fileText === null) return null;
		try {
			return JSON.parse(server.fileText);
		} catch {
			return null;
		}
	});
	let antallIFilen = $derived(Array.isArray(filData) ? filData.length : null);
	let ulagret = $derived(
		server.running &&
			Array.isArray(server.messages) &&
			JSON.stringify(server.messages) !== JSON.stringify(filData)
	);
	let kode = $derived(
		kilde.map((linje, i) => (i === 14 && !lagringPa ? '// lagreMeldinger();' : linje))
	);
	let valgtForklaring = $derived(valgtLinje === null ? null : forklaringer[valgtLinje]);
	let handlingNavn = $derived.by(() =>
		handling === 'post' ? 'POST /meldinger' : handling === 'restart' ? 'Omstart' : 'Oppstart'
	);
	let minneTekst = $derived(
		server.messages === null ? 'Ikke lastet inn' : JSON.stringify(server.messages, null, 2)
	);

	/** @param {'start' | 'post' | 'restart'} action */
	function start(action) {
		avatarFeedback(
			'fillagring',
			'working',
			'Se hva som finnes i minnet, og hva som faktisk lagres.'
		);
		if (underveis || (action === 'post' && !gyldigMelding)) return;
		forberedt = false;
		handling = action;
		feilet = false;
		valgtLinje = null;
		plan = planRun(server, action, {
			saveEnabled: lagringPa,
			message: { avsender: avsender.trim(), tekst: melding.trim() }
		});
		steg = 0;
		if (plan.length) nesteSteg();
	}

	function nesteSteg() {
		if (steg >= plan.length || feilet) return;
		const aktuelt = plan[steg];
		const resultat = advance(server, aktuelt);
		server = resultat.state;
		info = resultat.info;
		aktivLinje = aktuelt.line;
		valgtLinje = null;
		steg += 1;
		feilet = resultat.failed;
	}

	function kjorFerdig() {
		while (steg < plan.length && !feilet) nesteSteg();
	}

	/** @param {Info} nesteInfo */
	function klargjor(nesteInfo) {
		plan = [];
		steg = 0;
		feilet = false;
		aktivLinje = null;
		valgtLinje = null;
		forberedt = true;
		info = nesteInfo;
	}

	/** @param {boolean} pa */
	function endreLagring(pa) {
		lagringPa = pa;
		klargjor({
			title: pa ? 'Lagringskallet er slått på.' : 'Lagringskallet er kommentert bort.',
			text: 'Dette gjelder neste POST-kjøring. Meldinger som allerede ligger i minnet og filen, er fortsatt der.',
			label: 'Linje 15 · neste kjøring',
			value: pa ? 'lagreMeldinger();' : '// lagreMeldinger();'
		});
	}

	function endreMelding() {
		klargjor({
			title: 'Meldingen er klar til neste kjøring.',
			text: server.running
				? 'Trykk «Send melding» for å bruke de nye verdiene. Det som allerede er lagret, blir ikke endret når du redigerer objektet.'
				: 'Kjør oppstarten først. Deretter kan du sende meldingen med verdiene du har skrevet inn.',
			label: '',
			value: ''
		});
	}

	function nullstill() {
		server = createState();
		plan = [];
		steg = 0;
		feilet = false;
		handling = 'start';
		aktivLinje = null;
		valgtLinje = null;
		forberedt = false;
		lagringPa = true;
		avsender = 'Ada';
		melding = 'Hei fra Ada!';
		info = {
			title: 'Et nytt forsøk.',
			text: 'Minne og fil er nullstilt. Kjør oppstarten for å lage en fil med [] og lese den inn.',
			label: '',
			value: ''
		};
	}

	/** @param {string} tekst @returns {Token[]} */
	function fargelegg(tekst) {
		const monster =
			/\/\/.*|"(?:[^"\\]|\\.)*"|\b(?:import|from|const|let|if|function)\b|\b(?:existsSync|readFileSync|writeFileSync|JSON|parse|stringify|push|status|json|lagreMeldinger)\b|\b\d+\b/g;
		const deler = [];
		let slutt = 0;
		for (const treff of tekst.matchAll(monster)) {
			const i = treff.index ?? 0;
			if (i > slutt) deler.push({ text: tekst.slice(slutt, i), type: 'vanlig' });
			const ord = treff[0];
			const type = ord.startsWith('//')
				? 'kommentar'
				: ord.startsWith('"')
					? 'streng'
					: /^\d+$/.test(ord)
						? 'tall'
						: /^(import|from|const|let|if|function)$/.test(ord)
							? 'nokkelord'
							: 'funksjon';
			deler.push({ text: ord, type });
			slutt = i + ord.length;
		}
		if (slutt < tekst.length) deler.push({ text: tekst.slice(slutt), type: 'vanlig' });
		return deler;
	}
</script>

<svelte:head>
	<title>Lagring i JSON-fil · IT-laben</title>
	<meta
		name="description"
		content="Følg koden fra meldinger i minnet til en JSON-fil. Prøv lagring, funksjonskall og omstart i en interaktiv kodelab."
	/>
</svelte:head>

<div class="fillab">
	<header class="sidehode">
		<a class="tilbake" href="/"><span aria-hidden="true">←</span> IT-laben</a>
		<div class="header-actions">
			<span class="emne">UTVIKLING <span aria-hidden="true">/</span> NODE & JSON</span>
			<AccountLink /><ThemeToggle />
		</div>
	</header>

	<main>
		<section class="intro" aria-labelledby="tittel">
			<div>
				<p class="overlinje">FILLAGRING · KODEN I FOKUS</p>
				<h1 id="tittel">Hva overlever en omstart?</h1>
				<p class="ingress">Endre en melding, følg koden og se hva som blir lagret.</p>
				<p class="ovingslenke">
					Dette er den enkle innføringen. <a href="/oving-5/"
						>Øving 5: trygg lagring med ny liste, midlertidig fil og feilhåndtering →</a
					>
				</p>
			</div>
			<p class="grunnlag">Fra hjelpearket<br /><strong>Enkel lagring i JSON fil</strong></p>
		</section>

		<section class="lab" aria-label="Interaktiv kode for fillagring">
			<div class="labverktoy">
				<p>
					<span class="statusprikk" class:pa={server.running}></span>
					<b
						>{underveis
							? handlingNavn + ' pågår'
							: server.running
								? 'Serveren kjører'
								: 'Serveren er stoppet'}</b
					><span class="simulering">Simulering i nettleseren</span>
				</p>
				<div class="visningsknapper">
					<button
						class="tekstknapp"
						aria-expanded={visVerdier}
						aria-controls="verdier"
						onclick={() => (visVerdier = !visVerdier)}
						>{visVerdier ? 'Skjul' : 'Vis'} minne og fil
						<span aria-hidden="true">{visVerdier ? '−' : '+'}</span></button
					>
					<button
						class="tekstknapp nullstill"
						onclick={nullstill}
						title="Begynn på nytt med tomt minne og uten fil">Nullstill</button
					>
				</div>
			</div>

			<div class="arbeidsflate" class:medverdier={visVerdier}>
				<div class="editor">
					<div class="editorhode">
						<div class="filnavn">
							<span aria-hidden="true">JS</span> server.js <small>utdrag</small>
						</div>
						<span class="linjehjelp">Klikk på en linje for forklaring</span>
					</div>

					<div class="kjorverktoy">
						<div class="handlinger">
							{#if underveis}
								<button class="primaer" onclick={nesteSteg}
									><span aria-hidden="true">→</span> Neste steg</button
								>
								<button class="sekundaer" onclick={kjorFerdig}>Kjør ferdig</button>
							{:else if server.running}
								<button class="primaer" disabled={!gyldigMelding} onclick={() => start('post')}
									><span aria-hidden="true">▶</span> Send melding</button
								>
								<button class="sekundaer" onclick={() => start('restart')}
									><span aria-hidden="true">↻</span> Start på nytt</button
								>
							{:else}
								<button class="primaer" onclick={() => start('start')}
									><span aria-hidden="true">▶</span> Kjør oppstart</button
								>
							{/if}
						</div>
						<p class="stegteller">
							{plan.length
								? handlingNavn + ' · ' + steg + '/' + plan.length
								: server.running
									? 'Klar for neste melding'
									: 'Begynn med oppstarten'}
						</p>
					</div>

					<div class="kodeflate" aria-label="Kode fra server.js">
						{#each kode as linje, i}
							{#if i === 12}
								<div class="meldingdata">
									<div class="meldingetikett">
										<code>nyMelding</code><span>Objektet til POST-ruten · endre verdiene</span>
									</div>
									<div class="objektfelter">
										<label
											><span>avsender:</span><input
												aria-label="Avsender i nyMelding"
												bind:value={avsender}
												oninput={endreMelding}
												maxlength="24"
												disabled={underveis}
												spellcheck="false"
											/></label
										>
										<label class="tekstfelt"
											><span>tekst:</span><input
												aria-label="Tekst i nyMelding"
												bind:value={melding}
												oninput={endreMelding}
												maxlength="100"
												disabled={underveis}
												spellcheck="false"
											/></label
										>
									</div>
									{#if !gyldigMelding}<p class="feltfeil">
											Fyll inn både avsender og tekst før du sender.
										</p>{/if}
								</div>
							{/if}
							<div
								class="kodelinje"
								class:aktiv={aktivLinje === i + 1}
								class:valgt={valgtLinje === i + 1}
								class:avslatt={i === 14 && !lagringPa}
								class:tom={!linje}
								data-line={i + 1}
							>
								{#if forklaringer[i + 1]}
									<button
										class="linjeknapp"
										aria-label={'Forklar linje ' + (i + 1) + ': ' + linje}
										aria-pressed={valgtLinje === i + 1}
										onclick={() => (valgtLinje = valgtLinje === i + 1 ? null : i + 1)}
									>
										<span class="linjenummer" aria-hidden="true">{i + 1}</span><span
											class="kjorepil"
											aria-hidden="true">{aktivLinje === i + 1 ? '→' : ''}</span
										><code
											>{#each fargelegg(linje) as bit}<span class={bit.type}>{bit.text}</span
												>{/each}</code
										>
									</button>
								{:else}
									<div class="linjeutenknapp">
										<span class="linjenummer" aria-hidden="true">{i + 1}</span><span
											class="kjorepil"
										></span><code
											>{#each fargelegg(linje) as bit}<span class={bit.type}>{bit.text}</span
												>{/each}</code
										>
									</div>
								{/if}
								{#if i === 14}
									<label
										class="lagringsbryter"
										title="Slå av for å kommentere bort lagreMeldinger()"
									>
										<input
											type="checkbox"
											checked={lagringPa}
											onchange={(event) => endreLagring(event.currentTarget.checked)}
											disabled={underveis}
											aria-label="Kjør lagreMeldinger()"
										/>
										<span>{lagringPa ? 'På' : 'Av'}</span>
									</label>
								{/if}
							</div>
						{/each}
					</div>

					<div class="kodeforklaring" class:feil={feilet} aria-live="polite" aria-atomic="true">
						{#if valgtForklaring}
							<div class="forklaringstekst">
								<p class="forklaringstype">FORKLARING · LINJE {valgtLinje}</p>
								<h2>{valgtForklaring.title}</h2>
								<p>{valgtForklaring.text}</p>
								<button class="tilkjoring" onclick={() => (valgtLinje = null)}
									>Tilbake til kjøringen <span aria-hidden="true">↗</span></button
								>
							</div>
						{:else}
							<div class="forklaringstekst">
								<p class="forklaringstype">
									{plan.length
										? 'UTFØRT STEG'
										: forberedt
											? 'NESTE KJØRING'
											: 'START HER'}{aktivLinje !== null ? ' · LINJE ' + aktivLinje : ''}
								</p>
								<h2>{info.title}</h2>
								<p>{info.text}</p>
							</div>
							{#if info.value}
								<div class="stegverdi">
									<p>{info.label}</p>
									<pre><code>{info.value}</code></pre>
								</div>
							{/if}
						{/if}
					</div>
					<div class="ministatus">
						<span
							><i class="minneikon" aria-hidden="true"></i> Minne:
							<b data-testid="memory-count"
								>{antallIMinnet === null
									? 'ikke lastet'
									: antallIMinnet + (antallIMinnet === 1 ? ' melding' : ' meldinger')}</b
							></span
						>
						<span
							><i class="filikon" aria-hidden="true"></i> Fil:
							<b data-testid="file-count"
								>{server.fileText === null
									? 'finnes ikke'
									: antallIFilen === null
										? 'ingen gyldig liste'
										: antallIFilen + (antallIFilen === 1 ? ' melding' : ' meldinger')}</b
							></span
						>
						{#if ulagret}<strong class="ulagret">Ulagrede endringer</strong>{/if}
					</div>
				</div>

				{#if visVerdier}
					<aside class="verdier" id="verdier" aria-label="Verdier i minnet og filen">
						<div class="verdihode">
							<h2>Se verdiene</h2>
							<span>STØTTEVISNING</span>
						</div>
						<section class="verdikort" class:endret={ulagret}>
							<p class="verdistempel">I SERVERENS MINNE</p>
							<h3>meldinger <small>array</small></h3>
							<pre data-testid="memory-value"><code>{minneTekst}</code></pre>
							<p>En omstart lager et nytt minne fra filen.</p>
						</section>
						<section class="verdikort">
							<p class="verdistempel">PÅ DISK I FORSØKET</p>
							<h3>meldinger.json <small>tekst</small></h3>
							<pre data-testid="file-value"><code
									>{server.fileText ?? 'Filen finnes ikke ennå'}</code
								></pre>
							<p>Endres bare når en skrivelinje kjøres.</p>
						</section>
						<p class="sidehint">
							Se etter samme melding begge steder. Ved omstart er det filen som bestemmer hva som
							kommer tilbake.
						</p>
					</aside>
				{/if}
			</div>
			<p class="simuleringsnotat">
				«Start på nytt» starter den simulerte serveren på nytt. Ingen ekte filer skrives. Omlasting
				av nettsiden nullstiller hele forsøket.
			</p>
		</section>

		<div class="fordypning">
			<details class="provselv">
				<summary
					><span><b>Prøv selv</b><small>To små endringer i samme kode</small></span><span
						class="pluss"
						aria-hidden="true">+</span
					></summary
				>
				<div class="forsok">
					<article>
						<span class="forsoknummer">01</span>
						<h2>Hopp over lagringen</h2>
						<p>
							Kjør oppstarten. Slå av linje 15, send en melding og kjør ferdig. Du får 201. Hva
							forventer du å finne etter «Start på nytt»?
						</p>
					</article>
					<article>
						<span class="forsoknummer">02</span>
						<h2>Lagre hele listen</h2>
						<p>
							Legg til én melding uten lagring. Slå lagringen på og legg til en til. Kjør ferdig og
							start på nytt. Hvor mange meldinger kommer tilbake?
						</p>
					</article>
				</div>
			</details>

			<details class="egetprosjekt">
				<summary
					><span><b>Bruk i eget prosjekt</b><small>Samme oppsett som i hjelpearket</small></span
					><span class="pluss" aria-hidden="true">+</span></summary
				>
				<div class="prosjektinnhold">
					<p>
						Dette hører hjemme i <b>Express-backenden</b>. Bruk <code>"type": "module"</code> i
						backendens <code>package.json</code>, og start fra backendmappen med
						<code>node server.js</code>. Ingen nye npm-pakker trengs.
					</p>
					<h2>1. Les filen ved oppstart</h2>
					<p>
						Legg importen øverst. Erstatt den gamle <code>let meldinger = []</code> med innlastingen under,
						før rutene bruker listen.
					</p>
					<pre><code>{oppstartKode}</code></pre>
					<h2>2. Lagre listen i en funksjon</h2>
					<pre><code>{lagringKode}</code></pre>
					<h2>3. Kall funksjonen etter endringen</h2>
					<p>
						I den eksisterende POST-ruten er <code>nyMelding</code> objektet du allerede har laget.
						Lagre etter <code>push</code> og før svaret sendes.
					</p>
					<pre><code>{postKode}</code></pre>
					<p>
						GET-ruten kan fortsatt bruke <code>res.json(meldinger)</code>. Ved sletting eller
						redigering må du også kalle <code>lagreMeldinger()</code> etter at listen er endret.
					</p>
					<div class="rammer">
						<h3>Rammene for dette oppsettet</h3>
						<p>
							Bruk én backendprosess og små datamengder. Sync-funksjonene blokkerer serverprosessen
							mens de arbeider. Filen må inneholde gyldig JSON med et array: bruk <code>[]</code> for
							en tom liste, ikke en helt tom fil. Eksemplet har ikke feilhåndtering for lese- eller skrivefeil.
						</p>
						<p>
							Filen ligger i backendmappen, utenfor <code>static</code> og <code>public</code>.
							Dette lagrer meldinger; session-oppsettet er et eget tema.
						</p>
					</div>
					<a
						class="dokumentasjon"
						href="https://nodejs.org/api/fs.html"
						target="_blank"
						rel="noreferrer"
						>Les om node:fs i Node-dokumentasjonen <span aria-hidden="true">↗</span></a
					>
				</div>
			</details>
		</div>
	</main>
	<footer>
		<span>IT-laben · se, prøv, forstå</span><span>Én fil. Ett array. Følg forskjellen.</span>
	</footer>
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
	.fillab {
		--ink: var(--color-text);
		--muted: var(--color-text-muted);
		--teal: var(--color-accent);
		--line: var(--color-border);
		--code: #132f2c;
		min-height: 100vh;
		color: var(--ink);
		background: radial-gradient(ellipse at 92% 0, var(--color-page-glow) 0, transparent 37%);
		font-family:
			Inter,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		font-size: var(--font-body);
	}
	.fillab,
	.fillab * {
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
		cursor: not-allowed;
		opacity: 0.48;
	}
	button:focus-visible,
	a:focus-visible,
	summary:focus-visible,
	input:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	a {
		color: inherit;
	}
	.sidehode,
	main,
	footer {
		width: min(1180px, calc(100% - 64px));
		margin: 0 auto;
	}
	.header-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 12px 20px;
		margin-left: auto;
		min-width: 0;
	}

	.sidehode {
		flex-wrap: wrap;
		row-gap: 12px;
		min-height: 68px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		border-bottom: 1px solid var(--line);
	}
	.tilbake {
		text-decoration: none;
		font-size: var(--font-small);
		font-weight: 750;
	}
	.tilbake span {
		margin-right: 9px;
	}
	.emne {
		color: var(--color-text-muted);
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			monospace;
		letter-spacing: 1px;
	}
	.emne span {
		color: var(--color-text-subtle);
		margin: 0 8px;
	}
	.intro {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 28px;
		padding: 30px 0 25px;
	}
	.overlinje {
		color: var(--teal);
		font-size: var(--font-meta);
		font-weight: 750;
		letter-spacing: 1.4px;
		margin: 0 0 9px;
	}
	h1 {
		margin: 0;
		font-size: clamp(29px, 3.5vw, 42px);
		line-height: 1.12;
		letter-spacing: -1.25px;
	}
	.ingress {
		color: var(--muted);
		margin: 12px 0 0;
		font-size: var(--font-body);
		line-height: var(--leading-body);
	}
	.grunnlag {
		color: var(--color-text-muted);
		text-align: right;
		font-size: var(--font-meta);
		line-height: 1.8;
		white-space: nowrap;
		margin: 0 0 3px;
	}
	.grunnlag strong {
		color: var(--color-text-muted);
		font-weight: 550;
	}
	.lab {
		min-width: 0;
	}
	.labverktoy {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		margin-bottom: 12px;
	}
	.labverktoy > p {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
		margin: 0;
		font-size: var(--font-meta);
	}
	.labverktoy b {
		font-weight: 600;
	}
	.statusprikk {
		width: 7px;
		height: 7px;
		background: var(--color-text-subtle);
		border-radius: 50%;
	}
	.statusprikk.pa {
		background: var(--color-success);
		box-shadow: 0 0 0 3px var(--color-success-soft);
	}
	.simulering {
		color: var(--color-text-muted);
		margin-left: 4px;
	}
	.visningsknapper {
		display: flex;
		gap: 14px;
		align-items: center;
	}
	.tekstknapp {
		padding: 4px 0;
		background: none;
		border: 0;
		color: var(--teal);
		font-size: var(--font-small);
		font-weight: 650;
		white-space: nowrap;
	}
	.tekstknapp span {
		margin-left: 5px;
	}
	.nullstill {
		color: var(--color-text-muted);
		border-left: 1px solid var(--color-border);
		padding-left: 14px;
	}
	.arbeidsflate {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}
	.arbeidsflate.medverdier {
		grid-template-columns: minmax(0, 1fr) 320px;
	}
	.editor {
		min-width: 0;
		border-radius: 11px;
		border: 1px solid #25483c;
		overflow: hidden;
		background: var(--code);
		box-shadow: 0 9px 26px #23402c0b;
	}
	.editorhode {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		min-height: 44px;
		padding: 0 19px;
		color: #d7e3d5;
		background: #1e3d35;
		border-bottom: 1px solid #315044;
	}
	.filnavn {
		display: flex;
		align-items: center;
		gap: 9px;
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			SFMono-Regular,
			Consolas,
			monospace;
	}
	.filnavn > span {
		color: #dfd5a3;
		font-size: var(--font-meta);
		font-weight: 700;
	}
	.filnavn small {
		color: #91aa93;
		font-size: var(--font-meta);
		margin-left: 5px;
	}
	.linjehjelp {
		color: #9bb19d;
		font-size: var(--font-meta);
	}
	.kjorverktoy {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		padding: 12px 18px;
		border-bottom: 1px solid #2a493f;
		background: #18372f;
	}
	.handlinger {
		display: flex;
		flex-wrap: wrap;
		max-width: 100%;
		align-items: center;
		gap: 8px;
	}
	.primaer,
	.sekundaer {
		min-height: 34px;
		padding: 7px 12px;
		border-radius: 5px;
		font-size: var(--font-small);
		font-weight: 650;
		white-space: nowrap;
		border: 1px solid transparent;
	}
	.primaer {
		background: #d6e9b9;
		color: #223f2c;
	}
	.primaer:hover:not(:disabled) {
		background: #e5f2d4;
	}
	.primaer span,
	.sekundaer span {
		margin-right: 5px;
		font-weight: 700;
	}
	.sekundaer {
		border-color: #4c6854;
		color: #d0ddc8;
		background: transparent;
	}
	.sekundaer:hover {
		background: #2b4b3b;
	}
	.stegteller {
		margin: 0;
		color: #9eb295;
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			monospace;
		text-align: right;
	}
	.kodeflate {
		padding: 13px 0 15px;
		overflow-x: auto;
	}
	.kodelinje {
		display: flex;
		align-items: center;
		min-width: max-content;
		min-height: 34px;
		border-left: 3px solid transparent;
		border-right: 3px solid transparent;
		padding-right: 15px;
	}
	.linjeknapp,
	.linjeutenknapp {
		display: flex;
		align-items: baseline;
		flex: 1;
		min-width: 0;
		padding: 3px 0;
		border: 0;
		background: transparent;
		color: #dce7dc;
		text-align: left;
		font-size: var(--font-code);
		line-height: var(--leading-code);
	}
	.linjeknapp:hover {
		background: #26483b;
	}
	.kodelinje[data-line='15'] .linjeknapp {
		flex: 0 0 auto;
	}
	.kodelinje.tom {
		min-height: 11px;
		height: 11px;
	}
	.kodelinje.tom .linjeutenknapp {
		padding: 0;
		line-height: 11px;
	}
	.linjeknapp:focus-visible {
		outline-offset: -2px;
	}
	.kodelinje.aktiv {
		border-left-color: #c7dc8f;
		background: #34583e;
	}
	.kodelinje.valgt {
		border-right-color: #8dc8bd;
		background: #244b43;
	}
	.kodelinje.avslatt:not(.aktiv) {
		background: #39412d55;
	}
	.linjenummer {
		width: 39px;
		padding-right: 8px;
		flex-shrink: 0;
		text-align: right;
		color: #779a7e;
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			monospace;
		user-select: none;
	}
	.kjorepil {
		width: 20px;
		flex-shrink: 0;
		color: #daedb4;
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			monospace;
		user-select: none;
	}
	.kodelinje.aktiv .linjenummer {
		color: #dce9bd;
	}
	.kodelinje code {
		white-space: pre;
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		font-size: inherit;
	}
	.nokkelord {
		color: #98d6d0;
	}
	.streng {
		color: #d8dda7;
	}
	.funksjon {
		color: #e4c99a;
	}
	.tall {
		color: #e5b58e;
	}
	.kommentar {
		color: #8baa90;
		font-style: italic;
	}
	.lagringsbryter {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 0 7px 0 20px;
		font-size: var(--font-small);
		color: #cbd7bc;
		cursor: pointer;
		margin-left: 12px;
	}
	.lagringsbryter input {
		accent-color: #cfdea7;
		width: 14px;
		height: 14px;
		margin: 0;
	}
	.meldingdata {
		margin: 13px 18px 14px 59px;
		border: 1px solid #3a5c48;
		padding: 11px 13px;
		border-radius: 6px;
		background: #1b3b31;
		max-width: 740px;
	}
	.meldingetikett {
		display: flex;
		align-items: baseline;
		gap: 12px;
		margin-bottom: 9px;
	}
	.meldingetikett code {
		color: #d7e8c3;
		font-size: var(--font-meta);
	}
	.meldingetikett span {
		font-size: var(--font-meta);
		color: #a0b398;
	}
	.objektfelter {
		display: flex;
		gap: 14px;
		align-items: center;
	}
	.objektfelter label {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		color: #94baaa;
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			monospace;
	}
	.objektfelter .tekstfelt {
		flex: 1;
	}
	.objektfelter input {
		width: 112px;
		min-width: 0;
		padding: 5px 8px;
		color: #f0edc1;
		background: #284c3b;
		border: 1px solid #557349;
		border-radius: 4px;
		font:
			var(--font-small)/var(--leading-body) ui-monospace,
			monospace;
	}
	.objektfelter .tekstfelt input {
		width: 100%;
	}
	.objektfelter input:focus {
		background: #34533f;
	}
	.feltfeil {
		color: #efd2a2;
		font-size: var(--font-meta);
		margin: 8px 0 0;
	}
	.kodeforklaring {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr);
		gap: 23px;
		padding: 18px 21px;
		background: var(--color-surface-soft);
		min-height: 100px;
		border-top: 1px solid var(--color-border-strong);
	}
	.forklaringstekst:only-child {
		grid-column: 1 / -1;
		max-width: 760px;
	}
	.forklaringstype {
		margin: 0 0 7px;
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			monospace;
		letter-spacing: 0.9px;
		color: var(--color-text-muted);
	}
	.kodeforklaring h2 {
		margin: 0 0 6px;
		font-size: var(--font-body);
		line-height: 1.3;
		letter-spacing: -0.25px;
	}
	.forklaringstekst > p:not(.forklaringstype) {
		margin: 0;
		color: var(--color-text-muted);
		font-size: var(--font-body);
		line-height: var(--leading-body);
	}
	.tilkjoring {
		font-size: var(--font-small);
		font-weight: 600;
		color: var(--color-accent);
		padding: 0;
		margin-top: 10px;
		border: 0;
		background: none;
	}
	.stegverdi {
		min-width: 0;
		align-self: center;
		padding: 11px 13px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 5px;
	}
	.stegverdi > p {
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			monospace;
		color: var(--color-text-muted);
		margin: 0 0 6px;
	}
	.stegverdi pre {
		margin: 0;
		max-height: 115px;
		overflow: auto;
		font:
			var(--font-code)/var(--leading-code) ui-monospace,
			SFMono-Regular,
			Consolas,
			monospace;
		color: var(--color-text);
	}
	.kodeforklaring.feil {
		background: var(--color-warning-soft);
	}
	.ministatus {
		padding: 10px 20px;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 9px 22px;
		border-top: 1px solid var(--color-border);
		background: var(--color-surface);
		font-size: var(--font-meta);
		color: var(--color-text-muted);
	}
	.ministatus > span {
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.ministatus b {
		color: var(--color-text-muted);
		font-weight: 600;
	}
	.ministatus i {
		display: inline-block;
		width: 7px;
		height: 7px;
		background: var(--color-text-subtle);
		margin-right: 2px;
	}
	.minneikon {
		border-radius: 50%;
	}
	.filikon {
		border-radius: 1px;
	}
	.ulagret {
		margin-left: auto;
		color: var(--color-warning);
		font-size: var(--font-meta);
		font-weight: 600;
	}
	.verdier {
		min-width: 0;
		border: 1px solid var(--color-border);
		border-radius: 9px;
		background: var(--color-surface-raised);
		padding: 17px;
	}
	.verdihode {
		margin-bottom: 17px;
	}
	.verdihode h2 {
		margin: 0 0 5px;
		font-size: var(--font-body);
	}
	.verdihode > span {
		color: var(--color-text-subtle);
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			monospace;
		letter-spacing: 0.8px;
	}
	.verdikort {
		border-top: 1px solid var(--color-border);
		padding-top: 15px;
		margin-top: 15px;
	}
	.verdistempel {
		color: var(--color-text-muted);
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			monospace;
		letter-spacing: 0.55px;
		margin: 0 0 7px;
	}
	.verdikort h3 {
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			monospace;
		margin: 0 0 10px;
		display: flex;
		gap: 9px;
		align-items: center;
		flex-wrap: wrap;
	}
	.verdikort h3 small {
		color: var(--color-text-subtle);
		font-size: var(--font-meta);
	}
	.verdikort pre {
		margin: 0;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		padding: 12px 10px;
		border-radius: 5px;
		max-height: 250px;
		overflow: auto;
		font:
			var(--font-code)/var(--leading-code) ui-monospace,
			monospace;
		color: var(--color-text-muted);
	}
	.verdikort.endret pre {
		border-color: var(--color-warning-border);
		background: var(--color-warning-soft);
	}
	.verdikort > p:last-child,
	.sidehint {
		color: var(--color-text-muted);
		font-size: var(--font-body);
		line-height: var(--leading-body);
	}
	.sidehint {
		border-top: 1px solid var(--color-border);
		padding-top: 15px;
		margin: 15px 0 0;
	}
	.simuleringsnotat {
		margin: 12px 2px 0;
		color: var(--color-text-subtle);
		font-size: var(--font-body);
		line-height: var(--leading-body);
	}
	.fordypning {
		margin-top: 27px;
	}
	details {
		border-top: 1px solid var(--color-border);
	}
	details + details {
		margin-top: 0;
	}
	summary {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 18px 0;
		list-style: none;
		cursor: pointer;
		gap: 16px;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary > span:first-child {
		display: flex;
		align-items: baseline;
		gap: 15px;
	}
	summary b {
		font-size: var(--font-small);
		font-weight: 650;
	}
	summary small {
		font-size: var(--font-small);
		color: var(--color-text-subtle);
	}
	.pluss {
		flex-shrink: 0;
		line-height: 1;
		font-size: 20px;
		color: var(--color-accent);
		font-weight: 300;
	}
	details[open] > summary .pluss {
		transform: rotate(45deg);
	}
	.forsok {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		padding: 3px 0 22px;
	}
	.forsok article {
		position: relative;
		border: 1px solid var(--color-border);
		background: var(--color-surface-raised);
		border-radius: 7px;
		padding: 18px 20px;
	}
	.forsoknummer {
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			monospace;
		color: var(--color-text-muted);
	}
	.forsok h2 {
		font-size: var(--font-body);
		margin: 8px 0 9px;
	}
	.forsok p {
		font-size: var(--font-body);
		line-height: var(--leading-body);
		color: var(--color-text-muted);
		margin: 0;
	}
	.prosjektinnhold {
		max-width: 850px;
		padding: 0 0 26px;
	}
	.prosjektinnhold p {
		font-size: var(--font-body);
		line-height: var(--leading-body);
		color: var(--color-text-muted);
		margin: 0 0 16px;
	}
	.prosjektinnhold h2 {
		font-size: 17px;
		margin: 22px 0 10px;
	}
	.prosjektinnhold > pre {
		overflow-x: auto;
		background: var(--color-code-bg);
		border-radius: 7px;
		color: var(--color-code-text);
		padding: 18px;
		font:
			var(--font-code)/var(--leading-code) ui-monospace,
			monospace;
		margin: 11px 0 19px;
	}
	.prosjektinnhold :not(pre) > code {
		font-size: var(--font-code-small);
		color: var(--color-text-muted);
		background: var(--color-surface-soft);
		padding: 2px 4px;
		border-radius: 3px;
	}
	.rammer {
		background: var(--color-surface-soft);
		padding: 17px 20px;
		border-radius: 7px;
		margin: 20px 0 16px;
	}
	.rammer h3 {
		margin: 0 0 9px;
		font-size: var(--font-small);
	}
	.rammer p {
		font-size: var(--font-body);
		margin: 0 0 9px;
	}
	.rammer p:last-child {
		margin: 0;
	}
	.dokumentasjon {
		color: var(--color-accent);
		font-size: var(--font-small);
		text-decoration: none;
	}
	footer {
		border-top: 1px solid var(--line);
		padding: 22px 0 30px;
		display: flex;
		justify-content: space-between;
		gap: 15px;
		font-size: var(--font-meta);
		color: var(--color-text-subtle);
	}

	@media (max-width: 1050px) {
		.sidehode,
		main,
		footer {
			width: calc(100% - 42px);
		}
		.arbeidsflate.medverdier {
			grid-template-columns: minmax(0, 1fr) 290px;
		}
		.medverdier .kodeforklaring {
			grid-template-columns: minmax(0, 1fr);
			gap: 13px;
		}
		.medverdier .objektfelter {
			flex-wrap: wrap;
			gap: 9px;
		}
		.medverdier .objektfelter label {
			width: 100%;
		}
		.medverdier .objektfelter .tekstfelt input {
			width: 100%;
		}
	}
	@media (max-width: 820px) {
		.arbeidsflate.medverdier {
			grid-template-columns: minmax(0, 1fr);
		}
		.verdier {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0 20px;
		}
		.verdihode,
		.sidehint {
			grid-column: 1 / -1;
		}
		.verdihode {
			margin-bottom: 0;
		}
		.grunnlag {
			display: none;
		}
		.medverdier .objektfelter {
			flex-wrap: nowrap;
		}
		.medverdier .objektfelter label {
			width: auto;
		}
		.medverdier .objektfelter .tekstfelt {
			width: auto;
		}
		.labverktoy {
			align-items: flex-start;
		}
		.simulering {
			display: none;
		}
	}
	@media (max-width: 550px) {
		.sidehode,
		main,
		footer {
			width: calc(100% - 28px);
		}
		.sidehode {
			min-height: 59px;
		}
		.emne {
			font-size: var(--font-meta);
			letter-spacing: 0.5px;
		}
		.emne span {
			margin: 0 4px;
		}
		.tilbake {
			font-size: var(--font-small);
		}
		.intro {
			padding: 24px 0 21px;
		}
		h1 {
			letter-spacing: -0.7px;
			max-width: 350px;
		}
		.ingress {
			font-size: var(--font-body);
			max-width: 300px;
		}
		.overlinje {
			font-size: var(--font-meta);
			letter-spacing: 1px;
		}
		.labverktoy {
			flex-direction: column;
			gap: 12px;
		}
		.visningsknapper {
			width: 100%;
			justify-content: space-between;
		}
		.nullstill {
			border: 0;
			padding-left: 0;
		}
		.editor {
			border-radius: 8px;
		}
		.editorhode {
			min-height: 40px;
			padding: 0 12px;
		}
		.linjehjelp {
			font-size: var(--font-meta);
			max-width: 95px;
			text-align: right;
			line-height: 1.5;
		}
		.kjorverktoy {
			padding: 10px 11px;
			flex-wrap: wrap;
			gap: 8px;
		}
		.stegteller {
			font-size: var(--font-meta);
		}
		.handlinger {
			gap: 6px;
		}
		.primaer,
		.sekundaer {
			padding: 7px 9px;
			font-size: var(--font-small);
			min-height: 34px;
		}
		.linjeknapp,
		.linjeutenknapp {
			font-size: var(--font-code);
			line-height: var(--leading-code);
		}
		.kodelinje {
			min-height: 34px;
		}
		.linjenummer {
			width: 25px;
			font-size: var(--font-meta);
			padding-right: 4px;
		}
		.kjorepil {
			width: 16px;
			font-size: var(--font-meta);
		}
		.meldingdata {
			margin: 13px 12px 14px 41px;
			padding: 10px;
			width: calc(100% - 53px);
			min-width: 230px;
		}
		.meldingetikett {
			flex-direction: column;
			gap: 5px;
			margin-bottom: 10px;
		}
		.meldingetikett span {
			font-size: var(--font-meta);
		}
		.objektfelter,
		.medverdier .objektfelter {
			flex-direction: column;
			align-items: stretch;
			gap: 8px;
		}
		.objektfelter label,
		.medverdier .objektfelter label {
			width: 100%;
		}
		.objektfelter label > span {
			width: 65px;
			flex-shrink: 0;
			font-size: var(--font-meta);
		}
		.objektfelter input {
			width: 100%;
			font-size: var(--font-small);
		}
		.lagringsbryter {
			padding-left: 9px;
			gap: 5px;
		}
		.kodeforklaring {
			grid-template-columns: minmax(0, 1fr);
			padding: 16px 14px;
			gap: 13px;
		}
		.kodeforklaring h2 {
			font-size: var(--font-body);
		}
		.forklaringstekst > p:not(.forklaringstype) {
			font-size: var(--font-body);
		}
		.stegverdi {
			padding: 10px;
		}
		.stegverdi pre {
			font-size: var(--font-code);
		}
		.ministatus {
			padding: 10px 14px;
			gap: 8px 14px;
			font-size: var(--font-meta);
		}
		.ulagret {
			width: 100%;
			margin: 0;
			font-size: var(--font-meta);
		}
		.verdier {
			grid-template-columns: minmax(0, 1fr);
		}
		.simuleringsnotat {
			font-size: var(--font-body);
		}
		.fordypning {
			margin-top: 22px;
		}
		summary {
			padding: 16px 6px 16px 0;
		}
		summary > span:first-child {
			min-width: 0;
			flex-direction: column;
			gap: 5px;
		}
		summary small {
			font-size: var(--font-small);
		}
		.forsok {
			grid-template-columns: 1fr;
			gap: 12px;
		}
		.prosjektinnhold > pre {
			font-size: var(--font-code);
			padding: 14px;
		}
		footer {
			flex-direction: column;
			gap: 7px;
			padding: 20px 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			scroll-behavior: auto !important;
		}
	}
	@media (max-width: 700px) {
		.sidehode {
			padding-block: 14px;
		}
		.header-actions {
			gap: 10px 14px;
		}
	}
</style>
