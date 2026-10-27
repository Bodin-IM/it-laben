<script>
	import SecureAccessGuide from '#lib/components/SecureAccessGuide.svelte';
</script>

<svelte:head
	><title>Kom i gang med Min lab | IT-laben</title><meta
		name="robots"
		content="noindex"
	/></svelte:head
>
<div class="guide-page">
	<main id="hovedinnhold" tabindex="-1"><SecureAccessGuide /></main>
</div>

<style>
	.guide-page {
		min-height: 100vh;
		background: var(--color-page);
		color: var(--color-text);
		font-family: var(--font-ui);
	}
	main {
		width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		margin-inline: auto;
	}

	main {
		padding: 24px 0 50px;
	}
</style>
