<script>
	import { onMount } from 'svelte';
	import CodeExplanation from '#lib/components/CodeExplanation.svelte';

	/** @typedef {'frontend' | 'backend'} CodeSide */
	/** @typedef {{ id: string, text: string, title: string, explanation: string }} CodeLine */
	/** @typedef {{ text: string, type: string }} Token */
	/**
	 * The parent owns the selected side and execution state. Change resetKey when
	 * the step, input or example changes to close the current line explanation.
	 * @typedef {{
	 *   lines: CodeLine[],
	 *   side: CodeSide,
	 *   onsidechange: (side: CodeSide) => void,
	 *   activeSide: CodeSide | null,
	 *   activeLineIds: string[],
	 *   resetKey: string,
	 *   label: string
	 * }} Props
	 */
	/** @type {Props} */
	let { lines, side, onsidechange, activeSide, activeLineIds, resetKey, label } = $props();
	const componentId = $props.id();
	const explanationId = componentId + '-code-explanation';
	/** @type {string | null} */
	let selectedId = $state(null);
	/** @type {HTMLElement | null} */
	let selectedButton = $state(null);
	/** @type {HTMLElement | undefined} */
	let gutter = $state();
	let narrow = $state(false);
	let selectedLine = $derived(lines.find((line) => line.id === selectedId));
	let sideName = $derived(side === 'frontend' ? 'Frontend' : 'Backend');

	function closeExplanation() {
		selectedId = null;
		selectedButton = null;
	}

	$effect(() => {
		// These external values reset the explanation; selecting a line does not.
		void resetKey;
		void side;
		closeExplanation();
	});

	onMount(() => {
		const media = window.matchMedia('(max-width: 900px)');
		function updateViewport() {
			narrow = media.matches;
			closeExplanation();
		}
		updateViewport();
		media.addEventListener('change', updateViewport);
		return () => media.removeEventListener('change', updateViewport);
	});

	/** @param {CodeSide} nextSide */
	function changeSide(nextSide) {
		closeExplanation();
		if (nextSide !== side) onsidechange(nextSide);
	}

	/** @param {string} id @param {MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }} event */
	function explain(id, event) {
		if (selectedId === id) {
			closeExplanation();
			return;
		}
		selectedButton = event.currentTarget;
		selectedId = id;
	}

	/** @param {string} source @returns {Token[]} */
	function highlight(source) {
		const pattern =
			/\/\/.*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:import|from|const|let|if|else|return|async|await|function|try|catch|throw|new|typeof|for|of|export|true|false|null)\b|\b(?:fetch|stringify|json|push|trim|status|post|get|set|use|filter|map|Error|JSON|express|URLSearchParams|encodeURIComponent)\b|\b\d+\b/g;
		/** @type {Token[]} */
		const tokens = [];
		let end = 0;
		for (const match of source.matchAll(pattern)) {
			const index = match.index ?? 0;
			if (index > end) tokens.push({ text: source.slice(end, index), type: 'vanlig' });
			const word = match[0];
			const type = word.startsWith('//')
				? 'kommentar'
				: /^["'`]/.test(word)
					? 'streng'
					: /^\d+$/.test(word)
						? 'tall'
						: /^(import|from|const|let|if|else|return|async|await|function|try|catch|throw|new|typeof|for|of|export|true|false|null)$/.test(
									word
							  )
							? 'nokkelord'
							: 'funksjon';
			tokens.push({ text: word, type });
			end = index + word.length;
		}
		if (end < source.length) tokens.push({ text: source.slice(end), type: 'vanlig' });
		return tokens;
	}
</script>

