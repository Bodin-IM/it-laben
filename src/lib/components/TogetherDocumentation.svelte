<script>
	import { tick, untrack } from 'svelte';
	/** @typedef {import('#lib/vlanTogether.js').AreaDocument} AreaDocument */
	/** @type {{room:import('#lib/vlanTogether.js').TogetherRoom,memberId:string,disabled:boolean,onsave:(document:AreaDocument)=>Promise<boolean>,onselect:(id:string)=>void,ondirty:(dirty:boolean)=>void}} */
	let { room, memberId, disabled, onsave, onselect, ondirty } = $props();
	const mine = $derived(room.members.find((m) => m.id === room.me));
	const member = $derived(room.members.find((m) => m.id === memberId) ?? mine);
	const own = $derived(member?.id === room.me);
	function saved() { return { areaName: mine?.areaName ?? '', notes: mine?.notes ?? '', revision: mine?.documentRevision ?? 0 }; }
	let baseline = $state(untrack(saved));
	let draft = $state(untrack(saved));
	let saving = $state(false), status = $state('');
	const dirty = $derived(draft.areaName !== baseline.areaName || draft.notes !== baseline.notes);
	const conflict = $derived(draft.revision !== mine?.documentRevision);
	function load() { baseline = saved(); draft = saved(); status = ''; }
	$effect(() => {
		// Fresh reads can update an untouched form, but never replace an unsaved draft.
		if (mine && mine.documentRevision !== baseline.revision && (!dirty || mine.areaName === draft.areaName.trim() && mine.notes === draft.notes)) {
			untrack(() => { load(); status = 'Lagret. De andre i rommet kan lese dokumentasjonen.'; });
		}
	});
	$effect(() => { const changed = dirty; untrack(() => ondirty(changed)); });
	async function save() {
		if (disabled || saving || !dirty || conflict) return;
		saving = true; status = 'Lagrer …';
		const ok = await onsave({ ...draft });
		await tick();
		if (ok) { load(); status = 'Lagret. De andre i rommet kan lese dokumentasjonen.'; }
		else status = 'Ikke lagret. Utkastet er beholdt. Se feilmeldingen og prøv igjen.';
		saving = false;
	}
</script>

<section class="documentation" aria-labelledby="documentation-title">
	<div class="heading"><h2 id="documentation-title" tabindex="-1">{own ? 'Ditt område · notater og dokumentasjon' : `Dokumentasjon · ${member?.areaName || member?.name || 'området'}`}</h2>
		<label>Vis område<select value={member?.id} onchange={(event) => onselect(event.currentTarget.value)}>{#each room.members as item (item.id)}<option value={item.id}>{item.id === room.me ? 'Ditt område' : item.name}{item.areaName ? ` · ${item.areaName}` : ''}</option>{/each}</select></label>
	</div>
	{#if own}
		<form onsubmit={(event) => { event.preventDefault(); void save(); }}>
			<div class="fields"><div><label for="area-name">Navn på området ditt</label><input id="area-name" bind:value={draft.areaName} maxlength="40" placeholder="For eksempel: Pakkeparadiset" disabled={disabled || saving} oninput={() => status = ''} /><p>Navnet vises på brettet. Notatene deles med de andre i rommet når du lagrer.</p></div>
			<div><label for="area-notes">Notater og dokumentasjon</label><textarea id="area-notes" bind:value={draft.notes} maxlength="2000" rows="6" placeholder={'VLAN og IP-nett:\nPorter vi bruker:\nDette testet vi – og dette fant vi ut:'} disabled={disabled || saving} oninput={() => status = ''}></textarea><small>{draft.notes.length}/2000 tegn</small></div></div>
			{#if conflict}<p class="warning" role="status">En nyere versjon er lagret i en annen fane. Kopier det du vil beholde før du henter lagret tekst.</p>{/if}
			<div class="save-row"><button class="primary" disabled={disabled || saving || !dirty || conflict}>{saving ? 'Lagrer …' : 'Lagre dokumentasjon'}</button><button type="button" disabled={saving || disabled} onclick={() => { if (!dirty || confirm('Erstatte dine ulagrede notater med lagret dokumentasjon?')) load(); }}>Hent lagret tekst</button><span role="status">{status || (dirty ? 'Ulagrede endringer' : 'Ingen ulagrede endringer')}</span></div>
		</form>
	{:else if member}
		<div class="peer-heading"><p>Området til {member.name} · Bare eieren kan redigere.</p><button onclick={() => onselect(room.me)}>Til mine notater{dirty ? ' · ulagret' : ''}</button></div>
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
	.primary { background:var(--color-action); color:var(--color-on-action); border-color:var(--color-action); } .primary:hover:not(:disabled) { background:var(--color-action-hover); }
	.fields { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,2fr); gap:1.2rem; margin:1rem 0 .5rem; }
	p, small, .save-row span { font-size:var(--font-small); line-height:1.5; color:var(--color-text-muted); } .save-row { justify-content:flex-start; }
	.notes { white-space:pre-wrap; overflow-wrap:anywhere; color:var(--color-text); font-size:var(--font-body); }
	.warning { color:var(--color-warning); background:var(--color-warning-soft); padding:.7rem; border-radius:8px; }
	:where(button,input,textarea,select,[tabindex]):focus-visible { outline:3px solid var(--color-focus); outline-offset:3px; }
	@media(max-width:640px) { .fields { grid-template-columns:minmax(0,1fr); } .heading { align-items:stretch; flex-direction:column; } }
</style>
