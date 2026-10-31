<script>
	import { lab } from '#lib/lab.js';
	import { connection } from '#lib/connection.js';
	import { moduler, moduleContents } from '#lib/moduler.js';
	import { modulePublication } from '#lib/modulePublicationStore.js';
	import { recommendNextActivity } from '#lib/moduleRecommendation.js';
	/** @type {{subject?:string,moduleId?:string}} */
	let { subject = 'alle', moduleId = '' } = $props();
	const modules = $derived(moduler.filter((module) => !moduleId || module.id === moduleId)
		.map((module) => ({ ...module, steps: moduleContents(module) })));
	const next = $derived($modulePublication.ready && !$modulePublication.error && !$connection.publicHttp
		? recommendNextActivity($lab.summary?.progress ?? [], modules, $modulePublication.modules, subject)
		: null);
</script>

{#if $lab.user && $lab.summary && next}
	<aside class="next-task" aria-labelledby="next-task-title">
		<div>
			<p id="next-task-title">Forslag til neste oppgave</p>
			<strong>{next.title}</strong>
			<p class="description">{next.description}</p>
			<p class="reason">{next.reason}</p>
		</div>
		<a href={next.href}>{next.action} <span aria-hidden="true">→</span></a>
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
	.description { margin-top: 6px; max-width: 65ch; color: var(--color-text); font-size: var(--font-body); line-height: var(--leading-body); }
	.reason { margin-top: 6px; line-height: var(--leading-body); }
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
