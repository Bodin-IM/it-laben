<script>
	import BadgeIcon from '#lib/components/BadgeIcon.svelte';
	import { labColors } from '#lib/progression.js';
	import Avatar from '#lib/components/Avatar.svelte';
	import XpBar from '#lib/components/XpBar.svelte';
	/** @type {{entry:import('#lib/school.js').LeaderboardEntry,own?:boolean,maximum?:number|null,referenceXp?:number|null}} */
	let { entry, own = false, maximum = null, referenceXp = null } = $props();
	const color = $derived(labColors.find((item) => item.id === entry.colorId) ?? labColors[0]);
	const difference = $derived(referenceXp === null ? null : entry.xp - referenceXp);
	const comparison = $derived(
		!own && difference !== null
			? difference === 0
				? 'Samme XP som deg'
				: `${Math.abs(difference).toLocaleString('nb-NO')} XP ${difference > 0 ? 'foran' : 'bak'} deg`
			: maximum !== null && maximum > 0
				? entry.xp === maximum
					? 'Høyeste poengsum'
					: `${(maximum - entry.xp).toLocaleString('nb-NO')} XP bak førsteplass`
				: 'Ingen XP ennå'
	);
</script>

<article class:own style:--lab-color={color.color} style:--lab-background={color.background}>
	<span class="rank" aria-label={`Plass ${entry.rank}`}>{entry.rank.toLocaleString('nb-NO')}</span>
	<div class="identity">
		<span class="avatar"><Avatar id={entry.avatarId} size={44} animate={false} decorative /></span>
		<div class="name">
			<strong>{entry.nickname}</strong>
			<span class="level"
				>{entry.classCode ? `${entry.classCode} · ` : ''}Nivå {entry.level}{own
					? ' · Din profil'
					: ''}</span
			>
		</div>
		{#if entry.badge}<span class="badge"
				><BadgeIcon symbol={entry.badge.symbol} size={32} earned /><span>{entry.badge.title}</span
				></span
			>{/if}
	</div>
	<strong class="points">{entry.xp.toLocaleString('nb-NO')} <span>XP</span></strong>
	{#if maximum !== null}
		<div class="comparison">
			<XpBar value={entry.xp} {maximum} reference={own ? null : referenceXp} highlight={own} />
			<p>{comparison}</p>
		</div>
	{/if}
</article>

<style>
	article {
		display: grid;
		grid-template-columns: 2.25rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 12px 16px;
		padding: 18px 20px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		min-width: 0;
	}
	article.own {
		border-color: var(--color-accent);
		background: var(--color-accent-soft);
		box-shadow: inset 3px 0 0 var(--color-accent);
	}
	.rank {
		color: var(--color-text-muted);
		font-size: 1.25rem;
		font-weight: 750;
		text-align: center;
		font-variant-numeric: tabular-nums;
		overflow-wrap: anywhere;
	}
	.own .rank {
		color: var(--color-accent);
	}
	.identity {
		display: flex;
		gap: 12px;
		align-items: center;
		min-width: 0;
	}
	.name {
		min-width: 0;
	}
	.identity strong {
		font-size: var(--font-body);
		display: block;
		overflow-wrap: anywhere;
	}
	.avatar {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		display: grid;
		place-items: center;
		border-radius: 10px;
		background: var(--lab-background);
		border: 1px solid var(--lab-color);
	}
	.level {
		display: block;
		font-size: var(--font-meta);
		color: var(--color-text-muted);
		margin-top: 4px;
		line-height: 1.5;
	}
	.badge {
		display: flex;
		gap: 6px;
		align-items: center;
		margin-left: auto;
		max-width: 12rem;
		font-size: var(--font-meta);
		color: var(--color-text-muted);
	}
	.badge span {
		overflow-wrap: anywhere;
	}
	.points {
		font-size: 1.5rem;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.04em;
		text-align: right;
		overflow-wrap: anywhere;
	}
	.points span {
		font-size: var(--font-meta);
		font-weight: 500;
		letter-spacing: 0;
	}
	.comparison {
		grid-column: 2 / -1;
		min-width: 0;
	}
	.comparison p {
		margin: 8px 0 0;
		font-size: var(--font-meta);
		line-height: 1.5;
		color: var(--color-text-muted);
	}
	.own .comparison p {
		color: var(--color-accent);
	}
	@media (max-width: 800px) {
		.badge {
			display: none;
		}
	}
	@media (max-width: 600px) {
		article {
			grid-template-columns: 1.75rem minmax(0, 1fr);
			padding: 16px 12px;
			gap: 10px;
		}
		.identity {
			gap: 10px;
		}
		.points {
			grid-column: 2;
			font-size: 1.25rem;
			text-align: left;
		}
		.comparison {
			grid-column: 1 / -1;
		}
	}
</style>
