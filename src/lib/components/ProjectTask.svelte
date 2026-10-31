<script>
	/** @type {{instruction:string,check:string,id?:string,guide?:import('#lib/backendProjectGuides.js').ProjectGuide}} */
	let { instruction, check, id, guide } = $props();
</script>

<section class="project-task" {id} tabindex={id ? -1 : undefined} aria-label="Arbeid i eget prosjekt">
	<h3>Bygg videre i egen chat</h3>
	<p><strong>Lag selv:</strong> {instruction}</p>
	{#if guide}
		<p><strong>Her jobber du:</strong> {guide.where}</p>
		<p><strong>Første lille endring:</strong> {guide.firstChange}</p>
		<p class="note">Har du dette fra før? Gå rett til testene nedenfor. Bruk filnavn og struktur fra ditt eget prosjekt.</p>
		<details>
			<summary>Hjelp til å bygge videre</summary>
			<p><strong>Utgangspunkt:</strong> {guide.prerequisite}</p>
			<ol>{#each guide.steps as step}<li>{step}</li>{/each}</ol>
			<p><strong>Hvis du står fast:</strong> {guide.hint}</p>
		</details>
		<h4>Prøv i egen app</h4>
		<ul>{#each guide.tests as scenario}<li>{scenario}</li>{/each}</ul>
	{/if}
	<p><strong>Test og forklar:</strong> {check}</p>
	<p class="note">Arbeid i prosjektet på din egen maskin. Ta vare på kode og testnotater der; IT-laben vurderer ikke denne koden automatisk.</p>
</section>

<style>
	.project-task { margin-block: 20px; padding: 20px; border: 1px solid var(--color-info-border); border-left: 4px solid var(--color-info); border-radius: var(--radius-card); background: var(--color-info-soft); color: var(--color-text); font: 400 var(--font-body)/1.6 var(--font-ui); overflow-wrap: anywhere; }
	h3 { margin: 0 0 10px; font-size: 1.2rem; line-height: 1.4; }
	h4 { margin: 20px 0 10px; font-size: 1.05rem; }
	details { margin-block: 14px; border-top: 1px solid var(--color-info-border); border-bottom: 1px solid var(--color-info-border); }
	summary { min-height: 44px; box-sizing: border-box; padding-block: 12px; cursor: pointer; font-weight: 650; }
	summary:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	ul, ol { max-width: 70ch; padding-left: 1.5rem; }
	li + li { margin-top: 10px; }
	p { margin: 0 0 12px; max-width: 70ch; }
	p:last-child { margin-bottom: 0; }
	.note { font-size: var(--font-small); color: var(--color-text-muted); }
	.project-task:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 4px; }
	@media (max-width: 500px) { .project-task { padding: 16px; } }
</style>
