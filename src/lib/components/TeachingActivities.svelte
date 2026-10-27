<script>
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	const browser = typeof window !== 'undefined';
	import { lab, teacherRequest, randomId } from '#lib/lab.js';
	import TeacherShell from '#lib/components/TeacherShell.svelte';
	import { learningLink, hasTeacherRole } from '#lib/learning.js';
	import { timedChallenges } from '#lib/timedChallenges.js';
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
			if ($lab.user?.id !== userId || !hasTeacherRole($lab.user?.role)) return;
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
		const userId = hasTeacherRole($lab.user?.role) ? $lab.user.id : '';
		if (loadedFor === userId) return;
		loadedFor = userId;
		view = null;
		error = '';
		message = '';
		if (userId) void load();
	});
	onMount(() => {
		const poll = setInterval(() => {
			if (hasTeacherRole($lab.user?.role) && !busy && document.visibilityState === 'visible')
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

<TeacherShell
	title="Felles aktiviteter"
	intro="Prøv innhold uten å bruke ordinære forsøk, eller åpne en aktivitet for hele klassen."
>
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
					>{#each activities as item}<option value={item.id}>{item.title}</option>{/each}</select
				><label for="opening-mode">Type åpning</label><select id="opening-mode" bind:value={mode}
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
					><option value={30}>30 minutter</option><option value={60}>60 minutter</option></select
				>
				<p class="small">
					En ny åpning erstatter den forrige for denne aktiviteten. Påbegynte forsøk får fullføre.
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
								{item.mode === 'practice' ? 'Åpen øving uten XP' : 'Ett ekstra undervisningsforsøk'} ·
								til {time(item.closesAt)}
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
				Åpningene vises på forsiden og ved den aktuelle aktiviteten. De stenger automatisk når tiden
				er ute.
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
</TeacherShell>

<style>
	a {
		color: var(--color-accent);
	}

	h3 {
		font-size: var(--font-small);
		margin: 3px 0 0;
	}
	.control-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		margin-bottom: 24px;
	}

	.panel p {
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	label {
		display: block;
		margin: 16px 0 6px;
		font-size: var(--font-small);
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

	.small,
	.panel .small {
		font-size: var(--font-small);
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
		font-size: var(--font-small);
	}
	.opening-list article > div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		font-size: var(--font-small);
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
		font-size: var(--font-small);
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
		font-size: var(--font-small);
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
		.row-actions {
			width: 100%;
			justify-content: space-between;
		}
	}
</style>
