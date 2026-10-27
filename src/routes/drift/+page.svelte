<svelte:options runes={false} />

<script>
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import AccountLink from '#lib/components/AccountLink.svelte';
	// Selvstendig SvelteKit-side. Ingen eksterne pakker, skrifter eller bilder.
	// Eldre reaktiv syntaks er eksplisitt aktivert, også når prosjektet bruker runes.
	const lessons = [
		{
			title: 'LAN og WAN',
			label: 'To sider av ruteren',
			goal: 'Forklare hva som er lokalt på Siten, og hva som ligger utenfor.',
			tag: 'Start her'
		},
		{
			title: 'Utstyr og kabler',
			label: 'Bli kjent med Siten',
			goal: 'Beskrive oppgaven til utstyret du kobler sammen.',
			tag: 'Utforsk'
		},
		{
			title: 'IP og nettverksmaske',
			label: 'Hvor er mottakeren?',
			goal: 'Bruke en /24-maske til å skille lokale og eksterne mål.',
			tag: 'Undersøk'
		},
		{
			title: 'Pakkebasert trafikk',
			label: 'Adresser og nyttelast',
			goal: 'Skille innholdet i en IP-pakke fra adressene som følger den.',
			tag: 'Prøv selv'
		},
		{
			title: 'MAC og switchen',
			label: 'Lær, slå opp, send videre',
			goal: 'Forklare hvordan en switch lærer hvor enheter er tilkoblet.',
			tag: 'Steg for steg'
		},
		{
			title: 'Interface og switchport',
			label: 'Samme kontakt – ulik rolle',
			goal: 'Skille et rutet interface fra en vanlig lag-2-switchport.',
			tag: 'Sammenlign'
		},
		{
			title: 'TCP- og UDP-porter',
			label: 'Hvilken tjeneste?',
			goal: 'Skille nettverksadressen fra portnummeret til en tjeneste.',
			tag: 'Utforsk'
		}
	];
	let active = 0;
	let visited = [0];
	let quiet = false;
	let pathStep = 0;
	let destination = 'local';
	let payload = 'Hei fra Siten vår!';
	let packetStep = 0;
	let switchStep = 0;
	let device = 'router';
	let hardware = 0;
	let service = 0;
	const equipment = [
		{
			name: 'Ruter',
			mark: 'R',
			text: 'Kobler IP-nett sammen og velger neste vei for en pakke. På Siten utfører den også NAT og kjører først DHCP.',
			cable: 'TP-kabel til LAN og WAN. Hvert rutet interface har sin egen nettverkstilknytning.'
		},
		{
			name: 'Switch',
			mark: 'S',
			text: 'Kobler enheter sammen i et Ethernet-nett. En vanlig lag-2-switch videresender rammer ved hjelp av MAC-adresser.',
			cable:
				'TP til klienter. Forbindelser mellom switcher kan bruke TP eller fiber, avhengig av utstyret.'
		},
		{
			name: 'Aksesspunkt',
			mark: 'AP',
			text: 'Gir trådløse klienter tilgang til nettverket. Et AP er ikke automatisk en ruter.',
			cable: 'Vanligvis TP til switchen. Noen AP får også strøm gjennom kabelen med PoE.'
		},
		{
			name: 'TP-kabel',
			mark: 'TP',
			text: 'Elektriske signaler sendes gjennom tvunnede kobberpar. Vanlig tilkobling mellom PC, switch, ruter og AP.',
			cable:
				'Kategori, lengde og utstyr påvirker hvilke hastigheter forbindelsen støtter. Kontakten kalles ofte RJ45.'
		},
		{
			name: 'Fiber',
			mark: 'F',
			text: 'Data overføres som lys. Brukes blant annet ved lengre avstander og mellom nettverksenheter.',
			cable: 'Fiber og optiske moduler må passe sammen. Kontakter og fibertype må også stemme.'
		}
	];
	const services = [
		{
			name: 'Internweb · HTTPS',
			proto: 'TCP',
			port: 443,
			text: 'Nettleseren oppretter her en TCP-forbindelse til webserverens port 443. Dette eksempelet viser HTTPS over TCP; HTTP/3 bruker i stedet QUIC over UDP.',
			purpose: 'Hent intranettsiden'
		},
		{
			name: 'Navneoppslag · DNS',
			proto: 'UDP',
			port: 53,
			text: 'Et vanlig DNS-oppslag kan sendes til UDP-port 53. DNS bruker også TCP, blant annet når det er nødvendig å prøve et svar på nytt over TCP.',
			purpose: 'Finn IP-adressen til intranett'
		},
		{
			name: 'Administrasjon · SSH',
			proto: 'TCP',
			port: 22,
			text: 'SSH bruker normalt TCP-port 22 på serveren. Det gir en kryptert forbindelse for fjernadministrasjon.',
			purpose: 'Administrer Ubuntu-serveren'
		}
	];
	const routeNotes = [
		'PC-en undersøker om mottakeren er i eget subnett. Her er målet utenfor LAN-et.',
		'PC-en sender mot standard gateway. Switchen fører Ethernet-rammen fram til ruteren.',
		'Ruteren mottar på LAN-interfacet og velger en rute videre gjennom WAN-interfacet.',
		'Pakken er nå på klassenettet, som er WAN sett fra denne Siten. Internett ligger videre utenfor klassenettet.'
	];
	const packetNotes = [
		'Avsenderen lager en IP-pakke med avsenderadresse, mottakeradresse og nyttelast.',
		'Switchen fører trafikken fram i LAN-et. Den bruker Ethernet-rammens MAC-adresser.',
		'Mottakeren tar imot pakken. Dette er et forenklet eksempel i samme subnett.'
	];
	const switchNotes = [
		'Tabellen er tom. PC A sender en ramme til PC B. A og B er i samme VLAN.',
		'Rammen kommer inn på port 1. Switchen lærer avsenderen: MAC A finnes på port 1.',
		'MAC B er ukjent. Switchen sender rammen ut de andre portene i samme VLAN. Dette kalles flooding av ukjent unicast.',
		'B svarer på port 3. Switchen lærer MAC B → port 3 og sender svaret bare til port 1, der A er kjent.',
		'Neste ramme fra A til B sendes bare ut port 3. Switchen slår opp mottakerens MAC-adresse i tabellen.'
	];
	$: lesson = lessons[active];
	$: selectedService = services[service];
	/** @param {number} index */
	function choose(index) {
		active = index;
		if (!visited.includes(index)) visited = [...visited, index];
	}
</script>

<svelte:head>
	<title>Fra bits til bytes – DRIFT / Modul 1</title>
	<meta
		name="description"
		content="Utforsk LAN, WAN, IP, MAC, nettverksutstyr og tjenesteporter med interaktive forklaringer knyttet til Siten."
	/>
</svelte:head>

