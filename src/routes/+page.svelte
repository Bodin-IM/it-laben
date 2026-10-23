<script>
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';

	// Legg til flere sider ved å kopiere objektet nedenfor inn i listen.
	// «href» er adressen til siden, f.eks. /backend for src/routes/backend/+page.svelte.
	const sider = [
		{
			tittel: 'Frontend møter backend',
			beskrivelse:
				'Send en melding og hent den tilbake. Følg koden og klikk på en linje for en forklaring rett ved den.',
			href: '/backend',
			kategori: 'Utvikling',
			type: 'Interaktiv kodelab',
			emner: ['fetch', 'req.body', 'GET / POST'],
			symbol: '↔'
		},
		{
			tittel: 'Bygg videre på chatten',
			beskrivelse:
				'Hent riktig rom, bruk avsenderen fra en session og undersøk hvem som får slette en melding.',
			href: '/chatrom',
			kategori: 'Utvikling',
			type: 'Tre interaktive kodeforsøk',
			emner: ['Chatrom', 'Session', 'DELETE'],
			symbol: '#'
		},
		{
			tittel: 'Lagring i JSON-fil',
			beskrivelse:
				'Følg koden fra minne til fil. Slå av lagringen og se hva som overlever en omstart.',
			href: '/fillagring',
			kategori: 'Utvikling',
			type: 'Interaktiv kodelab',
			emner: ['JSON', 'Fillagring', 'Omstart'],
			symbol: '{}'
		},
		{
			tittel: 'Sessions og pålogging',
			beskrivelse:
				'Følg én innlogging, ett steg om gangen. Utforsk cookie og session med kode som følger forsøket.',
			href: '/sessions',
			kategori: 'Utvikling',
			type: 'Stegvis forklaring med kode',
			emner: ['Session', 'Cookie', 'credentials'],
			symbol: 'ID'
		}
	];
</script>

<svelte:head>
	<title>IT-laben – se hvordan det henger sammen</title>
	<meta
		name="description"
		content="Eksempler, forklaringer og små kodepuslespill som gjør IT lettere å forstå."
	/>
</svelte:head>

