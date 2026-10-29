<script>
	/** @type {{task:import('#lib/vlanLab2.js').Task,config:import('#lib/vlanLab2.js').Config,selected:string,onselect:(id:string)=>void,step:import('#lib/vlanLab2.js').Step|null,progress:number}} */
	let { task, config, selected, onselect, step, progress } = $props();
	const cables = $derived([
		...task.pcs
			.filter((p) => !p.wireless)
			.map((p) => ({ a: p.switchId, b: p.id, aPort: p.port, bPort: '', wifi: false })),
		...task.links.map((l) => ({ ...l, wifi: false })),
		{ a: task.router.switchId, b: 'r1', aPort: task.router.port, bPort: 'eth0', wifi: false },
		...(task.ap
			? [
					{ a: task.ap.switchId, b: 'ap1', aPort: task.ap.port, bPort: 'eth0', wifi: false },
					...task.pcs
						.filter((p) => p.wireless)
						.map((p) => ({ a: 'ap1', b: p.id, aPort: '', bPort: '', wifi: true }))
				]
			: [])
	]);
	const height = $derived(task.ap ? 580 : 480);
	/** @param {string} id */
	const device = (id) => task.devices.find((d) => d.id === id) ?? { x: 450, y: 250 };
	/** @param {string} a @param {string} b */
	function label(a, b) {
		const from = device(a),
			to = device(b),
			length = Math.hypot(to.x - from.x, to.y - from.y),
			distance = Math.min(85, length * 0.4);
		return {
			x: from.x + ((to.x - from.x) * distance) / length,
			y: from.y + ((to.y - from.y) * distance) / length
		};
	}
	const packet = $derived(
		step
			? {
					x: device(step.from).x + (device(step.to).x - device(step.from).x) * progress,
					y: device(step.from).y + (device(step.to).y - device(step.from).y) * progress
				}
			: null
	);
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (The network diagram is two-dimensional and needs keyboard scrolling.) -->
<div
	class="scroll"
	role="region"
	aria-label="Nettverkskart. Rull vannrett på smal skjerm."
	tabindex="0"
>
	<div class="map" style:aspect-ratio={`900 / ${height}`}>
		<svg viewBox={`0 0 900 ${height}`} preserveAspectRatio="none" aria-hidden="true"
			>{#each cables as c}<line
					x1={device(c.a).x}
					y1={device(c.a).y}
					x2={device(c.b).x}
					y2={device(c.b).y}
					class:wifi={c.wifi}
					class:active={step &&
						((step.from === c.a && step.to === c.b) || (step.from === c.b && step.to === c.a))}
				/>{/each}</svg
		>
		{#each cables.filter((c) => !c.wifi) as c}{#each [{ id: c.aPort, point: label(c.a, c.b) }, { id: c.bPort, point: label(c.b, c.a) }] as p}{#if p.id}<span
						class="port"
						style:left={`${p.point.x / 9}%`}
						style:top={`${(p.point.y * 100) / height}%`}>{p.id}</span
					>{/if}{/each}{/each}
		{#each task.devices as d}<button
				type="button"
				class="device"
				class:blocked={step?.to === d.id && !step.ok && progress === 1}
				style:left={`${d.x / 9}%`}
				style:top={`${(d.y * 100) / height}%`}
				aria-pressed={selected === d.id}
				onclick={() => onselect(d.id)}
			>
				<svg viewBox="0 0 32 24" aria-hidden="true"
					>{#if d.kind === 'pc'}<rect x="3" y="1" width="26" height="17" rx="2" /><path
							d="M16 18v5M9 23h14"
						/>{:else if d.kind === 'ap'}<path
							d="M2 6Q16 -3 30 6M6 11Q16 4 26 11M11 16Q16 12 21 16"
						/><circle cx="16" cy="21" r="1" />{:else if d.kind === 'router'}<path
							d="M2 12h28M23 6l7 6-7 6M9 6l-7 6 7 6M16 1v22"
						/>{:else}<rect x="1" y="5" width="30" height="16" rx="3" /><path
							d="M6 11v5M12 11v5M18 11v5M24 11v5"
						/>{/if}</svg
				>
				<strong>{d.name}</strong><small
					>{d.kind === 'pc'
						? config.ips[d.id] || 'Ingen IP'
						: d.kind === 'router'
							? 'VLAN-interfacer'
							: d.kind === 'ap'
								? 'SSID → VLAN'
								: 'VLAN og porter'}</small
				>
			</button>{/each}
		{#if packet}<span
				class="packet"
				style:left={`${packet.x / 9}%`}
				style:top={`${(packet.y * 100) / height}%`}
				aria-hidden="true"
				><svg viewBox="0 0 26 20"
					><rect x="1" y="1" width="24" height="18" rx="3" /><path d="m2 2 11 9L24 2" /></svg
				>{#if step && !step.ok && progress === 1}<b>Stopp</b>{/if}</span
			>{/if}
	</div>
</div>

<style>
	.scroll {
		overflow-x: auto;
		max-width: 100%;
		border-radius: 10px;
		background: var(--color-surface-hover);
	}
	.map {
		position: relative;
		/* Keep both port labels readable between device cards, also on a narrow screen. */
		min-width: 62rem;
		aspect-ratio: 900/580;
	}
	.map > svg {
		position: absolute;
		width: 100%;
		height: 100%;
		inset: 0;
	}
	.map line {
		stroke: var(--color-border-strong);
		stroke-width: 3;
	}
	.map line.wifi {
		stroke-dasharray: 7 5;
	}
	.map line.active {
		stroke: var(--color-accent);
		stroke-width: 5;
	}
	.device {
		position: absolute;
		transform: translate(-50%, -50%);
		width: 9rem;
		min-height: 82px;
		padding: 0.6rem;
		display: grid;
		justify-items: center;
		gap: 0.2rem;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border-strong);
		border-radius: 10px;
		font: inherit;
		cursor: pointer;
	}
	.device svg {
		width: 30px;
		height: 25px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
	}
	.device strong {
		font-size: var(--font-small);
	}
	.device small {
		font-size: var(--font-meta);
		overflow-wrap: anywhere;
	}
	.device[aria-pressed='true'] {
		outline: 3px solid var(--color-accent);
		outline-offset: 2px;
	}
	.device.blocked {
		box-shadow: 0 0 0 5px var(--color-danger-soft);
		border-color: var(--color-danger);
	}
	.port {
		position: absolute;
		transform: translate(-50%, -50%);
		padding: 3px 5px;
		border: 1px solid var(--color-border-strong);
		border-radius: 4px;
		background: var(--color-surface);
		color: var(--color-text);
		font: 700 var(--font-meta) monospace;
		z-index: 1;
	}
	.packet {
		position: absolute;
		transform: translate(-50%, -50%);
		z-index: 3;
		pointer-events: none;
	}
	.packet svg {
		display: block;
		width: 26px;
		height: 20px;
		fill: var(--color-danger);
		stroke: var(--color-surface);
		stroke-width: 2;
	}
	.packet b {
		white-space: nowrap;
		position: absolute;
		top: 24px;
		left: 50%;
		transform: translateX(-50%);
		padding: 3px 6px;
		border: 2px solid var(--color-danger);
		border-radius: 4px;
		background: var(--color-surface);
		color: var(--color-text);
	}
	.device:focus-visible,
	.scroll:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
</style>
