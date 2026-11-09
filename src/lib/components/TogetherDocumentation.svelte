<script>
	/** @typedef {import('#lib/vlanTogether.js').AreaDocument} AreaDocument */
	/** @type {{room:import('#lib/vlanTogether.js').TogetherRoom,memberId:string,draft:AreaDocument,dirty:boolean,disabled:boolean,status:string,conflict:boolean,onedit:(patch:Partial<AreaDocument>)=>void,onreload:()=>void,onselect:(id:string)=>void}} */
	let { room, memberId, draft, dirty, disabled, status, conflict, onedit, onreload, onselect } = $props();
	const member = $derived(room.members.find((m) => m.id === memberId) ?? room.members.find((m) => m.id === room.me));
	const own = $derived(member?.id === room.me);
</script>

<section class="documentation" id="documentation-panel" aria-labelledby="documentation-title">
	<div class="heading"><h2 id="documentation-title" tabindex="-1">{own ? 'Ditt område · notater og dokumentasjon' : `Dokumentasjon · ${member?.areaName || member?.name || 'området'}`}</h2>
		<label>Vis område<select value={member?.id} onchange={(event) => onselect(event.currentTarget.value)}>{#each room.members as item (item.id)}<option value={item.id}>{item.id === room.me ? 'Ditt område' : item.name}{item.areaName ? ` · ${item.areaName}` : ''}</option>{/each}</select></label>
	</div>
	{#if own}
		<div class="fields"><div><label for="area-name">Navn på området ditt</label><input id="area-name" value={draft.areaName} oninput={(event) => onedit({ areaName: event.currentTarget.value })} maxlength="40" placeholder="For eksempel: Pakkeparadiset" {disabled} /><p>Navn og notater lagres automatisk og deles med rommet.</p></div>
		<div><label for="area-notes">Notater og dokumentasjon</label><textarea id="area-notes" value={draft.notes} oninput={(event) => onedit({ notes: event.currentTarget.value })} maxlength="2000" rows="6" placeholder={'VLAN og IP-nett:\nPorter vi bruker:\nDette testet vi – og dette fant vi ut:'} {disabled}></textarea><small>{draft.notes.length}/2000 tegn</small></div></div>
		<div class="save-row"><span role="status">{status}</span>{#if conflict}<button disabled={disabled} onclick={onreload}>Hent lagret tekst</button>{/if}</div>
		{#if conflict}<p class="warning">En nyere versjon er lagret i en annen fane. Kopier det du vil beholde før du henter lagret tekst.</p>{/if}
	{:else if member}
		<div class="peer-heading"><p>Området til {member.name} · Bare eieren kan redigere.</p><button onclick={() => onselect(room.me)}>Til mine notater{dirty ? ' · lagring gjenstår' : ''}</button></div>
		<textarea class="notes" readonly rows="6" aria-label={`Dokumentasjon fra ${member.name}`} value={member.notes || 'Ingen dokumentasjon er lagret ennå.'}></textarea>
	{/if}
</section>

<style>
	.documentation { border:1px solid var(--color-border); background:var(--color-surface); border-radius:12px; padding:1.2rem; margin-bottom:1.2rem; min-width:0; }
	.heading, .peer-heading, .save-row { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.8rem; }
	h2 { font-size:1.2rem; margin:0; overflow-wrap:anywhere; } .heading > label { max-width:100%; min-width:min(100%,16rem); }
	label { display:block; font-size:var(--font-small); font-weight:650; margin-bottom:.3rem; }
	input, textarea, select, button { font:inherit; color:var(--color-text); background:var(--color-surface); border:1px solid var(--color-border-strong); border-radius:7px; padding:.55rem .7rem; min-height:44px; box-sizing:border-box; }
	input, textarea, select { display:block; width:100%; margin-top:.3rem; } textarea { resize:vertical; line-height:1.5; }
	button { cursor:pointer; } button:hover:not(:disabled) { background:var(--color-surface-hover); } button:disabled { opacity:.6; cursor:default; }
	.fields { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,2fr); gap:1.2rem; margin:1rem 0 .5rem; }
	p, small, .save-row span { font-size:var(--font-small); line-height:1.5; color:var(--color-text-muted); } .save-row { justify-content:flex-start; }
	.notes { white-space:pre-wrap; overflow-wrap:anywhere; color:var(--color-text); font-size:var(--font-body); }
	.warning { color:var(--color-warning); background:var(--color-warning-soft); padding:.7rem; border-radius:8px; }
	:where(button,input,textarea,select,[tabindex]):focus-visible { outline:3px solid var(--color-focus); outline-offset:3px; }
	@media(max-width:640px) { .fields { grid-template-columns:minmax(0,1fr); } .heading { align-items:stretch; flex-direction:column; } }
</style>
