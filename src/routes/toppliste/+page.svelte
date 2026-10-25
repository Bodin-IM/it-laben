<script>
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { lab, schoolRequest } from '#lib/lab.js';
	import { hasTeacherRole } from '#lib/learning.js';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import LeaderboardRow from '#lib/components/LeaderboardRow.svelte';
	import LeaderboardPreference from '#lib/components/LeaderboardPreference.svelte';
	const browser = typeof window !== 'undefined';
	/** @type {import('#lib/school.js').Leaderboard|null} */
	let board = $state(null);
	let error = $state(''),
		loadedKey = $state(''),
		loading = $state(false);
	let revision = 0;
	const number = $derived(browser ? (page.url.searchParams.get('side') ?? '1') : '1');
	async function load() {
		const request = ++revision,
			userId = $lab.user?.id;
		loading = true;
		try {
			const result = await schoolRequest(`/leaderboard?page=${encodeURIComponent(number)}`);
			if (request !== revision || userId !== $lab.user?.id) return;
			board = result;
			error = '';
		} catch (problem) {
			if (request === revision && userId === $lab.user?.id)
				error = problem instanceof Error ? problem.message : 'Kunne ikke hente topplisten.';
		} finally {
			if (request === revision) loading = false;
		}
	}
	$effect(() => {
		const key = `${$lab.user?.id ?? 'guest'}:${$lab.user?.role}:${$lab.user?.leaderboardVisible}:${number}`;
		if (key === loadedKey) return;
		loadedKey = key;
		board = null;
		error = '';
		revision++;
		void load();
	});
	onMount(() => {
		const poll = setInterval(() => {
			if (!loading && document.visibilityState === 'visible') void load();
		}, 30000);
		return () => clearInterval(poll);
	});
</script>

<svelte:head
	><title>Toppliste | IT-laben</title><meta name="robots" content="noindex" /></svelte:head
>
<div class="leaderboard-page">
	<header>
		<a class="brand" href="/">IT-laben.</a>
		<nav>
			{#if hasTeacherRole($lab.user?.role)}<a href="/laerer/">Lærerpanel →</a>{/if}<a
				href="/min-lab/">Min lab →</a
			><ThemeToggle />
		</nav>
	</header>
	<main>
		<section class="intro">
			<p class="eyebrow">SMÅ STEG. SYNLIG FREMGANG.</p>
			<h1>Læring som<br /><em>setter spor.</em></h1>
			<p>Løs oppdrag, fullfør leksjoner og se fremgangen vokse.</p>
		</section>
		{#if error}<p class="notice" role="alert">{error}</p>{/if}
		<div class="board-heading">
			<div>
				<p class="eyebrow">SAMLET XP</p>
				<h2>Topplisten</h2>
				<p class="small">
					{board ? `${board.total} deltakere` : 'Henter deltakere …'} · Lik poengsum gir delt plassering.
				</p>
			</div>
			<button type="button" disabled={loading} onclick={load}>Oppdater</button>
		</div>
		{#if board}
			{#if !board.entries.length}<section class="empty">
					<span aria-hidden="true">✦</span>
					<h3>
						{board.total === 0
							? 'De første sporene er dine å sette.'
							: 'Ingen deltakere på denne siden.'}
					</h3>
					<p>
						{board.total === 0
							? 'Fullfør aktiviteter i Min lab og la læringen synes.'
							: 'Gå tilbake til første side for å se deltakerne.'}
					</p>
					{#if board.total !== 0}<a href="/toppliste/">Til første side →</a>{/if}
				</section>
			{:else}<ol class="ranking" aria-label="Deltakere rangert etter samlet XP">
					{#each board.entries as entry}<li>
							<LeaderboardRow {entry} own={board.self?.nickname === entry.nickname} />
						</li>{/each}
				</ol>{/if}
			<nav class="pagination" aria-label="Sider i topplisten">
				{#if board.page > 1}<a href={`/toppliste/?side=${board.page - 1}`}>← Forrige</a
					>{/if}{#if board.page * board.pageSize < board.total}<a
						href={`/toppliste/?side=${board.page + 1}`}>Neste →</a
					>{/if}
			</nav>
			{#if board.self}<section class="own-position">
					<p class="eyebrow">DIN PLASSERING BLANT DELTAKERNE</p>
					<LeaderboardRow entry={board.self} own />
				</section>{/if}
		{:else}<p role="status">
				{loading ? 'Henter topplisten …' : 'Topplisten er ikke tilgjengelig.'}
			</p>{/if}
		{#if !$lab.user || $lab.user.role === 'student'}<section class="participation">
				<LeaderboardPreference showLink={false} />
			</section>{/if}
	</main>
</div>

<style>
	.leaderboard-page {
		min-height: 100vh;
		font-family: Inter, system-ui, sans-serif;
		color: var(--color-text);
		background: radial-gradient(ellipse at 85% 0%, var(--color-page-glow), transparent 50%);
	}
	.leaderboard-page,
	.leaderboard-page * {
		box-sizing: border-box;
	}
	header,
	main {
		width: min(960px, calc(100% - 40px));
		margin-inline: auto;
	}
	header {
		min-height: 80px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
		padding-block: 14px;
		border-bottom: 1px solid var(--color-border);
	}
	nav {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 18px;
	}
	a {
		color: var(--color-accent);
	}
	.brand {
		color: var(--color-text);
		font-size: 21px;
		font-weight: 800;
		text-decoration: none;
	}
	header nav > a {
		font-size: var(--font-small);
		text-decoration: none;
	}
	main {
		padding-bottom: 64px;
	}
	.intro {
		padding: 50px 0 34px;
		max-width: 680px;
	}
	.eyebrow {
		font-size: var(--font-meta);
		letter-spacing: 0.12em;
		font-weight: 750;
		color: var(--color-accent);
		margin: 0 0 10px;
	}
	h1 {
		font-size: clamp(2.8rem, 7vw, 4.8rem);
		line-height: 1.05;
		letter-spacing: -0.06em;
		margin: 0 0 22px;
	}
	h1 em {
		color: var(--color-accent);
		font-style: normal;
	}
	.intro > p:last-child {
		color: var(--color-text-muted);
		line-height: 1.7;
	}
	.board-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		margin: 8px 0 20px;
	}
	h2 {
		font-size: 28px;
		margin: 0;
		letter-spacing: -0.04em;
	}
	.small {
		font-size: var(--font-small);
		color: var(--color-text-muted);
		line-height: 1.6;
	}
	button {
		min-height: 44px;
		padding: 10px 16px;
		border: 1px solid var(--color-border-strong);
		border-radius: 6px;
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
		font:
			650 14px/1.4 system-ui,
			sans-serif;
	}
	button:disabled {
		opacity: 0.55;
		cursor: default;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.ranking {
		display: grid;
		gap: 10px;
		padding: 0;
		margin: 0;
		list-style: none;
	}
	.empty {
		padding: 40px 24px;
		text-align: center;
		border: 1px dashed var(--color-border-strong);
		border-radius: 10px;
	}
	.empty > span {
		color: var(--color-accent);
		font-size: 36px;
	}
	.empty p {
		color: var(--color-text-muted);
	}
	.pagination {
		display: flex;
		justify-content: space-between;
		margin: 20px 0;
	}
	.own-position {
		margin-top: 32px;
	}
	.participation {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 24px;
		margin-top: 30px;
	}
	.notice {
		color: var(--color-danger);
		border: 1px solid var(--color-danger-border);
		background: var(--color-danger-soft);
		padding: 15px;
		border-radius: 8px;
	}
</style>
