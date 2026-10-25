<script>
	import { lab, saveCheckpoint } from '#lib/lab.js';
	import { rewardPolicy } from '#lib/progression.js';
	/** @type {{question:import('#lib/checkpoints.js').Checkpoint}} */
	let { question } = $props();
	const saved = $derived(
		$lab.summary?.progress
			.find((item) => item.id === question.activityId)
			?.objectives.find((item) => item.id === question.id)
	);
	const passed = $derived(saved?.completedAt != null);
	const pending = $derived(
		$lab.pendingObjectives.includes(`${question.activityId}:${question.id}`)
	);
	const savedChoice = $derived(
		saved?.solution && !Array.isArray(saved.solution) ? (saved.solution.choice ?? '') : ''
	);
	let selected = $state('');
	let restored = '';
	$effect(() => {
		const key = `${$lab.user?.id}:${question.activityId}:${question.id}:${saved?.updatedAt}`;
		if (key !== restored) {
			restored = key;
			selected = savedChoice;
		}
	});
	const tried = $derived(!!saved?.updatedAt && !passed && !pending && savedChoice === selected);
</script>

<section
	class="checkpoint"
	class:passed
	id={`fagsjekk-${question.id}`}
	aria-labelledby={`question-${question.id}`}
>
	<div class="heading">
		<span class="eyebrow">FAGSJEKK</span><span class="points"
			>{passed ? '✓ Bestått og lagret' : `${rewardPolicy.checked} XP · valgfri`}</span
		>
	</div>
	<h3 id={`question-${question.id}`}>{question.title}</h3>
	<form
		onsubmit={(event) => {
			event.preventDefault();
			if (selected && $lab.user && !pending && !passed)
				saveCheckpoint(question.activityId, question.id, selected);
		}}
	>
		<fieldset disabled={pending || passed}>
			<legend>{question.prompt}</legend>
			{#each question.choices as choice (choice.id)}
				<label class:chosen={selected === choice.id}
					><input
						type="radio"
						name={`${question.activityId}-${question.id}`}
						value={choice.id}
						bind:group={selected}
					/><span>{choice.label}</span></label
				>
			{/each}
		</fieldset>
		{#if $lab.user}
			<div class="actions">
				<button type="submit" disabled={!selected || pending || passed}
					>{passed
						? '✓ Fagsjekk bestått'
						: pending
							? 'Venter på lagring …'
							: 'Sjekk svaret mitt'}</button
				><span>Du kan bruke hint og prøve flere ganger.</span>
			</div>
		{:else}
			<p class="guest">
				Prøv selv og åpne forklaringen når du vil. <a href="/min-lab/">Start Min lab</a> for å få svaret
				kontrollert og lagre fremgangen.
			</p>
		{/if}
	</form>
	{#if passed}<p class="feedback success" role="status">{question.explanation}</p>
	{:else if tried}<p class="feedback" role="status">
			Ikke helt ennå. {question.hint} Velg et svar og prøv igjen.
		</p>{/if}
	<details>
		<summary>{!$lab.user ? 'Se forklaringen' : 'Vis et hint'}</summary>
		<p>{!$lab.user ? question.explanation : question.hint}</p>
	</details>
</section>

<style>
	.checkpoint {
		padding: 24px;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
		color: var(--color-text);
		scroll-margin-top: 24px;
		font:
			var(--font-body)/var(--leading-body) system-ui,
			sans-serif;
	}
	.checkpoint.passed {
		border-color: var(--color-success-border);
	}
	.heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px;
	}
	.eyebrow {
		font-size: var(--font-meta);
		letter-spacing: 1.4px;
		font-weight: 750;
		color: var(--color-accent);
	}
	.points {
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	h3 {
		margin: 8px 0;
		font-size: 1.2rem;
		line-height: 1.4;
	}
	fieldset {
		padding: 0;
		border: 0;
		margin: 0;
		min-width: 0;
	}
	legend {
		margin: 0 0 14px;
		padding: 0;
		width: 100%;
	}
	label {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px 14px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		margin-bottom: 8px;
		background: var(--color-surface);
		cursor: pointer;
		font-size: var(--font-small);
	}
	label.chosen {
		border-color: var(--color-accent);
		background: var(--color-accent-soft);
	}
	input {
		flex: 0 0 17px;
		width: 17px;
		height: 17px;
		margin: 4px 0 0;
		accent-color: var(--color-action);
	}
	label span {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 14px;
		margin-top: 15px;
	}
	.actions > span,
	.guest,
	details {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	button {
		border: 1px solid var(--color-action);
		border-radius: 7px;
		background: var(--color-action);
		color: var(--color-on-action);
		padding: 10px 16px;
		min-height: 44px;
		font:
			650 var(--font-small)/1.5 system-ui,
			sans-serif;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.7;
		cursor: default;
	}
	.feedback {
		padding: 12px 14px;
		border-radius: 8px;
		background: var(--color-warning-soft);
		color: var(--color-warning);
		font-size: var(--font-small);
	}
	.feedback.success {
		background: var(--color-success-soft);
		color: var(--color-success);
	}
	details {
		margin-top: 14px;
	}
	summary {
		cursor: pointer;
		min-height: 32px;
		color: var(--color-accent);
	}
	a {
		color: var(--color-accent);
	}
	button:focus-visible,
	input:focus-visible,
	summary:focus-visible,
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	@media (max-width: 480px) {
		.checkpoint {
			padding: 18px;
		}
	}
</style>
