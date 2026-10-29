<script>
	/** @type {{task:import('#lib/vlanLab.js').VlanTask,config:import('#lib/vlanLab.js').VlanConfig,selected:string,onselect:(id:string)=>void,step:import('#lib/vlanLab.js').TraceStep|null}} */
	let { task, config, selected, onselect, step } = $props();
</script>

<div class="map-scroll" role="region" aria-label="Nettverkskart. Rull vannrett på smal skjerm." tabindex="0">
	<div class="network-map">
		<svg viewBox="0 0 900 440" preserveAspectRatio="none" aria-hidden="true">
			{#each task.pcs as pc (pc.id)}
				{@const sw = task.switches.find((item) => item.id === pc.switchId)}
				{#if sw}<line x1={pc.x} y1={pc.y} x2={sw.x} y2={sw.y}
					class:traced={step?.link === pc.id} class:blocked={step?.link === pc.id && !step.ok} />{/if}
			{/each}
			{#each task.links as link (link.id)}
				{@const a = task.switches.find((item) => item.id === link.a)}
				{@const b = task.switches.find((item) => item.id === link.b)}
				{#if a && b}<line class="uplink" x1={a.x} y1={a.y} x2={b.x} y2={b.y}
					class:traced={step?.link === link.id} class:blocked={step?.link === link.id && !step.ok} />{/if}
			{/each}
		</svg>
		{#each task.pcs as pc (pc.id)}
			<button type="button" class="device pc" class:visited={step?.node === pc.id}
				style:left={`${pc.x / 9}%`} style:top={`${pc.y / 4.4}%`}
				aria-pressed={selected === pc.id} aria-controls="device-editor" onclick={() => onselect(pc.id)}>
				<svg viewBox="0 0 32 28" aria-hidden="true"><rect x="3" y="2" width="26" height="18" rx="2" /><path d="M16 20v5M9 26h14" /></svg>
				<strong>{pc.name}</strong><span>{config.ips[pc.id] || 'Ingen IP-adresse'}</span>
				<small>{pc.switchId.toUpperCase()} · port {pc.port}</small>
			</button>
		{/each}
		{#each task.switches as sw (sw.id)}
			<button type="button" class="device switch" class:visited={step?.node === sw.id}
				style:left={`${sw.x / 9}%`} style:top={`${sw.y / 4.4}%`}
				aria-pressed={selected === sw.id} aria-controls="device-editor" onclick={() => onselect(sw.id)}>
				<svg viewBox="0 0 44 24" aria-hidden="true"><rect x="2" y="3" width="40" height="18" rx="3" /><path d="M8 9v6m7-6v6m7-6v6m7-6v6m7-6v6" /></svg>
				<strong>{sw.name} · switch</strong>
				<span>{task.editableSwitches ? 'Velg for å konfigurere' : 'Ferdig oppsatt'}</span>
			</button>
		{/each}
	</div>
</div>
<p class="map-help">Velg en enhet i kartet eller i listen ved innstillingene. Markert kabel følger den valgte hendelsen.</p>
<details>
	<summary>Vis kabler som tekst</summary>
	<ul>
		{#each task.pcs as pc}<li>{pc.name} ↔ {pc.switchId.toUpperCase()} port {pc.port}</li>{/each}
		{#each task.links as link}<li>{link.a.toUpperCase()} port {link.aPort} ↔ {link.b.toUpperCase()} port {link.bPort}</li>{/each}
	</ul>
</details>

<style>
	.map-scroll { overflow-x: auto; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface-soft); }
	.network-map { position: relative; min-width: 600px; height: 440px; }
	.network-map > svg { position: absolute; inset: 0; width: 100%; height: 100%; }
	line { stroke: var(--color-text-muted); stroke-width: 3; }
	.uplink { stroke-width: 5; stroke-dasharray: 8 5; }
	line.traced { stroke: var(--color-accent); stroke-width: 7; stroke-dasharray: none; }
	line.blocked { stroke: var(--color-danger); stroke-dasharray: 5 4; }
	.device { position: absolute; transform: translate(-50%, -50%); width: 156px; display: grid; justify-items: center; gap: 3px; padding: 10px 8px; border: 1px solid var(--color-border-strong); border-radius: 10px; background: var(--color-surface); color: var(--color-text); font: inherit; cursor: pointer; }
	.device:hover { background: var(--color-surface-hover); }
	.device[aria-pressed='true'] { outline: 3px solid var(--color-accent); outline-offset: 2px; }
	.device.visited { box-shadow: 0 0 0 7px var(--color-accent-soft); }
	.device svg { width: 34px; height: 28px; fill: none; stroke: currentColor; stroke-width: 1.7; }
	.device strong { font-size: var(--font-small); }
	.device span, .device small { font-size: var(--font-meta); overflow-wrap: anywhere; }
	.device small, .map-help { color: var(--color-text-muted); }
	.map-help { font-size: var(--font-small); line-height: 1.5; margin: 12px 0 6px; }
	summary { cursor: pointer; min-height: 44px; padding: 10px 0; box-sizing: border-box; font-size: var(--font-small); }
	ul { padding-left: 22px; font-size: var(--font-small); line-height: 1.6; }
	:is(button, summary, .map-scroll):focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
</style>
