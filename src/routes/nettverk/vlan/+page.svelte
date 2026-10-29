<script>
	import { tick } from 'svelte';
	import VlanMap from '#lib/components/VlanMap.svelte';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	import { lab, learningContext } from '#lib/lab.js';
	import { vlanTasks, vlanTask, initialVlanConfig, membership, pingVlan, checkVlanTask } from '#lib/vlanLab.js';
	/** @typedef {{config:import('#lib/vlanLab.js').VlanConfig,revision:number,run:{revision:number,source:string,target:string,result:import('#lib/vlanLab.js').PingResult}|null,check:{revision:number,result:ReturnType<typeof checkVlanTask>}|null}} Workspace */
	/** @returns {Record<string,Workspace>} */
	function freshWork() {
		return Object.fromEntries(vlanTasks.map((task) => [task.id, { config: initialVlanConfig(task), revision: 0, run: null, check: null }]));
	}
	let work = $state(freshWork());
	let taskId = $state('ip');
	let selected = $state('pc1');
	let portId = $state('1');
	let source = $state('pc1');
	let target = $state('pc2');
	let frame = $state(0);
	let hints = $state(0);
	let vlanInput = $state('');
	let settingMessage = $state('');
	let resetPending = $state(false);
	const scope = $derived(`${$lab.user?.id ?? 'guest'}:${$learningContext.mode}:${$learningContext.openingId ?? ''}`);
	$effect(() => {
		scope;
		work = freshWork();
		taskId = 'ip';
		resetSelection();
	});
	const task = $derived(vlanTask(taskId));
	const attempt = $derived(work[taskId]);
	const config = $derived(attempt.config);
	const index = $derived(vlanTasks.findIndex((item) => item.id === taskId));
	const pc = $derived(task.pcs.find((item) => item.id === selected));
	const sw = $derived(task.switches.find((item) => item.id === selected));
	const switchConfig = $derived(sw ? config.switches[sw.id] : null);
	const port = $derived(switchConfig?.ports[portId]);
	const run = $derived(attempt.run);
	const stale = $derived(!!run && (run.revision !== attempt.revision || run.source !== source || run.target !== target));
	const checkStale = $derived(!!attempt.check && attempt.check.revision !== attempt.revision);
	const passed = $derived(!!attempt.check && !checkStale && attempt.check.result.passed);
	const activeStep = $derived(run && !stale ? run.result.steps[frame] ?? null : null);
	const completed = $derived(vlanTasks.filter((item) => work[item.id].check?.revision === work[item.id].revision && work[item.id].check?.result.passed).length);
	function resetSelection() {
		selected = 'pc1'; portId = '1'; source = 'pc1'; target = 'pc2'; frame = 0;
		hints = 0; vlanInput = ''; settingMessage = ''; resetPending = false;
	}
	/** @param {string} id */
	async function selectTask(id) {
		taskId = id;
		resetSelection();
		await tick();
		document.getElementById('task-heading')?.focus();
	}
	/** @param {string} id */
	function selectDevice(id) {
		selected = id;
		portId = task.switches.find((item) => item.id === id)?.ports[0]?.id ?? '1';
		settingMessage = ''; vlanInput = '';
	}
	function selectPcPort() {
		const current = pc;
		if (!current) return;
		selectDevice(current.switchId);
		portId = current.port;
	}
	function changed() { attempt.revision += 1; settingMessage = ''; }
	/** @param {number} vlan @param {string} mode */
	function setMembership(vlan, mode) {
		if (!port || !['excluded', 'untagged', 'tagged'].includes(mode)) return;
		if (mode === 'untagged') {
			for (const id of Object.keys(port.members)) if (port.members[id] === 'untagged') port.members[id] = 'excluded';
		}
		port.members[String(vlan)] = /** @type {import('#lib/vlanLab.js').Membership} */ (mode);
		changed();
	}
	function addVlan() {
		if (!switchConfig) return;
		const id = Number(vlanInput);
		if (!/^\d+$/.test(vlanInput) || id < 1 || id > 4094) { settingMessage = 'Bruk et helt VLAN-ID fra 1 til 4094.'; return; }
		if (switchConfig.vlans.includes(id)) { settingMessage = `VLAN ${id} finnes allerede på denne switchen.`; return; }
		if (switchConfig.vlans.length >= 8) { settingMessage = 'Utkastet støtter inntil åtte VLAN per switch. Fjern et ubrukt VLAN før du legger til flere.'; return; }
		switchConfig.vlans.push(id); switchConfig.vlans.sort((a, b) => a - b);
		changed(); vlanInput = ''; settingMessage = `VLAN ${id} er opprettet på ${sw?.name}. Velg medlemskap på portene.`;
	}
	/** @param {number} id */
	function removeVlan(id) {
		if (!switchConfig || id === 1) return;
		if (Object.values(switchConfig.ports).some((item) => item.pvid === id || membership(item, id) !== 'excluded')) {
			settingMessage = `VLAN ${id} er i bruk. Flytt PVID og sett portene til Utenfor først.`; return;
		}
		switchConfig.vlans = switchConfig.vlans.filter((vlan) => vlan !== id);
		for (const item of Object.values(switchConfig.ports)) delete item.members[String(id)];
		changed(); settingMessage = `VLAN ${id} er fjernet.`;
	}
	function ping() {
		attempt.run = { revision: attempt.revision, source, target, result: pingVlan(task, config, source, target) };
		frame = 0;
	}
	function check() { attempt.check = { revision: attempt.revision, result: checkVlanTask(task, config) }; }
	async function resetTask() {
		work[taskId] = { config: initialVlanConfig(task), revision: 0, run: null, check: null };
		resetSelection();
		await tick();
		document.getElementById('task-heading')?.focus();
	}
