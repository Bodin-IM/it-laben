<script>
	import { tick } from 'svelte';
	import DatabaseFrame from '#lib/components/DatabaseFrame.svelte';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	import { lab, learningContext } from '#lib/lab.js';
	import { createDatabaseProgress } from '#lib/databaseProgress.svelte.js';
	import {
		equipment,
		queryTasks,
		queryOptions,
		queryCode,
		inspectQuery,
		queryIds,
		sameIds,
		sameQuery,
		queryPasses,
		completedQueries
	} from '#lib/databaseCourse.js';
	const progress = createDatabaseProgress(
		() => `${$lab.user?.id ?? 'guest'}:${$learningContext.mode}:${$learningContext.openingId ?? ''}`
	);
	let taskId = $state('kamera');
	let prediction = $state(/** @type {string[]} */ ([]));
	let inspectedId = $state('K101');
	let action = $state('opened');
	let hintCount = $state(0);
	const scope = $derived(
		`${$lab.user?.id ?? 'guest'}:${$learningContext.mode}:${$learningContext.openingId ?? ''}`
	);
	$effect(() => {
		scope;
		taskId = 'kamera';
		prediction = [];
		hintCount = 0;
		inspectedId = 'K101';
		action = 'opened';
	});
	const task = $derived(queryTasks.find((item) => item.id === taskId) ?? queryTasks[0]);
	const attempt = $derived(progress.state.attempts[taskId]);
	const stale = $derived(!!attempt.run && !sameQuery(attempt.choices, attempt.run.choices));
	const rows = $derived(attempt.run ? inspectQuery(attempt.run.choices) : []);
	const found = $derived(rows.filter((row) => row.matches));
	const inspected = $derived(rows.find((row) => row.document._id === inspectedId));
	const passed = $derived(!!attempt.run && !stale && queryPasses(taskId, attempt.run.choices));
	const complete = $derived(completedQueries(progress.state.attempts));
	const currentIndex = $derived(queryTasks.findIndex((item) => item.id === taskId));
	/** @param {string} id */
	async function selectTask(id, focusHeading = false) {
		taskId = id;
		prediction = [];
		hintCount = 0;
		inspectedId = 'K101';
		action = 'task-selected';
		if (focusHeading) {
			await tick();
			document.getElementById('task-heading')?.focus();
		}
	}
	/** @param {keyof import('#lib/databaseCourse.js').QueryChoices} field @param {string} value */
	function change(field, value) {
		progress.save(taskId, { ...attempt, choices: { ...attempt.choices, [field]: value } });
		action = 'filter-changed';
	}
	function run() {
		progress.save(taskId, {
			choices: { ...attempt.choices },
			run: { choices: { ...attempt.choices }, prediction: [...prediction] }
		});
		action = 'query-run';
	}
	/** @param {string} id */
	function toggle(id) {
		prediction = prediction.includes(id)
			? prediction.filter((item) => item !== id)
			: [...prediction, id];
	}
</script>

<PartnerContext
	pageId="database-finn"
	values={{
		taskId,
		choices: attempt.choices,
		prediction,
		run: attempt.run,
		inspectedId,
		action,
		hintCount
	}}
