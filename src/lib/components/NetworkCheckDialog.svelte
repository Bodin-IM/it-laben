<script>
	/** @typedef {{deviceId:string,portId?:string,label:string}} Target */
	/** @typedef {{label:string,ok:boolean,error?:string,targets:Target[]}} Row */
	/** @type {{open?:boolean,title:string,rows:Row[],stale:boolean,status?:string,nextLabel?:string,nextDisabled?:boolean,onnext:()=>void,oninspect:(target:Target)=>void}} */
	let { open = $bindable(false), title, rows, stale, status = '', nextLabel = '', nextDisabled = false, onnext, oninspect } = $props();
	/** @type {HTMLDialogElement | undefined} */
	let dialog = $state();
	let showAll = $state(false);
	const failed = $derived(rows.filter((row) => !row.ok));
	const passed = $derived(rows.length > 0 && !failed.length && !stale);
	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) { showAll = false; dialog.showModal(); }
		else if (!open && dialog.open) dialog.close();
	});
	function close() {
		dialog?.close();
		open = false;
	}
</script>

<dialog bind:this={dialog} aria-labelledby="network-check-title" aria-describedby="network-check-task"
	oncancel={() => (open = false)} onclose={() => { if (!dialog?.open) open = false; }}>
	<div class="dialog-content">
		<header>
			<div>
				<p id="network-check-task">{title}</p>
				<h2 id="network-check-title" class:success={passed} class:failure={rows.length > 0 && !passed && !stale}>
					{!rows.length ? 'Kontroll ikke fullført' : stale ? 'Tidligere kontroll' : passed ? '✓ Bestått' : '× Ikke bestått'}{#if rows.length} · {rows.length - failed.length}/{rows.length}{/if}
				</h2>
			</div>
			<button type="button" onclick={close} aria-label="Lukk kontrollresultatet">×</button>
		</header>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (The bounded result region must be scrollable with a keyboard.) -->
		<div class="body" role="region" aria-label="Detaljer fra kontrollen" tabindex="0">
			{#if stale && rows.length}<p>Oppsettet er endret. Kontroller på nytt for et oppdatert resultat.</p>{/if}
			{#if failed.length}
				<h3>{stale ? 'Feil i forrige kontroll:' : 'Hva som er feil:'}</h3>
				<ul>
					{#each showAll ? failed : failed.slice(0, 3) as row}<li>
						<p>{row.error ?? 'Kravet er ikke oppfylt. Undersøk innstillingene og kjør ping for å finne stoppstedet.'}</p>
						{#if !stale}<div class="targets">{#each row.targets as target}
							<button type="button" onclick={() => { close(); oninspect(target); }}>Se {target.label} →</button>
						{/each}</div>{/if}
					</li>{/each}
				</ul>
				{#if failed.length > 3}<button type="button" aria-expanded={showAll} onclick={() => (showAll = !showAll)}>{showAll ? 'Vis færre feil' : `Vis alle ${failed.length} feil`}</button>{/if}
			{:else if passed}<p>Alle krav i oppdraget er oppfylt.</p>{/if}
			{#if rows.some((row) => row.ok)}<details>
				<summary>Det som {stale ? 'var' : 'er'} riktig · {rows.length - failed.length}</summary>
				<ul class="correct">{#each rows.filter((row) => row.ok) as row}<li>✓ {row.label}</li>{/each}</ul>
			</details>{/if}
		</div>
		<footer>
			{#if status}<p role="status">{status}</p>{/if}
			<div class="actions">
				<button type="button" onclick={close}>Fortsett å konfigurere</button>
				{#if passed && nextLabel}<button type="button" class="primary" disabled={nextDisabled} onclick={() => { close(); onnext(); }}>{nextLabel}</button>{/if}
			</div>
		</footer>
	</div>
</dialog>

<style>
	dialog { width: min(42rem, calc(100% - 2rem)); max-width: none; max-height: calc(100dvh - 2rem); padding: 0; border: 1px solid var(--color-border-strong); border-radius: 16px; color: var(--color-text); background: var(--color-surface); font: inherit; box-sizing: border-box; overflow: auto; overflow-wrap: anywhere; }
	dialog::backdrop { background: rgb(0 0 0 / 45%); }
	.dialog-content { display: flex; flex-direction: column; max-height: calc(100dvh - 2rem); }
	header, footer { flex: none; padding: 1rem 1.25rem; background: var(--color-surface); }
	header { display: flex; align-items: start; justify-content: space-between; gap: 1rem; border-bottom: 1px solid var(--color-border); }
	header p, footer p { margin: 0 0 0.6rem; color: var(--color-text-muted); font-size: var(--font-small); }
	h2 { margin: 0; font-size: 1.35rem; }
	h3 { margin: 0.25rem 0; font-size: 1rem; }
	.body { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 1rem 1.25rem; }
	ul { list-style: none; padding: 0; margin: 0; }
	li { padding: 0.8rem 0; border-bottom: 1px solid var(--color-border); }
	li:last-child { border: 0; }
	li p { margin: 0 0 0.6rem; line-height: 1.55; }
	.targets, .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	button { min-height: 44px; padding: 0.55rem 0.8rem; border: 1px solid var(--color-border-strong); border-radius: 8px; color: var(--color-text); background: var(--color-surface); font: inherit; cursor: pointer; }
	header button { flex: none; width: 44px; font-size: 1.4rem; }
	button:hover { background: var(--color-surface-hover); }
	button:disabled { opacity: 0.6; cursor: default; }
	.primary { background: var(--color-action); border-color: var(--color-action); color: var(--color-on-action); font-weight: 700; }
	footer { border-top: 1px solid var(--color-border); }
	summary { min-height: 44px; padding: 0.65rem 0; box-sizing: border-box; cursor: pointer; }
	.success, .correct { color: var(--color-success); }
	.failure { color: var(--color-danger); }
	:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	@media (max-height: 420px) { .dialog-content { max-height: none; } .body { overflow: visible; } }
</style>
