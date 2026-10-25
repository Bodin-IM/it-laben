<script>
	import { lab } from '#lib/lab.js';
	import { fag } from '#lib/innhold.js';
	/** @type {{subject?:string}} */
	let { subject = 'alle' } = $props();
	const tracks = $derived(
		($lab.summary?.tracks ?? []).filter((item) => subject === 'alle' || item.subject === subject)
	);
</script>

{#if tracks.length}
	<section class="tracks" aria-labelledby="tracks-title">
		<div class="section-heading">
			<div>
				<span class="eyebrow">ET STEG OM GANGEN</span>
				<h2 id="tracks-title">Velg et fagspor</h2>
			</div>
			<p>Følg et spor, eller utforsk fritt.</p>
		</div>
		<div class="track-grid">
			{#each tracks as track (track.id)}
				<details class="track" class:complete={track.completed === track.total}>
					<summary
						><span class="track-symbol" aria-hidden="true">{track.symbol}</span>
						<div>
							<span class="subject">{fag.find((item) => item.id === track.subject)?.navn}</span>
							<h3>{track.title}</h3>
							<div class="progress-line">
								<progress
									aria-label={`Fremgang i ${track.title}`}
									value={track.completed}
									max={track.total}
								></progress><span>{track.completed}/{track.total}</span>
							</div>
						</div>
						<span class="open-icon" aria-hidden="true"
							>{track.completed === track.total ? '✓' : '+'}</span
						></summary
					>
					<div class="track-content">
						<p>{track.description}</p>
						<ol>
							{#each track.requirements as requirement (requirement.id)}<li
									class:done={requirement.completed}
								>
									<span aria-hidden="true">{requirement.completed ? '✓' : '○'}</span><a
										href={requirement.href}>{requirement.title}</a
									><small
										>{requirement.completed
											? requirement.evidence === 'reviewed'
												? 'Gjennomgått'
												: 'Bestått'
											: requirement.evidence === 'reviewed'
												? 'Din gjennomgang'
												: 'Prøv oppgaven'}</small
									>
								</li>{/each}
						</ol>
						{#if !track.next}<p class="complete-copy">
								Alle publiserte steg i dette sporet er gjennomført.
							</p>{/if}
					</div>
				</details>
			{/each}
		</div>
	</section>
{/if}

<style>
	.tracks {
		margin-block: 36px;
		color: var(--color-text);
		font-family: system-ui, sans-serif;
	}
	.section-heading {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 20px;
		flex-wrap: wrap;
		margin-bottom: 15px;
	}
	.eyebrow {
		font-size: 0.68rem;
		letter-spacing: 1.4px;
		color: var(--color-accent);
		font-weight: 750;
	}
	h2 {
		font-size: 1.3rem;
		margin: 5px 0 0;
		letter-spacing: -0.4px;
		line-height: 1.4;
	}
	p {
		font-size: var(--font-small);
		color: var(--color-text-muted);
		margin: 0;
		line-height: 1.6;
	}
	.track-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
		align-items: start;
	}
	.track {
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
		overflow: hidden;
	}
	.track.complete {
		border-color: var(--color-success-border);
	}
	summary {
		display: flex;
		gap: 14px;
		align-items: center;
		list-style: none;
		padding: 20px;
		cursor: pointer;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary > div {
		flex: 1;
		min-width: 0;
	}
	.track-symbol {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		flex: 0 0 40px;
		border-radius: 9px;
		background: var(--color-accent-soft);
		color: var(--color-accent);
		font: 650 17px monospace;
	}
	.subject {
		font-size: 0.7rem;
		color: var(--color-text-muted);
	}
	h3 {
		font-size: var(--font-body);
		margin: 3px 0 7px;
		line-height: 1.4;
		overflow-wrap: anywhere;
	}
	.progress-line {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: var(--font-meta);
		color: var(--color-text-muted);
	}
	progress {
		flex: 1;
		width: 60px;
		height: 5px;
		accent-color: var(--color-accent);
	}
	.open-icon {
		color: var(--color-accent);
		font-size: 22px;
	}
	.track-content {
		padding: 0 20px 20px;
	}
	ol {
		list-style: none;
		padding: 0;
		margin: 12px 0 0;
	}
	li {
		display: grid;
		grid-template-columns: 16px minmax(0, 1fr);
		column-gap: 10px;
		padding: 10px 0;
		border-top: 1px solid var(--color-border);
		font-size: var(--font-small);
	}
	li > span {
		grid-row: span 2;
		color: var(--color-text-muted);
	}
	li.done > span {
		color: var(--color-success);
	}
	a {
		color: var(--color-text);
		line-height: 1.5;
		text-decoration: none;
		overflow-wrap: anywhere;
	}
	a:hover {
		text-decoration: underline;
	}
	small {
		color: var(--color-text-muted);
		font-size: var(--font-meta);
		margin-top: 3px;
	}
	.complete-copy {
		color: var(--color-success);
		margin-top: 8px;
	}
	summary:focus-visible,
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: -3px;
	}
	@media (max-width: 700px) {
		.track-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
