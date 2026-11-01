<script>
	import { tick } from 'svelte';
	import { lab, learningContext } from '#lib/lab.js';
	import DatabaseFrame from '#lib/components/DatabaseFrame.svelte';
	import EquipmentCard from '#lib/components/EquipmentCard.svelte';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	import { workshopTasks, workshopDocuments, runWorkshop, sameWorkshop } from '#lib/databaseWorkshop.js';
	import { createWorkshopProgress } from '#lib/databaseWorkshopProgress.svelte.js';
	import { createDatabasePlace } from '#lib/databasePlace.svelte.js';
	import { getInterfaceHelp } from '#lib/interfaceHelp.js';
	const help = getInterfaceHelp(), helpTarget = help.target;
	const scope = $derived(`${$lab.user?.id ?? 'guest'}:${$learningContext.mode}:${$learningContext.openingId ?? ''}`);
	const progress = createWorkshopProgress(() => scope);
	const place = createDatabasePlace('database-verksted', () => scope);
	const task = $derived(workshopTasks.find((t) => t.id === place.state.position) ?? workshopTasks[0]);
	const attempt = $derived(progress.state.attempts[task.id]);
	const documents = $derived(workshopDocuments(task.id, attempt.choices));
	const result = $derived(attempt.run ? runWorkshop(task.id, attempt.run) : null);
	const stale = $derived(!!attempt.run && !sameWorkshop(attempt.choices, attempt.run));
	const currentIndex = $derived(workshopTasks.findIndex((t) => t.id === task.id));
	const completed = $derived(workshopTasks.filter((t) => {
		const saved = progress.state.attempts[t.id];
		return saved.run && sameWorkshop(saved.choices, saved.run) && runWorkshop(t.id, saved.run).passed;
	}));
	let hintCount = $state(0);
	$effect(() => { task.id; scope; hintCount = 0; help.clear(); });
	async function select(/** @type {string} */ id) {
		await place.select(id);
		await tick();
		document.getElementById('workshop-task')?.focus();
	}
	function change(/** @type {string} */ key, /** @type {string} */ value) {
		progress.save(task.id, { choices: { ...attempt.choices, [key]: value }, run: attempt.run });
	}
	function run() { progress.save(task.id, { choices: { ...attempt.choices }, run: { ...attempt.choices } }); }
</script>

