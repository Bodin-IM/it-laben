<script>
	import { connection, secureHref } from '#lib/connection.js';
</script>

{#if $connection.publicHttp}
	<aside class="connection-banner" aria-label="Utforsk uten innlogging">
		<div>
			<strong>Utforsk IT-laben uten innlogging.</strong><span
				>Lagre progresjon og samle XP med Min lab på HTTPS.</span
			>
		</div>
		<nav aria-label="Sikker pålogging">
			{#if $connection.probe === 'reachable'}<a
					class="primary"
					href={secureHref($connection.httpsOrigin)}>Åpne Min lab →</a
				>{:else}<a class="primary" href="/kom-i-gang/">Kom i gang med Min lab →</a>{/if}
			{#if $connection.probe === 'reachable'}<a href="/kom-i-gang/">Sertifikat og hjelp</a>{/if}
		</nav>
	</aside>
{/if}

<style>
	.connection-banner {
		box-sizing: border-box;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 24px;
		width: min(1120px, calc(100% - 32px));
		margin: 14px auto 0;
		padding: 14px 18px;
		border: 1px solid var(--color-border-strong);
		border-radius: 10px;
		background: var(--color-accent-soft);
		color: var(--color-text);
		font:
			13px/1.5 system-ui,
			sans-serif;
	}
	.connection-banner > div {
		display: grid;
		gap: 2px;
	}
	span {
		color: var(--color-text-muted);
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}
	a {
		color: var(--color-accent);
		font-weight: 650;
	}
	.primary {
		padding: 9px 13px;
		border-radius: 6px;
		background: var(--color-action);
		color: var(--color-on-action);
		text-decoration: none;
	}
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
</style>
