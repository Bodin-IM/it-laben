<script>
	/** @typedef {import('#lib/reddChatten.js').WalkthroughFrame} WalkthroughFrame */
	/** @typedef {import('#lib/reddChatten.js').Case} Case */
	/** @typedef {import('#lib/reddChatten.js').CaseResult} CaseResult */
	/**
	 * @type {{frame:WalkthroughFrame, previous:WalkthroughFrame|null, index:number,
	 * total:number, cases:Case[], caseIndex:number, source:string[], result:CaseResult|null,
	 * onstep:(index:number)=>void, oncase:(index:number)=>void, onclose:()=>void,
	 * ontestall:()=>void}}
	 */
	let {
		frame,
		previous,
		index,
		total,
		cases,
		caseIndex,
		source,
		result,
		onstep,
		oncase,
		onclose,
		ontestall
	} = $props();
	const id = $props.id();
	let scenario = $derived(cases[caseIndex]);
	let textPresent = $derived(Object.hasOwn(frame.variables, 'tekst'));
	let savedPresent = $derived(Object.hasOwn(frame.variables, 'lagret'));
	let saved = $derived(frame.variables.lagret);
	let savedObject = $derived(saved !== null && typeof saved === 'object');
	let messagesChanged = $derived(
		previous !== null && json(frame.messages) !== json(previous.messages)
	);
	let responseChanged = $derived(
		previous !== null &&
			(frame.status !== previous.status || json(frame.response) !== json(previous.response))
	);

	/** @param {unknown} value */
	function json(value) {
		return JSON.stringify(value, null, 2) ?? 'undefined';
	}
	/** @param {string} name */
	function changed(name) {
		return (
			previous !== null &&
			(Object.hasOwn(frame.variables, name) !== Object.hasOwn(previous.variables, name) ||
				json(frame.variables[name]) !== json(previous.variables[name]))
		);
	}
</script>

<section
	class="walkthrough"
	aria-labelledby={`${id}-title`}
	data-testid="rescue-walkthrough"
	data-phase={frame.phase}
	data-frame={frame.id}
