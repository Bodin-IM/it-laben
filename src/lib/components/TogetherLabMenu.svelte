<script>
	import { reducedMotion } from '#lib/labPreferences.js';
	import { togetherHints } from '#lib/vlanTogether.js';
	/** @type {{room:import('#lib/vlanTogether.js').TogetherRoom|null,busy:boolean,uncertain:boolean,onpause:()=>void,onleave:()=>void,oneditor:()=>void,ondocument:()=>void}} */
	let { room, busy, uncertain, onpause, onleave, oneditor, ondocument } = $props();
	const componentId = $props.id();
	const panelId = componentId + '-settings';
	/** @type {HTMLDivElement|undefined} */ let panel = $state();
	/** @type {HTMLButtonElement|undefined} */ let trigger = $state();
	let opened = $state(false);
	function close(restoreFocus = true) {
		if (panel?.matches(':popover-open')) panel.hidePopover();
		if (restoreFocus) trigger?.focus({ preventScroll: true });
	}
	/** @param {() => void} action */
	function choose(action) { close(false); action(); }
</script>

<button class="settings-trigger" bind:this={trigger} popovertarget={panelId} aria-haspopup="dialog" aria-expanded={opened} aria-controls={panelId} aria-label="Innstillinger og hjelp for Nettverksligaen" title="Innstillinger og hjelp">
	<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="m9.5 3-.5 2-2 .9-1.8-.6-2 3.4 1.5 1.5v2.6l-1.5 1.5 2 3.4 1.8-.6 2 .9.5 2h5l.5-2 2-.9 1.8.6 2-3.4-1.5-1.5v-2.6l1.5-1.5-2-3.4-1.8.6-2-.9-.5-2z" />
		<circle cx="12" cy="11.5" r="3" />
	</svg>
