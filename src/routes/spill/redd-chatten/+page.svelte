<script>
	import { onMount, onDestroy } from 'svelte';
	import BackendRouteEditor from '#lib/components/BackendRouteEditor.svelte';
	import {
		MISSIONS,
		blocksFor,
		initialProgram,
		routeFrame,
		casesFor,
		evaluateProgram,
		evaluateCase,
		programCode
	} from '#lib/reddChatten.js';

	/** @typedef {import('#lib/reddChatten.js').Run} Run */
	/** @typedef {import('#lib/reddChatten.js').CaseResult} CaseResult */
	/** @typedef {import('#lib/reddChatten.js').Message} Message */
	/** @typedef {{caseIndex:number, traceIndex:number, phase:'arrive'|'step'|'verdict'}} Frame */
	/** @typedef {{caseId:string, programKey:string, result:CaseResult}} Sample */

	let missionIndex = $state(0);
	let unlocked = $state(0);
	let completed = $state([false, false, false]);
	let programs = $state(MISSIONS.map((mission) => initialProgram(mission.id)));
	/** @type {(Run|null)[]} */
	let runs = $state(MISSIONS.map(() => null));
	let runKeys = $state(MISSIONS.map(() => ''));
	let attempts = $state([0, 0, 0]);
	/** @type {(number|null)[]} */
	let previousScores = $state([null, null, null]);
	let selectedCaseIndex = $state(0);
	let inspectedTraceIndex = $state(-1);
	/** @type {Sample|null} */
	let sample = $state(null);
	/** @type {Run|null} */
	let pendingRun = $state(null);
	/** @type {Frame[]} */
	let playback = $state([]);
	let frameIndex = $state(-1);
	let revealedCount = $state(0);
	let running = $state(false);
	let paused = $state(false);
	let speed = $state(1);
	let revision = $state(0);
	let hintOpen = $state(false);
	let traceOpen = $state(false);
	let dataOpen = $state(false);
	let announcement = $state('');
	let executionError = $state('');
	let narrow = $state(false);
	let reducedMotion = $state(false);
	/** @type {ReturnType<typeof setTimeout>|null} */
	let timer = null;
	/** @type {HTMLElement|undefined} */
	let explanationBoundary = $state();
	/** @type {HTMLElement|undefined} */
	let testPanel = $state();
	/** @type {HTMLElement|undefined} */
	let missionHeading = $state();

	let mission = $derived(MISSIONS[missionIndex]);
	let program = $derived(programs[missionIndex]);
	let programKey = $derived(program.join('|'));
	let blocks = $derived(blocksFor(mission.id));
	let frameCode = $derived(routeFrame(mission.id));
	let cases = $derived(casesFor(mission.id));
	let run = $derived(runs[missionIndex]);
	let stale = $derived(run !== null && runKeys[missionIndex] !== programKey);
	let frame = $derived(frameIndex >= 0 ? playback[frameIndex] : null);
	let currentCaseIndex = $derived(running && frame ? frame.caseIndex : selectedCaseIndex);
	let scenario = $derived(cases[currentCaseIndex]);
	let usingSample = $derived.by(
		() => !running && sample?.caseId === scenario.id && sample.programKey === programKey
	);
	let currentResult = $derived.by(() =>
		running && frame && pendingRun
			? pendingRun.results[frame.caseIndex]
			: usingSample && sample
				? sample.result
				: (run?.results[currentCaseIndex] ?? null)
	);
	let currentTraceIndex = $derived(running && frame ? frame.traceIndex : inspectedTraceIndex);
	let currentStep = $derived(
		currentTraceIndex >= 0 ? (currentResult?.trace[currentTraceIndex] ?? null) : null
	);
	let resultIsCurrent = $derived(currentResult !== null && (running || usingSample || !stale));
	let verdictVisible = $derived(currentResult !== null && (!running || frame?.phase === 'verdict'));
	let previewingStart = $derived(running && frame?.phase === 'arrive');
	let displayedMessages = $derived(
		previewingStart
			? scenario.initialMessages
			: (currentStep?.messages ?? currentResult?.after ?? scenario.initialMessages)
	);
	let displayedStatus = $derived(
		previewingStart
			? null
			: currentStep
				? currentStep.status
				: verdictVisible
					? (currentResult?.status ?? null)
					: null
	);
	let displayedResponse = $derived(
		previewingStart
			? undefined
			: currentStep
				? currentStep.response
				: verdictVisible
					? currentResult?.response
					: undefined
	);
	let shownTrace = $derived(
		!resultIsCurrent || previewingStart
			? []
			: currentTraceIndex >= 0
				? (currentResult?.trace.slice(0, currentTraceIndex + 1) ?? [])
				: (currentResult?.trace ?? [])
	);
	let executedBlockIds = $derived(
		shownTrace.filter((step) => step.executed).map((step) => step.blockId)
	);
	let skippedBlockIds = $derived(
		shownTrace.filter((step) => !step.executed).map((step) => step.blockId)
	);
	let activeBlockId = $derived(
		resultIsCurrent && !previewingStart
			? (currentStep?.blockId ?? (verdictVisible ? (currentResult?.faultBlockId ?? null) : null))
			: null
	);
	let visiblePassed = $derived.by(() =>
		running && pendingRun
			? pendingRun.results.slice(0, revealedCount).filter((item) => item.passed).length
			: (run?.passed ?? 0)
	);
	let showScore = $derived(running || run !== null);
	let currentPassed = $derived(!stale && run?.success === true);
	let progressCount = $derived(completed.filter(Boolean).length);
	let improvement = $derived(
		run && previousScores[missionIndex] !== null
			? run.passed - /** @type {number} */ (previousScores[missionIndex])
			: null
	);
	let fullCode = $derived(programCode(mission.id, program));

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
	onDestroy(clearTimer);

	function clearTimer() {
		if (timer !== null) clearTimeout(timer);
		timer = null;
	}
	function closeInspection() {
		inspectedTraceIndex = -1;
		traceOpen = false;
		revision += 1;
	}
	/** @param {string[]} next @param {string} message */
	function changeProgram(next, message) {
		if (running) return;
		programs[missionIndex] = [...next];
		completed[missionIndex] =
			runs[missionIndex]?.success === true && runKeys[missionIndex] === next.join('|');
		sample = null;
		closeInspection();
		executionError = '';
		announcement = `${message} Koden er endret. Test for å se virkningen.`;
	}
	function resetMission() {
		if (running) return;
		programs[missionIndex] = initialProgram(mission.id);
		runs[missionIndex] = null;
		runKeys[missionIndex] = '';
		previousScores[missionIndex] = null;
		attempts[missionIndex] = 0;
		completed[missionIndex] = false;
		sample = null;
		selectedCaseIndex = 0;
		closeInspection();
		executionError = '';
		announcement = 'Startkoden er tilbake. Du kan reparere den på nytt.';
	}
	/** @param {number} index */
	function changeMission(index) {
		if (running || index < 0 || index >= MISSIONS.length || index > unlocked) return;
		clearTimer();
		missionIndex = index;
		selectedCaseIndex = 0;
		sample = null;
		pendingRun = null;
		playback = [];
		frameIndex = -1;
		hintOpen = false;
		dataOpen = false;
		executionError = '';
		closeInspection();
		missionHeading?.focus({ preventScroll: true });
		announcement = `Reparasjon ${index + 1}: ${MISSIONS[index].title}.`;
	}
	/** @param {number} index */
	function chooseCase(index) {
		if (running) return;
		selectedCaseIndex = index;
		closeInspection();
	}
	function pauseForCode() {
		if (!running || paused) return;
		clearTimer();
		paused = true;
		announcement = 'Prøverunden er pauset mens du undersøker koden.';
	}
	function togglePause() {
		if (!running) return;
		if (paused) {
			paused = false;
			schedule();
			announcement = 'Prøverunden fortsetter.';
		} else pauseForCode();
	}
	function schedule() {
		clearTimer();
		if (!running || paused || !frame) return;
		const milliseconds = frame.phase === 'arrive' ? 280 : frame.phase === 'verdict' ? 500 : 180;
		timer = setTimeout(advance, milliseconds * speed);
	}
	function advance() {
		clearTimer();
		if (!running || frameIndex + 1 >= playback.length) return;
		frameIndex += 1;
		revision += 1;
		const next = playback[frameIndex];
		if (next.phase === 'verdict') revealedCount = next.caseIndex + 1;
		if (frameIndex === playback.length - 1) complete();
		else schedule();
	}
	function testAll() {
		if (running) return;
		try {
			const attempt = evaluateProgram(mission.id, program);
			clearTimer();
			previousScores[missionIndex] = run?.passed ?? null;
			attempts[missionIndex] += 1;
			sample = null;
			pendingRun = attempt;
			playback = attempt.results.flatMap((item, caseIndex) => {
				/** @type {Frame[]} */
				const events = [{ caseIndex, traceIndex: -1, phase: 'arrive' }];
				item.trace.forEach((step, traceIndex) => {
					if (step.executed) events.push({ caseIndex, traceIndex, phase: 'step' });
				});
				events.push({ caseIndex, traceIndex: -1, phase: 'verdict' });
				return events;
			});
			frameIndex = -1;
			revealedCount = 0;
			running = true;
			paused = false;
			executionError = '';
			closeInspection();
			advance();
			if (narrow)
				testPanel?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
			announcement = `${cases.length} situasjoner prøver koden din. Hver begynner med sine egne startdata.`;
		} catch (error) {
			executionError = error instanceof Error ? error.message : 'Koden kunne ikke prøves.';
		}
	}
	function complete() {
		clearTimer();
		if (!pendingRun) return;
		runs[missionIndex] = pendingRun;
		runKeys[missionIndex] = programKey;
		revealedCount = pendingRun.total;
		running = false;
		paused = false;
		completed[missionIndex] = pendingRun.success;
		if (pendingRun.success)
			unlocked = Math.max(unlocked, Math.min(missionIndex + 1, MISSIONS.length - 1));
		const firstFailure = pendingRun.results.findIndex((item) => !item.passed);
		selectedCaseIndex = firstFailure >= 0 ? firstFailure : 0;
		inspectedTraceIndex = -1;
		revision += 1;
		announcement = `${pendingRun.passed} av ${pendingRun.total} situasjoner håndtert riktig. ${pendingRun.success ? 'Reparasjonen er godkjent.' : 'Velg en feil, undersøk hva som skjedde, og juster koden.'}`;
	}
	function finishNow() {
		if (running) complete();
	}
	function cancelRun() {
		clearTimer();
		running = false;
		paused = false;
		pendingRun = null;
		frameIndex = -1;
		playback = [];
		revealedCount = 0;
		closeInspection();
		announcement = 'Prøverunden er avbrutt. Koden din er beholdt.';
	}
	function testOne() {
		if (running) return;
		try {
			const result = evaluateCase(mission.id, program, scenario.id);
			sample = { caseId: scenario.id, programKey, result };
			closeInspection();
			executionError = '';
			announcement = `Enkeltprøve: ${result.feedback}`;
		} catch (error) {
			executionError = error instanceof Error ? error.message : 'Requesten kunne ikke prøves.';
		}
	}
	/** @param {number} index */
	function inspectStep(index) {
		if (running) return;
		inspectedTraceIndex = inspectedTraceIndex === index ? -1 : index;
		revision += 1;
	}
	/** @param {number} index */
	function queueResult(index) {
		if (running) return pendingRun && index < revealedCount ? pendingRun.results[index] : null;
		return !stale ? (run?.results[index] ?? null) : null;
	}
	/** @param {unknown} value */
	function json(value) {
		return JSON.stringify(value, null, 2) ?? 'undefined';
	}
	/** @param {unknown} value */
	function inlineValue(value) {
		return value === undefined ? '(mangler)' : JSON.stringify(value);
	}
	/** @param {string} id */
	function blockName(id) {
		return blocks.find((block) => block.id === id)?.title ?? id;
	}
	/** @param {Message[]} messages */
	function messageIds(messages) {
		return messages.map((message) => `#${message.id}`).join(', ') || 'Ingen meldinger';
	}
