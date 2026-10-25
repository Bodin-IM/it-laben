<script>
	import { avatarFeedback } from '#lib/avatarFeedback.js';
	import {
		activityLab as lab,
		learningContext,
		saveCheckpoint,
		openCheckpoint,
		refreshLab,
		refreshLearningActivity
	} from '#lib/lab.js';
	import { rewardPolicy } from '#lib/progression.js';
	import { assessmentPolicy } from '#lib/assessmentPolicy.js';
	/** @type {{question:import('#lib/checkpoints.js').Checkpoint}} */
	let { question } = $props();
	const saved = $derived(
		$lab.summary?.progress
			.find((item) => item.id === question.activityId)
			?.objectives.find((item) => item.id === question.id)
	);
	const status = $derived(saved?.assessment);
	const practice = $derived($learningContext.mode === 'practice');
	const teaching = $derived($learningContext.mode === 'teaching');
	const passed = $derived(status?.completed ?? saved?.completedAt != null);
	const pending = $derived(
		$lab.pendingObjectives.includes(`${question.activityId}:${question.id}`)
	);
	/** @type {import('#lib/assessmentPolicy.js').Assessment|null} */
	let assessment = $state(null);
	/** @type {Record<string,string>} */
	let answers = $state({});
	let loading = $state(false);
	let error = $state('');
	let owner = $state('');
	$effect(() => {
		const identity = `${$lab.user?.id}:${question.activityId}:${question.id}:${$learningContext.mode}:${$learningContext.openingId}`;
		if (owner !== identity) {
			owner = identity;
			assessment = null;
			answers = {};
			error = '';
			loading = false;
		}
	});
	const active = $derived.by(() => (passed || !status?.canStart ? null : assessment));
	const complete = $derived(active?.questions.every((item) => !!answers[item.id]) ?? false);
	const result = $derived(status?.lastResult);
	/** @param {number} timestamp */
	function dateLabel(timestamp) {
		return new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium', timeStyle: 'short' }).format(
			timestamp
		);
	}
	async function open(reset = false) {
		const accountId = $lab.user?.id;
		loading = true;
		error = '';
		try {
			const next = await openCheckpoint(question.activityId, question.id, reset);
			if ($lab.user?.id !== accountId) return;
			if (next?.id !== assessment?.id) answers = {};
			assessment = next;
			if (next)
				avatarFeedback(
					question.activityId,
					'thinking',
					'Ta deg tid. Bruk det du har sett i leksjonen eller spillet.'
				);
		} catch (problem) {
			if ($lab.user?.id === accountId) {
				error = problem instanceof Error ? problem.message : 'Kunne ikke åpne fagsjekken.';
				void refreshLab();
				void refreshLearningActivity();
			}
		} finally {
			if ($lab.user?.id === accountId) loading = false;
		}
	}
</script>

<section
	class="checkpoint"
	class:passed
	id={`fagsjekk-${question.id}`}
	aria-labelledby={`question-${question.id}`}
