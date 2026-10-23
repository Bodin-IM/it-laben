<script>
	/**
	 * Mount one instance for the selected line. The parent owns aria-expanded
	 * and aria-controls on its native line button. `${id}-body` can also be
	 * used as the selected button's aria-describedby target.
	 * Related line buttons set data-explanation-for to this id so a pointer
	 * press can switch lines without closing the current explanation first.
	 *
	 * Anchored mode needs a gutter that stretches alongside the code, without
	 * clipping or transformed ancestors. Inline mode belongs after the line.
	 *
	 * @typedef {{
	 *   anchor: HTMLElement | null,
	 *   boundary?: HTMLElement | null,
	 *   id: string,
	 *   title: string,
	 *   explanation: string,
	 *   label: string,
	 *   onclose: () => void,
	 *   mode?: 'anchored' | 'inline'
	 * }} Props
	 */
	/** @typedef {{ left: number, top: number, right: number, bottom: number }} Bounds */
	/** @type {Props} */
	let {
		anchor,
		boundary = null,
		id,
		title,
		explanation,
		label,
		onclose,
		mode = 'anchored'
	} = $props();
	/** @type {HTMLElement | undefined} */
	let panel = $state();
	let placed = $state(false);
	let matchesViewport = $state(false);

	/** @param {boolean} restoreFocus */
	function dismiss(restoreFocus) {
		const trigger = anchor;
		onclose();
		if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
	}

	/** @returns {Bounds} */
	function viewportBounds() {
		const viewport = window.visualViewport;
		const left = viewport?.offsetLeft ?? 0;
		const top = viewport?.offsetTop ?? 0;
		return {
			left,
			top,
			right: left + (viewport?.width ?? document.documentElement.clientWidth),
			bottom: top + (viewport?.height ?? window.innerHeight)
		};
	}

	/**
	 * A wide line button may extend outside its horizontally scrolling editor.
	 * Use the visible part of the line, never its unconstrained right edge.
	 * @param {HTMLElement} trigger
	 * @param {DOMRect} rect
	 * @param {Bounds} viewport
	 * @returns {Bounds | null}
	 */
	function visibleAnchor(trigger, rect, viewport) {
		const visible = {
			left: Math.max(rect.left, viewport.left),
			top: Math.max(rect.top, viewport.top),
			right: Math.min(rect.right, viewport.right),
			bottom: Math.min(rect.bottom, viewport.bottom)
		};
		if (getComputedStyle(trigger).visibility !== 'visible') return null;
		for (let parent = trigger.parentElement; parent; parent = parent.parentElement) {
			const style = getComputedStyle(parent);
			const clipsX = /auto|scroll|hidden|clip/.test(style.overflowX);
			const clipsY = /auto|scroll|hidden|clip/.test(style.overflowY);
			if (!clipsX && !clipsY) continue;
			const clip = parent.getBoundingClientRect();
			if (clipsX) {
				visible.left = Math.max(visible.left, clip.left + parent.clientLeft);
				visible.right = Math.min(visible.right, clip.left + parent.clientLeft + parent.clientWidth);
			}
			if (clipsY) {
				visible.top = Math.max(visible.top, clip.top + parent.clientTop);
				visible.bottom = Math.min(
					visible.bottom,
					clip.top + parent.clientTop + parent.clientHeight
				);
			}
		}
		return visible.right > visible.left && visible.bottom > visible.top ? visible : null;
	}

	$effect(() => {
		const currentAnchor = anchor;
		const currentPanel = panel;
		const gutter = boundary;
		const form = mode;
		placed = false;
		if (!currentAnchor || !currentPanel) return;
		const trigger = currentAnchor;
		const element = currentPanel;

		const mobile = window.matchMedia('(max-width: 900px)');
		matchesViewport = form === 'inline' ? mobile.matches : !mobile.matches;
		let closed = false;
		let frame = 0;
		let dirty = true;
		let previousGeometry = '';

		/** @param {boolean} restoreFocus */
		function close(restoreFocus) {
			if (closed) return;
			closed = true;
			dismiss(restoreFocus);
		}

		/** @param {DOMRect} lineRect @param {DOMRect} gutterRect @param {Bounds} viewport */
		function place(lineRect, gutterRect, viewport) {
			const visible = visibleAnchor(trigger, lineRect, viewport);
			const left = Math.max(gutterRect.left, viewport.left + 12);
			const right = Math.min(gutterRect.right, viewport.right - 12);
			const topLimit = Math.max(gutterRect.top, viewport.top + 12);
			const bottomLimit = Math.min(gutterRect.bottom, viewport.bottom - 12);
			if (!visible || right - left < 140 || bottomLimit - topLimit < 80) {
				close(false);
				return;
			}

			element.style.setProperty('--card-left', left + 'px');
			element.style.setProperty('--card-width', Math.min(360, right - left) + 'px');
			element.style.setProperty('--card-max-height', bottomLimit - topLimit + 'px');
			const height = element.getBoundingClientRect().height;
			const anchorY = (visible.top + visible.bottom) / 2;
			const top = Math.max(topLimit, Math.min(anchorY - 28, bottomLimit - height));
			const pointerY = Math.max(15, Math.min(anchorY - top, height - 15));
			const gap = Math.max(0, left - visible.right);
			const distanceY = anchorY - top - pointerY;
			element.style.setProperty('--card-top', top + 'px');
			element.style.setProperty('--pointer-top', pointerY + 'px');
			element.style.setProperty('--pointer-width', Math.hypot(gap, distanceY) + 'px');
			element.style.setProperty('--pointer-angle', Math.atan2(-distanceY, gap) + 'rad');
			placed = true;
		}

		function watchPosition() {
			if (closed) return;
			if (!trigger.isConnected || !trigger.getClientRects().length || !element.isConnected) {
				close(false);
				return;
			}
			if (form === 'anchored') {
				if (!gutter?.isConnected) {
					close(false);
					return;
				}
				const lineRect = trigger.getBoundingClientRect();
				const gutterRect = gutter.getBoundingClientRect();
				const viewport = viewportBounds();
				const geometry = [
					lineRect.left,
					lineRect.top,
					lineRect.right,
					lineRect.bottom,
					gutterRect.left,
					gutterRect.top,
					gutterRect.right,
					gutterRect.bottom,
					viewport.left,
					viewport.top,
					viewport.right,
					viewport.bottom
				].join(',');
				if (dirty || geometry !== previousGeometry) {
					dirty = false;
					previousGeometry = geometry;
					place(lineRect, gutterRect, viewport);
				}
			}
			if (!closed) frame = requestAnimationFrame(watchPosition);
		}

		function invalidate() {
			dirty = true;
		}
		function changeViewportMode() {
			const matches = form === 'inline' ? mobile.matches : !mobile.matches;
			matchesViewport = matches;
			if (!matches) close(false);
			else invalidate();
		}
		/** @param {PointerEvent} event */
		function outsidePointer(event) {
			if (event.button !== 0) return;
			const path = event.composedPath();
			const switchesLine = path.some(
				(target) =>
					target instanceof HTMLButtonElement &&
					!target.disabled &&
					target.dataset.explanationFor === id
			);
			if (switchesLine) return;
			if (!path.includes(element) && !path.includes(trigger)) close(false);
		}
		/** @param {KeyboardEvent} event */
		function escape(event) {
			if (event.key !== 'Escape' || event.defaultPrevented) return;
			event.preventDefault();
			event.stopPropagation();
			close(true);
		}

		if (!(form === 'inline' ? mobile.matches : !mobile.matches)) {
			close(false);
			return;
		}
		const observer = new ResizeObserver(invalidate);
		observer.observe(trigger);
		observer.observe(element);
		if (gutter) observer.observe(gutter);
		document.addEventListener('pointerdown', outsidePointer, true);
		window.addEventListener('keydown', escape);
		window.addEventListener('scroll', invalidate, true);
		window.addEventListener('resize', invalidate);
		window.visualViewport?.addEventListener('resize', invalidate);
		window.visualViewport?.addEventListener('scroll', invalidate);
		mobile.addEventListener('change', changeViewportMode);
		frame = requestAnimationFrame(watchPosition);

		return () => {
			closed = true;
			cancelAnimationFrame(frame);
			observer.disconnect();
			document.removeEventListener('pointerdown', outsidePointer, true);
			window.removeEventListener('keydown', escape);
			window.removeEventListener('scroll', invalidate, true);
			window.removeEventListener('resize', invalidate);
			window.visualViewport?.removeEventListener('resize', invalidate);
			window.visualViewport?.removeEventListener('scroll', invalidate);
			mobile.removeEventListener('change', changeViewportMode);
		};
	});
