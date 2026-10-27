<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { moduleContext } from '#lib/moduleNavigation.js';
	let ready = $state(false);
	onMount(() => {
		ready = true;
	});
	const context = $derived(
		ready ? moduleContext(page.url.pathname, page.url.searchParams.get('modul')) : null
	);
</script>

{#if context && page.url.searchParams.get('visning') !== 'presentasjon'}
	<nav class="module-context" aria-label="Tilbake til modulen">
		<a href={context.backHref}
			><span aria-hidden="true">←</span> Tilbake til {context.module.title}</a
		>
		<span class="context-label">Del av en modul</span>
	</nav>
{/if}

<style>
	.module-context {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 4px 20px;
		margin-bottom: 22px;
		padding: 10px 16px;
		border-left: 3px solid var(--color-info);
		background: var(--color-info-soft);
		border-radius: 0 8px 8px 0;
		font: 500 var(--font-small)/1.5 var(--font-ui);
	}
	a {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		min-height: 36px;
		color: var(--color-info);
		text-underline-offset: 4px;
		overflow-wrap: anywhere;
	}
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.context-label {
		color: var(--color-text-muted);
	}
	@media (max-width: 600px) {
		.context-label {
			display: none;
		}
	}
</style>
