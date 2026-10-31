import { avatars, defaultAvatarId } from '#lib/avatars.js';
import { writable, get } from 'svelte/store';

/** @typedef {{sound:boolean,volume:number,reduceMotion:boolean,companion:boolean,partnerAvatar:string,partnerScene:string,teacherUnlockTasks:boolean}} Preferences */
/** @type {Preferences} */
const defaults = {
	sound: true,
	volume: 0.25,
	reduceMotion: false,
	companion: true,
	teacherUnlockTasks: true,
	partnerAvatar: defaultAvatarId,
	partnerScene: 'lab'
};
const state = writable(defaults);
export const labPreferences = { subscribe: state.subscribe };
export const experienceReady = writable(false);
export const reducedMotion = writable(false);
const storageKey = 'it-laben-experience-v1';
const legacyVlanSoundKey = 'it-laben-vlan-sound-v1';
/** @typedef {{stop:()=>void,unlock?:()=>void|Promise<unknown>}} SoundPlayer */
/** @type {Set<SoundPlayer>} */
const soundPlayers = new Set();
/** @type {Set<{oscillator:OscillatorNode,gain:GainNode}>} */
const rewardVoices = new Set();
/** @type {MediaQueryList|null} */
let media = null;
/** @type {AudioContext|null} */
let context = null;
let lastSound = -Infinity;

/** @param {unknown} value @returns {Preferences} */
function sanitize(value) {
	const item = /** @type {Partial<Preferences>|null} */ (value);
	return {
		teacherUnlockTasks: item?.teacherUnlockTasks !== false,
		companion: item?.companion !== false,
		partnerAvatar: avatars.some((avatar) => avatar.id === item?.partnerAvatar)
			? (item?.partnerAvatar ?? defaultAvatarId)
			: defaultAvatarId,
		partnerScene: ['lab', 'space', 'garden'].includes(item?.partnerScene ?? '')
			? (item?.partnerScene ?? 'lab')
			: 'lab',
		sound: typeof item?.sound === 'boolean' ? item.sound : defaults.sound,
		volume:
			typeof item?.volume === 'number' && Number.isFinite(item.volume)
				? Math.max(0, Math.min(0.6, item.volume))
				: defaults.volume,
		reduceMotion: item?.reduceMotion === true
	};
}
function readStoredPreferences() {
	let preferences = defaults;
	try { preferences = sanitize(JSON.parse(localStorage.getItem(storageKey) || 'null')); } catch { /* Use defaults. */ }
	try {
		const legacy = localStorage.getItem(legacyVlanSoundKey);
		if (legacy === 'on' || legacy === 'off') {
			// Preserve either previous mute choice when consolidating the two switches.
			preferences = { ...preferences, sound: preferences.sound && legacy !== 'off' };
			localStorage.setItem(storageKey, JSON.stringify(preferences));
			localStorage.removeItem(legacyVlanSoundKey);
		}
	} catch { /* Keep usable in-memory preferences if storage is blocked. */ }
	return preferences;
}
/** Register only while the player is mounted. Muting also cancels pending playback. @param {SoundPlayer} player */
export function registerSoundPlayer(player) {
	soundPlayers.add(player);
	if (!get(state).sound || !get(state).volume) player.stop();
	return () => { soundPlayers.delete(player); };
}
function stopAllSound() {
	for (const { oscillator, gain } of rewardVoices) {
		oscillator.onended = null;
		try { oscillator.stop(); } catch { /* Already stopped. */ }
		oscillator.disconnect();
		gain.disconnect();
	}
	rewardVoices.clear();
	for (const player of soundPlayers) player.stop();
}
function applyPreferences(/** @type {Preferences} */ preferences) {
	const previous = get(state);
	state.set(preferences);
	if (!preferences.sound || !preferences.volume || preferences.volume !== previous.volume) stopAllSound();
	applyMotion();
}
// Invoked directly from a gesture so activity players can unlock their own contexts.
function unlockPlayers() {
	const preferences = get(state);
	if (!preferences.sound || !preferences.volume || document.visibilityState !== 'visible') return;
	void unlockSound();
	for (const player of soundPlayers) {
		try { void Promise.resolve(player.unlock?.()).catch(() => {}); } catch { /* Audio is optional. */ }
	}
}
function applyMotion() {
	const reduce = get(state).reduceMotion || media?.matches === true;
	reducedMotion.set(reduce);
	document.documentElement.dataset.labMotion = reduce ? 'reduced' : 'normal';
}
export function initializeExperience() {
	media = window.matchMedia('(prefers-reduced-motion: reduce)');
	applyPreferences(readStoredPreferences());
	experienceReady.set(true);
	const hidden = () => { if (document.visibilityState !== 'visible') stopAllSound(); };
	/** @param {StorageEvent} event */
	const changed = (event) => {
		if (event.key !== storageKey && event.key !== null) return;
		try {
			applyPreferences(sanitize(JSON.parse(event.newValue || 'null')));
		} catch {
			/* Keep usable in-memory preferences. */
		}
	};
	media.addEventListener('change', applyMotion);
	window.addEventListener('storage', changed);
	document.addEventListener('pointerdown', unlockPlayers, { passive: true });
	document.addEventListener('keydown', unlockPlayers);
	document.addEventListener('visibilitychange', hidden);
	return () => {
		media?.removeEventListener('change', applyMotion);
		window.removeEventListener('storage', changed);
		document.removeEventListener('pointerdown', unlockPlayers);
		document.removeEventListener('keydown', unlockPlayers);
		document.removeEventListener('visibilitychange', hidden);
		stopAllSound();
		if (context) void context.close().catch(() => {});
		context = null;
		experienceReady.set(false);
	};
}
/** @param {Partial<Preferences>} patch */
export function setLabPreferences(patch) {
	applyPreferences(sanitize({ ...get(state), ...patch }));
	try {
		localStorage.setItem(storageKey, JSON.stringify(get(state)));
	} catch {
		/* Preferences still work for this tab. */
	}
	unlockPlayers();
}
export async function unlockSound() {
	if (typeof window === 'undefined' || !get(state).sound || !get(state).volume || typeof AudioContext === 'undefined')
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
		!preferences.volume ||
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
			const voice = { oscillator, gain };
			rewardVoices.add(voice);
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
				rewardVoices.delete(voice);
			};
		}
	} catch {
		/* Learning and progress never depend on sound output. */
	}
}
