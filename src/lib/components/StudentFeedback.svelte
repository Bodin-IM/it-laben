<script>
	import { tick, onDestroy } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import Avatar from '#lib/components/Avatar.svelte';
	import { lab, randomId, rewardNotice } from '#lib/lab.js';
	import { labPreferences } from '#lib/labPreferences.js';
	import { connection, secureHref } from '#lib/connection.js';
	import { feedbackCategories, feedbackMaxLength, feedbackPage } from '#lib/feedback.js';
	import { feedbackRequest } from '#lib/feedbackClient.js';
	import { feedbackAnswers } from '#lib/activityFeedback.js';
	import ActivityFeedbackPrompt from '#lib/components/ActivityFeedbackPrompt.svelte';
	import FeedbackPromptSettings from '#lib/components/FeedbackPromptSettings.svelte';
	import { getInterfaceHelp } from '#lib/interfaceHelp.js';
	const interfaceHelp = getInterfaceHelp();
	/** @type {{enabled:boolean}} */
	let { enabled } = $props();
	/** @type {HTMLDialogElement|undefined} */
	let dialog = $state();
	/** @type {HTMLButtonElement|undefined} */
	let launcher = $state();
	/** @type {HTMLHeadingElement|undefined} */
	let heading = $state();
	/** @type {ReturnType<typeof feedbackPage>} */
	let source = $state(null);
	/** @type {{prompt:import('#lib/activityFeedback.js').FeedbackPrompt,answer:string}|null} */
	let survey = $state(null);
	let message = $state(''),
		category = $state('problem'),
		error = $state('');
	let opened = $state(false),
		busy = $state(false),
		sent = $state(false);
	let draftId = '',
		lastPayload = '',
		serial = 0;
	let openedAtHref = '';
	/** @type {AbortController|null} */
	let controller = null;
	const currentPage = $derived(feedbackPage(page.url.pathname + page.url.search));
	const avatar = $derived($lab.summary?.lab.avatarId ?? $labPreferences.partnerAvatar);
	const visible = $derived(enabled && $lab.ready && currentPage !== null);
	const accountId = $derived($lab.user?.id ?? null);

	function reset() {
		survey = null;
		source = currentPage;
		message = '';
		category = 'problem';
		error = '';
		sent = false;
		draftId = '';
		lastPayload = '';
	}
	async function open() {
		if (!source || (!sent && !message.trim())) reset();
		await show();
	}
	async function show() {
		openedAtHref = page.url.href;
		opened = true;
		dialog?.showModal();
		await tick();
		heading?.focus();
	}
	async function openForPrompt(/** @type {import('#lib/activityFeedback.js').FeedbackPrompt} */ prompt, /** @type {string} */ answer) {
		// An existing unsent message takes priority; do not overwrite it.
		if (!sent && message.trim()) { await show(); return; }
		reset();
		survey = { prompt, answer };
		source = feedbackPage(prompt.pageHref);
		category = 'other';
		await show();
	}
	function close() {
		opened = false;
		dialog?.close();
		launcher?.focus({ preventScroll: true });
	}
	$effect(() => {
		if (!opened) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});
	// Account changes clear private draft text and invalidate late responses.
	$effect(() => {
		void accountId;
		serial++;
		controller?.abort();
		busy = false;
		message = '';
		source = null;
		survey = null;
		sent = false;
		error = '';
		draftId = '';
		lastPayload = '';
		opened = false;
		dialog?.close();
	});
	afterNavigate(({ type, to }) => {
		if (type !== 'enter' && opened && to?.url.href !== openedAtHref) close();
	});
	onDestroy(() => {
		serial++;
		controller?.abort();
	});
	async function send(/** @type {SubmitEvent} */ event) {
		event.preventDefault();
		if (busy || !source) return;
		if (!message.trim()) {
			error = 'Skriv hva du vil gi tilbakemelding om.';
			return;
		}
		const payload = JSON.stringify([category, message.trim(), source.href, survey?.prompt.id]);
		if (!draftId || payload !== lastPayload) {
			draftId = randomId();
			lastPayload = payload;
		}
		const request = ++serial;
		controller = new AbortController();
		busy = true;
		error = '';
		try {
			await feedbackRequest(
				'/feedback',
				{ id: draftId, category, message: message.trim(), pageHref: source.href, ...(survey ? { promptId: survey.prompt.id } : {}) },
				controller.signal
			);
			if (request !== serial) return;
			sent = true;
			message = '';
			await tick();
			if (opened) heading?.focus();
		} catch (problem) {
			if (request === serial)
				error =
					problem instanceof Error ? problem.message : 'Kunne ikke sende. Meldingen er beholdt.';
		} finally {
			if (request === serial) busy = false;
		}
	}
</script>

