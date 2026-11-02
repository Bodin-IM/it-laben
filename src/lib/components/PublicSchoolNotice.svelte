<script>
	import { siteHref } from '#lib/sitePaths.js';
	/** @type {{title:string,description:string}} */
	let { title, description } = $props();
</script>

<main id="hovedinnhold" tabindex="-1" class="school-notice">
	<p class="eyebrow">Skoleversjonen</p>
	<h1>{title}</h1>
	<p>{description}</p>
	<p>Du kan utforske modulene og de åpne øvingene her.</p>
	<a href={siteHref('/')}>Til fagoversikten →</a>
</main>

<style>
	.school-notice { width: min(65ch, calc(100% - 2 * var(--layout-gutter))); margin: 40px auto 64px; color: var(--color-text); font-family: var(--font-ui); }
	p { font-size: var(--font-body); line-height: var(--leading-body); }
	.eyebrow { color: var(--color-text-muted); font-size: var(--font-small); }
	a { display: inline-flex; align-items: center; min-height: 44px; color: var(--color-accent); }
	a:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 4px; }
</style>