</script>

<section
	bind:this={panel}
	{id}
	class="code-explanation"
	class:anchored={mode === 'anchored'}
	class:inline={mode === 'inline'}
	class:placed
	hidden={!anchor || !matchesViewport}
	aria-hidden={mode === 'anchored' && !placed ? true : undefined}
	aria-labelledby={id + '-title'}
	aria-describedby={id + '-body'}
>
	{#if mode === 'anchored'}<span class="pointer" aria-hidden="true"></span>{/if}
	<header>
		<div>
			<p class="label">{label}</p>
			<h3 id={id + '-title'}>{title}</h3>
		</div>
		<button type="button" onclick={() => dismiss(true)} aria-label="Lukk forklaringen">
			<span aria-hidden="true">×</span>
		</button>
	</header>
	<div class="explanation-body">
		<p id={id + '-body'}>{explanation}</p>
	</div>
</section>

<style>
	.code-explanation {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		min-width: 0;
		border: 1px solid var(--color-border-strong);
		border-radius: 10px;
		background: var(--color-surface-raised);
		color: var(--color-text);
		font-family: inherit;
		text-align: left;
		white-space: normal;
		box-shadow: 0 6px 22px var(--color-shadow);
	}
	.code-explanation[hidden] {
		display: none;
	}
	.anchored {
		position: fixed;
		z-index: 30;
		left: var(--card-left, 0px);
		top: var(--card-top, 0px);
		width: var(--card-width, 300px);
		max-height: var(--card-max-height, calc(100dvh - 24px));
		visibility: hidden;
	}
	.anchored.placed {
		visibility: visible;
	}
	.inline {
		position: relative;
		width: 100%;
		margin: 10px 0 14px;
		border-left: 3px solid var(--color-accent);
		box-shadow: none;
	}
	.pointer {
		position: absolute;
		right: 100%;
		top: var(--pointer-top, 28px);
		width: var(--pointer-width, 16px);
		height: 0;
		border-top: 1px solid var(--color-border-strong);
		transform-origin: right center;
		transform: rotate(var(--pointer-angle, 0rad));
		pointer-events: none;
	}
	.pointer::before {
		content: '';
		position: absolute;
		left: 0;
		top: -4px;
		width: 6px;
		height: 6px;
		border-left: 1px solid var(--color-border-strong);
		border-bottom: 1px solid var(--color-border-strong);
		transform: rotate(45deg);
	}
	header {
		display: flex;
		flex-shrink: 0;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		padding: 16px 15px 0 17px;
	}
	header > div {
		min-width: 0;
	}
	.label {
		margin: 0 0 7px;
		color: var(--color-accent);
		font-size: 11px;
		font-weight: 650;
		line-height: 1.45;
		overflow-wrap: anywhere;
	}
	h3 {
		margin: 0;
		font-size: 17px;
		font-weight: 700;
		line-height: 1.35;
		letter-spacing: -0.2px;
		overflow-wrap: anywhere;
	}
	button {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		margin: -4px -4px 0 0;
		padding: 0;
		border: 1px solid transparent;
		border-radius: 6px;
		background: transparent;
		color: var(--color-accent);
		font: inherit;
		font-size: 24px;
		line-height: 1;
		cursor: pointer;
	}
	button:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-border);
	}
	button:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 2px;
	}
	.explanation-body {
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 10px 17px 17px;
	}
	.explanation-body p {
		margin: 0;
		font-size: 13px;
		line-height: 1.7;
		overflow-wrap: anywhere;
		white-space: pre-line;
	}
	@media (max-width: 650px) {
		header {
			padding: 14px 13px 0 15px;
		}
		h3 {
			font-size: 16px;
		}
		.explanation-body {
			padding: 9px 15px 15px;
		}
	}
</style>
