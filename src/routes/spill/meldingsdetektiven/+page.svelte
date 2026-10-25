<script>
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import AccountLink from '#lib/components/AccountLink.svelte';
	import { activityLab as account, learningContext, saveAttempt } from '#lib/lab.js';
	import { avatarFeedback } from '#lib/avatarFeedback.js';
	import { onMount } from 'svelte';
	import DetectiveCode from '#lib/components/DetectiveCode.svelte';
	import DetectiveEvidence from '#lib/components/DetectiveEvidence.svelte';
	import {
		CASES,
		initialSettings,
		patchesFor,
		codeFor,
		probesFor,
		runProbe,
		verifyCase,
		settingsKey
	} from '#lib/meldingsdetektiven.js';

	/** @typedef {ReturnType<typeof runProbe>} ProbeRun */
	/** @typedef {ReturnType<typeof verifyCase>} Verification */
	/** @typedef {'frontend'|'backend'} Side */
	let caseIndex = $state(0);
	let unlocked = $state(0);
	let earned = $state(CASES.map(() => false));
	let settings = $state(CASES.map((item) => initialSettings(item.id)));
	let selectedProbes = $state(CASES.map((item) => item.initialProbeId));
	/** @type {(ProbeRun|null)[]} */
	let runs = $state(CASES.map(() => null));
	let runKeys = $state(CASES.map(() => ''));
	/** @type {('experiment'|'check')[]} */
	let runSources = $state(CASES.map(() => 'experiment'));
	/** @type {(Verification|null)[]} */
	let verifications = $state(CASES.map(() => null));
	let verificationKeys = $state(CASES.map(() => ''));
	let attempts = $state(CASES.map(() => 0));
	let checkAttempts = $state(CASES.map(() => 0));
	let eventIndex = $state(-1);
	/** @type {Side} */
	let side = $state('frontend');
	let revision = $state(0);
	let hintOpen = $state(false);
	let checksOpen = $state(false);
	let reviewOpen = $state(false);
	let announcement = $state('');
	let errorMessage = $state('');
	let narrow = $state(false);
	let reducedMotion = $state(false);
	/** @type {HTMLElement|undefined} */
	let evidenceBoundary = $state();
	/** @type {HTMLElement|undefined} */
	let investigation = $state();
	/** @type {HTMLElement|undefined} */
	let caseHeading = $state();
	/** @type {HTMLElement|undefined} */
	let codeColumn = $state();

	const caseLabels = ['Avvist', 'Usynlig', 'Ukjent bruker', 'Dobbelt opp'];
	let currentCase = $derived(CASES[caseIndex]);
	let currentSettings = $derived(settings[caseIndex]);
	let originalSettings = $derived(initialSettings(currentCase.id));
	let key = $derived(settingsKey(currentCase.id, currentSettings));
	let patches = $derived(patchesFor(currentCase.id));
	let lines = $derived(codeFor(currentCase.id, currentSettings, side));
	let probes = $derived(probesFor(currentCase.id));
	let selectedProbe = $derived(
		probes.find((probe) => probe.id === selectedProbes[caseIndex]) ?? probes[0]
	);
	let currentRun = $derived(runs[caseIndex]);
	let stale = $derived(currentRun !== null && runKeys[caseIndex] !== key);
	let selectedEvent = $derived(currentRun?.events[eventIndex] ?? null);
	let currentVerification = $derived(verifications[caseIndex]);
	let verificationStale = $derived(
		currentVerification !== null && verificationKeys[caseIndex] !== key
	);
	let solved = $derived(currentVerification?.success === true && !verificationStale);
	let completed = $derived(
		CASES.map(
			(item, index) =>
				earned[index] ||
				(verifications[index]?.success === true &&
					verificationKeys[index] === settingsKey(item.id, settings[index]))
		)
	);
	let solvedCount = $derived(completed.filter(Boolean).length);
	let changedCount = $derived(
		Object.entries(currentSettings).filter(([id, value]) => value !== originalSettings[id]).length
	);
	let matchingProbe = $derived(currentRun?.probeId === selectedProbe.id);
	let currentChecksPassed = $derived(
		currentRun?.checks.filter((check) => check.passed).length ?? 0
	);

	onMount(() => {
		const mobile = window.matchMedia('(max-width: 900px)');
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		function update() {
			narrow = mobile.matches;
			reducedMotion = motion.matches;
		}
		update();
		mobile.addEventListener('change', update);
		motion.addEventListener('change', update);
		return () => {
			mobile.removeEventListener('change', update);
			motion.removeEventListener('change', update);
		};
	});

	let restoredUser = $state('');
	$effect(() => {
		const userId = $account.user
			? `${$account.user.id}:${$learningContext.mode}:${$learningContext.openingId}`
			: '';
		const saved = $account.summary?.progress.find((item) => item.id === 'meldingsdetektiven');
		if (!userId) {
			restoredUser = '';
			return;
		}
		if (saved && restoredUser !== userId) {
			restoredUser = userId;
			runs = CASES.map(() => null);
			verifications = CASES.map(() => null);
			verificationKeys = CASES.map(() => '');
			earned = CASES.map((item) =>
				Boolean(saved.objectives.find((objective) => objective.id === item.id)?.completedAt)
			);
			settings = CASES.map((item) => {
				const solution = saved.objectives.find((objective) => objective.id === item.id)?.solution;
				return solution && !Array.isArray(solution) ? { ...solution } : initialSettings(item.id);
			});
			unlocked =
				$learningContext.mode !== 'normal'
					? CASES.length - 1
					: Math.min(
							CASES.length - 1,
							Math.max(0, ...earned.map((value, index) => (value ? index + 1 : 0)))
						);
			const requested = CASES.findIndex(
				(item) => item.id === new URL(window.location.href).searchParams.get('oppdrag')
			);
			caseIndex =
				requested >= 0 && requested <= unlocked
					? requested
					: Math.max(
							0,
							earned.findIndex((value) => !value)
						);
		}
	});

	/** @param {Side} value */
	function changeSide(value) {
		side = value;
		revision += 1;
	}
	/** @param {string} patchId @param {string} choiceId */
	function changePatch(patchId, choiceId) {
		const patch = patches.find((item) => item.id === patchId);
		if (!patch?.choices.some((choice) => choice.id === choiceId)) return;
		settings[caseIndex] = { ...currentSettings, [patchId]: choiceId };
		errorMessage = '';
		checksOpen = false;
		revision += 1;
		announcement = `${patch.label} er endret. Gjør et nytt forsøk for å se hva koden gjør.`;
	}
	/** @param {number} index */
	function selectEvent(index) {
		if (!currentRun?.events[index]) return;
		eventIndex = index;
		side = currentRun.events[index].side;
		revision += 1;
	}
	/** @param {ProbeRun} result @param {'experiment'|'check'} [source] */
	function inspectRun(result, source = 'experiment') {
		runs[caseIndex] = result;
		runKeys[caseIndex] = key;
		runSources[caseIndex] = source;
		selectedProbes[caseIndex] = result.probeId;
		eventIndex = result.events.length - 1;
		side = 'frontend';
		checksOpen = false;
		revision += 1;
	}
	function runExperiment() {
		avatarFeedback(
			'meldingsdetektiven',
			'thinking',
			'Hva forteller forsøket deg? Sammenlign svaret med koden.'
		);
		try {
			const result = runProbe(currentCase.id, currentSettings, selectedProbe.id);
			inspectRun(result);
			attempts[caseIndex] += 1;
			errorMessage = '';
			announcement = `Forsøk ${attempts[caseIndex]}: ${result.summary}`;
			if (narrow)
				evidenceBoundary?.scrollIntoView({
					behavior: reducedMotion ? 'auto' : 'smooth',
					block: 'start'
				});
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Forsøket kunne ikke gjennomføres.';
		}
	}
	/** @param {HTMLElement|undefined} target */
	function showSection(target) {
		target?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
	}
	function checkCase() {
		try {
			const result = verifyCase(currentCase.id, currentSettings);
			avatarFeedback(
				'meldingsdetektiven',
				result.success ? 'success' : 'retry',
				result.success
					? 'Sporene stemmer. Du fant løsningen!'
					: 'Et nytt spor! Se hvilken kontroll som feilet.'
			);
			verifications[caseIndex] = result;
			earned[caseIndex] = earned[caseIndex] || result.success;
			saveAttempt('meldingsdetektiven', currentCase.id, { ...currentSettings });
			verificationKeys[caseIndex] = key;
			checkAttempts[caseIndex] += 1;
			if (result.success) unlocked = Math.max(unlocked, Math.min(caseIndex + 1, CASES.length - 1));
			const sample = result.results.find((item) => !item.passed) ?? result.results[0];
			if (sample) inspectRun(sample, 'check');
			reviewOpen = true;
			errorMessage = '';
			announcement = result.success
				? `Sak ${currentCase.number} er oppklart. Alle ${result.total} kontrollsituasjonene virker.`
				: `${result.passed} av ${result.total} kontrollsituasjoner virker. Undersøk en situasjon som fortsatt feiler.`;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Kontrollen kunne ikke gjennomføres.';
		}
	}
	/** @param {ProbeRun} result */
	function inspectCheck(result) {
		if (verificationStale) return;
		inspectRun(result, 'check');
		checksOpen = true;
		investigation?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
	}
	function resetCase() {
		settings[caseIndex] = initialSettings(currentCase.id);
		selectedProbes[caseIndex] = currentCase.initialProbeId;
		runs[caseIndex] = null;
		runKeys[caseIndex] = '';
		runSources[caseIndex] = 'experiment';
		verifications[caseIndex] = null;
		verificationKeys[caseIndex] = '';
		attempts[caseIndex] = 0;
		checkAttempts[caseIndex] = 0;
		eventIndex = -1;
		side = 'frontend';
		checksOpen = false;
		reviewOpen = false;
		errorMessage = '';
		revision += 1;
		announcement = 'Saken er tilbake til utgangspunktet.';
	}
	/** @param {number} index */
	function changeCase(index) {
		if (index < 0 || index >= CASES.length || index > unlocked) return;
		caseIndex = index;
		eventIndex = (runs[index]?.events.length ?? 0) - 1;
		side = 'frontend';
		hintOpen = false;
		checksOpen = false;
		reviewOpen = verifications[index] !== null;
		errorMessage = '';
		revision += 1;
		caseHeading?.focus({ preventScroll: true });
		announcement = `Sak ${index + 1}: ${CASES[index].title}. En ny kodebase venter.`;
	}