</script>

<svelte:head>
	<title>VLAN-laben – IT-laben</title>
	<meta name="description" content="Konfigurer IP-adresser og VLAN, følg trafikken og bygg trunk gjennom tre switcher." />
</svelte:head>

<PartnerContext pageId="vlan-lab" values={{ taskId, deviceId: selected, portId: sw ? portId : null, hints, hasRun: !!run || !!attempt.check, stale: stale || checkStale, revision: attempt.revision }} />

<main id="hovedinnhold" class="vlan-page" tabindex="-1">
	<a class="back" href="/?fag=drift">← Driftsstøtte</a>
	<header class="hero">
		<p class="eyebrow">DRIFTSSTØTTE · INTERAKTIV LAB · FØRSTE UTKAST</p>
		<h1>Bygg nett som henger sammen.</h1>
		<p>Start med to PC-er. Skill trafikken med VLAN, og frakt den videre gjennom flere switcher.</p>
	</header>
	<nav class="tasks" aria-label="Oppdrag i VLAN-laben">
		{#each vlanTasks as item, i (item.id)}
			<button type="button" aria-current={taskId === item.id ? 'step' : undefined} onclick={() => selectTask(item.id)}>
				<span class="step-number">{i + 1}</span><span>{item.title}
					<small>{work[item.id].check?.revision === work[item.id].revision && work[item.id].check?.result.passed ? '✓ Oppsettet består' : 'Åpne oppdrag'}</small>
				</span>
			</button>
		{/each}
	</nav>
	<p class="muted progress-note">{completed} av {vlanTasks.length} oppsett består nå. Arbeidet beholdes mellom oppdragene mens siden er åpen. Omlasting eller å forlate siden nullstiller laben. Ingen XP.</p>
	<section class="mission" aria-labelledby="task-heading">
		<p class="eyebrow">OPPDRAG {index + 1} AV {vlanTasks.length}</p>
		<h2 id="task-heading" tabindex="-1">{task.title}</h2>
		<p class="goal">{task.goal}</p>
		<p>{task.theory[0]}</p>
		<details class="theory" open={index === 0}>
			<summary>Før du prøver: {index < 2 ? 'IP og VLAN' : 'porter og trafikk'}</summary>
			{#each task.theory.slice(1) as text}<p>{text}</p>{/each}
		</details>
	</section>
	<div class="workspace">
		<section class="map-panel" aria-labelledby="map-title">
			<div class="panel-heading"><h2 id="map-title">Nettverket ditt</h2><span class="muted">{task.switches.length} switch{task.switches.length > 1 ? 'er' : ''} · /24</span></div>
			<VlanMap {task} {config} {selected} onselect={selectDevice} step={activeStep} />
			<a href="#device-editor">Til innstillinger for valgt enhet ↓</a>
		</section>
		<section class="editor" id="device-editor" aria-labelledby="editor-title" tabindex="-1">
			<h2 id="editor-title">Konfigurer enhet</h2>
			<label for="device-picker">Valgt enhet</label>
			<select id="device-picker" value={selected} onchange={(event) => selectDevice(event.currentTarget.value)}>
				{#each task.pcs as item}<option value={item.id}>{item.name}</option>{/each}
				{#each task.switches as item}<option value={item.id}>{item.name} · switch</option>{/each}
			</select>
			{#if pc}
				<p><strong>{pc.name}</strong> er koblet til {pc.switchId.toUpperCase()}, port {pc.port}.</p>
				<label for="pc-ip">IP-adresse</label>
				<input id="pc-ip" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" maxlength="15"
					value={config.ips[pc.id]} aria-describedby="ip-help" oninput={(event) => { config.ips[selected] = event.currentTarget.value; changed(); }} />
				<p class="muted" id="ip-help">Mål: 192.168.{pc.subnet}.0/24.<br />Fast maske: 255.255.255.0. Bruk en unik vertsadresse med siste tall 1–254.</p>
				<p class="target-vlan">Skal tilhøre VLAN {pc.vlan}</p>
				<button type="button" class="secondary" onclick={selectPcPort}>Se switchporten →</button>
			{:else if sw && switchConfig && port}
				{#if !task.editableSwitches}<p class="callout">Switchen er ferdig oppsatt i dette oppdraget. Undersøk portene her, og endre IP-adresser på PC-ene.</p>{/if}
				<details class="vlans" open={task.editableSwitches}>
					<summary>VLAN på {sw.name}: {switchConfig.vlans.join(', ')}</summary>
					{#if task.editableSwitches}
						<form onsubmit={(event) => { event.preventDefault(); addVlan(); }}>
							<label for="new-vlan">Opprett VLAN-ID (1–4094)</label>
							<div class="add-vlan"><input id="new-vlan" type="text" inputmode="numeric" maxlength="4" bind:value={vlanInput} /><button type="submit" class="secondary">Legg til</button></div>
						</form>
						<div class="vlan-list">{#each switchConfig.vlans.filter((id) => id !== 1) as id}<button type="button" onclick={() => removeVlan(id)}>Fjern VLAN {id}</button>{/each}</div>
					{:else}<p>VLAN-ene er opprettet på forhånd.</p>{/if}
				</details>
				<p class="setting-status" role="status">{settingMessage}</p>
				<label for="port-picker">Port på {sw.name}</label>
				<select id="port-picker" bind:value={portId}>
					{#each sw.ports as item}<option value={item.id}>Port {item.id} → {item.peer}</option>{/each}
				</select>
				<label for="pvid">PVID · VLAN inn for untagged</label>
				<select id="pvid" value={port.pvid} disabled={!task.editableSwitches}
					onchange={(event) => { if (port) { port.pvid = Number(event.currentTarget.value); changed(); } }}>
					{#each switchConfig.vlans as id}<option value={id}>VLAN {id}</option>{/each}
				</select>
				<fieldset disabled={!task.editableSwitches}>
					<legend>VLAN-medlemskap på port {portId}</legend>
					{#each switchConfig.vlans as id}
						<label class="member">VLAN {id}
							<select value={membership(port, id)} onchange={(event) => setMembership(id, event.currentTarget.value)}>
								<option value="excluded">Utenfor</option><option value="untagged">Untagged · uten tag</option><option value="tagged">Tagged · med VLAN-ID</option>
							</select>
						</label>
					{/each}
				</fieldset>
				<p class="muted">PVID bestemmer VLAN for umerket trafikk inn. Medlemskapet bestemmer om VLAN-et tillates, og om trafikken sendes ut med tag.</p>
			{/if}
		</section>
	</div>
	<section class="testing" aria-labelledby="test-title">
		<h2 id="test-title">Prøv forbindelsen</h2>
		<p>Forutsi utfallet, velg to PC-er og følg en simulert ping. Endre én ting og prøv igjen.</p>
		<div class="ping-controls">
			<label>Fra<select bind:value={source}>{#each task.pcs as item}<option value={item.id}>{item.name}</option>{/each}</select></label>
			<label>Til<select bind:value={target}>{#each task.pcs as item}<option value={item.id}>{item.name}</option>{/each}</select></label>
			<button type="button" class="primary" disabled={source === target} onclick={ping}>Prøv ping</button>
		</div>
		<div class="result" class:success={run?.result.ok && !stale}>
			<p role="status">{stale ? 'Oppsettet eller PC-valget er endret. Kjør ping igjen; resultatet under er fra forrige forsøk.' : run?.result.message ?? 'Ingen ping kjørt ennå.'}</p>
			{#if run}
				<div class="trace-controls">
					<button type="button" disabled={stale || frame === 0} onclick={() => frame -= 1}>← Forrige</button>
					<span>Hendelse {frame + 1} av {run.result.steps.length}</span>
					<button type="button" disabled={stale || frame >= run.result.steps.length - 1} onclick={() => frame += 1}>Neste →</button>
				</div>
				<p class="trace" aria-live="polite">{run.result.steps[frame]?.ok ? '→' : 'Stopp:'} {run.result.steps[frame]?.text}</p>
			{/if}
		</div>
		<div class="actions">
			<button type="button" class="primary" onclick={check}>Kontroller oppdraget</button>
			<button type="button" class="secondary" disabled={hints >= task.hints.length} onclick={() => hints += 1}>Vis {hints ? 'neste ' : ''}hint</button>
		</div>
		{#if hints}<aside class="hints" aria-label="Hint" aria-live="polite">{#each task.hints.slice(0, hints) as hint}<p>{hint}</p>{/each}</aside>{/if}
		<div class="check-result">
			<p role="status">{checkStale ? 'Oppsettet er endret etter kontrollen. Kontroller på nytt.' : attempt.check ? passed ? 'Oppsettet oppfyller kravene i modellen.' : 'Noen krav gjenstår. Åpne kontrollisten for å finne neste ting å undersøke.' : 'Kontrollen undersøker adresser, VLAN-porter, kommunikasjon og skillet mellom nettverkene.'}</p>
			{#if attempt.check}<details open={!passed}><summary>Kontrolliste · {attempt.check.result.rows.filter((row) => row.ok).length} av {attempt.check.result.rows.length} krav {checkStale ? 'i forrige kontroll' : 'oppfylt'}</summary>
				<ul>{#each attempt.check.result.rows as row}<li class:met={row.ok}><strong>{row.ok ? '✓ OK' : 'Mangler'}</strong> · {row.label}</li>{/each}</ul>
			</details>{/if}
		</div>
		{#if passed}
			<div class="reflection"><h3>Forklar for en medelev</h3><p>{task.reflect}</p><p class="muted">Bestått kontroll viser at oppsettet virker i modellen. Forklaringen og et nytt oppsett viser mer av hva du forstår.</p></div>
			{#if index < vlanTasks.length - 1}<button class="primary" type="button" onclick={() => selectTask(vlanTasks[index + 1].id)}>Neste oppdrag →</button>
			{:else}<p>Prøv prinsippene i Packet Tracer eller på labens switcher sammen med læreren.</p>{/if}
		{/if}
	</section>
	<details class="model-notes"><summary>Om modellen og videre arbeid</summary>
		<p>Dette er en lokal simulering. Ingen ping eller konfigurasjon sendes til skolens nett. Modellen bruker faste kabler uten løkker, IPv4 med /24, PVID og VLAN-medlemskap. PC-ene bruker ikke VLAN-tagging.</p>
		<p>Ruting, DHCP, ARP-tabeller, MAC-læring, STP og leverandørspesifikke kommandoer er ikke simulert. Tagged/untagged beskriver trafikken på en port; begrepene og standardvalgene kan variere mellom switchmerker.</p>
		<p>Labpartneren får valgt oppdrag, enhet og port samt om et forsøk er kjørt eller utdatert. IP-adressene, portoppsettet og testresultatet deles ikke i utkastet.</p>
		<p><strong>Ny anvendelse:</strong> Tegn først port- og adresseplanen for to nye VLAN med andre ID-er. Bygg den på reelt utstyr eller i Packet Tracer, og dokumenter en forbindelse som virker og en som skal være adskilt.</p>
	</details>
	<div class="reset">
		{#if resetPending}<p>Dette fjerner alle endringer og testresultater i dette oppdraget. De andre oppdragene beholdes.</p><button type="button" onclick={resetTask}>Nullstill dette oppdraget</button><button type="button" onclick={() => resetPending = false}>Avbryt</button>
		{:else}<button type="button" onclick={() => resetPending = true}>Start dette oppdraget på nytt</button>{/if}
	</div>
</main>

<style>
	.vlan-page { width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter))); margin: 28px auto 56px; color: var(--color-text); font: var(--font-body)/var(--leading-body) var(--font-ui); }
	.vlan-page :global(*) { box-sizing: border-box; }
	h1, h2, h3, p { overflow-wrap: anywhere; }
	h1 { font-size: clamp(2rem, 4vw, 3rem); line-height: 1.15; letter-spacing: -0.04em; margin: 8px 0 14px; }
	h2 { font-size: 1.4rem; line-height: 1.3; margin: 0 0 14px; }
	h3 { font-size: 1.1rem; margin: 0 0 10px; }
	p { margin: 10px 0 16px; }
	a { color: var(--color-accent); text-underline-offset: 4px; }
	.back { display: inline-flex; align-items: center; min-height: 44px; }
	.hero { margin: 16px 0 24px; max-width: 70ch; }
	.eyebrow { color: var(--color-accent); font-size: var(--font-meta); letter-spacing: 0.08em; font-weight: 700; }
	.muted { color: var(--color-text-muted); font-size: var(--font-small); }
	.tasks { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
	button, input, select { font: inherit; }
	button, select, input { min-height: 44px; border: 1px solid var(--color-border-strong); border-radius: 8px; background: var(--color-surface); color: var(--color-text); padding: 9px 12px; }
	button { cursor: pointer; touch-action: manipulation; }
	button:hover { background: var(--color-surface-hover); }
	button:disabled { opacity: 0.6; cursor: default; }
	.tasks button { display: flex; gap: 10px; align-items: center; text-align: left; font-size: var(--font-small); }
	.tasks button[aria-current] { border-color: var(--color-accent); background: var(--color-accent-soft); }
	.tasks small { display: block; margin-top: 4px; color: var(--color-text-muted); font-size: var(--font-meta); }
	.step-number { font-weight: 750; font-size: 1.25rem; color: var(--color-accent); }
	.progress-note { margin: 10px 0 24px; }
	.mission { border-left: 4px solid var(--color-accent); padding: 18px 24px; background: var(--color-surface); border-radius: 0 12px 12px 0; margin-bottom: 20px; }
	.goal { max-width: 75ch; }
	summary { cursor: pointer; min-height: 44px; padding: 10px 0; font-weight: 650; }
	.theory p { max-width: 75ch; }
	.workspace { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(300px, 1fr); gap: 20px; align-items: start; }
	.map-panel, .editor, .testing { min-width: 0; padding: 20px; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-surface); }
	.panel-heading { display: flex; gap: 12px; justify-content: space-between; align-items: baseline; flex-wrap: wrap; }
	label { display: block; font-size: var(--font-small); font-weight: 650; margin: 14px 0 6px; }
	select, input { display: block; width: 100%; max-width: 100%; min-width: 0; margin-top: 6px; }
	input { font-family: ui-monospace, monospace; }
	.target-vlan { font-weight: 650; color: var(--color-accent); }
	.callout, .hints { border-left: 3px solid var(--color-info); background: var(--color-info-soft); padding: 12px 16px; font-size: var(--font-small); }
	.vlans { margin-top: 12px; }
	.add-vlan { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 8px; }
	.vlan-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
	.vlan-list button { font-size: var(--font-meta); }
	.setting-status { font-size: var(--font-small); color: var(--color-accent); min-height: 1.5em; }
	fieldset { border: 0; border-top: 1px solid var(--color-border); margin: 20px 0 0; padding: 14px 0 0; min-width: 0; }
	legend { padding-right: 10px; font-size: var(--font-small); font-weight: 650; }
	.member { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; align-items: center; }
	.member select { margin: 0; font-size: var(--font-small); }
	.primary { background: var(--color-action); color: var(--color-on-action); border-color: var(--color-action); font-weight: 650; }
	.primary:hover { background: var(--color-action); filter: brightness(1.08); }
	.secondary { color: var(--color-accent); font-weight: 650; }
	.testing { margin-top: 20px; }
	.ping-controls { display: grid; grid-template-columns: minmax(100px, 1fr) minmax(100px, 1fr) auto; gap: 14px; align-items: end; max-width: 700px; }
	.ping-controls label { margin: 0; }
	.result { background: var(--color-surface-soft); border: 1px solid var(--color-border); border-radius: 10px; margin: 20px 0; padding: 16px 20px; min-height: 140px; }
	.result.success { border-color: var(--color-success); }
	.trace-controls, .actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
	.trace-controls { font-size: var(--font-small); }
	.trace { min-height: 3em; }
	.check-result { margin-block: 20px; }
	.check-result ul { list-style: none; padding: 0; display: grid; gap: 8px; font-size: var(--font-small); }
	.check-result li { padding: 8px 12px; border-left: 3px solid var(--color-border-strong); }
	.check-result li.met { border-color: var(--color-success); }
	.reflection { border-top: 1px solid var(--color-border); padding-top: 20px; }
	.model-notes { margin: 22px 0; }
	.model-notes p { max-width: 75ch; }
	.reset { display: flex; flex-wrap: wrap; gap: 12px; font-size: var(--font-small); }
	.reset p { flex-basis: 100%; }
	:is(button, input, select, summary, a):focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	@media (max-width: 1000px) { .workspace { grid-template-columns: minmax(0, 1fr); } }
	@media (max-width: 600px) { .tasks { grid-template-columns: 1fr; } .map-panel, .editor, .testing, .mission { padding: 16px; } .ping-controls { grid-template-columns: 1fr 1fr; } .ping-controls button { grid-column: 1 / -1; } .member { grid-template-columns: 1fr; gap: 4px; } }
</style>