</script>

<svelte:head>
	<title>Redd chatten – et spill om backend | IT-laben</title>
	<meta
		name="description"
		content="Reparer chatserveren med kodeblokker. Slipp til virtuelle brukere, finn feilene og få både vanlige meldinger og feilforsøk riktig."
	/>
</svelte:head>

<div class="rescue-page">
	<header class="topbar">
		<a class="brand" href="/"
			><span aria-hidden="true">IT</span>IT-laben<span class="brand-dot">.</span></a
		>
		<nav aria-label="Spillnavigasjon">
			<a href="/spill/chat/">Prøv første variant ↗</a><a href="/#spill">Alle spill</a>
		</nav>
	</header>
	<main>
		<div class="intro">
			<div>
				<p class="eyebrow">SPILL 02 <span>DU BYGGER BACKEND</span></p>
				<h1>Redd <em>chatten.</em></h1>
				<p>Reparer koden. Slipp inn brukerne. Se om den holder.</p>
			</div>
			<div class="campaign">
				<span>{progressCount} av 3 reparasjoner løst</span>
				<div class="mission-tabs" role="group" aria-label="Velg reparasjon">
					{#each MISSIONS as item, index}<button
							type="button"
							class:chosen={index === missionIndex}
							class:solved={completed[index]}
							disabled={running || index > unlocked}
							aria-pressed={index === missionIndex}
							aria-label={`Reparasjon ${index + 1}: ${item.title}${index > unlocked ? ' · låst' : completed[index] ? ' · løst' : ''}`}
							onclick={() => changeMission(index)}
							><span>{completed[index] ? '✓' : `0${index + 1}`}</span>{[
								'Teksten',
								'Avsenderen',
								'Slettingen'
							][index]}<small
								>{index > unlocked ? 'LÅST' : completed[index] ? 'LØST' : 'REPARER'}</small
							></button
						>{/each}
				</div>
			</div>
		</div>

		<section class="mission" aria-labelledby="mission-title">
			<span class="issue-icon" aria-hidden="true">!</span>
			<div class="mission-copy">
				<p class="eyebrow">FEILRAPPORT {mission.number} / 3</p>
				<h2 id="mission-title" tabindex="-1" bind:this={missionHeading}>{mission.title}</h2>
				<p>{mission.brief}</p>
				<strong>{mission.goal}</strong>
			</div>
			<div class="mission-tools">
				<button
					type="button"
					class="quiet"
					aria-expanded={hintOpen}
					aria-controls="mission-hint"
					onclick={() => (hintOpen = !hintOpen)}
					>{hintOpen ? 'Skjul hint' : 'Trenger du et hint?'}
					<span aria-hidden="true">?</span></button
				>
				<details class="contract">
					<summary>Hva må serveren klare?</summary>
					<ul>
						{#each mission.contract as rule}<li>{rule}</li>{/each}
					</ul>
				</details>
			</div>
			{#if hintOpen}<p class="hint" id="mission-hint">{mission.hint}</p>{/if}
		</section>

		<div class="workbench">
			<section class="code-column" aria-labelledby="code-title">
				<div class="section-heading">
					<div>
						<p class="eyebrow">01 / REPARER</p>
						<h2 id="code-title">Serveren din</h2>
					</div>
					<button type="button" class="text-button" disabled={running} onclick={resetMission}
						>Til startkoden ↺</button
					>
				</div>
				<p class="editor-intro">
					Flytt kontrollene, bytt kode eller legg til en blokk. Klikk på en kodelinje for
					forklaring.
				</p>
				<BackendRouteEditor
					{blocks}
					{program}
					opening={frameCode.opening}
					closing={frameCode.closing}
					maxBlocks={mission.maxBlocks}
					disabled={running}
					onprogramchange={changeProgram}
					onexplain={pauseForCode}
					{activeBlockId}
					{executedBlockIds}
					{skippedBlockIds}
					explanationBoundary={explanationBoundary ?? null}
					resetKey={`${mission.id}-${revision}`}
				/>
				<div class="code-meta">
					<span><i aria-hidden="true"></i>Endringer prøves når du tester.</span><span
						>{program.length}/{mission.maxBlocks} blokker</span
					>
				</div>
				{#if stale && !running}<p class="dirty-note">
						<span aria-hidden="true">●</span> Koden er endret. Resultatene til høyre gjelder forrige prøverunde.
					</p>{/if}
			</section>

			<aside class="test-column" bind:this={explanationBoundary} aria-labelledby="test-title">
				<div class="test-panel" bind:this={testPanel}>
					<div class="section-heading">
						<div>
							<p class="eyebrow">02 / PRØV DET</p>
							<h2 id="test-title">Tåler den brukerne?</h2>
						</div>
						<span
							class="server-led"
							class:good={currentPassed && !running}
							class:working={running && !paused}
							aria-label={running
								? 'Prøver kode'
								: currentPassed
									? 'Alle prøver bestått'
									: 'Serveren trenger en reparasjon'}
						></span>
					</div>
					<div class="run-controls">
						<button type="button" class="launch" disabled={running} onclick={testAll}
							><span aria-hidden="true">▶</span>{running
								? paused
									? 'Prøverunden er pauset'
									: 'Brukerne prøver koden …'
								: attempts[missionIndex]
									? 'Test hele chatten igjen'
									: 'Slipp inn brukerne'}<span class="launch-count">{cases.length}</span></button
						>
						<div class="play-controls">
							{#if running}<button type="button" class="pill-button" onclick={togglePause}
									>{paused ? 'Fortsett' : 'Pause'}</button
								><button type="button" class="text-button" onclick={finishNow}
									>Vis alle resultater</button
								><button
									type="button"
									class="icon-button"
									onclick={cancelRun}
									aria-label="Avbryt prøverunden">×</button
								>{:else}<span
									>{attempts[missionIndex]
										? `Prøverunde ${attempts[missionIndex]}`
										: 'Både vanlige meldinger og feilforsøk'}</span
								><label class="speed-label"
									><span class="sr-only">Tempo på prøverunden</span><select bind:value={speed}
										><option value={1}>Vanlig</option><option value={0.5}>Rask</option><option
											value={2.4}>Rolig</option
										></select
									></label
								>{/if}
						</div>
					</div>
					{#if executionError}<p role="alert" class="execution-error">{executionError}</p>{/if}
					<div
						class="score"
						class:all-good={currentPassed && !running}
						class:stale={stale && !running}
						data-testid="rescue-score"
						data-success={currentPassed && !running}
						data-stale={stale && !running}
					>
						<div>
							<strong
								>{showScore ? `${visiblePassed}/${cases.length}` : '– / ' + cases.length}</strong
							><span
								>{running
									? `${revealedCount} av ${cases.length} prøvd${paused ? ' · pause' : ''}`
									: stale
										? 'Forrige runde · kode endret'
										: run
											? 'situasjoner håndtert riktig'
											: 'situasjoner venter'}</span
							>
						</div>
						<div class="score-track" aria-hidden="true">
							<span style:width={`${(visiblePassed / cases.length) * 100}%`}></span>
						</div>
						{#if improvement !== null && !running && !stale}<small
								>{improvement > 0
									? `+${improvement} flere enn forrige runde`
									: improvement < 0
										? `${Math.abs(improvement)} færre enn forrige runde. Undersøk hva som endret seg.`
										: 'Samme antall som forrige runde.'}</small
							>{/if}
					</div>
					<div class="case-queue" role="group" aria-label="Velg en situasjon å undersøke">
						{#each cases as item, index}{@const outcome = queueResult(index)}<button
								type="button"
								class:active={currentCaseIndex === index}
								class:passed={outcome?.passed}
								class:failed={outcome && !outcome.passed}
								disabled={running}
								aria-pressed={currentCaseIndex === index}
								aria-label={`${item.name}${outcome ? (outcome.passed ? ' · riktig håndtert' : ' · må rettes') : ''}`}
								onclick={() => chooseCase(index)}
								data-case-id={item.id}
								><span class="case-person" aria-hidden="true"
									>{outcome
										? outcome.passed
											? '✓'
											: '×'
										: String(index + 1).padStart(2, '0')}</span
								><span>{item.name}</span></button
							>{/each}
					</div>
					<section
						class="request-card"
						aria-labelledby="request-title"
						class:arriving={running && frame?.phase === 'arrive'}
						data-testid="rescue-request"
						data-case-id={scenario.id}
						data-phase={running ? frame?.phase : 'inspect'}
					>
						<div class="request-heading">
							<span class="avatar" aria-hidden="true">{scenario.actor.slice(0, 1)}</span>
							<div>
								<h3 id="request-title">{scenario.name}</h3>
								<span
									>{scenario.actor} <b>·</b>
									{scenario.kind === 'normal'
										? 'Vanlig bruk'
										: scenario.kind === 'edge'
											? 'Et grensetilfelle'
											: 'Et forsøk som utfordrer reglene'}</span
								>
							</div>
							<span
								class="http-status"
								class:bad={displayedStatus !== null && displayedStatus >= 400}
								>{displayedStatus ?? (verdictVisible ? 'Ingen svar' : 'HTTP')}</span
							>
						</div>
						<p class="request-brief">{scenario.brief}</p>
						<dl class="request-data">
							<div>
								<dt>Request</dt>
								<dd>
									<code
										>{mission.method}
										{mission.path.replace(':id', scenario.request.params.id ?? '')}</code
									>
								</dd>
							</div>
							<div>
								<dt>Session</dt>
								<dd>{scenario.request.session.bruker?.navn ?? 'Ikke innlogget'}</dd>
							</div>
							{#if mission.method === 'POST'}<div>
									<dt>Tekst i body</dt>
									<dd>
										<code class="quoted-input">{inlineValue(scenario.request.body.tekst)}</code>
									</dd>
								</div>{/if}{#if mission.id !== 'tekst'}<div>
									<dt>Avsender i body</dt>
									<dd>
										<code
											>{scenario.request.body.avsender ??
												scenario.request.body.avsenderId ??
												'(ikke oppgitt)'}</code
										>
									</dd>
								</div>{/if}
						</dl>
						{#if currentStep}<p class="step-now" data-testid="rescue-current-step">
								<span
									>{running ? 'KJØRER NÅ' : 'TILBAKEBLIKK'} · {currentStep.executed
										? 'blokk ' + (currentStep.index + 1)
										: 'hoppet over'}</span
								>{currentStep.explanation}
							</p>{:else if running && frame?.phase === 'arrive'}<p class="step-now">
								<span>INNKOMMENDE REQUEST</span>En ny situasjon begynner med sine egne startdata.
							</p>{/if}
						{#if verdictVisible && currentResult}<div
								class="case-feedback"
								class:passed={currentResult.passed}
								class:failed={!currentResult.passed}
								class:old={!resultIsCurrent}
								data-testid="rescue-feedback"
								data-passed={currentResult.passed}
							>
								<div>
									<span aria-hidden="true">{currentResult.passed ? '✓' : '!'}</span><strong
										>{!resultIsCurrent
											? 'Fra forrige prøverunde'
											: usingSample
												? 'Enkeltprøve'
												: currentResult.passed
													? 'Riktig håndtert'
													: 'Her må noe repareres'}</strong
									>
								</div>
								<p>{currentResult.feedback}</p>
								{#if usingSample}<small>Test alle brukerne for å få reparasjonen godkjent.</small
									>{/if}
							</div>{:else if !running}<p class="start-prompt">
								Test startkoden først, eller gjør en endring du tror vil hjelpe.
							</p>{/if}
						{#if !running}<button type="button" class="single-test" onclick={testOne}
								>Prøv bare denne requesten <span aria-hidden="true">↗</span></button
							>{/if}
					</section>
					{#if currentResult && !running}<details class="trace-detail" bind:open={traceOpen}>
							<summary>Følg requesten gjennom koden <span aria-hidden="true">+</span></summary
							>{#if !resultIsCurrent}<p class="stale-trace">
									Koden er endret. Kjør requesten på nytt for å følge den nye koden.
								</p>{:else}<p class="trace-intro">
									Velg en blokk. Koden og dataene viser det tidspunktet.
								</p>
								<ol>
									{#each currentResult.trace as step, index}<li>
											<button
												type="button"
												class:selected={inspectedTraceIndex === index}
												class:skipped={!step.executed}
												aria-pressed={inspectedTraceIndex === index}
												onclick={() => inspectStep(index)}
												><span>{step.executed ? (step.stopped ? '■' : '↓') : '–'}</span>
												<div>
													<strong>{blockName(step.blockId)}</strong><small
														>{!step.executed
															? 'Hoppet over'
															: step.stopped
																? 'Ruten stopper her'
																: 'Utført'}</small
													>
												</div></button
											>
										</li>{/each}
								</ol>
								{#if currentResult.trace.length === 0}<p class="trace-intro">
										Ruten har ingen blokker og sender ikke noe svar.
									</p>{/if}{/if}
						</details>{/if}
					<details class="data-detail" bind:open={dataOpen}>
						<summary>Se request og data <span aria-hidden="true">+</span></summary>
						<div class="data-content">
							<h4>Request</h4>
							<pre><code>{json(scenario.request)}</code></pre>
							<h4>Serverlisten før denne requesten</h4>
							<p class="id-list">{messageIds(scenario.initialMessages)}</p>
							<pre data-testid="rescue-before"><code>{json(scenario.initialMessages)}</code></pre>
							<h4>
								{previewingStart
									? 'Serverlisten ved ankomst'
									: currentStep
										? 'Serverlisten ved valgt blokk'
										: currentResult
											? 'Serverlisten etter requesten'
											: 'Serverlisten nå'}
							</h4>
							<p class="id-list">{messageIds(displayedMessages)}</p>
							<pre data-testid="rescue-after"><code>{json(displayedMessages)}</code></pre>
							{#if currentResult}<h4>{currentStep ? 'Svar ved valgt blokk' : 'Svar fra ruten'}</h4>
								<pre data-testid="rescue-response"><code
										>{displayedStatus === null
											? 'Ruten har ikke svart.'
											: json(displayedResponse)}</code
									></pre>
								<h4>Prøven forventet</h4>
								<p class="expected">{currentResult.expectedSummary}</p>{/if}
						</div>
					</details>
					<p class="fresh-start">
						Hver request får sine egne startdata. Feil i én prøve påvirker ikke den neste.
					</p>
				</div>
			</aside>
		</div>

		{#if currentPassed && !running}<section class="mission-win" data-testid="rescue-win">
				<span class="win-badge" aria-hidden="true">✓</span>
				<div>
					<p class="eyebrow">REPARASJON {mission.number} GODKJENT</p>
					<h2>
						{missionIndex === 2
							? 'Chatten klarte hele prøverunden.'
							: 'Denne delen av chatten virker.'}
					</h2>
					<p>{mission.lesson}</p>
				</div>
				{#if missionIndex < MISSIONS.length - 1}<button
						type="button"
						class="next-mission"
						onclick={() => changeMission(missionIndex + 1)}
						>Neste reparasjon <span aria-hidden="true">→</span></button
					>{:else}<a class="next-mission" href="/spill/chat/">Sammenlign med første spill ↗</a>{/if}
			</section>{/if}

		<details class="learn-more">
			<summary>Fra spillet til din egen chat <span aria-hidden="true">+</span></summary>
			<div>
				<p>
					Dette er en lokal simulering av Express-ruter. Ingen meldinger sendes til andre brukere.
					Prøvene undersøker både HTTP-svaret og hva koden gjør med serverlisten.
				</p>
				<p>
					I en virkelig app må Express, JSON-body og sessions være satt opp før disse rutene.
					Innloggede brukere kommer fra en session som serveren opprettet ved innlogging. I første
					oppdrag øver vi bare på teksten; neste oppdrag tar for seg avsenderen.
				</p>
				<p>
					Fremdriften beholdes mens denne spillsiden er åpen. Alle kravene i et oppdrag står under
					«Hva må serveren klare?».
				</p>
				<details class="full-source">
					<summary>Se din nåværende rute som samlet kode</summary>
					<pre><code>{fullCode}</code></pre>
				</details>
				<div class="lesson-links">
					<a href="/chatrom/">Utforsk chatrom, sessions og sletting ↗</a><a href="/sessions/"
						>Hvordan fungerer sessions? ↗</a
					>
				</div>
			</div>
		</details>
		<footer>
			<a href="/#spill">← Spill og utfordringer</a><span
				>Bygg en regel som holder for flere enn én request.</span
			>
		</footer>
		<p class="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f2f5ee;
	}
	.rescue-page {
		--ink: #173e3a;
		--muted: #63786e;
		--line: #d7e2d5;
		--teal: #087e75;
		font-family:
			Inter,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		color: var(--ink);
		font-size: 14px;
		line-height: 1.5;
		min-height: 100vh;
		background: radial-gradient(ellipse at 85% 0%, #deeee6, transparent 40%);
	}
	.rescue-page * {
		box-sizing: border-box;
	}
	.topbar,
	main {
		width: min(1320px, calc(100% - 64px));
		margin: auto;
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
		outline: 3px solid #b97938;
		outline-offset: 3px;
	}
	.topbar {
		min-height: 68px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		border-bottom: 1px solid var(--line);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 7px;
		font-weight: 750;
		text-decoration: none;
		font-size: 19px;
	}
	.brand > span:first-child {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 5px;
		background: var(--ink);
		color: #f2f7e9;
		font-size: 13px;
	}
	.brand-dot {
		color: var(--teal);
		margin-left: -7px;
	}
	.topbar nav {
		display: flex;
		gap: 22px;
		font-size: 11px;
		color: var(--muted);
	}
	.topbar nav a {
		text-decoration: none;
	}
	.topbar nav a:hover {
		color: var(--teal);
		text-decoration: underline;
	}
	.intro {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 32px;
		padding: 25px 0 23px;
	}
	.eyebrow {
		font-size: 9px;
		font-weight: 750;
		letter-spacing: 1.4px;
		color: var(--teal);
		margin: 0 0 7px;
		line-height: 1.4;
	}
	.eyebrow > span {
		border-left: 1px solid #afc4b9;
		margin-left: 10px;
		padding-left: 10px;
		color: #658071;
		font-weight: 550;
	}
	h1,
	h2,
	h3,
	h4,
	p {
		margin-top: 0;
	}
	h1 {
		font-size: clamp(32px, 3.4vw, 45px);
		line-height: 1.1;
		letter-spacing: -1.9px;
		margin-bottom: 8px;
	}
	h1 em {
		color: var(--teal);
		font-family: Georgia, serif;
		font-weight: 500;
	}
	.intro > div > p:last-child {
		margin-bottom: 0;
		font-size: 12px;
		color: var(--muted);
	}
	.campaign > span {
		display: block;
		font-size: 10px;
		text-align: right;
		color: var(--muted);
		margin-bottom: 9px;
	}
	.mission-tabs {
		display: flex;
		gap: 8px;
	}
	.mission-tabs button {
		position: relative;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0 8px;
		align-items: center;
		border: 1px solid var(--line);
		background: #f7faf2;
		border-radius: 7px;
		padding: 10px 13px;
		color: #6a8074;
		font-size: 11px;
		font-weight: 650;
		min-width: 108px;
		text-align: left;
	}
	.mission-tabs button > span {
		grid-row: span 2;
		font:
			18px Georgia,
			serif;
		color: #78917b;
	}
	.mission-tabs small {
		font: 7px/1.5 monospace;
		letter-spacing: 1px;
		color: #87967e;
	}
	.mission-tabs .chosen {
		border-color: #82a88d;
		background: #e0edce;
		color: var(--ink);
		box-shadow: 0 0 0 1px #a6c29333;
	}
	.mission-tabs .chosen > span,
	.mission-tabs .solved > span {
		color: #327e5c;
	}
	.mission-tabs button:disabled {
		opacity: 0.4;
	}
	.mission {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 15px;
		padding: 19px 22px;
		border: 1px solid #dbcfae;
		border-radius: 9px;
		background: #f4f1e2;
		margin-bottom: 24px;
		align-items: start;
	}
	.issue-icon {
		display: grid;
		place-items: center;
		width: 31px;
		height: 36px;
		background: #e9dfbd;
		color: #8a6c29;
		border: 1px solid #dcd09f;
		border-radius: 6px;
		font:
			bold 21px Georgia,
			serif;
	}
	.mission .eyebrow {
		color: #987a37;
		font-size: 8px;
		margin-bottom: 4px;
	}
	.mission h2 {
		font-size: 19px;
		line-height: 1.25;
		margin: 0 0 6px;
		letter-spacing: -0.3px;
	}
	.mission-copy > p:not(.eyebrow) {
		font-size: 11px;
		color: #73775f;
		margin-bottom: 7px;
		max-width: 740px;
	}
	.mission-copy > strong {
		display: block;
		font-size: 11px;
		font-weight: 650;
		color: #4d684e;
	}
	.mission-tools {
		width: 205px;
		max-width: 100%;
		display: grid;
		justify-items: end;
		gap: 9px;
	}
	.quiet,
	.text-button {
		border: 0;
		background: transparent;
		padding: 3px 0;
		color: #527568;
		font-size: 10px;
	}
	.quiet:hover,
	.text-button:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.quiet > span {
		display: inline-grid;
		place-items: center;
		width: 15px;
		height: 15px;
		border-radius: 50%;
		border: 1px solid #c9cba9;
		margin-left: 5px;
		font-family: Georgia, serif;
	}
	.text-button:disabled {
		opacity: 0.4;
		text-decoration: none;
	}
	.contract {
		font-size: 10px;
		width: 100%;
		color: #77765c;
		text-align: right;
	}
	summary {
		cursor: pointer;
	}
	.contract ul {
		text-align: left;
		margin: 10px 0 0;
		padding: 12px 13px 12px 23px;
		border: 1px solid #ded8c3;
		background: #fffdf3;
		border-radius: 5px;
		line-height: 1.65;
	}
	.contract li + li {
		margin-top: 5px;
	}
	.hint {
		grid-column: 2/-1;
		margin: 0;
		padding: 10px 13px;
		border-left: 3px solid #c1ad65;
		background: #ebe7d3;
		font-size: 11px;
		color: #6c684a;
	}
	.workbench {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 346px;
		gap: 25px;
		align-items: stretch;
	}
	.code-column,
	.test-column {
		min-width: 0;
	}
	.section-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		margin-bottom: 10px;
	}
	.section-heading .eyebrow {
		font-size: 8px;
		letter-spacing: 1.1px;
		margin-bottom: 3px;
	}
	.section-heading h2 {
		font-size: 18px;
		margin: 0;
		line-height: 1.25;
		letter-spacing: -0.4px;
	}
	.editor-intro {
		margin: 0 0 12px;
		font-size: 11px;
		color: var(--muted);
	}
	.code-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-top: 9px;
		color: #869482;
		font-size: 9px;
	}
	.code-meta > span:first-child {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.code-meta i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #95ad7e;
	}
	.dirty-note {
		display: flex;
		align-items: baseline;
		gap: 8px;
		border: 1px solid #d4dbc0;
		background: #edf0df;
		border-radius: 6px;
		padding: 9px 12px;
		margin: 14px 0 0;
		font-size: 10px;
		color: #77824a;
	}
	.dirty-note span {
		font-size: 7px;
	}
	.test-panel {
		position: sticky;
		top: 16px;
		scroll-margin-top: 18px;
	}
	.server-led {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: #c2a270;
		box-shadow: 0 0 0 5px #e8e2ce;
		margin-right: 5px;
	}
	.server-led.good {
		background: #55a570;
		box-shadow: 0 0 0 5px #dbead2;
	}
	.server-led.working {
		background: #368c80;
		box-shadow: 0 0 0 5px #d7e9dd;
		animation: pulse 1.4s ease-in-out infinite;
	}
	.launch {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		border: 1px solid #096d64;
		background: #14796e;
		color: #f7faee;
		border-radius: 7px;
		padding: 12px 13px;
		font-size: 12px;
		font-weight: 650;
		box-shadow: 0 3px 0 #0d5e56;
	}
	.launch:hover:not(:disabled) {
		background: #096c62;
	}
	.launch:disabled {
		background: #405f51;
		border-color: #405f51;
		box-shadow: 0 3px 0 #355044;
	}
	.launch > span:first-child {
		font-size: 11px;
	}
	.launch-count {
		display: grid;
		place-items: center;
		margin-left: auto;
		border: 1px solid #9cc0a866;
		min-width: 21px;
		height: 21px;
		border-radius: 5px;
		font: 10px monospace;
		color: #d0e5bc;
	}
	.play-controls {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 40px;
		color: #879181;
	}
	.play-controls > span {
		margin-right: auto;
		font-size: 9px;
	}
	.speed-label {
		margin-left: auto;
	}
	.speed-label select {
		max-width: 78px;
		padding: 3px 4px;
		font-size: 9px;
		color: #6f8371;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: #f6f8f0;
	}
	.pill-button {
		padding: 4px 11px;
		border: 1px solid #b9ceba;
		border-radius: 4px;
		background: #e5efdc;
		color: #41684d;
		font-size: 10px;
	}
	.icon-button {
		margin-left: auto;
		border: 0;
		background: none;
		font-size: 19px;
		color: #8a9a8a;
		padding: 0 5px;
	}
	.execution-error {
		border: 1px solid #d1a38d;
		background: #f4e7dd;
		padding: 9px;
		color: #8b513a;
		font-size: 11px;
		border-radius: 5px;
	}
	.score {
		padding: 10px 12px;
		background: #e9eedf;
		border: 1px solid #d5dfcb;
		border-radius: 7px;
		margin-bottom: 11px;
	}
	.score > div:first-child {
		display: flex;
		align-items: baseline;
		gap: 10px;
	}
	.score strong {
		font-size: 23px;
		font-weight: 700;
		letter-spacing: -1px;
		line-height: 1.2;
	}
	.score span {
		font-size: 10px;
		color: #73846a;
	}
	.score .score-track {
		margin-top: 7px;
		height: 4px;
		background: #d9e2cf;
		border-radius: 3px;
		overflow: hidden;
	}
	.score-track > span {
		display: block;
		height: 100%;
		background: #7da46a;
		transition: width 0.18s ease;
	}
	.score.all-good {
		background: #e2efcc;
		border-color: #b2ca8e;
	}
	.score.all-good strong {
		color: #438052;
	}
	.score.stale {
		opacity: 0.65;
	}
	.score small {
		display: block;
		margin-top: 5px;
		font-size: 9px;
		color: #78845f;
	}
	.case-queue {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 5px;
		margin-bottom: 12px;
	}
	.case-queue button {
		display: flex;
		align-items: center;
		gap: 7px;
		text-align: left;
		min-width: 0;
		min-height: 36px;
		border: 1px solid #d5dfd0;
		border-radius: 5px;
		background: #f9fbf4;
		color: #73856f;
		padding: 6px 7px;
		font-size: 9px;
		line-height: 1.35;
	}
	.case-queue button > span:last-child {
		overflow-wrap: anywhere;
	}
	.case-person {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		flex: 0 0 20px;
		border: 1px solid #dde5d5;
		border-radius: 5px;
		color: #9aaa8c;
		font: 9px monospace;
	}
	.case-queue .active {
		border-color: #7eab8e;
		box-shadow: inset 0 0 0 1px #94b8a077;
	}
	.case-queue .passed {
		background: #f0f6e6;
	}
	.case-queue .passed .case-person {
		color: #5c8a47;
		background: #deedcb;
		border-color: #c9dbad;
	}
	.case-queue .failed {
		background: #f7f1e5;
	}
	.case-queue .failed .case-person {
		color: #a27341;
		background: #efe3cb;
		border-color: #dfc9a9;
	}
	.case-queue button:disabled {
		color: #84917c;
	}
	.request-card {
		border: 1px solid #ccdacc;
		border-radius: 8px;
		background: #fafcf6;
		padding: 13px;
		box-shadow: 0 4px 12px #25452c05;
	}
	.request-card.arriving {
		animation: arrive 0.23s ease-out both;
	}
	.request-heading {
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 32px;
		height: 34px;
		flex: 0 0 32px;
		background: #dcebcf;
		color: #557f4c;
		border-radius: 8px;
		font-size: 17px;
		font-weight: 750;
	}
	.request-heading > div {
		min-width: 0;
	}
	.request-heading h3 {
		font-size: 12px;
		margin: 0 0 3px;
		line-height: 1.25;
	}
	.request-heading > div > span {
		display: block;
		color: #81917a;
		font-size: 8px;
		line-height: 1.35;
	}
	.request-heading b {
		font-weight: 400;
		margin: 0 3px;
	}
	.http-status {
		align-self: start;
		margin-left: auto;
		font: 9px monospace;
		padding: 4px 6px;
		color: #498368;
		background: #e4efdc;
		border: 1px solid #d2dfc7;
		border-radius: 4px;
	}
	.http-status.bad {
		color: #9b6f3b;
		border-color: #e1d2ac;
		background: #f2e9d4;
	}
	.request-brief {
		font-size: 10px;
		color: #6c7b64;
		line-height: 1.6;
		margin: 11px 0;
	}
	.request-data {
		margin: 0;
		display: grid;
		gap: 5px;
		border-top: 1px solid #e1e8da;
		padding-top: 9px;
	}
	.request-data > div {
		display: grid;
		grid-template-columns: 87px minmax(0, 1fr);
		gap: 7px;
		align-items: baseline;
	}
	.request-data dt {
		color: #8c9980;
		font-size: 9px;
	}
	.request-data dd {
		margin: 0;
		color: #536d51;
		font-size: 10px;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.request-data code {
		font:
			10px/1.6 Consolas,
			'SFMono-Regular',
			monospace;
	}
	.quoted-input {
		white-space: pre-wrap;
		background: #edf1e5;
		padding: 1px 3px;
		border-radius: 3px;
	}
	.step-now {
		font-size: 10px;
		line-height: 1.65;
		background: #e8f0df;
		padding: 10px;
		margin: 12px 0 0;
		border-left: 2px solid #91b57a;
		color: #54724b;
	}
	.step-now > span {
		display: block;
		font: 7px/1.5 monospace;
		letter-spacing: 0.7px;
		color: #779565;
		margin-bottom: 4px;
	}
	.case-feedback {
		padding: 10px 11px;
		margin: 12px -1px 0;
		border-radius: 5px;
		border: 1px solid #dbcaac;
		background: #f2ecde;
		color: #80643d;
	}
	.case-feedback > div {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 10px;
	}
	.case-feedback > div > span {
		display: grid;
		place-items: center;
		width: 15px;
		height: 15px;
		border: 1px solid #bca172;
		border-radius: 50%;
		font:
			10px Georgia,
			serif;
	}
	.case-feedback p {
		font-size: 10px;
		line-height: 1.7;
		margin: 6px 0 0;
	}
	.case-feedback small {
		display: block;
		margin-top: 6px;
		font-size: 9px;
		opacity: 0.8;
	}
	.case-feedback.passed {
		border-color: #c6d7ad;
		background: #eaf2df;
		color: #526f43;
	}
	.case-feedback.passed > div > span {
		border-color: #a1ba85;
	}
	.case-feedback.old {
		background: #efeee4;
		border-color: #d7d5be;
		color: #85816d;
	}
	.start-prompt {
		font-size: 10px;
		color: #8a957b;
		margin: 12px 0 0;
		padding-top: 10px;
		border-top: 1px dashed #d4dec8;
	}
	.single-test {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		width: 100%;
		margin-top: 12px;
		padding: 7px 0 0;
		border: 0;
		border-top: 1px solid #e1e8da;
		background: none;
		color: #64836c;
		font-size: 10px;
		text-align: left;
	}
	.single-test:hover {
		color: #117669;
	}
	.trace-detail,
	.data-detail {
		margin-top: 9px;
		border: 1px solid #d5dfce;
		background: #f6f9ef;
		border-radius: 6px;
		overflow: hidden;
	}
	.trace-detail > summary,
	.data-detail > summary {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 10px 11px;
		color: #5d795f;
		font-size: 10px;
		font-weight: 600;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.trace-detail > summary > span,
	.data-detail > summary > span {
		font-size: 17px;
		font-weight: 400;
		color: #93a582;
		line-height: 1;
	}
	details[open] > summary > span {
		transform: rotate(45deg);
	}
	.trace-intro,
	.stale-trace {
		font-size: 10px;
		color: #7f8c72;
		padding: 0 11px;
		margin: 0 0 8px;
	}
	.trace-detail ol {
		list-style: none;
		padding: 0 7px 7px;
		margin: 0;
	}
	.trace-detail li + li {
		margin-top: 3px;
	}
	.trace-detail li button {
		display: flex;
		gap: 9px;
		align-items: center;
		width: 100%;
		text-align: left;
		border: 1px solid transparent;
		border-radius: 4px;
		background: #edf2e4;
		color: #657b59;
		padding: 6px 8px;
	}
	.trace-detail button > span {
		font-size: 11px;
		width: 11px;
		flex: 0 0 11px;
		text-align: center;
		color: #93a67b;
	}
	.trace-detail button strong {
		display: block;
		font-size: 9px;
		font-weight: 600;
	}
	.trace-detail button small {
		display: block;
		font-size: 8px;
		color: #90a07e;
		margin-top: 2px;
	}
	.trace-detail button.selected {
		border-color: #93af82;
		background: #e0edcf;
	}
	.trace-detail button.skipped {
		background: #f1f2e9;
		color: #9ca38e;
	}
	.data-content {
		padding: 0 10px 11px;
	}
	.data-content h4 {
		font-size: 10px;
		color: #567555;
		margin: 12px 0 6px;
	}
	.data-content pre,
	.full-source pre {
		max-width: 100%;
		overflow: auto;
		padding: 10px;
		margin: 0;
		background: #e9efdf;
		border-radius: 4px;
		color: #56714e;
		font:
			10px/1.65 Consolas,
			'SFMono-Regular',
			monospace;
	}
	.data-content pre {
		max-height: 230px;
	}
	.id-list {
		color: #91a07d;
		font-size: 9px;
		margin: 0 0 5px;
	}
	.expected {
		font-size: 10px;
		line-height: 1.7;
		color: #718263;
		margin: 0;
	}
	.fresh-start {
		color: #91a084;
		font-size: 9px;
		line-height: 1.6;
		margin: 10px 0 0;
	}
	.mission-win {
		display: flex;
		align-items: center;
		gap: 20px;
		border: 1px solid #adc58d;
		border-radius: 9px;
		background: #e4efce;
		padding: 22px;
		margin-top: 24px;
	}
	.win-badge {
		display: grid;
		place-items: center;
		width: 44px;
		height: 48px;
		flex: 0 0 44px;
		border: 1px solid #aac68b;
		background: #d0e4b1;
		color: #5c8545;
		font-size: 26px;
		border-radius: 9px;
	}
	.mission-win .eyebrow {
		color: #7b9756;
		font-size: 8px;
	}
	.mission-win h2 {
		font-size: 18px;
		line-height: 1.3;
		margin-bottom: 5px;
	}
	.mission-win p:last-child {
		color: #72845b;
		font-size: 11px;
		margin: 0;
	}
	.next-mission {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 17px;
		flex-shrink: 0;
		margin-left: auto;
		border: 1px solid #3c7955;
		background: #3f7955;
		color: #f1f6e3;
		border-radius: 6px;
		padding: 11px 14px;
		font-size: 11px;
		font-weight: 600;
		text-decoration: none;
	}
	.next-mission:hover {
		background: #316848;
	}
	.learn-more {
		margin-top: 24px;
		border: 1px solid var(--line);
		background: #f8faf3;
		border-radius: 7px;
	}
	.learn-more > summary {
		padding: 13px 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 11px;
		font-weight: 650;
		list-style: none;
	}
	.learn-more > summary > span {
		color: #90a580;
		font-size: 19px;
		line-height: 1;
		font-weight: 400;
	}
	.learn-more > div {
		padding: 0 16px 16px;
		font-size: 11px;
		line-height: 1.8;
		color: #74846b;
	}
	.learn-more p {
		max-width: 900px;
		margin-bottom: 9px;
	}
	.full-source {
		margin: 12px 0;
	}
	.full-source summary {
		padding: 7px 0;
		font-size: 10px;
	}
	.full-source pre {
		font-size: 11px;
	}
	.lesson-links {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 25px;
		color: var(--teal);
		margin-top: 13px;
	}
	footer {
		display: flex;
		justify-content: space-between;
		gap: 20px;
		border-top: 1px solid var(--line);
		margin-top: 25px;
		padding: 20px 0 30px;
		font-size: 10px;
		color: #8b9a7d;
	}
	footer a {
		color: #668c75;
		text-decoration: none;
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
	@keyframes pulse {
		50% {
			box-shadow: 0 0 0 7px #d7e9dd88;
		}
	}
	@keyframes arrive {
		from {
			opacity: 0.6;
			transform: translateY(5px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@media (max-width: 1100px) {
		.topbar,
		main {
			width: calc(100% - 42px);
		}
		.workbench {
			grid-template-columns: minmax(0, 1fr) 310px;
			gap: 19px;
		}
		.mission-tools {
			width: 180px;
		}
		.intro {
			gap: 20px;
		}
		.mission-tabs button {
			min-width: 95px;
			padding: 9px 10px;
		}
	}
	@media (max-width: 900px) {
		.workbench {
			grid-template-columns: 1fr;
			gap: 25px;
		}
		.test-panel {
			position: static;
		}
		.test-column {
			border-top: 1px solid var(--line);
			padding-top: 23px;
		}
		.case-queue {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		.mission {
			grid-template-columns: auto minmax(0, 1fr);
		}
		.mission-tools {
			grid-column: 2;
			width: 100%;
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			justify-content: space-between;
			gap: 8px 20px;
		}
		.contract {
			width: auto;
			text-align: left;
			max-width: 100%;
		}
		.contract ul {
			max-width: 600px;
		}
		.intro {
			flex-wrap: wrap;
		}
		.campaign {
			display: flex;
			width: 100%;
			align-items: center;
			flex-direction: row-reverse;
			justify-content: space-between;
			gap: 15px;
		}
		.campaign > span {
			margin: 0;
			font-size: 9px;
		}
		.mission-win {
			flex-wrap: wrap;
		}
		.next-mission {
			margin-left: 64px;
		}
		.mission-win > div {
			flex: 1;
		}
	}
	@media (max-width: 520px) {
		.topbar,
		main {
			width: calc(100% - 28px);
		}
		.topbar {
			min-height: 59px;
			gap: 12px;
		}
		.brand {
			font-size: 16px;
			gap: 6px;
		}
		.brand > span:first-child {
			width: 25px;
			height: 25px;
			font-size: 11px;
		}
		.topbar nav {
			gap: 11px;
			font-size: 9px;
		}
		.topbar nav a:first-child {
			max-width: 86px;
			text-align: right;
		}
		.intro {
			padding: 22px 0 19px;
			gap: 18px;
		}
		h1 {
			font-size: 36px;
		}
		.intro > div > p:last-child {
			font-size: 11px;
		}
		.campaign {
			display: block;
		}
		.campaign > span {
			text-align: left;
			margin-bottom: 8px;
		}
		.mission-tabs {
			gap: 6px;
		}
		.mission-tabs button {
			min-width: 0;
			flex: 1;
			padding: 8px;
			font-size: 10px;
			grid-template-columns: 1fr;
			gap: 1px;
		}
		.mission-tabs button > span {
			grid-row: auto;
			font-size: 17px;
		}
		.mission-tabs small {
			font-size: 6px;
			letter-spacing: 0.7px;
		}
		.mission {
			padding: 15px 13px;
			gap: 11px;
			margin-bottom: 20px;
		}
		.issue-icon {
			width: 25px;
			height: 29px;
			font-size: 18px;
		}
		.mission h2 {
			font-size: 17px;
		}
		.mission-copy > p:not(.eyebrow),
		.mission-copy > strong {
			font-size: 10px;
		}
		.mission-tools {
			grid-column: 1/-1;
		}
		.hint {
			grid-column: 1/-1;
			font-size: 10px;
		}
		.section-heading h2 {
			font-size: 17px;
		}
		.section-heading .text-button {
			font-size: 9px;
		}
		.editor-intro {
			font-size: 10px;
		}
		.case-queue {
			grid-template-columns: 1fr 1fr;
		}
		.case-queue button {
			min-height: 40px;
			font-size: 10px;
		}
		.request-card {
			padding: 13px;
		}
		.request-heading h3 {
			font-size: 13px;
		}
		.request-heading > div > span {
			font-size: 9px;
		}
		.request-brief,
		.case-feedback p {
			font-size: 11px;
		}
		.request-data dt {
			font-size: 10px;
		}
		.request-data dd,
		.request-data code {
			font-size: 11px;
		}
		.request-data > div {
			grid-template-columns: 92px minmax(0, 1fr);
		}
		.single-test {
			padding-top: 10px;
			padding-bottom: 3px;
			font-size: 11px;
		}
		.trace-detail > summary,
		.data-detail > summary {
			padding: 12px;
			font-size: 11px;
		}
		.trace-detail button strong {
			font-size: 10px;
		}
		.mission-win {
			padding: 17px 14px;
			gap: 13px;
		}
		.win-badge {
			width: 36px;
			height: 40px;
			flex-basis: 36px;
			font-size: 22px;
		}
		.mission-win h2 {
			font-size: 16px;
		}
		.next-mission {
			margin-left: 49px;
		}
		.learn-more > summary {
			font-size: 10px;
			padding: 12px;
		}
		.learn-more > div {
			padding: 0 12px 12px;
		}
		footer {
			align-items: start;
			font-size: 9px;
			gap: 15px;
		}
		footer > span {
			max-width: 125px;
			text-align: right;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.server-led.working,
		.request-card.arriving {
			animation: none;
		}
		.score-track > span {
			transition: none;
		}
	}
</style>
