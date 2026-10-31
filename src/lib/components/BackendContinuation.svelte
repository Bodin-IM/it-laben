<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { backendContinuation } from '#lib/backendCourse.js';
	/** @type {{activityId:string}} */
	let { activityId } = $props();
	let ready = $state(false);
	onMount(() => { ready = true; });
	const links = $derived(backendContinuation(activityId, ready && page.url.searchParams.get('forlop') === 'validering' && page.url.searchParams.get('oppdrag') === 'tekst', ready && page.url.hash === '#eget-prosjekt'));
</script>

{#if links && ready && page.url.searchParams.get('visning') !== 'presentasjon'}
	<nav class="continuation" aria-label="Videre i Backend-modulen">
		<div>
			<p>Når du er klar for neste del</p>
			{#if links.next}<a class="next" href={links.next.href}>{links.next.title} →</a>
			{:else}<p>Vis og forklar en rute i egen chat for en medelev. Velg en ny test sammen.</p>{/if}
		</div>
		<div class="back-links">
			<a href={links.backHref}>Til moduloversikten</a>
			{#if links.previous}<a href={links.previous.href}>← {links.previous.title}</a>{/if}
		</div>
	</nav>
{/if}

<style>
	.continuation { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px 28px; width: min(1120px, calc(100% - 40px)); box-sizing: border-box; margin: 28px auto; padding: 20px; border-top: 1px solid var(--color-border); font-family: var(--font-ui); color: var(--color-text); overflow-wrap: anywhere; }
	p { margin: 0 0 6px; max-width: 65ch; font-size: var(--font-small); line-height: 1.6; }
	a { display: inline-flex; align-items: center; min-height: 44px; color: var(--color-accent); text-underline-offset: 4px; }
	.next { font-size: var(--font-body); font-weight: 650; }
	.back-links { display: flex; flex-direction: column; align-items: flex-start; font-size: var(--font-small); }
	a:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	@media (max-width: 600px) { .continuation { padding-inline: 0; } }
</style>
