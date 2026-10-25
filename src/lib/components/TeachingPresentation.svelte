<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { presentationLessons, presentationLink, studentLessonLink } from '#lib/teaching.js';
	/** @type {{activity:import('#lib/teaching.js').PresentationLesson,plan:import('#lib/teaching.js').TeachingPlan|null}} */
	let { activity, plan } = $props();
	let fullscreen = $state(false),
		error = $state('');
	const lessons = $derived.by(() =>
		plan
			? plan.lessonIds
					.map((id) => presentationLessons.find((item) => item.id === id))
					.filter((item) => item !== undefined)
			: presentationLessons
	);
	const position = $derived(lessons.findIndex((item) => item.id === activity.id));
	const guideHref = $derived(
		`/laerer/undervisning/${plan ? `?opplegg=${encodeURIComponent(plan.id)}` : ''}`
	);
	onMount(() => {
		const changed = () => {
			fullscreen = !!document.fullscreenElement;
		};
		document.addEventListener('fullscreenchange', changed);
		changed();
		return () => document.removeEventListener('fullscreenchange', changed);
	});
	async function toggleFullscreen() {
		error = '';
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await document.documentElement.requestFullscreen();
		} catch {
			error = 'Fullskjerm er ikke tilgjengelig her. Du kan bruke nettleserens fullskjermvalg.';
		}
	}
	async function finish() {
		if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
		await goto(guideHref);
	}
	function choose(/** @type {Event} */ event) {
		const id = /** @type {HTMLSelectElement} */ (event.currentTarget).value;
		const lesson = lessons.find((item) => item.id === id);
		if (lesson) void goto(presentationLink(lesson.href, plan?.id ?? null));
	}
</script>

<aside class="presentation-bar" aria-label="Fellesundervisning">
	<div class="title">
		<span>FELLESUNDERVISNING{plan ? ` · ${position + 1}/${lessons.length}` : ''}</span><strong
			>{plan?.title ?? activity.tittel}</strong
		>
	</div>
	<label class="lesson-choice"
		>Leksjon<select aria-label="Velg leksjon i undervisningen" value={activity.id} onchange={choose}
			>{#each lessons as lesson}<option value={lesson.id}>{lesson.tittel}</option>{/each}</select
		></label
	>
	<nav aria-label="Bytt leksjon">
		{#if position > 0}<a
				href={presentationLink(lessons[position - 1].href, plan?.id ?? null)}
				aria-label="Forrige leksjon">← Forrige</a
			>{/if}{#if position < lessons.length - 1}<a
				href={presentationLink(lessons[position + 1].href, plan?.id ?? null)}
				aria-label="Neste leksjon">Neste →</a
			>{/if}
	</nav>
	<div class="actions">
		<button type="button" onclick={toggleFullscreen}
			>{fullscreen ? 'Avslutt fullskjerm' : 'Fullskjerm'}</button
		><a href={guideHref} target="_blank" rel="noopener">Lærerveiledning</a
		>{#if activity.audience === 'student'}<a href={studentLessonLink(activity.href)}>Elevversjon</a
			>{/if}<button type="button" class="finish" onclick={finish}>Avslutt visning</button>
	</div>
	{#if error}<p role="alert">{error}</p>{/if}
</aside>

<style>
	.presentation-bar {
		position: sticky;
		top: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 14px 20px;
		padding: 15px 24px;
		border-bottom: 1px solid var(--color-border-strong);
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: 0 2px 15px var(--color-shadow);
		font:
			14px/1.4 system-ui,
			sans-serif;
	}
	.title {
		flex: 1 1 180px;
	}
	.title span {
		display: block;
		color: var(--color-accent);
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 0.1em;
		margin-bottom: 4px;
	}
	.title strong {
		font-size: 16px;
	}
	.lesson-choice {
		display: grid;
		gap: 4px;
		color: var(--color-text-muted);
		font-size: 11px;
		max-width: 310px;
	}
	select {
		background: var(--color-surface);
		border: 1px solid var(--color-border-strong);
		border-radius: 5px;
		color: var(--color-text);
		padding: 9px;
		max-width: 100%;
		font:
			14px system-ui,
			sans-serif;
	}
	nav,
	.actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
	}
	a {
		color: var(--color-accent);
		text-underline-offset: 3px;
		min-height: 36px;
		display: inline-flex;
		align-items: center;
	}
	button {
		min-height: 38px;
		border: 1px solid var(--color-border-strong);
		border-radius: 5px;
		padding: 8px 11px;
		font:
			600 13px/1.4 system-ui,
			sans-serif;
		color: var(--color-text);
		background: var(--color-surface);
		cursor: pointer;
	}
	button.finish {
		color: var(--color-on-action);
		background: var(--color-action);
		border-color: var(--color-action);
	}
	p {
		width: 100%;
		margin: 0;
		color: var(--color-warning);
	}
	:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	@media (max-width: 600px) {
		.presentation-bar {
			position: relative;
			padding: 14px 16px;
		}
		.lesson-choice {
			flex: 1 1 100%;
			max-width: 100%;
		}
		.actions {
			gap: 10px 14px;
		}
	}
</style>
