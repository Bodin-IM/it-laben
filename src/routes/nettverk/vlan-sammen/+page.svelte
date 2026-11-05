<script>
	import { onMount, tick, untrack } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { lab, randomId } from '#lib/lab.js';
	import { devicePorts, portLink, togetherHints } from '#lib/vlanTogether.js';
	import { togetherRequest, TogetherApiError } from '#lib/vlanTogetherClient.js';
	import TogetherNetworkBoard from '#lib/components/TogetherNetworkBoard.svelte';
	import TogetherDocumentation from '#lib/components/TogetherDocumentation.svelte';
	import NetworkSwitchEditor from '#lib/components/NetworkSwitchEditor.svelte';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	/** @typedef {import('#lib/vlanTogether.js').TogetherRoom} Room */
	/** @typedef {import('#lib/vlanTogether.js').TogetherDevice} Device */
	let room = $state(/** @type {Room|null} */ (null));
	let rooms = $state(/** @type {import('#lib/vlanTogether.js').TogetherRoomListing[]} */ ([]));
	let selected = $state(''), title = $state('Felles nettverkslab'), roomsError = $state('');
	let draft = $state(/** @type {Device|null} */ (null));
	let cable = $state(/** @type {{source:string,port:string}|null} */ (null));
	let connecting = $state(false), documentMember = $state(''), documentationDirty = $state(false);
	let accepts = $state(/** @type {Record<string,string>} */ ({}));
	let from = $state(''), to = $state('');
	let result = $state(/** @type {(import('#lib/vlanTogether.js').TogetherPing & {revision:number,from:string,to:string})|null} */ (null));
	let retry = $state(/** @type {Record<string,any>|null} */ (null));
	let busy = $state(false), pinging = $state(false), loading = $state(false), error = $state(''), notice = $state(''), connectionError = $state('');
	let epoch = 0, readVersion = 0, polling = false;
	/** @type {HTMLElement|undefined} */ let editor = $state();
	/** @type {HTMLDivElement|undefined} */ let boardSection = $state();
	// Refreshing Min lab replaces the store object every 30 seconds and on focus.
	// Only a different account identity should clear the room and unsaved draft.
	const accountId = $derived($lab.user?.id ?? null);
	const teacher = $derived(['teacher', 'admin'].includes($lab.user?.role ?? ''));
	const device = $derived(room?.devices.find((d) => d.id === selected));
	const mine = $derived(!!device && device.owner === room?.me);
	const disabled = $derived(busy || !!retry || !!room?.paused);
	const dirty = $derived(mine && !!draft && !!device && JSON.stringify(draft) !== JSON.stringify(device));
	const conflict = $derived(mine && !!draft && !!device && draft.revision !== device.revision);
	const stale = $derived(!!result && (result.revision !== room?.revision || result.from !== from || result.to !== to || dirty || !!connectionError));
	const incoming = $derived(room?.requests.filter((r) => r.to === room?.me) ?? []);
	const outgoing = $derived(room?.requests.filter((r) => r.from === room?.me) ?? []);
	const myDevices = $derived(room?.devices.filter((d) => d.owner === room?.me) ?? []);
	const peers = $derived(room?.devices.filter((d) => d.kind === 'pc' && d.id !== from) ?? []);
	const switchDevice = $derived(device ? { id: device.id, name: device.name, kind: /** @type {'switch'} */ ('switch'), x: 0, y: 0, ports: devicePorts('switch').map((p) => ({ id: p, peer: peerLabel(device.id, p) })) } : null);
	const highlight = $derived(result && !stale ? result.steps.flatMap((s) => s.link ? [s.link] : []) : []);
	/** @param {unknown} cause */
	const explain = (cause) => cause instanceof Error ? cause.message : 'Kunne ikke fullføre. Prøv igjen.';
	/** @param {string} id */
	function label(id) {
		const d = room?.devices.find((d) => d.id === id);
		const member = room?.members.find((m) => m.id === d?.owner);
		return d ? `${d.name} · ${d.owner === room?.me ? 'deg' : member?.areaName || member?.name}` : 'Fjernet enhet';
	}
	/** @param {string} id @param {string} p */
	function peerLabel(id, p) {
		if (!room) return '';
		const l = portLink(room, id, p);
		return l ? `${label(l.a === id ? l.b : l.a)} ${l.a === id ? l.bPort : l.aPort}` : 'Ledig';
	}
	/** @param {string} id */
	function freePorts(id) {
		const d = room?.devices.find((d) => d.id === id);
		return d && room ? devicePorts(d.kind).filter((p) => !portLink(/** @type {Room} */ (room), id, p)) : [];
	}
	function loadDraft() {
		draft = device ? JSON.parse(JSON.stringify(device)) : null;
	}
	/** @param {string} id */
	async function inspect(id) {
		if (!room || busy || pinging) return;
		const target = room.devices.find((d) => d.id === id);
		if (!target) return;
		if (dirty && mine && !confirm('Bytte enhet og forkaste de ulagrede endringene?')) return;
		connecting = false; cable = null; selected = id; loadDraft();
		await tick(); editor?.scrollIntoView({ block: 'start' }); editor?.focus({ preventScroll: true });
	}
	/** @param {Room} next */
	function receive(next) {
		if (room && next.id === room.id && next.revision < room.revision) return;
		room = next;
		if (selected && !next.devices.some((d) => d.id === selected)) { selected = ''; draft = null; }
		if (cable && (!next.devices.some((d) => d.id === cable?.source) || portLink(next, cable.source, cable.port))) { cable = null; error = 'Startporten er endret eller tatt i bruk. Velg en ny port.'; }
		if (next.paused) { connecting = false; cable = null; }
		if (from && !next.devices.some((d) => d.id === from)) from = '';
		if (to && !next.devices.some((d) => d.id === to)) to = '';
	}
	/** @param {Room} next */
	function enter(next) {
		epoch++; readVersion++; room = next; result = null; cable = null; connecting = false; retry = null; accepts = {};
		documentMember = next.me; documentationDirty = false;
		selected = next.devices.find((d) => d.owner === next.me && d.kind === 'switch')?.id ?? '';
		from = next.devices.find((d) => d.owner === next.me && d.kind === 'pc')?.id ?? ''; to = '';
		loadDraft(); error = ''; notice = ''; connectionError = ''; busy = false; loading = false; roomsError = '';
	}
	async function listRooms() {
		if (loading) return;
		const version = epoch; loading = true;
		try { const value = await togetherRequest('/rooms'); if (version === epoch) { rooms = value.rooms; roomsError = ''; } }
		catch (cause) { if (version === epoch) roomsError = explain(cause); }
		finally { if (version === epoch) loading = false; }
	}
	$effect(() => {
		const user = accountId;
		untrack(() => {
			epoch++; readVersion++; room = null; rooms = []; draft = null; selected = ''; cable = null; connecting = false; retry = null; result = null; documentMember = ''; documentationDirty = false;
			from = ''; to = ''; accepts = {}; busy = false; pinging = false; loading = false; error = ''; notice = ''; connectionError = ''; roomsError = '';
			if (user) void listRooms();
		});
	});
	beforeNavigate(({ cancel, type, from, to }) => {
		if (!(dirty || documentationDirty) || (type !== 'leave' && to?.url.pathname === from?.url.pathname)) return;
		if (type === 'leave' || !confirm('Forlate laben og forkaste ulagrede endringer?')) cancel();
	});
	onMount(() => {
		const timer = setInterval(() => { if (room && !busy && !document.hidden) void refresh(); }, 2500);
		const lobbyTimer = setInterval(() => { if (accountId && !room && !busy && !document.hidden) void listRooms(); }, 5000);
		return () => { clearInterval(timer); clearInterval(lobbyTimer); epoch++; };
	});
	async function refresh() {
		if (!room || polling) return;
		const version = epoch, read = ++readVersion, id = room.id; polling = true;
		try { const value = await togetherRequest(`/rooms/${id}`); if (version === epoch && read === readVersion) { receive(value); connectionError = ''; } }
		catch (cause) { if (version === epoch && read === readVersion) connectionError = explain(cause); }
		finally { polling = false; }
	}
	/** @param {string} path @param {unknown} [body] */
	async function openRoom(path, body) {
		if (busy) return; const version = epoch; busy = true; error = '';
		try { const value = await togetherRequest(path, body); if (version === epoch) enter(value); }
		catch (cause) { if (version === epoch) error = explain(cause); }
		finally { if (version === epoch) busy = false; }
	}
	function leave() {
		if ((dirty || documentationDirty) && !confirm('Bytte rom og forkaste de ulagrede endringene?')) return;
		epoch++; readVersion++; room = null; draft = null; result = null; cable = null; connecting = false; documentationDirty = false; retry = null; busy = false; pinging = false; loading = false; error = ''; notice = ''; roomsError = ''; void listRooms();
	}
	/** @param {Record<string,any>} body @returns {Promise<boolean>} */
	async function command(body) {
		if (!room || busy || retry && body !== retry) return false;
		const version = epoch, id = room.id, previous = room.devices.map((d) => d.id);
		const payload = body.requestId ? body : { ...body, requestId: randomId() };
		busy = true; error = ''; notice = ''; readVersion++;
		try {
			const value = /** @type {Room} */ (await togetherRequest(`/rooms/${id}/commands`, payload));
			if (version !== epoch) return false;
			if (['connect', 'request'].includes(payload.action)) { cable = null; connecting = false; }
			receive(value); retry = null; readVersion++;
			if (payload.action === 'configure' && selected === payload.deviceId) loadDraft();
			if (payload.action === 'add' && !dirty) { selected = value.devices.find((d) => d.owner === value.me && !previous.includes(d.id))?.id ?? selected; loadDraft(); }
			notice = payload.action === 'request' ? 'Forespørsel sendt. Den andre eieren velger port og godtar.' : payload.action === 'document' ? 'Dokumentasjonen er lagret og delt med rommet.' : 'Lagret. Brettet er oppdatert.';
			return true;
		} catch (cause) {
			if (version !== epoch) return false;
			error = explain(cause);
			retry = cause instanceof TogetherApiError && cause.uncertain ? payload : null;
			if (!retry) void refresh();
			return false;
		} finally { if (version === epoch) busy = false; }
	}
	async function ping() {
		if (!room || disabled || pinging || dirty || !from || !to) return;
		const version = epoch, source = from, target = to; pinging = true; error = ''; result = null;
		try {
			const value = await togetherRequest(`/rooms/${room.id}/ping`, { from: source, to: target });
			if (version === epoch) { result = { ...value, from: source, to: target }; await refresh(); }
		} catch (cause) { if (version === epoch) error = explain(cause); }
		finally { if (version === epoch) pinging = false; }
	}
	function toggleCable() {
		if (disabled && !connecting) return;
		connecting = !connecting; cable = null; error = ''; notice = '';
	}
	/** @param {string} id @param {string} port */
	async function chooseCablePort(id, port) {
		if (!room || disabled || !connecting) return;
		const target = room.devices.find((d) => d.id === id && d.owner === room?.me);
		if (!target || !freePorts(id).includes(port)) { error = 'Porten er ikke lenger ledig. Velg en annen port.'; return; }
		if (!cable || cable.source === id) { cable = { source: id, port }; error = ''; notice = ''; return; }
		if (target.kind === 'pc') { error = 'Avslutt kabelen på en switch eller ruter.'; return; }
		await command({ action: 'connect', ...cable, target: id, targetPort: port });
	}
	/** @param {string} id */
	async function requestCable(id) {
		if (!connecting || !cable || disabled) return;
		await command({ action: 'request', ...cable, target: id });
	}
	/** @param {string} id */
	async function showDocument(id) {
		documentMember = id; connecting = false; cable = null;
		await tick();
		const heading = document.getElementById('documentation-title');
		heading?.scrollIntoView({ block: 'start' }); heading?.focus({ preventScroll: true });
	}

