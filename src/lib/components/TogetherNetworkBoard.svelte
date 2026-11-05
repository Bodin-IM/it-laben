<script>
	import { tick } from 'svelte';
	/** @type {{room:import('#lib/vlanTogether.js').TogetherRoom,selected:string,source:string,highlight:string[],onselect:(id:string)=>void}} */
	let { room, selected, source, highlight, onselect } = $props();
	/** @type {HTMLDivElement|undefined} */ let viewport = $state();
	let shownRoom = '';
	const peers = $derived(room.members.filter((m) => m.id !== room.me));
	const ownY = $derived(Math.ceil(peers.length / 2) * 230 + 20);
	const height = $derived(ownY + 300);
	const me = $derived(room.members.find((m) => m.id === room.me) ?? { id: room.me, name: 'Deg', online: true });
	const areas = $derived([...peers.map((m, i) => ({ ...m, x: (i % 2) * 500 + 8, y: Math.floor(i / 2) * 230 + 8, width: 484, own: false })), { ...me, x: 8, y: ownY, width: 984, own: true }]);
	const points = $derived(Object.fromEntries(areas.flatMap((area) => room.devices.filter((d) => d.owner === area.id).map((d, i) => [d.id, { x: area.x + 18 + (i % 4) * (area.own ? 240 : 116), y: area.y + 54 + Math.floor(i / 4) * 78, width: area.own ? 210 : 100 }]))));
	function myArea() { if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'instant' }); }
	$effect(() => {
		const id = room.id;
		if (id === shownRoom) return;
		shownRoom = id;
		void tick().then(() => { if (id === room.id) myArea(); });
	});
	const symbols = { pc: '▣', switch: '▤', router: '⇄' };
</script>

<div class="board-heading"><div><h2>Felles nettverksbrett</h2><p>Velg en enhet. Ditt område ligger nederst.</p></div><button onclick={myArea}>Til mitt område ↓</button></div>
<!-- svelte-ignore a11y_no_noninteractive_tabindex (The network diagram scrolls in two dimensions.) -->
<div class="viewport" bind:this={viewport} tabindex="0" role="region" aria-label="Nettverksbrett, rull opp for å se andre områder">
	<svg viewBox={`0 0 1000 ${height}`} style:height={`${height}px`} aria-label="Nettverksområder og kabler">
		<defs><pattern id="vlan-board-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" /></pattern></defs>
		<rect width="1000" {height} fill="url(#vlan-board-dots)" class="dots" />
		{#each areas as area (area.id)}
			<rect x={area.x} y={area.y} width={area.width} height={area.own ? 276 : 212} rx="14" class:own={area.own} class="area" />
			<text x={area.x + 18} y={area.y + 28} class="area-title">{area.own ? 'DITT OMRÅDE' : area.name}</text>
			<text x={area.x + area.width - 18} y={area.y + 28} text-anchor="end" class="presence">{area.online ? 'Aktiv nå' : 'Ikke aktiv nå'}</text>
		{/each}
		{#each room.links as link (link.id)}
			{@const a = points[link.a]}{@const b = points[link.b]}
			{#if a && b}
				{@const ax = a.x + a.width / 2}{@const bx = b.x + b.width / 2}
				<path d={`M ${ax} ${a.y + 58} C ${ax} ${a.y + 90}, ${bx} ${b.y + 90}, ${bx} ${b.y + 58}`} class="cable" class:active={highlight.includes(link.id)}><title>{room.devices.find((d) => d.id === link.a)?.name} {link.aPort} ↔ {room.devices.find((d) => d.id === link.b)?.name} {link.bPort}</title></path>
			{/if}
		{/each}
		{#each room.devices as device (device.id)}
			{@const point = points[device.id]}
			{#if point}<foreignObject x={point.x} y={point.y} width={point.width} height="65">
				<button class="device" class:selected={selected === device.id} class:source={source === device.id} onclick={() => onselect(device.id)} aria-pressed={selected === device.id} aria-label={`${device.name}, ${device.kind === 'pc' ? 'PC' : device.kind === 'switch' ? 'switch' : 'ruter'}, ${device.owner === room.me ? 'ditt område' : room.members.find((m) => m.id === device.owner)?.name}`}>
					<span aria-hidden="true" class="symbol">{symbols[device.kind]}</span><span class="device-label">{device.name}<small>{device.kind === 'pc' ? device.config.ip || 'Ingen IP' : device.kind === 'switch' ? `${device.config.vlans.length} VLAN` : `${device.config.interfaces.length} interfacer`}</small></span>
				</button>
			</foreignObject>{/if}
		{/each}
	</svg>
</div>
<p class="legend"><span>━</span> Kabel · <span class="tested">━</span> Siste pingvei · Velg enheten for å se porter.</p>

<style>
	.board-heading { display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:.75rem; }
	h2 { font-size:1.2rem; margin:0; } p { margin:.4rem 0 0; color:var(--color-text-muted); font-size:var(--font-small); }
	button { background:var(--color-surface); color:var(--color-text); border:1px solid var(--color-border-strong); border-radius:8px; padding:.6rem .8rem; font:inherit; cursor:pointer; min-height:44px; }
	.viewport { overflow:auto; max-height:65vh; min-height:320px; border:1px solid var(--color-border-strong); border-radius:14px; background:var(--color-surface-soft); }
	svg { display:block; min-width:1000px; width:100%; color:var(--color-text-subtle); }
	.dots { opacity:.22; } .area { fill:var(--color-surface); stroke:var(--color-border-strong); } .area.own { fill:var(--color-accent-soft); stroke:var(--color-accent); stroke-width:2; }
	.area-title { fill:var(--color-text); font-size:14px; font-weight:750; } .presence { fill:var(--color-text-muted); font-size:12px; }
	.cable { fill:none; stroke:var(--color-text-subtle); stroke-width:2.5; opacity:.7; } .cable.active { stroke:var(--color-info); stroke-width:5; opacity:1; }
	.device { width:100%; height:58px; display:flex; align-items:center; gap:7px; padding:6px; font-size:14px; text-align:left; }
	.device:hover { background:var(--color-surface-hover); border-color:var(--color-accent); }
	.device.selected { border:2px solid var(--color-accent); } .device.source { box-shadow:inset 0 0 0 2px var(--color-info); }
	.symbol { color:var(--color-accent); font-size:23px; } .device-label { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700; }
	small { display:block; font-size:12px; font-weight:400; color:var(--color-text-muted); overflow:hidden; text-overflow:ellipsis; }
	.legend { padding:.35rem 0; } .legend span { color:var(--color-text-subtle); } .legend .tested { color:var(--color-info); }
	button:focus-visible, .viewport:focus-visible { outline:3px solid var(--color-focus); outline-offset:-3px; }
	@media(max-width:640px) { .board-heading { align-items:flex-start; flex-direction:column; } }
</style>
