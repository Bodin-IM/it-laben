import { writable } from 'svelte/store';

/** @typedef {'light'|'dark'} Theme */
/** @typedef {{mode:Theme, ready:boolean}} ThemeState */

// Keep this key in sync with the early theme script in src/app.html.
export const THEME_STORAGE_KEY = 'it-laben-theme';

/** @type {import('svelte/store').Writable<ThemeState>} */
const state = writable({ mode: 'light', ready: false });
export const theme = { subscribe: state.subscribe };

/** @type {Theme|null} */
let preference = null;

/** @returns {Theme|null} */
function readPreference() {
	try {
		const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
		return stored === 'light' || stored === 'dark' ? stored : null;
	} catch {
		return null;
	}
}

/** @param {Theme} mode */
function applyTheme(mode) {
	document.documentElement.dataset.theme = mode;
	state.set({ mode, ready: true });
}

/** Set up once, from the root layout's onMount, and clean up with that layout. */
export function initializeTheme() {
	const system = window.matchMedia('(prefers-color-scheme: dark)');
	preference = readPreference();
	applyTheme(preference ?? (system.matches ? 'dark' : 'light'));

	function followSystem() {
		if (preference === null) applyTheme(system.matches ? 'dark' : 'light');
	}
	/** @param {StorageEvent} event */
	function synchronizeTabs(event) {
		if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
		// Ignore sessionStorage events, even if someone uses the same key there.
		try {
			if (event.storageArea && event.storageArea !== window.localStorage) return;
		} catch {
			return;
		}
		preference = readPreference();
		applyTheme(preference ?? (system.matches ? 'dark' : 'light'));
	}

	system.addEventListener('change', followSystem);
	window.addEventListener('storage', synchronizeTabs);
	return () => {
		system.removeEventListener('change', followSystem);
		window.removeEventListener('storage', synchronizeTabs);
	};
}

/** @param {Theme} mode */
export function setTheme(mode) {
	if (mode !== 'light' && mode !== 'dark') return;
	preference = mode;
	applyTheme(mode);
	try {
		window.localStorage.setItem(THEME_STORAGE_KEY, mode);
	} catch {
		// The switch still works for this visit if storage is unavailable.
	}
}
