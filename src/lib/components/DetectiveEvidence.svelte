<script>
	/** @typedef {'screen' | 'network' | 'server' | 'trace'} Tab */
	/** @typedef {{id:number, rom:string, avsender:string, tekst:string}} Message */
	/** @typedef {{
	 * id:string, stage:'frontend'|'request'|'backend'|'response'|'view',
	 * title:string, detail:string, side:'frontend'|'backend', lineIds:string[],
	 * method:'GET'|'POST'|null, url:string|null, status:number|null,
	 * requestBody:unknown, responseBody:unknown, sentCookie:boolean|null,
	 * cookieJar:string|null, server:Message[], browser:Message[], logs:string[]
	 * }} EvidenceEvent */
	/** @typedef {{
	 * probeId:string, title:string, summary:string, passed:boolean,
	 * checks:{id:string,label:string,passed:boolean,detail:string}[],
	 * events:EvidenceEvent[], before:{server:Message[],browser:Message[]},
	 * after:{server:Message[],browser:Message[]}, requestCount:number
	 * }} ProbeRun */
	/** @typedef {{run:ProbeRun|null, eventIndex:number, oneventchange:(index:number)=>void, stale?:boolean}} Props */
	/** @type {Props} */
	let { run, eventIndex, oneventchange, stale = false } = $props();
	/** @type {Tab} */
	let tab = $state('screen');
	/** @type {ProbeRun|null|undefined} */
	let previousRun;
	const componentId = $props.id();
	/** @type {{id:Tab,label:string}[]} */
	const tabs = [
		{ id: 'screen', label: 'Skjerm' },
		{ id: 'network', label: 'Nettverk' },
		{ id: 'server', label: 'Server' },
		{ id: 'trace', label: 'Forløp' }
	];
	let selected = $derived(run?.events[eventIndex] ?? null);
	let browserMessages = $derived(selected?.browser ?? run?.before.browser ?? []);
	let serverMessages = $derived(selected?.server ?? run?.before.server ?? []);
	let logs = $derived(selected?.logs ?? []);
	let responses = $derived(
		run?.events
			.map((event, index) => ({ event, index }))
			.filter(({ event }) => event.stage === 'response') ?? []
	);

	$effect(() => {
		if (run !== previousRun) {
			previousRun = run;
			tab = 'screen';
		}
	});

	/** @param {EvidenceEvent['stage']} stage */
	function stageName(stage) {
		return {
			frontend: 'Frontend',
			request: 'Request',
			backend: 'Backend',
			response: 'Svar',
			view: 'Visning'
		}[stage];
	}
	/** @param {unknown} value */
	function json(value) {
		return JSON.stringify(value, null, 2) ?? 'Ingen body registrert';
	}
	/** @param {KeyboardEvent & {currentTarget:HTMLButtonElement}} event @param {number} index */
	function moveTab(event, index) {
		let next = index;
		if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
		else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = tabs.length - 1;
		else return;
		event.preventDefault();
		tab = tabs[next].id;
		event.currentTarget.parentElement?.querySelectorAll('button')[next]?.focus();
	}
</script>

