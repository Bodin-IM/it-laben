<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { lab, schoolRequest } from '#lib/lab.js';
	import { hasTeacherRole } from '#lib/learning.js';
	import { fag } from '#lib/innhold.js';
	import TeacherShell from '#lib/components/TeacherShell.svelte';
	/** @type {import('#lib/school.js').Overview|null} */
	let overview = $state(null);
	let owner = $state('');
	let error = $state('');
	let subject = $state('alle');
	let loading = $state(false);
	let revision = 0;
	const activities = $derived.by(() =>
		(overview?.activities ?? []).filter((item) => subject === 'alle' || item.subject === subject)
	);
	async function load() {
		const userId = $lab.user?.id,
			request = ++revision;
		loading = true;
		try {
			const result = await schoolRequest('/teacher/overview');
			if ($lab.user?.id !== userId || request !== revision || !hasTeacherRole($lab.user?.role))
				return;
			overview = result;
			error = '';
		} catch (problem) {
			if (request === revision)
				error = problem instanceof Error ? problem.message : 'Kunne ikke hente oversikten.';
		} finally {
			if (request === revision) loading = false;
		}
	}
	$effect(() => {
		const key = hasTeacherRole($lab.user?.role) ? `${$lab.user?.id}:${$lab.user?.role}` : '';
		if (owner === key) return;
		owner = key;
		overview = null;
		error = '';
		revision++;
		if (key) void load();
	});
	onMount(() => {
		const activity = new URL(window.location.href).searchParams.get('aktivitet');
		if (activity)
			void goto(`/laerer/aktiviteter/?aktivitet=${encodeURIComponent(activity)}`, {
				replaceState: true
			});
		const poll = setInterval(() => {
			if (hasTeacherRole($lab.user?.role) && !loading && document.visibilityState === 'visible')
				void load();
		}, 30000);
		return () => clearInterval(poll);
	});
</script>

<TeacherShell title="Oversikt" intro="Følg læringen, finn elevene og velg neste felles aktivitet.">
	{#if error}<p class="notice error" role="alert">{error}</p>{/if}
	{#if !overview}<p role="status">
			{loading ? 'Henter læringsoversikten …' : 'Oversikten er ikke tilgjengelig.'}
		</p>
		<button type="button" disabled={loading} onclick={load}>Prøv igjen</button>
	{:else}
		<div class="metrics">
			<a class="metric" href="/laerer/elever/"
				><span>Aktive elevprofiler</span><strong>{overview.enabled}</strong><small
					>{overview.disabled} deaktivert · {overview.students} totalt</small
				></a
			>
			<div class="metric">
				<span>Jobbet siste 7 dager</span><strong>{overview.activeWeek}</strong><small
					>Basert på faglige handlinger</small
				>
			</div>
			<div class="metric">
				<span>Fullførte aktiviteter</span><strong>{overview.completed}</strong><small
					>Gjennomgåtte leksjoner og beståtte spill</small
				>
			</div>
			<div class="metric">
				<span>Beståtte fagsjekker</span><strong>{overview.checksCompleted}</strong><small
					>Ordinær progresjon, inkludert undervisningsforsøk</small
				>
			</div>
		</div>
		<div class="quick-links">
			<a class="button-link" href="/laerer/undervisning/">Start undervisning →</a><a
				class="button-link secondary"
				href="/laerer/elever/">Se elevene →</a
			><a class="button-link secondary" href="/laerer/aktiviteter/">Åpne en felles aktivitet →</a
			><button class="secondary" type="button" disabled={loading} onclick={load}
				>Oppdater oversikten</button
			>
		</div>
		<section class="panel">
			<div class="section-heading">
				<div>
					<p class="eyebrow">HVOR ER ELEVENE?</p>
					<h2>Læring per aktivitet</h2>
				</div>
				<div>
					<label for="overview-subject">Fag</label><select
						id="overview-subject"
						bind:value={subject}
						><option value="alle">Alle fag</option>{#each fag as item}<option value={item.id}
								>{item.navn}</option
							>{/each}</select
					>
				</div>
			</div>
			<p class="small">
				Gjennomgått viser at eleven har jobbet gjennom leksjonen. Beståtte fagsjekker vises separat.
				Lærerprofiler, deaktiverte elever og øvingsresultater inngår ikke i progresjonstallene.
			</p>
			{#if !activities.length}<p>Ingen publiserte aktiviteter i dette faget ennå.</p>{:else}<div
					class="table-scroll"
				>
					<table>
						<caption class="sr-only">Elevenes ordinære progresjon per aktivitet</caption><thead
							><tr
								><th>Aktivitet</th><th>Påbegynt eller ferdig</th><th>Gjennomgått / bestått</th><th
									>Beståtte fagsjekker</th
								></tr
							></thead
						><tbody
							>{#each activities as item}<tr
									><td
										><a href={item.href}>{item.title}</a><small class="activity-kind"
											>{item.format === 'spill' ? 'Spill' : 'Leksjon'}</small
										></td
									><td>{item.started}</td><td>{item.completed}</td><td>{item.checksCompleted}</td
									></tr
								>{/each}</tbody
						>
					</table>
				</div>{/if}
		</section>
	{/if}
</TeacherShell>

<style>
	.metrics {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 14px;
		margin: 26px 0 20px;
	}
	.metric {
		padding: 22px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		text-decoration: none;
		color: var(--color-text);
	}
	.metric span {
		font-size: 14px;
		font-weight: 650;
		color: var(--color-text-muted);
	}
	.metric strong {
		font-size: 42px;
		line-height: 1.2;
		letter-spacing: -0.05em;
		color: var(--color-accent);
	}
	.metric small {
		color: var(--color-text-muted);
		line-height: 1.5;
	}
	.quick-links,
	.section-heading {
		display: flex;
		gap: 12px;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 20px;
	}
	.quick-links {
		justify-content: flex-start;
	}
	.activity-kind {
		display: block;
		color: var(--color-text-muted);
		margin-top: 4px;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	@media (max-width: 900px) {
		.metrics {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 430px) {
		.metric {
			padding: 16px 12px;
		}
		.metric strong {
			font-size: 34px;
		}
	}
</style>
