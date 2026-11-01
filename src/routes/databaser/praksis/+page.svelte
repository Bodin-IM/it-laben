<script>
	import { tick } from 'svelte';
	import DatabaseFrame from '#lib/components/DatabaseFrame.svelte';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	import { lab, learningContext } from '#lib/lab.js';
	import { createDatabasePlace } from '#lib/databasePlace.svelte.js';
	import { practicalRequirements, practiceChecks, starterCode } from '#lib/databaseCourse.js';
	import { getInterfaceHelp } from '#lib/interfaceHelp.js';
	const help = getInterfaceHelp(), helpTarget = help.target;
	const scope = $derived(`${$lab.user?.id ?? 'guest'}:${$learningContext.mode}:${$learningContext.openingId ?? ''}`);
	const place = createDatabasePlace('database-praksis', () => scope);
	const phase = $derived(place.state.position);
	const phases = [
		{ id: 'oppsett', label: '1. Koble til' }, { id: 'data', label: '2. Hent startdata' },
		{ id: 'kode', label: '3. Lag egne søk' }, { id: 'forklar', label: '4. Test og forklar' }
	];
	let problem = $state('mappe');
	const problems = [
		{ id: 'mappe', label: 'Filen eller .env blir ikke funnet', text: 'Åpne terminalen i utstyrsboden-start, der package.json og .mjs-filene ligger. Kopier .env.example til .env. Kontroller at filen ikke heter .env.txt.' },
		{ id: 'pakke', label: 'mongodb-pakken mangler / npm blokkeres', text: 'Kjør npm install mongodb i prosjektmappen. Hvis PowerShell blokkerer npm.ps1, bruk npm.cmd install mongodb eller terminalen Ledetekst.' },
		{ id: 'kontakt', label: '[KONTAKT] eller [OPPSETT]', text: 'Kontroller adresseformatet med læreren og at MongoDB kjører. localhost betyr maskinen der Node.js kjører. Bruk skolens adresse hvis databasen står på skoleserveren.' },
		{ id: 'tilgang', label: '[INNLOGGING] eller [TILGANG]', text: 'Be læreren kontrollere bruker, innloggingsdatabase og rettighetene til din øvingsdatabase. Del feilkategorien, aldri passord eller hele tilkoblingsstrengen.' },
		{ id: 'tomt', label: 'Søket virker, men gir null dokumenter', text: 'Prøv filteret {}. Gir det også null, kontroller at startdata er lagt inn i riktig database og collection. Gir {} treff, undersøk betingelsene og datatypene i ditt filter.' },
		{ id: 'startdata', label: '[STARTDATA] eller [DUPLIKAT]', text: 'Kontroller at utstyr.json er gyldig JSON, med unike tekst-ID-er, boolsk tilgjengelighet og pris som tall. Et eksisterende dokument endres ikke ved å endre filen og kjøre klargjor.mjs igjen. Bruk en ubrukt ID for nye testdata.' },
		{ id: 'operasjon', label: '[LESING] eller [LAGRING]', text: 'Undersøk filteret eller dokumentet du sender. Be læreren kontrollere databasetilgangen. Etter en usikker innsetting: hent data på nytt før du prøver igjen, slik at du vet hva som faktisk finnes.' }
	];
	$effect(() => { phase; scope; help.clear(); problem = 'mappe'; });
	async function select(/** @type {string} */ id) {
		await place.select(id); await tick(); document.getElementById('practice-step')?.focus();
	}
</script>

