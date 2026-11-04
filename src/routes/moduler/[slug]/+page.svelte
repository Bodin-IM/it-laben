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
	import DatabaseStart from '#lib/components/DatabaseStart.svelte';
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
		if (!canView || restoredAnchor === key || !/^#(?:forlop|modulinfo|del-\d+)$/.test(hash)) return;
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
			{:else}<a href="/?visning=elev">Fagoversikt</a><span aria-hidden="true">/</span><a href={studentOverview}>{subject?.navn}</a>{/if}
			<span aria-hidden="true">/</span><span aria-current="page">{module.title}</span>
		</nav>
		<header class="module-heading">
			<div>
				<p class="eyebrow">Modul · {subject?.navn}</p>
				<h1 id="module-title">{module.title}</h1>
			</div>
			{#if teacher}
				<div class="teacher-controls">
					<ModuleAdministration moduleId={module.id} title={module.title} compact autoSave />
					{#if $modulePublication.error || publicationError}
						<p class="load-error" role="alert">{$modulePublication.error || publicationError}</p>
						<button class="retry" type="button" disabled={$modulePublication.loading} onclick={refreshPublication}>Hent modulstatus på nytt</button>
					{/if}
				</div>
			{/if}
		</header>
		{#if !teacher && $connection.publicHttp}
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
		{:else if !teacher && !$modulePublication.ready}
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
		{:else if !teacher && publication.status === 'upcoming'}
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
					<button class="retry" type="button" disabled={$modulePublication.loading} onclick={refreshPublication}>Oppdater status</button>
				</div>
			{/if}
			{#key module.id}
				<div class="layout">
					<section id="forlop" aria-labelledby="forlop-title" tabindex="-1">
						<div class="section-heading">
							<h2 id="forlop-title">Innhold</h2>
							<a href="#modulinfo">Om modulen ↓</a>
						</div>
						<ol class="steps">
							{#each contents as step, index (`${step.kind}:${step.id}`)}
								{@const href = step.kind === 'undervisning'
									? teacher ? step.teacherHref : step.lessons[0] ? moduleLink(step.lessons[0].href, module.id) : undefined
									: moduleLink(step.href, module.id)}
								<li id={`del-${index + 1}`} tabindex="-1">
									{#if step.section}<h3 class="part-title">{step.section}</h3>{/if}
									<div class="step-row">
										<h3 class="step-title">
											{#if href}<a class="step-open" {href}>
												<span class="step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
												<span>{step.title}{#if step.optional}<small class="optional">Valgfri</small>{/if}</span>
												<span class="open-arrow" aria-hidden="true">→</span>
											</a>{:else}<span class="step-open">
												<span class="step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
												<span>{step.title}</span>
											</span>{/if}
										</h3>
										<details class="step-details">
											<summary aria-label={`Info om ${step.title}`}>
												<span>Info</span><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="m5 7 5 5 5-5" /></svg>
											</summary>
											<div class="step-information">
												<div class="step-meta">
													<span>{moduleTypes[step.kind].label}{step.format === 'spill' ? ' · Spill' : ''}</span>
													{#if step.kind !== 'undervisning' && status(step.id)}<span class="status">{status(step.id)}</span>{/if}
												</div>
												<p>{step.description}</p>
												{#if module.id === 'backend' && step.section}<p class="muted">{backendSections[step.section]}</p>{/if}
												{#if step.kind === 'undervisning'}
													<p class="muted">Felles gjennomgang · ca. {step.minutes} min</p>
													<h4>Innhold til gjennomgang og repetisjon</h4>
													<ul class="lesson-links">{#each step.lessons as lesson}<li><a href={moduleLink(lesson.href, module.id)}>{lesson.title} →</a></li>{/each}</ul>
													{#if teacher}<a class="text-link" href={step.teacherHref}>Åpne læreropplegget →</a>{/if}
												{/if}
												{#if module.id === 'backend' && step.id === 'oving-7'}<ValidationJourney moduleId={module.id} />{/if}
												{#if step.practice}<ProjectTask instruction={step.practice.instruction} check={step.practice.check} />{/if}
											</div>
										</details>
									</div>
								</li>
							{/each}
						</ol>
					</section>
					<aside id="modulinfo" tabindex="-1" aria-label="Om modulen og hjelp">
						{#if module.id === 'databaser'}<DatabaseStart compact />{/if}
						<section class="panel module-info" aria-labelledby="module-info-title">
							<h2 id="module-info-title">Om modulen</h2>
							{#if $modulePublication.ready && !$connection.publicHttp}<p class="publication-status" class:active={publication.status === 'active'}>
								{publication.status === 'active' ? 'Aktiv modul' : publication.status === 'completed' ? 'Ferdig i undervisningen · åpen for repetisjon' : 'Kommende modul · ikke åpnet for elever'}
							</p>{/if}
							<p>{module.description}</p>
							<p class="muted">{moduleSummary(module)}</p>
							<details>
								<summary>Mål og forkunnskaper</summary>
								<h3>Målet med modulen</h3>
								<ul>{#each module.goals as goal}<li>{goal}</li>{/each}</ul>
								<h3>Før du begynner</h3><p>{module.prerequisites}</p>
							</details>
						</section>
						{#if !teacher && module.id !== 'databaser'}<PersonalOverview moduleId={module.id} compact />{/if}
						{#if module.id === 'backend'}<details class="support">
							<summary>Kom i gang med chatprosjektet</summary><BackendStart embedded />
						</details>{/if}
						{#if teacher}<details class="support">
							<summary>Undervisningsopplegg for læreren</summary><ModuleTeachingSuggestions {module} embedded />
						</details>{/if}
						{#if !teacher && $lab.user && $lab.summary && progress.total > 0}<details class="panel">
							<summary>Ditt arbeid · {progress.completed} av {progress.total}</summary>
							<p>{progress.completed} av {progress.total} elevaktiviteter er gjennomgått eller bestått.</p>
							<progress value={progress.completed} max={progress.total} aria-label="Elevaktiviteter gjennomgått eller bestått"></progress>
							<p class="muted">Status hentes fra øvingene og oppdragene. Felles gjennomgang telles ikke med. Arbeidet i egen kode følges opp sammen med læreren.
								{#if module.id === 'backend'}Nattevakten er valgfri og telles ikke i denne oversikten.{/if}
							</p>
						</details>{/if}
						{#if module.resources.length}<details class="panel">
							<summary>Ressurser og repetisjon</summary>
							<ul>{#each module.resources as resource}<li><a class="text-link" href={moduleLink(resource.href, module.id)}>{resource.label} →</a></li>{/each}</ul>
						</details>{/if}
						{#if module.continuation?.length}<details class="panel">
							<summary>Planlagt videre i modulen</summary>
							<p class="muted">Disse rundene er ikke publisert ennå.</p>
							{#each module.continuation as part}<h3>{part.title}</h3><p>{part.description}</p>{/each}
						</details>{/if}
						<a class="back-link" href="/tutorial/">Slik bruker du IT-laben →</a>
						<a class="back-link" href={`${studentOverview}#utforsk`}>Alle øvinger og spill i {subject?.navn.toLocaleLowerCase('nb-NO')} →</a>
					</aside>
				</div>
			{/key}
		{/if}
	</main>
	<footer>
		<a href={teacher ? '/laerer/undervisning/' : studentOverview}>← Tilbake til {teacher ? 'undervisningen' : subject?.navn}</a>
		<span>IT-laben · Se. Prøv. Forstå.</span>
	</footer>
</div>

<style>
	.module-page { font-family: var(--font-ui); color: var(--color-text); overflow-wrap: anywhere; }
	.module-page :global(*) { box-sizing: border-box; }
	main, footer { width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter))); margin-inline: auto; }
	a { color: var(--color-accent); text-underline-offset: 4px; }
	:is(a, button, summary, [tabindex]):focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	.breadcrumbs { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; padding-block: 10px 4px; font-size: var(--font-meta); color: var(--color-text-muted); }
	.breadcrumbs a { padding-block: 6px; }
	.module-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px 24px; padding-block: 8px 16px; border-bottom: 1px solid var(--color-border); }
	.module-heading > div:first-child { flex: 1 1 18rem; min-width: 0; }
	.eyebrow { color: var(--color-text-muted); font-size: var(--font-meta); margin: 0 0 4px; }
	h1 { font-size: clamp(1.6rem, 3vw, 2.2rem); letter-spacing: -0.03em; line-height: 1.2; margin: 0; }
	h2 { font-size: 1.2rem; line-height: 1.4; margin: 0; }
	h3, h4 { font-size: var(--font-body); line-height: 1.5; margin: 14px 0 6px; }
	p { margin: 8px 0 12px; }
	.teacher-controls { width: min(100%, 21rem); }
	.layout { display: grid; grid-template-columns: minmax(0, 1fr) 20rem; gap: 28px; padding-block: 16px 24px; align-items: start; }
	#forlop, #modulinfo, .steps > li { min-width: 0; scroll-margin-top: 20px; }
	.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
	.section-heading a { display: inline-flex; align-items: center; min-height: 44px; font-size: var(--font-small); }
	.steps { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
	.part-title { margin: 18px 0 8px; font-size: var(--font-small); color: var(--color-info); }
	.steps > li:first-child .part-title { margin-top: 0; }
	.step-row { position: relative; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); }
	.step-title { margin: 0; padding-right: 5rem; font-size: var(--font-body); }
	.step-open { display: grid; grid-template-columns: 2ch minmax(0, 1fr) auto; align-items: center; gap: 12px; min-height: 52px; padding: 10px 12px; border-radius: 7px; color: var(--color-text); text-decoration: none; }
	a.step-open:hover { background: var(--color-surface-hover); color: var(--color-accent); }
	a.step-open:hover > span:nth-child(2) { text-decoration: underline; text-underline-offset: 4px; }
	.step-number { color: var(--color-text-muted); font: 500 var(--font-meta)/1.4 ui-monospace, monospace; font-variant-numeric: tabular-nums; }
	.open-arrow { color: var(--color-accent); font-weight: 500; }
	.optional { display: inline-block; margin-left: 8px; color: var(--color-text-muted); font: 400 var(--font-meta)/1.4 var(--font-ui); }
	summary { cursor: pointer; color: var(--color-accent); font-size: var(--font-small); font-weight: 600; min-height: 44px; padding-block: 10px; }
	.step-details > summary { position: absolute; top: 4px; right: 4px; display: flex; align-items: center; justify-content: center; gap: 4px; width: 4.5rem; padding: 8px 6px; border-left: 1px solid var(--color-border); border-radius: 4px; list-style: none; }
	.step-details > summary::-webkit-details-marker { display: none; }
	.step-details > summary:hover { background: var(--color-surface-hover); }
	.step-details > summary svg { flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 1.75; }
	.step-details[open] > summary svg { transform: rotate(180deg); }
	.step-details[open] > summary { background: var(--color-accent-soft); }
	.step-information { border-top: 1px solid var(--color-border); padding: 14px 16px; }
	.step-information > p { max-width: 65ch; }
	.step-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 16px; color: var(--color-text-muted); font-size: var(--font-meta); }
	.status { color: var(--color-success); font-weight: 600; }
	ul { padding-left: 22px; }
	ul li + li { margin-top: 6px; }
	.lesson-links a, .text-link { display: inline-flex; align-items: center; min-height: 44px; padding-block: 8px; }
	#modulinfo { display: grid; gap: 12px; }
	.panel, .support { min-width: 0; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface); padding: 14px 16px; }
	.panel p:last-child { margin-bottom: 0; }
	.panel h2 { font-size: 1.1rem; }
	.panel ul { margin-bottom: 8px; }
	details.panel, .support { padding-block: 0; }
	details.panel[open], .support[open] { padding-bottom: 14px; }
	.module-info { font-size: var(--font-small); }
	.module-info details { border-top: 1px solid var(--color-border); }
	.publication-status { font-size: var(--font-meta); color: var(--color-text-muted); }
	.publication-status.active { color: var(--color-info); font-weight: 600; }
	.muted { color: var(--color-text-muted); font-size: var(--font-small); }
	progress { width: 100%; accent-color: var(--color-info); height: 9px; }
	.back-link { display: inline-flex; align-items: center; min-height: 44px; font-size: var(--font-small); }
	.availability { margin-block: 16px; }
	.load-error { padding: 10px 12px; border: 1px solid var(--color-danger-border); border-radius: 7px; color: var(--color-danger); background: var(--color-danger-soft); font-size: var(--font-small); }
	.retry { min-height: 44px; padding: 8px 12px; border: 1px solid var(--color-border-strong); border-radius: 7px; color: var(--color-text); background: var(--color-surface); font: 600 var(--font-small)/1.4 var(--font-ui); cursor: pointer; }
	.retry:disabled { cursor: default; opacity: 0.65; }
	.primary { display: inline-flex; align-items: center; min-height: 44px; padding: 10px 16px; border-radius: 7px; background: var(--color-action); color: var(--color-on-action); font-weight: 600; text-decoration: none; }
	.primary:hover { background: var(--color-action-hover); }
	footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; border-top: 1px solid var(--color-border); padding-block: 18px; color: var(--color-text-muted); font-size: var(--font-small); }
	.skip { position: fixed; top: 10px; left: 10px; z-index: 100; padding: 12px 20px; background: var(--color-action); color: var(--color-on-action); border-radius: 8px; transform: translateY(-200%); }
	.skip:focus { transform: none; }
	@media (max-width: 1000px) { .layout { grid-template-columns: minmax(0, 1fr) 17rem; gap: 20px; } }
	@media (max-width: 800px) { .layout { grid-template-columns: minmax(0, 1fr); gap: 24px; } }
	@media (max-width: 420px) {
		.step-open { gap: 8px; padding-inline: 8px; }
		.step-information { padding: 12px; }
		.optional { display: block; margin: 2px 0 0; }
	}
</style>
