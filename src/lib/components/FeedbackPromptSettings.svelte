<script>
	import { lab } from '#lib/lab.js';
	import { feedbackPromptPreference, setFeedbackPromptPreference, loadFeedbackPreference } from '#lib/activityFeedbackClient.js';
	let busy = $state(false), error = $state('');
	const accountId = $derived($lab.user?.role === 'student' ? $lab.user.id : null);
	$effect(() => { void accountId; error = ''; busy = false; });
	async function change(/** @type {boolean|null} */ enabled) {
		const actor = accountId;
		if (!actor || busy) return;
		busy = true;
		error = '';
		try {
			if (enabled === null) await loadFeedbackPreference();
			else await setFeedbackPromptPreference(enabled);
		} catch (problem) {
			if (actor === accountId) error = problem instanceof Error ? problem.message : 'Kunne ikke lagre innstillingen.';
		} finally { if (actor === accountId) busy = false; }
	}
</script>

{#if accountId}
	<div class="feedback-settings">
		<label><input type="checkbox" checked={$feedbackPromptPreference.accountId === accountId && $feedbackPromptPreference.enabled === true}
			disabled={busy || $feedbackPromptPreference.accountId !== accountId || $feedbackPromptPreference.enabled === null}
			onchange={(event) => change(event.currentTarget.checked)} />Spør meg om oppgavene</label>
		<p>Frivillig, høyst én gang om dagen. Lagres på profilen din.</p>
		{#if $feedbackPromptPreference.enabled === null}<button type="button" onclick={() => change(null)} disabled={busy}>Hent innstillingen</button>{/if}
		{#if busy}<p role="status">Lagrer …</p>{/if}
		{#if error}<p role="alert">{error}</p>{/if}
	</div>
{/if}

<style>
	.feedback-settings { color: var(--color-text); font: var(--font-small)/1.5 var(--font-ui); }
	label { display: flex; align-items: center; gap: 10px; min-height: 44px; font-weight: 600; }
	input { width: 18px; height: 18px; flex: 0 0 18px; accent-color: var(--color-action); }
	p { margin: 3px 0 8px; color: var(--color-text-muted); }
	button { min-height: 44px; font: inherit; background: var(--color-surface); color: var(--color-accent); border: 1px solid var(--color-border); border-radius: 7px; padding: 8px 12px; cursor: pointer; }
	:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
</style>
