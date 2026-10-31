<script>
	import { onMount, tick, untrack } from 'svelte';
	import { teacherPreview } from '#lib/teacherPreview.js';
	import { lab, learningContext } from '#lib/lab.js';
	import { labPreferences, reducedMotion, registerSoundPlayer } from '#lib/labPreferences.js';
	import { createVlanAudio } from '#lib/vlanAudio.js';
	import { loadNetworkLab, saveNetworkCheck } from '#lib/networkLabApi.js';
	import {
		vlan2Tasks,
		initialVlan2Config,
		pingVlan2,
		checkVlan2Task,
		networkPairs
	} from '#lib/vlanLab2.js';
	import RoutedNetworkMap from '#lib/components/RoutedNetworkMap.svelte';
	import NetworkSwitchEditor from '#lib/components/NetworkSwitchEditor.svelte';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	import { getInterfaceHelp } from '#lib/interfaceHelp.js';
	import NetworkCheckDialog from '#lib/components/NetworkCheckDialog.svelte';
	import { createNetworkEditorNavigation } from '#lib/networkEditorNavigation.js';
	const interfaceHelp = getInterfaceHelp();
	const helpTarget = interfaceHelp.target;
	/** @typedef {{config:import('#lib/vlanLab2.js').Config,revision:number,check:{revision:number,result:ReturnType<typeof checkVlan2Task>}|null}} Attempt */
	/** @returns {Record<string,Attempt>} */
	const fresh = () =>
		Object.fromEntries(
			vlan2Tasks.map((t) => [t.id, { config: initialVlan2Config(t), revision: 0, check: null }])
		);
	let work = $state(fresh()),
		taskId = $state('gateway'),
		selected = $state('pc1'),
		switchId = $state('s1');
	let unlocked = $state(false),
		loaded = $state(false),
		loading = $state(false),
		saving = $state(false),
		loadError = $state(''),
		saveMessage = $state('');
	let hints = $state(0),
		resetPending = $state(false),
		routerVlan = $state(''),
		routerIp = $state(''),
		routerMessage = $state('');
	let source = $state('pc1'),
		target = $state('pc2'),
		details = $state(false),
		frame = $state(0),
		travel = $state(1),
		playing = $state(false);
	/** @type {{revision:number,source:string,target:string,result:import('#lib/vlanLab2.js').Ping}|null} */
	let run = $state(null);
	let sequence = 0;
	let checkViewSequence = 0;
	let showCheck = $state(false);
	let checkError = $state(false);
	const navigation = createNetworkEditorNavigation(() => $reducedMotion);
	const sound = createVlanAudio();
	onMount(() => {
		const unregister = registerSoundPlayer(sound);
		return () => {
			sequence++;
			navigation.cancel();
			unregister();
			sound.destroy();
		};
	});
	const scope = $derived(
		`${$lab.user?.id ?? 'guest'}:${$teacherPreview}:${$learningContext.mode}:${$learningContext.openingId ?? ''}`
	);
	const task = $derived(vlan2Tasks.find((t) => t.id === taskId) ?? vlan2Tasks[0]);
	$effect(() => { taskId; interfaceHelp.clear(); });
	const index = $derived(vlan2Tasks.indexOf(task));
	const attempt = $derived(work[task.id]),
		config = $derived(attempt.config);
	const pc = $derived(task.pcs.find((p) => p.id === selected) ?? null);
	const selectedSwitch = $derived(task.switches.find((s) => s.id === switchId) ?? task.switches[0]);
	/** @param {Attempt} a */
	const passes = (a) => !!a.check && a.check.revision === a.revision && a.check.result.passed;
	const available = $derived($teacherPreview ? -1 : vlan2Tasks.findIndex((t) => !passes(work[t.id])));
	const passed = $derived(passes(attempt));
	const stale = $derived.by(
		() =>
			!!run && (run.revision !== attempt.revision || run.source !== source || run.target !== target)
	);
	const checkStale = $derived(!!attempt.check && attempt.check.revision !== attempt.revision);
	const activeStep = $derived.by(() => (run && !stale ? (run.result.steps[frame] ?? null) : null));
	const complete = $derived.by(
		() => !!run && !stale && frame === run.result.steps.length - 1 && travel === 1
	);
	const checkCount = $derived(attempt.check?.result.rows.filter((r) => r.ok).length ?? 0);
	$effect(() => {
		scope;
		untrack(() => {
			void restore();
		});
	});
	async function restore() {
		const request = ++sequence;
		work = fresh();
		taskId = 'gateway';
		resetView();
		unlocked = false;
		loaded = false;
		loading = false;
		saving = false;
		loadError = '';
		saveMessage = '';
		if (!$lab.user || ($learningContext.mode !== 'normal' && !$teacherPreview)) return;
		loading = true;
		try {
			const saved = await loadNetworkLab('vlan-lab-2', $teacherPreview);
			if (request !== sequence) return;
			unlocked = saved.unlocked;
			for (const item of saved.tasks) {
				const t = vlan2Tasks.find((t) => t.id === item.taskId);
				if (t)
					work[t.id] = {
						config: item.config,
						revision: 0,
						check: { revision: 0, result: checkVlan2Task(t, item.config) }
					};
			}
			loaded = true;
		} catch (error) {
			if (request === sequence)
				loadError = error instanceof Error ? error.message : 'Kunne ikke hente fremgangen.';
		} finally {
			if (request === sequence) loading = false;
		}
	}
	$effect(() => { if ($reducedMotion) navigation.cancel(); });
	function resetView() {
		showCheck = false; checkError = false; checkViewSequence++; navigation.cancel();
		sound.stop();
		selected = 'pc1';
		switchId = 's1';
		hints = 0;
		resetPending = false;
		routerVlan = '';
		routerIp = '';
		routerMessage = '';
		source = 'pc1';
		target = 'pc2';
		run = null;
		playing = false;
		details = false;
		frame = 0;
		travel = 1;
	}
	/** @param {string} id */
	async function selectTask(id) {
		const i = vlan2Tasks.findIndex((t) => t.id === id);
		if (saving || i < 0 || (available !== -1 && i > available)) return;
		taskId = id;
		resetView();
		saveMessage = '';
		await tick();
		document.getElementById('task-title')?.focus();
	}
	function changed() {
		showCheck = false; checkError = false; checkViewSequence++;
		sound.stop();
		attempt.revision++;
		playing = false;
		details = false;
		saveMessage = '';
	}
	/** @param {string} id */
	async function selectDevice(id) {
		showCheck = false; checkViewSequence++;
		selected = id;
		if (task.switches.some((s) => s.id === id)) switchId = id;
		const region = task.pcs.some((p) => p.id === id) ? 'client' : id === 'r1' ? 'router' : id === 'ap1' ? 'wifi' : 'switches';
		await navigation.reveal(region === 'switches' ? 'switch-title' : `${region}-title`, region);
	}
	function ping() {
		run = {
			revision: attempt.revision,
			source,
			target,
			result: pingVlan2(task, config, source, target)
		};
		frame = $reducedMotion ? run.result.steps.length - 1 : 0;
		travel = $reducedMotion ? 1 : 0;
		playing = !$reducedMotion;
	}
	$effect(() => {
		const current = run,
			currentFrame = frame;
		if (!current || stale) {
			playing = false;
			return;
		}
		if ($reducedMotion) {
			playing = false;
			travel = 1;
			return;
		}
		if (!playing) return;
		const last = current.result.steps.length - 1,
			progress = untrack(() => travel);
		let started = 0,
			request = 0;
		/** @param {number} now */
		function advance(now) {
			if (!started) started = now;
			const elapsed = now - started + progress * 650;
			travel = Math.min(1, elapsed / 650);
			if (elapsed >= 950) {
				if (currentFrame < last) {
					travel = 0;
					frame = currentFrame + 1;
				} else playing = false;
			} else request = requestAnimationFrame(advance);
		}
		request = requestAnimationFrame(advance);
		return () => cancelAnimationFrame(request);
	});
	/** @param {number} delta */
	function step(delta) {
		if (!run) return;
		playing = false;
		frame = Math.max(0, Math.min(run.result.steps.length - 1, frame + delta));
		travel = 1;
	}
	function togglePlayback() {
		if (complete) {
			frame = 0;
			travel = 0;
		}
		playing = !playing;
	}
	function addInterface() {
		const vlan = Number(routerVlan);
		if (
			!/^\d+$/.test(routerVlan) ||
			vlan < 1 ||
			vlan > 4094 ||
			config.router.interfaces.length >= 8 ||
			config.router.interfaces.some((r) => r.vlan === vlan)
		) {
			routerMessage = 'Bruk en ny VLAN-ID fra 1–4094. Maks åtte interfacer.';
			return;
		}
		config.router.interfaces.push({ vlan, ip: routerIp });
		changed();
		routerVlan = '';
		routerIp = '';
		routerMessage = 'Interface lagt til. Kontroller IP og trunk.';
	}
	async function check() {
		if (saving) return;
		playing = false;
		const request = sequence,
			view = ++checkViewSequence,
			id = task.id,
			revision = attempt.revision;
		saving = true; checkError = false;
		saveMessage = 'Kontrollerer på serveren …';
		try {
			const saved = await saveNetworkCheck('vlan-lab-2', id, JSON.parse(JSON.stringify(config)), $teacherPreview);
			if (request !== sequence) return;
			if (work[id].revision === revision) work[id].check = { revision, result: saved.result };
			saveMessage = $teacherPreview ? 'Lærerforhåndsvisning · kontrollert uten å lagre bestått.' : saved.saved
				? 'Bestått oppsett lagret.'
				: 'Ikke bestått ennå. Åpne kontrollresultatet for å se feilene.';
			if (view === checkViewSequence && task.id === id && work[id].revision === revision) showCheck = true;
			if ($labPreferences.sound) void sound.play(saved.result.passed, $labPreferences.volume);
		} catch (error) {
			if (request === sequence) {
				saveMessage = `Kontrollen kunne ikke fullføres. ${error instanceof Error ? error.message : 'Prøv igjen.'}`;
				checkError = true;
				if (view === checkViewSequence && task.id === id) showCheck = true;
			}
		} finally {
			if (request === sequence) saving = false;
		}
	}
	async function resetTask() {
		work[task.id] = {
			config: initialVlan2Config(task),
			revision: attempt.revision + 1,
			check: null
		};
		resetView();
		saveMessage = 'Lokalt forsøk nullstilt. Tidligere bestått på kontoen beholdes.';
		await tick();
		document.getElementById('task-title')?.focus();
	}
