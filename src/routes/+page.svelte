<script>
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import AccountLink from '#lib/components/AccountLink.svelte';
	import PersonalOverview from '#lib/components/PersonalOverview.svelte';
	import { aktiviteter, fag, innholdsformat } from '#lib/innhold.js';
	import { lab as account } from '#lib/lab.js';
	import { hasTeacherRole } from '#lib/learning.js';

	let valgtFag = $state('alle');
	let valgtFormat = $state('alle');
	let sok = $state('');
	let klar = $state(false);

	const formater = [
		{ id: 'alle', navn: 'Alt innhold' },
		...Array.from(new Set(aktiviteter.map((item) => item.format))).map(innholdsformat)
	];

	/** @param {string} tekst */
	function normaliser(tekst) {
		return tekst
			.toLocaleLowerCase('nb-NO')
			.normalize('NFD')
			.replace(/\p{M}/gu, '')
			.replaceAll('ø', 'o')
			.replaceAll('æ', 'ae');
	}

	const sokeord = $derived(normaliser(sok).trim().split(/\s+/).filter(Boolean));
	const synligeAktiviteter = $derived(
		aktiviteter.filter((aktivitet) => {
			if (valgtFag !== 'alle' && aktivitet.fag !== valgtFag) return false;
			if (valgtFormat !== 'alle' && aktivitet.format !== valgtFormat) return false;
			const soketekst = normaliser(
				[
					aktivitet.tittel,
					aktivitet.beskrivelse,
					aktivitet.type,
					innholdsformat(aktivitet.format).sokeord,
					...aktivitet.emner,
					...aktivitet.sokeord
				].join(' ')
			);
			return sokeord.every((ord) => soketekst.includes(ord));
		})
	);
	const fagGrupper = $derived(
		fag
			.filter((gruppe) => valgtFag === 'alle' || gruppe.id === valgtFag)
			.map((gruppe) => ({
				...gruppe,
				aktiviteter: synligeAktiviteter.filter((aktivitet) => aktivitet.fag === gruppe.id),
				harInnhold: aktiviteter.some((aktivitet) => aktivitet.fag === gruppe.id)
			}))
	);
	const viserTomtFag = $derived(
		valgtFag !== 'alle' && !aktiviteter.some((aktivitet) => aktivitet.fag === valgtFag)
	);

	function nullstillSok() {
		sok = '';
		valgtFormat = 'alle';
	}

	onMount(() => {
		function lesAdresse() {
			const url = new URL(window.location.href);
			const fagFraAdresse = url.searchParams.get('fag');
			const formatFraAdresse = url.searchParams.get('type');
			const viserOvingene = url.hash === '#ovingene';
			valgtFag = fag.find((gruppe) => gruppe.id === fagFraAdresse)?.id ?? 'alle';
			valgtFormat =
				formater.find((format) => format.id === formatFraAdresse)?.id ??
				(url.hash === '#spill' ? 'spill' : viserOvingene ? 'leksjon' : 'alle');
			sok = url.searchParams.get('q') ?? (viserOvingene ? 'øving' : '');
		}
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
		for (const [nokkel, verdi] of [
			['fag', valgtFag],
			['type', valgtFormat],
			['q', sok.trim()]
		]) {
			if (!verdi || (nokkel !== 'q' && verdi === 'alle')) url.searchParams.delete(nokkel);
			else url.searchParams.set(nokkel, verdi);
		}
		if (url.hash === '#spill' && valgtFormat !== 'spill') url.hash = '';
		if (
			url.hash === '#ovingene' &&
			(valgtFormat !== 'leksjon' || normaliser(sok).trim() !== 'oving')
		)
			url.hash = '';
		if (url.href !== window.location.href) replaceState(url, {});
	});
</script>

<svelte:head>
	<title>IT-laben – se hvordan det henger sammen</title>
	<meta
		name="description"
		content="Utforsk leksjoner, spill og utfordringer i IT-fagene. Velg utvikling eller driftsstøtte, eller se alt innholdet samlet."
	/>
</svelte:head>

