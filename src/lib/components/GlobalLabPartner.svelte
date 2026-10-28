<script>
	import {
		avatarReaction,
		setAvatarContext,
		clearAvatarFeedback,
		avatarFeedback
	} from '#lib/avatarFeedback.js';
	import { aktiviteter } from '#lib/innhold.js';
	import { page } from '$app/state';
	import { lab, learningContext } from '#lib/lab.js';
	import { labPreferences } from '#lib/labPreferences.js';
	import { getContext } from 'svelte';
	import { partnerChannelKey } from '#lib/partnerChannel.js';
	import { readPartnerState, PAGE_CONTEXT_VERSION } from '#lib/partnerContext.js';
	import { moduleContext } from '#lib/moduleNavigation.js';
	/** @type {ReturnType<import('#lib/partnerChannel.js').createPartnerChannel>} */
	const channel = getContext(partnerChannelKey);
	import { partnerPageFor } from '#lib/partnerPages.js';
	import LabPartnerPanel from '#lib/components/LabPartnerPanel.svelte';
	const current = $derived(
		partnerPageFor(
			page.url.pathname,
			typeof window !== 'undefined' ? page.url.searchParams.get('fag') : null
		)
	);

	const scope = $derived(
		`${$lab.user?.id ?? 'guest'}:${$learningContext.mode}:${$learningContext.openingId ?? ''}`
	);
	const source = $derived(
		$channel?.pageId === current?.id && $channel?.scope === scope ? $channel : null
	);
	const context = $derived.by(() => {
		try {
			return { state: readPartnerState(current?.id ?? '', source?.state ?? null), error: '' };
		} catch {
			return {
				state: null,
				error: 'Sidekonteksten kunne ikke leses. Last siden på nytt, eller bruk Sidehjelp.'
			};
		}
	});
	const moduleId = $derived(
		current && typeof window !== 'undefined'
			? (moduleContext(current.path, page.url.searchParams.get('modul'))?.module.id ?? null)
			: null
	);
	const taskKey = $derived(
		current?.kind === 'pilot'
			? (context.state?.values?.step ?? '')
			: (context.state?.values?.level ??
					context.state?.values?.taskId ??
					(current?.kind === 'database-practice' ? context.state?.values?.phase : undefined) ??
					context.state?.values?.caseId ??
					context.state?.values?.questionId ??
					'')
	);
	/** @type {import('#lib/labPartner.js').PagePartnerSnapshot} */
	const snapshot = $derived({
		version: PAGE_CONTEXT_VERSION,
		activityId: 'page-help',
		pageId: current?.id ?? 'site-help',
		moduleId,
		state: context.state,
		running: source?.running ?? false,
		events: []
	});
	const activity = $derived(aktiviteter.find((item) => item.id === current?.id));
	$effect(() =>
		setAvatarContext(
			$lab.user?.id ?? '',
			activity?.id ?? '',
			`${$learningContext.mode}:${$learningContext.openingId}`
		)
	);
	$effect(() => {
		const { until, serial } = $avatarReaction;
		if (until) {
			const timer = setTimeout(() => clearAvatarFeedback(serial), Math.max(0, until - Date.now()));
			return () => clearTimeout(timer);
		}
	});
	function interact(/** @type {Event} */ event) {
		if (
			!activity ||
			$lab.user?.role !== 'student' ||
			!(event.target instanceof Element) ||
			event.target.closest('.global-partner')
		)
			return;
		if (!['success', 'celebrate'].includes($avatarReaction.mood))
			avatarFeedback(activity.id, 'working', 'Prøv ideen din. Se hva som skjer.');
	}
</script>

<svelte:document oninput={interact} />
{#if current}
	<aside class="global-partner" aria-label="Labpartner">
		{#key `${scope}:${current.id}:${moduleId ?? ''}:${taskKey}`}
			<LabPartnerPanel
				{snapshot}
				contextError={context.error}
				accountId={$lab.user?.id ?? null}
				csrf={$lab.csrfToken ?? ''}
				avatarId={$lab.summary?.lab.avatarId ?? $labPreferences.partnerAvatar}
				dialogBreakpoint={1799}
				reactionMood={$avatarReaction.mood}
				reactionMessage={$avatarReaction.message}
				onreset={() => {}}
			/>
		{/key}
	</aside>
{/if}

<style>
	.global-partner {
		box-sizing: border-box;
		width: min(720px, calc(100% - 2 * var(--layout-gutter)));
		margin: 20px auto 0;
		min-width: 0;
	}
	@media (min-width: 1800px) {
		.global-partner {
			grid-column: 1;
			grid-row: 1;
			justify-self: end;
			width: 360px;
			margin: 28px 24px 24px 0;
			align-self: start;
			position: sticky;
			top: 24px;
		}
	}
</style>
