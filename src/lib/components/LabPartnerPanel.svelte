<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Avatar from '#lib/components/Avatar.svelte';
	import { MISSIONS, casesFor, programCode } from '#lib/reddChatten.js';
	import { partnerRequest, partnerSnapshotKey } from '#lib/labPartner.js';
	/** @type {{snapshot:import('#lib/labPartner.js').PartnerSnapshot, accountId:string|null, csrf:string, avatarId?:string, onreset:()=>void}} */
	let { snapshot, accountId, csrf, avatarId = 'robot', onreset } = $props();
	/** @type {HTMLDetailsElement|undefined} */
	let panel = $state();
	const mobile = new MediaQuery('(max-width: 600px)', false);
	let expanded = $state(false);
	/** @type {HTMLDialogElement|undefined} */
	let dialog = $state();
	/** @type {HTMLDivElement|undefined} */
	let answerScroll = $state();
	/** @type {HTMLHeadingElement|undefined} */
	let latestHeading = $state();
	/** @type {HTMLElement|null} */
	let opener = null;
	let savedScroll = 0;
	let historyOpen = $state(false);
	let newAnswerReady = $state(false);
	/** @type {import('#lib/labPartner.js').PartnerTurn[]} */
	let displayedTurns = $state([]);
	const latest = $derived(displayedTurns.at(-1));
	const earlier = $derived(displayedTurns.slice(0, -1).reverse());
	/** @type {HTMLTextAreaElement|undefined} */
	let field = $state();
	/** @type {boolean|null} */
	let enabled = $state(null);
	let checking = $state(false);
	let busy = $state(false);
	let question = $state('');
	let error = $state('');
	let notice = $state('');
	/** @type {import('#lib/labPartner.js').PartnerTurn[]} */
	let turns = $state([]);
	/** @type {AbortController|null} */
	let requestController = null;
	/** @type {AbortController|null} */
	let statusController = null;
	let requestSerial = 0;
	let disposed = false;
	const currentKey = $derived(partnerSnapshotKey(snapshot));
	const mission = $derived(MISSIONS.find((item) => item.id === snapshot.missionId));
	const scenario = $derived(
		casesFor(snapshot.missionId).find((item) => item.id === snapshot.caseId)
	);
	const oldTest = $derived(
		snapshot.lastRun !== null && snapshot.lastRun.program.join('|') !== snapshot.program.join('|')
	);
	const canAsk = $derived(enabled === true && !busy && !snapshot.running);
	const eventLabels = {
		'code-changed': 'Endret kode',
		'case-selected': 'Valgte testsituasjon',
		'test-started': 'Startet prøverunde',
		'test-completed': 'Fullførte prøving',
		'test-cancelled': 'Avbrøt prøverunde',
		'hint-opened': 'Åpnet hint',
		'line-explained': 'Åpnet kodelinjeforklaring',
		'trace-inspected': 'Undersøkte kjøringssteg',
		'walkthrough-started': 'Åpnet stegvis gjennomgang',
		'walkthrough-stepped': 'Flyttet visningen i gjennomgangen',
		reset: 'Gikk tilbake til startkoden'
	};

	async function openPanel() {
		opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		savedScroll = window.scrollY;
		expanded = true;
		void checkStatus();
		await tick();
		if (!mobile.current) {
			panel?.scrollIntoView({ block: 'nearest' });
			panel?.querySelector('summary')?.focus({ preventScroll: true });
		}
	}
	function closeMobile() {
		expanded = false;
		dialog?.close();
		if (opener?.isConnected) opener.focus({ preventScroll: true });
		window.scrollTo({ top: savedScroll, behavior: 'instant' });
	}
	$effect(() => {
		if (mobile.current && expanded && dialog && !dialog.open) dialog.showModal();
	});
	$effect(() => {
		if (!mobile.current || !expanded) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});
	onMount(() => {
		const open = () => {
			void openPanel();
		};
		window.addEventListener('labpartner-open', open);
		if (window.location.hash === '#labpartner-hjelp') open();
		return () => window.removeEventListener('labpartner-open', open);
	});
	async function showLatest(focus = false) {
		displayedTurns = [...turns];
		historyOpen = false;
		newAnswerReady = false;
		await tick();
		if (answerScroll) answerScroll.scrollTop = 0;
		if (focus) latestHeading?.focus({ preventScroll: true });
	}
	onDestroy(() => {
		disposed = true;
		requestSerial += 1;
		requestController?.abort();
		statusController?.abort();
	});
	async function checkStatus() {
		if (!accountId || checking || enabled !== null) return;
		checking = true;
		error = '';
		const controller = new AbortController();
		statusController = controller;
		try {
			const result = await partnerRequest(
				'status',
				csrf,
				AbortSignal.any([controller.signal, AbortSignal.timeout(10000)])
			);
			if (!disposed) enabled = result.enabled === true;
		} catch {
			if (!disposed)
				error = 'Kunne ikke kontakte labpartneren. Du kan fortsatt bruke oppgavens hint.';
		} finally {
			if (!disposed) checking = false;
		}
	}
	/** @param {string} value */
	async function ask(value) {
		if (!canAsk || !accountId) return;
		const sentQuestion = value.trim();
		if (!sentQuestion) {
			field?.focus();
			return;
		}
		question = sentQuestion;
		error = '';
		notice = '';
		busy = true;
		const serial = ++requestSerial;
		const controller = new AbortController();
		requestController = controller;
		const sentKey = currentKey;
		const body = {
			accountId,
			question: sentQuestion,
			snapshot: JSON.parse(JSON.stringify(snapshot)),
			history: turns
				.filter((turn) => turn.snapshotKey === sentKey)
				.slice(-2)
				.map(({ question, answer }) => ({ question, answer }))
		};
		// Leave room for the proxy's existing 16 KiB request limit, including UTF-8 text.
		while (body.history.length && new TextEncoder().encode(JSON.stringify(body)).length > 14000)
			body.history.shift();
		try {
			const result = await partnerRequest(
				'ask',
				csrf,
				AbortSignal.any([controller.signal, AbortSignal.timeout(125000)]),
				body
			);
			if (disposed || serial !== requestSerial) return;
			const readingEarlier = historyOpen || (answerScroll?.scrollTop ?? 0) > 24;
			turns = [
				...turns,
				{ question: sentQuestion, answer: result.answer, snapshotKey: sentKey }
			].slice(-4);
			if (readingEarlier) newAnswerReady = true;
			else await showLatest();
			question = '';
			notice = 'Svaret fra labpartneren er klart.';
		} catch (cause) {
			if (!disposed && serial === requestSerial)
				error =
					cause instanceof Error && cause.name !== 'TypeError' && cause.name !== 'TimeoutError'
						? cause.message
						: 'Kunne ikke få svar fra labpartneren. Spørsmålet er beholdt. Prøv igjen, eller bruk oppgavens hint.';
		} finally {
			if (!disposed && serial === requestSerial) busy = false;
		}
	}
	function stop() {
		requestSerial += 1;
		requestController?.abort();
		busy = false;
		notice = 'Forespørselen er avbrutt. Spørsmålet ditt er beholdt.';
	}
	function reset() {
		stop();
		turns = [];
		displayedTurns = [];
		historyOpen = false;
		newAnswerReady = false;
		question = '';
		error = '';
		notice = 'En ny samtale er klar.';
		onreset();
		field?.focus();
	}
