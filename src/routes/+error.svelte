<script>
	import { page } from '$app/state';
</script>

<svelte:head
	><title>{page.status === 404 ? 'Siden finnes ikke' : 'Siden kunne ikke åpnes'} – IT-laben</title
	></svelte:head
>

<main id="hovedinnhold" tabindex="-1">
	<p class="eyebrow">IT-laben · {page.status}</p>
	<h1>{page.status === 404 ? 'Siden finnes ikke' : 'Siden kunne ikke åpnes'}</h1>
	<p>
		{page.status === 404
			? 'Lenken kan være gammel. Finn modulen eller aktiviteten i fagoversikten.'
			: 'Prøv å laste siden på nytt, eller gå til fagoversikten.'}
	</p>
	<a href="/">Til fagoversikten →</a>
</main>

<style>
	main {
		width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		margin: auto;
		padding-block: 48px 80px;
	}
	.eyebrow {
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	h1 {
		font-size: clamp(2rem, 5vw, 3rem);
		line-height: 1.2;
	}
	p {
		max-width: 65ch;
	}
	a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--color-accent);
		text-underline-offset: 4px;
	}
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
</style>
