<script>
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	const browser = typeof window !== 'undefined';
	import { aktiviteter } from '#lib/innhold.js';
	import { lab, learningContext, setLearningContext, refreshLearningActivity } from '#lib/lab.js';
	import { learningLink, hasTeacherRole } from '#lib/learning.js';
	import { teacherPreview } from '#lib/teacherPreview.js';
	const activity = $derived(aktiviteter.find((item) => item.href === page.url.pathname));
	const mode = $derived(
		(activity && $teacherPreview) || (browser && page.url.searchParams.get('modus') === 'oving')
			? 'practice'
			: browser && page.url.searchParams.get('modus') === 'undervisning'
				? 'teaching'
				: 'normal'
	);
	const openingId = $derived(browser ? page.url.searchParams.get('apning') : null);
	const opening = $derived($lab.openings.find((item) => item.activityId === activity?.id));
	const teacher = $derived(hasTeacherRole($lab.user?.role));
	$effect(() => {
		$lab.user?.id;
		setLearningContext({
			activityId: activity?.id ?? '',
			mode,
			openingId: mode === 'teaching' ? openingId : null,
			untimed: mode === 'practice' && ($teacherPreview || page.url.searchParams.get('utenTid') === '1')
		});
	});
	onMount(() => {
		const poll = setInterval(() => {
			if (document.visibilityState === 'visible') void refreshLearningActivity();
		}, 15000);
		return () => clearInterval(poll);
	});
	/** @param {number} value */
	function time(value) {
		return new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit' }).format(value);
	}
</script>

{#if activity && (teacher || mode !== 'normal' || opening)}
	<aside
		class="learning-access"
		class:practice={mode === 'practice'}
		aria-label="Tilgang til aktiviteten"
	>
		<div>
			<strong
				>{$teacherPreview ? 'Lærer · alle oppgaver åpne' : mode === 'practice'
					? 'Øving · uten XP'
					: mode === 'teaching'
						? 'Undervisningsforsøk'
						: teacher
							? 'Lærertilgang'
							: 'Åpent for alle'}</strong
			>
			<p>
				{$teacherPreview ? 'Forhåndsvisning uten XP. Elevenes progresjonskrav er uendret.' : mode === 'practice'
					? 'Egen øvingsprogresjon. Du bruker ingen ordinære forsøk og får ingen XP eller merker.'
					: mode === 'teaching'
						? 'Ett ekstra forsøk i denne åpningen. XP gis ved bestått, én gang per mål.'
						: opening
							? `${opening.mode === 'practice' ? 'Åpen øving uten XP' : 'Ekstra undervisningsforsøk'} frem til ${time(opening.closesAt)}.`
							: 'Test aktiviteten eller åpne den for klassen.'}
			</p>
		</div>
		<div class="actions">
			{#if $teacherPreview}<a href="/min-lab/?visning=innstillinger#laererinnstillinger">Lærerinnstillinger →</a>
			{:else if mode !== 'normal'}<a href={activity.href}>Til vanlig aktivitet →</a>{/if}
			{#if mode === 'normal' && teacher}<a href={learningLink(activity.href, 'practice')}
					>Test selv →</a
				>{/if}
			{#if mode === 'normal' && opening}<a
					class="primary"
					href={learningLink(activity.href, opening.mode, opening.id)}
					>{opening.mode === 'practice' ? 'Åpne øvingen' : 'Ta undervisningsforsøket'} →</a
				>{/if}
			{#if teacher}<a href={`/laerer/aktiviteter/?aktivitet=${activity.id}`}>Lærerpanel →</a>{/if}
			{#if !$lab.user && mode !== 'normal'}<a href="/min-lab/">Logg inn i Min lab →</a>{/if}
		</div>
	</aside>
{:else if page.url.pathname === '/' && $lab.openings.length}
	<section class="openings" aria-label="Åpne aktiviteter">
		<p class="eyebrow">ÅPENT FOR ALLE NÅ</p>
		{#each $lab.openings as item (item.id)}{@const content = aktiviteter.find(
				(value) => value.id === item.activityId
			)}
			{#if content}<a href={learningLink(content.href, item.mode, item.id)}
					><strong>{content.tittel}</strong><span
						>{item.mode === 'practice' ? 'Fri øving · uten XP' : 'Ett ekstra undervisningsforsøk'} · til
						{time(item.closesAt)} →</span
					></a
				>{/if}
		{/each}
	</section>
{/if}

<style>
	.learning-access,
	.openings {
		width: min(1240px, calc(100% - 32px));
		box-sizing: border-box;
		margin: 16px auto;
		padding: 17px 20px;
		border: 1px solid var(--color-border-strong);
		border-radius: 9px;
		background: var(--color-accent-soft);
		color: var(--color-text);
		font:
			14px/1.5 system-ui,
			sans-serif;
		overflow-wrap: anywhere;
	}
	.learning-access {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		flex-wrap: wrap;
	}
	.learning-access.practice {
		border-style: dashed;
	}
	.learning-access > div:first-child {
		flex: 1 1 300px;
	}
	strong {
		font-weight: 700;
	}
	p {
		margin: 4px 0 0;
		color: var(--color-text-muted);
		font-size: 12px;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	a {
		color: var(--color-accent);
		font-size: 12px;
		min-height: 36px;
		display: inline-flex;
		align-items: center;
	}
	.primary {
		padding: 7px 12px;
		border-radius: 6px;
		background: var(--color-action);
		color: var(--color-on-action);
		text-decoration: none;
	}
	.eyebrow {
		letter-spacing: 1.5px;
		font-size: 10px;
		font-weight: 700;
		margin: 0 0 12px;
		color: var(--color-accent);
	}
	.openings > a {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		border-top: 1px solid var(--color-border);
		padding: 12px 0;
		text-decoration: none;
	}
	.openings > a > span {
		color: var(--color-text-muted);
	}
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
</style>
