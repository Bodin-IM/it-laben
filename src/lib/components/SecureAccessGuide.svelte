<script>
	import { connection, secureHref, probeHttps } from '#lib/connection.js';
	const fingerprint = $derived($connection.caSha256?.match(/.{2}/g)?.join(':'));
</script>

<section class="secure-guide" aria-labelledby="secure-title">
	<div class="intro">
		<span class="eyebrow">DIN EGEN PLASS I IT-LABEN</span>
		<h1 id="secure-title">Ta vare på<br /><em>fremgangen din.</em></h1>
		<p>
			Du kan lese leksjoner og prøve de vanlige spillene uten innlogging. Med Min lab lagres
			progresjon, XP og avataren din mellom besøk.
		</p>
	</div>
	<div class="connection-status" class:reachable={$connection.probe === 'reachable'} role="status">
		<strong
			>{$connection.probe === 'reachable'
				? 'HTTPS er tilgjengelig i denne nettleseren.'
				: $connection.probe === 'checking'
					? 'Sjekker sikker tilkobling …'
					: $connection.probe === 'unverified'
						? 'Vi fikk ikke bekreftet HTTPS.'
						: 'Min lab bruker en sikker HTTPS-forbindelse.'}</strong
		>
		<p>
			{$connection.probe === 'reachable'
				? 'Du kan åpne Min lab og logge inn eller opprette profilen din.'
				: 'Følg stegene nedenfor. Hvis HTTPS fortsatt ikke virker, sjekk at du er på skolens nett eller be læreren om hjelp.'}
		</p>
		<div class="actions">
			<a class="primary" href={secureHref($connection.httpsOrigin)}>Åpne Min lab på HTTPS →</a
			><button
				type="button"
				disabled={$connection.probe === 'checking' || !$connection.httpsOrigin}
				onclick={probeHttps}>Sjekk HTTPS igjen</button
			>
		</div>
	</div>
	<div class="steps">
		<article>
			<span class="number">1</span>
			<h2>Hent skolens sertifikat</h2>
			<p>
				Sertifikatet lar nettleseren kjenne igjen IT-laben. Installer det når læreren bekrefter at
				det er skolens sertifikat.
			</p>
			<!-- The certificate belongs to the host's Nginx configuration, outside the static build. -->
			{#if $connection.ready}<a
					class="download"
					href="/sertifikat/it-laben-root-ca.crt"
					download="it-laben-root-ca.crt">Last ned skolens sertifikat</a
				>{:else}<span>Henter sertifikatlenken …</span>{/if}
		</article>
		<article>
			<span class="number">2</span>
			<h2>Installer på skole-PC-en</h2>
			<p>
				Åpne filen og velg <strong>Installer sertifikat</strong>. Velg
				<strong>Gjeldende bruker</strong>, deretter
				<strong>Plasser alle sertifikater i følgende lager</strong>
				→ <strong>Klarerte rotsertifiseringsinstanser</strong>. Fullfør veiviseren.
			</p>
			<p>Blir installasjonen stoppet av PC-ens regler, ber du læreren om hjelp.</p>
		</article>
		<article>
			<span class="number">3</span>
			<h2>Åpne Min lab</h2>
			<p>
				Åpne HTTPS-adressen på nytt. Lag profilen din, eller logg inn med nøkkelfilen du allerede
				har. Du beholder samme profil og progresjon.
			</p>
			<a href={secureHref($connection.httpsOrigin)}>Fortsett til Min lab →</a>
		</article>
	</div>
	{#if fingerprint}<details>
			<summary>Kontroller at du har riktig sertifikat</summary>
			<p>
				Læreren kan bekrefte dette SHA-256-fingeravtrykket. Sammenlign det med sertifikatets
				detaljer.
			</p>
			<code>{fingerprint}</code>
		</details>{/if}
	<p class="continue"><a href="/">Fortsett å utforske uten innlogging →</a></p>
</section>

<style>
	.secure-guide {
		font:
			16px/1.6 system-ui,
			sans-serif;
		color: var(--color-text);
	}
	.intro {
		max-width: 740px;
		margin: 20px 0 30px;
	}
	.eyebrow {
		font-size: 11px;
		font-weight: 750;
		letter-spacing: 0.14em;
		color: var(--color-accent);
	}
	h1 {
		font-size: clamp(2.6rem, 6vw, 4.4rem);
		line-height: 1.06;
		letter-spacing: -0.05em;
		margin: 12px 0 20px;
	}
	em {
		color: var(--color-accent);
		font-style: normal;
	}
	p {
		color: var(--color-text-muted);
		margin: 10px 0;
	}
	.connection-status {
		border: 1px solid var(--color-border-strong);
		border-radius: 12px;
		padding: 22px;
		background: var(--color-surface);
	}
	.reachable {
		border-color: var(--color-success-border);
		background: var(--color-success-soft);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 18px;
	}
	a {
		color: var(--color-accent);
		font-weight: 650;
	}
	.primary,
	button,
	.download {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		min-height: 44px;
		padding: 10px 15px;
		border-radius: 7px;
		border: 1px solid var(--color-border-strong);
		background: var(--color-surface);
		color: var(--color-accent);
		font:
			650 14px/1.4 system-ui,
			sans-serif;
		text-decoration: none;
		cursor: pointer;
	}
	.primary {
		background: var(--color-action);
		color: var(--color-on-action);
		border-color: var(--color-action);
	}
	button:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.steps {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
		margin: 24px 0;
	}
	article {
		padding: 22px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		border-radius: 12px;
		min-width: 0;
	}
	.number {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 9px;
		color: var(--color-accent);
		background: var(--color-accent-soft);
		font-weight: 750;
	}
	h2 {
		font-size: 18px;
		letter-spacing: -0.025em;
		line-height: 1.3;
		margin: 14px 0 10px;
	}
	article p {
		font-size: 14px;
		overflow-wrap: anywhere;
	}
	strong {
		color: var(--color-text);
	}
	details {
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 16px 20px;
	}
	summary {
		color: var(--color-accent);
		font-weight: 650;
		cursor: pointer;
	}
	code {
		display: block;
		overflow-wrap: anywhere;
		font-size: 12px;
	}
	.continue {
		margin: 25px 0;
	}
	a:focus-visible,
	button:focus-visible,
	summary:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	@media (max-width: 800px) {
		.steps {
			grid-template-columns: 1fr;
		}
	}
</style>
