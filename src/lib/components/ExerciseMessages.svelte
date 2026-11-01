<script>
	import { messageChanges, messageList } from '#lib/exercisePlayground.js';
	/** @type {{title:string,before:unknown,after:unknown,ran:boolean}} */
	let { title, before, after, ran } = $props();
	const changes = $derived(messageChanges(before, after));
	const previous = $derived(messageList(before));
</script>

<section aria-label={title}>
	<header><h3>{title}</h3><span>{#if changes.messages}{#if ran && previous && previous.length !== changes.messages.length}{previous.length} → {/if}{changes.messages.length} meldinger{:else}Ingen liste{/if}</span></header>
	{#if changes.messages}
		<ul>
			{#each changes.messages as message (message.id)}
				<li class:changed={ran && !!message.change}>
					<div><strong>{message.avsender}</strong><code>{message.id}</code>{#if ran && message.change}<span class="badge">{message.change}</span>{/if}</div>
					<p>{message.tekst.length > 100 ? `${message.tekst.slice(0, 100)}…` : message.tekst}</p>
					{#if message.tekst.length > 100}<details><summary>Vis hele meldingen ({message.tekst.length} tegn)</summary><p>{message.tekst}</p></details>{/if}
				</li>
			{:else}<li class="empty">Listen er tom.</li>{/each}
			{#each changes.removed as message (message.id)}
				<li class="removed"><div><strong>{message.avsender}</strong><code>{message.id}</code><span class="badge">Fjernet</span></div><p><s>{message.tekst}</s></p></li>
			{/each}
		</ul>
	{:else}
		<p class="empty">{after === null ? (title.startsWith('Filen') ? 'Filen finnes ikke.' : 'Ingen meldinger er lest inn.') : 'Innholdet kan ikke leses som en meldingsliste. Åpne data og kode for å undersøke.'}</p>
	{/if}
</section>

<style>
	section { min-width: 0; border: 1px solid var(--color-border); border-radius: var(--radius-card); background: var(--color-surface-soft); overflow: hidden; }
	header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; padding: 14px; border-bottom: 1px solid var(--color-border); }
	h3 { margin: 0; font-size: 1rem; }
	header span, code, .badge { font-size: var(--font-small); }
	ul { list-style: none; padding: 12px; margin: 0; display: grid; gap: 10px; }
	li { padding: 12px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); }
	li > div { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; }
	p { margin: 6px 0 0; overflow-wrap: anywhere; white-space: pre-wrap; font-size: var(--font-body); line-height: var(--leading-body); }
	.changed { border-left: 4px solid var(--color-info); }
	.badge { font-weight: 700; margin-left: auto; }
	.removed { border-style: dashed; }
	.empty { padding: 16px; color: var(--color-text-muted); }
	summary { display: flex; align-items: center; min-height: 44px; cursor: pointer; color: var(--color-action); }
	summary:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 2px; }
</style>
