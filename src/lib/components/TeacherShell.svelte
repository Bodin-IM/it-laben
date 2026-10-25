<script>
	import { lab, refreshLab } from '#lib/lab.js';
	import { hasTeacherRole } from '#lib/learning.js';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import TeacherNav from '#lib/components/TeacherNav.svelte';
	/** @type {{title:string,intro?:string,children:import('svelte').Snippet}} */
	let { title, intro = '', children } = $props();
</script>

<svelte:head
	><title>{title} | Lærerpanel · IT-laben</title><meta
		name="robots"
		content="noindex"
	/></svelte:head
>
<div class="teacher-shell">
	<header>
		<a class="brand" href="/">IT-laben.</a>
		<div><a href="/min-lab/">Min lab →</a><ThemeToggle /></div>
	</header>
	{#if hasTeacherRole($lab.user?.role)}<TeacherNav />{/if}
	<main>
		<p class="eyebrow">LÆRERPANEL</p>
		<h1>{title}<span>.</span></h1>
		{#if !$lab.ready}<p role="status">Henter profilen din …</p>
		{:else if !hasTeacherRole($lab.user?.role)}
			<section class="panel">
				<h2>Aktiver lærertilgang på profilen din</h2>
				<p>
					Lærertilgang gis én gang fra serveren. Deretter bruker du samme profil og nøkkelfil som
					før.
				</p>
				{#if $lab.user}<p>Din profil-ID:</p>
					<code>{$lab.user.id}</code>
					<p><button type="button" onclick={() => refreshLab()}>Oppdater tilgangen min</button></p>
				{:else}<a href="/min-lab/">Logg inn i Min lab →</a>{/if}
			</section>
		{:else}
			{#if intro}<p class="intro">{intro}</p>{/if}
			{@render children()}
		{/if}
	</main>
</div>

<style>
	.teacher-shell {
		min-height: 100vh;
		background: radial-gradient(ellipse at 85% 0%, var(--color-page-glow), transparent 50%);
		font-family: Inter, system-ui, sans-serif;
		color: var(--color-text);
	}
	.teacher-shell :global(*) {
		box-sizing: border-box;
	}
	header,
	main {
		width: min(1120px, calc(100% - 40px));
		margin-inline: auto;
	}
	header {
		min-height: 80px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		border-bottom: 1px solid var(--color-border);
		padding-block: 14px;
	}
	header > div {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 16px;
	}
	.brand {
		color: var(--color-text);
		font-size: 21px;
		font-weight: 800;
		text-decoration: none;
	}
	main {
		padding: 30px 0 70px;
	}
	h1 {
		font-size: clamp(2rem, 5vw, 3.4rem);
		line-height: 1.12;
		letter-spacing: -0.045em;
		margin: 0 0 14px;
	}
	h1 span {
		color: var(--color-accent);
	}
	.intro {
		max-width: 760px;
		color: var(--color-text-muted);
		margin-bottom: 26px;
	}
	.teacher-shell :global(main a),
	header > div > a {
		color: var(--color-accent);
	}
	.teacher-shell :global(.eyebrow) {
		font-size: var(--font-meta);
		font-weight: 750;
		color: var(--color-accent);
		letter-spacing: 0.12em;
		margin: 0 0 8px;
	}
	.teacher-shell :global(.panel) {
		padding: 24px;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		background: var(--color-surface);
		margin-bottom: 20px;
		min-width: 0;
	}
	.teacher-shell :global(h2) {
		margin: 0 0 12px;
		letter-spacing: -0.025em;
		line-height: 1.25;
	}
	.teacher-shell :global(.small) {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.teacher-shell :global(.notice) {
		padding: 14px 18px;
		background: var(--color-accent-soft);
		border: 1px solid var(--color-border-strong);
		border-radius: 7px;
		overflow-wrap: anywhere;
	}
	.teacher-shell :global(.error) {
		background: var(--color-danger-soft);
		color: var(--color-danger);
		border-color: var(--color-danger-border);
	}
	.teacher-shell :global(main button),
	.teacher-shell :global(.button-link) {
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 11px 16px;
		min-height: 44px;
		font:
			650 14px/1.4 system-ui,
			sans-serif;
		border: 1px solid var(--color-action);
		border-radius: 6px;
		background: var(--color-action);
		color: var(--color-on-action);
		text-decoration: none;
	}
	.teacher-shell :global(main button:disabled) {
		cursor: default;
		opacity: 0.55;
	}
	.teacher-shell :global(main button.secondary),
	.teacher-shell :global(.button-link.secondary) {
		background: var(--color-surface);
		border-color: var(--color-border-strong);
		color: var(--color-text);
	}
	.teacher-shell :global(main button.danger) {
		background: var(--color-danger);
		border-color: var(--color-danger);
		color: var(--color-surface);
	}
	.teacher-shell :global(input),
	.teacher-shell :global(select) {
		min-height: 44px;
		border: 1px solid var(--color-border-strong);
		border-radius: 6px;
		padding: 10px 12px;
		color: var(--color-text);
		background: var(--color-surface);
		font: inherit;
		max-width: 100%;
	}
	.teacher-shell :global(label) {
		display: block;
		font-weight: 650;
		font-size: var(--font-small);
		margin-bottom: 6px;
	}
	.teacher-shell :global(:focus-visible) {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.teacher-shell :global(.table-scroll) {
		overflow-x: auto;
	}
	.teacher-shell :global(table) {
		border-collapse: collapse;
		width: 100%;
		font-size: var(--font-small);
		text-align: left;
	}
	.teacher-shell :global(th) {
		padding: 12px 14px;
		font-weight: 650;
		color: var(--color-text-muted);
		background: var(--color-surface-soft);
		white-space: nowrap;
	}
	.teacher-shell :global(td) {
		padding: 15px 14px;
		border-bottom: 1px solid var(--color-border);
	}
	.teacher-shell :global(code) {
		overflow-wrap: anywhere;
	}
	@media (max-width: 500px) {
		.teacher-shell :global(.panel) {
			padding: 18px 14px;
		}
	}
</style>
