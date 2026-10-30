<script>
	import { page } from '$app/state';
	import { connection } from '#lib/connection.js';
	import { moduler } from '#lib/moduler.js';
	import { publicationFor } from '#lib/modulePublication.js';
	import { modulePublication } from '#lib/modulePublicationStore.js';

	/** @type {{subject:{id:string,navn:string}}} */
	let { subject } = $props();
	const modules = $derived(
		$modulePublication.ready && !$connection.publicHttp
			? moduler.filter(
					(module) => module.subject === subject.id &&
						publicationFor(module.id, $modulePublication.modules).status === 'active'
				)
			: []
	);
</script>

{#if modules.length}
	<ul aria-label={`Moduler i ${subject.navn}`} role="list">
		{#each modules as module (module.id)}
			<li>
				<a href={`/moduler/${module.id}/`}
					aria-current={page.url.pathname === `/moduler/${module.id}/` ? 'page' : undefined}
					>{module.title}</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	ul {
		list-style: none;
		margin: 0 0 4px var(--module-link-indent, 16px);
		padding: 0;
	}
	a {
		display: flex;
		align-items: center;
		box-sizing: border-box;
		min-height: 44px;
		padding: 8px var(--module-link-padding, 12px);
		border-radius: 8px;
		color: var(--color-text);
		font-size: var(--font-small);
		overflow-wrap: anywhere;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	a:hover {
		background: var(--color-surface-soft);
		color: var(--color-accent);
	}
	a[aria-current] {
		background: var(--color-accent-soft);
		color: var(--color-accent);
		font-weight: 650;
	}
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
</style>
