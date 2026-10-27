<script>
	import { tick } from 'svelte';
	import { lab, chooseClass, refreshLab, ApiError } from '#lib/lab.js';
	import { schoolClasses } from '#lib/classes.js';
	let selected = $state('');
	let confirmed = $state(false);
	let busy = $state(false);
	let error = $state('');
	let message = $state('');
	/** @type {HTMLParagraphElement|undefined} */
	let savedStatus = $state();
	/** @param {SubmitEvent} event */
	async function save(event) {
		event.preventDefault();
		const owner = $lab.user?.id;
		if (!owner || !selected || !confirmed || busy || $lab.user?.classCode) return;
		busy = true;
		error = '';
		try {
			await chooseClass(selected);
			if ($lab.user?.id !== owner) return;
			message = `Du er registrert i ${selected}. Klassevalget er låst.`;
			await tick();
			savedStatus?.focus();
		} catch (problem) {
			if ($lab.user?.id !== owner) return;
			error =
				problem instanceof Error ? problem.message : 'Kunne ikke lagre klassevalget. Prøv igjen.';
			if (problem instanceof ApiError && problem.code === 'CLASS_LOCKED') {
				await refreshLab();
				await tick();
				savedStatus?.focus();
			}
		} finally {
			if ($lab.user?.id === owner) busy = false;
		}
	}
</script>

{#if $lab.user?.role === 'student'}
	<section class="membership" aria-label="Din klasse">
		<h2>Din klasse</h2>
		{#if $lab.user.classCode}
			<p class="saved" tabindex="-1" bind:this={savedStatus}>
				<strong>{$lab.user.classCode}</strong> · Klassevalget er låst.
			</p>
			<p>
				{#if $lab.user.leaderboardVisible}Poengene dine teller med i klassens samlede XP.{:else}Du
					er skjult fra topplisten. Poengene dine teller derfor ikke i klassens sum.{/if}
			</p>
		{:else}
			<p>
				Velg klassen du tilhører. Du kan velge én gang. Etter bekreftelsen kan du ikke bytte klasse.
			</p>
			<form onsubmit={save}>
				<fieldset disabled={busy}>
					<legend>Hvilken klasse går du i?</legend>
					<div class="choices">
						{#each schoolClasses as classCode}
							<label class:selected={selected === classCode}>
								<input
									type="radio"
									name="classCode"
									value={classCode}
									bind:group={selected}
									onchange={() => {
										confirmed = false;
										error = '';
									}}
									required
								/>
								<span>{classCode}</span>
							</label>
						{/each}
					</div>
					{#if selected}
						<label class="confirmation"
							><input type="checkbox" bind:checked={confirmed} required />
							<span>Jeg tilhører {selected} og forstår at valget låses.</span>
						</label>
					{/if}
					<button type="submit" disabled={!selected || !confirmed || busy}
						>{busy ? 'Lagrer …' : selected ? `Bekreft ${selected}` : 'Velg en klasse'}</button
					>
				</fieldset>
			</form>
			<p class="note">Opptjent XP teller med når du har valgt klasse og er synlig på topplisten.</p>
		{/if}
		{#if error}<p class="error" role="alert">{error}</p>{/if}
		<p class="message" role="status">{message}</p>
	</section>
{/if}

<style>
	.membership {
		padding: 24px;
		margin-bottom: 24px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		background: var(--color-surface);
	}
	h2 {
		font-size: 1.25rem;
		margin: 0 0 12px;
	}
	p {
		color: var(--color-text-muted);
		line-height: 1.6;
		max-width: 65ch;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	legend {
		font-weight: 650;
		padding: 0;
		margin-bottom: 12px;
	}
	.choices {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
	.choices label {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 20px;
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
		cursor: pointer;
		font-weight: 700;
	}
	.choices label.selected {
		border-color: var(--color-accent);
		background: var(--color-accent-soft);
	}
	input {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		margin: 0;
		accent-color: var(--color-action);
	}
	.confirmation {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		line-height: 1.5;
		padding-block: 18px;
		cursor: pointer;
	}
	.confirmation input {
		margin-top: 3px;
	}
	button {
		margin-top: 12px;
		min-height: 44px;
		padding: 11px 16px;
		border: 1px solid var(--color-action);
		border-radius: 7px;
		background: var(--color-action);
		color: var(--color-on-action);
		font: 650 var(--font-small)/1.4 var(--font-ui);
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.55;
		cursor: default;
	}
	input:focus-visible,
	button:focus-visible,
	.saved:focus {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}
	.saved {
		color: var(--color-text);
	}
	.note {
		font-size: var(--font-small);
	}
	.error {
		color: var(--color-danger);
	}
	.message:empty {
		margin: 0;
	}
</style>
