/** Short, quiet feedback following an explicit VLAN check. No audio files or background sound. */
export function createVlanAudio() {
	/** @type {AudioContext|null} */
	let context = null;
	/** @type {Set<{oscillator:OscillatorNode,gain:GainNode}>} */
	const voices = new Set();
	let request = 0;
	let disposed = false;

	function stop() {
		request += 1;
		for (const { oscillator, gain } of voices) {
			oscillator.onended = null;
			try { oscillator.stop(); } catch { /* Already stopped. */ }
			oscillator.disconnect();
			gain.disconnect();
		}
		voices.clear();
	}

	/** @param {boolean} passed */
	async function play(passed) {
		stop();
		if (disposed || typeof window === 'undefined' || typeof AudioContext === 'undefined' || document.visibilityState !== 'visible') return;
		const currentRequest = request;
		try {
			const audio = context ??= new AudioContext();
			if (audio.state === 'suspended') await audio.resume();
			// A pending resume must not play an old result after mute, edits or navigation.
			if (disposed || currentRequest !== request || audio.state !== 'running' || document.visibilityState !== 'visible') return;
			const notes = passed ? [523.25, 659.25, 783.99] : [329.63, 246.94];
			const duration = passed ? 0.18 : 0.14;
			for (const [index, frequency] of notes.entries()) {
				const oscillator = audio.createOscillator();
				const gain = audio.createGain();
				const voice = { oscillator, gain };
				voices.add(voice);
				const at = audio.currentTime + index * 0.09;
				oscillator.type = 'sine';
				oscillator.frequency.value = frequency;
				gain.gain.setValueAtTime(0, at);
				gain.gain.linearRampToValueAtTime(passed ? 0.04 : 0.03, at + 0.012);
				gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
				oscillator.connect(gain).connect(audio.destination);
				oscillator.onended = () => {
					oscillator.disconnect();
					gain.disconnect();
					voices.delete(voice);
				};
				oscillator.start(at);
				oscillator.stop(at + duration + 0.01);
			}
		} catch {
			if (currentRequest === request) stop();
			// The visual result and progress never depend on browser audio support.
		}
	}

	return {
		play,
		stop,
		destroy() {
			disposed = true;
			stop();
			if (context) void context.close().catch(() => {});
			context = null;
		}
	};
}
