import test from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'svelte/store';
import {
	labPreferences, experienceReady, initializeExperience, setLabPreferences,
	registerSoundPlayer, unlockSound, playRewardSound
} from '../src/lib/labPreferences.js';
import { createVlanAudio } from '../src/lib/vlanAudio.js';
import { createNightwatchAudio } from '../src/lib/nightwatchAudio.js';

const key = 'it-laben-experience-v1';
const legacyKey = 'it-laben-vlan-sound-v1';

function browser(t, entries = {}, { blocked = false, pendingResume = false } = {}) {
	const storage = new Map(Object.entries(entries));
	const contexts = [];
	const cleanups = [];
	const window = new EventTarget();
	window.matchMedia = () => Object.assign(new EventTarget(), { matches: false });
	const document = Object.assign(new EventTarget(), {
		visibilityState: 'visible', documentElement: { dataset: {} }
	});
	function param() {
		return {
			value: 0, peaks: [],
			setValueAtTime(value) { this.value = value; },
			linearRampToValueAtTime(value) { this.peaks.push(value); this.value = value; },
			exponentialRampToValueAtTime(value) { this.value = value; },
			setTargetAtTime(value) { this.value = value; },
			cancelScheduledValues() {}
		};
	}
	function node() {
		return {
			gain: param(), frequency: param(), starts: 0, stops: 0, disconnected: false,
			connect(other) { return other; },
			disconnect() { this.disconnected = true; },
			start() { this.starts++; }, stop() { this.stops++; }
		};
	}
	class AudioContext {
		state = pendingResume ? 'suspended' : 'running';
		currentTime = 0;
		destination = {};
		oscillators = [];
		gains = [];
		constructor() { contexts.push(this); }
		createOscillator() { const item = node(); this.oscillators.push(item); return item; }
		createGain() { const item = node(); this.gains.push(item); return item; }
		createBiquadFilter() { return node(); }
		createDynamicsCompressor() { return node(); }
		resume() {
			if (!pendingResume) { this.state = 'running'; return Promise.resolve(); }
			return new Promise((resolve) => {
				this.finishResume = () => {
					if (this.state !== 'closed') this.state = 'running';
					resolve();
				};
			});
		}
		close() { this.state = 'closed'; return Promise.resolve(); }
	}
	const globals = {
		window, document, AudioContext,
		localStorage: {
			getItem(name) { if (blocked) throw new Error('Blocked'); return storage.get(name) ?? null; },
			setItem(name, value) { if (blocked) throw new Error('Blocked'); storage.set(name, value); },
			removeItem(name) { if (blocked) throw new Error('Blocked'); storage.delete(name); }
		}
	};
	const previous = Object.fromEntries(Object.keys(globals).map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
	for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { configurable: true, value });
	t.after(() => {
		try { for (const cleanup of cleanups.reverse()) cleanup(); }
		finally {
			for (const [name, descriptor] of Object.entries(previous)) {
				if (descriptor) Object.defineProperty(globalThis, name, descriptor);
				else delete globalThis[name];
			}
		}
	});
	const cleanup = (fn) => cleanups.push(fn);
	cleanup(initializeExperience());
	return { storage, contexts, window, document, cleanup };
}

test('felles lyd: på som standard, uten avspilling ved innlasting', (t) => {
	const env = browser(t);
	assert.equal(get(experienceReady), true);
	assert.equal(get(labPreferences).sound, true);
	assert.equal(env.contexts.length, 0);
	let unlocked = 0;
	env.cleanup(registerSoundPlayer({ stop() {}, unlock() { unlocked++; } }));
	assert.equal(unlocked, 0);
	env.document.dispatchEvent(new Event('pointerdown'));
	assert.equal(unlocked, 1);
});

test('felles lyd: migrering bevarer demping og øvrige innstillinger', async (t) => {
	for (const [shared, legacy, expected] of [
		[undefined, 'off', false], [true, 'off', false], [false, 'on', false],
		[true, 'on', true], [false, undefined, false]
	]) {
		await t.test(`felles=${shared}, VLAN=${legacy}`, (t) => {
			const entries = { [key]: JSON.stringify({ sound: shared, volume: 0.4, companion: false, reduceMotion: true }) };
			if (legacy !== undefined) entries[legacyKey] = legacy;
			const env = browser(t, entries);
			assert.equal(get(labPreferences).sound, expected);
			assert.equal(get(labPreferences).volume, 0.4);
			assert.equal(get(labPreferences).companion, false);
			assert.equal(get(labPreferences).reduceMotion, true);
			assert.equal(env.storage.has(legacyKey), false);
			if (legacy) assert.equal(JSON.parse(env.storage.get(key)).sound, expected);
			setLabPreferences({ sound: !expected });
			assert.equal(JSON.parse(env.storage.get(key)).sound, !expected);
		});
	}
});

