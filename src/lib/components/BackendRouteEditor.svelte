<script>
	import { onMount } from 'svelte';
	import CodeExplanation from '#lib/components/CodeExplanation.svelte';

	/** @typedef {{id:string, text:string, title:string, explanation:string}} CodeLine */
	/** @typedef {{id:string, group:string, title:string, category:'read'|'guard'|'write'|'respond', lines:CodeLine[], explanation:string}} Block */
	/** @typedef {{text:string, type:string}} Token */
	/**
	 * @typedef {{
	 * blocks:Block[], program:string[], opening:string[], closing:string[], maxBlocks:number,
	 * disabled?:boolean, onprogramchange:(program:string[], message:string)=>void,
	 * onexplain?:()=>void, activeBlockId?:string|null, executedBlockIds?:string[],
	 * skippedBlockIds?:string[], resetKey?:string, explanationBoundary?:HTMLElement|null
	 * }} Props
	 */
	/** @type {Props} */
	let {
		blocks,
		program,
		opening,
		closing,
		maxBlocks,
		disabled = false,
		onprogramchange,
		onexplain,
		activeBlockId = null,
		executedBlockIds = [],
		skippedBlockIds = [],
		resetKey = '',
		explanationBoundary = null
	} = $props();

	const componentId = $props.id();
	const explanationId = componentId + '-line-explanation';
	/** @type {string|null} */
	let selectedKey = $state(null);
	/** @type {HTMLElement|null} */
	let selectedAnchor = $state(null);
	let narrow = $state(false);
	let catalogOpen = $state(false);
	/** @type {string|null} */
	let draggedId = $state(null);
	let dropIndex = $state(-1);

	let renderedProgram = $derived.by(() => {
		let lineNumber = opening.length + 1;
		return program.flatMap((id, index) => {
			const block = blocks.find((item) => item.id === id);
			if (!block) return [];
			const entry = { block, index, firstLine: lineNumber };
			lineNumber += block.lines.length;
			return [entry];
		});
	});
	let closingLine = $derived(
		opening.length +
			renderedProgram.reduce((count, entry) => count + entry.block.lines.length, 0) +
			1
	);
	let selectedLine = $derived.by(() => {
		for (const entry of renderedProgram) {
			const index = entry.block.lines.findIndex(
				(line) => `${entry.block.id}:${line.id}` === selectedKey
			);
			if (index >= 0) return { line: entry.block.lines[index], number: entry.firstLine + index };
		}
		return null;
	});

	$effect(() => {
		void resetKey;
		closeExplanation();
	});

	onMount(() => {
		const media = window.matchMedia('(max-width: 900px)');
		function updateMode() {
			narrow = media.matches;
			closeExplanation();
		}
		updateMode();
		media.addEventListener('change', updateMode);
		return () => media.removeEventListener('change', updateMode);
	});

	function closeExplanation() {
		selectedKey = null;
		selectedAnchor = null;
	}

	/** @param {string} key @param {MouseEvent & {currentTarget:EventTarget & HTMLButtonElement}} event */
	function explain(key, event) {
		if (selectedKey === key) {
			closeExplanation();
			return;
		}
		onexplain?.();
		selectedKey = key;
		selectedAnchor = event.currentTarget;
	}

	/** @param {string} group */
	function groupIndex(group) {
		return program.findIndex((id) => blocks.find((block) => block.id === id)?.group === group);
	}

	/** @param {Block} block */
	function chooseBlock(block) {
		if (disabled || program.includes(block.id)) return;
		const index = groupIndex(block.group);
		if (index < 0 && program.length >= maxBlocks) return;
		closeExplanation();
		if (index >= 0) {
			const next = [...program];
			next[index] = block.id;
			onprogramchange(next, `Byttet til «${block.title}» på plass ${index + 1}.`);
		} else {
			onprogramchange([...program, block.id], `La til «${block.title}» sist i koden.`);
		}
	}

	/** @param {number} from @param {number} to */
	function moveBlock(from, to) {
		if (
			disabled ||
			from < 0 ||
			to < 0 ||
			from >= program.length ||
			to >= program.length ||
			from === to
		)
			return;
		const next = [...program];
		const [id] = next.splice(from, 1);
		next.splice(to, 0, id);
		closeExplanation();
		onprogramchange(next, `Flyttet kodeblokk fra plass ${from + 1} til ${to + 1}.`);
	}

	/** @param {Block} block */
	function removeBlock(block) {
		if (disabled) return;
		closeExplanation();
		onprogramchange(
			program.filter((id) => id !== block.id),
			`Fjernet «${block.title}».`
		);
	}

	/** @param {DragEvent} event @param {string} id */
	function startDrag(event, id) {
		if (disabled) {
			event.preventDefault();
			return;
		}
		draggedId = id;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', id);
		}
	}

	/** @param {DragEvent} event @param {number} index */
	function allowDrop(event, index) {
		if (disabled || draggedId === null) return;
		event.preventDefault();
		event.stopPropagation();
		dropIndex = index;
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
	}

	/** @param {DragEvent} event @param {number} index */
	function dropBlock(event, index) {
		if (disabled || draggedId === null) return;
		event.preventDefault();
		event.stopPropagation();
		const from = program.indexOf(draggedId);
		endDrag();
		moveBlock(from, Math.min(index, program.length - 1));
	}

	function endDrag() {
		draggedId = null;
		dropIndex = -1;
	}

	/** @param {Block['category']} category */
	function categoryName(category) {
		return { read: 'Les data', guard: 'Kontroll', write: 'Endre data', respond: 'Svar' }[category];
	}

	/** @param {Block} block */
	function preview(block) {
		return block.lines
			.filter((line) => line.text.trim())
			.slice(0, 2)
			.map((line) => line.text.trim())
			.join('\n');
	}

	/** @param {string} source @returns {Token[]} */
	function highlight(source) {
		const pattern =
			/\/\/.*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:const|let|if|else|return|async|await|function|try|catch|throw|new|typeof|for|of|true|false|null|undefined)\b|\b(?:json|push|trim|status|post|get|delete|filter|find|findIndex|splice|map|Error|Number|String|Array|isArray|isFinite)\b|\b\d+\b/g;
		/** @type {Token[]} */
		const tokens = [];
		let end = 0;
		for (const match of source.matchAll(pattern)) {
			const index = match.index ?? 0;
			if (index > end) tokens.push({ text: source.slice(end, index), type: 'plain' });
			const word = match[0];
			const type = word.startsWith('//')
				? 'comment'
				: /^["'`]/.test(word)
					? 'string'
					: /^\d+$/.test(word)
						? 'number'
						: /^(const|let|if|else|return|async|await|function|try|catch|throw|new|typeof|for|of|true|false|null|undefined)$/.test(
									word
							  )
							? 'keyword'
							: 'function';
			tokens.push({ text: word, type });
			end = index + word.length;
		}
		if (end < source.length) tokens.push({ text: source.slice(end), type: 'plain' });
		return tokens;
	}
