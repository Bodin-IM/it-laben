<script>
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { lab, learningContext } from '#lib/lab.js';
	import { reducedMotion, labPreferences } from '#lib/labPreferences.js';
	import { getInterfaceHelp } from '#lib/interfaceHelp.js';
	const help = getInterfaceHelp();
	const activeTarget = $derived($help.active);
	/** @type {HTMLDivElement|undefined} */
	let notice = $state();
	let noticeHeight = $state(0);
	/** @type {HTMLElement|null} */
	let destination = null;

	$effect(() => {
		// A route/account/context change must never leave a previous task highlighted.
		page.url.pathname;
		page.url.search;
		$lab.user?.id;
		$learningContext.mode;
		$learningContext.openingId;
		$labPreferences.companion;
		help.clear();
	});
	$effect(() => {
		const active = activeTarget;
		const reduce = $reducedMotion;
		if (!active) return;
		const node = active.node;
		const heading = node.querySelector('h2, h3, legend');
		const focus = heading instanceof HTMLElement ? heading : node;
		const oldTabindex = focus.getAttribute('tabindex');
		const oldDescription = focus.getAttribute('aria-describedby');
		if (oldTabindex === null && !focus.matches('a[href], button, input, select, textarea, summary'))
			focus.setAttribute('tabindex', '-1');
		focus.setAttribute('aria-describedby', [oldDescription, 'interface-help-text'].filter(Boolean).join(' '));
		node.setAttribute('data-interface-help-active', '');
		destination = focus;
		let cancelled = false;
		void tick().then(() => {
			if (cancelled || !node.isConnected) return;
			focus.focus({ preventScroll: true });
			const bounds = node.getBoundingClientRect();
			const bottom = notice?.getBoundingClientRect().top ?? window.innerHeight - 160;
			if (bounds.top < 96 || bounds.bottom > bottom - 16) {
				// Align the beginning, even for a panel taller than the viewport.
				const top = Math.max(0, window.scrollY + bounds.top - 112);
				window.scrollTo({ top, behavior: reduce ? 'instant' : 'smooth' });
			}
		});
		/** @param {Event} event */
		const resume = (event) => {
			if (!(event.target instanceof Node) || notice?.contains(event.target)) return;
			help.clear();
		};
		/** @param {KeyboardEvent} event */
		const escape = (event) => {
			if (event.key === 'Escape') dismiss();
		};
		// Let keyboard users continue without the notice covering their next control.
		const focusChanged = () => {
			const focused = document.activeElement;
			if (!notice || !(focused instanceof HTMLElement) || focused === focus || notice.contains(focused)) return;
			const a = notice.getBoundingClientRect(), b = focused.getBoundingClientRect();
			if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) help.clear();
		};
		document.addEventListener('pointerdown', resume, true);
		document.addEventListener('input', resume, true);
		document.addEventListener('click', resume, true);
		document.addEventListener('keydown', escape);
		document.addEventListener('focusin', focusChanged);
		return () => {
			cancelled = true;
			node.removeAttribute('data-interface-help-active');
			if (oldTabindex === null) focus.removeAttribute('tabindex');
			else focus.setAttribute('tabindex', oldTabindex);
			if (oldDescription === null) focus.removeAttribute('aria-describedby');
			else focus.setAttribute('aria-describedby', oldDescription);
			document.removeEventListener('pointerdown', resume, true);
			document.removeEventListener('input', resume, true);
			document.removeEventListener('click', resume, true);
			document.removeEventListener('keydown', escape);
			document.removeEventListener('focusin', focusChanged);
			destination = null;
		};
	});
	function dismiss() {
		if (notice?.contains(document.activeElement)) destination?.focus({ preventScroll: true });
		help.clear();
	}
</script>

{#if $help.active}
	<!-- Reserve room to scroll the last control clear of the floating notice. -->
	<div aria-hidden="true" style:height={`${noticeHeight + 32}px`}></div>
	<div class="where-notice" data-interface-help-notice bind:this={notice} bind:clientHeight={noticeHeight}>
		<div id="interface-help-text" role="status">
			<strong>{$help.active.label}</strong>
			<p>{$help.active.hint}</p>
		</div>
		<button type="button" aria-label="Lukk veiviseren" onclick={dismiss}>×</button>
	</div>
{/if}

<style>
	:global([data-interface-help-active]) {
		outline: 3px solid var(--color-accent);
		outline-offset: 4px;
	}
	.where-notice {
		position: fixed;
		z-index: 90;
		bottom: max(16px, env(safe-area-inset-bottom));
		left: 50%;
		transform: translateX(-50%);
		width: min(28rem, calc(100% - 32px));
		box-sizing: border-box;
		max-height: calc(100dvh - 128px);
		overflow-y: auto;
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px 12px 12px 16px;
		border: 2px solid var(--color-accent);
		border-radius: var(--radius-card);
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: 0 8px 28px var(--color-shadow);
		font: var(--font-small)/1.5 var(--font-ui);
		overflow-wrap: anywhere;
	}
	.where-notice > div { flex: 1; min-width: 0; }
	p { margin: 4px 0 0; }
	button {
		flex: 0 0 44px;
		min-height: 44px;
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
		background: var(--color-surface-soft);
		color: var(--color-text);
		font-size: 1.4rem;
		cursor: pointer;
	}
	button:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 2px; }
	@media (forced-colors: active) {
		:global([data-interface-help-active]) { outline-color: Highlight; }
	}
</style>
