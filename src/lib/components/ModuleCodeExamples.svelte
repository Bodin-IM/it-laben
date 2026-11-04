<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { moduleCodeExamples, moduleCodeExampleSelection } from '#lib/moduleCodeExamples.js';
	import { moduleLink } from '#lib/moduleNavigation.js';
	import AnnotatedCode from '#lib/components/AnnotatedCode.svelte';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	/** @type {{moduleId:string}} */
	let { moduleId } = $props();
	const examples = $derived(moduleCodeExamples(moduleId));
	const exampleId = $derived(page.url.searchParams.get('eksempel'));
	const current = $derived(moduleCodeExampleSelection(moduleId, exampleId, page.url.searchParams.get('fil')));
	const example = $derived(current.example);
	const file = $derived(current.file);
	const related = $derived((example?.relatedIds ?? []).flatMap((id) => examples.filter((item) => item.id === id)));
	const fileKey = $derived(`${moduleId}:${example?.id}:${file?.id}`);
	/** @type {{key:string,lineId:string|null}|null} */
	let selection = $state(null);
	const lineId = $derived(selection?.key === fileKey ? selection.lineId : null);
	/** @param {string|null} [id] @param {string|null} [fileId] */
	function href(id = null, fileId = null) {
		const query = new URLSearchParams({ visning: 'eksempler' });
		if (id) query.set('eksempel', id);
		if (fileId) query.set('fil', fileId);
		return `/moduler/${moduleId}/?${query}`;
	}
	/** Preserve scroll and keyboard focus while keeping ordinary links and browser history.
	 * @param {MouseEvent & {currentTarget:HTMLAnchorElement}} event */
	async function navigate(event) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		const destination = new URL(event.currentTarget.href);
		const opening = (!example || event.currentTarget.closest('.related') !== null) && destination.searchParams.has('eksempel');
		await goto(destination, { reset: false });
		if (opening && page.url.searchParams.get('eksempel') === destination.searchParams.get('eksempel')) {
			const heading = document.getElementById('current-example');
			heading?.focus({ preventScroll: true });
			heading?.scrollIntoView({ block: 'start' });
		}
	}
</script>

<PartnerContext pageId={`module-${moduleId}`} values={{ exampleId: example?.id ?? null, fileId: file?.id ?? null, lineId }} />

