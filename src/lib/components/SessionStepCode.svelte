<script>
	/** @typedef {'profiler' | 'cookie' | 'utlopt'} Forsok */
	/** @typedef {{ status: number, tittel: string, tekst: string }} Resultat */
	/**
	 * @typedef {{
	 *   trinn: number, ekstra: boolean, forsok: Forsok, credentials: boolean,
	 *   resultat: Resultat | null, navn: string
	 * }} Props
	 */
	/** @typedef {{ tittel: string, linjer: string[], markerte: number[] }} Kodeblokk */
	/** @type {Props} */
	let { trinn, ekstra, forsok, credentials, resultat, navn } = $props();
	/** @type {'backend' | 'frontend'} */
	let visning = $state('backend');

	// Denne kilden er identisk før og etter innlogging, og i de ekstra /meg-forsøkene.
	const megBackend = [
		'app.get("/meg", (req, res) => {',
		'  const bruker = req.session.bruker;',
		'  if (!bruker) {',
		'    return res.status(401).json({ beskjed: "Du er ikke logget inn." });',
		'  }',
		'  res.json({ bruker });',
		'});'
	];
	const innloggingBackend = [
		'req.session.regenerate((feil) => {',
		'  if (feil) return next(feil);',
		'  req.session.bruker = { id: bruker.id, navn: bruker.navn };',
		'  req.session.save((feil) => {',
		'    if (feil) return next(feil);',
		'    res.json({ bruker: req.session.bruker });',
		'  });',
		'});'
	];
	const utloggingBackend = [
		'app.post("/loggut", (req, res, next) => {',
		'  req.session.destroy((feil) => {',
		'    if (feil) return next(feil);',
		'    res.clearCookie("itlab.sid", cookieOptions);',
		'    res.sendStatus(204);',
		'  });',
		'});'
	];
	const utloggingFrontend = [
		'async function loggUtOgSpor() {',
		'  const ut = await fetch(API + "/loggut", {',
		'    method: "POST", credentials: "include"',
		'  });',
		'  if (!ut.ok) throw new Error("Utlogging feilet");',
		'  // 204 har ingen JSON-body.',
		'  const meg = await fetch(API + "/meg", {',
		'    credentials: "include"',
		'  });',
		'  if (meg.status === 401) return null;',
		'  if (!meg.ok) throw new Error("Kunne ikke hente bruker");',
		'  return (await meg.json()).bruker;',
		'}'
	];

	let cookieInnstilling = $derived(
		ekstra && forsok === 'cookie' && !credentials ? 'same-origin' : 'include'
	);
	/** @param {string} tittel @param {string[]} linjer @param {number[]} markerte @returns {Kodeblokk} */
	function blokk(tittel, linjer, markerte) {
		return { tittel, linjer, markerte: resultat ? markerte : [] };
	}

	let blokker = $derived.by(() => {
		const erInnlogging = !ekstra && trinn === 1;
		const erUtlogging = !ekstra && trinn === 3;
		const megMarkering = resultat?.status === 401 ? [2, 3, 4] : [2, 6];

		if (visning === 'backend') {
			if (erInnlogging) {
				return [
					blokk('Utdrag fra POST /logginn · etter autentisering', innloggingBackend, [3, 4, 6])
				];
			}
			if (erUtlogging) {
				return [
					blokk('1. POST /loggut · avslutt innloggingen', utloggingBackend, [2, 4, 5]),
					blokk('2. GET /meg · spør etterpå', megBackend, [2, 3, 4])
				];
			}
			return [blokk('GET /meg · samme rute før og etter innlogging', megBackend, megMarkering)];
		}

		if (erInnlogging) {
			return [
				blokk(
					'Demo: funksjonen til innloggingsknappen',
					[
						'async function loggInnDemo() {',
						'  const svar = await fetch(API + "/logginn", {',
						'    method: "POST",',
						'    credentials: "include",',
						'    headers: { "Content-Type": "application/json" },',
						'    body: JSON.stringify({ visningsnavn: ' + JSON.stringify(navn) + ' })',
						'  });',
						'  if (!svar.ok) throw new Error("Demo-innlogging feilet");',
						'  return await svar.json();',
						'}'
					],
					[4, 6, 9]
				)
			];
		}
		if (erUtlogging) {
			return [
				blokk(
					'Knappen sender først POST /loggut, deretter GET /meg',
					utloggingFrontend,
					[2, 6, 7, 10]
				)
			];
		}
		const linjer = [
			'async function sporHvemJegEr() {',
			'  const svar = await fetch(API + "/meg", {',
			'    credentials: "' + cookieInnstilling + '"',
			'  });',
			'  if (svar.status === 401) return null;',
			'  if (!svar.ok) throw new Error("Kunne ikke hente bruker");',
			'  const data = await svar.json();',
			'  return data.bruker;',
			'}'
		];
		const utfall = resultat?.status === 401 ? [5] : [7, 8];
		return [
			blokk(
				'Funksjonen til «Spør hvem jeg er»',
				linjer,
				ekstra && forsok === 'cookie' ? [3, ...utfall] : utfall
			)
		];
	});

	let kontekst = $derived.by(() => {
		if (visning === 'frontend') {
			return 'API er "http://localhost:3000". Kall funksjonen når knappen trykkes; den skal ikke kjøre automatisk når siden lastes.';
		}
		if (!ekstra && trinn === 1) {
			return 'Utdrag inne i en Express-rute med req, res og next. bruker må komme fra vellykket autentisering. Demoen godtar bare et navn og utfører ikke denne kontrollen.';
		}
		if (!ekstra && trinn === 3) {
			return 'cookieOptions er de samme cookie-innstillingene som i oppsettet, uten maxAge eller expires. Begge rutene bruker express-session.';
		}
		return 'express-session slår opp cookie-ID-en før ruten kjører. Her sjekker vi om req.session har en innlogget bruker.';
	});

	let forklaring = $derived.by(() => {
		if (!ekstra && trinn === 1) {
			return visning === 'backend'
				? 'I en ekte backend gir regenerate en ny ID. Brukerdata lagres i sessionen, og middleware sender ID-en med Set-Cookie.'
				: 'Denne demofunksjonen sender bare visningsnavnet. Det er ikke sikker autentisering. credentials: "include" lar nettleseren ta imot Set-Cookie i labens oppsett.';
		}
		if (!ekstra && trinn === 3) {
			return resultat
				? 'Først kom 204 fra utloggingen, uten JSON-body. Så kom 401 fra GET /meg. Markeringene viser begge delene av handlingen.'
				: 'Dette er to forespørsler: avslutt sessionen, og spør så hvem du er. Et 204-svar har ingen JSON-body.';
		}
		if (ekstra && forsok === 'cookie') {
			if (!resultat) {
				return 'Koden følger bryteren. Disse localhost-adressene har ulike origins; CORS er riktig satt opp. include overstyrer ikke SameSite eller andre cookie-regler.';
			}
			return resultat.status === 401
				? 'Cookien ble ikke sendt med denne requesten. Derfor mangler innlogget bruker i req.session. Cookien og den gamle sessionen er fortsatt lagret.'
				: 'Nå fulgte cookien med. Backend fant sessionen, og /meg svarte med ' + navn + '.';
		}
		if (ekstra && forsok === 'utlopt') {
			return resultat
				? 'Cookie-ID-en ble sendt, men sessionen var utløpt. Middleware fant ingen innlogget bruker, så den samme sjekken ga 401.'
				: 'Forsøket lar sessionen utløpe før GET /meg. Ruten er uendret; vi undersøker hva oppslaget finner.';
		}
		if (ekstra && forsok === 'profiler') {
			return resultat
				? 'Den valgte profilen sendte sin egen ID. Samme rute fant ' +
						navn +
						' gjennom denne profilens session.'
				: 'Begge profiler bruker samme kode. Cookie-ID-en avgjør hvilken session backend finner.';
		}
		if (!resultat) {
			return trinn === 0
				? 'Dette er nøyaktig samme /meg-kode som i «Spør igjen». Prøv handlingen og se hvilken gren som forklarer svaret.'
				: 'Koden er uendret siden «Før innlogging». Nå har nettleseren en ID som peker til en innlogget bruker.';
		}
		return resultat.status === 401
			? 'Ingen bruker ble funnet. Backend svarer 401; frontend kan bruke null til å vise at du ikke er innlogget.'
			: 'Samme kode, et annet resultat: backend fant ' +
					navn +
					' i sessionen og returnerte brukerdata med 200.';
	});
