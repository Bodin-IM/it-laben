<script>
	import { tick } from 'svelte';
	import { setLabPreferences } from '#lib/labPreferences.js';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import AccountLink from '#lib/components/AccountLink.svelte';
	import { lab } from '#lib/lab.js';
	import { hasTeacherRole } from '#lib/learning.js';
	import { partnerAllowed } from '#lib/partnerPages.js';
	import { fag } from '#lib/innhold.js';

	let menuOpen = $state(false);
	/** @type {HTMLButtonElement|undefined} */
	let menuButton;
	/** @type {HTMLDetailsElement|undefined} */
	let subjectsMenu;
	/** @type {HTMLElement|undefined} */
	let header;
	const teacherPage = $derived(page.url.pathname.startsWith('/laerer/'));

	async function openPartner() {
		closeMenus();
		setLabPreferences({ companion: true });
		await tick();
		menuButton?.focus({ preventScroll: true });
		window.dispatchEvent(new Event('labpartner-open'));
	}
	function closeMenus() {
		menuOpen = false;
		if (subjectsMenu) subjectsMenu.open = false;
	}
	afterNavigate(closeMenus);

	function escapeMenu(/** @type {KeyboardEvent} */ event) {
		if (event.key !== 'Escape') return;
		if (subjectsMenu?.open) {
			subjectsMenu.open = false;
			subjectsMenu.querySelector('summary')?.focus();
		} else if (menuOpen) {
			menuOpen = false;
			menuButton?.focus();
		}
	}
	function outsideClick(/** @type {MouseEvent} */ event) {
		if (event.target instanceof Node && !header?.contains(event.target)) closeMenus();
	}
	function leaveSubjects(/** @type {FocusEvent} */ event) {
		if (event.relatedTarget instanceof Node && !subjectsMenu?.contains(event.relatedTarget)) {
			if (subjectsMenu) subjectsMenu.open = false;
		}
	}
</script>

<svelte:window onkeydown={escapeMenu} onclick={outsideClick} />

<header class="lab-header" bind:this={header}>
	<div class="header-inner">
		<a class="brand" href="/" aria-label="IT-laben – forside">
			<span class="brand-mark" aria-hidden="true">IT</span><span
				>IT-laben<span class="brand-dot">.</span></span
			>
		</a>
		<button
			class="menu-toggle"
			type="button"
			bind:this={menuButton}
			aria-expanded={menuOpen}
			aria-controls="site-navigation"
			onclick={() => (menuOpen = !menuOpen)}
		>
			<span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
			{menuOpen ? 'Lukk meny' : 'Meny'}
		</button>
		<nav id="site-navigation" class="main-nav" class:open={menuOpen} aria-label="Hovedmeny">
			<a href="/" aria-current={page.url.pathname === '/' ? 'page' : undefined}>Fagoversikt</a>
			<details class="subjects" bind:this={subjectsMenu} onfocusout={leaveSubjects}>
				<summary>Velg fag <span aria-hidden="true">⌄</span></summary>
				<div class="subject-links">
					{#each fag as subject (subject.id)}
						<a href={`/?fag=${subject.id}`}
							><strong>{subject.navn}</strong><span>{subject.beskrivelse}</span></a
						>
					{/each}
				</div>
			</details>
			<a href="/toppliste/" aria-current={page.url.pathname === '/toppliste/' ? 'page' : undefined}
				>Toppliste</a
			>
			{#if hasTeacherRole($lab.user?.role)}
				<a
					href="/laerer/"
					aria-current={teacherPage
						? page.url.pathname === '/laerer/'
							? 'page'
							: 'location'
						: undefined}>Lærerpanel</a
				>
			{/if}
			{#if partnerAllowed(page.url.pathname)}<button
					class="partner-link"
					type="button"
					onclick={openPartner}>Labpartner</button
				>{/if}
		</nav>
		<div class="account"><AccountLink /></div>
		<div class="theme"><ThemeToggle compact /></div>
	</div>
</header>

<style>
	.partner-link {
		border: 0;
		background: transparent;
		text-align: left;
	}
	.lab-header {
		position: relative;
		z-index: 30;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text);
		font-family: var(--font-ui);
	}
	.header-inner {
		width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		margin: auto;
		min-height: 84px;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 16px;
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
		min-height: 44px;
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
		flex-shrink: 0;
	}
	.brand-dot {
		color: var(--color-accent);
	}
	.main-nav {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
		align-items: center;
	}
	.partner-link,
	.main-nav > a,
	summary,
	.menu-toggle {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		padding: 8px 12px;
		border-radius: 8px;
		color: var(--color-text-muted);
		font: 600 var(--font-small)/1.4 var(--font-ui);
		text-decoration: none;
		box-sizing: border-box;
		cursor: pointer;
	}
	.partner-link:hover,
	.main-nav > a:hover,
	summary:hover {
		background: var(--color-surface-soft);
		color: var(--color-text);
	}
	.main-nav > a[aria-current],
	details[open] summary {
		color: var(--color-accent);
		background: var(--color-accent-soft);
	}
	.subjects {
		position: relative;
	}
	summary {
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.subject-links {
		position: absolute;
		left: 0;
		top: calc(100% + 8px);
		width: 280px;
		padding: 8px;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-card);
		background: var(--color-surface);
		box-shadow: 0 10px 28px var(--color-shadow);
		box-sizing: border-box;
	}
	.subject-links a {
		display: grid;
		gap: 2px;
		padding: 12px;
		border-radius: 8px;
		color: var(--color-text);
		text-decoration: none;
	}
	.subject-links a:hover {
		background: var(--color-surface-soft);
	}
	.subject-links strong {
		font-size: var(--font-small);
	}
	.subject-links span {
		font-size: var(--font-meta);
		color: var(--color-text-muted);
	}
	:is(a, button, summary):focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.account,
	.theme {
		min-width: 0;
	}
	.menu-toggle {
		display: none;
		border: 1px solid var(--color-border-strong);
		background: var(--color-surface);
		color: var(--color-text);
	}
	@media (max-width: 1000px) {
		.header-inner {
			display: flex;
			flex-wrap: wrap;
			gap: 8px 12px;
			padding-block: 12px;
		}
		.brand {
			flex: 1 0 auto;
			max-width: 100%;
		}
		.brand > span:last-child {
			min-width: 0;
			overflow-wrap: anywhere;
		}
		.account {
			order: 1;
			margin-left: auto;
		}
		.menu-toggle {
			display: inline-flex;
			order: 2;
		}
		.theme {
			order: 3;
			margin-left: auto;
		}
		.main-nav {
			display: none;
			order: 4;
			flex-basis: 100%;
			min-width: 0;
			border-top: 1px solid var(--color-border);
			padding-top: 10px;
		}
		.main-nav.open {
			display: flex;
			flex-direction: column;
			align-items: stretch;
		}
		.partner-link,
		.main-nav > a,
		summary {
			width: 100%;
		}
		.subject-links {
			position: static;
			width: 100%;
			margin-top: 6px;
			box-shadow: none;
		}
	}
</style>
