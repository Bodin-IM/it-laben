<script>
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { lab } from '#lib/lab.js';
	import AnimatedNumber from '#lib/components/AnimatedNumber.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import { connection } from '#lib/connection.js';

	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
	const settingsPage = $derived(
		mounted && page.url.pathname === '/min-lab/' && page.url.searchParams.get('visning') === 'innstillinger'
	);
</script>

<a
	href={$connection.publicHttp ? '/kom-i-gang/' : '/min-lab/'}
	class="account-link"
	aria-current={!settingsPage &&
	page.url.pathname === ($connection.publicHttp ? '/kom-i-gang/' : '/min-lab/')
		? 'page'
		: undefined}
>
	{#if $lab.user && $lab.summary}<Avatar
			id={$lab.summary.lab.avatarId}
			size={28}
			animate={false}
			decorative
		/>{:else}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"
			><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg
		>{/if}
	<span>Min lab</span>
	{#if $lab.user && $lab.summary}<span class="xp"
			><AnimatedNumber value={$lab.summary.xp} /> XP</span
		>{/if}
	{#if $lab.pending}<span
			class="pending"
			title="Fremgang venter på lagring"
			aria-label="Fremgang venter på lagring">•</span
		>{/if}
</a>

<style>
	.account-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		min-height: 44px;
		padding: 7px 11px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface);
		color: var(--color-accent);
		font:
			600 var(--font-small)/1.3 system-ui,
			sans-serif;
		text-decoration: none;
		max-width: 100%;
		flex-wrap: wrap;
	}
	.account-link:hover {
		background: var(--color-surface-hover);
	}
	.account-link[aria-current] {
		background: var(--color-accent-soft);
		border-color: var(--color-accent);
	}
	.account-link:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.account-link svg {
		width: 17px;
		height: 17px;
		stroke-width: 1.7;
		flex: 0 0 17px;
	}
	.xp {
		color: var(--color-text-muted);
		font-size: var(--font-meta);
	}
	.pending {
		color: var(--color-warning);
	}
	@media (max-width: 600px) {
		.xp {
			display: none;
		}
	}
</style>
