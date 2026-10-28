<script>
	import { onDestroy, tick } from 'svelte';
	import { lab } from '#lib/lab.js';
	import { hasTeacherRole } from '#lib/learning.js';
	import { publicationFor } from '#lib/modulePublication.js';
	import {
		modulePublication,
		refreshModulePublication,
		updateModulePublication
	} from '#lib/modulePublicationStore.js';
	/** @type {{moduleId:string,title:string}} */
	let { moduleId, title } = $props();
	const options = /** @type {const} */ ([
		{ status: 'upcoming', label: 'Kommende', help: 'Skjult for elevene' },
		{ status: 'active', label: 'Aktiv', help: 'Vises først for elevene' },
		{ status: 'completed', label: 'Fullført', help: 'Åpen for repetisjon' }
	]);
	/** @type {import('#lib/modulePublication.js').ModuleStatus|null} */
	let pending = $state(null);
	/** @type {HTMLFieldSetElement|undefined} */
	let fieldset = $state();
	let refreshing = $state(false),
		error = $state(''),
		owner = $state('');
	/** @type {number|null} */
	let savedRevision = $state(null);
	let version = 0;
	onDestroy(() => version++);
	const current = $derived(publicationFor(moduleId, $modulePublication.modules));
	const selected = $derived(pending ?? current.status);
	const busy = $derived(pending !== null || refreshing);
	const unavailable = $derived(!hasTeacherRole($lab.user?.role) || !$modulePublication.ready);
	$effect(() => {
		const next = `${moduleId}:${$lab.user?.id ?? ''}:${$lab.user?.role ?? ''}`;
		if (owner === next) return;
		owner = next;
		version++;
		pending = null;
		refreshing = false;
		error = '';
		savedRevision = null;
	});

	async function restoreFocus(/** @type {Element|null} */ previous) {
		await tick();
		// Never pull focus back from another module or control.
		if (document.activeElement !== previous && document.activeElement !== document.body) return;
		const target =
			previous instanceof HTMLInputElement && fieldset?.contains(previous)
				? previous
				: fieldset?.querySelector('input:checked');
		if (target instanceof HTMLElement) target.focus({ preventScroll: true });
	}

	async function choose(/** @type {import('#lib/modulePublication.js').ModuleStatus} */ status) {
		if (busy || unavailable || status === current.status) return;
		const request = ++version,
			previous = document.activeElement;
		pending = status;
		error = '';
		savedRevision = null;
		try {
			await updateModulePublication(moduleId, status, current.revision);
			if (request === version) savedRevision = current.status === status ? current.revision : null;
		} catch (problem) {
			if (request === version)
				error = problem instanceof Error ? problem.message : 'Kunne ikke lagre. Prøv igjen.';
		} finally {
			if (request === version) {
				pending = null;
				await restoreFocus(previous);
			}
		}
	}

	async function reload() {
		if (busy) return;
		const request = ++version,
			previous = document.activeElement;
		refreshing = true;
		error = '';
		savedRevision = null;
		try {
			await refreshModulePublication();
			if (request === version) error = $modulePublication.error;
		} finally {
			if (request === version) {
				refreshing = false;
				await restoreFocus(previous);
			}
		}
	}
</script>

<div class="module-status-control">
	<fieldset
		bind:this={fieldset}
		disabled={busy || unavailable}
		aria-describedby={`status-help-${moduleId}`}
	>
		<legend class="sr-only">Modulstatus for {title}</legend>
		<div class="status-options">
			{#each options as option}
				<label
					class="status-option"
					data-status={option.status}
					class:selected={$modulePublication.ready && selected === option.status}
				>
					<input
						type="radio"
						name={`module-status-${moduleId}`}
						value={option.status}
						checked={$modulePublication.ready && selected === option.status}
						onchange={() => choose(option.status)}
					/>
					<span>{option.label}</span>
				</label>
			{/each}
		</div>
	</fieldset>
	<p class="status-feedback" id={`status-help-${moduleId}`} role="status" aria-live="polite">
		{#if pending}Lagrer {options
				.find((option) => option.status === pending)
				?.label.toLocaleLowerCase('nb-NO')} …
		{:else if refreshing}Henter status …
		{:else if !$modulePublication.ready}Status er ikke hentet
		{:else if error}Viser sist hentede status
		{:else}{savedRevision === current.revision ? 'Lagret · ' : ''}{options.find(
				(option) => option.status === current.status
			)?.help}{/if}
	</p>
	{#if error}
		<div class="save-error">
			<p role="alert">Lagring ble ikke bekreftet. {error}</p>
			<button
				type="button"
				class="secondary"
				disabled={busy || $modulePublication.loading}
				onclick={reload}>Hent siste status</button
			>
		</div>
	{/if}
</div>

<style>
	.module-status-control {
		min-width: 0;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.status-options {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.status-options .status-option {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		flex: 1 1 auto;
		min-height: 44px;
		padding: 9px 12px;
		margin: 0;
		border: 1px solid var(--color-border-strong);
		border-radius: 7px;
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 1rem;
		line-height: 1.4;
		cursor: pointer;
	}
	.status-option input {
		width: 1em;
		height: 1em;
		flex: 0 0 1em;
		margin: 0;
		accent-color: currentColor;
	}
	.status-option span {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.status-option.selected {
		border-color: currentColor;
		box-shadow: inset 0 0 0 1px currentColor;
	}
	.status-option.selected[data-status='upcoming'] {
		background: var(--color-surface-soft);
	}
	.status-option.selected[data-status='active'] {
		color: var(--color-info);
		background: var(--color-info-soft);
	}
	.status-option.selected[data-status='completed'] {
		color: var(--color-success);
		background: var(--color-success-soft);
	}
	.status-option:has(input:focus-visible) {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.status-option input:focus-visible {
		outline: none;
	}
	fieldset:not(:disabled) .status-option:hover {
		background: var(--color-surface-hover);
	}
	fieldset:disabled .status-option {
		cursor: default;
	}
	.status-feedback {
		min-height: 1.5em;
		margin: 6px 0 0;
		font-size: var(--font-small);
		line-height: 1.5;
		color: var(--color-text-muted);
	}
	.save-error {
		margin-top: 8px;
		padding: 12px;
		border: 1px solid var(--color-danger-border);
		border-radius: 7px;
		color: var(--color-danger);
		background: var(--color-danger-soft);
	}
	.save-error p {
		margin: 0 0 10px;
		overflow-wrap: anywhere;
	}
	@media (forced-colors: active) {
		.status-option.selected {
			outline: 2px solid Highlight;
			outline-offset: -3px;
		}
	}
	@media (max-width: 35rem) {
		.status-options {
			flex-direction: column;
		}
		.status-options .status-option {
			justify-content: flex-start;
		}
	}
</style>
