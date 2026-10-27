<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import { initializeTheme } from '#lib/theme.js';
	import { initializeLab, lab, setLearningContext } from '#lib/lab.js';
	import { hasTeacherRole } from '#lib/learning.js';
	import { teachingPlans, presentationLessons } from '#lib/teaching.js';
	import TeachingPresentation from '#lib/components/TeachingPresentation.svelte';

	import { labPreferences } from '#lib/labPreferences.js';
	import { initializeExperience } from '#lib/labPreferences.js';
	import ActivityProgress from '#lib/components/ActivityProgress.svelte';
	import RewardToast from '#lib/components/RewardToast.svelte';
	import LearningAccess from '#lib/components/LearningAccess.svelte';
	import GlobalLabPartner from '#lib/components/GlobalLabPartner.svelte';
	import '#lib/theme.css';
	import { initializeConnection } from '#lib/connection.js';
	import ConnectionBanner from '#lib/components/ConnectionBanner.svelte';
	import LabHeader from '#lib/components/LabHeader.svelte';

	/** @type {{children: import('svelte').Snippet}} */
	let { children } = $props();
	const browser = typeof window !== 'undefined';
	const activity = $derived(presentationLessons.find((item) => item.href === page.url.pathname));
	const presentationRequested = $derived(
		browser &&
			page.url.searchParams.get('visning') === 'presentasjon' &&
			activity?.format === 'leksjon'
	);
	const presenting = $derived(presentationRequested && hasTeacherRole($lab.user?.role));
	$effect(() => {
		if (presenting)
			setLearningContext({ activityId: '', mode: 'normal', openingId: null, untimed: false });
	});
	const showStudentTools = $derived(!presentationRequested || ($lab.ready && !presenting));
	const localPartner = $derived(page.url.pathname.replace(/\/$/, '') === '/spill/redd-chatten');
	const showCompanion = $derived(!localPartner && showStudentTools && $labPreferences.companion);
	const plan = $derived(
		teachingPlans.find(
			(item) =>
				item.id === page.url.searchParams.get('opplegg') &&
				item.lessonIds.includes(activity?.id ?? '')
		) ?? null
	);

	onMount(initializeTheme);
	onMount(initializeConnection);
	onMount(initializeLab);
	onMount(initializeExperience);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class:presentation={presenting}>
	<a class="site-skip" href="#hovedinnhold">Hopp til hovedinnhold</a>
	{#if !presenting}<LabHeader />{/if}
	<ConnectionBanner />
	{#if presenting && activity}<TeachingPresentation {activity} {plan} />{:else}<LearningAccess
		/>{/if}
	<div class="activity-layout" class:with-companion={showCompanion}>
		{#if showCompanion}<GlobalLabPartner />{/if}
		<div class="activity-content">
			{@render children()}
			{#if showStudentTools}<ActivityProgress /><RewardToast />{/if}
		</div>
	</div>
</div>

<style>
	.activity-content {
		min-width: 0;
	}
	@media (min-width: 1800px) {
		.with-companion {
			display: grid;
			grid-template-columns: minmax(408px, 1fr) minmax(0, var(--layout-width)) minmax(24px, 1fr);
		}
		.with-companion > .activity-content {
			grid-column: 2;
			grid-row: 1;
			/* The outer grid supplies the gutters; keep the activity's full reading width. */
			--layout-gutter: 0px;
		}
	}

	.presentation {
		--font-body: 1.12rem;
		--font-small: 0.98rem;
		--font-meta: 0.85rem;
		--font-code: 1rem;
		--font-code-small: 0.94rem;
	}
	.presentation :global(.lesson-page .course),
	.presentation :global(.lesson-page .lesson-footer),
	.presentation :global(.lesson-page .tasks),
	.presentation :global(.lesson-page .context) {
		display: none;
	}
	.presentation :global(.side > main),
	.presentation :global(.lesson-page > main) {
		padding-top: 26px;
	}
</style>
