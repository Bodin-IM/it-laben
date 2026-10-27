<script>
	import { onMount, tick } from 'svelte';
	import { afterNavigate, replaceState } from '$app/navigation';
	import PersonalOverview from '#lib/components/PersonalOverview.svelte';
	import ModuleCard from '#lib/components/ModuleCard.svelte';
	import ActivityCard from '#lib/components/ActivityCard.svelte';
	import { altElevinnhold as aktiviteter, fag, innholdsformat } from '#lib/innhold.js';
	import { searchCatalogue, normalizeSearch } from '#lib/catalogueSearch.js';

	let valgtFag = $state('alle');
	let valgtFormat = $state('alle');
	let sok = $state('');
	let klar = $state(false);
	/** @type {HTMLInputElement|undefined} */
	let searchInput = $state();
	const formater = [
		{ id: 'alle', navn: 'Alt innhold' },
		...Array.from(new Set(aktiviteter.map((item) => item.format))).map(innholdsformat)
	];
	const valgtFagnavn = $derived(fag.find((item) => item.id === valgtFag)?.navn ?? 'Alle fag');
	const resultater = $derived(
		searchCatalogue({ subject: valgtFag, format: valgtFormat, query: sok })
	);
	const fagGrupper = $derived(
		fag
			.filter((gruppe) => valgtFag === 'alle' || gruppe.id === valgtFag)
			.map((gruppe) => ({
				...gruppe,
				aktiviteter: resultater.activities.filter((activity) => activity.fag === gruppe.id)
			}))
	);

	async function nullstillSok() {
		sok = '';
		valgtFormat = 'alle';
		await tick();
		searchInput?.focus();
	}

	function lesAdresse() {
		const url = new URL(window.location.href);
		const viserOvingene = url.hash === '#ovingene';
		valgtFag = fag.find((gruppe) => gruppe.id === url.searchParams.get('fag'))?.id ?? 'alle';
		valgtFormat =
			formater.find((format) => format.id === url.searchParams.get('type'))?.id ??
			(url.hash === '#spill' ? 'spill' : viserOvingene ? 'leksjon' : 'alle');
		sok = url.searchParams.get('q') ?? (viserOvingene ? 'øving' : '');
	}
	afterNavigate(lesAdresse);
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

<svelte:head>
	<title>IT-laben – fag, moduler og aktiviteter</title>
	<meta
		name="description"
		content="Utforsk utvikling og driftsstøtte. Finn moduler, undervisning, øvinger og spill, og prøv selv i IT-laben."
	/>
</svelte:head>

