<script>
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import {
		lab,
		createProfile,
		loginWithKey,
		logoutProfile,
		rotateRecoveryKey,
		downloadKey,
		changeNickname,
		deleteProfile,
		refreshLab
	} from '#lib/lab.js';
	let nickname = $state('');
	let remember = $state(true);
	let busy = $state(false);
	let message = $state('');
	let filter = $state('alle');
	let downloaded = $state(false);
	let keyOwner = $state('');
	let deleteConfirmation = $state('');
	/** @type {import('#lib/lab.js').RecoveryKey|null} */
	let recoveryKey = $state(null);
	/** @type {HTMLDialogElement|undefined} */
	let rotationDialog = $state();
	const activities = $derived(
		($lab.summary?.progress ?? []).filter((item) => filter === 'alle' || item.subject === filter)
	);
	const finished = $derived(
		($lab.summary?.progress ?? []).filter((item) => ['passed', 'reviewed'].includes(item.status))
			.length
	);
	const recent = $derived(
		($lab.summary?.progress ?? [])
			.filter((item) => item.status === 'started')
			.sort(
				(a, b) =>
					Math.max(...b.objectives.map((item) => item.updatedAt ?? 0)) -
					Math.max(...a.objectives.map((item) => item.updatedAt ?? 0))
			)
			.slice(0, 2)
	);
	$effect(() => {
		if (!$lab.user || (recoveryKey && keyOwner !== $lab.user.id)) {
			recoveryKey = null;
			downloaded = false;
		}
	});
	/** @param {() => Promise<unknown>} action */
	async function perform(action) {
		if (busy) return;
		busy = true;
		message = '';
		try {
			await action();
		} catch (error) {
			message = error instanceof Error ? error.message : 'Kunne ikke gjennomføre handlingen.';
		} finally {
			busy = false;
		}
	}
	/** @param {Event} event */
	async function uploadKey(event) {
		const input = /** @type {HTMLInputElement} */ (event.currentTarget);
		const file = input.files?.[0];
		if (!file) return;
		await perform(async () => {
			if (file.size > 4096) throw new Error('Filen er for stor til å være en nøkkelfil.');
			let data;
			try {
				data = JSON.parse(await file.text());
			} catch {
				throw new Error('Kunne ikke lese nøkkelfilen. Velg JSON-filen du lastet ned fra IT-laben.');
			}
			await loginWithKey(data, remember);
		});
		input.value = '';
	}
	/** @param {import('#lib/lab.js').Progress} activity */
	function resumeLink(activity) {
		if (activity.format !== 'spill') return activity.href;
		const objective = activity.objectives
			.filter((item) => !item.completedAt)
			.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
		return objective
			? `${activity.href}?oppdrag=${encodeURIComponent(objective.id)}`
			: activity.href;
	}
	/** @param {import('#lib/lab.js').Progress} activity */
	function statusText(activity) {
		return activity.status === 'reviewed'
			? '✓ Gjennomgått'
			: activity.status === 'passed'
				? '✓ Bestått'
				: activity.format === 'spill' && activity.completed
					? `${activity.completed} av ${activity.total} oppdrag`
					: activity.status === 'started'
						? 'Påbegynt'
						: 'Ikke startet';
	}
</script>

<svelte:head
	><title>Min lab – progresjon og achievements | IT-laben</title><meta
		name="robots"
		content="noindex"
	/></svelte:head
