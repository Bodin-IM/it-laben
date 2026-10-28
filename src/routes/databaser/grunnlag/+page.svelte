<script>
	import DatabaseFrame from '#lib/components/DatabaseFrame.svelte';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	import { databaseTheory, equipment } from '#lib/databaseCourse.js';
	let section = $state('dokument');
</script>

<PartnerContext pageId="database-grunnlag" values={{ section }} />
<DatabaseFrame index={0}>
	<section class="db-panel">
		<h2>Et register for skolens utstyr</h2>
		<p>
			Du skal hjelpe Utstyrsboden med å finne kameraer, mikrofoner og lys. Først undersøker du data
			her. Deretter skriver du egne søk mot MongoDB på din maskin.
		</p>
		<ul>
			{#each databaseTheory.goals as goal}<li>{goal}</li>{/each}
		</ul>
	</section>
	<div class="db-grid">
		<section class="db-panel">
			<h2>Dette kjenner du fra MySQL</h2>
			<div class="db-table-wrap">
				<table>
					<caption>Tabellen utstyr – ett eksempel</caption><thead
						><tr><th>id</th><th>navn</th><th>kategori</th></tr></thead
					><tbody><tr><td>K101</td><td>Kamera Nord</td><td>kamera</td></tr></tbody>
				</table>
			</div>
			<p>
				En tabell har rader og kolonner. I en relasjonsmodell kobler vi ofte tabeller med nøkler.
			</p>
		</section>
		<section class="db-panel">
			<h2>Det samme utstyret som dokument</h2>
			<pre><code>{JSON.stringify(equipment[0], null, 2)}</code></pre>
			<p>Dette dokumentet ligger i collectionen <code>utstyr</code>. Feltene beskriver én enhet.</p>
		</section>
	</div>
	<section class="db-panel">
		<h2>Undersøk én sammenheng om gangen</h2>
		<div class="db-actions" role="group" aria-label="Velg forklaring">
			<button
				class="db-button secondary"
				aria-pressed={section === 'dokument'}
				onclick={() => (section = 'dokument')}>Dokument og collection</button
			>
			<button
				class="db-button secondary"
				aria-pressed={section === 'typer'}
				onclick={() => (section = 'typer')}>Datatyper</button
			>
			<button
				class="db-button secondary"
				aria-pressed={section === 'filter'}
				onclick={() => (section = 'filter')}>Søk med et filter</button
			>
		</div>
		{#if section === 'dokument'}
			<h3>Fra tabell til collection</h3>
			<p>
				Som en første sammenligning kan du tenke tabell → collection, rad → dokument og kolonne →
				felt. Modellene er likevel ulike: et dokument kan også inneholde lister og andre dokumenter.
			</p>
			<p>
				<code>_id</code> identifiserer dokumentet. Her bruker vi korte tekst-ID-er. Utelater du
				<code>_id</code>
				ved innsetting, lager driveren vanligvis en <code>ObjectId</code>.
			</p>
			<p>
				MongoDB er en dokumentdatabase, én type NoSQL. Den lagrer BSON, et dokumentformat med flere
				datatyper enn JSON. Eksemplene våre vises som JSON.
			</p>
			<div class="db-callout">
				Fleksibelt skjema betyr at dokumenter kan ha ulike felt. Du må fortsatt velge en fornuftig
				modell og kontrollere dataene som lagres.
			</div>
		{:else if section === 'typer'}
			<h3>Samme tegn, ulik betydning</h3>
			<pre><code
					>{'"tilgjengelig": true     // boolsk: ja eller nei\n"tilgjengelig": "true"   // tekst: fire bokstaver\n"dagspris": 250          // tall: kan sammenlignes som tall'}</code
				></pre>
			<p>
				Kommentarene forklarer utdraget; de hører ikke til i en JSON-fil. Dokumentene våre bruker <code
					>true</code
				>
				og <code>false</code> uten anførselstegn for tilgjengelighet.
			</p>
			<p>
				<strong>Tenk før du går videre:</strong> Vil et søk med teksten <code>"true"</code> finne
				dokumentet som har den boolske verdien <code>true</code>?
			</p>
		{:else}
			<h3>Filteret beskriver hva som må passe</h3>
			<pre><code
					>{'const filter = { kategori: "kamera" };\nconst resultat = await utstyr.find(filter).toArray();'}</code
				></pre>
			<p>
				<code>find()</code> velger dokumenter etter filteret. I Node.js gir den en markør, en
				<em>cursor</em>. <code>await ...toArray()</code> henter resultatene til en liste.
			</p>
			<p>
				Et tomt filter, <code>{'{}'}</code>, finner alle. Har filteret flere felt, må alle
				betingelsene passe. <code>{'{ dagspris: { $lte: 200 } }'}</code> betyr at dagsprisen er mindre
				enn eller lik 200.
			</p>
		{/if}
	</section>
	<div class="db-bottom">
		<p>
			Nå skal du forutsi, prøve og reparere søk. Du kan gå tilbake til teorien når du trenger den.
		</p>
		<a class="db-button" href="/databaser/finn-utstyr/?modul=databaser"
			>Videre til grunnøvingene →</a
		>
	</div>
</DatabaseFrame>