</script>

{#snippet turnCard(turn = latest)}
	{#if turn}
		<article class="turn">
			<p class="question"><strong>Du spurte</strong><span>{turn.question}</span></p>
			<div class="answer">
				<strong>Labpartneren · KI-veiledning</strong>
				<p>{turn.answer}</p>
			</div>
			{#if turn.snapshotKey !== currentKey}
				<p class="earlier">
					Dette svaret gjelder et tidligere øyeblikksbilde. Koden, prøvingen eller steget du ser på
					er endret.
				</p>
			{/if}
		</article>
	{/if}
{/snippet}

{#snippet body()}
	<div class="partner-body" class:ready={enabled === true && !!accountId}>
		{#if !accountId}
			<p>
				<a href="/min-lab/">Logg inn i Min lab</a> for å prøve KI-veiledningen. Oppgavens vanlige hint
				er tilgjengelige uten innlogging.
			</p>
		{:else}
			{#if checking}<p role="status">Kontakter labpartneren …</p>
			{:else if enabled === false}<p class="availability">
					KI-piloten er ikke åpnet ennå. Bruk oppgavens hint og kodelinjeforklaringer.
				</p>
			{:else if enabled === null}<button type="button" class="secondary" onclick={checkStatus}
					>Prøv tilkoblingen igjen</button
				>{/if}
			{#if enabled}
				<div class="composer">
					<div class="quick-actions" aria-label="Be labpartneren om hjelp">
						<button
							type="button"
							class="secondary"
							disabled={!canAsk}
							aria-label="Gi meg et hint"
							onclick={() => ask('Gi meg et hint om hva jeg kan undersøke videre.')}>Hint</button
						>
						<button
							type="button"
							class="secondary"
							disabled={!canAsk}
							aria-label="Forklar dette"
							onclick={() => ask('Forklar steget eller koden jeg undersøker nå.')}>Forklar</button
						>
						<button
							type="button"
							class="secondary"
							disabled={!canAsk}
							aria-label="Hjelp med forsøket"
							onclick={() => ask('Hjelp meg å forstå siste forsøk og hva jeg kan prøve videre.')}
							>Siste forsøk</button
						>
					</div>
					<form
						onsubmit={(event) => {
							event.preventDefault();
							void ask(question);
						}}
					>
						<label for="partner-question">Hva trenger du hjelp med?</label>
						<textarea
							id="partner-question"
							bind:this={field}
							bind:value={question}
							maxlength="800"
							rows="2"
							disabled={busy}
							placeholder="Skriv et spørsmål om oppgaven …"></textarea>
						<div class="form-actions">
							<button type="submit" class="send" disabled={!canAsk || !question.trim()}
								>Spør labpartneren</button
							>
							{#if busy}<button type="button" class="secondary" onclick={stop}>Avbryt svar</button>
							{:else}<button type="button" class="secondary" onclick={reset}>Ny samtale</button
								>{/if}
						</div>
					</form>
					<a class="test-return" href="#testomrade">Til testknappene ↑</a>
					<p class="status" role="status">
						{busy
							? 'Labpartneren arbeider …'
							: snapshot.running
								? 'Fullfør eller avbryt prøverunden før du spør.'
								: notice}
					</p>
					{#if error}<p class="error" role="alert">{error}</p>{/if}
					{#if newAnswerReady}<button
							type="button"
							class="new-answer"
							onclick={() => showLatest(true)}>Nytt svar klart · Vis siste svar ↑</button
						>{/if}
				</div>
				<!-- svelte-ignore a11y_no_noninteractive_tabindex (The scrollable answer region needs keyboard access.) -->
				<div
					class="answer-scroll"
					bind:this={answerScroll}
					role="region"
					aria-label="Svar og delt oppgavekontekst"
					tabindex="0"
				>
					<div class="conversation" aria-label="Samtale med labpartneren">
						{#if latest}
							<h3 tabindex="-1" bind:this={latestHeading}>
								{newAnswerReady ? 'Svaret du leser' : 'Siste svar'}
							</h3>
							{@render turnCard(latest)}
							{#if earlier.length}<details class="history" bind:open={historyOpen}>
									<summary>Tidligere svar ({earlier.length})</summary>
									{#each earlier as turn}{@render turnCard(turn)}{/each}
								</details>{/if}
						{:else}<p class="empty">
								Be om et hint eller skriv et spørsmål. Svaret kommer her.
							</p>{/if}
					</div>
					<details class="shared-context">
						<summary>Dette følger med spørsmålet</summary>
						<div>
							<p>
								<strong>Oppdrag:</strong>
								{mission?.title}<br /><strong>Valgt situasjon:</strong>
								{scenario?.name}
							</p>
							<p>
								{snapshot.inspection
									? `Du undersøker steg ${snapshot.inspection.index + 1}.`
									: 'Ingen kjøringssteg er valgt.'}
								{snapshot.lastRun
									? oldTest
										? 'Siste prøving gjelder en tidligere kodeversjon.'
										: 'Siste prøving gjelder kodevalgene som vises nå.'
									: 'Ingen ferdig prøving er valgt.'}
							</p>
							<pre aria-label="Kode som deles">{programCode(
									snapshot.missionId,
									snapshot.program
								)}</pre>
							{#if snapshot.events.length}<ol>
									{#each snapshot.events as event}<li>
											{eventLabels[event.type]}{event.index !== undefined
												? ` · steg ${event.index + 1}`
												: ''}
										</li>{/each}
								</ol>{:else}<p>Ingen handlinger er registrert i denne samtalen ennå.</p>{/if}
							<p>
								Inntil ti siste handlinger og to tidligere spørsmål og svar fra samme
								oppgavetilstand følger med. Samtalen huskes bare mens denne siden er åpen og tømmes
								ved bytte av oppdrag eller profil.
							</p>
						</div>
					</details>

					<p class="fine">
						Oppgaven og kodevalgene dine følger med når du spør. KI-svar kan være feil. Bruk
						oppgavens tester til å undersøke forslaget. Hjelpen gir ingen poengtrekk.
					</p>
				</div>
			{:else if error}<p class="error" role="alert">{error}</p>{/if}
		{/if}
	</div>
{/snippet}

{#if mobile.current}
	<button
		type="button"
		id="labpartner-hjelp"
		class="mobile-launch"
		aria-haspopup="dialog"
		onclick={openPanel}
	>
		<Avatar id={avatarId} size={32} /><span
			>Spør labpartneren{#if newAnswerReady}<small>Nytt svar klart</small>{/if}</span
		><span aria-hidden="true">→</span>
	</button>
	<dialog
		class="partner-dialog"
		bind:this={dialog}
		aria-labelledby="partner-dialog-title"
		oncancel={(event) => {
			event.preventDefault();
			closeMobile();
		}}
	>
		<div class="dialog-header">
			<strong id="partner-dialog-title">Spør labpartneren</strong>
			<button type="button" class="secondary" onclick={closeMobile}>← Tilbake til oppgaven</button>
		</div>
		{@render body()}
	</dialog>
{:else}
	<details
		class="partner-panel"
		id="labpartner-hjelp"
		bind:this={panel}
		bind:open={expanded}
		ontoggle={() => {
			if (panel?.open) void checkStatus();
		}}
	>
		<summary class="panel-heading"
			><Avatar id={avatarId} size={32} /><span
				><strong>Spør labpartneren</strong><small>KI-hjelp med dette oppdraget</small></span
			></summary
		>
		{@render body()}
	</details>
{/if}

<style>
	.partner-panel,
	.partner-dialog,
	.mobile-launch {
		box-sizing: border-box;
		min-width: 0;
		overflow-wrap: anywhere;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-card);
		background: var(--color-surface);
		color: var(--color-text);
		font: var(--font-body)/1.5 var(--font-ui);
		scroll-margin-top: 24px;
	}
	summary {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		padding: 10px 0;
		cursor: pointer;
		overflow-wrap: anywhere;
	}
	summary::after {
		content: '+';
		margin-left: auto;
		font-size: 1.3rem;
	}
	details[open] > summary::after {
		content: '−';
	}
	summary > span {
		min-width: 0;
	}
	.panel-heading {
		padding: 14px;
	}
	small {
		display: block;
		color: var(--color-text-muted);
		font-size: var(--font-small);
		font-weight: 400;
	}
	.partner-body {
		padding: 0 14px 14px;
		min-width: 0;
	}
	.partner-body.ready {
		display: flex;
		flex-direction: column;
		height: min(680px, 75dvh);
		min-height: 460px;
	}
	.test-return {
		display: block;
		min-height: 44px;
		padding: 10px 0 0;
		font-size: var(--font-small);
	}
	@media (min-width: 1800px), (max-width: 600px) {
		.test-return {
			display: none;
		}
	}
	.composer {
		flex: none;
	}
	.quick-actions {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
		margin-bottom: 12px;
	}
	.form-actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-top: 8px;
	}
	button {
		min-width: 0;
		max-width: 100%;
		min-height: 44px;
		padding: 8px 10px;
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
		font: inherit;
		font-size: var(--font-small);
		overflow-wrap: anywhere;
		cursor: pointer;
	}
	.secondary {
		background: var(--color-surface-soft);
		color: var(--color-text);
	}
	.send,
	.new-answer {
		background: var(--color-action);
		color: var(--color-on-action);
		border-color: var(--color-action);
		font-weight: 700;
	}
	.new-answer {
		width: 100%;
		margin-bottom: 8px;
	}
	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	label {
		display: block;
		font-size: var(--font-small);
		font-weight: 650;
		margin-bottom: 6px;
	}
	textarea {
		display: block;
		width: 100%;
		box-sizing: border-box;
		resize: vertical;
		min-height: 72px;
		max-height: 140px;
		padding: 10px;
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
	}
	.answer-scroll {
		flex: 1;
		min-height: 9rem;
		overflow-y: auto;
		overscroll-behavior-y: contain;
		scrollbar-gutter: stable;
		border-top: 1px solid var(--color-border);
		padding: 14px 6px 0 0;
		overflow-wrap: anywhere;
	}
	h3 {
		margin: 0 0 12px;
		font-size: var(--font-body);
	}
	p {
		margin: 0 0 12px;
		overflow-wrap: anywhere;
	}
	a {
		color: var(--color-accent);
	}
	.turn {
		margin: 0 0 16px;
	}
	.question {
		font-size: var(--font-small);
	}
	.question span {
		display: block;
		white-space: pre-wrap;
	}
	.answer {
		padding: 12px;
		border-left: 3px solid var(--color-accent);
		background: var(--color-surface-soft);
		border-radius: 0 8px 8px 0;
	}
	.answer strong {
		font-size: var(--font-small);
	}
	.answer p {
		white-space: pre-wrap;
		margin: 8px 0 0;
	}
	.earlier,
	.fine,
	.empty {
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.earlier {
		margin-top: 10px;
	}
	.history,
	.shared-context {
		border-top: 1px solid var(--color-border);
		font-size: var(--font-small);
	}
	.history .turn {
		margin-top: 12px;
	}
	.shared-context {
		margin-bottom: 12px;
	}
	.shared-context > div {
		padding-bottom: 12px;
	}
	pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font: var(--font-code-small)/1.6 var(--font-code-family, monospace);
		padding: 10px;
		background: var(--color-surface-soft);
		border-radius: 8px;
	}
	.status {
		min-height: 1.5em;
		margin: 8px 0;
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.error,
	.availability {
		border-left: 3px solid var(--color-accent);
		padding: 8px 10px;
		background: var(--color-surface-soft);
		font-size: var(--font-small);
	}
	button:focus-visible,
	textarea:focus-visible,
	summary:focus-visible,
	a:focus-visible,
	.answer-scroll:focus-visible,
	h3:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 2px;
	}
	.mobile-launch {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 14px;
		text-align: left;
	}
	.mobile-launch > span:last-child {
		margin-left: auto;
	}
	.partner-dialog {
		width: 100%;
		max-width: none;
		height: 100dvh;
		max-height: 100dvh;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: 0;
		overflow-y: auto;
	}
	.partner-dialog[open] {
		display: flex;
		flex-direction: column;
	}
	.partner-dialog::backdrop {
		background: rgb(0 0 0 / 0.5);
	}
	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
		padding: max(12px, env(safe-area-inset-top)) 14px 12px;
	}
	.partner-dialog .partner-body.ready {
		flex: 1;
		min-height: 0;
		height: auto;
		padding-bottom: max(14px, env(safe-area-inset-bottom));
	}
	@media (max-height: 650px) {
		.partner-body.ready {
			height: auto;
			min-height: 0;
		}
		.answer-scroll {
			max-height: 45dvh;
			min-height: 9rem;
		}
		.partner-dialog .answer-scroll {
			max-height: none;
			overflow-y: visible;
		}
	}
</style>
