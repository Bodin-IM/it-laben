<script>
	import { tick, untrack } from 'svelte';
	import { reducedMotion } from '#lib/labPreferences.js';
	import { cablePath, pingFrame } from '#lib/vlanTogetherPlayback.js';
	import { devicePorts, portLink } from '#lib/vlanTogether.js';
	/** @typedef {import('#lib/vlanTogether.js').TogetherDevice} Device */
	/** @type {{room:import('#lib/vlanTogether.js').TogetherRoom,selected:string,cable:{source:string,port:string}|null,connecting:boolean,pingMode:boolean,pingSource:string,onpingtoggle:()=>void,onping:(id:string)=>void,disabled:boolean,highlight:string[],onselect:(id:string)=>void,ontoggle:()=>void,onrestart:()=>void,onport:(id:string,port:string)=>void,onrequest:(id:string)=>void,onfeedback:(message:string)=>void,ondocument:(id:string)=>void}} */
	let { room, selected, cable, connecting, pingMode, pingSource, onpingtoggle, onping, disabled, highlight, onselect, ontoggle, onrestart, onport, onrequest, onfeedback, ondocument } = $props();
	const componentId = $props.id();
	const menuId = componentId + '-ports';
	/** @type {HTMLDivElement|undefined} */ let viewport = $state();
	/** @type {HTMLDivElement|undefined} */ let portMenu = $state();
	/** @type {HTMLButtonElement|null} */ let menuAnchor = null;
	let pickerId = $state(''), menuX = $state(0), menuY = $state(0);
	let shownRoom = '';
	let showPackets = $state(true), visible = $state(true), clock = $state(0);
	let sampledServer = 0, sampledLocal = 0;
	const events = $derived((room.pings ?? []).filter((ping) => ping.revision === room.revision));
	const recent = $derived(events.filter((ping) => ping.expiresAt > clock));
	const ownPingActive = $derived(recent.some((ping) => ping.by === room.me && clock < ping.startsAt + ping.duration));
	const frames = $derived(showPackets ? recent.map((ping) => ({ ping, frame: pingFrame(ping, clock, points, room.links, $reducedMotion) })) : []);
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
	const ownY = $derived(Math.ceil(peers.length / 2) * 268 + 20);
	const height = $derived(ownY + 310);
	const me = $derived(room.members.find((m) => m.id === room.me));
	const areas = $derived([...peers.map((m, i) => ({ ...m, x: (i % 2) * 500 + 8, y: Math.floor(i / 2) * 268 + 8, width: 484, own: false })), ...(me ? [{ ...me, x: 8, y: ownY, width: 984, own: true }] : [])]);
	const points = $derived(Object.fromEntries(areas.flatMap((area) => room.devices.filter((d) => d.owner === area.id).map((d, i) => [d.id, { x: area.x + 18 + (i % 4) * (area.own ? 240 : 116), y: area.y + 84 + Math.floor(i / 4) * 78, width: area.own ? 210 : 100 }]))));
	const sourceDevice = $derived(room.devices.find((d) => d.id === cable?.source));
	const instruction = $derived(pingMode ? pingSource ? `Fra ${deviceLabel(pingSource)}. Velg en annen PC som mottaker.` : 'Velg din PC som avsender. Deretter velger du mottaker-PC.' : !connecting ? 'Velg en enhet for å konfigurere den.' : cable ? `Fra ${sourceDevice?.name ?? 'enheten'} · ${cable.port}. Velg en switch eller ruter.` : 'Velg din enhet, og så en ledig port.');
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
		void tick().then(() => { if (id === room.id) myArea(true); });
	});
	const symbols = { pc: '▣', switch: '▤', router: '⇄' };
</script>

<svelte:document onvisibilitychange={() => visible = !document.hidden} />
<svelte:window onresize={() => closePicker()} onscroll={() => closePicker()} onkeydown={(event) => {
	if (event.key !== 'Escape') return;
	// Let native panels (for example room settings) handle Escape before board tools.
	const openPopover = document.querySelector('[popover]:popover-open');
	if (openPopover && openPopover !== portMenu) return;
	if (pingMode) { event.preventDefault(); onpingtoggle(); return; }
	if (!connecting) return;
	event.preventDefault();
	if (pickerId) closePicker(true); else ontoggle();
}} />
<div class="board-heading">
	<h2 id="board-title" tabindex="-1" class="board-title">Felles nettverksbrett</h2>
	<div class="board-actions"><button class:enabled={connecting} aria-pressed={connecting} disabled={disabled && !connecting} onclick={ontoggle}>{connecting ? 'Avslutt kabelmodus' : 'Koble kabel'}</button><button class:enabled={pingMode} aria-pressed={pingMode} disabled={disabled || ownPingActive && !pingMode} onclick={onpingtoggle}>{pingMode ? 'Avslutt pingmodus' : ownPingActive ? 'Ping pågår …' : 'Ping'}</button><button onclick={() => myArea()}>Til mitt område ↓</button></div>
