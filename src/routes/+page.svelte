<script>
	import { onMount, tick } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import GlobalLabPartner from '#lib/components/GlobalLabPartner.svelte';
	import { labPreferences } from '#lib/labPreferences.js';
	import { afterNavigate, goto, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import PersonalOverview from '#lib/components/PersonalOverview.svelte';
	import ModuleCard from '#lib/components/ModuleCard.svelte';
	import ActivityCard from '#lib/components/ActivityCard.svelte';
	import { altElevinnhold as aktiviteter, fag, innholdsformat } from '#lib/innhold.js';
	import { searchCatalogue, normalizeSearch } from '#lib/catalogueSearch.js';
	import { lab } from '#lib/lab.js';
	import { teacherLanding } from '#lib/teacherNavigation.js';
	import { connection, secureHref } from '#lib/connection.js';
	import { publicationFor } from '#lib/modulePublication.js';
	import { modulePublication, refreshModulePublication } from '#lib/modulePublicationStore.js';

	const sidebarScreen = new MediaQuery('(min-width: 801px)', true);
	let filtersOpen = $state(true);
	$effect(() => { filtersOpen = sidebarScreen.current; });

	let valgtFag = $state('alle');
	let valgtFormat = $state('alle');
	let sok = $state('');
	const filtering = $derived(!!sok.trim() || valgtFormat !== 'alle');
	let activitiesOpen = $state(false);
	$effect(() => {
		if (sok.trim() || valgtFormat !== 'alle' || $connection.publicHttp || $modulePublication.error)
			activitiesOpen = true;
	});
	let klar = $state(false);
	/** @type {{pathname:string,search:string,hash:string}|null} */
	let landingEntry = $state(null);
	/** @type {HTMLInputElement|undefined} */
	let searchInput = $state();
	const formater = [
		{ id: 'alle', navn: 'Alle typer' },
		...Array.from(new Set(aktiviteter.map((item) => item.format))).map(innholdsformat)
	];
	const valgtFagnavn = $derived(fag.find((item) => item.id === valgtFag)?.navn ?? 'Alle fag');
	const resultater = $derived(
		searchCatalogue({
			subject: valgtFag,
			format: valgtFormat,
			query: sok,
			publications: $modulePublication.ready ? $modulePublication.modules : []
		})
	);
	const aktiveModuler = $derived(
		resultater.modules.filter(
			(module) => publicationFor(module.id, $modulePublication.modules).status === 'active'
		)
	);
	const tidligereModuler = $derived(
		resultater.modules.filter(
			(module) => publicationFor(module.id, $modulePublication.modules).status === 'completed'
		)
	);
	const fagGrupper = $derived(
		fag
			.filter((gruppe) => valgtFag === 'alle' || gruppe.id === valgtFag)
			.map((gruppe) => ({
				...gruppe,
				aktiviteter: resultater.activities.filter((activity) => activity.fag === gruppe.id)
			}))
	);
	const secureOverviewPath = $derived.by(() => {
		const url = new URL(page.url.href);
		url.searchParams.set('visning', 'elev');
		return url.pathname + url.search + url.hash;
	});

	async function nullstillSok() {
		sok = '';
		valgtFormat = 'alle';
		await tick();
		searchInput?.focus();
	}

	function lesAdresse() {
		const url = new URL(window.location.href);
		const viserOvingene = url.hash === '#ovingene';
		if (['#utforsk', '#spill', '#ovingene'].includes(url.hash)) activitiesOpen = true;
		valgtFag = fag.find((gruppe) => gruppe.id === url.searchParams.get('fag'))?.id ?? 'alle';
		valgtFormat =
			formater.find((format) => format.id === url.searchParams.get('type'))?.id ??
			(url.hash === '#spill' ? 'spill' : viserOvingene ? 'leksjon' : 'alle');
		sok = url.searchParams.get('q') ?? (viserOvingene ? 'øving' : '');
	}
	afterNavigate(({ to }) => {
		lesAdresse();
		// Capture real page entry; changing catalogue filters with replaceState is not a new visit.
		landingEntry = to
			? { pathname: to.url.pathname, search: to.url.search, hash: to.url.hash }
			: null;
	});
	onMount(() => {
		lesAdresse();
		klar = true;
		window.addEventListener('popstate', lesAdresse);
		window.addEventListener('hashchange', lesAdresse);
		return () => {
			window.removeEventListener('popstate', lesAdresse);
			window.removeEventListener('hashchange', lesAdresse);
		};
	});
	$effect(() => {
		if (!klar || !$lab.ready || !landingEntry) return;
		const destination = teacherLanding($lab.user?.role, landingEntry);
		landingEntry = null;
		// A person may already have chosen a filter while their login was being checked.
		if (destination && teacherLanding($lab.user?.role, window.location))
			void goto(destination, { replace: true });
	});
	$effect(() => {
		if (!klar) return;
		const url = new URL(window.location.href);
		for (const [key, value] of [
			['fag', valgtFag],
			['type', valgtFormat],
			['q', sok.trim()]
		]) {
			if (!value || (key !== 'q' && value === 'alle')) url.searchParams.delete(key);
			else url.searchParams.set(key, value);
		}
		if (url.hash === '#spill' && valgtFormat !== 'spill') url.hash = '';
		if (
			url.hash === '#ovingene' &&
			(valgtFormat !== 'leksjon' || normalizeSearch(sok).trim() !== 'oving')
		)
			url.hash = '';
		if (url.href !== window.location.href) replaceState(url, {});
	});
</script>

{#snippet moduleStatus()}
	{#if $connection.publicHttp}
		<div class="module-notice">
			<p>Åpne den sikre siden for å se hvilke moduler læreren har åpnet.</p>
			<a class="jump" href={secureHref($connection.httpsOrigin, secureOverviewPath)}
				>Se modulene på sikker side →</a
			>
			<p class="notice-detail">
				Enkeltoppgavene på denne siden er fortsatt tilgjengelige.
			</p>
		</div>
	{:else if !$modulePublication.ready}
		<div class="module-notice" aria-live="polite">
			{#if $modulePublication.error}
				<p>{$modulePublication.error}</p>
				<button
					type="button"
					class="text-button"
					disabled={$modulePublication.loading}
					onclick={() => refreshModulePublication()}
					>{$modulePublication.loading ? 'Henter moduler …' : 'Prøv igjen'}</button
				>
			{:else}<p>Henter moduler …</p>{/if}
		</div>
	{:else}
		{#if $modulePublication.error}
			<div class="module-notice" role="status">
				<p>Viser sist hentede oversikt. {$modulePublication.error}</p>
				<button
					type="button"
					class="text-button"
					disabled={$modulePublication.loading}
					onclick={() => refreshModulePublication()}>Prøv igjen</button
				>
			</div>
		{/if}
	{/if}
{/snippet}

<svelte:head>
	<title>IT-laben – fag, moduler og aktiviteter</title>
	<meta
		name="description"
		content="Utforsk utvikling og driftsstøtte. Finn moduler, undervisning, øvinger og spill, og prøv selv i IT-laben."
	/>
</svelte:head>

<div class="forside">
	<div class="catalogue-layout">
		<div class="sidebar" class:with-partner={$labPreferences.companion}>
			{#if $labPreferences.companion}<GlobalLabPartner inSidebar />{/if}
			<details class="catalogue-filters" bind:open={filtersOpen}>
				<summary>{valgtFag === 'alle' && valgtFormat === 'alle' ? 'Fag og type' : valgtFagnavn}{#if valgtFormat !== 'alle'}<small>{formater.find((item) => item.id === valgtFormat)?.navn}</small>{/if}</summary>
				<div class="filter-content">
					<p class="nav-label" id="fag-label">Fag</p>
					<div class="fagliste" role="group" aria-labelledby="fag-label">
						<button
							type="button"
							class="fagkort"
							class:valgt={valgtFag === 'alle'}
							aria-pressed={valgtFag === 'alle'}
							aria-controls="moduler utforsk"
							onclick={() => (valgtFag = 'alle')}
						>
							<span class="fagsymbol" aria-hidden="true">◫</span><span>Alle fag</span>
						</button>
						{#each fag as gruppe (gruppe.id)}
							<button
								type="button"
								class="fagkort"
								class:valgt={valgtFag === gruppe.id}
								aria-pressed={valgtFag === gruppe.id}
								aria-controls="moduler utforsk"
								onclick={() => (valgtFag = gruppe.id)}
							>
								<span class="fagsymbol" aria-hidden="true">{gruppe.symbol.replaceAll(' ', '')}</span
								><span>{gruppe.navn}</span>
							</button>
						{/each}
					</div>
					<label class="type-label" for="innholdstype">Type enkeltoppgave</label>
					<select id="innholdstype" bind:value={valgtFormat} aria-controls="resultater">
						{#each formater as format (format.id)}<option value={format.id}>{format.navn}</option>{/each}
					</select>
					<nav class="section-nav" aria-label="På denne siden">
						<a href="#moduler">Moduler <span aria-hidden="true">↓</span></a>
						<a href="#utforsk" onclick={() => (activitiesOpen = true)}>Finn enkeltoppgaver <span aria-hidden="true">↓</span></a>
					</nav>
				</div>
			</details>
		</div>

		<main id="hovedinnhold" tabindex="-1">
			<h1 id="sidetittel" class="sr-only">{valgtFag === 'alle' ? 'Fagoversikt' : valgtFagnavn}</h1>

			<div class="search-tools">
				<label for="innholdssok" class="sr-only"
					>{valgtFag === 'alle'
						? 'Søk i alle fag'
						: `Søk i ${valgtFagnavn.toLocaleLowerCase('nb-NO')}`}</label
				>
				<div class="search-row">
					<div class="sokefelt">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.7"
							aria-hidden="true"
							><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg
						>
						<input
							id="innholdssok"
							type="search"
							placeholder="Søk etter tema, modul eller oppgave …"
							bind:value={sok}
							bind:this={searchInput}
							autocomplete="off"
							aria-controls="moduler resultater"
						/>
					</div>
				</div>

				<div class="search-status" class:sr-only={!filtering}>
					<p role="status" aria-atomic="true">
						{#if $modulePublication.ready}
							{resultater.modules.length}
							{resultater.modules.length === 1 ? 'modul' : 'moduler'}
							<span aria-hidden="true">·</span>
						{/if}
						{resultater.activities.length}
						{resultater.activities.length === 1 ? 'aktivitet' : 'aktiviteter'}{sok.trim()
							? ` for «${sok.trim()}»`
							: ''}
					</p>

					{#if sok || valgtFormat !== 'alle'}<button
							type="button"
							class="text-button"
							onclick={nullstillSok}>Nullstill søk og type</button
						>{/if}
				</div>
			</div>

			{#if filtering}
				<div id="resultater" class="search-results">
					<section id="utforsk" aria-labelledby="trefftittel">
						<div id="spill" class="anker" aria-hidden="true"></div>
						<div id="ovingene" class="anker" aria-hidden="true"></div>
						<h2 id="trefftittel" class="result-heading">Enkeltoppgaver <span class="count">{resultater.activities.length}</span></h2>
						<div class="result-list">
							{#each resultater.activities as activity (activity.id)}<ActivityCard {activity} compact />{/each}
						</div>
						{#if !resultater.activities.length}
							{#if resultater.modules.length}<p class="empty-modules">Ingen enkeltoppgaver passer, men søket fant moduler nedenfor.</p>
							{:else}
							<div class="tomt-resultat">
								<h3>Ingen enkeltoppgaver passer til søket</h3>
								<p>Prøv et annet søkeord, en annen type eller et annet fag.</p>
								<button type="button" class="handling" onclick={nullstillSok}>Nullstill søk og type</button>
							</div>
							{/if}
						{/if}
					</section>
					<section id="moduler" class="matching-modules" aria-labelledby="modultittel">
						<h2 id="modultittel" class="result-heading">Moduler {#if $modulePublication.ready}<span class="count">{resultater.modules.length}</span>{/if}</h2>
						<div class="result-list">
							{#each resultater.modules as module (module.id)}<ModuleCard {module} publication={publicationFor(module.id, $modulePublication.modules)} compact />{/each}
						</div>
						{@render moduleStatus()}
						{#if $modulePublication.ready && !$connection.publicHttp && !resultater.modules.length}<p class="empty-modules">Ingen åpne moduler passer til søket.</p>{/if}
					</section>
				</div>
			{:else}
				<section id="moduler" class="moduloversikt" aria-labelledby="modultittel">
					<h2 id="modultittel" class="sr-only">Moduler</h2>
					{@render moduleStatus()}
					{#if $modulePublication.ready && !$connection.publicHttp}
						{#if aktiveModuler.length}
							<div class="module-group">
								<div class="modulkortliste">
									{#each aktiveModuler as module (module.id)}<ModuleCard
											{module}
											publication={publicationFor(module.id, $modulePublication.modules)}
										/>{/each}
								</div>
							</div>
						{/if}
						{#if tidligereModuler.length}
							<div class="module-group">
								<h3 class="module-group-title">Tidligere moduler</h3>
								<div class="modulkortliste">
									{#each tidligereModuler as module (module.id)}<ModuleCard
											{module}
											publication={publicationFor(module.id, $modulePublication.modules)}
											headingLevel={4}
										/>{/each}
								</div>
							</div>
						{/if}
						{#if !resultater.modules.length}<p class="empty-modules">
								Ingen moduler er åpnet for dette faget ennå. Utforsk aktivitetene nedenfor.
							</p>{/if}
					{/if}
				</section>

				<PersonalOverview subject={valgtFag} />

				<section id="utforsk" class="oversikt" aria-labelledby="aktivitetstittel">
					<details class="activity-browser" bind:open={activitiesOpen}>
						<summary><h2 id="aktivitetstittel">Finn enkeltoppgaver <span class="count">{resultater.activities.length}</span></h2></summary>

						<div id="spill" class="anker" aria-hidden="true"></div>
						<div id="ovingene" class="anker" aria-hidden="true"></div>
						<div id="resultater">
							{#if !resultater.activities.length}<div class="tomt-resultat">
									<h3>Ingen aktiviteter passer til søket</h3>
									<p>Prøv et annet søkeord eller en annen aktivitetstype.</p>
									<button type="button" class="handling" onclick={nullstillSok}
										>Vis innholdet i valgt fag</button
									>
								</div>{/if}
							{#each fagGrupper as gruppe (gruppe.id)}
								{#if gruppe.aktiviteter.length}<section
										class="faggruppe"
										aria-label={`Aktiviteter i ${gruppe.navn}`}
									>
										{#if valgtFag === 'alle'}<h3 class="group-label">{gruppe.navn}</h3>{/if}
										<div class="kortliste">
											{#each gruppe.aktiviteter as activity (activity.id)}<ActivityCard
													{activity}
												/>{/each}
										</div>
									</section>{/if}
							{/each}
						</div>
					</details>
				</section>
			{/if}
			<footer>
				<span>IT-laben.</span>
				<p>Ta ett steg om gangen. Prøv igjen når du trenger det.</p>
			</footer>
		</main>
	</div>
</div>

<style>
	.forside .sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		min-height: 0;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
	.catalogue-filters { min-width: 0; }
	.catalogue-filters > summary {
		min-height: 48px;
		padding: 12px;
		cursor: pointer;
		font-size: var(--font-small);
		font-weight: 650;
	}
	.catalogue-filters small { display: block; color: var(--color-text-muted); font-weight: 400; }
	.type-label { display: block; margin: 20px 0 8px; font-size: var(--font-small); font-weight: 600; }
	select {
		width: 100%;
		min-width: 0;
		min-height: 44px;
		padding: 8px;
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
		background: var(--color-surface);
		color: var(--color-text);
	}

	.result-heading { margin-bottom: 12px; font-size: 1.15rem; }
	.result-list { display: grid; gap: 8px; }
	.matching-modules { margin-top: 28px; }
	.matching-modules .module-notice { margin-top: 12px; }

	.activity-browser > summary {
		overflow-wrap: anywhere;
		cursor: pointer;
		min-height: 44px;
		font-size: 1.3rem;
		font-weight: 650;
		margin-bottom: 18px;
	}
	.activity-browser > summary:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}
	.activity-browser > summary h2 { display: inline; font-size: inherit; }

	.forside {
		overflow-wrap: anywhere;
		font-family: var(--font-ui);
	}
	.forside,
	.forside :global(*) {
		box-sizing: border-box;
	}
	.catalogue-layout {
		display: grid;
		grid-template-columns: 300px minmax(0, 1fr);
		gap: 24px;
		width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		margin: auto;
		align-items: start;
	}
	.sidebar {
		display: grid;
		gap: 16px;
		min-width: 0;
		padding-top: 20px;
	}
	.nav-label {
		font-size: var(--font-meta);
		font-weight: 650;
		color: var(--color-text-muted);
		margin: 0 0 12px;
	}
	.fagliste {
		display: grid;
		gap: 6px;
	}
	button,
	input,
	select {
		font: inherit;
	}
	button {
		cursor: pointer;
	}
	.fagkort {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		min-height: 48px;
		border: 1px solid transparent;
		border-radius: 10px;
		color: var(--color-text-muted);
		background: transparent;
		text-align: left;
		font-size: var(--font-small);
		font-weight: 600;
	}
	.fagkort:hover {
		background: var(--color-surface-soft);
		color: var(--color-text);
	}
	.fagkort.valgt {
		background: var(--color-accent-soft);
		color: var(--color-accent);
		border-color: var(--color-accent);
	}
	.fagsymbol {
		width: 22px;
		flex-shrink: 0;
		text-align: center;
		font: 600 1.1rem/1 monospace;
	}
	.section-nav {
		display: grid;
		border-top: 1px solid var(--color-border);
		margin-top: 20px;
		padding-top: 12px;
	}
	.section-nav a {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-height: 44px;
		color: var(--color-text-muted);
		font-size: var(--font-small);
		text-decoration: none;
	}
	.section-nav a:hover {
		color: var(--color-accent);
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	main {
		min-width: 0;
		padding-top: 20px;
	}
	.search-tools {
		margin-bottom: 16px;
	}
	.search-row {
		display: flex;
		align-items: center;
		gap: 20px;
	}
	.sokefelt {
		position: relative;
		flex: 1;
		min-width: 0;
	}
	.sokefelt svg {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		left: 16px;
		width: 20px;
		height: 20px;
		color: var(--color-text-muted);
		pointer-events: none;
	}
	input {
		width: 100%;
		min-height: 48px;
		height: auto;
		line-height: 1.4;
		padding: 10px 16px 10px 46px;
		color: var(--color-text);
		background: var(--color-surface);
		border: 1px solid var(--color-border-strong);
		border-radius: 10px;
	}
	input::placeholder {
		color: var(--color-text-muted);
		opacity: 1;
	}
	.jump {
		max-width: 100%;
		min-width: 0;
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		color: var(--color-accent);
		font-size: var(--font-small);
		font-weight: 600;
		text-underline-offset: 4px;
	}
	.search-status {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 4px 16px;
		min-height: 42px;
		padding-top: 4px;
	}
	.search-status p {
		margin: 0;
		font-size: var(--font-meta);
		color: var(--color-text-muted);
		overflow-wrap: anywhere;
	}
	.search-status p span {
		margin-inline: 8px;
	}
	.text-button {
		min-height: 40px;
		padding: 4px 0;
		border: 0;
		background: transparent;
		color: var(--color-accent);
		font-size: var(--font-small);
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	h2 {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
		margin: 0;
		font-size: 1.4rem;
		line-height: 1.4;
		letter-spacing: -0.025em;
	}
	.count {
		display: inline-grid;
		place-items: center;
		min-width: 26px;
		padding: 1px 7px;
		border-radius: 7px;
		background: var(--color-surface-soft);
		color: var(--color-text-muted);
		font-size: var(--font-meta);
		font-weight: 600;
	}
	.modulkortliste,
	.kortliste {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}
	.moduloversikt {
		margin-bottom: 40px;
	}
	.module-group + .module-group {
		margin-top: 28px;
	}
	.module-group-title {
		margin: 0 0 12px;
		font-size: 1.05rem;
		font-weight: 650;
	}
	.module-notice {
		padding: 18px 20px;
		margin-bottom: 18px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		background: var(--color-surface);
	}
	.module-notice p {
		margin: 0;
	}
	.notice-detail {
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	button:disabled {
		cursor: wait;
		opacity: 0.7;
	}
	.oversikt {
		border-top: 1px solid var(--color-border);
		padding-top: 32px;
	}
	.group-label {
		color: var(--color-text-muted);
		font-size: var(--font-small);
		font-weight: 650;
		margin: 0 0 12px;
	}
	.faggruppe + .faggruppe {
		margin-top: 28px;
	}
	.empty-modules {
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.tomt-resultat {
		border: 1px dashed var(--color-border-strong);
		border-radius: var(--radius-card);
		padding: 28px;
		background: var(--color-surface);
	}
	.tomt-resultat h3 {
		margin: 0;
		font-size: 1.2rem;
	}
	.tomt-resultat p {
		color: var(--color-text-muted);
	}
	.handling {
		padding: 10px 16px;
		min-height: 44px;
		background: var(--color-action);
		color: var(--color-on-action);
		border: 1px solid var(--color-action);
		border-radius: 8px;
		font-weight: 600;
	}
	footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px 20px;
		padding-block: 28px;
		margin-top: 40px;
		border-top: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-size: var(--font-meta);
	}
	footer p {
		margin: 0;
	}
	footer > span {
		font-weight: 750;
	}
	h1,
	h2,
	h3,
	button {
		overflow-wrap: anywhere;
	}
	#moduler,
	#utforsk,
	.anker {
		scroll-margin-top: 24px;
	}
	a:focus-visible,
	button:focus-visible,
	input:focus-visible,
	select:focus-visible,
	summary:focus-visible,
	main:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}

	@media (min-width: 801px) {
		.catalogue-filters > summary { display: none; }
	}
	@media (min-width: 801px) and (max-width: 1199px) {
		.catalogue-layout { grid-template-columns: 220px minmax(0, 1fr); }
	}
	@media (max-width: 1050px) {
		.kortliste, .modulkortliste { grid-template-columns: 1fr; }
	}
	@media (max-width: 800px) {
		.catalogue-layout { grid-template-columns: 1fr; gap: 0; }
		.sidebar { padding-top: 12px; gap: 12px; align-items: start; }
		.sidebar.with-partner { grid-template-columns: auto minmax(0, 1fr); }
		.catalogue-filters {
			border: 1px solid var(--color-border-strong);
			border-radius: 10px;
			background: var(--color-surface);
		}
		.filter-content { padding: 12px; border-top: 1px solid var(--color-border); }
		.fagsymbol { display: none; }
		.fagkort { padding: 8px; min-height: 44px; }
		.section-nav { display: none; }
		main { padding-top: 12px; }
		.moduloversikt { margin-bottom: 24px; }
	}
</style>
