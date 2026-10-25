<script>
	import { onMount, untrack } from 'svelte';
	import { reducedMotion } from '#lib/labPreferences.js';
	/** @type {{value:number,fromZero?:boolean}} */
	let { value, fromZero = false } = $props();
	let shown = $state(untrack(() => (fromZero ? 0 : value)));
	let ready = $state(false);
	onMount(() => {
		ready = true;
	});
	$effect(() => {
		const target = value;
		if (!ready || $reducedMotion) {
			if (!fromZero || $reducedMotion) shown = target;
			return;
		}
		const start = untrack(() => shown);
		const at = performance.now();
		let frame = 0;
		/** @param {number} time */
		function tick(time) {
			const progress = Math.min(1, (time - at) / 420);
			shown = Math.round(start + (target - start) * (1 - (1 - progress) ** 3));
			if (progress < 1) frame = requestAnimationFrame(tick);
		}
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});
</script>

<span class="number"
	><span aria-hidden="true">{shown}</span><span class="sr-only">{value}</span></span
>

<style>
	.number {
		font-variant-numeric: tabular-nums;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
