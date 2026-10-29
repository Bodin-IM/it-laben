<script>
	import DatabaseFrame from '#lib/components/DatabaseFrame.svelte';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	import { lab, learningContext } from '#lib/lab.js';
	import { createDatabaseProgress } from '#lib/databaseProgress.svelte.js';
	import {
		completedQueries,
		queryTasks,
		practicalRequirements,
		practiceChecks,
		starterCode
	} from '#lib/databaseCourse.js';
	const progress = createDatabaseProgress(
		() => `${$lab.user?.id ?? 'guest'}:${$learningContext.mode}:${$learningContext.openingId ?? ''}`
	);
	const complete = $derived(completedQueries(progress.state.attempts));
	let preview = $state(false);
	let phase = $state('oppsett');
	const phases = [
		{ id: 'oppsett', label: '1. Klargjør' },
		{ id: 'data', label: '2. Legg inn data' },
		{ id: 'kode', label: '3. Skriv egne søk' },
		{ id: 'forklar', label: '4. Test og forklar' }
	];
	const scope = $derived(
		`${$lab.user?.id ?? 'guest'}:${$learningContext.mode}:${$learningContext.openingId ?? ''}`
	);
	$effect(() => {
		scope;
		preview = false;
		phase = 'oppsett';
	});
</script>

