<script>
	import { page } from '$app/state';
	import { aktiviteter } from '#lib/innhold.js';
	import { lab, learningContext } from '#lib/lab.js';
	import {
		avatarReaction,
		setAvatarContext,
		avatarFeedback,
		clearAvatarFeedback
	} from '#lib/avatarFeedback.js';
	import { labPreferences, setLabPreferences } from '#lib/labPreferences.js';
	import Avatar from '#lib/components/Avatar.svelte';
	const activity = $derived(aktiviteter.find((item) => item.href === page.url.pathname));
	const active = $derived(!!activity && $lab.user?.role === 'student');
	/** @type {HTMLElement|undefined} */
	let companionElement = $state();
	$effect(() => {
		if (!companionElement) return;
		const element = companionElement;
		const measure = () =>
			document.documentElement.style.setProperty(
				'--lab-companion-space',
				`${element.getBoundingClientRect().height + 20}px`
			);
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		measure();
		return () => {
			observer.disconnect();
			document.documentElement.style.removeProperty('--lab-companion-space');
		};
	});
	$effect(() => {
		setAvatarContext(
			$lab.user?.id ?? '',
			activity?.id ?? '',
			`${$learningContext.mode}:${$learningContext.openingId}`
		);
	});
	$effect(() => {
		const { until, serial } = $avatarReaction;
		if (until) {
			const timeout = setTimeout(
				() => clearAvatarFeedback(serial),
				Math.max(0, until - Date.now())
			);
			return () => clearTimeout(timeout);
		}
	});
	function interact(/** @type {Event} */ event) {
		if (
			!active ||
			!activity ||
			!(event.target instanceof Element) ||
			event.target.closest('.avatar-companion')
		)
			return;
		if (event.type === 'input') {
			if (!['success', 'celebrate'].includes($avatarReaction.mood))
				avatarFeedback(activity.id, 'working', 'Prøv ideen din. Se hva som skjer.');
		} else if (
			event.target.closest('button')?.textContent?.match(/hint|forklaring|undersøk|inspiser/i)
		) {
			avatarFeedback(
				activity.id,
				'thinking',
				'Ta ett spor av gangen. Hva forteller koden eller tilbakemeldingen?'
			);
		}
	}
</script>

<svelte:document oninput={interact} onclick={interact} />

{#if active && $lab.summary && $labPreferences.companion}
	<aside
		bind:this={companionElement}
		class="avatar-companion"
		aria-label="Din avatar"
		data-mood={$avatarReaction.mood}
	>
		<Avatar id={$lab.summary.lab.avatarId} mood={$avatarReaction.mood} size={54} />
		<div>
			<span class="eyebrow">DIN LABPARTNER</span>
			<p>{$avatarReaction.message || 'Ett steg av gangen. Prøv, utforsk og finn din løsning.'}</p>
		</div>
		<button
			type="button"
			aria-label="Skjul labpartneren"
			title="Kan slås på igjen i Min lab"
			onclick={() => setLabPreferences({ companion: false })}>×</button
		>
	</aside>
{/if}

<style>
	:global(html) {
		scroll-padding-top: var(--lab-companion-space, 0px);
	}
	.avatar-companion {
		position: sticky;
		top: 8px;
		z-index: 30;
		display: flex;
		align-items: center;
		gap: 13px;
		box-sizing: border-box;
		width: min(720px, calc(100% - 32px));
		margin: 12px auto;
		padding: 9px 12px;
		border: 1px solid var(--color-border-strong);
		border-radius: 14px;
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: 0 4px 16px var(--color-shadow);
		font:
			14px/1.45 system-ui,
			sans-serif;
	}
	.avatar-companion > div {
		flex: 1;
		min-width: 0;
	}
	.eyebrow {
		font-size: 9px;
		font-weight: 750;
		letter-spacing: 0.12em;
		color: var(--color-accent);
	}
	p {
		margin: 2px 0 0;
		overflow-wrap: anywhere;
	}
	button {
		flex-shrink: 0;
		align-self: flex-start;
		border: 0;
		background: transparent;
		color: var(--color-text-muted);
		min-width: 32px;
		min-height: 32px;
		font-size: 22px;
		cursor: pointer;
	}
	button:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 2px;
	}
	@media (max-width: 500px) {
		.avatar-companion {
			top: 4px;
			font-size: 12px;
			gap: 8px;
			padding: 8px;
		}
	}
</style>
