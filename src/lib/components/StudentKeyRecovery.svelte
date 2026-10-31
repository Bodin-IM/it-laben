<script>
	import { onDestroy, tick, untrack } from 'svelte';
	import { lab, schoolRequest, randomId, downloadKey, ApiError } from '#lib/lab.js';
	/** @type {{student:{id:string,nickname:string,disabledAt:number|null},disabled?:boolean,oncomplete:()=>void}} */
	let { student, disabled = false, oncomplete } = $props();
	/** @type {HTMLDialogElement|undefined} */
	let dialog = $state();
	/** @type {HTMLHeadingElement|undefined} */
	let heading = $state();
	/** @type {HTMLButtonElement|undefined} */
	let downloadButton = $state();
	/** @type {{recoveryKey:import('#lib/lab.js').RecoveryKey,expiresAt:number}|null} */
	let prepared = $state(null);
	let busy = $state(false), downloaded = $state(false), confirmed = $state(false), activated = $state(false);
	let error = $state(''), canReplace = $state(false);
	let serial = 0, actionId = '';
	const scope = $derived(`${$lab.user?.id}:${$lab.user?.role}:${student.id}:${student.nickname}:${student.disabledAt}`);
	function clear() {
		serial++;
		prepared = null;
		busy = false;
		downloaded = false;
		confirmed = false;
		activated = false;
		error = '';
		canReplace = false;
		actionId = '';
	}
	$effect(() => {
		scope;
		untrack(() => { dialog?.close(); clear(); });
	});
	onDestroy(() => { serial++; });
	function open() {
		if (disabled || $lab.user?.role !== 'admin' || student.disabledAt !== null) return;
		clear();
		dialog?.showModal();
		heading?.focus({ preventScroll: true });
	}
	async function prepare() {
		if (busy) return;
		const request = ++serial, owner = scope;
		busy = true;
		error = '';
		canReplace = false;
		prepared = null;
		downloaded = false;
		confirmed = false;
		actionId = randomId();
		try {
			const result = await schoolRequest(`/teacher/students/${student.id}/recovery/prepare`, { confirmName: student.nickname });
			if (request !== serial || owner !== scope) return;
			prepared = result;
			busy = false;
			await tick();
			if (request === serial && owner === scope) downloadButton?.focus();
		} catch (problem) {
			if (request === serial && owner === scope) error = problem instanceof Error ? problem.message : 'Kunne ikke lage nøkkelfilen. Prøv igjen.';
		} finally {
			if (request === serial && owner === scope) busy = false;
		}
	}
	function download() {
		if (!prepared) return;
		try {
			downloadKey(prepared.recoveryKey, `it-lab-${student.nickname.replaceAll(' ', '-')}-${student.id.slice(0, 8)}-nokkel.json`);
			downloaded = true;
			error = '';
		} catch {
			error = 'Nedlastingen kunne ikke startes. Prøv igjen før du aktiverer filen.';
		}
	}
	async function activate() {
		if (busy || !prepared || !downloaded || !confirmed || activated) return;
		const request = ++serial, owner = scope;
		busy = true;
		error = '';
		try {
			await schoolRequest(`/teacher/students/${student.id}/recovery/activate`, {
				id: actionId, confirmName: student.nickname, key: prepared.recoveryKey.key, confirmed: true
			});
			if (request !== serial || owner !== scope) return;
			activated = true;
			oncomplete();
			await tick();
			if (request === serial && owner === scope) heading?.focus({ preventScroll: true });
		} catch (problem) {
			if (request === serial && owner === scope) {
				error = problem instanceof Error ? problem.message : 'Kunne ikke bekrefte aktiveringen. Prøv igjen med samme fil.';
				canReplace = problem instanceof ApiError && ['STUDENT_RECOVERY_EXPIRED', 'STUDENT_KEY_CHANGED'].includes(problem.code);
			}
		} finally {
			if (request === serial && owner === scope) busy = false;
		}
	}
</script>

<button class="secondary" type="button" disabled={disabled || student.disabledAt !== null} onclick={open}>Gi ny nøkkelfil</button>

<dialog bind:this={dialog} aria-labelledby="student-recovery-title"
	oncancel={(event) => { if (busy) event.preventDefault(); }}
	onclose={() => { if (!dialog?.open) clear(); }}>
	<h2 id="student-recovery-title" tabindex="-1" bind:this={heading}>{activated ? 'Nøkkelfilen er aktivert' : 'Gi ny nøkkelfil'}</h2>
	<p class="identity"><strong>{student.nickname}</strong><small>Profil-ID: {student.id}</small></p>
	{#if activated}
		<p>Gi den nedlastede filen til eleven. Eleven logger inn med den i Min lab.</p>
		<p>Den gamle nøkkelen er sperret og tidligere pålogginger er avsluttet. Progresjon, XP og merker er beholdt.</p>
		<button class="secondary" type="button" onclick={download}>Last ned filen igjen</button>
	{:else if prepared}
		<p>Last ned filen før du aktiverer den. Filen må aktiveres innen 30 minutter.</p>
		<button class="secondary" type="button" bind:this={downloadButton} disabled={busy} onclick={download}>{downloaded ? 'Last ned filen igjen' : 'Last ned ny nøkkelfil'}</button>
		<label class="confirmation"><input type="checkbox" bind:checked={confirmed} disabled={!downloaded || busy} /><span>Jeg har lagret filen og kontrollert at dette er riktig elevprofil.</span></label>
		<p class="small">Ved aktivering sperres den gamle nøkkelen, og eleven logges ut på alle enheter. Progresjon, XP og merker beholdes.</p>
	{:else}
		<p>Lag en ny nøkkelfil til denne elevprofilen. Eleven beholder progresjon, XP og merker.</p>
		<p class="small">Nåværende tilgang beholdes frem til du har lastet ned og aktivert den nye filen.</p>
	{/if}
	{#if error}<p class="error" role="alert">{error}</p>{/if}
	<div class="actions">
		<button class="secondary" type="button" disabled={busy} onclick={() => dialog?.close()}>{activated ? 'Ferdig' : 'Avbryt'}</button>
		{#if !activated}
			{#if !prepared || canReplace}<button type="button" disabled={busy} onclick={prepare}>{busy ? 'Lager fil …' : 'Lag ny nøkkelfil'}</button>
			{:else}<button type="button" disabled={busy || !downloaded || !confirmed} onclick={activate}>{busy ? 'Aktiverer …' : error ? 'Prøv aktiveringen igjen' : 'Aktiver nøkkelfilen'}</button>{/if}
		{/if}
	</div>
</dialog>

<style>
	dialog {
		box-sizing: border-box;
		width: min(520px, calc(100% - 32px));
		max-height: calc(100dvh - 32px);
		overflow-y: auto;
		padding: 24px;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-card);
		color: var(--color-text);
		background: var(--color-surface);
	}
	dialog::backdrop { background: rgb(0 0 0 / 55%); }
	h2 { margin-top: 0; }
	p { line-height: 1.6; overflow-wrap: anywhere; }
	.identity small { display: block; color: var(--color-text-muted); }
	.small { font-size: var(--font-small); color: var(--color-text-muted); }
	dialog label.confirmation { display: flex; align-items: flex-start; gap: 12px; margin-top: 20px; min-height: 44px; }
	.confirmation input { flex: 0 0 20px; width: 20px; height: 20px; margin-top: 4px; }
	.error { color: var(--color-danger); padding: 12px; border: 1px solid var(--color-danger-border); border-radius: 6px; }
	.actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
</style>
