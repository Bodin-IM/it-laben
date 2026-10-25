<script>
	import { rewardNotice, lab } from '#lib/lab.js';
	import { playRewardSound } from '#lib/labPreferences.js';
	import BadgeIcon from '#lib/components/BadgeIcon.svelte';
	import AnimatedNumber from '#lib/components/AnimatedNumber.svelte';
	const played = new Set();
	$effect(() => {
		const notice = $rewardNotice;
		if (notice && notice.userId === $lab.user?.id) {
			if (notice.live && !played.has(notice.id)) {
				played.add(notice.id);
				playRewardSound(notice.kind);
			}
			const timer = setTimeout(() => rewardNotice.set(null), 6500);
			return () => clearTimeout(timer);
		}
	});
</script>

<div class="announcer" role="status" aria-live="polite" aria-atomic="true">
	{#if $rewardNotice && $rewardNotice.userId === $lab.user?.id}
		{#key $rewardNotice.id}
			<div
				class="reward"
				class:milestone={$rewardNotice.kind !== 'xp'}
				class:quiet={!$rewardNotice.live}
			>
				{#if $rewardNotice.kind === 'level'}
					<div class="level-symbol" aria-hidden="true">
						<span>{$rewardNotice.level}</span>{#each [0, 1, 2, 3, 4, 5] as index}<i
								style:--angle={`${index * 60}deg`}
							></i>{/each}
					</div>
				{:else}<div class="stamp">
						<BadgeIcon symbol={$rewardNotice.achievements[0]?.symbol ?? '✓'} earned size={52} />
					</div>{/if}
				<div class="copy">
					<span class="eyebrow"
						>{$rewardNotice.kind === 'level'
							? 'NYTT LABNIVÅ'
							: $rewardNotice.kind === 'achievement'
								? 'MERKE OPPNÅDD'
								: $rewardNotice.live
									? 'FREMOVER!'
									: 'LAGRET'}</span
					>
					<strong>{$rewardNotice.message}</strong>
					<span class="detail">{$rewardNotice.detail}</span>
					<div class="reward-bottom">
						{#if $rewardNotice.points}<span class="xp"
								>+<AnimatedNumber value={$rewardNotice.points} fromZero /> XP</span
							>{/if}<a href="/min-lab/#merker">Se i Min lab →</a>
					</div>
				</div>
				<button type="button" aria-label="Lukk belønning" onclick={() => rewardNotice.set(null)}
					>×</button
				>
			</div>
		{/key}
	{/if}
</div>

<style>
	.announcer {
		position: fixed;
		bottom: 22px;
		right: 22px;
		z-index: 100;
		width: min(440px, calc(100% - 44px));
		font-family: system-ui, sans-serif;
	}
	.reward {
		position: relative;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px 16px 20px 20px;
		border: 1px solid var(--color-success-border);
		border-radius: 16px;
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: 0 14px 48px var(--color-shadow);
		animation: arrive 0.25s ease-out;
	}
	.milestone {
		background: linear-gradient(125deg, var(--color-accent-soft), var(--color-surface) 75%);
	}
	.copy {
		display: grid;
		gap: 3px;
		min-width: 0;
		overflow-wrap: anywhere;
		flex: 1;
	}
	.eyebrow {
		font-size: 0.65rem;
		letter-spacing: 1.4px;
		color: var(--color-accent);
		font-weight: 750;
	}
	strong {
		font-size: 1.05rem;
		line-height: 1.4;
	}
	.detail {
		font-size: var(--font-small);
		color: var(--color-text-muted);
		line-height: 1.4;
	}
	.reward-bottom {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
		margin-top: 7px;
		font-size: var(--font-meta);
	}
	.xp {
		color: var(--color-success);
		font-weight: 750;
	}
	a {
		color: var(--color-accent);
		text-decoration: none;
	}
	button {
		align-self: flex-start;
		border: 0;
		background: transparent;
		color: var(--color-text-muted);
		font: 24px system-ui;
		cursor: pointer;
		width: 32px;
		min-height: 36px;
		flex: 0 0 32px;
		padding: 0;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.stamp {
		flex: 0 0 auto;
		animation: stamp 0.7s cubic-bezier(0.2, 0.8, 0.25, 1);
	}
	.level-symbol {
		position: relative;
		display: grid;
		place-items: center;
		width: 58px;
		height: 58px;
		flex: 0 0 58px;
		border-radius: 50%;
		border: 2px solid var(--color-accent);
		color: var(--color-accent);
		font-size: 1.6rem;
		font-weight: 800;
		animation: stamp 0.8s ease-out;
	}
	i {
		position: absolute;
		left: 27px;
		top: 27px;
		width: 4px;
		height: 4px;
		background: var(--color-accent);
		border-radius: 50%;
		animation: scatter 1s ease-out both;
		transform: rotate(var(--angle)) translateX(28px);
		pointer-events: none;
	}
	.quiet,
	.quiet .stamp {
		animation: none;
	}
	@keyframes arrive {
		from {
			transform: translateY(12px);
			opacity: 0;
		}
		to {
			transform: none;
			opacity: 1;
		}
	}
	@keyframes stamp {
		0% {
			transform: scale(0.85);
			opacity: 0;
		}
		65% {
			transform: scale(1.06);
			opacity: 1;
		}
		100% {
			transform: scale(1);
		}
	}
	@keyframes scatter {
		from {
			transform: rotate(var(--angle)) translateX(28px);
			opacity: 0.9;
		}
		to {
			transform: rotate(var(--angle)) translateX(47px);
			opacity: 0;
		}
	}
	:global(html[data-lab-motion='reduced']) .reward,
	:global(html[data-lab-motion='reduced']) .stamp,
	:global(html[data-lab-motion='reduced']) .level-symbol {
		animation: none;
	}
	:global(html[data-lab-motion='reduced']) i {
		display: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.reward,
		.stamp,
		.level-symbol {
			animation: none;
		}
		i {
			display: none;
		}
	}
	@media (max-width: 480px) {
		.announcer {
			bottom: 12px;
			right: 12px;
			width: calc(100% - 24px);
		}
		.reward {
			gap: 12px;
			padding: 16px 12px;
		}
	}
</style>
