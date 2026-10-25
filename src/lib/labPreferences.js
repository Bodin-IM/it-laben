import { writable, get } from 'svelte/store';

/** @typedef {{sound:boolean,volume:number,reduceMotion:boolean,companion:boolean}} Preferences */
/** @type {Preferences} */
const defaults = { sound: false, volume: 0.25, reduceMotion: false, companion: true };
const state = writable(defaults);
export const labPreferences = { subscribe: state.subscribe };
export const reducedMotion = writable(false);
const storageKey = 'it-laben-experience-v1';
/** @type {MediaQueryList|null} */
let media = null;
/** @type {AudioContext|null} */
let context = null;
let lastSound = -Infinity;

/** @param {unknown} value @returns {Preferences} */
function sanitize(value) {
	const item = /** @type {Partial<Preferences>|null} */ (value);
	return {
		companion: item?.companion !== false,
		sound: item?.sound === true,
		volume:
			typeof item?.volume === 'number' && Number.isFinite(item.volume)
				? Math.max(0, Math.min(0.6, item.volume))
				: defaults.volume,
		reduceMotion: item?.reduceMotion === true
	};
}
function applyMotion() {
	const reduce = get(state).reduceMotion || media?.matches === true;
	reducedMotion.set(reduce);
	document.documentElement.dataset.labMotion = reduce ? 'reduced' : 'normal';
}
export function initializeExperience() {
	media = window.matchMedia('(prefers-reduced-motion: reduce)');
	try {
		state.set(sanitize(JSON.parse(localStorage.getItem(storageKey) || 'null')));
	} catch {
		state.set(defaults);
	}
	applyMotion();
	const gesture = () => {
		if (get(state).sound) void unlockSound();
	};
	/** @param {StorageEvent} event */
	const changed = (event) => {
		if (event.key !== storageKey) return;
		try {
			state.set(sanitize(JSON.parse(event.newValue || 'null')));
			applyMotion();
		} catch {
			/* Keep usable in-memory preferences. */
		}
	};
	media.addEventListener('change', applyMotion);
	window.addEventListener('storage', changed);
	document.addEventListener('pointerdown', gesture, { passive: true });
	document.addEventListener('keydown', gesture);
	return () => {
		media?.removeEventListener('change', applyMotion);
		window.removeEventListener('storage', changed);
		document.removeEventListener('pointerdown', gesture);
		document.removeEventListener('keydown', gesture);
		void context?.close();
		context = null;
	};
}
/** @param {Partial<Preferences>} patch */
export function setLabPreferences(patch) {
	state.set(sanitize({ ...get(state), ...patch }));
	try {
		localStorage.setItem(storageKey, JSON.stringify(get(state)));
	} catch {
		/* Preferences still work for this tab. */
	}
	applyMotion();
	if (get(state).sound) void unlockSound();
}
export async function unlockSound() {
	if (typeof window === 'undefined' || !get(state).sound || typeof AudioContext === 'undefined')
		return;
	try {
		context ??= new AudioContext();
		if (context.state === 'suspended') await context.resume();
	} catch {
		/* Audio is optional, including on managed browsers. */
	}
}

/** @param {'xp'|'achievement'|'level'} kind @param {boolean} [preview] */
export function playRewardSound(kind, preview = false) {
	const preferences = get(state);
	if (
		!preferences.sound ||
		!context ||
		context.state !== 'running' ||
		document.visibilityState !== 'visible'
	)
		return;
	const now = performance.now();
	if (!preview && now - lastSound < 2500) return;
	lastSound = now;
	const notes =
		kind === 'level'
			? [392, 493.88, 587.33, 783.99]
			: kind === 'achievement'
				? [523.25, 659.25, 783.99]
				: [523.25, 659.25];
	try {
		for (const [index, frequency] of notes.entries()) {
			const oscillator = context.createOscillator();
			const gain = context.createGain();
			const at = context.currentTime + index * 0.085;
			oscillator.type = 'sine';
			oscillator.frequency.value = frequency;
			gain.gain.setValueAtTime(0, at);
			gain.gain.linearRampToValueAtTime(preferences.volume * 0.17, at + 0.012);
			gain.gain.exponentialRampToValueAtTime(0.001, at + 0.19);
			oscillator.connect(gain);
			gain.connect(context.destination);
			oscillator.start(at);
			oscillator.stop(at + 0.2);
			oscillator.onended = () => {
				oscillator.disconnect();
				gain.disconnect();
			};
		}
	} catch {
		/* Learning and progress never depend on sound output. */
	}
}
