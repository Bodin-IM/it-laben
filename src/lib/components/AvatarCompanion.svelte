<script>
	import { page } from '$app/state';
	import { MediaQuery } from 'svelte/reactivity';
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
	/** @type {{embedded?:boolean}} */
	let { embedded = false } = $props();
	const activity = $derived(aktiviteter.find((item) => item.href === page.url.pathname));
	const active = $derived(!!activity && $lab.user?.role === 'student');
	const wide = new MediaQuery('(min-width: 1800px)', false);
	const mobile = new MediaQuery('(max-width: 600px)', false);
	let wideOpen = $state(true);
	let regularOpen = $state(true);
	let mobileOpen = $state(false);
	const expanded = $derived(wide.current ? wideOpen : mobile.current ? mobileOpen : regularOpen);
	function toggle() {
		if (wide.current) wideOpen = !wideOpen;
		else if (mobile.current) mobileOpen = !mobileOpen;
		else regularOpen = !regularOpen;
	}
	function hide() {
		setLabPreferences({ companion: false });
		document.getElementById('hovedinnhold')?.focus();
	}
	function openHelp(/** @type {MouseEvent} */ event) {
		event.preventDefault();
		window.dispatchEvent(new Event('labpartner-open'));
	}

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
		class="avatar-companion"
		class:embedded
		class:expanded
		aria-label="Labpartner"
		data-mood={$avatarReaction.mood}
	>
		<button
			class="disclosure"
			type="button"
			aria-expanded={expanded}
			aria-controls="labpartner-message"
			onclick={toggle}
		>
			<span class="figure"
				><Avatar id={$lab.summary.lab.avatarId} mood={$avatarReaction.mood} size={64} /></span
			>
			<span class="title">Labpartner</span>
			<span class="chevron" aria-hidden="true">{expanded ? '−' : '+'}</span>
		</button>
		<div id="labpartner-message" class="message" hidden={!expanded}>
			<p>{$avatarReaction.message || 'Ett steg av gangen. Prøv, utforsk og finn din løsning.'}</p>
			{#if activity?.id === 'redd-chatten'}
				<a class="ask-partner" href="#labpartner-hjelp" onclick={openHelp}>Spør om oppgaven →</a>
			{/if}
			<button
				class="hide"
				type="button"
				title="Kan slås på igjen i Min lab → Lyd og animasjoner"
				onclick={hide}>Skjul labpartneren</button
			>
		</div>
	</aside>
{/if}

<style>
	.avatar-companion {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: start;
		gap: 12px;
		box-sizing: border-box;
		width: min(720px, calc(100% - 2 * var(--layout-gutter)));
		max-width: calc(100% - 2 * var(--layout-gutter));
		margin: 16px auto;
		padding: 12px;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-card);
		background: var(--color-surface);
		color: var(--color-text);
		font: var(--font-small)/1.6 var(--font-ui);
	}
	.avatar-companion:not(.expanded) {
		width: fit-content;
		grid-template-columns: minmax(0, 1fr);
	}
	.disclosure {
		display: flex;
		position: relative;
		align-items: center;
		gap: 10px;
		padding: 4px;
		min-height: 44px;
		min-width: 0;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: var(--color-text);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.figure {
		width: 36px;
		height: 36px;
		flex-shrink: 0;
	}
	.figure :global(svg) {
		width: 100%;
		height: 100%;
	}
	.title {
		overflow-wrap: anywhere;
		min-width: 0;
	}
	.chevron {
		color: var(--color-accent);
		margin-left: auto;
		font-size: 1.25rem;
	}
	.message {
		min-width: 0;
	}
	p {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.hide {
		min-height: 44px;
		padding: 6px 0;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: var(--color-text-muted);
		font: inherit;
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
	}
	.ask-partner {
		display: block;
		color: var(--color-accent);
		padding-block: 10px;
		min-height: 44px;
		box-sizing: border-box;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	@media (max-width: 600px) {
		.avatar-companion {
			grid-template-columns: minmax(0, 1fr);
			margin-left: var(--layout-gutter);
		}
		.avatar-companion:not(.expanded) {
			padding: 6px 10px;
		}
	}
	@media (min-width: 1800px) {
		.avatar-companion,
		.avatar-companion:not(.expanded) {
			grid-column: 1;
			grid-row: 1;
			align-self: start;
			position: sticky;
			top: 16px;
			grid-template-columns: minmax(0, 1fr);
			width: 220px;
			max-width: none;
			max-height: calc(100dvh - 32px);
			overflow-y: auto;
			margin: 16px 24px 16px auto;
			padding: 16px;
		}
		.disclosure {
			flex-direction: column;
			width: 100%;
			padding-top: 10px;
		}
		.figure {
			width: 64px;
			height: 64px;
		}
		.title {
			font-size: var(--font-body);
		}
		.chevron {
			position: absolute;
			top: 0;
			right: 4px;
		}
		.message p {
			min-height: 7.5em;
		}
	}
	.avatar-companion.embedded {
		position: static;
		width: 100%;
		max-width: none;
		max-height: none;
		overflow: visible;
		margin: 12px 0 0;
		padding: 10px;
		grid-template-columns: minmax(0, 1fr);
		gap: 8px;
	}
	.embedded .disclosure {
		flex-direction: row;
		padding: 4px;
	}
	.embedded .figure {
		width: 36px;
		height: 36px;
	}
	.embedded .chevron {
		position: static;
		margin-left: auto;
	}
	.embedded .message p {
		min-height: 0;
	}
	.embedded .ask-partner {
		display: none;
	}
</style>
