<script>
	/** @type {{value:number,maximum:number,reference?:number|null,highlight?:boolean}} */
	let { value, maximum, reference = null, highlight = false } = $props();
	const width = $derived(maximum > 0 ? Math.min(100, Math.max(0, (value / maximum) * 100)) : 0);
	const marker = $derived(
		reference !== null && maximum > 0
			? Math.min(100, Math.max(0, (reference / maximum) * 100))
			: null
	);
</script>

<!-- Exact XP and differences are text in the parent; this is a comparison, not completion. -->
<div class="xp-bar" class:highlight aria-hidden="true">
	<span class="fill" style:width={`${width}%`}></span>
	{#if marker !== null}<span class="reference" style:left={`${marker}%`}></span>{/if}
</div>

<style>
	.xp-bar {
		position: relative;
		height: 0.75rem;
		border-radius: 3px;
		background: var(--color-surface-soft);
		box-shadow: inset 0 0 0 1px var(--color-border-strong);
	}
	.fill {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--color-text-muted);
	}
	.highlight .fill {
		background: var(--color-accent);
	}
	.reference {
		position: absolute;
		top: -4px;
		bottom: -4px;
		width: 2px;
		transform: translateX(-50%);
		background: var(--color-text);
		box-shadow: 0 0 0 2px var(--color-surface);
		border-radius: 2px;
	}
	@media (forced-colors: active) {
		.fill,
		.highlight .fill {
			background: Highlight;
			forced-color-adjust: none;
		}
		.reference {
			background: CanvasText;
			box-shadow: 0 0 0 2px Canvas;
			forced-color-adjust: none;
		}
	}
</style>
