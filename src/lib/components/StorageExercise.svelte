<script>
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { storageTasks, storageLines, storageSetupCode, createStorageState, runStorage } from '#lib/storageExercise.js';
	import { moduleLink } from '#lib/moduleNavigation.js';
	import { getInterfaceHelp } from '#lib/interfaceHelp.js';
	import { noteFeedbackAttempt, finishFeedbackAttempt } from '#lib/activityFeedbackClient.js';
	import { storageExample } from '#lib/backendCodeExamples.js';
	import CodeTokens from '#lib/components/CodeTokens.svelte';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	import ExerciseCodeExample from '#lib/components/ExerciseCodeExample.svelte';
	/** @type {{moduleId?:string|null}} */ let { moduleId = null } = $props();
	const interfaceHelp = getInterfaceHelp(), helpTarget = interfaceHelp.target;
	let taskIndex = $state(0);
	let state = $state(createStorageState());
	/** @type {import('#lib/storageExercise.js').StorageMode} */ let mode = $state('original');
	/** @type {import('#lib/storageExercise.js').StorageFrame[]} */ let trace = $state([]);
	/** @type {import('#lib/storageExercise.js').StorageAction|null} */ let action = $state(null);
	let index = $state(0), settled = $state(false), text = $state('Denne meldingen skal bli med videre!');
	let source = $state('post'), selectedLine = $state(''), copyStatus = $state(''), revision = $state(0);
	/** @type {HTMLElement|undefined} */ let resultElement = $state();
	const task = $derived(storageTasks[taskIndex]);
	const current = $derived(trace[index]);
	const shown = $derived(current?.state ?? state);
	const running = $derived(trace.length > 0 && !settled);
	const finalStep = $derived(!!current && index === trace.length - 1);
	const testCopy = $derived(action === 'missing' || action === 'broken');
	const lines = $derived(storageLines(mode, source));
	const selected = $derived(lines.find((item) => item.id === selectedLine));
	const active = $derived(current?.source === source ? current.line : '');
	const canSend = $derived(!running && state.running && !!text.trim() && text.trim().length <= 500 && (state.memory?.length ?? 0) < 50);
	const unsaved = $derived(state.running && JSON.stringify(state.memory) !== JSON.stringify(state.file === null ? [] : JSON.parse(state.file)));
	function clear() { trace = []; action = null; index = 0; settled = false; selectedLine = ''; copyStatus = ''; revision += 1; }
	/** @param {number} next */
	async function chooseTask(next) {
		if (running) return;
		taskIndex = next; clear(); source = next === 1 || next === 4 ? 'read' : 'post'; interfaceHelp.clear();
		await tick(); document.getElementById('storage-task')?.focus();
	}
	/** @param {import('#lib/storageExercise.js').StorageMode} next */
	function changeMode(next) { if (running) return; mode = next; clear(); source = 'post'; }
	/** @param {import('#lib/storageExercise.js').StorageAction} next @param {boolean} [fail] */
	async function run(next, fail = false) {
		if (running || (next === 'send' && !canSend)) return;
		clear(); action = next; trace = runStorage(state, { action: next, mode, text, fail });
		source = trace[0].source;
		noteFeedbackAttempt('oving-5', page.url.pathname + page.url.search);
		await tick(); resultElement?.focus();
	}
	/** Inspecting a prior frame never replays the write or rolls the live chat back. @param {number} next */
	function show(next) {
		index = Math.max(0, Math.min(trace.length - 1, next));
		source = trace[index].source; selectedLine = ''; revision += 1;
		if (index === trace.length - 1 && !settled) {
			if (!testCopy) state = trace[index].state;
			settled = true; finishFeedbackAttempt('oving-5');
		}
	}
	function reset() { if (running) return; state = createStorageState(); mode = 'original'; taskIndex = 0; source = 'post'; text = 'Denne meldingen skal bli med videre!'; clear(); interfaceHelp.clear(); }
	/** @param {string} code */
	async function copyCode(code) {
		try { await navigator.clipboard.writeText(code); copyStatus = 'Koden er kopiert.'; }
		catch { copyStatus = 'Marker koden og kopier med Ctrl+C eller Cmd+C.'; }
	}
	/** @param {unknown} value */
	function display(value) { return value === null ? 'Ikke lastet inn' : JSON.stringify(value, null, 2); }
