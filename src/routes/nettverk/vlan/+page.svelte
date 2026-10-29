<script>
	import { onMount, tick, untrack } from 'svelte';
	import VlanMap from '#lib/components/VlanMap.svelte';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	import { lab, learningContext } from '#lib/lab.js';
	import { vlanTasks, vlanTask, vlanLabel, vlanCheckPassed, vlanAvailableThrough, initialVlanConfig, membership, pingVlan, checkVlanTask } from '#lib/vlanLab.js';
	/** @typedef {{config:import('#lib/vlanLab.js').VlanConfig,revision:number,run:{revision:number,source:string,target:string,result:import('#lib/vlanLab.js').PingResult}|null,check:{revision:number,result:ReturnType<typeof checkVlanTask>}|null}} Workspace */
	/** @returns {Record<string,Workspace>} */
	function freshWork() {
		return Object.fromEntries(vlanTasks.map((task) => [task.id, { config: initialVlanConfig(task), revision: 0, run: null, check: null }]));
	}
	let work = $state(freshWork());
	let taskId = $state('ip');
	let selected = $state('pc1');
	let pcId = $state('pc1');
	let switchId = $state('s1');
	let portId = $state('eth0');
	let source = $state('pc1');
	let target = $state('pc2');
	let frame = $state(0);
	let playing = $state(false);
	let travelProgress = $state(1);
	let reducedMotion = $state(true);
	onMount(() => {
		const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => { reducedMotion = preference.matches; };
		update();
		preference.addEventListener('change', update);
		return () => preference.removeEventListener('change', update);
	});
	let hints = $state(0);
	let vlanInput = $state('');
	let settingMessage = $state('');
	let portMessage = $state('');
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
	const pc = $derived(task.pcs.find((item) => item.id === pcId));
	const sw = $derived(task.switches.find((item) => item.id === switchId));
	const switchConfig = $derived(sw ? config.switches[sw.id] : null);
	/** @type {import('#lib/vlanLab.js').Membership[]} */
	const membershipOrder = ['untagged', 'excluded', 'tagged'];
	const membershipLabels = { untagged: 'Untagged', excluded: 'Exclude', tagged: 'Tagged' };
	const membershipSymbols = { untagged: 'U', excluded: 'E', tagged: 'T' };
	const run = $derived(attempt.run);
	const stale = $derived(!!run && (run.revision !== attempt.revision || run.source !== source || run.target !== target));
	const checkStale = $derived(!!attempt.check && attempt.check.revision !== attempt.revision);
	const passed = $derived(vlanCheckPassed(attempt));
	const availableThrough = $derived(vlanAvailableThrough(work));
	const missingRows = $derived(attempt.check?.result.rows.filter((row) => !row.ok) ?? []);
	const activeStep = $derived(run && !stale ? run.result.steps[frame] ?? null : null);
	const playbackComplete = $derived(!!run && !stale && frame === run.result.steps.length - 1 && travelProgress === 1);
	const completed = $derived(vlanTasks.filter((item) => vlanCheckPassed(work[item.id])).length);
	$effect(() => {
		const currentRun = run, currentFrame = frame;
		if (!currentRun || stale) { playing = false; return; }
		if (reducedMotion) { playing = false; travelProgress = 1; return; }
		if (!playing) return;
		const initialProgress = untrack(() => travelProgress);
		let started = 0;
		let request = 0;
		/** @param {number} now */
		function advance(now) {
			if (!started) started = now;
			const elapsed = now - started + initialProgress * 650;
			travelProgress = Math.min(1, elapsed / 650);
			if (elapsed >= 1000) {
				if (currentFrame < currentRun.result.steps.length - 1) { travelProgress = 0; frame = currentFrame + 1; }
				else playing = false;
			} else request = requestAnimationFrame(advance);
		}
		request = requestAnimationFrame(advance);
		return () => cancelAnimationFrame(request);
	});
	function resetSelection() {
		selected = 'pc1'; pcId = 'pc1'; switchId = 's1'; portId = 'eth0'; source = 'pc1'; target = 'pc2'; frame = 0; playing = false; travelProgress = 1;
		hints = 0; vlanInput = ''; settingMessage = ''; portMessage = ''; resetPending = false;
	}
	/** @param {string} id */
	async function selectTask(id) {
		const targetIndex = vlanTasks.findIndex((item) => item.id === id);
		if (targetIndex < 0 || targetIndex > availableThrough) return;
		taskId = id;
		resetSelection();
		await tick();
		document.getElementById('task-heading')?.focus();
	}
	/** @param {string} id */
	function selectPc(id) {
		if (!task.pcs.some((item) => item.id === id)) return;
		pcId = id;
		selected = id;
	}
	/** @param {string} id */
	function selectSwitch(id) {
		const device = task.switches.find((item) => item.id === id);
		if (!device) return;
		selected = id;
		if (switchId === id) {
			if (!device.ports.some((item) => item.id === portId)) portId = device.ports[0]?.id ?? 'eth0';
			return;
		}
		switchId = id;
		portId = device.ports[0]?.id ?? 'eth0';
		settingMessage = ''; portMessage = ''; vlanInput = '';
	}
	/** Reveal only as far as needed; keep the map in view when the PC panel is already visible. @param {string} id @param {string} [regionId] */
	async function reveal(id, regionId = id) {
		await tick();
		const element = document.getElementById(id);
		document.getElementById(regionId)?.scrollIntoView({ block: regionId === 'pc-editor' ? 'nearest' : 'start', inline: 'nearest' });
		element?.focus({ preventScroll: true });
		// At high zoom the panel can exceed the viewport; keep its focused heading visible too.
		element?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}
	/** @param {import('#lib/vlanLab.js').VlanCheckTarget} destination */
	async function inspect(destination) {
		if (task.pcs.some((item) => item.id === destination.deviceId)) {
			selectPc(destination.deviceId);
			await reveal('pc-editor-title', 'pc-editor');
		} else if (task.switches.some((item) => item.id === destination.deviceId)) {
			selectSwitch(destination.deviceId);
			if (destination.portId && sw?.ports.some((item) => item.id === destination.portId)) {
				portId = destination.portId;
				await reveal(`port-heading-${portId}`);
			} else await reveal('editor-title');
		}
	}
	/** @param {string} id */
	function selectDevice(id) { return inspect({ deviceId: id }); }
	/** @param {string} id */
	function selectPort(id) {
		selected = switchId;
		portId = id;
	}
	/** @param {import('#lib/vlanLab.js').VlanCheckTarget} destination */
	function targetLabel(destination) {
		const device = [...task.pcs, ...task.switches].find((item) => item.id === destination.deviceId);
		return destination.portId ? `${device?.name}, port ${destination.portId}` : device?.name ?? destination.deviceId;
	}
	/** @param {import('#lib/vlanLab.js').Membership} mode */
	function nextMembership(mode) {
		return membershipOrder[(membershipOrder.indexOf(mode) + 1) % membershipOrder.length];
	}
	function changed() { playing = false; attempt.revision += 1; portMessage = ''; }
	/** @param {string} id @param {number} vlan */
	function cycleMembership(id, vlan) {
		const item = switchConfig?.ports[id];
		if (!task.editableSwitches || !switchConfig || !item) return;
		selectPort(id);
		const mode = nextMembership(membership(item, vlan));
		const previousUntagged = switchConfig.vlans.find((key) => membership(item, key) === 'untagged');
		if (mode === 'untagged') {
			for (const key of Object.keys(item.members)) if (item.members[key] === 'untagged') item.members[key] = 'excluded';
		}
		item.members[String(vlan)] = mode;
		changed();
		portMessage = `${sw?.name} port ${id}, VLAN ${vlan}: ${membershipLabels[mode]}.`;
		if (mode === 'untagged') {
			if (previousUntagged !== undefined) portMessage += ` VLAN ${previousUntagged} ble satt til Exclude på samme port.`;
			portMessage += ` PVID er fortsatt ${item.pvid}.`;
		}
	}
	function addVlan() {
		if (!task.editableSwitches || !switchConfig) return;
		selected = switchId;
		const id = Number(vlanInput);
		if (!/^\d+$/.test(vlanInput) || id < 1 || id > 4094) { settingMessage = 'Bruk et helt VLAN-ID fra 1 til 4094.'; return; }
		if (switchConfig.vlans.includes(id)) { settingMessage = `VLAN ${id} finnes allerede på denne switchen.`; return; }
		if (switchConfig.vlans.length >= 8) { settingMessage = 'Utkastet støtter inntil åtte VLAN per switch. Fjern et ubrukt VLAN før du legger til flere.'; return; }
		switchConfig.vlans.push(id); switchConfig.vlans.sort((a, b) => a - b);
		changed(); vlanInput = ''; settingMessage = `VLAN ${id} er opprettet på ${sw?.name}. Velg medlemskap på portene.`;
	}
	/** @param {number} id */
	async function removeVlan(id) {
		if (!task.editableSwitches || !switchConfig || id === 1) return;
		selected = switchId;
		if (Object.values(switchConfig.ports).some((item) => item.pvid === id || membership(item, id) !== 'excluded')) {
			settingMessage = `VLAN ${id} er i bruk. Flytt PVID og sett portene til Exclude først.`; return;
		}
		switchConfig.vlans = switchConfig.vlans.filter((vlan) => vlan !== id);
		for (const item of Object.values(switchConfig.ports)) delete item.members[String(id)];
		changed(); settingMessage = `VLAN ${id} er fjernet.`;
		await tick();
		document.getElementById('new-vlan')?.focus();
	}
	async function ping() {
		playing = false;
		attempt.run = { revision: attempt.revision, source, target, result: pingVlan(task, config, source, target) };
		frame = 0;
		travelProgress = reducedMotion ? 1 : 0;
		await reveal('packet-controls');
		playing = !reducedMotion;
	}
	/** @param {number} delta */
	function stepFrame(delta) {
		if (!run || stale) return;
		playing = false;
		frame = Math.max(0, Math.min(run.result.steps.length - 1, frame + delta));
		travelProgress = 1;
	}
	function togglePlayback() {
		if (!run || stale || reducedMotion) return;
		if (playing) { playing = false; return; }
		if (playbackComplete) { frame = 0; travelProgress = 0; }
		playing = true;
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

<PartnerContext pageId="vlan-lab" values={{ taskId, deviceId: selected, portId: selected === switchId ? portId : null, hints, hasRun: !!run || !!attempt.check, stale: stale || checkStale, revision: attempt.revision }} />

<main id="hovedinnhold" class="vlan-page" tabindex="-1">
	<a class="back" href="/?fag=drift">← Driftsstøtte</a>
	<header class="hero">
		<p class="eyebrow">DRIFTSSTØTTE · INTERAKTIV LAB · FØRSTE UTKAST</p>
		<h1>Bygg nett som henger sammen.</h1>
		<p>Start med to PC-er. Skill trafikken med VLAN, og frakt den videre gjennom flere switcher.</p>
	</header>
	<nav class="tasks" aria-label="Oppdrag i VLAN-laben">
		{#each vlanTasks as item, i (item.id)}
			<button type="button" disabled={i > availableThrough} aria-current={taskId === item.id ? 'step' : undefined}
				aria-describedby={i > availableThrough ? 'progress-rule' : undefined} onclick={() => selectTask(item.id)}>
				<span class="step-number">{i + 1}</span><span>{item.title}
					<small>{i > availableThrough ? `Låst · bestå oppdrag ${i}` : vlanCheckPassed(work[item.id]) ? '✓ Oppsettet består' : taskId === item.id ? 'Du er her' : 'Åpne oppdrag'}</small>
				</span>
			</button>
		{/each}
	</nav>
	<p class="progress-rule" id="progress-rule">{completed} av {vlanTasks.length} oppsett består nå. Bestå «Kontroller oppdraget» før du går videre. Endrer du et tidligere oppsett, må det kontrolleres på nytt før senere oppdrag åpnes igjen.</p>
	<p class="muted progress-note">Arbeidet beholdes mellom oppdragene mens siden er åpen. Omlasting eller å forlate siden nullstiller laben. Ingen XP.</p>
	<section class="mission" aria-labelledby="task-heading">
		<p class="eyebrow">OPPDRAG {index + 1} AV {vlanTasks.length}</p>
		<h2 id="task-heading" tabindex="-1">{task.title}</h2>
		<p class="goal">{task.goal}</p>
		<p class="ready"><strong>Utgangspunkt:</strong> {task.ready}</p>
		<div class="mission-layout">
			<div><h3>Gjør dette</h3><ol class="task-steps">{#each task.steps as text}<li>{text}</li>{/each}</ol></div>
			<div><h3>Nettverksplan · målet ditt</h3><ul class="network-plan">
				{#each task.groups as id, group}
					{@const members = task.pcs.filter((item) => item.vlan === id)}
					<li><strong>{vlanLabel(task, id)}</strong><span>{task.networks[group]}.0/24</span>{#if !task.discoverPorts}<small>{members.map((item) => item.name).join(', ')}</small>{/if}</li>
				{/each}
			</ul></div>
		</div>
		<p>{task.theory[0]}</p>
		<details class="theory" open={index === 0}>
			<summary>Før du prøver: {index < 2 ? 'IP og VLAN' : 'porter og trafikk'}</summary>
			{#each task.theory.slice(1) as text}<p>{text}</p>{/each}
		</details>
	</section>
	<nav class="workspace-links" aria-label="Arbeidsområder i oppdraget">
		<a href="#network-panel">Kart og PC-er</a>
		<a href="#device-editor">Switcher og VLAN</a>
		<a class="test-shortcut" href="#testing">Til testing ↓</a>
	</nav>
	<div class="workspace">
		<section class="map-panel" id="network-panel" aria-labelledby="map-title" tabindex="-1">
			<div class="panel-heading"><h2 id="map-title" tabindex="-1">Nettverket ditt</h2><span class="muted">{task.switches.length} switch{task.switches.length > 1 ? 'er' : ''} · /24</span></div>
			<div class="network-workspace">
				<section class="map-ping" id="map-ping" aria-labelledby="ping-title" tabindex="-1">
					<h3 id="ping-title">Prøv ping i kartet</h3>
					<div class="ping-controls">
						<label>Fra<select bind:value={source}>{#each task.pcs as item}<option value={item.id}>{item.name}</option>{/each}</select></label>
						<label>Til<select bind:value={target}>{#each task.pcs as item}<option value={item.id}>{item.name}</option>{/each}</select></label>
						<button type="button" class="primary" disabled={source === target} onclick={ping}>Send ping</button>
					</div>
					<p class="muted">Forutsi utfallet før du sender. Ping undersøker ett par; oppdragskontrollen nederst åpner neste del.</p>
				</section>
				<div class="map-area">
					<div class="map-toolbar" id="packet-controls" tabindex="-1" role="group" aria-label="Styr avspillingen">
						{#if run}
							<button type="button" class="secondary" disabled={stale || reducedMotion} onclick={togglePlayback}>{playing ? 'Pause' : playbackComplete ? 'Spill av igjen' : 'Spill av'}</button>
							<button type="button" disabled={stale || frame === 0} onclick={() => stepFrame(-1)}>← Forrige</button>
							<span>Steg {frame + 1} av {run.result.steps.length}</span>
							<button type="button" disabled={stale || frame >= run.result.steps.length - 1} onclick={() => stepFrame(1)}>Neste →</button>
						{:else}<span class="muted">Send en ping for å følge pakken gjennom nettverket.</span>{/if}
					</div>
					<VlanMap {task} {config} {selected} onselect={selectDevice} step={activeStep} progress={travelProgress} />
					{#if run}
						<div class="map-playback">
							{#if reducedMotion}<p class="muted">Redusert bevegelse er aktivert. Bruk Forrige og Neste for å følge pakken uten animasjon.</p>{/if}
							{#if stale}<p role="status">Oppsettet eller ping-paret er endret. Send ping på nytt; dette er et tidligere forsøk.</p>
							{:else}
								<p class="trace" aria-live="polite">{!activeStep?.ok && travelProgress === 1 ? 'Stopp:' : '→'} {activeStep?.text}</p>
								<p class="ping-status" class:success={playbackComplete && run.result.ok} role="status">{playbackComplete ? run.result.message : playing ? 'Ping pågår. Du kan pause og undersøke hvert steg.' : 'Avspillingen er satt på pause. Fortsett eller gå ett steg om gangen.'}</p>
							{/if}
							<a href="#testing">Kontroller hele oppdraget ↓</a>
						</div>
					{/if}
				</div>
				<section class="pc-editor" id="pc-editor" aria-labelledby="pc-editor-title" tabindex="-1">
					<h3 id="pc-editor-title" tabindex="-1">{pc?.name ?? 'PC-innstillinger'}</h3>
					<p class="muted">Klikk på en PC i kartet for å endre IP.</p>

					{#if pc}
						<p class="pc-connection">Koblet til <strong>{pc.switchId.toUpperCase()} {pc.port}</strong>.</p>
						<label for="pc-ip">IP-adresse</label>
						<input id="pc-ip" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" maxlength="15"
							value={config.ips[pc.id]} aria-describedby="ip-help" onfocus={() => selectPc(pc.id)}
							oninput={(event) => { config.ips[pc.id] = event.currentTarget.value; changed(); }} />
						<p class="muted" id="ip-help">{#if task.discoverPorts}Undersøk U og PVID på switchporten, og velg IP-nett fra VLAN-planen.{:else}Mål: {pc.network}.0/24.{/if}<br />Fast maske: 255.255.255.0.<br />Bruk en unik vertsadresse med siste tall 1–254.</p>
						{#if !task.discoverPorts}<p class="target-vlan">Mål: {vlanLabel(task, pc.vlan)}</p>{/if}
						<button type="button" class="secondary" onclick={() => inspect({ deviceId: pc.switchId, portId: pc.port })}>Vis {pc.switchId.toUpperCase()} {pc.port} ↓</button>
					{/if}
					<a class="pc-back" href="#network-panel">Tilbake til kartet ↑</a>
				</section>
			</div>

			<div class="map-links"><a href="#device-editor">Switcher og VLAN ↓</a><a href="#testing">Gå til testing ↓</a></div>
		</section>
		<section class="editor" id="device-editor" aria-labelledby="editor-title" tabindex="-1">
			<div class="panel-heading"><h2 id="editor-title" tabindex="-1">Switcher og VLAN</h2><a href="#network-panel">Tilbake til kart og PC-er ↑</a></div>
			<div class="switch-picker" role="group" aria-label="Velg switch">
				{#each task.switches as item}
					<button type="button" aria-pressed={switchId === item.id} aria-controls="switch-settings" onclick={() => selectSwitch(item.id)}>{item.name}</button>
				{/each}
			</div>
			<div id="switch-settings">
			{#if sw && switchConfig}
				{#if !task.editableSwitches}<p class="callout">Switchen er ferdig oppsatt i dette oppdraget. Undersøk portene her, og endre IP-adressene i PC-panelet ved kartet.</p>{/if}
				<details class="vlans" open={task.editableSwitches && !task.preconfigured}>
					<summary>{task.editableSwitches ? 'Opprett og fjern VLAN' : 'VLAN på ' + sw.name} · {switchConfig.vlans.join(', ')}</summary>
					{#if task.editableSwitches}
						<form onsubmit={(event) => { event.preventDefault(); addVlan(); }}>
							<label for="new-vlan">Opprett VLAN-ID (1–4094)</label>
							<div class="add-vlan"><input id="new-vlan" type="text" inputmode="numeric" maxlength="4" bind:value={vlanInput} onfocus={() => selectSwitch(switchId)} /><button type="submit" class="secondary">Legg til</button></div>
						</form>
						<div class="vlan-list">{#each switchConfig.vlans.filter((id) => id !== 1) as id}<button type="button" onclick={() => removeVlan(id)}>Fjern VLAN {id}</button>{/each}</div>
					{:else}<p>VLAN-ene er opprettet på forhånd.</p>{/if}
				</details>
				<p class="setting-status" role="status">{settingMessage}</p>
				<div class="membership-legend" role="group" aria-label="Betydningen av bokstavene">
					<span><strong class="untagged-key">U</strong> Untagged</span>
					<span><strong class="excluded-key">E</strong> Exclude</span>
					<span><strong class="tagged-key">T</strong> Tagged</span>
				</div>
				<p class="muted" id="membership-cycle">{task.editableSwitches ? 'Trykk på en portrute for å bytte: U → E → T → U. Hver rad gjelder ett VLAN.' : 'Hver rad viser ett VLAN. Bokstaven i portruten viser portens medlemskap.'}</p>
				<div class="matrix-scroll" role="region" aria-label="VLAN-tabell. Rull vannrett ved behov." tabindex="0">
					<table class="vlan-matrix">
						<caption>{sw.name} · VLAN-medlemskap</caption>
						<thead><tr>
							<th scope="col">ID</th><th scope="col">Navn</th>
							{#each sw.ports as item (item.id)}
								<th scope="col" class:selected-port={selected === switchId && portId === item.id} id={`port-heading-${item.id}`} tabindex="-1"><span>Port</span><strong>{item.id}</strong><span class="port-selection">{selected === switchId && portId === item.id ? 'Valgt' : ''}</span></th>
							{/each}
						</tr></thead>
						<tbody>
							{#each switchConfig.vlans as id (id)}
								<tr>
									<th scope="row">{id}</th>
									<td class="vlan-name">{task.networkNames[task.groups.indexOf(id)] ?? (id === 1 ? 'Default' : '—')}</td>
									{#each sw.ports as item (item.id)}
										{@const mode = membership(switchConfig.ports[item.id], id)}
										<td class:selected-port={selected === switchId && portId === item.id}><button type="button" class="membership-cell" data-mode={mode} disabled={!task.editableSwitches}
											onfocus={() => selectPort(item.id)} onclick={() => cycleMembership(item.id, id)}
											aria-describedby="membership-cycle"
											aria-label={`${sw.name} port ${item.id}, ${item.peer}, ${vlanLabel(task, id)}: ${membershipLabels[mode]}. ${task.editableSwitches ? 'Bytt til ' + membershipLabels[nextMembership(mode)] + '.' : 'Ferdig oppsatt.'}`}
											title={`${membershipLabels[mode]}${task.editableSwitches ? ' → ' + membershipLabels[nextMembership(mode)] : ''}`}>
											{membershipSymbols[mode]}
										</button></td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<fieldset class="pvid-settings" disabled={!task.editableSwitches} aria-describedby="pvid-help">
					<legend>PVID · VLAN for umerket trafikk inn</legend>
					<div class="pvid-grid">
						{#each sw.ports as item (item.id)}
							<label class:selected-port={selected === switchId && portId === item.id}>Port {item.id}<small>{item.peer}</small>
								<select value={switchConfig.ports[item.id].pvid} onfocus={() => selectPort(item.id)}
									onchange={(event) => {
										if (!task.editableSwitches || !switchConfig) return;
										selectPort(item.id);
										switchConfig.ports[item.id].pvid = Number(event.currentTarget.value);
										changed();
									}}>
									{#each switchConfig.vlans as id}<option value={id}>{vlanLabel(task, id)}</option>{/each}
								</select>
							</label>
						{/each}
					</div>
				</fieldset>
				<p class="setting-status" role="status">{portMessage}</p>
				<div class="membership-help">
					<p><strong>U · Untagged:</strong> send uten tag. <strong>E · Exclude:</strong> ikke medlem. <strong>T · Tagged:</strong> send med VLAN-ID.</p>
					<p id="pvid-help"><strong>PVID</strong> velger VLAN for umerket trafikk inn. Når du setter U på et nytt VLAN, blir tidligere U til E på samme port. PVID endres ikke automatisk. Kontroller PVID når du flytter en PC-port til et annet VLAN.</p>
				</div>
			{/if}
			</div>
			<div class="editor-footer">
				<p class="muted">{passed ? 'Oppsettet består kontrollen. Se resultatet og veien videre i testområdet.' : checkStale ? 'Oppsettet er endret. Kontroller det på nytt før du går videre.' : 'Når oppsettet er klart, kontrollerer du hele oppdraget i testområdet.'}</p>
				<a class="action-link primary" href="#testing">Gå til testing ↓</a>
			</div>
		</section>
	</div>
	<section class="testing" id="testing" aria-labelledby="test-title" tabindex="-1">
		<div class="panel-heading"><h2 id="test-title">Test oppsettet og gå videre</h2><div class="map-links"><a href="#pc-editor">PC-innstillinger ↑</a><a href="#device-editor">Switcher og VLAN ↑</a></div></div>
		<p>«Kontroller oppdraget» tester hele oppsettet: adresser, porter, kommunikasjon og skillet mellom nettverkene. Alle krav må bestås før neste oppdrag åpnes.</p>
		<div class="actions">
			<button type="button" class="primary" onclick={check}>Kontroller oppdraget</button>
			{#if index < vlanTasks.length - 1}
				<button class="secondary" type="button" disabled={!passed} aria-describedby="check-status" onclick={() => selectTask(vlanTasks[index + 1].id)}>Neste oppdrag →</button>
			{/if}
			<button type="button" class="secondary" disabled={hints >= task.hints.length} onclick={() => hints += 1}>Vis {hints ? 'neste ' : ''}hint</button>
		</div>
		<div class="check-result" class:passed>
			<p id="check-status" role="status">{checkStale ? 'Oppsettet er endret etter kontrollen. Kontroller på nytt.' : attempt.check ? passed ? index < vlanTasks.length - 1 ? '✓ Oppsettet består. Neste oppdrag er åpent.' : `✓ Oppsettet består. Du har bestått alle ${vlanTasks.length} oppdrag.` : `${missingRows.length} krav gjenstår. Rett oppsettet og kontroller igjen.` : 'Kontrollen er ikke kjørt ennå.'}</p>
			{#if attempt.check}
				{#if !passed && !checkStale}
					<p class="muted">Start med {missingRows.length > 3 ? 'disse kravene. Hele listen kan åpnes under.' : 'det som gjenstår:'}</p>
					<ul>{#each missingRows.slice(0, 3) as row}<li><strong>Mangler</strong> · {row.label}
						<div class="check-links">{#each row.targets as destination}<button type="button" class="secondary" onclick={() => inspect(destination)}>Se {targetLabel(destination)} ↑</button>{/each}</div>
					</li>{/each}</ul>
				{/if}
				<details><summary>Hele kontrollisten · {attempt.check.result.rows.filter((row) => row.ok).length} av {attempt.check.result.rows.length} krav {checkStale ? 'i forrige kontroll' : 'oppfylt'}</summary>
					<ul>{#each attempt.check.result.rows as row}<li class:met={row.ok}><strong>{row.ok ? '✓ OK' : 'Mangler'}</strong> · {row.label}
						{#if !row.ok && !checkStale}<div class="check-links">{#each row.targets as destination}<button type="button" class="secondary" onclick={() => inspect(destination)}>Se {targetLabel(destination)} ↑</button>{/each}</div>{/if}
					</li>{/each}</ul>
				</details>
			{/if}
		</div>
		{#if hints}<aside class="hints" aria-label="Hint" aria-live="polite">{#each task.hints.slice(0, hints) as hint}<p>{hint}</p>{/each}</aside>{/if}
		{#if passed}
			<div class="reflection"><h3>Forklar for en medelev</h3><p>{task.reflect}</p><p class="muted">Bestått kontroll viser at oppsettet virker i modellen. Forklaringen og et nytt oppsett viser mer av hva du forstår.</p></div>
			{#if index === vlanTasks.length - 1}<p>Prøv prinsippene i Packet Tracer eller på labens switcher sammen med læreren.</p>{/if}
		{/if}
		<p><a href="#map-ping">Til ping ved kartet ↑</a></p>
	</section>
	<details class="model-notes"><summary>Om modellen og videre arbeid</summary>
		<p>Dette er en lokal simulering. Ingen ping eller konfigurasjon sendes til skolens nett. Modellen bruker faste kabler uten løkker, IPv4 med /24, PVID og VLAN-medlemskap. PC-ene bruker ikke VLAN-tagging.</p>
		<p>Ruting, DHCP, ARP-tabeller, MAC-læring, STP og leverandørspesifikke kommandoer er ikke simulert. Tagged/untagged beskriver trafikken på en port; begrepene og standardvalgene kan variere mellom switchmerker.</p>
		<p>Labpartneren får valgt oppdrag, enhet og port samt om et forsøk er kjørt eller utdatert. IP-adressene, portoppsettet og testresultatet deles ikke i utkastet.</p>
		<p><strong>Ny anvendelse:</strong> Tegn først port- og adresseplanen for to nye VLAN med andre ID-er. Bygg den på reelt utstyr eller i Packet Tracer, og dokumenter en forbindelse som virker og en som skal være adskilt.</p>
	</details>
	<div class="reset">
		{#if resetPending}<p>Dette fjerner alle endringer og testresultater i dette oppdraget. Arbeidet i de andre oppdragene beholdes, men senere oppdrag låses til dette består kontrollen igjen.</p><button type="button" onclick={resetTask}>Nullstill dette oppdraget</button><button type="button" onclick={() => resetPending = false}>Avbryt</button>
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
	.progress-rule { font-size: var(--font-small); margin-bottom: 0; }
	.progress-note { margin: 10px 0 24px; }
	.mission { border-left: 4px solid var(--color-accent); padding: 18px 24px; background: var(--color-surface); border-radius: 0 12px 12px 0; margin-bottom: 20px; }
	.goal { max-width: 75ch; }
	.ready { max-width: 75ch; font-size: var(--font-small); }
	.mission-layout { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 24px; margin: 24px 0; }
	.task-steps { padding-left: 24px; margin: 0; font-size: var(--font-small); }
	.task-steps li + li { margin-top: 12px; }
	.network-plan { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
	.network-plan li { display: grid; gap: 4px; padding: 12px 16px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface-soft); font-size: var(--font-small); overflow-wrap: anywhere; }
	.network-plan small { color: var(--color-text-muted); font-size: var(--font-meta); }
	summary { cursor: pointer; min-height: 44px; padding: 10px 0; font-weight: 650; }
	.theory p { max-width: 75ch; }
	.workspace-links { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 16px; }
	.workspace-links a, .action-link { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 9px 14px; border: 1px solid var(--color-border-strong); border-radius: 8px; text-decoration: none; font-size: var(--font-small); }
	.workspace-links a:hover, .action-link.secondary:hover { background: var(--color-surface-hover); }
	.workspace-links .test-shortcut { font-weight: 650; border-color: var(--color-accent); background: var(--color-accent-soft); }
	#network-panel, #map-title, #map-ping, #packet-controls, #pc-editor, #pc-editor-title, #device-editor, #editor-title, #testing, .vlan-matrix th { scroll-margin-top: 24px; }
	.network-workspace { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-areas: "ping" "map" "pc"; gap: 20px; align-items: start; }
	.map-area { grid-area: map; min-width: 0; }
	.map-ping { grid-area: ping; padding: 18px; min-width: 0; border: 1px solid var(--color-border-strong); border-radius: 10px; background: var(--color-surface-soft); }
	.map-ping p { margin-bottom: 0; }
	.map-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-height: 52px; margin-bottom: 12px; font-size: var(--font-small); }
	.map-toolbar button { padding: 8px 10px; }
	.ping-status { font-weight: 650; }
	.ping-status.success { color: var(--color-success); }
	.pc-editor { grid-area: pc; min-width: 0; padding: 18px; border: 1px solid var(--color-border-strong); border-radius: 10px; background: var(--color-surface-soft); }
	.pc-editor h3 { margin-bottom: 16px; }
	.pc-editor .pc-connection { font-size: var(--font-small); margin-block: 16px; }
	.pc-editor .target-vlan { font-size: var(--font-small); }
	.pc-editor > button { width: 100%; font-size: var(--font-small); }
	.pc-back { display: inline-flex; align-items: center; min-height: 44px; margin-top: 8px; font-size: var(--font-small); }
	.map-links, .switch-picker, .check-links { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
	.map-links a { display: inline-flex; align-items: center; min-height: 44px; font-size: var(--font-small); }
	.map-panel > .map-links { margin-top: 12px; }
	.switch-picker { margin: 4px 0 20px; gap: 8px; }
	.switch-picker button { min-width: 72px; font-weight: 650; }
	.switch-picker button[aria-pressed='true'] { border-color: var(--color-accent); background: var(--color-accent-soft); box-shadow: inset 0 -3px 0 var(--color-accent); }
	.check-links { margin-top: 8px; gap: 8px; }
	.check-links button { font-size: var(--font-small); text-align: left; }
	.vlans form { max-width: 480px; }
	.editor-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--color-border); }
	.editor-footer p { margin: 0; max-width: 65ch; }
	.map-playback { padding: 16px; margin: 16px 0; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface-soft); }
	.map-playback .trace { max-width: 75ch; }
	.check-result.passed { border-left: 3px solid var(--color-success); padding-left: 16px; }
	.workspace { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
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
	.membership-legend { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 20px; font-size: var(--font-small); }
	.membership-legend span { display: inline-flex; align-items: center; gap: 6px; }
	.membership-legend strong { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 4px; }
	.untagged-key { color: var(--color-success); background: var(--color-success-soft); }
	.excluded-key { color: var(--color-text-muted); background: var(--color-surface-soft); }
	.tagged-key { color: var(--color-info); background: var(--color-info-soft); }
	.matrix-scroll { max-width: 100%; overflow-x: auto; border: 1px solid var(--color-border); border-radius: 8px; }
	.vlan-matrix { width: 100%; border-collapse: collapse; font-size: var(--font-small); }
	.vlan-matrix caption { padding: 10px 12px; text-align: left; font-weight: 650; background: var(--color-surface-soft); }
	.vlan-matrix th, .vlan-matrix td { padding: 10px 6px; text-align: center; border-top: 1px solid var(--color-border); }
	.vlan-matrix thead th { font-weight: 500; font-size: var(--font-meta); color: var(--color-text-muted); }
	.vlan-matrix thead strong { display: block; color: var(--color-text); font-size: var(--font-small); }
	.vlan-matrix .selected-port { background: var(--color-accent-soft); }
	.vlan-matrix th.selected-port { box-shadow: inset 0 3px 0 var(--color-accent); }
	.port-selection { display: block; min-height: 1.5em; color: var(--color-accent); }
	.vlan-matrix th:nth-child(2), .vlan-matrix .vlan-name { text-align: left; }
	.vlan-name { min-width: 5rem; overflow-wrap: anywhere; }
	.vlan-matrix tbody tr:nth-child(even) { background: var(--color-surface-soft); }
	.membership-cell { display: inline-grid; place-items: center; width: 44px; height: 44px; padding: 0; border-radius: 4px; font-size: 1.125rem; font-weight: 750; }
	.membership-cell[data-mode='untagged'] { color: var(--color-success); background: var(--color-success-soft); border-color: var(--color-success); }
	.membership-cell[data-mode='excluded'] { color: var(--color-text-muted); background: var(--color-surface); }
	.membership-cell[data-mode='tagged'] { color: var(--color-info); background: var(--color-info-soft); border-color: var(--color-info); }
	.membership-cell:not(:disabled):hover { box-shadow: inset 0 0 0 2px currentColor; }
	.membership-cell:disabled { opacity: 1; }
	.pvid-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
	.pvid-grid label { margin: 0; padding: 10px; border: 1px solid transparent; border-radius: 8px; }
	.pvid-grid label.selected-port { border-color: var(--color-accent); background: var(--color-accent-soft); }
	.pvid-grid small { display: block; font-size: var(--font-meta); font-weight: 400; color: var(--color-text-muted); overflow-wrap: anywhere; }
	.pvid-grid select { font-size: var(--font-small); }
	.membership-help { font-size: var(--font-small); margin-top: 16px; border-top: 1px solid var(--color-border); }
	.primary { background: var(--color-action); color: var(--color-on-action); border-color: var(--color-action); font-weight: 650; }
	.primary:hover { background: var(--color-action); filter: brightness(1.08); }
	.secondary { color: var(--color-accent); font-weight: 650; }
	.testing { margin-top: 20px; border: 2px solid var(--color-accent); }
	.ping-controls { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; align-items: end; }
	.ping-controls label { display: grid; grid-template-columns: 2rem minmax(0, 1fr); gap: 8px; align-items: center; margin: 0; }
	.ping-controls select { margin-top: 0; font-size: var(--font-small); }
	.ping-controls button { grid-column: 1 / -1; }
	.actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
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
	:is(button, input, select, summary, a, [tabindex]):focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	@media (min-width: 1100px) { .network-workspace { grid-template-columns: minmax(0, 1fr) 300px; grid-template-areas: "map ping" "map pc"; grid-template-rows: auto 1fr; } .pc-back { display: none; } }
	@media (max-width: 700px) { .mission-layout { grid-template-columns: minmax(0, 1fr); } }
	@media (max-width: 600px) { .tasks { grid-template-columns: 1fr; } .map-panel, .editor, .testing, .mission { padding: 16px; } }
</style>
