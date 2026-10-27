<script>
	import { connection } from '#lib/connection.js';
	import SecureAccessGuide from '#lib/components/SecureAccessGuide.svelte';
	import { onMount } from 'svelte';
	import PersonalOverview from '#lib/components/PersonalOverview.svelte';
	import LabCustomizer from '#lib/components/LabCustomizer.svelte';
	import TrackList from '#lib/components/TrackList.svelte';
	import AchievementGallery from '#lib/components/AchievementGallery.svelte';
	import ExperienceSettings from '#lib/components/ExperienceSettings.svelte';
	import AnimatedNumber from '#lib/components/AnimatedNumber.svelte';
	import LeaderboardPreference from '#lib/components/LeaderboardPreference.svelte';
	import { hasTeacherRole } from '#lib/learning.js';
	import { fag, innholdsformat } from '#lib/innhold.js';
	import { rewardPolicy } from '#lib/progression.js';
	import {
		lab,
		createProfile,
		loginWithKey,
		logoutProfile,
		prepareRecoveryKey,
		rotateRecoveryKey,
		downloadKey,
		deleteProfile,
		refreshLab
	} from '#lib/lab.js';
	let remember = $state(true);
	let busy = $state(false);
	let message = $state('');
	let messageSuccess = $state(false);
	let filter = $state('alle');
	let downloaded = $state(false);
	let keyOwner = $state('');
	let deleteConfirmation = $state('');
	/** @type {{recoveryKey:import('#lib/lab.js').RecoveryKey,expiresAt:number}|null} */
	let preparedKey = $state(null);
	let preparedOwner = $state(''),
		rotationDownloaded = $state(false),
		rotationConfirmed = $state(false),
		rotationError = $state('');
	/** @type {import('#lib/lab.js').RecoveryKey|null} */
	let recoveryKey = $state(null);
	/** @type {HTMLDialogElement|undefined} */
	let rotationDialog = $state();
	const activities = $derived(
		($lab.summary?.progress ?? []).filter((item) => filter === 'alle' || item.subject === filter)
	);
	const finished = $derived(
		activities.filter((item) => ['passed', 'reviewed'].includes(item.status)).length
	);
	onMount(() => {
		const chosen = new URL(window.location.href).searchParams.get('fag');
		filter = fag.some((item) => item.id === chosen) ? (chosen ?? 'alle') : 'alle';
	});
	$effect(() => {
		if (!$lab.user || (recoveryKey && keyOwner !== $lab.user.id)) {
			recoveryKey = null;
			downloaded = false;
		}
		if (!$lab.user || (preparedKey && preparedOwner !== $lab.user.id)) {
			preparedKey = null;
			rotationDownloaded = false;
			rotationConfirmed = false;
			rotationDialog?.close();
		}
	});
	async function prepareRotation() {
		if (busy) return;
		const owner = $lab.user?.id;
		busy = true;
		rotationError = '';
		try {
			const result = await prepareRecoveryKey();
			if ($lab.user?.id !== owner) return;
			preparedKey = result;
			preparedOwner = owner ?? '';
			rotationDownloaded = false;
			rotationConfirmed = false;
		} catch (error) {
			rotationError = error instanceof Error ? error.message : 'Kunne ikke lage filen.';
		} finally {
			busy = false;
		}
	}
	async function confirmRotation() {
		if (busy || !preparedKey || !rotationDownloaded || !rotationConfirmed) return;
		const file = preparedKey.recoveryKey,
			owner = preparedOwner;
		busy = true;
		rotationError = '';
		try {
			await rotateRecoveryKey(file);
			if ($lab.user?.id !== owner) return;
			recoveryKey = file;
			keyOwner = owner;
			downloaded = true;
			preparedKey = null;
			message = 'Nøkkelen er byttet. Bruk filen du nettopp lagret neste gang du skal logge inn.';
			messageSuccess = true;
			rotationDialog?.close();
		} catch (error) {
			rotationError =
				(error instanceof Error ? error.message : 'Kunne ikke bekrefte byttet.') +
				' Behold filen du lastet ned. Du kan prøve å bekrefte igjen.';
		} finally {
			busy = false;
		}
	}
	/** @param {() => Promise<unknown>} action */
	async function perform(action) {
		if (busy) return;
		busy = true;
		message = '';
		messageSuccess = false;
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
		const objective = activity.objectives
			.filter((item) => !item.completedAt)
			.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
		return objective?.kind === 'attempt'
			? `${activity.href}?oppdrag=${encodeURIComponent(objective.id)}`
			: objective?.kind === 'check'
				? `${activity.href}#fagsjekk-${objective.id}`
				: activity.href;
	}
	/** @param {import('#lib/lab.js').Progress} activity */
	function statusText(activity) {
		if (
			!['reviewed', 'passed'].includes(activity.status) &&
			activity.objectives.some((item) => item.kind === 'timed' && item.available === false)
		)
			return activity.status === 'new' ? 'Krever forberedelser' : 'Venter på neste vakt';
		return activity.status === 'reviewed'
			? '✓ Gjennomgått'
			: activity.status === 'passed'
				? '✓ Bestått'
				: activity.completionEvidence !== 'reviewed' && activity.completed
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
	<main id="hovedinnhold" tabindex="-1">
		{#if $connection.publicHttp}<SecureAccessGuide />
		{:else if !$lab.ready}<p class="status" role="status">Henter profilen din …</p>
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
					<p>
						Lag en profil med ett klikk. Du får et unikt brukernavn fra IT-laben. Vi trenger verken
						navn, e-postadresse eller passord.
					</p>
					<form
						onsubmit={(event) => {
							event.preventDefault();
							void perform(async () => {
								recoveryKey = await createProfile(remember);
								keyOwner = $lab.user?.id ?? '';
								downloaded = false;
							});
						}}
					>
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
					<span class="panel-icon" aria-hidden="true"
						><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24"
							><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></svg
						></span
					>
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
						><AnimatedNumber value={$lab.summary.xp} /> <small>XP</small></strong
					><progress
						aria-label="Fremgang til neste nivå"
						max={$lab.summary.xpPerLevel}
						value={$lab.summary.xp % $lab.summary.xpPerLevel}
					></progress><span class="small"
						>{$lab.summary.xp >= $lab.summary.maximumXp
							? 'Alle dagens XP er samlet!'
							: `${$lab.summary.nextLevelAt - $lab.summary.xp} XP til labnivå ${$lab.summary.level + 1}`}</span
					>
				</div>
				<div>
					<strong>{finished}<small> / {activities.length}</small></strong><span
						>publiserte aktiviteter gjennomgått eller bestått</span
					>
					<p class="small">
						Vanlige leksjoner gir {rewardPolicy.reviewed} XP for gjennomgang, spill gir {rewardPolicy.passed}
						XP per oppdrag. Poengene frigjøres ved bestått fagsjekk, med {rewardPolicy.checked} XP ekstra.
						Nattevakten gir 50 XP ved første beståtte vakt. Fagsjekker og Nattevakten har ett forsøk per
						24 timer. Du kan lese og øve i de vanlige spillene så mye du vil.
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
			<div class="subject-filter" role="group" aria-label="Velg fag for fremgangen din">
				{#each [{ id: 'alle', navn: 'Alle fag' }, ...fag] as item (item.id)}<button
						type="button"
						class:active={filter === item.id}
						aria-pressed={filter === item.id}
						onclick={() => (filter = item.id)}>{item.navn}</button
					>{/each}
			</div>
			<PersonalOverview subject={filter} />
			<LabCustomizer />
			<TrackList subject={filter} />
			<AchievementGallery subject={filter} />
			<section class="activity-section" aria-labelledby="activity-title">
				<div class="section-top">
					<h2 id="activity-title">Innholdet ditt</h2>
					<span class="small">Gjennomgang og fagsjekker vises hver for seg.</span>
				</div>
				<div class="activity-list">
					{#each activities as activity}<a href={resumeLink(activity)} class="activity-row"
							><div>
								<span class="small"
									>{fag.find((item) => item.id === activity.subject)?.navn ?? activity.subject} · {innholdsformat(
										activity.format
									).entall}</span
								>
								<h3>{activity.title}</h3>
							</div>
							<span
								class="activity-status"
								class:done={['passed', 'reviewed'].includes(activity.status)}
								>{statusText(activity)}{#if activity.checksCompleted}<small>
										· {activity.checksCompleted}/{activity.checksTotal} fagsjekker bestått</small
									>{/if}{#if activity.pendingXp}<small>
										· {activity.pendingXp} XP venter på fagsjekk</small
									>{/if}</span
							><span class="row-arrow" aria-hidden="true">→</span></a
						>{/each}
				</div>
			</section>
			<details class="settings">
				<summary>Profil og nøkkelfil</summary>
				<div class="settings-content">
					<details>
						<summary>Profilinformasjon</summary>
						<p>Din profil-ID: <code style="overflow-wrap:anywhere">{$lab.user.id}</code></p>
					</details>
					{#if hasTeacherRole($lab.user.role)}<p><a href="/laerer/">Åpne lærerpanel →</a></p>{/if}
					<p>
						Brukernavnet er tildelt av IT-laben. Be læreren om hjelp hvis det må endres. Nøkkelfilen
						gir tilgang til profilen uavhengig av navnet.
					</p>
					<LeaderboardPreference />
					<div>
						<h3>Trenger du en ny nøkkelfil?</h3>
						<p>
							Last ned den nye filen først. Den gamle virker til du bekrefter byttet. Deretter
							logges andre enheter ut. Progresjonen beholdes.
						</p>
						<button
							class="secondary"
							type="button"
							disabled={busy}
							onclick={() => {
								rotationError = '';
								rotationDialog?.showModal();
							}}>Lag ny nøkkelfil</button
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
		{#if message}<p
				class:error={!messageSuccess}
				class:notice={messageSuccess}
				role={messageSuccess ? 'status' : 'alert'}
			>
				{message}
			</p>{/if}
		<ExperienceSettings />
		<footer><a href="/">← Til IT-laben</a><span>Se. Prøv. Forstå.</span></footer>
	</main>
	<dialog bind:this={rotationDialog} aria-labelledby="rotation-title">
		<h2 id="rotation-title">Bytt nøkkelfil trygt</h2>
		{#if !preparedKey}
			<p>
				Vi lager en ny fil som du lagrer først. Den gamle nøkkelen og påloggingene dine virker frem
				til du bekrefter byttet.
			</p>
			<div class="inline">
				<button
					class="secondary"
					type="button"
					disabled={busy}
					onclick={() => rotationDialog?.close()}>Avbryt</button
				><button class="primary" type="button" disabled={busy} onclick={prepareRotation}
					>{busy ? 'Lager fil …' : 'Lag den nye filen'}</button
				>
			</div>
		{:else}
			<p>
				1. Last ned og ta vare på den nye filen. Gi den gjerne et navn du kjenner igjen. Du har 30
				minutter til å bekrefte byttet.
			</p>
			<button
				class="primary"
				type="button"
				disabled={busy}
				onclick={() => {
					if (preparedKey) {
						downloadKey(preparedKey.recoveryKey);
						rotationDownloaded = true;
					}
				}}>Last ned ny nøkkelfil</button
			>
			<label class="remember"
				><input
					type="checkbox"
					disabled={!rotationDownloaded || busy}
					bind:checked={rotationConfirmed}
				/>Jeg har lagret den nye nøkkelfilen.</label
			>
			<p>2. Bekreft byttet. Da slutter den gamle filen å virke, og andre enheter logges ut.</p>
			<div class="inline">
				<button
					class="secondary"
					type="button"
					disabled={busy}
					onclick={() => rotationDialog?.close()}>Avbryt</button
				><button
					class="primary"
					type="button"
					disabled={busy || !rotationDownloaded || !rotationConfirmed}
					onclick={confirmRotation}>{busy ? 'Bekrefter …' : 'Bekreft nøkkelbyttet'}</button
				><button class="secondary" type="button" disabled={busy} onclick={prepareRotation}
					>Lag en annen fil</button
				>
			</div>
		{/if}
		{#if rotationError}<p class="error" role="alert">{rotationError}</p>{/if}
	</dialog>
</div>

<style>
	.profile-page {
		min-height: 100vh;
		background: var(--color-page);
		font-family: var(--font-ui);
		color: var(--color-text);
	}
	.profile-page,
	.profile-page * {
		box-sizing: border-box;
	}
	main {
		width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		margin-inline: auto;
	}

	a {
		color: var(--color-accent);
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
		border-radius: var(--radius-card);
		margin-bottom: 16px;
		background: var(--color-accent-soft);
		color: var(--color-accent);
		font-size: 24px;
	}
	input:not([type='checkbox']):not([type='file']) {
		width: 100%;
		min-width: 0;
		min-height: 46px;
		padding: 10px 13px;
		border: 1px solid var(--color-border-strong);
		border-radius: 7px;
		background: var(--color-surface);
		color: var(--color-text);
		margin-bottom: 12px;
	}
	.primary,
	.secondary,
	.danger,
	.key-panel button,
	.notice button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 10px 16px;
		border: 1px solid var(--color-action);
		border-radius: 7px;
		background: var(--color-action);
		color: var(--color-on-action);
		font:
			650 var(--font-small)/1.5 system-ui,
			sans-serif;
		text-decoration: none;
	}
	.secondary,
	.notice button {
		background: var(--color-surface);
		color: var(--color-accent);
		border-color: var(--color-border-strong);
	}
	.danger {
		background: var(--color-danger-soft);
		color: var(--color-danger);
		border-color: var(--color-danger-border);
	}
	.file-label {
		display: inline-flex;
		align-items: center;
		padding: 11px 16px;
		border: 1px solid var(--color-border-strong);
		border-radius: 7px;
		color: var(--color-accent);
		cursor: pointer;
		font-size: var(--font-small);
		font-weight: 650;
		min-height: 44px;
	}
	input[type='file'] {
		display: block;
		width: 100%;
		margin-top: 10px;
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.remember {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 22px 0 8px;
		font-size: var(--font-small);
	}
	.remember input {
		width: 18px;
		height: 18px;
		accent-color: var(--color-action);
	}
	.small {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	code {
		font-size: var(--font-code-small);
		overflow-wrap: anywhere;
	}
	.welcome {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 20px;
		padding: 40px 0 22px;
	}
	.welcome h1 {
		margin-bottom: 0;
	}
	.key-panel,
	.notice {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		flex-wrap: wrap;
		padding: 22px;
		margin-bottom: 24px;
		border: 1px solid var(--color-warning-border);
		border-radius: 12px;
		background: var(--color-warning-soft);
	}
	.key-panel > div {
		min-width: 0;
	}
	.key-panel p,
	.notice p {
		margin-bottom: 8px;
	}
	.stats {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		border: 1px solid var(--color-border);
		border-radius: 14px;
		overflow: hidden;
		background: var(--color-surface);
		margin: 0 0 24px;
	}
	.stats > div {
		padding: 24px 28px;
		min-width: 0;
	}
	.stats > div + div {
		border-left: 1px solid var(--color-border);
	}
	.stats strong {
		display: block;
		font-size: 2.5rem;
		letter-spacing: -1px;
		line-height: 1.2;
	}
	.stats strong small {
		font-size: 1.15rem;
		color: var(--color-text-muted);
		font-weight: 500;
	}
	.stats > div > span {
		display: block;
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.stats p {
		margin-bottom: 0;
	}
	.xp-card progress {
		display: block;
		width: 100%;
		height: 7px;
		margin: 14px 0 8px;
		accent-color: var(--color-accent);
	}
	.subject-filter {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin: 0 0 20px;
	}
	.subject-filter button {
		padding: 9px 14px;
		min-height: 42px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface);
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.subject-filter button.active {
		background: var(--color-action);
		border-color: var(--color-action);
		color: var(--color-on-action);
	}
	.activity-section {
		margin: 36px 0;
	}
	.section-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 14px;
		margin-bottom: 14px;
	}
	.activity-list {
		border: 1px solid var(--color-border);
		border-radius: 12px;
		overflow: hidden;
		background: var(--color-surface);
	}
	.activity-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto 16px;
		align-items: center;
		gap: 18px;
		padding: 18px 20px;
		color: var(--color-text);
		text-decoration: none;
		border-bottom: 1px solid var(--color-border);
	}
	.activity-row:last-child {
		border-bottom: 0;
	}
	.activity-row:hover {
		background: var(--color-surface-hover);
	}
	.activity-row h3 {
		margin-top: 3px;
		margin-bottom: 0;
	}
	.activity-status {
		color: var(--color-text-muted);
		font-size: var(--font-small);
		max-width: 220px;
		overflow-wrap: anywhere;
	}
	.activity-status small {
		display: block;
		font-size: var(--font-meta);
	}
	.activity-status.done {
		color: var(--color-success);
	}
	.row-arrow {
		color: var(--color-accent);
	}
	.settings {
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
		margin: 32px 0 20px;
	}
	.settings > summary {
		padding: 18px 22px;
		cursor: pointer;
		font-weight: 650;
		font-size: var(--font-small);
	}
	.settings-content {
		padding: 0 22px 24px;
		display: grid;
		gap: 26px;
	}
	.inline {
		display: flex;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 10px;
	}
	.delete-account {
		border-top: 1px solid var(--color-border);
		padding-top: 18px;
	}
	.delete-account summary {
		cursor: pointer;
		color: var(--color-danger);
		font-size: var(--font-small);
	}
	.delete-account input {
		max-width: 280px;
		display: block;
		margin-top: 8px;
	}
	.error {
		padding: 14px;
		border: 1px solid var(--color-danger-border);
		color: var(--color-danger);
		background: var(--color-danger-soft);
		border-radius: 8px;
	}
	.status {
		padding-block: 60px;
	}
	footer {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		padding: 24px 0 36px;
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	dialog {
		max-width: min(500px, calc(100vw - 32px));
		padding: 28px;
		border: 1px solid var(--color-border-strong);
		border-radius: 14px;
		background: var(--color-surface);
		color: var(--color-text);
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 45%);
	}
	@media (max-width: 700px) {
		.entry-grid {
			grid-template-columns: 1fr;
		}
		.stats > div {
			padding: 20px;
		}
		.activity-row {
			grid-template-columns: minmax(0, 1fr) 16px;
			gap: 6px 12px;
		}
		.activity-status {
			grid-column: 1;
			max-width: none;
		}
		.row-arrow {
			grid-row: 1/3;
			grid-column: 2;
		}
	}
	@media (max-width: 480px) {
		main {
			width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		}
		.stats {
			grid-template-columns: 1fr;
		}
		.stats > div + div {
			border-left: 0;
			border-top: 1px solid var(--color-border);
		}
		.panel {
			padding: 22px;
		}
		.welcome h1 {
			font-size: 2rem;
		}
		.intro {
			padding-top: 32px;
		}
	}
</style>
