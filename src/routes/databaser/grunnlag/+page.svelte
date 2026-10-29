<script>
	import { tick, onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import DatabaseFrame from '#lib/components/DatabaseFrame.svelte';
	import DatabaseFlow from '#lib/components/DatabaseFlow.svelte';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	import { equipment } from '#lib/databaseCourse.js';
	import {
		databaseSections,
		connectionCode,
		connectionExplanations,
		readExamples,
		readExample,
		insertCode,
		insertExample,
		newEquipment,
		flowExample,
		completeDatabaseExample
	} from '#lib/databaseIntro.js';
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
	const section = $derived(
		mounted
			? (databaseSections.find((item) => item.id === page.url.searchParams.get('del'))?.id ??
					'start')
			: 'start'
	);
	const index = $derived(databaseSections.findIndex((item) => item.id === section));
	const current = $derived(databaseSections[index]);
	let operation = $state('hente');
	let flowStep = $state(0);
	let readId = $state('alle');
	let readShown = $state(false);
	let insertStep = $state(0);
	/** @type {HTMLHeadingElement|undefined} */ let heading = $state();
	const flow = $derived(flowExample(operation, flowStep));
	const query = $derived(readExample(readId));
	const insertion = $derived(insertExample(insertStep));
	$effect(() => {
		section;
		operation = 'hente';
		flowStep = 0;
		readId = 'alle';
		readShown = false;
		insertStep = 0;
	});
	async function select(/** @type {string} */ id) {
		const url = new URL(page.url.href);
		url.searchParams.set('del', id);
		await goto(url.pathname + url.search, { reset: false });
		await tick();
		heading?.focus({ preventScroll: true });
		heading?.scrollIntoView({ block: 'start' });
	}
</script>

<PartnerContext
	pageId="database-grunnlag"
	values={{ section, operation, flowStep, readId, readShown, insertStep }}
/>
<DatabaseFrame index={0}>
	<div class="theory-layout">
		<nav class="chapters" aria-label="Deler i databaseinnføringen">
			<p class="db-eyebrow">TEORI MED KODEEKSEMPLER</p>
			<ol>
				{#each databaseSections as item, i}<li>
						<button
							aria-current={section === item.id ? 'step' : undefined}
							onclick={() => select(item.id)}><span>{i + 1}</span>{item.label}</button
						>
					</li>{/each}
			</ol>
		</nav>
		<div class="theory-content">
			<label class="mobile-chapters"
				>Velg del<select value={section} onchange={(event) => select(event.currentTarget.value)}
					>{#each databaseSections as item, i}<option value={item.id}>{i + 1}. {item.label}</option
						>{/each}</select
				></label
			>
			<section class="db-panel lesson" aria-labelledby="theory-heading">
				<p class="db-eyebrow">Del {index + 1} av {databaseSections.length}</p>
				<h2 id="theory-heading" bind:this={heading} tabindex="-1">{current.title}</h2>
				<p class="lead">{current.introduction}</p>
				{#if section === 'start'}
					<h3>En database er en organisert samling data</h3>
					<p>
						Data er opplysninger, for eksempel et navn, en pris og om et kamera er ledig. Et
						databasesystem, som MySQL eller MongoDB, organiserer lagringen og lar programmer finne,
						legge til, endre og slette data.
					</p>
					<p>
						I Utstyrsboden må vi kunne svare på «Hvilke kameraer er ledige?» og lagre nytt utstyr.
						Databasen er det felles lageret som backend bruker.
					</p>
					<pre aria-label="Ett utstyr som JavaScript-objekt"><code
							>{`const kamera = ${JSON.stringify(equipment[0], null, 2)};`}</code
						></pre>
					<p>
						<code>kamera</code> er foreløpig et objekt i programmet. Det er ikke automatisk lagret i en
						database. Senere skal du se linjen som gjør selve lagringen.
					</p>
					<h3>Fra variabler og filer til database</h3>
					<dl class="concepts">
						<div>
							<dt>Variabel i minnet</dt>
							<dd>
								Data som programmet bruker mens det kjører. En vanlig liste i Node.js forsvinner når
								prosessen avsluttes.
							</dd>
						</div>
						<div>
							<dt>JSON-fil</dt>
							<dd>
								Kan bevare data etter omstart. Koden din må lese, søke i og skrive filen, og
								håndtere at flere kan endre data samtidig.
							</dd>
						</div>
						<div>
							<dt>Database</dt>
							<dd>
								Bevarer data og tilbyr spørringer, lagringsoperasjoner og mekanismer for blant annet
								tilganger og samtidige operasjoner. Vi må fortsatt velge en god modell og
								kontrollere dataene.
							</dd>
						</div>
					</dl>
					<p>
						MongoDB er en <strong>dokumentdatabase</strong>, én type NoSQL. MySQL organiserer data i
						relasjonstabeller. Her lærer vi dokumentmodellen med JavaScript-objekter som et kjent
						utgangspunkt.
					</p>
					<div class="db-callout">
						<strong>Etter innføringen:</strong> Du skal kunne peke ut hvor data lagres, forklare et enkelt
						dokument og kjenne igjen kode som kobler til, henter og legger inn data. Du trenger ikke kunne
						alle linjene utenat.
					</div>
				{:else if section === 'dataflyt'}
					<div class="db-actions" role="group" aria-label="Velg dataflyt">
						<button
							class="db-button"
							class:secondary={operation !== 'hente'}
							aria-pressed={operation === 'hente'}
							onclick={() => {
								operation = 'hente';
								flowStep = 0;
							}}>Hente kameraer</button
						>
						<button
							class="db-button"
							class:secondary={operation !== 'lagre'}
							aria-pressed={operation === 'lagre'}
							onclick={() => {
								operation = 'lagre';
								flowStep = 0;
							}}>Lagre nytt utstyr</button
						>
					</div>
					<DatabaseFlow active={flow.active} count={flow.count} />
					<p class="db-muted">
						Forklart eksempel, uten en databaseforbindelse. Hver gjennomgang starter med seks
						dokumenter. Du bestemmer tempoet.
					</p>
					<div class="flow-detail" aria-live="polite" aria-atomic="true">
						<h3>{flow.title}</h3>
						<p>{flow.explanation}</p>
						{#if flow.code}<pre><code>{flow.code}</code></pre>{/if}
						<p class="db-callout"><strong>{flow.note}</strong></p>
					</div>
					<div class="db-actions">
						<button class="db-button secondary" disabled={flowStep === 0} onclick={() => flowStep--}
							>← Forrige hendelse</button
						><span class="db-muted">{flowStep + 1} av 5</span><button
							class="db-button"
							disabled={flowStep === 4}
							onclick={() => flowStep++}>Neste hendelse →</button
						>
					</div>
					{#if operation === 'lagre'}<details>
							<summary>Se dokumentet som sendes</summary>
							<pre><code>{`const nyttUtstyr = ${JSON.stringify(newEquipment, null, 2)};`}</code
								></pre>
						</details>{/if}
					<details>
						<summary>Hvor er resten av webkoden?</summary>
						<p>
							Her viser vi bare linjene som forklarer dataflyten. En Express-app må også starte
							serveren, koble til databasen, lese JSON med <code>express.json()</code> og håndtere
							tilgang, validering og feil. <code>utstyr</code> er valgt med MongoDB-klienten før rutene
							brukes. Vi går gjennom databasekoden i de neste delene.
						</p>
					</details>
				{:else if section === 'dokument'}
					<h3>En tabell: rader og kolonner</h3>
					<!-- svelte-ignore a11y_no_noninteractive_tabindex (The named scroll region needs keyboard access on narrow screens.) -->
					<div
						class="db-table-wrap"
						tabindex="0"
						role="region"
						aria-label="Eksempel på utstyrstabell"
					>
						<table>
							<caption>En enkel tabell utstyr, med én rad</caption><thead
								><tr
									><th>id</th><th>navn</th><th>kategori</th><th>tilgjengelig</th><th>dagspris</th
									></tr
								></thead
							><tbody
								><tr><td>K101</td><td>Kamera Nord</td><td>kamera</td><td>true</td><td>250</td></tr
								></tbody
							>
						</table>
					</div>
					<p>
						Hver rad beskriver én enhet. Kolonnene beskriver egenskapene. I en relasjonsmodell kan
						tabeller kobles med nøkler, for eksempel utstyr og utlån.
					</p>
					<h3>Et dokument: felter og verdier</h3>
					<pre><code>{JSON.stringify(equipment[0], null, 2)}</code></pre>
					<p>
						Dette dokumentet ligger i collectionen <code>utstyr</code>. En
						<strong>collection</strong>
						er en samling dokumenter. Den ligger igjen i en navngitt database, for eksempel
						<code>utstyrsboden_oving</code>.
					</p>
					<p class="db-callout">
						<strong>Database → collection → dokument → felt.</strong><br />Utstyrsboden → utstyr →
						Kamera Nord → dagspris: 250.
					</p>
					<p>
						Som første sammenligning: tabell → collection, rad → dokument og kolonne → felt.
						Modellene er ikke identiske. Dokumenter kan også ha lister og andre dokumenter inni seg.
					</p>
					<p>
						<code>_id</code> identifiserer dokumentet og må være unik i collectionen. Vi bruker
						korte tekst-ID-er for å kjenne igjen utstyret. Hvis du ikke sender <code>_id</code>,
						lager driveren vanligvis en <code>ObjectId</code>.
					</p>
					<details>
						<summary>Er MongoDB bare en JSON-fil?</summary>
						<p>
							Nei. MongoDB er et databasesystem som lagrer BSON, et binært dokumentformat med flere
							datatyper enn JSON. Vi viser enkle dokumenter som JSON her. Fleksible dokumenter betyr
							heller ikke at vi kan droppe struktur, validering eller tilganger.
						</p>
					</details>
				{:else if section === 'typer'}
					<pre><code
							>{`const utstyr = {\n  navn: 'Kamera Nord',       // tekst\n  dagspris: 250,            // tall\n  tilgjengelig: true        // boolsk verdi\n};`}</code
						></pre>
					<dl class="concepts">
						<div>
							<dt>Tekst: <code>'Kamera Nord'</code></dt>
							<dd>Anførselstegn gjør dette til tekst. Navn og kategori er tekst i registeret.</dd>
						</div>
						<div>
							<dt>Tall: <code>250</code></dt>
							<dd>
								Kan sammenlignes og brukes i beregninger. Teksten <code>'250'</code> er en annen datatype.
							</dd>
						</div>
						<div>
							<dt>Boolsk: <code>true</code> eller <code>false</code></dt>
							<dd>
								Betyr ja/nei i dette feltet. Teksten <code>'true'</code> er ikke den boolske verdien
								<code>true</code>.
							</dd>
						</div>
					</dl>
					<p>
						Eksemplet er JavaScript og kan ha kommentarer. I en JSON-fil bruker du doble
						anførselstegn rundt feltnavn og tekst, og ingen kommentarer.
					</p>
					<div class="db-callout">
						<strong>Tenk gjennom:</strong> Feltet er <code>tilgjengelig: true</code>. Hva skjer hvis
						filteret ditt leter etter teksten <code>'true'</code>? Begrunn svaret før du åpner
						forklaringen.
					</div>
					<details>
						<summary>Se forklaringen</summary>
						<p>
							Dette dokumentet blir ikke funnet av likhetssøket. Verdien i filteret er tekst, mens
							dokumentet har en boolsk verdi. Skriv <code>true</code> uten anførselstegn for å lete etter
							ledig utstyr.
						</p>
					</details>
				{:else if section === 'tilkobling'}
					<p>
						<strong>Før koden kan kjøres:</strong> Du trenger Node.js 22+, en MongoDB-server og
						pakken <code>mongodb</code>. En MongoDB-driver er ikke selve databaseserveren.
					</p>
					<pre><code>{'npm install mongodb'}</code></pre>
					<h3>Tilkoblingskoden</h3>
					<pre><code>{connectionCode}</code></pre>
					<dl class="concepts">
						{#each connectionExplanations as [code, explanation]}<div>
								<dt><code>{code}</code></dt>
								<dd>{explanation}</dd>
							</div>{/each}
					</dl>
					<h3>Hvor kommer adressen fra?</h3>
					<p>
						Startprosjektet har en <code>.env.example</code>. Kopier den til <code>.env</code> og
						fyll inn lærerens adresse og din egen øvingsdatabase. Koden leser verdiene med
						<code>process.env</code>.
					</p>
					<pre><code
							>{'MONGODB_URI=mongodb://127.0.0.1:27017\nMONGODB_DATABASE=utstyrsboden_oving'}</code
						></pre>
					<p>
						<code>127.0.0.1</code> betyr maskinen der Node.js kjører. Bruk denne adressen bare når MongoDB
						kjører på samme maskin. For skolens server får du adresse og tilgang av læreren.
					</p>
					<p class="db-callout">
						Tilkoblingsstrengen kan inneholde passord. Den hører hjemme på serversiden, utenfor Git
						og labpartnerens samtale. Startprosjektets <code>.gitignore</code> utelater
						<code>.env</code>.
					</p>
					<p>
						<code>db()</code> og <code>collection()</code> velger hvor vi skal arbeide; de henter ikke
						dokumenter. En ny collection opprettes vanligvis ved første innsetting. Hele eksemplet i del
						8 viser også feilhåndtering og lukking.
					</p>
				{:else if section === 'filter'}
					<label
						>Velg et forklart søk<select
							value={readId}
							onchange={(event) => {
								readId = event.currentTarget.value;
								readShown = false;
							}}
							>{#each readExamples as example}<option value={example.id}>{example.label}</option
								>{/each}</select
						></label
					>
					<h3>Kode i Node.js, etter tilkoblingen</h3>
					<pre aria-label="Kode for å hente data"><code>{query.code}</code></pre>
					<ol>
						<li><code>filter</code> beskriver hvilke feltverdier som må passe.</li>
						<li>
							<code>find(filter)</code> gir en markør, en <em>cursor</em>. Den er ikke en ferdig
							liste.
						</li>
						<li>
							<code>await ...toArray()</code> henter treffene til en liste. Dette passer til det lille
							datasettet vårt.
						</li>
						<li>
							<code>console.table(resultat)</code> viser listen i terminalen. Det lager ikke en tabell
							i databasen.
						</li>
					</ol>
					<p><strong>Før du viser resultatet:</strong> Hvilke typer utstyr tror du blir med?</p>
					<button class="db-button" onclick={() => (readShown = true)}
						>Vis eksempelresultatet</button
					>
					{#if readShown}<div class="example-result" role="status">
							<h3>{query.rows.length} dokumenter i eksempelresultatet</h3>
							<p>{query.explanation}</p>
							{#if query.rows.length}<ul>
									{#each query.rows as row}<li>
											<strong>{row._id} · {row.navn}</strong> — {row.tilgjengelig
												? 'ledig'
												: 'utlånt'}, {row.dagspris} kr
										</li>{/each}
								</ul>{:else}<pre><code>[]</code></pre>{/if}
						</div>{/if}
					<p class="db-muted">
						Resultatet beregnes fra de seks fiktive dokumentene på siden. Ingen MongoDB kontaktes. I
						egen kode kommer resultatet fra din database.
					</p>
					<details>
						<summary>Se alle eksempeldataene</summary>
						<pre><code>{JSON.stringify(equipment, null, 2)}</code></pre>
					</details>
					<details>
						<summary>Sammenlign med SQL og flere filtervalg</summary>
						<pre><code
								>{"SELECT * FROM utstyr WHERE kategori = 'kamera';\n\n// MongoDB med Node.js:\nconst kameraer = await utstyr.find({ kategori: 'kamera' }).toArray();"}</code
							></pre>
						<p>
							Begge søker etter kameraer i dette enkle eksemplet. I MongoDB betyr flere felt i samme
							filter at alle betingelsene må passe. <code>{'{ dagspris: { $lte: 200 } }'}</code> betyr
							høyst 200, også akkurat 200.
						</p>
					</details>
				{:else if section === 'lagre'}
					<h3>Kode i Node.js, etter tilkoblingen</h3>
					<pre aria-label="Kode for å legge inn data"><code>{insertCode}</code></pre>
					<p>
						<code>nyttUtstyr</code> er objektet vi vil lagre. <code>utstyr</code> er referansen til
						collectionen. <code>bekreftelse.insertedId</code> forteller hvilken ID det nye dokumentet
						fikk.
					</p>
					<div class="insert-walkthrough">
						<p class="db-eyebrow">FØLG EKSEMPLET · {insertStep + 1} AV 3</p>
						<div aria-live="polite">
							<h3>{insertion.title}</h3>
							<p>{insertion.explanation}</p>
							<pre><code>{insertion.code}</code></pre>
							<p><strong>Collectionen inneholder {insertion.count} dokumenter.</strong></p>
							{#if insertion.result}<ul>
									{#each insertion.result as item}<li>{item._id} · {item.navn}</li>{/each}
								</ul>{/if}
						</div>
						<div class="db-actions">
							<button
								class="db-button secondary"
								disabled={insertStep === 0}
								onclick={() => insertStep--}>← Forrige steg</button
							><button class="db-button" disabled={insertStep === 2} onclick={() => insertStep++}
								>Neste steg →</button
							>
						</div>
					</div>
					<p class="db-muted">
						Dette er en gjennomgang i nettleseren. Tilbakeknappen går til et tidligere bilde av
						eksemplet; den sletter ikke noe fra en ekte database.
					</p>
					<h3>Hva om du kjører innsettingen en gang til?</h3>
					<p>
						I en ekte MongoDB kan du ikke legge inn to dokumenter med samme <code>_id</code>. Et
						nytt <code>insertOne()</code> med M203 gir da en duplikatfeil. Det overskriver ikke det første
						dokumentet. Hele eksemplet håndterer denne feilen uten å slette noe.
					</p>
					<p>
						Før data fra et skjema lagres, må backend kontrollere hvem som får lagre og om feltene
						har riktige typer og gyldige verdier. Her bruker vi et ferdig, fiktivt dokument.
					</p>
				{:else}
					<p>
						<strong>Fil: <code>eksempel.mjs</code>.</strong> Dette terminalprogrammet bruker databasekoden
						direkte. Det har ingen nettside eller Express-ruter. Senere kan de samme databaseoperasjonene
						brukes inni rutene i backend.
					</p>
					<pre aria-label="Hele databaseeksemplet"><code>{completeDatabaseExample}</code></pre>
					<h3>Slik prøver du det på egen maskin</h3>
					<ol>
						<li>Last ned og pakk ut startprosjektet. Åpne mappen i editoren og terminalen.</li>
						<li>
							Kopier <code>.env.example</code> til <code>.env</code>, og fyll inn lærerens
							tilkoblingsopplysninger for din øvingsdatabase.
						</li>
						<li>Kjør kommandoene under. Den siste kjører eksemplet du nettopp har lest.</li>
					</ol>
					<a class="db-button" href="/ressurser/utstyrsboden-start.zip" download
						>Last ned startprosjekt med eksemplet (.zip)</a
					>
					<pre><code
							>{'npm install mongodb\nnode --env-file=.env klargjor.mjs\nnode --env-file=.env eksempel.mjs'}</code
						></pre>
					<p>
						I en ny øvingsdatabase legger klargjøringen inn seks dokumenter. Eksemplet viser tre
						kameraer, legger inn Mikrofon Bord og viser tre mikrofoner. Etterpå er det sju
						dokumenter. Kjører du eksemplet igjen, beholdes dataene; en eksisterende M203 blir ikke
						overskrevet.
					</p>
					<p>
						<code>finally</code> lukker forbindelsen når terminalprogrammet er ferdig, også etter en feil.
						Dokumentene slettes ikke. I en webserver gjenbrukes vanligvis én MongoClient mellom forespørsler
						i stedet for å lukke den etter hver rute.
					</p>
					<div class="db-callout">
						<strong>Forklar med egne ord:</strong> Hvilken linje kontakter databasen? Hvilken legger inn
						et dokument? Hvorfor må vi hente på nytt for å se det nye utstyret? Vis koden du bruker som
						begrunnelse.
					</div>
					<p>
						Nå kan du bruke de samme kodeformene i grunnøvingene. Valgene i øvingen bygger filteret
						du nettopp har sett; bokser og resultatlister viser hvilke dokumenter koden velger.
					</p>
				{/if}
				<nav class="lesson-bottom" aria-label="Forrige og neste teoridel">
					{#if index > 0}<button
							class="db-button secondary"
							onclick={() => select(databaseSections[index - 1].id)}>← Forrige del</button
						>{/if}
					{#if index < databaseSections.length - 1}<button
							class="db-button"
							onclick={() => select(databaseSections[index + 1].id)}
							>Neste: {databaseSections[index + 1].label} →</button
						>{:else}<a class="db-button" href="/databaser/finn-utstyr/?modul=databaser"
							>Prøv søkene i grunnøvingene →</a
						>{/if}
				</nav>
			</section>
		</div>
	</div>
</DatabaseFrame>

<style>
	.theory-layout {
		display: grid;
		grid-template-columns: 230px minmax(0, 1fr);
		gap: 24px;
		align-items: start;
	}
	.theory-content {
		min-width: 0;
	}
	.chapters {
		padding: 20px 0;
	}
	.chapters ol {
		padding: 0;
		margin: 12px 0 0;
		list-style: none;
	}
	.chapters button {
		display: flex;
		align-items: baseline;
		gap: 10px;
		width: 100%;
		padding: 12px;
		border: 1px solid transparent;
		border-radius: 8px;
		background: transparent;
		color: var(--color-text-muted);
		text-align: left;
		cursor: pointer;
		font: 500 var(--font-small)/1.5 var(--font-ui);
	}
	.chapters button span {
		font-variant-numeric: tabular-nums;
	}
	.chapters button[aria-current] {
		background: var(--color-accent-soft);
		color: var(--color-accent);
		border-color: var(--color-accent);
		font-weight: 650;
	}
	.lesson {
		margin-top: 0;
	}
	.lesson h2 {
		font-size: clamp(1.4rem, 3vw, 1.85rem);
		scroll-margin-top: 24px;
	}
	.lead {
		font-size: 1.125rem;
	}
	.concepts {
		margin: 20px 0;
	}
	.concepts > div {
		border-top: 1px solid var(--color-border);
		padding: 14px 0;
	}
	.concepts dt {
		font-weight: 650;
	}
	.concepts dd {
		margin: 4px 0 0;
		color: var(--color-text-muted);
	}
	.example-result,
	.insert-walkthrough {
		background: var(--color-surface-soft);
		border: 1px solid var(--color-border);
		padding: 18px;
		border-radius: 9px;
		margin: 20px 0;
	}
	.flow-detail {
		border-top: 1px solid var(--color-border);
		padding-top: 8px;
	}
	.lesson-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
		border-top: 1px solid var(--color-border);
		margin-top: 28px;
		padding-top: 20px;
	}
	.mobile-chapters {
		display: none;
	}
	@media (max-width: 800px) {
		.theory-layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.chapters {
			display: none;
		}
		.mobile-chapters {
			display: grid;
			margin-bottom: 18px;
		}
	}
</style>
