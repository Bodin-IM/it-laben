<script>
	import { page } from '$app/state';
	import { lab, schoolRequest } from '#lib/lab.js';
	import { hasTeacherRole } from '#lib/learning.js';
	import { aktiviteter, fag } from '#lib/innhold.js';
	import { moduler, moduleSummary } from '#lib/moduler.js';
	import { publicationFor } from '#lib/modulePublication.js';
	import { modulePublication, refreshModulePublication } from '#lib/modulePublicationStore.js';
	import { teachingPlans, presentationLessons, presentationLink } from '#lib/teaching.js';
	import TeacherShell from '#lib/components/TeacherShell.svelte';
	import ModuleStatusControl from '#lib/components/ModuleStatusControl.svelte';
	const browser = typeof window !== 'undefined';
	/** @type {import('#lib/teaching.js').TeachingLibrary|null} */
	let library = $state(null);
	let subject = $state('alle'),
		search = $state(''),
		owner = $state(''),
		error = $state(''),
		publicationError = $state('');
	let loading = $state(false),
		revision = 0;
	const planId = $derived(browser ? page.url.searchParams.get('opplegg') : null);
	const plan = $derived(teachingPlans.find((item) => item.id === planId));
	const planModule = $derived(
		moduler.find((item) =>
			item.steps.some((step) => step.kind === 'undervisning' && step.id === planId)
		)
	);
	const view = $derived(
		browser && page.url.searchParams.get('vis') === 'leksjoner'
			? 'lessons'
			: browser && page.url.searchParams.get('vis') === 'opplegg'
				? 'plans'
				: 'modules'
	);
	const guide = $derived.by(() => library?.guides.find((item) => item.planId === planId));
	const words = $derived(search.trim().toLocaleLowerCase('nb-NO').split(/\s+/).filter(Boolean));
	const modules = $derived(
		moduler.filter(
			(item) =>
				(subject === 'alle' || item.subject === subject) &&
				words.every((word) =>
					`${item.title} ${item.description} ${item.goals.join(' ')}`
						.toLocaleLowerCase('nb-NO')
						.includes(word)
				)
		)
	);
	const statusSummary = $derived([
		{
			status: 'active',
			label: 'aktive',
			singular: 'aktiv',
			count: modules.filter(
				(item) => publicationFor(item.id, $modulePublication.modules).status === 'active'
			).length
		},
		{
			status: 'completed',
			label: 'fullførte',
			singular: 'fullført',
			count: modules.filter(
				(item) => publicationFor(item.id, $modulePublication.modules).status === 'completed'
			).length
		},
		{
			status: 'upcoming',
			label: 'kommende',
			singular: 'kommende',
			count: modules.filter(
				(item) => publicationFor(item.id, $modulePublication.modules).status === 'upcoming'
			).length
		}
	]);
	const plans = $derived(
		teachingPlans.filter(
			(item) =>
				(subject === 'alle' || item.subject === subject) &&
				words.every((word) =>
					`${item.title} ${item.description} ${item.goals.join(' ')}`
						.toLocaleLowerCase('nb-NO')
						.includes(word)
				)
		)
	);
	const lessons = $derived(
		aktiviteter.filter(
			(item) =>
				item.format === 'leksjon' &&
				(subject === 'alle' || item.fag === subject) &&
				words.every((word) =>
					`${item.tittel} ${item.beskrivelse} ${item.emner.join(' ')}`
						.toLocaleLowerCase('nb-NO')
						.includes(word)
				)
		)
	);
	async function load() {
		const userId = $lab.user?.id,
			request = ++revision;
		loading = true;
		try {
			const result = await schoolRequest('/teacher/teaching');
			if (userId !== $lab.user?.id || request !== revision || !hasTeacherRole($lab.user?.role))
				return;
			library = result;
			error = '';
		} catch (problem) {
			if (request === revision && userId === $lab.user?.id)
				error = problem instanceof Error ? problem.message : 'Kunne ikke hente lærerveiledningene.';
		} finally {
			if (request === revision) loading = false;
		}
	}
	$effect(() => {
		const key = hasTeacherRole($lab.user?.role) ? `${$lab.user?.id}:${$lab.user?.role}` : '';
		if (key === owner) return;
		owner = key;
		revision++;
		library = null;
		error = '';
		if (key) void load();
	});
	async function refreshPublication() {
		publicationError = '';
		try {
			await refreshModulePublication();
		} catch (problem) {
			publicationError =
				problem instanceof Error ? problem.message : 'Kunne ikke hente modulstatusene.';
		}
	}
	function activity(/** @type {string} */ id) {
		return (
			presentationLessons.find((item) => item.id === id) ??
			aktiviteter.find((item) => item.id === id)
		);
	}