<div class="forside">
	<a class="hopp-til-innhold" href="#utforsk">Hopp til innholdet</a>
	<header>
		<a class="logo" href="/" aria-label="IT-laben – forside">
			<span class="logo-symbol" aria-hidden="true">IT</span>IT-laben<span class="punkt">.</span>
		</a>
		<div class="header-actions">
			<span class="header-note">SE. PRØV. FORSTÅ.</span>
			{#if hasTeacherRole($account.user?.role)}<a class="teaching-link" href="/laerer/undervisning/"
					>Undervisning →</a
				>{/if}
			<a href="/toppliste/">Toppliste</a><AccountLink /><ThemeToggle />
		</div>
	</header>

	<main>
		<section class="fagvalg" aria-labelledby="sidetittel">
			<div class="intro">
				<div>
					<p class="overlinje">UTFORSK IT-LABEN</p>
					<h1 id="sidetittel">Hva jobber du med <em>i dag?</em></h1>
					<p class="ingress">
						Velg et fag, eller utforsk alt. Se, prøv og finn ut hvordan IT fungerer.
					</p>
				</div>
				<button
					type="button"
					class="alle-fag"
					class:valgt={valgtFag === 'alle'}
					aria-pressed={valgtFag === 'alle'}
					aria-controls="utforsk"
					onclick={() => (valgtFag = 'alle')}
				>
					<span class="valgt-prikk" aria-hidden="true"></span>Alle fag
				</button>
			</div>

			<div class="fagliste" role="group" aria-label="Hva jobber du med i dag?">
				{#each fag as gruppe (gruppe.id)}
					<button
						type="button"
						class="fagkort"
						class:valgt={valgtFag === gruppe.id}
						aria-pressed={valgtFag === gruppe.id}
						aria-controls="utforsk"
						onclick={() => (valgtFag = gruppe.id)}
					>
						<span class="fagsymbol" aria-hidden="true">{gruppe.symbol}</span>
						<span class="fagtekst">
							<span class="fagnavn">{gruppe.navn}</span>
							<span class="fagbeskrivelse">{gruppe.beskrivelse}</span>
						</span>
						<span class="fagkort-status" aria-hidden="true"
							>{#if valgtFag === gruppe.id}✓{:else}→{/if}</span
						>
					</button>
				{/each}
			</div>
		</section>

		<PersonalOverview subject={valgtFag} />
		<section id="utforsk" class="oversikt" aria-label="Leksjoner og spill">
			<div class="verktoylinje">
				<div class="sokefelt">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"
						><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg
					>
					<label class="kun-skjermleser" for="innholdssok">Søk i valgt innhold</label>
					<input
						id="innholdssok"
						type="search"
						placeholder="Søk etter tema, leksjon eller spill …"
						bind:value={sok}
						autocomplete="off"
					/>
				</div>
				<div class="formatvalg" role="group" aria-label="Aktivitetstype">
					{#each formater as format (format.id)}
						<button
							type="button"
							class:valgt={valgtFormat === format.id}
							aria-pressed={valgtFormat === format.id}
							aria-controls="resultater"
							onclick={() => (valgtFormat = format.id)}>{format.navn}</button
						>
					{/each}
				</div>
			</div>

			<div class="resultatlinje">
				<p class="resultatstatus" role="status" aria-atomic="true">
					Viser <strong>{synligeAktiviteter.length}</strong>
					{synligeAktiviteter.length === 1 ? 'aktivitet' : 'aktiviteter'}
					{valgtFag === 'alle'
						? 'fra alle fag'
						: `i ${fag.find((gruppe) => gruppe.id === valgtFag)?.navn}`}
				</p>
				{#if sok || valgtFormat !== 'alle'}
					<button type="button" class="nullstill" onclick={nullstillSok}
						>Nullstill søk og type</button
					>
				{/if}
			</div>

			<div id="spill" class="anker" aria-hidden="true"></div>
			<div id="ovingene" class="anker" aria-hidden="true"></div>
			<div id="resultater">
				{#if synligeAktiviteter.length === 0 && !viserTomtFag}
					<div class="tomt-resultat">
						<span class="tomt-symbol" aria-hidden="true">?</span>
						<h2>Ingen aktiviteter passer til søket</h2>
						<p>Prøv et annet søkeord eller en annen aktivitetstype.</p>
						<button type="button" class="handling" onclick={nullstillSok}
							>Vis innholdet i valgt fag</button
						>
					</div>
				{/if}

				{#each fagGrupper as gruppe (gruppe.id)}
					{#if gruppe.aktiviteter.length > 0}
						<section class="faggruppe" aria-labelledby={`fag-${gruppe.id}`}>
							<div class="gruppetopp">
								<h2 id={`fag-${gruppe.id}`}>{gruppe.navn}</h2>
								<span
									>{gruppe.aktiviteter.length}
									{gruppe.aktiviteter.length === 1 ? 'aktivitet' : 'aktiviteter'}</span
								>
							</div>
							<div class="kortliste">
								{#each gruppe.aktiviteter as aktivitet (aktivitet.href)}
									<a
										class="sidekort"
										class:spillkort={aktivitet.format === 'spill'}
										href={aktivitet.href}
									>
										<div class="korttopp">
											<span class="formatmerke"
												>{innholdsformat(aktivitet.format).entall}{aktivitet.format === 'leksjon'
													? ' · Gjør selv'
													: ''}</span
											>
											<span class="symbol" aria-hidden="true">{aktivitet.symbol}</span>
										</div>
										<h3>{aktivitet.tittel}</h3>
										{#if $account.summary?.progress.find((item) => item.id === aktivitet.id)?.status === 'reviewed'}<span
												class="saved-status">✓ Gjennomgått</span
											>{:else if $account.summary?.progress.find((item) => item.id === aktivitet.id)?.status === 'passed'}<span
												class="saved-status">✓ Bestått</span
											>{:else if $account.summary?.progress.find((item) => item.id === aktivitet.id)?.status === 'started'}<span
												class="saved-status started">Påbegynt</span
											>{/if}
										<p class="beskrivelse">{aktivitet.beskrivelse}</p>
										<ul class="emner" aria-label="Temaer">
											{#each aktivitet.emner as emne}<li>{emne}</li>{/each}
										</ul>
										<div class="kortfot">
											<span>{aktivitet.type}</span><svg
												class="pil"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg
											>
										</div>
									</a>
								{/each}
							</div>
						</section>
					{:else if !gruppe.harInnhold && (valgtFag === gruppe.id || (!sok && valgtFormat === 'alle'))}
						<aside
							class="kommer"
							class:valgt-tomt-fag={valgtFag === gruppe.id}
							aria-label={gruppe.navn}
						>
							<span class="fagsymbol" aria-hidden="true">{gruppe.symbol}</span>
							<div>
								<h2>{gruppe.navn} kommer</h2>
								<p>Her kommer leksjoner og spill om nettverk, servere og drift.</p>
							</div>
							{#if valgtFag === gruppe.id}
								<button
									type="button"
									class="handling"
									onclick={() => {
										valgtFag = 'utvikling';
										nullstillSok();
									}}>Utforsk utvikling imens <span aria-hidden="true">→</span></button
								>
							{/if}
						</aside>
					{/if}
				{/each}
			</div>
		</section>

		<footer>
			<span>IT-laben<span class="punkt">.</span></span>
			<p>Ta ett steg om gangen. Prøv igjen når du trenger det.</p>
		</footer>
	</main>
</div>

<style>
	.saved-status {
		font-size: var(--font-meta);
		color: var(--color-success);
		margin-bottom: 7px;
		font-weight: 650;
	}
	.saved-status.started {
		color: var(--color-text-muted);
	}
	.forside {
		min-height: 100vh;
		font-family:
			Inter,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		background: radial-gradient(ellipse at 83% 0%, var(--color-page-glow) 0, transparent 45%);
	}
	.forside,
	.forside * {
		box-sizing: border-box;
	}
	a {
		color: inherit;
		text-decoration: none;
	}
	button,
	input {
		font: inherit;
	}
	button {
		cursor: pointer;
	}
	h1,
	h2,
	h3,
	.overlinje {
		overflow-wrap: anywhere;
	}
	a:focus-visible,
	button:focus-visible,
	input:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}
	header,
	main {
		width: min(1240px, calc(100% - 64px));
		margin-inline: auto;
	}
	header {
		min-height: 78px;
		padding-block: 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px 24px;
		border-bottom: 1px solid var(--color-border);
	}
	.logo {
		display: flex;
		align-items: center;
		font-size: 19px;
		font-weight: 750;
		letter-spacing: -0.7px;
	}
	.logo-symbol {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		margin-right: 11px;
		background: var(--color-brand);
		color: var(--color-on-brand);
		border-radius: 10px;
		font: 600 17px monospace;
	}
	.punkt {
		color: var(--color-accent);
	}
	.header-actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px 24px;
		margin-left: auto;
		max-width: 100%;
	}
	.header-note {
		font: var(--font-meta)/var(--leading-body) monospace;
		letter-spacing: 1.8px;
		color: var(--color-text-muted);
	}
	.fagvalg {
		padding-block: 24px 20px;
	}
	.intro {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 20px;
		margin-bottom: 16px;
	}
	.overlinje {
		margin: 0 0 5px;
		color: var(--color-accent);
		font-size: var(--font-meta);
		font-weight: 750;
		letter-spacing: 1.55px;
	}
	h1 {
		margin: 0 0 7px;
		font-size: clamp(1.9rem, 3.4vw, 2.8rem);
		font-weight: 760;
		line-height: 1.2;
		letter-spacing: -1.5px;
	}
	h1 em {
		font-style: normal;
		color: var(--color-accent);
	}
	.ingress {
		margin: 0;
		color: var(--color-text-muted);
		font-size: var(--font-body);
		line-height: var(--leading-body);
	}
	.alle-fag {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 9px;
		flex: 0 0 auto;
		min-height: 44px;
		padding: 9px 15px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface);
		color: var(--color-text-muted);
		font-size: var(--font-small);
		font-weight: 650;
	}
	.alle-fag.valgt {
		color: var(--color-accent);
		border-color: var(--color-accent);
		background: var(--color-accent-soft);
	}
	.valgt-prikk {
		width: 8px;
		height: 8px;
		border: 1px solid currentColor;
		border-radius: 50%;
	}
	.valgt .valgt-prikk {
		background: currentColor;
	}
	.fagliste {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}
	.fagkort {
		display: flex;
		align-items: center;
		gap: 15px;
		width: 100%;
		min-width: 0;
		padding: 17px 20px;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
		color: var(--color-text);
		text-align: left;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.fagkort:hover,
	.alle-fag:hover {
		border-color: var(--color-accent);
		background: var(--color-surface-hover);
	}
	.fagkort.valgt {
		border-color: var(--color-accent);
		background: var(--color-accent-soft);
		box-shadow: inset 0 0 0 1px var(--color-accent);
	}
	.fagsymbol {
		display: grid;
		place-items: center;
		flex: 0 0 44px;
		width: 44px;
		height: 44px;
		border: 1px solid var(--color-border);
		border-radius: 9px;
		background: var(--color-surface-soft);
		color: var(--color-accent);
		font: 600 20px monospace;
	}
	.fagtekst {
		display: grid;
		gap: 1px;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.fagnavn {
		font-size: 1.125rem;
		font-weight: 700;
		letter-spacing: -0.3px;
	}
	.fagbeskrivelse {
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.fagkort-status {
		margin-left: auto;
		color: var(--color-accent);
		font-size: 22px;
	}
	.oversikt,
	.anker {
		scroll-margin-top: 20px;
	}
	.verktoylinje {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px 20px;
	}
	.sokefelt {
		display: flex;
		align-items: center;
		flex: 1 1 340px;
		min-width: 0;
		position: relative;
	}
	.sokefelt svg {
		position: absolute;
		left: 15px;
		width: 19px;
		height: 19px;
		stroke-width: 1.8;
		stroke-linecap: round;
		color: var(--color-text-muted);
		pointer-events: none;
	}
	.sokefelt input {
		width: 100%;
		min-height: 48px;
		padding: 11px 14px 11px 44px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--font-body);
	}
	.sokefelt input::placeholder {
		color: var(--color-text-muted);
		opacity: 1;
	}
	.formatvalg {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
		padding: 3px;
		border: 1px solid var(--color-border);
		border-radius: 9px;
		background: var(--color-surface-soft);
	}
	.formatvalg button {
		min-height: 40px;
		padding: 8px 12px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: var(--color-text-muted);
		font-size: var(--font-small);
		font-weight: 600;
	}
	.formatvalg button:hover {
		color: var(--color-text);
		background: var(--color-surface-hover);
	}
	.formatvalg button.valgt {
		background: var(--color-surface-raised);
		color: var(--color-accent);
		box-shadow: 0 1px 3px var(--color-shadow);
	}
	.resultatlinje {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 6px 16px;
		min-height: 44px;
		padding-block: 9px;
	}
	.resultatstatus {
		margin: 0;
		color: var(--color-text-muted);
		font-size: var(--font-meta);
	}
	.resultatstatus strong {
		font-weight: 650;
	}
	.nullstill {
		padding: 2px 0;
		border: 0;
		background: transparent;
		color: var(--color-accent);
		text-decoration: underline;
		text-underline-offset: 3px;
		font-size: var(--font-small);
	}
	.faggruppe + .faggruppe {
		margin-top: 28px;
	}
	.gruppetopp {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		margin: 5px 0 12px;
	}
	h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.5px;
		line-height: 1.4;
	}
	.gruppetopp > span {
		color: var(--color-text-muted);
		font-size: var(--font-meta);
	}
	.kortliste {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 16px;
	}
	.sidekort {
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 18px;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
		transition:
			transform 0.15s,
			border-color 0.15s,
			box-shadow 0.15s;
	}
	.sidekort:hover {
		transform: translateY(-3px);
		border-color: var(--color-border-strong);
		box-shadow: 0 10px 24px var(--color-shadow);
	}
	.spillkort {
		background: var(--color-surface-soft);
	}
	.korttopp {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 12px;
	}
	.formatmerke {
		padding: 3px 8px;
		border-radius: 4px;
		background: var(--color-accent-soft);
		color: var(--color-accent);
		font-size: var(--font-meta);
		font-weight: 650;
	}
	.spillkort .formatmerke {
		background: var(--color-success-soft);
		color: var(--color-success);
	}
	.symbol {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		color: var(--color-accent);
		font: 600 18px monospace;
	}
	h3 {
		margin: 0 0 9px;
		font-size: 1.125rem;
		font-weight: 700;
		letter-spacing: -0.4px;
		line-height: 1.35;
	}
	.beskrivelse {
		margin: 0 0 14px;
		color: var(--color-text-muted);
		font-size: var(--font-body);
		line-height: 1.5;
	}
	.emner {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 10px;
		padding: 0;
		margin: auto 0 12px;
		list-style: none;
	}
	.emner li {
		color: var(--color-text-muted);
		font: var(--font-meta)/var(--leading-body) monospace;
	}
	.emner li + li::before {
		content: '·';
		margin-right: 10px;
		color: var(--color-border-strong);
	}
	.kortfot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		padding-top: 10px;
		border-top: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-size: var(--font-meta);
	}
	.pil {
		color: var(--color-accent);
		width: 20px;
		height: 20px;
		flex: 0 0 20px;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.kommer {
		display: flex;
		align-items: center;
		gap: 15px;
		padding: 18px 20px;
		margin-top: 24px;
		border: 1px dashed var(--color-border-strong);
		border-radius: 12px;
	}
	.kommer h2 {
		color: var(--color-text-muted);
		font-size: var(--font-body);
	}
	.kommer p {
		margin: 2px 0 0;
		color: var(--color-text-muted);
		font-size: var(--font-small);
		line-height: var(--leading-body);
	}
	.kommer.valgt-tomt-fag {
		flex-wrap: wrap;
		padding: 28px;
		margin-top: 10px;
	}
	.valgt-tomt-fag h2 {
		color: var(--color-text);
		font-size: 1.25rem;
	}
	.handling {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		min-height: 44px;
		padding: 10px 16px;
		border: 1px solid var(--color-action);
		border-radius: 7px;
		background: var(--color-action);
		color: var(--color-on-action);
		font-size: var(--font-small);
		font-weight: 600;
	}
	.handling:hover {
		background: var(--color-action-hover);
	}
	.kommer .handling {
		margin-left: auto;
	}
	.tomt-resultat {
		padding: 34px 20px;
		border: 1px dashed var(--color-border-strong);
		border-radius: 12px;
		text-align: center;
	}
	.tomt-resultat p {
		color: var(--color-text-muted);
		font-size: var(--font-body);
	}
	.tomt-symbol {
		display: inline-grid;
		place-items: center;
		width: 40px;
		height: 40px;
		margin-bottom: 12px;
		border-radius: 50%;
		background: var(--color-accent-soft);
		color: var(--color-accent);
		font: 600 22px monospace;
	}
	footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px 20px;
		padding: 22px 0 30px;
		margin-top: 32px;
		border-top: 1px solid var(--color-border);
		color: var(--color-text-muted);
	}
	footer > span {
		font-size: var(--font-small);
		font-weight: 700;
	}
	footer p {
		margin: 0;
		font-size: var(--font-meta);
	}
	.kun-skjermleser {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
	.hopp-til-innhold {
		position: fixed;
		top: 12px;
		left: 12px;
		z-index: 10;
		padding: 10px 16px;
		border-radius: 6px;
		background: var(--color-action);
		color: var(--color-on-action);
		transform: translateY(-200%);
	}
	.hopp-til-innhold:focus {
		transform: translateY(0);
	}
	@media (max-width: 1150px) {
		.kortliste {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (max-width: 850px) {
		header,
		main {
			width: calc(100% - 40px);
		}
		.kortliste {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.header-note {
			display: none;
		}
		.fagkort {
			padding: 15px;
			gap: 12px;
		}
		.fagbeskrivelse {
			font-size: var(--font-meta);
		}
		.verktoylinje {
			gap: 10px;
		}
		.sokefelt {
			flex-basis: 100%;
		}
	}
	@media (max-width: 550px) {
		header,
		main {
			width: calc(100% - 32px);
		}
		header {
			min-height: 72px;
			gap: 8px;
		}
		.header-actions {
			gap: 0;
		}
		.logo {
			font-size: 17px;
		}
		.logo-symbol {
			width: 30px;
			height: 30px;
			margin-right: 8px;
			font-size: 15px;
		}
		.fagvalg {
			padding-block: 22px 18px;
		}
		.intro {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: center;
			gap: 8px 12px;
			margin-bottom: 12px;
		}
		.intro > div {
			display: contents;
		}
		.overlinje {
			grid-column: 1;
			grid-row: 1;
			margin: 0;
		}
		h1 {
			grid-column: 1 / -1;
			margin: 0;
			font-size: 1.9rem;
			letter-spacing: -1px;
		}
		.ingress {
			grid-column: 1 / -1;
			font-size: var(--font-small);
		}
		.alle-fag {
			grid-column: 2;
			grid-row: 1;
			padding-block: 7px;
		}
		.fagliste {
			gap: 10px;
		}
		.fagkort {
			align-items: center;
			padding: 13px 12px;
			gap: 8px;
		}
		.fagkort .fagsymbol {
			flex-basis: 30px;
			width: 30px;
			height: 30px;
			font-size: 15px;
		}
		.fagtekst {
			flex: 1 1 0;
		}
		.fagnavn {
			font-size: var(--font-body);
		}
		.fagkort-status,
		.fagbeskrivelse {
			display: none;
		}
		.sokefelt input {
			padding-right: 8px;
			font-size: var(--font-small);
		}
		.formatvalg {
			width: 100%;
		}
		.formatvalg button {
			flex: 1 1 auto;
			padding-inline: 8px;
		}
		.kortliste {
			grid-template-columns: 1fr;
			gap: 12px;
		}
		.sidekort {
			padding: 17px 18px;
		}
		.korttopp {
			margin-bottom: 8px;
		}
		.kommer {
			align-items: start;
			padding: 16px;
		}
		.kommer.valgt-tomt-fag {
			padding: 20px;
		}
		.kommer .handling {
			margin-left: 0;
		}
		footer {
			margin-top: 24px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.fagkort,
		.sidekort {
			transition: none;
		}
		.sidekort:hover {
			transform: none;
		}
	}
</style>