<PartnerContext pageId="database-praksis" values={{ phase }} />
<DatabaseFrame activityId="database-praksis">
	<p>Jobb i <strong>utstyrsboden-start</strong> på din egen maskin. Du trenger Node.js 22+ og en egen MongoDB-øvingsdatabase fra læreren.</p>
	<nav class="db-task-nav" aria-label="Steg i kodeoppgaven">
		{#each phases as part}<button class:active={phase === part.id} aria-current={phase === part.id ? 'step' : undefined} onclick={() => select(part.id)} disabled={!place.state.ready}>{part.label}</button>{/each}
	</nav>
	<section class="db-panel" id="practice-step" tabindex="-1" aria-label="Aktuelt steg i kodeoppgaven">
		{#if phase === 'oppsett'}
			<h2>Få den første forbindelsen til å virke</h2>
			<ol>
				<li>Last ned og pakk ut prosjektet. Åpne mappen i editoren og terminalen.</li>
				<li>Kjør <code>node --version</code> og <code>npm install mongodb</code>.</li>
				<li>Kopier <code>.env.example</code> til <code>.env</code>. Fyll inn lærerens adresse og navnet på din øvingsdatabase.</li>
			</ol>
			<a class="db-button" href="/ressurser/utstyrsboden-start.zip" download use:helpTarget={{ label: 'Last ned startprosjektet', hint: 'Pakk ut ZIP-filen og åpne mappen utstyrsboden-start i editoren.', order: 1 }}>Last ned startprosjektet (.zip)</a>
			<h3>Prøv forbindelsen</h3>
			<pre><code>node --env-file=.env sjekk.mjs</code></pre>
			<p class="db-callout"><strong>Se etter [KLAR].</strong> Forbindelsen og lesetilgangen virker. Kontrollen endrer ingen data; skrivetilgang prøves i neste steg.</p>
			<details><summary>Adresse, passord og .env</summary><p><code>127.0.0.1</code> og <code>localhost</code> betyr maskinen der Node.js kjører. Bruk skolens adresse når databasen står på skoleserveren.</p><p>Hold .env utenfor Git, skjermbilder og labpartnerens samtale. Startprosjektets .gitignore utelater filen. Nettleseren skal aldri koble direkte til databasen.</p></details>
			<button class="db-button" onclick={() => select('data')}>Videre til startdata →</button>
		{:else if phase === 'data'}
			<h2>Hent utstyret du kjenner</h2>
			<p>Kjør disse kommandoene i prosjektmappen:</p>
			<pre><code>{'node --env-file=.env klargjor.mjs\nnode --env-file=.env finn.mjs'}</code></pre>
			<p class="db-callout"><strong>Se etter seks dokumenter i en ny øvingsdatabase.</strong> Klargjøringen legger inn manglende ID-er. <code>finn.mjs</code> henter dem og viser dem i terminalen.</p>
			<details><summary>Jeg får et annet antall, eller dataene er endret</summary><p>Har du kjørt <code>eksempel.mjs</code>, er Mikrofon Bord (M203) også lagt inn. Da er det sju dokumenter. Egne testdata kan gi flere.</p><p>Klargjøringen bevarer eksisterende dokumenter. Den overskriver eller sletter ikke data når du kjører den igjen. Kontroller databasenavn og innhold sammen med læreren hvis resultatet er uventet.</p></details>
			<button class="db-button" onclick={() => select('kode')}>Lag egne søk →</button>
		{:else if phase === 'kode'}
			<h2>Endre filteret i finn.mjs</h2>
			<p>Finn linjen <code>const filter = {};</code>. Start med å finne alle mikrofonene. Kjør filen etter hver endring:</p>
			<pre><code>node --env-file=.env finn.mjs</code></pre>
			<ol>{#each practicalRequirements.slice(1) as requirement}<li>{requirement}</li>{/each}</ol>
			<details><summary>Se startkoden</summary><pre><code>{starterCode}</code></pre><p>Behold søkene som navngitte variabler eller egne funksjoner, slik at du kan vise dem igjen.</p></details>
			<details><summary>Fra dataverkstedet til eget prosjekt</summary><p>Sammenlign søket etter alle kameraer med søket etter kameraer til høyst 500 kr. Legg til et dokument som gir forskjell. Prøv deretter prisgrensen.</p><p>Du kan legge til et fiktivt dokument med en ubrukt ID i <code>utstyr.json</code> og kjøre <code>klargjor.mjs</code> igjen. Bruk samme felter og datatyper. Dette endrer ikke dokumenter som allerede finnes.</p><a href="/databaser/grunnlag/?modul=databaser&del=lagre">Se hvordan insertOne legger inn fra kode →</a></details>
			<button class="db-button" onclick={() => select('forklar')}>Test og forklar →</button>
		{:else}
			<h2>Vis hva registeret gjør</h2>
			<p>Vis læreren eller en medelev to forskjellige kjøringer. Forklar hvorfor ett dokument blir med og et annet faller utenfor.</p>
			<details><summary>Kontroller søkene dine</summary><ul>{#each practiceChecks as check}<li>{check}</li>{/each}</ul></details>
			<div class="db-callout"><strong>Prøv en ny situasjon:</strong> Lag tre fiktive supportsaker i en egen collection. Velg feltene selv, finn åpne saker med høy prioritet og identifiser én bestemt sak. Forklar hvilke datatyper du valgte.</div>
			<p>Behold prosjektet. Neste runde skal utvide registeret med innsetting, oppdatering, sletting og validering.</p>
			<a class="db-button" href="/moduler/databaser/">Til moduloversikten →</a>
		{/if}
		<details>
			<summary use:helpTarget={{ label: 'Finn hjelp til en feil', hint: 'Velg det du ser i terminalen. Hjelpen foreslår ett sted å undersøke.', order: 2 }}>Noe virker ikke</summary>
			<label>Hva ser du?<select bind:value={problem}>{#each problems as item}<option value={item.id}>{item.label}</option>{/each}</select></label>
			<p role="status">{problems.find((item) => item.id === problem)?.text}</p>
		</details>
	</section>
	{#if place.state.warning}<p class="db-callout warning" role="status">{place.state.warning}</p>{/if}
	<p class="db-muted">Sist åpnet steg lagres i denne nettleseren. IT-laben og labpartneren ser ikke prosjektfilene, terminalen eller databasen din. Ta vare på egen kode og testresultater. Å åpne et steg betyr ikke at arbeidet er godkjent.</p>
</DatabaseFrame>

<style>#practice-step { scroll-margin-top: 30px; }</style>
