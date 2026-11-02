<script>
	import CodeTokens from '#lib/components/CodeTokens.svelte';
	import { getInterfaceHelp } from '#lib/interfaceHelp.js';
	/** @type {{example:import('#lib/backendCodeExamples.js').CodeExample}} */
	let { example } = $props();
	const helpTarget = getInterfaceHelp().target;
	let copyStatus = $state('');
	$effect(() => { example.id; copyStatus = ''; });
	async function copy() {
		const id = example.id, code = example.code;
		try {
			await navigator.clipboard.writeText(code);
			if (example.id === id) copyStatus = 'Koden er kopiert.';
		} catch {
			if (example.id === id) copyStatus = 'Marker koden og kopier med Ctrl+C eller Cmd+C.';
		}
	}
</script>

<section class="example" aria-labelledby="example-title" use:helpTarget={{ label: 'Start med koden', hint: 'Her er et komplett lite Node-eksempel. Kommentarene viser hva delene gjør. Kjør det i filen som er oppgitt.', order: 0 }}>
	<p class="eyebrow">KODEN DU BYGGER PÅ · KJØRBART NODE-EKSEMPEL</p>
	<h2 id="example-title">{example.title}</h2>
	<div class="example-grid">
		<div class="source">
			<div class="file-bar"><strong>{example.file}</strong><button type="button" onclick={copy}>Kopier kode</button></div>
			<!-- svelte-ignore a11y_no_noninteractive_tabindex (The code region supports keyboard scrolling.) -->
			<pre tabindex="0" role="region" aria-label={`Kode i ${example.file}`}><code><CodeTokens source={example.code} /></code></pre>
			<p class="explanation">{example.explanation}</p>
		</div>
		<aside aria-label="Kjør eksemplet på egen maskin">
			<h3>Prøv i kodeeditoren</h3>
			<p>{example.setup}</p>
			<p class="command"><code>node {example.file}</code></p>
			<p class="try"><strong>Endre én ting:</strong> {example.tryNext}</p>
			<details><summary>{example.outputTitle}</summary><p class="small">Forventet resultat fra koden ovenfor. Eksemplet kjøres på din egen maskin.</p><pre><code>{example.output}</code></pre></details>
			<p class="copy-status" role="status" aria-live="polite">{copyStatus}</p>
		</aside>
	</div>
	<p class="bridge">{example.bridge}</p>
</section>

<style>
	.example { padding: 20px; border-bottom: 1px solid var(--color-border); }
	.eyebrow, .small { font-size: var(--font-small); color: var(--color-text-muted); }
	.eyebrow { margin: 0 0 8px; font-weight: 650; }
	h2 { margin: 0 0 16px; font-size: 1.5rem; line-height: 1.3; }
	h3 { margin: 0; font-size: 1.15rem; }
	.example-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(240px, 1fr); gap: 24px; }
	.source, aside { min-width: 0; }
	.file-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 8px 12px; background: var(--color-surface-soft); border: 1px solid var(--color-border); border-radius: 8px 8px 0 0; }
	button { min-height: 44px; padding: 8px 12px; font: inherit; color: var(--color-action); background: var(--color-surface); border: 1px solid var(--color-border-strong); border-radius: 8px; cursor: pointer; }
	button:hover { background: var(--color-surface-hover); }
	pre { margin: 0; padding: 16px; overflow-x: auto; background: var(--color-code-bg); color: var(--color-code-text); border-radius: 0 0 8px 8px; }
	code { font: var(--font-code)/var(--leading-code) monospace; }
	p { font-size: var(--font-body); line-height: var(--leading-body); margin: 10px 0; max-width: 65ch; }
	.command { padding: 10px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface-soft); overflow-wrap: anywhere; }
	.try { padding-left: 12px; border-left: 3px solid var(--color-info); }
	summary { display: flex; align-items: center; min-height: 44px; cursor: pointer; color: var(--color-action); }
	summary::before { content: '+ '; white-space: pre; }
	details[open] > summary::before { content: '− '; }
	aside pre { white-space: pre-wrap; overflow-wrap: anywhere; border-radius: 8px; }
	.bridge { max-width: 85ch; margin-bottom: 0; color: var(--color-text-muted); }
	.copy-status { min-height: 1.5em; font-size: var(--font-small); }
	:is(button, summary, pre):focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	@media (max-width: 800px) { .example-grid { grid-template-columns: minmax(0, 1fr); } }
	@media (max-width: 460px) { .example { padding: 16px; } pre { padding: 12px; } }
</style>