</script>

<svelte:head>
	<title>Meldingsdetektiven – finn feilen i chatten | IT-laben</title>
	<meta
		name="description"
		content="Undersøk kode, requests, svar og serverdata. Finn feilene i fire chatsaker, rett koden og prøv om løsningen holder."
	/>
</svelte:head>

<div class="detective-page">
	<header class="topbar">
		<a class="brand" href="/"
			><span aria-hidden="true">IT</span>IT-laben<span class="brand-dot">.</span></a
		>
		<nav aria-label="Spillnavigasjon">
			<a href="/spill/redd-chatten/">Redd chatten ↗</a><a href="/#spill">Alle spill</a>
		</nav>
		<div class="theme-control"><AccountLink /><ThemeToggle /></div>
	</header>
	<main>
		<section class="intro" aria-labelledby="game-title">
			<div>
				<p class="eyebrow">SPILL 03 <span>FEILSØK CHATTEN</span></p>
				<h1 id="game-title">Meldings<em>detektiven.</em></h1>
				<p>Finn feilen. Rett koden. Prøv om forklaringen din holder.</p>
			</div>
			<div class="case-progress">
				<span class="progress-icon" aria-hidden="true">⌕</span>
				<div><strong>{solvedCount}<span>/ 4</span></strong><span>saker oppklart</span></div>
			</div>
		</section>

		<div class="case-tabs" role="group" aria-label="Velg sak">
			{#each CASES as item, index}
				<button
					type="button"
					class:chosen={index === caseIndex}
					class:solved={completed[index]}
					disabled={index > unlocked}
					aria-pressed={index === caseIndex}
					aria-label={`Sak ${index + 1}: ${item.title}${index > unlocked ? ' · låst' : completed[index] ? ' · oppklart' : ''}`}
					onclick={() => changeCase(index)}
					data-case-id={item.id}
				>
					<span class="case-number">{completed[index] ? '✓' : `0${index + 1}`}</span><span
						class="case-tab-name"
						>{caseLabels[index]}<small
							>{index > unlocked
								? 'LÅST'
								: completed[index]
									? 'OPPKLART'
									: index === caseIndex
										? 'UNDER UNDERSØKELSE'
										: 'ÅPEN SAK'}</small
						></span
					><span class="tab-arrow" aria-hidden="true">{index > unlocked ? '·' : '↗'}</span>
				</button>
			{/each}
		</div>

		<section class="case-report" aria-labelledby="case-title">
			<div class="report-icon" aria-hidden="true">!</div>
			<div class="report-copy">
				<p class="eyebrow">FEILMELDING FRA BRUKEREN · SAK 0{currentCase.number}</p>
				<h2 id="case-title" tabindex="-1" bind:this={caseHeading}>{currentCase.title}</h2>
				<p>{currentCase.report}</p>
				<strong>{currentCase.goal}</strong>
			</div>
			<div class="report-tools">
				<button
					type="button"
					class="hint-button"
					aria-expanded={hintOpen}
					aria-controls="case-hint"
					onclick={() => (hintOpen = !hintOpen)}
					>{hintOpen ? 'Skjul hint' : 'Et lite hint'} <span aria-hidden="true">?</span></button
				>
				<details>
					<summary>Rammene for saken</summary>
					<p>{currentCase.context}</p>
				</details>
			</div>
			{#if hintOpen}<p class="case-hint" id="case-hint">{currentCase.hint}</p>{/if}
		</section>

		<section class="investigation" aria-label="Undersøk og rett koden" bind:this={investigation}>
			<div class="experiment-bar">
				<div class="experiment-input">
					<label for="probe-choice">Hva vil du prøve?</label><select
						id="probe-choice"
						bind:value={selectedProbes[caseIndex]}
						>{#each probes as probe}<option value={probe.id}>{probe.label}</option>{/each}</select
					>
				</div>
				<div class="probe-description">
					<strong>{selectedProbe.actionLabel}</strong>
					<p>{selectedProbe.description}</p>
				</div>
				<button type="button" class="run-button" onclick={runExperiment} data-testid="detective-run"
					><span aria-hidden="true">▶</span>{!currentRun
						? 'Gjenskap feilen'
						: stale
							? 'Prøv endringen'
							: !matchingProbe
								? 'Prøv situasjonen'
								: 'Gjør forsøket igjen'}</button
				>
			</div>
			{#if errorMessage}<p class="error-message" role="alert">{errorMessage}</p>{/if}
			<div class="workbench">
				<section class="code-column" aria-labelledby="code-heading" bind:this={codeColumn}>
					<div class="section-heading">
						<div>
							<p class="eyebrow">ARBEIDSFILENE</p>
							<h2 id="code-heading">Hvor ligger feilen?</h2>
						</div>
						<button type="button" class="reset-button" onclick={resetCase}
							>Start saken på nytt ↺</button
						>
					</div>
					<p class="code-intro">
						Klikk på kode for forklaring. Bruk <b>Endre</b> ved en linje for å prøve en annen kode.
					</p>
					<DetectiveCode
						{lines}
						{side}
						onsidechange={changeSide}
						{patches}
						settings={currentSettings}
						{originalSettings}
						onpatch={changePatch}
						activeLineIds={!stale ? (selectedEvent?.lineIds ?? []) : []}
						activeSide={!stale ? (selectedEvent?.side ?? null) : null}
						resetKey={`${currentCase.id}-${revision}`}
						explanationBoundary={evidenceBoundary ?? null}
					/>
					<div class="code-meta">
						<span
							>{changedCount ? `${changedCount} kodevalg endret` : 'Sakens opprinnelige kode'}</span
						><span>Frontend og backend kan undersøkes.</span>
					</div>
					{#if narrow && currentRun}<button
							type="button"
							class="jump-section"
							onclick={() => showSection(evidenceBoundary)}>Til sporene fra forsøket ↓</button
						>{/if}
					{#if stale}<p class="stale-note">
							<span aria-hidden="true">●</span> Koden er endret. Sporene viser hva den forrige koden gjorde.
						</p>{/if}
					{#if currentRun}<details class="experiment-checks" bind:open={checksOpen}>
							<summary
								><span>Hva viste forsøket?</span><small
									>{stale
										? 'Forrige kode'
										: `${currentChecksPassed}/${currentRun.checks.length} kjennetegn stemmer`}</small
								><b aria-hidden="true">+</b></summary
							>
							<p>{currentRun.summary}</p>
							<ul>
								{#each currentRun.checks as check}<li class:passed={check.passed}>
										<span aria-hidden="true">{check.passed ? '✓' : '!'}</span>
										<div>
											<strong>{check.label}</strong>
											<p>{check.detail}</p>
										</div>
									</li>{/each}
							</ul>
							<p class="single-note">
								Ett forsøk er et spor. Bruk «Kontroller hele saken» når du mener feilen er rettet.
							</p>
						</details>{/if}
				</section>
				<aside class="evidence-column" bind:this={evidenceBoundary} aria-label="Spor fra forsøket">
					<div class="section-heading">
						<div>
							<p class="eyebrow">UNDERSØK SPORENE</p>
							<h2>Hva skjedde?</h2>
						</div>
						<span class="attempt-label"
							>{!currentRun
								? 'Ingen forsøk ennå'
								: runSources[caseIndex] === 'check'
									? `Kontroll ${checkAttempts[caseIndex]}`
									: `Forsøk ${attempts[caseIndex]}`}</span
						>
					</div>
					{#if currentRun}<p class="run-context" data-testid="detective-run-context">
							Viser: <strong>{currentRun.title}</strong>{#if !matchingProbe}<span
									>Den valgte situasjonen over er ikke kjørt ennå.</span
								>{/if}
						</p>{/if}
					<DetectiveEvidence run={currentRun} {eventIndex} oneventchange={selectEvent} {stale} />
					{#if narrow && selectedEvent}<button
							type="button"
							class="jump-section"
							onclick={() => showSection(codeColumn)}>↑ Se koden for denne hendelsen</button
						>{/if}
					<p class="fixture-note">
						Hvert forsøk begynner med sakens startdata. Du kan prøve så mange ganger du vil.
					</p>
				</aside>
			</div>
		</section>

		<section
			class="verification"
			class:solved
			aria-labelledby="verification-heading"
			data-testid="detective-verification"
			data-success={solved}
			data-stale={verificationStale}
		>
			<div class="verification-top">
				<div>
					<p class="eyebrow">PRØV OM LØSNINGEN HOLDER</p>
					<h2 id="verification-heading">
						{solved ? 'Saken er oppklart.' : 'Virker det også i de andre situasjonene?'}
					</h2>
					<p>
						{solved
							? currentCase.lesson
							: 'Prøv flere meldinger, brukere eller handlinger. En retting skal løse problemet og beholde det som allerede virket.'}
					</p>
				</div>
				<button
					type="button"
					class="verify-button"
					onclick={checkCase}
					data-testid="detective-verify"
					>{checkAttempts[caseIndex] ? 'Kontroller saken igjen' : 'Kontroller hele saken'}<span
						aria-hidden="true">↗</span
					></button
				>
			</div>
			{#if currentVerification}
				<div class="verification-score">
					<strong data-testid="detective-score"
						>{currentVerification.passed}/{currentVerification.total}</strong
					><span
						>{verificationStale
							? 'Resultat fra forrige kode — kontroller på nytt.'
							: currentVerification.success
								? 'kontrollsituasjoner fungerer'
								: 'kontrollsituasjoner fungerer. Noe må fortsatt undersøkes.'}</span
					><button
						type="button"
						class="results-toggle"
						aria-expanded={reviewOpen}
						aria-controls="verification-results"
						onclick={() => (reviewOpen = !reviewOpen)}
						>{reviewOpen ? 'Skjul kontrollene' : 'Se kontrollene'}</button
					>
				</div>
				{#if reviewOpen}<div class="verification-results" id="verification-results">
						{#each currentVerification.results as result}<button
								type="button"
								class:passed={result.passed}
								disabled={verificationStale}
								onclick={() => inspectCheck(result)}
								data-probe-result={result.probeId}
								><span class="result-mark" aria-hidden="true">{result.passed ? '✓' : '!'}</span
								><span
									><strong>{result.title}</strong><small
										>{result.passed ? 'Virker som forventet' : 'Undersøk dette forsøket'}</small
									></span
								><span aria-hidden="true">↗</span></button
							>{/each}
					</div>{/if}
			{/if}
			{#if solved}<div class="case-solved" data-testid="detective-solved">
					<div>
						<span class="solved-stamp" aria-hidden="true">✓</span><span
							>{caseIndex < CASES.length - 1
								? 'Neste sak har en ny kodebase og nye spor.'
								: solvedCount === CASES.length
									? 'Fire saker oppklart. Du har fulgt feil gjennom både frontend og backend.'
									: 'Denne saken er oppklart. Gå tilbake til en åpen sak for å fullføre alle fire.'}</span
						>
					</div>
					{#if caseIndex < CASES.length - 1}<button
							type="button"
							class="next-case"
							onclick={() => changeCase(caseIndex + 1)}
							>Åpne neste sak <span aria-hidden="true">→</span></button
						>{:else}<a class="next-case" href="/#spill">Til spilloversikten ↗</a>{/if}
				</div>{/if}
		</section>

		<details class="learning-note">
			<summary
				><span>Ta metoden med til din egen chat</span><span aria-hidden="true">+</span></summary
			>
			<div>
				<p>
					Begynn med det brukeren opplever. Sjekk hva nettleseren sender, hva serveren mottar og
					svarer, og hvilke data frontend faktisk bruker. Prøv en retting, og undersøk på nytt
					dersom bare en del av problemet forsvinner.
				</p>
				<p>
					Spillet simulerer chatten lokalt med faste prøvedata. Kodevalgene endrer modellen; ingen
					ekte meldinger, cookies eller innlogging sendes over nettverket. Fremdriften beholdes mens
					spillsiden er åpen.
				</p>
				<nav aria-label="Relaterte hjelpesider">
					<a href="/backend/">Frontend og backend ↗</a><a href="/sessions/"
						>Sessions og pålogging ↗</a
					><a href="/chatrom/">Bygg videre på chatten ↗</a>
				</nav>
			</div>
		</details>
		<footer>
			<a href="/#spill">← Spill og utfordringer</a><span
				>En vellykket request er ett spor. Følg dataene helt fram.</span
			>
		</footer>
		<p class="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background: var(--color-page);
	}
	.detective-page {
		--ink: var(--color-text);
		--muted: var(--color-text-muted);
		--line: var(--color-border);
		--teal: var(--color-accent);
		color: var(--ink);
		background: radial-gradient(ellipse at 88% 0%, var(--color-page-glow), transparent 42%);
		min-height: 100vh;
		font:
			var(--font-body)/var(--leading-body) Inter,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
	}
	.detective-page * {
		box-sizing: border-box;
	}
	.topbar,
	main {
		width: min(1360px, calc(100% - 64px));
		margin-inline: auto;
	}
	a {
		color: inherit;
		text-underline-offset: 4px;
	}
	button,
	select {
		font: inherit;
	}
	button {
		cursor: pointer;
	}
	button:disabled {
		cursor: default;
	}
	button:focus-visible,
	a:focus-visible,
	summary:focus-visible,
	select:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		min-height: 68px;
		border-bottom: 1px solid var(--line);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 7px;
		text-decoration: none;
		font-size: 19px;
		font-weight: 750;
	}
	.brand > span:first-child {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 5px;
		background: var(--color-brand);
		color: var(--color-on-brand);
		font-size: var(--font-small);
	}
	.brand-dot {
		color: var(--teal);
		margin-left: -7px;
	}
	.topbar nav {
		display: flex;
		gap: 24px;
		font-size: var(--font-small);
		color: var(--muted);
	}
	.topbar nav a {
		text-decoration: none;
	}
	.topbar nav a:hover {
		text-decoration: underline;
		color: var(--teal);
	}
	.intro {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		padding: 29px 0 25px;
	}
	.eyebrow {
		margin: 0 0 7px;
		color: var(--teal);
		font-size: var(--font-meta);
		letter-spacing: 1.4px;
		font-weight: 750;
		line-height: 1.4;
	}
	.eyebrow > span {
		margin-left: 10px;
		padding-left: 10px;
		border-left: 1px solid var(--color-border-strong);
		color: var(--color-text-muted);
		font-weight: 550;
		text-transform: uppercase;
	}
	h1,
	h2,
	p {
		margin-top: 0;
	}
	h1 {
		margin-bottom: 8px;
		font-size: clamp(32px, 4.3vw, 57px);
		line-height: 1.13;
		letter-spacing: -2px;
	}
	h1 em {
		color: var(--teal);
		font-family: Georgia, serif;
		font-weight: 500;
	}
	.intro > div > p:last-child {
		margin: 0;
		color: var(--muted);
		font-size: var(--font-body);
	}
	.case-progress {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		gap: 17px;
		padding: 10px 0 10px 26px;
		border-left: 1px solid var(--line);
	}
	.progress-icon {
		display: grid;
		place-items: center;
		background: var(--color-surface-soft);
		border: 1px solid var(--color-border);
		width: 58px;
		height: 58px;
		border-radius: 50%;
		color: var(--color-text-muted);
		font-size: 47px;
		font-family: Georgia, serif;
		line-height: 1;
	}
	.case-progress strong {
		display: block;
		font-size: 27px;
		line-height: 1.1;
		letter-spacing: -1px;
	}
	.case-progress strong span {
		margin-left: 6px;
		color: var(--color-text-subtle);
		font-size: var(--font-body);
		font-weight: 400;
	}
	.case-progress div > span {
		display: block;
		margin-top: 5px;
		font-size: var(--font-meta);
		color: var(--muted);
	}
	.case-tabs {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
		margin-bottom: 19px;
	}
	.case-tabs button {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 13px;
		min-width: 0;
		min-height: 66px;
		text-align: left;
		border: 1px solid var(--line);
		border-radius: 7px;
		padding: 12px 17px;
		color: var(--color-text-muted);
		background: var(--color-surface-raised);
	}
	.case-tabs button:disabled {
		color: var(--color-text-subtle);
		background: var(--color-surface);
		border-style: dashed;
	}
	.case-tabs button.chosen {
		background: var(--color-surface-active);
		border-color: var(--color-accent);
		color: var(--ink);
		box-shadow: inset 0 -3px var(--color-accent-soft);
	}
	.case-tabs button.solved:not(.chosen) {
		background: var(--color-success-soft);
		border-color: var(--color-success-border);
	}
	.case-number {
		font:
			18px/1.1 ui-monospace,
			SFMono-Regular,
			Consolas,
			monospace;
		color: var(--color-text-subtle);
	}
	.chosen .case-number,
	.solved .case-number {
		color: var(--color-success);
	}
	.case-tab-name {
		max-width: 100%;
		min-width: 0;
		overflow-wrap: anywhere;
		font-size: var(--font-small);
		font-weight: 650;
	}
	.case-tab-name small {
		display: block;
		margin-top: 4px;
		color: var(--color-text-muted);
		font-size: var(--font-meta);
		letter-spacing: 0.7px;
		font-weight: 450;
	}
	.tab-arrow {
		margin-left: auto;
		color: var(--color-text-subtle);
	}
	.case-report {
		display: grid;
		grid-template-columns: 34px minmax(0, 1fr) 195px;
		column-gap: 17px;
		padding: 21px 23px;
		border: 1px solid var(--color-warning-border);
		border-radius: 9px;
		background: var(--color-warning-soft);
		margin-bottom: 25px;
	}
	.report-icon {
		display: grid;
		place-items: center;
		width: 34px;
		height: 38px;
		font:
			bold 23px Georgia,
			serif;
		color: var(--color-warning);
		background: var(--color-warning-soft);
		border: 1px solid var(--color-warning-border);
		border-radius: 6px;
	}
	.report-copy .eyebrow {
		font-size: var(--font-meta);
		color: var(--color-warning);
	}
	.report-copy h2 {
		margin: 0 0 6px;
		font-size: 24px;
		line-height: 1.25;
		letter-spacing: -0.6px;
	}
	.report-copy > p:not(.eyebrow) {
		margin: 0 0 9px;
		max-width: 840px;
		color: var(--color-text-muted);
		font-size: var(--font-body);
		line-height: var(--leading-body);
	}
	.report-copy > strong {
		display: block;
		font-size: var(--font-body);
		font-weight: 650;
		color: var(--color-text-muted);
	}
	.report-tools {
		text-align: right;
	}
	.hint-button {
		display: inline-flex;
		gap: 12px;
		align-items: center;
		color: var(--color-text-muted);
		font-size: var(--font-small);
		border: 0;
		background: transparent;
		padding: 4px 0 11px;
	}
	.hint-button > span {
		display: grid;
		place-items: center;
		border: 1px solid var(--color-border-strong);
		border-radius: 50%;
		width: 15px;
		height: 15px;
		font-size: var(--font-small);
	}
	.report-tools summary {
		color: var(--color-text-muted);
		font-size: var(--font-small);
		cursor: pointer;
	}
	.report-tools details p {
		font-size: var(--font-body);
		text-align: left;
		color: var(--color-text-muted);
		margin: 13px 0 0;
	}
	.case-hint {
		grid-column: 2/-1;
		margin: 16px 0 0;
		padding-top: 13px;
		border-top: 1px dashed var(--color-warning-border);
		color: var(--color-warning);
		font-size: var(--font-body);
	}
	.investigation {
		scroll-margin-top: 18px;
	}
	.experiment-bar {
		display: flex;
		align-items: center;
		gap: 23px;
		padding: 16px 18px;
		border: 1px solid var(--color-border);
		border-radius: 9px;
		background: var(--color-surface-soft);
		margin-bottom: 22px;
	}
	.experiment-input {
		flex: 0 1 255px;
		min-width: 0;
	}
	.experiment-input label {
		display: block;
		margin-bottom: 5px;
		font-size: var(--font-small);
		font-weight: 650;
		color: var(--color-text-muted);
	}
	.experiment-input select {
		color: var(--ink);
		font-size: var(--font-small);
		border: 1px solid var(--color-border-strong);
		border-radius: 5px;
		background: var(--color-surface-raised);
		padding: 9px 25px 9px 10px;
		width: 100%;
		min-height: 38px;
	}
	.probe-description {
		flex: 1;
		min-width: 0;
		padding-top: 7px;
	}
	.probe-description strong {
		display: block;
		font-size: var(--font-body);
		font-weight: 650;
	}
	.probe-description p {
		margin: 4px 0 0;
		font-size: var(--font-body);
		line-height: var(--leading-body);
		color: var(--color-text-muted);
	}
	.run-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 13px;
		flex: 0 0 auto;
		min-height: 44px;
		border: 1px solid var(--color-action);
		border-radius: 6px;
		background: var(--color-action);
		color: var(--color-on-action);
		font-size: var(--font-small);
		font-weight: 650;
		padding: 12px 20px;
	}
	.run-button:hover {
		background: var(--color-action-hover);
	}
	.run-button > span {
		font-size: var(--font-small);
		color: var(--color-on-action);
	}
	.workbench {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 390px;
		gap: 25px;
		align-items: stretch;
	}
	.code-column,
	.evidence-column {
		min-width: 0;
	}
	.evidence-column {
		scroll-margin-top: 16px;
	}
	.section-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
		min-height: 45px;
	}
	.section-heading .eyebrow {
		font-size: var(--font-meta);
		margin-bottom: 4px;
	}
	.section-heading h2 {
		font-size: 21px;
		margin: 0;
		letter-spacing: -0.6px;
		line-height: 1.2;
	}
	.reset-button {
		color: var(--color-text-subtle);
		font-size: var(--font-small);
		padding: 6px 0;
		background: transparent;
		border: 0;
	}
	.reset-button:hover {
		color: var(--teal);
		text-decoration: underline;
	}
	.code-intro {
		color: var(--color-text-muted);
		font-size: var(--font-body);
		margin: 0 0 12px;
	}
	.code-intro b {
		font-weight: 650;
		color: var(--color-text-muted);
	}
	.attempt-label {
		font-size: var(--font-meta);
		color: var(--color-text-subtle);
	}
	.run-context {
		font-size: var(--font-meta);
		color: var(--color-text-muted);
		margin: 0 0 12px;
	}
	.run-context strong {
		font-weight: 600;
	}
	.run-context > span {
		display: block;
		margin-top: 4px;
		color: var(--color-warning);
		font-size: var(--font-meta);
	}
	.jump-section {
		display: block;
		width: 100%;
		padding: 10px 12px;
		margin-top: 12px;
		text-align: center;
		font-size: var(--font-small);
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-surface);
	}
	.code-column {
		scroll-margin-top: 16px;
	}
	.code-meta {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		color: var(--color-text-subtle);
		font-size: var(--font-meta);
		margin-top: 10px;
	}
	.stale-note {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin: 11px 0 0;
		font-size: var(--font-body);
		color: var(--color-warning);
	}
	.stale-note > span {
		font-size: var(--font-meta);
	}
	.fixture-note {
		color: var(--color-text-subtle);
		margin: 12px 0 0;
		font-size: var(--font-meta);
		line-height: 1.7;
	}
	.experiment-checks {
		border: 1px solid var(--color-border);
		background: var(--color-surface-raised);
		border-radius: 7px;
		margin-top: 16px;
	}
	.experiment-checks > summary {
		display: flex;
		align-items: center;
		gap: 12px;
		list-style: none;
		padding: 13px 15px;
		cursor: pointer;
		font-size: var(--font-small);
		font-weight: 650;
	}
	.experiment-checks > summary small {
		margin-left: auto;
		font-size: var(--font-small);
		color: var(--color-text-subtle);
		font-weight: 400;
	}
	.experiment-checks > summary b {
		font-size: 20px;
		font-weight: 400;
		color: var(--color-text-subtle);
		line-height: 1;
	}
	.experiment-checks[open] > summary b {
		transform: rotate(45deg);
	}
	.experiment-checks > p {
		padding: 0 15px;
		font-size: var(--font-body);
		color: var(--color-text-muted);
		margin: 0 0 13px;
	}
	.experiment-checks ul {
		list-style: none;
		padding: 0 15px;
		margin: 0;
		display: grid;
		gap: 12px;
	}
	.experiment-checks li {
		display: flex;
		gap: 11px;
		align-items: flex-start;
		font-size: var(--font-meta);
	}
	.experiment-checks li > span {
		display: grid;
		place-items: center;
		flex: 0 0 19px;
		height: 19px;
		border-radius: 50%;
		border: 1px solid var(--color-warning-border);
		background: var(--color-warning-soft);
		color: var(--color-warning);
		font-weight: 700;
	}
	.experiment-checks li.passed > span {
		border-color: var(--color-success-border);
		background: var(--color-success-soft);
		color: var(--color-success);
	}
	.experiment-checks li strong {
		font-weight: 600;
		color: var(--color-text-muted);
	}
	.experiment-checks li p {
		color: var(--color-text-muted);
		margin: 4px 0 0;
	}
	.experiment-checks .single-note {
		font-size: var(--font-meta);
		margin: 16px 15px 13px;
		padding: 11px 0 0;
		border-top: 1px solid var(--color-border);
		color: var(--color-text-subtle);
	}
	.error-message {
		padding: 12px 16px;
		border: 1px solid var(--color-danger-border);
		border-radius: 6px;
		background: var(--color-danger-soft);
		color: var(--color-danger);
	}
	.verification {
		margin-top: 29px;
		padding: 22px 24px;
		border: 1px solid var(--color-border);
		background: var(--color-surface-soft);
		border-radius: 9px;
	}
	.verification.solved {
		background: var(--color-success-soft);
		border-color: var(--color-success-border);
	}
	.verification-top {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 28px;
	}
	.verification h2 {
		margin: 0 0 7px;
		font-size: 23px;
		letter-spacing: -0.6px;
		line-height: 1.25;
	}
	.verification .eyebrow {
		color: var(--color-text-muted);
		font-size: var(--font-meta);
	}
	.verification-top p:not(.eyebrow) {
		margin: 0;
		color: var(--color-text-muted);
		font-size: var(--font-body);
		max-width: 770px;
	}
	.verify-button {
		display: inline-flex;
		max-width: 100%;
		justify-content: space-between;
		align-items: center;
		gap: 23px;
		flex: 0 0 auto;
		padding: 13px 17px;
		min-height: 44px;
		background: var(--color-surface-raised);
		border: 1px solid var(--color-border-strong);
		color: var(--color-text-muted);
		border-radius: 6px;
		font-size: var(--font-small);
		font-weight: 650;
	}
	.verify-button:hover {
		background: var(--color-surface-hover);
	}
	.verification-score {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 20px;
		padding-top: 15px;
		border-top: 1px solid var(--color-border);
	}
	.verification-score > strong {
		font-size: 24px;
		line-height: 1;
		color: var(--color-text-muted);
		letter-spacing: -1px;
	}
	.verification-score > span {
		color: var(--color-text-muted);
		font-size: var(--font-meta);
	}
	.results-toggle {
		margin-left: auto;
		padding: 5px 0;
		background: none;
		border: 0;
		font-size: var(--font-small);
		color: var(--color-text-muted);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.verification-results {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 9px;
		margin-top: 15px;
	}
	.verification-results button {
		display: flex;
		align-items: center;
		gap: 11px;
		text-align: left;
		padding: 11px 12px;
		background: var(--color-warning-soft);
		border: 1px solid var(--color-warning-border);
		border-radius: 6px;
		color: var(--color-warning);
		min-width: 0;
	}
	.verification-results button > span:nth-child(2) {
		min-width: 0;
		flex: 1;
	}
	.verification-results button strong {
		display: block;
		font-size: var(--font-small);
		line-height: 1.45;
		font-weight: 650;
	}
	.verification-results button small {
		display: block;
		margin-top: 4px;
		font-size: var(--font-small);
		color: var(--color-warning);
	}
	.verification-results button.passed {
		border-color: var(--color-success-border);
		background: var(--color-success-soft);
		color: var(--color-success);
	}
	.verification-results button.passed small {
		color: var(--color-success);
	}
	.verification-results button:disabled {
		opacity: 0.55;
	}
	.result-mark {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		flex: 0 0 24px;
		border: 1px solid var(--color-warning-border);
		background: var(--color-warning-soft);
		border-radius: 50%;
		font-size: var(--font-small);
	}
	.passed .result-mark {
		border-color: var(--color-success-border);
		background: var(--color-success-soft);
	}
	.case-solved {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		margin-top: 19px;
		padding-top: 17px;
		border-top: 1px solid var(--color-success-border);
	}
	.case-solved > div {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: var(--font-body);
		color: var(--color-success);
	}
	.solved-stamp {
		display: grid;
		place-items: center;
		width: 29px;
		height: 29px;
		flex: 0 0 29px;
		border-radius: 50%;
		background: var(--color-success-soft);
		color: var(--color-success);
		border: 1px solid var(--color-success-border);
		font-size: 18px;
	}
	.next-case {
		display: flex;
		align-items: center;
		gap: 22px;
		flex: 0 0 auto;
		background: var(--color-action);
		border: 1px solid var(--color-action);
		border-radius: 6px;
		color: var(--color-on-action);
		font-size: var(--font-small);
		font-weight: 650;
		text-decoration: none;
		padding: 11px 16px;
	}
	.next-case:hover {
		background: var(--color-action-hover);
	}
	.learning-note {
		margin-top: 24px;
		border: 1px solid var(--line);
		background: var(--color-surface-raised);
		border-radius: 7px;
	}
	.learning-note > summary {
		display: flex;
		justify-content: space-between;
		gap: 20px;
		padding: 15px 17px;
		list-style: none;
		cursor: pointer;
		font-size: var(--font-small);
		font-weight: 650;
	}
	.learning-note > summary > span:last-child {
		color: var(--color-text-subtle);
		font-size: 21px;
		line-height: 1;
		font-weight: 400;
	}
	.learning-note[open] > summary > span:last-child {
		transform: rotate(45deg);
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.learning-note > div {
		padding: 0 17px 18px;
		font-size: var(--font-body);
		color: var(--color-text-muted);
	}
	.learning-note p {
		max-width: 1020px;
		margin: 0 0 13px;
		line-height: 1.8;
	}
	.learning-note nav {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 24px;
		font-size: var(--font-small);
	}
	footer {
		display: flex;
		justify-content: space-between;
		gap: 20px;
		margin-top: 28px;
		padding: 22px 0 28px;
		border-top: 1px solid var(--line);
		font-size: var(--font-meta);
		color: var(--color-text-subtle);
	}
	footer a {
		text-decoration: none;
		color: var(--color-text-muted);
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
	@media (max-width: 1150px) {
		.topbar,
		main {
			width: calc(100% - 40px);
		}
		.workbench {
			grid-template-columns: minmax(0, 1fr) 350px;
			gap: 20px;
		}
		.case-tabs {
			gap: 9px;
		}
		.case-tabs button {
			padding: 11px 13px;
			gap: 10px;
		}
		.case-tab-name {
			max-width: 100%;
			min-width: 0;
			overflow-wrap: anywhere;
			font-size: var(--font-small);
		}
		.case-tab-name small {
			font-size: var(--font-meta);
		}
		.probe-description {
			padding-top: 0;
		}
		.experiment-bar {
			gap: 18px;
		}
		.experiment-input {
			flex-basis: 220px;
		}
		.run-button {
			padding-inline: 16px;
		}
		.code-meta > span:last-child {
			display: none;
		}
		.case-report {
			grid-template-columns: 34px minmax(0, 1fr) 165px;
		}
	}
	@media (max-width: 900px) {
		.workbench {
			grid-template-columns: 1fr;
			gap: 24px;
		}
		.evidence-column {
			max-width: 100%;
		}
		.case-progress {
			padding-left: 17px;
			gap: 12px;
		}
		.progress-icon {
			width: 45px;
			height: 45px;
			font-size: 37px;
		}
		.experiment-bar {
			flex-wrap: wrap;
		}
		.probe-description {
			order: 3;
			flex: 1 1 100%;
		}
		.experiment-input {
			flex: 1;
		}
		.verification-top {
			gap: 18px;
		}
		.verification h2 {
			font-size: 21px;
		}
		.verification-results {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 620px) {
		.topbar,
		main {
			width: calc(100% - 28px);
		}
		.topbar {
			min-height: 61px;
			gap: 14px;
		}
		.brand {
			font-size: 17px;
		}
		.brand > span:first-child {
			width: 25px;
			height: 25px;
			font-size: var(--font-meta);
		}
		.topbar nav {
			gap: 13px;
			font-size: var(--font-small);
		}
		.topbar nav a:first-child {
			display: none;
		}
		.intro {
			padding: 24px 0 20px;
			gap: 16px;
			align-items: flex-start;
			flex-wrap: wrap;
		}
		.intro > div:first-child {
			flex: 1 1 100%;
		}
		h1 {
			font-size: clamp(28px, 7.1vw, 43px);
			letter-spacing: -1.3px;
			margin-bottom: 10px;
		}
		.eyebrow {
			font-size: var(--font-meta);
			letter-spacing: 1.1px;
		}
		.intro > div > p:last-child {
			font-size: var(--font-body);
		}
		.case-progress {
			padding: 0;
			border: 0;
			gap: 9px;
		}
		.progress-icon {
			width: 25px;
			height: 25px;
			font-size: 24px;
		}
		.case-progress > div {
			display: flex;
			align-items: baseline;
			gap: 9px;
		}
		.case-progress strong {
			font-size: 17px;
		}
		.case-progress strong span {
			font-size: var(--font-small);
			margin-left: 4px;
		}
		.case-progress div > span {
			font-size: var(--font-meta);
			margin-top: 0;
		}
		.case-tabs {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px;
			margin-bottom: 15px;
		}
		.case-tabs button {
			min-height: 55px;
			padding: 10px 12px;
			gap: 11px;
		}
		.case-number {
			font-size: var(--font-body);
		}
		.case-tab-name {
			max-width: 100%;
			min-width: 0;
			overflow-wrap: anywhere;
			font-size: var(--font-small);
		}
		.case-tab-name small {
			font-size: var(--font-meta);
			margin-top: 2px;
		}
		.case-report {
			grid-template-columns: 27px minmax(0, 1fr);
			gap: 0 12px;
			padding: 16px 13px;
			margin-bottom: 18px;
		}
		.report-icon {
			width: 27px;
			height: 32px;
			font-size: 19px;
		}
		.report-copy .eyebrow {
			font-size: var(--font-meta);
			letter-spacing: 1px;
		}
		.report-copy h2 {
			font-size: 21px;
		}
		.report-copy > p:not(.eyebrow) {
			font-size: var(--font-body);
			margin-top: 7px;
		}
		.report-copy > strong {
			font-size: var(--font-body);
		}
		.report-tools {
			grid-column: 2;
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: 6px 17px;
			text-align: left;
			margin-top: 11px;
		}
		.hint-button {
			font-size: var(--font-small);
			gap: 7px;
			padding: 0;
		}
		.report-tools summary {
			font-size: var(--font-small);
		}
		.report-tools details p {
			font-size: var(--font-body);
		}
		.case-hint {
			grid-column: 1/-1;
			font-size: var(--font-body);
		}
		.experiment-bar {
			flex-wrap: wrap;
			gap: 12px;
			padding: 13px;
			margin-bottom: 19px;
		}
		.experiment-input {
			flex: 1 1 100%;
		}
		.experiment-input label {
			font-size: var(--font-small);
		}
		.experiment-input select {
			font-size: var(--font-small);
			min-height: 40px;
		}
		.run-button {
			width: 100%;
			min-height: 43px;
			font-size: var(--font-small);
			padding: 10px 14px;
			justify-content: flex-start;
		}
		.probe-description {
			order: 1;
		}
		.experiment-bar .run-button {
			order: 2;
		}
		.section-heading {
			min-height: 40px;
			margin-bottom: 10px;
		}
		.section-heading .eyebrow {
			font-size: var(--font-meta);
		}
		.section-heading h2 {
			font-size: 20px;
		}
		.reset-button {
			font-size: var(--font-small);
		}
		.code-intro {
			font-size: var(--font-body);
		}
		.attempt-label {
			font-size: var(--font-meta);
		}
		.code-meta,
		.fixture-note,
		.stale-note {
			font-size: var(--font-meta);
		}
		.experiment-checks > summary {
			gap: 9px;
			font-size: var(--font-small);
			padding: 12px;
		}
		.experiment-checks > summary small {
			font-size: var(--font-small);
		}
		.experiment-checks > p {
			font-size: var(--font-body);
			padding-inline: 12px;
		}
		.experiment-checks ul {
			padding-inline: 12px;
		}
		.verification {
			padding: 17px 14px;
			margin-top: 23px;
		}
		.verification-top {
			flex-direction: column;
			align-items: stretch;
			gap: 15px;
		}
		.verification h2 {
			font-size: 21px;
		}
		.verification .eyebrow {
			font-size: var(--font-meta);
		}
		.verification-top p:not(.eyebrow) {
			font-size: var(--font-body);
			line-height: var(--leading-body);
		}
		.verify-button {
			justify-content: center;
			font-size: var(--font-small);
			min-height: 42px;
			padding: 10px 12px;
		}
		.verification-score {
			gap: 9px;
			flex-wrap: wrap;
			margin-top: 16px;
		}
		.verification-score > strong {
			font-size: 23px;
		}
		.verification-score > span {
			font-size: var(--font-meta);
			flex: 1;
		}
		.results-toggle {
			font-size: var(--font-small);
			flex: 1 1 100%;
			text-align: left;
		}
		.verification-results {
			grid-template-columns: 1fr;
		}
		.verification-results button {
			padding: 10px 12px;
		}
		.case-solved {
			flex-direction: column;
			align-items: stretch;
			gap: 14px;
		}
		.case-solved > div {
			font-size: var(--font-body);
		}
		.next-case {
			justify-content: center;
			font-size: var(--font-small);
		}
		.learning-note > summary {
			font-size: var(--font-small);
			padding: 14px;
		}
		.learning-note > div {
			font-size: var(--font-body);
			padding: 0 14px 15px;
		}
		.learning-note nav {
			font-size: var(--font-small);
			gap: 9px 17px;
		}
		footer {
			flex-direction: column;
			gap: 7px;
			font-size: var(--font-meta);
			margin-top: 23px;
			padding: 19px 0 24px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			animation: none !important;
			transition: none !important;
			scroll-behavior: auto !important;
		}
	}

	.topbar {
		flex-wrap: wrap;
	}
	.topbar nav {
		margin-left: auto;
	}
	@media (max-width: 620px) {
		.topbar {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 8px 12px;
			padding-block: 12px;
		}
		.topbar nav {
			grid-column: 1 / -1;
			grid-row: 2;
			justify-self: end;
			margin-left: 0;
		}
	}

	.theme-control {
		flex: 0 0 auto;
		justify-self: end;
	}
	@media (max-width: 380px) {
		.brand {
			white-space: nowrap;
		}
		.topbar nav {
			grid-column: 2;
			grid-row: 1;
		}
		.theme-control {
			grid-column: 1 / -1;
			grid-row: 2;
		}
	}
	@media (max-width: 900px) {
		.case-tabs {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 480px) {
		.case-tabs {
			grid-template-columns: 1fr;
		}
	}

	.theme-control {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 8px;
		min-width: 0;
		max-width: 100%;
	}
	@media (max-width: 620px) {
		.theme-control {
			grid-column: 1 / -1;
			grid-row: auto;
			justify-self: stretch;
		}
	}
</style>
