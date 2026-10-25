<script>
	/** @type {{symbol:string,earned?:boolean,size?:number}} */
	let { symbol, earned = false, size = 54 } = $props();
</script>

<span class="badge-icon" class:earned style:--badge-size={`${size}px`} aria-hidden="true">
	<svg viewBox="0 0 64 68" fill="none"
		><path d="M32 3 58 17v31L32 64 6 48V17L32 3Z" /><path
			class="inner"
			d="m32 10 20 11v23L32 56 12 44V21L32 10Z"
		/></svg
	>
	<span>{symbol}</span>
</span>

<style>
	.badge-icon {
		position: relative;
		display: inline-grid;
		place-items: center;
		flex: 0 0 auto;
		width: var(--badge-size);
		height: calc(var(--badge-size) * 1.06);
		color: var(--color-text-muted);
	}
	svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		stroke: var(--color-border-strong);
		stroke-width: 1.5;
		fill: var(--color-surface-soft);
	}
	.inner {
		fill: none;
		stroke: var(--color-border);
		stroke-width: 1;
	}
	.earned {
		color: var(--color-accent);
	}
	.earned svg {
		fill: var(--color-accent-soft);
		stroke: var(--color-accent);
	}
	.earned .inner {
		fill: none;
		stroke: var(--color-border-strong);
	}
	.badge-icon > span {
		position: relative;
		font:
			750 calc(var(--badge-size) * 0.3)/1 system-ui,
			sans-serif;
		letter-spacing: -0.06em;
	}
</style>