</script>

<div class="route-editor" data-testid="backend-route-editor">
	<div class="editor">
		<header class="editor-header">
			<div>
				<span class="file-dot" aria-hidden="true"></span><strong>server.js</strong><span
					class="file-note">Din rute</span
				>
			</div>
			<span class="block-count">{program.length}/{maxBlocks} blokker</span>
		</header>
		<div class="editor-guide">
			<span>Klikk på en kodelinje for forklaring.</span><span class="order-note"
				>Kjører fra toppen ↓</span
			>
		</div>
		<div class="code-scroll" role="group" aria-label="Redigerbar Express-rute">
			{#each opening as source, index}<div class="fixed-line">
					<span class="line-number" aria-hidden="true">{index + 1}</span><code
						>{#each highlight(source) as token}<span class={token.type}>{token.text}</span
							>{/each}</code
					>
				</div>{/each}
			<ol class="block-list" aria-label="Kodeblokker i kjørerekkefølge">
				{#each renderedProgram as entry (entry.block.id)}{@const block =
						entry.block}{@const active = block.id === activeBlockId}{@const executed =
						executedBlockIds.includes(block.id)}{@const skipped = skippedBlockIds.includes(
						block.id
					)}
					<li
						class="code-block"
						class:active
						class:executed
						class:skipped
						class:drop-target={dropIndex === entry.index && draggedId !== block.id}
						class:dragging={draggedId === block.id}
						data-block-id={block.id}
						draggable={!disabled}
						ondragstart={(event) => startDrag(event, block.id)}
						ondragend={endDrag}
						ondragover={(event) => allowDrop(event, entry.index)}
						ondrop={(event) => dropBlock(event, entry.index)}
					>
						<div class="block-header">
							<div class="block-name">
								<span class="drag-handle" aria-hidden="true">⠿</span><span
									class="category-dot"
									data-category={block.category}
									aria-hidden="true"
								></span><strong>{block.title}</strong>
							</div>
							<div class="block-tools">
								{#if active}<span class="execution active-label">← Se her</span
									>{:else if skipped}<span class="execution">Hoppet over</span
									>{:else if executed}<span class="execution executed-label">✓ Kjørt</span>{/if}
								<button
									type="button"
									data-action="move-up"
									aria-label={`Flytt «${block.title}» opp`}
									disabled={disabled || entry.index === 0}
									onclick={() => moveBlock(entry.index, entry.index - 1)}>↑</button
								>
								<button
									type="button"
									data-action="move-down"
									aria-label={`Flytt «${block.title}» ned`}
									disabled={disabled || entry.index === program.length - 1}
									onclick={() => moveBlock(entry.index, entry.index + 1)}>↓</button
								>
								<button
									type="button"
									class="remove"
									data-action="remove"
									aria-label={`Fjern «${block.title}»`}
									{disabled}
									onclick={() => removeBlock(block)}>×</button
								>
							</div>
						</div>
						{#each block.lines as line, index (line.id)}{@const key = `${block.id}:${line.id}`}{@const selected =
								selectedKey === key}
							<div class="line-row" class:selected data-line-id={line.id}>
								<button
									type="button"
									class="code-line"
									data-explanation-for={explanationId}
									aria-label={`Forklar linje ${entry.firstLine + index}: ${line.text}`}
									aria-expanded={selected}
									aria-controls={selected ? explanationId : undefined}
									aria-describedby={selected ? explanationId + '-body' : undefined}
									onclick={(event) => explain(key, event)}
									><span class="line-number" aria-hidden="true">{entry.firstLine + index}</span
									><code
										>{#each highlight(line.text) as token}<span class={token.type}
												>{token.text}</span
											>{/each}</code
									><span class="explain-mark" aria-hidden="true">{selected ? '←' : '?'}</span
									></button
								>
								{#if narrow && selected}<div class="inline-explanation">
										<CodeExplanation
											anchor={selectedAnchor}
											id={explanationId}
											title={line.title}
											explanation={line.explanation}
											label={`Backend · linje ${entry.firstLine + index}`}
											onclose={closeExplanation}
											mode="inline"
										/>
									</div>{/if}
							</div>
						{/each}
					</li>
				{/each}
			</ol>
			{#if program.length === 0}<p class="empty-program">
					Ruten er tom. Åpne «Legg til / bytt kode» nedenfor.
				</p>{/if}
			{#each closing as source, index}<div class="fixed-line">
					<span class="line-number" aria-hidden="true">{closingLine + index}</span><code
						>{#each highlight(source) as token}<span class={token.type}>{token.text}</span
							>{/each}</code
					>
				</div>{/each}
		</div>
		<div
			class="editor-footer"
			class:drop-target={dropIndex === program.length}
			role="group"
			aria-label="Flytt en kodeblokk sist"
			ondragover={(event) => allowDrop(event, program.length)}
			ondrop={(event) => dropBlock(event, program.length)}
		>
			<span
				>{draggedId
					? 'Slipp her for å flytte blokken sist.'
					: disabled
						? 'Koden er låst mens testen kjører. Du kan lese forklaringene.'
						: 'Flytt med pilene eller dra en blokk til en ny plass.'}</span
			><span aria-hidden="true">{draggedId ? '↓' : '{}'}</span>
		</div>
		<details class="catalog" bind:open={catalogOpen}>
			<summary
				><span><b aria-hidden="true">{catalogOpen ? '−' : '+'}</b> Legg til / bytt kode</span><small
					>{catalogOpen ? 'Lukk utvalget' : 'Velg blant ' + blocks.length + ' varianter'}</small
				></summary
			>
			<div class="catalog-content">
				<p>Et valg med samme oppgave byttes på plass. Andre blokker legges til nederst.</p>
				<div class="catalog-grid">
					{#each blocks as block (block.id)}{@const index = groupIndex(
							block.group
						)}{@const selected = program.includes(block.id)}{@const full =
							index < 0 && program.length >= maxBlocks}
						<button
							type="button"
							class="catalog-choice"
							class:in-use={selected}
							data-choice-id={block.id}
							disabled={disabled || selected || full}
							aria-label={selected
								? `${block.title} brukes på plass ${index + 1}`
								: `${index >= 0 ? 'Bytt til' : 'Legg til'}: ${block.title}`}
							onclick={() => chooseBlock(block)}
						>
							<span class="choice-top"
								><span class="choice-category">{categoryName(block.category)}</span><span
									class="choice-action"
									>{selected
										? `✓ Plass ${index + 1}`
										: full
											? 'Full rute'
											: index >= 0
												? 'Bytt til ↔'
												: 'Legg til +'}</span
								></span
							>
							<strong>{block.title}</strong><code>{preview(block)}</code>
						</button>
					{/each}
				</div>
				{#if program.length >= maxBlocks}<p class="capacity-note">
						Ruten har {maxBlocks} blokker. Du kan fortsatt bytte en variant eller fjerne en blokk.
					</p>{/if}
			</div>
		</details>
	</div>
	{#if selectedLine && !narrow && explanationBoundary}
		<CodeExplanation
			anchor={selectedAnchor}
			boundary={explanationBoundary}
			id={explanationId}
			title={selectedLine.line.title}
			explanation={selectedLine.line.explanation}
			label={`Backend · linje ${selectedLine.number}`}
			onclose={closeExplanation}
		/>
	{:else if selectedLine && !narrow}
		<aside
			class="fallback-explanation"
			id={explanationId}
			aria-labelledby={explanationId + '-title'}
		>
			<h3 id={explanationId + '-title'}>{selectedLine.line.title}</h3>
			<p id={explanationId + '-body'}>{selectedLine.line.explanation}</p>
			<button type="button" onclick={closeExplanation}>Lukk forklaringen</button>
		</aside>
	{/if}
</div>

<style>
	.route-editor {
		min-width: 0;
		font-family: inherit;
	}
	.route-editor * {
		box-sizing: border-box;
	}
	button {
		font: inherit;
		cursor: pointer;
	}
	button:disabled {
		cursor: default;
	}
	button:focus-visible,
	summary:focus-visible {
		outline: 2px solid #b4e2bf;
		outline-offset: -3px;
	}
	.editor {
		min-width: 0;
		container-type: inline-size;
		border: 1px solid #315b51;
		border-radius: 12px;
		background: #102f2d;
		color: #e5f1e8;
	}
	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 13px 16px;
		border-radius: 11px 11px 0 0;
		border-bottom: 1px solid #31584f;
		background: #173b36;
	}
	.editor-header > div {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.file-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #7de1c7;
	}
	.editor-header strong {
		font:
			600 12px/1.4 'SFMono-Regular',
			Consolas,
			monospace;
	}
	.file-note {
		color: #9fbcb0;
		font-size: 10px;
		padding-left: 5px;
	}
	.block-count {
		font:
			10px/1.4 'SFMono-Regular',
			Consolas,
			monospace;
		color: #b3cebc;
		white-space: nowrap;
	}
	.editor-guide {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		padding: 10px 15px 8px;
		font-size: 10px;
		line-height: 1.5;
		color: #a9c3b8;
	}
	.order-note {
		color: #c7d8a5;
		white-space: nowrap;
	}
	.code-scroll {
		padding-block: 5px 12px;
		overflow-x: auto;
		min-width: 0;
		scrollbar-width: thin;
		scrollbar-color: #608d78 #153a34;
	}
	.block-list {
		list-style: none;
		margin: 5px 0;
		padding: 0;
	}
	.code-block {
		margin: 5px 0;
		padding-block: 0 4px;
		border-block: 1px solid #2b5046;
		border-left: 3px solid transparent;
		background: #153730;
		min-width: 0;
	}
	.code-block.active {
		border-left-color: #b3e3a1;
		border-block-color: #6b985a;
		background: #25492f;
	}
	.code-block.executed:not(.active) {
		border-left-color: #5f9c7b;
	}
	.code-block.skipped {
		border-left-color: #627e79;
	}
	.code-block.skipped .code-line {
		color: #8ea69f;
	}
	.code-block.dragging {
		opacity: 0.55;
	}
	.code-block.drop-target {
		border-top: 3px solid #8ae0c5;
	}
	.block-header {
		position: sticky;
		left: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		min-height: 32px;
		padding: 2px 8px 2px 10px;
		max-width: 100%;
	}
	.block-name {
		display: flex;
		align-items: center;
		min-width: 0;
		gap: 7px;
		color: #a9c3b3;
	}
	.block-name strong {
		font-size: 10px;
		line-height: 1.4;
		font-weight: 550;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.drag-handle {
		font-size: 15px;
		color: #75998a;
		cursor: grab;
	}
	.category-dot {
		height: 5px;
		width: 5px;
		border-radius: 50%;
		flex: 0 0 5px;
		background: #9acfc5;
	}
	.category-dot[data-category='guard'] {
		background: #e4c18a;
	}
	.category-dot[data-category='write'] {
		background: #c0d88b;
	}
	.category-dot[data-category='respond'] {
		background: #b5aed9;
	}
	.block-tools {
		display: flex;
		align-items: center;
		gap: 2px;
		flex: 0 0 auto;
	}
	.block-tools button {
		width: 28px;
		min-height: 28px;
		padding: 0;
		border: 0;
		border-radius: 5px;
		background: #23493d;
		color: #c3dfc4;
		font-size: 15px;
	}
	.block-tools button:hover:not(:disabled) {
		background: #38624e;
		color: #f2f7e9;
	}
	.block-tools .remove:hover:not(:disabled) {
		background: #674b3e;
		color: #ffe7d0;
	}
	.block-tools button:disabled {
		color: #648376;
		background: transparent;
	}
	.execution {
		padding-right: 5px;
		font-size: 9px;
		white-space: nowrap;
		color: #9aada6;
	}
	.execution.active-label {
		color: #d4edb0;
	}
	.execution.executed-label {
		color: #9fcdad;
	}
	.line-row {
		width: 100%;
		position: relative;
	}
	.code-line,
	.fixed-line {
		display: flex;
		align-items: baseline;
		min-width: 100%;
		width: max-content;
		min-height: 25px;
		padding: 1px 12px 1px 0;
		border: 0;
		border-left: 2px solid transparent;
		background: transparent;
		color: #e3eee2;
		text-align: left;
	}
	.code-line:hover {
		background: #285145;
	}
	.line-number {
		display: inline-block;
		flex: 0 0 34px;
		width: 34px;
		padding-right: 10px;
		color: #7fa394;
		text-align: right;
		font:
			10px/23px 'SFMono-Regular',
			Consolas,
			monospace;
		user-select: none;
	}
	.code-line code,
	.fixed-line code {
		font:
			12px/23px 'SFMono-Regular',
			Consolas,
			monospace;
		white-space: pre;
		tab-size: 2;
	}
	.fixed-line {
		color: #bed4c8;
		padding-left: 3px;
	}
	.selected > .code-line {
		background: #365b4d;
		border-left-color: #97ddc7;
		box-shadow:
			inset 0 1px 0 #689c82,
			inset 0 -1px 0 #689c82;
	}
	.selected .line-number {
		color: #daedd8;
	}
	.explain-mark {
		flex: 0 0 22px;
		min-width: 22px;
		margin-left: auto;
		padding-left: 10px;
		color: #9edcc1;
		font-size: 11px;
	}
	.keyword {
		color: #8edacb;
	}
	.string {
		color: #e6d5a0;
	}
	.number {
		color: #cdbfe9;
	}
	.function {
		color: #e0b784;
	}
	.comment {
		color: #8faa92;
		font-style: italic;
	}
	.empty-program {
		color: #a4beaf;
		font-size: 12px;
		line-height: 1.6;
		margin: 15px 16px;
		padding: 13px 15px;
		border: 1px dashed #507564;
		border-radius: 6px;
	}
	.editor-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		min-height: 36px;
		padding: 8px 14px;
		border-top: 1px solid #2b5146;
		color: #a1bdae;
		font-size: 10px;
		line-height: 1.5;
	}
	.editor-footer.drop-target {
		background: #2e5c49;
		box-shadow: inset 0 2px 0 #9bdab8;
	}
	.editor-footer > span:last-child {
		color: #85ab96;
		font: 13px monospace;
	}
	.catalog {
		border-top: 1px solid #395e4f;
		background: #193d34;
		border-radius: 0 0 11px 11px;
	}
	.catalog summary {
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 15px;
		color: #b9e4c6;
		font-size: 12px;
		font-weight: 650;
		list-style: none;
	}
	.catalog summary::-webkit-details-marker {
		display: none;
	}
	.catalog summary:hover {
		background: #234b3e;
		border-radius: 0 0 11px 11px;
	}
	.catalog summary > span {
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.catalog summary b {
		font-size: 18px;
		font-weight: 400;
		line-height: 1;
	}
	.catalog summary small {
		color: #a0b7a8;
		font-size: 9px;
		font-weight: 400;
	}
	.catalog-content {
		padding: 0 12px 13px;
	}
	.catalog-content > p {
		margin: 0 2px 10px;
		font-size: 10px;
		line-height: 1.6;
		color: #abc2b1;
	}
	.catalog-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 7px;
	}
	.catalog-choice {
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 7px;
		padding: 10px 11px;
		border: 1px solid #426957;
		border-radius: 7px;
		background: #214536;
		color: #e0ebda;
		text-align: left;
	}
	.catalog-choice:hover:not(:disabled) {
		border-color: #92c7a5;
		background: #2b5541;
	}
	.catalog-choice:disabled:not(.in-use) {
		opacity: 0.5;
	}
	.catalog-choice.in-use {
		border-color: #678d62;
		background: #2a4b35;
	}
	.choice-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 8px;
		line-height: 1.4;
	}
	.choice-category {
		color: #9bbb9f;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.choice-action {
		color: #bce4c3;
		font-weight: 650;
	}
	.catalog-choice > strong {
		font-size: 11px;
		line-height: 1.35;
	}
	.catalog-choice > code {
		color: #afc7b5;
		font:
			10px/1.55 'SFMono-Regular',
			Consolas,
			monospace;
		white-space: pre;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}
	.catalog-content > .capacity-note {
		margin: 10px 2px 0;
		color: #d5d7a8;
	}
	.inline-explanation {
		position: sticky;
		left: 0;
		width: 100%;
		padding: 2px 10px 4px;
	}
	.fallback-explanation {
		padding: 14px 18px;
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
		background: var(--color-surface-raised);
		color: var(--color-text);
		margin-top: 10px;
	}
	.fallback-explanation h3 {
		margin: 0 0 7px;
		font-size: 14px;
	}
	.fallback-explanation p {
		margin: 0;
		font-size: 12px;
		line-height: 1.7;
	}
	.fallback-explanation button {
		background: transparent;
		border: 0;
		color: var(--color-accent);
		padding: 8px 0 0;
		font-size: 11px;
	}
	@media (max-width: 900px) {
		.block-list {
			width: max-content;
			min-width: 100%;
		}
		.block-header,
		.inline-explanation {
			width: calc(100cqi - 3px);
			max-width: calc(100cqi - 3px);
		}
		.code-line {
			min-height: 30px;
		}
		.line-row {
			display: contents;
		}
		.code-line code,
		.fixed-line code {
			font-size: 11px;
		}
		.block-tools button {
			min-height: 32px;
			width: 32px;
		}
		.block-header {
			min-height: 36px;
		}
	}
	@media (max-width: 520px) {
		.editor-header {
			padding: 12px;
		}
		.file-note {
			display: none;
		}
		.editor-guide {
			padding-inline: 12px;
			font-size: 9px;
		}
		.order-note {
			display: none;
		}
		.block-header {
			gap: 5px;
			padding-left: 6px;
			padding-right: 4px;
			flex-wrap: wrap;
		}
		.block-name {
			flex: 1 1 auto;
			gap: 5px;
		}
		.block-name strong {
			font-size: 9px;
			max-width: 155px;
		}
		.block-tools {
			margin-left: auto;
		}
		.execution {
			font-size: 8px;
		}
		.line-number {
			flex-basis: 28px;
			width: 28px;
			padding-right: 7px;
			font-size: 9px;
		}
		.editor-footer {
			padding-inline: 10px;
			font-size: 9px;
		}
		.catalog summary {
			padding: 12px;
			font-size: 11px;
		}
		.catalog summary small {
			display: none;
		}
		.catalog-grid {
			grid-template-columns: 1fr;
		}
		.catalog-choice > code {
			font-size: 10px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.route-editor * {
			scroll-behavior: auto;
		}
	}
</style>
