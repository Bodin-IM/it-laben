<script>
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	const browser = typeof window !== 'undefined';
	import { lab, teacherRequest, randomId, refreshLab } from '#lib/lab.js';
	import { learningLink } from '#lib/learning.js';
	import { timedChallenges } from '#lib/timedChallenges.js';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	/** @type {import('#lib/learning.js').TeacherView|null} */
	let view = $state(null);
	let loadedFor = $state('');
	let activityId = $state(browser ? (page.url.searchParams.get('aktivitet') ?? '') : '');
	let mode = $state('practice');
	let minutes = $state(30);
	let withoutTime = $state(false);
	let search = $state('');
	let busy = $state(false);
	let message = $state('');
	let error = $state('');
	let retryId = '';
	let retryForm = '';
	const activities = $derived.by(() => view?.activities ?? []);
	const visible = $derived(
		activities.filter((item) =>
			item.title.toLocaleLowerCase('nb-NO').includes(search.toLocaleLowerCase('nb-NO'))
		)
	);
	const openings = $derived.by(
		() =>
			view?.openings.filter(
				(item) => item.closedAt === null && item.closesAt > (view?.serverNow ?? 0)
			) ?? []
	);
	async function load() {
		const userId = $lab.user?.id;
		try {
			const result = await teacherRequest();
			if ($lab.user?.id !== userId || $lab.user?.role !== 'teacher') return;
			view = result;
			error = '';
			if (!result.activities.some((item) => item.id === activityId))
				activityId = result.activities[0]?.id ?? '';
		} catch (problem) {
			if ($lab.user?.id === userId)
				error = problem instanceof Error ? problem.message : 'Kunne ikke hente lærerpanel.';
		}
	}
	$effect(() => {
		const userId = $lab.user?.role === 'teacher' ? $lab.user.id : '';
		if (loadedFor === userId) return;
		loadedFor = userId;
		view = null;
		error = '';
		message = '';
		if (userId) void load();
	});
	onMount(() => {
		const poll = setInterval(() => {
			if ($lab.user?.role === 'teacher' && !busy && document.visibilityState === 'visible')
				void load();
		}, 30000);
		return () => clearInterval(poll);
	});
	async function openForAll() {
		const userId = $lab.user?.id;
		if (busy || !userId) return;
		busy = true;
		error = '';
		message = '';
		const form = JSON.stringify([activityId, mode, minutes]);
		if (!retryId || form !== retryForm) {
			retryId = randomId();
			retryForm = form;
		}
		try {
			const result = await teacherRequest('/openings', {
				id: retryId,
				activityId,
				mode,
				minutes: Number(minutes)
			});
			if ($lab.user?.id !== userId) return;
			view = result;
			retryId = '';
			message = `${activities.find((item) => item.id === activityId)?.title ?? 'Aktiviteten'} er åpnet for alle i ${minutes} minutter.`;
		} catch (problem) {
			if ($lab.user?.id === userId)
				error = problem instanceof Error ? problem.message : 'Kunne ikke åpne aktiviteten.';
		} finally {
			if ($lab.user?.id === userId) busy = false;
		}
	}
	/** @param {string} id */
	async function close(id) {
		const userId = $lab.user?.id;
		if (busy) return;
		busy = true;
		error = '';
		message = '';
		try {
			const result = await teacherRequest(`/openings/${encodeURIComponent(id)}/close`, {});
			if ($lab.user?.id === userId) {
				view = result;
				message = 'Åpningen er stengt for nye forsøk. Påbegynte forsøk kan fullføres.';
			}
		} catch (problem) {
			if ($lab.user?.id === userId)
				error = problem instanceof Error ? problem.message : 'Kunne ikke stenge åpningen.';
		} finally {
			if ($lab.user?.id === userId) busy = false;
		}
	}
	/** @param {number} timestamp */
	function time(timestamp) {
		return new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit' }).format(
			timestamp
		);
	}
</script>

<svelte:head
	><title>Lærerpanel | IT-laben</title><meta name="robots" content="noindex" /></svelte:head
