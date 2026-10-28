<script>
	import { tick } from 'svelte';
	import { lab } from '#lib/lab.js';
	import { hasTeacherRole } from '#lib/learning.js';
	import { isModuleStatus, publicationFor } from '#lib/modulePublication.js';
	import {
		modulePublication,
		refreshModulePublication,
		updateModulePublication
	} from '#lib/modulePublicationStore.js';
	/** @type {{moduleId:string,title:string}} */
	let { moduleId, title } = $props();
	/** @type {{status:import('#lib/modulePublication.js').ModuleStatus,revision:number}|null} */
	let draft = $state(null);
	/** @type {HTMLSelectElement|undefined} */
	let select = $state();
	let busy = $state(false),
		refreshing = $state(false),
		error = $state(''),
		notice = $state(''),
		context = $state('');
	let requestVersion = 0;
	const current = $derived(publicationFor(moduleId, $modulePublication.modules));
	const selected = $derived.by(() => draft?.status ?? current.status);
	const changed = $derived.by(() => draft !== null && selected !== current.status);
	const stale = $derived.by(() => draft !== null && draft.revision !== current.revision);
	const unavailable = $derived(!hasTeacherRole($lab.user?.role) || !$modulePublication.ready);
	const action = $derived(
		selected === 'active'
			? 'Aktiver modulen'
			: selected === 'completed'
				? 'Marker som ferdig'
				: 'Skjul som kommende'
	);
	$effect(() => {
		const next = `${moduleId}:${$lab.user?.id ?? ''}:${$lab.user?.role ?? ''}`;
		if (context === next) return;
		context = next;
		requestVersion++;
		draft = null;
		busy = false;
		refreshing = false;
		error = '';
		notice = '';
	});
	function choose(/** @type {Event & {currentTarget:HTMLSelectElement}} */ event) {
		const status = event.currentTarget.value;
		if (!isModuleStatus(status)) return;
		draft =
			status === current.status ? null : { status, revision: draft?.revision ?? current.revision };
		error = '';
		notice = '';
	}
	async function save() {
		if (!draft || !changed || stale || busy || refreshing || unavailable) return;
		const change = draft,
			id = moduleId,
			userId = $lab.user?.id,
			request = ++requestVersion,
			previousFocus = document.activeElement;
		busy = true;
		error = '';
		notice = '';
		try {
			await updateModulePublication(id, change.status, change.revision);
			if (request !== requestVersion || id !== moduleId || userId !== $lab.user?.id) return;
			draft = null;
			notice =
				change.status === 'active'
					? 'Lagret. Modulen er aktiv og vises først for elevene.'
					: change.status === 'completed'
						? 'Lagret. Modulen er ferdig i undervisningen og fortsatt åpen for repetisjon.'
						: 'Lagret. Modulen er kommende og skjult fra elevenes moduloversikt.';
		} catch (problem) {
			if (request !== requestVersion || id !== moduleId || userId !== $lab.user?.id) return;
			error =
				problem instanceof Error ? problem.message : 'Kunne ikke lagre modulstatusen. Prøv igjen.';
		} finally {
			if (request === requestVersion && id === moduleId && userId === $lab.user?.id) {
				busy = false;
				await tick();
				if (document.activeElement === previousFocus || document.activeElement === document.body)
					select?.focus({ preventScroll: true });
			}
		}
	}
	async function reload() {
		if (busy || refreshing) return;
		const request = ++requestVersion,
			previousFocus = document.activeElement;
		refreshing = true;
		error = '';
		notice = '';
		try {
			await refreshModulePublication();
			if (request !== requestVersion) return;
			if ($modulePublication.error) throw new Error($modulePublication.error);
			draft = null;
			notice = 'Siste lagrede status er hentet. Du kan velge en ny status.';
		} catch (problem) {
			if (request === requestVersion)
				error =
					problem instanceof Error
						? problem.message
						: 'Kunne ikke hente modulstatusen. Prøv igjen.';
		} finally {
			if (request === requestVersion) {
				refreshing = false;
				await tick();
				if (document.activeElement === previousFocus || document.activeElement === document.body)
					select?.focus({ preventScroll: true });
			}
		}
	}
