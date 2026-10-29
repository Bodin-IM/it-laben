<script>
	import { connection } from '#lib/connection.js';
	import SecureAccessGuide from '#lib/components/SecureAccessGuide.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import LabCustomizer from '#lib/components/LabCustomizer.svelte';
	import TrackList from '#lib/components/TrackList.svelte';
	import AchievementGallery from '#lib/components/AchievementGallery.svelte';
	import ExperienceSettings from '#lib/components/ExperienceSettings.svelte';
	import LeaderboardPreference from '#lib/components/LeaderboardPreference.svelte';
	import ClassMembership from '#lib/components/ClassMembership.svelte';
	import { hasTeacherRole } from '#lib/learning.js';
	import { fag, innholdsformat } from '#lib/innhold.js';
	import { nextActivity, rewardPolicy } from '#lib/progression.js';
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
	let mounted = $state(false);
	const settingsView = $derived(mounted && page.url.searchParams.get('visning') === 'innstillinger');
	const chosenSubject = $derived(mounted ? page.url.searchParams.get('fag') : null);
	const filter = $derived(
		fag.some((item) => item.id === chosenSubject) ? (chosenSubject ?? 'alle') : 'alle'
	);
	const subjectTitle = $derived(fag.find((item) => item.id === filter)?.navn ?? 'Alle fag');
	const labHref = $derived(filter === 'alle' ? '/min-lab/' : `/min-lab/?fag=${filter}`);
	const settingsHref = $derived(`${labHref}${filter === 'alle' ? '?' : '&'}visning=innstillinger`);
	const next = $derived(nextActivity($lab.summary?.progress ?? [], filter));
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
		mounted = true;
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
			if (hasTeacherRole($lab.user?.role)) await goto('/laerer/undervisning/');
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
	><title>{settingsView ? 'Innstillinger' : 'Min lab – fremgang og merker'} | IT-laben</title><meta
		name="robots"
		content="noindex"
	/></svelte:head
