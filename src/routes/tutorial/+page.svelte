<script>
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Avatar from '#lib/components/Avatar.svelte';
	import { lab } from '#lib/lab.js';
	import { labPreferences, reducedMotion } from '#lib/labPreferences.js';
	import { guideSteps, tutorialSamples, tutorialResult } from '#lib/studentGuide.js';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	let mounted = $state(false);
	/** @type {HTMLHeadingElement|undefined} */
	let tourHeading = $state();
	/** @type {HTMLDivElement|undefined} */
	let tourPanel = $state();
	/** @type {HTMLButtonElement|undefined} */
	let startButton = $state();
	const tourIndex = $derived(
		mounted ? guideSteps.findIndex((step) => step.id === page.url.searchParams.get('tur')) : -1
	);
	const touring = $derived(tourIndex >= 0);
	const activeStep = $derived(touring ? guideSteps[tourIndex] : null);
	const avatarId = $derived($lab.summary?.lab.avatarId ?? $labPreferences.partnerAvatar);
	const section = $derived(activeStep?.id ?? 'all');
	onMount(() => {
		mounted = true;
	});
	async function visit(/** @type {number} */ index) {
		const target = guideSteps[index];
		if (!target) return;
		await goto(`/tutorial/?tur=${target.id}`, { reset: false });
		await tick();
		tourHeading?.focus({ preventScroll: true });
		tourPanel?.scrollIntoView({ block: 'start', behavior: 'instant' });
	}
	async function endTour() {
		await goto('/tutorial/', { reset: false });
		await tick();
		startButton?.focus();
	}
	let sample = $state('spaces');
	let trim = $state(false);
	/** @type {{sample:string,trim:boolean}|null} */
	let run = $state(null);
	const result = $derived(run ? tutorialResult(run) : null);
	const stale = $derived.by(() => run !== null && (run.sample !== sample || run.trim !== trim));
	function reset() {
		sample = 'spaces';
		trim = false;
		run = null;
	}
</script>

<svelte:head>
	<title>Slik bruker du IT-laben – veiledning for elever</title>
	<meta
		name="description"
		content="Finn en oppgave, prøv selv, les resultatet og bruk hjelp. En kort tutorial for elever i IT-laben."
	/>