</script>

<PartnerContext pageId="oving-5" values={{ task: taskIndex, mode, source, event: current?.id ?? null, line: selectedLine || null, revision }} />

<section id="forsok" class="storage" aria-labelledby="storage-task">
	<p class="connection">Bygg videre på <a href={moduleLink('/fillagring/', moduleId)}>Fillagring</a>: samme lagringsoppsett med en liste og en JSON-fil. Her starter du et nytt chatforsøk. Du trenger POST og GET fra før.</p>
	<nav aria-label="Deler i øving 5" class="tasks">
		{#each storageTasks as item, i}<button type="button" class:chosen={taskIndex === i} aria-pressed={taskIndex === i} disabled={running} onclick={() => chooseTask(i)}>{i + 1} · {item.label}</button>{/each}
	</nav>
	<div class="brief" use:helpTarget={{ label: 'Finn oppdraget', hint: 'Start med den korte oppgaven. Koden, filen og minnet hører til samme chatforsøk.', order: 0 }}>
		<p class="eyebrow">DEL {taskIndex + 1} AV {storageTasks.length}</p>
		<h2 id="storage-task" tabindex="-1">{task.title}</h2>
		<p>{task.instruction}</p>
		<p class="observe"><strong>Se etter:</strong> {task.observe}</p>
	</div>
	<div class="controls">
		{#if taskIndex === 0 || taskIndex === 2 || taskIndex === 3}
			<label for="storage-message">Din melding</label>
			<input id="storage-message" maxlength="500" bind:value={text} disabled={running} oninput={clear} />
			{#if !text.trim()}<p class="note">Skriv en melding før du sender.</p>{/if}
			{#if taskIndex >= 2}
				<fieldset disabled={running} use:helpTarget={{ label: 'Bytt koden', hint: 'Velg rekkefølgen i POST. Se kodeendringen under og prøv den med en skrivefeil.', order: 1 }}>
					<legend>Koden du vil prøve</legend>
					<label><input type="radio" name="storage-mode" checked={mode === 'original'} onchange={() => changeMode('original')} /> Endre minnet først</label>
					<label><input type="radio" name="storage-mode" checked={mode === 'repaired'} onchange={() => changeMode('repaired')} /> Lagre ny liste først</label>
				</fieldset>
			{/if}
			<div class="actions" use:helpTarget={{ label: 'Prøv lagringen', hint: 'Send meldingen med vanlig lagring eller med den kontrollerte skrivefeilen. Bruk Neste steg ved koden.', order: 2 }}>
				<button type="button" class:primary={taskIndex === 0} disabled={!canSend} onclick={() => run('send')}>Send og lagre →</button>
				{#if taskIndex >= 2}<button type="button" class="primary" disabled={!canSend} onclick={() => run('send', true)}>Send med skrivefeil →</button>{/if}
			</div>
		{/if}
		{#if taskIndex !== 4}
			<button type="button" class:primary={taskIndex === 1} disabled={running} onclick={() => run('restart')} use:helpTarget={{ label: 'Prøv omstart', hint: 'Omstart tømmer serverens minne og leser den samme filen inn igjen. Filen beholdes.', order: 3 }}>Start serveren på nytt</button>
			{#if unsaved && !running}<p class="notice">Minnet har ulagrede meldinger. Ved omstart forsvinner de; bare det som står i filen kommer tilbake.</p>{/if}
		{:else}
			<div class="actions"><button type="button" class="primary" disabled={running} onclick={() => run('missing')}>Prøv manglende fil</button><button type="button" disabled={running} onclick={() => run('broken')}>Prøv ødelagt JSON</button></div>
			<p class="note">Disse to forsøkene bruker testkopier. Filen med meldingene dine her beholdes.</p>
		{/if}
		{#if (state.memory?.length ?? 0) >= 50}<p class="notice">Forsøket har nå 50 meldinger. Bruk «Nullstill hele forsøket» for å begynne igjen.</p>{/if}
		{#key taskIndex}<details><summary use:helpTarget={{ label: 'Få et hint', hint: 'Åpne et kort råd til akkurat denne delen. Du kan prøve så mange ganger du vil.', order: 6 }}>Jeg trenger et hint</summary><p>{task.hint}</p></details>{/key}
	</div>
	<div class="workspace" bind:this={resultElement} role="region" tabindex="-1" aria-label="Kode, minne og JSON-fil">
		<div class="code-panel">
			{#if settled && !finalStep}<p class="notice">Du ser et tidligere steg. Nye handlinger fortsetter fra slutten av kjøringen; filskrivingen gjentas ikke.</p>{/if}
			<div class="code-heading"><h3>Koden i chatten</h3><button type="button" onclick={() => copyCode(lines.map((item) => item.code).join('\n'))}>Kopier utdrag</button></div>
			<div class="code-tabs" aria-label="Velg kodeutdrag">
				{#each [{ id: 'post', title: 'POST /meldinger' }, { id: 'save', title: 'Lagre filen' }, { id: 'read', title: 'Lese ved oppstart' }] as tab}<button type="button" class:chosen={source === tab.id} aria-pressed={source === tab.id} onclick={() => { source = tab.id; selectedLine = ''; }}>{tab.title}</button>{/each}
			</div>
			<p class="note">{mode === 'original' ? 'POST endrer minnet før lagringen.' : 'POST lagrer nyListe før den bytter minnet.'} {source === 'post' ? 'nyMelding er allerede laget og kontrollert i ruten din.' : source === 'save' ? 'Funksjonen skriver til en midlertidig fil før den erstatter meldinger.json.' : 'Oppstarten leser eksisterende data; den skriver ikke startdata over filen.'}</p>
			{#if trace.length}
				<div class="actions steps"><button type="button" disabled={index === 0} onclick={() => show(index - 1)}>← Forrige</button><span>Steg {index + 1}/{trace.length}</span><button type="button" class="primary" disabled={finalStep} onclick={() => show(index + 1)} use:helpTarget={{ label: 'Følg neste kodelinje', hint: 'Gå videre i kjøringen. Pilen viser hvor vi er i koden, og dataene viser virkningen.', order: 4 }}>Neste steg →</button><button type="button" disabled={finalStep} onclick={() => show(trace.length - 1)}>Kjør ferdig</button></div>
			{/if}
			<div class="code-lines" role="group" aria-label="Velg en kodelinje for forklaring">
				{#each lines as item, i}<button type="button" class:active={active === item.id} class:selected={selectedLine === item.id} aria-pressed={selectedLine === item.id} aria-label={`${active === item.id ? 'Aktuell linje. ' : ''}Forklar: ${item.code}`} onclick={() => selectedLine = item.id}><span aria-hidden="true">{active === item.id ? '→' : i + 1}</span><code><CodeTokens source={item.code} /></code></button>{/each}
			</div>
			{#if selected}<p class="line-help" aria-live="polite">{selected.explanation}</p>{:else}<p class="note">Velg en kodelinje for en kort forklaring.</p>{/if}
			<p class="copy-status" role="status">{copyStatus}</p>
		</div>
		<div class="data-panel" use:helpTarget={{ label: 'Se minne og JSON', hint: 'Sammenlign listen i minnet med den faktiske filteksten i forsøket. De kan være forskjellige når lagringen feiler.', order: 5 }}>
			<div class="outcome" role="status" aria-live="polite" aria-atomic="true">
				<p class="eyebrow">{testCopy ? 'TESTKOPI' : 'SAMME CHATFORSØK'}</p>
				<h3>{current?.title ?? 'To meldinger er lagret fra før'}</h3>
				<p>{current?.text ?? 'Send din egen melding. Følg den fra koden til filen, og les den tilbake etter omstart.'}</p>
				{#if current}<p><strong>{current.status}</strong></p>{/if}
			</div>
			<section><h4>Backend · meldinger i minnet</h4><p class="note">{shown.running ? 'GET /meldinger bruker denne listen.' : 'Serveren er ikke klar til å svare ennå.'}</p><!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard scroll for JSON.) --><pre tabindex="0" role="region" aria-label="Meldinger i minnet"><code>{display(shown.memory)}</code></pre></section>
			<section><h4>Filen · meldinger.json</h4><p class="note">JSON-tekst som beholdes ved omstart.</p><!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard scroll for JSON.) --><pre tabindex="0" role="region" aria-label="JSON-filen"><code>{shown.file ?? 'Filen finnes ikke.'}</code></pre></section>
			{#if current?.working && action === 'send'}<section><h4>Arbeidskopi · nyListe</h4><p class="note">En ny liste, før den eventuelt tas i bruk.</p><!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard scroll for JSON.) --><pre tabindex="0" role="region" aria-label="Mellomresultat"><code>{display(current.working)}</code></pre></section>{/if}
			{#if current?.id === 'parse'}<section><h4>Innlesing · liste</h4><!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard scroll for JSON.) --><pre tabindex="0" role="region" aria-label="Mellomresultat"><code>{display(current.working)}</code></pre></section>{/if}
			{#if current?.source === 'save'}<section><h4>{current.temp ? 'Midlertidig fil · meldinger.json.tmp' : 'JSON-teksten til skriving'}</h4><!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard scroll for JSON.) --><pre tabindex="0" role="region" aria-label="JSON-tekst til skriving"><code>{current.temp ?? current.json ?? 'Ingen ny filtekst ennå.'}</code></pre></section>{/if}
		</div>
	</div>
	<div class="practice">
		<h3>Gjør samme steg i egen chat</h3><p>{task.project}</p>
		<a href="#eget-prosjekt">Vis kode og plassering i prosjektet ↓</a>
		{#if finalStep}<p><strong>Prøv videre:</strong> {taskIndex === 0 ? 'Start serveren på nytt og finn igjen din melding.' : taskIndex === 1 ? 'Send en ny melding med en kontrollert skrivefeil.' : taskIndex === 2 ? 'Gå til Endre koden. Les filen på nytt før du sammenligner løsningene.' : taskIndex === 3 ? 'Prøv både vanlig lagring og skrivefeil. Forklar hvorfor minnet bare endres ved vellykket lagring.' : 'Forklar hvorfor den ødelagte filen må bevares. Prøv tilsvarende i en egen testmappe.'}</p>{/if}
		<div class="actions"><button type="button" disabled={running || taskIndex === 0} onclick={() => chooseTask(taskIndex - 1)}>← Forrige del</button>{#if taskIndex < storageTasks.length - 1}<button type="button" class="primary" disabled={running} onclick={() => chooseTask(taskIndex + 1)}>Neste del →</button>{:else}<a href="#eget-prosjekt">Bruk løsningen i egen chat →</a>{/if}</div>
	</div>
	<div id="eget-prosjekt" class="project" tabindex="-1">
		<h2>Koden i din egen backend</h2>
		<p>Fortsett i <code>server.js</code> fra Fillagring. Behold GET/POST, datamappen og meldingene dine. Bruk din eksisterende filsti; JSON-filen skal ligge utenfor <code>public</code> og <code>static</code>.</p>
		<ol><li>Erstatt den gamle <code>node:fs</code>-importen, deklarasjonene av <code>fil</code> og <code>meldinger</code> og lagringsfunksjonene med oppsettet nedenfor. Behold din filsti og øvrige importer. Hver variabel skal bare deklareres én gang.</li><li>I POST: erstatt <code>push</code>, det gamle lagringskallet og svaret med den forbedrede koden. Behold koden som lager og kontrollerer <code>nyMelding</code>.</li><li>Prøv vanlig sending, omstart og skrivefeil. GET og filen skal vise de forventede dataene, også etter et avvist lagringsforsøk.</li></ol>
		<details><summary>Vis hele lagringsoppsettet · før rutene i server.js</summary><button type="button" onclick={() => copyCode(storageSetupCode)}>Kopier lagringsoppsett</button><!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard scroll for code.) --><pre tabindex="0" role="region" aria-label="Komplett lagringsoppsett"><code><CodeTokens source={storageSetupCode} /></code></pre><p>Start Node fra backendmappen. Filstien må peke på filen du allerede bruker. Bare manglende fil gir en tom liste; øvrige lesefeil stopper oppstarten.</p></details>
		<details><summary>Vis den forbedrede POST-koden</summary><!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard scroll for code.) --><pre tabindex="0" role="region" aria-label="Forbedret POST-kode"><code><CodeTokens source={storageLines('repaired', 'post').map((item) => item.code).join('\n')} /></code></pre></details>
		<details><summary>Hvordan prøver jeg en skrivefeil?</summary><p>Bruk en testkopi av prosjektet. Sett <code>throw new Error("Test: skrivingen feiler");</code> først inne i <code>lagreMeldinger</code>. Send en melding. Kontroller feilsvaret, GET og filen. Fjern testlinjen og prøv igjen.</p></details>
		<details><summary>Hvorfor en midlertidig fil?</summary><p>Den nye JSON-teksten skrives ferdig i <code>meldinger.json.tmp</code> før <code>renameSync</code> erstatter datafilen. Vi utvider dermed filskrivingen fra Fillagring. Forsøket her simulerer en feil før skriving, ikke alle mulige diskfeil. Oppsettet er for små datamengder og én backendprosess; filbytte erstatter ikke backup.</p></details>
		<p class="note">IT-laben kjører ikke prosjektet på maskinen din. Vis læreren én fungerende test og ett feiltilfelle, og forklar hva koden gjorde. Prøv senere å lagre en annen liten liste med mindre hjelp.</p>
	</div>
	<details class="extra"><summary>Ekstra: et lite Node-eksempel uten Express</summary><p>Dette er en separat grunnøving. Skriptet erstatter øvingsfilen med startdata hver gang; det skal ikke brukes på chatfilen din. Øving 6s separate Node-eksempel bruker denne øvingsfilen.</p><ExerciseCodeExample example={storageExample} /></details>
	<footer><p>Simulering: dataene beholdes mellom handlingene her, frem til omlasting eller du forlater siden. Forrige/Neste viser kjøringen uten å gjenta filskriving. Ingen ekte filer skrives.</p><button type="button" disabled={running} onclick={reset}>Nullstill hele forsøket</button></footer>
</section>

<style>
	.storage { border: 1px solid var(--color-border); border-radius: var(--radius-card); background: var(--color-surface); color: var(--color-text); overflow: hidden; }
	.connection, .brief, .controls, .practice, .project, .extra, footer { padding: 18px 22px; }
	.connection { margin: 0; background: var(--color-surface-soft); }
	.tasks, .actions, .code-tabs, .code-heading { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
	.tasks { padding: 12px 22px; border-block: 1px solid var(--color-border); }
	button, input { font: inherit; color: var(--color-text); }
	button { min-height: 44px; padding: 9px 13px; border: 1px solid var(--color-border-strong); border-radius: 8px; background: var(--color-surface); cursor: pointer; }
	button:hover:enabled { background: var(--color-surface-hover); }
	button:disabled { opacity: .5; cursor: default; }
	button.primary, button.chosen { background: var(--color-action); color: var(--color-on-action); border-color: var(--color-action); }
	button.primary:hover:enabled, button.chosen:hover:enabled { background: var(--color-action-hover); }
	button.chosen { text-decoration: underline; text-underline-offset: 4px; }
	h2, h3, h4 { margin: 0 0 8px; }
	h2 { font-size: 1.5rem; } h3 { font-size: 1.15rem; } h4 { font-size: 1rem; }
	p, li { font-size: var(--font-body); line-height: var(--leading-body); max-width: 70ch; }
	p { margin: 8px 0; } li + li { margin-top: 8px; }
	.eyebrow, .note, .copy-status { font-size: var(--font-small); color: var(--color-text-muted); }
	.eyebrow { font-weight: 700; }
	.controls { padding-top: 0; }
	.controls > label { display: block; font-weight: 650; margin-bottom: 6px; }
	.controls > input { width: min(100%, 640px); padding: 12px; background: var(--color-surface); border: 1px solid var(--color-border-strong); border-radius: 8px; box-sizing: border-box; }
	fieldset { border: 0; padding: 12px 0; margin: 0; }
	legend { padding-top: 12px; font-weight: 650; }
	fieldset label { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; margin-right: 20px; }
	.actions { margin-block: 12px; }
	.workspace { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 20px; padding: 22px; border-block: 1px solid var(--color-border); }
	.code-panel, .data-panel { min-width: 0; }
	.code-heading { justify-content: space-between; margin-bottom: 10px; }
	.code-tabs { margin-bottom: 12px; }
	.code-lines { padding: 8px; background: var(--color-code-bg); border-radius: 8px; }
	.code-lines button { display: flex; width: 100%; text-align: left; gap: 10px; background: transparent; color: var(--color-code-text); border-color: transparent; padding: 7px 5px; }
	.code-lines button:hover:enabled { background: var(--color-code-bg); border-color: var(--color-code-text); }
	.code-lines button.active { border-left: 4px solid var(--color-code-text); }
	.code-lines button.selected { outline: 1px solid var(--color-code-text); outline-offset: -1px; }
	.code-lines button span { width: 2ch; flex-shrink: 0; }
	code { font: var(--font-code)/var(--leading-code) monospace; }
	.code-lines code { white-space: pre-wrap; overflow-wrap: anywhere; }
	pre { margin: 8px 0 16px; padding: 14px; border-radius: 8px; background: var(--color-code-bg); color: var(--color-code-text); overflow: auto; max-height: 380px; }
	.data-panel pre { white-space: pre-wrap; overflow-wrap: anywhere; }
	.outcome, .line-help, .notice { padding: 14px; background: var(--color-info-soft); border-left: 3px solid var(--color-info); }
	.outcome { margin-bottom: 16px; }
	.data-panel section { margin-top: 16px; }
	.practice { background: var(--color-surface-soft); }
	.project { border-top: 1px solid var(--color-border); scroll-margin-top: 90px; }
	summary { display: flex; align-items: center; min-height: 44px; padding-block: 8px; cursor: pointer; color: var(--color-action); font-weight: 650; }
	summary::before { content: '+ '; white-space: pre; } details[open] > summary::before { content: '− '; }
	a { color: var(--color-action); text-underline-offset: 4px; }
	footer { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; border-top: 1px solid var(--color-border); }
	footer p { font-size: var(--font-small); color: var(--color-text-muted); flex: 1 1 320px; }
	:is(button, input, summary, a, pre, [tabindex]):focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	@media (max-width: 1000px) { .workspace { grid-template-columns: minmax(0, 1fr); } }
	@media (max-width: 500px) { .connection, .brief, .controls, .practice, .project, .extra, footer, .workspace { padding: 16px; } .tasks { padding: 12px 16px; } }
</style>
