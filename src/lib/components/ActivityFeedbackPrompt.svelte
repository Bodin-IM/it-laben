<script>
	import { onMount, untrack, tick } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { lab } from '#lib/lab.js';
	import { feedbackRequest } from '#lib/feedbackClient.js';
	import { feedbackAnswers } from '#lib/activityFeedback.js';
	import { feedbackOpportunity, feedbackPromptPreference, resetFeedbackSession, loadFeedbackPreference, setFeedbackPromptPreference, leaveFeedbackActivity } from '#lib/activityFeedbackClient.js';
	import Avatar from '#lib/components/Avatar.svelte';
	/** @type {{enabled:boolean,avatar:string,oncomment:(prompt:import('#lib/activityFeedback.js').FeedbackPrompt,answer:string)=>void,onclose:()=>void}} */
	let { enabled, avatar, oncomment, onclose } = $props();
	/** @type {import('#lib/activityFeedback.js').FeedbackPrompt|null} */
	let prompt = $state(null);
	/** @type {HTMLElement|undefined} */
	let card = $state();
	/** @type {HTMLHeadingElement|undefined} */
	let heading = $state();
	let busy = $state(false), answer = $state(''), error = $state(''), pendingAnswer = $state('');
	const accountId = $derived($lab.user?.role === 'student' ? $lab.user.id : null);
	let serial = 0, considered = '';
	/** @type {AbortController|null} */
	let controller = null;
	function clear() {
		serial++;
		controller?.abort();
		controller = null;
		prompt = null;
		busy = false;
		answer = '';
		pendingAnswer = '';
		error = '';
	}
	$effect(() => {
		const actor = accountId;
		untrack(() => {
			clear();
			considered = '';
			resetFeedbackSession();
			if (actor) void loadFeedbackPreference().catch(() => {});
		});
		return () => { clear(); };
	});
	function safeMoment() {
		return document.visibilityState === 'visible' && !document.querySelector('dialog[open]') &&
			!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');
	}
	function coversFocus() {
		const focused = document.activeElement;
		if (!card || !(focused instanceof HTMLElement) || focused === document.body || card.contains(focused)) return false;
		const a = card.getBoundingClientRect(), b = focused.getBoundingClientRect();
		return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
	}
	async function offer(/** @type {import('#lib/activityFeedbackClient.js').FeedbackOpportunity} */ opportunity) {
		if (!safeMoment()) return;
		const request = ++serial;
		controller?.abort();
		controller = new AbortController();
		try {
			const result = await feedbackRequest('/feedback/prompts', opportunity, controller.signal);
			if (request !== serial || opportunity.accountId !== accountId || !enabled || !safeMoment()) return;
			prompt = result.prompt;
			answer = '';
			pendingAnswer = '';
			error = '';
			await tick();
			if (request === serial && coversFocus()) dismiss();
		} catch { /* Optional invitation: never interrupt the activity with a network error. */ }
		finally { if (request === serial) controller = null; }
	}
	$effect(() => {
		const opportunity = $feedbackOpportunity;
		const allowed = enabled && accountId && $feedbackPromptPreference.accountId === accountId && $feedbackPromptPreference.enabled === true;
		if (!opportunity || opportunity.id === considered) return;
		considered = opportunity.id;
		if (allowed && opportunity.accountId === accountId) untrack(() => { void offer(opportunity); });
	});
	// Do not reappear later over a modal, a reward, or on a teacher page.
	$effect(() => {
		const switchedOff = $feedbackPromptPreference.enabled === false;
		if (!enabled || switchedOff) untrack(() => {
			const restore = switchedOff && !!card?.contains(document.activeElement);
			clear();
			if (restore) onclose();
		});
	});
	afterNavigate(({ to, type }) => {
		if (type !== 'enter') clear();
		if (to) leaveFeedbackActivity(to.url.pathname);
	});
	function dismiss(restoreFocus = false) {
		const current = prompt;
		if (current && !answer && !pendingAnswer)
			void feedbackRequest(`/feedback/prompts/${current.id}`, { dismiss: true }).catch(() => {});
		clear();
		if (restoreFocus) onclose();
	}
	onMount(() => {
		function continuing(/** @type {Event} */ event) {
			if (event.target instanceof Node && card?.contains(event.target)) return;
			if (!busy && !pendingAnswer) dismiss();
		}
		function keydown(/** @type {KeyboardEvent} */ event) {
			if (event.key === 'Escape' && prompt && !document.querySelector('dialog[open]')) {
				const inside = !!card?.contains(document.activeElement);
				dismiss(inside);
			}
			else if (!['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) continuing(event);
		}
		function focusChanged() { if (coversFocus()) dismiss(); }
		function hidden() { if (document.visibilityState !== 'visible') dismiss(); }
		document.addEventListener('pointerdown', continuing);
		document.addEventListener('input', continuing);
		document.addEventListener('keydown', keydown);
		document.addEventListener('focusin', focusChanged);
		document.addEventListener('visibilitychange', hidden);
		return () => {
			clear();
			document.removeEventListener('pointerdown', continuing);
			document.removeEventListener('input', continuing);
			document.removeEventListener('keydown', keydown);
			document.removeEventListener('focusin', focusChanged);
			document.removeEventListener('visibilitychange', hidden);
		};
	});
	async function respond(/** @type {string} */ value) {
		if (!prompt || busy || answer) return;
		const current = prompt, request = ++serial;
		busy = true;
		pendingAnswer = value;
		error = '';
		controller = new AbortController();
		try {
			const result = await feedbackRequest(`/feedback/prompts/${current.id}`, { answer: value }, controller.signal);
			if (request !== serial) return;
			const hadFocus = !!card?.contains(document.activeElement);
			answer = result.answer;
			pendingAnswer = '';
			await tick();
			if (hadFocus && request === serial) heading?.focus({ preventScroll: true });
		} catch (problem) {
			if (request === serial) error = problem instanceof Error ? problem.message : 'Kunne ikke bekrefte svaret. Prøv igjen.';
		} finally { if (request === serial) { busy = false; controller = null; } }
	}
	async function disable() {
		if (busy) return;
		const request = ++serial;
		busy = true;
		error = '';
		try {
			await setFeedbackPromptPreference(false);
			if (request === serial) dismiss(true);
		} catch (problem) {
			if (request === serial) error = problem instanceof Error ? problem.message : 'Kunne ikke lagre innstillingen.';
		} finally { if (request === serial) busy = false; }
	}
</script>

<p class="sr-only" role="status">{enabled && prompt && !answer ? `Et frivillig spørsmål om ${prompt.title} er tilgjengelig ved tilbakemeldingsknappen.` : ''}</p>
{#if enabled && prompt}
	<aside class="prompt" bind:this={card} aria-labelledby="activity-feedback-heading">
		<div class="greeting">
			<Avatar id={avatar} size={48} animate={false} mood="greeting" decorative />
			<div><p class="activity">{prompt.title}</p>
				<h2 id="activity-feedback-heading" tabindex="-1" bind:this={heading}>{answer ? 'Takk! Svaret er lagret.' : prompt.question}</h2>
			</div>
		</div>
		{#if answer}
			<div class="answers">
				<button type="button" onclick={() => { if (prompt) oncomment(prompt, answer); clear(); }}>Legg til en kommentar</button>
				<button type="button" onclick={() => dismiss(true)}>Lukk</button>
			</div>
		{:else}
			<div class="answers" role="group" aria-label={prompt.question}>
				{#each feedbackAnswers as item}
					<button type="button" disabled={busy || !!pendingAnswer} onclick={() => respond(item.id)}><span aria-hidden="true">{item.symbol}</span>{item.label}</button>
				{/each}
			</div>
			<p class="note">Frivillig · Administratorene ser svaret og profilnavnet ditt.</p>
			<div class="options">
				<button type="button" onclick={() => dismiss(true)}>Hopp over</button>
				<button type="button" onclick={disable} disabled={busy}>Ikke spør meg igjen</button>
			</div>
		{/if}
		{#if busy}<p class="note" role="status">Lagrer …</p>{/if}
		{#if error}<p class="error" role="alert">{error}</p>
			{#if pendingAnswer}<button type="button" disabled={busy} onclick={() => respond(pendingAnswer)}>Prøv å lagre igjen</button>{/if}
		{/if}
	</aside>
{/if}

<style>
	.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
	.prompt { position: fixed; right: max(14px, env(safe-area-inset-right)); bottom: calc(74px + env(safe-area-inset-bottom)); z-index: 81; width: 350px; max-width: calc(100vw - 28px); max-height: calc(100dvh - 104px); overflow: auto; box-sizing: border-box; padding: 16px; border: 1px solid var(--color-border-strong); border-radius: 14px; background: var(--color-surface); color: var(--color-text); box-shadow: 0 8px 32px var(--color-shadow); font: var(--font-small)/1.5 var(--font-ui); overflow-wrap: anywhere; animation: arrive 180ms ease-out; }
	.greeting { display: flex; align-items: flex-start; gap: 10px; }
	.greeting :global(svg) { flex-shrink: 0; }
	h2 { margin: 0 0 12px; font-size: 1.05rem; line-height: 1.4; }
	.activity, .note { color: var(--color-text-muted); font-size: var(--font-meta); margin: 0 0 6px; }
	.note { margin-top: 8px; }
	.answers, .options { display: flex; flex-wrap: wrap; gap: 6px; }
	.answers > button { flex: 1; }
	button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; padding: 8px 10px; border: 1px solid var(--color-border-strong); border-radius: 8px; background: var(--color-surface); color: var(--color-text); font: inherit; cursor: pointer; }
	button:hover { border-color: var(--color-accent); }
	button:disabled { opacity: 0.65; cursor: default; }
	.options { justify-content: space-between; }
	.options button { border-color: transparent; padding-inline: 4px; text-decoration: underline; color: var(--color-text-muted); font-size: var(--font-meta); }
	.error { color: var(--color-danger); }
	:focus-visible, h2:focus { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	@keyframes arrive { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
	:global(html[data-lab-motion='reduced']) .prompt { animation: none; }
	@media (prefers-reduced-motion: reduce) { .prompt { animation: none; } }
</style>
