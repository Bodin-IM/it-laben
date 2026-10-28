<script>
	import { teachingPlans, presentationLessons, presentationLink } from '#lib/teaching.js';
	import { aktiviteter } from '#lib/innhold.js';
	/** @type {{module:import('#lib/moduler.js').Module}} */
	let { module } = $props();
	const plans = $derived(
		module.steps
			.filter((step) => step.kind === 'undervisning')
			.flatMap((step) => teachingPlans.filter((plan) => plan.id === step.id))
	);
	function firstLesson(/** @type {import('#lib/teaching.js').TeachingPlan} */ plan) {
		return (
			presentationLessons.find((item) => item.id === plan.lessonIds[0]) ??
			aktiviteter.find((item) => item.id === plan.lessonIds[0])
		);
	}
</script>

{#if plans.length}
	<section class="suggestions" aria-labelledby={`teaching-suggestions-${module.id}`}>
		<p class="eyebrow">FOR LÆREREN</p>
		<h2 id={`teaching-suggestions-${module.id}`}>Forslag til undervisning i denne modulen</h2>
		<p class="intro">
			Bruk opplegget som støtte til felles gjennomgang. Veiledningen samler forberedelser, spørsmål
			til klassen og lærernotater.
		</p>
		{#each plans as plan (plan.id)}
			<article>
				<div>
					<h3><a href={`/laerer/undervisning/?opplegg=${plan.id}`}>{plan.title}</a></h3>
					<p>{plan.description}</p>
					<p class="meta">Ca. {plan.minutes} min · {plan.lessonIds.length} leksjoner</p>
				</div>
				<div class="actions">
					<a class="primary" href={`/laerer/undervisning/?opplegg=${plan.id}`}
						>Åpne lærerveiledningen →</a
					>
					{#if firstLesson(plan)}<a href={presentationLink(firstLesson(plan)?.href ?? '/', plan.id)}
							>Vis gjennomgangen på storskjerm →</a
						>{/if}
				</div>
			</article>
		{/each}
	</section>
{/if}

<style>
	.suggestions {
		margin-block: 20px;
		padding: 24px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		background: var(--color-surface);
	}
	.eyebrow {
		font-size: var(--font-meta);
		font-weight: 700;
		color: var(--color-accent);
		margin: 0 0 8px;
	}
	h2 {
		font-size: 1.3rem;
		line-height: 1.35;
		margin: 0 0 10px;
	}
	h3 {
		font-size: 1.125rem;
		line-height: 1.4;
		margin: 0 0 8px;
	}
	p {
		margin: 0 0 12px;
		line-height: 1.6;
	}
	.intro {
		max-width: 78ch;
		color: var(--color-text-muted);
	}
	article {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px 24px;
		margin-top: 18px;
		padding-top: 18px;
		border-top: 1px solid var(--color-border);
	}
	article > div:first-child {
		flex: 1 1 330px;
		min-width: 0;
	}
	.meta {
		font-size: var(--font-small);
		color: var(--color-text-muted);
		margin: 0;
	}
	.actions {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
	}
	a {
		color: var(--color-accent);
		text-underline-offset: 4px;
		overflow-wrap: anywhere;
	}
	.actions a {
		padding-block: 10px;
		font-size: var(--font-small);
		min-height: 44px;
	}
	a.primary {
		padding: 11px 16px;
		border-radius: 7px;
		font-weight: 650;
		text-decoration: none;
		color: var(--color-on-action);
		background: var(--color-action);
	}
	a.primary:hover {
		background: var(--color-action-hover);
	}
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	@media (max-width: 500px) {
		.suggestions {
			padding: 20px 16px;
		}
	}
</style>