</script>

<TeacherShell
	title={plan?.title ?? 'Undervisning'}
	intro={plan
		? plan.description
		: view === 'modules'
			? 'Velg status for hver modul, og åpne modulen for innhold og undervisningsopplegg.'
			: 'Finn støtte til felles gjennomgang eller en elevleksjon å vise på storskjerm.'}
>
	{#if planId}
		<div class="return-links">
			{#if planModule}<a href={`/moduler/${planModule.id}/`}>← Til {planModule.title}</a>{/if}
			<a href="/laerer/undervisning/?vis=opplegg">Alle undervisningsopplegg</a>
		</div>
		{#if !plan}<p class="notice error" role="alert">Undervisningsopplegget finnes ikke.</p>
		{:else}
			<div class="plan-actions">
				<a
					class="button-link"
					href={presentationLink(activity(plan.lessonIds[0])?.href ?? '/', plan.id)}
					>Start gjennomgangen →</a
				><span>{plan.minutes} minutter · {fag.find((item) => item.id === plan.subject)?.navn}</span>
			</div>
			<section class="panel">
				<p class="eyebrow">MÅL FOR ØKTEN</p>
				<ul class="goals">
					{#each plan.goals as goal}<li>{goal}</li>{/each}
				</ul>
			</section>
			{#if error}<p class="notice error" role="alert">{error}</p>
				<button type="button" disabled={loading} onclick={load}>Prøv igjen</button>{/if}
			{#if !guide}<p role="status">
					{loading ? 'Henter lærerveiledningen …' : 'Lærerveiledningen er ikke tilgjengelig.'}
				</p>
			{:else}
				<section class="panel teacher-notes">
					<p class="eyebrow">FØR DU STARTER</p>
					<h2>Forberedelser</h2>
					<ul>
						{#each guide.preparation as note}<li>{note}</li>{/each}
					</ul>
				</section>
				<section class="panel">
					<p class="eyebrow">FELLES GJENNOMGANG</p>
					<h2>Rekkefølge og lærernotater</h2>
					<p class="small">
						Bruk storskjermvisningen foran klassen. Veiledningen kan være åpen i et eget vindu på
						lærerskjermen.
					</p>
					<div class="plan-steps">
						{#each guide.steps as step, index}{@const lesson = activity(step.activityId)}
							<article>
								<div class="step-title">
									<span class="number">{index + 1}</span>
									<div>
										<h3>{lesson?.tittel}</h3>
										<p>{step.minutes} minutter · {step.focus}</p>
									</div>
									<a
										class="button-link secondary"
										href={presentationLink(lesson?.href ?? '/', plan.id)}>Vis leksjon →</a
									>
								</div>
								<div class="step-notes">
									<div>
										<h4>Spør klassen</h4>
										<ul>
											{#each step.questions as question}<li>{question}</li>{/each}
										</ul>
									</div>
									<div>
										<h4>Lærernotater</h4>
										<ul>
											{#each step.notes as note}<li>{note}</li>{/each}
										</ul>
									</div>
								</div>
							</article>{/each}
					</div>
				</section>
				<section class="panel">
					<p class="eyebrow">AVRUNDING OG SELVARBEID</p>
					<h2>Etter gjennomgangen</h2>
					<ul>
						{#each guide.wrapUp as note}<li>{note}</li>{/each}
					</ul>
					<div class="self-work">
						{#each plan.selfWorkIds as id}{@const item = activity(id)}<a href={item?.href}
								>{item?.tittel} →</a
							>{/each}
					</div>
				</section>
			{/if}
		{/if}
	{:else}
		{#if view !== 'modules'}<div class="mode-links">
				<a href="/laerer/undervisning/">← Til modulene</a>
				<a class="button-link secondary" href="/?visning=elev">Åpne elevvisningen →</a>
			</div>{/if}
		<div class="filters">
			<div>
				<label for="teaching-search"
					>{view === 'modules' ? 'Finn en modul' : 'Finn tema eller leksjon'}</label
				><input
					id="teaching-search"
					type="search"
					bind:value={search}
					placeholder="Søk i undervisningen …"
				/>
			</div>
			<div>
				<label for="teaching-subject">Fag</label><select id="teaching-subject" bind:value={subject}
					><option value="alle">Alle fag</option>{#each fag as item}<option value={item.id}
							>{item.navn}</option
						>{/each}</select
				>
			</div>
		</div>
		{#if view === 'modules'}
			<div class="module-overview-heading">
				<div>
					<h2>Moduler</h2>
					<p class="small" id="module-status-instructions">
						Velg én status per modul. Valget lagres automatisk for 2ITA og 2ITB.
					</p>
				</div>
				<div class="overview-actions">
					<a class="button-link secondary" href="/?visning=elev">Åpne elevvisningen →</a>
					<button
						type="button"
						class="secondary"
						disabled={$modulePublication.loading}
						onclick={refreshPublication}
						>{$modulePublication.loading ? 'Henter status …' : 'Oppdater status'}</button
					>
				</div>
			</div>
			{#if $modulePublication.error || publicationError}
				<p class="notice error" role="alert">
					{$modulePublication.error || publicationError}
					{$modulePublication.ready
						? ' Viser sist hentede status. Bruk «Oppdater status» for å prøve igjen.'
						: ' Du kan åpne modulene, men må hente status før du kan endre hva elevene ser.'}
				</p>
			{:else if !$modulePublication.ready}<p role="status">Henter lagrede modulstatuser …</p>{/if}
			<div class="status-guide" aria-label="Hva modulstatusene betyr">
				<span><strong>Kommende</strong> · skjult for elevene</span>
				<span><strong>Aktiv</strong> · vises først for elevene</span>
				<span><strong>Fullført</strong> · åpen for repetisjon</span>
			</div>
			<p class="small progress-note">
				Fullført gjelder undervisningen. Elevenes arbeid og progresjon beholdes.
			</p>
			{#if $modulePublication.ready}
				<ul class="status-summary" aria-label="Modulstatus i dette utvalget">
					{#each statusSummary as item}<li data-status={item.status}>
							<strong>{item.count}</strong>
							{item.count === 1 ? item.singular : item.label}
						</li>{/each}
				</ul>
			{/if}
			<div class="module-list" aria-describedby="module-status-instructions">
				{#each modules as item (item.id)}
					{@const publication = publicationFor(item.id, $modulePublication.modules)}
					<article
						class="module-row"
						data-status={$modulePublication.ready ? publication.status : 'unknown'}
					>
						<div class="module-heading">
							<h3>
								<a href={`/moduler/${item.id}/`}
									>{item.title}<span class="open-arrow" aria-hidden="true"> →</span></a
								>
							</h3>
							<p>
								{fag.find((subject) => subject.id === item.subject)?.navn ?? ''} · {moduleSummary(
									item
								)}
							</p>
						</div>
						<ModuleStatusControl moduleId={item.id} title={item.title} />
					</article>
				{/each}
			</div>
			{#if !modules.length}<section class="panel">
					<h2>Ingen moduler passer med søket</h2>
					<p>Prøv et annet søkeord eller velg alle fag.</p>
				</section>{/if}
			<section class="panel teaching-library" aria-labelledby="teaching-library-title">
				<h2 id="teaching-library-title">Støtte til undervisningen</h2>
				<p>
					Forslag til gjennomgang ligger inne i hver modul. Her finner du også alle opplegg og
					elevleksjoner samlet.
				</p>
				<div>
					<a href="/laerer/undervisning/?vis=opplegg">Alle undervisningsopplegg →</a>
					<a href="/laerer/undervisning/?vis=leksjoner">Elevleksjoner til storskjerm →</a>
				</div>
			</section>
		{:else}
			<nav class="view-switch" aria-label="Undervisningsbibliotek">
				<a
					class="button-link"
					class:secondary={view !== 'plans'}
					aria-current={view === 'plans' ? 'page' : undefined}
					href="/laerer/undervisning/?vis=opplegg">Undervisningsopplegg</a
				>
				<a
					class="button-link"
					class:secondary={view !== 'lessons'}
					aria-current={view === 'lessons' ? 'page' : undefined}
					href="/laerer/undervisning/?vis=leksjoner">Elevleksjoner · rask tilgang</a
				>
			</nav>
			{#if view === 'plans'}<div class="plan-grid">
					{#each plans as item}<article class="panel plan-card">
							<p class="eyebrow">FELLES GJENNOMGANG · {item.minutes} MIN</p>
							<h2><a href={`/laerer/undervisning/?opplegg=${item.id}`}>{item.title}</a></h2>
							<p>{item.description}</p>
							<p class="small">{item.lessonIds.length} leksjoner · med spørsmål og lærernotater</p>
							<div>
								<a class="button-link" href={`/laerer/undervisning/?opplegg=${item.id}`}
									>Åpne opplegget →</a
								><a href={presentationLink(activity(item.lessonIds[0])?.href ?? '/', item.id)}
									>Vis på storskjerm →</a
								>
							</div>
						</article>{/each}
				</div>
				{#if !plans.length}<section class="panel">
						<h2>Ingen opplegg å vise</h2>
						<p>Prøv et annet søk eller fag. Nye opplegg dukker opp her etter hvert.</p>
					</section>{/if}
			{:else}<section class="panel">
					<p class="eyebrow">ELEVMATERIELL TIL GJENNOMGANG</p>
					<h2>Leksjoner, lett tilgjengelig</h2>
					<div class="lesson-list">
						{#each lessons as item}<article>
								<div>
									<strong>{item.tittel}</strong>
									<p>{item.beskrivelse}</p>
								</div>
								<div>
									<a class="button-link secondary" href={presentationLink(item.href)}
										>Vis leksjon →</a
									><a href={item.href}>Åpne elevversjon</a>
								</div>
							</article>{/each}
					</div>
					{#if !lessons.length}<p>Ingen leksjoner passer med søket i dette faget.</p>{/if}
				</section>{/if}
		{/if}
	{/if}
</TeacherShell>

<style>
	.plan-actions,
	.mode-links,
	.filters,
	.view-switch,
	.return-links {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 14px;
		margin: 20px 0;
	}
	.plan-actions > span {
		color: var(--color-text-muted);
	}
	.filters {
		align-items: flex-end;
		gap: 18px;
	}
	.filters > div:first-child {
		flex: 1;
		min-width: 200px;
	}
	input {
		width: 100%;
	}
	.module-overview-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px 24px;
		margin: 28px 0 16px;
	}
	.overview-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		min-width: 0;
	}
	.overview-actions a,
	.mode-links a {
		max-width: 100%;
		overflow-wrap: anywhere;
	}
	.module-overview-heading h2,
	.module-overview-heading p {
		margin: 0 0 6px;
	}
	.status-guide {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 24px;
		font-size: var(--font-small);
	}
	.status-guide span {
		color: var(--color-text-muted);
	}
	.status-guide strong {
		color: var(--color-text);
	}
	.progress-note {
		margin: 8px 0 16px;
	}
	.status-summary {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 0;
		margin: 0 0 12px;
	}
	.status-summary li {
		margin: 0;
		padding: 4px 10px;
		border-radius: 6px;
		background: var(--color-surface-soft);
		font-size: var(--font-small);
	}
	.status-summary [data-status='active'] {
		color: var(--color-info);
		background: var(--color-info-soft);
	}
	.status-summary [data-status='completed'] {
		color: var(--color-success);
		background: var(--color-success-soft);
	}
	.module-list {
		display: grid;
		gap: 10px;
	}
	.module-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(23rem, 28rem);
		align-items: center;
		gap: 12px 24px;
		padding: 16px 20px;
		border: 1px solid var(--color-border);
		border-left: 4px solid var(--color-border-strong);
		border-radius: var(--radius-card);
		background: var(--color-surface);
		min-width: 0;
	}
	.module-row[data-status='active'] {
		border-left-color: var(--color-info);
	}
	.module-row[data-status='completed'] {
		border-left-color: var(--color-success);
	}
	.module-heading {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.module-heading h3 {
		margin: 0;
		font-size: 1.125rem;
		line-height: 1.4;
	}
	.module-heading h3 a {
		text-decoration: none;
	}
	.module-heading h3 a:hover {
		text-decoration: underline;
	}
	.open-arrow {
		white-space: nowrap;
		margin-left: 0.25em;
	}
	.module-heading p {
		margin: 5px 0 0;
		color: var(--color-text-muted);
		font-size: var(--font-small);
		line-height: 1.5;
	}
	@media (max-width: 60rem) {
		.module-row {
			grid-template-columns: minmax(0, 1fr);
			padding: 16px;
		}
	}
	.teaching-library {
		margin-top: 36px;
		overflow-wrap: anywhere;
	}
	.teaching-library p {
		color: var(--color-text-muted);
		max-width: 80ch;
	}
	.teaching-library > div {
		display: flex;
		flex-wrap: wrap;
		gap: 12px 26px;
	}
	.teaching-library a {
		max-width: 100%;
		overflow-wrap: anywhere;
		padding-block: 10px;
		min-height: 44px;
	}
	.plan-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px;
	}
	.plan-card {
		display: flex;
		flex-direction: column;
	}
	.plan-card h2 a {
		text-decoration: none;
	}
	.plan-card > p {
		color: var(--color-text-muted);
	}
	.plan-card > div {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 14px;
		margin-top: auto;
		padding-top: 12px;
	}
	.goals {
		font-size: 18px;
		padding-left: 22px;
		margin-bottom: 0;
	}
	li {
		margin: 8px 0;
		line-height: 1.65;
	}
	.plan-steps article {
		border-top: 1px solid var(--color-border);
		padding: 24px 0;
	}
	.plan-steps article:last-child {
		padding-bottom: 0;
	}
	.step-title {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 14px;
	}
	.step-title > div {
		flex: 1 1 250px;
	}
	h3 {
		margin: 0 0 5px;
		font-size: 20px;
	}
	h4 {
		margin: 12px 0;
	}
	.step-title p {
		margin: 0;
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.number {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 9px;
		font-weight: 750;
		background: var(--color-accent-soft);
		color: var(--color-accent);
	}
	.step-notes {
		display: grid;
		grid-template-columns: 1fr 1.3fr;
		gap: 24px;
		margin: 12px 0 0 50px;
	}
	.step-notes ul {
		padding-left: 18px;
		margin-top: 0;
	}
	.self-work {
		display: flex;
		gap: 14px;
		flex-wrap: wrap;
	}
	.lesson-list article {
		display: flex;
		align-items: center;
		gap: 22px;
		border-top: 1px solid var(--color-border);
		padding: 18px 0;
	}
	.lesson-list article > div:first-child {
		flex: 1;
	}
	.lesson-list article > div:last-child {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		flex-shrink: 0;
	}
	.lesson-list p {
		color: var(--color-text-muted);
		font-size: var(--font-small);
		margin-bottom: 0;
	}
	@media (max-width: 760px) {
		.plan-grid,
		.step-notes {
			grid-template-columns: 1fr;
		}
		.step-notes {
			margin-left: 0;
			gap: 5px;
		}
		.lesson-list article {
			align-items: flex-start;
			flex-direction: column;
			gap: 12px;
		}
	}
</style>