</script>

<svelte:head
	><title>VLAN-lab 2 · Ruter og Wi-Fi – IT-laben</title><meta
		name="description"
		content="Fortsett fra VLAN-lab 1 med gateway, ruting, trådløse nett og avgrenset gjestetilgang."
	/></svelte:head
>
{#if unlocked && loaded}<PartnerContext
		pageId="vlan-lab-2"
		running={playing}
		values={{
			taskId,
			deviceId: selected,
			hints,
			hasRun: !!run || !!attempt.check,
			stale: stale || checkStale,
			revision: attempt.revision
		}}
	/>{/if}

<main id="hovedinnhold" tabindex="-1">
	<a href="/?fag=drift">← Driftsstøtte</a>
	<header>
		<p class="eyebrow">VLAN-LAB 2 · RUTER OG WI-FI</p>
		<h1>Fra adskilte nett til styrt tilgang.</h1>
		<p>Koble nett sammen med R1, få laptopene på Wi-Fi og bestem hvem som skal få kommunisere.</p>
	</header>
	{#if !$lab.ready || loading}<section class="gate" role="status"><h2>Henter laben …</h2></section>
	{:else if !$lab.user}<section class="gate">
			<h2>Fortsett med elevkontoen din</h2>
			<p>Logg inn for å hente bestått VLAN-lab 1 og åpne lab 2.</p>
			<a class="action primary" href="/min-lab/">Åpne Min lab →</a><a
				class="action"
				href="/nettverk/vlan/">Til VLAN-lab 1</a
			>
		</section>
	{:else if ($learningContext.mode !== 'normal' && !$teacherPreview)}<section class="gate">
			<h2>Åpne laben i vanlig modus</h2>
			<p>VLAN-labene bruker beståtte oppsett på kontoen, uten XP.</p>
			<a class="action" href="/nettverk/vlan-2/">Åpne vanlig lab</a>
		</section>
	{:else if loadError}<section class="gate">
			<h2>Fremgangen kunne ikke hentes</h2>
			<p role="alert">{loadError}</p>
			<button onclick={restore}>Prøv igjen</button>
		</section>
	{:else if loaded && !unlocked}<section class="gate">
			<span class="eyebrow">FORKUNNSKAPSKRAV</span>
			<h2>Bestå VLAN-lab 1 først</h2>
			<p>
				Alle seks oppdrag må være kontrollert og lagret på denne kontoen. Da åpnes lab 2 automatisk.
			</p>
			<a class="action primary" href="/nettverk/vlan/">Fortsett VLAN-lab 1 →</a><button
				onclick={restore}>Sjekk bestått-status igjen</button
			>
			<details>
				<summary>Jeg har allerede gjort lab 1</summary>
				<p>
					Tidligere versjoner lagret bare i den åpne fanen. Hvis bestått ikke er registrert på
					kontoen, gjennomfør kontrollene i lab 1 på nytt mens du er innlogget.
				</p>
			</details>
		</section>
	{:else if unlocked && loaded}
		<nav class="tasks" aria-label="Oppdrag i VLAN-lab 2">
			{#each vlan2Tasks as t, i}<button
					disabled={saving || (available !== -1 && i > available)}
					aria-current={task.id === t.id ? 'step' : undefined}
					onclick={() => selectTask(t.id)}
					><b>{i + 1}</b><span
						>{t.title}<small
							>{passes(work[t.id])
								? '✓ Bestått kontroll'
								: available !== -1 && i > available
									? 'Låst'
									: task.id === t.id
										? 'Du er her'
										: 'Åpne'}</small
						></span
					></button
				>{/each}
		</nav>
		<p class="muted">
			{#if $teacherPreview}Lærerforhåndsvisning · alle oppdrag åpne. <a href='/min-lab/?visning=innstillinger#laererinnstillinger'>Innstillinger</a>{:else}Bestå kontrollen for å åpne neste oppdrag.{/if}
		</p>
		<section class="mission">
			<p class="eyebrow">OPPDRAG {index + 1} AV 5</p>
			<h2 id="task-title" tabindex="-1">{task.title}</h2>
			<p class="goal">{task.goal}</p>
			<p><strong>Utgangspunkt:</strong> {task.ready}</p>
			<div class="brief">
				<ol>
					{#each task.steps as text}<li>{text}</li>{/each}
				</ol>
				<div class="plan">
					<h3>Nettverksplan · /24</h3>
					{#each task.networks as n}<p>
							<strong>{n.name} · VLAN {n.vlan}</strong><span>{n.network}.0/24</span><small
								>Gateway {n.gateway}</small
							>
						</p>{/each}
				</div>
			</div>
			<p>{task.theory[0]}</p>
			<details open={index === 0}>
				<summary
					>Før du prøver: {index === 0
						? 'default gateway'
						: index === 1
							? 'ruter og trunk'
							: index === 2
								? 'SSID og VLAN'
								: 'ruting og feilsøking'}</summary
				>{#each task.theory.slice(1) as text}<p>{text}</p>{/each}
			</details>
		</section>
		<nav class="anchors" aria-label="Arbeidsområder">
			<a href="#network">Kart og klienter</a><a href="#switches">Switcher</a><a href="#router"
				>Ruter</a
			>{#if task.ap}<a href="#wifi">Wi-Fi</a>{/if}<a href="#control">Kontroll</a>
		</nav>
		<section id="network" use:helpTarget={!pc ? { label: 'Velg PC', hint: 'Trykk på en PC i kartet for å åpne IP-adresse og gateway.', order: 1 } : null}>
			<div class="heading">
				<h2>Nettverket ditt</h2>
				<span class="muted"
					>{task.switches.length} switch{task.switches.length > 1 ? 'er' : ''} · R1{task.ap
						? ' · AP1'
						: ''}</span
				>
			</div>
			<div class="network-workspace">
				<div class="map-area">
					<RoutedNetworkMap
						{task}
						{config}
						{selected}
						onselect={selectDevice}
						step={activeStep}
						progress={travel}
					/>
					<form
						class="ping"
						use:helpTarget={{ label: 'Send ping', hint: 'Velg Fra og Til, og trykk Ping for å prøve forbindelsen.', order: 5 }}
						onsubmit={(event) => {
							event.preventDefault();
							ping();
						}}
					>
						<label
							>Fra<select
								bind:value={source}
								onchange={() => {
									playing = false;
									details = false;
								}}
								>{#each task.pcs as p}<option value={p.id}>{p.name}</option>{/each}</select
							></label
						><label
							>Til<select
								bind:value={target}
								onchange={() => {
									playing = false;
									details = false;
								}}
								>{#each task.pcs as p}<option value={p.id}>{p.name}</option>{/each}<option
									value="r1">R1 · egen gateway</option
								></select
							></label
						><button class="primary" disabled={source === target}>Ping</button><span
							class="status"
							class:good={complete && run?.result.ok}
							class:bad={complete && !run?.result.ok}
							role="status"
							aria-label={stale
								? 'Endret. Kjør ping på nytt.'
								: !run
									? 'Ingen ping kjørt'
									: complete
										? run.result.ok
											? 'Svar mottatt'
											: 'Ingen svar'
										: playing
											? 'Ping pågår'
											: 'Ping satt på pause'}
							>{stale || !run ? '—' : complete ? (run.result.ok ? '✓' : '×') : '…'}</span
						><button
							type="button"
							disabled={!run || stale || $reducedMotion}
							aria-label={playing ? 'Pause ping' : 'Spill ping'}
							onclick={togglePlayback}>{playing ? 'Ⅱ' : '▶'}</button
						><button
							type="button"
							disabled={!run || stale}
							aria-expanded={details && !stale}
							onclick={() => (details = !details)}>Detaljer</button
						>
					</form>
					{#if run && details && !stale}<div class="ping-detail">
							<div class="actions">
								<button disabled={frame === 0} onclick={() => step(-1)}>← Steg</button><span
									>{frame + 1}/{run.result.steps.length}</span
								><button disabled={frame === run.result.steps.length - 1} onclick={() => step(1)}
									>Steg →</button
								>
							</div>
							<p>{activeStep?.text}</p>
							{#if complete && run.result.message !== activeStep?.text}<p>{run.result.message}</p>{/if}
						</div>{/if}
					<details>
						<summary>Karthjelp og modellens grenser</summary>
						<p>
							Trykk på en klient for IP og gateway, eller en annen enhet for konfigurasjon. Stiplede
							linjer er Wi-Fi. Rød pakke viser veien og stopper der feilen oppstår. Grønn hake betyr
							ping-svar; rødt kryss betyr ingen svar.
						</p>
						<p>
							Dette er en simulering med fast /24-maske og statiske adresser. R1 bruker tagged
							VLAN-interfacer og direkte tilkoblede ruter. DHCP, internett/NAT, radiosignal, passord
							og en full brannmur inngår ikke.
						</p>
					</details>
				</div>
				<aside>
					<section class="client" id="client" use:helpTarget={pc ? { label: 'Endre IP og gateway', hint: `Her endrer du ${pc.name}. Velg en annen PC i kartet for å konfigurere den.`, order: 1 } : null}>
						<h3 id="client-title" tabindex="-1">{pc?.name ?? 'Velg en klient i kartet'}</h3>
						{#if pc}<fieldset disabled={saving}>
								<p class="muted">
									{pc.wireless ? 'Trådløst via AP1' : `${pc.switchId.toUpperCase()} ${pc.port}`}
								</p>
								{#if pc.wireless}<label
										>SSID<select
											aria-label="SSID"
											value={config.ssids[pc.id]}
											onchange={(event) => {
												if (pc) config.ssids[pc.id] = event.currentTarget.value;
												changed();
											}}
											><option value="">Ikke tilkoblet</option
											>{#each task.networks.filter((n) => n.id !== 'admin') as n}<option
													value={n.id}
													>Lab-{n.name}{config.wifi[n.id]?.enabled ? '' : ' (av)'}</option
												>{/each}</select
										></label
									>{/if}<label
									>IP-adresse<span class="ip-with-mask"><input aria-label="IP-adresse"
										maxlength="15"
										inputmode="decimal"
										autocomplete="off"
										spellcheck="false"
										aria-describedby="client-mask"
										value={config.ips[pc.id]}
										oninput={(event) => {
											if (pc) config.ips[pc.id] = event.currentTarget.value;
											changed();
										}}
									/><span id="client-mask" class="mask" title="Fast nettmaske: 255.255.255.0"><span aria-hidden="true">/24</span><span class="sr-only">Fast nettmaske 255.255.255.0, prefiks 24</span></span></span></label
								><label
									>Default gateway<input
										maxlength="15"
										inputmode="decimal"
										autocomplete="off"
										spellcheck="false"
										value={config.gateways[pc.id]}
										oninput={(event) => {
											if (pc) config.gateways[pc.id] = event.currentTarget.value;
											changed();
										}}
									/></label
								>
							</fieldset>{/if}
					</section>
					<section id="control" use:helpTarget={{ label: 'Kontroller oppdraget', hint: 'Trykk «Kontroller oppdraget» for å teste hele oppsettet og se hva som eventuelt må rettes.', order: 6 }}>
						<div class="heading">
							<h3>Kontroll</h3>
							<span
								role="status"
								class:good={passed}
								class:bad={!!attempt.check && !checkStale && !passed}
								>{checkStale
									? 'Endret'
									: attempt.check
										? `${passed ? '✓' : '×'} ${checkCount}/${attempt.check.result.rows.length}`
										: '—'}</span
							>
						</div>
						<button class="primary" disabled={saving} onclick={check}
							>{saving ? 'Kontrollerer …' : 'Kontroller oppdraget'}</button
						>
						<p class="save-status" role="status">{saveMessage}</p>
						{#if attempt.check || checkError}<button type="button" onclick={() => showCheck = true}>Se kontrollresultat</button>{/if}
						<a href="#results">Hint og refleksjon ↓</a>
					</section>
				</aside>
			</div>
		</section>
		<section id="switches" use:helpTarget={{ label: task.editSwitches ? 'Endre switch og VLAN' : 'Undersøk switch og VLAN', hint: task.editSwitches ? 'Velg switch. Trykk på en portrute for å bytte mellom U, E og T.' : 'Velg switch og les portrutene. Oppsettet er låst i dette oppdraget.', order: 2 }}>
			<div class="heading">
				<h2 id="switch-title" tabindex="-1">{selectedSwitch.name} · Switcher og VLAN</h2>
				<a href="#network">Til kartet ↑</a>
			</div>
			<div class="actions" role="group" aria-label="Velg switch">
				{#each task.switches as s}<button
						aria-pressed={switchId === s.id}
						onclick={() => {
							switchId = s.id;
							selected = s.id;
							checkViewSequence++;
							void navigation.reveal('switch-title', 'switches');
						}}>{s.name}</button
					>{/each}
			</div>
			{#key `${task.id}:${switchId}`}<NetworkSwitchEditor
					device={selectedSwitch}
					config={config.switches[selectedSwitch.id]}
					networks={task.networks}
					disabled={!task.editSwitches || saving}
					onchange={(next) => {
						config.switches[selectedSwitch.id] = next;
						changed();
					}}
				/>{/key}
			{@render configControl()}
		</section>
		<div class="infrastructure">
			<section id="router" use:helpTarget={{ label: task.editRouter ? 'Konfigurer ruteren' : 'Undersøk ruteren', hint: task.editRouter ? 'Her finner du ruterens VLAN-interfacer og IP-adresser.' : 'Her ser du ruterens VLAN-interfacer. De er ferdig oppsatt i dette oppdraget.', order: 3 }}>
				<div class="heading">
					<h2 id="router-title" tabindex="-1">R1 · Ruter</h2>
					<a href="#network">Til kartet ↑</a>
				</div>
				<p class="muted">
					eth0 ↔ {task.router.switchId.toUpperCase()}
					{task.router.port} · tagged VLAN
				</p>
				<h3>VLAN-interfacer</h3>
				<fieldset disabled={!task.editRouter || saving}>
					{#each config.router.interfaces as r, i}<div class="interface">
							<label
								>VLAN-ID<input
									aria-label={`R1 interface ${i + 1} VLAN-ID`}
									type="number"
									min="1"
									max="4094"
									value={r.vlan}
									onchange={(event) => {
										r.vlan = Number(event.currentTarget.value);
										changed();
									}}
								/></label
							><label
								>IP-adresse /24<input
									aria-label={`R1 interface ${i + 1} IP`}
									maxlength="15"
									inputmode="decimal"
									value={r.ip}
									oninput={(event) => {
										r.ip = event.currentTarget.value;
										changed();
									}}
								/></label
							><button
								type="button"
								aria-label={`Fjern interface ${i + 1}`}
								onclick={() => {
									config.router.interfaces.splice(i, 1);
									changed();
								}}>Fjern</button
							>
						</div>{/each}
					{#if !config.router.interfaces.length}<p>
							Ingen VLAN-interfacer. Legg til en interface for hvert nett.
						</p>{/if}
				</fieldset>
				{#if task.editRouter}<form
						class="interface new-interface"
						onsubmit={(event) => {
							event.preventDefault();
							addInterface();
						}}
					>
						<label
							>Ny VLAN-ID<input
								inputmode="numeric"
								maxlength="4"
								bind:value={routerVlan}
								disabled={saving}
							/></label
						><label
							>Gateway-adresse /24<input
								inputmode="decimal"
								maxlength="15"
								bind:value={routerIp}
								disabled={saving}
							/></label
						><button disabled={saving}>Legg til interface</button>
					</form>{:else}<p class="muted">Interfacene er ferdig satt opp.</p>{/if}
				<p role="status">{routerMessage}</p>
				<h3>Tilgang mellom VLAN</h3>
				<fieldset disabled={!task.editPolicy || saving}>
					<legend class="muted">Tillat i begge retninger</legend
					>{#each networkPairs(task) as pair}<label class="toggle"
							><input
								type="checkbox"
								checked={config.router.allow[pair.key]}
								onchange={(event) => {
									config.router.allow[pair.key] = event.currentTarget.checked;
									changed();
								}}
							/>{pair.a.name} ↔ {pair.b.name}</label
						>{/each}
				</fieldset>
				{#if !task.editPolicy}<p class="muted">
						Ferdig satt til tillat. Du styrer disse reglene fra oppdrag 4.
					</p>{/if}
				{@render configControl()}
			</section>
			{#if task.ap}<section id="wifi" use:helpTarget={{ label: 'Finn Wi-Fi-oppsettet', hint: 'Her finner du AP1 og koblingen mellom SSID og VLAN.', order: 4 }}>
					<div class="heading">
						<h2 id="wifi-title" tabindex="-1">AP1 · Wi-Fi</h2>
						<a href="#network">Til kartet ↑</a>
					</div>
					<p class="muted">eth0 ↔ {task.ap.switchId.toUpperCase()} {task.ap.port} · tagged VLAN</p>
					<fieldset disabled={saving}>
						{#each task.networks.filter((n) => n.id !== 'admin') as n}<div class="ssid">
								<label class="toggle"
									><input
										type="checkbox"
										checked={config.wifi[n.id].enabled}
										onchange={(event) => {
											config.wifi[n.id].enabled = event.currentTarget.checked;
											changed();
										}}
									/>Lab-{n.name}</label
								><label
									>VLAN-ID<input
										type="number"
										min="1"
										max="4094"
										aria-label={`Lab-${n.name} VLAN-ID`}
										value={config.wifi[n.id].vlan}
										onchange={(event) => {
											config.wifi[n.id].vlan = Number(event.currentTarget.value);
											changed();
										}}
									/></label
								>
							</div>{/each}
					</fieldset>
					<details>
						<summary>SSID og kabelport</summary>
						<p>
							AP1 merker kablet trafikk med VLAN-ID-en til klientens SSID. Sett disse VLAN-ene til T
							på switchporten. Velg deretter SSID på laptoppen i kartet.
						</p>
					</details>
					{@render configControl()}
				</section>{/if}
		</div>
		<section id="results">
			<div class="heading">
				<h2>Hint og neste oppdrag</h2>
				<a href="#control">Til kontroll ↑</a>
			</div>
			{#if checkStale}<p role="status">
					Oppsettet er endret. Kontroller på nytt før du går videre.
				</p>{/if}
			{#if attempt.check || checkError}<button type="button" onclick={() => showCheck = true}>Se kontrollresultat</button>{/if}
			<div class="actions">
				{#if index < vlan2Tasks.length - 1}<button
						class="primary"
						disabled={(!passed && !$teacherPreview) || saving}
						onclick={() => selectTask(vlan2Tasks[index + 1].id)}>Neste oppdrag →</button
					>{:else if passed}<p class="good">
						<strong>{$teacherPreview ? '✓ Dette oppdraget består forhåndsvisningen.' : '✓ Alle fem oppdrag er bestått og lagret.'}</strong>
					</p>{/if}<button disabled={hints === task.hints.length} onclick={() => hints++}
					>Vis {hints ? 'neste ' : ''}hint</button
				>
			</div>
			{#each task.hints.slice(0, hints) as hint}<p class="hint">{hint}</p>{/each}
			<details>
				<summary>Forklar sammen</summary>
				<p>{task.reflect}</p>
				<p>
					Bestått betyr at oppsettet passerer funksjonstestene. Forklaringen følger dere opp med
					lærer eller medelev.
				</p>
			</details>
			<details>
				<summary>Lagring og nytt forsøk</summary>
				<p>Beståtte oppsett lagres på kontoen. Omlasting henter sist beståtte versjon; andre endringer beholdes bare mens siden er åpen. Ingen XP.</p>
				<p>
					Dette erstatter det åpne oppsettet med startverdiene. Sist beståtte oppsett på kontoen
					beholdes og hentes ved omlasting.
				</p>
				{#if resetPending}<div class="actions">
						<button disabled={saving} onclick={resetTask}>Ja, nullstill lokalt</button><button
							onclick={() => (resetPending = false)}>Avbryt</button
						>
					</div>{:else}<button disabled={saving} onclick={() => (resetPending = true)}
						>Nullstill forsøk</button
					>{/if}
			</details>
		</section>
	{/if}
</main>

{#snippet configControl()}
	<div class="config-control">
		<span class:good={passed} class:bad={!!attempt.check && !checkStale && !passed}>
			{checkStale ? 'Endret · kontroller på nytt' : attempt.check ? `${passed ? '✓' : '×'} ${checkCount}/${attempt.check.result.rows.length}` : 'Kontroll'}
		</span>
		<button type="button" class="primary" disabled={saving} onclick={check}>{saving ? 'Kontrollerer …' : 'Kontroller oppdraget'}</button>
	</div>
{/snippet}

<NetworkCheckDialog bind:open={showCheck} title={`Oppdrag ${index + 1} · ${task.title}`}
	rows={checkError ? [] : (attempt.check?.result.rows ?? []).map((row) => ({ ...row, targets: [{ deviceId: row.deviceId, label: task.devices.find((d) => d.id === row.deviceId)?.name ?? row.deviceId }] }))}
	stale={checkStale} status={saveMessage} nextDisabled={saving}
	nextLabel={index < vlan2Tasks.length - 1 ? 'Neste oppdrag →' : ''}
	onnext={() => { if (index < vlan2Tasks.length - 1) void selectTask(vlan2Tasks[index + 1].id); }}
	oninspect={(destination) => { void selectDevice(destination.deviceId); }} />

<style>
	.ip-with-mask { display: flex; align-items: stretch; }
	.ip-with-mask input { flex: 1; border-radius: 8px 0 0 8px; }
	.mask { display: inline-flex; align-items: center; padding: 0 0.55rem; border: 1px solid var(--color-border-strong); border-left: 0; border-radius: 0 8px 8px 0; background: var(--color-surface-soft); font: 0.9rem ui-monospace, monospace; }
	.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
	.config-control { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.7rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border); font-size: var(--font-small); }
	#control > a { display: inline-flex; align-items: center; min-height: 44px; }
	#control > button + button { margin-top: 0.5rem; }
	[tabindex='-1'] { scroll-margin-block: 6rem; }

	main {
		max-width: 1440px;
		margin: 0 auto;
		padding: clamp(1rem, 3vw, 2.5rem);
		color: var(--color-text);
		overflow-wrap: anywhere;
	}
	header {
		max-width: 900px;
		padding: 1.8rem 0;
	}
	h1 {
		font-size: clamp(2rem, 4vw, 3.1rem);
		line-height: 1.15;
		margin: 0.4rem 0 1rem;
	}
	h2 {
		font-size: var(--font-h2, 1.5rem);
		margin: 0.2rem 0 0.8rem;
	}
	h3 {
		margin: 0.4rem 0 0.8rem;
	}
	p,
	li {
		line-height: 1.6;
	}
	a {
		color: var(--color-accent);
	}
	section {
		min-width: 0;
		padding: clamp(1rem, 2vw, 1.5rem);
		border: 1px solid var(--color-border);
		border-radius: 14px;
		background: var(--color-surface);
		margin-bottom: 1.2rem;
		scroll-margin-top: 6rem;
	}
	.eyebrow {
		font-size: var(--font-small);
		letter-spacing: 0.08em;
		font-weight: 750;
		color: var(--color-text-muted);
	}
	.muted,
	small {
		color: var(--color-text-muted);
	}
	.muted {
		font-size: var(--font-small);
	}
	.goal {
		font-size: 1.125rem;
		max-width: 80ch;
	}
	.tasks {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.6rem;
	}
	.tasks button {
		display: flex;
		text-align: left;
		align-items: flex-start;
		gap: 0.6rem;
		min-width: 0;
	}
	.tasks span {
		min-width: 0;
	}
	.tasks small {
		display: block;
		font-size: var(--font-meta);
		margin-top: 0.35rem;
	}
	.tasks [aria-current='step'],
	button[aria-pressed='true'] {
		border-color: var(--color-accent);
		background: var(--color-accent-soft);
	}
	button,
	input,
	select,
	.action {
		min-height: 44px;
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
		padding: 0.6rem 0.8rem;
		box-sizing: border-box;
	}
	button {
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.primary {
		background: var(--color-action);
		color: var(--color-on-action);
		border-color: var(--color-action);
		font-weight: 700;
	}
	.action {
		display: inline-flex;
		align-items: center;
		margin: 0.3rem 0.3rem 0.3rem 0;
		text-decoration: none;
	}
	.brief {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(240px, 0.8fr);
		gap: 2rem;
	}
	.brief ol {
		padding-left: 1.4rem;
	}
	.brief li {
		margin-bottom: 0.7rem;
	}
	.plan p {
		display: grid;
		gap: 0.15rem;
		margin: 0.6rem 0;
		padding: 0.6rem 0.9rem;
		border-left: 3px solid var(--color-accent);
		background: var(--color-accent-soft);
	}
	.plan span {
		font-family: ui-monospace, monospace;
	}
	.anchors,
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.7rem;
	}
	.anchors {
		margin: 1rem 0;
	}
	.anchors a {
		padding: 0.6rem 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}
	.heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}
	.network-workspace {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.25rem;
	}
	.map-area {
		min-width: 0;
	}
	aside {
		min-width: 0;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}
	aside section {
		margin: 0;
		padding: 1rem;
	}
	label {
		display: grid;
		gap: 0.4rem;
		font-size: var(--font-small);
		margin-bottom: 0.65rem;
	}
	input,
	select {
		width: 100%;
		min-width: 0;
	}
	fieldset {
		min-width: 0;
		padding: 0;
		border: 0;
		margin: 0;
	}
	.ping {
		display: flex;
		align-items: end;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.8rem 0;
	}
	.ping label {
		flex: 1 1 135px;
		margin: 0;
	}
	.ping .status {
		align-self: center;
		font-size: 1.6rem;
		font-weight: 800;
		min-width: 24px;
		text-align: center;
	}
	.good {
		color: var(--color-success);
		font-weight: 700;
	}
	.bad {
		color: var(--color-danger);
	}
	#control > button {
		width: 100%;
	}
	.save-status {
		font-size: var(--font-small);
		min-height: 1.5em;
	}
	.infrastructure {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr));
		gap: 1.2rem;
	}
	.interface {
		display: grid;
		grid-template-columns: minmax(80px, 0.6fr) minmax(130px, 1fr) auto;
		gap: 0.6rem;
		align-items: end;
		margin-bottom: 1rem;
	}
	.interface label {
		margin: 0;
	}
	.new-interface {
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}
	.ssid {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.7rem 0;
		border-bottom: 1px solid var(--color-border);
	}
	.ssid > label:last-child {
		max-width: 110px;
	}
	.toggle {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		min-height: 44px;
		margin: 0.4rem 0;
	}
	.toggle input {
		width: 22px;
		height: 22px;
		min-height: 22px;
		accent-color: var(--color-accent);
	}
	details {
		margin-top: 0.5rem;
	}
	summary {
		padding: 0.7rem 0;
		cursor: pointer;
		min-height: 44px;
		box-sizing: border-box;
	}
	.hint {
		border-left: 3px solid var(--color-accent);
		padding: 0.6rem 1rem;
		background: var(--color-accent-soft);
	}
	:is(button, input, select, summary, a):focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	[tabindex='-1']:focus {
		outline: 2px solid var(--color-focus);
		outline-offset: 5px;
	}
	.gate {
		max-width: 760px;
	}
	.ping-detail {
		padding: 1rem;
		background: var(--color-accent-soft);
		border-radius: 8px;
	}
	@media (min-width: 1100px) {
		.network-workspace {
			grid-template-columns: minmax(0, 1fr) 270px;
		}
		aside {
			display: flex;
			flex-direction: column;
		}
	}
	@media (max-width: 800px) {
		.tasks {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.brief {
			grid-template-columns: minmax(0, 1fr);
			gap: 1rem;
		}
	}
	@media (max-width: 500px) {
		aside {
			grid-template-columns: minmax(0, 1fr);
		}
		.interface {
			grid-template-columns: minmax(0, 1fr);
		}
		.interface button {
			justify-self: start;
		}
		.tasks button {
			padding: 0.6rem;
		}
		.ssid {
			flex-wrap: wrap;
		}
		.infrastructure {
			display: block;
		}
	}
</style>
