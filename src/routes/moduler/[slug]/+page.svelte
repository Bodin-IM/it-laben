<script>
	import LabHeader from '#lib/components/LabHeader.svelte';
	import { moduleLink } from '#lib/moduleNavigation.js';
	import { fag } from '#lib/innhold.js';
	import { moduleContents, moduleTypes, moduleProgress, moduleSummary } from '#lib/moduler.js';
	import { lab } from '#lib/lab.js';
	import { hasTeacherRole } from '#lib/learning.js';
	/** @type {{data:{module:import('#lib/moduler.js').Module}}} */
	let { data } = $props();
	const module = $derived(data.module);
	const subject = $derived(fag.find((item) => item.id === module.subject));
	const contents = $derived(moduleContents(module));
	const progress = $derived(moduleProgress(module, $lab.summary?.progress));
	function status(/** @type {string} */ id) {
		const value = $lab.summary?.progress.find((item) => item.id === id)?.status;
		return value === 'passed'
			? 'Bestått'
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
	<a class="skip" href="#forlop">Hopp til modulens innhold</a>
	<LabHeader />
	<main>
		<nav class="breadcrumbs" aria-label="Brødsmuler">
			<a href="/">Fagoversikt</a><span aria-hidden="true">/</span><a
				href={`/?fag=${module.subject}`}>{subject?.navn}</a
			><span aria-hidden="true">/</span><span aria-current="page">{module.title}</span>
		</nav>
		<section class="hero" aria-labelledby="module-title">
			<div class="hero-copy">
				<p class="eyebrow">Modul · {subject?.navn}</p>
				<h1 id="module-title">{module.title}</h1>
				<p class="intro">{module.description}</p>
				<p class="summary">{moduleSummary(module)}</p>
			</div>
			<a class="primary" href="#forlop">Se modulens innhold <span aria-hidden="true">↓</span></a>
		</section>
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
		<div class="layout">
			<section id="forlop" aria-labelledby="forlop-title" tabindex="-1">
				<div class="section-heading">
					<h2 id="forlop-title">Dette skal vi jobbe med</h2>
					<p class="muted">Følg rekkefølgen, eller åpne delen du trenger.</p>
				</div>
				<ol class="steps">
					{#each contents as step, index (`${step.kind}:${step.id}`)}
						<li id={`del-${index + 1}`} tabindex="-1" class:teaching={step.kind === 'undervisning'}>
							<span class="step-number" aria-hidden="true"
								>{String(index + 1).padStart(2, '0')}</span
							>
							<div class="step-content">
								<div class="step-top">
									<span class="step-type"
										>{moduleTypes[step.kind].label}{step.format === 'spill' ? ' · Spill' : ''}</span
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
									{#if hasTeacherRole($lab.user?.role)}<a class="step-link" href={step.teacherHref}
											>Åpne læreropplegget <span aria-hidden="true">→</span></a
										>{/if}
								{:else}<a class="step-link" href={moduleLink(step.href, module.id)}
										>{step.kind === 'oving' ? 'Åpne øvingen' : 'Åpne oppdraget'}
										<span aria-hidden="true">→</span></a
									>{/if}
							</div>
						</li>
					{/each}
				</ol>
			</section>
			<aside aria-label="Oversikt og ressurser">
				<nav class="outline panel" aria-label="Hopp til en del i modulen">
					<h2>I denne modulen</h2>
					<ol>
						{#each contents as step, index}<li>
								<a href={`#del-${index + 1}`}
									><span aria-hidden="true">{index + 1}</span>{step.title}</a
								>
							</li>{/each}
					</ol>
				</nav>
				{#if $lab.user && $lab.summary}<section class="panel">
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
				<a class="back-link" href={`/?fag=${module.subject}#utforsk`}
					>Alle øvinger og spill i {subject?.navn.toLocaleLowerCase('nb-NO')}
					<span aria-hidden="true">→</span></a
				>
			</aside>
		</div>
	</main>
	<footer>
		<a href={`/?fag=${module.subject}`}>← Tilbake til {subject?.navn}</a><span
			>IT-laben · Se. Prøv. Forstå.</span
		>
	</footer>
</div>

<style>
	.module-page {
		font-family: var(--font-ui);
		color: var(--color-text);
	}
	.module-page :global(*) {
		box-sizing: border-box;
	}
	main,
	footer {
		width: min(1160px, calc(100% - 2 * var(--layout-gutter)));
		margin-inline: auto;
	}
	a {
		color: var(--color-accent);
		text-underline-offset: 4px;
	}
	a:focus-visible,
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
	.primary {
		display: inline-flex;
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
	.outline a span {
		font: 500 var(--font-meta)/1 monospace;
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
