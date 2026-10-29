<script>
	import { labPreferences, experienceReady, setLabPreferences } from '#lib/labPreferences.js';
</script>

<button
	id="lab-sound-toggle"
	type="button"
	class="sound-toggle"
	aria-label="Lyd i IT-laben"
	aria-pressed={$experienceReady ? $labPreferences.sound : undefined}
	disabled={!$experienceReady}
	title={$labPreferences.sound ? 'Lyd på · slå av' : 'Lyd av · slå på'}
	onclick={() => setLabPreferences({ sound: !$labPreferences.sound })}
>
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<path d="M11 5 6 9H3v6h3l5 4Z" />
		{#if $labPreferences.sound}
			<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
		{:else}
			<path d="m16 9 5 6m0-6-5 6" />
		{/if}
	</svg>
</button>

<style>
	.sound-toggle {
		display: inline-grid;
		place-items: center;
		flex: 0 0 44px;
		width: 44px;
		height: 44px;
		padding: 0;
		box-sizing: border-box;
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
		color: var(--color-text-muted);
		background: var(--color-surface);
		cursor: pointer;
		touch-action: manipulation;
	}
	.sound-toggle[aria-pressed='true'] {
		color: var(--color-accent);
		background: var(--color-accent-soft);
	}
	.sound-toggle:hover {
		background: var(--color-surface-hover);
	}
	.sound-toggle:disabled {
		cursor: default;
	}
	.sound-toggle:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	svg {
		width: 22px;
		height: 22px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
