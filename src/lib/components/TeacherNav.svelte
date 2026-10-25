<script>
	import { page } from '$app/state';
	const links = [
		{ href: '/laerer/', label: 'Oversikt' },
		{ href: '/laerer/elever/', label: 'Elever' },
		{ href: '/laerer/aktiviteter/', label: 'Aktiviteter' },
		{ href: '/toppliste/', label: 'Toppliste' }
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
		margin: 22px auto 0;
		width: min(1120px, calc(100% - 40px));
		font:
			600 14px/1.4 system-ui,
			sans-serif;
	}
	a {
		padding: 10px 16px;
		border: 1px solid var(--color-border);
		border-radius: 7px;
		text-decoration: none;
		color: var(--color-text-muted);
		background: var(--color-surface);
	}
	a[aria-current='page'] {
		color: var(--color-on-action);
		background: var(--color-action);
		border-color: var(--color-action);
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
