<script>
	import Avatar from '#lib/components/Avatar.svelte';
	import { labPreferences } from '#lib/labPreferences.js';
	/** @type {{avatarId:string,mood?:import('#lib/avatarFeedback.js').AvatarMood,expanded?:boolean,reveal?:boolean}} */
	let { avatarId, mood = 'idle', expanded = false, reveal = false } = $props();
</script>

<span class="stage" class:expanded class:reveal data-scene={$labPreferences.partnerScene} aria-hidden="true">
	<span class="figure"><Avatar id={avatarId} {mood} size={68} decorative /></span>
</span>

<style>
	.stage {
		box-sizing: border-box;
		display: inline-grid;
		place-items: center;
		flex: none;
		width: 44px;
		height: 44px;
		padding: 0;
		border-radius: 18px;
		transition: width 240ms ease-out, height 240ms ease-out, padding 240ms ease-out;
	}
	.stage.expanded {
		width: 76px;
		height: 76px;
		padding: 4px;
		background-color: var(--color-surface-soft);
		background-image: linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px);
		background-size: 12px 12px;
	}
	.expanded[data-scene='space'] {
		background-image: radial-gradient(var(--color-accent) 1px, transparent 1.5px);
		background-size: 13px 17px;
	}
	.expanded[data-scene='garden'] {
		background-image: radial-gradient(ellipse at bottom, var(--color-accent), transparent 75%);
		background-size: 100% 100%;
	}
	.figure {
		display: block;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
	}
	.figure :global(.lab-avatar) { width: 100%; height: 100%; }
	.expanded.reveal { animation: open-partner 240ms ease-out; }
	@keyframes open-partner {
		from { transform: scale(0.58); }
		to { transform: scale(1); }
	}
	:global([data-lab-motion='reduced']) .stage { transition: none !important; animation: none !important; }
	@media (prefers-reduced-motion: reduce) {
		.stage { transition: none !important; animation: none !important; }
	}
</style>
