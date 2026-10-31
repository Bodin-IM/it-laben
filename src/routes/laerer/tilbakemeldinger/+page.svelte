<script>
	import { onDestroy, tick } from 'svelte';
	import { lab, ApiError } from '#lib/lab.js';
	import { schoolDate } from '#lib/school.js';
	import { feedbackCategories } from '#lib/feedback.js';
	import { feedbackRequest } from '#lib/feedbackClient.js';
	import { feedbackPilot, feedbackAnswers } from '#lib/activityFeedback.js';
	import TeacherShell from '#lib/components/TeacherShell.svelte';
	/** @type {import('#lib/feedback.js').FeedbackList|null} */
	let listing = $state(null);
	/** @type {import('#lib/activityFeedback.js').FeedbackTotals[]} */
	let totals = $state([]);
	let activityFilter = $state('');
	/** @type {HTMLHeadingElement|undefined} */
	let commentsHeading = $state();
	let filter = $state('new'),
		currentPage = $state(1);
	let loading = $state(false),
		busy = $state(''),
		error = $state(''),
		notice = $state('');
	let revision = 0;
	/** @type {AbortController|null} */
	let controller = null;
	/** @type {HTMLParagraphElement|undefined} */
	let statusNotice = $state();
	const adminId = $derived($lab.user?.role === 'admin' ? $lab.user.id : null);
	async function load() {
		const actor = adminId;
		if (!actor) return;
		const request = ++revision;
		controller?.abort();
		controller = new AbortController();
		loading = true;
		error = '';
		try {
			const [result, summary] = await Promise.all([
				feedbackRequest(`/admin/feedback?status=${filter}&page=${currentPage}${activityFilter ? `&activity=${activityFilter}` : ''}`, undefined, controller.signal),
				feedbackRequest('/admin/feedback/activities', undefined, controller.signal)
			]);
			if (request === revision && actor === adminId) { listing = result; totals = summary.items; }
		} catch (problem) {
			if (request === revision && actor === adminId) {
				if (problem instanceof ApiError && [401, 403].includes(problem.status)) { listing = null; totals = []; }
				error = problem instanceof Error ? problem.message : 'Kunne ikke hente tilbakemeldinger.';
			}
		} finally {
			if (request === revision) loading = false;
		}
	}
	$effect(() => {
		void adminId;
		void filter;
		void currentPage;
		void activityFilter;
		revision++;
		controller?.abort();
		listing = null;
		totals = [];
		error = '';
		notice = '';
		busy = '';
		if (adminId) void load();
	});
	async function showComments(/** @type {string} */ id) {
		activityFilter = id;
		filter = 'all';
		currentPage = 1;
		await tick();
		commentsHeading?.focus();
	}
	onDestroy(() => {
		revision++;
		controller?.abort();
	});
	async function update(/** @type {import('#lib/feedback.js').FeedbackItem} */ item) {
		if (busy || !adminId) return;
		const actor = adminId;
		busy = item.id;
		error = '';
		notice = '';
		try {
			await feedbackRequest(`/admin/feedback/${item.id}/status`, {
				status: item.status === 'new' ? 'handled' : 'new'
			});
			if (actor !== adminId) return;
			notice =
				item.status === 'new'
					? 'Tilbakemeldingen er markert som behandlet.'
					: 'Tilbakemeldingen er markert som ny.';
			await load();
			await tick();
			if (actor === adminId && filter !== 'all') statusNotice?.focus({ preventScroll: true });
		} catch (problem) {
			if (actor === adminId)
				error = problem instanceof Error ? problem.message : 'Kunne ikke lagre statusen.';
		} finally {
			if (actor === adminId) busy = '';
		}
	}
</script>

<TeacherShell
	title="Tilbakemeldinger"
	adminOnly
	intro="Meldinger fra elevene om IT-laben. Siden de åpnet skjemaet fra følger med automatisk."