test('felles lyd: sperret lagring tillater demping i den åpne fanen', (t) => {
	browser(t, {}, { blocked: true });
	assert.doesNotThrow(() => setLabPreferences({ sound: false }));
	assert.equal(get(labPreferences).sound, false);
});

test('felles lyd: annen fane og skjult side stopper registrerte avspillere', (t) => {
	const env = browser(t);
	let stopped = 0, unlocked = 0;
	const unregister = registerSoundPlayer({ stop() { stopped++; }, unlock() { unlocked++; } });
	env.cleanup(unregister);
	env.window.dispatchEvent(Object.assign(new Event('storage'), { key, newValue: JSON.stringify({ sound: false }) }));
	assert.equal(get(labPreferences).sound, false);
	assert.equal(stopped, 1);
	env.document.dispatchEvent(new Event('keydown'));
	assert.equal(unlocked, 0);
	env.window.dispatchEvent(Object.assign(new Event('storage'), { key, newValue: JSON.stringify({ sound: true }) }));
	assert.equal(unlocked, 0, 'Endring fra en annen fane er ikke en lydgest');
	env.document.visibilityState = 'hidden';
	env.document.dispatchEvent(new Event('visibilitychange'));
	assert.equal(stopped, 2);
	unregister();
	setLabPreferences({ sound: false });
	assert.equal(stopped, 2, 'En forlatt aktivitet mottar ikke flere lydhendelser');
});

test('felles lyd: demping stopper belønning og VLAN-toner umiddelbart', async (t) => {
	const env = browser(t);
	const vlan = createVlanAudio();
	env.cleanup(() => vlan.destroy());
	env.cleanup(registerSoundPlayer(vlan));
	await unlockSound();
	playRewardSound('achievement', true);
	await vlan.play(true, get(labPreferences).volume);
	const voices = env.contexts.flatMap((context) => context.oscillators);
	assert.equal(voices.length, 6);
	setLabPreferences({ sound: false });
	assert.ok(voices.every((voice) => voice.disconnected && voice.stops === 2));
	playRewardSound('level', true);
	setLabPreferences({ sound: true });
	assert.equal(env.contexts.flatMap((context) => context.oscillators).length, 6, 'Påslag gjentar ikke gamle resultater');
});

test('VLAN: global demping avbryter ventende resume; felles volum skalerer tonen', async (t) => {
	const env = browser(t, {}, { pendingResume: true });
	const vlan = createVlanAudio();
	env.cleanup(() => vlan.destroy());
	env.cleanup(registerSoundPlayer(vlan));
	const pending = vlan.play(true);
	setLabPreferences({ sound: false });
	env.contexts[0].finishResume();
	await pending;
	assert.equal(env.contexts[0].oscillators.length, 0);
	await vlan.play(true, 0);
	assert.equal(env.contexts[0].oscillators.length, 0);
	setLabPreferences({ sound: true, volume: 0.5 });
	await vlan.play(true, get(labPreferences).volume);
	assert.deepEqual(env.contexts[0].gains.map((gain) => gain.gain.peaks), [[0.08], [0.08], [0.08]]);
});

test('Nattevakten: global demping stilner lydbildet og navigasjon avbryter ventende lydstart', async (t) => {
	const env = browser(t, {}, { pendingResume: true });
	t.mock.method(globalThis, 'setInterval', () => 0);
	const night = createNightwatchAudio();
	env.cleanup(() => night.destroy());
	env.cleanup(registerSoundPlayer({ stop: () => night.mute() }));
	const pending = night.enable();
	night.update(120000, 480000, 0.25, true);
	const master = env.contexts[0].gains[0];
	assert.ok(master.gain.value > 0);
	setLabPreferences({ sound: false });
	assert.equal(master.gain.value, 0);
	night.destroy();
	env.contexts[0].finishResume();
	assert.equal(await pending, false);
	assert.equal(await night.enable(), false, 'En forlatt aktivitet kan ikke opprette ny lyd');
});
