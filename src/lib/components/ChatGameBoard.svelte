<script>
	import { tick } from 'svelte';

	/** @typedef {import('#lib/chatSpill.js').State} State */
	/** @typedef {import('#lib/chatSpill.js').Step} Step */
	/** @typedef {import('#lib/chatSpill.js').Message} Message */
	/** @typedef {import('#lib/chatSpill.js').MessageData} MessageData */
	/** @typedef {{lab: State, step: Step | null, target: MessageData, running: boolean, paused?: boolean, delay?: number}} Props */
	/** @type {Props} */
	let { lab, step, target, running, paused = false, delay = 900 } = $props();
	let actorName = $derived(step?.actor === 'ada' ? 'Ada' : 'Noah');
	let inTransit = $derived(step?.phase === 'request' || step?.phase === 'response');
	let returning = $derived(step?.phase === 'response');
	let activeClient = $derived(
		step?.phase === 'request' || step?.phase === 'client' ? step.actor : null
	);
	let activeServer = $derived(step?.phase === 'server' || step?.phase === 'response');
	let packetLabel = $derived(returning ? `HTTP ${step?.httpStatus ?? ''}` : (step?.method ?? ''));

	/**
	 * @param {HTMLUListElement} node
	 * @param {Message[]} messages
	 */
	function followLatest(node, messages) {
		let signature = JSON.stringify(messages);
		let alive = true;
		let queued = false;

		async function scrollToLatest() {
			if (queued) return;
			queued = true;
			await tick();
			queued = false;
			if (alive) node.scrollTop = node.scrollHeight;
		}

		void scrollToLatest();
		return {
			/** @param {Message[]} nextMessages */
			update(nextMessages) {
				const nextSignature = JSON.stringify(nextMessages);
				if (nextSignature === signature) return;
				signature = nextSignature;
				void scrollToLatest();
			},
			destroy() {
				alive = false;
			}
		};
	}

	/** @param {Message} message */
	function isTarget(message) {
		return (
			message.rom === target.rom &&
			message.avsender === target.avsender &&
			message.tekst === target.tekst
		);
	}
	/** @param {string} room */
	function roomName(room) {
		return room === 'generelt' ? 'Generelt' : room === 'gaming' ? 'Gaming' : room;
	}
	/** @param {'ada'|'noah'} actor */
	function clientStatus(actor) {
		if (!step || step.actor !== actor) return 'Egen kopi av meldingene';
		if (step.phase === 'request') return 'Request sendt · listen står fortsatt';
		if (step.phase === 'response') return 'Svaret er på vei hit';
		if (step.phase === 'client')
			return step.method === 'POST' ? 'Bekreftelse mottatt · samme liste' : 'Ny kopi fra backend';
		return 'Venter på svar fra backend';
	}
</script>

<section
	class="game-board"
	class:paused
	style:--packet-duration={`${Math.max(0, delay * 0.8)}ms`}
	aria-label="Spillbrett: to nettlesere og en server"
