<script>
	import CodeTokens from '#lib/components/CodeTokens.svelte';
	import CodeExplanation from '#lib/components/CodeExplanation.svelte';
	/** @type {{file:import('#lib/moduleCodeExamples.js').ExampleFile,onselect?:(id:string|null)=>void}} */
	let { file, onselect } = $props();
	const componentId = $props.id();
	const explanationId = componentId + '-explanation';
	const codeId = componentId + '-code';
	let showFull = $state(false);
	/** @type {string|null} */
	let selectedId = $state(null);
	/** @type {HTMLButtonElement|null} */
	let anchor = $state(null);
	let copyStatus = $state('');
	let copying = false;
	const isExcerpt = $derived(!!file.excerpt && !showFull);
	const excerptIds = $derived(new Set(file.excerpt?.lineIds ?? []));
	const visibleLines = $derived(file.lines.map((line, index) => ({ line, index }))
		.filter(({ line }) => !isExcerpt || excerptIds.has(line.id)));
	const code = $derived(visibleLines.map(({ line, index }, position) =>
		(position > 0 && index > visibleLines[position - 1].index + 1 ? '\n' : '') + line.text).join('\n'));
	const hasImportantLines = $derived(visibleLines.some(({ line }) => line.important));
	/** @param {number} start @param {number} end */
	function hasHiddenCode(start, end) { return file.lines.slice(start, end).some((line) => line.text.trim()); }
	function close() { selectedId = null; anchor = null; onselect?.(null); }
	function toggleCode() { close(); copyStatus = ''; showFull = !showFull; }
	/** @param {string} id @param {HTMLButtonElement} button */
	function explain(id, button) {
		if (selectedId === id) return close();
		selectedId = id; anchor = button; onselect?.(id);
	}
	async function copy() {
		if (copying) return;
		copying = true;
		const excerptCopied = isExcerpt;
		try { await navigator.clipboard.writeText(code); copyStatus = excerptCopied ? 'Utdraget er kopiert.' : 'Koden er kopiert.'; }
		catch { copyStatus = 'Marker koden og kopier med Ctrl+C eller Cmd+C.'; }
		finally { copying = false; }
	}
</script>

<p class="context">{isExcerpt ? file.excerpt?.context : file.context}</p>
<div class="annotated-code">
	<div class="file-bar">
		<strong>{file.label}</strong>
		<div class="file-actions">
			{#if file.excerpt}<button type="button" onclick={toggleCode} aria-expanded={showFull} aria-controls={codeId}>{showFull ? 'Skjul resten av koden' : 'Vis hele koden'}</button>{/if}
			<button type="button" onclick={copy}>{isExcerpt ? 'Kopier utdrag' : file.excerpt ? 'Kopier hele koden' : 'Kopier kode'}</button>
		</div>
	</div>
	<p class="hint">Trykk på en linje for å få en forklaring.{#if hasImportantLines} <span class="key-marker">◆</span> markerer det viktigste.{/if}</p>
	<div id={codeId} class="lines" role="group" aria-label={`Kode: ${file.label}`}>
		{#each visibleLines as { line, index }, position (line.id)}
			{#if hasHiddenCode((visibleLines[position - 1]?.index ?? -1) + 1, index)}<p class="omitted">… annen kode er skjult</p>{/if}
			<div class="row">
				{#if line.text.trim()}
					<button type="button" class="line" class:important={line.important} class:selected={selectedId === line.id}
						data-explanation-for={explanationId}
						aria-label={`Forklar ${line.important ? 'viktig ' : ''}linje ${index + 1}: ${line.text}`}
						aria-expanded={selectedId === line.id}
						aria-controls={selectedId === line.id ? explanationId : undefined}
						aria-describedby={selectedId === line.id ? explanationId + '-body' : undefined}
						onclick={(event) => explain(line.id, event.currentTarget)}>
						<span class="number" aria-hidden="true">{#if line.important}<span class="key-marker">◆</span>{/if}{index + 1}</span><code><CodeTokens source={line.text} /></code><span class="explain-icon" aria-hidden="true">{selectedId === line.id ? '−' : '?'}</span>
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
		{#if hasHiddenCode((visibleLines.at(-1)?.index ?? -1) + 1, file.lines.length)}<p class="omitted">… annen kode er skjult</p>{/if}
	</div>
</div>
<p class="copy-status" role="status">{copyStatus}</p>

<style>
	.context { margin: 0 0 14px; color: var(--color-text-muted); font-size: var(--font-small); line-height: var(--leading-body); }
	.annotated-code { min-width: 0; background: var(--color-code-bg); color: var(--color-code-text); border: 1px solid var(--color-code-border); border-radius: 10px; overflow: hidden; }
	.file-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 8px 12px; background: var(--color-surface-soft); color: var(--color-text); border-bottom: 1px solid var(--color-border); }
	.file-actions { display: flex; flex-wrap: wrap; gap: 8px; }
	.file-bar strong { font-size: var(--font-small); overflow-wrap: anywhere; }
	.file-bar button { min-height: 44px; padding: 7px 12px; font: inherit; font-size: var(--font-small); border: 1px solid var(--color-border-strong); border-radius: 6px; color: var(--color-text); background: var(--color-surface); cursor: pointer; }
	.file-bar button:hover { background: var(--color-surface-hover); }
	.hint { margin: 0; padding: 12px 16px; font-size: var(--font-small); }
	.lines { overflow-x: auto; padding-bottom: 14px; }
	.omitted { margin: 0; padding: 6px 16px; color: #b0c0ac; font-size: var(--font-small); }
	.row { width: 100%; }
	.line { display: flex; align-items: center; gap: 12px; width: max-content; min-width: 100%; min-height: 44px; padding: 4px 12px 4px 0; border: 0; border-left: 3px solid transparent; background: transparent; color: inherit; text-align: left; cursor: pointer; }
	.line:hover { background: #274a3b; }
	.line.important { background: #29483e; border-left-color: #e2be89; }
	.line.important:hover { background: #36564a; }
	.line.selected { background: #3c5c50; border-left-color: #a5d6cb; }
	.line:focus-visible { outline: 3px solid #e2be89; outline-offset: -3px; }
	.file-bar button:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	.number { position:relative; width: 3.3rem; min-width: 3.3rem; text-align: right; font: var(--font-small)/var(--leading-code) monospace; color: #b0c0ac; user-select: none; }
	.key-marker { color: #e2be89; } .number .key-marker { position:absolute; left:.3rem; font-size:.65em; }
	code { white-space: pre; font: var(--font-code)/var(--leading-code) monospace; tab-size: 2; }
	.explain-icon { margin-left: auto; padding-left: 12px; font-size: var(--font-small); color: #b0c0ac; }
	.blank { min-height: 1.1rem; padding-left: 3px; }
	.blank .number { display: inline-block; }
	.explanation { position: sticky; left: 0; width: 100%; padding: 0 12px; box-sizing: border-box; }
	.copy-status { min-height: 1.5em; margin: 5px 0 0; font-size: var(--font-small); color: var(--color-text-muted); }
	@media (max-width: 600px) { .line { gap: 8px; } .explanation { padding-inline: 8px; } }
</style>
