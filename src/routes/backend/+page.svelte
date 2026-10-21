<script>
	// Selvstendig Svelte 5-komponent. Hele demonstrasjonen kjører lokalt.
	// Express-koden nedenfor vises som lærestoff; den kjører ikke i nettleseren.
	/** @typedef {{ avsender: string, tekst: string }} Melding */
	/** @typedef {{ avsender: string, tekst?: string, message?: string }} Meldingsdata */
	let avsender = $state('Gruppe 1');
	let tekst = $state('Hei fra oss!');
	let scenario = $state('normal');
	let step = $state(0);
	let playing = $state(false);
	let speed = $state(2600);
	let codeTab = $state('auto');
	/** @type {Melding[]} */
	let baseline = $state([]);
	/** @type {Melding[]} */
	let clientBaseline = $state([]);
	/** @type {Meldingsdata | null} */
	let packet = $state(null);
	let round = $state(1);
	let copied = $state(false);
	const API = 'http://backend.example:3000';
	const steps = [
		['Skriv', 'Input → variabel', 'frontend'],
		['Objekt', 'Samle verdiene', 'frontend'],
		['JSON', 'Objekt → tekst', 'frontend'],
		['POST', 'Send en request', 'network'],
		['req.body', 'Tekst → objekt', 'backend'],
		['Kontroll', 'Sjekk innholdet', 'backend'],
		['push()', 'Legg til i listen', 'backend'],
		['Response', 'Send et svar', 'network'],
		['Bekreft', 'Les POST-svaret', 'frontend'],
		['GET', 'Hent listen', 'network'],
		['200 OK', 'Returner listen', 'backend'],
		['Vis', 'Oppdater nettsiden', 'frontend']
	];
	/** @param {unknown} value */
	const pretty = (value) => JSON.stringify(value, null, 2);
	let draft = $derived(
		scenario === 'wrongkey'
			? { avsender, message: tekst }
			: { avsender, tekst: scenario === 'empty' ? '' : tekst }
	);
	let payload = $derived(packet ?? draft);
	let valid = $derived(
		typeof payload.avsender === 'string' &&
			typeof payload.tekst === 'string' &&
			Boolean(payload.avsender.trim()) &&
			Boolean(payload.tekst.trim())
	);
	let saved = $derived(
		valid && typeof payload.tekst === 'string'
			? { avsender: payload.avsender.trim(), tekst: payload.tekst.trim() }
			: null
	);
	let serverList = $derived(step >= 6 && saved ? [...baseline, saved] : baseline);
	let clientList = $derived(step >= 11 ? serverList : clientBaseline);
	let response = $derived(
		valid
			? { beskjed: 'Meldingen er mottatt!', melding: saved }
			: { beskjed: 'Avsender og tekst må fylles ut.' }
	);
	let status = $derived(
		step >= 11
			? 'Meldingene er hentet.'
			: step >= 8
				? valid
					? response.beskjed
					: `Kunne ikke sende: ${response.beskjed}`
				: 'Venter på svar …'
	);
	let activeTab = $derived(
		codeTab === 'auto' ? ([4, 5, 6, 7, 10].includes(step) ? 'backend' : 'frontend') : codeTab
	);
	let description = $derived(
		[
			'bind:value kobler inputfeltene til variablene avsender og tekst. Skriv noe selv og se verdiene endre seg.',
			'Når du trykker Send melding, leser sendMelding() variablene. { avsender, tekst } er kortform for { avsender: avsender, tekst: tekst }.',
			'JSON.stringify() gjør JavaScript-objektet om til JSON-tekst. Det er denne teksten som blir requestens body.',
			'fetch() kjøres i nettleseren. URL velger server og rute, method velger POST, og Content-Type forteller at body inneholder JSON.',
			'express.json() leser JSON-bodyen og gjør den tilgjengelig som et JavaScript-objekt i req.body. Middleware må stå før rutene.',
			valid
				? 'POST-ruten leser req.body.avsender og req.body.tekst. Begge må være strenger og inneholde mer enn mellomrom.'
				: 'Kontrollen feiler: backend trenger både avsender og tekst med innhold. Et felt som heter message blir ikke automatisk til tekst.',
			valid
				? 'meldinger.push(melding) legger objektet bakerst i backendens array. Se at listen i nettleseren fortsatt er uendret!'
				: 'return stopper ruten før push(). Backend-listen endres ikke. Svaret blir 400 med en forklaring.',
			valid
				? 'res.status(201).json(...) sender en bekreftelse og den nye meldingen som JSON. Dette svaret følger POST-requesten tilbake.'
				: 'res.status(400).json(...) sender feilmeldingen tilbake. Det sendes ingen ny melding til en annen innboks.',
			valid
				? 'await svar.json() leser responsen. status får bekreftelsen, og tekstfeltet tømmes. POST-koden i øvingen henter ikke hele listen.'
				: 'fetch() kaster ikke automatisk feil ved 400. Koden sjekker svar.ok, kaster en feil og viser den i catch.',
			'Nå trykker vi Hent meldinger, som i øvingen. fetch(URL) bruker GET som standard. Denne forespørselen trenger ingen body.',
			'GET-ruten kjører res.json(meldinger). Backend sender hele den nåværende listen som JSON, med status 200.',
			'meldinger = await svar.json() gir frontend en egen kopi av listen. $state og {#each} sørger for at meldingene vises på siden.'
		][step]
	);

	const frontendCode = [
		'const API = "http://backend.example:3000";',
		'let avsender = $state("");',
		'let tekst = $state("");',
		'let meldinger = $state([]);',
		'let status = $state("");',
		'',
		'async function sendMelding() {',
		'  try {',
		'    const svar = await fetch(`${API}/meldinger`, {',
		'      method: "POST",',
		'      headers: { "Content-Type": "application/json" },',
		'      body: JSON.stringify({ avsender, tekst })',
		'    });',
		'    const data = await svar.json();',
		'    if (!svar.ok) throw new Error(data.beskjed);',
		'    status = data.beskjed;',
		'    tekst = "";',
		'  } catch (feil) {',
		'    status = `Kunne ikke sende: ${feil.message}`;',
		'  }',
		'}',
		'',
		'async function hentMeldinger() {',
		'  try {',
		'    const svar = await fetch(`${API}/meldinger`);',
		'    if (!svar.ok) throw new Error(`HTTP ${svar.status}`);',
		'    meldinger = await svar.json();',
		'    status = "Meldingene er hentet.";',
		'  } catch (feil) {',
		'    status = `Kunne ikke hente: ${feil.message}`;',
		'  }',
		'}',
		'',
		'// HTML-delen i samme Svelte-fil:',
		'<input bind:value={avsender} />',
		'<input bind:value={tekst} />',
		'<button onclick={sendMelding}>Send melding</button>',
		'<button onclick={hentMeldinger}>Hent meldinger</button>',
		'<p>{status}</p>',
		'{#each meldinger as melding}',
		'  <p>{melding.avsender}: {melding.tekst}</p>',
		'{/each}'
	];
	const backendCode = [
		'import express from "express";',
		'const app = express();',
		'const meldinger = [];',
		'// CORS-konfigurasjonen fra del 3 legges her.',
		'app.use(express.json());',
		'',
		'app.post("/meldinger", (req, res) => {',
		'  const avsender = req.body?.avsender;',
		'  const tekst = req.body?.tekst;',
		'  if (typeof avsender !== "string" ||',
		'      typeof tekst !== "string" ||',
		'      !avsender.trim() || !tekst.trim()) {',
		'    return res.status(400).json({',
		'      beskjed: "Avsender og tekst må fylles ut."',
		'    });',
		'  }',
		'  const melding = {',
		'    avsender: avsender.trim(),',
		'    tekst: tekst.trim()',
		'  };',
		'  meldinger.push(melding);',
		'  res.status(201).json({',
		'    beskjed: "Meldingen er mottatt!",',
		'    melding: melding',
		'  });',
		'});',
		'',
		'app.get("/meldinger", (req, res) => {',
		'  res.json(meldinger);',
		'});',
		'app.listen(3000, "0.0.0.0");'
	];
	let codeLines = $derived(activeTab === 'frontend' ? frontendCode : backendCode);
	let activeLines = $derived(
		activeTab === 'frontend'
			? step === 0
				? [2, 3, 35, 36]
				: step === 1
					? [7, 12, 37]
					: step === 2
						? [12]
						: step === 3
							? [9, 10, 11, 12, 13]
							: step === 8
								? valid
									? [14, 15, 16, 17]
									: [14, 15, 18, 19]
								: step === 9
									? [23, 25, 38]
									: step === 11
										? [27, 28, 40, 41, 42]
										: []
			: step === 4
				? [5, 7, 8, 9]
				: step === 5
					? [8, 9, 10, 11, 12]
					: step === 6
						? valid
							? [17, 18, 19, 20, 21]
							: [13, 14, 15]
						: step === 7
							? valid
								? [22, 23, 24, 25]
								: [13, 14, 15]
							: step === 10
								? [28, 29, 30]
								: []
	);
	let focusLines = $derived(
		codeLines
			.map((text, i) => ({ text, number: i + 1 }))
			.filter((line) => activeLines.includes(line.number))
	);

	/** @param {string} line */
	function tokens(line) {
		return line
			.split(
				/("[^"\n]*"|'[^'\n]*'|`[^`\n]*`|\/\/.*$|\b(?:const|let|async|await|function|return|if|throw|new|try|catch|import|from|typeof)\b|\b\d+\b)/g
			)
			.filter(Boolean)
			.map((text) => ({
				text,
				kind: text.startsWith('//')
					? 'comment'
					: /^["'`]/.test(text)
						? 'string'
						: /^(const|let|async|await|function|return|if|throw|new|try|catch|import|from|typeof)$/.test(
									text
							  )
							? 'keyword'
							: /^\d+$/.test(text)
								? 'number'
								: ''
			}));
	}
	function next() {
		if (step === 0) packet = JSON.parse(JSON.stringify(draft));
		if (step < 11) step += 1;
		if (step === 11) playing = false;
	}
	function play() {
		if (step === 11) rewind();
		playing = !playing;
		if (playing && step === 0) next();
	}
	function rewind() {
		playing = false;
		step = 0;
		packet = null;
		copied = false;
	}
	function newMessage() {
		baseline = JSON.parse(JSON.stringify(serverList));
		clientBaseline = JSON.parse(JSON.stringify(clientList));
		rewind();
		tekst = '';
		scenario = 'normal';
		round += 1;
	}
	function clearAll() {
		rewind();
		baseline = [];
		clientBaseline = [];
		round = 1;
		scenario = 'normal';
		avsender = 'Gruppe 1';
		tekst = 'Hei fra oss!';
	}
	async function copyCode() {
		try {
			await navigator.clipboard.writeText(codeLines.join('\n'));
			copied = true;
		} catch {
			copied = false;
		}
	}
	$effect(() => {
		if (!playing) return;
		const timer = setInterval(next, Number(speed));
		return () => clearInterval(timer);
	});
</script>

<svelte:head>
	<title>Meldingens reise · Frontend ↔ Backend · IT-laben</title>
	<meta
		name="description"
		content="Følg en melding fra input og fetch, gjennom req.body og push, og tilbake til Svelte. En interaktiv gjennomgang for Vg2 IT."
	/>
</svelte:head>

<div class="lab">
	<header class="topbar">
		<a href="/" class="brand" aria-label="Til forsiden i IT-laben"
			><span class="brand-icon">←</span> IT-laben<span class="brand-dot"> / </span><span
				class="brand-course">Vg2 IT</span
			></a
		>
		<span class="simulation"><i></i> Interaktiv simulering</span>
	</header>

	<main id="top">
		<section class="intro">
			<div>
				<p class="eyebrow">DEL 2 + 3 / FRONTEND OG BACKEND</p>
				<h1>En liten melding.<br /><span>En hel reise.</span></h1>
				<p class="lead">
					Hva skjer egentlig når du trykker «Send»? Følg dataene fra inputfeltet til listen på
					serveren — og tilbake til skjermen.
				</p>
			</div>
			<div class="intro-mark" aria-hidden="true">
				<span>{'{ }'}</span>
				<div class="orbit-label">input → body → array</div>
				<b>01 — 12</b>
			</div>
		</section>

		<section class="workbench" aria-label="Interaktiv gjennomgang">
			<div class="bench-header">
				<div>
					<span class="live-dot"></span><strong>Følg meldingen</strong><span class="muted">
						/ Runde {round}</span
					>
				</div>
				<span class="step-count">STEG {String(step + 1).padStart(2, '0')} / 12</span>
			</div>
			<div class="controls">
				<button class="primary" onclick={play}
					>{playing ? 'Ⅱ Pause' : step === 11 ? '↻ Spill igjen' : '▶ Spill av'}</button
				>
				<button
					onclick={() => {
						playing = false;
						next();
					}}
					disabled={step === 11}>Neste steg →</button
				>
				<button
					class="quiet"
					onclick={rewind}
					title="Spol tilbake denne runden til før meldingen ble sendt">↶ Spol tilbake</button
				>
				<label class="speed"
					>Tempo <select bind:value={speed}
						><option value={4200}>Rolig</option><option value={2600}>Vanlig</option><option
							value={1300}>Raskt</option
						></select
					></label
				>
			</div>
			<ol class="stepper" aria-label="Stegene i reisen">
				{#each steps as item, i}
					<li
						class:current={step === i}
						class:done={step > i}
						aria-current={step === i ? 'step' : undefined}
					>
						<span>{step > i ? '✓' : String(i + 1).padStart(2, '0')}</span><b>{item[0]}</b>
					</li>
				{/each}
			</ol>

			<div class="stage-grid">
				<article class="endpoint browser" class:active={steps[step][2] === 'frontend'}>
					<div class="window-head">
						<span class="window-dots">● ● ●</span><span>NETTLESER / SVELTE</span><span>01</span>
					</div>
					<div class="endpoint-body">
						<div class="endpoint-title">
							<h2>Frontend</h2>
							<span class="pill teal">Klient</span>
						</div>
						<p class="address">http://localhost:5173</p>
						<div class="form-fields">
							<label
								>Avsender <input
									bind:value={avsender}
									disabled={step > 0}
									maxlength="50"
									placeholder="F.eks. Gruppe 1"
								/></label
							>
							<label
								>Melding <input
									value={step >= 8 && valid ? '' : tekst}
									oninput={(event) => (tekst = event.currentTarget.value)}
									disabled={step > 0}
									maxlength="180"
									placeholder="Skriv en melding …"
								/></label
							>
						</div>
						<div class="variable-pair">
							<span>avsender</span><code>{JSON.stringify(step ? payload.avsender : avsender)}</code>
						</div>
						<div class="variable-pair">
							<span>tekst</span><code>{JSON.stringify(step >= 8 && valid ? '' : tekst)}</code>
						</div>
						<div class="mini-actions">
							<button
								class="send"
								disabled={step !== 0}
								onclick={() => {
									next();
									playing = true;
								}}>Send melding ↗</button
							>
							<button
								disabled={step !== 8}
								onclick={() => {
									playing = false;
									next();
								}}>Hent meldinger ↓</button
							>
						</div>
						<p class="form-status" class:error={step >= 8 && step < 11 && !valid}>
							{step >= 8 ? status : 'Skriv i feltene og følg verdiene.'}
						</p>
						<div class="list-heading">
							<strong>Listen på nettsiden</strong><span>{clientList.length}</span>
						</div>
						<div class="message-list" class:flash={step === 11}>
							{#each clientList as melding, i}
								<div class="message">
									<span class="avatar">{melding.avsender.slice(0, 1).toUpperCase()}</span>
									<div>
										<b>{melding.avsender}</b>
										<p>{melding.tekst}</p>
									</div>
									<small>#{i + 1}</small>
								</div>
							{:else}<div class="empty"><span>▤</span>Ingen meldinger hentet ennå.</div>{/each}
						</div>
						<p class="tiny">Egen kopi i nettleseren. Oppdateres med GET.</p>
					</div>
				</article>

				<div class="connection">
					<div class="network-label">HTTP <span>↔</span></div>
					<div
						class="wire"
						class:outbound={step === 3 || step === 9}
						class:inbound={step === 7 || step === 10}
					>
						<div class="wire-track"></div>
						<span class="wire-arrow left">‹</span><span class="wire-arrow right">›</span>
						{#if [3, 7, 9, 10].includes(step)}<span class="travel-packet"
								>{step === 3
									? 'POST'
									: step === 9
										? 'GET'
										: step === 7
											? valid
												? '201'
												: '400'
											: '200'}</span
							>{/if}
					</div>
					<div class="transit-card">
						<span class="eyebrow">{step >= 9 ? 'HENTING' : step >= 7 ? 'RESPONSE' : 'REQUEST'}</span
						>
						<b
							>{step >= 10
								? '200 OK'
								: step === 9
									? 'GET /meldinger'
									: step >= 7
										? valid
											? '201 Created'
											: '400 Bad Request'
										: 'POST /meldinger'}</b
						>
						<p>
							{step >= 10
								? 'Hele listen tilbake'
								: step === 9
									? 'Ingen body'
									: step >= 7
										? 'Et svar på POST'
										: 'Body: JSON-tekst'}
						</p>
					</div>
					<p class="network-note">Nettleseren snakker direkte med Express i denne øvingen.</p>
				</div>

				<article class="endpoint server" class:active={steps[step][2] === 'backend'}>
					<div class="window-head">
						<span class="server-leds">▰ ▰ ▰</span><span>SERVER / NODE + EXPRESS</span><span>02</span
						>
					</div>
					<div class="endpoint-body">
						<div class="endpoint-title">
							<h2>Backend</h2>
							<span class="pill orange">Server</span>
						</div>
						<p class="address">{API}</p>
						<div class="pipeline">
							<div class:lit={step === 4}>
								<span>01</span><code>express.json()</code><b>JSON → objekt</b>
							</div>
							<div class:lit={step === 5} class:failed={!valid && step === 5}>
								<span>02</span><code>req.body</code><b>Les + kontroller</b>
							</div>
							<div class:lit={step === 6 && valid} class:failed={!valid && step === 6}>
								<span>03</span><code>meldinger.push()</code><b
									>{step >= 6 && !valid ? 'Stoppet av return' : 'Legg til'}</b
								>
							</div>
						</div>
						<div class="body-preview">
							<span>req.body {step < 4 ? '· venter' : '· JavaScript-objekt'}</span>
							<pre>{step >= 4 ? pretty(payload) : '// Requesten har ikke kommet frem'}</pre>
						</div>
						<div class="list-heading">
							<strong>meldinger <span class="array-label">/ array i minnet</span></strong><span
								>{serverList.length}</span
							>
						</div>
						<div class="server-array" class:flash={step === 6 && valid}>
							<span class="bracket">[</span>
							{#each serverList as melding, i}<div class="array-row">
									<span class="index">{i}</span>
									<pre>{pretty(melding)}</pre>
								</div>{:else}<p class="empty-array">Tom liste</p>{/each}
							<span class="bracket">]</span>
						</div>
						<p class="tiny">Ingen database: listen forsvinner ved serverstart.</p>
					</div>
				</article>
			</div>

			<div
				class="explanation"
				class:warning={!valid && step >= 5 && step <= 8}
				aria-live="polite"
				aria-atomic="true"
			>
				<span class="explanation-number">{String(step + 1).padStart(2, '0')}</span>
				<div>
					<p class="eyebrow">
						{steps[step][2] === 'frontend'
							? 'I NETTLESEREN'
							: steps[step][2] === 'backend'
								? 'PÅ SERVEREN'
								: 'OVER NETTVERKET'}
					</p>
					<h3>{step === 6 && !valid ? 'Stopp! Meldingen blir avvist.' : steps[step][1]}</h3>
					<p>{description}</p>
				</div>
			</div>
			<div class="experiment">
				<div><strong>Hva om …?</strong><span> Prøv samme reise med andre data.</span></div>
				<label class="sr-only" for="scenario">Velg test</label><select
					id="scenario"
					bind:value={scenario}
					disabled={step > 0}
					><option value="normal">Vanlig melding</option><option value="empty"
						>Send tom tekst</option
					><option value="wrongkey">Send «message» i stedet for «tekst»</option></select
				><button onclick={newMessage} disabled={step !== 11}>Ny melding +</button><button
					class="quiet"
					onclick={clearAll}>Nullstill alt</button
				>
			</div>
			{#if scenario !== 'normal'}<p class="scenario-note">
					{scenario === 'empty'
						? 'Testen erstatter tekst med en tom streng når body bygges, selv om inputfeltet har innhold.'
						: 'Testen sender feltet message i body. Backend-koden leter fortsatt etter tekst.'}
				</p>{/if}
		</section>

		<section class="details-grid">
			<article class="inspector">
				<div class="section-top">
					<span class="section-number">01 /</span>
					<h2>Se hva som sendes</h2>
				</div>
				<p class="section-intro">De samme verdiene. Forskjellige former.</p>
				<div class="data-block" class:selected={step <= 1}>
					<div><b>JavaScript-objekt</b><span>FØR SENDING</span></div>
					<pre>{pretty(payload)}</pre>
				</div>
				<div class="transform">
					<span>↓</span><code>JSON.stringify()</code><span>objekt → tekst</span>
				</div>
				<div class="data-block" class:selected={step === 2 || step === 3}>
					<div><b>HTTP-request</b><span>{step >= 9 ? 'GET' : 'POST'}</span></div>
					<pre class="http">{step >= 9
							? 'GET /meldinger\nHost: backend.example:3000\n\n// Ingen body'
							: 'POST /meldinger\nHost: backend.example:3000\nContent-Type: application/json\n\n' +
								JSON.stringify(payload)}</pre>
				</div>
				<p class="tiny">Forenklet HTTP-visning. JSON-teksten etter den tomme linjen er body.</p>
				<div class="transform">
					<span>↓</span><code>express.json()</code><span>tekst → objekt</span>
				</div>
				<div class="data-block" class:selected={step === 4 || step === 5}>
					<div><b>req.body på backend</b><span>ETTER PARSING</span></div>
					<pre>{pretty(payload)}</pre>
					<p class="field-check">
						<code>req.body.tekst</code> →
						<strong class:error={payload.tekst === undefined}
							>{payload.tekst === undefined ? 'undefined' : JSON.stringify(payload.tekst)}</strong
						>
					</p>
				</div>
				<div class="response-block">
					<span class="pill" class:orange={!valid}
						>{step >= 10
							? '200 OK · GET'
							: `${valid ? '201 Created' : '400 Bad Request'} · POST`}</span
					>
					<p>{step < 7 ? 'Forventet response' : 'Response body'}</p>
					<pre>{pretty(step >= 10 ? serverList : response)}</pre>
				</div>
			</article>

			<article class="code-panel">
				<div class="section-top">
					<span class="section-number">02 /</span>
					<h2>Koden bak reisen</h2>
				</div>
				<p class="section-intro">Fra øving 2 og 3. Markeringene følger steget du er på.</p>
				<p class="tiny">
					I eget prosjekt: Bytt <code>backend.example</code> med adressen til din egen backend.
				</p>
				<div class="code-tabs" role="group" aria-label="Velg kode">
					<button
						class:chosen={codeTab === 'auto'}
						onclick={() => {
							codeTab = 'auto';
							copied = false;
						}}>Følg reisen</button
					><button
						class:chosen={codeTab === 'frontend'}
						onclick={() => {
							codeTab = 'frontend';
							copied = false;
						}}>Frontend</button
					><button
						class:chosen={codeTab === 'backend'}
						onclick={() => {
							codeTab = 'backend';
							copied = false;
						}}>Backend</button
					>
				</div>
				<div class="editor">
					<div class="editor-bar">
						<span
							><i></i>{activeTab === 'frontend'
								? '+page.svelte · JavaScript + HTML'
								: 'server.js · Express'}</span
						><button onclick={copyCode}>{copied ? 'Kopiert ✓' : 'Kopier'}</button>
					</div>
					<div class="focus-code">
						<span>AKKURAT NÅ</span>{#if focusLines.length}{#each focusLines as line}<div
									class="code-line"
								>
									<span class="line-number">{line.number}</span><code
										>{#each tokens(line.text) as token}<span class={token.kind}>{token.text}</span
											>{/each}</code
									>
								</div>{/each}{:else}<p>
								Dette steget har ingen markert linje i den valgte filen.
							</p>{/if}
					</div>
					<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to scroll this code region.) -->
					<div
						class="all-code"
						tabindex="0"
						role="region"
						aria-label="Fullt kodeeksempel, bla for å se alle linjer"
					>
						{#each codeLines as line, i}<div
								class="code-line"
								class:highlight={activeLines.includes(i + 1)}
							>
								<span class="line-number">{i + 1}</span><code
									>{#each tokens(line || ' ') as token}<span class={token.kind}>{token.text}</span
										>{/each}</code
								>
							</div>{/each}
					</div>
				</div>
				<p class="code-note">
					Kodeutdragene følger øvingene. I frontend ligger JavaScript i script-delen og HTML under.
					Backend trenger også CORS-oppsettet fra del 3 når portene er ulike. Simuleringen av feil
					feltnavn endrer bare testdataene.
				</p>
			</article>
		</section>

		<section class="takeaways">
			<div class="takeaway-title">
				<p class="eyebrow">DET VIKTIGE SKILLET</p>
				<h2>Samme navn.<br />To ulike lister.</h2>
				<p>
					Både frontend og backend bruker navnet <code>meldinger</code>. De deler likevel ikke
					variabelen eller minnet.
				</p>
			</div>
			<div class="takeaway">
				<span>POST ↗</span>
				<h3>Endrer listen på serveren</h3>
				<p>
					Body inneholder én melding. Backend kontrollerer den, legger den til og sender en
					bekreftelse.
				</p>
				<code>meldinger.push(melding)</code>
			</div>
			<div class="takeaway">
				<span>GET ↙</span>
				<h3>Henter en kopi til klienten</h3>
				<p>
					Backend returnerer listen. Frontend leser svaret og viser innholdet med en each-blokk.
				</p>
				<code>meldinger = await svar.json()</code>
			</div>
		</section>

		<section class="notes" aria-label="Prøv og forstå">
			<details>
				<summary>Hvor kommer selve nettsiden fra?</summary>
				<p>
					Først henter nettleseren siden og JavaScript fra frontendserveren, for eksempel port 5173.
					Etterpå kjører knappefunksjonene i nettleseren. fetch() i denne øvingen går direkte fra
					nettleseren til Express på port 3000.
				</p>
				<p>
					Andre oppsett kan bruke en proxy eller serverruter i SvelteKit. Det er ikke oppsettet som
					vises her.
				</p>
			</details>
			<details>
				<summary>Hva med CORS og OPTIONS?</summary>
				<p>
					Ulike porter betyr ulike origins. Backend må tillate frontendens origin. Ved POST med
					application/json på tvers av origins gjør nettleseren normalt en OPTIONS-forhåndssjekk før
					POST. Den er utelatt fra animasjonen for å vise selve dataflyten tydelig.
				</p>
				<p>
					CORS håndheves av nettleseren og er ikke pålogging. API-adressen skal peke på
					backendmaskinen. localhost betyr alltid maskinen der nettleseren kjører.
				</p>
			</details>
			<details>
				<summary>Tre ting å prøve sammen</summary>
				<ol>
					<li>
						Stopp på push(). Hvilken liste har fått meldingen? Hvorfor er den andre fortsatt
						uendret?
					</li>
					<li>Velg feil feltnavn og se på req.body. Hvorfor får du undefined for tekst?</li>
					<li>Fullfør reisen, velg Ny melding, og send en til. Hva inneholder GET-svaret nå?</li>
				</ol>
			</details>
		</section>
		<footer>
			<span>IT-laben / FRONTEND ↔ BACKEND</span>
			<p>
				En lokal undervisningssimulering basert på øving 2 og 3. Ingen ekte HTTP-kall eller server
				startes. Nullstill alt tømmer begge demolistene.
			</p>
		</footer>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f3f4ee;
		color: #182e32;
		font-family:
			Inter,
			ui-sans-serif,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
	}
	:global(*) {
		box-sizing: border-box;
	}
	:global(html) {
		scroll-behavior: smooth;
	}
	.lab {
		--teal: #087e80;
		--orange: #e98c49;
		--ink: #162e33;
		--border: #d9e0d9;
		--muted: #647578;
		min-height: 100vh;
		background: radial-gradient(ellipse at 80% 2%, #d7eee66b, transparent 38%);
	}
	button,
	input,
	select {
		font: inherit;
	}
	button,
	select {
		cursor: pointer;
	}
	button {
		border: 1px solid #cdd8d2;
		background: white;
		color: var(--ink);
		border-radius: 8px;
		padding: 10px 15px;
		font-size: 13px;
		font-weight: 650;
		transition:
			background 0.2s,
			transform 0.2s;
	}
	button:hover:not(:disabled) {
		background: #e5eee8;
		transform: translateY(-1px);
	}
	button:disabled {
		opacity: 0.42;
		cursor: not-allowed;
	}
	button:focus-visible,
	a:focus-visible,
	input:focus-visible,
	select:focus-visible,
	summary:focus-visible,
	[tabindex]:focus-visible {
		outline: 3px solid #df9552;
		outline-offset: 4px;
	}
	code,
	pre {
		font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
	}
	pre {
		margin: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font-size: 12px;
		line-height: 1.65;
	}
	p {
		line-height: 1.65;
	}
	h1,
	h2,
	h3,
	p {
		margin-top: 0;
	}
	h2 {
		font-size: 23px;
		letter-spacing: -0.7px;
	}
	h3 {
		font-size: 22px;
		letter-spacing: -0.6px;
	}
	a {
		color: inherit;
	}
	main {
		max-width: 1430px;
		margin: auto;
		padding: 0 46px;
	}
	.topbar {
		height: 78px;
		border-bottom: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 46px;
		max-width: 1522px;
		margin: auto;
	}
	.brand {
		text-decoration: none;
		font-size: 14px;
		font-weight: 850;
		letter-spacing: 1.5px;
		display: flex;
		gap: 12px;
		align-items: center;
	}
	.brand-icon {
		display: grid;
		place-items: center;
		background: var(--ink);
		color: #b8efce;
		width: 33px;
		height: 33px;
		border-radius: 9px;
		font-size: 24px;
	}
	.brand-dot {
		color: #9baca6;
	}
	.brand-course {
		font-weight: 500;
		letter-spacing: 0;
	}
	.simulation {
		font-size: 12px;
		color: #536962;
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.simulation i,
	.live-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #0b8c77;
		display: inline-block;
	}
	.intro {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 62px 0 44px;
		gap: 45px;
	}
	.eyebrow {
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 1.8px;
		color: var(--teal);
		margin-bottom: 15px;
	}
	h1 {
		font-size: clamp(42px, 5.4vw, 76px);
		line-height: 1.04;
		letter-spacing: -3.5px;
		margin-bottom: 24px;
		font-weight: 780;
	}
	h1 span {
		color: var(--teal);
	}
	.lead {
		font-size: 16px;
		color: #5e7171;
		max-width: 610px;
		margin-bottom: 0;
	}
	.intro-mark {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 225px;
		height: 225px;
		flex-shrink: 0;
		border: 1px dashed #a4bdb2;
		border-radius: 50%;
		margin-right: 55px;
		background: repeating-radial-gradient(
			circle,
			transparent 0,
			transparent 37px,
			#c9dcd15c 38px,
			transparent 39px
		);
		transform: rotate(-8deg);
	}
	.intro-mark > span {
		font: 600 70px monospace;
		color: var(--teal);
		letter-spacing: 10px;
	}
	.orbit-label {
		background: var(--ink);
		color: #d5f8e9;
		padding: 10px 18px;
		border-radius: 6px;
		font: 12px monospace;
		position: absolute;
		bottom: 37px;
		right: -38px;
		transform: rotate(8deg);
	}
	.intro-mark b {
		font: 10px monospace;
		position: absolute;
		top: 18px;
		color: #58736d;
	}
	.workbench {
		background: #fff;
		border: 1px solid #cad7cf;
		border-radius: 16px;
		box-shadow: 0 18px 50px #213e2f08;
		overflow: hidden;
	}
	.bench-header {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		padding: 20px 24px;
		border-bottom: 1px solid #e3e9e3;
		font-size: 13px;
	}
	.live-dot {
		margin-right: 9px;
	}
	.muted {
		color: var(--muted);
		font-size: 12px;
	}
	.step-count {
		font: 11px monospace;
		color: var(--muted);
	}
	.controls {
		display: flex;
		gap: 9px;
		align-items: center;
		padding: 19px 24px;
	}
	.primary,
	.send {
		background: var(--teal);
		border-color: var(--teal);
		color: white;
	}
	.primary:hover:not(:disabled),
	.send:hover:not(:disabled) {
		background: #086668;
	}
	.quiet {
		background: transparent;
		border-color: transparent;
		color: #6c7d79;
	}
	.speed {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--muted);
	}
	select {
		border: 1px solid #d3ddd5;
		background: #f9faf7;
		padding: 9px;
		border-radius: 6px;
		color: #25403e;
		font-size: 12px;
		max-width: 100%;
	}
	.stepper {
		list-style: none;
		padding: 0 24px;
		margin: 4px 0 25px;
		display: grid;
		grid-template-columns: repeat(12, 1fr);
	}
	.stepper li {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 9px;
		min-width: 0;
	}
	.stepper li:before {
		content: '';
		position: absolute;
		top: 14px;
		left: 0;
		right: 0;
		height: 1px;
		background: #e0e7df;
	}
	.stepper li:first-child:before {
		left: 50%;
	}
	.stepper li:last-child:before {
		right: 50%;
	}
	.stepper li > span {
		z-index: 1;
		border-radius: 50%;
		background: #f2f5ef;
		border: 1px solid #dce4dc;
		width: 29px;
		height: 29px;
		display: grid;
		place-items: center;
		font: 10px monospace;
		color: #64766a;
	}
	.stepper li > b {
		font-size: 10px;
		font-weight: 550;
		color: #687d78;
	}
	.stepper .current > span {
		background: var(--teal);
		color: white;
		border-color: var(--teal);
		box-shadow: 0 0 0 5px #e2f3eb;
	}
	.stepper .current > b {
		color: var(--teal);
		font-weight: 800;
	}
	.stepper .done > span {
		background: #dceddf;
		color: #237a55;
	}
	.stage-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 165px minmax(0, 1fr);
		padding: 0 24px;
		align-items: start;
	}
	.endpoint {
		border: 1px solid #dce5df;
		border-radius: 12px;
		overflow: hidden;
		transition:
			box-shadow 0.35s,
			border-color 0.35s;
		min-width: 0;
	}
	.browser.active {
		border-color: #4ba79b;
		box-shadow: 0 0 0 4px #e9f6f0;
	}
	.server.active {
		border-color: #dba064;
		box-shadow: 0 0 0 4px #fcf0e6;
	}
	.window-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #f0f5f0;
		padding: 12px 15px;
		font: 9px monospace;
		letter-spacing: 0.5px;
		color: #65817a;
	}
	.window-dots {
		letter-spacing: 1px;
		color: #b4cbbf;
	}
	.server .window-head {
		background: #f6f1ea;
		color: #8b7664;
	}
	.server-leds {
		color: #d6a16c;
	}
	.endpoint-body {
		padding: 20px;
	}
	.endpoint-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.endpoint-title h2 {
		margin: 0;
	}
	.pill {
		border-radius: 5px;
		padding: 5px 8px;
		font: 10px monospace;
		display: inline-block;
		background: #e4f3ec;
		color: #176455;
	}
	.pill.orange {
		background: #fff0df;
		color: #9b571b;
	}
	.address {
		font: 10px monospace;
		color: #7b8b83;
		margin: 8px 0 24px;
	}
	.form-fields {
		display: grid;
		gap: 12px;
	}
	.form-fields label {
		font-size: 11px;
		font-weight: 700;
		color: #48645c;
		display: grid;
		gap: 6px;
	}
	input {
		width: 100%;
		min-width: 0;
		padding: 11px 12px;
		border: 1px solid #ceddd2;
		border-radius: 7px;
		font-size: 13px;
		background: white;
		color: #294139;
	}
	input:disabled {
		background: #f4f7f3;
		color: #526c61;
		opacity: 1;
	}
	.variable-pair {
		display: flex;
		gap: 12px;
		align-items: start;
		font: 11px monospace;
		margin-top: 10px;
		overflow-wrap: anywhere;
	}
	.variable-pair > span {
		color: #8e6c9a;
		min-width: 64px;
	}
	.variable-pair code {
		color: var(--teal);
		min-width: 0;
	}
	.mini-actions {
		display: flex;
		gap: 7px;
		margin-top: 17px;
		flex-wrap: wrap;
	}
	.mini-actions button {
		font-size: 11px;
		padding: 9px 10px;
	}
	.form-status {
		font-size: 11px;
		color: #657c70;
		margin: 10px 0 18px;
		min-height: 18px;
	}
	.error {
		color: #b74136 !important;
	}
	.list-heading {
		border-top: 1px solid #e0e8df;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 17px;
		margin: 10px 0;
		font-size: 11px;
	}
	.list-heading > span {
		font: 10px monospace;
		background: #ecf2eb;
		padding: 3px 7px;
		border-radius: 4px;
	}
	.message-list {
		border: 1px dashed #cfded1;
		border-radius: 7px;
		min-height: 99px;
		max-height: 230px;
		overflow: auto;
		background: #f8faf6;
	}
	.empty {
		padding: 23px 9px;
		text-align: center;
		font-size: 11px;
		color: #87998b;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.empty > span {
		font-size: 20px;
	}
	.message {
		display: flex;
		gap: 8px;
		padding: 12px;
		border-bottom: 1px solid #e2eae1;
		font-size: 11px;
		animation: arrive 0.45s ease-out;
	}
	.message:last-child {
		border-bottom: none;
	}
	.avatar {
		border-radius: 7px;
		background: #d8e9df;
		color: #2b7661;
		width: 27px;
		height: 27px;
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}
	.message > div {
		min-width: 0;
	}
	.message p {
		margin: 3px 0 0;
		overflow-wrap: anywhere;
	}
	.message small {
		margin-left: auto;
		color: #8da193;
		font: 9px monospace;
	}
	.tiny {
		font-size: 10px;
		line-height: 1.6;
		color: #708778;
		margin: 10px 0 0;
	}
	.connection {
		text-align: center;
		padding-top: 90px;
		min-width: 0;
	}
	.network-label {
		font: 11px monospace;
		color: #789083;
		letter-spacing: 2px;
	}
	.network-label span {
		color: var(--teal);
		margin-left: 4px;
	}
	.wire {
		position: relative;
		height: 73px;
		margin: 6px 0;
	}
	.wire-track {
		position: absolute;
		top: 36px;
		left: 0;
		right: 0;
		border-top: 2px dashed #c7d8cb;
	}
	.wire-arrow {
		position: absolute;
		top: 22px;
		color: #abc6b7;
		font-size: 26px;
	}
	.wire-arrow.left {
		left: 2px;
	}
	.wire-arrow.right {
		right: 2px;
	}
	.travel-packet {
		position: absolute;
		top: 24px;
		left: 0;
		background: var(--teal);
		color: white;
		border: 4px solid white;
		border-radius: 8px;
		font: 10px monospace;
		padding: 7px 10px;
		box-shadow: 0 3px 12px #26453422;
		animation: send 1.8s ease-in-out infinite;
	}
	.inbound .travel-packet {
		background: #b96e2f;
		animation-name: receive;
	}
	.transit-card {
		padding: 12px 3px;
		margin: 0 10px;
		background: #f5f7f2;
		border: 1px solid #e8ede5;
		border-radius: 8px;
	}
	.transit-card .eyebrow {
		font-size: 8px;
		display: block;
		margin-bottom: 9px;
	}
	.transit-card > b {
		font: 10px monospace;
		display: block;
		overflow-wrap: anywhere;
	}
	.transit-card p {
		font-size: 10px;
		margin: 7px 0 0;
		color: #7b8c81;
	}
	.network-note {
		font-size: 10px;
		line-height: 1.7;
		margin: 15px;
		color: #7a8b80;
	}
	.pipeline {
		display: grid;
		gap: 6px;
	}
	.pipeline > div {
		display: flex;
		align-items: center;
		gap: 9px;
		border: 1px solid #e6e7df;
		border-radius: 5px;
		padding: 10px 9px;
		transition: background 0.3s;
	}
	.pipeline span {
		font: 9px monospace;
		color: #a5ad9f;
	}
	.pipeline code {
		font-size: 11px;
	}
	.pipeline b {
		margin-left: auto;
		font-size: 9px;
		font-weight: 500;
		color: #7e8c7d;
	}
	.pipeline .lit {
		background: #fff0db;
		border-color: #e4ae72;
	}
	.pipeline .failed {
		background: #ffede8;
		border-color: #dd8572;
	}
	.body-preview {
		margin-top: 13px;
		padding: 10px;
		background: #f7f7f2;
		border: 1px solid #eaeae2;
		border-radius: 6px;
		min-height: 112px;
	}
	.body-preview > span {
		font: 9px monospace;
		color: #8a8e7d;
		display: block;
		margin-bottom: 7px;
	}
	.body-preview pre {
		font-size: 10px;
		color: #496958;
	}
	.array-label {
		font-size: 9px;
		color: #92a08c;
		font-weight: 400;
	}
	.server-array {
		background: #f8f7f1;
		border: 1px solid #e7e7da;
		border-radius: 6px;
		padding: 8px 12px;
		min-height: 99px;
		max-height: 230px;
		overflow: auto;
	}
	.bracket {
		font: 15px monospace;
		color: #9b8a6d;
	}
	.array-row {
		display: flex;
		gap: 8px;
		margin: 3px 0;
		animation: arrive 0.5s ease-out;
	}
	.array-row pre {
		font-size: 10px;
		color: #75633f;
	}
	.index {
		font: 9px monospace;
		color: #a79a7e;
		padding-top: 3px;
	}
	.empty-array {
		font: 10px monospace;
		color: #a9a08c;
		margin: 6px 0 6px 14px;
	}
	.flash {
		animation: flash 0.8s ease-out;
	}
	.explanation {
		display: flex;
		gap: 22px;
		background: #eff7f0;
		border-left: 3px solid var(--teal);
		margin: 25px 24px 0;
		padding: 22px;
		border-radius: 0 8px 8px 0;
	}
	.explanation-number {
		font: 38px monospace;
		color: #9fc8b6;
	}
	.explanation .eyebrow {
		font-size: 9px;
		margin-bottom: 7px;
	}
	.explanation h3 {
		margin-bottom: 8px;
		font-size: 21px;
	}
	.explanation p:last-child {
		font-size: 13px;
		line-height: 1.7;
		margin-bottom: 0;
		color: #466457;
	}
	.explanation.warning {
		background: #fff3e9;
		border-color: #c86a32;
	}
	.experiment {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		padding: 20px 24px;
		font-size: 11px;
	}
	.experiment > div {
		margin-right: auto;
	}
	.experiment span {
		color: #7a8c81;
	}
	.experiment button {
		font-size: 11px;
	}
	.scenario-note {
		margin: 0 24px 20px;
		padding: 9px 12px;
		border-radius: 6px;
		background: #fff6e8;
		color: #896d43;
		font-size: 11px;
	}
	.details-grid {
		display: grid;
		grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.3fr);
		gap: 35px;
		margin-top: 52px;
		align-items: start;
	}
	.section-top {
		display: flex;
		gap: 12px;
		align-items: baseline;
	}
	.section-top h2 {
		font-size: 23px;
		margin-bottom: 10px;
	}
	.section-number {
		font: 12px monospace;
		color: var(--teal);
	}
	.section-intro {
		font-size: 12px;
		color: #79877d;
		margin-bottom: 22px;
	}
	.data-block {
		padding: 17px;
		background: #fff;
		border: 1px solid #dce4d9;
		border-radius: 9px;
		transition: box-shadow 0.3s;
	}
	.data-block.selected {
		box-shadow: 0 0 0 3px #abd9c4;
		border-color: #70b59b;
	}
	.data-block > div {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 14px;
	}
	.data-block b {
		font-size: 12px;
	}
	.data-block > div > span {
		font: 8px monospace;
		color: #8b9b8c;
		align-self: center;
	}
	.data-block pre {
		color: #3a7164;
		font-size: 11px;
	}
	.transform {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		font-size: 10px;
		color: #849584;
	}
	.transform > span:first-child {
		font-size: 20px;
		color: var(--teal);
	}
	.transform code {
		color: #467960;
		font-size: 11px;
	}
	.transform > span:last-child {
		margin-left: auto;
		font-size: 9px;
	}
	.field-check {
		margin: 12px 0 0;
		font-size: 10px;
		border-top: 1px solid #e7ede4;
		padding-top: 10px;
		overflow-wrap: anywhere;
	}
	.response-block {
		border-left: 2px solid #8fae90;
		padding: 3px 17px;
		margin-top: 24px;
	}
	.response-block > p {
		font-size: 10px;
		color: #7f8d7b;
		margin: 12px 0 7px;
	}
	.response-block pre {
		font-size: 11px;
		color: #60744f;
	}
	.code-tabs {
		display: flex;
		gap: 4px;
		padding: 4px;
		background: #e5eae2;
		border-radius: 8px;
		margin-bottom: 10px;
		width: fit-content;
	}
	.code-tabs button {
		border: 0;
		background: none;
		font-size: 11px;
		padding: 8px 13px;
		color: #73816d;
	}
	.code-tabs .chosen {
		background: white;
		color: #2c5847;
		box-shadow: 0 2px 5px #2343280b;
	}
	.editor {
		border-radius: 11px;
		overflow: hidden;
		background: #162c31;
		color: #cedfdb;
		box-shadow: 0 10px 30px #16321d10;
	}
	.editor-bar {
		background: #20383c;
		padding: 12px 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 7px;
		font: 10px monospace;
		color: #a2bab0;
	}
	.editor-bar i {
		display: inline-block;
		width: 7px;
		height: 7px;
		background: #9bceaf;
		border-radius: 50%;
		margin-right: 8px;
	}
	.editor-bar button {
		padding: 5px 8px;
		font-size: 9px;
		border-color: #3a5557;
		background: #2c4548;
		color: #c8dcd4;
	}
	.focus-code {
		padding: 15px 0;
		background: #1f3c3b;
		border-bottom: 1px solid #3d5b51;
		overflow: auto;
	}
	.focus-code > span {
		display: block;
		padding: 0 18px 10px;
		font: 8px monospace;
		letter-spacing: 1.8px;
		color: #a6d6b5;
	}
	.focus-code > p {
		padding: 0 18px;
		font-size: 11px;
		color: #9fb9ac;
	}
	.code-line {
		display: flex;
		font-size: 11px;
		line-height: 1.85;
		min-width: max-content;
		padding-right: 15px;
		border-left: 2px solid transparent;
	}
	.code-line code {
		white-space: pre;
	}
	.line-number {
		user-select: none;
		min-width: 39px;
		padding: 0 10px;
		text-align: right;
		color: #6b8886;
		font: 10px/2.04 monospace;
	}
	.all-code {
		padding: 13px 0;
		overflow: auto;
		max-height: 565px;
		scrollbar-color: #45635b #162c31;
	}
	.highlight {
		background: #2f5145;
		border-left-color: #c4eb8f;
	}
	.highlight .line-number {
		color: #c4eb8f;
	}
	.keyword {
		color: #c7b0eb;
	}
	.string {
		color: #b5d997;
	}
	.comment {
		color: #88a5a2;
		font-style: italic;
	}
	.number {
		color: #e9b681;
	}
	.code-note {
		font-size: 10px;
		color: #7b8c79;
		line-height: 1.7;
		margin-top: 13px;
	}
	.takeaways {
		display: grid;
		grid-template-columns: 1.1fr 1fr 1fr;
		gap: 34px;
		padding: 38px;
		border-radius: 13px;
		background: #e6ece0;
		margin: 47px 0 25px;
	}
	.takeaway-title h2 {
		font-size: 30px;
		line-height: 1.15;
		margin-bottom: 14px;
		letter-spacing: -1px;
	}
	.takeaway-title p:last-child,
	.takeaway p {
		font-size: 12px;
		color: #61745c;
		margin: 0;
	}
	.takeaway {
		padding-left: 24px;
		border-left: 1px solid #cdd9c8;
	}
	.takeaway > span {
		font: 11px monospace;
		color: var(--teal);
		display: block;
		margin-bottom: 19px;
	}
	.takeaway h3 {
		font-size: 18px;
		line-height: 1.35;
		letter-spacing: -0.4px;
	}
	.takeaway > code {
		font-size: 10px;
		display: block;
		margin-top: 17px;
		color: #3e6d4c;
		overflow-wrap: anywhere;
	}
	.notes {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0;
	}
	details {
		border-bottom: 1px solid #d7dfd2;
		padding: 18px 3px;
	}
	summary {
		font-size: 13px;
		font-weight: 650;
		cursor: pointer;
	}
	details p,
	details li {
		font-size: 12px;
		line-height: 1.8;
		color: #62735b;
		max-width: 850px;
	}
	details p {
		margin: 14px 0 0;
	}
	footer {
		display: flex;
		gap: 40px;
		justify-content: space-between;
		align-items: center;
		padding: 30px 0 38px;
	}
	footer > span {
		font: 9px monospace;
		color: #6a8268;
		flex-shrink: 0;
	}
	footer p {
		max-width: 600px;
		font-size: 10px;
		color: #84917c;
		margin: 0;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	@keyframes send {
		0% {
			left: 0;
			opacity: 0;
			transform: translateX(-20%);
		}
		20% {
			opacity: 1;
		}
		85% {
			opacity: 1;
		}
		100% {
			left: 100%;
			transform: translateX(-80%);
			opacity: 0;
		}
	}
	@keyframes receive {
		0% {
			left: 100%;
			transform: translateX(-80%);
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		85% {
			opacity: 1;
		}
		100% {
			left: 0;
			transform: translateX(-20%);
			opacity: 0;
		}
	}
	@keyframes arrive {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@keyframes flash {
		0% {
			box-shadow: 0 0 0 4px #dfa457;
		}
		100% {
			box-shadow: 0 0 0 0 transparent;
		}
	}
	@media (min-width: 1500px) {
		.intro {
			padding-top: 70px;
		}
		.endpoint-body {
			padding: 24px;
		}
		.stage-grid {
			grid-template-columns: minmax(0, 1fr) 190px minmax(0, 1fr);
		}
	}
	@media (max-width: 1050px) {
		main {
			padding: 0 25px;
		}
		.topbar {
			padding: 0 25px;
		}
		.intro-mark {
			margin-right: 10px;
			width: 180px;
			height: 180px;
		}
		.intro-mark > span {
			font-size: 60px;
		}
		.orbit-label {
			font-size: 10px;
			right: -10px;
			bottom: 25px;
		}
		.stage-grid {
			grid-template-columns: minmax(0, 1fr) 115px minmax(0, 1fr);
			padding: 0 15px;
		}
		.endpoint-body {
			padding: 15px;
		}
		.pipeline b {
			display: none;
		}
		.network-note {
			margin: 12px 6px;
			font-size: 9px;
		}
		.transit-card {
			margin: 0 4px;
		}
		.stepper {
			padding: 0 14px;
		}
		.stepper li > b {
			font-size: 9px;
		}
		.details-grid {
			gap: 22px;
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
		}
		.takeaways {
			padding: 25px;
			gap: 20px;
		}
		.takeaway {
			padding-left: 18px;
		}
		.takeaway-title h2 {
			font-size: 26px;
		}
	}
	@media (max-width: 760px) {
		main {
			padding: 0 15px;
		}
		.topbar {
			padding: 0 18px;
			height: 65px;
		}
		.brand {
			font-size: 11px;
			gap: 8px;
		}
		.brand-course,
		.brand-dot {
			display: none;
		}
		.simulation {
			font-size: 10px;
		}
		.intro {
			padding: 35px 0 30px;
		}
		.intro-mark {
			display: none;
		}
		h1 {
			font-size: 49px;
			letter-spacing: -2.6px;
		}
		.lead {
			font-size: 14px;
		}
		.controls {
			padding: 15px;
			flex-wrap: wrap;
			gap: 6px;
		}
		.controls button {
			font-size: 11px;
			padding: 9px 10px;
		}
		.speed {
			width: 100%;
			justify-content: flex-end;
		}
		.stepper {
			grid-template-columns: repeat(6, 1fr);
			row-gap: 14px;
			margin-bottom: 20px;
		}
		.stepper li:nth-child(6):before {
			right: 50%;
		}
		.stepper li:nth-child(7):before {
			left: 50%;
		}
		.stepper li > b {
			font-size: 9px;
		}
		.stage-grid {
			grid-template-columns: 1fr;
		}
		.connection {
			padding: 15px 0;
			display: grid;
			grid-template-columns: 1fr 1fr;
			align-items: center;
			gap: 5px 15px;
		}
		.network-label {
			grid-column: 1;
		}
		.wire {
			grid-column: 1;
			margin: 0;
			height: 42px;
			grid-row: 2;
		}
		.wire-track {
			top: 21px;
		}
		.wire-arrow {
			top: 7px;
		}
		.travel-packet {
			top: 8px;
		}
		.transit-card {
			grid-row: 1 / 3;
			grid-column: 2;
			padding: 13px;
		}
		.network-note {
			grid-column: 1 / 3;
			margin: 4px 0 0;
			font-size: 10px;
		}
		.endpoint-body {
			padding: 19px;
		}
		.pipeline b {
			display: block;
		}
		.explanation {
			margin: 20px 15px 0;
			padding: 17px;
			gap: 13px;
		}
		.explanation-number {
			font-size: 27px;
		}
		.explanation h3 {
			font-size: 19px;
		}
		.explanation p:last-child {
			font-size: 12px;
		}
		.experiment {
			padding: 16px 15px;
		}
		.experiment > div {
			width: 100%;
			margin-bottom: 4px;
		}
		.experiment select {
			width: 100%;
		}
		.details-grid {
			grid-template-columns: 1fr;
			margin-top: 34px;
			gap: 30px;
		}
		.takeaways {
			grid-template-columns: 1fr;
			margin-top: 30px;
			padding: 25px;
		}
		.takeaway {
			padding: 20px 0 0;
			border-left: 0;
			border-top: 1px solid #cdd9c8;
		}
		.takeaway > span {
			margin-bottom: 12px;
		}
		.takeaway h3 {
			margin-bottom: 10px;
		}
		.takeaway-title h2 br {
			display: none;
		}
		.bench-header {
			padding: 16px;
			font-size: 12px;
		}
		.muted {
			font-size: 10px;
		}
		footer {
			flex-direction: column;
			align-items: start;
			gap: 14px;
		}
		.code-line {
			font-size: 10px;
		}
		.line-number {
			font-size: 9px;
			line-height: 2.055;
		}
		.all-code {
			max-height: 440px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(html) {
			scroll-behavior: auto;
		}
		*,
		*:before,
		*:after {
			animation: none !important;
			transition: none !important;
		}
		.travel-packet {
			left: 50%;
			transform: translateX(-50%);
		}
	}
</style>
