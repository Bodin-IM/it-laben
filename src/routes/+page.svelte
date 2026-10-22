<script>
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
		<span class="header-note">SE. PRØV. FORSTÅ.</span>
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
				<span class="antall">1 spill</span>
			</div>
			<a class="spillkort" href="/spill/chat/">
				<div class="spilltekst">
					<p class="spilltype">Kodepuslespill <span aria-hidden="true">·</span> 3 oppdrag</p>
					<h3>To nettlesere,<br />én chat.</h3>
					<p class="spillbeskrivelse">
						Bygg en handlingsrekke og få meldingen fram til Noah. Se hva koden gjør, finn feilen og
						prøv igjen.
					</p>
					<span class="spillknapp">Prøv spillet <span aria-hidden="true">→</span></span>
				</div>
				<div class="spillmotiv" aria-hidden="true">
					<div class="motivtopp"><span>● ● ●</span><span>Ditt forsøk</span></div>
					<div class="spillhandling">
						<div>
							<span class="motivaktor">ADA · NETTLESER</span><code><b>await</b> sendMelding();</code
							>
						</div>
						<span class="motivmetode post">POST</span>
					</div>
					<div class="spillhandling">
						<div>
							<span class="motivaktor">NOAH · NETTLESER</span><code
								><b>await</b> hentRom(<i>"generelt"</i>);</code
							>
						</div>
						<span class="motivmetode get">GET</span>
					</div>
					<div class="motivrute">
						<span>Ada</span><b>↔</b><span class="motivserver">Server</span><b>↔</b><span>Noah</span>
					</div>
				</div>
			</a>
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
		background: #f4f5ef;
	}
	.forside {
		--blekk: #193c3b;
		--gronn: #087f79;
		--dempa: #657b71;
		--kant: #d9e2d6;
		min-height: 100vh;
		color: var(--blekk);
		font-family:
			Inter,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		background: radial-gradient(ellipse at 83% 9%, #dfeee1 0, transparent 43%);
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
		outline: 3px solid #bd6e31;
		outline-offset: 6px;
	}
	header,
	main {
		width: min(1120px, calc(100% - 80px));
		margin: 0 auto;
	}
	header {
		height: 94px;
		display: flex;
		align-items: center;
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
		background: var(--blekk);
		color: #d8f0cb;
		border-radius: 10px;
		font: 600 17px monospace;
	}
	.punkt {
		color: var(--gronn);
	}
	.header-note {
		font: 10px monospace;
		letter-spacing: 1.8px;
		color: var(--dempa);
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
		font-size: 10px;
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
		font-size: 15px;
		line-height: 1.8;
		color: var(--dempa);
		margin: 0 0 26px;
	}
	.snarvei {
		display: inline-flex;
		gap: 22px;
		align-items: center;
		padding: 12px 0;
		border-bottom: 1px solid #a9c4af;
		font-size: 13px;
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
		font-size: 13px;
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
		background-image: radial-gradient(#99b7a7 1px, transparent 1px);
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
		box-shadow: 0 22px 35px #173e3318;
	}
	.korttopp {
		display: flex;
		justify-content: space-between;
		padding: 14px 18px;
		background: #264447;
		color: #a0b8a9;
		font: 9px monospace;
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
			12px/1.5 Consolas,
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
		font: 9px monospace;
		color: #587b63;
	}
	.dataflyt > span {
		padding: 9px 12px;
		background: #eef4e8;
		border: 1px solid #c9dcc6;
		border-radius: 6px;
	}
	.dataflyt b {
		color: var(--gronn);
		margin-left: 7px;
	}
	.forbindelse {
		flex: 1;
		border-top: 1px dashed #9eb8a4;
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
		font-size: 11px;
		background: #e8b878;
		color: #5b4527;
		padding: 10px 15px;
		border-radius: 5px;
		transform: rotate(7deg);
		box-shadow: 0 4px 10px #583d1710;
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
		font-size: 9px;
	}
	h2 {
		margin: 0;
		font-size: 25px;
		font-weight: 700;
		letter-spacing: -0.8px;
	}
	.antall {
		font-size: 11px;
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
		background: #fffefb;
		border: 1px solid #d5e0d1;
		border-radius: 12px;
		transition:
			transform 0.2s,
			border-color 0.2s,
			box-shadow 0.2s;
	}
	.sidekort:hover {
		transform: translateY(-4px);
		border-color: #8db49c;
		box-shadow: 0 14px 30px #234e3010;
	}
	.kortetiketter {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 32px;
	}
	.kategori {
		font-size: 9px;
		font-weight: 650;
		background: #edf3e7;
		color: #47714d;
		padding: 6px 9px;
		border-radius: 4px;
	}
	.symbol {
		display: grid;
		place-items: center;
		width: 35px;
		height: 35px;
		border: 1px solid #d7e5d5;
		border-radius: 9px;
		font: 23px monospace;
		color: var(--gronn);
	}
	.sidetype {
		margin: 0 0 9px;
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 1.1px;
		color: #82927b;
	}
	h3 {
		font-size: 20px;
		line-height: 1.3;
		letter-spacing: -0.6px;
		font-weight: 700;
		margin: 0 0 12px;
	}
	.beskrivelse {
		font-size: 12px;
		line-height: 1.8;
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
		font: 9px monospace;
		padding: 5px 7px;
		border: 1px solid #e2e8dd;
		border-radius: 4px;
		color: #71846b;
	}
	.kortfot {
		border-top: 1px solid #e2e8dd;
		padding-top: 17px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 11px;
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
		border: 1px dashed #cbd9c7;
		border-radius: 12px;
		min-height: 270px;
	}
	.pluss {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		border: 1px dashed #c3d2bd;
		border-radius: 50%;
		color: #819779;
		font-size: 23px;
		margin-bottom: 18px;
	}
	.kommer h3 {
		font-size: 16px;
		color: #6f8467;
		margin-bottom: 9px;
		letter-spacing: -0.3px;
	}
	.kommer p {
		font-size: 12px;
		line-height: 1.8;
		color: #87977f;
		margin: 0;
	}
	.stiplet-linje {
		width: 35px;
		border-top: 2px dotted #c0d0b9;
		margin-top: 22px;
	}
	.spillseksjon {
		margin-top: 60px;
		scroll-margin-top: 24px;
	}
	.spillkort {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		align-items: center;
		gap: 42px;
		padding: 38px;
		border: 1px solid #b8cfae;
		border-radius: 13px;
		background: linear-gradient(115deg, #e5eed8, #eef4e8);
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}
	.spillkort:hover {
		border-color: #7da487;
		box-shadow: 0 14px 30px #234e3010;
	}
	.spilltype {
		margin: 0 0 15px;
		color: #56764b;
		font-size: 10px;
		font-weight: 650;
		letter-spacing: 0.7px;
		text-transform: uppercase;
	}
	.spilltype > span {
		margin-inline: 6px;
		color: #7d946e;
	}
	.spillkort h3 {
		font-size: clamp(27px, 3vw, 35px);
		letter-spacing: -1px;
		line-height: 1.16;
		margin-bottom: 16px;
	}
	.spillbeskrivelse {
		margin: 0 0 22px;
		max-width: 380px;
		font-size: 13px;
		line-height: 1.8;
		color: #5b7355;
	}
	.spillknapp {
		display: inline-flex;
		align-items: center;
		gap: 28px;
		padding: 12px 17px;
		border-radius: 6px;
		background: #1d5147;
		color: #f2f6e9;
		font-size: 12px;
		font-weight: 650;
	}
	.spillknapp > span {
		font-size: 17px;
		transition: transform 0.2s;
	}
	.spillkort:hover .spillknapp > span {
		transform: translateX(3px);
	}
	.spillmotiv {
		min-width: 0;
		padding: 0 18px 18px;
		border: 1px solid #395e4d;
		border-radius: 10px;
		background: #193b32;
		box-shadow: 0 14px 24px #25482d14;
		color: #dce8d5;
	}
	.motivtopp {
		display: flex;
		justify-content: space-between;
		gap: 15px;
		padding-block: 17px;
		color: #9ab59d;
		font: 10px monospace;
	}
	.motivtopp > span:first-child {
		font-size: 8px;
		letter-spacing: 3px;
		color: #6f9579;
	}
	.spillhandling {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 15px 13px;
		border: 1px solid #41634f;
		border-radius: 6px;
		background: #25463a;
	}
	.spillhandling + .spillhandling {
		margin-top: 11px;
	}
	.spillhandling > div {
		min-width: 0;
	}
	.motivaktor {
		display: block;
		margin-bottom: 7px;
		font-size: 8px;
		font-weight: 650;
		letter-spacing: 1px;
		color: #adc29e;
	}
	.spillhandling code {
		display: block;
		font:
			11px/1.5 Consolas,
			monospace;
		overflow-wrap: anywhere;
	}
	.spillhandling code b {
		font-weight: 400;
		color: #a2d8c7;
	}
	.spillhandling code i {
		font-style: normal;
		color: #d7d29c;
	}
	.motivmetode {
		flex: 0 0 auto;
		padding: 5px 7px;
		border-radius: 4px;
		font: 9px monospace;
	}
	.motivmetode.post {
		background: #4b5339;
		color: #ddd9a7;
	}
	.motivmetode.get {
		background: #2c5a4b;
		color: #b2d9bf;
	}
	.motivrute {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 15px;
		margin-top: 18px;
		font-size: 10px;
		color: #a7be9e;
	}
	.motivrute b {
		font-size: 17px;
		font-weight: 400;
		color: #759c7e;
	}
	.motivserver {
		padding: 6px 12px;
		border: 1px dashed #597c60;
		border-radius: 4px;
	}
	footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 20px;
		border-top: 1px solid var(--kant);
		margin-top: 65px;
		padding: 25px 0 35px;
		color: #85957c;
	}
	footer > span {
		font-size: 12px;
		font-weight: 700;
	}
	footer p {
		font-size: 10px;
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
		.spillkort {
			gap: 25px;
			padding: 28px;
		}
		.spillmotiv {
			padding-inline: 12px;
		}
		.intro {
			gap: 35px;
		}
		.kortliste {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.kodelinjer {
			font-size: 10px;
			padding: 23px 16px;
		}
		.dataflyt {
			gap: 8px;
			font-size: 8px;
		}
		.dataflyt > span {
			padding: 8px;
		}
	}
	@media (max-width: 650px) {
		.spillseksjon {
			margin-top: 40px;
		}
		.spillkort {
			grid-template-columns: 1fr;
			padding: 23px;
			gap: 25px;
		}
		.spilltype {
			font-size: 9px;
			letter-spacing: 0.4px;
		}
		.spillhandling {
			padding: 12px 9px;
			gap: 8px;
		}
		.spillhandling code {
			font-size: 10px;
		}
		.motivmetode {
			font-size: 8px;
			padding: 4px 5px;
		}
		.motivrute {
			gap: 11px;
		}
		header,
		main {
			width: calc(100% - 40px);
		}
		header {
			height: 76px;
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
			font-size: 9px;
			letter-spacing: 1.2px;
		}
		.ingress {
			font-size: 14px;
		}
		.illustrasjon {
			max-width: 360px;
			width: 100%;
			margin: 0 auto;
			padding: 30px 8px;
		}
		.kodelinjer {
			font-size: 12px;
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
			font-size: 10px;
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