<PartnerContext pageId="database-praksis" values={{ phase }} />
<DatabaseFrame index={2}>
	<section class="db-panel">
		<h2>Oppdrag: gi Utstyrsboden et søkbart register</h2>
		<p>
			Du skal koble Node.js til en ekte MongoDB, hente dokumenter og skrive egne filtre. Du starter
			med dataene du kjenner fra IT-laben og legger til egne testdata.
		</p>
		<p>
			<strong>Du trenger:</strong> VS Code eller en annen editor, Node.js 22 eller nyere, og tilgang til
			en MongoDB-database. Be læreren om serveradresse, databasenavn og tilgang til din eller gruppens
			database.
		</p>
		<p class="db-muted">
			Arbeidet på egen maskin blir ikke automatisk lest eller vurdert av IT-laben. Behold kildekoden
			og testresultatene til gjennomgangen med læreren.
		</p>
		<p>
			Trenger du å se koden først? <a href="/databaser/grunnlag/?modul=databaser&del=eksempel"
				>Åpne det komplette eksemplet med forklaring →</a
			>
		</p>
	</section>
	<div class="db-callout" class:success={complete.length === 3}>
		<strong
			>{!progress.state.ready
				? 'Henter lokal øvingsstatus …'
				: complete.length === 3
					? 'De tre grunnøvingene består. Du er klar til å bruke dem i egen kode.'
					: 'Gjør grunnøvingene før du starter kodeoppgaven.'}</strong
		>
		<ul>
			{#each queryTasks as task}<li>
					{complete.includes(task.id) ? '✓ Søket består' : 'Gjenstår'}: {task.title}
				</li>{/each}
		</ul>
		<p class="db-muted">
			Status gjelder forsøk i denne nettleseren og denne profilen. Den er en hjelp til rekkefølgen,
			ikke en vurdering av forståelsen din.
		</p>
		{#if complete.length < 3}<div class="db-actions">
				<a class="db-button" href="/databaser/finn-utstyr/?modul=databaser">Til grunnøvingene</a
				><button class="db-button secondary" onclick={() => (preview = !preview)}
					>{preview ? 'Lukk gjennomgangen' : 'Åpne for gjennomgang med lærer'}</button
				>
			</div>{/if}
	</div>
	{#if progress.state.warning}<p class="db-callout warning" role="status">
			{progress.state.warning}
		</p>{/if}
	{#if complete.length === 3 || preview}
		{#if preview && complete.length < 3}<p class="db-muted">
				Oppgaven er åpnet for gjennomgang. Grunnøvingene er ikke registrert som ferdige.
			</p>{/if}
		<nav class="db-actions" aria-label="Steg i kodeoppgaven">
			{#each phases as part}<button
					class="db-button"
					class:secondary={phase !== part.id}
					aria-current={phase === part.id ? 'step' : undefined}
					onclick={() => (phase = part.id)}>{part.label}</button
				>{/each}
		</nav>
		<section class="db-panel">
			{#if phase === 'oppsett'}
				<h2>1. Klargjør prosjektet</h2>
				<p>
					Last ned startprosjektet og pakk ut ZIP-filen. Åpne mappen <code>utstyrsboden-start</code> i
					editoren og åpne terminalen i denne mappen.
				</p>
				<a class="db-button" href="/ressurser/utstyrsboden-start.zip" download
					>Last ned startprosjektet (.zip)</a
				>
				<pre><code>{'node --version\nnpm install mongodb'}</code></pre>
				<p>
					Versjonsnummeret skal begynne med 22 eller høyere. <code>npm install mongodb</code> installerer
					den offisielle Node.js-driveren i prosjektet ditt.
				</p>
				<p>
					Kopier <code>.env.example</code> til en ny fil som heter <code>.env</code>. Fyll inn
					adressen og databasenavnet du har fått av læreren. Eksemplet med <code>127.0.0.1</code> gjelder
					bare når MongoDB kjører på din egen maskin.
				</p>
				<pre><code
						>{'MONGODB_URI=mongodb://127.0.0.1:27017\nMONGODB_DATABASE=utstyrsboden_oving'}</code
					></pre>
				<div class="db-callout">
					Bruk din egen øvingsdatabase. En tilkoblingsstreng kan inneholde passord. <code>.env</code
					>
					skal ikke legges i Git, sendes til labpartneren eller vises i skjermbilder. Startprosjektet
					har en <code>.gitignore</code> for dette.
				</div>
				<details>
					<summary>Hvis tilkoblingen ikke virker</summary>
					<ul>
						<li>
							Kontroller at MongoDB kjører på adressen du bruker. <code>localhost</code> betyr maskinen
							der Node.js kjører.
						</li>
						<li>
							Kontroller databasenavn og at brukeren har tilgang. Be læreren kontrollere
							serveroppsettet ved behov.
						</li>
						<li>
							Hvis du har tilgang til en eksisterende Atlas-database, kan URI-en derfra brukes.
							Denne oppgaven krever ikke at du oppretter en skykonto.
						</li>
						<li>Del feilsituasjonen med læreren uten passord eller full tilkoblingsstreng.</li>
					</ul>
				</details>
				<button class="db-button" onclick={() => (phase = 'data')}>Videre til dataene →</button>
			{:else if phase === 'data'}
				<h2>2. Legg inn eksempeldata</h2>
				<p>
					Kjør klargjøringsskriptet én gang. Det legger til de seks fiktive utstyrsdokumentene i
					collectionen <code>utstyr</code>.
				</p>
				<pre><code>{'node --env-file=.env klargjor.mjs\nnode --env-file=.env finn.mjs'}</code></pre>
				<p>
					Første kommando legger til dokumenter som mangler. Den overskriver eller sletter ikke
					dokumenter som allerede har samme <code>_id</code>. Andre kommando kjører startfilen og
					viser alle dokumentene.
				</p>
				<p>
					I en tom øvingsdatabase skal du nå se seks rader. Åpne <code>utstyr.json</code> og
					sammenlign datatypene med terminalresultatet. Hvis du har brukt databasen før, kan den
					inneholde flere eller endrede dokumenter. Har du kjørt <code>eksempel.mjs</code> fra teorien,
					er Mikrofon Bord (M203) også lagt inn. Da er det sju dokumenter og tre mikrofoner.
				</p>
				<button class="db-button" onclick={() => (phase = 'kode')}>Videre til egne søk →</button>
			{:else if phase === 'kode'}
				<h2>3. Skriv søkene selv</h2>
				<p>
					Arbeid i <code>finn.mjs</code>. Startkoden kobler til, velger collection, henter data og
					lukker forbindelsen. Du skal skrive og teste filtrene.
				</p>
				<ol>
					{#each practicalRequirements as requirement}<li>{requirement}</li>{/each}
				</ol>
				<p>
					Kjør filen med <code>node --env-file=.env finn.mjs</code> etter hver endring. Behold søkene
					som navngitte variabler eller egne funksjoner, slik at du kan vise dem igjen.
				</p>
				<details>
					<summary>Se startkoden og forklaringen</summary>
					<pre><code>{starterCode}</code></pre>
					<ul>
						<li><code>MongoClient</code> håndterer forbindelsen.</li>
						<li>
							<code>client.db(...).collection('utstyr')</code> velger databasen og collectionen.
						</li>
						<li>
							<code>find(filter)</code> lager et søk. <code>await ...toArray()</code> henter dokumentene
							i dette lille datasettet.
						</li>
						<li><code>finally</code> lukker forbindelsen også hvis en kjøring feiler.</li>
					</ul>
				</details>
				<details>
					<summary>Hjelp til å legge til ditt eget testdokument</summary>
					<p>
						Vil du bruke <code>insertOne()</code> i egen kode, kan du gå tilbake til
						<a href="/databaser/grunnlag/?modul=databaser&del=lagre"
							>det forklarte innsettingseksemplet</a
						>. Velg en ny, ubrukt ID. For denne søkeoppgaven kan du også bruke klargjøringsskriptet:
					</p>
					<p>
						Legg et nytt objekt med en ubrukt tekst-ID til i listen i <code>utstyr.json</code>, og
						kjør <code>klargjor.mjs</code> igjen. Bruk samme feltnavn og datatyper. Eksisterende ID-er
						endres ikke av dette skriptet.
					</p>
				</details>
				<button class="db-button" onclick={() => (phase = 'forklar')}
					>Videre til test og forklaring →</button
				>
			{:else}
				<h2>4. Test, forklar og vis arbeidet</h2>
				<p>Bruk dette som sjekkliste. Punktene er ikke automatisk godkjent av IT-laben.</p>
				<ul>
					{#each practiceChecks as check}<li>{check}</li>{/each}
				</ul>
				<h3>Vis læreren eller en medelev</h3>
				<ol>
					<li>Koden til søkene og resultatet av minst to kjøringer.</li>
					<li>Hvorfor ett dokument blir med og et annet faller utenfor.</li>
					<li>Hva som skjer hvis du bruker <code>"true"</code> i stedet for <code>true</code>.</li>
					<li>Hvordan det nye dokumentet påvirket søkene, sammenlignet med det du forventet.</li>
				</ol>
				<div class="db-callout">
					<strong>Prøv med mindre støtte:</strong> Lag tre fiktive supportsaker i en egen collection.
					Velg relevante felt selv, og skriv et søk som finner åpne saker med høy prioritet. Forklar hvilke
					datatyper du valgte.
				</div>
				<h3>Behold prosjektet</h3>
				<p>
					I neste runde skal du utvide registeret med innsetting, oppdatering og sletting fra kode.
					Den runden er under utvikling.
				</p>
				<a class="db-button" href="/moduler/databaser/">Tilbake til moduloversikten</a>
			{/if}
		</section>
		<aside class="db-callout">
			<strong>Labpartneren kjenner oppgaven og steget du har valgt.</strong> Den ser ikke filene, terminalen
			eller databasen på din maskin. Beskriv problemet og del eventuelt et lite kodeutdrag uten hemmeligheter
			når du ber om hjelp.
		</aside>
	{/if}
</DatabaseFrame>
