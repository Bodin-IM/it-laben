<script>
	import BadgeIcon from '#lib/components/BadgeIcon.svelte';
	import { labColors } from '#lib/progression.js';
	import Avatar from '#lib/components/Avatar.svelte';
	/** @type {{entry:import('#lib/school.js').LeaderboardEntry,own?:boolean}} */
	let { entry, own = false } = $props();
	const color = $derived(labColors.find((item) => item.id === entry.colorId) ?? labColors[0]);
</script>

<article
	class:own
	class:podium={entry.rank <= 3}
	style:--lab-color={color.color}
	style:--lab-background={color.background}
>
	<span class="rank" aria-label={`Plass ${entry.rank}`}>{entry.rank.toLocaleString('nb-NO')}</span>
	<div class="identity">
		<span class="avatar"><Avatar id={entry.avatarId} size={44} animate={false} /></span>
		<div>
			<strong>{entry.nickname}</strong><span class="level"
				>Nivå {entry.level}{own ? ' · Din profil' : ''}</span
			>
		</div>
	</div>
	{#if entry.badge}<div class="badge" title={entry.badge.title}>
			<BadgeIcon symbol={entry.badge.symbol} size={40} earned /><span>{entry.badge.title}</span>
		</div>{/if}
	<strong class="points">{entry.xp.toLocaleString('nb-NO')} <span>XP</span></strong>
</article>

<style>
	article {
		display: flex;
		align-items: center;
		gap: 22px;
		padding: 20px 22px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		min-width: 0;
	}
	article.own {
		border-color: var(--color-accent);
		background: var(--color-accent-soft);
	}
	.rank {
		min-width: 32px;
		color: var(--color-text-muted);
		font-size: 22px;
		font-weight: 750;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}
	.podium .rank {
		color: var(--color-accent);
	}
	.identity {
		display: flex;
		gap: 14px;
		align-items: center;
		flex: 1;
		min-width: 0;
	}
	.identity strong {
		font-size: 17px;
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
		color: var(--lab-color);
		border: 1px solid var(--lab-color);
		font:
			750 13px/1 system-ui,
			sans-serif;
	}
	.level {
		display: block;
		font-size: 13px;
		color: var(--color-text-muted);
		margin-top: 4px;
	}
	.badge {
		display: flex;
		gap: 8px;
		align-items: center;
		max-width: 220px;
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.points {
		flex-shrink: 0;
		font-size: 24px;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.04em;
	}
	.points span {
		font-size: 12px;
		letter-spacing: 0;
	}
	@media (max-width: 650px) {
		article {
			padding: 16px 12px;
			gap: 12px;
		}
		.badge span {
			display: none;
		}
		.identity strong {
			font-size: 15px;
		}
	}
	@media (max-width: 430px) {
		.badge {
			display: none;
		}
		.identity {
			gap: 8px;
		}
		.avatar {
			width: 36px;
			height: 36px;
			border: 0;
		}
		.avatar :global(svg) {
			width: 36px;
			height: 36px;
		}
		.points {
			font-size: 20px;
		}
		.rank {
			font-size: 18px;
			min-width: 22px;
		}
	}
</style>
