import { tick } from 'svelte';

/** Follow map selections into the editor, then briefly mark the destination.
 * @param {() => boolean} reduceMotion
 */
export function createNetworkEditorNavigation(reduceMotion) {
	/** @type {Animation | undefined} */
	let highlight;
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;
	let sequence = 0;
	function cancel() {
		sequence++;
		clearTimeout(timer);
		highlight?.cancel();
	}
	/** @param {string} headingId @param {string} regionId */
	async function reveal(headingId, regionId) {
		cancel();
		const request = sequence;
		await tick();
		if (request !== sequence) return;
		const heading = document.getElementById(headingId);
		const region = document.getElementById(regionId);
		if (!heading || !region) return;
		const bounds = heading.getBoundingClientRect();
		const outside = bounds.top < 96 || bounds.bottom > window.innerHeight - 80;
		heading.focus({ preventScroll: true });
		const wholePanelFits = region.getBoundingClientRect().height < window.innerHeight - 176;
		const destination = wholePanelFits ? region : heading;
		destination.scrollIntoView({ behavior: reduceMotion() ? 'instant' : 'smooth', block: outside && !wholePanelFits ? 'start' : 'nearest', inline: 'nearest' });
		if (reduceMotion()) return;
		// Leave time to follow the scroll before marking the configuration panel.
		timer = setTimeout(() => {
			if (request !== sequence || reduceMotion() || !region.isConnected) return;
			highlight = region.animate([
				{ boxShadow: '0 0 0 0 transparent' },
				{ boxShadow: '0 0 0 3px var(--color-accent)', offset: 0.25 },
				{ boxShadow: '0 0 0 3px var(--color-accent)', offset: 0.6 },
				{ boxShadow: '0 0 0 0 transparent' }
			], { duration: 1100, easing: 'ease-out' });
		}, outside ? 400 : 0);
	}
	return { reveal, cancel };
}
