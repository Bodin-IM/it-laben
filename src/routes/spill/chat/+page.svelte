<script>
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { onMount, onDestroy } from 'svelte';
	import InteractiveCode from '#lib/components/InteractiveCode.svelte';
	import ChatGameBoard from '#lib/components/ChatGameBoard.svelte';
	import {
		LEVELS,
		MAX_ACTIONS,
		CODE_CONTEXTS,
		actionsFor,
		initialState,
		planAttempt,
		codeLines
	} from '#lib/chatSpill.js';

	/** @typedef {import('#lib/chatSpill.js').ActionId} ActionId */
	/** @typedef {import('#lib/chatSpill.js').Side} Side */
	/** @typedef {import('#lib/chatSpill.js').Step} Step */
	/** @typedef {import('#lib/chatSpill.js').Result} Result */
	/** @typedef {{uid:number, actionId:ActionId}} ProgramItem */
	/** @typedef {{kind:'new', actionId:ActionId} | {kind:'move', uid:number}} Dragged */

	let levelIndex = $state(0);
	let unlocked = $state(0);
	let completed = $state([false, false, false]);
	/** @type {ProgramItem[]} */
	let program = $state([]);
	let nextUid = 1;
	/** @type {number|null} */
	let selectedUid = $state(null);
	/** @type {ActionId} */
	let previewActionId = $state('ada-post');
	/** @type {Side} */
	let side = $state('frontend');
	/** @type {Step[]} */
	let trace = $state([]);
	let traceIndex = $state(-1);
	/** @type {Result|null} */
	let result = $state(null);
	/** @type {Result|null} */
	let pendingResult = null;
	let running = $state(false);
	let paused = $state(false);
	let delay = $state(900);
	let revision = $state(0);
	let hintOpen = $state(false);
	let dataOpen = $state(false);
	let announcement = $state('');
	let reducedMotion = $state(false);
	/** @type {Dragged|null} */
	let dragged = $state(null);
	let dragOver = $state(-1);
	/** @type {ReturnType<typeof setTimeout>|null} */
	let timer = null;
	/** @type {HTMLElement|undefined} */
	let boardSection = $state();
	/** @type {HTMLElement|undefined} */
	let codeSection = $state();
	/** @type {HTMLElement|undefined} */
	let missionHeading = $state();

	let level = $derived(LEVELS[levelIndex]);
	let cards = $derived(actionsFor(level.id));
	let current = $derived(traceIndex >= 0 ? trace[traceIndex] : null);
	let lab = $derived(current ?? initialState(level.id));
	let selectedCard = $derived(cards.find((card) => card.id === previewActionId) ?? cards[0]);
	let selectedIndex = $derived(program.findIndex((item) => item.uid === selectedUid));
	let sameCodeEvent = $derived(
		current !== null &&
			current.actionId === selectedCard.id &&
			current.actionIndex === selectedIndex
	);
	let lines = $derived(codeLines(level.id, selectedCard.id, side));
	let solvedCount = $derived(completed.filter(Boolean).length);
	let reviewing = $derived(!running && result !== null && traceIndex < trace.length - 1);
	let atCapacity = $derived(program.length >= MAX_ACTIONS);

	onMount(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		function update() {
			reducedMotion = media.matches;
		}
		update();
		media.addEventListener('change', update);
		return () => media.removeEventListener('change', update);
	});
	onDestroy(clearTimer);

	function clearTimer() {
		if (timer !== null) clearTimeout(timer);
		timer = null;
	}

	function resetAttempt() {
		clearTimer();
		running = false;
		paused = false;
		trace = [];
		traceIndex = -1;
		result = null;
		pendingResult = null;
		revision += 1;
	}

	/** @param {ActionId} actionId @param {number} [at] */
	function addCard(actionId, at = program.length) {
		if (running || atCapacity) return;
		resetAttempt();
		const item = { uid: nextUid++, actionId };
		program = [...program.slice(0, at), item, ...program.slice(at)];
		selectedUid = item.uid;
		previewActionId = actionId;
		side = 'frontend';
		announcement = `${cardFor(actionId).title} lagt til som handling ${at + 1}.`;
	}

	/** @param {ActionId} id */
	function cardFor(id) {
		return cards.find((card) => card.id === id) ?? cards[0];
	}

	/** @param {number} uid */
	function removeCard(uid) {
		if (running) return;
		const index = program.findIndex((item) => item.uid === uid);
		resetAttempt();
		program = program.filter((item) => item.uid !== uid);
		if (selectedUid === uid) {
			const next = program[Math.min(index, program.length - 1)];
			selectedUid = next?.uid ?? null;
			previewActionId = next?.actionId ?? cards[0].id;
		}
		announcement = `Handling ${index + 1} fjernet. Test den endrede løsningen fra start.`;
	}

	/** @param {number} from @param {number} to */
	function moveCard(from, to) {
		if (
			running ||
			from < 0 ||
			to < 0 ||
			from >= program.length ||
			to >= program.length ||
			from === to
		)
			return;
		resetAttempt();
		const next = [...program];
		const [item] = next.splice(from, 1);
		next.splice(to, 0, item);
		program = next;
		selectedUid = item.uid;
		previewActionId = item.actionId;
		announcement = `Handling flyttet fra plass ${from + 1} til ${to + 1}.`;
	}

	function clearProgram() {
		if (running) return;
		resetAttempt();
		program = [];
		selectedUid = null;
		previewActionId = cards[0].id;
		announcement = 'Handlingsrekken er tom. Brettet viser starttilstanden.';
	}

	/** @param {ActionId} actionId @param {number|null} [uid] @param {boolean} [scroll] */
	function inspectCard(actionId, uid = null, scroll = false) {
		pauseToInspect();
		previewActionId = actionId;
		selectedUid = uid;
		side = 'frontend';
		revision += 1;
		if (scroll)
			codeSection?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
	}

	/** @param {Side} next */
	function changeSide(next) {
		pauseToInspect();
		side = next;
		revision += 1;
	}

	function pauseToInspect() {
		if (!running || paused) return;
		clearTimer();
		paused = true;
		announcement = 'Avspillingen er satt på pause. Du kan undersøke koden.';
	}

	function schedule() {
		clearTimer();
		if (running && !paused) timer = setTimeout(advance, delay);
	}

	function advance() {
		clearTimer();
		if (!running || traceIndex + 1 >= trace.length) return;
		traceIndex += 1;
		const next = trace[traceIndex];
		selectedUid = program[next.actionIndex]?.uid ?? null;
		previewActionId = next.actionId;
		side = next.side;
		revision += 1;
		if (traceIndex === trace.length - 1) complete();
		else schedule();
	}

	function complete() {
		clearTimer();
		running = false;
		paused = false;
		result = pendingResult;
		if (result?.success) {
			completed[levelIndex] = true;
			unlocked = Math.max(unlocked, Math.min(levelIndex + 1, LEVELS.length - 1));
		}
		announcement = result ? `${result.title} ${result.explanation}` : '';
	}

	function testProgram() {
		if (running || !program.length) return;
		const attempt = planAttempt(
			level.id,
			program.map((item) => item.actionId)
		);
		resetAttempt();
		trace = attempt.steps;
		pendingResult = attempt.result;
		running = true;
		announcement = 'Forsøket starter fra brettets opprinnelige data.';
		advance();
		boardSection?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
	}

	function togglePause() {
		if (!running) return;
		if (!paused) pauseToInspect();
		else {
			paused = false;
			schedule();
			announcement = 'Avspillingen fortsetter.';
		}
	}

	function finishPlayback() {
		if (!running) return;
		clearTimer();
		traceIndex = trace.length - 1;
		const last = trace[traceIndex];
		selectedUid = program[last.actionIndex]?.uid ?? null;
		previewActionId = last.actionId;
		side = last.side;
		revision += 1;
		complete();
	}

	/** @param {number} index */
	function reviewStep(index) {
		if (running || index < 0 || index >= trace.length) return;
		traceIndex = index;
		const entry = trace[index];
		selectedUid = program[entry.actionIndex]?.uid ?? null;
		previewActionId = entry.actionId;
		side = entry.side;
		revision += 1;
	}

	/** @param {number} index */
	function changeLevel(index) {
		if (running || index < 0 || index > unlocked || index >= LEVELS.length) return;
		resetAttempt();
		levelIndex = index;
		program = [];
		selectedUid = null;
		previewActionId = 'ada-post';
		side = 'frontend';
		hintOpen = false;
		dataOpen = false;
		announcement = `Oppdrag ${index + 1}: ${LEVELS[index].title}. Brettet viser starttilstanden.`;
		missionHeading?.focus({ preventScroll: true });
	}

	function restartGame() {
		if (running) return;
		completed = [false, false, false];
		unlocked = 0;
		changeLevel(0);
	}

	/** @param {DragEvent} event @param {Dragged} payload */
	function startDrag(event, payload) {
		if (running) {
			event.preventDefault();
			return;
		}
		dragged = payload;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = payload.kind === 'new' ? 'copy' : 'move';
			event.dataTransfer.setData(
				'text/plain',
				payload.kind === 'new' ? payload.actionId : String(payload.uid)
			);
		}
	}

	/** @param {DragEvent} event @param {number} index */
	function allowDrop(event, index) {
		if (running || !dragged || (dragged.kind === 'new' && atCapacity)) return;
		event.preventDefault();
		event.stopPropagation();
		dragOver = index;
		if (event.dataTransfer)
			event.dataTransfer.dropEffect = dragged.kind === 'new' ? 'copy' : 'move';
	}

	/** @param {DragEvent} event @param {number} index */
	function dropCard(event, index) {
		if (running || !dragged) return;
		event.preventDefault();
		event.stopPropagation();
		const payload = dragged;
		dragged = null;
		dragOver = -1;
		if (payload.kind === 'new') addCard(payload.actionId, Math.min(index, program.length));
		else
			moveCard(
				program.findIndex((item) => item.uid === payload.uid),
				Math.min(index, program.length - 1)
			);
	}

	function endDrag() {
		dragged = null;
		dragOver = -1;
	}
	/** @param {unknown} value */
	function json(value) {
		return JSON.stringify(value, null, 2);
	}
	/** @param {Step['phase']} phase */
	function phaseName(phase) {
		return { request: 'Request', server: 'Backend', response: 'Response', client: 'Nettleser' }[
			phase
		];
	}