>
	<div class="board-caption">
		<span><i aria-hidden="true"></i> TO NETTLESERE · ÉN SERVER</span><span class="target-legend"
			><i aria-hidden="true"></i> Oppdragsmeldingen</span
		>
	</div>
	<div class="board-grid">
		<article
			class="node browser ada"
			class:active={activeClient === 'ada'}
			class:receiving={returning && step?.actor === 'ada'}
			aria-label="Adas nettleser"
			data-testid="board-ada"
		>
			<div class="browser-chrome">
				<span aria-hidden="true">● ● ●</span><span>NETTLESER A</span><i aria-hidden="true"></i>
			</div>
			<div class="person-heading">
				<span class="avatar" aria-hidden="true">A</span>
				<div>
					<h3>Ada</h3>
					<p>Frontend</p>
				</div>
				<span class="node-light" aria-hidden="true"></span>
			</div>
			<div class="room-label">
				<span># {roomName(lab.ada.room)}</span><small>{lab.ada.messages.length} meld.</small>
			</div>
			<ul class="messages" aria-label="Meldinger Ada viser" use:followLatest={lab.ada.messages}>
				{#each lab.ada.messages as message (message.id)}
					<li class:target-message={isTarget(message)} data-message-id={message.id}>
						<div class="message-heading">
							<strong>{message.avsender}</strong><span>#{message.id}</span>
						</div>
						<p>{message.tekst}</p>
						{#if isTarget(message)}<small class="target-label"
								><i aria-hidden="true"></i> Oppdrag</small
							>{/if}
					</li>
				{:else}<li class="empty-message">Ingen meldinger i denne kopien.</li>{/each}
			</ul>
			<p class="node-status" class:current={step?.actor === 'ada'}>
				<i aria-hidden="true"></i>{clientStatus('ada')}
			</p>
		</article>

		<div
			class="bridge ada-bridge"
			class:transit={inTransit && step?.actor === 'ada'}
			aria-hidden="true"
		>
			<div class="connection"></div>
			<span class="idle-direction">↔</span>
			{#if inTransit && step?.actor === 'ada'}
				{#key step.id}
					<div
						class="packet"
						class:moving={running}
						class:returning
						class:request={!returning}
						data-testid="board-packet"
						data-from={returning ? 'server' : 'ada'}
						data-to={returning ? 'ada' : 'server'}
					>
						<span class="packet-label">{packetLabel}</span><span class="packet-body"
							><b class="horizontal-arrow">{returning ? '←' : '→'}</b><b class="vertical-arrow"
								>{returning ? '↑' : '↓'}</b
							></span
						>
					</div>
				{/key}
			{/if}
		</div>

		<article
			class="node server"
			class:active={activeServer}
			aria-label="Backendens felles meldingsliste"
			data-testid="board-server"
		>
			<div class="server-chrome">
				<span>SERVER</span><span class:working={activeServer}
					><i></i> {activeServer ? 'BEHANDLER' : 'KLAR'}</span
				>
			</div>
			<div class="server-heading">
				<span class="server-icon" aria-hidden="true"><i></i><i></i><i></i></span>
				<div>
					<h3>Backend</h3>
					<p>Felles serverminne</p>
				</div>
			</div>
			<div class="room-label">
				<span>Alle rom</span><small>{lab.serverMessages.length} meld.</small>
			</div>
			<ul
				class="messages server-messages"
				aria-label="Meldinger på backend"
				use:followLatest={lab.serverMessages}
			>
				{#each lab.serverMessages as message (message.id)}
					<li class:target-message={isTarget(message)} data-message-id={message.id}>
						<div class="message-heading">
							<strong>{message.avsender}</strong><span>#{message.id}</span>
						</div>
						<p>{message.tekst}</p>
						<div class="server-message-footer">
							<small class="message-room"># {roomName(message.rom)}</small
							>{#if isTarget(message)}<small class="target-label"
									><i aria-hidden="true"></i> Oppdrag</small
								>{/if}
						</div>
					</li>
				{:else}<li class="empty-message">Ingen meldinger på serveren.</li>{/each}
			</ul>
			<p class="node-status">
				<i aria-hidden="true"></i>{#if step?.phase === 'server'}{step.method === 'POST'
						? 'Ny melding legges i listen'
						: 'Velger meldinger fra riktig rom'}{:else if returning}Svarer bare til {actorName}{:else}Samme
					backend for begge{/if}
			</p>
		</article>

		<div
			class="bridge noah-bridge"
			class:transit={inTransit && step?.actor === 'noah'}
			aria-hidden="true"
		>
			<div class="connection"></div>
			<span class="idle-direction">↔</span>
			{#if inTransit && step?.actor === 'noah'}
				{#key step.id}
					<div
						class="packet"
						class:moving={running}
						class:returning
						class:request={!returning}
						data-testid="board-packet"
						data-from={returning ? 'server' : 'noah'}
						data-to={returning ? 'noah' : 'server'}
					>
						<span class="packet-label">{packetLabel}</span><span class="packet-body"
							><b class="horizontal-arrow">{returning ? '→' : '←'}</b><b class="vertical-arrow"
								>{returning ? '↑' : '↓'}</b
							></span
						>
					</div>
				{/key}
			{/if}
		</div>

		<article
			class="node browser noah"
			class:active={activeClient === 'noah'}
			class:receiving={returning && step?.actor === 'noah'}
			aria-label="Noahs nettleser"
			data-testid="board-noah"
		>
			<div class="browser-chrome">
				<span aria-hidden="true">● ● ●</span><span>NETTLESER N</span><i aria-hidden="true"></i>
			</div>
			<div class="person-heading">
				<span class="avatar" aria-hidden="true">N</span>
				<div>
					<h3>Noah</h3>
					<p>Frontend</p>
				</div>
				<span class="node-light" aria-hidden="true"></span>
			</div>
			<div class="room-label">
				<span># {roomName(lab.noah.room)}</span><small>{lab.noah.messages.length} meld.</small>
			</div>
			<ul class="messages" aria-label="Meldinger Noah viser" use:followLatest={lab.noah.messages}>
				{#each lab.noah.messages as message (message.id)}
					<li class:target-message={isTarget(message)} data-message-id={message.id}>
						<div class="message-heading">
							<strong>{message.avsender}</strong><span>#{message.id}</span>
						</div>
						<p>{message.tekst}</p>
						{#if isTarget(message)}<small class="target-label"
								><i aria-hidden="true"></i> Oppdrag</small
							>{/if}
					</li>
				{:else}<li class="empty-message">Ingen meldinger i denne kopien.</li>{/each}
			</ul>
			<p class="node-status" class:current={step?.actor === 'noah'}>
				<i aria-hidden="true"></i>{clientStatus('noah')}
			</p>
		</article>
	</div>
	{#if inTransit && step}
		<p class="travel-caption">
			<span class:response={returning}>{packetLabel}</span>{returning
				? `Backend → ${actorName}s nettleser`
				: `${actorName}s nettleser → Backend`}{#if returning}<small
					>{step.method === 'POST' ? 'JSON-bekreftelse' : 'JSON med rommets meldinger'}</small
				>{/if}
		</p>
	{:else}
		<p class="travel-caption">
			<span class="resting"
				>{step?.phase === 'server'
					? 'BACKEND'
					: step?.phase === 'client'
						? 'FRONTEND'
						: 'STARTTILSTAND'}</span
			>{step?.phase === 'server'
				? 'Serveren behandler requesten.'
				: step?.phase === 'client'
					? `${actorName}s nettleser behandler svaret.`
					: 'Hver nettleser viser sin egen kopi.'}
		</p>
	{/if}
</section>

<style>
	.game-board {
		color: var(--color-text);
		font: inherit;
		container-type: inline-size;
		container-name: chat-board;
	}
	.game-board * {
		box-sizing: border-box;
	}
	.board-caption {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px 20px;
		margin-bottom: 11px;
		color: var(--color-text-muted);
		font-size: 9px;
		letter-spacing: 1.1px;
		font-weight: 700;
	}
	.board-caption > span,
	.target-legend {
		display: inline-flex;
		align-items: center;
		gap: 7px;
	}
	.board-caption i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--color-accent);
	}
	.board-caption .target-legend {
		color: var(--color-text-muted);
		letter-spacing: 0;
		font-weight: 500;
		font-size: 10px;
	}
	.target-legend i {
		width: 9px;
		height: 9px;
		background: #bed88c;
		box-shadow: 0 0 0 2px var(--color-success-soft);
	}
	.board-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 62px minmax(0, 1fr) 62px minmax(0, 1fr);
		grid-template-areas: 'ada ada-link server noah-link noah';
		align-items: stretch;
	}
	.ada {
		grid-area: ada;
	}
	.server {
		grid-area: server;
	}
	.noah {
		grid-area: noah;
	}
	.ada-bridge {
		grid-area: ada-link;
	}
	.noah-bridge {
		grid-area: noah-link;
	}
	.node {
		min-width: 0;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		background: var(--color-surface);
		overflow: hidden;
		box-shadow: 0 5px 14px var(--color-shadow);
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}
	.browser.active {
		border-color: var(--color-success-border);
		box-shadow:
			0 0 0 2px var(--color-success-soft),
			0 5px 14px var(--color-shadow);
	}
	.browser.receiving {
		border-color: var(--color-success-border);
	}
	.browser-chrome {
		min-height: 28px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 7px;
		padding: 7px 12px;
		background: var(--color-surface-soft);
		color: var(--color-text-subtle);
		font-size: 8px;
		letter-spacing: 1px;
		border-bottom: 1px solid var(--color-border);
	}
	.browser-chrome > span:first-child {
		color: var(--color-text-subtle);
		font-size: 6px;
		letter-spacing: 2px;
	}
	.browser-chrome > i {
		width: 7px;
		height: 6px;
		border: 1px solid var(--color-text-subtle);
		border-radius: 1px;
	}
	.person-heading,
	.server-heading {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 16px 14px 12px;
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 35px;
		height: 35px;
		border-radius: 10px;
		background: var(--color-success-soft);
		color: var(--color-success);
		font-size: 17px;
		font-weight: 700;
	}
	.noah .avatar {
		background: var(--color-accent-soft);
		color: var(--color-success);
	}
	h3 {
		margin: 0;
		color: inherit;
		font-size: 16px;
		line-height: 1.2;
		letter-spacing: -0.3px;
	}
	.person-heading p,
	.server-heading p {
		margin: 3px 0 0;
		font-size: 10px;
		color: var(--color-text-subtle);
		line-height: 1.4;
	}
	.node-light {
		margin-left: auto;
		width: 7px;
		height: 7px;
		flex: 0 0 7px;
		border-radius: 50%;
		background: var(--color-border);
	}
	.active .node-light {
		background: var(--color-success);
		box-shadow: 0 0 0 4px var(--color-success-soft);
	}
	.room-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 0 14px 11px;
		font-size: 10px;
		font-weight: 650;
		color: var(--color-text);
	}
	.room-label > small {
		color: var(--color-text-subtle);
		font-size: 9px;
		font-weight: 400;
		white-space: nowrap;
	}
	.messages {
		list-style: none;
		padding: 0 10px 10px;
		margin: 0;
		height: 188px;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--color-border-strong) transparent;
	}
	.messages > li {
		margin-top: 7px;
		padding: 9px 10px;
		background: var(--color-surface-soft);
		border: 1px solid var(--color-border);
		border-radius: 6px;
	}
	.messages > li:first-child {
		margin-top: 0;
	}
	.message-heading {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 8px;
		color: var(--color-text);
		font-size: 10px;
	}
	.message-heading > strong {
		font-weight: 650;
	}
	.message-heading > span {
		font: 8px monospace;
		color: var(--color-text-subtle);
	}
	.messages p {
		margin: 4px 0 0;
		font-size: 11px;
		line-height: 1.6;
		color: var(--color-text);
		overflow-wrap: anywhere;
	}
	.messages > li.target-message {
		background: var(--color-success-soft);
		border-color: var(--color-success-border);
		box-shadow: inset 3px 0 var(--color-success-border);
	}
	.target-message p,
	.target-message .message-heading {
		color: var(--color-success);
	}
	.target-label {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-top: 5px;
		color: var(--color-success);
		font-size: 8px;
		font-weight: 650;
		line-height: 1.3;
	}
	.target-label i {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--color-success);
	}
	.messages > li.empty-message {
		background: transparent;
		border-style: dashed;
		font-size: 10px;
		line-height: 1.6;
		color: var(--color-text-subtle);
		padding: 14px 10px;
	}
	.node-status {
		min-height: 42px;
		display: flex;
		align-items: center;
		gap: 6px;
		border-top: 1px solid var(--color-border);
		background: var(--color-surface-soft);
		padding: 9px 12px;
		margin: auto 0 0;
		color: var(--color-text-subtle);
		font-size: 9px;
		line-height: 1.45;
	}
	.node-status > i {
		width: 4px;
		height: 4px;
		flex: 0 0 4px;
		border-radius: 50%;
		background: var(--color-border-strong);
	}
	.node-status.current {
		color: var(--color-success);
	}
	.node-status.current > i {
		background: var(--color-success);
	}
	.server {
		border-color: #365e49;
		background: #1c3d32;
		color: #e6efdc;
	}
	.server.active {
		border-color: #b8ce85;
		box-shadow:
			0 0 0 2px #d2dfaf,
			0 5px 14px var(--color-shadow);
	}
	.server-chrome {
		min-height: 28px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 7px 12px;
		background: #15372d;
		border-bottom: 1px solid #365340;
		color: #94ae85;
		font-size: 8px;
		letter-spacing: 1px;
	}
	.server-chrome > span:last-child {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 7px;
		letter-spacing: 0.6px;
		color: #819c75;
	}
	.server-chrome i {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #698a5f;
	}
	.server-chrome .working {
		color: #d2dfac;
	}
	.server-chrome .working i {
		background: #d2dfac;
		box-shadow: 0 0 0 3px #355037;
	}
	.server-heading p {
		color: #93aa83;
	}
	.server-icon {
		display: flex;
		flex-direction: column;
		gap: 3px;
		width: 34px;
	}
	.server-icon > i {
		height: 8px;
		border: 1px solid #84a16a;
		border-radius: 2px;
		position: relative;
		background: #315238;
	}
	.server-icon > i::after {
		content: '';
		position: absolute;
		width: 3px;
		height: 3px;
		border-radius: 1px;
		background: #c8d59b;
		right: 4px;
		top: 1.5px;
	}
	.server .room-label {
		color: #b0c397;
	}
	.server .room-label > small {
		color: #8da67a;
	}
	.server-messages {
		scrollbar-color: #56734c transparent;
	}
	.server-messages > li {
		background: #29483a;
		border-color: #3b5943;
	}
	.server-messages .message-heading {
		color: #c4d5b2;
	}
	.server-messages .message-heading > span {
		color: #8fa57b;
	}
	.server-messages p {
		color: #aebf9e;
	}
	.server-messages > li.empty-message {
		color: #aebf9e;
	}
	.server-messages > li.target-message {
		background: #3b5637;
		border-color: #91ac67;
		box-shadow: inset 3px 0 #c5d989;
	}
	.server-messages .target-message p,
	.server-messages .target-message .message-heading {
		color: #e0eac9;
	}
	.server-message-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		margin-top: 5px;
	}
	.message-room {
		color: #91ac79;
		font-size: 8px;
	}
	.server-message-footer .target-label {
		margin-top: 0;
		color: #c8d997;
	}
	.server-message-footer .target-label i {
		background: #c8d997;
	}
	.server .node-status {
		background: #17372d;
		border-color: #365340;
		color: #9bb38a;
	}
	.server .node-status > i {
		background: #89a66d;
	}
	.bridge {
		min-width: 0;
		position: relative;
		align-self: stretch;
	}
	.connection {
		position: absolute;
		left: 0;
		right: 0;
		top: 51%;
		border-top: 1px dashed var(--color-border-strong);
	}
	.idle-direction {
		position: absolute;
		top: 51%;
		left: 50%;
		transform: translate(-50%, -50%);
		padding: 0 5px;
		background: var(--color-page);
		color: var(--color-text-subtle);
		font-size: 16px;
		line-height: 1;
	}
	.transit .idle-direction {
		opacity: 0;
	}
	.transit .connection {
		border-color: var(--color-success-border);
	}
	.packet {
		position: absolute;
		top: 51%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.packet-label {
		position: absolute;
		bottom: calc(100% + 5px);
		left: 50%;
		transform: translateX(-50%);
		white-space: nowrap;
		background: var(--color-page);
		padding: 2px 4px;
		color: var(--color-accent);
		border-radius: 3px;
		font: 8px/1.2 monospace;
	}
	.packet-body {
		display: grid;
		place-items: center;
		width: 27px;
		height: 23px;
		border-radius: 5px;
		border: 1px solid var(--color-success-border);
		background: var(--color-success-soft);
		color: var(--color-success);
		box-shadow: 0 3px 6px var(--color-shadow);
	}
	.packet-body b {
		font-size: 15px;
		font-weight: 500;
		line-height: 1;
	}
	.returning .packet-label {
		color: var(--color-warning);
	}
	.returning .packet-body {
		border-color: var(--color-warning-border);
		background: var(--color-warning-soft);
		color: var(--color-warning);
	}
	.packet .vertical-arrow {
		display: none;
	}
	.ada-bridge .request.moving,
	.noah-bridge .returning.moving {
		animation: travel-right var(--packet-duration) ease-in-out both;
	}
	.noah-bridge .request.moving,
	.ada-bridge .returning.moving {
		animation: travel-left var(--packet-duration) ease-in-out both;
	}
	.game-board.paused .packet.moving {
		animation-play-state: paused;
	}
	.travel-caption {
		min-height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 5px 8px;
		margin: 12px 0 0;
		color: var(--color-text-muted);
		font-size: 10px;
		line-height: 1.6;
		text-align: center;
	}
	.travel-caption > span {
		padding: 3px 6px;
		border: 1px solid var(--color-success-border);
		background: var(--color-success-soft);
		color: var(--color-success);
		border-radius: 4px;
		font: 8px/1.3 monospace;
	}
	.travel-caption > span.response {
		background: var(--color-warning-soft);
		color: var(--color-warning);
		border-color: var(--color-warning-border);
	}
	.travel-caption > small {
		color: var(--color-text-subtle);
		font-size: 9px;
	}
	.travel-caption > span.resting {
		background: transparent;
		border-color: var(--color-border);
		color: var(--color-text-subtle);
	}
	@keyframes travel-right {
		from {
			left: 8%;
			opacity: 0.5;
		}
		to {
			left: 92%;
			opacity: 1;
		}
	}
	@keyframes travel-left {
		from {
			left: 92%;
			opacity: 0.5;
		}
		to {
			left: 8%;
			opacity: 1;
		}
	}
	@keyframes travel-down {
		from {
			top: 12%;
			opacity: 0.5;
		}
		to {
			top: 88%;
			opacity: 1;
		}
	}
	@keyframes travel-up {
		from {
			top: 88%;
			opacity: 0.5;
		}
		to {
			top: 12%;
			opacity: 1;
		}
	}
	@container chat-board (max-width: 820px) {
		.board-grid {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			grid-template-areas: 'ada noah' 'ada-link noah-link' 'server server';
			column-gap: 18px;
		}
		.bridge {
			height: 64px;
		}
		.connection {
			top: 0;
			bottom: 0;
			left: 50%;
			right: auto;
			border-top: 0;
			border-left: 1px dashed var(--color-border-strong);
		}
		.idle-direction {
			top: 50%;
			transform: translate(-50%, -50%) rotate(90deg);
		}
		.packet {
			top: 50%;
			left: 50%;
		}
		.packet-label {
			bottom: auto;
			top: 50%;
			left: calc(100% + 6px);
			transform: translateY(-50%);
		}
		.packet .horizontal-arrow {
			display: none;
		}
		.packet .vertical-arrow {
			display: block;
		}
		.ada-bridge .request.moving,
		.noah-bridge .request.moving {
			animation-name: travel-down;
		}
		.ada-bridge .returning.moving,
		.noah-bridge .returning.moving {
			animation-name: travel-up;
		}
		.server .server-heading {
			padding-top: 12px;
		}
		.server-messages {
			height: 142px;
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px;
			align-content: start;
		}
		.server-messages > li {
			margin-top: 0;
		}
		.server .node-status {
			min-height: 34px;
		}
	}
	@container chat-board (max-width: 430px) {
		.board-caption {
			font-size: 8px;
			letter-spacing: 0.6px;
			gap: 7px;
		}
		.board-caption .target-legend {
			font-size: 9px;
		}
		.board-grid {
			column-gap: 12px;
		}
		.browser-chrome {
			padding: 7px 8px;
			font-size: 7px;
			letter-spacing: 0.5px;
			gap: 4px;
		}
		.browser-chrome > span:first-child {
			font-size: 5px;
			letter-spacing: 1px;
		}
		.browser-chrome > i {
			display: none;
		}
		.person-heading {
			padding: 12px 10px 10px;
			gap: 7px;
		}
		.avatar {
			width: 28px;
			height: 28px;
			border-radius: 8px;
			font-size: 14px;
		}
		h3 {
			font-size: 14px;
		}
		.person-heading p {
			font-size: 9px;
		}
		.node-light {
			width: 5px;
			height: 5px;
			flex-basis: 5px;
		}
		.room-label {
			padding: 0 10px 9px;
			font-size: 9px;
			gap: 4px;
		}
		.room-label > small {
			font-size: 8px;
		}
		.messages {
			padding-inline: 7px;
			height: 88px;
		}
		.messages > li {
			padding: 8px;
		}
		.messages p {
			font-size: 10px;
		}
		.message-heading {
			font-size: 9px;
		}
		.node-status {
			padding: 8px 9px;
			min-height: 36px;
			font-size: 8px;
		}
		.bridge {
			height: 60px;
		}
		.packet-label {
			font-size: 7px;
			left: calc(100% + 3px);
		}
		.server-messages {
			height: 88px;
		}
		.travel-caption {
			font-size: 9px;
		}
		.travel-caption > small {
			width: 100%;
			font-size: 8px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.node {
			transition: none;
		}
		.game-board .packet.moving {
			animation: none;
		}
	}
</style>