>
	<div class="heading">
		<span class="eyebrow">FAGSJEKK</span>
		<span class="points"
			>{passed
				? '✓ Bestått og lagret'
				: practice
					? 'Øving uten XP'
					: `${rewardPolicy.checked} XP + poengene fra arbeidet ditt`}</span
		>
	</div>
	<h3 id={`question-${question.id}`}>{question.title}</h3>
	<p class="rules">
		{assessmentPolicy.questionsPerAttempt} spørsmål · begge må være riktige · {practice
			? 'fri øving uten XP eller døgnsgrense.'
			: teaching
				? 'ett ekstra forsøk i denne åpningen.'
				: 'ett innsendt forsøk per 24 timer per aktivitet.'}
	</p>
	{#if !$lab.user}
		<p class="guest">
			<a href="/min-lab/">Start Min lab</a> for å ta fagsjekken og lagre XP. Du kan fortsatt lese og øve
			fritt.
		</p>
	{:else if !passed}
		{#if status?.openingUsed && teaching}<p class="feedback">
				Undervisningsforsøket i denne åpningen er brukt. Se tilbakemeldingen nedenfor.
			</p>
		{:else if status?.openingClosed && !status?.hasPending}<p class="feedback">
				Åpningen er stengt for nye forsøk.
			</p>
		{:else if !status?.prerequisitesMet}
			<p class="guest">
				Gjennomgå leksjonen og marker den som gjennomgått, eller løs alle spilloppdragene, for å
				åpne fagsjekken.
			</p>
		{:else if pending}
			<p class="feedback" role="status">
				Svaret ditt venter på lagring. Vi sender det samme forsøket på nytt når forbindelsen er
				tilbake.
			</p>
		{:else if status?.nextAttemptAt}
			<p class="feedback" role="status">
				Neste forsøk er tilgjengelig {dateLabel(status.nextAttemptAt)}. Les tilbakemeldingen og øv
				videre i mellomtiden.
			</p>
			<button type="button" onclick={() => refreshLab()}>Oppdater forsøksstatus</button>
		{:else if active}
			<form
				onsubmit={(event) => {
					event.preventDefault();
					if (active && complete && !pending)
						saveCheckpoint(question.activityId, question.id, active.id, answers);
				}}
			>
				{#each active.questions as item, index (item.id)}
					<fieldset disabled={pending}>
						<legend
							><span class="question-number">Spørsmål {index + 1} av {active.questions.length}</span
							>{item.prompt}</legend
						>
						{#each item.choices as choice (choice.id)}
							<label class:chosen={answers[item.id] === choice.id}>
								<input
									type="radio"
									name={item.id}
									value={choice.id}
									bind:group={answers[item.id]}
								/>
								<span>{choice.label}</span>
							</label>
						{/each}
					</fieldset>
				{/each}
				<div class="actions">
					<button type="submit" disabled={!complete || pending}>Lever fagsjekken</button><span
						>Forsøket brukes når alle svarene er levert. Du kan endre valgene før du leverer.</span
					>
				</div>
			</form>
		{:else}
			<p class="guest">
				Du kan lese og øve før du leverer. Å åpne sjekken bruker ikke forsøket. Neste forsøk har
				varierte spørsmål og blandet svarrekkefølge.
			</p>
			<button type="button" disabled={loading || !status?.canStart} onclick={() => open()}
				>{loading
					? 'Åpner …'
					: status?.hasPending
						? 'Fortsett fagsjekken'
						: 'Åpne fagsjekken'}</button
			>
		{/if}
	{/if}
	{#if error}<p class="feedback" role="alert">{error}</p>{/if}
	{#if result}
		<div class="result" aria-live="polite">
			<h4>{active ? 'Tilbakemelding fra forrige forsøk' : 'Resultatet ditt'}</h4>
			<p class="feedback" class:success={passed}>
				{result.score} av {result.total} riktige. {passed
					? practice
						? 'Øvingsforsøket er bestått og lagret uten XP.'
						: teaching
							? 'Bestått og lagret. Allerede opptjente XP gis ikke på nytt.'
							: 'Fagsjekken er bestått, og XP er lagret!'
					: practice
						? 'Les forklaringene og prøv et nytt øvingsforsøk når du vil.'
						: 'Begge svarene må være riktige for å få XP. Arbeidet ditt er fortsatt lagret.'}
			</p>
			<details open={!passed && !active}>
				<summary>Se tilbakemeldingen</summary>
				{#each result.questions as item}
					<div class="answer-result">
						<p><strong>{item.correct ? '✓' : 'Les forklaringen:'} {item.prompt}</strong></p>
						<p>Ditt svar: {item.selectedLabel}</p>
						{#if !item.correct}<p>Riktig svar: {item.correctLabel}</p>{/if}
						<p>{item.explanation}</p>
					</div>
				{/each}
			</details>
		</div>
	{/if}
	{#if practice && !active && result && $lab.user && status?.canStart}<div class="actions">
			<button type="button" disabled={loading || pending} onclick={() => open(true)}
				>Nytt øvingsforsøk</button
			><span>Ingen XP. Dagens ordinære forsøk beholdes.</span>
		</div>{/if}
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
	.rules {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.question-number {
		display: block;
		font-size: var(--font-small);
		color: var(--color-accent);
		margin-bottom: 6px;
	}
	.answer-result {
		border-top: 1px solid var(--color-border);
		margin-top: 12px;
		padding-top: 8px;
	}
	fieldset {
		padding: 0;
		border: 0;
		margin: 24px 0;
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
