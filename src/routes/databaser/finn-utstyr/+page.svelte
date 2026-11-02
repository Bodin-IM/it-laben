<script>
	import { tick } from 'svelte';
	import DatabaseFrame from '#lib/components/DatabaseFrame.svelte';
	import EquipmentCard from '#lib/components/EquipmentCard.svelte';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	import { lab, learningContext } from '#lib/lab.js';
	import { createDatabaseProgress } from '#lib/databaseProgress.svelte.js';
	import { createDatabasePlace } from '#lib/databasePlace.svelte.js';
	import { queryFeedback } from '#lib/databaseWorkshop.js';
	import { getInterfaceHelp } from '#lib/interfaceHelp.js';
	import { equipment, queryTasks, queryOptions, queryCode, inspectQuery, sameIds, sameQuery, queryPasses, completedQueries } from '#lib/databaseCourse.js';
	const help = getInterfaceHelp(), helpTarget = help.target;
	const scope = $derived(`${$lab.user?.id ?? 'guest'}:${$learningContext.mode}:${$learningContext.openingId ?? ''}`);
	const progress = createDatabaseProgress(() => scope);
	const place = createDatabasePlace('database-finn', () => scope);
	const taskId = $derived(place.state.position);
	const task = $derived(queryTasks.find((item) => item.id === taskId) ?? queryTasks[0]);
	const attempt = $derived(progress.state.attempts[task.id]);
	let prediction = $state(/** @type {string[]} */ ([]));
	let inspectedId = $state('');
	let action = $state('opened');
	let hintCount = $state(0);
	$effect(() => { taskId; scope; prediction = []; hintCount = 0; inspectedId = ''; action = 'opened'; help.clear(); });
	const stale = $derived(!!attempt.run && !sameQuery(attempt.choices, attempt.run.choices));
	const rows = $derived(attempt.run ? inspectQuery(attempt.run.choices) : []);
	const found = $derived(rows.filter((row) => row.matches));
	const inspected = $derived(rows.find((row) => row.document._id === inspectedId));
	const feedback = $derived(attempt.run ? queryFeedback(task.id, attempt.run.choices) : null);
	const passed = $derived(!!attempt.run && !stale && queryPasses(task.id, attempt.run.choices));
	const complete = $derived(completedQueries(progress.state.attempts));
	const currentIndex = $derived(queryTasks.findIndex((item) => item.id === task.id));
	async function selectTask(/** @type {string} */ id) {
		await place.select(id);
		await tick();
		document.getElementById('task-heading')?.focus();
	}
	function change(/** @type {keyof import('#lib/databaseCourse.js').QueryChoices} */ field, /** @type {string} */ value) {
		progress.save(task.id, { ...attempt, choices: { ...attempt.choices, [field]: value } });
		action = 'filter-changed';
	}
	function run() {
		progress.save(task.id, { choices: { ...attempt.choices }, run: { choices: { ...attempt.choices }, prediction: [...prediction] } });
		action = 'query-run';
		inspectedId = '';
	}
	async function inspect(/** @type {string} */ id) {
		inspectedId = id;
		action = 'document-inspected';
		await tick();
		document.getElementById('document-inspection')?.focus();
	}
	function toggle(/** @type {string} */ id) { prediction = prediction.includes(id) ? prediction.filter((item) => item !== id) : [...prediction, id]; }
</script>