>
	{#if totals.length}
		<details class="survey-summary" open>
			<summary>Svar på oppgaver</summary>
			<p class="small">Elevenes opplevelse av tydelighet. Tallene viser alle svar per oppgaveversjon og er uavhengige av meldingsfilteret.</p>
			<div class="survey-grid">
				{#each totals as item (`${item.activityId}:${item.activityVersion}:${item.questionId}`)}
					<section class="survey-card" aria-label={item.title}>
						<h2>{item.title}</h2><p>{item.question}</p>
						<strong>{item.answered} svar</strong><span class="small"> · {item.invited} forespørsler</span>
						{#if item.answered}<div class="distribution" role="img" aria-label={`Ja: ${item.yes}. Delvis: ${item.partly}. Nei: ${item.no}.`}>
							<span class="yes" style:width={`${item.yes / item.answered * 100}%`}></span>
							<span class="partly" style:width={`${item.partly / item.answered * 100}%`}></span>
							<span class="no" style:width={`${item.no / item.answered * 100}%`}></span>
						</div>{/if}
						<p class="answer-counts">Ja: <strong>{item.yes}</strong> · Delvis: <strong>{item.partly}</strong> · Nei: <strong>{item.no}</strong></p>
						<p class="small">{item.dismissed} hoppet over · {item.invited - item.answered - item.dismissed} uten svar<br />Versjon {item.activityVersion}</p>
						<button class="secondary" onclick={() => showComments(item.activityId)}>Se kommentarer</button>
					</section>
				{/each}
			</div>
			<p class="small">Forespørsler er sendt til nettleseren; de er ikke nødvendigvis sett. Hoppet over eller ubesvart teller ikke som «Nei». Svarene må ses sammen med elevobservasjoner og faglig arbeid.</p>
		</details>
	{/if}
	<h2 tabindex="-1" bind:this={commentsHeading}>Meldinger og kommentarer</h2>
	<div class="toolbar">
		<div>
			<label for="feedback-filter">Vis meldinger</label><select
				id="feedback-filter"
				bind:value={filter}
				onchange={() => {
					currentPage = 1;
				}}
				disabled={!!busy}
				><option value="new">Nye</option><option value="handled">Behandlet</option><option
					value="all">Alle</option
				></select
			>
		</div>
		<div><label for="feedback-activity">Oppgavekommentarer</label>
			<select id="feedback-activity" bind:value={activityFilter} onchange={() => { currentPage = 1; }} disabled={!!busy}>
				<option value="">Alle meldinger</option>
				{#each feedbackPilot as item}<option value={item.id}>{item.title}</option>{/each}
			</select>
		</div>
		<button class="secondary" onclick={load} disabled={loading || !!busy}>Oppdater</button>
	</div>
	{#if error}<p class="notice error" role="alert">{error}</p>
		<button class="secondary" onclick={load} disabled={loading}>Prøv igjen</button>{/if}
	{#if notice}<p class="notice" role="status" tabindex="-1" bind:this={statusNotice}>
			{notice}
		</p>{/if}
	{#if loading}<p role="status">Henter tilbakemeldinger …</p>{/if}
	{#if listing}
		<p class="small">
			{listing.newCount} nye · {listing.total}
			{filter === 'all' ? 'meldinger totalt' : 'i valgt visning'}
		</p>
		{#if !listing.items.length}<section class="panel">
				<h2>
					{filter === 'new' ? 'Ingen nye tilbakemeldinger' : 'Ingen tilbakemeldinger her ennå'}
				</h2>
				<p>Elevene kan sende en melding med knappen «Tilbakemelding» nederst på elevsidene.</p>
			</section>{/if}
		{#each listing.items as item (item.id)}
			<article class="panel feedback-item" aria-labelledby={`feedback-${item.id}`}>
				<div class="item-top">
					<span class="status" class:new={item.status === 'new'}
						>{item.status === 'new' ? 'Ny' : 'Behandlet'}</span
					><time datetime={new Date(item.createdAt).toISOString()}
						>{schoolDate(item.createdAt)}</time
					>
				</div>
				<h2 id={`feedback-${item.id}`}>
					{item.question ? 'Kommentar til oppgaven' : feedbackCategories.find((category) => category.id === item.category)?.label}
				</h2>
				<p class="page-context">
					<strong>Side:</strong>
					<a href={item.pageHref === '/' ? '/?visning=elev' : item.pageHref}>{item.pageTitle} →</a
					><code>{item.pageHref}</code>
				</p>
				{#if item.question}<p><strong>{item.question}</strong> {feedbackAnswers.find((answer) => answer.id === item.answer)?.label}<br /><span class="small">Oppgaveversjon {item.activityVersion}</span></p>{/if}
				<p class="feedback-message">{item.message}</p>
				<p class="small">
					{item.nickname ? `Fra ${item.nickname}` : 'Sendt uten profilnavn'}{item.handledAt
						? ` · Behandlet ${schoolDate(item.handledAt)}`
						: ''}
				</p>
				<button class="secondary" disabled={!!busy || loading} onclick={() => update(item)}
					>{busy === item.id
						? 'Lagrer …'
						: item.status === 'new'
							? 'Marker som behandlet'
							: 'Marker som ny'}</button
				>
			</article>
		{/each}
		{#if listing.pages > 1}<nav class="pagination" aria-label="Sider med tilbakemeldinger">
				<button
					class="secondary"
					disabled={loading || !!busy || listing.page <= 1}
					onclick={() => {
						currentPage = (listing?.page ?? 1) - 1;
					}}>← Forrige</button
				><span>Side {listing.page} av {listing.pages}</span><button
					class="secondary"
					disabled={loading || !!busy || listing.page >= listing.pages}
					onclick={() => {
						currentPage = (listing?.page ?? 1) + 1;
					}}>Neste →</button
				>
			</nav>{/if}
	{/if}
</TeacherShell>

<style>
	.survey-summary { margin-bottom: 28px; }
	.survey-summary > summary { cursor: pointer; font-weight: 700; font-size: 1.2rem; min-height: 44px; align-content: center; }
	.survey-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 14px; }
	.survey-card { padding: 18px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface); }
	.survey-card h2 { font-size: 1.1rem; margin-top: 0; }
	.distribution { display: flex; height: 12px; overflow: hidden; border-radius: 4px; margin-top: 12px; background: var(--color-surface-soft); }
	.yes { background: var(--color-accent); }
	.partly { background: var(--color-warning); }
	.no { background: var(--color-danger); }
	.answer-counts { font-size: var(--font-small); }
	select { max-width: 100%; }
	.toolbar > div { min-width: 0; }
	h2:focus, summary:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	.toolbar,
	.item-top,
	.pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
		margin-bottom: 20px;
	}
	.toolbar {
		align-items: flex-end;
	}
	.feedback-item {
		max-width: 900px;
	}
	.item-top {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.status {
		padding: 4px 10px;
		border: 1px solid var(--color-border-strong);
		border-radius: 6px;
		font-weight: 650;
	}
	.status.new {
		background: var(--color-info-soft);
		color: var(--color-info);
		border-color: var(--color-info-border);
	}
	.page-context {
		padding: 12px 14px;
		background: var(--color-surface-soft);
		border-radius: 7px;
	}
	.page-context code {
		display: block;
		font-size: var(--font-small);
		margin-top: 6px;
	}
	.feedback-message {
		white-space: pre-wrap;
		font-size: var(--font-body);
		line-height: 1.6;
		margin: 20px 0;
	}
	.pagination {
		justify-content: flex-start;
	}
</style>
