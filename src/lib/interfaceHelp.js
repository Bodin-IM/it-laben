import { getContext } from 'svelte';
import { writable } from 'svelte/store';

export const interfaceHelpKey = Symbol('it-laben-interface-help');
/** @typedef {{label:string,hint:string,order:number}} HelpDefinition */
/** @typedef {HelpDefinition & {key:symbol,node:HTMLElement}} HelpTarget */

/** One registry per layout. Only explicitly registered, mounted controls can be shown. */
export function createInterfaceHelp() {
	/** @type {Map<symbol,HelpTarget>} */
	const targets = new Map();
	/** @type {HelpTarget|null} */
	let active = null;
	/** @type {import('svelte/store').Writable<{targets:HelpTarget[],active:HelpTarget|null}>} */
	const state = writable({ targets: [], active: null });
	function publish() {
		state.set({ targets: [...targets.values()].sort((a, b) => a.order - b.order), active });
	}
	function clear() {
		if (!active) return;
		active = null;
		publish();
	}
	/** @type {import('svelte/action').Action<HTMLElement,HelpDefinition|null>} */
	function target(node, definition) {
		const key = Symbol('help-target');
		/** @param {HelpDefinition|null} next */
		function update(next) {
			if (active?.key === key) active = null;
			if (next) targets.set(key, { ...next, key, node });
			else targets.delete(key);
			publish();
		}
		update(definition ?? null);
		return {
			update,
			destroy() {
				targets.delete(key);
				if (active?.key === key) active = null;
				publish();
			}
		};
	}
	return {
		subscribe: state.subscribe,
		target,
		clear,
		/** @param {symbol} key */
		show(key) {
			const item = targets.get(key);
			// Do not navigate to stale, hidden or locked content.
			if (!item?.node.isConnected || !item.node.getClientRects().length) return false;
			active = item;
			publish();
			return true;
		}
	};
}

/** Read during component initialization; the layout owns the registry. */
export function getInterfaceHelp() {
	return /** @type {ReturnType<typeof createInterfaceHelp>} */ (getContext(interfaceHelpKey));
}