</script>

<svelte:head><title>Nettverksligaen – IT-laben</title><meta name="description" content="Bygg nettverk sammen. Avtal porter, konfigurer VLAN og rutere og følg ping mellom elevenes områder." /></svelte:head>
{#key room?.id ?? 'lobby'}<PartnerContext pageId="vlan-sammen" localTaskKey={room?.id ?? 'lobby'} values={{ deviceKind: device?.kind ?? 'none', action: connecting ? 'connect' : 'configure', hasRun: !!result, stale, revision: room?.revision ?? 0 }} running={busy || pinging} />{/key}

{#snippet feedback()}
	<div class="feedback" role="status" aria-atomic="true"><p class:error={!!error} class:notice={!error && !!notice}>{error || notice || (busy ? 'Lagrer …' : '')}</p>{#if retry}<p>Svar mangler. Handlingen kan være lagret. Prøv igjen; den får ikke dobbel virkning.</p><button disabled={busy} onclick={() => { if (retry) void command(retry); }}>Prøv handlingen igjen</button>{/if}</div>
{/snippet}

<main id="hovedinnhold" tabindex="-1">
	<a class="back" href="/?fag=drift#utforsk">← Driftsstøtte</a>
	<header><div><p class="eyebrow">SAMARBEIDSLAB · FØRSTE UTKAST</p><h1>Nettverksligaen<span>.</span></h1><p>Bygg ditt nett. Avtal forbindelsen. Få svar fra en medelev.</p></div><a href="/nettverk/vlan-2/">Repeter VLAN og ruting →</a></header>
	{#if !room}{@render feedback()}{/if}
	{#if !$lab.ready}<p role="status">Henter pålogging …</p>
	{:else if !$lab.user}<section class="panel"><h2>Ta plass på brettet</h2><p>Logg inn i Min lab. Læreren oppretter et rom. Velg det i romlisten for å bli med.</p><a class="action" href="/min-lab/">Åpne Min lab →</a></section>
	{:else if !room}
		<div class="lobby">
			<section class="panel" aria-labelledby="rooms-title">
				<div class="section-heading"><h2 id="rooms-title">Velg et rom</h2><button disabled={busy || loading} onclick={listRooms}>Oppdater romliste</button></div>
				<p class="muted">Velg rommet læreren har opprettet. Du får én PC og én switch, og kan fortsette i ditt område senere.</p>
				{#if roomsError}<p class="banner" role="status">{roomsError}</p>{/if}
				{#if loading && !rooms.length}<p role="status">Henter rom …</p>
				{:else if !rooms.length && !roomsError}<p>Ingen rom ennå. Læreren må opprette et rom først. Listen oppdateres automatisk.</p>{/if}
				<ul class="room-list">
					{#each rooms as item (item.id)}
						<li class="room-entry">
							<div><h3>{item.title}</h3><p>Lærer: {item.teacherName} · {item.participants}/24 deltakere</p><span class="muted">{item.paused ? 'På pause' : item.participants >= 24 ? 'Fullt' : 'Åpent'}{item.joined ? ' · Du har et område her' : ''}</span></div>
							<button class="primary" disabled={busy || (!item.joined && (item.paused || item.participants >= 24))} onclick={() => openRoom('/join', { roomId: item.id })}>{item.joined ? 'Fortsett' : item.paused ? 'På pause' : item.participants >= 24 ? 'Fullt' : 'Bli med'}</button>
						</li>
					{/each}
				</ul>
				<p class="muted">De andre i rommet ser enhetene, innstillingene og dokumentasjonen din. Bruk oppdiktede navn og labadresser.</p>
			</section>
			{#if teacher}<section class="panel"><h2>Opprett rom som lærer</h2><form onsubmit={(e) => { e.preventDefault(); void openRoom('/rooms', { title }); }}><label for="room-name">Navn på laben</label><input id="room-name" bind:value={title} maxlength="40" required disabled={busy} /><button class="primary" disabled={busy}>Opprett rom</button></form><p class="muted">Rommet vises i elevenes romliste. Inntil 24 deltakere, inkludert deg.</p></section>{/if}
		</div>
	{:else}
		<section class="room-bar" aria-label="Spillrom"><div><strong>{room.title}</strong><span class="muted">{room.members.length}/24 deltakere</span></div><div class="row wrap"><a href="#mitt-arbeid">Mine innstillinger ↓</a><span aria-live="polite">{#if incoming.length}<a href="#foresporsler">{incoming.length} tilkoblingsforespørsler ↑</a>{/if}</span>{#if room.owner}<button disabled={busy || !!retry} onclick={() => command({ action: 'pause', paused: !room?.paused })}>{room.paused ? 'Fortsett laben' : 'Sett på pause'}</button>{/if}<button disabled={busy} onclick={leave}>Bytt rom</button></div></section>
		{#if room.paused}<p class="banner" role="status">Laben er på pause. Du kan lese oppsettet og undersøke siste ping.</p>{/if}
		{#if connectionError}<p class="banner" role="status">{connectionError} <button onclick={refresh}>Hent brettet</button></p>{/if}
		{#if incoming.length || outgoing.length}<section class="requests panel" id="foresporsler" aria-labelledby="request-title"><h2 id="request-title">Tilkoblingsforespørsler</h2>
			{#each incoming as request (request.id)}<div class="request"><p><strong>{label(request.source)} · {request.port}</strong><br />ønsker kabel til din <strong>{label(request.target)}</strong>.</p><div class="row wrap"><label for={`accept-${request.id}`}>Din port</label><select id={`accept-${request.id}`} bind:value={accepts[request.id]} disabled={disabled}><option value="">Velg ledig port</option>{#each freePorts(request.target) as p}<option value={p}>{p}</option>{/each}</select><button class="primary" disabled={disabled || !accepts[request.id]} onclick={() => command({ action: 'respond', id: request.id, accept: true, targetPort: accepts[request.id] })}>Godta kabel</button><button disabled={disabled} onclick={() => command({ action: 'respond', id: request.id, accept: false })}>Avslå</button></div></div>{/each}
			{#each outgoing as request (request.id)}<div class="request"><p>Venter på <strong>{label(request.target)}</strong> fra {label(request.source)} · {request.port}.</p><button disabled={disabled} onclick={() => command({ action: 'respond', id: request.id, accept: false })}>Avbryt forespørsel</button></div>{/each}<p class="muted">Forespørsler utløper etter fem minutter. Ingen kabel kobles før eieren godtar.</p>
		</section>{/if}
		<div bind:this={boardSection} tabindex="-1">
			{@render feedback()}
			<TogetherNetworkBoard {room} {selected} {cable} {connecting} disabled={disabled || pinging} {highlight} onselect={inspect} ontoggle={toggleCable} onrestart={() => { cable = null; error = ''; }} onport={chooseCablePort} onrequest={requestCable} onfeedback={(message) => { error = message; notice = ''; }} ondocument={showDocument} />
		</div>
		<div class="add-devices"><span>Legg til i ditt område</span>{#each ['switch', 'router', 'pc'] as kind}<button disabled={disabled || myDevices.length >= 8} onclick={() => command({ action: 'add', kind })}>+ {kind === 'switch' ? 'Switch' : kind === 'router' ? 'Ruter' : 'PC'}</button>{/each}<small>{myDevices.length}/8 enheter</small></div>
		{#key room.id}<TogetherDocumentation {room} memberId={documentMember} {disabled} onsave={(document) => command({ action: 'document', ...document })} onselect={(id) => documentMember = id} ondirty={(value) => documentationDirty = value} />{/key}
		<div class="work-grid">
			<section class="panel editor" id="mitt-arbeid" bind:this={editor} tabindex="-1" aria-labelledby="editor-title">
				<div class="section-heading"><h2 id="editor-title">{device ? label(device.id) : 'Velg en enhet'}</h2><select aria-label="Velg enhet fra listen" value={selected} onchange={async (e) => { const select = e.currentTarget; await inspect(select.value); select.value = selected; }} disabled={busy}><option value="">Velg en enhet</option>{#each room.devices as d}<option value={d.id}>{label(d.id)}</option>{/each}</select></div>
				{#if device && draft}
					{#if !mine}<p class="muted">Du ser den andres lagrede oppsett. Bare eieren kan endre det.</p>{/if}
					<section class="ports"><h3>Porter og kabler</h3>
						{#if mine}<button disabled={disabled} onclick={() => { connecting = true; cable = null; boardSection?.scrollIntoView({ block: 'start' }); boardSection?.focus({ preventScroll: true }); }}>Koble kabel på brettet ↑</button>{/if}
						<details><summary>Vis alle porter og kabler</summary><ul>{#each devicePorts(device.kind) as p}{@const link = portLink(room, device.id, p)}<li><strong>{p}</strong><span>{peerLabel(device.id, p)}</span>{#if link && mine}<button disabled={disabled} onclick={() => command({ action: 'disconnect', id: link.id })}>Koble fra</button>{/if}</li>{/each}</ul></details>
					</section>
					{#if mine}<label for="device-name">Enhetsnavn</label><input id="device-name" bind:value={draft.name} maxlength="40" disabled={disabled} />{/if}
					{#if device.kind === 'switch' && switchDevice}
						{#key device.id}<NetworkSwitchEditor device={switchDevice} config={mine ? draft.config : device.config} networks={[]} disabled={!mine || disabled} readOnlyMessage={mine ? 'Oppsettet kan ikke endres akkurat nå.' : 'Annen eiers switch · kun visning'} taggedHelp="En ruterinterface med VLAN 0 bruker untagged. VLAN 1–4094 bruker tagged på ruterens valgte port." onchange={(config) => { if (draft) draft.config = config; }} />{/key}
					{:else if device.kind === 'pc'}
						<label for="pc-ip">IPv4-adresse · /24</label><input id="pc-ip" value={mine ? draft.config.ip : device.config.ip} oninput={(e) => { if (draft) draft.config.ip = e.currentTarget.value; }} placeholder="10.10.10.11" disabled={!mine || disabled} /><label for="pc-gateway">Default gateway</label><input id="pc-gateway" value={mine ? draft.config.gateway : device.config.gateway} oninput={(e) => { if (draft) draft.config.gateway = e.currentTarget.value; }} placeholder="Tom når du bare tester eget nett" disabled={!mine || disabled} /><p class="muted">Fast maske: 255.255.255.0. Gateway trengs til andre IP-nett.</p>
					{:else if device.kind === 'router'}
						{@const config = /** @type {import('#lib/vlanTogether.js').RouterConfig} */ (mine ? draft.config : device.config)}
						<h3>Ruterinterfacer</h3><p class="muted">Én adresse per /24-nett. Her betyr 0 uten tag, ikke et eget VLAN. VLAN 1–4094 bruker tag.</p>
						{#each config.interfaces as iface, i}<fieldset class="interface" disabled={!mine || disabled}><legend>Interface {i + 1}</legend><div class="fields"><label>Port<select bind:value={iface.port}>{#each devicePorts('router') as p}<option>{p}</option>{/each}</select></label><label>VLAN<input type="number" min="0" max="4094" bind:value={iface.vlan} /></label><label>IP-adresse /24<input bind:value={iface.ip} placeholder="10.10.10.1" /></label></div>{#if mine}<button onclick={() => { if (draft) draft.config.interfaces.splice(i, 1); }}>Fjern interface</button>{/if}</fieldset>{/each}
						{#if mine}<button disabled={disabled || config.interfaces.length >= 8} onclick={() => { if (draft) draft.config.interfaces.push({ port: 'eth0', vlan: 0, ip: '' }); }}>+ Ruterinterface</button>{/if}
						<details><summary>Statiske ruter til andre nett</summary><p class="muted">Direkte tilkoblede nett trenger ingen ekstra rute. For et annet nett: velg målnett og neste ruters adresse. Avtal også returveien.</p>
						{#each config.routes as route, i}<fieldset disabled={!mine || disabled}><legend>Rute {i + 1}</legend><label>Målnett /24<input bind:value={route.network} placeholder="10.20.0.0" /></label><label>Neste hopp<input bind:value={route.nextHop} placeholder="10.30.0.2" /></label>{#if mine}<button onclick={() => { if (draft) draft.config.routes.splice(i, 1); }}>Fjern rute</button>{/if}</fieldset>{/each}
						{#if mine}<button disabled={disabled || config.routes.length >= 8} onclick={() => { if (draft) draft.config.routes.push({ network: '', nextHop: '' }); }}>+ Statisk rute</button>{/if}</details>
					{/if}
					{#if mine}<div class="save-row">{#if conflict}<p class="banner">En nyere versjon er lagret fra en annen fane. Hent lagret oppsett. Ditt lokale utkast erstattes da.</p>{:else if dirty}<p class="muted">Ulagrede endringer. Ping bruker det lagrede oppsettet.</p>{/if}<div class="row wrap"><button class="primary" disabled={disabled || !dirty || conflict} onclick={() => { if (draft) void command({ action: 'configure', deviceId: draft.id, revision: draft.revision, name: draft.name, config: JSON.parse(JSON.stringify(draft.config)) }); }}>Lagre oppsett</button><button disabled={busy} onclick={() => { if (!dirty || confirm('Erstatte ditt lokale utkast med lagret oppsett?')) loadDraft(); }}>Hent lagret oppsett</button></div></div>{/if}

					{#if mine}<details><summary>Fjern enheten</summary><p class="muted">Koble fra kablene først. Innstillingene på denne enheten slettes.</p><button disabled={disabled || room.links.some((l) => l.a === device?.id || l.b === device?.id)} onclick={() => { if (device && confirm(`Fjerne ${device.name} og innstillingene?`)) void command({ action: 'remove', deviceId: device.id }); }}>Fjern {device.name}</button></details>{/if}
				{/if}
			</section>
			<aside class="panel ping-panel" aria-labelledby="ping-title"><p class="eyebrow">UNDERSØK FORBINDELSEN</p><h2 id="ping-title">Får du svar?</h2><p class="muted">Forutsi resultatet sammen. Ping er simulert og bruker det lagrede nettet.</p><form onsubmit={(e) => { e.preventDefault(); void ping(); }}><label for="ping-from">Fra din PC</label><select id="ping-from" bind:value={from} disabled={pinging}><option value="">Velg din PC</option>{#each myDevices.filter((d) => d.kind === 'pc') as pc}<option value={pc.id}>{pc.name} · {pc.config.ip || 'Ingen IP'}</option>{/each}</select><label for="ping-to">Til PC</label><select id="ping-to" bind:value={to} disabled={pinging}><option value="">Velg mottaker</option>{#each peers as pc}<option value={pc.id}>{label(pc.id)} · {pc.config.ip || 'Ingen IP'}</option>{/each}</select><button class="primary" disabled={disabled || pinging || !from || !to || dirty}>{pinging ? 'Undersøker …' : 'Send ping'}</button></form>
				{#if dirty}<p class="muted">Lagre eller hent oppsettet før du tester.</p>{/if}
				<div class="ping-result" aria-live="polite">{#if result}<h3>{stale ? 'Tidligere resultat' : result.ok ? '✓ Ping-svar' : '× Ikke svar'}</h3>{#if stale}<p class="banner">Oppsettet eller valget er endret. Kjør ping på nytt.</p>{/if}<p>{result.message}</p><details><summary>Følg pakken og svaret · {result.steps.length} hendelser</summary><ol>{#each result.steps as step}<li><small>{label(step.from)}{#if step.from !== step.to} → {label(step.to)}{/if}</small><br />{step.text}</li>{/each}</ol></details>{:else}<p class="muted">Resultatet kommer her. En kabel alene garanterer ikke at VLAN og adresser passer.</p>{/if}</div>
				<details class="help"><summary>Forslag til første forsøk</summary><ol><li>Koble din S1 til en medelevs S1. Bruk en ledig port i hver ende.</li><li>Send ping mellom start-PC-ene. Begge bruker VLAN 1 og 10.10.10.0/24.</li><li>Avtal VLAN 10. Sett PC-portene til U i VLAN 10 og forbindelsen mellom switchene til T i VLAN 10. Prøv igjen.</li></ol></details><details><summary>Hjelp til feilsøking</summary>{#each togetherHints.slice(1) as hint}<p>{hint}</p>{/each}</details>
			</aside>
		</div>
	{/if}
	<details class="about"><summary>Om denne laben og neste utfordring</summary><p>Dette er et felles, simulert nettverk. Kabler, VLAN, adresser, gateway og statiske /24-ruter styrer kommunikasjonen. Ingen pakker sendes til virkelige nettverksenheter.</p><p>Neste utfordring: lag to ulike IP-nett, legg til rutere og avtal et transportnett mellom dem. Få ping og returvei til å virke. Dokumenter én feil, rettingen og hvorfor den virket.</p><p>Ingen XP eller automatisk godkjenning av forståelse. Forklar portvalgene og pakkeveien for en medelev.</p><p class="muted">Første versjon har ikke DHCP, DNS, Wi-Fi, NAT, brannmur eller STP. Switch-løkker avvises. Bare medlemmer i rommet ser brettet; alle medlemmer kan undersøke konfigurasjonen.</p></details>
</main>

<style>
	main { max-width:var(--layout-width); margin:auto; padding:1.5rem var(--layout-gutter) 4rem; color:var(--color-text); }
	main :global(*) { box-sizing:border-box; } a { color:var(--color-accent); text-underline-offset:4px; }
	header { display:flex; justify-content:space-between; align-items:center; gap:1rem; margin:1.5rem 0; } h1 { font-size:clamp(2rem,4vw,3rem); letter-spacing:-.04em; margin:.3rem 0; } h1 span { color:var(--color-accent); }
	h2 { font-size:1.25rem; margin:0 0 .7rem; } h3 { font-size:1.1rem; } p { line-height:1.55; } .eyebrow { font-size:var(--font-meta); letter-spacing:.08em; color:var(--color-text-muted); }
	.muted, small { color:var(--color-text-muted); font-size:var(--font-small); } .back { font-size:var(--font-small); }
	.panel { padding:1.25rem; border:1px solid var(--color-border); background:var(--color-surface); border-radius:12px; min-width:0; }
	.lobby { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr)); gap:1rem; } .room-list { list-style:none; padding:0; margin:0; }
	.room-entry { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem 0; border-bottom:1px solid var(--color-border); } .room-entry h3 { margin:0; overflow-wrap:anywhere; } .room-entry p { margin:.3rem 0; font-size:var(--font-small); } .room-entry button { flex-shrink:0; }
	.row { display:flex; align-items:center; gap:.6rem; } .wrap { flex-wrap:wrap; } .row input { min-width:0; } .row select { width:auto; max-width:100%; }
	label { display:block; margin:.8rem 0 .3rem; font-size:var(--font-small); font-weight:650; }
	input, select, button, .action { font:inherit; min-height:44px; border:1px solid var(--color-border-strong); border-radius:7px; padding:.55rem .7rem; color:var(--color-text); background:var(--color-surface); }
	input, select { width:100%; } button, .action { cursor:pointer; } button:hover:not(:disabled) { background:var(--color-surface-hover); } button:disabled { opacity:.6; cursor:default; }
	.primary, .action { background:var(--color-action); color:var(--color-on-action); border-color:var(--color-action); font-weight:650; } .primary:hover:not(:disabled) { background:var(--color-action-hover); }
	form > button { margin-top:.85rem; } .action { display:inline-flex; align-items:center; text-decoration:none; }
	.room-bar { display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:1.2rem; padding:.8rem 1rem; background:var(--color-surface); border:1px solid var(--color-border); border-radius:10px; }
	.room-bar > div:first-child { display:grid; gap:.35rem; }
	.requests { margin-bottom:1rem; } .request { display:flex; justify-content:space-between; gap:1rem; align-items:center; padding:.6rem 0; border-bottom:1px solid var(--color-border); } .request p { margin:.2rem 0; }
	.add-devices { display:flex; align-items:center; flex-wrap:wrap; gap:.6rem; padding:1rem 0 1.5rem; } .add-devices > span { font-weight:650; margin-right:.4rem; }
	.work-grid { display:grid; grid-template-columns:minmax(0,1.8fr) minmax(18rem,1fr); gap:1.2rem; align-items:start; }
	.editor { scroll-margin-top:1rem; } .section-heading { display:flex; justify-content:space-between; align-items:center; gap:1rem; } .section-heading select { max-width:18rem; } .section-heading h2 { overflow-wrap:anywhere; }
	.fields { display:grid; grid-template-columns:1fr 1fr 2fr; gap:.65rem; } fieldset { border:1px solid var(--color-border); border-radius:8px; padding:.7rem; margin:.7rem 0; min-width:0; } fieldset button { margin-top:.6rem; }
	.save-row { border-top:1px solid var(--color-border); padding-top:.8rem; margin:1rem 0; } .ports { border-top:1px solid var(--color-border); margin-top:1rem; padding-top:.5rem; }
	.ports ul { list-style:none; padding:0; } .ports li { display:flex; gap:.65rem; align-items:center; border-bottom:1px solid var(--color-border); padding:.45rem 0; font-size:var(--font-small); } .ports li span { flex:1; min-width:0; overflow-wrap:anywhere; }
	.ping-panel form > button { width:100%; } .ping-result { border-top:1px solid var(--color-border); padding-top:.8rem; margin-top:1rem; min-height:7rem; }
	ol { padding-left:1.4rem; } li { line-height:1.5; } li + li { margin-top:.6rem; } summary { cursor:pointer; min-height:44px; padding:.65rem 0; font-weight:650; color:var(--color-accent); }
	details { margin-top:.7rem; } details p { font-size:var(--font-small); } .help { border-top:1px solid var(--color-border); }
	.banner { color:var(--color-warning); background:var(--color-warning-soft); border:1px solid var(--color-warning-border); padding:.8rem; border-radius:8px; }
	.feedback { min-height:2.8rem; margin-bottom:.4rem; font-size:var(--font-small); overflow-wrap:anywhere; } .feedback p { margin:.3rem 0; min-height:1.5em; } .error { color:var(--color-danger); } .notice { color:var(--color-success); }
	.about { border-top:1px solid var(--color-border); margin-top:1.5rem; max-width:70ch; }
	:where(button,a,input,select,summary,[tabindex]):focus-visible { outline:3px solid var(--color-focus); outline-offset:3px; }
	@media(max-width:950px) { .work-grid { grid-template-columns:minmax(0,1fr); } }
	@media(max-width:640px) { header,.room-bar,.room-entry,.request,.section-heading { flex-direction:column; align-items:stretch; } .fields { grid-template-columns:1fr; } .section-heading select { max-width:none; } .panel { padding:1rem; } }
</style>
