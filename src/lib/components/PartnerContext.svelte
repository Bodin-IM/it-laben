<script>
	import { getContext, onDestroy } from 'svelte';
	import { ADAPTER_VERSION } from '#lib/partnerContext.js';
	import { partnerChannelKey } from '#lib/partnerChannel.js';
	import { lab, learningContext } from '#lib/lab.js';
	/** @type {{pageId:string,values:Record<string,unknown>,running?:boolean,localTaskKey?:string}} */
	let { pageId, values, running = false, localTaskKey } = $props();
	/** @type {ReturnType<import('#lib/partnerChannel.js').createPartnerChannel>} */
	const channel = getContext(partnerChannelKey);
	const owner = Symbol('partner-source');
	$effect(() => {
		channel.publish(owner, {
			pageId,
			scope: `${$lab.user?.id ?? 'guest'}:${$learningContext.mode}:${$learningContext.openingId ?? ''}`,
			state: { version: ADAPTER_VERSION, values },
			localTaskKey,
			running
		});
	});
	onDestroy(() => channel.release(owner));
</script>