<PartnerContext pageId="database-verksted" values={{ taskId: task.id, choices: attempt.choices, run: attempt.run, hintCount }} />
<DatabaseFrame activityId="database-verksted">
	<nav class="db-task-nav" aria-label="Oppdrag i dataverkstedet">
		{#each workshopTasks as item, index}<button class:active={task.id === item.id} aria-current={task.id === item.id ? 'step' : undefined} onclick={() => select(item.id)} disabled={!place.state.ready}>
			<span>{index + 1}. {item.title}</span><small>{completed.some((t) => t.id === item.id) ? '✓ Forsøket virker' : 'Prøv og undersøk'}</small>
		</button>{/each}
	</nav>
	<section class="db-panel" aria-labelledby="workshop-task">
		<p class="db-eyebrow">Oppdrag {currentIndex + 1} av {workshopTasks.length}</p>
		<h2 id="workshop-task" tabindex="-1">{task.title}</h2>
		<p class="brief">{task.brief}</p>
		{#if task.id === 'skill'}<div class="db-grid"><div><strong>Søk A · alle kameraer</strong><pre><code>{'{ kategori: "kamera" }'}</code></pre></div><div><strong>Søk B · kameraer til høyst 500 kr</strong><pre><code>{'{ kategori: "kamera", dagspris: { $lte: 500 } }'}</code></pre></div></div>{/if}
		{#if task.id === 'typer'}<pre aria-label="Filteret som skal finne begge dokumentene"><code>{'{ tilgjengelig: true, dagspris: { $lte: 200 } }'}</code></pre>{/if}
		<div class="db-grid">
			<div>
				<h3>Gjør et forsøk</h3>
				<div class="db-controls" use:helpTarget={{ label: 'Endre forsøket', hint: 'Velg én egenskap. Se dokumentene ved siden av, og kjør forsøket.', order: 1 }} tabindex="-1" role="group" aria-label="Valg for forsøket">
					{#each task.controls as control}<label>{control.label}<select value={attempt.choices[control.key]} onchange={(event) => change(control.key, event.currentTarget.value)} disabled={!progress.state.ready}>
						{#each control.options as option}<option value={option.value}>{option.label}</option>{/each}
					</select></label>{/each}
				</div>
				<div class="db-actions">
					<button class="db-button" onclick={run} disabled={!progress.state.ready} use:helpTarget={{ label: 'Kjør forsøket', hint: 'Kjør med valgene du har nå. Resultatet vises under dokumentene.', order: 2 }}>Kjør forsøket →</button>
					<button class="db-button secondary" onclick={() => hintCount = Math.min(hintCount + 1, task.hints.length)} disabled={hintCount === task.hints.length}>Gi meg et hint</button>
				</div>
				{#each task.hints.slice(0, hintCount) as hint}<p class="db-callout">{hint}</p>{/each}
				<details><summary>Se MongoDB-koden</summary><pre><code>{runWorkshop(task.id, attempt.choices).code}</code></pre><p class="db-muted">Dette er søkene i forsøket. I eget prosjekt kjøres de med MongoDB-driveren etter tilkobling.</p></details>
			</div>
			<div>
				<h3>{task.id === 'skill' ? 'Ditt nye testdokument' : task.id === 'modell' ? 'Dokumentene du bygger' : 'De importerte dokumentene'}</h3>
				<div class="db-equipment-grid">
					{#each task.id === 'skill' ? documents.filter((d) => d._id === 'TEST1') : documents as item (item._id)}<EquipmentCard document={item} />{/each}
				</div>
				<details><summary>Se dokumentene som kode</summary><pre><code>{JSON.stringify(task.id === 'skill' ? documents.at(-1) : documents, null, 2)}</code></pre></details>
				{#if task.id === 'skill'}<details><summary>De seks andre dokumentene</summary><div class="db-equipment-grid">{#each documents.slice(0, -1) as item}<EquipmentCard document={item} />{/each}</div></details>{/if}
				{#if task.id === 'modell'}<p class="db-muted">Begge enhetene har egen _id og samme navn. Feltene du velger, legges til i begge dokumentene.</p>{/if}
			</div>
		</div>
		<div class="db-status" class:success={result?.passed && !stale} role="status" aria-atomic="true">
			{#if stale}<strong>Valgene er endret. Kjør forsøket på nytt.</strong><p>Det forrige resultatet gjelder de gamle valgene.</p>
			{:else if result}<strong>{result.result}</strong><p>{result.cause}</p><p>{result.next}</p>
			{:else}<p>Gjør et valg og kjør. Undersøk hva som faktisk blir funnet.</p>{/if}
		</div>
		{#if result && !stale}
			<section tabindex="-1" aria-label="Resultatet av forsøket" use:helpTarget={{ label: 'Undersøk resultatet', hint: 'Sammenlign dokumentene som ble funnet. Åpne dokumentkoden hvis du vil se feltene.', order: 3 }}>
				<div class="db-grid">
					{#each result.groups as group}<div><h3>{group.label}</h3><p><strong>{group.documents.length} dokumenter funnet</strong></p>
						{#if group.documents.length}<ul class="db-result-list">{#each group.documents as item}<li><strong>{item._id}</strong> · {item.navn}{#if typeof item.dagspris === 'number'} · {item.dagspris} kr{/if}</li>{/each}</ul>
						{:else}<pre><code>[]</code></pre>{/if}
					</div>{/each}
				</div>
			</section>
		{/if}
		<div class="db-actions">
			{#if result?.passed && !stale && currentIndex < workshopTasks.length - 1}<button class="db-button" onclick={() => select(workshopTasks[currentIndex + 1].id)}>Neste oppdrag →</button>{/if}
			<a href={`/databaser/grunnlag/?modul=databaser&del=${task.theory}`}>Åpne en forklaring</a>
		</div>
		{#if result?.passed && !stale}<details><summary>Prøv dette i egen kode</summary><p>{task.transfer}</p><a href="/databaser/praksis/?modul=databaser">Åpne kodeoppgaven →</a></details>{/if}
	</section>
	{#if progress.state.warning || place.state.warning}<p class="db-callout warning" role="status">{progress.state.warning || place.state.warning}</p>{/if}
	<p class="db-muted">Øvingsmodell i nettleseren. Valg og forsøk lagres her for aktiv profil, uten XP eller automatisk vurdering av forståelse. Gjestestatus deles i denne nettleseren.</p>
	{#if completed.length === workshopTasks.length}<div class="db-callout success"><strong>De tre forsøkene virker med de nåværende valgene.</strong><p>Bruk ideene i et register på egen maskin.</p><a class="db-button" href="/databaser/praksis/?modul=databaser">Kod ditt eget register →</a></div>{/if}
</DatabaseFrame>

<style>.brief { font-size: 1.125rem; } #workshop-task { scroll-margin-top: 30px; }</style>
