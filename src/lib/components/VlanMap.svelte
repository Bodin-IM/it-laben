<script>
	import { vlanPoint } from '#lib/vlanLab.js';
	/** @type {{task:import('#lib/vlanLab.js').VlanTask,config:import('#lib/vlanLab.js').VlanConfig,selected:string,onselect:(id:string)=>void,step:import('#lib/vlanLab.js').TraceStep|null,progress?:number}} */
	let { task, config, selected, onselect, step, progress = 1 } = $props();
	const packet = $derived.by(() => {
		if (!step) return null;
		const from = vlanPoint(task, step.from), to = vlanPoint(task, step.to);
		return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
	});
</script>

<div class="map-scroll" role="region" aria-label="Nettverkskart. Rull vannrett på smal skjerm." tabindex="0">
	<div class="network-map" style:min-width={`${task.switches.length > 2 ? 780 : task.switches.length > 1 ? 660 : 600}px`}>
		<svg viewBox="0 0 900 440" preserveAspectRatio="none" aria-hidden="true">
			{#each task.switches as sw}
				{#each sw.ports as port}
					{@const point = vlanPoint(task, { node: sw.id, port: port.id })}
					<line class="port-lead" x1={sw.x} y1={sw.y} x2={point.x} y2={point.y} />
				{/each}
			{/each}
			{#each task.pcs as pc (pc.id)}
				{@const port = vlanPoint(task, { node: pc.switchId, port: pc.port })}
				<line x1={pc.x} y1={pc.y} x2={port.x} y2={port.y}
					class:traced={step?.link === pc.id} class:blocked={step?.link === pc.id && !step.ok} />
			{/each}
			{#each task.links as link (link.id)}
				{@const a = vlanPoint(task, { node: link.a, port: link.aPort })}
				{@const b = vlanPoint(task, { node: link.b, port: link.bPort })}
				<line class="uplink" x1={a.x} y1={a.y} x2={b.x} y2={b.y}
					class:traced={step?.link === link.id} class:blocked={step?.link === link.id && !step.ok} />
			{/each}
		</svg>
		{#each task.switches as sw}
			{#each sw.ports as port}
				{@const point = vlanPoint(task, { node: sw.id, port: port.id })}
				<span class="port-label" style:left={`${point.x / 9}%`} style:top={`${point.y / 4.4}%`} title={`${sw.name} ${port.id} ↔ ${port.peer}`}>{port.id}</span>
			{/each}
		{/each}
		{#each task.pcs as pc (pc.id)}
			<button type="button" class="device pc" class:visited={step?.node === pc.id}
				style:left={`${pc.x / 9}%`} style:top={`${pc.y / 4.4}%`}
				aria-pressed={selected === pc.id} aria-controls="pc-editor" onclick={() => onselect(pc.id)}>
				<svg viewBox="0 0 32 28" aria-hidden="true"><rect x="3" y="2" width="26" height="18" rx="2" /><path d="M16 20v5M9 26h14" /></svg>
				<strong>{pc.name}</strong><span>{config.ips[pc.id] || 'Ingen IP-adresse'}</span>
			</button>
		{/each}
		{#each task.switches as sw (sw.id)}
			<button type="button" class="device switch" class:visited={step?.node === sw.id}
				style:left={`${sw.x / 9}%`} style:top={`${sw.y / 4.4}%`}
				aria-pressed={selected === sw.id} aria-controls="device-editor" onclick={() => onselect(sw.id)}>
				<svg viewBox="0 0 44 24" aria-hidden="true"><rect x="2" y="3" width="40" height="18" rx="3" /><path d="M8 9v6m7-6v6m7-6v6m7-6v6m7-6v6" /></svg>
				<strong>{sw.name} · switch</strong><span>Åpne VLAN ↓</span>
			</button>
		{/each}
		{#if packet && step}
			<div class="packet" class:stopped={!step.ok && progress === 1} aria-hidden="true" style:left={`${packet.x / 9}%`} style:top={`${packet.y / 4.4}%`}>
				<svg viewBox="0 0 24 18"><rect x="1" y="1" width="22" height="16" rx="2" /><path d="m2 3 10 7L22 3" /></svg>
				{#if !step.ok && progress === 1}<span>Stopp</span>{/if}
			</div>
		{/if}
	</div>
</div>
<p class="map-help">Klikk på en PC for å endre IP. Portnavnene ved switchene viser hvor kablene er koblet til. Den røde pakken følger ping og stanser ved stedet som avviser trafikken.</p>
<details>
	<summary>Vis kabler som tekst</summary>
	<ul>
		{#each task.pcs as pc}<li>{pc.name} ↔ {pc.switchId.toUpperCase()} {pc.port}</li>{/each}
		{#each task.links as link}<li>{link.a.toUpperCase()} {link.aPort} ↔ {link.b.toUpperCase()} {link.bPort}</li>{/each}
	</ul>
</details>

<style>
	.map-scroll { overflow-x: auto; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface-soft); }
	.network-map { position: relative; height: 440px; }
	.network-map > svg { position: absolute; inset: 0; width: 100%; height: 100%; }
	line { stroke: var(--color-text-muted); stroke-width: 3; }
	.port-lead { stroke-width: 2; }
	.uplink { stroke-width: 5; stroke-dasharray: 8 5; }
	line.traced { stroke: var(--color-accent); stroke-width: 7; stroke-dasharray: none; }
	line.blocked { stroke: var(--color-danger); stroke-dasharray: 5 4; }
	.port-label { position: absolute; transform: translate(-50%, -50%); z-index: 1; padding: 3px 6px; border: 1px solid var(--color-border-strong); border-radius: 5px; color: var(--color-text); background: var(--color-surface); font: 700 var(--font-meta)/1.3 ui-monospace, monospace; }
	.device { position: absolute; transform: translate(-50%, -50%); width: 156px; display: grid; justify-items: center; gap: 3px; padding: 10px 8px; border: 1px solid var(--color-border-strong); border-radius: 10px; background: var(--color-surface); color: var(--color-text); font: inherit; cursor: pointer; }
	.device.switch { width: 128px; }
	.device:hover { background: var(--color-surface-hover); }
	.device[aria-pressed='true'] { outline: 3px solid var(--color-accent); outline-offset: 2px; }
	.device.visited { box-shadow: 0 0 0 7px var(--color-accent-soft); }
	.device svg { width: 34px; height: 28px; fill: none; stroke: currentColor; stroke-width: 1.7; }
	.device strong { font-size: var(--font-small); }
	.device span { font-size: var(--font-meta); overflow-wrap: anywhere; }
	.packet { position: absolute; transform: translate(-50%, -50%); z-index: 3; pointer-events: none; color: var(--color-surface); }
	.packet > svg { display: block; width: 26px; height: 20px; fill: var(--color-danger); stroke: currentColor; stroke-width: 2; filter: drop-shadow(0 1px 2px #0008); }
	.packet span { position: absolute; top: 24px; left: 50%; transform: translateX(-50%); padding: 3px 8px; border: 2px solid var(--color-danger); border-radius: 5px; background: var(--color-surface); color: var(--color-text); font-size: var(--font-small); font-weight: 700; }
	.map-help { color: var(--color-text-muted); font-size: var(--font-small); line-height: 1.5; margin: 12px 0 6px; }
	summary { cursor: pointer; min-height: 44px; padding: 10px 0; box-sizing: border-box; font-size: var(--font-small); }
	ul { padding-left: 22px; font-size: var(--font-small); line-height: 1.6; }
	:is(button, summary, .map-scroll):focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
</style>