</script>

<section class="trinnkode" aria-label="Koden bak dette trinnet">
	<div class="kodetopp">
		<div>
			<p class="overlinje">HANDLING → KODE → SVAR</p>
			<h3>Koden bak dette trinnet</h3>
		</div>
		<div class="visningsvalg" role="group" aria-label="Velg backend- eller frontendkode">
			<button
				aria-pressed={visning === 'backend'}
				class:valgt={visning === 'backend'}
				onclick={() => (visning = 'backend')}>Backend</button
			>
			<button
				aria-pressed={visning === 'frontend'}
				class:valgt={visning === 'frontend'}
				onclick={() => (visning = 'frontend')}>Frontend</button
			>
		</div>
	</div>
	<p class="kontekst">{kontekst}</p>
	<div class="kodeblokker">
		{#each blokker as kodeblokk}
			<div class="kodeblokk">
				<div class="blokktittel"><span>{kodeblokk.tittel}</span><small>JAVASCRIPT</small></div>
				<pre><code
						>{#each kodeblokk.linjer as linje, i}<span
								class="kodelinje"
								class:markert={kodeblokk.markerte.includes(i + 1)}
								data-linje={i + 1}
								><span class="linjenummer" aria-hidden="true">{i + 1}</span><span
									class="linjemarkor"
									aria-hidden="true">{kodeblokk.markerte.includes(i + 1) ? '→' : ' '}</span
								><span class="linjetekst">{linje}</span></span
							>{/each}</code
					></pre>
			</div>
		{/each}
	</div>
	<div class="kodefot">
		<p class="markeringsforklaring">
			{resultat
				? '→ Markerte linjer forklarer svaret.'
				: 'Prøv handlingen for å se relevante linjer markert.'}
		</p>
		<p>{forklaring}</p>
		<small
			>Undervisningsutdrag som forklarer simuleringen. Koden kjøres ikke her. Fullt oppsett finnes i
			«Bruk i eget prosjekt».</small
		>
	</div>
</section>

<style>
	.trinnkode {
		min-width: 0;
		border: 1px solid var(--color-border);
		border-radius: 9px;
		background: var(--color-surface);
		padding: 19px;
		color: var(--color-text);
	}
	.trinnkode,
	.trinnkode * {
		box-sizing: border-box;
	}
	.kodetopp {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
	}
	.overlinje {
		margin: 0 0 6px;
		color: var(--color-accent);
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 1.2px;
	}
	h3 {
		margin: 0;
		font-size: 18px;
		line-height: 1.35;
		letter-spacing: -0.35px;
	}
	.visningsvalg {
		display: flex;
		gap: 4px;
		padding: 3px;
		border: 1px solid var(--color-border);
		border-radius: 7px;
		background: var(--color-surface-soft);
	}
	button {
		font: inherit;
		font-size: 12px;
		font-weight: 600;
		padding: 8px 12px;
		border-radius: 5px;
		border: 1px solid transparent;
		color: var(--color-text-muted);
		background: transparent;
		cursor: pointer;
	}
	button:hover {
		background: var(--color-surface-hover);
	}
	button.valgt {
		background: var(--color-surface-raised);
		border-color: var(--color-border-strong);
		color: var(--color-accent);
		box-shadow: 0 1px 3px var(--color-shadow);
	}
	button:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.kontekst {
		font-size: 12px;
		line-height: 1.65;
		color: var(--color-text-muted);
		margin: 13px 0 16px;
		max-width: 900px;
	}
	.kodeblokker {
		display: grid;
		gap: 14px;
		min-width: 0;
	}
	.kodeblokk {
		min-width: 0;
		border: 1px solid #2d5342;
		border-radius: 7px;
		overflow: hidden;
		background: #193c2f;
	}
	.blokktittel {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 10px 13px;
		background: #244837;
		border-bottom: 1px solid #355844;
		color: #c2d9ad;
		font-size: 11px;
		line-height: 1.5;
	}
	.blokktittel small {
		color: #a1bb93;
		font: 8px monospace;
		letter-spacing: 0.8px;
		flex-shrink: 0;
	}
	pre {
		overflow-x: auto;
		margin: 0;
		padding: 11px 0;
		color: #e0edcf;
		font-size: 12px;
		line-height: 1.8;
		tab-size: 2;
	}
	pre,
	code {
		font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
	}
	pre > code {
		display: block;
		min-width: max-content;
	}
	.kodelinje {
		display: grid;
		grid-template-columns: 28px 19px minmax(0, 1fr);
		align-items: baseline;
		padding: 1px 15px 1px 6px;
		border-left: 3px solid transparent;
	}
	.linjenummer {
		color: #8aa67f;
		font-size: 10px;
		text-align: right;
		user-select: none;
		padding-right: 7px;
	}
	.linjemarkor {
		color: transparent;
		font-size: 13px;
		user-select: none;
	}
	.linjetekst {
		white-space: pre;
	}
	.kodelinje.markert {
		background: #355c40;
		border-left-color: #c5dc8b;
		color: #f4f8de;
	}
	.markert .linjemarkor {
		color: #def0a7;
	}
	.markert .linjenummer {
		color: #c3d6ad;
	}
	.kodefot {
		margin-top: 14px;
	}
	.kodefot p {
		margin: 0 0 9px;
		font-size: 12px;
		line-height: 1.65;
		color: var(--color-text-muted);
	}
	.kodefot .markeringsforklaring {
		font-size: 11px;
		font-weight: 650;
		color: var(--color-accent);
		margin-bottom: 6px;
	}
	.kodefot small {
		display: block;
		font-size: 10px;
		line-height: 1.6;
		color: var(--color-text-subtle);
	}
	@media (max-width: 650px) {
		.trinnkode {
			padding: 15px;
		}
		.kodetopp {
			flex-wrap: wrap;
			gap: 12px;
		}
		h3 {
			font-size: 17px;
		}
		.visningsvalg {
			width: 100%;
		}
		.visningsvalg button {
			flex: 1;
			padding: 8px 10px;
		}
		.kontekst {
			font-size: 11px;
		}
		.blokktittel {
			font-size: 10px;
			padding: 9px 11px;
		}
		.blokktittel small {
			display: none;
		}
		pre {
			font-size: 11px;
		}
		.kodelinje {
			grid-template-columns: 22px 17px minmax(0, 1fr);
			padding-left: 3px;
			padding-right: 12px;
		}
		.linjenummer {
			font-size: 9px;
		}
		.kodefot p {
			font-size: 11px;
		}
	}
</style>
