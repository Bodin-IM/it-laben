import { writable } from 'svelte/store';
export const partnerChannelKey = Symbol('it-laben-partner-context');
/** @typedef {{pageId:string,scope:string,state:Record<string,unknown>,running:boolean}} PartnerSource */
/** One channel per layout instance, never shared across SSR users. Last-owner cleanup cannot clear a newer page. */
export function createPartnerChannel() {
	/** @type {symbol|null} */ let owner = null;
	/** @type {import('svelte/store').Writable<PartnerSource|null>} */ const state = writable(null);
	return {
		subscribe: state.subscribe,
		/** @param {symbol} key @param {PartnerSource} source */
		publish(key, source) {
			owner = key;
			state.set(source);
		},
		/** @param {symbol} key */
		release(key) {
			if (owner === key) {
				owner = null;
				state.set(null);
			}
		}
	};
}
