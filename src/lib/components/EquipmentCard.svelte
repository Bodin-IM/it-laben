<script>
	import EquipmentSymbol from './EquipmentSymbol.svelte';
	/** @type {{document:import('#lib/databaseWorkshop.js').WorkshopDocument, status?:string, selected?:boolean, matches?:boolean|null, inspect?:(()=>void)}} */
	let { document: item, status = '', selected = false, matches = null, inspect } = $props();
</script>

<article class:included={matches === true} class:excluded={matches === false} class:selected>
	<div class="card-top"><EquipmentSymbol category={item.kategori} /><div><small>{item._id}</small><strong>{item.navn}</strong></div></div>
	<dl>
		{#if 'kategori' in item}<div><dt>Kategori</dt><dd>{item.kategori}</dd></div>{/if}
		{#if 'dagspris' in item}<div><dt>Dagspris</dt><dd>{typeof item.dagspris === 'string' ? `"${item.dagspris}" · tekst` : `${item.dagspris} kr · tall`}</dd></div>{/if}
		{#if 'tilgjengelig' in item}<div><dt>Tilgjengelig</dt><dd>{typeof item.tilgjengelig === 'string' ? `"${item.tilgjengelig}" · tekst` : item.tilgjengelig ? 'true · ledig' : 'false · utlånt'}</dd></div>{/if}
	</dl>
	{#if status}<p class="card-status">{status}</p>{/if}
	{#if inspect}<button type="button" onclick={inspect} aria-pressed={selected} aria-label={`Undersøk ${item._id} · ${item.navn}`}>Undersøk dokumentet</button>{/if}
</article>

<style>
	article { padding: 16px; border: 1px solid var(--color-border-strong); border-radius: 12px; background: var(--color-surface); min-width: 0; }
	.card-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
	.card-top > div { min-width: 0; }
	small, strong { display: block; overflow-wrap: anywhere; }
	small { color: var(--color-text-muted); }
	dl { margin: 0; font-size: var(--font-small); }
	dl > div { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 2px 12px; padding-block: 3px; }
	dt { color: var(--color-text-muted); }
	dd { margin: 0; font-weight: 600; }
	.included { border-color: var(--color-success-border); background: var(--color-success-soft); }
	.excluded { border-style: dashed; }
	.selected { outline: 3px solid var(--color-focus); outline-offset: 2px; }
	.card-status { font-weight: 650; margin: 12px 0 0; }
	button { width: 100%; margin-top: 12px; min-height: 44px; padding: 8px; background: var(--color-surface); color: var(--color-accent); border: 1px solid var(--color-border-strong); border-radius: 7px; font: inherit; cursor: pointer; }
	button:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
</style>