>
<div class="profile-page">
	<header>
		<a class="brand" href="/"><span aria-hidden="true">IT</span>IT-laben.</a>
		<div class="header-actions"><a href="/">Utforsk laben</a><ThemeToggle /></div>
	</header>
	<main>
		{#if !$lab.ready}<p class="status" role="status">Henter profilen din …</p>
		{:else if !$lab.user}
			<section class="intro">
				<p class="eyebrow">DIN EGEN PLASS I IT-LABEN</p>
				<h1>Små steg.<br /><em>Synlig fremgang.</em></h1>
				<p>Ta vare på det du lærer. Samle XP, løs oppdrag og finn tilbake til det du har gjort.</p>
			</section>
			{#if !$lab.available}<div class="notice" role="status">
					<p>
						Min lab er ikke tilgjengelig akkurat nå. Du kan fortsatt bruke alle leksjonene og
						spillene.
					</p>
					<button type="button" onclick={() => refreshLab()}>Prøv igjen</button><a href="/"
						>Til innholdet →</a
					>
				</div>{/if}
			<div class="entry-grid">
				<section class="panel">
					<span class="panel-icon" aria-hidden="true">✦</span>
					<h2>Start min lab</h2>
					<p>Lag en profil med ett klikk. Vi trenger verken navn, e-postadresse eller passord.</p>
					<form
						onsubmit={(event) => {
							event.preventDefault();
							void perform(async () => {
								recoveryKey = await createProfile(nickname, remember);
								keyOwner = $lab.user?.id ?? '';
								downloaded = false;
							});
						}}
					>
						<label for="nickname">Kallenavn <span>(valgfritt)</span></label><input
							id="nickname"
							bind:value={nickname}
							maxlength="24"
							minlength="2"
							placeholder="Vi kan finne på et for deg"
							autocomplete="off"
						/>
						<button class="primary" type="submit" disabled={busy || !$lab.available}
							>{busy ? 'Et lite øyeblikk …' : 'Opprett profilen min →'}</button
						>
					</form>
				</section>
				<section class="panel">
					<span class="panel-icon" aria-hidden="true">↪</span>
					<h2>Jeg har allerede en bruker</h2>
					<p>Åpne nøkkelfilen din for å hente samme profil, progresjon og poeng på denne PC-en.</p>
					<label class="file-label" for="recovery-file">Velg nøkkelfil</label><input
						id="recovery-file"
						type="file"
						accept=".json,application/json"
						onchange={uploadKey}
						disabled={busy || !$lab.available}
					/>
					<p class="small">
						Filen heter vanligvis <code>min-it-lab-nokkel.json</code>. Del den bare med deg selv.
					</p>
				</section>
			</div>
			<label class="remember"
				><input type="checkbox" bind:checked={remember} />Dette er min egen PC – husk påloggingen</label
			>
			<p class="small">
				På en lånt eller delt maskin fjerner du avkrysningen og logger ut når du er ferdig.
			</p>
		{:else if $lab.summary}
			<section class="welcome">
				<div>
					<p class="eyebrow">MIN LAB</p>
					<h1>Hei, <em>{$lab.user.nickname}.</em></h1>
					<p>Fortsett å prøve. Hvert oppdrag bygger på noe du kan ta med videre.</p>
				</div>
				<button
					class="secondary"
					type="button"
					disabled={busy}
					onclick={() => perform(logoutProfile)}>Logg ut</button
				>
			</section>
			{#if recoveryKey}<section class="key-panel" aria-labelledby="key-title">
					<span class="panel-icon" aria-hidden="true">↧</span>
					<div>
						<h2 id="key-title">Ta vare på profilen din</h2>
						<p>
							Nøkkelfilen gir tilgang til kontoen på en annen PC, eller hvis nettleserdata blir
							slettet. Oppbevar den trygt. Fremgangen lagres hos IT-laben.
						</p>
						<button
							class="primary"
							type="button"
							onclick={() => {
								if (recoveryKey) {
									downloadKey(recoveryKey);
									downloaded = true;
								}
							}}>Last ned nøkkelfilen min</button
						>{#if downloaded}<p class="small" role="status">
								Filen er klargjort for nedlasting. Sjekk at du har lagret den før du lukker siden.
							</p>{/if}
					</div>
				</section>{/if}
			<section class="stats" aria-label="Din progresjon">
				<div class="xp-card">
					<span class="eyebrow">NIVÅ {$lab.summary.level}</span><strong
						>{$lab.summary.xp} <small>XP</small></strong
					><progress aria-label="Fremgang til neste nivå" max="100" value={$lab.summary.xp % 100}
					></progress><span class="small"
						>{$lab.summary.nextLevelAt - $lab.summary.xp} XP til nivå {$lab.summary.level + 1}</span
					>
				</div>
				<div>
					<strong>{finished}<small> / {$lab.summary.progress.length}</small></strong><span
						>aktiviteter fullført</span
					>
					<p class="small">
						Leksjoner gir 15 XP. Beståtte spilloppdrag gir 25 XP, med en bonus når hele spillet er
						løst.
					</p>
				</div>
			</section>
			{#if $lab.pending || $lab.error}<div class="notice" role="status">
					<p>{$lab.pending ? `${$lab.pending} forsøk venter på lagring.` : $lab.error}</p>
					{#if $lab.pending && $lab.error}<p>{$lab.error}</p>{/if}<button
						type="button"
						disabled={$lab.syncing}
						onclick={() => {
							void refreshLab();
						}}>{$lab.syncing ? 'Synkroniserer …' : 'Prøv å synkronisere'}</button
					>{#if $lab.storageWarning}<p>Hold denne fanen åpen til fremgangen er lagret.</p>{/if}
				</div>{/if}
			{#if recent.length}<section class="continue-section">
					<h2>Fortsett der du slapp</h2>
					<div class="continue-grid">
						{#each recent as activity}<a class="continue-card" href={resumeLink(activity)}
								><span class="eyebrow"
									>{activity.subject === 'drift' ? 'DRIFTSSTØTTE' : 'UTVIKLING'}</span
								>
								<h3>{activity.title}</h3>
								<span>Fortsett →</span></a
							>{/each}
					</div>
				</section>{/if}
			<section class="achievements" aria-labelledby="achievements-title">
				<div class="section-top">
					<h2 id="achievements-title">Dine achievements</h2>
					<span class="small"
						>{$lab.summary.achievements.filter((item) => item.earnedAt !== null).length} av {$lab
							.summary.achievements.length} oppnådd</span
					>
				</div>
				<div class="badge-grid">
					{#each $lab.summary.achievements as achievement}<article
							class="badge"
							class:earned={achievement.earnedAt !== null}
						>
							<span class="badge-symbol" aria-hidden="true">{achievement.symbol}</span>
							<div>
								<h3>{achievement.title}</h3>
								<p>{achievement.description}</p>
								<span class="badge-status"
									>{achievement.earnedAt !== null ? '✓ Oppnådd' : 'Neste mål'}</span
								>
							</div>
						</article>{/each}
				</div>
			</section>
			<section class="activity-section" aria-labelledby="activity-title">
				<div class="section-top">
					<h2 id="activity-title">Innholdet ditt</h2>
					<div class="filters" role="group" aria-label="Velg fag">
						{#each [{ id: 'alle', title: 'Alle fag' }, { id: 'utvikling', title: 'Utvikling' }, { id: 'drift', title: 'Driftsstøtte' }] as item}<button
								type="button"
								class:active={filter === item.id}
								aria-pressed={filter === item.id}
								onclick={() => (filter = item.id)}>{item.title}</button
							>{/each}
					</div>
				</div>
				<div class="activity-list">
					{#each activities as activity}<a href={resumeLink(activity)} class="activity-row"
							><div>
								<span class="small"
									>{activity.subject === 'drift' ? 'Driftsstøtte' : 'Utvikling'} · {activity.format ===
									'spill'
										? 'Spill'
										: 'Leksjon'}</span
								>
								<h3>{activity.title}</h3>
							</div>
							<span
								class="activity-status"
								class:done={['passed', 'reviewed'].includes(activity.status)}
								>{statusText(activity)}</span
							><span class="row-arrow" aria-hidden="true">→</span></a
						>{/each}
				</div>
			</section>
			<details class="settings">
				<summary>Profil og nøkkelfil</summary>
				<div class="settings-content">
					<form
						onsubmit={(event) => {
							event.preventDefault();
							void perform(() => changeNickname(nickname || $lab.user?.nickname || ''));
						}}
					>
						<label for="edit-nickname">Bytt kallenavn</label>
						<div class="inline">
							<input
								id="edit-nickname"
								bind:value={nickname}
								placeholder={$lab.user.nickname}
								minlength="2"
								maxlength="24"
							/><button class="secondary" type="submit" disabled={busy}>Lagre</button>
						</div>
					</form>
					<div>
						<h3>Trenger du en ny nøkkelfil?</h3>
						<p>
							En ny nøkkel erstatter den gamle og logger ut alle andre enheter. Progresjonen
							beholdes.
						</p>
						<button
							class="secondary"
							type="button"
							disabled={busy}
							onclick={() => rotationDialog?.showModal()}>Lag ny nøkkelfil</button
						>
					</div>
					<details class="delete-account">
						<summary>Slett profilen</summary>
						<p>
							Dette sletter progresjon, XP og achievements permanent. Nøkkelfilen vil ikke lenger
							virke.
						</p>
						<label for="delete-confirmation">Skriv SLETT for å bekrefte</label><input
							id="delete-confirmation"
							bind:value={deleteConfirmation}
							autocomplete="off"
						/><button
							class="danger"
							type="button"
							disabled={busy || deleteConfirmation !== 'SLETT'}
							onclick={() => perform(deleteProfile)}>Slett profilen min</button
						>
					</details>
				</div>
			</details>
		{/if}
		{#if message}<p class="error" role="alert">{message}</p>{/if}
		{#if $lab.development}<p class="development">
				Dette er en lokal prøveversjon. Bruk en testprofil.
			</p>{/if}
		<footer><a href="/">← Til IT-laben</a><span>Se. Prøv. Forstå.</span></footer>
	</main>
	<dialog bind:this={rotationDialog}>
		<h2>Erstatt nøkkelen din?</h2>
		<p>
			Den gamle filen slutter å virke, og andre enheter logges ut. Last ned den nye filen etterpå.
		</p>
		<div class="inline">
			<button class="secondary" type="button" onclick={() => rotationDialog?.close()}>Avbryt</button
			><button
				class="primary"
				type="button"
				disabled={busy}
				onclick={() =>
					perform(async () => {
						recoveryKey = await rotateRecoveryKey();
						keyOwner = $lab.user?.id ?? '';
						downloaded = false;
						rotationDialog?.close();
					})}>Lag ny nøkkel</button
			>
		</div>
	</dialog>
</div>

<style>
	.profile-page {
		min-height: 100vh;
		background: radial-gradient(ellipse at 85% 0%, var(--color-page-glow), transparent 50%);
		font-family: Inter, system-ui, sans-serif;
		color: var(--color-text);
	}
	.profile-page,
	.profile-page * {
		box-sizing: border-box;
	}
	header,
	main {
		width: min(1120px, calc(100% - 48px));
		margin-inline: auto;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		min-height: 80px;
		padding-block: 14px;
		border-bottom: 1px solid var(--color-border);
	}
	a {
		color: var(--color-accent);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--color-text);
		font-weight: 750;
		font-size: 19px;
		text-decoration: none;
	}
	.brand span {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--color-brand);
		color: var(--color-on-brand);
		font: 600 17px monospace;
	}
	.header-actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 20px;
		margin-left: auto;
	}
	.header-actions > a {
		font-size: var(--font-small);
		text-decoration: none;
	}
	.intro {
		padding: 44px 0 28px;
		max-width: 680px;
	}
	.eyebrow {
		font-size: var(--font-meta);
		color: var(--color-accent);
		letter-spacing: 1.5px;
		font-weight: 750;
		margin: 0 0 8px;
	}
	h1 {
		font-size: clamp(2rem, 5vw, 3.5rem);
		line-height: 1.1;
		letter-spacing: -1.8px;
		margin: 0 0 16px;
	}
	h1 em {
		font-style: normal;
		color: var(--color-accent);
	}
	h1,
	h2,
	h3,
	p {
		overflow-wrap: anywhere;
	}
	p {
		font-size: var(--font-body);
		line-height: var(--leading-body);
		color: var(--color-text-muted);
		margin: 8px 0 18px;
	}
	h2 {
		font-size: 1.3rem;
		margin: 0 0 8px;
		line-height: 1.4;
		letter-spacing: -0.4px;
	}
	h3 {
		font-size: var(--font-body);
		margin: 0 0 5px;
		line-height: 1.4;
	}
	button,
	input {
		font: inherit;
	}
	button {
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
		cursor: default;
	}
	button,
	a,
	input,
	summary {
		touch-action: manipulation;
	}
	button:focus-visible,
	a:focus-visible,
	input:focus-visible,
	summary:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}
	.entry-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
	}
	.panel {
		padding: 28px;
		border: 1px solid var(--color-border);
		border-radius: 14px;
		background: var(--color-surface);
	}
	.panel-icon {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 10px;
		margin-bottom: 16px;
		background: var(--color-accent-soft);
		color: var(--color-accent);
		font: 24px monospace;
	}
	label {
		display: block;
		font-size: var(--font-small);
		font-weight: 600;
		margin-bottom: 7px;
	}
	label span {
		font-weight: 400;
		color: var(--color-text-muted);
	}
	input:not([type='checkbox']) {
		width: 100%;
		min-height: 44px;
		padding: 10px 12px;
		border: 1px solid var(--color-border);
		border-radius: 7px;
		background: var(--color-surface);
		color: var(--color-text);
		min-width: 0;
	}
	input[type='file'] {
		font-size: var(--font-small);
		overflow-wrap: anywhere;
	}
	input[type='file']::file-selector-button {
		min-height: 36px;
		border: 1px solid var(--color-border);
		border-radius: 5px;
		background: var(--color-surface-soft);
		color: var(--color-text);
		font: inherit;
		margin-right: 10px;
		cursor: pointer;
	}
	.primary,
	.secondary,
	.danger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		max-width: 100%;
		padding: 10px 16px;
		border: 1px solid var(--color-action);
		border-radius: 7px;
		background: var(--color-action);
		color: var(--color-on-action);
		font:
			600 var(--font-small)/1.5 system-ui,
			sans-serif;
		text-decoration: none;
	}
	.secondary {
		background: var(--color-surface);
		color: var(--color-accent);
		border-color: var(--color-border);
	}
	.danger {
		background: var(--color-danger);
		border-color: var(--color-danger);
		color: white;
	}
	.panel form .primary {
		margin-top: 14px;
	}
	.small {
		font-size: var(--font-small);
		line-height: 1.6;
		color: var(--color-text-muted);
	}
	.panel .small {
		margin-bottom: 0;
	}
	code {
		overflow-wrap: anywhere;
		font-size: var(--font-meta);
	}
	.remember {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 24px 0 2px;
	}
	.remember input {
		width: 18px;
		height: 18px;
		accent-color: var(--color-accent);
		flex: 0 0 18px;
	}
	.notice {
		margin: 20px 0;
		padding: 18px 20px;
		border: 1px solid var(--color-warning-border);
		border-radius: 10px;
		background: var(--color-warning-soft);
	}
	.notice p {
		margin: 0 0 10px;
	}
	.notice button {
		border: 0;
		background: none;
		padding: 6px 8px 6px 0;
		color: var(--color-accent);
		text-decoration: underline;
	}
	.notice a {
		margin-left: 16px;
	}
	.status {
		padding-block: 36px;
	}
	.welcome {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		padding: 36px 0 24px;
	}
	.welcome h1 {
		font-size: clamp(2rem, 4vw, 2.8rem);
	}
	.welcome p:last-child {
		margin-bottom: 0;
	}
	.key-panel {
		display: flex;
		align-items: start;
		gap: 20px;
		padding: 24px;
		border: 1px solid var(--color-success-border);
		border-radius: 12px;
		background: var(--color-success-soft);
		margin-bottom: 24px;
	}
	.key-panel .panel-icon {
		flex: 0 0 44px;
		margin: 0;
	}
	.key-panel .small {
		margin-bottom: 0;
	}
	.stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
		margin: 0 0 28px;
	}
	.stats > div {
		padding: 24px;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 6px;
	}
	.stats strong {
		font-size: 2.8rem;
		line-height: 1.2;
		letter-spacing: -1px;
	}
	.stats strong small {
		font-size: 1.2rem;
		font-weight: 500;
		color: var(--color-text-muted);
	}
	.stats p {
		margin: 0;
		max-width: 400px;
	}
	.xp-card progress {
		width: 100%;
		height: 10px;
		appearance: none;
		border: 0;
		border-radius: 99px;
		overflow: hidden;
		background: var(--color-surface-soft);
		margin: 8px 0;
	}
	.xp-card progress::-webkit-progress-bar {
		background: var(--color-surface-soft);
	}
	.xp-card progress::-webkit-progress-value {
		background: var(--color-accent);
	}
	.xp-card progress::-moz-progress-bar {
		background: var(--color-accent);
	}
	.continue-section {
		margin-bottom: 32px;
	}
	.continue-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		margin-top: 12px;
	}
	.continue-card {
		padding: 20px;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
		text-decoration: none;
	}
	.continue-card h3 {
		margin-block: 6px 12px;
	}
	.continue-card > span:last-child {
		font-size: var(--font-small);
	}
	.section-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px 20px;
		flex-wrap: wrap;
		margin-bottom: 14px;
	}
	.section-top h2 {
		margin: 0;
	}
	.badge-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
	}
	.badge {
		padding: 20px;
		border: 1px dashed var(--color-border-strong);
		border-radius: 12px;
		display: flex;
		align-items: start;
		gap: 12px;
		background: var(--color-surface);
	}
	.badge.earned {
		border-style: solid;
		border-color: var(--color-success-border);
		background: var(--color-success-soft);
	}
	.badge-symbol {
		display: grid;
		place-items: center;
		flex: 0 0 36px;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--color-surface-soft);
		font: 600 18px monospace;
		color: var(--color-text-muted);
	}
	.earned .badge-symbol {
		color: var(--color-success);
	}
	.badge p {
		font-size: var(--font-small);
		margin: 0 0 8px;
		line-height: 1.5;
	}
	.badge-status {
		font-size: var(--font-meta);
		color: var(--color-text-muted);
	}
	.earned .badge-status {
		color: var(--color-success);
		font-weight: 650;
	}
	.activity-section {
		margin-top: 32px;
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		padding: 3px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface-soft);
	}
	.filters button {
		min-height: 38px;
		padding: 7px 10px;
		border: 0;
		background: transparent;
		color: var(--color-text-muted);
		border-radius: 5px;
		font-size: var(--font-small);
	}
	.filters .active {
		background: var(--color-surface-raised);
		color: var(--color-accent);
		font-weight: 650;
	}
	.activity-list {
		border: 1px solid var(--color-border);
		border-radius: 12px;
		overflow: hidden;
		background: var(--color-surface);
	}
	.activity-row {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
		padding: 17px 20px;
		text-decoration: none;
		color: var(--color-text);
	}
	.activity-row + .activity-row {
		border-top: 1px solid var(--color-border);
	}
	.activity-row:hover {
		background: var(--color-surface-hover);
	}
	.activity-row > div {
		flex: 1 1 220px;
		min-width: 0;
	}
	.activity-row h3 {
		margin: 3px 0 0;
	}
	.activity-status {
		font-size: var(--font-small);
		color: var(--color-text-muted);
		overflow-wrap: anywhere;
	}
	.activity-status.done {
		color: var(--color-success);
		font-weight: 600;
	}
	.row-arrow {
		color: var(--color-accent);
	}
	.settings {
		margin-top: 32px;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
	}
	summary {
		cursor: pointer;
		padding: 18px 20px;
		font-size: var(--font-body);
		font-weight: 600;
	}
	.settings-content {
		padding: 0 20px 24px;
		display: grid;
		gap: 26px;
	}
	.inline {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.inline input {
		flex: 1 1 200px;
	}
	.settings form {
		max-width: 500px;
	}
	.settings p {
		font-size: var(--font-small);
		max-width: 650px;
	}
	.delete-account {
		border-top: 1px solid var(--color-border);
		padding-top: 12px;
	}
	.delete-account summary {
		padding: 8px 0;
		color: var(--color-danger);
		font-size: var(--font-small);
	}
	.delete-account input {
		max-width: 240px;
		display: block;
		margin-bottom: 12px;
	}
	.error {
		padding: 14px 18px;
		border: 1px solid var(--color-danger-border);
		border-radius: 8px;
		background: var(--color-danger-soft);
		color: var(--color-danger);
	}
	.development {
		font-size: var(--font-small);
		margin-top: 24px;
		color: var(--color-text-muted);
	}
	footer {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 32px;
		padding: 24px 0 36px;
		border-top: 1px solid var(--color-border);
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	footer a {
		text-decoration: none;
	}
	dialog {
		width: min(480px, calc(100% - 40px));
		border: 1px solid var(--color-border);
		border-radius: 14px;
		background: var(--color-surface);
		color: var(--color-text);
		padding: 28px;
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 0.5);
	}
	@media (max-width: 900px) {
		.badge-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 600px) {
		header,
		main {
			width: calc(100% - 32px);
		}
		.header-actions {
			gap: 12px;
		}
		.header-actions > a {
			display: none;
		}
		.intro {
			padding-top: 28px;
		}
		.entry-grid,
		.stats,
		.continue-grid,
		.badge-grid {
			grid-template-columns: 1fr;
		}
		.panel {
			padding: 22px;
		}
		.welcome {
			align-items: start;
			flex-wrap: wrap;
			padding-top: 26px;
		}
		.key-panel {
			padding: 20px;
			gap: 12px;
		}
		.key-panel .panel-icon {
			display: none;
		}
		.stats {
			gap: 14px;
		}
		.badge {
			padding: 18px;
		}
		.activity-row {
			gap: 10px;
			padding: 16px;
		}
		.activity-row > div {
			flex-basis: 100%;
		}
		.row-arrow {
			margin-left: auto;
		}
	}
</style>