/>
<DatabaseFrame index={1}>
	<div class="db-callout">
		<strong>Øvingsmodell i nettleseren.</strong> Her øver du på likhet, flere betingelser og
		<code>$lte</code> i et fast datasett. Dette er et avgrenset utsnitt av MongoDB, uten en databaseforbindelse.
		I neste del bruker du ekte MongoDB.
	</div>
	<nav class="tasks" aria-label="Grunnøvinger">
		{#each queryTasks as item, i}<button
				aria-current={taskId === item.id ? 'step' : undefined}
				onclick={() => selectTask(item.id)}
				><span>{i + 1}. {item.title}</span><span class="db-muted"
					>{complete.includes(item.id) ? '✓ Søket består' : 'Ikke ferdig'}</span
				></button
			>{/each}
	</nav>
	<p class="db-muted">
		{complete.length} av 3 søkeoppdrag består med de nåværende filtrene. Lagres bare i denne nettleseren
		for aktiv profil, uten XP. Som gjest deler du lokal øvingsstatus med andre gjester her.
	</p>
	{#if progress.state.warning}<p class="db-callout warning" role="status">
			{progress.state.warning}
		</p>{/if}
	<section class="db-panel" aria-labelledby="task-heading">
		<p class="db-eyebrow">Grunnøving {currentIndex + 1} av 3</p>
		<h2 id="task-heading" tabindex="-1">{task.title}</h2>
		<p>{task.brief}</p>
		<div class="db-grid">
			<div>
				<h3>1. Bygg filteret</h3>
				<div class="filters">
					<label
						>Kategori<select
							disabled={!progress.state.ready}
							value={attempt.choices.kategori}
							onchange={(event) => change('kategori', event.currentTarget.value)}
							>{#each queryOptions.kategori as option}<option value={option.value}
									>{option.label}</option
								>{/each}</select
						></label
					>
					<label
						>Tilgjengelig<select
							disabled={!progress.state.ready}
							value={attempt.choices.tilgjengelig}
							onchange={(event) => change('tilgjengelig', event.currentTarget.value)}
							>{#each queryOptions.tilgjengelig as option}<option value={option.value}
									>{option.label}</option
								>{/each}</select
						></label
					>
					<label
						>Dagspris<select
							disabled={!progress.state.ready}
							value={attempt.choices.dagspris}
							onchange={(event) => change('dagspris', event.currentTarget.value)}
							>{#each queryOptions.dagspris as option}<option value={option.value}
									>{option.label}</option
								>{/each}</select
						></label
					>
				</div>
				<pre aria-label="Koden til nåværende filter"><code>{queryCode(attempt.choices)}</code></pre>
			</div>
			<div>
				<h3>Dokumentene i collectionen utstyr</h3>
				<p class="db-muted">
					Undersøk dataene før du forutsier resultatet. Alle prisene gjelder én dag.
				</p>
				<div class="documents">
					{#each equipment as item}<article>
							<strong>{item._id} · {item.navn}</strong>
							<p>
								<code>kategori: "{item.kategori}"</code><br /><code
									>tilgjengelig: {String(item.tilgjengelig)}</code
								><br /><code>dagspris: {item.dagspris}</code>
							</p>
						</article>{/each}
				</div>
			</div>
		</div>
		<fieldset>
			<legend>2. Forutsi resultatet før du kjører</legend>
			<p class="db-muted">
				Velg dokumentene du tror blir funnet av filteret du har laget. Ingen valg betyr at du
				forventer null treff. En feil prediksjon hindrer deg ikke i å gå videre.
			</p>
			<div class="db-options">
				{#each equipment as item}<label
						><input
							type="checkbox"
							checked={prediction.includes(item._id)}
							onchange={() => toggle(item._id)}
						/>{item._id}</label
					>{/each}
			</div>
		</fieldset>
		<div class="db-actions">
			<button class="db-button" disabled={!progress.state.ready} onclick={run}>Kjør søket</button
			><button
				class="db-button secondary"
				onclick={() => {
					hintCount = Math.min(hintCount + 1, task.hints.length);
					action = 'hint-opened';
				}}>Vis hint{hintCount ? ' / mer hjelp' : ''}</button
			>
		</div>
		<div
			class="db-status"
			class:success={passed}
			class:warning={stale}
			role="status"
			aria-live="polite"
		>
			{#if !attempt.run}<p>Kjør søket for å sammenligne prediksjonen med resultatet.</p>
			{:else if stale}<p>
					<strong>Filteret er endret.</strong> Resultatet nedenfor gjelder forrige kjøring. Kjør på nytt
					før du bruker resultatet eller går videre.
				</p>
			{:else}<p>
					<strong
						>{found.length} dokumenter funnet. {passed
							? 'Søket oppfyller oppdraget.'
							: 'Søket oppfyller ikke oppdraget ennå.'}</strong
					>
					{sameIds(attempt.run.prediction, queryIds(attempt.run.choices))
						? 'Prediksjonen din stemte med kjøringen.'
						: 'Prediksjonen og kjøringen var ulike. Undersøk ett dokument nedenfor.'}
				</p>{/if}
		</div>
		{#if hintCount}<div class="db-callout">
				{#each task.hints.slice(0, hintCount) as hint}<p>{hint}</p>{/each}
				<p class="db-muted">Hint og nye forsøk gir ikke poengtrekk.</p>
			</div>{/if}
	</section>
	{#if attempt.run}
		<section class="db-panel" aria-labelledby="result-heading">
			<h2 id="result-heading">3. Undersøk {stale ? 'forrige' : 'siste'} resultat</h2>
			<p>
				{found.length
					? `Funnet: ${found.map((row) => row.document._id).join(', ')}.`
					: 'Resultatet er []. Søket ble kjørt, men ingen dokumenter passet til alle betingelsene.'}
			</p>
			{#if stale}<details>
					<summary>Filteret som ga dette resultatet</summary>
					<pre><code>{queryCode(attempt.run.choices)}</code></pre>
				</details>{/if}
			<label
				>Velg et dokument og se hvorfor det ble med eller falt utenfor<select
					bind:value={inspectedId}
					onchange={() => (action = 'document-inspected')}
					>{#each equipment as item}<option value={item._id}>{item._id} · {item.navn}</option
						>{/each}</select
				></label
			>
			{#if inspected}<div class="db-callout" class:success={inspected.matches}>
					<strong
						>{inspected.document._id}: {inspected.matches ? 'Blir med' : 'Faller utenfor'}</strong
					>
					{#if !inspected.checks.length}<p>
							Filteret er tomt. Ingen betingelser begrenser søket, så alle dokumenter blir med.
						</p>{:else}<ul>
							{#each inspected.checks as check}<li>
									<strong>{check.matches ? 'Passer:' : 'Passer ikke:'}</strong>
									{check.explanation}
								</li>{/each}
						</ul>
						<p>Alle betingelsene må passe for at dokumentet skal bli med.</p>{/if}
				</div>{/if}
			<p>
				<strong>Forklar til en medelev:</strong> Velg ett dokument som ble med og ett som falt utenfor,
				hvis søket har begge deler. Hvilke felt avgjorde det?
			</p>
			{#if passed && currentIndex < queryTasks.length - 1}<button
					class="db-button"
					onclick={() => selectTask(queryTasks[currentIndex + 1].id, true)}
					>Neste grunnøving →</button
				>{/if}
		</section>
	{/if}
	<div class="db-bottom">
		{#if complete.length === queryTasks.length}<h2>
				Grunnøvingene er klare. Nå skal du skrive selv.
			</h2>
			<p>
				Testene har kontrollert søkene i dette datasettet. Forklaringen din og arbeidet på egen
				maskin viser mer om hvordan du kan bruke det du har øvd på.
			</p>
			<a class="db-button" href="/databaser/praksis/?modul=databaser">Gå til kodeoppgaven →</a>
		{:else}<h2>Før kodeoppgaven</h2>
			<p>Få de tre søkene til å oppfylle oppdragene. Bruk hint og prøv igjen så ofte du trenger.</p>
			<a href="/databaser/praksis/?modul=databaser">Se hva den praktiske oppgaven går ut på</a>{/if}
	</div>
</DatabaseFrame>

<style>
	.tasks {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}
	.tasks button {
		text-align: left;
		padding: 16px;
		border: 1px solid var(--color-border-strong);
		border-radius: 9px;
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
		font: 600 var(--font-small)/1.5 var(--font-ui);
		display: grid;
		gap: 8px;
	}
	.tasks button[aria-current] {
		background: var(--color-accent-soft);
		border-color: var(--color-accent);
	}
	.filters {
		display: grid;
		gap: 12px;
	}
	.documents {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
	.documents article {
		border: 1px solid var(--color-border);
		background: var(--color-surface-soft);
		border-radius: 8px;
		padding: 12px;
		font-size: var(--font-small);
	}
	.documents p {
		margin-bottom: 0;
		font-size: 0.875rem;
	}
	@media (max-width: 650px) {
		.tasks {
			grid-template-columns: minmax(0, 1fr);
		}
		.tasks button {
			gap: 4px;
		}
	}
	@media (max-width: 400px) {
		.documents {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
