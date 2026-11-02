<script>
	import { databaseActivities } from '#lib/databaseCourse.js';
	import { moduleLink } from '#lib/moduleNavigation.js';
	import { databasePlaces } from '#lib/databaseJourney.js';
	import '#lib/database.css';
	/** @type {{activityId:string,children:import('svelte').Snippet}} */
	let { activityId, children } = $props();
	const current = $derived(databaseActivities.find((a) => a.id === activityId) ?? databaseActivities[0]);
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
	</header>
	<nav class="db-sequence" aria-label="Arbeid i databasemodulen">
		{#each databasePlaces.slice(0, 3) as activity, step}
			<a
				href={moduleLink(activity.path, 'databaser')}
				aria-current={activity.id === activityId ? 'step' : undefined}
				><span aria-hidden="true">{step + 1}</span><span
					>{step === 0
						? 'Finn utstyr'
						: step === 1
							? 'Dataverkstedet'
							: 'Kod på egen maskin'}</span
				></a
			>
		{/each}
	</nav>
	<p class="db-muted"><a href="/databaser/grunnlag/?modul=databaser" aria-current={activityId === 'database-grunnlag' ? 'page' : undefined}>Teori og kodeeksempler</a> · Åpne når du trenger en forklaring.</p>
	{@render children()}
</main>
