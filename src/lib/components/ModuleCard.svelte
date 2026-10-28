<script>
	import { moduleSummary, moduleProgress } from '#lib/moduler.js';
	import { fag } from '#lib/innhold.js';
	import { lab } from '#lib/lab.js';
	/** @type {{module:import('#lib/moduler.js').Module,publication?:import('#lib/modulePublication.js').ModulePublication,headingLevel?:3|4}} */
	let { module, publication, headingLevel = 3 } = $props();
	const progress = $derived(moduleProgress(module, $lab.summary?.progress));
	const subject = $derived(fag.find((item) => item.id === module.subject));
</script>

<a
	class="module-card"
	class:completed={publication?.status === 'completed'}
	href={`/moduler/${module.id}/`}
>
	<div class="top">
		<span class="module-icon" aria-hidden="true"
			><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
				><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 4v16m3-11h5m-5 4h5" /></svg
			></span
		>
		<span class="badge"
			>{publication?.status === 'active'
				? 'Aktiv modul'
				: publication?.status === 'completed'
					? 'Tidligere modul'
					: 'Modul'} <span aria-hidden="true">·</span>
			{subject?.navn}</span
		>
	</div>
	<svelte:element this={headingLevel === 4 ? 'h4' : 'h3'} class="title"
		>{module.title}</svelte:element
	>
	<p class="description">{module.description}</p>
	<div class="bottom">
		<p class="contents">{moduleSummary(module)}</p>
		<span class="open">Åpne modul <span aria-hidden="true">→</span></span>
	</div>
	{#if $lab.user && $lab.summary && progress.total > 0}
		<p class="progress">
			{progress.completed} av {progress.total} elevaktiviteter gjennomgått eller bestått
		</p>
	{/if}
</a>

<style>
	.module-card {
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 24px;
		border: 1px solid var(--color-info-border);
		border-radius: var(--radius-card);
		background: var(--color-info-soft);
		color: var(--color-text);
		text-decoration: none;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}
	.module-card:hover {
		border-color: var(--color-info);
		box-shadow: 0 4px 16px var(--color-shadow);
	}
	.module-card.completed {
		background: var(--color-surface);
		border-color: var(--color-border-strong);
	}
	.module-card.completed:hover {
		border-color: var(--color-info);
	}
	.module-card:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}
	.top {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 18px;
		color: var(--color-info);
	}
	.module-icon {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 9px;
		background: var(--color-surface);
	}
	svg {
		width: 23px;
		height: 23px;
	}
	.badge {
		font-size: var(--font-meta);
		font-weight: 650;
	}
	.title {
		margin: 0 0 8px;
		font-size: 1.375rem;
		line-height: 1.3;
		letter-spacing: -0.025em;
		overflow-wrap: anywhere;
	}
	p {
		margin: 0;
	}
	.description {
		font-size: var(--font-body);
		line-height: 1.55;
		margin-bottom: 22px;
	}
	.bottom {
		margin-top: auto;
		display: flex;
		align-items: end;
		flex-wrap: wrap;
		gap: 10px 16px;
		justify-content: space-between;
	}
	.contents {
		font-size: var(--font-meta);
		color: var(--color-text-muted);
	}
	.open {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--color-info);
		font-weight: 700;
		font-size: var(--font-small);
	}
	.progress {
		font-size: var(--font-meta);
		border-top: 1px solid var(--color-info-border);
		padding-top: 10px;
		margin-top: 14px;
		color: var(--color-info);
	}
	@media (max-width: 550px) {
		.module-card {
			padding: 20px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.module-card {
			transition: none;
		}
	}
</style>
