<script>
	import { onMount, tick } from 'svelte';
	import CodeExplanation from '#lib/components/CodeExplanation.svelte';

	/** @typedef {'frontend'|'backend'} Side */
	/** @typedef {{id:string, text:string, title:string, explanation:string, patchId?:string}} CodeLine */
	/** @typedef {{id:string, label:string, preview:string}} Choice */
	/** @typedef {{id:string, label:string, side:Side, choices:Choice[]}} Patch */
	/** @typedef {{text:string, type:string}} Token */
	/**
	 * @typedef {{
	 * lines:CodeLine[], side:Side, onsidechange:(side:Side)=>void,
	 * patches:Patch[], settings:Record<string,string>, originalSettings:Record<string,string>,
	 * onpatch:(patchId:string, choiceId:string)=>void, activeLineIds?:string[],
	 * activeSide?:Side|null, resetKey?:string, explanationBoundary?:HTMLElement|null,
	 * disabled?:boolean
	 * }} Props
	 */
	/** @type {Props} */
	let {
		lines,
		side,
		onsidechange,
		patches,
		settings,
		originalSettings,
		onpatch,
		activeLineIds = [],
		activeSide = null,
		resetKey = '',
		explanationBoundary = null,
		disabled = false
	} = $props();

	const componentId = $props.id();
	const explanationId = componentId + '-explanation';
	const patchPanelId = componentId + '-patch';
	/** @type {string|null} */
	let selectedLineId = $state(null);
	/** @type {HTMLElement|null} */
	let selectedAnchor = $state(null);
	/** @type {string|null} */
	let selectedPatchId = $state(null);
	/** @type {string|null} */
	let patchLineId = $state(null);
	/** @type {HTMLButtonElement|null} */
	let patchAnchor = $state(null);
	/** @type {HTMLElement|undefined} */
	let patchPanel = $state();
	/** @type {HTMLButtonElement|undefined} */
	let frontendTab = $state();
	/** @type {HTMLButtonElement|undefined} */
	let backendTab = $state();
	let narrow = $state(false);

	let sideLabel = $derived(side === 'frontend' ? 'Frontend' : 'Backend');
	let selectedLine = $derived.by(() => {
		const index = lines.findIndex((line) => line.id === selectedLineId);
		return index < 0 ? null : { line: lines[index], number: index + 1 };
	});
	let selectedPatch = $derived(
		patches.find((patch) => patch.id === selectedPatchId && patch.side === side) ?? null
	);
	let patchLineNumber = $derived.by(() => {
		const exact = lines.findIndex(
			(line) => line.id === patchLineId && line.patchId === selectedPatchId
		);
		const index = exact >= 0 ? exact : lines.findIndex((line) => line.patchId === selectedPatchId);
		return index < 0 ? null : index + 1;
	});
	let hasActiveLines = $derived(
		activeSide === side && lines.some((line) => activeLineIds.includes(line.id))
	);
	let changedCount = $derived(
		patches.filter((patch) => patch.side === side && isChanged(patch.id)).length
	);
	// A code edit keeps the choices open. A different set of patches or tab closes them.
	let patchContext = $derived(side + ':' + patches.map((patch) => patch.id).join('|'));

	$effect(() => {
		void resetKey;
		void side;
		closeExplanation();
	});
	$effect(() => {
		void patchContext;
		closePatch();
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
		selectedLineId = null;
		selectedAnchor = null;
	}
	function dismissExplanation() {
		const trigger = selectedAnchor;
		closeExplanation();
		if (trigger?.isConnected) trigger.focus({ preventScroll: true });
	}
	function closePatch() {
		selectedPatchId = null;
		patchLineId = null;
		patchAnchor = null;
	}
	function dismissPatch() {
		const trigger = patchAnchor;
		closePatch();
		if (trigger?.isConnected) trigger.focus();
	}

	/** @param {string} id */
	function isChanged(id) {
		return settings[id] !== originalSettings[id];
	}
	/** @param {Side} next */
	function changeSide(next) {
		if (next === side) return;
		closeExplanation();
		closePatch();
		onsidechange(next);
	}
	/** @param {KeyboardEvent} event */
	function tabKeydown(event) {
		if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
		event.preventDefault();
		const next =
			event.key === 'Home'
				? 'frontend'
				: event.key === 'End'
					? 'backend'
					: side === 'frontend'
						? 'backend'
						: 'frontend';
		changeSide(next);
		(next === 'frontend' ? frontendTab : backendTab)?.focus();
	}
	/** @param {string} id @param {MouseEvent & {currentTarget:EventTarget & HTMLButtonElement}} event */
	function explain(id, event) {
		if (selectedLineId === id) {
			closeExplanation();
			return;
		}
		selectedLineId = id;
		selectedAnchor = event.currentTarget;
	}
	/** @param {CodeLine} line @param {MouseEvent & {currentTarget:EventTarget & HTMLButtonElement}} event */
	async function editLine(line, event) {
		if (disabled || !line.patchId) return;
		if (!patches.some((patch) => patch.id === line.patchId && patch.side === side)) return;
		closeExplanation();
		if (selectedPatchId === line.patchId && patchLineId === line.id) {
			closePatch();
			return;
		}
		selectedPatchId = line.patchId;
		patchLineId = line.id;
		patchAnchor = event.currentTarget;
		await tick();
		if (selectedPatchId === line.patchId && patchLineId === line.id) {
			patchPanel?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
		}
	}
	/** @param {Patch} patch @param {Choice} choice */
	function choose(patch, choice) {
		if (disabled || settings[patch.id] === choice.id) return;
		closeExplanation();
		onpatch(patch.id, choice.id);
	}
	/** @param {KeyboardEvent} event */
	function windowKeydown(event) {
		if (event.key !== 'Escape' || event.defaultPrevented) return;
		if (selectedLine && !narrow && !explanationBoundary) {
			event.preventDefault();
			dismissExplanation();
			return;
		}
		if (patchPanel && event.target instanceof Node && patchPanel.contains(event.target)) {
			event.preventDefault();
			dismissPatch();
		}
	}

	/** @param {string} source @returns {Token[]} */
	function highlight(source) {
		const pattern =
			/\/\/.*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:const|let|if|else|return|async|await|function|try|catch|throw|new|typeof|true|false|null|undefined)\b|\b(?:fetch|json|push|trim|status|post|get|filter|find|map|preventDefault|JSON|stringify|Number|String)\b|\$state|\b\d+\b/g;
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
						: /^(const|let|if|else|return|async|await|function|try|catch|throw|new|typeof|true|false|null|undefined)$/.test(
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

<svelte:window onkeydown={windowKeydown} />

<div class="detective-code" data-testid="detective-code">
	<div class="editor">
		<header class="editor-header">
			<div class="side-tabs" role="tablist" aria-label="Velg kode">
				<button
					bind:this={frontendTab}
					type="button"
					role="tab"
					id={componentId + '-frontend-tab'}
					aria-controls={componentId + '-code-panel'}
					aria-selected={side === 'frontend'}
					tabindex={side === 'frontend' ? 0 : -1}
					onclick={() => changeSide('frontend')}
					onkeydown={tabKeydown}>Frontend</button
				>
				<button
					bind:this={backendTab}
					type="button"
					role="tab"
					id={componentId + '-backend-tab'}
					aria-controls={componentId + '-code-panel'}
					aria-selected={side === 'backend'}
					tabindex={side === 'backend' ? 0 : -1}
					onclick={() => changeSide('backend')}
					onkeydown={tabKeydown}>Backend</button
				>
			</div>
			<span class="file-name">{side === 'frontend' ? 'Chat.svelte' : 'server.js'}</span>
		</header>
		<div class="editor-guide">
			<span>Klikk en linje for forklaring.</span>
			<span class="trace-key" class:invisible={!hasActiveLines} aria-hidden={!hasActiveLines}
				><span aria-hidden="true">●</span> Valgt spor</span
			>
		</div>
		<div
			id={componentId + '-code-panel'}
			role="tabpanel"
			aria-labelledby={componentId + '-' + side + '-tab'}
			class="code-scroll"
		>
			<ol class="code-list" aria-label={`${sideLabel}, ${lines.length} kodelinjer`}>
				{#each lines as line, index (line.id)}
					{@const selected = selectedLineId === line.id}
					{@const active = activeSide === side && activeLineIds.includes(line.id)}
					{@const patch = patches.find((item) => item.id === line.patchId && item.side === side)}
					{@const editing = patch !== undefined && selectedPatchId === patch.id}
					<li class="line-item" class:selected class:active class:editing data-line-id={line.id}>
						<div class="line-main">
							<button
								type="button"
								class="code-line"
								data-explanation-for={explanationId}
								aria-label={`Forklar linje ${index + 1}${active ? ', valgt spor' : ''}: ${line.text}`}
								aria-expanded={selected}
								aria-controls={selected ? explanationId : undefined}
								aria-describedby={selected ? explanationId + '-body' : undefined}
								onclick={(event) => explain(line.id, event)}
							>
								<span class="line-number" aria-hidden="true">{index + 1}</span>
								<code
									>{#each highlight(line.text) as token}<span class={token.type}>{token.text}</span
										>{/each}</code
								>
							</button>
							<div class="line-tools">
								{#if patch}
									<button
										type="button"
										class="patch-toggle"
										class:changed={isChanged(patch.id)}
										data-patch-id={patch.id}
										aria-label={`Endre linje ${index + 1}: ${patch.label}${isChanged(patch.id) ? '. Endret fra start.' : ''}`}
										aria-expanded={editing}
										aria-controls={editing ? patchPanelId : undefined}
										{disabled}
										onclick={(event) => editLine(line, event)}
										><span class="change-dot" aria-hidden="true"></span>Endre</button
									>
								{/if}
							</div>
						</div>
						{#if narrow && selected}
							<div class="inline-explanation">
								<CodeExplanation
									anchor={selectedAnchor}
									id={explanationId}
									title={line.title}
									explanation={line.explanation}
									label={`${sideLabel} · linje ${index + 1}`}
									onclose={closeExplanation}
									mode="inline"
								/>
							</div>
						{/if}
					</li>
				{/each}
			</ol>
		</div>
		<footer class="editor-footer">
			<span
				>{disabled
					? 'Koden er låst. Du kan lese forklaringene.'
					: 'Bruk Endre for å prøve en annen kodelinje.'}</span
			>
			<span class="change-count" class:changed={changedCount > 0}
				>{changedCount === 0
					? 'Ingen endringer'
					: `${changedCount} ${changedCount === 1 ? 'endring' : 'endringer'}`}</span
			>
		</footer>
		{#if selectedPatch}
			<section
				bind:this={patchPanel}
				id={patchPanelId}
				class="patch-dock"
				aria-labelledby={patchPanelId + '-title'}
			>
				<header>
					<div>
						<p class="patch-location">
							{sideLabel}{patchLineNumber ? ` · linje ${patchLineNumber}` : ''}
						</p>
						<h3 id={patchPanelId + '-title'}>{selectedPatch.label}</h3>
					</div>
					<button
						type="button"
						class="close-button"
						onclick={dismissPatch}
						aria-label="Lukk kodevalgene">×</button
					>
				</header>
				<div class="choice-grid">
					{#each selectedPatch.choices as choice (choice.id)}
						{@const current = settings[selectedPatch.id] === choice.id}
						<button
							type="button"
							class="code-choice"
							class:current
							data-choice-id={choice.id}
							disabled={disabled || current}
							aria-label={`${current ? 'I bruk' : 'Bruk'}: ${choice.label}`}
							onclick={() => selectedPatch && choose(selectedPatch, choice)}
						>
							<span class="choice-heading"
								><strong>{choice.label}</strong><span class="choice-state"
									>{current ? 'I bruk' : 'Bruk'}</span
								></span
							>
							<code>{choice.preview}</code>
						</button>
					{/each}
				</div>
			</section>
		{/if}
	</div>
	{#if selectedLine && !narrow && explanationBoundary}
		<CodeExplanation
			anchor={selectedAnchor}
			boundary={explanationBoundary}
			id={explanationId}
			title={selectedLine.line.title}
			explanation={selectedLine.line.explanation}
			label={`${sideLabel} · linje ${selectedLine.number}`}
			onclose={closeExplanation}
		/>
	{:else if selectedLine && !narrow}
		<aside
			class="fallback-explanation"
			id={explanationId}
			aria-labelledby={explanationId + '-title'}
		>
			<header>
				<h3 id={explanationId + '-title'}>{selectedLine.line.title}</h3>
				<button
					type="button"
					class="close-button"
					onclick={dismissExplanation}
					aria-label="Lukk forklaringen">×</button
				>
			</header>
			<p id={explanationId + '-body'}>{selectedLine.line.explanation}</p>
		</aside>
	{/if}
</div>

<style>
	.detective-code {
		min-width: 0;
		font-family: inherit;
	}
	.detective-code * {
		box-sizing: border-box;
	}
	button {
		font: inherit;
		cursor: pointer;
	}
	button:disabled {
		cursor: default;
	}
	button:focus-visible {
		outline: 2px solid #b5e7da;
		outline-offset: -3px;
	}
	.editor {
		min-width: 0;
		container-type: inline-size;
		border: 1px solid #345b57;
		border-radius: 12px;
		background: #102f2e;
		color: #e4efea;
	}
	.editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px 12px;
		padding: 8px 12px;
		border-bottom: 1px solid #34534f;
		border-radius: 11px 11px 0 0;
		background: #193b37;
	}
	.side-tabs {
		display: flex;
		gap: 4px;
	}
	.side-tabs button {
		min-height: 36px;
		padding: 7px 11px;
		border: 1px solid transparent;
		border-radius: 6px;
		background: transparent;
		color: #b0c9bf;
		font-size: 12px;
		font-weight: 650;
	}
	.side-tabs button:hover {
		background: #244b43;
	}
	.side-tabs button[aria-selected='true'] {
		border-color: #547f70;
		background: #2a5146;
		color: #e1f2d6;
	}
	.file-name {
		color: #a6c3b7;
		font:
			11px/1.5 'SFMono-Regular',
			Consolas,
			monospace;
	}
	.editor-guide,
	.editor-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px 12px;
		padding: 9px 13px;
		color: #afc8bd;
		font-size: 11px;
		line-height: 1.5;
	}
	.trace-key {
		flex-shrink: 0;
		color: #cae6a7;
	}
	.trace-key > span {
		margin-right: 4px;
		font-size: 8px;
	}
	.invisible {
		visibility: hidden;
	}
	.code-scroll {
		min-width: 0;
		overflow-x: auto;
		scrollbar-width: thin;
		scrollbar-color: #608c79 #173a34;
	}
	.code-list {
		width: max-content;
		min-width: 100%;
		margin: 0;
		padding: 3px 0 11px;
		list-style: none;
	}
	.line-item {
		width: 100%;
	}
	.line-main {
		display: flex;
		align-items: stretch;
		width: 100%;
		min-height: 33px;
		border-left: 2px solid transparent;
	}
	.code-line {
		display: flex;
		align-items: baseline;
		flex: 1 0 auto;
		min-width: 0;
		padding: 4px 12px 4px 0;
		border: 0;
		background: transparent;
		color: #e1ece4;
		text-align: left;
	}
	.code-line:hover {
		background: #254c42;
	}
	.line-number {
		flex: 0 0 35px;
		width: 35px;
		padding-right: 11px;
		color: #85a89a;
		font:
			10px/25px 'SFMono-Regular',
			Consolas,
			monospace;
		text-align: right;
		user-select: none;
	}
	.code-line code {
		font:
			12px/25px 'SFMono-Regular',
			Consolas,
			monospace;
		white-space: pre;
		tab-size: 2;
	}
	.line-tools {
		position: sticky;
		right: 0;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex: 0 0 67px;
		padding: 2px 7px 2px 4px;
		background: #102f2e;
	}
	.patch-toggle {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		min-height: 29px;
		padding: 4px 7px;
		border: 1px solid #456b5f;
		border-radius: 5px;
		background: #1f4239;
		color: #cfe4d5;
		font-size: 10px;
		line-height: 1.4;
	}
	.patch-toggle:hover:not(:disabled) {
		border-color: #89baa4;
		background: #345a49;
	}
	.patch-toggle:disabled {
		opacity: 0.5;
	}
	.change-dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #789b88;
	}
	.patch-toggle.changed {
		border-color: #97764c;
		color: #edcf95;
	}
	.changed .change-dot {
		background: #e9bd73;
	}
	.active > .line-main {
		border-left-color: #b4d885;
		background: #27472f;
	}
	.active .line-number {
		color: #d4e9b3;
	}
	.editing > .line-main {
		box-shadow:
			inset 0 1px #9b7a474d,
			inset 0 -1px #9b7a474d;
	}
	.editing .patch-toggle {
		border-color: #cfad74;
		background: #4b4932;
		color: #f2ddaf;
	}
	.selected > .line-main {
		border-left-color: #9bddcf;
		background: #315a4e;
		box-shadow:
			inset 0 1px #74aa8d,
			inset 0 -1px #74aa8d;
	}
	.selected .line-number {
		color: #e0f0dc;
	}
	.inline-explanation {
		position: sticky;
		left: 0;
		width: calc(100cqi - 2px);
		max-width: calc(100cqi - 2px);
		padding: 8px;
	}
	.keyword {
		color: #8fd9ca;
	}
	.string {
		color: #e7d7a3;
	}
	.number {
		color: #d2c2ee;
	}
	.function {
		color: #e5b987;
	}
	.comment {
		color: #a1b8a2;
		font-style: italic;
	}
	.editor-footer {
		border-top: 1px solid #31554b;
		font-size: 10px;
	}
	.change-count {
		flex-shrink: 0;
		color: #95b5a5;
	}
	.change-count.changed {
		color: #e8c489;
	}
	.patch-dock {
		padding: 13px;
		border-top: 1px solid #7d7049;
		border-radius: 0 0 11px 11px;
		background: #1b3832;
	}
	.patch-dock > header,
	.fallback-explanation > header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 10px;
	}
	.patch-location {
		margin: 0 0 4px;
		color: #d8bd8c;
		font-size: 10px;
		line-height: 1.4;
	}
	h3 {
		margin: 0;
		color: #e4eddf;
		font-size: 13px;
		line-height: 1.5;
		font-weight: 650;
	}
	.close-button {
		flex: 0 0 30px;
		width: 30px;
		min-height: 30px;
		padding: 0;
		border: 1px solid #5e7b67;
		border-radius: 5px;
		background: #294b3d;
		color: #d4e6cd;
		font-size: 19px;
		line-height: 1;
	}
	.close-button:hover {
		background: #3d604a;
	}
	.choice-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}
	.code-choice {
		min-width: 0;
		padding: 10px;
		border: 1px solid #537361;
		border-radius: 7px;
		background: #18342d;
		color: #e0ebdd;
		text-align: left;
	}
	.code-choice:hover:not(:disabled) {
		border-color: #9cbfa4;
		background: #2b4a39;
	}
	.code-choice.current {
		border-color: #819c8c;
		background: #2b433a;
	}
	.code-choice:disabled:not(.current) {
		opacity: 0.55;
	}
	.choice-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 7px;
		font-size: 11px;
		line-height: 1.5;
	}
	.choice-heading strong {
		font-weight: 600;
	}
	.choice-state {
		flex-shrink: 0;
		color: #adc6b6;
		font-size: 10px;
	}
	.code-choice code {
		display: block;
		color: #d5dcc0;
		font:
			11px/1.65 'SFMono-Regular',
			Consolas,
			monospace;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		tab-size: 2;
	}
	.fallback-explanation {
		margin-top: 10px;
		padding: 14px;
		border: 1px solid #6e9c83;
		border-radius: 10px;
		background: #24483c;
		color: #deead8;
	}
	.fallback-explanation p {
		margin: 0;
		font-size: 13px;
		line-height: 1.65;
	}
	@container (max-width: 560px) {
		.choice-grid {
			grid-template-columns: minmax(0, 1fr);
		}
		.editor-guide,
		.editor-footer {
			flex-wrap: wrap;
		}
	}
	@media (max-width: 600px) {
		.editor-header {
			padding-inline: 8px;
		}
		.side-tabs button {
			min-height: 40px;
		}
		.line-main {
			min-height: 38px;
		}
		.code-line {
			padding-block: 6px;
		}
		.patch-toggle {
			min-height: 34px;
		}
		.close-button {
			flex-basis: 36px;
			width: 36px;
			min-height: 36px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.code-scroll {
			scroll-behavior: auto;
		}
	}
</style>
