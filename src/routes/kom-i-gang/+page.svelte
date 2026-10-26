<script>
	import SecureAccessGuide from '#lib/components/SecureAccessGuide.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
</script>

<svelte:head
	><title>Kom i gang med Min lab | IT-laben</title><meta
		name="robots"
		content="noindex"
	/></svelte:head
>
<div class="guide-page">
	<header><a class="brand" href="/">IT-laben.</a><ThemeToggle /></header>
	<main><SecureAccessGuide /></main>
</div>

<style>
	.guide-page {
		min-height: 100vh;
		background: radial-gradient(ellipse at 85% 0%, var(--color-page-glow), transparent 50%);
		color: var(--color-text);
		font-family: system-ui, sans-serif;
	}
	header,
	main {
		width: min(1120px, calc(100% - 40px));
		margin-inline: auto;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		min-height: 80px;
		border-bottom: 1px solid var(--color-border);
	}
	.brand {
		font-size: 21px;
		font-weight: 800;
		color: var(--color-text);
		text-decoration: none;
	}
	main {
		padding: 24px 0 50px;
	}
</style>
