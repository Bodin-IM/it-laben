<script>
	import { databaseActivities } from '#lib/databaseCourse.js';
	import { moduleLink } from '#lib/moduleNavigation.js';
	import '#lib/database.css';
	/** @type {{index:number,children:import('svelte').Snippet}} */
	let { index, children } = $props();
	const current = $derived(databaseActivities[index]);
</script>

<svelte:head
	><title>{current.tittel} – Databaser – IT-laben</title><meta
		name="description"
		content={current.beskrivelse}
	/></svelte:head
>
<main class="database-page" id="hovedinnhold" tabindex="-1">
	<a class="db-back" href="/moduler/databaser/">← Databaser – fra tabeller til dokumenter</a>
	<header class="db-hero">
		<p class="db-eyebrow">Utvikling · MongoDB · Runde 1</p>
		<h1>{current.tittel}</h1>
		<p class="db-intro">{current.beskrivelse}</p>
		<p class="db-meta">Utstyrsboden · Fra et forståelig forsøk til din egen kode</p>
	</header>
	<nav class="db-sequence" aria-label="Rekkefølge i første runde">
		{#each databaseActivities as activity, step}
			<a
				href={moduleLink(activity.href, 'databaser')}
				aria-current={step === index ? 'step' : undefined}
				><span aria-hidden="true">{step + 1}</span><span
					>{step === 0
						? 'Teori og eksempel'
						: step === 1
							? 'Øv i IT-laben'
							: 'Kod på egen maskin'}</span
				></a
			>
		{/each}
	</nav>
	{@render children()}
</main>
