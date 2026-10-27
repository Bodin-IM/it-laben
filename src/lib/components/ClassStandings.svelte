<script>
	/** @type {{classes:import('#lib/school.js').ClassStanding[]}} */
	let { classes } = $props();
	const sorted = $derived(
		[...classes].sort((a, b) => b.xp - a.xp || a.classCode.localeCompare(b.classCode))
	);
	const leader = $derived(sorted.length > 1 && sorted[0].xp > sorted[1].xp ? sorted[0] : null);
	const totalXp = $derived(classes.reduce((total, item) => total + item.xp, 0));
	const participants = $derived(classes.reduce((total, item) => total + item.participants, 0));
</script>

<section class="standings" aria-label="Klassenes samlede XP">
	<p class="eyebrow">2ITA + 2ITB</p>
	<h2>
		{#if !participants}Hvilken klasse tar første steg?{:else if totalXp === 0}Klassene er klare til
			start{:else if leader}{leader.classCode} leder med {(
				sorted[0].xp - sorted[1].xp
			).toLocaleString('nb-NO')} XP{:else}Klassene står likt{/if}
	</h2>
	<p class="explanation">
		Klassen med mest samlet XP leder. Her teller alle synlige, aktive elevprofiler som har valgt
		klasse, også poeng opptjent før klassevalget.
	</p>
	<div class="classes">
		{#each classes as item}
			<article class:leading={leader?.classCode === item.classCode}>
				<div class="class-heading">
					<h3>{item.classCode}</h3>
					{#if leader?.classCode === item.classCode}<span class="tag">Leder</span>{/if}
				</div>
				<p class="points">{item.xp.toLocaleString('nb-NO')} <span>XP</span></p>
				<p class="participants">
					{item.participants}
					{item.participants === 1 ? 'deltaker' : 'deltakere'}
				</p>
			</article>
		{/each}
	</div>
	<p class="note">Skjulte profiler bidrar ikke til summen. Lik XP gir delt ledelse.</p>
</section>

<style>
	.standings {
		margin: 0 0 30px;
		padding: clamp(20px, 3vw, 32px);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		background: var(--color-surface);
	}
	.eyebrow {
		color: var(--color-accent);
		font-size: var(--font-meta);
		font-weight: 750;
		letter-spacing: 0.1em;
		margin: 0 0 10px;
	}
	h2 {
		font-size: clamp(1.5rem, 3vw, 2rem);
		margin: 0;
		letter-spacing: -0.03em;
	}
	.explanation,
	.note,
	.participants {
		color: var(--color-text-muted);
		line-height: 1.6;
	}
	.explanation {
		max-width: 70ch;
	}
	.classes {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		margin: 24px 0 16px;
	}
	article {
		padding: 20px;
		border: 1px solid var(--color-border);
		border-radius: 10px;
	}
	article.leading {
		background: var(--color-accent-soft);
		border-color: var(--color-accent);
	}
	.class-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
	}
	h3 {
		margin: 0;
		font-size: 1.25rem;
	}
	.tag {
		font-weight: 650;
		font-size: var(--font-small);
		color: var(--color-accent);
	}
	.points {
		font-size: clamp(1.8rem, 4vw, 2.75rem);
		font-weight: 750;
		font-variant-numeric: tabular-nums;
		margin: 12px 0 4px;
		overflow-wrap: anywhere;
	}
	.points span {
		font-size: 1rem;
		font-weight: 500;
	}
	.participants,
	.note {
		margin: 0;
		font-size: var(--font-small);
	}
	@media (max-width: 500px) {
		.classes {
			grid-template-columns: 1fr;
		}
	}
</style>
