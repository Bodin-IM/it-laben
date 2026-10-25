<script>
	import { tick } from 'svelte';
	import { lab } from '#lib/lab.js';
	import BadgeIcon from '#lib/components/BadgeIcon.svelte';
	/** @type {{subject?:string}} */
	let { subject = 'alle' } = $props();
	const achievements = $derived(
		($lab.summary?.achievements ?? []).filter(
			(item) =>
				subject === 'alle' ||
				item.subjects.includes(subject) ||
				(!item.subjects.length &&
					item.requirements.some((requirement) => requirement.subject === subject))
		)
	);
	let opened = '';
	$effect(() => {
		const ids = achievements.map((item) => `merke-${item.id}`);
		if (typeof window === 'undefined') return;
		const target = window.location.hash.slice(1);
		const key = `${$lab.user?.id}:${target}`;
		if (ids.includes(target) && opened !== key) {
			opened = key;
			void tick().then(() => {
				const element = document.getElementById(target);
				if (element instanceof HTMLDetailsElement) {
					element.open = true;
					element.scrollIntoView({ block: 'start' });
				}
			});
		}
	});
	/** @param {import('#lib/progression.js').Goal} goal @returns {boolean} */
	function listsAllRequirements(goal) {
		return goal.type === 'count'
			? false
			: goal.type === 'all'
				? goal.goals.every(listsAllRequirements)
				: true;
	}
	/** @param {number} date */
	const formatDate = (date) =>
		new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }).format(
			date
		);
</script>

<section class="achievements" id="merker" aria-labelledby="achievements-title">
	<div class="section-heading">
		<div>
			<span class="eyebrow">SMÅ OG STORE MILEPÆLER</span>
			<h2 id="achievements-title">Dine merker</h2>
		</div>
		<span
			>{achievements.filter((item) => item.earnedAt !== null).length} av {achievements.length} oppnådd</span
		>
	</div>
	<div class="badge-grid">
		{#each achievements as achievement (achievement.id)}
			<details
				class="badge"
				class:earned={achievement.earnedAt !== null}
				id={`merke-${achievement.id}`}
			>
				<summary
					><BadgeIcon
						symbol={achievement.symbol}
						earned={achievement.earnedAt !== null}
						size={48}
					/>
					<div>
						<span class="badge-status"
							>{achievement.earnedAt !== null
								? '✓ Oppnådd'
								: achievement.optional
									? 'Utforsk begge fag'
									: 'På vei'}</span
						>
						<h3>{achievement.title}</h3>
						<span class="count"
							>{achievement.completed} av {achievement.total} steg
							<span aria-hidden="true">→</span></span
						>
					</div></summary
				>
				<progress
					aria-label={`Fremgang mot ${achievement.title}`}
					value={achievement.earnedAt !== null ? achievement.total : achievement.completed}
					max={achievement.total}
				></progress>
				<div class="badge-details">
					<p>{achievement.description}</p>
					{#if achievement.earnedAt !== null}<p class="earned-date">
							Oppnådd {formatDate(achievement.earnedAt)}. Du beholder merket.
						</p>{:else if achievement.next}<a
							class="next"
							href={(subject !== 'alle' && !achievement.subjects.length
								? achievement.requirements.find(
										(item) => !item.completed && item.subject === subject
									)?.href
								: null) ?? achievement.next.href}>Neste steg →</a
						>{/if}
					{#if listsAllRequirements(achievement.goal)}<ul>
							{#each achievement.requirements as requirement (requirement.id)}<li>
									<span aria-hidden="true">{requirement.completed ? '✓' : '○'}</span><a
										href={requirement.href}>{requirement.title}</a
									>
								</li>{/each}
						</ul>{/if}
				</div>
			</details>
		{/each}
	</div>
	{#if !achievements.length}<p class="empty">
			Her kommer merker når flere aktiviteter blir tilgjengelige i faget.
		</p>{/if}
</section>

<style>
	.achievements {
		margin-block: 36px;
		scroll-margin-top: 24px;
		color: var(--color-text);
		font-family: system-ui, sans-serif;
	}
	.section-heading {
		display: flex;
		justify-content: space-between;
		align-items: end;
		flex-wrap: wrap;
		gap: 16px;
		margin-bottom: 15px;
	}
	.section-heading > span {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.eyebrow {
		font-size: 0.68rem;
		letter-spacing: 1.4px;
		font-weight: 750;
		color: var(--color-accent);
	}
	h2 {
		font-size: 1.3rem;
		letter-spacing: -0.4px;
		line-height: 1.4;
		margin: 5px 0 0;
	}
	.badge-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
		align-items: start;
	}
	.badge {
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
		overflow: hidden;
		scroll-margin-top: 24px;
	}
	.badge:target {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}
	.badge.earned {
		border-color: var(--color-success-border);
		background: linear-gradient(140deg, var(--color-accent-soft), var(--color-surface) 70%);
	}
	summary {
		display: flex;
		gap: 14px;
		align-items: center;
		padding: 18px;
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary > div {
		min-width: 0;
		flex: 1;
	}
	h3 {
		font-size: var(--font-body);
		line-height: 1.4;
		margin: 3px 0;
		overflow-wrap: anywhere;
	}
	.badge-status,
	.count {
		font-size: var(--font-meta);
		color: var(--color-text-muted);
	}
	.earned .badge-status {
		color: var(--color-success);
	}
	.count {
		display: flex;
		justify-content: space-between;
		gap: 10px;
	}
	.count > span {
		color: var(--color-accent);
	}
	progress {
		width: 100%;
		height: 4px;
		display: block;
		border: none;
		accent-color: var(--color-accent);
	}
	.badge-details {
		padding: 14px 18px 18px;
		font-size: var(--font-small);
		line-height: 1.6;
	}
	p {
		margin: 0 0 12px;
		color: var(--color-text-muted);
	}
	.earned-date {
		font-size: var(--font-meta);
		color: var(--color-success);
	}
	a {
		color: var(--color-accent);
	}
	.next {
		display: inline-block;
		min-height: 32px;
		font-weight: 650;
	}
	ul {
		list-style: none;
		padding: 0;
		margin: 10px 0 0;
	}
	li {
		display: flex;
		align-items: baseline;
		gap: 8px;
		padding: 7px 0;
		border-top: 1px solid var(--color-border);
	}
	li > span {
		color: var(--color-success);
		flex: 0 0 13px;
	}
	li a {
		color: var(--color-text);
		text-decoration: none;
		overflow-wrap: anywhere;
	}
	li a:hover {
		text-decoration: underline;
	}
	summary:focus-visible,
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: -3px;
	}
	@media (max-width: 900px) {
		.badge-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 560px) {
		.badge-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