<ActivityFeedbackPrompt
	enabled={visible && !opened && !message.trim() && !$rewardNotice && !$interfaceHelp.active && $labPreferences.companion}
	{avatar}
	oncomment={openForPrompt}
	onclose={() => launcher?.focus({ preventScroll: true })}
/>

{#if visible}
	<div class="feedback-space" aria-hidden="true"></div>
	<button
		class="feedback-launcher"
		class:above-reward={$rewardNotice !== null || $interfaceHelp.active !== null}
		bind:this={launcher}
		onclick={open}
		aria-haspopup="dialog"
	>
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			aria-hidden="true"
			><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z" /><path
				d="M7 9h10M7 13h7"
			/></svg
		>
		Tilbakemelding
	</button>
{/if}

<dialog
	bind:this={dialog}
	class="feedback-dialog"
	aria-labelledby="feedback-heading"
	oncancel={(event) => {
		event.preventDefault();
		close();
	}}
	onclose={() => {
		opened = false;
	}}
>
	<div class="dialog-top">
		<span>TILBAKEMELDING OM IT-LABEN</span><button
			class="close"
			onclick={close}
			aria-label="Lukk tilbakemeldingen">×</button
		>
	</div>
	<div class="greeting">
		<Avatar id={avatar} size={64} animate={false} mood={sent ? 'success' : 'greeting'} decorative />
		<div>
			<h2 id="feedback-heading" bind:this={heading} tabindex="-1">
				{sent ? 'Takk! Meldingen er sendt.' : survey ? 'Utdyp svaret ditt' : 'Hva kan bli bedre?'}
			</h2>
			<p>
				{sent
					? 'Administratorene kan nå lese tilbakemeldingen din.'
					: survey ? 'Hva fungerte bra, eller hva kunne vært tydeligere?' : 'Fant du en feil, eller har du et forslag? Fortell oss om det.'}
			</p>
		</div>
	</div>
	{#if survey && !sent}<p><strong>{survey.prompt.question}</strong> {feedbackAnswers.find((item) => item.id === survey?.answer)?.label}</p>{/if}
	{#if source}<div class="source">
			<span>Gjelder siden</span><strong>{source.title}</strong><code>{source.href}</code><small
				>{survey ? 'Siden følger svaret ditt på oppgaven.' : 'Siden ble lagt ved automatisk da du åpnet skjemaet.'}</small
			>
			{#if !sent && source.href !== currentPage?.href}
				<small>Du har gått videre til en annen side. Utkastet gjelder fortsatt siden over.</small>
				<button class="secondary" type="button" disabled={busy} onclick={reset}
					>Forkast utkast og bruk denne siden</button
				>
			{/if}
		</div>{/if}
	{#if sent}
		<div class="actions">
			<button class="primary" onclick={close}>Tilbake til oppgaven</button><button
				class="secondary"
				onclick={reset}>Send en ny tilbakemelding</button
			>
		</div>
	{:else if $connection.publicHttp}
		<p>Åpne den sikre adressen for å sende tilbakemeldingen.</p>
		<a class="primary" href={secureHref($connection.httpsOrigin, source?.href ?? '/')}
			>Åpne siden på HTTPS →</a
		>
	{:else}
		<form onsubmit={send}>
			<label for="feedback-category">Hva gjelder det?</label>
			<select id="feedback-category" bind:value={category} disabled={busy}
				>{#each feedbackCategories as item}<option value={item.id}>{item.label}</option
					>{/each}</select
			>
			<label for="feedback-message">Meldingen din</label>
			<textarea
				id="feedback-message"
				bind:value={message}
				disabled={busy}
				maxlength={feedbackMaxLength}
				rows="5"
				required
				aria-describedby="feedback-help feedback-count"
				placeholder="Hva prøvde du å gjøre, og hva skjedde?"></textarea>
			<p id="feedback-count" class="count">{message.length} av {feedbackMaxLength} tegn</p>
			<p id="feedback-help" class="note">
				Bare administratorene kan lese dette. {$lab.user
					? `Profilnavnet ditt (${$lab.user.nickname}) følger med.`
					: 'Du sender uten profilnavn.'} Unngå passord og personlige opplysninger.
			</p>
			{#if error}<p class="error" role="alert">{error}</p>{/if}
			<div class="actions">
				<button class="primary" type="submit" disabled={busy}
					>{busy ? 'Sender …' : 'Send tilbakemelding'}</button
				><button type="button" class="secondary" onclick={close}>Lukk</button>
			</div>
			<p class="note" role="status">
				{busy
					? 'Venter på bekreftelse fra serveren.'
					: 'Meldingen sendes til administratorene. Du får ikke et KI-svar her.'}
			</p>
		</form>
	{/if}
	{#if $lab.user?.role === 'student'}<details class="prompt-settings"><summary>Innstillinger for spørsmål</summary><FeedbackPromptSettings /></details>{/if}
</dialog>

<style>
	.prompt-settings { margin-top: 20px; border-top: 1px solid var(--color-border); padding-top: 8px; }
	.prompt-settings summary { min-height: 44px; align-content: center; cursor: pointer; font-size: var(--font-small); }
	.feedback-space {
		height: calc(76px + env(safe-area-inset-bottom));
	}
	:global(html:has(.feedback-launcher)) {
		scroll-padding-bottom: 90px;
	}
	.feedback-launcher {
		position: fixed;
		right: max(14px, env(safe-area-inset-right));
		bottom: max(14px, env(safe-area-inset-bottom));
		z-index: 80;
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		max-width: calc(100% - 28px);
		padding: 10px 14px;
		border: 1px solid var(--color-border-strong);
		border-radius: 24px;
		background: var(--color-surface);
		color: var(--color-text-muted);
		font: 600 var(--font-small)/1.4 var(--font-ui);
		box-shadow: 0 2px 10px var(--color-shadow);
		cursor: pointer;
		overflow-wrap: anywhere;
	}
	.feedback-launcher.above-reward {
		visibility: hidden;
	}
	.feedback-launcher:hover {
		color: var(--color-accent);
		border-color: var(--color-accent);
	}
	.feedback-dialog {
		box-sizing: border-box;
		position: fixed;
		inset: auto max(14px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) auto;
		margin: 0;
		width: 480px;
		max-width: calc(100% - 28px);
		max-height: calc(100dvh - 28px);
		padding: 24px;
		overflow: auto;
		border: 1px solid var(--color-border-strong);
		border-radius: 16px;
		color: var(--color-text);
		background: var(--color-surface);
		font: var(--font-body)/1.5 var(--font-ui);
		overflow-wrap: anywhere;
		box-shadow: 0 12px 50px var(--color-shadow);
	}
	.feedback-dialog::backdrop {
		background: rgb(0 0 0 / 0.4);
	}
	.feedback-dialog :global(*) {
		box-sizing: border-box;
	}
	.dialog-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		color: var(--color-text-muted);
		font-size: var(--font-meta);
		font-weight: 700;
	}
	.close {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		padding: 0;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface);
		color: var(--color-text);
		font: 1.5rem var(--font-ui);
		cursor: pointer;
	}
	.greeting {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		margin: 20px 0;
	}
	.greeting :global(svg) {
		flex-shrink: 0;
	}
	h2 {
		margin: 0 0 8px;
		font-size: 1.45rem;
		line-height: 1.25;
	}
	p {
		margin: 0 0 16px;
	}
	.source {
		display: grid;
		gap: 4px;
		padding: 12px 14px;
		margin: 0 0 20px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface-soft);
	}
	.source span,
	.source code,
	.source small {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	label {
		display: block;
		font-weight: 650;
		margin: 16px 0 6px;
	}
	select,
	textarea {
		width: 100%;
		max-width: 100%;
		min-height: 44px;
		padding: 10px 12px;
		border: 1px solid var(--color-border-strong);
		border-radius: 7px;
		font: inherit;
		color: var(--color-text);
		background: var(--color-surface);
	}
	textarea {
		resize: vertical;
	}
	.count {
		text-align: right;
		font-size: var(--font-meta);
		color: var(--color-text-muted);
		margin: 6px 0 12px;
	}
	.note {
		color: var(--color-text-muted);
		font-size: var(--font-small);
		margin: 12px 0 0;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 20px;
	}
	.primary,
	.secondary {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		min-height: 44px;
		max-width: 100%;
		padding: 11px 16px;
		border: 1px solid var(--color-action);
		border-radius: 7px;
		color: var(--color-on-action);
		background: var(--color-action);
		font: 650 var(--font-small)/1.4 var(--font-ui);
		text-decoration: none;
		cursor: pointer;
	}
	.secondary {
		border-color: var(--color-border-strong);
		color: var(--color-text);
		background: var(--color-surface);
	}
	button:disabled {
		opacity: 0.65;
		cursor: default;
	}
	.error {
		margin: 16px 0 0;
		padding: 12px;
		border: 1px solid var(--color-danger-border);
		border-radius: 7px;
		color: var(--color-danger);
		background: var(--color-danger-soft);
	}
	:focus-visible,
	#feedback-heading:focus {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	@media (max-width: 500px) {
		.feedback-dialog {
			inset: auto 0 0;
			width: 100%;
			max-width: 100%;
			max-height: 92dvh;
			padding: 18px 16px max(18px, env(safe-area-inset-bottom));
			border-radius: 16px 16px 0 0;
		}
		.greeting {
			gap: 12px;
		}
	}
	@media (max-width: 350px) {
		.greeting {
			flex-direction: column;
		}
	}
</style>
