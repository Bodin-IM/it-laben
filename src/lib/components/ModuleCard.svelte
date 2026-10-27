<script>
	import { moduleSummary, moduleProgress } from '#lib/moduler.js';
	import { lab } from '#lib/lab.js';
	/** @type {{module:import('#lib/moduler.js').Module}} */
	let { module } = $props();
	const progress = $derived(moduleProgress(module, $lab.summary?.progress));
</script>

<a class="module-card" href={`/moduler/${module.id}/`}>
	<div class="top"><span class="badge">Modul</span><span aria-hidden="true">▤</span></div>
	<h3>{module.title}</h3>
	<p class="description">{module.description}</p>
	<p class="contents">{moduleSummary(module)}</p>
	{#if $lab.user && $lab.summary}
		<p class="progress">
			{progress.completed} av {progress.total} elevaktiviteter gjennomgått eller bestått
		</p>
	{/if}
	<div class="bottom">
		<span>{progress.started ? 'Åpne modulen' : 'Utforsk modulen'}</span><span aria-hidden="true"
			>→</span
		>
	</div>
</a>

<style>
	.module-card {
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 22px;
		border: 1px solid var(--color-info-border);
		border-top: 3px solid var(--color-info);
		border-radius: 12px;
		background: var(--color-info-soft);
		color: var(--color-text);
		text-decoration: none;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}
	.module-card:hover {
		border-color: var(--color-info);
		box-shadow: 0 5px 18px var(--color-shadow);
	}
	.module-card:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}
	.top,
	.bottom {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		color: var(--color-info);
	}
	.top {
		margin-bottom: 14px;
	}
	.badge {
		font-size: var(--font-small);
		font-weight: 750;
	}
	h3 {
		margin: 0 0 8px;
		font-size: 1.25rem;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}
	p {
		margin: 0;
	}
	.description {
		font-size: var(--font-body);
		margin-bottom: 18px;
	}
	.contents {
		margin-top: auto;
		font-size: var(--font-small);
		color: var(--color-info);
	}
	.progress {
		font-size: var(--font-small);
		margin-top: 8px;
	}
	.bottom {
		border-top: 1px solid var(--color-info-border);
		margin-top: 15px;
		padding-top: 12px;
		font-weight: 650;
		font-size: var(--font-small);
	}
	@media (prefers-reduced-motion: reduce) {
		.module-card {
			transition: none;
		}
	}
</style>
