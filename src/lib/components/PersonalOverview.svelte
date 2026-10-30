<script>
	import { lab } from '#lib/lab.js';
	import { nextActivity } from '#lib/progression.js';
	/** @type {{subject?:string}} */
	let { subject = 'alle' } = $props();
	const next = $derived(nextActivity($lab.summary?.progress ?? [], subject));
</script>

{#if $lab.user && $lab.summary && next}
	<aside class="next-task" aria-labelledby="next-task-title">
		<div>
			<p id="next-task-title">Forslag til neste oppgave</p>
			<strong>{next.title}</strong>
		</div>
		<a href={next.href}>{next.evidence === 'checked' ? 'Prøv fagsjekken' : 'Fortsett'} <span aria-hidden="true">→</span></a>
	</aside>
{/if}

<style>
	.next-task {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px 24px;
		margin: 0 0 28px;
		padding: 16px 20px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		background: var(--color-surface);
		color: var(--color-text);
		font-family: var(--font-ui);
	}
	.next-task > div { flex: 1 1 15rem; min-width: 0; overflow-wrap: anywhere; }
	p { margin: 0 0 4px; color: var(--color-text-muted); font-size: var(--font-small); }
	strong { font-size: var(--font-body); line-height: 1.5; }
	a {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		color: var(--color-accent);
		font-size: var(--font-small);
		font-weight: 650;
		text-underline-offset: 4px;
	}
	a:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 4px; }
</style>