<div class="arbeidsflate">
	<div class="editor">
		<div class="editorhode">
			<div class="sidevalg" role="group" aria-label="Velg kode å se på">
				<button
					type="button"
					class:aktiv={side === 'frontend'}
					aria-pressed={side === 'frontend'}
					onclick={() => changeSide('frontend')}
				>
					<span class="sideprikk front" aria-hidden="true"></span> Frontend
					<small>+page.svelte</small>
				</button>
				<button
					type="button"
					class:aktiv={side === 'backend'}
					aria-pressed={side === 'backend'}
					onclick={() => changeSide('backend')}
				>
					<span class="sideprikk back" aria-hidden="true"></span> Backend
					<small>server.js</small>
				</button>
			</div>
			<span class="utdrag">UTDRAG</span>
		</div>
		<div class="kodehjelp">
			<span>Klikk på en linje for forklaring <span aria-hidden="true">↗</span></span>
			<span class="kjorelegende"><i aria-hidden="true">→</i> Gjeldende steg</span>
		</div>
		<div class="kodeliste" role="group" aria-label={`${sideName}: ${label}`}>
			{#each lines as line, index (line.id)}
				{@const active = activeSide === side && activeLineIds.includes(line.id)}
				<div
					class="linjerad"
					class:markert={selectedId === line.id}
					class:utfort={active}
					data-line-id={line.id}
				>
					{#if line.text.trim()}
						<button
							type="button"
							class="kodelinje"
							data-explanation-for={explanationId}
							aria-label={`Forklar ${sideName.toLowerCase()} linje ${index + 1}: ${line.text}${active ? ' · Gjeldende steg' : ''}`}
							aria-expanded={selectedId === line.id}
							aria-controls={selectedId === line.id ? explanationId : undefined}
							aria-describedby={selectedId === line.id ? explanationId + '-body' : undefined}
							onclick={(event) => explain(line.id, event)}
						>
							<span class="linjenummer" aria-hidden="true">{index + 1}</span>
							<span class="kjorepil" aria-hidden="true">{active ? '→' : ''}</span>
							<code
								>{#each highlight(line.text) as token}<span class={token.type}>{token.text}</span
									>{/each}</code
							>
							<span class="forklaringsmerke" aria-hidden="true"
								>{selectedId === line.id ? '←' : '?'}</span
							>
						</button>
					{:else}
						<div class="tomlinje" aria-hidden="true">
							<span class="linjenummer">{index + 1}</span>
						</div>
					{/if}
					{#if narrow && selectedId === line.id}
						<div class="inlineforklaring">
							<CodeExplanation
								anchor={selectedButton}
								id={explanationId}
								title={line.title}
								explanation={line.explanation}
								label={`${sideName} · linje ${index + 1}`}
								onclose={closeExplanation}
								mode="inline"
							/>
						</div>
					{/if}
				</div>
			{/each}
		</div>
		<div class="kodefot">
			<span
				class="sideprikk"
				class:front={side === 'frontend'}
				class:back={side === 'backend'}
				aria-hidden="true"
			></span>
			<span
				>{side === 'frontend' ? 'Kjører i nettleseren' : 'Kjører på serveren'} <b>·</b>
				{label}</span
			>
		</div>
	</div>
	<aside class="forklaringskolonne" bind:this={gutter} aria-label="Forklaring ved kodelinjen">
		{#if !narrow && selectedLine}
			<CodeExplanation
				anchor={selectedButton}
				boundary={gutter}
				id={explanationId}
				title={selectedLine.title}
				explanation={selectedLine.explanation}
				label={`${sideName} · linje ${lines.findIndex((line) => line.id === selectedId) + 1}`}
				onclose={closeExplanation}
			/>
		{/if}
		{#if !narrow}
			<div
				class="forklaringshint"
				class:skjult={Boolean(selectedLine)}
				aria-hidden={Boolean(selectedLine)}
			>
				<span class="peker" aria-hidden="true">↖</span>
				<p>
					<strong>Lurer du på en linje?</strong>Trykk på koden. Forklaringen åpner her, rett ved
					linjen du velger.
				</p>
				<small>Du kan lese forklaringer uten å kjøre koden.</small>
			</div>
		{/if}
	</aside>
</div>

<style>
	.arbeidsflate {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 292px;
		column-gap: 24px;
		align-items: stretch;
		min-width: 0;
		font-family: inherit;
	}
	.arbeidsflate * {
		box-sizing: border-box;
	}
	button {
		font: inherit;
		cursor: pointer;
	}
	button:focus-visible {
		outline: 2px solid #e2be89;
		outline-offset: -3px;
	}
	.editor {
		min-width: 0;
		background: #132f2c;
		color: #e7eee1;
		border-radius: 9px;
		overflow: clip;
	}
	.editorhode {
		display: flex;
		align-items: stretch;
		justify-content: space-between;
		border-bottom: 1px solid #39534a;
		background: #1c3c34;
		padding-inline: 12px;
		min-height: 54px;
		gap: 10px;
	}
	.sidevalg {
		display: flex;
		gap: 4px;
	}
	.sidevalg button {
		border: 0;
		border-bottom: 2px solid transparent;
		border-radius: 4px 4px 0 0;
		background: transparent;
		color: #a6b7a5;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 13px 10px;
		font-size: 12px;
		font-weight: 650;
	}
	.sidevalg button.aktiv {
		color: #eef3df;
		border-bottom-color: #cee19e;
		background: #2a493c;
	}
	.sidevalg small {
		font-size: 10px;
		font-weight: 400;
		color: #a9baa7;
		margin-left: 4px;
	}
	.sideprikk {
		display: inline-block;
		flex: 0 0 auto;
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}
	.sideprikk.front {
		background: #a5d6cb;
	}
	.sideprikk.back {
		background: #e0bc7e;
	}
	.utdrag {
		align-self: center;
		color: #a0b09f;
		font-size: 9px;
		letter-spacing: 1px;
		padding-right: 6px;
	}
	.kodehjelp {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding: 11px 18px 8px;
		font-size: 10px;
		color: #b0c0ac;
	}
	.kjorelegende {
		font-size: 9px;
		white-space: nowrap;
		color: #bdcea9;
	}
	.kjorelegende i {
		color: #d7e9a7;
		font-size: 13px;
		font-style: normal;
		padding-right: 4px;
	}
	.kodeliste {
		overflow-x: auto;
		padding: 5px 0 18px;
		scrollbar-color: #557357 #172f28;
		scrollbar-width: thin;
	}
	.linjerad {
		width: 100%;
		position: relative;
	}
	.kodelinje {
		display: flex;
		align-items: center;
		width: max-content;
		min-width: 100%;
		min-height: 27px;
		padding: 2px 16px 2px 0;
		border: 0;
		border-left: 3px solid transparent;
		background: transparent;
		color: #e3ebd8;
		text-align: left;
		line-height: 23px;
	}
	.kodelinje:hover {
		background: #274a3b;
	}
	.linjenummer {
		display: inline-block;
		width: 37px;
		min-width: 37px;
		padding-right: 6px;
		text-align: right;
		color: #829a85;
		font:
			10px/23px 'SFMono-Regular',
			Consolas,
			monospace;
		user-select: none;
	}
	.kjorepil {
		display: inline-block;
		width: 22px;
		min-width: 22px;
		text-align: center;
		color: #d4e8a1;
		font-size: 14px;
	}
	.kodelinje code {
		white-space: pre;
		font:
			13px/23px 'SFMono-Regular',
			Consolas,
			monospace;
		tab-size: 2;
	}
	.forklaringsmerke {
		margin-left: auto;
		padding-left: 20px;
		min-width: 32px;
		font-size: 11px;
		color: #b4d0b5;
		opacity: 0;
	}
	.kodelinje:hover .forklaringsmerke,
	.kodelinje:focus-visible .forklaringsmerke,
	.markert .forklaringsmerke {
		opacity: 1;
	}
	.utfort > .kodelinje {
		background: #345239;
		border-left-color: #c6df8c;
	}
	.markert > .kodelinje {
		background: #3c5c50;
		box-shadow:
			inset 0 1px 0 #9dbaa8,
			inset 0 -1px 0 #9dbaa8;
		border-left-color: #a5d6cb;
	}
	.markert .linjenummer {
		color: #d6e9d2;
	}
	.tomlinje {
		height: 18px;
		padding-left: 3px;
	}
	.tomlinje .linjenummer {
		line-height: 18px;
	}
	.nokkelord {
		color: #9cded1;
	}
	.streng {
		color: #e0d29f;
	}
	.funksjon {
		color: #e6bd8c;
	}
	.tall {
		color: #d8c0e4;
	}
	.kommentar {
		color: #8fa98d;
		font-style: italic;
	}
	.kodefot {
		display: flex;
		align-items: center;
		gap: 7px;
		border-top: 1px solid #334d40;
		padding: 10px 18px;
		color: #b1c3a6;
		font-size: 10px;
		line-height: 1.6;
		overflow-wrap: anywhere;
	}
	.kodefot b {
		margin-inline: 5px;
		color: #768f75;
	}
	.forklaringskolonne {
		min-width: 0;
		position: relative;
	}
	.forklaringshint {
		margin-top: 96px;
		max-width: 254px;
		padding: 5px 10px;
		color: #6b7c69;
	}
	.forklaringshint.skjult {
		visibility: hidden;
	}
	.peker {
		display: block;
		font-size: 30px;
		line-height: 1;
		color: #5e7c68;
		margin-bottom: 14px;
	}
	.forklaringshint p {
		font-size: 13px;
		line-height: 1.7;
		margin: 0;
	}
	.forklaringshint strong {
		display: block;
		color: #365c49;
		font-size: 14px;
		font-weight: 650;
		margin-bottom: 5px;
	}
	.forklaringshint small {
		display: block;
		margin-top: 15px;
		font-size: 11px;
		line-height: 1.6;
		color: #697a68;
	}
	.inlineforklaring {
		position: sticky;
		left: 0;
		width: 100%;
		padding: 4px 12px 12px;
	}
	@media (max-width: 1100px) {
		.arbeidsflate {
			grid-template-columns: minmax(0, 1fr) 260px;
			column-gap: 20px;
		}
		.sidevalg small {
			display: none;
		}
	}
	@media (max-width: 900px) {
		.arbeidsflate {
			display: block;
		}
		.forklaringskolonne {
			display: none;
		}
		.linjerad {
			display: contents;
		}
		.sidevalg small {
			display: inline;
		}
		.kodelinje {
			min-height: 32px;
		}
		.kodelinje code {
			font-size: 11px;
		}
	}
	@media (max-width: 620px) {
		.editorhode {
			padding-inline: 5px;
			min-height: 48px;
			gap: 0;
		}
		.sidevalg {
			flex: 1;
			gap: 0;
		}
		.sidevalg button {
			flex: 1;
			padding: 10px;
			font-size: 11px;
		}
		.sidevalg small,
		.utdrag {
			display: none;
		}
		.kodehjelp {
			padding-inline: 12px;
			font-size: 9px;
		}
		.kjorelegende {
			font-size: 8px;
		}
		.linjenummer {
			min-width: 28px;
			width: 28px;
			padding-right: 4px;
			font-size: 9px;
		}
		.kjorepil {
			min-width: 17px;
			width: 17px;
			font-size: 12px;
		}
		.kodelinje {
			padding-right: 12px;
		}
		.kodefot {
			padding-inline: 12px;
			font-size: 9px;
		}
	}
</style>
