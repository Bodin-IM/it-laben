<script>
	import { onDestroy, tick } from 'svelte';
	import { lab, ApiError } from '#lib/lab.js';
	import { schoolDate } from '#lib/school.js';
	import { feedbackCategories } from '#lib/feedback.js';
	import { feedbackRequest } from '#lib/feedbackClient.js';
	import TeacherShell from '#lib/components/TeacherShell.svelte';
	/** @type {import('#lib/feedback.js').FeedbackList|null} */
	let listing = $state(null);
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
			const result = await feedbackRequest(
				`/admin/feedback?status=${filter}&page=${currentPage}`,
				undefined,
				controller.signal
			);
			if (request === revision && actor === adminId) listing = result;
		} catch (problem) {
			if (request === revision && actor === adminId) {
				if (problem instanceof ApiError && [401, 403].includes(problem.status)) listing = null;
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
		revision++;
		controller?.abort();
		listing = null;
		error = '';
		notice = '';
		busy = '';
		if (adminId) void load();
	});
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
					{feedbackCategories.find((category) => category.id === item.category)?.label}
				</h2>
				<p class="page-context">
					<strong>Side:</strong>
					<a href={item.pageHref === '/' ? '/?visning=elev' : item.pageHref}>{item.pageTitle} →</a
					><code>{item.pageHref}</code>
				</p>
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
