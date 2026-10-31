<script>
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import { moduleLink } from '#lib/moduleNavigation.js';
	import { fag } from '#lib/innhold.js';
	import { moduleContents, moduleTypes, moduleProgress, moduleSummary } from '#lib/moduler.js';
	import { lab } from '#lib/lab.js';
	import { hasTeacherRole } from '#lib/learning.js';
	import { connection, secureHref } from '#lib/connection.js';
	import { publicationFor } from '#lib/modulePublication.js';
	import { modulePublication, refreshModulePublication } from '#lib/modulePublicationStore.js';
	import ModuleAdministration from '#lib/components/ModuleAdministration.svelte';
	import ModuleTeachingSuggestions from '#lib/components/ModuleTeachingSuggestions.svelte';
	import PersonalOverview from '#lib/components/PersonalOverview.svelte';
	import ValidationJourney from '#lib/components/ValidationJourney.svelte';
	import BackendStart from '#lib/components/BackendStart.svelte';
	import ProjectTask from '#lib/components/ProjectTask.svelte';
	import { backendSections } from '#lib/backendCourse.js';
	/** @type {{data:{module:import('#lib/moduler.js').Module}}} */
	let { data } = $props();
	const module = $derived(data.module);
	const subject = $derived(fag.find((item) => item.id === module.subject));
	const contents = $derived(moduleContents(module));
	const progress = $derived(moduleProgress(module, $lab.summary?.progress));
	const teacher = $derived(hasTeacherRole($lab.user?.role));
	const publication = $derived(publicationFor(module.id, $modulePublication.modules));
	const canView = $derived(
		teacher ||
			($modulePublication.ready && !$connection.publicHttp && publication.status !== 'upcoming')
	);
	const studentOverview = $derived(`/?visning=elev&fag=${module.subject}`);
	let publicationError = $state('');
	let restoredAnchor = '';
	$effect(() => {
		const hash = page.url.hash,
			key = `${module.id}:${hash}`;
		if (!canView || restoredAnchor === key || !/^#(?:forlop|del-\d+)$/.test(hash)) return;
		restoredAnchor = key;
		// The initial publication request may finish after the browser tried to follow this anchor.
		void tick().then(() => {
			if (!canView || restoredAnchor !== key) return;
			const focused = document.activeElement;
			if (focused && focused !== document.body && focused.id !== 'hovedinnhold') return;
			const target = document.getElementById(hash.slice(1));
			target?.focus({ preventScroll: true });
			target?.scrollIntoView({ block: 'start' });
		});
	});
	async function refreshPublication() {
		publicationError = '';
		try {
			await refreshModulePublication();
		} catch (problem) {
			publicationError =
				problem instanceof Error ? problem.message : 'Kunne ikke hente modulstatusen.';
		}
	}
	function status(/** @type {string} */ id) {
		const value = $lab.summary?.progress.find((item) => item.id === id)?.status;
		return value === 'passed'
			? 'Oppdragstester bestått'
			: value === 'reviewed'
				? 'Gjennomgått'
				: value === 'started'
					? 'Påbegynt'
					: '';
	}
</script>

<svelte:head
	><title>{module.title} – Modul – IT-laben</title><meta
		name="description"
		content={module.description}
	/></svelte:head
>

<div class="module-page">
	{#if canView}<a class="skip" href="#forlop">Hopp til modulens innhold</a>{/if}
	<main id="hovedinnhold" tabindex="-1">
		<nav class="breadcrumbs" aria-label="Brødsmuler">
			{#if teacher}<a href="/laerer/undervisning/">Undervisning</a>
			{:else}<a href="/?visning=elev">Fagoversikt</a><span aria-hidden="true">/</span><a
					href={studentOverview}>{subject?.navn}</a
				>{/if}<span aria-hidden="true">/</span><span aria-current="page">{module.title}</span>
		</nav>
		<section class="hero" aria-labelledby="module-title">
			<div class="hero-copy">
				<p class="eyebrow">Modul · {subject?.navn}</p>
				<h1 id="module-title">{module.title}</h1>
				{#if $modulePublication.ready && !$connection.publicHttp}
					<p class="publication-status" class:active={publication.status === 'active'}>
						{publication.status === 'active'
							? 'Aktiv modul'
							: publication.status === 'completed'
								? 'Ferdig i undervisningen · åpen for repetisjon'
								: 'Kommende modul · ikke åpnet for elever'}
					</p>
				{/if}
				{#if canView}<p class="intro">{module.description}</p>
					<p class="summary">{moduleSummary(module)}</p>{/if}
			</div>
			{#if canView}<a class="primary" href="#forlop"
					>Se modulens innhold <span aria-hidden="true">↓</span></a
				>{/if}
		</section>
		{#if teacher}
			<section class="panel teacher-controls" aria-labelledby="module-management-title">
				<h2 id="module-management-title">Styr synligheten for elevene</h2>
				<p class="muted">
					Aktive moduler vises først. Ferdige moduler blir liggende åpne for repetisjon.
				</p>
				{#if $modulePublication.error || publicationError}
					<p class="load-error" role="alert">{$modulePublication.error || publicationError}</p>
					<button
						class="retry"
						type="button"
						disabled={$modulePublication.loading}
						onclick={refreshPublication}>Hent modulstatus på nytt</button
					>
				{:else if !$modulePublication.ready}<p role="status">
						Henter lagret modulstatus … Du kan se gjennom innholdet imens.
					</p>{/if}
				<ModuleAdministration moduleId={module.id} title={module.title} />
			</section>
		{:else if $connection.publicHttp}
			<section class="panel availability" aria-labelledby="availability-title">
				<h2 id="availability-title">Åpne modulen på HTTPS</h2>
				<p>Den sikre adressen viser modulene som læreren har åpnet for klassen.</p>
				<a
					class="primary"
					href={secureHref(
						$connection.httpsOrigin,
						page.url.pathname + page.url.search + page.url.hash
					)}>Åpne modulen på HTTPS →</a
				>
				<p><a href="/kom-i-gang/">Hjelp til tilkobling →</a></p>
			</section>
		{:else if !$modulePublication.ready}
			<section class="panel availability" aria-labelledby="availability-title">
				{#if $modulePublication.error || publicationError}
					<h2 id="availability-title">Kunne ikke hente modulstatusen</h2>
					<p class="load-error" role="alert">{$modulePublication.error || publicationError}</p>
					<p>Prøv igjen for å se om modulen er åpen.</p>
					<button
						class="retry"
						type="button"
						disabled={$modulePublication.loading}
						onclick={refreshPublication}
						>{$modulePublication.loading ? 'Henter status …' : 'Prøv igjen'}</button
					>
				{:else}<h2 id="availability-title">Henter modulstatus …</h2>
					<p role="status">Sjekker om modulen er åpen for klassen.</p>{/if}
				<p><a href={studentOverview}>← Til moduloversikten</a></p>
			</section>
		{:else if publication.status === 'upcoming'}
			<section class="panel availability" aria-labelledby="availability-title">
				<h2 id="availability-title">Modulen er ikke åpnet ennå</h2>
				<p>Læreren gjør modulen tilgjengelig når dere skal begynne.</p>
				{#if $modulePublication.error || publicationError}
					<p class="load-error" role="alert">{$modulePublication.error || publicationError}</p>
					<p>Viser sist hentede modulstatus. Prøv igjen for å se om modulen er åpnet.</p>
					<button
						class="retry"
						type="button"
						disabled={$modulePublication.loading}
						onclick={refreshPublication}
						>{$modulePublication.loading ? 'Henter status …' : 'Prøv igjen'}</button
					>
				{/if}
				<p>
					<a class="primary" href={studentOverview}>Til de åpne modulene →</a>
				</p>
			</section>
		{/if}
		{#if canView}
			{#if !teacher && ($modulePublication.error || publicationError)}
				<div class="panel availability">
					<p class="load-error" role="alert">{$modulePublication.error || publicationError}</p>
					<p>Viser sist hentede modulstatus.</p>
					<button
						class="retry"
						type="button"
						disabled={$modulePublication.loading}
						onclick={refreshPublication}>Oppdater status</button
					>
				</div>
			{/if}
			{#if module.id === 'backend'}<BackendStart />{/if}
			<details class="module-guide">
				<summary>Mål og forkunnskaper</summary>
				<div class="guide-content">
					<div>
						<h2>Målet med modulen</h2>
						<ul>
							{#each module.goals as goal}<li>{goal}</li>{/each}
						</ul>
					</div>
					<div>
						<h2>Før du begynner</h2>
						<p>{module.prerequisites}</p>
					</div>
				</div>
			</details>
			{#if teacher}<ModuleTeachingSuggestions {module} />{/if}
			{#if !teacher}<PersonalOverview moduleId={module.id} />{/if}
			<div class="layout">
				<section id="forlop" aria-labelledby="forlop-title" tabindex="-1">
					<div class="section-heading">
						<h2 id="forlop-title">Dette skal vi jobbe med</h2>
						<p class="muted">Følg rekkefølgen, eller åpne delen du trenger.</p>
					</div>
					<ol class="steps">
						{#each contents as step, index (`${step.kind}:${step.id}`)}
							<li
								id={`del-${index + 1}`}
								tabindex="-1"
								class:teaching={step.kind === 'undervisning'}
							>
								{#if step.section}<div class="part-title"><h3>{step.section}</h3>
									{#if module.id === 'backend'}<p>{backendSections[step.section]}</p>{/if}
								</div>{/if}
								<span class="step-number" aria-hidden="true"
									>{String(index + 1).padStart(2, '0')}</span
								>
								<div class="step-content">
									<div class="step-top">
										<span class="step-type"
											>{step.optional ? 'Valgfri ekstrautfordring' : moduleTypes[step.kind].label}{step.format === 'spill'
												? ' · Spill'
												: ''}</span
										>{#if step.kind !== 'undervisning' && status(step.id)}<span class="status"
												>{status(step.id)}</span
											>{/if}
									</div>
									<h3>{step.title}</h3>
									<p class="step-description">{step.description}</p>
									{#if step.kind === 'undervisning'}
										<p class="muted">Felles gjennomgang · ca. {step.minutes} min</p>
										<details class="lesson-links">
											<summary>Innhold til gjennomgang og repetisjon</summary>
											<ul>
												{#each step.lessons as lesson}<li>
														<a href={moduleLink(lesson.href, module.id)}
															>{lesson.title} <span aria-hidden="true">→</span></a
														>
													</li>{/each}
											</ul>
										</details>
										{#if teacher}<a class="step-link" href={step.teacherHref}
												>Åpne læreropplegget <span aria-hidden="true">→</span></a
											>{/if}
									{:else}<a class="step-link" href={moduleLink(step.href, module.id)}
											>{step.kind === 'oving'
												? 'Åpne øvingen'
												: step.kind === 'teori'
													? 'Start med teorien'
													: step.kind === 'praksis'
														? 'Se kodeoppgaven'
														: step.kind === 'repetisjon'
															? 'Åpne repetisjonen'
															: 'Åpne oppdraget'}
											<span aria-hidden="true">→</span></a
										>{/if}
									{#if module.id === 'backend' && step.id === 'oving-7'}
										<ValidationJourney moduleId={module.id} />
									{/if}
									{#if step.practice}
										<ProjectTask instruction={step.practice.instruction} check={step.practice.check} />
									{/if}
								</div>
							</li>
						{/each}
					</ol>
					{#if module.continuation?.length}
						<section class="panel continuation" aria-labelledby="continuation-title">
							<h2 id="continuation-title">Videre i modulen</h2>
							<p class="muted">Planlagt videre arbeid. Disse rundene er ikke publisert ennå.</p>
							{#each module.continuation as part}<h3>{part.title}</h3>
								<p>{part.description}</p>{/each}
						</section>
					{/if}
				</section>
				<aside aria-label="Oversikt og ressurser">
					<nav class="outline panel" aria-label="Hopp til en del i modulen">
						<h2>I denne modulen</h2>
						<ol>
							{#each contents.filter((step) => module.id !== 'backend' || step.section) as step}<li>
									<a href={`#del-${contents.indexOf(step) + 1}`}>{step.section ?? step.title}</a>
								</li>{/each}
						</ol>
					</nav>
					{#if !teacher && $lab.user && $lab.summary && progress.total > 0}<section class="panel">
							<h2>Ditt arbeid</h2>
							<p>
								{progress.completed} av {progress.total} elevaktiviteter er gjennomgått eller bestått.
							</p>
							<progress
								value={progress.completed}
								max={progress.total}
								aria-label="Elevaktiviteter gjennomgått eller bestått"
							></progress>
							<p class="muted">
								Status hentes fra øvingene og oppdragene. Felles gjennomgang telles ikke med.
								Arbeidet i egen kode følges opp sammen med læreren.
								{#if module.id === 'backend'}Nattevakten er valgfri og telles ikke i denne oversikten.{/if}
							</p>
						</section>{/if}
					{#if module.resources.length}<section class="panel">
							<h2>Ressurser og repetisjon</h2>
							<ul>
								{#each module.resources as resource}<li>
										<a href={moduleLink(resource.href, module.id)}
											>{resource.label} <span aria-hidden="true">→</span></a
										>
									</li>{/each}
							</ul>
						</section>{/if}
					<a class="back-link" href="/tutorial/">Slik bruker du IT-laben →</a>
					<a class="back-link" href={`${studentOverview}#utforsk`}
						>Alle øvinger og spill i {subject?.navn.toLocaleLowerCase('nb-NO')}
						<span aria-hidden="true">→</span></a
					>
				</aside>
			</div>
		{/if}
	</main>
	<footer>
		<a href={teacher ? '/laerer/undervisning/' : studentOverview}
			>← Tilbake til {teacher ? 'undervisningen' : subject?.navn}</a
		><span>IT-laben · Se. Prøv. Forstå.</span>
	</footer>
</div>

<style>
	.part-title {
		grid-column: 1 / -1;
		margin: 0 0 8px;
		color: var(--color-info);
		font-size: 1.1rem;
	}
	.part-title h3 { margin: 0 0 8px; font-size: 1.15rem; }
	.part-title p { margin: 0; max-width: 75ch; color: var(--color-text-muted); font: 400 var(--font-body)/1.6 var(--font-ui); }
	.continuation {
		margin-top: 24px;
	}
	.module-page {
		font-family: var(--font-ui);
		color: var(--color-text);
		overflow-wrap: anywhere;
	}
	.module-page :global(*) {
		box-sizing: border-box;
	}
	main,
	footer {
		width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		margin-inline: auto;
	}
	a {
		color: var(--color-accent);
		text-underline-offset: 4px;
	}
	a:focus-visible,
	button:focus-visible,
	summary:focus-visible,
	:is(section, li)[tabindex]:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}
	.breadcrumbs {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px 10px;
		padding-block: 22px;
		font-size: var(--font-meta);
		color: var(--color-text-muted);
	}
	.breadcrumbs a {
		padding-block: 5px;
	}
	.hero {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		border-radius: var(--radius-card);
		padding: 28px 32px;
		border: 1px solid var(--color-info-border);
		background: var(--color-info-soft);
	}
	.hero-copy {
		max-width: 64ch;
	}
	.eyebrow {
		color: var(--color-info);
		font-weight: 650;
		font-size: var(--font-small);
		margin: 0 0 10px;
	}
	h1 {
		font-size: clamp(1.85rem, 3.5vw, 2.65rem);
		letter-spacing: -0.035em;
		line-height: 1.15;
		margin: 0 0 12px;
	}
	h2 {
		font-size: 1.35rem;
		line-height: 1.35;
		margin: 0 0 8px;
		letter-spacing: -0.02em;
	}
	h3 {
		font-size: 1.25rem;
		line-height: 1.4;
		margin: 5px 0 10px;
		letter-spacing: -0.02em;
	}
	h1,
	h2,
	h3,
	a {
		overflow-wrap: anywhere;
	}
	p {
		margin: 8px 0 14px;
	}
	.intro {
		font-size: 1.125rem;
		margin: 0 0 12px;
	}
	.summary {
		color: var(--color-text-muted);
		font-size: var(--font-meta);
		margin: 0;
	}
	.publication-status {
		display: inline-block;
		margin: 0 0 14px;
		padding: 4px 10px;
		border: 1px solid var(--color-border-strong);
		border-radius: 6px;
		background: var(--color-surface);
		color: var(--color-text);
		font-weight: 650;
		font-size: var(--font-meta);
	}
	.publication-status.active {
		border-color: var(--color-info-border);
		color: var(--color-info);
	}
	.teacher-controls,
	.availability {
		margin-top: 20px;
	}
	.availability {
		margin-bottom: 30px;
	}
	.load-error {
		padding: 12px 16px;
		border: 1px solid var(--color-danger-border);
		border-radius: 7px;
		color: var(--color-danger);
		background: var(--color-danger-soft);
	}
	.retry {
		min-height: 44px;
		padding: 10px 16px;
		border: 1px solid var(--color-border-strong);
		border-radius: 7px;
		color: var(--color-text);
		background: var(--color-surface);
		font: 650 var(--font-small)/1.4 var(--font-ui);
		cursor: pointer;
	}
	.retry:disabled {
		cursor: default;
		opacity: 0.65;
	}
	.primary {
		display: inline-flex;
		max-width: 100%;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		padding: 12px 18px;
		min-height: 48px;
		border-radius: 9px;
		background: var(--color-action);
		color: var(--color-on-action);
		font-size: var(--font-small);
		font-weight: 650;
		text-decoration: none;
		flex-shrink: 0;
	}
	.primary:hover {
		background: var(--color-action-hover);
	}
	.module-guide {
		margin-top: 12px;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		background: var(--color-surface);
	}
	.module-guide > summary {
		padding: 14px 20px;
		color: var(--color-text);
		font-weight: 600;
	}
	.guide-content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 28px;
		padding: 4px 24px 18px;
	}
	.guide-content h2 {
		font-size: 1.125rem;
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 280px;
		gap: 36px;
		padding-block: 32px;
		align-items: start;
	}
	#forlop {
		min-width: 0;
		scroll-margin-top: 24px;
	}
	.muted {
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.section-heading .muted {
		margin-bottom: 20px;
	}
	.steps {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 16px;
	}
	.steps > li {
		display: grid;
		grid-template-columns: 42px minmax(0, 1fr);
		gap: 18px;
		background: var(--color-surface);
		padding: 24px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		scroll-margin-top: 24px;
	}
	.step-number {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		background: var(--color-surface-soft);
		color: var(--color-text-muted);
		border-radius: 50%;
		font: 600 0.9375rem/1 monospace;
	}
	.teaching .step-number {
		background: var(--color-info-soft);
		color: var(--color-info);
	}
	.step-top {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 20px;
		justify-content: space-between;
		font-size: var(--font-meta);
	}
	.step-type {
		color: var(--color-text-muted);
		font-weight: 600;
	}
	.status {
		color: var(--color-success);
		font-weight: 650;
	}
	.step-description {
		max-width: 65ch;
	}
	.step-link {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		padding: 8px 0;
		font-weight: 700;
		font-size: var(--font-small);
	}
	.lesson-links {
		border-top: 1px solid var(--color-border);
		padding-top: 8px;
	}
	summary {
		cursor: pointer;
		color: var(--color-accent);
		padding-block: 10px;
		font-size: var(--font-small);
	}
	ul {
		padding-left: 22px;
	}
	ul li + li {
		margin-top: 8px;
	}
	.lesson-links a,
	.panel li a {
		display: inline-block;
		padding-block: 7px;
	}
	aside {
		display: grid;
		gap: 18px;
		min-width: 0;
	}
	.panel {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		background: var(--color-surface);
		padding: 22px;
	}
	.panel h2 {
		font-size: 1.125rem;
	}
	.panel p:last-child {
		margin-bottom: 0;
	}
	.panel ul {
		margin-bottom: 0;
	}
	.outline ol {
		list-style: none;
		padding: 0;
		margin: 12px 0 0;
	}
	.outline a {
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding-block: 8px;
		font-size: var(--font-small);
		color: var(--color-text-muted);
		text-decoration: none;
	}
	.outline a:hover {
		color: var(--color-accent);
		text-decoration: underline;
	}
	progress {
		width: 100%;
		accent-color: var(--color-info);
		height: 9px;
	}
	.back-link {
		padding-block: 10px;
		font-size: var(--font-small);
	}
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		border-top: 1px solid var(--color-border);
		padding-block: 24px;
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.skip {
		position: fixed;
		top: 10px;
		left: 10px;
		z-index: 100;
		padding: 12px 20px;
		background: var(--color-action);
		color: var(--color-on-action);
		border-radius: 8px;
		transform: translateY(-200%);
	}
	.skip:focus {
		transform: none;
	}
	@media (max-width: 900px) {
		.hero {
			flex-wrap: wrap;
		}
		.layout {
			grid-template-columns: minmax(0, 1fr) 250px;
			gap: 24px;
		}
	}
	@media (max-width: 750px) {
		.layout {
			grid-template-columns: 1fr;
		}
		.outline {
			display: none;
		}
		.guide-content {
			grid-template-columns: 1fr;
			gap: 14px;
		}
		.hero {
			padding: 22px;
			gap: 18px;
		}
		.steps > li {
			grid-template-columns: 32px minmax(0, 1fr);
			padding: 20px 16px;
			gap: 12px;
		}
		.step-number {
			width: 32px;
			height: 32px;
		}
	}
</style>

