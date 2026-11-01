<script>
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { taskStartValues } from '#lib/ovingene.js';
	import { buildTrace } from '#lib/ovingModel.js';
	import { exerciseFeedback } from '#lib/exerciseFeedback.js';
	import { moduleLink } from '#lib/moduleNavigation.js';
	import { validationJourney } from '#lib/backendValidation.js';
	import { playgroundChoices, playgroundResultIndex, playgroundAction, requestText } from '#lib/exercisePlayground.js';
	import { lessonChoices } from '#lib/partnerContext.js';
	import { getInterfaceHelp } from '#lib/interfaceHelp.js';
	import { noteFeedbackAttempt, finishFeedbackAttempt } from '#lib/activityFeedbackClient.js';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	import CodeTokens from '#lib/components/CodeTokens.svelte';
	import ExerciseMessages from '#lib/components/ExerciseMessages.svelte';
	/** @type {{lesson:import('#lib/ovingene.js').Lesson,moduleId?:string|null}} */
	let { lesson, moduleId = null } = $props();
	const interfaceHelp = getInterfaceHelp(), helpTarget = interfaceHelp.target;
	/** @type {number|null} */ let selectedTask = $state(null);
	const taskIndex = $derived(selectedTask ?? lesson.firstTask ?? 0);
	const task = $derived(lesson.tasks[taskIndex]);
	const order = $derived([lesson.firstTask ?? 0, ...lesson.tasks.map((_, i) => i).filter((i) => i !== (lesson.firstTask ?? 0))]);
	const position = $derived(order.indexOf(taskIndex));
	/** @type {Record<string,string>} */ let values = $state({});
	/** @type {import('#lib/ovingModel.js').Step[]} */ let trace = $state([]);
	let index = $state(0), selectedLine = $state(0), codeOpen = $state(false);
	/** @type {HTMLElement|undefined} */ let resultElement = $state();
	const current = $derived(trace[index]);
	const before = $derived(trace[0] ?? buildTrace(lesson.number, Object.keys(values).length ? values : taskStartValues(lesson))[0]);
	const frame = $derived(current ?? before);
	const finished = $derived(!!current && index === trace.length - 1);
	const awaitingGet = $derived(lesson.number === 6 && current?.title === 'Ta i bruk listen og svar');
	const browserDiffers = $derived(JSON.stringify(frame.data['Minne · meldinger']) !== JSON.stringify(frame.data['Nettleserens liste']));
	const feedback = $derived(finished ? exerciseFeedback(lesson.number, trace) : null);
	const scenarioChoices = $derived(playgroundChoices(lesson, taskIndex));
	const scenarioField = $derived(lesson.fields.find((field) => field.key === 'scenario'));
	const visibleFields = $derived(lesson.fields.filter((field) => lesson.number === 6
		? ['method', 'id'].includes(field.key) || (field.key === 'text' && values.method === 'PATCH')
		: lesson.number === 5 && field.key === 'text' && ['save', 'fail'].includes(values.scenario)));
	const panels = $derived(lesson.number === 6
		? [{ title: 'Backend · minne', key: 'Minne · meldinger' }, { title: 'Chatten · i nettleseren', key: 'Nettleserens liste' }]
		: [{ title: 'Backend · minne', key: 'Minne · meldinger' }, { title: 'Filen · meldinger.json', key: 'Disk · meldinger.json' }]);
	$effect(() => {
		values = taskStartValues(lesson);
		selectedTask = null;
		clear();
		interfaceHelp.clear();
	});
	function clear() { trace = []; index = 0; selectedLine = 0; codeOpen = false; }
	/** @param {number} next */
	function chooseTask(next) {
		selectedTask = next;
		values = taskStartValues(lesson, next);
		clear();
		interfaceHelp.clear();
	}
	async function nextTask() {
		chooseTask(order[position + 1]);
		await tick();
		document.getElementById('lab-title')?.focus();
	}
	/** @param {string} scenario */
	function chooseScenario(scenario) {
		values.scenario = scenario;
		clear();
	}
	async function run() {
		noteFeedbackAttempt(`oving-${lesson.number}`, page.url.pathname + page.url.search);
		trace = buildTrace(lesson.number, values);
		index = playgroundResultIndex(lesson.number, trace);
		selectedLine = 0;
		codeOpen = false;
		if (finished) finishFeedbackAttempt(`oving-${lesson.number}`);
		await tick();
		resultElement?.focus();
	}
	/** @param {number} next */
	function showStep(next) {
		index = Math.max(0, Math.min(trace.length - 1, next));
		selectedLine = 0;
		if (finished) finishFeedbackAttempt(`oving-${lesson.number}`);
	}
	async function fetchMessages() { showStep(index + 1); await tick(); resultElement?.focus(); }
	function openProject() {
		const project = document.getElementById('eget-prosjekt');
		if (project instanceof HTMLDetailsElement) project.open = true;
	}
	/** @param {unknown} value */
	function display(value) { return typeof value === 'string' ? value : JSON.stringify(value, null, 2); }
