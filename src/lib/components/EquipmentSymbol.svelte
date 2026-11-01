<script>
	/** @type {{category?:string|number|boolean}} */
	let { category = 'kamera' } = $props();
</script>

<svg viewBox="0 0 80 60" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
	{#if category === 'mikrofon'}
		<rect x="30" y="5" width="20" height="32" rx="10" /><path d="M23 25v4a17 17 0 0 0 34 0v-4M40 46v10M28 56h24M32 16h16M32 24h16" />
	{:else if category === 'lys'}
		<rect x="17" y="7" width="46" height="30" rx="3" /><path d="M24 14h32M24 22h32M24 30h32M40 38v17M28 57l12-8 12 8" />
	{:else}
		<path d="M10 18h15l5-8h20l5 8h15v34H10z" /><circle cx="40" cy="34" r="12" /><path d="M59 25h4" />
	{/if}
</svg>

<style>svg { width: 72px; height: 54px; flex: 0 0 auto; color: var(--color-info); }</style>