<div class="forside">
	<div class="catalogue-layout">
		<aside class="sidebar" aria-label="Velg fag og finn innhold">
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
			<nav class="section-nav" aria-label="På denne siden">
				<p class="nav-label">På denne siden</p>
				<a href="#moduler">Moduler <span aria-hidden="true">↓</span></a>
				<a href="#utforsk">Øvinger og aktiviteter <span aria-hidden="true">↓</span></a>
			</nav>
			<p class="sidebar-note">Se sammenhengen.<br />Prøv selv.<br />Forstå mer.</p>
		</aside>

		<main id="hovedinnhold" tabindex="-1">
			<section class="intro" aria-labelledby="sidetittel">
				<p class="eyebrow">Fagoversikt <span aria-hidden="true">/</span> {valgtFagnavn}</p>
				<h1 id="sidetittel">{valgtFag === 'alle' ? 'Hva jobber du med i dag?' : valgtFagnavn}</h1>
				<p class="lead">
					{valgtFag === 'alle'
						? 'Finn et tema, følg en modul eller gå rett til en aktivitet.'
						: fag.find((item) => item.id === valgtFag)?.beskrivelse +
							'. Utforsk sammenhengene og prøv selv.'}
				</p>
			</section>

			<div class="search-tools">
				<label for="innholdssok"
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
							placeholder="Tema, modul eller aktivitet …"
							bind:value={sok}
							bind:this={searchInput}
							autocomplete="off"
							aria-controls="moduler resultater"
						/>
					</div>
				</div>
				<div class="search-status">
					<p role="status" aria-atomic="true">
						{resultater.modules.length}
						{resultater.modules.length === 1 ? 'modul' : 'moduler'}
						<span aria-hidden="true">·</span>
						{resultater.activities.length}
						{resultater.activities.length === 1 ? 'aktivitet' : 'aktiviteter'}{sok.trim()
							? ` for «${sok.trim()}»`
							: ''}
					</p>
					<a class="jump" href="#utforsk">Til aktivitetene <span aria-hidden="true">↓</span></a>
					{#if sok || valgtFormat !== 'alle'}<button
							type="button"
							class="text-button"
							onclick={nullstillSok}>Nullstill søk og type</button
						>{/if}
				</div>
			</div>

			<section id="moduler" class="moduloversikt" aria-labelledby="modultittel">
				<div class="section-heading">
					<div>
						<h2 id="modultittel">Moduler <span class="count">{resultater.modules.length}</span></h2>
						<p>Undervisning og aktiviteter som hører sammen.</p>
					</div>
				</div>
				<div class="modulkortliste">
					{#each resultater.modules as module (module.id)}<ModuleCard {module} />{/each}
				</div>
				{#if !resultater.modules.length}<p class="empty-modules">
						{sok.trim()
							? 'Ingen moduler passer til søket. Se aktivitetene nedenfor, eller prøv et annet søkeord.'
							: 'Moduler for dette faget kommer. Utforsk aktivitetene nedenfor.'}
					</p>{/if}
			</section>

			{#if !sok.trim()}<PersonalOverview subject={valgtFag} />{/if}

			<section id="utforsk" class="oversikt" aria-labelledby="aktivitetstittel">
				<div class="section-heading">
					<div>
						<h2 id="aktivitetstittel">
							Øvinger og aktiviteter <span class="count">{resultater.activities.length}</span>
						</h2>
						<p>Åpne en øving, et oppdrag eller et spill direkte.</p>
					</div>
				</div>
				<div class="formatvalg" role="group" aria-label="Vis aktivitetstype">
					{#each formater as format (format.id)}<button
							type="button"
							class:valgt={valgtFormat === format.id}
							aria-pressed={valgtFormat === format.id}
							aria-controls="resultater"
							onclick={() => (valgtFormat = format.id)}>{format.navn}</button
						>{/each}
				</div>
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
			</section>
			<footer>
				<span>IT-laben.</span>
				<p>Ta ett steg om gangen. Prøv igjen når du trenger det.</p>
			</footer>
		</main>
	</div>
</div>

<style>
	.forside {
		font-family: var(--font-ui);
	}
	.forside,
	.forside :global(*) {
		box-sizing: border-box;
	}
	.catalogue-layout {
		display: grid;
		grid-template-columns: 210px minmax(0, 1fr);
		gap: 48px;
		width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		margin: auto;
		align-items: start;
	}
	.sidebar {
		position: sticky;
		top: 24px;
		padding-top: 36px;
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
	input {
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
		margin-top: 28px;
		padding-top: 24px;
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
	.sidebar-note {
		margin-top: 48px;
		font-size: var(--font-small);
		line-height: 1.8;
		color: var(--color-text-muted);
	}
	main {
		min-width: 0;
		padding-top: 32px;
	}
	.intro {
		margin-bottom: 26px;
	}
	.eyebrow {
		margin: 0 0 12px;
		font-size: var(--font-meta);
		color: var(--color-text-muted);
	}
	.eyebrow span {
		padding-inline: 7px;
		color: var(--color-border-strong);
	}
	h1 {
		margin: 0 0 12px;
		font-size: clamp(1.9rem, 3.1vw, 2.65rem);
		line-height: 1.16;
		letter-spacing: -0.04em;
		text-wrap: balance;
	}
	.lead {
		margin: 0;
		font-size: 1.125rem;
		color: var(--color-text-muted);
		max-width: 60ch;
	}
	.search-tools {
		margin-bottom: 28px;
	}
	.search-tools label {
		display: block;
		margin-bottom: 8px;
		font-size: var(--font-small);
		font-weight: 600;
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
		min-height: 54px;
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
	.section-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 18px;
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
	.section-heading p {
		margin: 5px 0 0;
		color: var(--color-text-muted);
		font-size: var(--font-small);
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
	.oversikt {
		border-top: 1px solid var(--color-border);
		padding-top: 32px;
	}
	.formatvalg {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 0 0 24px;
	}
	.formatvalg button {
		min-height: 44px;
		padding: 9px 16px;
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
		background: var(--color-surface);
		color: var(--color-text-muted);
		font-size: var(--font-small);
		font-weight: 600;
	}
	.formatvalg button:hover {
		background: var(--color-surface-soft);
	}
	.formatvalg button.valgt {
		color: var(--color-on-action);
		background: var(--color-action);
		border-color: var(--color-action);
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
	main:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}

	@media (max-width: 1050px) {
		.catalogue-layout {
			grid-template-columns: 180px minmax(0, 1fr);
			gap: 28px;
		}
		.search-row {
			flex-wrap: wrap;
			gap: 4px 20px;
		}
		.sokefelt {
			flex-basis: 100%;
		}
		.kortliste {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 800px) {
		.catalogue-layout {
			grid-template-columns: 1fr;
			gap: 0;
		}
		.sidebar {
			position: static;
			padding-top: 22px;
		}
		.nav-label {
			margin-bottom: 8px;
		}
		.fagliste {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
		}
		.fagkort {
			border-color: var(--color-border-strong);
			padding: 9px 12px;
			min-height: 44px;
		}
		.fagsymbol {
			display: none;
		}
		.section-nav,
		.sidebar-note {
			display: none;
		}
		main {
			padding-top: 26px;
		}
		.eyebrow {
			display: none;
		}
		.intro {
			margin-bottom: 22px;
		}
	}
	@media (max-width: 550px) {
		.modulkortliste {
			grid-template-columns: 1fr;
		}
		.intro h1 {
			max-width: 18ch;
		}
		.moduloversikt {
			margin-bottom: 32px;
		}
		.formatvalg {
			gap: 7px;
		}
		.formatvalg button {
			padding-inline: 12px;
		}
	}
</style>
