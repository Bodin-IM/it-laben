<script>
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import { initializeTheme } from '#lib/theme.js';
	import { initializeLab } from '#lib/lab.js';
	import ActivityProgress from '#lib/components/ActivityProgress.svelte';
	import RewardToast from '#lib/components/RewardToast.svelte';
	import '#lib/theme.css';

	/** @type {{children: import('svelte').Snippet}} */
	let { children } = $props();

	onMount(initializeTheme);
	onMount(initializeLab);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
<ActivityProgress />
<RewardToast />