</svelte:head>
<PartnerContext pageId="tutorial" values={{ section, sample, trim, run }} />
<main id="hovedinnhold" tabindex="-1">
	<nav class="breadcrumbs" aria-label="Brødsmuler">
		<a href="/?visning=elev">Fagoversikt</a><span aria-hidden="true">/</span><span
			aria-current="page">Slik bruker du IT-laben</span
		>
	</nav>
	<header class="intro">
		<p class="eyebrow">VEILEDNING FOR ELEVER · CA. 5 MINUTTER</p>
		<h1>Slik bruker du IT-laben</h1>
		{#if !touring}
			<p class="lead">La labpartneren vise deg rundt, ett steg om gangen.</p>
			<p>
				Finn en oppgave, prøv en liten test og bli kjent med hjelpen. Du bestemmer tempoet.
				Omvisningen virker uten innlogging og KI.
			</p>
			<div class="actions">
				<button bind:this={startButton} class="primary" onclick={() => visit(0)}
					>Start omvisningen med labpartneren →</button
				>
				<a href="#prov">Prøv eksemplet direkte</a>
			</div>
		{:else}<p class="note">
				En kort omvisning med labpartneren · Du kan gå tilbake, hoppe mellom steg eller avslutte.
			</p>{/if}
	</header>
	{#if touring && activeStep}
		<div class="tour" bind:this={tourPanel}>
			<nav aria-label="Steg i omvisningen">
				<ol class="tour-steps">
					{#each guideSteps as step, index}
						<li>
							<button
								aria-current={index === tourIndex ? 'step' : undefined}
								aria-label={`${index + 1}. ${step.title}`}
								onclick={() => visit(index)}><span>{index + 1}</span>{step.shortTitle}</button
							>
						</li>
					{/each}
				</ol>
			</nav>
			<div class="tour-coach">
				<div class="tour-avatar">
					<Avatar
						id={avatarId}
						size={88}
						mood={tourIndex === 2 ? 'thinking' : 'greeting'}
						animate={!$reducedMotion}
					/>
				</div>
				<div class="tour-speech">
					<p class="eyebrow">
						LABPARTNEREN VISER DEG RUNDT · STEG {tourIndex + 1} AV {guideSteps.length}
					</p>
					<h2 id="tour-title" bind:this={tourHeading} tabindex="-1">{activeStep.title}</h2>
					<p>{activeStep.speech}</p>
				</div>
			</div>
			<div class="tour-controls">
				<button class="secondary" disabled={tourIndex === 0} onclick={() => visit(tourIndex - 1)}
					>← Tilbake</button
				>
				{#if tourIndex < guideSteps.length - 1}<button
						class="primary"
						onclick={() => visit(tourIndex + 1)}
						>Neste: {guideSteps[tourIndex + 1].shortTitle} →</button
					>
				{:else}<a class="primary" href="/?fag=utvikling&visning=elev">Finn dagens oppgave →</a>{/if}
				<button class="tour-exit" onclick={endTour}>Avslutt omvisningen</button>
			</div>
		</div>
	{:else}
		<nav class="step-nav" aria-label="Stegene i veiledningen">
			{#each guideSteps as step, index}<a href={`#${step.id}`}
					><span>{index + 1}</span>{step.title}</a
				>{/each}
		</nav>
	{/if}
	<div class="guide-content" class:guided={touring}>
		{#each guideSteps as step, index}
			<section
				id={step.id}
				hidden={touring && index !== tourIndex}
				aria-labelledby={touring ? 'tour-title' : `title-${step.id}`}
			>
				{#if !touring}<p class="eyebrow">STEG {index + 1} AV {guideSteps.length}</p>
					<h2 id={`title-${step.id}`}>{step.title}</h2>{/if}
				<p>{step.text}</p>
				{#if step.id === 'finn'}
					<div class="route-example" aria-label="Eksempel på veien til en oppgave">
						<span>Utvikling</span><span aria-hidden="true">→</span><span>Backend</span><span
							aria-hidden="true">→</span
						><span>Frontend møter backend</span>
					</div>
					<p class="note">
						Ingen moduler synlige? Læreren styrer når de åpnes. Bruk søket eller «Finn
						enkeltoppgaver» på fagoversikten hvis du skal repetere en bestemt oppgave.
					</p>
				{:else if step.id === 'les'}
					<div class="callout">
						<strong>I prøveoppgaven:</strong>
						<p>
							En vanlig melding skal lagres. En melding med bare mellomrom skal avvises. Hva tror du
							skjer hvis vi bare sjekker om teksten har tegn?
						</p>
					</div>
				{:else if step.id === 'prov'}
					<div class="practice">
						<div class="practice-heading">
							<h3>Prøveoppgave: stopp en tom melding</h3>
							<span class="tag">Lokal simulering · ingen XP</span>
						</div>
						<p>
							Start med «Bare mellomrom» og kjør testen. Bruk deretter forklaringen til å endre
							kontrollen og prøve igjen.
						</p>
						<div class="practice-grid">
							<div>
								<label for="sample">1. Velg et testtilfelle</label>
								<select id="sample" bind:value={sample}
									>{#each tutorialSamples as item}<option value={item.id}>{item.label}</option
										>{/each}</select
								>
								<p class="input-preview">
									Tekst som sendes: <code
										>{JSON.stringify(
											tutorialSamples.find((item) => item.id === sample)?.text
										)}</code
									>
								</p>
								<label class="check"
									><input type="checkbox" bind:checked={trim} /><span
										>2. Fjern mellomrom først med <code>trim()</code></span
									></label
								>
								<p class="note">Valget endrer koden. Kjør testen på nytt for å se virkningen.</p>
								<div class="actions">
									<button class="primary" type="button" onclick={() => (run = { sample, trim })}
										>Kjør test</button
									><button class="secondary" type="button" onclick={reset}
										>Start eksemplet på nytt</button
									>
								</div>
							</div>
							<div class="code-view">
								<h4>Kontrollen som skal kjøres</h4>
								<pre><code
										>{`const sjekket = ${trim ? 'tekst.trim()' : 'tekst'};\nif (sjekket.length === 0) {\n  // Avvis meldingen (400)\n} else {\n  // Lagre meldingen (201)\n}`}</code
									></pre>
								<details>
									<summary>Hva betyr koden?</summary>
									<p>
										<code>length</code> teller tegn, også mellomrom. <code>trim()</code> fjerner
										mellomrom i starten og slutten. <code>400</code> betyr at meldingen avvises i
										dette eksemplet. <code>201</code> betyr at den blir lagret.
									</p>
								</details>
							</div>
						</div>
						<div class="result" role="status" aria-atomic="true">
							{#if result}<h4>{stale ? 'Tidligere test: ' : ''}{result.title}</h4>
								{#if stale}<p class="stale">
										Valgene er endret. Kjør test på nytt for å se resultatet av den nye koden eller
										det nye testtilfellet.
									</p>{/if}
								<p>HTTP {result.status} · Kontrollert tekst: <code>{result.checked}</code></p>
								<p>{result.explanation}</p>
								<p><strong>Neste forsøk:</strong> {result.next}</p>
							{:else}<h4>Resultatet kommer her</h4>
								<p>Hva tror du skjer? Trykk «Kjør test» når du er klar.</p>{/if}
						</div>
					</div>
				{:else if step.id === 'hjelp'}
					<button
						class="secondary"
						onclick={() => window.dispatchEvent(new CustomEvent('labpartner-open'))}
						>Prøv å åpne labpartneren</button
					>
					<div class="callout">
						<strong>Et spørsmål som gir nyttig hjelp</strong>
						<p>
							«Meldingen med bare mellomrom ble lagret. Jeg forventet at den skulle avvises. Hva bør
							jeg undersøke?»
						</p>
					</div>
					<p>
						KI-svar er veiledning og kan inneholde feil. Prøv forslaget i oppgaven og sjekk
						resultatet selv. Ikke skriv passord eller andre hemmeligheter i spørsmålet. «Tilbake til
						siden» lukker hjelpevisningen på mindre skjermer.
					</p>
				{:else if step.id === 'videre'}
					<div class="callout">
						<strong>Prøv med mindre hjelp</strong>
						<p>
							Et visningsnavn kan også bestå av bare mellomrom. Forklar for en medelev hvor du ville
							kontrollert navnet, og hvilke to tester du ville brukt. Bruk ideen i egen kode når
							læreren ber om det.
						</p>
					</div>
					<details>
						<summary>Fremgang, fagsjekker og innlogging</summary>
						<p>
							De interaktive eksemplene kan brukes til øving. Logg inn i Min lab når arbeidet skal
							knyttes til profilen din, og se etter bekreftelse på lagring. Et klikk eller et utfylt
							tekstfelt betyr ikke automatisk at en oppgave er faglig godkjent.
						</p>
						<p>
							En fagsjekk er en egen kontroll og kan ha andre regler for forsøk og tilgang enn fri
							øving. Les reglene før du starter, og spør læreren hvis du er usikker. Denne
							tutorialen gir ingen poeng og lagrer ikke prøveforsøket.
						</p>
						<p>
							<a href="/min-lab/">Åpne Min lab →</a> ·
							<a href="/kom-i-gang/">Hjelp med sikker tilkobling →</a>
						</p>
					</details>
					<div class="actions finish">
						<a class="primary" href="/?fag=utvikling&visning=elev">Finn en modul i Utvikling →</a><a
							href="/?visning=elev">Se alle fag →</a
						>
					</div>
				{/if}
			</section>
		{/each}
	</div>
</main>

<style>
	.tour {
		scroll-margin-top: 24px;
	}
	.tour-steps {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		list-style: none;
		padding: 0;
		margin: 0 0 20px;
	}
	.tour-steps li {
		flex: 1 1 7rem;
		min-width: 0;
	}
	.tour-steps button {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		min-height: 44px;
		padding: 10px;
		border: 1px solid var(--color-border-strong);
		border-radius: 9px;
		font: inherit;
		color: var(--color-text);
		background: var(--color-surface);
		cursor: pointer;
	}
	.tour-steps button[aria-current='step'] {
		color: var(--color-accent);
		background: var(--color-accent-soft);
		border-color: var(--color-accent);
		box-shadow: inset 0 0 0 1px var(--color-accent);
		font-weight: 700;
	}
	.tour-steps span {
		font-weight: 700;
	}
	.tour-coach {
		display: flex;
		align-items: flex-start;
		gap: 24px;
		padding: clamp(18px, 3vw, 28px);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-card);
		background: var(--color-accent-soft);
	}
	.tour-avatar {
		flex: 0 0 88px;
	}
	.tour-speech {
		min-width: 0;
	}
	.tour-speech p:last-child {
		margin-bottom: 0;
	}
	.tour-speech h2 {
		margin-bottom: 12px;
	}
	.tour-controls {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
		padding: 16px 0;
	}
	.tour-controls > * {
		max-width: 100%;
		overflow-wrap: anywhere;
	}
	button:disabled {
		opacity: 0.55;
		cursor: default;
	}
	.tour-exit {
		min-height: 44px;
		padding: 10px;
		margin-left: auto;
		font: inherit;
		text-decoration: underline;
		color: var(--color-text-muted);
		border: 0;
		border-radius: 8px;
		background: transparent;
		cursor: pointer;
	}
	.guided section {
		padding-top: 12px;
	}
	#tour-title:focus {
		outline: 2px solid var(--color-focus);
		outline-offset: 5px;
	}
	@media (max-width: 500px) {
		.tour-coach {
			flex-direction: column;
			gap: 12px;
		}
		.tour-avatar {
			flex-basis: auto;
		}
		.tour-exit {
			margin-left: 0;
		}
	}

	main {
		width: min(1040px, calc(100% - 2 * var(--layout-gutter)));
		margin: auto;
		padding-bottom: 64px;
		font: var(--font-body)/1.65 var(--font-ui);
		color: var(--color-text);
		overflow-wrap: anywhere;
	}
	main :global(*) {
		box-sizing: border-box;
	}
	.breadcrumbs {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		padding: 24px 0;
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.intro {
		max-width: 780px;
		padding: 24px 0 32px;
	}
	.eyebrow {
		font-size: var(--font-meta);
		font-weight: 650;
		color: var(--color-text-muted);
		margin: 0 0 8px;
	}
	h1 {
		font-size: clamp(2rem, 5vw, 3.2rem);
		line-height: 1.15;
		letter-spacing: -0.04em;
		margin: 0 0 16px;
		text-wrap: balance;
	}
	h2 {
		font-size: 1.6rem;
		line-height: 1.3;
		margin: 0 0 16px;
	}
	h3,
	h4 {
		margin: 0 0 8px;
		line-height: 1.4;
	}
	h3 {
		font-size: 1.2rem;
	}
	h4 {
		font-size: 1rem;
	}
	p {
		margin: 0 0 16px;
	}
	.lead {
		font-size: 1.3rem;
	}
	a {
		color: var(--color-accent);
		text-underline-offset: 4px;
	}
	.step-nav {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
		gap: 8px;
		border-block: 1px solid var(--color-border);
		padding: 20px 0;
	}
	.step-nav a {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		padding: 10px;
		font-size: var(--font-small);
		text-decoration: none;
		border-radius: 8px;
	}
	.step-nav a:hover {
		background: var(--color-surface-soft);
		text-decoration: underline;
	}
	.step-nav span {
		border: 1px solid var(--color-border-strong);
		border-radius: 50%;
		min-width: 28px;
		text-align: center;
	}
	section {
		padding: 36px 0;
		scroll-margin-top: 24px;
		border-bottom: 1px solid var(--color-border);
	}
	section > p {
		max-width: 70ch;
	}
	.route-example,
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}
	.route-example {
		padding: 12px 0;
		margin-bottom: 12px;
		font-weight: 650;
	}
	.route-example span:not([aria-hidden]) {
		background: var(--color-surface-soft);
		border-radius: 8px;
		padding: 8px 12px;
	}
	.note,
	.tag {
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.callout {
		border-left: 3px solid var(--color-info);
		background: var(--color-info-soft);
		padding: 20px;
		border-radius: 0 10px 10px 0;
		margin: 20px 0;
	}
	.callout p {
		margin: 8px 0 0;
	}
	.practice {
		background: var(--color-surface);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-card);
		padding: clamp(16px, 3vw, 28px);
	}
	.practice-heading {
		margin-bottom: 16px;
	}
	.practice-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
	}
	.practice-grid > div {
		min-width: 0;
	}
	label {
		display: block;
		font-weight: 650;
		margin-bottom: 8px;
	}
	select {
		width: 100%;
		min-height: 44px;
		padding: 10px;
		font: inherit;
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
		color: var(--color-text);
		background: var(--color-surface);
	}
	.input-preview {
		margin-top: 8px;
		font-size: var(--font-small);
	}
	.check {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 12px 0;
		cursor: pointer;
	}
	.check input {
		width: 22px;
		height: 22px;
		flex-shrink: 0;
		margin: 3px 0;
		accent-color: var(--color-action);
	}
	code {
		font-family: var(--font-code, monospace);
	}
	pre {
		font-size: 0.95rem;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		background: var(--color-surface-soft);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 16px;
		margin: 12px 0;
	}
	.primary,
	.secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 11px 16px;
		border: 1px solid var(--color-action);
		border-radius: 8px;
		font: 650 var(--font-small)/1.5 var(--font-ui);
		cursor: pointer;
		text-decoration: none;
		text-align: center;
	}
	.primary {
		background: var(--color-action);
		color: var(--color-on-action);
	}
	.secondary {
		background: var(--color-surface);
		border-color: var(--color-border-strong);
		color: var(--color-text);
	}
	.result {
		margin-top: 24px;
		padding: 20px;
		background: var(--color-surface-soft);
		border-radius: 10px;
		border: 1px solid var(--color-border);
		min-height: 130px;
	}
	.result p:last-child {
		margin-bottom: 0;
	}
	.stale {
		border-left: 3px solid var(--color-info);
		padding-left: 12px;
		font-weight: 650;
	}
	summary {
		cursor: pointer;
		min-height: 44px;
		padding-block: 10px;
		font-weight: 650;
	}
	details {
		margin: 12px 0;
	}
	.finish {
		margin-top: 24px;
	}
	a:focus-visible,
	button:focus-visible,
	input:focus-visible,
	select:focus-visible,
	summary:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}
	@media (max-width: 700px) {
		.practice-grid {
			grid-template-columns: 1fr;
		}
		.intro {
			padding-top: 12px;
		}
	}
</style>
