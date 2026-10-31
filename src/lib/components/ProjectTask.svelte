<script>
	/** @type {{instruction:string,check:string,id?:string}} */
	let { instruction, check, id } = $props();
</script>

<section class="project-task" {id} tabindex={id ? -1 : undefined} aria-label="Arbeid i eget prosjekt">
	<h3>Bygg videre i egen chat</h3>
	<p><strong>Lag selv:</strong> {instruction}</p>
	<p><strong>Test og forklar:</strong> {check}</p>
	<p class="note">Arbeid i prosjektet på din egen maskin. Ta vare på kode og testnotater der; IT-laben vurderer ikke denne koden automatisk.</p>
</section>

<style>
	.project-task { margin-block: 20px; padding: 20px; border: 1px solid var(--color-info-border); border-left: 4px solid var(--color-info); border-radius: var(--radius-card); background: var(--color-info-soft); color: var(--color-text); font: 400 var(--font-body)/1.6 var(--font-ui); overflow-wrap: anywhere; }
	h3 { margin: 0 0 10px; font-size: 1.2rem; line-height: 1.4; }
	p { margin: 0 0 12px; max-width: 70ch; }
	p:last-child { margin-bottom: 0; }
	.note { font-size: var(--font-small); color: var(--color-text-muted); }
	.project-task:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 4px; }
	@media (max-width: 500px) { .project-task { padding: 16px; } }
</style>
