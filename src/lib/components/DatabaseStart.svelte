<script>
	import { lab, learningContext } from '#lib/lab.js';
	import { journeyKey, restoreJourney, resumeDatabase } from '#lib/databaseJourney.js';
	let resume = $state(/** @type {ReturnType<typeof resumeDatabase>} */ (null));
	let warning = $state('');
	const scope = $derived(`${$lab.user?.id ?? 'guest'}:${$learningContext.mode}:${$learningContext.openingId ?? ''}`);
	$effect(() => {
		const key = journeyKey(scope);
		resume = null; warning = '';
		try { resume = resumeDatabase(restoreJourney(JSON.parse(localStorage.getItem(key) ?? 'null'))); }
		catch { warning = 'Sist åpnet del kunne ikke hentes. Du kan velge en del under.'; }
	});
</script>

<section class="database-start" aria-labelledby="database-start-title">
	<h2 id="database-start-title">Få Utstyrsboden til å fungere</h2>
	<p>Finn utstyr, prøv egne testdata og bygg et register. Åpne forklaringene når du trenger dem.</p>
	{#if resume}<a class="start" href={resume.href}>Fortsett der du slapp →</a><p class="note">Sist åpnet her: {resume.title}</p>
	{:else}<a class="start" href="/databaser/finn-utstyr/?modul=databaser">Start med å finne utstyr →</a>{/if}
	{#if warning}<p role="status">{warning}</p>{/if}
	<p class="note">Søkeforsøk, verkstedforsøk og sist åpnet del lagres i denne nettleseren for aktiv profil. Egen prosjektkode lagrer du på maskinen din.</p>
	<details><summary>Før du begynner</summary><p>Du trenger kjennskap til objekter, lister og enkle betingelser i JavaScript. Aktivitetene kan prøves direkte i nettleseren. Kodeoppgaven trenger Node.js og tilgang til en egen MongoDB-øvingsdatabase fra læreren.</p><a href="/databaser/grunnlag/?modul=databaser">Åpne teori og kodeeksempler →</a><p>På en annen maskin kan du velge riktig del direkte. Lokal status er ikke en vurdering av forståelse eller en kopi av prosjektfilene dine.</p></details>
</section>

<style>
	.database-start { margin-block: 20px; padding: 24px; border: 1px solid var(--color-border); border-radius: var(--radius-card); background: var(--color-surface); color: var(--color-text); font: 400 var(--font-body)/1.6 var(--font-ui); overflow-wrap: anywhere; }
	h2 { margin: 0 0 12px; font-size: 1.4rem; } p { max-width: 75ch; } .note { color: var(--color-text-muted); font-size: var(--font-small); }
	a { color: var(--color-accent); text-underline-offset: 4px; } .start { display: inline-flex; align-items: center; min-height: 44px; font-weight: 650; }
	summary { padding-block: 12px; min-height: 44px; cursor: pointer; font-weight: 650; } details { border-top: 1px solid var(--color-border); }
	:is(a, summary):focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	@media (max-width: 500px) { .database-start { padding: 18px 16px; } }
</style>
