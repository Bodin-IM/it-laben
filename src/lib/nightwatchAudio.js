/** A local, quiet electronic soundscape. No downloads, autoplay or background-tab audio. */
export function createNightwatchAudio() {
	/** @type {AudioContext|null} */
	let context = null;
	/** @type {GainNode|null} */
	let master = null;
	/** @type {BiquadFilterNode|null} */
	let filter = null;
	/** @type {ReturnType<typeof setInterval>|null} */
	let timer = null;
	let active = false;
	let volume = 0.25;
	let remaining = 480000;
	let duration = 480000;
	let nextBeat = 0;
	let beat = 0;
	const notes = [110, 130.82, 164.82, 130.82];
	function tick() {
		if (!context || !master || !filter) return;
		const audible = active && document.visibilityState === 'visible';
		master.gain.setTargetAtTime(audible ? volume * 0.42 : 0, context.currentTime, 0.12);
		if (!audible || context.state !== 'running') {
			nextBeat = context.currentTime;
			return;
		}
		// The deadline stays fixed. Only rhythm and tone become more urgent.
		const progress = 1 - Math.max(0, Math.min(1, remaining / duration));
		const urgency =
			remaining <= 60000
				? 1
				: remaining <= 180000
					? 0.55 + ((180000 - remaining) / 120000) * 0.35
					: progress * 0.55;
		const bpm = 52 + urgency * 58;
		filter.frequency.setTargetAtTime(450 + urgency * 1100, context.currentTime, 0.8);
		nextBeat = Math.max(nextBeat, context.currentTime + 0.01);
		while (nextBeat < context.currentTime + 0.15) {
			const oscillator = context.createOscillator();
			const gain = context.createGain();
			oscillator.type = 'triangle';
			oscillator.frequency.value = notes[beat++ % notes.length] * (remaining <= 60000 ? 2 : 1);
			gain.gain.setValueAtTime(0, nextBeat);
			gain.gain.linearRampToValueAtTime(0.11 + urgency * 0.07, nextBeat + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, nextBeat + 0.29);
			oscillator.connect(gain).connect(filter);
			oscillator.start(nextBeat);
			oscillator.stop(nextBeat + 0.31);
			oscillator.onended = () => {
				oscillator.disconnect();
				gain.disconnect();
			};
			nextBeat += 60 / bpm;
		}
	}
	document.addEventListener('visibilitychange', tick);
	return {
		async enable() {
			if (typeof AudioContext === 'undefined') return false;
			try {
				if (!context) {
					context = new AudioContext();
					master = context.createGain();
					master.gain.value = 0;
					filter = context.createBiquadFilter();
					filter.type = 'lowpass';
					filter.frequency.value = 450;
					const limiter = context.createDynamicsCompressor();
					filter.connect(master).connect(limiter).connect(context.destination);
					for (const frequency of [55, 82.41, 110.1]) {
						const oscillator = context.createOscillator();
						const gain = context.createGain();
						oscillator.type = 'sine';
						oscillator.frequency.value = frequency;
						gain.gain.value = 0.035;
						oscillator.connect(gain).connect(filter);
						oscillator.start();
					}
					// A faint, slowly swelling upper layer remains audible on laptop speakers.
					for (const frequency of [220.2, 329.63]) {
						const pad = context.createOscillator();
						const gain = context.createGain();
						const swell = context.createOscillator();
						const depth = context.createGain();
						pad.frequency.value = frequency;
						gain.gain.value = 0.01;
						swell.frequency.value = 0.07;
						depth.gain.value = 0.004;
						swell.connect(depth).connect(gain.gain);
						pad.connect(gain).connect(filter);
						pad.start();
						swell.start();
					}
					timer = setInterval(tick, 100);
				}
				await context.resume();
				tick();
				return context.state === 'running';
			} catch {
				return false;
			}
		},
		/** @param {number} left @param {number} total @param {number} level @param {boolean} playing */
		update(left, total, level, playing) {
			remaining = left;
			duration = total;
			volume = Math.max(0, Math.min(0.6, level));
			active = playing && left > 0;
			tick();
		},
		destroy() {
			document.removeEventListener('visibilitychange', tick);
			active = false;
			if (timer) clearInterval(timer);
			if (master && context) master.gain.value = 0;
			void context?.close();
			context = null;
			master = null;
			filter = null;
		}
	};
}
