<script>
	import { publicMode } from '#lib/deployment.js';
	import PublicSchoolNotice from '#lib/components/PublicSchoolNotice.svelte';
	import Nightwatch from '#lib/components/Nightwatch.svelte';
</script>

<svelte:head>
	<title>Nattevakten – redd produksjonen | IT-laben</title>
	<meta
		name="description"
		content="Åtte minutter, fire feil og én vakt. Følg sporene, reparer koden og få produksjonen klar før åpning."
	/>
</svelte:head>

{#if publicMode}
	<PublicSchoolNotice title="Nattevakten brukes på skolen" description="Denne tidsstyrte utfordringen trenger skolens tjeneste for å åpne og kontrollere forsøk." />
{:else}<Nightwatch />{/if}