<section class="evidence" aria-label="Spor fra forsøket" data-testid="detective-evidence">
	{#if stale && run}<p class="stale-note">
			<span aria-hidden="true">↺</span> Spor fra forrige kode
		</p>{/if}
	{#if !run}
		<div class="empty-evidence">
			<span class="empty-symbol" aria-hidden="true">⌕</span><strong
				>Gjenskap feilen for å få spor</strong
			>
			<p>Da kan du undersøke skjermen, nettverket og det som skjer på serveren.</p>
		</div>
	{:else}
		<div class="tabs" role="tablist" aria-label="Velg hvilke spor du vil se">
			{#each tabs as item, index}<button
					type="button"
					role="tab"
					id={`${componentId}-tab-${item.id}`}
					aria-controls={`${componentId}-panel`}
					aria-selected={tab === item.id}
					tabindex={tab === item.id ? 0 : -1}
					class:chosen={tab === item.id}
					onclick={() => (tab = item.id)}
					onkeydown={(event) => moveTab(event, index)}>{item.label}</button
				>{/each}
		</div>
		<div class="snapshot-heading">
			<p class="snapshot-position">
				{selected
					? `Hendelse ${eventIndex + 1} av ${run.events.length} · ${stageName(selected.stage)}`
					: 'Før første hendelse'}
			</p>
			<strong>{selected?.title ?? 'Forsøkets starttilstand'}</strong>
		</div>
		<div
			class="tab-panel"
			id={`${componentId}-panel`}
			role="tabpanel"
			aria-labelledby={`${componentId}-tab-${tab}`}
			tabindex="0"
		>
			{#if tab === 'screen'}
				<div class="chat-screen" data-testid="detective-browser">
					<div class="screen-chrome">
						<span aria-hidden="true">● ● ●</span><span>NETTLESERENS VISNING</span>
					</div>
					<div class="list-heading">
						<h3>Meldinger på skjermen</h3>
						<span>{browserMessages.length}</span>
					</div>
					{#if browserMessages.length}<ol class="messages browser-messages">
							{#each browserMessages as message}<li data-message-id={message.id}>
									<div class="message-heading">
										<strong>{message.avsender}</strong><span
											>#{message.id} <b>·</b> {message.rom}</span
										>
									</div>
									<p>{message.tekst}</p>
								</li>{/each}
						</ol>{:else}<p class="empty-list">Ingen meldinger i visningen ennå.</p>{/if}
					<p class="screen-note">Dette er listen frontend viser ved den valgte hendelsen.</p>
				</div>
			{:else if tab === 'network'}
				<div class="network" data-testid="detective-network">
					<div class="list-heading">
						<h3>Forespørsler i forsøket</h3>
						<span>{run.requestCount}</span>
					</div>
					{#if responses.length}<ol class="network-list">
							{#each responses as entry}<li>
									<button
										type="button"
										class:selected={entry.index === eventIndex}
										aria-pressed={entry.index === eventIndex}
										aria-label={`Vis svar på ${entry.event.method ?? 'HTTP'} ${entry.event.url ?? 'forespørselen'}`}
										onclick={() => oneventchange(entry.index)}
										data-testid="detective-event"
										data-event-index={entry.index}
									>
										<span class="method" class:post={entry.event.method === 'POST'}
											>{entry.event.method ?? 'HTTP'}</span
										><span class="request-path"
											>{entry.event.url ?? 'Forespørsel'}{#if entry.index > eventIndex}<small
													>Senere i forløpet</small
												>{/if}</span
										><span
											class="http-status"
											class:bad={entry.index <= eventIndex && (entry.event.status ?? 0) >= 400}
											>{entry.index <= eventIndex ? (entry.event.status ?? '—') : '…'}</span
										>
									</button>
								</li>{/each}
						</ol>{:else}<p class="empty-list">
							Ingen HTTP-svar er registrert i dette forsøket.
						</p>{/if}
					<div class="http-detail">
						<h3>Ved den valgte hendelsen</h3>
						{#if selected?.method}<p class="selected-request">
								<span class="method" class:post={selected.method === 'POST'}>{selected.method}</span
								><code>{selected.url ?? 'Ingen URL registrert'}</code>
							</p>{/if}
						<dl class="facts">
							<div>
								<dt>HTTP-status</dt>
								<dd class:bad-text={(selected?.status ?? 0) >= 400}>
									{selected?.status ??
										(selected?.method ? 'Ikke mottatt ennå' : 'Ingen request her')}
								</dd>
							</div>
							<div>
								<dt>Lagret cookie</dt>
								<dd>
									{#if selected?.cookieJar}<code>{selected.cookieJar}</code>{:else}{selected
											? 'Ingen lagret cookie'
											: 'Ikke registrert'}{/if}
								</dd>
							</div>
							<div>
								<dt>Cookie sendt</dt>
								<dd>
									{selected?.sentCookie === true
										? 'Ja, med denne requesten'
										: selected?.sentCookie === false
											? 'Nei, ikke med denne requesten'
											: 'Ingen request her'}
								</dd>
							</div>
						</dl>
						<details class="data-detail">
							<summary>Request-body</summary>
							<pre>{json(selected?.requestBody)}</pre>
						</details>
						<details class="data-detail">
							<summary>Response-body</summary>{#if selected?.status === null || !selected}<p
									class="not-yet"
								>
									Ingen response-body er mottatt ved denne hendelsen.
								</p>{:else}<pre>{json(selected.responseBody)}</pre>{/if}
						</details>
					</div>
				</div>
			{:else if tab === 'server'}
				<div class="server-data" data-testid="detective-server">
					<div class="list-heading">
						<h3>Lagret på serveren</h3>
						<span>{serverMessages.length}</span>
					</div>
					<p class="snapshot-note">
						Før forsøket: {run.before.server.length} meldinger <span aria-hidden="true">→</span> Ved
						denne hendelsen: {serverMessages.length}
					</p>
					{#if serverMessages.length}<ol class="messages server-messages">
							{#each serverMessages as message}<li data-message-id={message.id}>
									<div class="message-heading">
										<strong>{message.avsender}</strong><span
											>#{message.id} <b>·</b> {message.rom}</span
										>
									</div>
									<p>{message.tekst}</p>
								</li>{/each}
						</ol>{:else}<p class="empty-list">Serverlisten er tom ved denne hendelsen.</p>{/if}
					<details class="data-detail log-detail" open>
						<summary>Serverlogg <span>{logs.length}</span></summary>{#if logs.length}<ol
								class="logs"
							>
								{#each logs as log}<li><code>{log}</code></li>{/each}
							</ol>{:else}<p class="not-yet">Ingen logglinjer ennå.</p>{/if}
					</details>
					<details class="data-detail">
						<summary>Vis serverlisten som JSON</summary>
						<pre>{json(serverMessages)}</pre>
					</details>
				</div>
			{:else}
				<div class="trace">
					<p class="trace-note">Velg en hendelse for å se sporene og den tilhørende koden.</p>
					<ol class="timeline">
						{#each run.events as entry, index}<li>
								<button
									type="button"
									class:selected={index === eventIndex}
									aria-pressed={index === eventIndex}
									onclick={() => oneventchange(index)}
									data-testid="detective-event"
									data-event-index={index}
								>
									<span class="event-number">{index + 1}</span><span class="event-text"
										><small>{stageName(entry.stage)}</small><strong>{entry.title}</strong
										>{#if index === eventIndex}<span class="event-detail">{entry.detail}</span
											>{/if}</span
									><span class="event-arrow" aria-hidden="true">↗</span>
								</button>
							</li>{/each}
					</ol>
				</div>
			{/if}
		</div>
	{/if}
</section>

<style>
	.evidence {
		--ink: var(--color-text);
		--muted: var(--color-text-muted);
		--line: var(--color-border);
		color: var(--ink);
		font-family: inherit;
		font-size: var(--font-body);
		line-height: var(--leading-body);
		min-width: 0;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--color-surface);
		overflow: hidden;
		container-type: inline-size;
	}
	.evidence * {
		box-sizing: border-box;
	}
	button {
		font: inherit;
		color: inherit;
		cursor: pointer;
	}
	button:focus-visible,
	summary:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 3px;
	}
	.stale-note {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 12px 12px 0;
		padding: 8px 10px;
		border: 1px solid var(--color-warning-border);
		border-radius: 5px;
		background: var(--color-warning-soft);
		color: var(--color-warning);
		font-size: var(--font-small);
		line-height: var(--leading-body);
	}
	.stale-note > span {
		font-size: 17px;
		line-height: 1;
	}
	.tabs {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		margin: 12px 12px 0;
		padding: 4px;
		gap: 2px;
		background: var(--color-surface-soft);
		border: 1px solid var(--color-border);
		border-radius: 7px;
	}
	.tabs > button {
		padding: 9px 3px;
		border: 0;
		border-radius: 4px;
		background: transparent;
		font-size: var(--font-small);
		font-weight: 650;
		color: var(--color-text-muted);
		min-height: 42px;
	}
	.tabs > button:hover {
		background: var(--color-surface-hover);
	}
	.tabs > button.chosen {
		background: var(--color-surface-raised);
		color: var(--color-accent);
		box-shadow: 0 1px 4px var(--color-shadow);
	}
	.snapshot-heading {
		padding: 14px 17px;
		border-bottom: 1px solid var(--color-border);
	}
	.snapshot-position {
		margin: 0 0 5px;
		color: var(--color-text-subtle);
		font-size: var(--font-meta);
	}
	.snapshot-heading > strong {
		font-size: var(--font-body);
		font-weight: 650;
		line-height: var(--leading-body);
	}
	.tab-panel {
		min-height: 280px;
		padding: 15px;
		outline-offset: -2px;
	}
	.empty-evidence {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 28px 24px 38px;
		min-height: 245px;
		justify-content: center;
	}
	.empty-symbol {
		display: grid;
		place-items: center;
		width: 43px;
		height: 43px;
		margin-bottom: 16px;
		border: 1px dashed var(--color-border-strong);
		border-radius: 50%;
		color: var(--color-accent);
		font-size: 29px;
	}
	.empty-evidence strong {
		font-size: var(--font-body);
		line-height: var(--leading-body);
	}
	.empty-evidence p {
		margin: 8px 0 0;
		max-width: 255px;
		font-size: var(--font-body);
		line-height: var(--leading-body);
		color: var(--muted);
	}
	.list-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 11px;
		flex-wrap: wrap;
	}
	h3 {
		margin: 0;
		font-size: var(--font-body);
		font-weight: 700;
		line-height: var(--leading-body);
	}
	.list-heading > span {
		padding: 2px 7px;
		border-radius: 4px;
		background: var(--color-surface-soft);
		color: var(--color-accent);
		font-size: var(--font-meta);
		font-variant-numeric: tabular-nums;
	}
	.chat-screen {
		border: 1px solid var(--color-border);
		border-radius: 7px;
		overflow: hidden;
		background: var(--color-surface-soft);
	}
	.screen-chrome {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 8px 11px;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-subtle);
		font-size: var(--font-meta);
		letter-spacing: 0.7px;
		background: var(--color-surface-soft);
	}
	.screen-chrome > span:first-child {
		font-size: 6px;
		letter-spacing: 3px;
	}
	.chat-screen > .list-heading {
		padding: 12px 11px 0;
	}
	.messages {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 340px;
		overflow: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--color-border-strong) transparent;
		overscroll-behavior: contain;
	}
	.browser-messages {
		padding: 0 10px 10px;
	}
	.messages > li {
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 10px;
		background: var(--color-surface);
	}
	.messages > li + li {
		margin-top: 8px;
	}
	.message-heading {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 10px;
		flex-wrap: wrap;
	}
	.message-heading > strong {
		font-size: var(--font-small);
		color: var(--color-text);
		overflow-wrap: anywhere;
		line-height: var(--leading-body);
	}
	.message-heading > span {
		font-size: var(--font-meta);
		color: var(--color-text-subtle);
		text-align: right;
		overflow-wrap: anywhere;
	}
	.message-heading b {
		margin: 0 3px;
		font-weight: 400;
	}
	.messages p {
		margin: 5px 0 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font-size: var(--font-body);
		color: var(--color-text-muted);
		line-height: var(--leading-body);
	}
	.empty-list {
		padding: 18px 12px;
		margin: 0;
		color: var(--color-text-muted);
		font-size: var(--font-body);
		line-height: var(--leading-body);
		background: var(--color-surface-soft);
		border: 1px dashed var(--color-border);
		border-radius: 5px;
	}
	.chat-screen > .empty-list {
		margin: 0 10px 10px;
		min-height: 95px;
		display: grid;
		align-content: center;
		text-align: center;
	}
	.screen-note {
		margin: 0;
		padding: 9px 11px;
		border-top: 1px solid var(--color-border);
		color: var(--color-text-subtle);
		font-size: var(--font-small);
		line-height: var(--leading-body);
	}
	.network-list {
		list-style: none;
		margin: 0 0 14px;
		padding: 0;
		max-height: 190px;
		overflow: auto;
		scrollbar-width: thin;
	}
	.network-list > li + li {
		margin-top: 5px;
	}
	.network-list button {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 9px;
		padding: 9px;
		border: 1px solid var(--color-border);
		border-radius: 5px;
		background: var(--color-surface-soft);
		text-align: left;
	}
	.network-list button:hover,
	.timeline button:hover {
		background: var(--color-surface-hover);
	}
	.network-list button.selected {
		border-color: var(--color-success-border);
		background: var(--color-surface-active);
	}
	.method {
		display: inline-block;
		padding: 3px 5px;
		flex: 0 0 auto;
		border-radius: 3px;
		background: var(--color-success-soft);
		color: var(--color-success);
		font: var(--font-meta)/1.3 monospace;
	}
	.method.post {
		background: var(--color-warning-soft);
		color: var(--color-warning);
	}
	.request-path {
		flex: 1 1 auto;
		min-width: 0;
		font: var(--font-meta)/1.5 monospace;
		overflow-wrap: anywhere;
		font-size: var(--font-code-small);
		line-height: var(--leading-code);
	}
	.request-path > small {
		display: block;
		color: var(--color-text-subtle);
		font:
			var(--font-meta)/1.4 system-ui,
			sans-serif;
		margin-top: 2px;
	}
	.http-status {
		color: var(--color-success);
		font: var(--font-meta) monospace;
	}
	.http-status.bad,
	.bad-text {
		color: var(--color-danger);
	}
	.http-detail {
		padding-top: 12px;
		border-top: 1px solid var(--line);
	}
	.http-detail > h3 {
		margin-bottom: 10px;
	}
	.selected-request {
		display: flex;
		align-items: flex-start;
		gap: 9px;
		margin: 0 0 13px;
	}
	.selected-request > code {
		min-width: 0;
		overflow-wrap: anywhere;
		font: var(--font-meta)/1.6 monospace;
		color: var(--color-text-muted);
		font-size: var(--font-code-small);
		line-height: var(--leading-code);
	}
	.facts {
		margin: 0 0 13px;
		font-size: var(--font-meta);
	}
	.facts > div {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 3px;
		padding: 7px 0;
		border-bottom: 1px solid var(--color-border);
	}
	.facts dt {
		color: var(--color-text-subtle);
	}
	.facts dd {
		margin: 0;
		color: var(--color-text);
		overflow-wrap: anywhere;
	}
	.facts dd.bad-text {
		color: var(--color-danger);
	}
	.facts code {
		font: var(--font-meta)/1.6 monospace;
		font-size: var(--font-code-small);
		line-height: var(--leading-code);
	}
	.data-detail {
		border: 1px solid var(--color-border);
		border-radius: 5px;
		margin-top: 8px;
		background: var(--color-surface-soft);
		overflow: hidden;
	}
	.data-detail > summary {
		padding: 9px 10px;
		color: var(--color-text-muted);
		font-size: var(--font-small);
		font-weight: 650;
		cursor: pointer;
		line-height: var(--leading-body);
	}
	.data-detail > summary:hover {
		background: var(--color-surface-hover);
	}
	.data-detail > summary::marker {
		color: var(--color-text-subtle);
	}
	.data-detail pre {
		margin: 0;
		padding: 11px;
		background: #1b3a31;
		color: #dcebd1;
		max-height: 260px;
		overflow: auto;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font:
			var(--font-meta)/1.7 Consolas,
			monospace;
		tab-size: 2;
		scrollbar-width: thin;
		font-size: var(--font-code-small);
		line-height: var(--leading-code);
	}
	.not-yet {
		padding: 1px 10px 10px;
		margin: 0;
		color: var(--color-text-subtle);
		font-size: var(--font-small);
		line-height: var(--leading-body);
	}
	.snapshot-note {
		color: var(--color-text-subtle);
		margin: -3px 0 12px;
		font-size: var(--font-small);
		line-height: var(--leading-body);
	}
	.snapshot-note > span {
		padding: 0 5px;
		color: var(--color-accent);
	}
	.server-messages {
		margin-bottom: 12px;
	}
	.server-messages > li {
		background: var(--color-surface-soft);
	}
	.log-detail > summary > span {
		margin-left: 5px;
		color: var(--color-text-subtle);
		font-size: var(--font-meta);
		font-weight: 400;
	}
	.logs {
		list-style: none;
		margin: 0;
		padding: 0 10px 10px;
		max-height: 210px;
		overflow: auto;
		scrollbar-width: thin;
	}
	.logs li {
		color: var(--color-text-muted);
		padding-top: 6px;
		overflow-wrap: anywhere;
	}
	.logs li::before {
		content: '›';
		color: var(--color-accent);
		margin-right: 6px;
	}
	.logs code {
		font:
			var(--font-meta)/1.7 Consolas,
			monospace;
		white-space: pre-wrap;
		font-size: var(--font-code-small);
		line-height: var(--leading-code);
	}
	.trace-note {
		color: var(--color-text-subtle);
		margin: 0 0 13px;
		font-size: var(--font-body);
		line-height: var(--leading-body);
	}
	.timeline {
		list-style: none;
		padding: 0;
		margin: 0;
		max-height: 510px;
		overflow: auto;
		scrollbar-width: thin;
	}
	.timeline > li + li {
		margin-top: 6px;
	}
	.timeline button {
		display: flex;
		align-items: flex-start;
		width: 100%;
		gap: 10px;
		padding: 10px 9px;
		border: 1px solid var(--color-border);
		background: var(--color-surface-soft);
		border-radius: 5px;
		text-align: left;
	}
	.timeline button.selected {
		background: var(--color-surface-active);
		border-color: var(--color-success-border);
	}
	.event-number {
		flex: 0 0 22px;
		width: 22px;
		height: 22px;
		display: grid;
		place-items: center;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-accent);
		font: var(--font-meta) monospace;
	}
	.event-text {
		flex: 1;
		min-width: 0;
	}
	.event-text > small {
		display: block;
		color: var(--color-text-subtle);
		font-size: var(--font-meta);
		text-transform: uppercase;
		letter-spacing: 0.6px;
		margin-bottom: 3px;
	}
	.event-text > strong {
		display: block;
		color: var(--color-text);
		font-size: var(--font-body);
		font-weight: 650;
		overflow-wrap: anywhere;
		line-height: var(--leading-body);
	}
	.event-detail {
		display: block;
		margin-top: 7px;
		color: var(--color-text-muted);
		font-size: var(--font-body);
		line-height: var(--leading-body);
		overflow-wrap: anywhere;
	}
	.event-arrow {
		color: var(--color-text-subtle);
		font-size: var(--font-small);
		flex: 0 0 auto;
	}
	@container (min-width: 440px) {
		.tabs {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
	@media (max-width: 420px) {
		.tab-panel {
			padding: 12px;
		}
		.snapshot-heading {
			padding-inline: 14px;
		}
		.facts > div {
			grid-template-columns: minmax(0, 1fr);
			gap: 3px;
		}
		.message-heading {
			gap: 7px;
			flex-wrap: wrap;
		}
	}
</style>