<PartnerContext pageId="database-finn" values={{ taskId: task.id, choices: attempt.choices, prediction, run: attempt.run, inspectedId: inspectedId || null, action, hintCount }} />
<DatabaseFrame activityId="database-finn">
	<nav class="db-task-nav" aria-label="Søkeoppdrag">
		{#each queryTasks as item, i}<button class:active={task.id === item.id} aria-current={task.id === item.id ? 'step' : undefined} onclick={() => selectTask(item.id)} disabled={!place.state.ready}>
			<span>{i + 1}. {item.title}</span><small>{complete.includes(item.id) ? '✓ Søket består' : 'Prøv søket'}</small>
		</button>{/each}
	</nav>
	<section class="db-panel" aria-labelledby="task-heading">
		<p class="db-eyebrow">Bestilling {currentIndex + 1} av 3</p>
		<h2 id="task-heading" tabindex="-1">{task.title}</h2>
		<p class="brief">{task.brief}</p>
		<div class="db-controls filters" role="group" aria-label="Bygg filteret" tabindex="-1" use:helpTarget={{ label: 'Bygg filteret', hint: 'Velg kravene til utstyret. Ingen betingelse betyr at feltet ikke begrenser søket.', order: 1 }}>
			{#each Object.entries(queryOptions) as [field, options]}<label>{field === 'kategori' ? 'Kategori' : field === 'tilgjengelig' ? 'Tilgjengelig' : 'Dagspris'}
				<select disabled={!progress.state.ready} value={attempt.choices[/** @type {keyof import('#lib/databaseCourse.js').QueryChoices} */ (field)]} onchange={(event) => change(/** @type {keyof import('#lib/databaseCourse.js').QueryChoices} */ (field), event.currentTarget.value)}>
					{#each options as option}<option value={option.value}>{option.label}</option>{/each}
				</select>
			</label>{/each}
		</div>
		<pre aria-label="MongoDB-koden for valgene dine"><code>{queryCode(attempt.choices)}</code></pre>
		<div class="db-actions">
			<button class="db-button" disabled={!progress.state.ready} onclick={run} use:helpTarget={{ label: 'Kjør søket', hint: 'Kjør filteret. Kortene viser hvilke dokumenter søket finner.', order: 2 }}>Kjør søket →</button>
			<button class="db-button secondary" disabled={hintCount === task.hints.length} onclick={() => { hintCount = Math.min(hintCount + 1, task.hints.length); action = 'hint-opened'; }}>Gi meg et hint</button>
		</div>
		{#each task.hints.slice(0, hintCount) as hint}<p class="db-callout">{hint}</p>{/each}
		<details><summary>Gjett treffene før du kjører</summary><fieldset><legend>Hvilke dokumenter tror du blir med?</legend><div class="db-options">
			{#each equipment as item}<label><input type="checkbox" checked={prediction.includes(item._id)} onchange={() => toggle(item._id)} />{item._id} · {item.navn}</label>{/each}
		</div></fieldset><p class="db-muted">Du kan la alle være umarkert hvis du tror søket gir null treff. Valget gir ingen poeng eller trekk.</p></details>
		<div class="db-status" class:success={passed} role="status" aria-atomic="true">
			{#if stale}<strong>Filteret er endret. Kjør søket på nytt.</strong><p>Kortene får ny resultatmerking etter kjøringen.</p>
			{:else if attempt.run}<strong>{found.length} dokumenter funnet. {passed ? 'Søket passer bestillingen.' : 'Undersøk resultatet.'}</strong><p>{feedback?.cause}</p><p>{feedback?.next}</p>
			{:else}<p>Velg betingelser og kjør. Trykk på et dokument etterpå for å undersøke det.</p>{/if}
		</div>
		{#if feedback?.focusId && attempt.run && !stale}<button class="db-button secondary" onclick={() => inspect(feedback.focusId ?? 'K101')}>Undersøk {feedback.focusId} →</button>{/if}
		<section tabindex="-1" aria-label="Utstyret og søkeresultatet" use:helpTarget={{ label: 'Se hvilke dokumenter som blir funnet', hint: 'Etter kjøring står det Treff eller Utenfor på kortene. Undersøk et kort for å se betingelsene.', order: 3 }}>
			<h3>Utstyrsboden · seks dokumenter</h3>
			<div class="db-equipment-grid">
				{#each equipment as item (item._id)}{@const row = rows.find((r) => r.document._id === item._id)}
					<EquipmentCard document={item} matches={attempt.run && !stale ? row?.matches ?? null : null} selected={inspectedId === item._id && !stale}
						status={attempt.run && !stale ? row?.matches ? '✓ Treff' : '– Utenfor søket' : 'Ikke kjørt med dette filteret'} inspect={attempt.run && !stale ? () => inspect(item._id) : undefined} />
				{/each}
			</div>
		</section>
		{#if inspected && !stale}<section class="db-callout" id="document-inspection" tabindex="-1" aria-label={`Forklaring for ${inspectedId}`}>
			<h3>{inspected.document.navn}: {inspected.matches ? 'med i resultatet' : 'utenfor resultatet'}</h3>
			{#if inspected.checks.length}<ul>{#each inspected.checks as check}<li><strong>{check.matches ? '✓ Passer' : '– Passer ikke'}:</strong> {check.explanation}</li>{/each}</ul>{:else}<p>Filteret har ingen betingelser. Alle dokumentene blir med.</p>{/if}
			<details><summary>Se dokumentet som kode</summary><pre><code>{JSON.stringify(inspected.document, null, 2)}</code></pre></details>
		</section>{/if}
		{#if attempt.run && !stale}<details><summary>Sammenlign med gjetningen din</summary><p>{sameIds(attempt.run.prediction, found.map((r) => r.document._id)) ? 'Gjetningen og resultatet har de samme dokumentene.' : 'Resultatet er forskjellig fra gjetningen. Undersøk et dokument som overrasket deg.'}</p><p>Gjetning: {attempt.run.prediction.join(', ') || 'Ingen'}. Treff: {found.map((r) => r.document._id).join(', ') || 'Ingen'}.</p></details>{/if}
		<div class="db-actions">
			{#if passed && currentIndex < queryTasks.length - 1}<button class="db-button" onclick={() => selectTask(queryTasks[currentIndex + 1].id)}>Neste bestilling →</button>{/if}
			<a href="/databaser/grunnlag/?modul=databaser&del=filter">Åpne en forklaring av søk</a>
		</div>
	</section>
	{#if complete.length === 3}<div class="db-callout success"><strong>De tre søkene passer bestillingene.</strong><p>Kan nye data avsløre noe filtrene ikke viser ennå?</p><a class="db-button" href="/databaser/utstyrsboden/?modul=databaser">Åpne dataverkstedet →</a><p><a href="/databaser/praksis/?modul=databaser">Eller gå til kodeoppgaven</a></p></div>{/if}
	{#if progress.state.warning || place.state.warning}<p class="db-callout warning" role="status">{progress.state.warning || place.state.warning}</p>{/if}
	<p class="db-muted">{complete.length} av 3 søk består med de nåværende filtrene. Forsøkene lagres i denne nettleseren for aktiv profil, uten XP. Gjestestatus deles her.</p>
	<details><summary>Om øvingsmodellen</summary><p>Her undersøker du likhet, flere samtidige betingelser og $lte i seks fiktive dokumenter. Ingen database kontaktes. Et søk kan passe disse dataene uten å passe alle framtidige data. Dataverkstedet lar deg undersøke nettopp det.</p></details>
</DatabaseFrame>

<style>
	.filters { grid-template-columns: repeat(3, minmax(0, 1fr)); }
	.brief { font-size: 1.125rem; }
	#task-heading, #document-inspection { scroll-margin-top: 30px; }
	@media (max-width: 700px) { .filters { grid-template-columns: 1fr; } }
</style>
