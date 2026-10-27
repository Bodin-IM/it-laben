<script>
	import { getContext, onDestroy } from 'svelte';
	import { ADAPTER_VERSION } from '#lib/partnerContext.js';
	import { partnerChannelKey } from '#lib/partnerChannel.js';
	import { lab, learningContext } from '#lib/lab.js';
	/** @type {{pageId:string,values:Record<string,unknown>,running?:boolean}} */
	let { pageId, values, running = false } = $props();
	/** @type {ReturnType<import('#lib/partnerChannel.js').createPartnerChannel>} */
	const channel = getContext(partnerChannelKey);
	const owner = Symbol('partner-source');
	$effect(() => {
		channel.publish(owner, {
			pageId,
			scope: `${$lab.user?.id ?? 'guest'}:${$learningContext.mode}:${$learningContext.openingId ?? ''}`,
			state: { version: ADAPTER_VERSION, values },
			running
		});
	});
	onDestroy(() => channel.release(owner));
</script>
