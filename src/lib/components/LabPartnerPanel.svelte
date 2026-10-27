<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import PartnerAppearance from '#lib/components/PartnerAppearance.svelte';
	import PartnerStage from '#lib/components/PartnerStage.svelte';
	import { partnerPageById, partnerPages } from '#lib/partnerPages.js';
	import Avatar from '#lib/components/Avatar.svelte';
	import { MISSIONS, casesFor, programCode } from '#lib/reddChatten.js';
	import { partnerRequest, partnerSnapshotKey } from '#lib/labPartner.js';
	/** @type {{snapshot:import('#lib/labPartner.js').PartnerSnapshot, accountId:string|null, csrf:string, avatarId?:string, onreset:()=>void, contextError?:string, dialogBreakpoint?:number,reactionMood?:import('#lib/avatarFeedback.js').AvatarMood,reactionMessage?:string}} */
	let {
		snapshot,
		contextError = '',
		accountId,
		csrf,
		avatarId = 'robot',
		onreset,
		dialogBreakpoint = 600,
		reactionMood = 'idle',
		reactionMessage = ''
	} = $props();
	/** @type {HTMLDetailsElement|undefined} */
	let panel = $state();
	const mobile = $derived(new MediaQuery(`(max-width: ${dialogBreakpoint}px)`, false));
	let mode = $state('guide');
	let modeChosen = false;
	let tipIndex = $state(0);
	const pageState = $derived(snapshot.activityId === 'page-help' ? snapshot.state : null);

	const repair = $derived(snapshot.activityId === 'redd-chatten' ? snapshot : null);
	const pageHelp = $derived(
		partnerPageById(snapshot.activityId === 'page-help' ? snapshot.pageId : 'redd-chatten') ??
			partnerPages[0]
	);
	const workContext = $derived(!!pageState && pageHelp.kind !== 'challenge');
	/** @param {string} value */
	function chooseMode(value) {
		modeChosen = true;
		mode = value;
		if (value === 'ai') void checkStatus(true);
	}
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
	const mood = $derived(
		busy
			? 'thinking'
			: error
				? 'retry'
				: latest
					? 'success'
					: reactionMood !== 'idle'
						? reactionMood
						: expanded
							? 'greeting'
							: 'idle'
	);

	const currentKey = $derived(partnerSnapshotKey(snapshot));
	const mission = $derived(MISSIONS.find((item) => item.id === (repair?.missionId ?? 'tekst')));
	const scenario = $derived(
		casesFor(repair?.missionId ?? 'tekst').find((item) => item.id === repair?.caseId)
	);
	const oldTest = $derived(
		repair?.lastRun != null && repair.lastRun.program.join('|') !== repair.program.join('|')
	);
	const canAsk = $derived(enabled === true && !busy && !snapshot.running && !contextError);
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
	async function checkStatus(retry = false) {
		if (!accountId || checking || (!retry && enabled !== null)) return;
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
			if (!disposed) {
				enabled = result.enabled === true;
				if (enabled && !modeChosen) mode = 'ai';
			}
		} catch {
			if (!disposed) {
				enabled = false;
				error = 'Kunne ikke kontakte KI-tjenesten. Sidehjelpen virker fortsatt.';
			}
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
	<div class="partner-body ready">
		<div class="mode-switch" aria-label="Labpartnerens verktøy">
			<button type="button" aria-pressed={mode === 'guide'} onclick={() => chooseMode('guide')}
				>Sidehjelp</button
			>
			<button type="button" aria-pressed={mode === 'ai'} onclick={() => chooseMode('ai')}>KI</button
			>
			<button type="button" aria-pressed={mode === 'style'} onclick={() => chooseMode('style')}
				>Utseende</button
			>
		</div>
		{#if mode === 'ai'}
			{#if checking}<p role="status">Sjekker KI-tilkoblingen …</p>{/if}
			{#if !accountId}
				<p class="availability">
					<a href="/min-lab/">Logg inn i Min lab</a> for å bruke KI. Sidehjelp og utseende virker uten
					innlogging.
				</p>
			{:else if enabled}
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
							onclick={() =>
								ask(
									repair || workContext
										? 'Forklar steget eller koden jeg undersøker nå.'
										: 'Forklar temaet på denne siden med et kort eksempel.'
								)}>Forklar</button
						>
						<button
							type="button"
							class="secondary"
							disabled={!canAsk}
							aria-label={repair || workContext ? 'Hjelp med forsøket' : 'Vis et eksempel'}
							onclick={() =>
								ask(
									repair || workContext
										? 'Hjelp meg å forstå valgene og steget jeg ser på, og hva jeg kan undersøke videre.'
										: 'Vis et lite eksempel som forklarer et sentralt begrep på denne siden.'
								)}>{repair ? 'Siste forsøk' : workContext ? 'Arbeidet mitt' : 'Eksempel'}</button
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
					{#if repair}<a class="test-return" href="#testomrade">Til testknappene ↑</a>{/if}
					<p class="status" role="status">
						{busy
							? 'Labpartneren arbeider …'
							: snapshot.running
								? 'Fullfør eller avbryt prøverunden før du spør.'
								: notice}
					</p>
					{#if error || contextError}<p class="error" role="alert">{error || contextError}</p>{/if}
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
					{#if repair}
						<details class="shared-context">
							<summary>Dette følger med spørsmålet</summary>
							<div>
								<p>
									<strong>Oppdrag:</strong>
									{mission?.title}<br /><strong>Valgt situasjon:</strong>
									{scenario?.name}
								</p>
								<p>
									{repair.inspection
										? `Du undersøker steg ${repair.inspection.index + 1}.`
										: 'Ingen kjøringssteg er valgt.'}
									{repair.lastRun
										? oldTest
											? 'Siste prøving gjelder en tidligere kodeversjon.'
											: 'Siste prøving gjelder kodevalgene som vises nå.'
										: 'Ingen ferdig prøving er valgt.'}
								</p>
								<pre aria-label="Kode som deles">{programCode(
										repair.missionId,
										repair.program
									)}</pre>
								{#if repair.events.length}<ol>
										{#each repair.events as event}<li>
												{eventLabels[event.type]}{event.index !== undefined
													? ` · steg ${event.index + 1}`
													: ''}
											</li>{/each}
									</ol>{:else}<p>Ingen handlinger er registrert i denne samtalen ennå.</p>{/if}
								<p>
									Inntil ti siste handlinger og to tidligere spørsmål og svar fra samme
									oppgavetilstand følger med. Samtalen huskes bare mens denne siden er åpen og
									tømmes ved bytte av oppdrag eller profil.
								</p>
							</div>
						</details>

						<p class="fine">
							Oppgaven og kodevalgene dine følger med når du spør. KI-svar kan være feil. Bruk
							oppgavens tester til å undersøke forslaget. Hjelpen gir ingen poengtrekk.
						</p>
					{:else}
						<details class="shared-context">
							<summary>Dette følger med spørsmålet</summary>
							<p><strong>{pageHelp.title}</strong>: {pageHelp.summary}</p>
							<p>
								Sidens faglige grunnlag, eventuell modul og inntil to tidligere spørsmål og svar fra
								samme arbeidsstatus følger med når du spør. Samtalen tømmes ved bytte av side,
								oppdrag eller profil.
								{#if pageState}
									{pageHelp.kind === 'challenge'
										? 'I Nattevakten deles bare arbeidsfasen. KI-en ser ikke oppgavetekst, svar eller vurderingsinnhold.'
										: 'Valg, synlig steg og avgrenset status fra øvingen følger også med. Tekstfelt beskrives med egenskaper som tom eller utfylt; innholdet du skriver i øvingen deles ikke automatisk.'}
								{:else}KI-en ser bare sidegrunnlaget, ikke klikk eller arbeidsstatus på denne siden.{/if}
								Andre elevers opplysninger, passord og profilinformasjon følger ikke med. Spørsmålet du
								skriver til labpartneren sendes som tekst.
							</p>
							{#if pageState}<details>
									<summary>Se de delte feltene</summary>
									<pre aria-label="Delt arbeidsstatus">{JSON.stringify(
											pageState.values,
											null,
											2
										)}</pre>
								</details>{/if}
						</details>
						<p class="fine">
							KI-svar kan være feil. Undersøk forslaget med sidens forklaringer og tester. Hjelpen
							vurderer ikke forståelsen din og gir ingen poengtrekk.
						</p>
					{/if}
				</div>
			{:else}
				<p class="availability">KI er ikke tilgjengelig nå. Bruk Sidehjelp for tips om siden.</p>
				{#if error || contextError}<p class="error" role="alert">{error || contextError}</p>{/if}
				<button
					type="button"
					class="secondary"
					disabled={checking}
					onclick={() => checkStatus(true)}>Prøv KI igjen</button
				>
			{/if}
		{:else}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard access to the scrollable help/settings region.) -->
			<div
				class="answer-scroll local-help"
				role="region"
				aria-label={mode === 'style' ? 'Utseende' : 'Sidehjelp'}
				tabindex="0"
			>
				<PartnerStage {avatarId} {mood} />
				{#if mode === 'style'}<PartnerAppearance />
				{:else}
					<p class="eyebrow">FAST SIDEHJELP · UTEN KI</p>
					<h3>{pageHelp.title}</h3>
					<p>{pageHelp.summary}</p>
					{#if pageHelp.topics.length}<p class="fine">Tema: {pageHelp.topics.join(' · ')}</p>{/if}
					<div class="guide-tip">
						<strong>Forslag {tipIndex + 1} av {pageHelp.tips.length}</strong>
						<p>{pageHelp.tips[tipIndex]}</p>
					</div>
					<button
						type="button"
						class="secondary"
						onclick={() => (tipIndex = (tipIndex + 1) % pageHelp.tips.length)}>Et annet tips</button
					>
					<p class="fine guide-note">
						Disse rådene er skrevet på forhånd. Velg KI for å stille egne spørsmål når tjenesten er
						tilgjengelig.
					</p>
				{/if}
			</div>
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
		<Avatar id={avatarId} {mood} size={44} /><span
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
			<div class="dialog-title">
				<Avatar id={avatarId} {mood} size={40} /><strong id="partner-dialog-title"
					>Labpartneren</strong
				>
			</div>
			<button type="button" class="secondary" onclick={closeMobile}>← Tilbake til siden</button>
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
			><Avatar id={avatarId} {mood} size={44} /><span
				><strong>Spør labpartneren</strong><small
					>{reactionMessage || 'Sidehjelp · KI · Utseende'}</small
				></span
			></summary
		>
		{@render body()}
	</details>
{/if}

<style>
	.mode-switch {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 5.5rem), 1fr));
		gap: 6px;
		margin: 0 0 12px;
		flex: none;
	}
	.mode-switch button {
		background: var(--color-surface-soft);
		color: var(--color-text);
	}
	.mode-switch button[aria-pressed='true'] {
		background: var(--color-accent-soft);
		border-color: var(--color-accent);
		color: var(--color-accent);
		font-weight: 700;
	}
	.dialog-title {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.guide-tip {
		border-left: 3px solid var(--color-accent);
		background: var(--color-surface-soft);
		padding: 12px;
		border-radius: 0 10px 10px 0;
		margin-bottom: 12px;
	}
	.guide-tip p {
		margin: 6px 0 0;
	}
	.guide-note {
		margin-top: 14px;
	}
	.eyebrow {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
	}
	.local-help {
		border-top: 0;
		padding-top: 0;
	}
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
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 5.5rem), 1fr));
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

	@media (min-width: 601px) {
		.partner-dialog {
			width: min(560px, calc(100% - 48px));
			height: min(850px, calc(100dvh - 48px));
			max-height: calc(100dvh - 48px);
			margin: auto;
			border: 1px solid var(--color-border-strong);
			border-radius: 20px;
			box-shadow: 0 20px 80px var(--color-shadow);
		}
	}
</style>
