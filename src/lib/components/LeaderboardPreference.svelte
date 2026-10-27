<script>
	import { lab, changeLeaderboardVisibility } from '#lib/lab.js';
	/** @type {{showLink?:boolean}} */
	let { showLink = true } = $props();
	let busy = $state(false),
		error = $state(''),
		message = $state(''),
		owner = $state('');
	$effect(() => {
		const id = $lab.user?.id ?? '';
		if (owner !== id) {
			owner = id;
			error = '';
			message = '';
			busy = false;
		}
	});
	async function toggle() {
		const id = $lab.user?.id;
		if (!id || busy) return;
		const visible = !$lab.user?.leaderboardVisible;
		busy = true;
		error = '';
		message = '';
		try {
			await changeLeaderboardVisibility(visible);
			if ($lab.user?.id === id)
				message = visible
					? 'Du er med på topplisten.'
					: 'Du er skjult fra topplisten. Poengene dine beholdes.';
		} catch (problem) {
			if ($lab.user?.id === id)
				error = problem instanceof Error ? problem.message : 'Kunne ikke lagre valget.';
		} finally {
			if ($lab.user?.id === id) busy = false;
		}
	}
</script>

{#if !$lab.user || $lab.user.role === 'student'}<section
		class="leaderboard-preference"
		aria-label="Deltakelse på topplisten"
	>
		<h3>Din plass på topplisten</h3>
		{#if !$lab.user}<p>Logg inn for å se din egen plassering.</p>
			<a href="/min-lab/">Til Min lab →</a>
		{:else}<p>
				{#if $lab.user.leaderboardVisible}Brukernavnet ditt og poengene dine vises på topplisten. Du
					kan skjule deg når du vil.{:else}Du er skjult fra topplisten. Poengene og fremgangen din
					beholdes.{/if}
			</p>
			<p>Skjuler du profilen, tas poengene dine også ut av klassens sum. Klassevalget beholdes.</p>
			<button type="button" disabled={busy} onclick={toggle}
				>{busy
					? 'Lagrer …'
					: $lab.user.leaderboardVisible
						? 'Skjul meg fra topplisten'
						: 'Vis meg på topplisten'}</button
			>{/if}
		{#if error}<p class="error" role="alert">{error}</p>{/if}{#if message}<p role="status">
				{message}
			</p>{/if}
		{#if showLink}<p><a href="/toppliste/">Se topplisten →</a></p>{/if}
	</section>{/if}

<style>
	h3 {
		margin: 0 0 10px;
		font-size: 18px;
	}
	p {
		color: var(--color-text-muted);
		font-size: var(--font-small);
		line-height: 1.6;
		max-width: 720px;
	}
	a {
		color: var(--color-accent);
	}
	button {
		cursor: pointer;
		min-height: 44px;
		padding: 11px 16px;
		border: 1px solid var(--color-border-strong);
		border-radius: 6px;
		color: var(--color-text);
		background: var(--color-surface);
		font:
			650 14px/1.4 system-ui,
			sans-serif;
	}
	button:disabled {
		opacity: 0.55;
		cursor: default;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.error {
		color: var(--color-danger);
	}
</style>