<section class="examples" aria-labelledby="examples-title">
	<div class="heading"><div><h2 id="examples-title" tabindex="-1">Kodeeksempler</h2><p>{example ? 'Bytt eksempel i listen. Trykk på koden for linjeforklaringer.' : 'Finn kode til det du skal lage. Velg et eksempel og trykk på en linje for å se hva den gjør.'}</p></div>{#if example}<a class="overview" href={href()} onclick={navigate}>Alle eksempler ↗</a>{/if}</div>
	{#if exampleId && !example}<p role="status">Dette eksemplet finnes ikke i modulen. Velg et eksempel nedenfor.</p>{/if}
	<div class="example-layout" class:opened={!!example}>
		{#if example && file}
			<article class="viewer" aria-labelledby="current-example">
				<header><h3 id="current-example" tabindex="-1">{example.title}</h3><p>{example.summary}</p></header>
				{#if example.files.length > 1}<nav class="files" aria-label="Velg kodevariant">{#each example.files as item}<a href={href(example.id, item.id)} onclick={navigate} class:active={file.id === item.id} aria-current={file.id === item.id ? 'true' : undefined}>{item.label}</a>{/each}</nav>{/if}
				<div id="eksempelkode" tabindex="-1"><p class="context">{file.context}</p>
					{#key fileKey}<AnnotatedCode {file} onselect={(id) => selection = { key: fileKey, lineId: id }} />{/key}
				</div>
				{#if related.length}<nav class="related" aria-label="Kode som hører sammen"><strong>Hører sammen med:</strong>{#each related as item}<a href={href(item.id)} onclick={navigate}>{item.title} →</a>{/each}</nav>{/if}
				<a class="source-link" href={moduleLink(example.sourceHref, moduleId)}>Åpne øvingen: {example.sourceTitle} →</a>
				<p class="small">Koden vises her. Den kjøres og prøves i øvingen eller ditt eget prosjekt.</p>
			</article>
		{/if}
		<nav class="example-picker" aria-label="Kodeeksempler i modulen">
			{#if example}<div class="picker-heading"><strong>Bytt eksempel</strong><a href="#eksempelkode">Til koden ↓</a></div>{/if}
			<ul>{#each examples as item (item.id)}<li><a href={href(item.id)} onclick={navigate} class:active={example?.id === item.id} aria-current={example?.id === item.id ? 'true' : undefined}><span>{item.title}</span><span class="arrow" aria-hidden="true">{example?.id === item.id ? '✓' : '→'}</span></a></li>{/each}</ul>
		</nav>
	</div>
	<p class="sr-only" aria-live="polite" aria-atomic="true">{example && file ? `Viser ${example.title}, ${file.label}.` : 'Oversikt over kodeeksempler.'}</p>
</section>

<style>
	.examples { padding-block: 18px 28px; }
	.heading { display: flex; align-items: start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
	h2 { font-size: 1.25rem; margin: 0 0 4px; }
	h3 { font-size: clamp(1.2rem, 2vw, 1.6rem); line-height: 1.35; margin: 0; }
	p { font-size: var(--font-body); line-height: var(--leading-body); margin: 8px 0 14px; }
	.heading p { font-size: var(--font-small); color: var(--color-text-muted); margin: 0; }
	a { color: var(--color-accent); text-underline-offset: 3px; }
	.overview { flex-shrink: 0; min-height: 44px; align-content: center; font-size: var(--font-small); }
	.example-layout { min-width: 0; }
	.opened { display: grid; grid-template-columns: minmax(0, 1fr) 17rem; gap: 24px; align-items: start; }
	.viewer { min-width: 0; }
	.context, .small { color: var(--color-text-muted); font-size: var(--font-small); }
	.context { margin-top: 0; }
	.example-picker ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); gap: 10px; }
	.example-picker li { min-width: 0; }
	.example-picker li a { display: flex; align-items: center; gap: 10px; min-height: 64px; height: 100%; padding: 12px; text-decoration: none; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border-strong); border-radius: 9px; font-size: var(--font-small); line-height: 1.4; }
	.example-picker a:hover { background: var(--color-surface-hover); }
	.example-picker a.active { border-color: var(--color-accent); background: var(--color-accent-soft); font-weight: 650; }
	.arrow { margin-left: auto; color: var(--color-accent); }
	.opened .example-picker { position: sticky; top: 90px; min-width: 0; }
	.opened .example-picker ul { grid-template-columns: 1fr; max-height: calc(100dvh - 160px); overflow-y: auto; padding: 3px; }
	.opened .example-picker li a { min-height: 52px; padding: 9px; }
	.picker-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin: 0 3px 8px; font-size: var(--font-small); }
	.picker-heading a { display: none; }
	.files { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
	.files a { min-height: 44px; align-content: center; padding: 8px 12px; border: 1px solid var(--color-border-strong); border-radius: 7px; text-decoration: none; color: var(--color-text); background: var(--color-surface); font-size: var(--font-small); }
	.files a.active { background: var(--color-accent-soft); border-color: var(--color-accent); font-weight: 650; }
	.source-link { display: inline-block; min-height: 44px; align-content: center; font-size: var(--font-small); }
	.related { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; margin-block: 8px; font-size: var(--font-small); }
	.related a { min-height: 44px; align-content: center; }
	#eksempelkode, #current-example { scroll-margin-top: 90px; }
	:is(a, [tabindex]):focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
	@media (max-width: 900px) {
		.opened { grid-template-columns: minmax(0, 1fr); gap: 16px; }
		.opened .example-picker { order: -1; position: static; }
		.opened .example-picker ul { display: flex; overflow-x: auto; overflow-y: visible; max-height: none; gap: 8px; padding-bottom: 8px; }
		.opened .example-picker li { flex: 0 0 13rem; }
		.picker-heading a { display: inline; min-height: 44px; align-content: center; }
	}
	@media (max-width: 500px) { .heading { flex-wrap: wrap; gap: 4px; } .heading .overview { margin-top: -4px; } }
</style>
