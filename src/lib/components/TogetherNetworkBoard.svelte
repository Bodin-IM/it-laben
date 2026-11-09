<script>
	import { tick, untrack, onDestroy } from 'svelte';
	import { reducedMotion } from '#lib/labPreferences.js';
	import { cablePath, cableGeometry, cableLanes, cableColors, pingFrame } from '#lib/vlanTogetherPlayback.js';
	import { AREA_HEIGHT, AREA_STEP, deviceSlots, movedSlots, slotPoint, slotAt } from '#lib/vlanTogetherLayout.js';
	import { devicePorts, portLink } from '#lib/vlanTogether.js';
	/** @typedef {import('#lib/vlanTogether.js').TogetherDevice} Device */
	/** @type {{room:import('#lib/vlanTogether.js').TogetherRoom,selected:string,cable:{source:string,port:string}|null,connecting:boolean,pingMode:boolean,pingSource:string,onpingtoggle:()=>void,onping:(id:string)=>void,disabled:boolean,highlight:string[],onselect:(id:string)=>void,ontoggle:()=>void,onrestart:()=>void,onport:(id:string,port:string)=>void,onrequest:(id:string)=>void,onfeedback:(message:string)=>void,ondocument:(id:string)=>void,onmove:(id:string,slot:number,revision:number)=>Promise<boolean>}} */
	let { room, selected, cable, connecting, pingMode, pingSource, onpingtoggle, onping, disabled, highlight, onselect, ontoggle, onrestart, onport, onrequest, onfeedback, ondocument, onmove } = $props();
	const componentId = $props.id();
	const menuId = componentId + '-ports';
	/** @type {HTMLDivElement|undefined} */ let viewport = $state();
	/** @type {HTMLDivElement|undefined} */ let portMenu = $state();
	/** @type {SVGSVGElement|undefined} */ let diagram = $state();
	/** @type {HTMLButtonElement|null} */ let dragHandle = null;
	let moveMode = $state(false), movingId = $state(''), moveStatus = $state(''), hovered = $state('');
	const moveHints = {
		idle: 'Trykk for å konfigurere. Dra egne enheter for å flytte dem.',
		select: 'Velg din enhet, og så en plass. Du kan også dra enheten direkte.',
		target: 'Velg en ledig plass eller en egen enhet å bytte med.',
		drop: 'Slipp her for å flytte. Enheter på samme plass bytter.',
		outside: 'Slipp i ditt eget område, eller trykk Escape for å avbryte.',
		saving: 'Lagrer plasseringen …', saved: 'Plasseringen er lagret og delt.',
		failed: 'Plasseringen ble ikke bekreftet. Se meldingen ved brettet.',
		cancelled: 'Flytting avbrutt. Enheten må bli i ditt område.',
		changed: 'Plasseringen er endret i en annen fane. Prøv igjen.'
	};
	let suppressClick = '', moveRequest = 0;
	/** @type {ReturnType<typeof setTimeout>|undefined} */ let clickTimer;
	/** @typedef {{id:string,pointerId:number,x:number,y:number,revision:number,moved:boolean,target:number|null}} Drag */
	let drag = $state(/** @type {Drag|null} */ (null));
	let pendingMove = $state(/** @type {{id:string,slot:number}|null} */ (null));
	/** @type {HTMLButtonElement|null} */ let menuAnchor = null;
	let pickerId = $state(''), menuX = $state(0), menuY = $state(0);
	let shownRoom = '';
	let showPackets = $state(true), visible = $state(true), clock = $state(0);
	let sampledServer = 0, sampledLocal = 0;
	const events = $derived((room.pings ?? []).filter((ping) => ping.revision === room.revision));
	const recent = $derived(events.filter((ping) => ping.expiresAt > clock));
	const ownPingActive = $derived(recent.some((ping) => ping.by === room.me && clock < ping.startsAt + ping.duration));
	const frames = $derived(showPackets ? recent.map((ping) => ({ ping, frame: pingFrame(ping, clock, points, room.links, $reducedMotion, lanes) })) : []);
	const activeLinks = $derived(frames.flatMap(({ ping, frame }) => frame && !frame.done ? ping.steps.flatMap((step) => step.link ? [step.link] : []) : []));
	$effect(() => {
		const now = room.serverNow;
		untrack(() => { sampledServer = Math.max(clock, now); sampledLocal = performance.now(); clock = sampledServer; });
	});
	$effect(() => {
		const pings = events, still = $reducedMotion;
		if (!showPackets || !visible || !pings.length) return;
		const until = Math.max(...pings.map((ping) => ping.expiresAt));
		let timer = 0, frame = 0, last = 0;
		/** @param {number} time */
		function update(time) {
			if (still || time - last >= 32) { clock = sampledServer + performance.now() - sampledLocal; last = time; }
			if (clock >= until) return;
			if (still) timer = window.setTimeout(() => update(performance.now()), 1000);
			else frame = requestAnimationFrame(update);
		}
		// Read the clock outside tracking; playback should not restart every frame.
		untrack(() => update(performance.now()));
		return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
	});
	/** @param {string} id */
	function ownerLabel(id) {
		const member = room.members.find((m) => m.id === id);
		return id === room.me ? 'Din ping' : member?.areaName || member?.name || 'Medelev';
	}
	/** @param {string} id */
	function deviceLabel(id) { return room.devices.find((d) => d.id === id)?.name ?? 'Fjernet enhet'; }
	const picker = $derived(room.devices.find((d) => d.id === pickerId));
	const peers = $derived(room.members.filter((m) => m.id !== room.me));
	const ownY = $derived(Math.ceil(peers.length / 2) * AREA_STEP + 12);
	const height = $derived(ownY + AREA_HEIGHT + 12);
	const me = $derived(room.members.find((m) => m.id === room.me));
	const areas = $derived([...peers.map((m, i) => ({ ...m, x: (i % 2) * 500 + 8, y: Math.floor(i / 2) * AREA_STEP + 12, width: 484, own: false })), ...(me ? [{ ...me, x: 8, y: ownY, width: 984, own: true }] : [])]);
	const ownArea = $derived(areas.find((area) => area.own));
	const savedSlots = $derived(deviceSlots(room.devices));
	const preview = $derived(drag?.moved && drag.target !== null ? { id: drag.id, slot: drag.target } : pendingMove);
	const slots = $derived(preview ? movedSlots(room.devices, preview.id, preview.slot) : savedSlots);
	const points = $derived(Object.fromEntries(areas.flatMap((area) => room.devices.filter((d) => d.owner === area.id).map((d) => [d.id, { ...slotPoint(area, slots[d.id]), portCount: devicePorts(d.kind).length }]))));
	const lanes = $derived(cableLanes(points, room.links));
	const colors = $derived(cableColors(room.links));
	const emphasis = $derived(hovered || drag?.id || movingId || selected);
	const drawnLinks = $derived(room.links.map((link) => ({ link, focused: link.a === emphasis || link.b === emphasis, active: highlight.includes(link.id) || activeLinks.includes(link.id) })).sort((a, b) => Number(a.focused || a.active) - Number(b.focused || b.active)));
	const sourceDevice = $derived(room.devices.find((d) => d.id === cable?.source));
	const instruction = $derived(pendingMove ? moveHints.saving : drag?.moved ? drag.target === null ? moveHints.outside : moveHints.drop : moveMode ? movingId ? moveHints.target : moveHints.select : pingMode ? pingSource ? `Fra ${deviceLabel(pingSource)}. Velg en annen PC som mottaker.` : 'Velg din PC som avsender. Deretter velger du mottaker-PC.' : !connecting ? moveStatus || moveHints.idle : cable ? `Fra ${sourceDevice?.name ?? 'enheten'} · ${cable.port}. Velg en switch eller ruter.` : 'Velg din enhet, og så en ledig port.');
	function suppressDeviceClick(id = '') {
		suppressClick = id; clearTimeout(clickTimer);
		clickTimer = setTimeout(() => { suppressClick = ''; }, 0);
	}
	function cancelDrag() {
		const current = drag; drag = null;
		if (current?.moved) suppressDeviceClick(current.id);
		if (current && dragHandle?.hasPointerCapture(current.pointerId)) dragHandle.releasePointerCapture(current.pointerId);
		dragHandle = null;
	}
	/** @param {Device} d @param {PointerEvent & {currentTarget:HTMLButtonElement}} event */
	function startDrag(d, event) {
		if (disabled || pendingMove || connecting || pingMode || d.owner !== room.me || !event.isPrimary || event.button !== 0 || drag) return;
		dragHandle = event.currentTarget;
		drag = { id: d.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, revision: room.layoutRevision ?? 0, moved: false, target: savedSlots[d.id] };
		dragHandle.setPointerCapture(event.pointerId); moveStatus = '';
	}
	/** @param {PointerEvent} event */
	function dragTo(event) {
		if (!drag || event.pointerId !== drag.pointerId || !diagram || !ownArea) return;
		if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
		const matrix = diagram.getScreenCTM(); if (!matrix) return;
		const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
		drag.moved = true; drag.target = slotAt(ownArea, point.x, point.y);
		event.preventDefault();
	}
	/** @param {PointerEvent} event */
	function drop(event) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		// Re-evaluate the release point even if no final pointermove was delivered.
		dragTo(event);
		const current = drag; cancelDrag();
		if (!current.moved) return;
		event.preventDefault();
		if (current.target === null) { moveStatus = moveHints.cancelled; return; }
		void place(current.id, current.target, current.revision);
	}
	/** @param {string} id @param {number} slot @param {number} [revision] */
	async function place(id, slot, revision = room.layoutRevision ?? 0) {
		if (disabled || pendingMove || !room.devices.some((d) => d.id === id && d.owner === room.me)) return;
		if (savedSlots[id] === slot) { movingId = ''; return; }
		const request = ++moveRequest, roomId = room.id;
		const restoreFocus = !!diagram?.contains(document.activeElement);
		pendingMove = { id, slot }; movingId = ''; moveStatus = '';
		try {
			const ok = await onmove(id, slot, revision);
			if (request !== moveRequest || room.id !== roomId) return;
			moveStatus = ok ? moveHints.saved : moveHints.failed;
		} finally {
			if (request === moveRequest && room.id === roomId) {
				pendingMove = null;
				await tick();
				if (request === moveRequest && room.id === roomId && restoreFocus && (diagram?.contains(document.activeElement) || document.activeElement === document.body)) document.getElementById(`${componentId}-${id}`)?.focus({ preventScroll: true });
			}
		}
	}
	function toggleMove() {
		if (disabled || pendingMove) return;
		if (connecting) ontoggle();
		if (pingMode) onpingtoggle();
		closePicker(); cancelDrag(); moveMode = !moveMode; movingId = ''; moveStatus = '';
	}
	$effect(() => {
		const blocked = disabled || connecting || pingMode, version = room.layoutRevision ?? 0;
		if (blocked) { moveMode = false; movingId = ''; cancelDrag(); }
		else if (drag && drag.revision !== version) { cancelDrag(); moveStatus = moveHints.changed; }
	});
	onDestroy(() => { cancelDrag(); clearTimeout(clickTimer); moveRequest++; });
	function myArea(initial = false) { if (viewport) { viewport.scrollTo({ top: viewport.scrollHeight, behavior: initial || $reducedMotion ? 'instant' : 'smooth' }); if (!initial) viewport.focus({ preventScroll: true }); } }
	function closePicker(restoreFocus = false) {
		if (portMenu?.matches(':popover-open')) portMenu.hidePopover();
		pickerId = '';
		if (restoreFocus) menuAnchor?.focus({ preventScroll: true });
	}
	/** @param {Device} d @param {string} port */
	function portStatus(d, port) {
		if (portLink(room, d.id, port)) return 'I bruk';
		if (room.requests.some((r) => r.source === d.id && r.port === port)) return 'Venter på svar';
		return 'Ledig';
	}
	/** @param {Device} d @param {MouseEvent & {currentTarget:HTMLButtonElement}} event */
	async function choose(d, event) {
		if (suppressClick === d.id || pendingMove) return;
		if (moveMode) {
			if (disabled) return;
			if (d.owner !== room.me) { onfeedback('Du kan bare flytte enheter i ditt eget område.'); return; }
			if (movingId) void place(movingId, savedSlots[d.id]);
			else movingId = d.id;
			return;
		}
		if (pingMode) { if (!disabled) onping(d.id); return; }
		if (!connecting) { onselect(d.id); return; }
		if (disabled) return;
		closePicker();
		if (!cable && d.owner !== room.me) { onfeedback('Start kabelen fra en av dine egne enheter.'); return; }
		if (cable && d.kind === 'pc') { onfeedback('Velg en switch eller ruter som mål. For å koble en PC starter du kabelen fra PC-en.'); return; }
		if (cable && d.owner !== room.me) {
			if (sourceDevice?.kind === 'pc') { onfeedback('Koble PC-en til din egen switch eller ruter først. Bruk switch eller ruter mellom områdene.'); return; }
			onrequest(d.id); return;
		}
		menuAnchor = event.currentTarget;
		const rect = menuAnchor.getBoundingClientRect();
		const x = event.detail ? event.clientX : rect.left;
		const y = event.detail ? event.clientY : rect.bottom;
		pickerId = d.id;
		await tick();
		if (!connecting || disabled || pickerId !== d.id || !portMenu) return;
		portMenu.showPopover();
		const size = portMenu.getBoundingClientRect();
		menuX = Math.max(8, Math.min(x, window.innerWidth - size.width - 8));
		menuY = Math.max(8, Math.min(y + 8, window.innerHeight - size.height - 8));
		await tick();
		const first = /** @type {HTMLButtonElement|null} */ (portMenu.querySelector('button:not(:disabled)'));
		first?.focus({ preventScroll: true });
	}
	/** @param {string} port */
	function choosePort(port) {
		if (!picker || disabled || portStatus(picker, port) !== 'Ledig') return;
		const id = picker.id; closePicker(true); onport(id, port);
	}
	$effect(() => {
		if (!connecting || disabled || !picker) closePicker();
	});
	$effect(() => {
		const id = room.id;
		if (id === shownRoom) return;
		shownRoom = id;
		untrack(() => { cancelDrag(); moveRequest++; pendingMove = null; moveMode = false; movingId = ''; moveStatus = ''; hovered = ''; });
		void tick().then(() => { if (id === room.id) myArea(true); });
	});
	const symbols = { pc: '▣', switch: '▤', router: '⇄' };
