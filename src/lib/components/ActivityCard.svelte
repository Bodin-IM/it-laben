<script>
	import { innholdsformat } from '#lib/innhold.js';
	import { lab } from '#lib/lab.js';
	/** @type {{activity:(typeof import('#lib/innhold.js').altElevinnhold)[number]}} */
	let { activity } = $props();
	const status = $derived($lab.summary?.progress.find((item) => item.id === activity.id)?.status);
</script>

<a class="sidekort" href={activity.href}>
	<span class="activity-icon" aria-hidden="true">{activity.symbol}</span>
	<div class="copy">
		<div class="meta">
			<span
				>{activity.format === 'aktivitet'
					? activity.type
					: innholdsformat(activity.format).entall}{activity.format === 'spill'
					? ' og spill'
					: ''}</span
			>
			{#if status === 'reviewed'}<span class="saved-status">✓ Gjennomgått</span
				>{:else if status === 'passed'}<span class="saved-status">✓ Bestått</span
				>{:else if status === 'started'}<span class="saved-status started">Påbegynt</span>{/if}
		</div>
		<h3>{activity.tittel}</h3>
		<p>{activity.beskrivelse}</p>
		<span class="topics">{activity.emner.join(' · ')}</span>
	</div>
	<span class="arrow" aria-hidden="true">→</span>
</a>

<style>
	.sidekort {
		display: grid;
		grid-template-columns: 38px minmax(0, 1fr) 18px;
		align-items: start;
		gap: 14px;
		height: 100%;
		padding: 22px 20px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		background: var(--color-surface);
		color: var(--color-text);
		text-decoration: none;
		box-sizing: border-box;
		transition: border-color 0.15s;
	}
	.sidekort:hover {
		border-color: var(--color-accent);
	}
	.sidekort:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}
	.activity-icon {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 10px;
		background: var(--color-surface-soft);
		color: var(--color-text-muted);
		font: 600 1rem/1 monospace;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
		font-size: var(--font-meta);
		color: var(--color-text-muted);
		margin-bottom: 6px;
	}
	.saved-status {
		color: var(--color-success);
		font-weight: 600;
	}
	.started {
		color: var(--color-text-muted);
	}
	h3 {
		margin: 0 0 7px;
		font-size: 1.125rem;
		line-height: 1.4;
		letter-spacing: -0.02em;
		overflow-wrap: anywhere;
	}
	p {
		margin: 0 0 12px;
		font-size: var(--font-body);
		color: var(--color-text-muted);
		line-height: 1.55;
	}
	.topics {
		font-size: var(--font-meta);
		color: var(--color-text-muted);
	}
	.arrow {
		padding-top: 1px;
		font-size: 1.2rem;
		color: var(--color-accent);
	}
	@media (max-width: 550px) {
		.sidekort {
			grid-template-columns: minmax(0, 1fr) 18px;
			padding: 20px;
		}
		.activity-icon {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sidekort {
			transition: none;
		}
	}
</style>
