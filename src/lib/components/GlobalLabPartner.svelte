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
	import { partnerPageFor } from '#lib/partnerPages.js';
	import LabPartnerPanel from '#lib/components/LabPartnerPanel.svelte';
	const current = $derived(
		partnerPageFor(
			page.url.pathname,
			typeof window !== 'undefined' ? page.url.searchParams.get('fag') : null
		)
	);
	/** @type {import('#lib/labPartner.js').PagePartnerSnapshot} */
	const snapshot = $derived({
		version: 1,
		activityId: 'page-help',
		pageId: current.id,
		running: false,
		events: []
	});
	const activity = $derived(aktiviteter.find((item) => item.id === current.id));
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
<aside class="global-partner" aria-label="Labpartner">
	{#key `${$lab.user?.id ?? 'guest'}:${current.id}:${$learningContext.mode}:${$learningContext.openingId ?? ''}`}
		<LabPartnerPanel
			{snapshot}
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
