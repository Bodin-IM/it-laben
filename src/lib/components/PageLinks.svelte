<script>
	/** @type {{links: {href:string, label:string}[]}} */
	let { links } = $props();
</script>

<nav class="page-links" aria-label="Relatert innhold">
	{#each links as link (link.href)}<a href={link.href}>{link.label}</a>{/each}
</nav>

<style>
	.page-links {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 20px 0;
		font: 600 var(--font-small)/1.5 var(--font-ui);
	}
	a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 8px 14px;
		box-sizing: border-box;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface);
		color: var(--color-accent);
		text-decoration: none;
		overflow-wrap: anywhere;
	}
	a:hover {
		background: var(--color-accent-soft);
		border-color: var(--color-border-strong);
	}
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
</style>