>
	<div class="walkthrough-heading">
		<div>
			<p class="eyebrow">02 / FØLG KODEN</p>
			<h2 id={`${id}-title`}>Én request, steg for steg</h2>
		</div>
		<button type="button" class="close" onclick={onclose} aria-label="Avslutt gjennomgangen"
			>×</button
		>
	</div>
	<label class="case-picker" for={`${id}-case`}>
		<span>Velg request</span>
		<select
			id={`${id}-case`}
			value={caseIndex}
			onchange={(event) => oncase(Number(event.currentTarget.value))}
		>
			{#each cases as item, i}<option value={i}>{item.name}</option>{/each}
		</select>
	</label>
	<p class="incoming">Tekst i requesten: <code>{json(scenario.request.body.tekst)}</code></p>

	<div class="step-progress">
		<span>Steg {index + 1} av {total}</span>
		<button type="button" class="restart" onclick={() => onstep(0)} disabled={index === 0}
			>Til starten ↺</button
		>
	</div>
	<div class="step-controls" role="group" aria-label="Gå gjennom requesten">
		<button type="button" class="previous" onclick={() => onstep(index - 1)} disabled={index === 0}
			>← Forrige</button
		>
		<button
			type="button"
			class="next"
			onclick={() => onstep(index + 1)}
			disabled={index === total - 1}>Neste →</button
		>
	</div>
	<div class="progress-track" aria-hidden="true">
		<span style:width={`${((index + 1) / total) * 100}%`}></span>
	</div>

	<div
		class="step-description"
		class:stopped={frame.phase === 'skip'}
		data-testid="walkthrough-explanation"
	>
		<h3>{frame.title}</h3>
		{#if source.length}<pre class="mobile-source" aria-label="Kode ved dette steget"><code
					>{source.join('\n')}</code
				></pre>{/if}
		<p>{frame.explanation}</p>
	</div>

	<section class="values" aria-labelledby={`${id}-values`}>
		<h3 id={`${id}-values`}>Verdiene akkurat nå</h3>
		<dl>
			<div class:changed={changed('tekst')} data-testid="walkthrough-text">
				<dt>
					<code>tekst</code>{#if changed('tekst')}<span class="change-label">Endret</span>{/if}
				</dt>
				<dd>
					{#if textPresent}<code class="value">{json(frame.variables.tekst)}</code>{:else}<span
							class="not-set">Ikke lest inn ennå</span
						>{/if}
				</dd>
			</div>
			<div class:changed={changed('lagret')} data-testid="walkthrough-saved">
				<dt>
					<code>lagret</code>{#if changed('lagret')}<span class="change-label">Endret</span>{/if}
				</dt>
				<dd>
					{#if savedObject}
						<details>
							<summary>Meldingsobjekt <span>Vis innhold</span></summary>
							<pre><code>{json(saved)}</code></pre>
						</details>
					{:else if savedPresent}<code class="value">undefined</code><span class="not-set"
							>Ingen melding er opprettet.</span
						>
					{:else}<span class="not-set">Ikke deklarert ennå</span>{/if}
				</dd>
			</div>
			<div
				class:changed={messagesChanged}
				data-testid="walkthrough-messages"
				data-count={frame.messages.length}
			>
				<dt>
					<code>meldinger</code>{#if messagesChanged}<span class="change-label">Endret</span>{/if}
				</dt>
				<dd>
					<details>
						<summary
							>{frame.messages.length}
							{frame.messages.length === 1 ? 'melding' : 'meldinger'} på serveren
							<span>Vis listen</span></summary
						>
						<pre><code>{json(frame.messages)}</code></pre>
					</details>
				</dd>
			</div>
			<div
				class:changed={responseChanged}
				data-testid="walkthrough-response"
				data-status={frame.status ?? ''}
			>
				<dt>
					Svar til nettleseren{#if responseChanged}<span class="change-label">Endret</span>{/if}
				</dt>
				<dd>
					{#if frame.status !== null}<details>
							<summary><strong>HTTP {frame.status}</strong><span>Vis svaret</span></summary>
							<pre><code>{json(frame.response)}</code></pre>
						</details>{:else}<span class="not-set">Ikke sendt ennå</span>{/if}
				</dd>
			</div>
		</dl>
	</section>

	{#if result}
		<div
			class="walkthrough-result"
			class:passed={result.passed}
			data-testid="walkthrough-result"
			data-passed={result.passed}
		>
			<strong
				>{result.passed
					? 'Denne requesten ble håndtert riktig.'
					: 'Denne requesten viser en feil.'}</strong
			>
			<p class="single-only">
				Dette er én situasjon. Hele prøverunden må bestås for å få reparasjonen godkjent.
			</p>
			<button type="button" class="test-all" onclick={ontestall}>Test alle situasjonene →</button>
		</div>
	{:else}
		<p class="walkthrough-help">
			Pilene lar deg undersøke kjøringen i ditt tempo. «Forrige» viser et tidligere tidspunkt.
		</p>
	{/if}
	<p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
		Steg {index + 1} av {total}: {frame.title}. {frame.explanation}
	</p>
</section>

<style>
	.walkthrough {
		min-width: 0;
		border: 1px solid var(--color-border-strong);
		border-radius: 12px;
		background: var(--color-surface-raised);
		padding: 20px;
		font-size: var(--font-body);
		line-height: var(--leading-body);
		color: var(--color-text);
		overflow-wrap: anywhere;
	}
	.walkthrough * {
		box-sizing: border-box;
	}
	h2,
	h3,
	p {
		margin: 0;
	}
	button,
	select {
		font: inherit;
	}
	button {
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.45;
		cursor: default;
	}
	button:focus-visible,
	select:focus-visible,
	summary:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.walkthrough-heading {
		display: flex;
		align-items: start;
		gap: 12px;
		justify-content: space-between;
		margin-bottom: 18px;
	}
	.eyebrow {
		color: var(--color-accent);
		font-size: var(--font-meta);
		font-weight: 700;
		letter-spacing: 0.08em;
		margin-bottom: 4px;
	}
	h2 {
		font-size: 1.25rem;
		line-height: 1.35;
	}
	.close {
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-surface-soft);
		color: var(--color-text);
		flex-shrink: 0;
		min-width: 36px;
		min-height: 36px;
		padding: 0;
		font-size: 1.4rem;
	}
	.case-picker {
		display: grid;
		gap: 6px;
		font-size: var(--font-small);
		font-weight: 650;
	}
	.case-picker select {
		display: block;
		width: 100%;
		min-width: 0;
		padding: 9px 8px;
		border: 1px solid var(--color-border-strong);
		border-radius: 6px;
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--font-small);
	}
	.incoming {
		margin-top: 8px;
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.incoming code {
		white-space: pre-wrap;
		background: var(--color-surface-soft);
		padding: 2px 4px;
		border-radius: 4px;
	}
	.step-progress {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 6px;
		margin-top: 20px;
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.restart {
		padding: 4px 0;
		background: none;
		border: 0;
		color: var(--color-accent);
		font-size: var(--font-small);
	}
	.step-controls {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-top: 8px;
	}
	.step-controls button {
		padding: 10px 8px;
		min-height: 44px;
		border-radius: 6px;
		font-size: var(--font-small);
		font-weight: 650;
	}
	.previous {
		color: var(--color-text);
		border: 1px solid var(--color-border-strong);
		background: var(--color-surface);
	}
	.next,
	.test-all {
		color: var(--color-on-action);
		border: 1px solid var(--color-action);
		background: var(--color-action);
	}
	.next:hover:not(:disabled),
	.test-all:hover {
		background: var(--color-action-hover);
	}
	.progress-track {
		height: 4px;
		background: var(--color-surface-soft);
		border-radius: 3px;
		overflow: hidden;
		margin-top: 12px;
	}
	.progress-track span {
		display: block;
		height: 100%;
		background: var(--color-accent);
	}
	.step-description {
		padding: 16px 0;
		min-height: 155px;
	}
	.step-description h3 {
		font-size: var(--font-body);
		line-height: 1.45;
		margin-bottom: 7px;
	}
	.step-description p {
		color: var(--color-text-muted);
	}
	.step-description.stopped h3 {
		color: var(--color-warning);
	}
	.mobile-source {
		display: none;
	}
	.values {
		border-top: 1px solid var(--color-border);
		padding-top: 14px;
	}
	.values h3 {
		font-size: var(--font-body);
		margin-bottom: 8px;
	}
	dl {
		margin: 0;
		display: grid;
		gap: 6px;
	}
	dl > div {
		border: 1px solid transparent;
		border-radius: 6px;
		padding: 8px 10px;
		background: var(--color-surface);
	}
	dl > div.changed {
		border-color: var(--color-info-border);
		background: var(--color-info-soft);
	}
	dt {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 12px;
		justify-content: space-between;
		align-items: center;
		font-size: var(--font-small);
		font-weight: 650;
	}
	dd {
		margin: 3px 0 0;
		min-width: 0;
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	code,
	pre {
		font-family: 'SFMono-Regular', Consolas, monospace;
		font-size: var(--font-code-small);
		line-height: var(--leading-code);
	}
	.value {
		white-space: pre-wrap;
		color: var(--color-text);
	}
	.not-set {
		display: block;
		font-size: var(--font-small);
	}
	.change-label {
		font-size: var(--font-meta);
		font-weight: 600;
		color: var(--color-info);
	}
	summary {
		cursor: pointer;
		font-size: var(--font-small);
	}
	summary span {
		margin-left: 8px;
		color: var(--color-accent);
		font-size: var(--font-meta);
	}
	pre {
		margin: 8px 0 0;
		padding: 10px;
		border-radius: 5px;
		background: var(--color-surface-soft);
		color: var(--color-text);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		max-height: 240px;
		overflow-y: auto;
	}
	.walkthrough-help {
		margin-top: 14px;
		color: var(--color-text-subtle);
		font-size: var(--font-small);
	}
	.walkthrough-result {
		border: 1px solid var(--color-warning-border);
		background: var(--color-warning-soft);
		color: var(--color-warning);
		border-radius: 7px;
		padding: 13px;
		margin-top: 16px;
	}
	.walkthrough-result.passed {
		border-color: var(--color-success-border);
		background: var(--color-success-soft);
		color: var(--color-success);
	}
	.walkthrough-result p {
		margin-top: 7px;
	}
	.walkthrough-result .single-only {
		font-size: var(--font-small);
	}
	.test-all {
		display: block;
		width: 100%;
		border-radius: 6px;
		margin-top: 12px;
		padding: 10px;
		font-size: var(--font-small);
		font-weight: 650;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	@media (max-width: 900px) {
		.mobile-source {
			display: block;
			background: var(--color-code-bg);
			color: var(--color-code-text);
			margin: 0 0 12px;
		}
	}
	@media (max-width: 380px) {
		.walkthrough {
			padding: 14px;
		}
	}
</style>
