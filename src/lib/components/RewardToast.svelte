<script>
	import { rewardNotice } from '#lib/lab.js';
	$effect(() => {
		if ($rewardNotice) {
			const timer = setTimeout(() => rewardNotice.set(null), 6000);
			return () => clearTimeout(timer);
		}
	});
</script>

<div class="announcer" role="status" aria-live="polite" aria-atomic="true">
	{#if $rewardNotice}<div class="reward">
			<span class="star" aria-hidden="true">✦</span>
			<div>
				<strong>{$rewardNotice.message}</strong>{#if $rewardNotice.points}<span
						>+{$rewardNotice.points} XP · fremgangen er lagret</span
					>{/if}
			</div>
			<button type="button" aria-label="Lukk belønning" onclick={() => rewardNotice.set(null)}
				>×</button
			>
		</div>{/if}
</div>

<style>
	.announcer {
		position: fixed;
		bottom: 20px;
		right: 20px;
		z-index: 100;
		max-width: calc(100% - 40px);
		font-family: system-ui, sans-serif;
	}
	.reward {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 18px 20px;
		border: 1px solid var(--color-success-border);
		border-radius: 14px;
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: 0 12px 40px var(--color-shadow);
		animation: arrive 0.25s ease-out;
	}
	.reward div {
		display: grid;
		gap: 3px;
		overflow-wrap: anywhere;
	}
	.reward strong {
		font-size: var(--font-body);
	}
	.reward div span {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.star {
		font-size: 30px;
		color: var(--color-success);
	}
	button {
		border: 0;
		background: transparent;
		color: var(--color-text-muted);
		font: 24px system-ui;
		cursor: pointer;
		min-width: 36px;
		min-height: 36px;
	}
	button:focus-visible {
		outline: 3px solid var(--color-focus);
	}
	@keyframes arrive {
		from {
			transform: translateY(14px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.reward {
			animation: none;
		}
	}
</style>
