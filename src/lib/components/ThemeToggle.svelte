<script>
	import { theme, setTheme } from '#lib/theme.js';
</script>

<div class="theme-toggle" role="group" aria-label="Fargetema" data-testid="theme-toggle">
	<button
		type="button"
		data-theme-option="light"
		aria-label="Lyst tema"
		aria-pressed={$theme.ready ? $theme.mode === 'light' : undefined}
		disabled={!$theme.ready}
		onclick={() => setTheme('light')}
	>
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.7"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
			/>
		</svg>
		<span>Lyst</span>
	</button>
	<button
		type="button"
		data-theme-option="dark"
		aria-label="Mørkt tema"
		aria-pressed={$theme.ready ? $theme.mode === 'dark' : undefined}
		disabled={!$theme.ready}
		onclick={() => setTheme('dark')}
	>
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.7"
			aria-hidden="true"
		>
			<path d="M20.9 13.4A9 9 0 0 1 10.6 3.1a9 9 0 1 0 10.3 10.3Z" />
		</svg>
		<span>Mørkt</span>
	</button>
</div>

<style>
	.theme-toggle {
		display: inline-flex;
		align-items: center;
		flex: 0 0 auto;
		gap: 2px;
		max-width: 100%;
		padding: 3px;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--color-surface-soft);
		font-family: inherit;
		line-height: 1;
	}
	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 36px;
		padding: 7px 11px;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--color-text-muted);
		font-family: inherit;
		font-size: 12px;
		font-weight: 600;
		line-height: 1.2;
		white-space: nowrap;
		cursor: pointer;
	}
	button:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}
	button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	button:disabled {
		cursor: default;
	}
	/* The early HTML script selects this before Svelte hydrates the buttons. */
	:global(html[data-theme='light']) button[data-theme-option='light'],
	:global(html[data-theme='dark']) button[data-theme-option='dark'] {
		background: var(--color-surface-raised);
		color: var(--color-accent);
		box-shadow: 0 1px 3px var(--color-shadow);
	}
	svg {
		width: 16px;
		height: 16px;
		flex: 0 0 16px;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