</button>
<div class="settings-panel" class:reduced-motion={$reducedMotion} id={panelId} bind:this={panel} popover="auto" role="dialog" aria-labelledby={`${panelId}-title`} ontoggle={() => {
	opened = !!panel?.matches(':popover-open');
	if (opened) panel?.querySelector('button')?.focus({ preventScroll: true });
}}>
	<div class="panel-heading"><h2 id={`${panelId}-title`}>Innstillinger og hjelp</h2><button onclick={() => close()}>Lukk</button></div>
	{#if room}
		<section class="room-info" aria-labelledby={`${panelId}-room`}>
			<h3 id={`${panelId}-room`}>{room.title}</h3>
			<p>{room.members.length}/24 deltakere · {room.paused ? 'På pause' : 'Åpent'}</p>
			<div class="room-actions">
				<button onclick={() => choose(oneditor)}>Enhetsinnstillinger</button>
				<button onclick={() => choose(ondocument)}>Min dokumentasjon</button>
				{#if room.owner}<button disabled={busy || uncertain} onclick={onpause}>{room.paused ? 'Fortsett laben' : 'Sett på pause'}</button>{/if}
				<button disabled={busy} onclick={() => { close(); onleave(); }}>Bytt rom</button>
			</div>
		</section>
	{/if}
	<details>
		<summary>Slik bruker du brettet</summary>
		<p>Bygg ditt nett. Avtal forbindelsen. Få svar fra en medelev. Ditt område ligger nederst på brettet.</p>
		<ul>
			<li>Trykk på en enhet for å åpne innstillingene.</li>
			<li><strong>Kabler:</strong> Fargene hjelper deg å følge forbindelsene; de viser ikke VLAN eller om nettet virker. Pek på eller velg en enhet for å framheve kablene. Pingveien vises også med stiplet strek.</li>
			<li><strong>Flytt:</strong> Dra en egen enhet til en av de åtte plassene i området. Slipp på en annen enhet for å bytte plass. Du kan også velge Flytt, trykke på enheten og deretter målplassen. Escape avbryter.</li>
			<li><strong>Koble kabel:</strong> Velg din enhet og en ledig port, deretter en switch eller ruter. Den andre eieren velger sin port og godtar.</li>
			<li><strong>Ping:</strong> Velg din PC og deretter en annen PC. Alle i rommet kan se pakken og svaret.</li>
			<li><strong>Dokumentasjon:</strong> Skriv navn og notater for ditt område, eller les de andres. Oppsett og notater lagres automatisk.</li>
		</ul>
	</details>
	<details><summary>Hjelp til feilsøking</summary>{#each togetherHints as hint}<p>{hint}</p>{/each}</details>
	<details>
		<summary>Om laben og neste utfordring</summary>
		<p>Forutsi pingresultatet sammen. Ping bruker det automatisk lagrede nettet.</p>
		<p>Dette er et felles, simulert nettverk. Kabler, VLAN, adresser, gateway og statiske /24-ruter styrer kommunikasjonen. Ingen pakker sendes til virkelige nettverksenheter.</p>
		<p>Neste utfordring: lag to ulike IP-nett, legg til rutere og avtal et transportnett mellom dem. Få ping og returvei til å virke. Dokumenter én feil, rettingen og hvorfor den virket.</p>
		<p>Ingen XP eller automatisk godkjenning av forståelse. Forklar portvalgene og pakkeveien for en medelev.</p>
		<p>Første versjon har ikke DHCP, DNS, Wi-Fi, NAT, brannmur eller STP. Switch-løkker avvises. Bare medlemmer i rommet ser brettet; alle medlemmer kan undersøke konfigurasjonen.</p>
	</details>
	<div class="related"><a href="/nettverk/vlan-2/">Repeter VLAN og ruting →</a><a href="/?fag=drift#utforsk">← Driftsstøtte</a></div>
</div>

<style>
	button { font:inherit; min-height:44px; border:1px solid var(--color-border-strong); border-radius:8px; padding:.55rem .7rem; color:var(--color-text); background:var(--color-surface); cursor:pointer; }
	button:hover:not(:disabled) { background:var(--color-surface-hover); } button:disabled { opacity:.6; cursor:default; }
	.settings-trigger { display:inline-flex; align-items:center; justify-content:center; width:44px; flex-shrink:0; }
	.settings-trigger[aria-expanded="true"] { color:var(--color-accent); border-color:var(--color-accent); }
	.settings-panel { box-sizing:border-box; position:fixed; inset:.75rem .75rem auto auto; margin:0; width:24rem; max-width:calc(100vw - 1.5rem); max-height:calc(100dvh - 1.5rem); overflow:auto; overscroll-behavior:contain; padding:1rem; border:1px solid var(--color-border-strong); border-radius:12px; background:var(--color-surface); color:var(--color-text); box-shadow:0 8px 30px #0003; opacity:0; transform:translateX(1rem); transition:opacity 160ms ease,transform 160ms ease,display 160ms allow-discrete,overlay 160ms allow-discrete; }
	.settings-panel:popover-open { opacity:1; transform:translateX(0); }
	@starting-style { .settings-panel:popover-open { opacity:0; transform:translateX(1rem); } }
	.settings-panel.reduced-motion { transition:none; transform:none; }
	.panel-heading { display:flex; align-items:center; justify-content:space-between; gap:.75rem; }
	h2 { font-size:1.15rem; margin:0; } h3 { font-size:1.05rem; margin:0; overflow-wrap:anywhere; }
	p, li { font-size:var(--font-small); line-height:1.55; } p { margin:.65rem 0; } ul { padding-left:1.3rem; } li + li { margin-top:.6rem; }
	.room-info { margin:1rem 0; } .room-info > p { color:var(--color-text-muted); }
	.room-actions { display:grid; gap:.5rem; } .room-actions button { text-align:left; }
	details, .related { border-top:1px solid var(--color-border); }
	summary { cursor:pointer; min-height:44px; box-sizing:border-box; padding:.7rem 0; font-weight:650; color:var(--color-accent); }
	.related { display:grid; gap:.35rem; padding-top:.5rem; } a { color:var(--color-accent); text-underline-offset:4px; padding:.65rem 0; }
	:where(button,a,summary):focus-visible { outline:3px solid var(--color-focus); outline-offset:3px; }
	@media(prefers-reduced-motion:reduce) { .settings-panel { transition:none; transform:none; } }
</style>
