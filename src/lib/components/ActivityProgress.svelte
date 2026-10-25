<script>
	import { page } from '$app/state';
	import { aktiviteter } from '#lib/innhold.js';
	import { lab, reviewLesson, startLesson, refreshLab } from '#lib/lab.js';
	import { checkpointsFor } from '#lib/checkpoints.js';
	import Checkpoint from '#lib/components/Checkpoint.svelte';
	const activity = $derived(aktiviteter.find((item) => item.href === page.url.pathname));
	const progress = $derived($lab.summary?.progress.find((item) => item.id === activity?.id));
	const questions = $derived(activity ? checkpointsFor(activity.id) : []);
	let startedFor = $state('');
	$effect(() => {
		const key = `${$lab.user?.id}:${activity?.id}`;
		if (
			activity?.tracking.kind === 'review' &&
			$lab.user &&
			progress?.status === 'new' &&
			startedFor !== key
		) {
			startedFor = key;
			startLesson(activity.id);
		}
	});
	const completed = $derived(progress?.status === 'reviewed' || progress?.status === 'passed');
</script>

{#if activity}
	<section class="activity-progress" aria-label="Din fremgang">
		<div>
			<p class="eyebrow">DIN FREMDRIFT</p>
			<h2>
				{completed
					? 'Dette har du fullført'
					: activity.tracking.kind !== 'review'
						? 'Ta vare på løsningene dine'
						: 'Ferdig med gjennomgangen?'}
			</h2>
			{#if !$lab.user}<p>
					Start Min lab for å lagre fremgang, samle XP og ta med profilen til en annen PC.
				</p>
				<a class="action" href="/min-lab/">Start min lab →</a>
			{:else if activity.tracking.kind === 'review'}<p>
					Marker leksjonen som gjennomgått når du har prøvd forsøkene og lest forklaringene. Dette
					er din egen gjennomgang. XP får du når du også har bestått fagsjekken nedenfor.
				</p>
				<button
					class="action"
					type="button"
					disabled={completed || $lab.pendingReviews.includes(activity.id)}
					onclick={() => reviewLesson(activity.id)}
					>{completed
						? '✓ Gjennomgått'
						: $lab.pendingReviews.includes(activity.id)
							? 'Venter på lagring …'
							: 'Jeg har gjennomgått dette'}</button
				>
			{:else}<p>
					{progress?.completed ?? 0} av {progress?.total ?? 0} oppdrag bestått og lagret. Du kan øve så
					mye du vil. XP får du når alle oppdragene og spillets fagsjekk er bestått.
				</p>
				<a href="/min-lab/">Se progresjonen din →</a>{/if}
		</div>
		{#if progress?.pendingXp}<p class="sync">
				{progress.pendingXp} XP venter på bestått fagsjekk. Arbeidet ditt er lagret.
			</p>{/if}
		{#if $lab.user && $lab.pending}<p class="sync" role="status">
				{$lab.pending}
				{$lab.pending === 1 ? 'forsøk venter' : 'forsøk venter'} på lagring.
				<button type="button" onclick={() => refreshLab()}>Prøv å synkronisere</button>
			</p>{/if}
		{#if $lab.error && $lab.user}<p class="sync" role="status">{$lab.error}</p>{/if}
		{#if $lab.storageWarning && $lab.pending}<p class="sync">
				Nettleseren tillater ikke lokal lagring. Hold fanen åpen til fremgangen er synkronisert.
			</p>{/if}
	</section>
	{#if questions.length}<div class="checkpoints">
			{#each questions as question (question.id)}<Checkpoint {question} />{/each}
		</div>{/if}
{/if}

<style>
	.checkpoints {
		width: min(1120px, calc(100% - 40px));
		margin: 0 auto 36px;
		display: grid;
		gap: 16px;
	}
	.activity-progress {
		box-sizing: border-box;
		width: min(1120px, calc(100% - 40px));
		margin: 0 auto 36px;
		padding: 24px;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
		color: var(--color-text);
		font-family: system-ui, sans-serif;
		overflow-wrap: anywhere;
	}
	.eyebrow {
		margin: 0 0 6px;
		font-size: var(--font-meta);
		letter-spacing: 1.5px;
		color: var(--color-accent);
		font-weight: 700;
	}
	h2 {
		font-size: 1.25rem;
		margin: 0 0 8px;
		line-height: 1.4;
	}
	p {
		margin: 8px 0 16px;
		font-size: var(--font-body);
		line-height: var(--leading-body);
		color: var(--color-text-muted);
	}
	a {
		color: var(--color-accent);
	}
	.action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		box-sizing: border-box;
		padding: 10px 16px;
		border: 1px solid var(--color-action);
		border-radius: 7px;
		background: var(--color-action);
		color: var(--color-on-action);
		font:
			600 var(--font-small)/1.5 system-ui,
			sans-serif;
		text-decoration: none;
		cursor: pointer;
		max-width: 100%;
	}
	.action:disabled {
		opacity: 0.7;
		cursor: default;
	}
	.sync {
		margin: 12px 0 0;
		font-size: var(--font-small);
		color: var(--color-warning);
	}
	.sync button {
		background: none;
		border: 0;
		padding: 4px;
		color: var(--color-accent);
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
</style>