</script>

<form
	class="module-administration"
	aria-label={`Modulstatus for ${title}`}
	onsubmit={(event) => {
		event.preventDefault();
		void save();
	}}
>
	<div class="controls">
		<div class="selection">
			<label for={`module-status-${moduleId}`}>Endre modulstatus</label>
			<select
				id={`module-status-${moduleId}`}
				bind:this={select}
				value={$modulePublication.ready ? selected : ''}
				onchange={choose}
				disabled={busy || refreshing || unavailable}
				aria-describedby={`module-status-help-${moduleId}`}
			>
				{#if !$modulePublication.ready}<option value="">Status ikke hentet</option>{/if}
				<option value="upcoming">Kommende – skjult for elever</option>
				<option value="active">Aktiv – vises først</option>
				<option value="completed">Ferdig – åpen for repetisjon</option>
			</select>
		</div>
		<button type="submit" disabled={!changed || stale || busy || refreshing || unavailable}
			>{busy ? 'Lagrer …' : action}</button
		>
	</div>
	<p class="help" id={`module-status-help-${moduleId}`}>
		{#if !$modulePublication.ready}Henter lagret status før du kan gjøre endringer.
		{:else if changed}Endringen gjelder begge klassene når du lagrer.
		{:else}Statusen gjelder begge klassene. Elevenes arbeid og progresjon beholdes.{/if}
	</p>
	{#if stale}
		<p class="feedback warning" role="status">
			En nyere modulstatus er lagret. Hent siste status før du gjør en ny endring.
		</p>
	{/if}
	{#if error}<p class="feedback failure" role="alert">{error}</p>{/if}
	{#if stale || error}
		<button
			type="button"
			class="secondary"
			disabled={busy || refreshing || $modulePublication.loading}
			onclick={reload}>{refreshing ? 'Henter …' : 'Hent siste lagrede status'}</button
		>
	{/if}
	<p class="saved" role="status" aria-live="polite">{notice}</p>
</form>

<style>
	.module-administration {
		margin-top: 18px;
		padding-top: 18px;
		border-top: 1px solid var(--color-border);
	}
	.controls {
		display: flex;
		align-items: flex-end;
		flex-wrap: wrap;
		gap: 12px;
	}
	.selection {
		flex: 1 1 260px;
		max-width: 380px;
		min-width: 0;
	}
	label {
		display: block;
		margin-bottom: 7px;
		font-weight: 650;
		font-size: var(--font-small);
	}
	select {
		width: 100%;
		min-height: 46px;
		padding: 10px 12px;
		border: 1px solid var(--color-border-strong);
		border-radius: 7px;
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
	}
	button {
		min-height: 46px;
		padding: 10px 16px;
		border: 1px solid var(--color-action);
		border-radius: 7px;
		background: var(--color-action);
		color: var(--color-on-action);
		font: 650 var(--font-small)/1.4 var(--font-ui);
		cursor: pointer;
	}
	button:hover:not(:disabled) {
		background: var(--color-action-hover);
	}
	button.secondary {
		background: var(--color-surface);
		border-color: var(--color-border-strong);
		color: var(--color-text);
	}
	button:disabled,
	select:disabled {
		cursor: default;
		opacity: 0.65;
	}
	button:focus-visible,
	select:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.help,
	.saved,
	.feedback {
		font-size: var(--font-small);
		line-height: 1.55;
		margin: 10px 0 0;
	}
	.help {
		color: var(--color-text-muted);
	}
	.feedback {
		padding: 10px 14px;
		border: 1px solid var(--color-border-strong);
		border-radius: 7px;
		margin-bottom: 12px;
	}
	.warning {
		background: var(--color-info-soft);
		color: var(--color-info);
		border-color: var(--color-info-border);
	}
	.failure {
		background: var(--color-danger-soft);
		color: var(--color-danger);
		border-color: var(--color-danger-border);
	}
	.saved {
		color: var(--color-success);
	}
	.saved:empty {
		margin: 0;
	}
</style>