</script>

<PartnerContext pageId={`oving-${lesson.number}`} values={{ choices: lessonChoices(lesson, values), step: current ? index : -1, line: codeOpen && current ? selectedLine : -1, task: taskIndex }} />

<section id="forsok" class="playground" aria-labelledby="lab-title">
	<nav class="tasks" aria-label="Velg oppdrag">
		{#each order as id, i}<button type="button" aria-pressed={taskIndex === id} class:chosen={taskIndex === id} onclick={() => chooseTask(id)}>{i + 1} · {lesson.tasks[id].label}</button>{/each}
	</nav>
	<div class="brief" use:helpTarget={{ label: 'Hva skal jeg gjøre?', hint: 'Les oppdraget, velg et forsøk og trykk på handlingsknappen.', order: 1 }}>
		<p class="eyebrow">OPPDRAG {position + 1} AV {order.length} · PRØV HER PÅ SIDEN</p>
		<h2 id="lab-title" tabindex="-1">{task.title}</h2>
		<p>{task.instruction}</p>
	</div>
	<div class="workspace">
		<form onsubmit={(event) => { event.preventDefault(); run(); }} use:helpTarget={{ label: 'Endre forsøket', hint: 'Velg hva du vil sende eller endre. Resultatet vises ved siden av, eller nedenfor på mobil.', order: 2 }}>
			{#if scenarioChoices.length}<fieldset><legend>Velg forsøk</legend><div class="choices">
				{#each scenarioChoices as choice}<button type="button" aria-pressed={values.scenario === choice.value} class:chosen={values.scenario === choice.value} onclick={() => chooseScenario(choice.value)}>{choice.label}</button>{/each}
			</div></fieldset>{/if}
			{#each visibleFields as field}
				<label for={`play-${field.key}`}>{field.label}</label>
				{#if field.kind === 'select'}
					<select id={`play-${field.key}`} bind:value={values[field.key]} onchange={clear}>{#each field.choices ?? [] as choice}<option value={choice.value}>{choice.label}</option>{/each}</select>
				{:else}<textarea id={`play-${field.key}`} rows="2" maxlength="16000" bind:value={values[field.key]} oninput={clear}></textarea>{/if}
			{/each}
			{#if lesson.number === 7 && values.scenario === 'custom'}
				<label for="play-message">Meldingen du vil sende</label>
				<textarea id="play-message" rows="2" maxlength="12000" value={requestText(values.body)} oninput={(event) => { values.body = JSON.stringify({ avsender: 'Ada', tekst: event.currentTarget.value }); clear(); }}></textarea>
			{/if}
			{#if scenarioField}<p class="small">Valgt: {scenarioField.choices?.find((choice) => choice.value === values.scenario)?.label.replace('Bruk JSON-feltet nedenfor', 'Din egen melding')}</p>{/if}
			{#if lesson.number === 5 && values.scenario === 'restart'}<p class="small">Dette forsøket leser to ferdiglagrede eksempelmeldinger, ikke meldingen fra forrige forsøk.</p>{/if}
			<button class="primary run" type="submit" disabled={!Object.keys(values).length} use:helpTarget={{ label: 'Prøv handlingen', hint: 'Trykk her. Se etterpå hvilke meldinger som ble endret og hvilket svar serveren ga.', order: 3 }}>{playgroundAction(lesson.number, values)} →</button>
			<details class="extra"><summary>Flere forsøk og innstillinger</summary>
				{#if scenarioField}<label for="play-scenario">Alle forsøk</label><select id="play-scenario" bind:value={values.scenario} onchange={clear}>{#each scenarioField.choices ?? [] as choice}<option value={choice.value}>{choice.label}</option>{/each}</select>{/if}
				{#if lesson.number === 6}<label for="play-disk">Lagring</label><select id="play-disk" bind:value={values.disk} onchange={clear}><option value="ok">Filen kan lagres</option><option value="fail">Filen kan ikke lagres</option></select>{/if}
				{#if lesson.number === 7 && values.scenario === 'custom'}<label for="play-body">Rediger request som JSON</label><textarea id="play-body" rows="5" maxlength="16000" bind:value={values.body} oninput={clear} spellcheck="false"></textarea>{/if}
			</details>
			{#key taskIndex}<details><summary use:helpTarget={{ label: 'Finn hint', hint: 'Åpne hintet for ett råd til oppdraget.', order: 6 }}>Jeg trenger et hint</summary><p>{task.hint}</p></details>{/key}
		</form>
		<div class="result" bind:this={resultElement} role="region" tabindex="-1" aria-label="Resultatet av forsøket">
			<div class="status" role="status" aria-live="polite" aria-atomic="true">
				{#if current}<p class="eyebrow">{finished ? 'RESULTAT' : 'UNDERVEIS'}</p><h3>{current.title}</h3><p><strong>{current.status}</strong></p>
				{:else}<h3>Dette er utgangspunktet</h3><p>Prøv handlingen. Se hva som endres her.</p>{/if}
			</div>
			<div class="messages">{#each panels as panel}<ExerciseMessages title={panel.title} before={before.data[panel.key]} after={frame.data[panel.key]} ran={!!current} />{/each}</div>
			{#if lesson.number === 7 && current && frame.data['Tekstlengde før trim'] !== undefined}<p class="trim">Tekstlengde: <strong>{frame.data['Tekstlengde før trim']}</strong> → etter trim: <strong>{frame.data['Tekstlengde etter trim']}</strong></p>{/if}
			{#if awaitingGet}<div class="follow-up"><p>{browserDiffers ? 'Backend har lagret endringen. Chatten viser fortsatt den gamle listen.' : 'Backend har svart. Hent listen for å oppdatere chatten; den valgte teksten var allerede lik.'}</p><button type="button" class="primary" onclick={fetchMessages} use:helpTarget={{ label: 'Oppdater chatten', hint: 'Trykk her for å hente serverens nye liste til nettleseren med GET.', order: 4 }}>Hent chatten på nytt · GET →</button></div>
			{:else if feedback}<p class="cause">{feedback.cause}</p>{/if}
		</div>
	</div>
	{#if current}
		<details class="code-details" bind:open={codeOpen}>
			<summary use:helpTarget={{ label: 'Se data og kode', hint: 'Åpne for å følge forsøket steg for steg og undersøke kodelinjene.', order: 5 }}>Se hvorfor · data og kode steg for steg</summary>
			<div class="step-controls"><button type="button" onclick={() => showStep(0)} disabled={index === 0}>Fra starten</button><button type="button" onclick={() => showStep(index - 1)} disabled={index === 0}>← Forrige steg</button><span>Steg {index + 1} / {trace.length}</span><button type="button" onclick={() => showStep(index + 1)} disabled={finished}>Neste steg →</button></div>
			<p>{current.text}</p><p><strong>{current.file}</strong> · kodeutdrag</p>
			<div class="code-lines" role="group" aria-label="Velg en kodelinje for forklaring">
				{#each current.code as line, i}<button type="button" class:chosen={selectedLine === i} aria-pressed={selectedLine === i} onclick={() => (selectedLine = i)} aria-label={`Forklar linje ${i + 1}: ${line[0]}`}><span aria-hidden="true">{i + 1}</span><code><CodeTokens source={line[0]} /></code></button>{/each}
			</div><p aria-live="polite"><strong>Linje {selectedLine + 1}:</strong> {current.code[selectedLine]?.[1]}</p>
			<details><summary>Vis rådata for dette steget</summary>{#each Object.entries(current.data) as [label, value]}<h4>{label}</h4><!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to scroll raw data.) --><pre tabindex="0" role="region" aria-label={label}>{display(value)}</pre>{/each}</details>
		</details>
		{#key taskIndex}<details class="explanation"><summary>Hva skal jeg oppdage?</summary><p>{task.observe}</p><p>{task.answer}</p>{#if feedback}<p><strong>Prøv videre:</strong> {feedback.next}</p>{/if}</details>{/key}
		{#if finished}<div class="next"><p>Prøv gjerne en annen variant og sammenlign.</p>{#if position < order.length - 1}<button type="button" onclick={nextTask}>Neste oppdrag →</button>{:else if lesson.number === 7}<a href={moduleLink(validationJourney[1].href, moduleId)}>Reparer tekstkontrollen →</a>{:else}<a href="#eget-prosjekt" onclick={openProject}>Bruk dette i egen chat →</a>{/if}</div>{/if}
	{/if}
	<p class="simulation">Simulator · Hvert forsøk starter med eksempeldata på nytt. Valgene lagres ikke når du forlater siden.</p>
</section>

<style>
	.playground { border: 1px solid var(--color-border); border-radius: var(--radius-card); background: var(--color-surface); overflow: hidden; color: var(--color-text); }
	button, select, textarea { font: inherit; color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border-strong); border-radius: 8px; }
	button, summary, select, a { min-height: 44px; cursor: pointer; }
	button { padding: 10px 14px; font-weight: 650; }
	button:hover:enabled { background: var(--color-surface-hover); }
	button:disabled { opacity: .45; cursor: default; }
	.primary, .chosen { background: var(--color-action); color: var(--color-on-action); border-color: var(--color-action); }
	.primary:hover:enabled, .chosen:hover:enabled { background: var(--color-action-hover); }
	.chosen { text-decoration: underline; text-underline-offset: 4px; }
	:is(button, select, textarea, summary, a, pre, .result, h2):focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	.tasks, .choices, .step-controls, .next { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
	.tasks { padding: 12px; border-bottom: 1px solid var(--color-border); background: var(--color-surface-soft); }
	.brief { padding: 20px 20px 0; }
	.eyebrow, .small, .simulation { font-size: var(--font-small); color: var(--color-text-muted); }
	.eyebrow { margin: 0 0 8px; font-weight: 650; }
	h2 { margin: 0; font-size: 1.5rem; line-height: 1.3; }
	h3 { margin: 0; font-size: 1.2rem; }
	p { font-size: var(--font-body); line-height: var(--leading-body); max-width: 65ch; margin: 10px 0; }
	.workspace { display: grid; grid-template-columns: minmax(220px, .8fr) minmax(0, 2fr); gap: 24px; padding: 20px; }
	form, .result { min-width: 0; }
	fieldset { margin: 0; padding: 0; border: 0; }
	legend, label { display: block; font-weight: 650; margin: 12px 0 8px; }
	legend { margin-top: 0; }
	select, textarea { width: 100%; box-sizing: border-box; padding: 10px; }
	textarea { resize: vertical; }
	.run { display: block; width: 100%; margin: 16px 0 8px; }
	summary { display: flex; align-items: center; padding-block: 10px; color: var(--color-action); font-weight: 650; }
	summary::before { content: '+ '; white-space: pre; }
	details[open] > summary::before { content: '− '; }
	.status { min-height: 94px; }
	.messages { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
	.follow-up, .cause, .trim { padding: 14px; border-left: 3px solid var(--color-info); background: var(--color-info-soft); }
	.code-details, .explanation, .next { margin: 0 20px; border-top: 1px solid var(--color-border); padding-block: 8px; }
	.step-controls { margin-block: 12px; }
	.code-lines { background: var(--color-code-bg); padding: 8px; border-radius: 8px; }
	.code-lines button { display: flex; width: 100%; gap: 12px; text-align: left; background: transparent; color: var(--color-code-text); border: 1px solid transparent; min-height: 44px; }
	.code-lines button.chosen { border-color: var(--color-code-text); text-decoration: none; }
	.code-lines button:hover { background: var(--color-code-bg); }
	code { font: var(--font-code)/var(--leading-code) monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
	pre { overflow: auto; max-height: 320px; padding: 12px; background: var(--color-code-bg); color: var(--color-code-text); }
	.next { justify-content: space-between; }
	a { display: inline-flex; align-items: center; color: var(--color-action); text-underline-offset: 4px; }
	.simulation { margin: 0; padding: 16px 20px; max-width: none; }
	@media (max-width: 760px) { .workspace { grid-template-columns: minmax(0, 1fr); } }
	@media (max-width: 460px) { .messages { grid-template-columns: minmax(0, 1fr); } .workspace, .brief { padding: 16px; } .brief { padding-bottom: 0; } }
</style>