<div class="course" class:quiet>
	<!-- Egentegnede SVG-symboler i klassisk nettverksdiagramstil. -->
	<svg class="symbol-definitions" aria-hidden="true" focusable="false" width="0" height="0">
		<defs>
			<symbol id="drift-cloud" viewBox="0 0 160 100">
				<path
					d="M35 83C8 84 2 49 23 38C19 16 47 7 64 17C78-4 116 2 122 23C151 17 165 48 145 62C152 85 120 99 103 87C80 104 48 96 44 84Z"
					fill="#59b4d5"
					stroke="#204d65"
					stroke-width="3"
					stroke-linejoin="round"
				/>
			</symbol>
			<symbol id="drift-router" viewBox="0 0 150 100">
				<path
					d="M8 31V69C8 99 142 99 142 69V31Z"
					fill="#50acd0"
					stroke="#204d65"
					stroke-width="3"
				/>
				<ellipse cx="75" cy="31" rx="67" ry="25" fill="#6ac3df" stroke="#204d65" stroke-width="3" />
				<g fill="#173c50">
					<path d="M20 20L50 24L48 18L66 28L45 32L49 27L20 24Z" />
					<path d="M82 22L102 8L101 15L122 12L120 16L99 20L100 26Z" />
					<path d="M85 35L106 29L102 35L130 40L129 44L101 39L102 46Z" />
					<path d="M70 35L53 50L54 43L32 46L34 42L55 38L54 33Z" />
				</g>
			</symbol>
			<symbol id="drift-switch" viewBox="0 0 160 100">
				<path
					d="M12 44L49 12H150L113 44Z"
					fill="#72c6df"
					stroke="#204d65"
					stroke-width="3"
					stroke-linejoin="round"
				/>
				<path d="M12 44H113V82H12Z" fill="#52afd1" stroke="#204d65" stroke-width="3" />
				<path
					d="M113 44L150 12V50L113 82Z"
					fill="#3a91b6"
					stroke="#204d65"
					stroke-width="3"
					stroke-linejoin="round"
				/>
				<g
					fill="none"
					stroke="#173c50"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M64 24H121M115 20L121 24L114 28M97 34H42M49 30L42 34L49 38" />
				</g>
				<g fill="#173c50"
					><rect x="24" y="57" width="10" height="7" rx="1" /><rect
						x="40"
						y="57"
						width="10"
						height="7"
						rx="1"
					/><rect x="56" y="57" width="10" height="7" rx="1" /><rect
						x="72"
						y="57"
						width="10"
						height="7"
						rx="1"
					/></g
				>
			</symbol>
			<symbol id="drift-pc" viewBox="0 0 130 120">
				<path d="M24 12H110V78H24Z" fill="#388aab" stroke="#204d65" stroke-width="3" />
				<rect
					x="16"
					y="18"
					width="86"
					height="65"
					rx="4"
					fill="#6ac1dd"
					stroke="#204d65"
					stroke-width="3"
				/>
				<rect
					x="23"
					y="25"
					width="72"
					height="48"
					rx="3"
					fill="#c7edf5"
					stroke="#204d65"
					stroke-width="2"
				/>
				<path
					d="M50 83V93H76V83M27 93H92L109 109H9Z"
					fill="#59b4d5"
					stroke="#204d65"
					stroke-width="3"
					stroke-linejoin="round"
				/>
				<path d="M28 99H88M22 104H96" stroke="#204d65" stroke-width="2" />
			</symbol>
		</defs>
	</svg>
	<a class="skip" href="#lesson">Hopp til leksjonen</a>
	<header class="topbar">
		<a class="brand" href="/?fag=drift" aria-label="Tilbake til Driftsstøtte i IT-laben"
			><span class="brand-symbol" aria-hidden="true">↗</span> DRIFT<span class="brand-light">
				/ LAB</span
			></a
		>
		<span class="top-label">VG2 IT · DRIFTSSTØTTE</span>
		<div class="shared-tools"><ThemeToggle /><AccountLink /></div>
		<label class="motion"><input type="checkbox" bind:checked={quiet} /> Rolige bevegelser</label>
	</header>

	<main id="overview">
		<section class="hero" aria-labelledby="module-title">
			<div>
				<p class="eyebrow">MODUL 01 <span>GRUNNLEGGENDE NETTVERK</span></p>
				<h1 id="module-title">Fra bits <br />til <span>bytes</span></h1>
				<p class="intro">
					Hva skjer egentlig når maskinene på Siten snakker sammen? Utforsk nettverket, ett begrep
					om gangen.
				</p>
				<div class="hero-pills">
					<span>7 korte leksjoner</span><span>Prøv → observer → forklar</span>
				</div>
			</div>
			<div class="hero-art" aria-hidden="true">
				<svg viewBox="0 0 430 280" focusable="false">
					<g fill="none" stroke="#5b7f8b" stroke-width="2"
						><path d="M215 62V106M215 154V187M195 221L133 253M235 221L297 253" /></g
					>
					<use href="#drift-cloud" x="175" y="10" width="80" height="50" />
					<use href="#drift-router" x="174" y="104" width="82" height="55" />
					<use href="#drift-switch" x="174" y="184" width="82" height="52" />
					<use href="#drift-pc" x="106" y="233" width="48" height="44" />
					<use href="#drift-pc" x="277" y="233" width="48" height="44" />
					<text x="270" y="44">Klassenett / WAN</text><text x="270" y="135">Ruter</text><text
						x="270"
						y="211">Switch / LAN</text
					>
				</svg>
			</div>
		</section>

		<div class="workspace">
			<aside class="sidebar" aria-label="Leksjoner i modul 1">
				<div class="sidebar-heading">
					<h2>Læringsløypa</h2>
					<span>{visited.length}/{lessons.length} åpnet</span>
				</div>
				<div class="progress" aria-hidden="true">
					<span style:width={`${(visited.length / lessons.length) * 100}%`}></span>
				</div>
				<nav aria-label="Velg leksjon">
					{#each lessons as item, index}
						<button
							type="button"
							class:current={active === index}
							aria-current={active === index ? 'step' : undefined}
							on:click={() => choose(index)}
						>
							<span class="lesson-number">{String(index + 1).padStart(2, '0')}</span><span
								><strong>{item.title}</strong><small>{item.label}</small></span
							><span class="nav-arrow" aria-hidden="true">↗</span>
						</button>
					{/each}
				</nav>
				<div class="site-note">
					<span class="tiny-label">KOBLING TIL SMB</span>
					<p>Bruk din egen Site som fasit: Finn utstyret, følg kablene og sjekk adressene.</p>
				</div>
				<p class="session-note">
					Åpnede leksjoner telles bare mens siden er åpen. Tallet viser hva du har åpnet, ikke
					vurdert forståelse.
				</p>
			</aside>

			<section id="lesson" class="lesson" aria-labelledby="lesson-title" tabindex="-1">
				<div class="lesson-top">
					<span class="eyebrow">LEKSJON {String(active + 1).padStart(2, '0')} / 07</span><span
						class="tag">{lesson.tag}</span
					>
				</div>
				<div aria-live="polite" aria-atomic="true">
					<h2 id="lesson-title">{lesson.title}</h2>
					<p class="goal">{lesson.goal}</p>
				</div>

				{#if active === 0}
					<p>
						Et <strong>LAN</strong> er et lokalt nettverk. <strong>WAN</strong> er tilkoblingen videre
						til et større nett. På deres Site har ruteren én tilkobling mot LAN-et og én mot klassenettet.
					</p>
					<div class="lab-panel">
						<div class="panel-heading">
							<span class="tiny-label">FØLG VEIEN UT AV SITEN</span><span
								>Steg {pathStep + 1} av 4</span
							>
						</div>
						<svg
							class="network-diagram"
							viewBox="0 0 720 710"
							role="img"
							aria-labelledby="network-title network-description"
							focusable="false"
						>
							<title id="network-title"
								>Siten: to PC-er, en switch og en ruter med forbindelse til klassenettet</title
							>
							<desc id="network-description"
								>Øverst ligger klassenettet på WAN-siden. Ruteren kobler dette til Sitens LAN, med
								en switch og to PC-er. Aktivt steg beskrives også i teksten under figuren.</desc
							>
							<rect class="lan-background" x="30" y="287" width="660" height="410" rx="22" />
							<text class="zone-heading" x="58" y="320">SITENS LAN</text>
							<text class="diagram-note" x="58" y="342">192.168.10.0/24</text>
							<text class="zone-heading" x="500" y="62">WAN-SIDEN</text>
							<text class="diagram-note" x="500" y="84">Klassenettet</text>
							<text class="diagram-note" x="500" y="105">Videre til internett</text>
							<g class="diagram-links">
								<path d="M360 136V201" class:sending={pathStep === 3} />
								<path d="M360 274V374" class:sending={pathStep === 2} />
								<path d="M328 447L205 516" class:sending={pathStep === 1} />
								<path d="M392 447L515 516" />
							</g>
							<g class:current-node={pathStep === 3}
								><rect class="node-halo" x="267" y="26" width="186" height="116" rx="22" /><use
									href="#drift-cloud"
									x="280"
									y="34"
									width="160"
									height="100"
								/></g
							>
							<g class:current-node={pathStep === 2}
								><rect class="node-halo" x="274" y="192" width="172" height="97" rx="20" /><use
									href="#drift-router"
									x="292"
									y="200"
									width="136"
									height="91"
								/></g
							>
							<text class="device-label" x="465" y="245">Ruter</text>
							<g class="interface-tag"
								><rect x="371" y="153" width="62" height="28" rx="8" /><text x="402" y="172"
									>WAN</text
								></g
							>
							<g class="interface-tag"
								><rect x="371" y="297" width="62" height="28" rx="8" /><text x="402" y="316"
									>LAN</text
								></g
							>
							<text class="diagram-note" x="465" y="269">Gateway: 192.168.10.1</text>
							<g class:current-node={pathStep === 1}
								><rect class="node-halo" x="273" y="363" width="174" height="104" rx="20" /><use
									href="#drift-switch"
									x="285"
									y="372"
									width="150"
									height="94"
								/></g
							>
							<text class="device-label" x="468" y="412">Switch</text>
							<text class="diagram-note" x="468" y="435">Enheter i samme LAN</text>
							<g class:current-node={pathStep === 0}
								><rect class="node-halo" x="140" y="506" width="120" height="112" rx="18" /><use
									href="#drift-pc"
									x="150"
									y="512"
									width="100"
									height="92"
								/></g
							>
							<use href="#drift-pc" x="470" y="512" width="100" height="92" />
							<text class="device-label pc-caption" x="200" y="645">PC A · avsender</text><text
								class="device-label pc-caption"
								x="520"
								y="645">PC B</text
							>
							<text class="diagram-note pc-caption" x="200" y="675">192.168.10.20</text><text
								class="diagram-note pc-caption"
								x="520"
								y="675">192.168.10.50</text
							>
						</svg>
						<p class="explanation" aria-live="polite" aria-atomic="true">{routeNotes[pathStep]}</p>
						<div class="controls">
							<button
								type="button"
								class="secondary"
								disabled={pathStep === 0}
								on:click={() => (pathStep -= 1)}>← Forrige steg</button
							><button
								type="button"
								class="primary"
								on:click={() => (pathStep = (pathStep + 1) % 4)}
								>{pathStep === 3 ? 'Start på nytt ↺' : 'Neste steg →'}</button
							>
						</div>
					</div>
					<div class="insight">
						<strong>LAN og WAN avhenger av ståstedet.</strong>
						<p>
							Klassenettet er WAN for Siten deres, men kan samtidig være et lokalt nett sett fra
							skolens side. WAN betyr ikke automatisk internett.
						</p>
					</div>
					<details>
						<summary>Undersøk på Siten</summary>
						<p>
							Følg kabelen fra mngt-PC til switch og videre til ruteren. Finn ruterens LAN- og
							WAN-interface, og merk dem i nettverkstegningen.
						</p>
					</details>
				{:else if active === 1}
					<p>
						Utstyret har forskjellige oppgaver. Velg en komponent og knytt forklaringen til det dere
						har montert i racket.
					</p>
					<div class="choice-row" aria-label="Velg komponent">
						{#each equipment as part, index}<button
								type="button"
								class:selected={hardware === index}
								aria-pressed={hardware === index}
								on:click={() => (hardware = index)}>{part.name}</button
							>{/each}
					</div>
					<div class="lab-panel equipment" aria-live="polite" aria-atomic="true">
						<div class="equipment-icon" aria-hidden="true">{equipment[hardware].mark}</div>
						<div>
							<h3>{equipment[hardware].name}</h3>
							<p>{equipment[hardware].text}</p>
							<p class="muted">{equipment[hardware].cable}</p>
						</div>
					</div>
					<div class="insight">
						<strong>Én boks kan ha flere roller.</strong>
						<p>
							En hjemmeruter kan inneholde ruter, switch og aksesspunkt i samme kabinett. På Sitene
							kan rollene være fordelt på separate enheter.
						</p>
					</div>
					<details>
						<summary>Undersøk på Siten</summary>
						<p>
							Lag en utstyrsliste med rolle, modell og tilkoblinger. Finn ut hvilke porter som
							støtter TP, fiber og eventuelt PoE.
						</p>
					</details>
				{:else if active === 2}
					<p>
						IP-adressen brukes til å adressere et nettverksinterface. Masken avgjør hvilke
						adressebiter som angir subnettet. Her holder vi oss til <strong
							>/24 = 255.255.255.0</strong
						>.
					</p>
					<div class="lab-panel">
						<div class="panel-heading">
							<span class="tiny-label">LOKALT ELLER VIA GATEWAY?</span><span>IPv4 · /24</span>
						</div>
						<div class="address"><span>192.168.10</span><b>.20</b></div>
						<div class="address-legend">
							<span>Subnettdel: første 24 bit</span><span>Vertsdel: siste 8 bit</span>
						</div>
						<p>Din PC: <code>192.168.10.20/24</code> · Gateway: <code>192.168.10.1</code></p>
						<fieldset>
							<legend>Velg mottaker</legend><label
								><input type="radio" name="destination" value="local" bind:group={destination} /> 192.168.10.50</label
							><label
								><input type="radio" name="destination" value="remote" bind:group={destination} /> 192.168.20.50</label
							>
						</fieldset>
						<div class="result" aria-live="polite" aria-atomic="true">
							<strong
								>{destination === 'local'
									? 'Samme subnett → direkte til mottakeren'
									: 'Et annet subnett → via standard gateway'}</strong
							>
							<p>
								{destination === 'local'
									? 'De første 24 bitene er like. PC-en finner mottakerens MAC-adresse med ARP og sender lokalt via switchen.'
									: 'Subnettdelen er forskjellig. PC-en finner gatewayens MAC-adresse med ARP og sender rammen til ruteren. IP-mottakeren er fortsatt 192.168.20.50.'}
							</p>
						</div>
					</div>
					<div class="insight">
						<strong>Dette er ikke en regel om «de tre første tallene» for alle masker.</strong>
						<p>
							Den snarveien gjelder her fordi masken er /24. Andre masker og oppdeling i mindre
							subnett kommer i fordypningen.
						</p>
					</div>
					<details>
						<summary>Undersøk på Siten</summary>
						<p>
							Finn IP-adresse, nettverksmaske og gateway på mngt-PC. Velg ett lokalt og ett eksternt
							mål. Forklar hvilken vei trafikken må ta.
						</p>
					</details>
				{:else if active === 3}
					<p>
						Data sendes i avgrensede enheter. En IP-pakke har blant annet <strong
							>avsenderadresse, mottakeradresse og nyttelast</strong
						>. En større overføring kan kreve mange pakker.
					</p>
					<div class="lab-panel">
						<label class="input-label" for="payload">Skriv en kort nyttelast</label><input
							id="payload"
							class="payload-input"
							type="text"
							maxlength="70"
							bind:value={payload}
						/>
						<div class="packet-track">
							<span class:active-end={packetStep === 0}>PC A</span><span
								class:active-end={packetStep === 1}>Switch</span
							><span class:active-end={packetStep === 2}>PC B</span>
						</div>
						<div
							class="packet"
							class:packet-middle={packetStep === 1}
							class:packet-end={packetStep === 2}
						>
							<div class="packet-header">
								<span>FRA<strong>192.168.10.20</strong></span><span
									>TIL<strong>192.168.10.50</strong></span
								>
							</div>
							<div class="packet-payload">
								<span class="tiny-label">NYTTELAST</span>
								<p>{payload || '(tom nyttelast)'}</p>
							</div>
						</div>
						<p class="explanation" aria-live="polite" aria-atomic="true">
							{packetNotes[packetStep]}
						</p>
						<div class="controls">
							<button
								type="button"
								class="secondary"
								disabled={packetStep === 0}
								on:click={() => (packetStep -= 1)}>← Forrige steg</button
							><button
								type="button"
								class="primary"
								on:click={() => (packetStep = (packetStep + 1) % 3)}
								>{packetStep === 2 ? 'Send på nytt ↺' : 'Neste steg →'}</button
							>
						</div>
					</div>
					<div class="insight">
						<strong>Pakke inni en ramme.</strong>
						<p>
							På Ethernet fraktes IP-pakken inne i en Ethernet-ramme med MAC-adresser. Figuren viser
							bare utvalgte deler av IP-pakken. Brevanalogien hjelper med adresser og innhold, men
							beskriver ikke alle protokolldetaljene.
						</p>
					</div>
					<details>
						<summary>Forklar med egne ord</summary>
						<p>
							Hva er nyttelasten når du henter en nettside? Hvorfor trenger vi både informasjon om
							mottakeren og selve innholdet?
						</p>
					</details>
				{:else if active === 4}
					<p>
						En lag-2-switch lærer av <strong>avsenderens MAC-adresse</strong> og velger utgående
						port ved å slå opp <strong>mottakerens MAC-adresse</strong>. Tabellen kalles en
						MAC-adressetabell, ofte også CAM-tabell.
					</p>
					<div class="lab-panel">
						<div class="panel-heading">
							<span class="tiny-label">EN TOM SWITCH LÆRER</span><span
								>Steg {switchStep + 1} av 5</span
							>
						</div>
						<div class="switch-demo">
							<div class="endpoint">
								<strong>PC A</strong><code>02:00:00:00:00:0A</code><span>Port 1</span>
							</div>
							<div class="switch-box">
								<strong>SWITCH</strong>
								<div class="physical-ports" aria-label="Fire fysiske porter">
									{#each [1, 2, 3, 4] as port}<span
											class:port-lit={(switchStep === 1 && port === 1) ||
												(switchStep === 2 && port !== 1) ||
												(switchStep >= 3 && (port === 1 || port === 3))}>{port}</span
										>{/each}
								</div>
							</div>
							<div class="endpoint">
								<strong>PC B</strong><code>02:00:00:00:00:0B</code><span>Port 3</span>
							</div>
						</div>
						<table>
							<caption>Switchens lærte MAC-adresser</caption><thead
								><tr><th scope="col">MAC-adresse</th><th scope="col">Port</th></tr></thead
							><tbody
								>{#if switchStep === 0}<tr><td colspan="2">Ingen adresser lært ennå</td></tr
									>{:else}<tr><td><code>02:00:00:00:00:0A</code></td><td>1</td></tr
									>{#if switchStep >= 3}<tr><td><code>02:00:00:00:00:0B</code></td><td>3</td></tr
										>{/if}{/if}</tbody
							>
						</table>
						<p class="explanation" aria-live="polite" aria-atomic="true">
							{switchNotes[switchStep]}
						</p>
						<div class="controls">
							<button
								type="button"
								class="secondary"
								disabled={switchStep === 0}
								on:click={() => (switchStep -= 1)}>← Forrige steg</button
							><button
								type="button"
								class="primary"
								on:click={() => (switchStep = (switchStep + 1) % 5)}
								>{switchStep === 4 ? 'Tøm og start på nytt ↺' : 'Neste steg →'}</button
							>
						</div>
					</div>
					<div class="insight">
						<strong>Administrasjons-IP er en annen oppgave.</strong>
						<p>
							Switchens IP-adresse gjør at du kan konfigurere den. Den vanlige videresendingen av
							Ethernet-rammer på lag 2 baseres på MAC-adresser, ikke denne IP-adressen. Lærte
							oppføringer kan også utløpe.
						</p>
					</div>
					<details>
						<summary>Undersøk på Siten</summary>
						<p>
							Finn MAC-tabellen i switchen. Sammenlign en klient sin MAC-adresse med porten klienten
							er koblet til. Navn som «MAC address table» og «FDB» kan brukes av utstyret.
						</p>
					</details>
				{:else if active === 5}
					<p>
						<strong>Interface</strong> betyr nettverksgrensesnitt og brukes også om switchporter og
						virtuelle grensesnitt. Det viktige skillet her er mellom et
						<strong>rutet lag-3-interface</strong>
						og en <strong>lag-2-switchport</strong>.
					</p>
					<div class="choice-row" aria-label="Velg rolle">
						<button
							type="button"
							class:selected={device === 'router'}
							aria-pressed={device === 'router'}
							on:click={() => (device = 'router')}>Rutet interface</button
						><button
							type="button"
							class:selected={device === 'switch'}
							aria-pressed={device === 'switch'}
							on:click={() => (device = 'switch')}>Switchport på lag 2</button
						>
					</div>
					<div class="lab-panel interface-demo" aria-live="polite" aria-atomic="true">
						{#if device === 'router'}<span class="tiny-label">RUTER · LAG 3</span>
							<h3>Ett interface mot hvert IP-nett</h3>
							<div class="interface-pair">
								<div><strong>LAN-interface</strong><code>192.168.10.1/24</code></div>
								<span aria-hidden="true">↔</span>
								<div><strong>WAN-interface</strong><span>Adresse i klassenettet</span></div>
							</div>
							<p>
								Ruteren har adresser på grensesnittene og bruker rutingtabellen for å sende
								IP-pakker mellom nett. Et interface kan også være virtuelt, som et
								VLAN-underinterface på en trunk.
							</p>{:else}<span class="tiny-label">SWITCH · LAG 2</span>
							<h3>Flere porter i samme nett</h3>
							<div class="physical-ports large">
								{#each [1, 2, 3, 4] as port}<span>{port}</span>{/each}
							</div>
							<p>
								Vanlige switchporter trenger ikke hver sin IP-adresse. De kobler enheter til samme
								VLAN og videresender Ethernet-rammer ved hjelp av MAC-tabellen.
							</p>{/if}
					</div>
					<div class="insight">
						<strong>Kontakten avgjør ikke rollen.</strong>
						<p>
							Begge kan ha like Ethernet-kontakter. Noen rutere har innebygde switchporter, og
							lag-3-switcher kan også rute. Se på konfigurasjonen og funksjonen, ikke bare boksen.
						</p>
					</div>
					<details>
						<summary>Undersøk på Siten</summary>
						<p>
							Finn hvilke rutergrensesnitt som har IP-adresser. Sammenlign med switchens porter og
							administrasjonsadresse. Forklar hvorfor de ikke har én IP per vanlig switchport.
						</p>
					</details>
				{:else if active === 6}
					<p>
						IP-adressen hjelper trafikken fram til riktig nettverksendepunkt. <strong
							>TCP- eller UDP-porten</strong
						> identifiserer et endepunkt for kommunikasjonen i operativsystemet. Det er et nummer, ikke
						en fysisk kontakt.
					</p>
					<div class="choice-row" aria-label="Velg tjeneste">
						{#each services as item, index}<button
								type="button"
								class:selected={service === index}
								aria-pressed={service === index}
								on:click={() => (service = index)}>{item.name}</button
							>{/each}
					</div>
					<div class="lab-panel" aria-live="polite" aria-atomic="true">
						<div class="panel-heading">
							<span class="tiny-label">{selectedService.purpose}</span><span
								>{selectedService.proto}</span
							>
						</div>
						<div class="connection">
							<div>
								<span>KLIENT</span><strong>192.168.10.20</strong><code>Kildeport 51024</code>
							</div>
							<span class="connection-arrow" aria-hidden="true">→</span>
							<div>
								<span>SERVER</span><strong>192.168.10.50</strong><code
									>Målport {selectedService.port}</code
								>
							</div>
						</div>
						<p>{selectedService.text}</p>
						<p class="muted">
							51024 er en valgt eksempelverdi for klientens midlertidige kildeport. Svaret går
							normalt tilbake til denne porten.
						</p>
					</div>
					<div class="two-columns">
						<div class="mini-card">
							<h3>TCP</h3>
							<p>
								Gir en pålitelig, ordnet strøm av byte med blant annet kvitteringer og
								retransmisjon.
							</p>
						</div>
						<div class="mini-card">
							<h3>UDP</h3>
							<p>
								Sender datagrammer uten innebygd garanti for levering eller rekkefølge.
								Applikasjonen kan selv legge til mekanismer.
							</p>
						</div>
					</div>
					<div class="insight">
						<strong>Protokollen er en del av adressen til tjenesten.</strong>
						<p>
							TCP-port 53 og UDP-port 53 er forskjellige endepunkter. Portnumre følger vanlige
							konvensjoner, men en tjeneste kan konfigureres til å bruke en annen port.
						</p>
					</div>
					<details>
						<summary>Koble til brannmurarbeidet</summary>
						<p>
							Ansatte skal få bruke internweb, men bare mngt-nettet skal få administrere Ubuntu med
							SSH. Beskriv kilde, mål, protokoll og målport for de to tilgangene.
						</p>
					</details>
				{/if}

				<footer class="lesson-footer">
					<button
						type="button"
						class="secondary"
						disabled={active === 0}
						on:click={() => choose(active - 1)}>← Forrige leksjon</button
					><span>{active + 1} av {lessons.length}</span><button
						type="button"
						class="primary"
						disabled={active === lessons.length - 1}
						on:click={() => choose(active + 1)}>Neste leksjon →</button
					>
				</footer>
			</section>
		</div>
		<footer class="page-footer">
			<span>DRIFT / LAB</span>
			<p>Grunnforståelse først. Wi-Fi-fordypning, subnetting og VLAN følger senere.</p>
		</footer>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
	}
	.course {
		--ink: var(--color-text);
		--muted: var(--color-text-muted);
		--green: var(--color-action);
		--lime: var(--color-success-soft);
		--line: var(--color-border);
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		color: var(--ink);
		background: var(--color-page);
		min-height: 100vh;
		line-height: 1.65;
		font-size: 1rem;
	}
	.course :global(*) {
		box-sizing: border-box;
	}
	.course :global(button),
	.course :global(input) {
		font: inherit;
	}
	.course :global(button) {
		cursor: pointer;
	}
	.course :global(button:disabled) {
		cursor: default;
		opacity: 0.48;
	}
	.course :global(:focus-visible) {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}
	.course :global(h1),
	.course :global(h2),
	.course :global(h3),
	.course :global(p) {
		margin-top: 0;
	}
	.course :global(code) {
		font-size: 0.91em;
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		overflow-wrap: anywhere;
	}
	.course :global(button),
	.course :global(summary),
	.course :global(label) {
		-webkit-tap-highlight-color: transparent;
	}
	.skip {
		position: absolute;
		top: -100px;
		left: 1rem;
		z-index: 10;
		background: var(--color-surface);
		color: var(--ink);
		padding: 1rem;
	}
	.skip:focus {
		top: 1rem;
	}
	.topbar {
		max-width: 1320px;
		margin: auto;
		min-height: 84px;
		padding: 18px 40px;
		display: flex;
		align-items: center;
		gap: 24px;
		border-bottom: 1px solid var(--line);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 1.1rem;
		font-weight: 850;
		letter-spacing: 0.05em;
		color: var(--ink);
		text-decoration: none;
	}
	.brand-symbol {
		background: var(--green);
		color: var(--lime);
		width: 36px;
		height: 36px;
		display: grid;
		place-items: center;
		border-radius: 10px;
		font-size: 1.6rem;
	}
	.brand-light {
		font-weight: 450;
		color: var(--muted);
	}
	.top-label {
		font-size: 0.69rem;
		letter-spacing: 0.13em;
		margin-left: auto;
		font-weight: 750;
	}
	.motion {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		font-size: 0.8rem;
		color: var(--muted);
		cursor: pointer;
	}
	input {
		accent-color: var(--green);
	}
	.motion input {
		width: 18px;
		height: 18px;
	}
	main {
		max-width: 1240px;
		margin: auto;
		padding: 0 24px;
	}
	.hero {
		display: grid;
		grid-template-columns: 1.3fr 1fr;
		gap: 36px;
		align-items: center;
		padding: 60px 10px 55px;
	}
	.eyebrow,
	.tiny-label {
		font-size: 0.7rem;
		letter-spacing: 0.12em;
		font-weight: 800;
	}
	.eyebrow {
		color: var(--green);
	}
	.eyebrow span {
		margin-left: 12px;
		color: var(--muted);
		font-weight: 650;
	}
	h1 {
		font-size: clamp(2.6rem, 4.7vw, 4.1rem);
		letter-spacing: -0.055em;
		line-height: 1.08;
		margin-bottom: 24px;
	}
	h1 span {
		color: var(--green);
	}
	.intro {
		font-size: 1.05rem;
		max-width: 520px;
		color: var(--muted);
	}
	.hero-pills {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.hero-pills span {
		padding: 5px 11px;
		border: 1px solid var(--line);
		border-radius: 30px;
		font-size: 0.75rem;
		color: var(--muted);
	}
	.symbol-definitions {
		position: absolute;
		overflow: hidden;
		pointer-events: none;
	}
	.hero-art {
		height: 280px;
		border: 1px solid var(--color-border);
		border-radius: 24px;
		background: var(--color-surface-soft);
		background-image: radial-gradient(var(--color-border) 1px, transparent 1px);
		background-size: 18px 18px;
	}
	.hero-art svg {
		display: block;
		width: 100%;
		height: 100%;
	}
	.hero-art text {
		fill: var(--color-text-muted);
		font-size: 12px;
		font-weight: 650;
	}
	.workspace {
		display: grid;
		grid-template-columns: 280px minmax(0, 1fr);
		gap: 26px;
		align-items: start;
	}
	.sidebar {
		min-width: 0;
		padding-top: 9px;
	}
	.sidebar-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding: 0 8px;
	}
	.sidebar-heading h2 {
		font-size: 0.9rem;
		margin: 0;
	}
	.sidebar-heading > span {
		font-size: 0.72rem;
		color: var(--muted);
	}
	.progress {
		height: 4px;
		border-radius: 4px;
		background: var(--color-border);
		margin: 16px 8px 20px;
		overflow: hidden;
	}
	.progress span {
		height: 100%;
		display: block;
		background: var(--green);
		transition: width 0.2s;
	}
	nav {
		display: grid;
		gap: 6px;
	}
	nav button {
		width: 100%;
		border: 1px solid transparent;
		border-radius: 12px;
		padding: 14px 12px;
		display: flex;
		align-items: center;
		text-align: left;
		gap: 12px;
		background: transparent;
		color: var(--ink);
	}
	nav button:hover {
		background: var(--color-surface-hover);
	}
	nav button.current {
		background: var(--green);
		color: var(--color-on-action);
		border-color: var(--green);
	}
	.lesson-number {
		font-size: 0.75rem;
		opacity: 0.8;
		font-variant-numeric: tabular-nums;
	}
	nav strong {
		display: block;
		font-size: 0.84rem;
		font-weight: 700;
	}
	nav small {
		font-size: 0.69rem;
		display: block;
		color: var(--muted);
	}
	nav .current small {
		color: var(--color-on-action);
	}
	.nav-arrow {
		margin-left: auto;
	}
	.site-note {
		margin: 25px 8px 0;
		border-top: 1px solid var(--line);
		padding-top: 20px;
	}
	.site-note .tiny-label {
		color: var(--green);
	}
	.site-note p {
		font-size: 0.83rem;
		color: var(--muted);
		margin-top: 9px;
	}
	.session-note {
		font-size: 0.7rem;
		padding: 0 8px;
		color: var(--muted);
	}
	.lesson {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		padding: 32px;
		border-radius: 20px;
		box-shadow: 0 8px 35px #203e2e05;
		min-width: 0;
		scroll-margin: 20px;
	}
	.lesson-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 14px;
	}
	.tag {
		background: var(--color-success-soft);
		color: var(--color-success);
		font-size: 0.7rem;
		border-radius: 30px;
		padding: 4px 10px;
	}
	.lesson h2 {
		font-size: clamp(1.7rem, 3vw, 2.3rem);
		letter-spacing: -0.035em;
		line-height: 1.2;
		margin-bottom: 10px;
	}
	.goal {
		color: var(--muted);
		font-size: 0.94rem;
		margin-bottom: 25px;
	}
	.lesson > p {
		font-size: 0.94rem;
	}
	.lab-panel {
		border: 1px solid var(--color-border);
		background: var(--color-surface-soft);
		border-radius: 15px;
		padding: 22px;
		margin: 25px 0;
		min-width: 0;
	}
	.panel-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 20px;
		color: var(--color-text-muted);
	}
	.panel-heading > span:last-child {
		font-size: 0.73rem;
	}
	.network-diagram {
		display: block;
		width: 100%;
		height: auto;
		margin: 0 auto 18px;
		max-width: 720px;
	}
	.lan-background {
		fill: var(--color-surface-soft);
		stroke: var(--color-border-strong);
		stroke-width: 1.5;
		stroke-dasharray: 7 6;
	}
	.zone-heading {
		fill: var(--color-accent);
		font-size: 16px;
		font-weight: 800;
		letter-spacing: 1.2px;
	}
	.diagram-note {
		fill: var(--color-text-muted);
		font-size: 15px;
	}
	.device-label {
		fill: var(--color-text);
		font-size: 18px;
		font-weight: 750;
	}
	.pc-caption {
		text-anchor: middle;
	}
	.diagram-links path {
		fill: none;
		stroke: var(--color-border-strong);
		stroke-width: 3;
		stroke-linecap: round;
	}
	.diagram-links path.sending {
		stroke: var(--color-info);
		stroke-width: 5;
		stroke-dasharray: 10 8;
		animation: travel 0.8s linear 3;
	}
	.node-halo {
		fill: var(--color-success-soft);
		stroke: var(--color-success);
		stroke-width: 2;
		opacity: 0;
		transition: opacity 0.25s;
	}
	.current-node .node-halo {
		opacity: 1;
	}
	.interface-tag rect {
		fill: var(--color-surface);
		stroke: var(--color-border-strong);
		stroke-width: 1.5;
	}
	.interface-tag text {
		fill: var(--color-text);
		font-size: 14px;
		font-weight: 800;
		text-anchor: middle;
	}
	@keyframes travel {
		to {
			stroke-dashoffset: -54;
		}
	}
	.explanation {
		background: var(--color-surface);
		border-left: 3px solid var(--green);
		padding: 13px 15px;
		font-size: 0.88rem;
		min-height: 95px;
		margin: 8px 0 18px;
	}
	.controls {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}
	.primary,
	.secondary {
		border: 1px solid var(--green);
		border-radius: 9px;
		min-height: 44px;
		padding: 9px 15px;
		font-size: 0.8rem !important;
		font-weight: 650 !important;
	}
	.primary {
		background: var(--green);
		color: var(--color-on-action);
	}
	.secondary {
		background: var(--color-surface);
		color: var(--green);
	}
	.primary:hover:not(:disabled) {
		background: var(--color-action-hover);
	}
	.secondary:hover:not(:disabled) {
		background: var(--color-surface-hover);
	}
	.insight {
		border-left: 3px solid var(--color-success-border);
		padding: 2px 0 2px 17px;
		margin: 26px 0;
	}
	.insight strong {
		font-size: 0.91rem;
	}
	.insight p {
		font-size: 0.86rem;
		color: var(--muted);
		margin: 7px 0 0;
	}
	details {
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 0 15px;
	}
	summary {
		cursor: pointer;
		padding: 13px 0;
		min-height: 48px;
		font-size: 0.86rem;
		font-weight: 700;
	}
	details p {
		font-size: 0.86rem;
		padding-bottom: 5px;
	}
	.choice-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 22px 0;
	}
	.choice-row button {
		min-height: 44px;
		padding: 8px 13px;
		border: 1px solid var(--color-border-strong);
		border-radius: 9px;
		color: var(--ink);
		background: var(--color-surface);
		font-size: 0.8rem;
	}
	.choice-row button.selected {
		background: var(--green);
		color: var(--color-on-action);
		border-color: var(--green);
		box-shadow: inset 0 -3px 0 var(--color-success-soft);
	}
	.equipment {
		display: flex;
		gap: 22px;
		align-items: start;
	}
	.equipment h3 {
		margin-bottom: 8px;
	}
	.equipment p {
		font-size: 0.9rem;
	}
	.equipment-icon {
		background: var(--color-success-soft);
		border: 1px solid var(--color-success-border);
		border-radius: 14px;
		min-width: 70px;
		height: 70px;
		display: grid;
		place-items: center;
		font-weight: 850;
		font-size: 1.4rem;
	}
	.muted {
		color: var(--muted);
		font-size: 0.83rem;
	}
	.address {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		font-size: clamp(1.5rem, 3.6vw, 2.7rem);
		font-family: ui-monospace, monospace;
		line-height: 1.4;
		margin: 20px 0 6px;
	}
	.address > span {
		background: var(--color-success-soft);
		padding: 8px 12px;
		border-radius: 9px 0 0 9px;
	}
	.address b {
		background: var(--color-info-soft);
		color: var(--color-info);
		padding: 8px 12px;
		border-radius: 0 9px 9px 0;
		font-weight: 600;
	}
	.address-legend {
		display: flex;
		justify-content: space-around;
		gap: 10px;
		font-size: 0.7rem;
		color: var(--muted);
		margin-bottom: 22px;
	}
	fieldset {
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 10px 14px;
	}
	legend {
		font-size: 0.8rem;
		font-weight: 700;
		padding: 0 6px;
	}
	fieldset label {
		display: flex;
		gap: 10px;
		align-items: center;
		min-height: 44px;
		font-family: ui-monospace, monospace;
		font-size: 0.9rem;
		cursor: pointer;
	}
	fieldset input {
		width: 18px;
		height: 18px;
	}
	.result {
		margin-top: 20px;
		background: var(--color-success-soft);
		border-radius: 10px;
		padding: 16px;
		font-size: 0.88rem;
	}
	.result p {
		margin: 8px 0 0;
	}
	.input-label {
		font-size: 0.83rem;
		font-weight: 700;
		display: block;
		margin-bottom: 8px;
	}
	.payload-input {
		width: 100%;
		min-height: 44px;
		background: var(--color-surface);
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
		padding: 10px 12px;
		color: var(--ink);
	}
	.packet-track {
		display: flex;
		justify-content: space-between;
		border-bottom: 2px solid var(--color-border);
		margin: 24px 0 20px;
		padding: 0 4px 10px;
		font-size: 0.8rem;
	}
	.packet-track span {
		padding: 3px 9px;
		border: 2px solid transparent;
		border-radius: 8px;
	}
	.packet-track .active-end {
		background: var(--lime);
		border-color: var(--green);
		font-weight: 750;
	}
	.packet {
		width: 82%;
		border: 1px solid var(--color-border-strong);
		border-radius: 10px;
		overflow: hidden;
		margin: 10px 0 24px;
		transition: margin-left 0.45s ease;
		box-shadow: 0 6px 12px #16352508;
	}
	.packet-middle {
		margin-left: 9%;
	}
	.packet-end {
		margin-left: 18%;
	}
	.packet-header {
		background: var(--green);
		color: var(--color-on-action);
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		padding: 12px;
	}
	.packet-header span {
		font-size: 0.6rem;
		letter-spacing: 0.06em;
	}
	.packet-header strong {
		display: block;
		font-size: 0.77rem;
		letter-spacing: 0;
		overflow-wrap: anywhere;
	}
	.packet-payload {
		background: var(--color-surface);
		padding: 14px;
	}
	.packet-payload p {
		margin: 7px 0 0;
		overflow-wrap: anywhere;
		font-size: 0.91rem;
	}
	.switch-demo {
		display: flex;
		gap: 15px;
		justify-content: space-between;
		align-items: center;
		margin: 25px 0;
	}
	.endpoint {
		display: flex;
		flex-direction: column;
		text-align: center;
		font-size: 0.8rem;
		min-width: 0;
	}
	.endpoint code {
		font-size: 0.61rem;
	}
	.endpoint > span {
		color: var(--muted);
		font-size: 0.7rem;
	}
	.switch-box {
		background: var(--color-code-bg);
		color: var(--color-on-action);
		text-align: center;
		padding: 14px;
		border-radius: 12px;
		flex-shrink: 0;
	}
	.switch-box > strong {
		font-size: 0.65rem;
		letter-spacing: 0.1em;
	}
	.physical-ports {
		display: flex;
		justify-content: center;
		gap: 5px;
		margin-top: 10px;
	}
	.physical-ports span {
		border: 1px solid var(--color-border-strong);
		color: inherit;
		width: 25px;
		height: 25px;
		display: grid;
		place-items: center;
		font-size: 0.7rem;
		border-radius: 3px;
	}
	.physical-ports .port-lit {
		background: var(--lime);
		color: var(--color-text);
		border: 2px solid var(--color-focus);
	}
	.physical-ports.large {
		margin: 20px 0;
	}
	.physical-ports.large span {
		width: 44px;
		height: 40px;
		background: var(--color-surface-active);
		color: var(--ink);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8rem;
		background: var(--color-surface);
	}
	caption {
		text-align: left;
		font-weight: 750;
		margin-bottom: 8px;
	}
	th,
	td {
		padding: 10px 12px;
		text-align: left;
		border-bottom: 1px solid var(--line);
	}
	th {
		background: var(--color-surface-soft);
	}
	table + .explanation {
		margin-top: 20px;
	}
	.interface-demo h3 {
		margin: 10px 0 20px;
		font-size: 1.3rem;
	}
	.interface-demo p {
		font-size: 0.9rem;
	}
	.interface-pair {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 24px;
	}
	.interface-pair > div {
		flex: 1;
		border: 1px solid var(--color-border-strong);
		background: var(--color-surface);
		border-radius: 10px;
		padding: 14px;
		display: flex;
		flex-direction: column;
		font-size: 0.8rem;
	}
	.interface-pair > div:last-child {
		background: var(--color-info-soft);
	}
	.connection {
		display: flex;
		align-items: center;
		gap: 14px;
		margin: 25px 0;
	}
	.connection > div {
		flex: 1;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-border-strong);
		padding: 16px;
		border-radius: 12px;
		background: var(--color-surface);
		min-width: 0;
	}
	.connection > div > span {
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		color: var(--muted);
	}
	.connection strong {
		font-size: clamp(0.75rem, 1.5vw, 1rem);
		margin: 6px 0;
		overflow-wrap: anywhere;
	}
	.connection code {
		color: var(--green);
		font-weight: 750;
		font-size: 0.77rem;
	}
	.connection-arrow {
		font-size: 1.5rem;
	}
	.two-columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
	}
	.mini-card {
		padding: 18px;
		border: 1px solid var(--line);
		border-radius: 12px;
	}
	.mini-card h3 {
		margin-bottom: 6px;
		font-size: 1rem;
	}
	.mini-card p {
		font-size: 0.85rem;
		margin: 0;
	}
	.lesson-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-top: 32px;
		padding-top: 25px;
		border-top: 1px solid var(--line);
	}
	.lesson-footer > span {
		font-size: 0.75rem;
		white-space: nowrap;
		color: var(--muted);
	}
	.page-footer {
		display: flex;
		gap: 25px;
		align-items: center;
		padding: 30px 8px 45px;
		color: var(--muted);
		font-size: 0.75rem;
	}
	.page-footer > span {
		font-weight: 800;
		white-space: nowrap;
	}
	.page-footer p {
		margin: 0;
	}

	.quiet :global(*),
	.quiet :global(*::before),
	.quiet :global(*::after) {
		animation: none !important;
		transition: none !important;
	}
	@media (prefers-reduced-motion: reduce) {
		.course :global(*),
		.course :global(*::before),
		.course :global(*::after) {
			animation: none !important;
			transition: none !important;
		}
	}
	@media (max-width: 1000px) {
		.workspace {
			grid-template-columns: 235px minmax(0, 1fr);
			gap: 18px;
		}
		.lesson {
			padding: 24px;
		}
		.hero-art {
			height: 240px;
		}
		.switch-demo {
			flex-wrap: wrap;
		}
		.endpoint {
			flex: 1;
		}
		.switch-box {
			order: 3;
			flex-basis: 100%;
		}
		.topbar {
			padding: 16px 24px;
		}
		.top-label {
			display: none;
		}
		.motion {
			margin-left: auto;
		}
	}
	@media (max-width: 740px) {
		main {
			padding: 0 16px;
		}
		.topbar {
			padding: 12px 16px;
			gap: 10px;
		}
		.brand {
			font-size: 0.9rem;
		}
		.brand-light {
			display: none;
		}
		.motion {
			font-size: 0.72rem;
		}
		.hero {
			grid-template-columns: 1fr;
			padding: 35px 4px;
			gap: 22px;
		}
		.hero-art {
			display: none;
		}
		.eyebrow span {
			display: block;
			margin: 5px 0 0;
		}
		.workspace {
			grid-template-columns: 1fr;
		}
		.sidebar {
			padding: 0;
		}
		nav {
			display: flex;
			overflow-x: auto;
			padding: 4px 4px 12px;
		}
		nav button {
			min-width: 205px;
			width: auto;
			padding: 12px;
		}
		.nav-arrow {
			display: none;
		}
		.sidebar-heading {
			padding: 0 4px;
		}
		.progress {
			margin: 12px 4px;
		}
		.site-note,
		.session-note {
			display: none;
		}
		.lesson {
			padding: 22px 16px;
			border-radius: 15px;
		}
		.lab-panel {
			padding: 16px 12px;
		}
		.equipment {
			gap: 12px;
		}
		.equipment-icon {
			min-width: 48px;
			height: 48px;
			font-size: 1rem;
		}
		.interface-pair {
			flex-direction: column;
			align-items: stretch;
			gap: 8px;
		}
		.interface-pair > span {
			text-align: center;
		}
		.connection {
			gap: 7px;
		}
		.connection > div {
			padding: 10px 8px;
		}
		.connection-arrow {
			font-size: 1.2rem;
		}
		.two-columns {
			grid-template-columns: 1fr;
		}
		.lesson-footer {
			flex-wrap: wrap;
		}
		.lesson-footer > span {
			display: none;
		}
		.lesson-footer button {
			flex: 1;
		}
		.page-footer {
			align-items: start;
			gap: 12px;
		}
		.packet-header {
			grid-template-columns: 1fr;
			gap: 8px;
		}
		.address-legend {
			font-size: 0.63rem;
		}
		.address {
			font-size: 1.5rem;
		}
		.address > span,
		.address b {
			padding: 7px;
		}
	}
	@media (max-width: 500px) {
		.network-diagram {
			width: 100%;
		}
		.diagram-note {
			font-size: 18px;
		}
		.device-label {
			font-size: 20px;
		}
	}
	.shared-tools {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}
	.topbar {
		flex-wrap: wrap;
	}
	.brand-symbol {
		color: var(--color-on-action);
	}
	@media (max-width: 740px) {
		.shared-tools {
			order: 3;
			width: 100%;
		}
	}
	@media print {
		.topbar,
		.hero-art,
		.sidebar,
		.controls,
		.choice-row,
		.lesson-footer,
		.skip,
		.page-footer {
			display: none;
		}
		.course {
			background: var(--color-surface);
		}
		.hero {
			padding: 10px 0;
			display: block;
		}
		h1 {
			font-size: 2rem;
		}
		.workspace {
			display: block;
		}
		.lesson {
			border: 0;
			box-shadow: none;
			padding: 0;
		}
		.lab-panel {
			break-inside: avoid;
		}
	}
</style>
