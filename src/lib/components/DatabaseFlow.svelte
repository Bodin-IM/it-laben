<script>
	/** @type {{active:string,count:number}} */
	let { active, count } = $props();
</script>

<figure aria-label="Frontend, backend og database">
	<div class="systems">
		<div
			class="system"
			class:active={active === 'frontend'}
			aria-current={active === 'frontend' ? 'step' : undefined}
		>
			<svg viewBox="0 0 48 48" aria-hidden="true"
				><rect x="4" y="6" width="40" height="34" rx="3" /><path
					d="M4 16h40M10 11h2m4 0h2m4 0h2M12 24h24M12 30h16"
				/></svg
			>
			<strong>Frontend</strong><span>Svelte i nettleseren</span>
			<p>Viser utstyr og tar imot valg.</p>
		</div>
		<div class="connection"><span>HTTP + JSON</span><b aria-hidden="true">↔</b></div>
		<div
			class="system"
			class:active={active === 'backend'}
			aria-current={active === 'backend' ? 'step' : undefined}
		>
			<svg viewBox="0 0 48 48" aria-hidden="true"
				><rect x="5" y="6" width="38" height="15" rx="3" /><rect
					x="5"
					y="27"
					width="38"
					height="15"
					rx="3"
				/><path d="M12 13h2m6 0h15M12 34h2m6 0h15" /></svg
			>
			<strong>Backend</strong><span>Node.js + Express</span>
			<p>Kontrollerer og behandler forespørsler.</p>
		</div>
		<div class="connection"><span>MongoDB-driver</span><b aria-hidden="true">↔</b></div>
		<div
			class="system"
			class:active={active === 'database'}
			aria-current={active === 'database' ? 'step' : undefined}
		>
			<svg viewBox="0 0 48 48" aria-hidden="true"
				><ellipse cx="24" cy="10" rx="17" ry="6" /><path
					d="M7 10v27c0 8 34 8 34 0V10M7 23c0 8 34 8 34 0"
				/></svg
			>
			<strong>Database</strong><span>MongoDB · utstyr</span>
			<p>{count} lagrede dokumenter i eksemplet.</p>
		</div>
	</div>
	<figcaption>
		Her er delene tegnet hver for seg. Backend og MongoDB kan kjøre på samme maskin eller på ulike
		servere. Frontend snakker med backend.
	</figcaption>
</figure>

<style>
	figure {
		margin: 20px 0;
	}
	.systems {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 5rem minmax(0, 1fr) 5rem minmax(0, 1fr);
		align-items: center;
		gap: 6px;
	}
	.system {
		min-width: 0;
		align-self: stretch;
		border: 1px solid var(--color-border-strong);
		border-radius: 12px;
		padding: 18px 12px;
		background: var(--color-surface-soft);
		text-align: center;
	}
	.system.active {
		border: 2px solid var(--color-accent);
		padding: 17px 11px;
		background: var(--color-accent-soft);
	}
	.system svg {
		width: 44px;
		height: 44px;
		display: block;
		margin: 0 auto 10px;
		fill: none;
		stroke: var(--color-text);
		stroke-width: 1.8;
	}
	.system strong {
		display: block;
		font-size: 1.125rem;
	}
	.system span,
	.system p,
	figcaption {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.system p {
		margin: 10px 0 0;
	}
	.connection {
		text-align: center;
		color: var(--color-text-muted);
		font-size: var(--font-meta);
		line-height: 1.5;
		overflow-wrap: anywhere;
	}
	.connection b {
		display: block;
		font-size: 1.5rem;
	}
	figcaption {
		margin-top: 12px;
		line-height: 1.6;
	}
	@media (max-width: 1000px) {
		.systems {
			grid-template-columns: 1fr;
			gap: 8px;
		}
		.system {
			display: grid;
			grid-template-columns: 48px minmax(0, 1fr);
			text-align: left;
			column-gap: 12px;
			padding: 14px;
		}
		.system.active {
			padding: 13px;
		}
		.system svg {
			grid-row: 1 / 4;
			margin: 0;
			align-self: center;
		}
		.system p {
			grid-column: 2;
			margin: 4px 0 0;
		}
		.connection {
			display: flex;
			justify-content: center;
			align-items: center;
			gap: 8px;
		}
		.connection b {
			transform: rotate(90deg);
		}
	}
</style>