</script>

<svelte:head>
	<title>To nettlesere, én chat – Spill i IT-laben</title>
	<meta
		name="description"
		content="Et kodepuslespill med tre oppdrag. Bygg en handlingsrekke, følg POST og GET, og få Adas melding fram til Noah."
	/>
</svelte:head>

<div class="spill-side">
	<header class="sidehode">
		<a class="logo" href="/"
			><span class="logoikon" aria-hidden="true">IT</span>IT-laben<span class="punkt">.</span></a
		>
		<a class="tilbake" href="/#spill">← Spill og utfordringer</a>
		<div class="theme-control"><ThemeToggle /></div>
	</header>
	<main>
		<div class="spillintro">
			<div>
				<p class="overlinje"><span aria-hidden="true">◆</span> KODEPUSLESPILL / 01</p>
				<h1>To nettlesere, <em>én chat.</em></h1>
				<p>Bygg løsningen. Test den. Finn ut hva som skjer.</p>
			</div>
			<div class="framdrift">
				<span>{solvedCount} av 3 oppdrag løst</span>
				<div class="nivavalg" role="group" aria-label="Velg oppdrag">
					{#each LEVELS as item, index}<button
							type="button"
							class:valgt={index === levelIndex}
							class:lost={completed[index]}
							disabled={running || index > unlocked}
							aria-pressed={index === levelIndex}
							aria-label={`Oppdrag ${index + 1}: ${item.title}${completed[index] ? ' · løst' : index > unlocked ? ' · låst' : ''}`}
							onclick={() => changeLevel(index)}
							><span>{completed[index] ? '✓' : String(index + 1).padStart(2, '0')}</span><small
								>{index > unlocked ? 'LÅST' : completed[index] ? 'LØST' : 'OPPDRAG'}</small
							></button
						>{/each}
				</div>
			</div>
		</div>

		<section class="oppdrag" aria-labelledby="oppdragtittel">
			<div class="oppdragsnummer" aria-hidden="true">{String(level.number).padStart(2, '0')}</div>
			<div class="oppdragstekst">
				<p class="overlinje">DITT OPPDRAG</p>
				<h2 id="oppdragtittel" tabindex="-1" bind:this={missionHeading}>{level.title}</h2>
				<p>{level.brief}</p>
				<div class="mal"><span aria-hidden="true">◎</span><strong>{level.goal}</strong></div>
			</div>
			<button
				type="button"
				class="hintknapp"
				aria-expanded={hintOpen}
				aria-controls="oppdraghint"
				onclick={() => (hintOpen = !hintOpen)}
				>{hintOpen ? 'Skjul hint' : 'Et lite hint'} <span aria-hidden="true">?</span></button
			>
			{#if hintOpen}<p id="oppdraghint" class="hinttekst">{level.hint}</p>{/if}
		</section>

		<section class="spillebrett" aria-labelledby="brettittel" bind:this={boardSection}>
			<div class="brettopp">
				<h2 id="brettittel">
					<span class="statuslys" class:spiller={running && !paused} aria-hidden="true"
					></span>{running
						? paused
							? 'Forsøket er pauset'
							: 'Tester løsningen din'
						: reviewing
							? 'Tilbakeblikk på forsøket'
							: result
								? 'Slik endte forsøket'
								: 'Slik starter brettet'}
				</h2>
				<span class="simuleringsmerke">LOKAL SIMULERING · TO NETTLESERE</span>
			</div>
			<ChatGameBoard {lab} step={current} target={level.target} {running} {paused} {delay} />
			<div class="hendelse" class:aktiv={running}>
				<div class="hendelsesikon" aria-hidden="true">
					{current
						? current.phase === 'request'
							? '↗'
							: current.phase === 'response'
								? '↙'
								: current.phase === 'server'
									? '{}'
									: '▣'
						: '◇'}
				</div>
				<div>
					<strong
						>{current?.title ??
							'Se på starttilstanden, og bygg en handlingsrekke nedenfor.'}</strong
					>
					<p>
						{current?.explanation ??
							'Hvert kort kjører i nettleseren som står på kortet. Ada og Noah har hver sin kopi av meldingene.'}
					</p>
				</div>
				{#if current}<span class="hendelsestall"
						>Handling {current.actionIndex + 1}/{program.length}<small
							>{phaseName(current.phase)}{current.httpStatus
								? ` · ${current.httpStatus}`
								: ''}</small
						></span
					>{/if}
			</div>
			{#if running}<div class="avspilling">
					<div
						class="avspillingsspor"
						role="progressbar"
						aria-label="Avspilling av forsøket"
						aria-valuemin="0"
						aria-valuemax={trace.length}
						aria-valuenow={traceIndex + 1}
					>
						<span style:width={`${((traceIndex + 1) / trace.length) * 100}%`}></span>
					</div>
					<button type="button" class="sekundaerknapp" onclick={togglePause}
						>{paused ? 'Fortsett' : 'Pause'}</button
					>{#if paused}<button type="button" class="tekstknapp" onclick={advance}
							>Én hendelse →</button
						>{/if}<button type="button" class="tekstknapp" onclick={finishPlayback}
						>Vis resultat nå</button
					><button
						type="button"
						class="tekstknapp"
						onclick={() => {
							resetAttempt();
							announcement = 'Forsøket er avbrutt. Brettet viser starttilstanden.';
						}}>Avbryt</button
					>
				</div>{/if}
			{#if reviewing}<div class="tilbakeblikk">
					<span
						>Viser hendelse {traceIndex + 1} av {trace.length}. Vurderingen nedenfor gjelder hele
						forsøket.</span
					><button type="button" class="tekstknapp" onclick={() => reviewStep(trace.length - 1)}
						>Vis sluttresultatet →</button
					>
				</div>{/if}
		</section>

		{#if result}
			<section
				class="resultat"
				class:seier={result.success}
				aria-labelledby="resultattittel"
				data-testid="game-result"
				data-success={result.success}
			>
				<div class="resultatsymbol" aria-hidden="true">{result.success ? '✓' : '↻'}</div>
				<div class="resultatinnhold">
					<p class="overlinje">
						{result.success ? 'LØSNINGEN DIN VIRKER' : 'UNDERSØK OG PRØV IGJEN'}
					</p>
					<h2 id="resultattittel">{result.title}</h2>
					<p>{result.explanation}</p>
					<ul class="malsjekker">
						{#each result.checks as check}<li class:oppfylt={check.passed}>
								<span aria-hidden="true">{check.passed ? '✓' : '○'}</span><span class="sr-only"
									>{check.passed ? 'Oppfylt:' : 'Ikke oppfylt:'}</span
								>{check.label}
							</li>{/each}
					</ul>
					{#if result.success}<p class="laring">{result.lesson}</p>{/if}
				</div>
				{#if result.success}<div class="videreknapper">
						{#if levelIndex < LEVELS.length - 1}<button
								type="button"
								class="hovedknapp"
								onclick={() => changeLevel(levelIndex + 1)}
								>Neste oppdrag <span aria-hidden="true">→</span></button
							>{:else}<span class="allelost">◆ Alle tre oppdrag er løst</span><button
								type="button"
								class="hovedknapp"
								onclick={restartGame}>Spill på nytt <span aria-hidden="true">↺</span></button
							><a href="/chatrom/">Bygg videre med sessions og sletting ↗</a>{/if}
					</div>{/if}
			</section>
		{/if}

		<section class="byggelosning" aria-labelledby="byggtittel">
			<div class="seksjonstopp">
				<div>
					<p class="overlinje">DU BESTEMMER REKKEFØLGEN</p>
					<h2 id="byggtittel">Bygg løsningen din</h2>
				</div>
				<span class="plassmerking">{program.length}/{MAX_ACTIONS} handlinger</span>
			</div>
			<div class="byggegrid">
				<div class="kortverktoy">
					<h3>Velg kodekort <span>Legg til eller dra</span></h3>
					<div class="kortliste" role="list">
						{#each cards as card}<div
								class="kodekort"
								class:valgt={selectedUid === null && selectedCard.id === card.id}
								class:post={card.method === 'POST'}
								role="listitem"
								draggable={!running && !atCapacity}
								ondragstart={(event) => startDrag(event, { kind: 'new', actionId: card.id })}
								ondragend={endDrag}
								data-card-id={card.id}
							>
								<button
									type="button"
									class="leggtil"
									disabled={running || atCapacity}
									aria-label={`Legg til: ${card.title}`}
									onclick={() => addCard(card.id)}
									><span class="korttopp"
										><span class="aktor" class:noah={card.actor === 'noah'}
											>{card.actor === 'ada' ? 'ADA' : 'NOAH'}</span
										><span class="metode">{card.method}</span><span
											class="plusstegn"
											aria-hidden="true">+</span
										></span
									><strong>{card.title}</strong><code>{card.call}</code></button
								><button
									type="button"
									class="sekode"
									onclick={() => inspectCard(card.id, null, true)}
									aria-label={`Se kode: ${card.title}`}
									>Se koden <span aria-hidden="true">↗</span></button
								>
							</div>{/each}
					</div>
				</div>
				<div class="programbygger">
					<div class="programhode">
						<h3>Din handlingsrekke <span>Kjøres fra toppen</span></h3>
						<button
							type="button"
							class="tekstknapp"
							disabled={running || program.length === 0}
							onclick={clearProgram}>Tøm rekken</button
						>
					</div>
					<ol class="programliste" aria-label="Din handlingsrekke">
						{#each program as item, index (item.uid)}{@const card = cardFor(item.actionId)}
							<li
								class:valgt={selectedUid === item.uid}
								class:kjorer={running && current?.actionIndex === index}
								class:slipp={dragOver === index}
								draggable={!running}
								ondragstart={(event) => startDrag(event, { kind: 'move', uid: item.uid })}
								ondragend={endDrag}
								ondragover={(event) => allowDrop(event, index)}
								ondrop={(event) => dropCard(event, index)}
								data-program-id={item.uid}
							>
								<span class="rekkefolgenummer" aria-hidden="true">{index + 1}</span><button
									type="button"
									class="programkort"
									aria-label={`Undersøk handling ${index + 1}: ${card.title}`}
									onclick={() => inspectCard(item.actionId, item.uid)}
									><span class="programetikett"
										><span class="aktor" class:noah={card.actor === 'noah'}
											>{card.actor === 'ada' ? 'ADA' : 'NOAH'}</span
										><span>{card.method} · {card.room}</span></span
									><code>{card.call}</code></button
								>
								<div class="kortkontroller">
									<button
										type="button"
										disabled={running || index === 0}
										aria-label={`Flytt handling ${index + 1} opp`}
										onclick={() => moveCard(index, index - 1)}>↑</button
									><button
										type="button"
										disabled={running || index === program.length - 1}
										aria-label={`Flytt handling ${index + 1} ned`}
										onclick={() => moveCard(index, index + 1)}>↓</button
									><button
										type="button"
										class="fjern"
										disabled={running}
										aria-label={`Fjern handling ${index + 1}: ${card.title}`}
										onclick={() => removeCard(item.uid)}>×</button
									>
								</div>
							</li>{/each}
					</ol>
					{#if !atCapacity}<div
							class="droppsone"
							class:slipp={dragOver === program.length}
							role="group"
							aria-label="Legg et kodekort sist i rekken"
							ondragover={(event) => allowDrop(event, program.length)}
							ondrop={(event) => dropCard(event, program.length)}
						>
							<span aria-hidden="true">+</span>
							<p>
								{program.length
									? 'Plass til en handling til'
									: 'Hvilken handling vil du prøve først?'}<small
									>{program.length
										? 'Velg et kort, eller dra det hit.'
										: 'Legg til et kodekort. Du kan flytte og fjerne kortene etterpå.'}</small
								>
							</p>
						</div>{:else}<p class="kapasitet">
							Rekken er full. Flytt eller fjern et kort før du legger til flere.
						</p>{/if}
					<div class="testomrade">
						<button
							type="button"
							class="testknapp"
							disabled={running || program.length === 0}
							onclick={testProgram}
							><span aria-hidden="true">▶</span>Test løsningen
							<span class="testpil" aria-hidden="true">→</span></button
						><label class="tempovalg"
							>Avspilling<select bind:value={delay} disabled={running}
								><option value={900}>Vanlig</option><option value={350}>Rask</option><option
									value={1500}>Rolig</option
								></select
							></label
						>
					</div>
					<p class="startregel">Hver test starter fra de samme dataene i dette oppdraget.</p>
				</div>
			</div>
		</section>

		<section class="kodeomrade" aria-labelledby="kodetittel" bind:this={codeSection}>
			<div class="seksjonstopp">
				<div>
					<p class="overlinje">KODEN BAK HANDLINGEN</p>
					<h2 id="kodetittel">{selectedCard.title}</h2>
				</div>
				<span class="kodekontekst"
					>{selectedUid === null ? 'Kodekort' : `Handling ${selectedIndex + 1}`} · {selectedCard.actor ===
					'ada'
						? 'Adas'
						: 'Noahs'} nettleser</span
				>
			</div>
			<p class="kodeintro">
				{selectedCard.description}
				<span
					>Klikk på en linje for å undersøke den. Det setter en pågående avspilling på pause.</span
				>
			</p>
			<InteractiveCode
				{lines}
				{side}
				onsidechange={changeSide}
				onexplain={pauseToInspect}
				activeSide={sameCodeEvent ? (current?.side ?? null) : null}
				activeLineIds={sameCodeEvent ? (current?.lineIds ?? []) : []}
				resetKey={`${level.id}-${previewActionId}-${selectedUid}-${revision}`}
				label={`${selectedCard.actor === 'ada' ? 'Ada' : 'Noah'} · ${selectedCard.method} /meldinger${selectedCard.method === 'GET' ? '?rom=' + selectedCard.room : ''}`}
			/>
			<p class="aktorforklaring">
				Handlingsrekken styrer denne simuleringen. Hvert kort kjører bare i sin egen nettleser.
				Begge nettleserne bruker samme backend.
			</p>
		</section>

		{#if trace.length > 0 && !running}<details class="tillegg historikk">
				<summary
					><span>Undersøk hendelsene i forsøket <small>{trace.length} hendelser</small></span><span
						aria-hidden="true">+</span
					></summary
				>
				<div class="historikkinnhold">
					<p>Velg en hendelse for å se dataene og koden på det tidspunktet.</p>
					<ol>
						{#each trace as entry, index}<li>
								<button
									type="button"
									class:valgt={traceIndex === index}
									aria-pressed={traceIndex === index}
									onclick={() => reviewStep(index)}
									><span>{index + 1}</span>
									<div>
										<strong>{entry.title}</strong><small
											>Handling {entry.actionIndex + 1} · {entry.actor === 'ada' ? 'Ada' : 'Noah'} · {entry.method}
											· {phaseName(entry.phase)}</small
										>
									</div>
									<span aria-hidden="true">↗</span></button
								>
							</li>{/each}
					</ol>
				</div>
			</details>{/if}

		<details class="tillegg" bind:open={dataOpen}>
			<summary
				><span>Se dataene som kode <small>Valgfritt</small></span><span aria-hidden="true">+</span
				></summary
			>
			<div class="datagrid">
				<section>
					<h3>Backend · alle rom</h3>
					<pre data-testid="game-server-data"><code>{json(lab.serverMessages)}</code></pre>
				</section>
				<section>
					<h3>Ada · {lab.ada.room}</h3>
					<pre data-testid="game-ada-data"><code>{json(lab.ada.messages)}</code></pre>
				</section>
				<section>
					<h3>Noah · {lab.noah.room}</h3>
					<pre data-testid="game-noah-data"><code>{json(lab.noah.messages)}</code></pre>
				</section>
				{#if current}<section class="requestdata">
						<h3>
							{current.method}
							{current.path}{current.httpStatus ? ` → ${current.httpStatus}` : ''}
						</h3>
						<div>
							<section>
								<h4>Request-body</h4>
								<pre><code
										>{current.requestBody === null
											? 'Ingen JSON-body'
											: json(current.requestBody)}</code
									></pre>
							</section>
							<section>
								<h4>Response-body</h4>
								<pre><code
										>{current.responseBody === null
											? 'Backend har ikke svart ennå'
											: json(current.responseBody)}</code
									></pre>
							</section>
						</div>
					</section>{/if}
			</div>
		</details>
		<details class="tillegg">
			<summary
				><span>Fra spillet til egen kode <small>Forkunnskaper og sammenheng</small></span><span
					aria-hidden="true">+</span
				></summary
			>
			<div class="forklarmer">
				<p>{CODE_CONTEXTS.frontend}</p>
				<p>{CODE_CONTEXTS.backend}</p>
				<p>
					Spillet kjører lokalt i nettleseren. Det sender ingen ekte requests og oppretter ingen
					brukerkontoer. Fremdriften varer mens denne siden er åpen. Du kan bruke hint og prøve så
					mange ganger du vil.
				</p>
				<div class="videre-lenker">
					<a href="/backend/">Utforsk frontend og backend ↗</a><a href="/chatrom/"
						>Koble til sessions og sletting ↗</a
					>
				</div>
			</div>
		</details>
		<footer>
			<a href="/#spill">← Flere ting å utforske i IT-laben</a><span
				>Prøv. Undersøk. Prøv igjen.</span
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
	.spill-side {
		--ink: var(--color-text);
		--teal: var(--color-accent);
		--muted: var(--color-text-muted);
		--line: var(--color-border);
		min-height: 100vh;
		color: var(--ink);
		font-family:
			Inter,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		font-size: var(--font-body);
		line-height: var(--leading-body);
		background: radial-gradient(ellipse at 90% 0%, var(--color-page-glow) 0, transparent 32%);
	}
	.spill-side * {
		box-sizing: border-box;
	}
	.sidehode,
	main {
		width: min(1240px, calc(100% - 64px));
		margin: 0 auto;
	}
	.sidehode {
		min-height: 76px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 18px;
		border-bottom: 1px solid var(--line);
	}
	a {
		color: var(--teal);
		text-underline-offset: 3px;
	}
	.logo {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 20px;
		font-weight: 760;
		text-decoration: none;
		color: var(--ink);
	}
	.logoikon {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		background: var(--color-brand);
		color: var(--color-on-brand);
		border-radius: 5px;
		font-size: var(--font-small);
	}
	.punkt {
		color: var(--teal);
		margin-left: -7px;
	}
	.tilbake {
		font-size: var(--font-small);
		text-decoration: none;
	}
	.tilbake:hover {
		text-decoration: underline;
	}
	.spillintro {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 30px;
		padding: 30px 0 25px;
	}
	.overlinje {
		margin: 0 0 7px;
		font-size: var(--font-meta);
		font-weight: 750;
		letter-spacing: 1.7px;
		color: var(--teal);
	}
	.overlinje > span {
		margin-right: 7px;
		font-size: var(--font-meta);
	}
	h1 {
		font-size: clamp(29px, 3.4vw, 43px);
		line-height: 1.17;
		letter-spacing: -1.5px;
		margin: 0;
		font-weight: 710;
	}
	h1 em {
		font-family: Georgia, serif;
		font-weight: 400;
		color: var(--teal);
	}
	.spillintro > div > p:last-child {
		margin: 10px 0 0;
		color: var(--color-text-muted);
		font-size: var(--font-body);
	}
	.framdrift {
		flex: 0 1 auto;
		min-width: 0;
		max-width: 100%;
	}
	.framdrift > span {
		display: block;
		text-align: right;
		font-size: var(--font-meta);
		color: var(--color-text-muted);
		margin-bottom: 8px;
	}
	.nivavalg {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
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
		opacity: 0.45;
	}
	button:focus-visible,
	a:focus-visible,
	select:focus-visible,
	summary:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.nivavalg button {
		width: 4.75rem;
		min-height: 58px;
		border: 1px solid var(--color-border);
		border-radius: 7px;
		color: var(--color-text-muted);
		background: var(--color-surface-soft);
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 3px;
	}
	.nivavalg button > span {
		font:
			600 17px ui-monospace,
			SFMono-Regular,
			Consolas,
			monospace;
	}
	.nivavalg small {
		font-size: var(--font-meta);
		font-weight: 700;
		letter-spacing: 1px;
	}
	.nivavalg button.valgt {
		border-color: var(--color-accent);
		background: var(--color-surface-active);
		color: var(--color-text);
		box-shadow: 0 0 0 2px var(--color-accent-soft);
	}
	.nivavalg button.lost {
		background: var(--color-success-soft);
		color: var(--color-success);
	}
	.oppdrag {
		display: grid;
		grid-template-columns: 52px minmax(0, 1fr) auto;
		gap: 0 19px;
		align-items: start;
		padding: 21px 23px;
		border: 1px solid var(--color-border);
		border-radius: 9px;
		background: var(--color-surface-soft);
	}
	.oppdragsnummer {
		width: 51px;
		height: 57px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		display: grid;
		place-items: center;
		background: var(--color-surface-soft);
		color: var(--color-text-muted);
		font:
			500 25px ui-monospace,
			SFMono-Regular,
			Consolas,
			monospace;
	}
	h2 {
		font-size: 22px;
		line-height: 1.3;
		letter-spacing: -0.45px;
		margin: 0;
	}
	.oppdragstekst .overlinje {
		margin-bottom: 4px;
		font-size: var(--font-meta);
	}
	.oppdragstekst > p:not(.overlinje) {
		font-size: var(--font-body);
		color: var(--color-text-muted);
		margin: 7px 0 0;
		max-width: 830px;
	}
	.mal {
		display: flex;
		align-items: baseline;
		gap: 8px;
		font-size: var(--font-body);
		margin-top: 10px;
		color: var(--color-text-muted);
	}
	.mal strong {
		font-weight: 630;
	}
	.mal > span {
		font-size: 18px;
	}
	.hintknapp {
		display: flex;
		align-items: center;
		gap: 9px;
		font-size: var(--font-small);
		color: var(--color-text-muted);
		border: 0;
		background: transparent;
		padding: 4px 0 8px 12px;
		white-space: nowrap;
	}
	.hintknapp > span {
		display: grid;
		place-items: center;
		width: 19px;
		height: 19px;
		border: 1px solid var(--color-border-strong);
		border-radius: 50%;
	}
	.hinttekst {
		grid-column: 2/-1;
		margin: 12px 0 0;
		font-size: var(--font-body);
		padding: 11px 14px;
		border-left: 3px solid var(--color-border-strong);
		background: var(--color-surface-soft);
		color: var(--color-text-muted);
	}
	.spillebrett {
		margin-top: 21px;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		background: var(--color-surface-soft);
		padding: 17px 19px 0;
		scroll-margin-top: 14px;
	}
	.brettopp {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: center;
		margin-bottom: 16px;
	}
	.brettopp h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: var(--font-small);
		letter-spacing: 0;
		font-weight: 650;
	}
	.statuslys {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-text-subtle);
	}
	.statuslys.spiller {
		background: var(--color-accent);
		box-shadow: 0 0 0 4px var(--color-border);
	}
	.simuleringsmerke {
		font-size: var(--font-meta);
		color: var(--color-text-muted);
		letter-spacing: 1px;
	}
	.hendelse {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		min-height: 91px;
		padding: 16px 0 15px;
	}
	.hendelsesikon {
		display: grid;
		place-items: center;
		flex: 0 0 29px;
		width: 29px;
		height: 29px;
		border: 1px solid var(--color-border);
		border-radius: 7px;
		background: var(--color-surface-soft);
		font-size: var(--font-body);
		color: var(--color-text-muted);
	}
	.hendelse > div:nth-child(2) {
		flex: 1;
		min-width: 0;
	}
	.hendelse strong {
		font-size: var(--font-small);
		font-weight: 650;
	}
	.hendelse p {
		margin: 4px 0 0;
		font-size: var(--font-body);
		line-height: var(--leading-body);
		color: var(--color-text-muted);
		max-width: 870px;
	}
	.hendelsestall {
		flex: 0 0 auto;
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			SFMono-Regular,
			Consolas,
			monospace;
		color: var(--color-text-muted);
		text-align: right;
		padding-top: 4px;
	}
	.hendelsestall small {
		display: block;
		font:
			var(--font-meta)/var(--leading-body) system-ui,
			sans-serif;
		margin-top: 5px;
		color: var(--color-text-muted);
	}
	.avspilling {
		border-top: 1px solid var(--color-border);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		padding: 12px 0;
	}
	.avspillingsspor {
		flex: 1 1 150px;
		height: 5px;
		background: var(--color-surface-soft);
		border-radius: 3px;
		overflow: hidden;
	}
	.avspillingsspor > span {
		display: block;
		height: 100%;
		background: var(--color-text-subtle);
		transition: width 0.2s;
	}
	.tekstknapp {
		background: transparent;
		border: 0;
		padding: 5px 2px;
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.tekstknapp:hover:not(:disabled) {
		text-decoration: underline;
	}
	.sekundaerknapp {
		border: 1px solid var(--color-border-strong);
		color: var(--color-text-muted);
		background: var(--color-surface);
		border-radius: 5px;
		padding: 7px 14px;
		font-weight: 650;
		font-size: var(--font-small);
	}
	.tilbakeblikk {
		border-top: 1px solid var(--color-border);
		display: flex;
		gap: 12px;
		justify-content: space-between;
		align-items: center;
		padding: 10px 0;
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.resultat {
		display: flex;
		align-items: flex-start;
		gap: 18px;
		margin-top: 18px;
		padding: 20px 22px;
		border: 1px solid var(--color-warning-border);
		background: var(--color-warning-soft);
		border-radius: 9px;
	}
	.resultat.seier {
		background: var(--color-success-soft);
		border-color: var(--color-success-border);
	}
	.resultatsymbol {
		display: grid;
		place-items: center;
		width: 43px;
		height: 43px;
		flex: 0 0 43px;
		border-radius: 50%;
		background: var(--color-warning-soft);
		color: var(--color-warning);
		font-size: 22px;
	}
	.seier .resultatsymbol {
		background: var(--color-success-soft);
		color: var(--color-success);
	}
	.resultatinnhold {
		flex: 1;
		min-width: 0;
	}
	.resultat .overlinje {
		color: var(--color-warning);
		font-size: var(--font-meta);
	}
	.seier .overlinje {
		color: var(--color-success);
	}
	.resultat h2 {
		font-size: 21px;
	}
	.resultat p:not(.overlinje) {
		margin: 8px 0 0;
		font-size: var(--font-body);
		color: var(--color-warning);
	}
	.seier p:not(.overlinje) {
		color: var(--color-success);
	}
	.malsjekker {
		list-style: none;
		margin: 12px 0 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 5px 18px;
	}
	.malsjekker li {
		display: flex;
		align-items: baseline;
		gap: 7px;
		font-size: var(--font-meta);
		color: var(--color-warning);
	}
	.malsjekker li.oppfylt {
		color: var(--color-success);
	}
	.malsjekker li > span:first-child {
		font-size: var(--font-small);
	}
	.resultat .laring {
		font-size: var(--font-body) !important;
		border-top: 1px solid var(--color-border);
		padding-top: 10px;
		margin-top: 13px !important;
	}
	.videreknapper {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 10px;
		flex: 0 0 auto;
		max-width: 240px;
		padding-top: 13px;
	}
	.videreknapper a {
		font-size: var(--font-small);
	}
	.allelost {
		font-size: var(--font-body);
		font-weight: 650;
		color: var(--color-success);
	}
	.hovedknapp {
		display: inline-flex;
		align-items: center;
		gap: 22px;
		background: var(--color-surface-soft);
		border: 1px solid var(--color-border-strong);
		color: var(--color-text);
		border-radius: 6px;
		padding: 11px 17px;
		font-weight: 700;
		font-size: var(--font-small);
	}
	.hovedknapp:hover {
		background: var(--color-surface-hover);
	}
	.byggelosning {
		margin-top: 30px;
	}
	.seksjonstopp {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 14px;
		margin-bottom: 15px;
	}
	.seksjonstopp .overlinje {
		font-size: var(--font-meta);
		margin-bottom: 5px;
	}
	.seksjonstopp h2 {
		font-size: 23px;
	}
	.plassmerking {
		font-size: var(--font-meta);
		color: var(--color-text-muted);
	}
	.byggegrid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
		gap: 23px;
	}
	h3 {
		margin: 0;
		font-size: var(--font-small);
	}
	.kortverktoy > h3,
	.programhode {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 11px;
	}
	h3 > span {
		font-size: var(--font-meta);
		color: var(--color-text-subtle);
		font-weight: 400;
		margin-left: 7px;
	}
	.kortliste {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
	.kodekort {
		min-width: 0;
		border: 1px solid var(--color-border);
		border-radius: 7px;
		overflow: hidden;
		background: var(--color-surface-raised);
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}
	.kodekort:hover {
		border-color: var(--color-border-strong);
	}
	.kodekort.valgt {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 1px var(--color-accent-soft);
	}
	.leggtil {
		display: block;
		width: 100%;
		background: transparent;
		border: 0;
		color: var(--ink);
		text-align: left;
		padding: 12px 13px 11px;
	}
	.korttopp {
		display: flex;
		align-items: center;
		gap: 7px;
		margin-bottom: 10px;
	}
	.aktor {
		background: var(--color-violet-soft);
		color: var(--color-violet);
		border-radius: 3px;
		padding: 2px 6px;
		font-size: var(--font-meta);
		letter-spacing: 0.7px;
		font-weight: 750;
	}
	.aktor.noah {
		background: var(--color-info-soft);
		color: var(--color-info);
	}
	.metode {
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			SFMono-Regular,
			Consolas,
			monospace;
		color: var(--color-text-muted);
	}
	.post .metode {
		color: var(--color-warning);
	}
	.plusstegn {
		margin-left: auto;
		font-size: 19px;
		line-height: 1;
		color: var(--color-text-subtle);
	}
	.leggtil > strong {
		display: block;
		font-size: var(--font-meta);
		font-weight: 650;
		margin-bottom: 8px;
	}
	code,
	pre {
		font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
	}
	.leggtil > code {
		display: block;
		font-size: var(--font-code);
		line-height: var(--leading-code);
		color: var(--color-text-muted);
		overflow-wrap: anywhere;
	}
	.sekode {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--color-surface);
		border: 0;
		border-top: 1px solid var(--color-border);
		padding: 6px 13px;
		width: 100%;
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.sekode:hover {
		color: var(--color-accent);
		background: var(--color-surface-hover);
	}
	.programbygger {
		min-width: 0;
		background: var(--color-surface-soft);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 14px;
	}
	.programhode {
		margin-bottom: 10px;
	}
	.programhode h3 > span {
		display: block;
		margin-left: 0;
		margin-top: 2px;
	}
	.programliste {
		padding: 0;
		margin: 0;
		list-style: none;
		display: grid;
		gap: 8px;
	}
	.programliste li {
		display: flex;
		align-items: center;
		gap: 9px;
		min-width: 0;
		border: 1px solid var(--color-border);
		background: var(--color-surface-raised);
		border-radius: 6px;
		padding: 8px 7px 8px 9px;
	}
	.programliste li.valgt {
		border-color: var(--color-accent);
		box-shadow: inset 3px 0 var(--color-accent-soft);
	}
	.programliste li.kjorer {
		background: var(--color-surface-active);
	}
	.rekkefolgenummer {
		flex: 0 0 17px;
		font:
			var(--font-meta)/var(--leading-body) ui-monospace,
			SFMono-Regular,
			Consolas,
			monospace;
		color: var(--color-text-subtle);
		text-align: center;
	}
	.programkort {
		background: transparent;
		border: 0;
		text-align: left;
		color: var(--ink);
		padding: 1px 0;
		min-width: 0;
		flex: 1;
	}
	.programetikett {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 5px;
	}
	.programetikett > span:last-child {
		font-size: var(--font-meta);
		color: var(--color-text-muted);
	}
	.programkort > code {
		font-size: var(--font-code);
		line-height: var(--leading-code);
		overflow-wrap: anywhere;
	}
	.kortkontroller {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 2px;
		flex: 0 0 66px;
	}
	.kortkontroller button {
		border: 0;
		background: transparent;
		padding: 4px 5px;
		min-width: 20px;
		color: var(--color-text-muted);
		font-size: var(--font-small);
		line-height: 1.3;
		border-radius: 3px;
	}
	.kortkontroller button:hover:not(:disabled) {
		background: var(--color-surface-hover);
		color: var(--color-accent);
	}
	.kortkontroller .fjern:hover:not(:disabled) {
		background: var(--color-danger-soft);
		color: var(--color-danger);
	}
	.droppsone {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 11px;
		padding: 22px 14px;
		margin-top: 8px;
		border: 1px dashed var(--color-border-strong);
		border-radius: 6px;
		min-height: 90px;
		color: var(--color-text-subtle);
	}
	.droppsone > span {
		font-size: 23px;
		color: var(--color-text-subtle);
	}
	.droppsone p {
		margin: 0;
		font-size: var(--font-body);
	}
	.droppsone small {
		display: block;
		font-size: var(--font-meta);
		margin-top: 4px;
		color: var(--color-text-subtle);
	}
	.slipp {
		border-color: var(--color-accent) !important;
		background: var(--color-surface-active) !important;
		box-shadow: 0 -3px var(--color-accent-soft) !important;
	}
	.kapasitet {
		font-size: var(--font-meta);
		color: var(--color-text-subtle);
		margin: 12px 0 0;
	}
	.testomrade {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-top: 16px;
	}
	.testknapp {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 15px;
		border: 1px solid var(--color-action);
		border-radius: 6px;
		background: var(--color-action);
		color: var(--color-on-action);
		font-size: var(--font-small);
		font-weight: 700;
	}
	.testknapp:hover:not(:disabled) {
		background: var(--color-action-hover);
	}
	.testknapp > span:first-child {
		font-size: var(--font-small);
		color: var(--color-on-action);
	}
	.testpil {
		margin-left: auto;
		color: var(--color-on-action);
		font-size: var(--font-body);
	}
	.tempovalg {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: var(--font-meta);
		color: var(--color-text-subtle);
	}
	.tempovalg select {
		font-size: var(--font-small);
		padding: 4px 17px 4px 5px;
		color: var(--color-text-muted);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 3px;
	}
	.startregel {
		margin: 9px 0 0;
		font-size: var(--font-meta);
		color: var(--color-text-subtle);
		text-align: center;
	}
	.kodeomrade {
		margin-top: 31px;
		scroll-margin-top: 17px;
	}
	.kodeomrade .seksjonstopp {
		margin-bottom: 8px;
	}
	.kodekontekst {
		font-size: var(--font-meta);
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	.kodeintro {
		margin: 0 0 15px;
		font-size: var(--font-body);
		color: var(--color-text-muted);
	}
	.kodeintro > span {
		color: var(--color-text-subtle);
		font-size: var(--font-meta);
		margin-left: 4px;
	}
	.aktorforklaring {
		font-size: var(--font-body);
		color: var(--color-violet);
		margin: 10px 0 21px;
		max-width: 950px;
	}
	.tillegg {
		margin-top: 12px;
		border: 1px solid var(--color-border);
		border-radius: 7px;
		background: var(--color-surface-raised);
	}
	summary {
		list-style: none;
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: center;
		padding: 14px 17px;
		font-size: var(--font-small);
		font-weight: 600;
		cursor: pointer;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary small {
		font-size: var(--font-small);
		font-weight: 400;
		color: var(--color-text-subtle);
		margin-left: 13px;
	}
	summary > span:last-child {
		font-size: 20px;
		font-weight: 400;
		color: var(--color-text-subtle);
		line-height: 1;
	}
	details[open] > summary > span:last-child {
		transform: rotate(45deg);
	}
	.historikkinnhold {
		padding: 0 17px 17px;
	}
	.historikkinnhold > p {
		font-size: var(--font-body);
		color: var(--color-text-muted);
		margin: 0 0 11px;
	}
	.historikkinnhold ol {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 7px;
		padding: 0;
		margin: 0;
		list-style: none;
	}
	.historikkinnhold button {
		display: flex;
		gap: 12px;
		align-items: center;
		width: 100%;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 5px;
		padding: 10px 12px;
		text-align: left;
		color: var(--color-text-muted);
	}
	.historikkinnhold button.valgt {
		border-color: var(--color-accent);
		background: var(--color-surface-active);
	}
	.historikkinnhold button > span:first-child {
		font: var(--font-small)/var(--leading-body) monospace;
		color: var(--color-text-subtle);
	}
	.historikkinnhold button div {
		flex: 1;
	}
	.historikkinnhold strong {
		font-size: var(--font-meta);
		font-weight: 600;
	}
	.historikkinnhold small {
		display: block;
		font-size: var(--font-meta);
		color: var(--color-text-subtle);
		margin-top: 2px;
	}
	.datagrid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
		padding: 2px 17px 17px;
	}
	.datagrid section {
		min-width: 0;
	}
	.datagrid h3 {
		font-size: var(--font-meta);
		margin: 0 0 8px;
		color: var(--color-text-muted);
	}
	.datagrid pre {
		margin: 0;
		padding: 13px;
		background: var(--color-surface);
		border-radius: 5px;
		overflow: auto;
		max-height: 280px;
		font-size: var(--font-code);
		color: var(--color-text-muted);
	}
	.datagrid .requestdata {
		grid-column: 1/-1;
		border-top: 1px solid var(--color-border);
		padding-top: 13px;
	}
	.requestdata h3 {
		overflow-wrap: anywhere;
	}
	.requestdata > div {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}
	.requestdata h4 {
		font-size: var(--font-meta);
		color: var(--color-text-subtle);
		margin: 0 0 6px;
		font-weight: 500;
	}
	.forklarmer {
		padding: 0 17px 18px;
		font-size: var(--font-body);
		color: var(--color-text-muted);
	}
	.forklarmer p {
		margin: 8px 0 12px;
		max-width: 980px;
	}
	.videre-lenker {
		display: flex;
		flex-wrap: wrap;
		gap: 9px 24px;
		font-size: var(--font-small);
	}
	footer {
		margin-top: 34px;
		border-top: 1px solid var(--line);
		padding: 21px 0 27px;
		display: flex;
		justify-content: space-between;
		gap: 20px;
		font-size: var(--font-meta);
		color: var(--color-text-subtle);
	}
	footer a {
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
	@media (max-width: 1000px) {
		.sidehode,
		main {
			width: calc(100% - 40px);
		}
		.byggegrid {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
			gap: 17px;
		}
		.kortliste {
			grid-template-columns: 1fr;
		}
		.leggtil {
			padding: 10px 12px;
		}
		.korttopp {
			margin-bottom: 6px;
		}
		.leggtil > strong {
			margin-bottom: 4px;
		}
		.sekode {
			padding: 5px 12px;
		}
		.kortkontroller {
			flex-basis: 45px;
		}
		.resultat {
			flex-wrap: wrap;
		}
		.videreknapper {
			margin-left: 61px;
			padding-top: 0;
		}
	}
	@media (max-width: 700px) {
		.sidehode,
		main {
			width: calc(100% - 28px);
		}
		.sidehode {
			min-height: 65px;
		}
		.logo {
			font-size: 18px;
		}
		.tilbake {
			font-size: var(--font-small);
		}
		.spillintro {
			align-items: flex-start;
			flex-direction: column;
			padding: 24px 0 20px;
			gap: 17px;
		}
		h1 {
			font-size: 33px;
			line-height: 1.2;
			letter-spacing: -1.2px;
		}
		.spillintro > div > p:last-child {
			font-size: var(--font-body);
			margin-top: 9px;
		}
		.framdrift {
			display: flex;
			align-items: center;
			justify-content: space-between;
			width: 100%;
			gap: 15px;
			flex-direction: row-reverse;
			flex-wrap: wrap;
		}
		.framdrift > span {
			font-size: var(--font-meta);
			margin: 0;
		}
		.nivavalg button {
			width: 4.75rem;
			min-height: 54px;
			gap: 1px;
		}
		.nivavalg button > span {
			font-size: var(--font-small);
		}
		.nivavalg small {
			font-size: var(--font-meta);
		}
		.oppdrag {
			grid-template-columns: 35px minmax(0, 1fr);
			padding: 15px 13px;
			gap: 0 12px;
		}
		.oppdragsnummer {
			width: 35px;
			height: 42px;
			font-size: 19px;
		}
		.oppdrag h2 {
			font-size: 19px;
		}
		.oppdragstekst > p:not(.overlinje) {
			font-size: var(--font-body);
		}
		.mal {
			font-size: var(--font-body);
			margin-top: 8px;
			gap: 6px;
		}
		.hintknapp {
			grid-column: 2;
			justify-self: start;
			padding: 7px 0 0;
			font-size: var(--font-small);
		}
		.hinttekst {
			font-size: var(--font-body);
			grid-column: 1/-1;
		}
		.spillebrett {
			padding: 13px 11px 0;
			margin-top: 16px;
		}
		.brettopp {
			flex-wrap: wrap;
			gap: 5px;
			margin-bottom: 12px;
		}
		.brettopp h2 {
			font-size: var(--font-meta);
		}
		.simuleringsmerke {
			font-size: var(--font-meta);
		}
		.hendelse {
			gap: 8px;
			min-height: 120px;
			flex-wrap: wrap;
			padding-top: 12px;
		}
		.hendelsesikon {
			width: 24px;
			height: 24px;
			flex-basis: 24px;
			font-size: var(--font-small);
		}
		.hendelse strong {
			font-size: var(--font-meta);
		}
		.hendelse p {
			font-size: var(--font-body);
		}
		.hendelsestall {
			flex-basis: 100%;
			display: flex;
			align-items: center;
			justify-content: space-between;
			font-size: var(--font-meta);
			padding: 0 0 0 32px;
			text-align: left;
		}
		.hendelsestall small {
			display: inline;
			margin-top: 0;
			font-size: var(--font-meta);
		}
		.avspilling {
			gap: 9px;
		}
		.avspillingsspor {
			flex-basis: 100%;
		}
		.avspilling .tekstknapp {
			font-size: var(--font-small);
		}
		.tilbakeblikk {
			align-items: flex-start;
			flex-direction: column;
			gap: 3px;
			font-size: var(--font-small);
		}
		.seksjonstopp {
			align-items: flex-start;
			gap: 10px;
		}
		.seksjonstopp h2 {
			font-size: 20px;
		}
		.byggegrid {
			grid-template-columns: 1fr;
			gap: 17px;
		}
		.kortliste {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px;
		}
		.leggtil {
			padding: 10px;
		}
		.leggtil > strong {
			font-size: var(--font-meta);
			min-height: 30px;
		}
		.leggtil > code {
			font-size: var(--font-code);
		}
		.aktor {
			font-size: var(--font-meta);
			padding: 2px 5px;
		}
		.metode {
			font-size: var(--font-meta);
		}
		.sekode {
			font-size: var(--font-small);
			padding: 5px 10px;
		}
		.kortverktoy > h3 {
			font-size: var(--font-meta);
		}
		h3 > span {
			font-size: var(--font-meta);
		}
		.programbygger {
			padding: 12px;
		}
		.programkort > code {
			font-size: var(--font-code);
		}
		.kortkontroller {
			flex-basis: 64px;
		}
		.kortkontroller button {
			padding: 5px;
		}
		.programetikett > span:last-child {
			font-size: var(--font-meta);
		}
		.testknapp {
			font-size: var(--font-small);
			padding: 11px 12px;
		}
		.programliste li {
			padding-left: 6px;
			gap: 6px;
		}
		.resultat {
			padding: 15px 13px;
			gap: 11px;
		}
		.resultatsymbol {
			width: 33px;
			height: 33px;
			flex-basis: 33px;
			font-size: 20px;
		}
		.resultat h2 {
			font-size: 19px;
		}
		.resultat p:not(.overlinje) {
			font-size: var(--font-body);
		}
		.malsjekker {
			flex-direction: column;
			gap: 5px;
		}
		.malsjekker li {
			font-size: var(--font-meta);
		}
		.videreknapper {
			margin-left: 44px;
			max-width: 100%;
		}
		.kodekontekst {
			font-size: var(--font-meta);
			white-space: normal;
			text-align: right;
			max-width: 110px;
		}
		.kodeintro {
			font-size: var(--font-body);
		}
		.kodeintro > span {
			font-size: var(--font-meta);
			margin-left: 0;
		}
		.kodeomrade {
			margin-top: 25px;
		}
		.aktorforklaring {
			font-size: var(--font-body);
		}
		summary {
			padding: 12px 13px;
			font-size: var(--font-small);
		}
		summary small {
			display: block;
			margin: 3px 0 0;
			font-size: var(--font-small);
		}
		.historikkinnhold {
			padding: 0 13px 13px;
		}
		.historikkinnhold ol {
			grid-template-columns: 1fr;
		}
		.datagrid {
			grid-template-columns: 1fr;
			padding: 0 13px 13px;
		}
		.requestdata > div {
			grid-template-columns: 1fr;
		}
		.forklarmer {
			padding: 0 13px 13px;
			font-size: var(--font-body);
		}
		footer {
			font-size: var(--font-meta);
			flex-direction: column;
			gap: 7px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			transition: none !important;
			animation: none !important;
			scroll-behavior: auto !important;
		}
	}

	.sidehode {
		flex-wrap: wrap;
	}
	.tilbake {
		margin-left: auto;
	}
	@media (max-width: 620px) {
		.sidehode {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 8px 12px;
			padding-block: 12px;
		}
		.tilbake {
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
		.logo {
			white-space: nowrap;
		}
		.tilbake {
			grid-column: 2;
			grid-row: 1;
		}
		.theme-control {
			grid-column: 1 / -1;
			grid-row: 2;
		}
	}
</style>