>
<div class="teacher-page">
	<header>
		<a class="brand" href="/">IT-laben.</a>
		<nav><a href="/min-lab/">Min lab →</a><ThemeToggle /></nav>
	</header>
	<main>
		<p class="eyebrow">UNDERVISNING OG UTPRØVING</p>
		<h1>Lærerpanel<span>.</span></h1>
		{#if !$lab.ready}<p role="status">Henter profilen din …</p>
		{:else if $lab.user?.role !== 'teacher'}<section class="panel">
				<h2>Aktiver lærertilgang på profilen din</h2>
				<p>
					Lærertilgang gis én gang fra serveren. Deretter bruker du samme profil og nøkkelfil som
					før.
				</p>
				{#if $lab.user}<p>Din profil-ID:</p>
					<code class="profile-id">{$lab.user.id}</code><button
						type="button"
						onclick={() => refreshLab()}>Oppdater tilgangen min</button
					>{:else}<a href="/min-lab/">Logg inn i Min lab →</a>{/if}
			</section>
		{:else}
			<p class="intro">
				Prøv innhold uten å bruke ordinære forsøk, eller åpne en aktivitet for hele klassen.
			</p>
			{#if error}<p class="notice error" role="alert">{error}</p>{/if}
			{#if message}<p class="notice" role="status">{message}</p>{/if}
			<div class="control-grid">
				<section class="panel" aria-labelledby="open-title">
					<p class="eyebrow">ÅPNE FOR ALLE</p>
					<h2 id="open-title">En felles aktivitet, akkurat nå.</h2>
					<form
						onsubmit={(event) => {
							event.preventDefault();
							void openForAll();
						}}
					>
						<label for="teacher-activity">Aktivitet</label><select
							id="teacher-activity"
							bind:value={activityId}
							>{#each activities as item}<option value={item.id}>{item.title}</option
								>{/each}</select
						><label for="opening-mode">Type åpning</label><select
							id="opening-mode"
							bind:value={mode}
							><option value="practice">Åpen øving · uten XP</option><option value="teaching"
								>Undervisningsforsøk · vanlig XP ved bestått</option
							></select
						>
						<p class="explanation">
							{mode === 'practice'
								? 'Alle innloggede elever kan øve fritt uten forkunnskapskrav, XP eller bruk av ordinære forsøk.'
								: 'Alle innloggede elever får ett ekstra forsøk uten forkunnskapskrav. Vanlig XP gis ved bestått, én gang per mål.'}
						</p>
						<label for="opening-duration">Varighet</label><select
							id="opening-duration"
							bind:value={minutes}
							><option value={30}>30 minutter</option><option value={60}>60 minutter</option
							></select
						>
						<p class="small">
							En ny åpning erstatter den forrige for denne aktiviteten. Påbegynte forsøk får
							fullføre.
						</p>
						<button type="submit" disabled={busy || !activityId}
							>{busy ? 'Lagrer …' : `Åpne for alle i ${minutes} min →`}</button
						>
					</form>
				</section>
				<section class="panel" aria-labelledby="active-title">
					<p class="eyebrow">FELLES ÅPNINGER</p>
					<h2 id="active-title">Åpent nå</h2>
					{#if !view}<p role="status">Henter åpninger …</p>{:else if !openings.length}<p>
							Ingen aktiviteter er åpnet for alle akkurat nå.
						</p>{:else}<div class="opening-list">
							{#each openings as item (item.id)}{@const content = activities.find(
									(value) => value.id === item.activityId
								)}
								<article>
									<strong>{content?.title ?? item.activityId}</strong>
									<p>
										{item.mode === 'practice'
											? 'Åpen øving uten XP'
											: 'Ett ekstra undervisningsforsøk'} · til {time(item.closesAt)}
									</p>
									<div>
										<a href={learningLink(content?.href ?? '/', item.mode, item.id)}
											>Åpne aktiviteten →</a
										><button
											class="secondary"
											type="button"
											disabled={busy}
											onclick={() => close(item.id)}>Steng åpningen</button
										>
									</div>
								</article>{/each}
						</div>{/if}<button type="button" class="secondary" disabled={busy} onclick={load}
						>Oppdater listen</button
					>
					<p class="small">
						Åpningene vises på forsiden og ved den aktuelle aktiviteten. De stenger automatisk når
						tiden er ute.
					</p>
				</section>
			</div>
			<section class="panel activities" aria-labelledby="test-title">
				<div class="section-top">
					<div>
						<p class="eyebrow">TEST SELV</p>
						<h2 id="test-title">Utforsk hele laben.</h2>
						<p>
							Du får egen øvingsprogresjon uten XP, merker eller døgnsgrense. Alle spilloppdrag er
							tilgjengelige.
						</p>
					</div>
					<label class="untimed"
						><input type="checkbox" bind:checked={withoutTime} />Test Nattevakten uten tidsfrist</label
					>
				</div>
				<label for="teacher-search">Finn aktivitet</label><input
					id="teacher-search"
					type="search"
					bind:value={search}
					placeholder="Søk etter en leksjon eller et spill …"
				/>
				<div class="activity-list">
					{#each visible as item}<article>
							<div>
								<span class="small"
									>{item.subject === 'drift' ? 'Driftsstøtte' : 'Utvikling'} · {item.format}</span
								>
								<h3>{item.title}</h3>
							</div>
							<div class="row-actions">
								<a href={item.href}>Vanlig aktivitet</a><a
									class="button-link"
									href={learningLink(
										item.href,
										'practice',
										null,
										withoutTime && timedChallenges.some((timed) => timed.id === item.id)
									)}>Test selv →</a
								>
							</div>
						</article>{/each}
				</div>
			</section>
		{/if}
	</main>
</div>

<style>
	.teacher-page {
		min-height: 100vh;
		background: var(--color-page);
		color: var(--color-text);
		font:
			15px/1.6 system-ui,
			sans-serif;
		padding: 0 24px 48px;
		overflow-wrap: anywhere;
	}
	header,
	main {
		max-width: 1120px;
		margin: auto;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 18px;
		flex-wrap: wrap;
		padding: 24px 0;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 36px;
	}
	.brand {
		font-weight: 800;
		font-size: 21px;
		text-decoration: none;
	}
	nav {
		display: flex;
		align-items: center;
		gap: 20px;
		flex-wrap: wrap;
	}
	a {
		color: var(--color-accent);
	}
	.eyebrow {
		font-size: 10px;
		letter-spacing: 1.8px;
		font-weight: 750;
		color: var(--color-accent);
		margin: 0 0 8px;
	}
	h1 {
		font-size: clamp(2.4rem, 6vw, 4.3rem);
		letter-spacing: -2px;
		margin: 0 0 10px;
		line-height: 1.1;
	}
	h1 > span {
		color: var(--color-accent);
	}
	.intro {
		color: var(--color-text-muted);
		margin: 12px 0 30px;
	}
	h2 {
		font-size: 22px;
		letter-spacing: -0.5px;
		line-height: 1.4;
		margin: 0 0 14px;
	}
	h3 {
		font-size: 15px;
		margin: 3px 0 0;
	}
	.control-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		margin-bottom: 24px;
	}
	.panel {
		padding: 26px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		min-width: 0;
	}
	.panel p {
		color: var(--color-text-muted);
		font-size: 14px;
	}
	label {
		display: block;
		margin: 16px 0 6px;
		font-size: 13px;
		font-weight: 600;
	}
	input:not([type='checkbox']),
	select {
		box-sizing: border-box;
		width: 100%;
		min-height: 44px;
		padding: 10px 12px;
		border: 1px solid var(--color-border-strong);
		border-radius: 6px;
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
		max-width: 100%;
	}
	button,
	.button-link {
		min-height: 44px;
		padding: 10px 15px;
		box-sizing: border-box;
		border: 1px solid var(--color-action);
		border-radius: 6px;
		background: var(--color-action);
		color: var(--color-on-action);
		cursor: pointer;
		font:
			650 13px/1.5 system-ui,
			sans-serif;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		text-decoration: none;
		max-width: 100%;
	}
	button:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.secondary {
		background: var(--color-surface-soft);
		border-color: var(--color-border-strong);
		color: var(--color-text);
	}
	.small,
	.panel .small {
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.explanation {
		background: var(--color-accent-soft);
		border-radius: 6px;
		padding: 12px;
	}
	.opening-list article {
		padding: 14px 0 20px;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 15px;
	}
	.opening-list article p {
		margin: 6px 0 12px;
		font-size: 12px;
	}
	.opening-list article > div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		font-size: 12px;
	}
	.section-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		flex-wrap: wrap;
	}
	.section-top > div {
		flex: 1 1 300px;
	}
	.untimed {
		display: flex;
		align-items: center;
		gap: 9px;
		margin: 0;
		font-size: 12px;
	}
	.untimed input {
		accent-color: var(--color-accent);
	}
	.activity-list {
		margin-top: 22px;
	}
	.activity-list article {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		flex-wrap: wrap;
		padding: 17px 0;
		border-top: 1px solid var(--color-border);
	}
	.row-actions {
		display: flex;
		align-items: center;
		gap: 18px;
		flex-wrap: wrap;
		font-size: 12px;
	}
	.notice {
		padding: 14px 18px;
		border: 1px solid var(--color-success-border);
		background: var(--color-success-soft);
		border-radius: 8px;
		color: var(--color-success);
		margin: 20px 0;
	}
	.notice.error {
		background: var(--color-warning-soft);
		border-color: var(--color-border-strong);
		color: var(--color-warning);
	}
	.profile-id {
		display: block;
		margin: 12px 0 22px;
		overflow-wrap: anywhere;
		font-size: 13px;
	}
	button:focus-visible,
	a:focus-visible,
	input:focus-visible,
	select:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	@media (max-width: 760px) {
		.control-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 480px) {
		.teacher-page {
			padding: 0 16px 30px;
		}
		.panel {
			padding: 20px;
		}
		.row-actions {
			width: 100%;
			justify-content: space-between;
		}
	}
</style>