<div class="forside">
	<header>
		<a class="logo" href="/" aria-label="IT-laben – forside"
			><span class="logo-symbol" aria-hidden="true">IT</span>IT-laben<span class="punkt">.</span></a
		>
		<div class="header-actions">
			<span class="header-note">SE. PRØV. FORSTÅ.</span>
			<ThemeToggle />
		</div>
	</header>

	<main>
		<section class="intro" aria-labelledby="sidetittel">
			<div class="intro-tekst">
				<p class="overlinje"><span></span> SMÅ FORKLARINGER. STORE AHA-ØYEBLIKK.</p>
				<h1 id="sidetittel">Se hvordan<br /><em>IT fungerer.</em></h1>
				<p class="ingress">
					Eksempler og forklaringer du kan utforske i ditt eget tempo. Følg dataene, prøv selv og se
					hvordan alt henger sammen.
				</p>
				<div class="introvalg">
					<a class="snarvei" href="#utforsk">Finn en forklaring <span aria-hidden="true">↓</span></a
					>
					<a class="spillsnarvei" href="#spill">Prøv et spill <span aria-hidden="true">↘</span></a>
				</div>
			</div>
			<div class="illustrasjon" aria-hidden="true">
				<div class="rutenett"></div>
				<div class="kodekort">
					<div class="korttopp"><span>● ● ●</span><span>et lite innblikk</span></div>
					<div class="kodelinjer">
						<span><b>const</b> melding = <i>"Hei!"</i>;</span><span
							><b>await</b> send(melding);</span
						><span class="kommentar">// Hva skjer videre?</span>
					</div>
				</div>
				<div class="dataflyt">
					<span>INPUT</span>
					<div class="forbindelse"><i></i></div>
					<span>RESULTAT <b>✓</b></span>
				</div>
				<span class="etikett">Nå gir det mening.</span>
			</div>
		</section>

		<section id="utforsk" aria-labelledby="oversikt">
			<div class="seksjonstopp">
				<div>
					<p class="overlinje">UTFORSK LABEN</p>
					<h2 id="oversikt">Et sted å begynne</h2>
				</div>
				<span class="antall">{sider.length} {sider.length === 1 ? 'side' : 'sider'} å utforske</span
				>
			</div>
			<div class="kortliste">
				{#each sider as side}
					<a class="sidekort" href={side.href}>
						<div class="kortetiketter">
							<span class="kategori">{side.kategori}</span><span class="symbol" aria-hidden="true"
								>{side.symbol}</span
							>
						</div>
						<p class="sidetype">{side.type}</p>
						<h3>{side.tittel}</h3>
						<p class="beskrivelse">{side.beskrivelse}</p>
						<ul class="emner" aria-label="Temaer">
							{#each side.emner as emne}<li>{emne}</li>{/each}
						</ul>
						<div class="kortfot">
							<span>Åpne forklaringen</span><span class="pil" aria-hidden="true">↗</span>
						</div>
					</a>
				{/each}
				<aside class="kommer">
					<span class="pluss" aria-hidden="true">+</span>
					<h3>Laben vokser</h3>
					<p>
						Flere eksempler og forklaringer om utvikling og driftsstøtte kommer til etter hvert.
					</p>
					<span class="stiplet-linje" aria-hidden="true"></span>
				</aside>
			</div>
		</section>

		<section id="spill" class="spillseksjon" aria-labelledby="spilloversikt">
			<div class="seksjonstopp">
				<div>
					<p class="overlinje">BYGG. TEST. PRØV IGJEN.</p>
					<h2 id="spilloversikt">Spill og utfordringer</h2>
				</div>
				<span class="antall">3 spill</span>
			</div>
			<p class="spillintroduksjon">
				Tre måter å utforske chatten: feilsøk, reparer koden eller styr nettleserne.
			</p>
			<div class="spillkortliste">
				<a class="spillkort nyvariant" href="/spill/meldingsdetektiven/">
					<div class="spillkorttopp">
						<p class="spilltype">Feilsøk chatten <span aria-hidden="true">·</span> 4 saker</p>
						<span class="nymerke">Ny variant</span>
					</div>
					<h3>Meldingsdetektiven</h3>
					<p class="spillbeskrivelse">
						Følg sporene i kode, requests, svar og serverdata. Finn feilen, rett koden og test om
						chatten fungerer.
					</p>
					<div class="spillmotiv servermotiv" aria-hidden="true">
						<span class="motivlupe"></span>
						<div class="testtyper">
							<span>Kode</span><span>Request</span><span>Svar</span><span>Data</span>
						</div>
					</div>
					<div class="spillkortfot">
						<span>Prøv Meldingsdetektiven</span><span class="spillpil" aria-hidden="true">→</span>
					</div>
				</a>
				<a class="spillkort" href="/spill/redd-chatten/">
					<div class="spillkorttopp">
						<p class="spilltype">Reparer backend <span aria-hidden="true">·</span> 3 oppdrag</p>
					</div>
					<h3>Redd chatten</h3>
					<p class="spillbeskrivelse">
						Reparer serverkoden, og slipp virtuelle brukere løs. Klarer chatten både vanlige
						meldinger og feilforsøk?
					</p>
					<div class="spillmotiv servermotiv" aria-hidden="true">
						<span class="motivkode">&#123; &#125;</span>
						<div class="testtyper">
							<span>Vanlig melding <b>?</b></span><span>Tom tekst <b>?</b></span><span
								>Sletting <b>?</b></span
							>
						</div>
					</div>
					<div class="spillkortfot">
						<span>Prøv Redd chatten</span><span class="spillpil" aria-hidden="true">→</span>
					</div>
				</a>
				<a class="spillkort" href="/spill/chat/">
					<div class="spillkorttopp">
						<p class="spilltype">Styr nettleserne <span aria-hidden="true">·</span> 3 oppdrag</p>
						<span class="variantmerke">Første variant</span>
					</div>
					<h3>To nettlesere, én chat.</h3>
					<p class="spillbeskrivelse">
						Bygg en handlingsrekke som får meldingen fram til Noah. Følg POST og GET mellom
						nettleserne og serveren.
					</p>
					<div class="spillmotiv nettlesermotiv" aria-hidden="true">
						<span>Ada</span><b>↔</b><span class="motivserver">Server</span><b>↔</b><span>Noah</span>
					</div>
					<div class="spillkortfot">
						<span>Prøv To nettlesere, én chat</span><span class="spillpil" aria-hidden="true"
							>→</span
						>
					</div>
				</a>
			</div>
		</section>

		<footer>
			<span>IT-laben<span class="punkt">.</span></span>
			<p>Ta ett steg om gangen. Prøv igjen når du trenger det.</p>
		</footer>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background: var(--color-page);
	}
	.forside {
		--blekk: var(--color-text);
		--gronn: var(--color-accent);
		--dempa: var(--color-text-muted);
		--kant: var(--color-border);
		min-height: 100vh;
		color: var(--blekk);
		font-family:
			Inter,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		background: radial-gradient(ellipse at 83% 9%, var(--color-page-glow) 0, transparent 43%);
	}
	.forside,
	.forside * {
		box-sizing: border-box;
	}
	a {
		color: inherit;
		text-decoration: none;
	}
	a:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 6px;
	}
	header,
	main {
		width: min(1120px, calc(100% - 80px));
		margin: 0 auto;
	}
	header {
		min-height: 94px;
		padding-block: 14px;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px 24px;
		justify-content: space-between;
		border-bottom: 1px solid var(--kant);
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
		color: var(--gronn);
	}
	.header-note {
		font: var(--font-meta)/var(--leading-body) monospace;
		letter-spacing: 1.8px;
		color: var(--dempa);
	}
	.header-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 12px 24px;
		margin-left: auto;
		max-width: 100%;
	}
	.intro {
		display: grid;
		grid-template-columns: 1.2fr 1fr;
		gap: 60px;
		align-items: center;
		padding: 78px 0 72px;
	}
	.overlinje {
		color: var(--gronn);
		font-size: var(--font-meta);
		font-weight: 750;
		letter-spacing: 1.55px;
		margin: 0 0 21px;
		line-height: 1.8;
	}
	.overlinje > span {
		display: inline-block;
		width: 6px;
		height: 6px;
		background: var(--gronn);
		border-radius: 50%;
		margin-right: 7px;
		vertical-align: 1px;
	}
	h1 {
		font-size: clamp(44px, 5.6vw, 70px);
		font-weight: 760;
		letter-spacing: -3px;
		line-height: 1.06;
		margin: 0 0 24px;
	}
	h1 em {
		font-style: normal;
		color: var(--gronn);
	}
	.ingress {
		max-width: 460px;
		font-size: var(--font-body);
		line-height: var(--leading-body);
		color: var(--dempa);
		margin: 0 0 26px;
	}
	.snarvei {
		display: inline-flex;
		gap: 22px;
		align-items: center;
		padding: 12px 0;
		border-bottom: 1px solid var(--color-border-strong);
		font-size: var(--font-small);
		font-weight: 650;
	}
	.snarvei:hover {
		color: var(--gronn);
	}
	.introvalg {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px 25px;
	}
	.spillsnarvei {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 12px 0;
		font-size: var(--font-small);
		font-weight: 600;
		color: var(--gronn);
	}
	.spillsnarvei:hover {
		text-decoration: underline;
		text-underline-offset: 5px;
	}
	.illustrasjon {
		position: relative;
		padding: 40px 0;
		isolation: isolate;
	}
	.rutenett {
		position: absolute;
		z-index: -1;
		inset: -12px -18px;
		background-image: radial-gradient(var(--color-border-strong) 1px, transparent 1px);
		background-size: 18px 18px;
		opacity: 0.45;
		mask-image: radial-gradient(ellipse, #000 25%, transparent 70%);
	}
	.kodekort {
		background: #193538;
		color: #e0eae0;
		border-radius: 12px;
		overflow: hidden;
		transform: rotate(-4deg);
		box-shadow: 0 22px 35px var(--color-shadow);
	}
	.korttopp {
		display: flex;
		justify-content: space-between;
		padding: 14px 18px;
		background: #264447;
		color: #a0b8a9;
		font: var(--font-meta)/var(--leading-body) monospace;
	}
	.korttopp > span:first-child {
		letter-spacing: 2px;
		color: #719c88;
	}
	.kodelinjer {
		padding: 27px 22px;
		display: grid;
		gap: 11px;
		font:
			var(--font-code)/var(--leading-code) Consolas,
			monospace;
	}
	.kodelinjer b {
		color: #c8b9e6;
		font-weight: 400;
	}
	.kodelinjer i {
		color: #c4df9e;
		font-style: normal;
	}
	.kodelinjer .kommentar {
		color: #91aaa1;
		margin-top: 7px;
	}
	.dataflyt {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 25px 12px 0;
		font: var(--font-meta)/var(--leading-body) monospace;
		color: var(--color-text-muted);
	}
	.dataflyt > span {
		padding: 9px 12px;
		background: var(--color-surface-soft);
		border: 1px solid var(--color-border);
		border-radius: 6px;
	}
	.dataflyt b {
		color: var(--gronn);
		margin-left: 7px;
	}
	.forbindelse {
		flex: 1;
		border-top: 1px dashed var(--color-border-strong);
		position: relative;
	}
	.forbindelse i {
		position: absolute;
		width: 7px;
		height: 7px;
		border-radius: 2px;
		background: var(--gronn);
		top: -4px;
		left: 0;
		animation: flyt 3.5s ease-in-out infinite;
	}
	.etikett {
		position: absolute;
		right: -10px;
		top: 15px;
		font-size: var(--font-meta);
		background: var(--color-warning-soft);
		color: var(--color-warning);
		padding: 10px 15px;
		border-radius: 5px;
		transform: rotate(7deg);
		box-shadow: 0 4px 10px var(--color-shadow);
	}
	.seksjonstopp {
		display: flex;
		justify-content: space-between;
		align-items: end;
		margin-bottom: 23px;
		gap: 20px;
	}
	.seksjonstopp .overlinje {
		margin-bottom: 8px;
		font-size: var(--font-meta);
	}
	h2 {
		margin: 0;
		font-size: 25px;
		font-weight: 700;
		letter-spacing: -0.8px;
	}
	.antall {
		font-size: var(--font-meta);
		color: var(--dempa);
		padding-bottom: 3px;
	}
	.kortliste {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 20px;
	}
	.sidekort {
		display: flex;
		flex-direction: column;
		padding: 25px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		transition:
			transform 0.2s,
			border-color 0.2s,
			box-shadow 0.2s;
	}
	.sidekort:hover {
		transform: translateY(-4px);
		border-color: var(--color-border-strong);
		box-shadow: 0 14px 30px var(--color-shadow);
	}
	.kortetiketter {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 32px;
	}
	.kategori {
		font-size: var(--font-meta);
		font-weight: 650;
		background: var(--color-success-soft);
		color: var(--color-success);
		padding: 6px 9px;
		border-radius: 4px;
	}
	.symbol {
		display: grid;
		place-items: center;
		width: 35px;
		height: 35px;
		border: 1px solid var(--color-border);
		border-radius: 9px;
		font: 23px monospace;
		color: var(--gronn);
	}
	.sidetype {
		margin: 0 0 9px;
		font-size: var(--font-meta);
		text-transform: uppercase;
		letter-spacing: 1.1px;
		color: var(--color-text-subtle);
	}
	h3 {
		font-size: 20px;
		line-height: 1.3;
		letter-spacing: -0.6px;
		font-weight: 700;
		margin: 0 0 12px;
	}
	.beskrivelse {
		font-size: var(--font-body);
		line-height: var(--leading-body);
		color: var(--dempa);
		margin: 0 0 20px;
	}
	.emner {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 0;
		list-style: none;
		margin: auto 0 24px;
	}
	.emner li {
		font: var(--font-meta)/var(--leading-body) monospace;
		padding: 5px 7px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-text-muted);
	}
	.kortfot {
		border-top: 1px solid var(--color-border);
		padding-top: 17px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: var(--font-small);
		font-weight: 650;
		color: var(--gronn);
	}
	.pil {
		font-size: 19px;
		transition: transform 0.2s;
	}
	.sidekort:hover .pil {
		transform: translate(2px, -2px);
	}
	.kommer {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 35px 20px;
		border: 1px dashed var(--color-border-strong);
		border-radius: 12px;
		min-height: 270px;
	}
	.pluss {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		border: 1px dashed var(--color-border-strong);
		border-radius: 50%;
		color: var(--color-text-subtle);
		font-size: 23px;
		margin-bottom: 18px;
	}
	.kommer h3 {
		font-size: var(--font-body);
		color: var(--color-text-muted);
		margin-bottom: 9px;
		letter-spacing: -0.3px;
	}
	.kommer p {
		font-size: var(--font-body);
		line-height: var(--leading-body);
		color: var(--color-text-subtle);
		margin: 0;
	}
	.stiplet-linje {
		width: 35px;
		border-top: 2px dotted var(--color-border-strong);
		margin-top: 22px;
	}
	.spillseksjon {
		margin-top: 60px;
		scroll-margin-top: 24px;
	}
	.spillintroduksjon {
		margin: -8px 0 24px;
		color: var(--dempa);
		font-size: var(--font-body);
		line-height: var(--leading-body);
	}
	.spillkortliste {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 18px;
	}
	.spillkort {
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 24px;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface-soft);
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}
	.spillkort.nyvariant {
		background: linear-gradient(115deg, var(--color-success-soft), var(--color-surface-soft));
		border-color: var(--color-success-border);
	}
	.spillkort:hover {
		border-color: var(--color-border-strong);
		box-shadow: 0 10px 24px var(--color-shadow);
	}
	.spillkorttopp {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 9px;
		min-height: 22px;
		margin-bottom: 20px;
	}
	.spilltype {
		margin: 0;
		color: var(--color-text-muted);
		font-size: var(--font-meta);
		font-weight: 650;
		letter-spacing: 0.55px;
		text-transform: uppercase;
	}
	.spilltype > span {
		margin-inline: 4px;
		color: var(--color-text-subtle);
	}
	.nymerke,
	.variantmerke {
		padding: 4px 7px;
		border-radius: 4px;
		font-size: var(--font-meta);
		line-height: 1.4;
		white-space: nowrap;
	}
	.nymerke {
		background: var(--color-surface-active);
		color: var(--color-success);
		font-weight: 650;
	}
	.variantmerke {
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
	}
	.spillkort h3 {
		font-size: clamp(24px, 2.3vw, 29px);
		letter-spacing: -0.8px;
		line-height: 1.2;
		margin: 0 0 12px;
	}
	.spillbeskrivelse {
		margin: 0 0 22px;
		font-size: var(--font-body);
		line-height: var(--leading-body);
		color: var(--color-text-muted);
	}
	.spillmotiv {
		display: flex;
		align-items: center;
		min-height: 78px;
		margin-top: auto;
		padding: 15px;
		border: 1px solid #395e4d;
		border-radius: 8px;
		background: #193b32;
		color: #dce8d5;
	}
	.servermotiv {
		gap: 16px;
	}
	.motivkode {
		flex: 0 0 auto;
		color: #b6ce92;
		font: 25px/1 monospace;
	}
	.motivlupe {
		position: relative;
		flex: 0 0 21px;
		width: 21px;
		height: 21px;
		margin: 0 5px 5px 0;
		border: 2px solid #b6ce92;
		border-radius: 50%;
	}
	.motivlupe::after {
		content: '';
		position: absolute;
		width: 10px;
		height: 2px;
		background: #b6ce92;
		right: -8px;
		bottom: -4px;
		transform: rotate(45deg);
		border-radius: 2px;
	}
	.testtyper {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		font-size: var(--font-meta);
	}
	.testtyper > span {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 6px 7px;
		border: 1px solid #456550;
		border-radius: 4px;
		background: #26473a;
		color: #b9cdb0;
	}
	.testtyper b {
		font: var(--font-meta)/var(--leading-body) monospace;
		color: #dfd5a3;
	}
	.nettlesermotiv {
		justify-content: center;
		gap: 17px;
		font-size: var(--font-meta);
	}
	.nettlesermotiv b {
		font-size: 18px;
		font-weight: 400;
		color: #8aad86;
	}
	.motivserver {
		padding: 7px 12px;
		border: 1px dashed #597c60;
		border-radius: 4px;
		color: #bed0ac;
	}
	.spillkortfot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		margin-top: 23px;
		color: var(--color-accent);
		font-size: var(--font-small);
		font-weight: 650;
	}
	.spillpil {
		font-size: 20px;
		transition: transform 0.2s;
	}
	.spillkort:hover .spillpil {
		transform: translateX(3px);
	}

	footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 20px;
		border-top: 1px solid var(--kant);
		margin-top: 65px;
		padding: 25px 0 35px;
		color: var(--color-text-subtle);
	}
	footer > span {
		font-size: var(--font-small);
		font-weight: 700;
	}
	footer p {
		font-size: var(--font-meta);
		line-height: 1.7;
		margin: 0;
	}
	@keyframes flyt {
		0% {
			left: 0;
			opacity: 0;
		}
		15% {
			opacity: 1;
		}
		85% {
			opacity: 1;
		}
		100% {
			left: calc(100% - 7px);
			opacity: 0;
		}
	}
	@media (max-width: 950px) {
		.spillkortliste {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.spillkort {
			padding: 23px;
		}
		.intro {
			gap: 35px;
		}
		.kortliste {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.kodelinjer {
			font-size: var(--font-code);
			padding: 23px 16px;
		}
		.dataflyt {
			gap: 8px;
			font-size: var(--font-meta);
		}
		.dataflyt > span {
			padding: 8px;
		}
	}
	@media (max-width: 650px) {
		.spillseksjon {
			margin-top: 40px;
		}
		.spillkortliste {
			grid-template-columns: 1fr;
			gap: 16px;
		}
		.spillkort {
			padding: 22px;
		}
		.spillkorttopp {
			margin-bottom: 17px;
		}
		.nettlesermotiv {
			gap: 12px;
		}
		.motivserver {
			padding-inline: 9px;
		}

		header,
		main {
			width: calc(100% - 40px);
		}
		header {
			min-height: 76px;
		}
		.logo {
			font-size: 17px;
		}
		.header-note {
			display: none;
		}
		.intro {
			grid-template-columns: 1fr;
			padding: 42px 0 35px;
			gap: 20px;
		}
		h1 {
			font-size: 49px;
			letter-spacing: -2.5px;
		}
		.overlinje {
			font-size: var(--font-meta);
			letter-spacing: 1.2px;
		}
		.ingress {
			font-size: var(--font-body);
		}
		.illustrasjon {
			max-width: 360px;
			width: 100%;
			margin: 0 auto;
			padding: 30px 8px;
		}
		.kodelinjer {
			font-size: var(--font-code);
		}
		.etikett {
			right: 0;
			top: 8px;
		}
		.seksjonstopp {
			align-items: start;
			gap: 10px;
		}
		h2 {
			font-size: 23px;
		}
		.antall {
			font-size: var(--font-meta);
			padding-top: 28px;
			white-space: nowrap;
		}
		.kortliste {
			grid-template-columns: 1fr;
			gap: 14px;
		}
		.kortetiketter {
			margin-bottom: 22px;
		}
		.kommer {
			min-height: 190px;
			padding: 25px;
		}
		footer {
			margin-top: 40px;
			flex-direction: column;
			align-items: start;
			gap: 9px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			animation: none !important;
			transition: none !important;
		}
		.forbindelse i {
			left: 50%;
		}
	}
</style>
