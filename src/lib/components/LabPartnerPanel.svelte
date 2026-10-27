<script>
	import { onMount, onDestroy } from 'svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import { MISSIONS, casesFor, programCode } from '#lib/reddChatten.js';
	import { partnerRequest, partnerSnapshotKey } from '#lib/labPartner.js';
	/** @type {{snapshot:import('#lib/labPartner.js').PartnerSnapshot, accountId:string|null, csrf:string, avatarId?:string, onreset:()=>void}} */
	let { snapshot, accountId, csrf, avatarId = 'robot', onreset } = $props();
	/** @type {HTMLDetailsElement|undefined} */
	let panel = $state();
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

	onMount(() => {
		if (window.location.hash === '#labpartner-hjelp' && panel) panel.open = true;
	});
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
			turns = [
				...turns,
				{ question: sentQuestion, answer: result.answer, snapshotKey: sentKey }
			].slice(-4);
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
		question = '';
		error = '';
		notice = 'En ny samtale er klar.';
		onreset();
		field?.focus();
	}
</script>

<details
	class="partner-panel"
	id="labpartner-hjelp"
	bind:this={panel}
	ontoggle={() => {
		if (panel?.open) void checkStatus();
	}}
>
	<summary>
		<Avatar id={avatarId} size={36} />
		<span><strong>Spør labpartneren</strong><small>Hjelp med oppgaven du arbeider med</small></span>
		<span class="pilot">KI-pilot</span>
	</summary>
	<div class="partner-body">
		{#if !accountId}
			<p>
				<a href="/min-lab/">Logg inn i Min lab</a> for å prøve KI-veiledningen. Oppgavens vanlige hint
				er tilgjengelige uten innlogging.
			</p>
		{:else}
			<p class="intro">
				Be om et hint, en forklaring eller hjelp med siste forsøk. Labpartneren får oppgaven,
				kodevalgene og de siste handlingene dine når du sender.
			</p>
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
					<pre aria-label="Kode som deles">{programCode(snapshot.missionId, snapshot.program)}</pre>
					{#if snapshot.events.length}<ol>
							{#each snapshot.events as event}<li>
									{eventLabels[event.type]}{event.index !== undefined
										? ` · steg ${event.index + 1}`
										: ''}
								</li>{/each}
						</ol>{:else}<p>Ingen handlinger er registrert i denne samtalen ennå.</p>{/if}
					<p>
						Inntil ti siste handlinger og to tidligere spørsmål og svar fra samme oppgavetilstand
						følger med. Samtalen huskes bare mens denne siden er åpen og tømmes ved bytte av oppdrag
						eller profil.
					</p>
				</div>
			</details>
			{#if checking}<p role="status">Kontakter labpartneren …</p>{:else if enabled === false}<p
					class="availability"
				>
					KI-piloten er ikke åpnet ennå. Bruk oppgavens hint og kodelinjeforklaringer.
				</p>{:else if enabled === null}<button type="button" class="secondary" onclick={checkStatus}
					>Prøv tilkoblingen igjen</button
				>{/if}
			{#if enabled}
				<div class="quick-actions" aria-label="Be labpartneren om hjelp">
					<button
						type="button"
						class="secondary"
						disabled={!canAsk}
						onclick={() => ask('Gi meg et hint om hva jeg kan undersøke videre.')}
						>Gi meg et hint</button
					>
					<button
						type="button"
						class="secondary"
						disabled={!canAsk}
						onclick={() => ask('Forklar steget eller koden jeg undersøker nå.')}
						>Forklar dette</button
					>
					<button
						type="button"
						class="secondary"
						disabled={!canAsk}
						onclick={() => ask('Hjelp meg å forstå siste forsøk og hva jeg kan prøve videre.')}
						>Hjelp med forsøket</button
					>
				</div>
				{#if snapshot.running}<p>
						Fullfør eller avbryt prøverunden før du spør. Da får labpartneren et tydelig resultat å
						ta utgangspunkt i.
					</p>{/if}
				<div class="conversation" aria-label="Samtale med labpartneren">
					{#each turns as turn}
						<article class="turn">
							<p class="question"><strong>Du</strong><span>{turn.question}</span></p>
							<div class="answer">
								<strong>Labpartneren · KI-veiledning</strong>
								<p>{turn.answer}</p>
							</div>
							{#if turn.snapshotKey !== currentKey}<p class="earlier">
									Dette svaret gjelder et tidligere øyeblikksbilde. Koden, prøvingen eller steget du
									ser på er endret.
								</p>{/if}
						</article>
					{/each}
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
						rows="3"
						disabled={busy}
						placeholder="For eksempel: Hvorfor blir meldingen lagret selv om jeg svarer 400?"
					></textarea>
					<div class="form-actions">
						<button type="submit" class="send" disabled={!canAsk || !question.trim()}
							>Spør labpartneren</button
						>
						{#if busy}<button type="button" class="secondary" onclick={stop}>Avbryt svar</button
							>{:else}<button type="button" class="secondary" onclick={reset}>Ny samtale</button
							>{/if}
					</div>
				</form>
				<p class="fine">
					KI-svar kan være feil. Bruk oppgavens tester til å undersøke forslaget. Hjelpen gir ingen
					poengtrekk.
				</p>
			{/if}
			<p class="status" role="status">
				{busy ? 'Labpartneren arbeider med spørsmålet ditt …' : notice}
			</p>
			{#if error}<p class="error" role="alert">{error}</p>{/if}
		{/if}
	</div>
</details>

<style>
	.partner-panel {
		overflow-wrap: anywhere;
		margin: 24px 0;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-card);
		background: var(--color-surface);
		color: var(--color-text);
		font: var(--font-body)/1.6 var(--font-ui);
		scroll-margin-top: 24px;
	}
	summary {
		overflow-wrap: anywhere;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 20px;
		cursor: pointer;
		min-height: 44px;
	}
	summary::after {
		content: '+';
		margin-left: auto;
		font-size: 1.4rem;
	}
	details[open] > summary::after {
		content: '−';
	}
	summary > span {
		min-width: 0;
	}
	small {
		display: block;
		color: var(--color-text-muted);
		font-size: var(--font-small);
		font-weight: 400;
	}
	.pilot {
		font-size: var(--font-small);
		color: var(--color-accent);
		margin-left: auto;
		white-space: nowrap;
	}
	.partner-body {
		padding: 0 20px 20px;
		max-width: 900px;
	}
	p {
		margin: 0 0 12px;
		overflow-wrap: anywhere;
	}
	.intro {
		max-width: 70ch;
	}
	a {
		color: var(--color-accent);
	}
	.shared-context {
		margin-bottom: 20px;
		border-block: 1px solid var(--color-border);
		font-size: var(--font-small);
	}
	.shared-context summary {
		padding-inline: 0;
	}
	.shared-context > div {
		padding-bottom: 12px;
	}
	pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font: var(--font-code-small)/1.6 var(--font-code-family, monospace);
		padding: 12px;
		background: var(--color-surface-soft);
		border-radius: 8px;
	}
	.quick-actions,
	.form-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		margin: 16px 0;
	}
	button {
		min-width: 0;
		max-width: 100%;
		min-height: 44px;
		padding: 9px 14px;
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
		cursor: pointer;
		font: inherit;
		font-size: var(--font-small);
		overflow-wrap: anywhere;
	}
	.secondary {
		background: var(--color-surface-soft);
		color: var(--color-text);
	}
	.send {
		background: var(--color-action);
		color: var(--color-on-action);
		border-color: var(--color-action);
		font-weight: 700;
	}
	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	label {
		display: block;
		font-weight: 650;
		margin-bottom: 6px;
	}
	textarea {
		display: block;
		width: 100%;
		box-sizing: border-box;
		resize: vertical;
		min-height: 100px;
		padding: 12px;
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
	}
	button:focus-visible,
	textarea:focus-visible,
	summary:focus-visible,
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.turn {
		margin: 20px 0;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 16px;
	}
	.question span {
		display: block;
		white-space: pre-wrap;
	}
	.answer {
		padding: 16px;
		border-left: 3px solid var(--color-accent);
		background: var(--color-surface-soft);
		border-radius: 0 8px 8px 0;
	}
	.answer p {
		white-space: pre-wrap;
		margin: 8px 0 0;
	}
	.earlier {
		margin-top: 10px;
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.fine {
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.error,
	.availability {
		border-left: 3px solid var(--color-accent);
		padding: 10px 14px;
		background: var(--color-surface-soft);
	}
	.status:empty {
		display: none;
	}
	@media (max-width: 600px) {
		summary {
			padding: 14px;
			flex-wrap: wrap;
		}
		.partner-body {
			padding: 0 14px 14px;
		}
		.pilot {
			margin-left: 0;
		}
	}
</style>