</script>

<svelte:document onvisibilitychange={() => { visible = !document.hidden; if (!visible) cancelDrag(); }} />
<svelte:window onresize={() => { closePicker(); cancelDrag(); }} onscroll={() => { closePicker(); cancelDrag(); }} onblur={() => cancelDrag()} onkeydown={(event) => {
	if (event.key !== 'Escape') return;
	// Let native panels (for example room settings) handle Escape before board tools.
	const openPopover = document.querySelector('[popover]:popover-open');
	if (openPopover && openPopover !== portMenu) return;
	if (drag || moveMode) { event.preventDefault(); cancelDrag(); moveMode = false; movingId = ''; moveStatus = 'Flytting avbrutt.'; return; }
	if (pingMode) { event.preventDefault(); onpingtoggle(); return; }
	if (!connecting) return;
	event.preventDefault();
	if (pickerId) closePicker(true); else ontoggle();
}} />
<div class="board-heading">
	<h2 id="board-title" tabindex="-1" class="board-title">Felles nettverksbrett</h2>
	<div class="board-actions"><button class:enabled={connecting} aria-pressed={connecting} disabled={disabled && !connecting} onclick={ontoggle}>{connecting ? 'Avslutt kabelmodus' : 'Koble kabel'}</button><button class:enabled={pingMode} aria-pressed={pingMode} disabled={disabled || ownPingActive && !pingMode} onclick={onpingtoggle}>{pingMode ? 'Avslutt pingmodus' : ownPingActive ? 'Ping pågår …' : 'Ping'}</button><button class:enabled={moveMode} aria-pressed={moveMode} disabled={disabled || !!pendingMove} onclick={toggleMove}>{moveMode ? 'Avslutt flytting' : 'Flytt'}</button><button onclick={() => myArea()}>Til mitt område ↓</button></div>
