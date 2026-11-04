<script>
	import CodeTokens from '#lib/components/CodeTokens.svelte';
	import CodeExplanation from '#lib/components/CodeExplanation.svelte';
	/** @type {{file:import('#lib/moduleCodeExamples.js').ExampleFile,onselect?:(id:string|null)=>void}} */
	let { file, onselect } = $props();
	const componentId = $props.id();
	const explanationId = componentId + '-explanation';
	/** @type {string|null} */
	let selectedId = $state(null);
	/** @type {HTMLButtonElement|null} */
	let anchor = $state(null);
	let copyStatus = $state('');
	let copying = false;
	const code = $derived(file.lines.map((line) => line.text).join('\n'));
	function close() { selectedId = null; anchor = null; onselect?.(null); }
	/** @param {string} id @param {HTMLButtonElement} button */
	function explain(id, button) {
		if (selectedId === id) return close();
		selectedId = id; anchor = button; onselect?.(id);
	}
	async function copy() {
		if (copying) return;
		copying = true;
		try { await navigator.clipboard.writeText(code); copyStatus = 'Koden er kopiert.'; }
		catch { copyStatus = 'Marker koden og kopier med Ctrl+C eller Cmd+C.'; }
		finally { copying = false; }
	}
</script>

<div class="annotated-code">
	<div class="file-bar"><strong>{file.label}</strong><button type="button" onclick={copy}>Kopier kode</button></div>
	<p class="hint">Trykk på en linje for å få en forklaring.</p>
	<div class="lines" role="group" aria-label={`Kode: ${file.label}`}>
		{#each file.lines as line, index (line.id)}
			<div class="row">
				{#if line.text.trim()}
					<button type="button" class="line" class:selected={selectedId === line.id}
						data-explanation-for={explanationId}
						aria-label={`Forklar linje ${index + 1}: ${line.text}`}
						aria-expanded={selectedId === line.id}
						aria-controls={selectedId === line.id ? explanationId : undefined}
						aria-describedby={selectedId === line.id ? explanationId + '-body' : undefined}
						onclick={(event) => explain(line.id, event.currentTarget)}>
						<span class="number" aria-hidden="true">{index + 1}</span><code><CodeTokens source={line.text} /></code><span class="explain-icon" aria-hidden="true">{selectedId === line.id ? '−' : '?'}</span>
					</button>
				{:else}<div class="blank" aria-hidden="true"><span class="number">{index + 1}</span></div>{/if}
				{#if selectedId === line.id}
					<div class="explanation">
						<CodeExplanation {anchor} id={explanationId} title={line.title} explanation={line.explanation}
							label={`${file.label} · linje ${index + 1}`} onclose={close} mode="inline" responsive={false} />
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
<p class="copy-status" role="status">{copyStatus}</p>

<style>
	.annotated-code { min-width: 0; background: var(--color-code-bg); color: var(--color-code-text); border: 1px solid var(--color-code-border); border-radius: 10px; overflow: hidden; }
	.file-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 8px 12px; background: var(--color-surface-soft); color: var(--color-text); border-bottom: 1px solid var(--color-border); }
	.file-bar strong { font-size: var(--font-small); overflow-wrap: anywhere; }
	.file-bar button { min-height: 44px; padding: 7px 12px; font: inherit; font-size: var(--font-small); border: 1px solid var(--color-border-strong); border-radius: 6px; color: var(--color-text); background: var(--color-surface); cursor: pointer; }
	.file-bar button:hover { background: var(--color-surface-hover); }
	.hint { margin: 0; padding: 12px 16px; font-size: var(--font-small); }
	.lines { overflow-x: auto; padding-bottom: 14px; }
	.row { width: 100%; }
	.line { display: flex; align-items: center; gap: 12px; width: max-content; min-width: 100%; min-height: 44px; padding: 4px 12px 4px 0; border: 0; border-left: 3px solid transparent; background: transparent; color: inherit; text-align: left; cursor: pointer; }
	.line:hover { background: #274a3b; }
	.line.selected { background: #3c5c50; border-left-color: #a5d6cb; }
	.line:focus-visible { outline: 3px solid #e2be89; outline-offset: -3px; }
	.file-bar button:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	.number { width: 2.4rem; min-width: 2.4rem; text-align: right; font: var(--font-small)/var(--leading-code) monospace; color: #b0c0ac; user-select: none; }
	code { white-space: pre; font: var(--font-code)/var(--leading-code) monospace; tab-size: 2; }
	.explain-icon { margin-left: auto; padding-left: 12px; font-size: var(--font-small); color: #b0c0ac; }
	.blank { min-height: 1.1rem; padding-left: 3px; }
	.blank .number { display: inline-block; }
	.explanation { position: sticky; left: 0; width: 100%; padding: 0 12px; box-sizing: border-box; }
	.copy-status { min-height: 1.5em; margin: 5px 0 0; font-size: var(--font-small); color: var(--color-text-muted); }
	@media (max-width: 600px) { .line { gap: 8px; } .number { width: 1.8rem; min-width: 1.8rem; } .explanation { padding-inline: 8px; } }
</style>
