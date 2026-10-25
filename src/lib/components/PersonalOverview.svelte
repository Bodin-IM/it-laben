<script>
	import { lab } from '#lib/lab.js';
	import { fag } from '#lib/innhold.js';
	import { nearestAchievement, nextActivity } from '#lib/progression.js';
	import BadgeIcon from '#lib/components/BadgeIcon.svelte';
	import AnimatedNumber from '#lib/components/AnimatedNumber.svelte';
	/** @type {{subject?:string}} */
	let { subject = 'alle' } = $props();
	const nearest = $derived(nearestAchievement($lab.summary?.achievements ?? [], subject));
	const next = $derived(nextActivity($lab.summary?.progress ?? [], subject));
	const subjects = $derived(
		($lab.summary?.subjects ?? []).filter((item) => subject === 'alle' || item.id === subject)
	);
	const count = $derived(subjects.reduce((sum, item) => sum + item.completed, 0));
	const total = $derived(subjects.reduce((sum, item) => sum + item.total, 0));
	const title = $derived(
		subject === 'alle' ? 'Alle fag' : (fag.find((item) => item.id === subject)?.navn ?? subject)
	);
</script>

{#if $lab.user && $lab.summary}
	<section class="personal-overview" aria-label="Ditt neste steg">
		<div class="next-card">
			<div class="topline">
				<span class="eyebrow">DIN LAB · {title}</span><a href="/min-lab/">Min lab →</a>
			</div>
			<div class="next-content">
				<div class="next-copy">
					<p class="welcome">Hei, {$lab.user.nickname}.</p>
					<h2>
						{next ? next.title : total ? 'Alle dagens steg er gjennomført!' : 'Nye oppdrag kommer.'}
					</h2>
					<p>
						{count} av {total} publiserte aktiviteter {subject === 'alle'
							? 'gjennomgått eller bestått'
							: `i ${title.toLocaleLowerCase('nb-NO')}`}.{$lab.pending
							? ' Noe fremgang venter på lagring.'
							: ''}
					</p>
				</div>
				{#if next}<a class="continue" href={next.href}
						>{next.evidence === 'checked' ? 'Prøv fagsjekken' : 'Fortsett'}
						<span aria-hidden="true">→</span></a
					>{:else}<a class="continue" href="/min-lab/">Se samlingen →</a>{/if}
			</div>
			<div class="level-line">
				<span>Labnivå {$lab.summary.level}</span>
				<div
					class="level-track"
					role="progressbar"
					aria-label="Fremgang til neste labnivå"
					aria-valuenow={$lab.summary.xp % $lab.summary.xpPerLevel}
					aria-valuemin="0"
					aria-valuemax={$lab.summary.xpPerLevel}
				>
					<span
						style:width={`${(($lab.summary.xp % $lab.summary.xpPerLevel) / $lab.summary.xpPerLevel) * 100}%`}
					></span>
				</div>
				<strong><AnimatedNumber value={$lab.summary.xp} /> XP</strong>
			</div>
		</div>
		{#if nearest}
			<a class="goal-card" href={`/min-lab/?fag=${subject}#merke-${nearest.id}`}>
				<BadgeIcon symbol={nearest.symbol} size={52} />
				<div>
					<span class="eyebrow">NÆR NESTE MERKE</span>
					<h3>{nearest.title}</h3>
					<p>{nearest.completed} av {nearest.total} steg · Se veien videre →</p>
					<progress
						aria-label={`Fremgang mot ${nearest.title}`}
						value={nearest.completed}
						max={nearest.total}
					></progress>
				</div>
			</a>
		{:else}<a class="goal-card all-done" href="/min-lab/#merker"
				><BadgeIcon symbol="✦" earned size={52} />
				<div>
					<span class="eyebrow">DIN SAMLING</span>
					<h3>Se hva du har fått til</h3>
					<p>Merker, fagspor og ditt eget labkort →</p>
				</div></a
			>{/if}
	</section>
{/if}

<style>
	.personal-overview {
		display: grid;
		grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
		gap: 16px;
		margin: 0 0 28px;
		font-family: system-ui, sans-serif;
		color: var(--color-text);
	}
	.next-card,
	.goal-card {
		border: 1px solid var(--color-border);
		border-radius: 13px;
		background: var(--color-surface);
		padding: 20px 22px;
		min-width: 0;
	}
	.next-card {
		background: linear-gradient(110deg, var(--color-surface), var(--color-accent-soft));
	}
	.topline {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
	}
	.eyebrow {
		font-size: 0.68rem;
		letter-spacing: 1.3px;
		font-weight: 750;
		color: var(--color-accent);
	}
	a {
		color: var(--color-accent);
	}
	.topline a {
		font-size: var(--font-meta);
		text-decoration: none;
	}
	.next-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		margin: 10px 0 16px;
	}
	.next-copy {
		min-width: 0;
	}
	h2,
	h3,
	p {
		overflow-wrap: anywhere;
	}
	h2 {
		font-size: 1.05rem;
		line-height: 1.4;
		margin: 3px 0 5px;
		letter-spacing: -0.25px;
	}
	h3 {
		font-size: 1.05rem;
		line-height: 1.4;
		margin: 5px 0;
	}
	p {
		margin: 3px 0 0;
		color: var(--color-text-muted);
		font-size: var(--font-meta);
		line-height: 1.5;
	}
	.welcome {
		font-size: var(--font-small);
	}
	.continue {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		flex: 0 0 auto;
		padding: 10px 15px;
		border: 1px solid var(--color-action);
		border-radius: 8px;
		background: var(--color-action);
		color: var(--color-on-action);
		font-size: var(--font-small);
		font-weight: 650;
		text-decoration: none;
		min-height: 44px;
		box-sizing: border-box;
	}
	.level-line {
		display: flex;
		gap: 12px;
		align-items: center;
		font-size: var(--font-meta);
		color: var(--color-text-muted);
		flex-wrap: wrap;
	}
	.level-line > span,
	.level-line strong {
		white-space: nowrap;
	}
	.level-track {
		flex: 1 1 60px;
		height: 5px;
		background: var(--color-border);
		border-radius: 8px;
		overflow: hidden;
	}
	.level-track span {
		display: block;
		height: 100%;
		background: var(--color-accent);
		border-radius: inherit;
		transition: width 0.45s ease-out;
	}
	.goal-card {
		display: flex;
		align-items: center;
		gap: 18px;
		text-decoration: none;
		color: var(--color-text);
	}
	.goal-card > div {
		min-width: 0;
		flex: 1;
	}
	.goal-card:hover {
		border-color: var(--color-accent);
	}
	progress {
		display: block;
		width: 100%;
		height: 5px;
		margin-top: 12px;
		accent-color: var(--color-accent);
	}
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}
	:global(html[data-lab-motion='reduced']) .level-track span {
		transition: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.level-track span {
			transition: none;
		}
	}
	@media (max-width: 850px) {
		.personal-overview {
			grid-template-columns: 1fr;
		}
		.goal-card {
			padding-block: 16px;
		}
	}
	@media (max-width: 480px) {
		.next-card,
		.goal-card {
			padding: 18px;
		}
		.next-content {
			align-items: flex-start;
			flex-direction: column;
			gap: 12px;
		}
		.continue {
			align-self: stretch;
		}
	}
</style>