>
<div class="profile-page">
	<main id="hovedinnhold" tabindex="-1">
		{#if !$connection.publicHttp || settingsView}
			<header class="page-heading">
				<h1>{settingsView ? 'Innstillinger' : 'Min lab'}</h1>
				<p>
					{settingsView
						? 'Tilpass laben, velg klasse og ta vare på profilen din.'
						: 'Fremgangen din, merkene dine og veien videre – samlet på ett sted.'}
				</p>
			</header>
		{/if}
		<nav class="view-nav" aria-label="Min lab og innstillinger">
			<a href={labHref} aria-current={!settingsView ? 'page' : undefined}>Min lab</a>
			<a href={settingsHref} aria-current={settingsView ? 'page' : undefined}>Innstillinger</a>
		</nav>
		{#if $connection.publicHttp}
			{#if settingsView}
				<p class="notice">
					Profilvalg krever sikker tilkobling.
					<a href="/kom-i-gang/">Åpne tilkoblingshjelpen →</a>
				</p>
			{:else}<SecureAccessGuide />{/if}
		{:else if !$lab.ready}<p class="status" role="status">Henter profilen din …</p>
		{:else if !$lab.user}
			{#if settingsView}
				<p class="notice">
					Du kan tilpasse denne nettleseren uten profil.
					<a href={labHref}>Opprett eller åpne profilen din →</a>
				</p>
			{:else}
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
			{/if}
		{:else if $lab.summary}
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
			{#if !settingsView}
				<nav class="subject-filter" aria-label="Velg fag for fremgangen din">
					{#each [{ id: 'alle', navn: 'Alle fag' }, ...fag] as item (item.id)}
						<a href={item.id === 'alle' ? '/min-lab/' : `/min-lab/?fag=${item.id}`}
							aria-current={filter === item.id ? 'true' : undefined}>{item.navn}</a>
					{/each}
				</nav>
				<div class="overview-grid">
					<LabCustomizer editable={false} />
					<section class="progress-summary" aria-labelledby="progress-title">
						<p class="eyebrow">{subjectTitle}</p>
						<h2 id="progress-title">Fremgangen din</h2>
						<p><strong>{finished} av {activities.length}</strong> aktiviteter gjennomgått eller bestått.</p>
						<progress aria-label={`Aktiviteter gjennomgått eller bestått: ${subjectTitle}`}
							max={activities.length || 1} value={finished}></progress>
						{#if next}
							<div class="next-step">
								<span class="small">Neste steg</span>
								<h3>{next.title}</h3>
								<a class="primary" href={next.href}>{next.evidence === 'checked' ? 'Prøv fagsjekken' : 'Fortsett'} →</a>
							</div>
						{:else}<p class="small">Ingen nye steg klare akkurat nå. Du kan gå tilbake til aktivitetene under.</p>{/if}
					</section>
				</div>
				<nav class="collection-nav" aria-label="I samlingen din">
					<a href={`${labHref}#fagspor`}>Fagspor</a>
					<a href={`${labHref}#merker`}>Merker og milepæler</a>
					<a href={`${labHref}#aktiviteter`}>Aktiviteter</a>
				</nav>
				<details class="reward-help">
					<summary>Slik fungerer XP og fremgang</summary>
					<p>Vanlige leksjoner gir {rewardPolicy.reviewed} XP for gjennomgang, spill gir {rewardPolicy.passed}
						XP per oppdrag. Poengene frigjøres ved bestått fagsjekk, med {rewardPolicy.checked} XP ekstra.
						Nattevakten gir 50 XP ved første beståtte vakt. Fagsjekker og Nattevakten har ett forsøk per
						24 timer. Du kan lese og øve i de vanlige spillene så mye du vil.</p>
					<p>XP og gjennomføring viser aktivitet. De dokumenterer ikke alene hva du har forstått.</p>
				</details>
				{#if $lab.user.role === 'student' && !$lab.user.classCode}
					<p class="small">Du har ikke valgt klasse ennå. <a href={`${settingsHref}#klasse`}>Velg klasse i Innstillinger →</a></p>
				{/if}
				<div id="fagspor"><TrackList subject={filter} /></div>
				<AchievementGallery subject={filter} />
				<details id="aktiviteter" class="activity-section" open={mounted && page.url.hash === '#aktiviteter'}>
					<summary>Aktivitetene dine <span class="small">{finished} av {activities.length} gjennomgått eller bestått</span></summary>
					<p class="small">Gjennomgang og fagsjekker vises hver for seg.</p>
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
				</details>
			{/if}
		{/if}
		{#if message}<p
				class:error={!messageSuccess}
				class:notice={messageSuccess}
				role={messageSuccess ? 'status' : 'alert'}
			>
				{message}
			</p>{/if}
		{#if settingsView}
			<ExperienceSettings />
			<details class="settings">
				<summary>Utseende <span>Tema, avatar og labkort</span></summary>
				<div class="settings-content">
					<div><h2>Tema</h2><ThemeToggle /></div>
					{#if !$connection.publicHttp && $lab.user && $lab.summary}
						<LabCustomizer />
					{:else}<p>Åpne en profil for å velge avatar, labfarge og et merke til labkortet.</p>{/if}
				</div>
			</details>
			{#if !$connection.publicHttp && $lab.user && $lab.summary}
				{#if $lab.user.role === 'student'}
					<details class="settings" id="klasse" open={mounted && page.url.hash === '#klasse'}>
						<summary>Klasse og toppliste <span>{$lab.user.classCode ?? 'Ingen klasse valgt'}</span></summary>
						<div class="settings-content">
							{#key $lab.user.id}<ClassMembership /><LeaderboardPreference />{/key}
						</div>
					</details>
				{/if}
				<details class="settings" id="profil" open={mounted && page.url.hash === '#profil'}>
					<summary>Profil og nøkkelfil <span>Pålogging, profil-ID og sletting</span></summary>
					<div class="settings-content">
						<details>
							<summary>Profilinformasjon</summary>
							<p>Din profil-ID: <code style="overflow-wrap:anywhere">{$lab.user.id}</code></p>
						</details>
						{#if hasTeacherRole($lab.user.role)}<p>
								<a href="/laerer/undervisning/">Åpne lærerpanel →</a>
							</p>{/if}
						<p>
							Brukernavnet er tildelt av IT-laben. Be læreren om hjelp hvis det må endres. Nøkkelfilen
							gir tilgang til profilen uavhengig av navnet.
						</p>
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
						<button class="secondary logout" type="button" disabled={busy}
							onclick={() => perform(logoutProfile)}>Logg ut</button>
						<details class="delete-account">
							<summary>Slett profilen</summary>
							<p>
								Dette sletter progresjon, XP og merker permanent. Nøkkelfilen vil ikke lenger
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
		{/if}
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
	.eyebrow {
		font-size: var(--font-meta);
		color: var(--color-accent);
		letter-spacing: 1.5px;
		font-weight: 750;
		margin: 0 0 8px;
	}
	h1 {
		font-size: clamp(1.8rem, 4vw, 2.5rem);
		line-height: 1.1;
		letter-spacing: -1px;
		margin: 0 0 8px;
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
	.page-heading {
		padding: 28px 0 8px;
	}
	.page-heading p {
		margin-bottom: 12px;
	}
	.view-nav {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 24px;
	}
	.view-nav a {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 10px 16px;
		border-bottom: 3px solid transparent;
		color: var(--color-text-muted);
		text-decoration: none;
		font-weight: 650;
	}
	.view-nav a[aria-current] {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
	.overview-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 20px;
	}
	.progress-summary {
		padding: 22px;
		border: 1px solid var(--color-border);
		border-radius: 16px;
		background: var(--color-surface);
	}
	.progress-summary progress {
		display: block;
		width: 100%;
		height: 8px;
		accent-color: var(--color-accent);
	}
	.next-step {
		margin-top: 20px;
	}
	.next-step h3 {
		margin: 4px 0 12px;
	}
	.collection-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 20px;
		margin-top: 16px;
	}
	.collection-nav a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font-size: var(--font-small);
	}
	summary {
		cursor: pointer;
		min-height: 44px;
	}
	.reward-help {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.reward-help summary {
		padding-block: 12px;
	}
	.reward-help p {
		max-width: 75ch;
		font-size: var(--font-small);
	}
	.settings > summary span {
		display: block;
		font-weight: 400;
		color: var(--color-text-muted);
		margin-top: 4px;
	}
	.logout {
		justify-self: start;
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
	.subject-filter {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin: 0 0 20px;
	}
	.subject-filter a {
		display: inline-flex;
		align-items: center;
		padding: 9px 14px;
		min-height: 44px;
		text-decoration: none;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface);
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.subject-filter a[aria-current] {
		background: var(--color-action);
		border-color: var(--color-action);
		color: var(--color-on-action);
	}
	.activity-section {
		margin: 28px 0;
		border-top: 1px solid var(--color-border);
	}
	.activity-section > summary {
		padding-block: 18px;
		font-weight: 650;
	}
	.activity-section > summary span {
		margin-left: 12px;
		font-weight: 400;
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
		margin: 16px 0;
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
		gap: 20px;
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
		.overview-grid,
		.entry-grid {
			grid-template-columns: 1fr;
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
		.panel {
			padding: 22px;
		}
	}
</style>