</div>
<p class="cable-instruction" class:enabled={connecting || pingMode} role="status">{instruction}{#if connecting && cable} <button class="restart" disabled={disabled} onclick={onrestart}>Velg ny start</button>{/if}</p>
<!-- svelte-ignore a11y_no_noninteractive_tabindex (The network diagram scrolls in two dimensions.) -->
<div class="viewport" bind:this={viewport} tabindex="0" role="region" aria-label="Nettverksbrett, rull opp for å se andre områder" onscroll={() => closePicker()}>
	<svg viewBox={`0 0 1000 ${height}`} style:height={`${height}px`} aria-label="Nettverksområder og kabler">
		<defs><pattern id="vlan-board-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" /></pattern></defs>
		<rect width="1000" {height} fill="url(#vlan-board-dots)" class="dots" />
		{#each areas as area (area.id)}
			<rect x={area.x} y={area.y} width={area.width} height={area.own ? 292 : 250} rx="14" class:own={area.own} class="area" />
			<foreignObject x={area.x + 16} y={area.y + 8} width={area.width - 32} height="66">
				<div class="area-heading"><div><strong title={area.areaName || area.name}>{area.areaName || (area.own ? 'Ditt nettverk' : area.name)}</strong><small>{area.own ? 'Ditt område' : area.name} · {area.online ? 'Aktiv nå' : 'Ikke aktiv nå'}</small></div><button onclick={() => ondocument(area.id)} aria-label={`Dokumentasjon for ${area.areaName || area.name}`}>Dokumentasjon</button></div>
			</foreignObject>
		{/each}
		{#each room.links as link (link.id)}
			{@const a = points[link.a]}{@const b = points[link.b]}
			{#if a && b}
				<path d={cablePath(a, b)} class="cable" class:active={highlight.includes(link.id) || activeLinks.includes(link.id)}><title>{room.devices.find((d) => d.id === link.a)?.name} {link.aPort} ↔ {room.devices.find((d) => d.id === link.b)?.name} {link.bPort}</title></path>
			{/if}
		{/each}
		{#each room.devices as device (device.id)}
			{@const point = points[device.id]}
			{#if point}<foreignObject x={point.x} y={point.y} width={point.width} height="65">
				<button class="device" class:selected={selected === device.id} class:source={cable?.source === device.id || pingMode && pingSource === device.id} class:cable-mode={connecting || pingMode}
					onclick={(event) => choose(device, event)} aria-pressed={pingMode ? pingSource === device.id : selected === device.id}
					aria-haspopup={connecting && device.owner === room.me ? 'dialog' : undefined}
					aria-expanded={connecting && device.owner === room.me ? pickerId === device.id : undefined}
					aria-controls={pickerId === device.id ? menuId : undefined}
					aria-label={`${device.name}, ${device.kind === 'pc' ? 'PC' : device.kind === 'switch' ? 'switch' : 'ruter'}, ${device.owner === room.me ? 'ditt område' : room.members.find((m) => m.id === device.owner)?.name}`}>
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
<div class="legend"><p><span>━</span> Kabel · <span class="tested">━</span> Pingvei{$reducedMotion ? ' · Pakker vises uten bevegelse' : ''}</p><button aria-pressed={showPackets} onclick={() => showPackets = !showPackets}>{showPackets ? 'Skjul pakker' : 'Vis pakker'}</button></div>
{#if recent.length}<details class="shared-pings"><summary>Siste ping i rommet · {recent.length}</summary><ul>{#each recent as ping (ping.id)}<li><strong>{ownerLabel(ping.by)}</strong> · {deviceLabel(ping.from)} → {deviceLabel(ping.to)}<br />{ping.ok ? '✓' : '×'} {ping.message}</li>{/each}</ul></details>{/if}

<style>
	.board-heading, .board-actions, .legend { display:flex; justify-content:space-between; align-items:center; gap:.65rem; flex-wrap:wrap; }
	.board-heading { position:relative; margin-bottom:.25rem; } .board-title { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; } .board-title:focus-visible { position:static; width:auto; height:auto; margin:0; clip-path:none; white-space:normal; font-size:1.1rem; }
	p { margin:.4rem 0 0; color:var(--color-text-muted); font-size:var(--font-small); }
	button { background:var(--color-surface); color:var(--color-text); border:1px solid var(--color-border-strong); border-radius:8px; padding:.6rem .8rem; font:inherit; cursor:pointer; min-height:44px; }
	button:disabled { opacity:.55; cursor:default; } button.enabled { background:var(--color-action); color:var(--color-on-action); border-color:var(--color-action); }
	.cable-instruction { display:flex; align-items:center; flex-wrap:wrap; gap:.5rem; min-height:1.55em; padding:.25rem 0; margin:0 0 .25rem; border:1px solid transparent; border-radius:8px; }
	.cable-instruction.enabled { padding:.4rem .7rem; background:var(--color-info-soft); color:var(--color-info); border-color:var(--color-info); } .restart { font-size:var(--font-small); margin-left:auto; }
	.viewport { overflow:auto; max-height:65vh; min-height:320px; border:1px solid var(--color-border-strong); border-radius:14px; background:var(--color-surface-soft); }
	svg { display:block; min-width:1000px; width:100%; color:var(--color-text-subtle); }
	.dots { opacity:.22; } .area { fill:var(--color-surface); stroke:var(--color-border-strong); } .area.own { fill:var(--color-accent-soft); stroke:var(--color-accent); stroke-width:2; }
	.area-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; height:60px; color:var(--color-text); } .area-heading > div { min-width:0; } .area-heading strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:15px; } .area-heading button { flex-shrink:0; font-size:13px; }
	.cable { fill:none; stroke:var(--color-text-subtle); stroke-width:2.5; opacity:.7; pointer-events:none; } .cable.active { stroke:var(--color-info); stroke-width:5; opacity:1; }
	.device { width:100%; height:58px; display:flex; align-items:center; gap:7px; padding:6px; font-size:14px; text-align:left; }
	.device:hover { background:var(--color-surface-hover); border-color:var(--color-accent); } .device.cable-mode { cursor:crosshair; }
	.device.selected { border:2px solid var(--color-accent); } .device.source { box-shadow:inset 0 0 0 2px var(--color-info); }
	.symbol { color:var(--color-accent); font-size:23px; } .device-label { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700; }
	small { display:block; font-size:12px; font-weight:400; color:var(--color-text-muted); overflow:hidden; text-overflow:ellipsis; }
	.legend { padding:.35rem 0; } .legend button { font-size:var(--font-small); } .legend span { color:var(--color-text-subtle); } .legend .tested { color:var(--color-info); }
	.packets { pointer-events:none; } .packet { color:var(--color-info); } .packet.reply { color:var(--color-success); } .packet.failed { color:var(--color-danger); }
	.packet rect { fill:var(--color-surface); stroke:currentColor; stroke-width:2; } .packet path { fill:none; stroke:currentColor; stroke-width:1.5; } .packet text { fill:var(--color-text); font:11px system-ui,sans-serif; } .packet .packet-label { stroke-width:1; }
	.shared-pings { font-size:var(--font-small); margin:.2rem 0 .5rem; } summary { cursor:pointer; min-height:44px; padding:.65rem 0; color:var(--color-accent); font-weight:650; } .shared-pings li { margin:.6rem 0; line-height:1.5; }
	.port-menu { position:fixed; inset:auto; margin:0; width:260px; max-width:calc(100vw - 16px); max-height:calc(100dvh - 16px); overflow:auto; box-sizing:border-box; padding:12px; border:1px solid var(--color-border-strong); border-radius:10px; background:var(--color-surface); color:var(--color-text); box-shadow:0 8px 30px #0003; font-size:var(--font-small); }
	.port-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin:10px 0; } .port-grid button { font-weight:700; padding:.4rem; } .dismiss { width:100%; }
	button:focus-visible, summary:focus-visible, [tabindex]:focus-visible { outline:3px solid var(--color-focus); outline-offset:-3px; }
	@media(max-width:640px) { .board-heading { align-items:flex-start; flex-direction:column; } }
</style>
