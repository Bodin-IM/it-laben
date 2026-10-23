<script>
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import { initializeTheme } from '#lib/theme.js';
	import '#lib/theme.css';

	/** @type {{children: import('svelte').Snippet}} */
	let { children } = $props();

	onMount(initializeTheme);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
