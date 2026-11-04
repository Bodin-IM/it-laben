<script>
	import { onMount, untrack } from 'svelte';
	import { lab, randomId } from '#lib/lab.js';
	import { simulatorRoles, simulatorRole, simulatorGetCode, simulatorFetchCode } from '#lib/backendSimulator.js';
	import { simulatorRequest, simulatorExchange, simulatorAddress } from '#lib/backendSimulatorClient.js';
	import CodeTokens from '#lib/components/CodeTokens.svelte';
	import PartnerContext from '#lib/components/PartnerContext.svelte';

	/** @typedef {import('#lib/backendSimulator.js').SimulatorRoom} Room */
	/** @typedef {import('#lib/backendSimulator.js').SimulatorEvent} Exchange */
	/** @type {Room|null} */
	let room = $state(null);
	/** @type {{id:string,title:string,code:string,paused:boolean}[]} */
	let rooms = $state([]);
	let role = $state('utstyr');
	let code = $state('');
	let title = $state('LAN-kvelden');
	let busy = $state(false);
	let sending = $state(false);
	let loadingRooms = $state(false);
	let error = $state('');
	let notice = $state('');
	let connectionError = $state('');
	let view = $state('backend');
	let getPath = $state('/utstyr');
	let json = $state('{}');
	let postEnabled = $state(false);
	let postPath = $state('/reservasjoner');
	let draftRevision = $state(0);
	let target = $state('');
	let method = $state('GET');
	let path = $state('');
	let body = $state('{ "antall": 1 }');
	let field = $state('');
	/** @type {{status:number,data:Record<string,unknown>,eventId:string|null,signature:string,target:string,method:string,at:number}|null} */
	let result = $state(null);
	/** @type {{id:string,signature:string}|null} */
	let pending = $state(null);
	/** @type {Exchange|null} */
	let selectedEvent = $state(null);
	let epoch = 0;
	let roomVersion = 0;
	let polling = false;
	const me = $derived(room?.players.find((player) => player.id === room?.me));
	const myRole = $derived(simulatorRole(me?.role ?? role));
	const teacher = $derived($lab.user?.role === 'teacher' || $lab.user?.role === 'admin');
	const signature = $derived(JSON.stringify([room?.id, target, method, path, method === 'POST' ? body : '']));
	const stale = $derived(!!result && result.signature !== signature);
	const fields = $derived.by(() => {
		const data = result?.data;
		return data ? Object.keys(data).filter((key) => !['__proto__', 'constructor', 'prototype'].includes(key) && (data[key] === null || ['string', 'number', 'boolean'].includes(typeof data[key]))) : [];
	});
	const requestUrl = $derived(room && target ? `/api/simulator/rooms/${room.id}/servers/${target}${path}` : '');
	const currentEvent = $derived(selectedEvent ?? room?.events[0] ?? null);
	const mission = $derived(!me?.published
		? '1. Gi de andre noe å hente'
		: !me.fetched ? '2. Hent data fra en annen server'
		: !me.shown ? '3. Bruk svaret i din frontend'
		: 'Neste forsøk: endre data og undersøk hva som skjer');

	/** @param {unknown} cause */
	function explain(cause) {
		return cause instanceof Error && !['TimeoutError', 'AbortError', 'TypeError'].includes(cause.name)
			? cause.message : 'Mistet kontakten med backend. Kontroller tilkoblingen og prøv igjen.';
	}
	/** @param {string} id */
	function name(id) { return room?.players.find((player) => player.id === id)?.name ?? 'Ukjent server'; }
	/** @param {number} time */
	function clock(time) { return new Date(time).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
	/** @param {string} raw */
	function parseObject(raw) {
		let value;
		try { value = JSON.parse(raw); } catch { throw new Error('JSON kan ikke leses. Bruk doble anførselstegn rundt feltnavn og komma mellom feltene.'); }
		if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Bruk et JSON-objekt mellom { og }.');
		return value;
	}
	function loadDraft() {
		if (!me) return;
		getPath = me.getPath ?? simulatorRole(me.role)?.path ?? '/data';
		json = JSON.stringify(me.data, null, 2);
		postEnabled = !!me.postPath;
		postPath = me.postPath ?? '/reservasjoner';
		draftRevision = me.revision;
	}
	/** @param {Room} value */
	function enter(value) {
		epoch += 1;
		room = value;
		roomVersion += 1;
		result = null;
		pending = null;
		selectedEvent = null;
		target = ''; path = ''; field = ''; method = 'GET'; view = 'backend';
		connectionError = ''; notice = ''; error = '';
		loadDraft();
	}
	async function listRooms() {
		const version = epoch;
		loadingRooms = true;
		try {
			const value = await simulatorRequest('/rooms');
			if (epoch === version) rooms = value.rooms;
		} catch (cause) { if (epoch === version) error = explain(cause); }
		finally { if (epoch === version) loadingRooms = false; }
	}
	$effect(() => {
		const userId = $lab.user?.id;
		untrack(() => {
			epoch += 1;
			room = null; rooms = []; result = null; pending = null; selectedEvent = null;
			json = '{}'; code = ''; target = ''; path = ''; body = '{ "antall": 1 }'; field = '';
			busy = false; sending = false; loadingRooms = false;
			error = ''; notice = ''; connectionError = '';
			if (userId) void listRooms();
		});
	});
	onMount(() => {
		const timer = setInterval(() => {
			if (room && !busy && !sending && !document.hidden) void refresh();
		}, 2000);
		return () => { clearInterval(timer); epoch += 1; };
	});
	async function refresh() {
		if (!room || polling) return;
		const version = epoch, revision = roomVersion, id = room.id;
		polling = true;
		try {
			const value = await simulatorRequest(`/rooms/${id}`);
			if (epoch === version && roomVersion === revision) { room = value; connectionError = ''; }
		} catch (cause) { if (epoch === version) connectionError = explain(cause); }
		finally { polling = false; }
	}
	/** @param {string} endpoint @param {unknown} [data] */
	async function openRoom(endpoint, data) {
		if (busy) return;
		const version = epoch;
		busy = true; error = ''; notice = '';
		try {
			const value = await simulatorRequest(endpoint, data);
			if (epoch === version) { busy = false; loadingRooms = false; enter(value); }
		} catch (cause) { if (epoch === version) error = explain(cause); }
		finally { if (epoch === version) busy = false; }
	}
	function leave() {
		epoch += 1; room = null; result = null; pending = null; selectedEvent = null;
		busy = false; sending = false; error = ''; notice = ''; connectionError = '';
		void listRooms();
	}
	/** @param {string} action @param {unknown} data @param {string} message @param {boolean} [reloadDraft] */
	async function change(action, data, message, reloadDraft = false) {
		if (!room || busy) return;
		const version = epoch;
		busy = true; error = ''; notice = ''; roomVersion += 1;
		try {
			const value = await simulatorRequest(`/rooms/${room.id}/${action}`, data);
			if (epoch !== version) return;
			room = value; roomVersion += 1; notice = message;
			if (reloadDraft) loadDraft();
		} catch (cause) { if (epoch === version) error = explain(cause); }
		finally { if (epoch === version) busy = false; }
	}
	function publish() {
		try {
			void change('publish', { getPath, data: parseObject(json), postPath: postEnabled ? postPath : null, revision: draftRevision }, 'Endepunktene er publisert. De andre kan nå sende forespørsler til dem.', true);
		} catch (cause) { error = explain(cause); }
	}
	function togglePause() {
		if (!room) return;
		void change('pause', { paused: !room.paused }, room.paused ? 'Rommet er åpnet igjen.' : 'Rommet er satt på pause.');
	}
	/** @param {string} id @param {string} verb @param {string|null} endpoint */
	function choose(id, verb, endpoint) {
		target = id; method = verb; path = endpoint ?? ''; view = 'frontend'; notice = ''; error = '';
	}
	function chooseTarget() {
		const player = room?.players.find((item) => item.id === target);
		path = (method === 'GET' ? player?.getPath : player?.postPath) ?? '';
	}
	async function send() {
		if (!room || sending || !target) return;
		const version = epoch, sentSignature = signature, sentTarget = target, sentMethod = method;
		error = ''; notice = '';
		let url, data;
		try { url = simulatorAddress(room.id, target, path); data = method === 'POST' ? parseObject(body) : undefined; }
		catch (cause) { error = explain(cause); return; }
		const requestId = pending?.signature === sentSignature ? pending.id : randomId();
		pending = { id: requestId, signature: sentSignature };
		sending = true;
		try {
			const value = await simulatorExchange(url, sentMethod, data, requestId);
			if (epoch !== version) return;
			result = { ...value, signature: sentSignature, target: sentTarget, method: sentMethod, at: Date.now() };
			field = ''; pending = null; selectedEvent = null;
			notice = `Svar mottatt: HTTP ${value.status}. Se svaret under forespørselen.`;
			roomVersion += 1;
			await refresh();
		} catch (cause) {
			if (epoch === version) error = `${explain(cause)} Prøv samme forespørsel igjen for å hente kvitteringen uten å reservere dobbelt.`;
		} finally { if (epoch === version) sending = false; }
	}
	async function copyCode() {
		if (!room) return;
		const version = epoch;
		try { await navigator.clipboard.writeText(room.code); if (epoch === version) notice = 'Romkoden er kopiert.'; }
		catch { if (epoch === version) notice = `Romkode: ${room.code}. Marker og kopier de seks tegnene.`; }
	}
</script>

<svelte:head>
	<title>Backend sammen – IT-laben</title>
	<meta name="description" content="Samarbeid om en LAN-kveld. Publiser API-er, hent data fra medelever og følg ekte HTTP-forespørsler." />
</svelte:head>

<PartnerContext pageId="backend-simulator" values={{ role: me?.role ?? 'none', view, published: me?.published ?? false, status: result?.status ?? null, stale }} running={busy || sending} />

<main id="hovedinnhold" tabindex="-1">
	<a class="back" href="/moduler/backend/">← Backend</a>
	<header class="page-heading">
		<div><p class="eyebrow">SAMARBEIDSLAB <span>Første utkast</span></p><h1>Backend sammen<span class="accent">.</span></h1><p>Én LAN-kveld. Flere servere. Data som må finne veien mellom dere.</p></div>
		<div class="header-symbol" aria-hidden="true">{'{ }'} <span>↔</span> {'{ }'}</div>
	</header>

	{#if !$lab.ready}
		<p role="status">Henter pålogging …</p>
	{:else if !$lab.user}
		<section class="panel welcome"><h2>Ta plass i serverrommet</h2><p>Logg inn i Min lab. Læreren oppretter et rom, og dere blir med med en felles romkode.</p><a class="primary link-button" href="/min-lab/">Åpne Min lab</a><p class="muted">Du trenger en medelev for samarbeidsoppdragene. Hver deltaker får sin egen tjeneste.</p></section>
	{:else if !room}
		<div class="lobby">
			<section class="panel">
				<p class="eyebrow">01 / VELG ROLLE</p><h2>Hva bidrar du med?</h2>
				<p class="muted">Alle bygger både backend og frontend. Rollen bestemmer hvilke data du starter med.</p>
				<fieldset class="roles"><legend class="sr-only">Din rolle</legend>
					{#each simulatorRoles as item}
						<label class:chosen={role === item.id}><input type="radio" name="role" value={item.id} bind:group={role} disabled={busy} /><span class="role-symbol" aria-hidden="true">{item.symbol}</span><span><strong>{item.title}</strong><small>{item.path} · {Object.keys(item.data).join(', ')}</small></span></label>
					{/each}
				</fieldset>
			</section>
			<div class="lobby-actions">
				<section class="panel"><p class="eyebrow">02 / KOBLE TIL</p><h2>Bli med i et rom</h2><form onsubmit={(event) => { event.preventDefault(); void openRoom('/join', { code, role }); }}><label for="room-code">Romkode fra læreren</label><div class="input-row"><input id="room-code" class="room-code" bind:value={code} maxlength="6" autocomplete="off" placeholder="A1B2C3" required disabled={busy} /><button class="primary" disabled={busy || code.trim().length !== 6}>Bli med →</button></div></form><p class="muted small">Bruk oppdiktede data. Innholdet i forespørsler og svar deles med alle i rommet.</p></section>
				{#if teacher}<section class="panel"><h2>Opprett rom som lærer</h2><form onsubmit={(event) => { event.preventDefault(); void openRoom('/rooms', { title, role }); }}><label for="room-title">Navn på rommet</label><input id="room-title" bind:value={title} maxlength="50" required disabled={busy} /><button class="secondary" disabled={busy}>Opprett rom</button></form><p class="muted small">Inntil 24 deltakere, inkludert deg. Fordel rollene mellom elevene. Du kan demonstrere med din egen server.</p></section>{/if}
			</div>
		</div>
		{#if loadingRooms}<p role="status">Henter tidligere rom …</p>{:else if rooms.length}<section class="saved-rooms"><h2>Fortsett i et rom</h2><div>{#each rooms as item}<button class="secondary" disabled={busy} onclick={() => openRoom(`/rooms/${item.id}`)}>{item.title} <code>{item.code}</code>{item.paused ? ' · På pause' : ''}</button>{/each}</div></section>{/if}
	{:else}
		<section class="room-bar" aria-label="Spillrom">
			<div><strong>{room.title}</strong><span class="muted">{room.players.filter((p) => p.online).length} av {room.players.length} på nett</span></div>
			<div class="room-controls"><button class="code-button" onclick={copyCode} aria-label={`Kopier romkode ${room.code}`}>Romkode <strong>{room.code}</strong> ⧉</button>{#if room.owner}<button class="secondary" disabled={busy || sending} onclick={togglePause}>{room.paused ? 'Fortsett rom' : 'Sett på pause'}</button>{/if}<button class="quiet" disabled={busy || sending} onclick={leave}>Bytt rom</button></div>
		</section>
		{#if room.paused}<p class="banner">Rommet er satt på pause av læreren. Du kan lese oppsettet og tidligere svar.</p>{/if}
		{#if connectionError}<div class="banner" role="status">{connectionError} Brettet prøver igjen hvert andre sekund. <button class="quiet" onclick={refresh}>Hent nå</button></div>{/if}
		<section class="mission"><div><p class="eyebrow">DITT NESTE FORSØK</p><h2>{mission}</h2><p>{!me?.published ? 'Se startdataene i Min backend. Velg adresse og publiser et GET-endepunkt.' : !me.fetched ? myRole?.need : !me.shown ? 'Velg et felt fra et vellykket GET-svar og vis det i din frontend.' : 'Be en medelev endre et felt. Forutsi hva din frontend viser før og etter en ny GET-forespørsel.'}</p></div><ol class="milestones" aria-label="Gjennomførte handlinger"><li class:done={me?.published}>{me?.published ? '✓' : '1'} <span>Publisert</span><span class="sr-only">{me?.published ? 'Gjennomført' : 'Ikke gjennomført'}</span></li><li class:done={me?.fetched}>{me?.fetched ? '✓' : '2'} <span>Hentet fra andre</span><span class="sr-only">{me?.fetched ? 'Gjennomført' : 'Ikke gjennomført'}</span></li><li class:done={me?.shown}>{me?.shown ? '✓' : '3'} <span>Vist et felt</span><span class="sr-only">{me?.shown ? 'Gjennomført' : 'Ikke gjennomført'}</span></li></ol></section>

		<div class="workspace">
			<section class="board" aria-labelledby="board-title">
				<div class="section-heading"><div><p class="eyebrow">FELLES BRETT</p><h2 id="board-title">Serverrommet</h2></div><span class="sync-state">↻ Oppdateres hvert 2. sekund</span></div>
				<p class="muted small">Velg GET eller POST på et serverkort for å prøve endepunktet. Data kommer fram når du sender en forespørsel.</p>
				<div class="server-grid">
					{#each room.players as player (player.id)}
						<article class="server-card" class:mine={player.id === room.me} class:involved={currentEvent?.from === player.id || currentEvent?.to === player.id}>
							<div class="card-top"><span class="server-symbol" aria-hidden="true">{simulatorRole(player.role)?.symbol}</span><span class="presence" class:online={player.online}>{player.online ? 'På nett' : 'Frakoblet'}</span></div>
							<h3>{player.name} {#if player.id === room.me}<span class="you">Deg</span>{/if}</h3><p class="muted small">{simulatorRole(player.role)?.title}</p>
							<div class="endpoints">
								{#if player.getPath}<button disabled={sending} onclick={() => choose(player.id, 'GET', player.getPath)} aria-label={`Hent ${player.getPath} fra ${player.name}`}><span class="verb get">GET</span><code>{player.getPath}</code><span aria-hidden="true">↗</span></button>{:else}<p class="waiting">Venter på et endepunkt …</p>{/if}
								{#if player.postPath}<button disabled={sending} onclick={() => choose(player.id, 'POST', player.postPath)} aria-label={`Send til ${player.postPath} hos ${player.name}`}><span class="verb post">POST</span><code>{player.postPath}</code><span aria-hidden="true">↗</span></button>{/if}
							</div>
						</article>
					{/each}
				</div>
				{#if room.players.length < 2}<p class="empty">Del romkoden med en medelev. Dere trenger hverandres data for å løse oppdraget.</p>{/if}
				<section class="traffic" aria-labelledby="traffic-title"><div class="section-heading"><h2 id="traffic-title">Trafikk mellom serverne</h2><span class="muted small">Siste 30 forespørsler</span></div>
					{#if currentEvent}<div class="exchange"><p><strong>{name(currentEvent.from)}</strong> <span aria-hidden="true">→</span> <strong>{name(currentEvent.to)}</strong></p><p><span class="verb">{currentEvent.method}</span> <code>{currentEvent.path}</code> <span class="status" class:failed={currentEvent.status >= 400}>{currentEvent.status}</span></p><p class="muted small">Forespørsel til backend · svar tilbake til frontend · {clock(currentEvent.at)}</p><details><summary>Se forespørsel og svar</summary>{#if currentEvent.body}<p>JSON sendt</p><pre><code><CodeTokens source={JSON.stringify(currentEvent.body, null, 2)} /></code></pre>{/if}<p>JSON mottatt</p><pre><code><CodeTokens source={JSON.stringify(currentEvent.response, null, 2)} /></code></pre></details></div>{:else}<p class="empty">Ingen trafikk ennå. Publiser et endepunkt og send den første forespørselen.</p>{/if}
					{#if room.events.length}<details class="history"><summary>Åpne trafikkloggen</summary><ol>{#each room.events as item (item.id)}<li><button class:chosen={currentEvent?.id === item.id} onclick={() => selectedEvent = item}><time>{clock(item.at)}</time><span>{name(item.from)} → {name(item.to)}<code>{item.method} {item.path}</code></span><strong class:bad={item.status >= 400}>{item.status}</strong></button></li>{/each}</ol><button class="quiet" onclick={() => selectedEvent = null}>Følg nyeste forespørsel</button></details>{/if}
				</section>
			</section>

			<section class="workbench panel" aria-label="Ditt arbeidsområde">
				<div class="switcher" role="group" aria-label="Velg arbeidsområde"><button class:active={view === 'backend'} aria-pressed={view === 'backend'} onclick={() => view = 'backend'}>Min backend</button><button class:active={view === 'frontend'} aria-pressed={view === 'frontend'} onclick={() => view = 'frontend'}>Min frontend</button></div>
				{#if view === 'backend'}
					<p class="eyebrow">DIN TJENESTE</p><h2>{myRole?.title}</h2><p class="muted">Du eier disse dataene. De andre må kjenne adressen og sende riktig metode for å hente dem.</p>
					<form onsubmit={(event) => { event.preventDefault(); publish(); }}>
						<fieldset disabled={busy || sending || room.paused}><legend class="sr-only">Publiser backend</legend><label for="get-path">Adresse for GET</label><input id="get-path" bind:value={getPath} maxlength="80" spellcheck="false" required /><label for="server-json">Data som backend svarer med</label><textarea id="server-json" class="code-input" bind:value={json} rows="7" maxlength="3000" spellcheck="false" required></textarea>
						{#if me?.role === 'utstyr'}<label class="checkbox"><input type="checkbox" bind:checked={postEnabled} />Ta imot PC-reservasjoner med POST</label>{#if postEnabled}<label for="post-path">Adresse for POST</label><input id="post-path" bind:value={postPath} maxlength="80" spellcheck="false" required /><p class="muted small">Send <code>{'{ "antall": 1 }'}</code>. Serveren kontrollerer antallet, trekker fra <code>pcLedige</code> og svarer med 201. Et for stort antall gir 409.</p>{/if}{/if}
						<p class="code-caption">GET-ruten uttrykt som Express-kode</p><pre><code><CodeTokens source={simulatorGetCode(getPath, json)} /></code></pre><p class="muted small">Feltene styrer en ferdig backend-mal. Fri JavaScript-kode kjøres ikke i dette utkastet.</p>
						{#if me && me.revision !== draftRevision}<p class="banner">Serverdataene er endret, for eksempel av en reservasjon. Hent lagret oppsett før du publiserer igjen. Dine lokale endringer blir da erstattet.</p>{/if}
						<div class="button-row"><button class="primary" disabled={me?.revision !== draftRevision}>{busy ? 'Lagrer …' : 'Publiser endepunkter'}</button><button type="button" class="secondary" onclick={loadDraft}>Hent lagret oppsett</button></div></fieldset>
					</form>
				{:else}
					<p class="eyebrow">DIN KLIENT</p><h2>Send en forespørsel</h2><p class="muted">Velg en server på brettet. Forutsi hva du får tilbake, og prøv.</p>
					<form onsubmit={(event) => { event.preventDefault(); void send(); }}><fieldset disabled={sending || busy || room.paused}><legend class="sr-only">HTTP-forespørsel</legend><label for="target">Server</label><select id="target" bind:value={target} onchange={(event) => { target = event.currentTarget.value; chooseTarget(); }} required><option value="">Velg en server</option>{#each room.players as player}<option value={player.id}>{player.name} · {simulatorRole(player.role)?.title}{player.id === room.me ? ' (din server)' : ''}</option>{/each}</select><div class="request-fields"><div><label for="method">Metode</label><select id="method" bind:value={method} onchange={(event) => { method = event.currentTarget.value; chooseTarget(); }}><option>GET</option><option>POST</option></select></div><div><label for="endpoint-path">Adresse</label><input id="endpoint-path" bind:value={path} placeholder="/utstyr" maxlength="81" spellcheck="false" required /></div></div>{#if method === 'POST'}<label for="request-body">JSON som sendes til backend</label><textarea id="request-body" class="code-input" bind:value={body} rows="3" maxlength="3000" spellcheck="false" required></textarea>{/if}<button class="primary send" disabled={!target}>{sending ? 'Venter på svar …' : pending?.signature === signature ? 'Prøv samme forespørsel igjen →' : 'Send forespørsel →'}</button></fieldset></form>
					<details class="code-example"><summary>Se forespørselen som fetch-kode</summary><pre><code><CodeTokens source={simulatorFetchCode(requestUrl, method, body)} /></code></pre><p class="muted small">Spillet legger i tillegg ved pålogging, CSRF-beskyttelse og en forespørsels-ID. JSON-innholdet ditt sendes uendret.</p></details>
					{#if result}<section class="response" aria-label="Mottatt svar"><div class="section-heading"><h3>Svar fra {name(result.target)}</h3><strong class="status" class:failed={result.status >= 400}>HTTP {result.status}</strong></div><p class="muted small">{clock(result.at)} · {result.method} · {stale ? 'Gjelder en tidligere forespørsel. Send igjen for å teste endringene.' : 'Et øyeblikksbilde av dataene da du sendte.'}</p><pre><code><CodeTokens source={JSON.stringify(result.data, null, 2)} /></code></pre>
						{#if result.status === 200 && result.method === 'GET' && result.target !== room.me && !stale}<label for="display-field">Hvilket felt trenger din frontend?</label><select id="display-field" bind:value={field}><option value="">Velg et felt</option>{#each fields as key}<option value={key}>{key}</option>{/each}</select><button class="secondary" disabled={!field || busy || sending || room.paused} onclick={() => change('display', { eventId: result?.eventId, field }, 'Feltet er vist i din frontend. Hent data på nytt hvis backend endres.')}>Vis i min frontend</button>{:else if result.target === room.me && result.status === 200}<p class="muted small">Du har testet din egen server. Hent fra en medelev for å koble sammen tjenestene.</p>{/if}
					</section>{/if}
				{/if}
				{#if me?.display}<section class="frontend-output"><p class="eyebrow">DETTE VISER MIN FRONTEND</p><h3>{me.display.field}</h3><p class="display-value">{String(me.display.value)}</p><p class="muted small">Fra {name(me.display.source)} · hentet {clock(me.display.at)}. Send GET og velg feltet igjen for å oppdatere.</p></section>{/if}
				{#if me?.posted}<p class="success-note">✓ En POST-forespørsel til en annen server er gjennomført.</p>{/if}
			</section>
		</div>
	{/if}
	<div class="feedback" aria-live="polite" aria-atomic="true">{#if error}<p class="error-message">{error}</p>{:else if notice}<p class="notice">{notice}</p>{/if}</div>
	<details class="help"><summary>Hvordan henger det sammen?</summary><div class="help-grid"><section><h2>Fra klikk til data</h2><p>Frontend sender metode, adresse og eventuelt JSON. Backend finner endepunktet, leser eller endrer data og svarer med en HTTP-status og JSON. Frontend må deretter velge hva den vil vise.</p></section><section><h2>Ekte forespørsler, delte tjenester</h2><p>Hvert serverkort er en isolert tjeneste i IT-labens backend. Alle kall går over HTTP, og data lagres i databasen. Vi starter ikke en egen serverprosess for hver elev.</p></section><section><h2>Undersøk en feil</h2><p>Prøv feil adresse (404), feil metode (405), ugyldig antall (400) og flere PC-er enn det er igjen (409). Bruk svaret til å endre én ting og prøve igjen.</p></section><section><h2>Forklar for en medelev</h2><p>Hvorfor endres ikke frontend av seg selv når noen reserverer en PC? Vis hva en ny GET-forespørsel gjør. Markeringene viser gjennomførte handlinger, og gir ikke XP eller en vurdering av forståelsen din.</p></section></div></details>
</main>

<style>
	main { max-width: var(--layout-width); margin: 0 auto; padding: 1.5rem var(--layout-gutter) 4rem; color: var(--color-text); }
	.back { color: var(--color-text-muted); font-size: var(--font-small); text-decoration: none; }
	.back:hover { text-decoration: underline; }
	.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 2rem; margin: 2rem 0; }
	h1 { font-size: clamp(2rem, 4vw, 3.25rem); letter-spacing: -.045em; line-height: 1.1; margin: .55rem 0 .85rem; }
	h2 { font-size: 1.3rem; margin: 0 0 .7rem; line-height: 1.35; }
	h3 { font-size: 1.05rem; margin: 0; }
	p { line-height: 1.6; margin: .5rem 0 1rem; }
	.accent { color: var(--color-accent); }
	.eyebrow { font-size: .75rem; letter-spacing: .12em; font-weight: 750; color: var(--color-text-muted); margin: 0 0 .6rem; }
	.eyebrow span { display: inline-block; border: 1px solid var(--color-border-strong); border-radius: 30px; padding: .2rem .55rem; margin-left: .5rem; font-size: .68rem; letter-spacing: .03em; }
	.header-symbol { font-family: monospace; font-size: 2.2rem; white-space: nowrap; color: var(--color-accent); }
	.header-symbol span { color: var(--color-text-subtle); padding: 0 .25rem; }
	.muted { color: var(--color-text-muted); }
	.small, small { font-size: var(--font-small); }
	.panel { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-card); padding: 1.5rem; }
	.welcome { max-width: 45rem; }
	.lobby { display: grid; grid-template-columns: 1.1fr 1fr; gap: 1.25rem; }
	.lobby-actions { display: grid; align-content: start; gap: 1.25rem; }
	fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
	.roles { display: grid; gap: .7rem; margin-top: 1.3rem; }
	.roles label { display: flex; gap: .8rem; align-items: center; padding: 1rem; border: 1px solid var(--color-border); border-radius: 10px; cursor: pointer; }
	.roles label.chosen { border-color: var(--color-accent); background: var(--color-accent-soft); }
	.roles small { display: block; margin-top: .3rem; color: var(--color-text-muted); overflow-wrap: anywhere; }
	.role-symbol { font-size: 1.7rem; color: var(--color-accent); }
	label { display: block; font-weight: 650; font-size: var(--font-small); margin: .9rem 0 .4rem; }
	input, textarea, select { box-sizing: border-box; width: 100%; min-height: 44px; padding: .7rem .8rem; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border-strong); border-radius: 8px; font: inherit; }
	textarea { resize: vertical; }
	input[type='radio'], input[type='checkbox'] { width: 1.15rem; min-height: 1.15rem; height: 1.15rem; flex-shrink: 0; accent-color: var(--color-accent); }
	input.room-code { font-family: monospace; text-transform: uppercase; font-size: 1.2rem; letter-spacing: .18em; }
	button, .link-button { min-height: 44px; border-radius: 8px; padding: .65rem .9rem; font: inherit; font-size: var(--font-small); font-weight: 650; cursor: pointer; border: 1px solid transparent; text-decoration: none; }
	button:disabled { opacity: .55; cursor: not-allowed; }
	.primary { color: var(--color-on-action); background: var(--color-action); }
	.primary:hover:not(:disabled) { background: var(--color-action-hover); }
	.secondary { color: var(--color-text); background: var(--color-surface); border-color: var(--color-border-strong); }
	.secondary:hover:not(:disabled), .quiet:hover { background: var(--color-surface-hover); }
	.quiet { background: transparent; color: var(--color-text-muted); text-decoration: underline; }
	.link-button { display: inline-flex; align-items: center; }
	:where(button, a, input, textarea, select, summary):focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	.input-row, .button-row { display: flex; gap: .6rem; align-items: center; }
	.input-row input { min-width: 0; }
	.input-row button { white-space: nowrap; }
	.lobby form > button { margin-top: .8rem; }
	.saved-rooms { margin: 1.5rem 0; }
	.saved-rooms > div { display: flex; flex-wrap: wrap; gap: .6rem; }
	.saved-rooms code { margin-left: .5rem; }
	.room-bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: var(--color-surface); padding: .85rem 1.1rem; border: 1px solid var(--color-border); border-radius: 10px; }
	.room-bar > div:first-child { display: grid; gap: .2rem; font-size: var(--font-small); }
	.room-controls { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
	.code-button { background: var(--color-surface-soft); color: var(--color-text-muted); }
	.code-button strong { font-family: monospace; letter-spacing: .12em; color: var(--color-text); margin: 0 .5rem; }
	.mission { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; padding: 1.4rem 0 1.8rem; }
	.mission > div { max-width: 42rem; }
	.mission h2 { margin-bottom: .35rem; }
	.mission p:last-child { margin-bottom: 0; }
	.milestones { list-style: none; display: flex; gap: .5rem; padding: 0; margin: 0; flex-shrink: 0; }
	.milestones li { width: 5.6rem; padding: .65rem .35rem; border: 1px solid var(--color-border); border-radius: 8px; text-align: center; font-weight: 750; color: var(--color-text-muted); }
	.milestones span { display: block; margin-top: .2rem; font-size: .75rem; line-height: 1.3; font-weight: 550; }
	.milestones .done { color: var(--color-success); border-color: var(--color-success-border); background: var(--color-success-soft); }
	.workspace { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 1.5rem; align-items: start; }
	.board { min-width: 0; padding: .5rem 0; }
	.section-heading { display: flex; justify-content: space-between; align-items: center; gap: .6rem; }
	.section-heading h2 { margin-bottom: 0; }
	.sync-state { color: var(--color-text-muted); font-size: .8rem; text-align: right; }
	.server-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .85rem; margin-top: 1.2rem; }
	.server-card { border: 1px solid var(--color-border); background: var(--color-surface); border-radius: var(--radius-card); padding: 1rem; min-width: 0; transition: border-color .2s; }
	.server-card.mine { background: var(--color-accent-soft); }
	.server-card.involved { border-color: var(--color-accent); box-shadow: 0 0 0 1px var(--color-accent); }
	.server-card h3 { overflow-wrap: anywhere; }
	.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: .9rem; gap: .4rem; }
	.server-symbol { width: 2.2rem; height: 2.2rem; display: grid; place-items: center; background: var(--color-surface-soft); border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-accent); font-size: 1.3rem; }
	.presence { color: var(--color-text-muted); font-size: .75rem; }
	.presence::before { content: '○'; margin-right: .3rem; }
	.presence.online::before { content: '●'; color: var(--color-success); }
	.you { display: inline-block; font-size: .65rem; color: var(--color-accent); border: 1px solid var(--color-border-strong); padding: .15rem .3rem; border-radius: 4px; vertical-align: middle; }
	.endpoints { display: grid; gap: .4rem; }
	.endpoints button { display: flex; gap: .5rem; align-items: center; width: 100%; text-align: left; padding: .5rem; color: var(--color-text); background: var(--color-surface-soft); border: 1px solid var(--color-border); font-weight: 500; }
	.endpoints button:hover { border-color: var(--color-accent); }
	.endpoints code { overflow-wrap: anywhere; min-width: 0; }
	.endpoints button > span:last-child { margin-left: auto; }
	.verb { font-family: monospace; font-size: .75rem; font-weight: 750; padding: .2rem .35rem; border-radius: 4px; background: var(--color-surface-soft); color: var(--color-text); }
	.verb.get { background: var(--color-success-soft); color: var(--color-success); }
	.verb.post { background: var(--color-info-soft); color: var(--color-info); }
	.waiting { font-size: .85rem; color: var(--color-text-muted); padding: .5rem 0; margin: 0; }
	.empty { padding: 1.25rem; border: 1px dashed var(--color-border-strong); border-radius: 10px; color: var(--color-text-muted); }
	.traffic { margin-top: 2rem; }
	.exchange { margin: 1rem 0; padding: 1rem 1.2rem; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface); overflow-wrap: anywhere; }
	.exchange p { margin-bottom: .5rem; }
	.exchange > p:first-child { display: flex; flex-wrap: wrap; gap: .6rem; }
	.status { display: inline-block; color: var(--color-success); background: var(--color-success-soft); border-radius: 5px; padding: .2rem .4rem; font-size: .8rem; white-space: nowrap; }
	.status.failed { background: var(--color-danger-soft); color: var(--color-danger); }
	.history ol { list-style: none; padding: 0; margin: .5rem 0; max-height: 20rem; overflow: auto; }
	.history button:not(.quiet) { display: flex; align-items: center; gap: .7rem; width: 100%; border-bottom: 1px solid var(--color-border); border-radius: 0; color: var(--color-text); background: var(--color-surface); font-size: .8rem; text-align: left; }
	.history button.chosen { background: var(--color-accent-soft); }
	.history time { color: var(--color-text-muted); }
	.history code { display: block; margin-top: .2rem; overflow-wrap: anywhere; }
	.history strong { margin-left: auto; color: var(--color-success); }
	.history strong.bad { color: var(--color-danger); }
	.workbench { min-width: 0; }
	.switcher { display: flex; padding: .3rem; border-radius: 10px; background: var(--color-surface-soft); gap: .3rem; margin-bottom: 1.5rem; }
	.switcher button { flex: 1; background: transparent; color: var(--color-text-muted); }
	.switcher button.active { background: var(--color-surface); color: var(--color-text); border-color: var(--color-border-strong); }
	.code-input { font-family: monospace; line-height: 1.55; font-size: var(--font-code); }
	.checkbox { display: flex; gap: .6rem; align-items: center; line-height: 1.4; }
	.code-caption { color: var(--color-text-muted); font-size: .8rem; margin: 1.2rem 0 .4rem; }
	pre { padding: 1rem; background: var(--color-code-bg); color: var(--color-code-text); border: 1px solid var(--color-code-border); border-radius: 9px; overflow-x: auto; line-height: 1.6; font-size: var(--font-code); tab-size: 2; }
	code { font-family: monospace; }
	.button-row { flex-wrap: wrap; margin-top: 1rem; }
	.request-fields { display: grid; grid-template-columns: 6.5rem minmax(0, 1fr); gap: .7rem; }
	.send { width: 100%; margin-top: 1rem; }
	.code-example { margin-top: 1rem; }
	summary { cursor: pointer; font-size: var(--font-small); min-height: 44px; align-content: center; color: var(--color-text-muted); }
	.response { border-top: 1px solid var(--color-border); margin-top: 1rem; padding-top: 1rem; }
	.response > button { margin-top: .7rem; }
	.frontend-output { margin-top: 1.5rem; padding: 1.25rem; background: var(--color-accent-soft); border: 1px solid var(--color-border); border-radius: 10px; overflow-wrap: anywhere; }
	.display-value { font-size: 2.2rem; font-weight: 750; line-height: 1.2; margin: .75rem 0; }
	.frontend-output p:last-child { margin-bottom: 0; }
	.success-note { color: var(--color-success); font-size: var(--font-small); margin-bottom: 0; }
	.banner { padding: .8rem 1rem; border: 1px solid var(--color-warning-border); color: var(--color-warning); background: var(--color-warning-soft); border-radius: 8px; font-size: var(--font-small); }
	.feedback { position: sticky; bottom: .75rem; z-index: 2; margin-top: 1rem; }
	.feedback p { padding: 1rem 1.25rem; border-radius: 10px; box-shadow: 0 4px 20px #0001; }
	.error-message { color: var(--color-danger); background: var(--color-danger-soft); border: 1px solid var(--color-danger-border); }
	.notice { color: var(--color-success); background: var(--color-success-soft); border: 1px solid var(--color-success-border); }
	.help { border-top: 1px solid var(--color-border); margin-top: 2rem; padding-top: .5rem; }
	.help-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem 2rem; margin-top: 1rem; }
	.help-grid h2 { font-size: 1.05rem; }
	.help-grid p { color: var(--color-text-muted); font-size: var(--font-small); }
	.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
	@media (max-width: 1000px) { .workspace { grid-template-columns: minmax(0, 1fr); } .workbench { order: -1; } .mission { align-items: flex-start; } .milestones { flex-wrap: wrap; max-width: 12rem; } }
	@media (max-width: 640px) { .header-symbol { display: none; } .page-heading { margin: 1.5rem 0; } .lobby, .help-grid { grid-template-columns: 1fr; } .panel { padding: 1.1rem; } .room-bar, .mission { flex-direction: column; align-items: stretch; } .milestones { max-width: none; } .milestones li { flex: 1; width: auto; } .server-grid { grid-template-columns: 1fr; } .section-heading { align-items: flex-start; } .section-heading > .muted { text-align: right; } .room-controls { gap: .35rem; } .feedback { position: static; } }
	@media (prefers-reduced-motion: reduce) { .server-card { transition: none; } }
</style>
