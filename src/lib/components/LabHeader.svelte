<script>
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import AccountLink from '#lib/components/AccountLink.svelte';
	import { lab } from '#lib/lab.js';
	import { hasTeacherRole } from '#lib/learning.js';
	/** @type {{current?:'catalogue'|''}} */
	let { current = '' } = $props();
</script>

<header class="lab-header">
	<div class="header-inner">
		<a class="brand" href="/" aria-label="IT-laben – forside">
			<span class="brand-mark" aria-hidden="true">IT</span><span
				>IT-laben<span class="brand-dot">.</span></span
			>
		</a>
		<nav class="main-nav" aria-label="Hovedmeny">
			<a href="/" aria-current={current === 'catalogue' ? 'page' : undefined}>Fagoversikt</a>
			<a href="/toppliste/">Toppliste</a>
			{#if hasTeacherRole($lab.user?.role)}<a href="/laerer/undervisning/">Undervisning</a>{/if}
		</nav>
		<div class="account"><AccountLink /></div>
		<div class="theme"><ThemeToggle compact /></div>
	</div>
</header>

<style>
	.lab-header {
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
		font-family: var(--font-ui);
	}
	.header-inner {
		width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		margin: auto;
		min-height: 84px;
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		align-items: center;
		gap: 24px;
		padding-block: 14px;
		box-sizing: border-box;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-size: 1.25rem;
		font-weight: 780;
		letter-spacing: -0.04em;
		color: var(--color-text);
		text-decoration: none;
	}
	.brand-mark {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 10px;
		background: var(--color-brand);
		color: var(--color-on-brand);
		font: 700 1rem/1 monospace;
		letter-spacing: -1px;
	}
	.brand-dot {
		color: var(--color-accent);
	}
	.main-nav {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		margin-left: 20px;
	}
	.main-nav a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 12px;
		border-radius: 8px;
		color: var(--color-text-muted);
		font-size: var(--font-small);
		font-weight: 600;
		text-decoration: none;
		box-sizing: border-box;
	}
	.main-nav a:hover {
		background: var(--color-surface-soft);
		color: var(--color-text);
	}
	.main-nav a[aria-current] {
		color: var(--color-accent);
		background: var(--color-accent-soft);
	}
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.account,
	.theme {
		min-width: 0;
	}
	@media (max-width: 760px) {
		.header-inner {
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 8px 12px;
			padding-block: 12px;
		}
		.brand {
			grid-area: 1 / 1;
		}
		.account {
			grid-area: 1 / 2;
		}
		.main-nav {
			grid-area: 2 / 1;
			margin: 0;
			gap: 0;
		}
		.main-nav a {
			padding-inline: 8px;
		}
		.theme {
			grid-area: 2 / 2;
			justify-self: end;
		}
	}
</style>
