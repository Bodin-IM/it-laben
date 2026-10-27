<script>
	import { page } from '$app/state';
	const links = [
		{ href: '/laerer/', label: 'Oversikt' },
		{ href: '/laerer/undervisning/', label: 'Undervisning' },
		{ href: '/laerer/elever/', label: 'Elever' },
		{ href: '/laerer/aktiviteter/', label: 'Aktiviteter' }
	];
</script>

<nav class="teacher-nav" aria-label="Lærerpanel">
	{#each links as item}<a
			href={item.href}
			aria-current={page.url.pathname === item.href ? 'page' : undefined}>{item.label}</a
		>{/each}
</nav>

<style>
	.teacher-nav {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin: 0 auto;
		padding-block: 22px 0;
		width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		font: 600 var(--font-small)/1.4 var(--font-ui);
	}
	a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		box-sizing: border-box;
		padding: 10px 16px;
		border: 1px solid var(--color-border);
		border-radius: 7px;
		text-decoration: none;
		color: var(--color-text-muted);
		background: var(--color-surface);
	}
	a[aria-current='page'] {
		color: var(--color-accent);
		background: var(--color-accent-soft);
		border-color: var(--color-accent);
	}
	a:hover {
		border-color: var(--color-accent);
	}
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	@media (max-width: 420px) {
		a {
			padding: 9px 11px;
		}
	}
</style>