</div>
<div class="instruction-space">
	<!-- Shared grid cell reserves wrapping space before dragging, including on narrow screens. -->
	{#each Object.values(moveHints) as hint}<p class="instruction-reserve" aria-hidden="true">{hint}</p>{/each}
	<p id={`${componentId}-instruction`} class="cable-instruction" class:enabled={connecting || pingMode || moveMode || !!drag?.moved} role="status">{instruction}{#if connecting && cable} <button class="restart" disabled={disabled} onclick={onrestart}>Velg ny start</button>{/if}</p>
</div>
<!-- svelte-ignore a11y_no_noninteractive_tabindex (The network diagram scrolls in two dimensions.) -->
<div class="viewport" bind:this={viewport} tabindex="0" role="region" aria-label="Nettverksbrett, rull opp for å se andre områder" onscroll={() => { closePicker(); cancelDrag(); }}>
	<svg bind:this={diagram} viewBox={`0 0 1000 ${height}`} style:height={`${height}px`} aria-label="Nettverksområder og kabler">
		<defs><pattern id="vlan-board-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" /></pattern></defs>
		<rect width="1000" {height} fill="url(#vlan-board-dots)" class="dots" />
		{#each areas as area (area.id)}
			<rect x={area.x} y={area.y} width={area.width} height={AREA_HEIGHT} rx="14" class:own={area.own} class="area" />
			<foreignObject x={area.x + 32} y={area.y + 8} width={area.width - 64} height="66">
				<div class="area-heading"><div><strong title={area.areaName || area.name}>{area.areaName || (area.own ? 'Ditt nettverk' : area.name)}</strong><small>{area.own ? 'Ditt område' : area.name} · {area.online ? 'Aktiv nå' : 'Ikke aktiv nå'}</small></div><button onclick={() => ondocument(area.id)} aria-label={`Dokumentasjon for ${area.areaName || area.name}`}>Dokumentasjon</button></div>
			</foreignObject>
		{/each}
		{#if ownArea && (moveMode || drag?.moved)}
			{#each Array.from({ length: 8 }, (_, i) => i) as slot}
				{@const point = slotPoint(ownArea, slot)}
				<rect x={point.x - 4} y={point.y - 4} width={point.width + 8} height="66" rx="10" class="drop-slot" class:drop-target={drag?.moved && drag.target === slot} />
				{#if moveMode && movingId && !room.devices.some((d) => d.owner === room.me && savedSlots[d.id] === slot)}
					<foreignObject x={point.x} y={point.y} width={point.width} height="58"><button class="empty-slot" disabled={disabled || !!pendingMove} onclick={() => { if (movingId) void place(movingId, slot); }} aria-label={`Flytt ${deviceLabel(movingId)} til plass ${slot + 1}`}>Plass {slot + 1}</button></foreignObject>
				{/if}
			{/each}
		{/if}
		{#each drawnLinks as { link, focused, active } (link.id)}
			{@const a = points[link.a]}{@const b = points[link.b]}
			{#if a && b}
				{@const path = cablePath(a, b, link, lanes[link.id])}{@const route = cableGeometry(a, b, link, lanes[link.id])}
				<g class="cable-group" class:focused class:active style:color={`var(--color-${colors[link.id]})`}>
					<title>{deviceLabel(link.a)} {link.aPort} ↔ {deviceLabel(link.b)} {link.bPort}</title>
					<path d={path} class="cable-outline" /><path d={path} class="cable" />
					<circle cx={route[0].x} cy={route[0].y} r="3" class="cable-port" /><circle cx={route[route.length - 1].x} cy={route[route.length - 1].y} r="3" class="cable-port" />
				</g>
			{/if}
		{/each}
		{#each room.devices as device (device.id)}
			{@const point = points[device.id]}
			{#if point}<foreignObject x={point.x} y={point.y} width={point.width} height="65">
				<button id={`${componentId}-${device.id}`} class="device" class:selected={selected === device.id} class:source={cable?.source === device.id || pingMode && pingSource === device.id || movingId === device.id} class:cable-mode={connecting || pingMode} class:draggable={device.owner === room.me && !disabled && !connecting && !pingMode && !pendingMove} class:dragging={drag?.moved && drag.id === device.id} class:placing={pendingMove?.id === device.id}
					onclick={(event) => choose(device, event)} aria-pressed={moveMode ? movingId === device.id : pingMode ? pingSource === device.id : selected === device.id}
					onpointerdown={(event) => startDrag(device, event)} onpointermove={dragTo} onpointerup={drop} onpointercancel={cancelDrag} onlostpointercapture={cancelDrag}
					onpointerenter={() => hovered = device.id} onpointerleave={() => hovered = ''} onfocus={() => hovered = device.id} onblur={() => { if (hovered === device.id) hovered = ''; }}
					aria-describedby={`${componentId}-instruction`}
					aria-haspopup={connecting && device.owner === room.me ? 'dialog' : undefined}
					aria-expanded={connecting && device.owner === room.me ? pickerId === device.id : undefined}
					aria-controls={pickerId === device.id ? menuId : undefined}
					aria-label={`${device.name}, ${device.kind === 'pc' ? 'PC' : device.kind === 'switch' ? 'switch' : 'ruter'}, ${device.owner === room.me ? 'ditt område' : room.members.find((m) => m.id === device.owner)?.name}, plass ${slots[device.id] + 1}`}>
					<span aria-hidden="true" class="symbol">{symbols[device.kind]}</span><span class="device-label">{device.name}<small>{device.kind === 'pc' ? device.config.ip || 'Ingen IP' : device.kind === 'switch' ? `${device.config.vlans.length} VLAN` : `${device.config.interfaces.length} interfacer`}</small></span>
				</button>
			</foreignObject>{/if}
		{/each}
		<g class="packets" aria-hidden="true">
			{#each frames as { ping, frame } (ping.id)}
				{#if frame}<g transform={`translate(${frame.x},${frame.y})`} class:reply={frame.phase === 'reply'} class:failed={frame.failed} class="packet">
					<title>{ownerLabel(ping.by)} · {frame.label}: {frame.text}</title>
					<rect x="-12" y="-9" width="24" height="18" rx="3" /><path d="M -10 -7 L 0 1 L 10 -7" />
					<rect class="packet-label" x="-62" y="-37" width="124" height="23" rx="5" />
					<text x="0" y="-21" text-anchor="middle">{frame.label} · {ownerLabel(ping.by).slice(0, 12)}</text>
				</g>{/if}
			{/each}
		</g>
	</svg>
</div>
<div class="port-menu" id={menuId} bind:this={portMenu} popover="auto" role="dialog" aria-label="Velg kabelport" style:left={`${menuX}px`} style:top={`${menuY}px`} ontoggle={() => { if (!portMenu?.matches(':popover-open')) pickerId = ''; }}>
	{#if picker}<strong>{picker.name} · {cable && cable.source !== picker.id ? 'Koble til port' : 'Start fra port'}</strong><div class="port-grid">{#each devicePorts(picker.kind) as p}{@const status = portStatus(picker, p)}<button disabled={disabled || status !== 'Ledig'} onclick={() => choosePort(p)}>{p}<small>{status}</small></button>{/each}</div>{/if}
	<button class="dismiss" onclick={() => closePicker(true)}>Avbryt portvalg</button>
</div>
<div class="legend"><p>Farger skiller kablene · Stiplet strek viser pingvei{$reducedMotion ? ' · Pakker vises uten bevegelse' : ''}</p><button aria-pressed={showPackets} onclick={() => showPackets = !showPackets}>{showPackets ? 'Skjul pakker' : 'Vis pakker'}</button></div>
{#if recent.length}<details class="shared-pings"><summary>Siste ping i rommet · {recent.length}</summary><ul>{#each recent as ping (ping.id)}<li><strong>{ownerLabel(ping.by)}</strong> · {deviceLabel(ping.from)} → {deviceLabel(ping.to)}<br />{ping.ok ? '✓' : '×'} {ping.message}</li>{/each}</ul></details>{/if}

<style>
	.board-heading, .board-actions, .legend { display:flex; justify-content:space-between; align-items:center; gap:.65rem; flex-wrap:wrap; }
	.board-heading { position:relative; margin-bottom:.25rem; } .board-title { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; } .board-title:focus-visible { position:static; width:auto; height:auto; margin:0; clip-path:none; white-space:normal; font-size:1.1rem; }
	p { margin:.4rem 0 0; color:var(--color-text-muted); font-size:var(--font-small); }
	button { background:var(--color-surface); color:var(--color-text); border:1px solid var(--color-border-strong); border-radius:8px; padding:.6rem .8rem; font:inherit; cursor:pointer; min-height:44px; }
	button:disabled { opacity:.55; cursor:default; } button.enabled { background:var(--color-action); color:var(--color-on-action); border-color:var(--color-action); }
	.instruction-space { display:grid; margin-bottom:.25rem; }
	.cable-instruction, .instruction-reserve { grid-area:1 / 1; align-content:center; box-sizing:border-box; min-width:0; padding:.25rem .7rem; margin:0; line-height:1.55; overflow-wrap:anywhere; border:1px solid transparent; border-radius:8px; }
	.instruction-reserve { visibility:hidden; pointer-events:none; }
	.cable-instruction { display:flex; align-items:center; flex-wrap:wrap; gap:.5rem; }
	.cable-instruction.enabled { background:var(--color-info-soft); color:var(--color-info); border-color:var(--color-info); } .restart { font-size:var(--font-small); margin-left:auto; }
	.viewport { overflow:auto; max-height:65vh; min-height:320px; border:1px solid var(--color-border-strong); border-radius:14px; background:var(--color-surface-soft); }
	svg { display:block; min-width:1000px; width:100%; color:var(--color-text-subtle); }
	.dots { opacity:.22; } .area { fill:var(--color-surface); stroke:var(--color-border-strong); } .area.own { fill:var(--color-accent-soft); stroke:var(--color-accent); stroke-width:2; }
	.area-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; height:60px; color:var(--color-text); } .area-heading > div { min-width:0; } .area-heading strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:15px; } .area-heading button { flex-shrink:0; font-size:13px; }
	.cable-group { pointer-events:none; }
	.cable, .cable-outline { fill:none; stroke-linejoin:round; stroke-linecap:round; } .cable { stroke:currentColor; stroke-width:3; } .cable-outline { stroke:var(--color-surface); stroke-width:7; }
	.cable-group.focused .cable, .cable-group.active .cable { stroke-width:4.5; } .cable-port { fill:var(--color-surface); stroke:currentColor; stroke-width:2; }
	.cable-group.active .cable { stroke-dasharray:9 4; }
	.drop-slot { fill:none; stroke:var(--color-border-strong); stroke-dasharray:5 4; pointer-events:none; } .drop-slot.drop-target { fill:var(--color-info-soft); stroke:var(--color-info); stroke-width:2; stroke-dasharray:none; }
	.empty-slot { width:100%; height:58px; border-style:dashed; background:var(--color-surface-soft); }
	.device { width:100%; height:58px; display:flex; align-items:center; gap:7px; padding:6px; font-size:14px; text-align:left; }
	.device.draggable { touch-action:none; cursor:grab; user-select:none; } .device.dragging { cursor:grabbing; border-color:var(--color-info); box-shadow:0 0 0 3px var(--color-info); } .device.placing { border-style:dashed; }
	.device:hover { background:var(--color-surface-hover); border-color:var(--color-accent); } .device.cable-mode { cursor:crosshair; }
	.device.selected { border:2px solid var(--color-accent); } .device.source { box-shadow:inset 0 0 0 2px var(--color-info); }
	.symbol { color:var(--color-accent); font-size:23px; } .device-label { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700; }
	small { display:block; font-size:12px; font-weight:400; color:var(--color-text-muted); overflow:hidden; text-overflow:ellipsis; }
	.legend { padding:.35rem 0; } .legend button { font-size:var(--font-small); }
	.packets { pointer-events:none; } .packet { color:var(--color-info); } .packet.reply { color:var(--color-success); } .packet.failed { color:var(--color-danger); }
	.packet rect { fill:var(--color-surface); stroke:currentColor; stroke-width:2; } .packet path { fill:none; stroke:currentColor; stroke-width:1.5; } .packet text { fill:var(--color-text); font:11px system-ui,sans-serif; } .packet .packet-label { stroke-width:1; }
	.shared-pings { font-size:var(--font-small); margin:.2rem 0 .5rem; } summary { cursor:pointer; min-height:44px; padding:.65rem 0; color:var(--color-accent); font-weight:650; } .shared-pings li { margin:.6rem 0; line-height:1.5; }
	.port-menu { position:fixed; inset:auto; margin:0; width:260px; max-width:calc(100vw - 16px); max-height:calc(100dvh - 16px); overflow:auto; box-sizing:border-box; padding:12px; border:1px solid var(--color-border-strong); border-radius:10px; background:var(--color-surface); color:var(--color-text); box-shadow:0 8px 30px #0003; font-size:var(--font-small); }
	.port-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin:10px 0; } .port-grid button { font-weight:700; padding:.4rem; } .dismiss { width:100%; }
	button:focus-visible, summary:focus-visible, [tabindex]:focus-visible { outline:3px solid var(--color-focus); outline-offset:-3px; }
	@media(max-width:640px) { .board-heading { align-items:flex-start; flex-direction:column; } }
</style>
