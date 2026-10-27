<script>
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import AccountLink from '#lib/components/AccountLink.svelte';
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
	<header>
		<a class="brand" href="/">IT-laben<span>.</span></a>
		<div class="actions"><AccountLink /><ThemeToggle /></div>
	</header>
	<main>
		<nav class="breadcrumbs" aria-label="Brødsmuler">
			<a href="/">Fag</a><span aria-hidden="true">/</span><a href={`/?fag=${module.subject}`}
				>{subject?.navn}</a
			><span aria-hidden="true">/</span><span aria-current="page">{module.title}</span>
		</nav>
		<section class="hero" aria-labelledby="module-title">
			<p class="eyebrow">MODUL · {subject?.navn}</p>
			<h1 id="module-title">{module.title}</h1>
			<p class="intro">{module.description}</p>
			<p class="summary">{moduleSummary(module)}</p>
			<a class="primary" href="#forlop">Se modulens innhold <span aria-hidden="true">↓</span></a>
		</section>
		<div class="layout">
			<section id="forlop" aria-labelledby="forlop-title">
				<h2 id="forlop-title">Dette skal vi jobbe med</h2>
				<p class="muted">Følg den anbefalte rekkefølgen, eller åpne delen du trenger.</p>
				<ol class="steps">
					{#each contents as step, index (`${step.kind}:${step.id}`)}
						<li class:teaching={step.kind === 'undervisning'}>
							<div class="step-top">
								<span class="step-type"
									>{String(index + 1).padStart(2, '0')} · {moduleTypes[step.kind]
										.label}{step.format === 'spill' ? ' · Spill' : ''}</span
								>{#if step.kind !== 'undervisning' && status(step.id)}<span class="status"
										>{status(step.id)}</span
									>{/if}
							</div>
							<h3>{step.title}</h3>
							<p>{step.description}</p>
							{#if step.kind === 'undervisning'}
								<p class="muted">Felles gjennomgang · ca. {step.minutes} min</p>
								<details>
									<summary>Innhold til gjennomgang og repetisjon</summary>
									<ul>
										{#each step.lessons as lesson}<li>
												<a href={lesson.href}>{lesson.title} →</a>
											</li>{/each}
									</ul>
								</details>
								{#if hasTeacherRole($lab.user?.role)}<a class="step-link" href={step.teacherHref}
										>Åpne læreropplegget →</a
									>{/if}
							{:else}<a class="step-link" href={step.href}
									>{step.kind === 'oving' ? 'Åpne øvingen' : 'Åpne oppdraget'} →</a
								>{/if}
						</li>
					{/each}
				</ol>
			</section>
			<aside aria-label="Om modulen">
				<section class="panel">
					<h2>Målet med modulen</h2>
					<ul>
						{#each module.goals as goal}<li>{goal}</li>{/each}
					</ul>
					<h3>Før du begynner</h3>
					<p>{module.prerequisites}</p>
				</section>
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
									<a href={resource.href}>{resource.label} →</a>
								</li>{/each}
						</ul>
					</section>{/if}
				<a class="back-link" href={`/?fag=${module.subject}#utforsk`}
					>Alle øvinger og spill i {subject?.navn.toLocaleLowerCase('nb-NO')} →</a
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
		font-family: system-ui, sans-serif;
		color: var(--color-text);
	}
	.module-page :global(*) {
		box-sizing: border-box;
	}
	header,
	main,
	footer {
		width: min(1160px, calc(100% - 48px));
		margin-inline: auto;
	}
	header,
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		padding-block: 20px;
	}
	header {
		border-bottom: 1px solid var(--color-border);
	}
	.brand {
		font-weight: 800;
		font-size: 1.2rem;
		text-decoration: none;
		color: var(--color-text);
	}
	.brand span {
		color: var(--color-accent);
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 18px;
	}
	a {
		color: var(--color-accent);
		text-underline-offset: 3px;
	}
	a:focus-visible,
	summary:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}
	.breadcrumbs {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-block: 22px;
		font-size: var(--font-small);
	}
	.hero {
		background: var(--color-info-soft);
		border: 1px solid var(--color-info-border);
		border-top: 3px solid var(--color-info);
		border-radius: 14px;
		padding: clamp(22px, 4vw, 38px);
	}
	.eyebrow {
		color: var(--color-info);
		letter-spacing: 1px;
		font-weight: 750;
		font-size: var(--font-small);
		margin: 0 0 8px;
	}
	h1 {
		font-size: clamp(1.8rem, 4vw, 2.8rem);
		line-height: 1.2;
		margin: 0 0 14px;
	}
	h2 {
		font-size: 1.25rem;
		line-height: 1.4;
		margin: 0 0 8px;
	}
	h3 {
		font-size: 1.125rem;
		line-height: 1.4;
		margin: 8px 0;
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
		max-width: 720px;
		font-size: 1.125rem;
	}
	.summary {
		color: var(--color-info);
		font-size: var(--font-small);
	}
	.primary {
		display: inline-flex;
		gap: 20px;
		padding: 10px 16px;
		margin-top: 4px;
		border-radius: 7px;
		background: var(--color-action);
		color: var(--color-on-action);
		font-weight: 650;
		text-decoration: none;
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1.8fr) minmax(260px, 1fr);
		gap: 28px;
		padding-block: 32px;
		align-items: start;
	}
	#forlop {
		scroll-margin-top: 24px;
		min-width: 0;
	}
	.muted {
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.steps {
		list-style: none;
		padding: 0;
		margin: 20px 0 0;
		display: grid;
		gap: 16px;
	}
	.steps > li {
		background: var(--color-surface);
		padding: 22px;
		border: 1px solid var(--color-border);
		border-radius: 12px;
	}
	.steps > li.teaching {
		border-left: 3px solid var(--color-info);
	}
	.step-top {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 20px;
		justify-content: space-between;
		font-size: var(--font-small);
	}
	.step-type {
		color: var(--color-accent);
		font-weight: 700;
	}
	.status {
		color: var(--color-success);
		font-weight: 650;
	}
	.step-link {
		display: inline-block;
		padding-block: 10px;
		font-weight: 700;
	}
	details {
		border-top: 1px solid var(--color-border);
		padding-top: 12px;
	}
	summary {
		cursor: pointer;
		color: var(--color-accent);
		padding-block: 6px;
	}
	ul {
		padding-left: 22px;
	}
	li + li {
		margin-top: 8px;
	}
	aside {
		display: grid;
		gap: 18px;
		min-width: 0;
	}
	.panel {
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface-soft);
		padding: 22px;
	}
	.panel p:last-child {
		margin-bottom: 0;
	}
	.panel h3 {
		margin-top: 22px;
	}
	progress {
		width: 100%;
		accent-color: var(--color-info);
		height: 9px;
	}
	.back-link {
		padding: 10px 0;
		font-size: var(--font-small);
	}
	footer {
		border-top: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.skip {
		position: fixed;
		top: 10px;
		left: 10px;
		z-index: 20;
		padding: 10px;
		background: var(--color-surface);
		transform: translateY(-200%);
	}
	.skip:focus {
		transform: none;
	}
	@media (max-width: 750px) {
		.layout {
			grid-template-columns: 1fr;
		}
		aside {
			grid-row: 1;
		}
		header,
		main,
		footer {
			width: calc(100% - 32px);
		}
		.actions {
			gap: 10px;
		}
		.steps > li,
		.panel {
			padding: 18px;
		}
	}
</style>
