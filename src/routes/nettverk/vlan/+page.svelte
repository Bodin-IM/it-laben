<script>
	import { onMount, tick, untrack } from 'svelte';
	import { teacherPreview } from '#lib/teacherPreview.js';
	import { untaggedVlan } from '#lib/networkCheckFeedback.js';
	import VlanMap from '#lib/components/VlanMap.svelte';
	import NetworkCheckDialog from '#lib/components/NetworkCheckDialog.svelte';
	import { createNetworkEditorNavigation } from '#lib/networkEditorNavigation.js';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	import { lab, learningContext } from '#lib/lab.js';
	import { loadNetworkLab, saveNetworkCheck } from '#lib/networkLabApi.js';
	import { createVlanAudio } from '#lib/vlanAudio.js';
	import { labPreferences, reducedMotion, registerSoundPlayer } from '#lib/labPreferences.js';
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
	let showCheck = $state(false);
	const navigation = createNetworkEditorNavigation(() => $reducedMotion);
	let showMapHelp = $state(false);
	let showPingDetails = $state(false);
	const controlAudio = createVlanAudio();
	onMount(() => {
		const unregisterSound = registerSoundPlayer(controlAudio);
		return () => {
			navigation.cancel();
			unregisterSound();
			controlAudio.destroy();
		};
	});
	let hints = $state(0);
	let vlanInput = $state('');
	let settingMessage = $state('');
	let portMessage = $state('');
	let resetPending = $state(false);
	let loadingSaved = $state(false);
	let saving = $state(false);
	let saveMessage = $state('');
	let loadError = $state(false);
	let lab2Unlocked = $state(false);
	let loadSequence = 0;
	const scope = $derived(`${$lab.user?.id ?? 'guest'}:${$teacherPreview}:${$learningContext.mode}:${$learningContext.openingId ?? ''}`);
	$effect(() => {
		scope;
		work = freshWork();
		taskId = 'ip';
		resetSelection();
		untrack(() => { void restoreSaved(); });
	});
	async function restoreSaved() {
		const sequence = ++loadSequence, currentScope = scope;
		lab2Unlocked = false; saveMessage = ''; loadError = false; saving = false;
		if (!$lab.user || ($learningContext.mode !== 'normal' && !$teacherPreview)) { loadingSaved = false; return; }
		loadingSaved = true;
		try {
			const saved = await loadNetworkLab('vlan-lab', $teacherPreview);
			if (scope !== currentScope || sequence !== loadSequence) return;
			for (const item of saved.tasks) {
				const current = work[item.taskId];
				if (current && current.revision === 0 && !current.check) {
					const result = checkVlanTask(vlanTask(item.taskId), item.config);
					work[item.taskId] = { config: item.config, revision: 0, run: null, check: { revision: 0, result } };
				}
			}
			lab2Unlocked = saved.prerequisitePassed;
			saveMessage = saved.tasks.length ? `${saved.tasks.length} beståtte oppsett hentet fra kontoen.` : '';
		} catch (error) {
			if (scope === currentScope && sequence === loadSequence) { loadError = true; saveMessage = error instanceof Error ? error.message : 'Kunne ikke hente lagrede oppsett.'; }
		} finally { if (scope === currentScope && sequence === loadSequence) loadingSaved = false; }
	}
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
	const availableThrough = $derived($teacherPreview ? vlanTasks.length - 1 : vlanAvailableThrough(work));
	const missingRows = $derived(attempt.check?.result.rows.filter((row) => !row.ok) ?? []);
	const checkTotal = $derived(attempt.check?.result.rows.length ?? 0);
	const checkPassedCount = $derived(checkTotal - missingRows.length);
	const activeStep = $derived(run && !stale ? run.result.steps[frame] ?? null : null);
	const playbackComplete = $derived(!!run && !stale && frame === run.result.steps.length - 1 && travelProgress === 1);
	const pingStatus = $derived(stale ? 'Endret. Send ping på nytt.' : !run ? 'Ingen ping kjørt.' : playbackComplete ? run.result.ok ? 'Ping: svar mottatt.' : 'Ping: ingen svar. Åpne Detaljer for å undersøke.' : playing ? 'Ping pågår.' : 'Ping satt på pause.');
	const completed = $derived(vlanTasks.filter((item) => vlanCheckPassed(work[item.id])).length);
	$effect(() => {
		const currentRun = run, currentFrame = frame;
		if (!currentRun || stale) { playing = false; return; }
		if ($reducedMotion) { playing = false; travelProgress = 1; return; }
		if (!playing) return;
		const lastFrame = currentRun.result.steps.length - 1;
		const initialProgress = untrack(() => travelProgress);
		let started = 0;
		let request = 0;
		/** @param {number} now */
		function advance(now) {
			if (!started) started = now;
			const elapsed = now - started + initialProgress * 650;
			travelProgress = Math.min(1, elapsed / 650);
			if (elapsed >= 1000) {
				if (currentFrame < lastFrame) { travelProgress = 0; frame = currentFrame + 1; }
				else playing = false;
			} else request = requestAnimationFrame(advance);
		}
		request = requestAnimationFrame(advance);
		return () => cancelAnimationFrame(request);
	});
	$effect(() => { if ($reducedMotion) navigation.cancel(); });
	function resetSelection() {
		showCheck = false; navigation.cancel();
		controlAudio.stop();
		selected = 'pc1'; pcId = 'pc1'; switchId = 's1'; portId = 'eth0'; source = 'pc1'; target = 'pc2'; frame = 0; playing = false; travelProgress = 1;
		hints = 0; vlanInput = ''; settingMessage = ''; portMessage = ''; resetPending = false;
		showMapHelp = false; showPingDetails = false;
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
	/** @param {import('#lib/vlanLab.js').VlanCheckTarget} destination */
	async function inspect(destination) {
		showCheck = false;
		if (task.pcs.some((item) => item.id === destination.deviceId)) {
			selectPc(destination.deviceId);
			await navigation.reveal('pc-editor-title', 'pc-editor');
		} else if (task.switches.some((item) => item.id === destination.deviceId)) {
			selectSwitch(destination.deviceId);
			if (destination.portId && sw?.ports.some((item) => item.id === destination.portId)) {
				portId = destination.portId;
				await navigation.reveal(`port-heading-${portId}`, 'device-editor');
			} else await navigation.reveal('editor-title', 'device-editor');
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
	function changed() { showCheck = false; saveMessage = ''; controlAudio.stop(); playing = false; attempt.revision += 1; portMessage = ''; showPingDetails = false; }
	function changePingPair() { playing = false; showPingDetails = false; }
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
		item.pvid = untaggedVlan(item) ?? 1;
		changed();
		portMessage = `${sw?.name} port ${id}, VLAN ${vlan}: ${membershipLabels[mode]}.`;
		if (mode === 'untagged') {
			if (previousUntagged !== undefined) portMessage += ` VLAN ${previousUntagged} ble satt til Exclude på samme port.`;
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
		if (Object.values(switchConfig.ports).some((item) => membership(item, id) !== 'excluded')) {
			settingMessage = `VLAN ${id} er i bruk. Sett portene til Exclude først.`; return;
		}
		switchConfig.vlans = switchConfig.vlans.filter((vlan) => vlan !== id);
		for (const item of Object.values(switchConfig.ports)) { delete item.members[String(id)]; item.pvid = untaggedVlan(item) ?? 1; }
		changed(); settingMessage = `VLAN ${id} er fjernet.`;
		await tick();
		document.getElementById('new-vlan')?.focus();
	}
	function ping() {
		if (source === target) return;
		playing = false;
		attempt.run = { revision: attempt.revision, source, target, result: pingVlan(task, config, source, target) };
		frame = $reducedMotion ? attempt.run.result.steps.length - 1 : 0;
		travelProgress = $reducedMotion ? 1 : 0;
		playing = !$reducedMotion;
	}
	/** @param {number} delta */
	function stepFrame(delta) {
		if (!run || stale) return;
		playing = false;
		frame = Math.max(0, Math.min(run.result.steps.length - 1, frame + delta));
		travelProgress = 1;
	}
	function togglePlayback() {
		if (!run || stale || $reducedMotion) return;
		if (playing) { playing = false; return; }
		if (playbackComplete) { frame = 0; travelProgress = 0; }
		playing = true;
	}
	async function check() {
		if (saving || loadingSaved) return;
		playing = false;
		const currentScope = scope, id = taskId, revision = attempt.revision, submittedAttempt = attempt;
		const submitted = JSON.parse(JSON.stringify(config));
		const result = checkVlanTask(task, config);
		attempt.check = { revision: attempt.revision, result };
		showCheck = true;
		if ($labPreferences.sound) void controlAudio.play(result.passed, $labPreferences.volume);
		if (!$lab.user || ($learningContext.mode !== 'normal' && !$teacherPreview)) {
			saveMessage = 'Kontrollert lokalt. Logg inn og bruk vanlig modus for å lagre bestått og åpne lab 2.'; return;
		}
		saving = true; saveMessage = $teacherPreview ? 'Kontrollerer forhåndsvisningen …' : 'Kontrollerer og lagrer på serveren …';
		try {
			const saved = await saveNetworkCheck('vlan-lab', id, submitted, $teacherPreview);
			if (scope !== currentScope) return;
			if (work[id] === submittedAttempt && work[id].revision === revision) work[id].check = { revision, result: saved.result };
			lab2Unlocked = saved.prerequisitePassed;
			saveMessage = $teacherPreview ? 'Lærerforhåndsvisning · kontrollert uten å lagre bestått.' : saved.saved ? 'Bestått oppsett lagret på kontoen.' : 'Kontrollen fant feil. Tidligere beståtte oppsett beholdes.';
		} catch (error) {
			if (scope === currentScope) saveMessage = `Ikke lagret. ${error instanceof Error ? error.message : 'Prøv kontrollen igjen.'}`;
		} finally { if (scope === currentScope) saving = false; }
	}
	async function resetTask() {
		work[taskId] = { config: initialVlanConfig(task), revision: attempt.revision + 1, run: null, check: null };
		resetSelection();
		await tick();
		document.getElementById('task-heading')?.focus();
	}
</script>

<svelte:head>
	<title>VLAN-lab 1 – IT-laben</title>
	<meta name="description" content="Konfigurer IP-adresser og VLAN, følg trafikken og bygg trunk gjennom tre switcher." />
</svelte:head>

<PartnerContext pageId="vlan-lab" values={{ taskId, deviceId: selected, portId: selected === switchId ? portId : null, hints, hasRun: !!run || !!attempt.check, stale: stale || checkStale, revision: attempt.revision }} />

<main id="hovedinnhold" class="vlan-page" tabindex="-1">
	<a class="back" href="/?fag=drift">← Driftsstøtte</a>
	<header class="hero">
		<p class="eyebrow">DRIFTSSTØTTE · VLAN-LAB 1</p>
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
	<p class="progress-rule" id="progress-rule">{#if $teacherPreview}Lærerforhåndsvisning · alle oppdrag åpne. <a href='/min-lab/?visning=innstillinger#laererinnstillinger'>Innstillinger</a>{:else}{completed}/{vlanTasks.length} bestått · Bestå kontrollen for å åpne neste oppdrag.{/if}</p>
	{#if loadingSaved}<p role="status">{$teacherPreview ? 'Henter forhåndsvisningen …' : 'Henter beståtte oppsett …'}</p>{/if}
	{#if loadError}<p role="alert">{saveMessage}</p><button type="button" onclick={restoreSaved}>Hent lagrede oppsett på nytt</button>{/if}
	{#if $teacherPreview}<p><a href="/nettverk/vlan-2/">Åpne VLAN-lab 2 →</a></p>{:else if lab2Unlocked}<p><a href="/nettverk/vlan-2/">✓ VLAN-lab 1 bestått · Start lab 2: Ruter og Wi-Fi →</a></p>{:else}<p class="muted"><a href="/nettverk/vlan-2/">VLAN-lab 2</a> åpnes når alle seks oppdrag er bestått og lagret.</p>{/if}
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
		<a class="test-shortcut" href="#quick-check">Kontroll</a>
	</nav>
	<div class="workspace">
		<section class="map-panel" id="network-panel" aria-labelledby="map-title" tabindex="-1">
			<div class="panel-heading"><h2 id="map-title" tabindex="-1">Nettverket ditt</h2><span class="muted">{task.switches.length} switch{task.switches.length > 1 ? 'er' : ''} · /24</span></div>
			<div class="network-workspace">
				<div class="map-area">
					<VlanMap {task} {config} {selected} onselect={selectDevice} step={activeStep} progress={travelProgress} vlanDiagnostic={!stale && !!run?.result.vlanDiagnostic} />
					<section class="map-ping" id="map-ping" aria-label="Ping" tabindex="-1">
						<div class="ping-bar">
							<form class="ping-controls" onsubmit={(event) => { event.preventDefault(); ping(); }}>
								<label>Fra<select bind:value={source} onchange={changePingPair}>{#each task.pcs as item}<option value={item.id}>{item.name}</option>{/each}</select></label>
								<label>Til<select bind:value={target} onchange={changePingPair}>{#each task.pcs as item}<option value={item.id}>{item.name}</option>{/each}</select></label>
								<button type="submit" class="primary" disabled={source === target}>Ping</button>
							</form>
							<div class="ping-tools">
								<span class="ping-status" class:success={playbackComplete && run?.result.ok} class:failure={playbackComplete && !run?.result.ok} role="status" aria-atomic="true" title={pingStatus}>
									<span aria-hidden="true">{!run || stale ? '—' : playbackComplete ? run.result.ok ? '✓' : '×' : playing ? '…' : 'Ⅱ'}</span><span class="sr-only">{pingStatus}</span>
								</span>
								<button type="button" class="playback-toggle" disabled={!run || stale || $reducedMotion} onclick={togglePlayback}
									aria-label={playing ? 'Pause ping' : playbackComplete ? 'Spill ping av igjen' : 'Fortsett ping'} title={playing ? 'Pause' : playbackComplete ? 'Spill av igjen' : 'Fortsett'}><span aria-hidden="true">{playing ? 'Ⅱ' : playbackComplete ? '↻' : '▶'}</span></button>
								<button type="button" class="disclosure" disabled={!run || stale} aria-expanded={showPingDetails && !!run && !stale} aria-controls="ping-details" onclick={() => showPingDetails = !showPingDetails}>Detaljer</button>
								<button type="button" class="disclosure" aria-expanded={showMapHelp} aria-controls="map-help" onclick={() => showMapHelp = !showMapHelp}>Hjelp</button>
							</div>
						</div>
						<div class="ping-details" id="ping-details" hidden={!showPingDetails || !run || stale}>
							{#if run && !stale}
								{#if run.result.vlanDiagnostic}<p class="muted">Kartet viser hvor VLAN-oppsettet sperrer forbindelsen. PC-ene er også i ulike IP-nett: selve ping-forsøket trenger ruting, som ikke finnes i denne laben.</p>{/if}
								<div class="map-toolbar" role="group" aria-label="Undersøk pakkesteg">
									<button type="button" disabled={frame === 0} onclick={() => stepFrame(-1)}>← Forrige</button>
									<span>Steg {frame + 1} av {run.result.steps.length}</span>
									<button type="button" disabled={frame >= run.result.steps.length - 1} onclick={() => stepFrame(1)}>Neste →</button>
								</div>
								<p class="trace" aria-live={showPingDetails ? 'polite' : 'off'}>{!activeStep?.ok && travelProgress === 1 ? 'Stopp:' : '→'} {activeStep?.text}</p>
								{#if playbackComplete}<p>{run.result.message}</p>{/if}
								{#if $reducedMotion}<p class="muted">Animasjon er av. Bruk Forrige og Neste for å undersøke pakken.</p>{/if}
							{/if}
						</div>
						<div class="map-help" id="map-help" hidden={!showMapHelp}>
							<p>Velg en PC i kartet for å endre IP, eller en switch for å se VLAN. Eth-navnene viser kabelportene.</p>
							<p>Ping: grønn hake = svar, rødt kryss = ingen svar. Pakken stopper der trafikken avvises. Åpne Detaljer for å finne årsaken.</p>
							{#if index < 2}<p>Forutsi utfallet før du sender. Ping undersøker ett PC-par. «Kontroller oppdraget» tester hele oppsettet og åpner neste del.</p>{/if}
							<h3>Kabler</h3>
							<ul>
								{#each task.pcs as item}<li>{item.name} ↔ {item.switchId.toUpperCase()} {item.port}</li>{/each}
								{#each task.links as link}<li>{link.a.toUpperCase()} {link.aPort} ↔ {link.b.toUpperCase()} {link.bPort}</li>{/each}
							</ul>
						</div>
					</section>
				</div>
				<div class="device-sidebar">
					<section class="pc-editor" id="pc-editor" aria-labelledby="pc-editor-title" tabindex="-1">
						<h3 id="pc-editor-title" tabindex="-1">{pc?.name ?? 'PC-innstillinger'}</h3>

						{#if pc}
							<p class="pc-connection">Koblet til <strong>{pc.switchId.toUpperCase()} {pc.port}</strong>.</p>
							<label for="pc-ip">IP-adresse</label>
							<div class="ip-with-mask"><input id="pc-ip" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" maxlength="15"
								value={config.ips[pc.id]} aria-describedby="ip-help pc-mask" onfocus={() => selectPc(pc.id)}
								oninput={(event) => { config.ips[pc.id] = event.currentTarget.value; changed(); }} /><span id="pc-mask" class="mask" title="Fast nettmaske: 255.255.255.0"><span aria-hidden="true">/24</span><span class="sr-only">Fast nettmaske 255.255.255.0, prefiks 24</span></span></div>
							<p class="muted" id="ip-help">{#if task.discoverPorts}Finn IP-nettet via portens U-rad.{:else}Mål: {pc.network}.0/24.{/if}</p>
							{#if !task.discoverPorts}<p class="target-vlan">Mål: {vlanLabel(task, pc.vlan)}</p>{/if}
							<button type="button" class="secondary" onclick={() => inspect({ deviceId: pc.switchId, portId: pc.port })}>Vis {pc.switchId.toUpperCase()} {pc.port} ↓</button>
							<details class="ip-help"><summary>IP-hjelp</summary><p>Fast maske: 255.255.255.0 (/24). Bruk en unik vertsadresse med siste tall 1–254.</p></details>
						{/if}
						<a class="pc-back" href="#network-panel">Tilbake til kartet ↑</a>
					</section>
					<section class="quick-check" id="quick-check" aria-labelledby="quick-check-title" tabindex="-1">
						<div class="quick-check-heading">
							<h3 id="quick-check-title">Kontroll</h3>
							<span class="check-count" class:success={passed} class:failure={!!attempt.check && !checkStale && !passed} role="status" aria-atomic="true">
								<span aria-hidden="true">{checkStale ? 'Endret' : attempt.check ? `${passed ? '✓' : '×'} ${checkPassedCount}/${checkTotal}` : '—'}</span>
								<span class="sr-only">{checkStale ? 'Oppsettet er endret. Kontroller på nytt.' : attempt.check ? `${checkPassedCount} av ${checkTotal} krav oppfylt. ${passed ? 'Oppdraget består.' : 'Åpne kontrollresultatet for å se feilene.'}` : 'Kontrollen er ikke kjørt.'}</span>
							</span>
						</div>
						<button type="button" class="primary" disabled={loadingSaved} aria-disabled={saving || loadingSaved} onclick={check}>{saving ? 'Kontrollerer …' : 'Kontroller oppdraget'}</button>
						{#if saveMessage}<small role="status">{saveMessage}</small>{/if}
						{#if attempt.check}<button type="button" class="disclosure" onclick={() => showCheck = true}>Se kontrollresultat</button>{/if}
						<a href="#testing">Hint og refleksjon ↓</a>
					</section>
				</div>
			</div>
		</section>
		<section class="editor" id="device-editor" aria-labelledby="editor-title" tabindex="-1">
			<div class="panel-heading"><h2 id="editor-title" tabindex="-1">{sw?.name} · Switcher og VLAN</h2><a href="#network-panel">Tilbake til kart og PC-er ↑</a></div>
			<div class="switch-picker" role="group" aria-label="Velg switch">
				{#each task.switches as item}
					<button type="button" aria-pressed={switchId === item.id} aria-controls="switch-settings" onclick={() => { selectSwitch(item.id); void navigation.reveal('editor-title', 'device-editor'); }}>{item.name}</button>
				{/each}
			</div>
			<div id="switch-settings">
			{#if sw && switchConfig}
				{#if !task.editableSwitches}<p class="muted">Ferdig oppsatt · kun visning</p>{/if}
				<details class="vlans" open={task.editableSwitches && !task.preconfigured}>
					<summary>{task.editableSwitches ? 'Opprett og fjern VLAN' : 'VLAN på ' + sw.name} · {switchConfig.vlans.join(', ')}</summary>
					{#if task.editableSwitches}
						<div class="vlan-management">
							<form onsubmit={(event) => { event.preventDefault(); addVlan(); }}>
								<label for="new-vlan">Opprett VLAN-ID (1–4094)</label>
								<div class="add-vlan"><input id="new-vlan" type="text" inputmode="numeric" maxlength="4" bind:value={vlanInput} onfocus={() => selectSwitch(switchId)} /><button type="submit" class="secondary">Legg til</button></div>
							</form>
							<div class="vlan-list">{#each switchConfig.vlans.filter((id) => id !== 1) as id}<button type="button" onclick={() => removeVlan(id)}>Fjern VLAN {id}</button>{/each}</div>
						</div>
					{:else}<p>VLAN-ene er opprettet på forhånd.</p>{/if}
				</details>
				<p class="setting-status" role="status">{settingMessage}</p>
				<div class="matrix-panel">
					<div class="matrix-heading">
						<h3 id="membership-title">{sw.name} · VLAN-medlemskap</h3>
						<div class="membership-legend" role="group" aria-label="Betydningen av bokstavene">
							<span><strong class="untagged-key">U</strong> Untagged</span>
							<span><strong class="excluded-key">E</strong> Exclude</span>
							<span><strong class="tagged-key">T</strong> Tagged</span>
						</div>
					</div>
					<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to focus this region to scroll the wide table.) -->
					<div class="matrix-scroll" role="region" aria-label="VLAN-tabell. Rull vannrett ved behov." tabindex="0">
					<table class="vlan-matrix" aria-labelledby="membership-title">
						<thead><tr>
							<th scope="col">ID</th><th scope="col">Navn</th>
							{#each sw.ports as item (item.id)}
								<th scope="col" class:selected-port={selected === switchId && portId === item.id} id={`port-heading-${item.id}`} tabindex="-1"><span>Port</span><strong>{item.id}</strong><small class="port-peer">{item.peer}</small><span class="port-selection">{selected === switchId && portId === item.id ? 'Valgt' : ''}</span></th>
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
				</div>

				<p class="setting-status" role="status">{portMessage}</p>
				<details class="membership-help">
					<summary>Hjelp til U, E og T</summary>
					<p id="membership-cycle">{task.editableSwitches ? 'Trykk på en portrute for å bytte: U → E → T → U. Hver rad gjelder ett VLAN.' : 'Hver rad viser ett VLAN. Bokstaven i portruten viser portens medlemskap.'}</p>
					<p><strong>U · Untagged:</strong> send uten tag. <strong>E · Exclude:</strong> ikke medlem. <strong>T · Tagged:</strong> send med VLAN-ID.</p>
					<p>I denne laben velger <strong>U</strong> også VLAN for umerket trafikk inn. Ny U erstatter tidligere U på samme port. En port uten U avviser umerket trafikk.</p>
				</details>
			{/if}
			</div>
			<div class="editor-footer">
				<p class="check-count" class:success={passed} class:failure={!!attempt.check && !checkStale && !passed}>{checkStale ? 'Endret · kontroller på nytt' : attempt.check ? `${passed ? '✓' : '×'} ${checkPassedCount}/${checkTotal}` : 'Kontroll'}</p>
				<button type="button" class="primary" disabled={loadingSaved} aria-disabled={saving || loadingSaved} onclick={check}>{saving ? 'Kontrollerer …' : 'Kontroller oppdraget'}</button>
			</div>
		</section>
	</div>
	<section class="testing" id="testing" aria-labelledby="test-title" tabindex="-1">
		<div class="panel-heading"><h2 id="test-title">Hint og neste oppdrag</h2><div class="map-links"><a href="#quick-check">Til kontroll ↑</a><a href="#device-editor">Switcher og VLAN ↑</a></div></div>

		<div class="actions">
			{#if index < vlanTasks.length - 1}
				<button class="secondary" type="button" disabled={!passed && !$teacherPreview} aria-describedby="check-status" onclick={() => selectTask(vlanTasks[index + 1].id)}>Neste oppdrag →</button>
			{/if}
			<button type="button" class="secondary" disabled={hints >= task.hints.length} onclick={() => hints += 1}>Vis {hints ? 'neste ' : ''}hint</button>
		</div>
		<div class="check-result" class:passed>
			<p id="check-status">{checkStale ? 'Oppsettet er endret etter kontrollen. Kontroller på nytt.' : attempt.check ? passed ? index < vlanTasks.length - 1 ? '✓ Oppsettet består. Neste oppdrag er åpent.' : $teacherPreview ? '✓ Oppsettet består forhåndsvisningen.' : `✓ Oppsettet består. Du har bestått alle ${vlanTasks.length} oppdrag.` : `${missingRows.length} krav gjenstår. Rett oppsettet og kontroller igjen.` : 'Kontrollen er ikke kjørt ennå.'}</p>
			{#if attempt.check}<button type="button" onclick={() => showCheck = true}>Se kontrollresultat</button>{/if}
		</div>
		{#if hints}<aside class="hints" aria-label="Hint" aria-live="polite">{#each task.hints.slice(0, hints) as hint}<p>{hint}</p>{/each}</aside>{/if}
		{#if passed}
			<div class="reflection"><h3>Forklar for en medelev</h3><p>{task.reflect}</p><p class="muted">Bestått kontroll viser at oppsettet virker i modellen. Forklaringen og et nytt oppsett viser mer av hva du forstår.</p></div>
			{#if index === vlanTasks.length - 1}<p>Prøv prinsippene i Packet Tracer eller på labens switcher sammen med læreren.</p>{/if}
		{/if}
		<p><a href="#map-ping">Til ping ved kartet ↑</a></p>
	</section>
	<details class="model-notes"><summary>Om modellen, lagring og videre arbeid</summary>
		<p>Beståtte oppsett lagres på kontoen i vanlig modus. Omlasting henter sist beståtte versjon; ukontrollerte endringer beholdes bare mens siden er åpen. Endrede oppsett må kontrolleres på nytt før neste oppdrag åpnes. Ingen XP.</p>
		<p>Dette er en lokal simulering. Ingen ping eller konfigurasjon sendes til skolens nett. Modellen bruker faste kabler uten løkker, IPv4 med /24 og VLAN-medlemskap. PC-ene bruker ikke VLAN-tagging.</p>
		<p>Ruting, DHCP, ARP-tabeller, MAC-læring, STP og leverandørspesifikke kommandoer er ikke simulert. Tagged/untagged beskriver trafikken på en port; begrepene og standardvalgene kan variere mellom switchmerker.</p>
		<p>Labpartneren får valgt oppdrag, enhet og port samt om et forsøk er kjørt eller utdatert. IP-adressene, portoppsettet og testresultatet deles ikke i utkastet.</p>
		<p><strong>Ny anvendelse:</strong> Tegn først port- og adresseplanen for to nye VLAN med andre ID-er. Bygg den på reelt utstyr eller i Packet Tracer, og dokumenter en forbindelse som virker og en som skal være adskilt.</p>
	</details>
	<div class="reset">
		{#if resetPending}<p>Dette fjerner alle endringer og testresultater i dette oppdraget. Arbeidet i de andre oppdragene beholdes, men senere oppdrag låses til dette består kontrollen igjen.</p><button type="button" onclick={resetTask}>Nullstill dette oppdraget</button><button type="button" onclick={() => resetPending = false}>Avbryt</button>
		{:else}<button type="button" onclick={() => resetPending = true}>Start dette oppdraget på nytt</button>{/if}
	</div>
</main>

<NetworkCheckDialog bind:open={showCheck} title={`Oppdrag ${index + 1} · ${task.title}`}
	rows={(attempt.check?.result.rows ?? []).map((row) => ({ ...row, targets: row.targets.map((destination) => ({ ...destination, label: targetLabel(destination) })) }))}
	stale={checkStale} status={saveMessage} nextDisabled={saving}
	nextLabel={index < vlanTasks.length - 1 ? 'Neste oppdrag →' : (lab2Unlocked || $teacherPreview) ? 'Start VLAN-lab 2 →' : ''}
	onnext={() => { if (index < vlanTasks.length - 1) void selectTask(vlanTasks[index + 1].id); else window.location.assign('/nettverk/vlan-2/'); }}
	oninspect={inspect} />

<style>
	.ip-with-mask { display: flex; align-items: stretch; margin-top: 6px; }
	.ip-with-mask input { flex: 1; margin: 0; border-radius: 8px 0 0 8px; }
	.mask { display: inline-flex; align-items: center; padding: 0 0.55rem; border: 1px solid var(--color-border-strong); border-left: 0; border-radius: 0 8px 8px 0; background: var(--color-surface); font: 0.9rem ui-monospace, monospace; }

	.vlan-page { width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter))); margin: 28px auto 56px; color: var(--color-text); font: var(--font-body)/var(--leading-body) var(--font-ui); overflow-wrap: anywhere; }
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
	button:disabled, button[aria-disabled='true'] { opacity: 0.6; cursor: default; }
	.tasks button { display: flex; gap: 10px; align-items: center; min-width: 0; text-align: left; font-size: var(--font-small); }
	.tasks button > span:last-child { min-width: 0; overflow-wrap: anywhere; }
	.tasks button[aria-current] { border-color: var(--color-accent); background: var(--color-accent-soft); }
	.tasks small { display: block; margin-top: 4px; color: var(--color-text-muted); font-size: var(--font-meta); }
	.step-number { font-weight: 750; font-size: 1.25rem; color: var(--color-accent); }
	.progress-rule { font-size: var(--font-small); margin-bottom: 16px; }
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
	.workspace-links a { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 9px 14px; border: 1px solid var(--color-border-strong); border-radius: 8px; text-decoration: none; font-size: var(--font-small); }
	.workspace-links a:hover { background: var(--color-surface-hover); }
	.workspace-links .test-shortcut { font-weight: 650; border-color: var(--color-accent); background: var(--color-accent-soft); }
	#network-panel, #map-title, #map-ping, #pc-editor, #pc-editor-title, #quick-check, #device-editor, #editor-title, #testing, .vlan-matrix th { scroll-margin-top: 6rem; scroll-margin-bottom: 5rem; }
	.network-workspace { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-areas: "map" "pc"; gap: 16px; align-items: start; }
	.map-area { grid-area: map; min-width: 0; border: 1px solid var(--color-border); border-radius: 12px; }
	.map-ping { padding: 8px 12px; min-width: 0; border-top: 1px solid var(--color-border); }
	.ping-bar, .ping-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
	.ping-tools { gap: 4px; }
	.ping-bar button { padding: 8px 10px; font-size: var(--font-small); }
	.ping-bar .playback-toggle { width: 44px; padding: 0; }
	.disclosure { border-color: transparent; background: transparent; color: var(--color-accent); }
	.disclosure[aria-expanded='true'] { background: var(--color-accent-soft); }
	.ping-details, .map-help { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--color-border); font-size: var(--font-small); }
	.map-help p, .ping-details p { max-width: 75ch; margin: 8px 0; }
	.map-help h3 { margin: 16px 0 4px; font-size: var(--font-small); }
	.map-help ul { margin: 0 0 8px; padding-left: 22px; }
	.map-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: var(--font-small); }
	.map-toolbar button { padding: 8px 10px; }
	.ping-status { display: inline-grid; place-items: center; flex: 0 0 36px; height: 36px; border-radius: 50%; color: var(--color-text-muted); background: var(--color-surface-soft); font-size: 1.4rem; font-weight: 750; }
	.ping-status.success { color: var(--color-success); background: var(--color-success-soft); }
	.ping-status.failure { color: var(--color-danger); background: var(--color-danger-soft); }
	.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
	.device-sidebar { grid-area: pc; min-width: 0; display: grid; gap: 12px; }
	.pc-editor, .quick-check { min-width: 0; padding: 18px; border: 1px solid var(--color-border-strong); border-radius: 10px; background: var(--color-surface-soft); }
	.quick-check-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
	.quick-check h3 { margin: 0; }
	.quick-check > button { width: 100%; font-size: var(--font-small); }
	.quick-check > a { display: inline-flex; align-items: center; min-height: 44px; margin-top: 4px; font-size: var(--font-small); }
	.check-count { display: inline-block; padding: 3px 8px; border-radius: 6px; color: var(--color-text-muted); background: var(--color-surface); font-size: var(--font-small); font-weight: 750; font-variant-numeric: tabular-nums; }
	.check-count.success { color: var(--color-success); background: var(--color-success-soft); }
	.check-count.failure { color: var(--color-danger); background: var(--color-danger-soft); }
	.pc-editor h3 { margin-bottom: 16px; }
	.pc-editor .pc-connection { font-size: var(--font-small); margin-block: 16px; }
	.pc-editor .target-vlan { font-size: var(--font-small); }
	.pc-editor > button { width: 100%; font-size: var(--font-small); }
	.ip-help { margin-top: 8px; font-size: var(--font-small); }
	.pc-back { display: inline-flex; align-items: center; min-height: 44px; margin-top: 8px; font-size: var(--font-small); }
	.map-links, .switch-picker { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
	.map-links a { display: inline-flex; align-items: center; min-height: 44px; font-size: var(--font-small); }
	.switch-picker { margin: 4px 0 12px; gap: 8px; }
	.switch-picker button { min-width: 72px; font-weight: 650; }
	.switch-picker button[aria-pressed='true'] { border-color: var(--color-accent); background: var(--color-accent-soft); box-shadow: inset 0 -3px 0 var(--color-accent); }
	.vlan-management { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; margin: 4px 0 12px; }
	.vlans form { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; min-width: 0; max-width: 100%; }
	.vlans label { margin: 0; }
	.editor-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--color-border); }
	.editor-footer p { margin: 0; max-width: 65ch; }
	.check-result.passed { border-left: 3px solid var(--color-success); padding-left: 16px; }
	.workspace { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
	.map-panel, .editor, .testing { min-width: 0; padding: 20px; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-surface); }
	.panel-heading { display: flex; gap: 12px; justify-content: space-between; align-items: baseline; flex-wrap: wrap; }
	label { display: block; font-size: var(--font-small); font-weight: 650; margin: 14px 0 6px; }
	select, input { display: block; width: 100%; max-width: 100%; min-width: 0; margin-top: 6px; }
	input { font-family: ui-monospace, monospace; }
	.target-vlan { font-weight: 650; color: var(--color-accent); }
	.hints { border-left: 3px solid var(--color-info); background: var(--color-info-soft); padding: 12px 16px; font-size: var(--font-small); }
	.vlans { margin-top: 8px; }
	.add-vlan { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; width: 13rem; max-width: 100%; }
	.add-vlan input { margin: 0; }
	.vlan-list { display: flex; flex: 1 1 16rem; flex-wrap: wrap; gap: 6px; min-width: 0; }
	.vlan-list:empty { display: none; }
	.vlan-list button { font-size: var(--font-meta); }
	.setting-status { font-size: var(--font-small); color: var(--color-accent); margin: 0; }
	.setting-status:not(:empty) { margin: 8px 0; }
	.matrix-panel { border: 1px solid var(--color-border); border-radius: 8px; }
	.matrix-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 20px; padding: 10px 12px; background: var(--color-surface-soft); border-radius: 7px 7px 0 0; }
	.matrix-heading h3 { margin: 0; font-size: var(--font-small); font-weight: 650; }
	.membership-legend { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: var(--font-small); font-weight: 400; }
	.membership-legend span { display: inline-flex; align-items: center; gap: 6px; }
	.membership-legend strong { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 4px; }
	.untagged-key { color: var(--color-success); background: var(--color-success-soft); }
	.excluded-key { color: var(--color-text-muted); background: var(--color-surface-soft); }
	.tagged-key { color: var(--color-info); background: var(--color-info-soft); }
	.matrix-scroll { max-width: 100%; overflow-x: auto; border-radius: 0 0 7px 7px; }
	.vlan-matrix { width: 100%; border-collapse: collapse; font-size: var(--font-small); }
	.vlan-matrix th, .vlan-matrix td { padding: 10px 6px; text-align: center; border-top: 1px solid var(--color-border); }
	.vlan-matrix thead th { font-weight: 500; font-size: var(--font-meta); color: var(--color-text-muted); }
	.vlan-matrix thead strong { display: block; color: var(--color-text); font-size: var(--font-small); }
	.vlan-matrix .selected-port { background: var(--color-accent-soft); }
	.vlan-matrix th.selected-port { box-shadow: inset 0 3px 0 var(--color-accent); }
	.port-peer { display: block; max-width: 9rem; margin-inline: auto; font-weight: 400; }
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
	.membership-help { font-size: var(--font-small); margin-top: 16px; border-top: 1px solid var(--color-border); }
	.primary { background: var(--color-action); color: var(--color-on-action); border-color: var(--color-action); font-weight: 650; }
	.primary:hover { background: var(--color-action); filter: brightness(1.08); }
	.secondary { color: var(--color-accent); font-weight: 650; }
	.testing { margin-top: 20px; border: 2px solid var(--color-accent); }
	.ping-controls { display: flex; flex-wrap: wrap; flex: 1 1 24rem; gap: 8px; align-items: center; min-width: 0; }
	.ping-controls label { display: grid; grid-template-columns: auto minmax(0, 1fr); flex: 1 1 8.5rem; min-width: 0; gap: 6px; align-items: center; margin: 0; }
	.ping-controls select { margin-top: 0; font-size: var(--font-small); }
	.actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
	.trace { min-height: 3em; }
	.check-result { margin-block: 20px; }
	.reflection { border-top: 1px solid var(--color-border); padding-top: 20px; }
	.model-notes { margin: 22px 0; }
	.model-notes p { max-width: 75ch; }
	.reset { display: flex; flex-wrap: wrap; gap: 12px; font-size: var(--font-small); }
	.reset p { flex-basis: 100%; }
	:is(button, input, select, summary, a, [tabindex]):focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	@media (min-width: 1100px) { .network-workspace { grid-template-columns: minmax(0, 1fr) 260px; grid-template-areas: "map pc"; } .pc-back { display: none; } }
	@media (max-width: 700px) { .mission-layout { grid-template-columns: minmax(0, 1fr); } }
	@media (max-width: 600px) { .tasks { grid-template-columns: minmax(0, 1fr); } .map-panel, .editor, .testing, .mission { padding: 16px; } }
</style>
