<script>
	// Svelte 5. Lagre som src/routes/chatrom/+page.svelte.
	// Lokal læringsdemo: ingen server, installasjoner eller ekte HTTP-kall.
	/** @typedef {{ avsender: string, tekst: string, rom: string }} Meldingsdata */
	/** @typedef {Meldingsdata & { id: number }} Melding */
	/**
	 * @typedef {{ metode: 'POST', rom: string, body: Meldingsdata }
	 * | { metode: 'GET', rom: string, body: null }} DemoRequest
	 */
	let valgtSteg = $state(0);
	let notater = $state(Array(7).fill(''));
	let ferdig = $state(Array(7).fill(false));
	let tester = $state(Array(4).fill(false));
	const steg = [
		{
			tittel: 'Gi meldingen et rom',
			sted: 'DATA',
			sporsmal:
				'Backend har én liste med meldinger. Hvordan kan den vite hvilket rom hver melding tilhører?',
			oppdrag:
				'Tegn eller skriv et meldingsobjekt med avsender, tekst og opplysningen du mener mangler.',
			hint: 'Et rom kan være en egenskap på hver melding. Bruk et stabilt navn eller en ID. To meldinger som hører sammen, må bruke samme verdi.',
			kode: '// Et annet eksempel: en oppgave tilhører et fag.\nconst oppgave = {\n  tittel: "Lag en nettside",\n  fag: "utvikling"\n};\n\n// Hvilken egenskap trenger meldingen deres?',
			forklaring:
				'Dere kan beholde ett array. Egenskapen på objektet forteller hvilken gruppe objektet tilhører.',
			sjekk: 'Vi har bestemt egenskapsnavn og hvilke to romverdier vi skal bruke.'
		},
		{
			tittel: 'Husk hvilket rom som er valgt',
			sted: 'FRONTEND',
			sporsmal:
				'Brukeren velger Gaming. Hvor skal frontend huske dette valget, slik at både sending og henting kan bruke det?',
			oppdrag:
				'Lag et romvalg med to faste alternativer. Vis den valgte verdien som tekst på siden før dere kobler den til fetch.',
			hint: 'Bruk en reaktiv variabel og bind:value. Teksten brukeren ser og verdien som sendes, kan være forskjellige. Avtal verdiene med backend.',
			kode: '// Mini-eksempel med valg av fag:\nlet valgtFag = $state("utvikling");\n\n// I HTML-delen:\n<select bind:value={valgtFag}>\n  <option value="utvikling">IT-utvikling</option>\n  <option value="drift">IT-drift</option>\n</select>\n<p>Valgt: {valgtFag}</p>',
			forklaring:
				'Når valget endres, får variabelen en ny verdi. Det sender ikke automatisk en request til backend.',
			sjekk: 'Vi kan bytte rom og se den riktige verdien i frontend.'
		},
		{
			tittel: 'Ta med rommet i requesten',
			sted: 'FRONTEND → BACKEND',
			sporsmal:
				'POST sender allerede avsender og tekst. Hva mangler backend for å plassere meldingen i riktig rom?',
			oppdrag:
				'Finn body i sendefunksjonen. Utvid objektet dere sender, og kontroller requestens payload i Network-fanen.',
			hint: 'Legg den valgte romverdien inn i det samme objektet som avsender og tekst. Feltnavnet må være det samme som backend forventer.',
			kode: '// Finn dette i deres sendefunksjon:\nbody: JSON.stringify({\n  avsender,\n  tekst\n  // TODO: Ta med hvilket rom som er valgt.\n})',
			forklaring:
				'Variabelen i frontend er ikke synlig på serveren. Verdien må sendes som en del av requesten. JSON.stringify gjør objektet om til tekst.',
			sjekk: 'POST-requestens body inneholder romverdien vi valgte.'
		},
		{
			tittel: 'Les, kontroller og lagre',
			sted: 'BACKEND',
			sporsmal:
				'Rommet finnes nå i requestens body. Hvilke steder i POST-ruten må endres for at det også skal finnes i den lagrede meldingen?',
			oppdrag:
				'Finn tre steder: der dere leser req.body, der dere kontrollerer dataene, og der meldingsobjektet bygges.',
			hint: 'express.json() gjør JSON-data tilgjengelig i req.body. Les rommet, sjekk at det er ett av de tillatte rommene, og ta det med i objektet før push().',
			kode: '// Arbeidsskisse, ikke en ferdig rute:\napp.post("/meldinger", (req, res) => {\n  // 1. Les avsender, tekst og rom fra req.body.\n  // 2. Avvis ugyldige data med 400 og return.\n  // 3. Bygg meldingsobjektet med alle tre verdiene.\n  // 4. Legg objektet i meldinger-listen.\n  // 5. Send en bekreftelse tilbake.\n});',
			forklaring:
				'Et ekstra felt i body blir ikke automatisk lagret. Det må tas med når backend lager objektet. Kontroller på serveren selv om frontend har en nedtrekksliste.',
			sjekk: 'En gyldig melding lagres med rom. Et ukjent rom avvises.'
		},
		{
			tittel: 'Be om ett bestemt rom',
			sted: 'FRONTEND → BACKEND',
			sporsmal:
				'GET /meldinger henter alt i den gamle løsningen. Hvordan kan frontend fortelle hvilket rom den vil hente?',
			oppdrag:
				'Se på adressen nedenfor. Finn ut hvor romverdien kommer fra i frontend, og hvor backend leser den.',
			hint: 'Et query-parameter kommer etter ? i URL-en. Express gjør parameteret rom tilgjengelig som req.query.rom. Dette er forskjellig fra req.body i POST.',
			kode: '// Et eksempel på en adresse:\nGET /meldinger?rom=generelt\n\n// Inne i GET-ruten på backend:\nconst rom = req.query.rom;\n\n// TODO: Bygg URL-en med det valgte rommet i frontend.',
			forklaring:
				'Query-parametere er tekst i URL-en. Dere trenger ingen body i denne GET-requesten. Avtal også hva backend skal gjøre hvis rom mangler eller er ukjent.',
			sjekk: 'GET bruker valgt rom i URL-en, og backend leser den riktige verdien.'
		},
		{
			tittel: 'Velg ut de riktige meldingene',
			sted: 'BACKEND',
			sporsmal:
				'Listen har meldinger fra flere rom. Hvordan kan backend returnere bare dem som passer med rommet i requesten?',
			oppdrag:
				'Bruk eksemplet med produkter til å lage deres egen filtrering av meldinger. Send den filtrerte listen som svar.',
			hint: 'filter() lager et nytt array med objektene som oppfyller en betingelse. Sammenlign rommet på hver melding med rommet brukeren ba om.',
			kode: '// Et annet eksempel:\nconst produkter = [\n  { navn: "Mus", kategori: "utstyr" },\n  { navn: "Lisens", kategori: "programvare" }\n];\nconst valgtKategori = "utstyr";\nconst utvalg = produkter.filter((produkt) => {\n  return produkt.kategori === valgtKategori;\n});\n\n// utvalg inneholder bare Mus.\n// produkter inneholder fortsatt begge objektene.',
			forklaring:
				'Ikke erstatt hele backend-listen med det filtrerte resultatet. Meldinger fra de andre rommene skal fortsatt ligge der.',
			sjekk: 'Backend returnerer riktig rom uten å fjerne andre meldinger fra listen.'
		},
		{
			tittel: 'Oppdater når rommet byttes',
			sted: 'FRONTEND',
			sporsmal:
				'Variabelen sier Gaming, men listen viser fortsatt meldinger fra Generelt. Hvilket arbeid gjenstår?',
			oppdrag:
				'Få rombytte til å hente meldinger på nytt. Test først med en egen Hent-knapp, og koble deretter hentingen til romvalget.',
			hint: 'En endret variabel gir ikke nye data fra serveren av seg selv. Kall hentefunksjonen med riktig rom, les svaret og oppdater frontend-listen. Vis gjerne «Henter …» underveis.',
			kode: '// Tenk i denne rekkefølgen:\n// 1. Finn rommet brukeren nettopp valgte.\n// 2. Send GET med denne romverdien.\n// 3. Sjekk at svaret er vellykket.\n// 4. Les JSON-dataene.\n// 5. Erstatt listen som frontend viser.\n\n// Ekstra: Hva skjer hvis brukeren bytter rom\n// igjen før den første requesten er ferdig?',
			forklaring:
				'Ved raske rombytter kan svar komme tilbake i en annen rekkefølge. Som en utvidelse kan dere avbryte forrige henting eller ignorere svar som tilhører et gammelt rom.',
			sjekk: 'Rombytte henter og viser listen for det nye rommet.'
		}
	];
	let rom = $state('generelt');
	let tekst = $state('Hei fra meg!');
	/** @type {Melding[]} */
	let lagret = $state([
		{ id: 1, avsender: 'Ada', tekst: 'Hei alle sammen!', rom: 'generelt' },
		{ id: 2, avsender: 'Noah', tekst: 'Noen som vil spille etter skolen?', rom: 'gaming' },
		{ id: 3, avsender: 'Lin', tekst: 'Jeg tester chatten.', rom: 'generelt' }
	]);
	/** @type {Melding[]} */
	let synlige = $state([]);
	let hentetRom = $state('');
	/** @type {DemoRequest | null} */
	let request = $state(null);
	/** @type {Melding[] | { beskjed: string } | null} */
	let response = $state(null);
	let fase = $state(0);
	let nesteId = $state(4);
	let melding = $state('Velg et rom og prøv å hente meldingene.');
	let opptatt = $derived(fase > 0 && fase < 4);
	let aktivt = $derived(steg[valgtSteg]);
	let antallFerdig = $derived(ferdig.filter(Boolean).length);
	/** @param {unknown} data */
	const json = (data) => JSON.stringify(data, null, 2);
	/** @param {string} id */
	const romnavn = (id) => (id === 'generelt' ? 'Generelt' : 'Gaming');
	/** @param {'GET' | 'POST'} metode */
	function start(metode) {
		if (opptatt || (metode === 'POST' && !tekst.trim())) return;
		request =
			metode === 'POST'
				? { metode, rom, body: { avsender: 'Du', tekst: tekst.trim(), rom } }
				: { metode, rom, body: null };
		response = null;
		fase = 1;
		melding =
			metode === 'POST'
				? 'POST er på vei. Rommet følger med i body.'
				: 'GET er på vei. Rommet står i URL-en.';
	}
	function neste() {
		const aktivRequest = request;
		if (!opptatt || !aktivRequest) return;
		fase += 1;
		if (fase === 2) {
			if (aktivRequest.metode === 'POST') {
				lagret = [...lagret, { id: nesteId++, ...aktivRequest.body }];
				melding =
					'Backend har kontrollert dataene og lagt meldingen i felleslisten. Frontend-listen er uendret.';
			} else melding = 'Backend leser query-parameteret og velger meldingene med samme romverdi.';
		}
		if (fase === 3) {
			response =
				aktivRequest.metode === 'POST'
					? { beskjed: 'Meldingen er mottatt!' }
					: lagret.filter((m) => m.rom === aktivRequest.rom).map((m) => ({ ...m }));
			melding =
				aktivRequest.metode === 'POST'
					? '201: En bekreftelse returneres. Dette er ikke hele meldingslisten.'
					: '200: Bare meldingene fra det valgte rommet sendes tilbake.';
		}
		if (fase === 4) {
			if (aktivRequest.metode === 'GET') {
				if (!Array.isArray(response)) return;
				synlige = response.map((m) => ({ ...m }));
				hentetRom = aktivRequest.rom;
				melding = 'Frontend har lest JSON-svaret og oppdatert sin egen liste.';
			} else {
				tekst = '';
				melding = 'Meldingen er sendt. Trykk Hent rom for å oppdatere listen i nettleseren.';
			}
		}
	}
	function nullstill() {
		rom = 'generelt';
		tekst = 'Hei fra meg!';
		nesteId = 4;
		lagret = lagret.filter((m) => m.id < 4);
		synlige = [];
		hentetRom = '';
		request = null;
		response = null;
		fase = 0;
		melding = 'Velg et rom og prøv å hente meldingene.';
	}
	const testTekster = [
		'Send i Generelt. Hent rommet og kontroller at meldingen vises.',
		'Bytt til Gaming. Hent rommet og kontroller at meldinger fra Generelt ikke vises.',
		'Send i Gaming og bytt tilbake til Generelt. Er begge rommenes meldinger bevart?',
		'Test egen løsning i to nettleservinduer med forskjellige rom.'
	];

	// Egen demo for alternativ datastruktur. Uavhengig av demoen øverst.
	const lagEksempelrom = () => [
		{
			id: 'generelt',
			navn: 'Generelt',
			meldinger: [
				{ avsender: 'Ada', tekst: 'Hei alle sammen!' },
				{ avsender: 'Lin', tekst: 'Jeg tester chatten.' }
			]
		},
		{
			id: 'gaming',
			navn: 'Gaming',
			meldinger: [{ avsender: 'Noah', tekst: 'Noen som vil spille?' }]
		}
	];
	let romListe = $state(lagEksempelrom());
	let valgtRomId = $state('generelt');
	let ekstraTekst = $state('En melding i dette rommet!');
	let ekstraStatus = $state('Velg et rom og se hvor meldingene ligger.');
	let valgtRomObjekt = $derived(romListe.find((r) => r.id === valgtRomId));
	const finnRomKode =
		'const valgtRom = romListe.find((rom) => {\n  return rom.id === romIdFraRequest;\n});\n\n// find() gir ett romobjekt, eller undefined.\n// Kontroller at rommet finnes før du bruker det.';
	const postRomSkisse =
		'// I POST-ruten:\n// 1. Les rom-ID og meldingstekst fra body.\n// 2. Finn romobjektet med find().\n// 3. Hvis rommet ikke finnes: svar 404 og return.\n// 4. Kontroller avsender og tekst.\n// 5. Legg meldingen i DETTE rommets meldingsliste.\n// 6. Send en bekreftelse.';
	const getRomSkisse =
		'// I GET-ruten:\n// 1. Les rom-ID fra query-parameteret.\n// 2. Finn romobjektet.\n// 3. Hvis rommet ikke finnes: svar 404 og return.\n// 4. Returner rommets meldinger som JSON.\n\n// Hva skal erstatte den gamle filter()-løsningen?';
	function leggTilIRomDemo() {
		if (!valgtRomObjekt || !ekstraTekst.trim()) return;
		valgtRomObjekt.meldinger.push({ avsender: 'Du', tekst: ekstraTekst.trim() });
		ekstraStatus = `Meldingen ble lagt i ${valgtRomObjekt.navn}. Det andre rommets liste er uendret.`;
		ekstraTekst = '';
	}
	function nullstillRomDemo() {
		romListe = lagEksempelrom();
		valgtRomId = 'generelt';
		ekstraTekst = 'En melding i dette rommet!';
		ekstraStatus = 'Velg et rom og se hvor meldingene ligger.';
	}
</script>

<svelte:head
	><title>Fra idé til funksjon: chatrom · IT-laben</title><meta
		name="description"
		content="Bygg chatrom steg for steg med visuell dataflyt, spørsmål og valgfrie kodehint. Ingen ferdig chatløsning."
	/></svelte:head
>

<div class="side">
	<header>
		<a href="/">← IT-laben<span>.</span></a><span class="merke">BYGG VIDERE / 01</span>
	</header>
	<main>
		<section class="intro">
			<p class="overlinje">FRA IDÉ TIL FUNKSJON</p>
			<h1>En chat.<br /><em>Flere rom.</em></h1>
			<p class="ingress">
				Du kan allerede sende en melding. Nå skal du finne ut hva som må endres for at den skal
				havne i riktig rom.
			</p>
			<div class="mal">
				<span>MÅLET</span>«Brukeren skal kunne velge et rom og bare se meldingene som hører til
				der.»
			</div>
			<p class="avgrensing">
				Begynn med to faste rom og ett array. Oppretting av nye rom og private rom kan komme senere.
			</p>
		</section>

		<section class="demo" aria-labelledby="demotittel">
			<div class="seksjonstopp">
				<div>
					<p class="overlinje">SE SAMMENHENGEN FØRST</p>
					<h2 id="demotittel">Samme liste. Ulike utsnitt.</h2>
				</div>
				<button class="diskret" onclick={nullstill}>↶ Nullstill demo</button>
			</div>
			<p class="demointro">
				Velg Send eller Hent rom. Følg deretter requesten med «Neste steg». Dette er en lokal
				simulering med ferdige eksempeldata.
			</p>
			<div class="flytsteg" aria-label="Requestens fremdrift">
				{#each ['Klar', 'Request', 'Backend', 'Response', 'Frontend'] as navn, i}<span
						class:aktiv={fase === i}>{i + 1}<b>{navn}</b></span
					>{/each}
			</div>
			<div class="demogrid">
				<article class="klient">
					<div class="paneltopp"><span>01 / NETTLESER</span><b>Frontend</b></div>
					<div class="panelinnhold">
						<label for="rom">Valgt rom</label><select id="rom" bind:value={rom} disabled={opptatt}
							><option value="generelt">Generelt</option><option value="gaming">Gaming</option
							></select
						>
						<p class="variabel">valgtRom = <code>"{rom}"</code></p>
						<label for="melding">Ny melding</label><input
							id="melding"
							bind:value={tekst}
							disabled={opptatt}
							maxlength="140"
							placeholder="Skriv noe …"
						/>
						<div class="knapper">
							<button
								class="primaer"
								onclick={() => start('POST')}
								disabled={opptatt || !tekst.trim()}>Send ↗</button
							><button onclick={() => start('GET')} disabled={opptatt}>Hent rom ↓</button>
						</div>
						<div class="listetittel">
							<b>Sist hentet: {hentetRom ? romnavn(hentetRom) : 'ingen'}</b><span
								>{synlige.length}</span
							>
						</div>
						{#if hentetRom && hentetRom !== rom}<p class="obs">
								Du har byttet rom. Listen nedenfor er fortsatt fra {romnavn(hentetRom)}. Hent på
								nytt!
							</p>{/if}
						<div class="meldinger">
							{#each synlige as m (m.id)}<div class="chatmelding">
									<b>{m.avsender}</b>
									<p>{m.tekst}</p>
									<small>{m.rom}</small>
								</div>{:else}<p class="tom">Ingen meldinger i frontend-listen.</p>{/each}
						</div>
						<p class="liten">
							Endring av romvalget sender ikke automatisk en request i denne demoen. Det bygger dere
							i steg 7.
						</p>
					</div>
				</article>
				<div class="nettverk">
					<span class="overlinje">HTTP</span>
					<div class="linje" class:tilbake={fase === 3}>
						{#if fase === 1 || fase === 3}<i>{fase === 1 ? '→' : '←'}</i>{/if}
					</div>
					<b>{request ? request.metode : 'GET / POST'}</b><span
						>{fase === 3 ? 'Svar tilbake' : 'Data over nettverket'}</span
					><button class="primaer" onclick={neste} disabled={!opptatt}>Neste steg →</button>
				</div>
				<article class="server">
					<div class="paneltopp"><span>02 / EXPRESS</span><b>Backend</b></div>
					<div class="panelinnhold">
						<div class="listetittel"><b>meldinger[]</b><span>{lagret.length} totalt</span></div>
						<p class="liten">Alle rom i samme array. Et GET-utvalg endrer ikke denne listen.</p>
						<div class="backend-liste">
							{#each lagret as m (m.id)}<div
									class="lagret"
									class:treff={request?.metode === 'GET' && fase >= 2 && request.rom === m.rom}
									class:ny={request?.metode === 'POST' &&
										fase >= 2 &&
										m.id === nesteId - 1 &&
										m.id >= 4}
								>
									<span class="rommerke" class:gaming={m.rom === 'gaming'}>{m.rom}</span><b
										>{m.avsender}</b
									>
									<p>{m.tekst}</p>
									<code>rom: "{m.rom}"</code>
								</div>{/each}
						</div>
					</div>
				</article>
			</div>
			<div class="status" role="status">
				<span>{String(fase + 1).padStart(2, '0')}</span>
				<p>{melding}</p>
			</div>
			<div class="inspektor">
				<div>
					<h3>Request</h3>
					<pre>{request
							? `${request.metode} /meldinger${request.metode === 'GET' ? '?rom=' + encodeURIComponent(request.rom) : ''}\n${request.body ? 'Content-Type: application/json\n\n' + json(request.body) : '\nIngen body'}`
							: '// Start med Send eller Hent rom.'}</pre>
				</div>
				<div>
					<h3>Backend leser</h3>
					<pre>{request
							? request.metode === 'POST'
								? `req.body.rom\n→ "${request.rom}"`
								: `req.query.rom\n→ "${request.rom}"`
							: '// Body eller query?'}</pre>
				</div>
				<div>
					<h3>Response</h3>
					<pre>{response && request
							? `${request.metode === 'POST' ? '201 Created' : '200 OK'}\n\n${json(response)}`
							: '// Venter på behandling.'}</pre>
				</div>
			</div>
			<p class="liten fotnote">
				Romnavnene vises også som tekst. Farger og markeringer hjelper deg å følge verdiene. Lagring
				her er bare i minnet; ingenting deles med andre nettlesere.
			</p>
		</section>

		<section class="bygg" aria-labelledby="byggtittel">
			<div class="seksjonstopp">
				<div>
					<p class="overlinje">DIN TUR</p>
					<h2 id="byggtittel">Del opp funksjonen.</h2>
				</div>
				<span class="fremdrift">{antallFerdig} / 7 undersøkt</span>
			</div>
			<p class="demointro">
				Tenk først. Åpne et hint hvis du står fast. Gjør én endring i ditt eget prosjekt, og test
				før du fortsetter.
			</p>
			<div class="arbeidsflate">
				<nav aria-label="Velg arbeidssteg">
					{#each steg as s, i}<button
							class:valgt={valgtSteg === i}
							aria-current={valgtSteg === i ? 'step' : undefined}
							onclick={() => (valgtSteg = i)}
							><span>{ferdig[i] ? '✓' : String(i + 1).padStart(2, '0')}</span><b>{s.tittel}</b
							></button
						>{/each}
				</nav>
				<article class="oppgave">
					{#key valgtSteg}<p class="overlinje">STEG {valgtSteg + 1} / {aktivt.sted}</p>
						<h3>{aktivt.tittel}</h3>
						<p class="sporsmal">{aktivt.sporsmal}</p>
						<div class="oppdrag">
							<b>Prøv i deres prosjekt</b>
							<p>{aktivt.oppdrag}</p>
						</div>
						<label class="notatlabel" for="notat"
							>Din idé før du åpner hintet <span>valgfritt</span></label
						><textarea
							id="notat"
							bind:value={notater[valgtSteg]}
							placeholder="Vi må endre … fordi …"
							rows="3"></textarea>
						<details>
							<summary>01 / Vis et hint <span>+</span></summary>
							<p>{aktivt.hint}</p>
						</details>
						<details>
							<summary>02 / Se en liten kodebit <span>+</span></summary>
							<p class="liten">
								Et eksempel eller en arbeidsskisse. Tilpass til din egen kode; dette er ikke en
								komplett løsning.
							</p>
							<pre class="kode">{aktivt.kode}</pre>
							<p>{aktivt.forklaring}</p>
						</details>
						<label class="egenkontroll"
							><input type="checkbox" bind:checked={ferdig[valgtSteg]} /><span>{aktivt.sjekk}</span
							></label
						>
						<div class="stegknapper">
							<button onclick={() => valgtSteg--} disabled={valgtSteg === 0}>← Forrige</button><span
								>{valgtSteg + 1} av 7</span
							><button class="primaer" onclick={() => valgtSteg++} disabled={valgtSteg === 6}
								>Neste →</button
							>
						</div>{/key}
				</article>
			</div>
			<p class="liten">
				Notater og avkryssinger er kun din egen arbeidsstøtte. De sendes ikke inn og forsvinner når
				siden lastes på nytt.
			</p>
		</section>

		<section class="avslutning">
			<article>
				<p class="overlinje">TEST I DIN EGEN CHAT</p>
				<h2>Virker det sammen?</h2>
				<p class="demointro">
					Følg en melding hele veien. Bruk Network i nettleseren og console.log på backend når noe
					stopper opp.
				</p>
				{#each testTekster as test, i}<label class="test"
						><input type="checkbox" bind:checked={tester[i]} /><span>{test}</span></label
					>{/each}
			</article>
			<aside>
				<p class="overlinje">NÅR DET IKKE VIRKER</p>
				<h3>Finn hvor verdien forsvinner.</h3>
				<ol>
					<li><b>Frontend:</b> Har romvariabelen riktig verdi?</li>
					<li><b>Request:</b> Er rommet med i body eller URL?</li>
					<li><b>Backend:</b> Leser dere samme feltnavn?</li>
					<li><b>Array:</b> Har den lagrede meldingen et rom?</li>
					<li><b>Response:</b> Sender GET bare riktig rom?</li>
					<li><b>Visning:</b> Oppdateres frontend-listen etter svaret?</li>
				</ol>
				<p class="obs">
					Filtrering etter rom gir ikke private rom. Private rom krever at backend kontrollerer hvem
					som har tilgang.
				</p>
			</aside>
		</section>

		<section class="romstruktur" aria-labelledby="struktur-tittel">
			<div class="seksjonstopp">
				<div>
					<p class="overlinje">EKSTRA / NÅR GRUNNLØSNINGEN VIRKER</p>
					<h2 id="struktur-tittel">La hvert rom eie meldingene sine.</h2>
				</div>
				<span class="fremdrift">Alternativ datastruktur</span>
			</div>
			<p class="struktur-intro">
				En felles meldingsliste fungerer fint. Et alternativ er en <b>liste med romobjekter</b>, der
				hvert rom har ID, navn og sin egen liste med meldinger. Det kan gjøre det lettere å samle
				informasjonen om hvert rom på ett sted.
			</p>
			<div class="struktur-sammenligning">
				<div>
					<span>FØR</span>
					<h3>Meldinger med rom-ID</h3>
					<p>
						Hver melding har en romverdi. Backend filtrerer felleslisten for å finne meldingene i
						ett rom.
					</p>
					<code>meldinger → filtrer etter rom</code>
				</div>
				<div>
					<span>ALTERNATIV</span>
					<h3>Rom med meldinger</h3>
					<p>
						Hvert rom inneholder meldingene sine. Backend finner rommet og bruker listen inne i
						objektet.
					</p>
					<code>romListe → finn rom → meldinger</code>
				</div>
			</div>
			<div class="struktur-demo">
				<div class="romkart">
					<p class="overlinje">romListe [ … ]</p>
					<div class="romvalg" role="group" aria-label="Velg romobjekt">
						{#each romListe as r}<button
								class:romvalgt={valgtRomId === r.id}
								aria-pressed={valgtRomId === r.id}
								onclick={() => (valgtRomId = r.id)}
								><b>{r.navn}</b><code>id: "{r.id}"</code><span>{r.meldinger.length} meldinger</span
								></button
							>{/each}
					</div>
					<div class="rominnhold">
						<p class="overlinje">VALGT ROMOBJEKT</p>
						<h3>{valgtRomObjekt?.navn}</h3>
						<code>meldinger [ … ]</code>
						<div class="indre-liste">
							{#each valgtRomObjekt?.meldinger ?? [] as m}<div>
									<b>{m.avsender}</b>
									<p>{m.tekst}</p>
								</div>{/each}
						</div>
					</div>
					<label for="ekstra-melding">Prøv å legge en melding i valgt rom</label><input
						id="ekstra-melding"
						bind:value={ekstraTekst}
						maxlength="140"
						placeholder="En kort melding …"
					/>
					<div class="knapper">
						<button class="primaer" onclick={leggTilIRomDemo} disabled={!ekstraTekst.trim()}
							>Legg til i {valgtRomObjekt?.navn}</button
						><button onclick={nullstillRomDemo}>Nullstill</button>
					</div>
					<p class="liten" role="status">{ekstraStatus}</p>
				</div>
				<div class="struktur-kode">
					<div><b>Hele datastrukturen</b><span>Oppdateres når du legger til</span></div>
					<pre>{'const romListe = ' + json(romListe) + ';'}</pre>
				</div>
			</div>
			<p class="liten">
				Dette er en egen lokal demo, uavhengig av listen øverst. Meldingen trenger ikke en egen
				rom-ID i denne strukturen, fordi den ligger inne i rommet. Frontend må likevel sende rom-ID,
				slik at backend vet hvilket rom som skal brukes.
			</p>
			<div class="struktur-oppgaver">
				<article>
					<p class="overlinje">HVA MÅ ENDRES?</p>
					<h3>Finn rommet først.</h3>
					<p>
						Behold romvalget og requestene fra grunnløsningen. Det er organiseringen av data og
						behandlingen på backend som endres. GET kan fortsatt returnere et array med meldinger,
						slik at frontend kan vise listen som før.
					</p>
					<details>
						<summary>Hint: Finn ett romobjekt <span>+</span></summary>
						<pre class="kode">{finnRomKode}</pre>
						<p>
							<code>find()</code> gir det første objektet som passer. <code>filter()</code> gir en
							ny liste. Her trenger dere ett romobjekt, og deretter egenskapen
							<code>meldinger</code> på dette objektet.
						</p>
					</details>
					<details>
						<summary>Hint: Hva endres i POST? <span>+</span></summary>
						<pre class="kode">{postRomSkisse}</pre>
						<p>
							Tenk på hvilken liste dere kaller <code>push()</code> på. Er det listen over rom eller meldingslisten
							inne i det valgte rommet?
						</p>
					</details>
					<details>
						<summary>Hint: Hva endres i GET? <span>+</span></summary>
						<pre class="kode">{getRomSkisse}</pre>
						<p>
							Dere trenger ikke filtrere alle meldingene. Romobjektet har allerede listen dere vil
							sende tilbake. Et rom uten meldinger skal gi et tomt array, ikke behandles som et
							ukjent rom.
						</p>
					</details>
				</article>
				<aside>
					<p class="overlinje">PRØV I DERES PROSJEKT</p>
					<ol>
						<li>Lag to romobjekter med hver sin tomme meldingsliste.</li>
						<li>Tilpass POST til å legge meldingen i riktig romobjekt.</li>
						<li>Tilpass GET til å returnere meldingene fra dette rommet.</li>
						<li>Test at sending i ett rom ikke endrer det andre.</li>
						<li>Test et ukjent rom og et eksisterende rom uten meldinger.</li>
					</ol>
					<div class="obs">
						<b>Struktur er ikke varig lagring.</b><br />Et array i serverens minne forsvinner
						fortsatt ved omstart. Skal data bevares, må dere i tillegg lagre og lese dem fra fil
						eller database. Dette er et alternativ for å organisere dataene, ikke automatisk en
						raskere løsning.
					</div>
					<p class="liten">
						Senere kan romobjektet få flere egenskaper, som beskrivelse eller oppretter. Private rom
						trenger fortsatt tilgangskontroll på backend.
					</p>
				</aside>
			</div>
		</section>
		<footer>
			<a href="/">← Tilbake til IT-laben</a>
			<p>Arbeidsmåten kan brukes igjen: Hva må vi vite, sende, behandle og vise?</p>
		</footer>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f4f5ef;
	}
	.side {
		--ink: #193c3b;
		--teal: #087f79;
		--muted: #657b71;
		--border: #d9e2d6;
		color: var(--ink);
		font-family:
			Inter,
			system-ui,
			-apple-system,
			'Segoe UI',
			sans-serif;
		background: radial-gradient(ellipse at 90% 0, #dcebdd, transparent 30%);
		min-height: 100vh;
	}
	.side,
	.side * {
		box-sizing: border-box;
	}
	header,
	main {
		max-width: 1200px;
		width: calc(100% - 72px);
		margin: auto;
	}
	header {
		height: 83px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--border);
	}
	a {
		color: inherit;
		text-decoration: none;
	}
	header a {
		font-weight: 750;
		font-size: 16px;
	}
	header a span {
		color: var(--teal);
	}
	.merke {
		font: 10px monospace;
		letter-spacing: 1.4px;
		color: var(--muted);
	}
	button,
	input,
	select,
	textarea {
		font: inherit;
	}
	button,
	select,
	summary {
		cursor: pointer;
	}
	button {
		padding: 10px 14px;
		border: 1px solid #cfded2;
		background: #fffdf9;
		color: var(--ink);
		border-radius: 7px;
		font-size: 12px;
		font-weight: 650;
		transition: background 0.2s;
	}
	button:hover:not(:disabled) {
		background: #e5eee2;
	}
	button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.primaer {
		background: var(--teal);
		border-color: var(--teal);
		color: white;
	}
	.primaer:hover:not(:disabled) {
		background: #066560;
	}
	.diskret {
		background: transparent;
	}
	a:focus-visible,
	button:focus-visible,
	input:focus-visible,
	select:focus-visible,
	textarea:focus-visible,
	summary:focus-visible {
		outline: 3px solid #c77a30;
		outline-offset: 4px;
	}
	p {
		line-height: 1.75;
	}
	h1,
	h2,
	h3,
	p {
		margin-top: 0;
	}
	.intro {
		padding: 55px 0 40px;
		max-width: 800px;
	}
	.overlinje {
		font-size: 10px;
		letter-spacing: 1.7px;
		font-weight: 750;
		color: var(--teal);
		margin-bottom: 15px;
	}
	h1 {
		font-size: clamp(45px, 6vw, 74px);
		line-height: 1.04;
		letter-spacing: -3px;
		margin-bottom: 22px;
	}
	h1 em {
		font-style: normal;
		color: var(--teal);
	}
	.ingress {
		font-size: 16px;
		max-width: 610px;
		color: var(--muted);
		margin-bottom: 23px;
	}
	.mal {
		padding: 17px 20px;
		background: #e6eedf;
		border-left: 3px solid #89ac7a;
		border-radius: 0 7px 7px 0;
		font-size: 14px;
		line-height: 1.7;
	}
	.mal span {
		display: block;
		font: 9px monospace;
		letter-spacing: 1px;
		color: #67865b;
		margin-bottom: 6px;
	}
	.avgrensing {
		font-size: 11px;
		color: var(--muted);
		margin: 13px 0 0;
	}
	h2 {
		font-size: 26px;
		letter-spacing: -0.8px;
		margin: 0;
	}
	h3 {
		font-size: 21px;
		letter-spacing: -0.5px;
	}
	.seksjonstopp {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}
	.seksjonstopp .overlinje {
		margin-bottom: 8px;
	}
	.demo {
		padding: 25px;
		background: #fffefa;
		border: 1px solid #cfdccd;
		border-radius: 14px;
	}
	.demointro {
		font-size: 12px;
		color: var(--muted);
		margin: 15px 0 22px;
	}
	.flytsteg {
		display: flex;
		gap: 9px;
		border-bottom: 1px solid var(--border);
		padding-bottom: 18px;
		margin-bottom: 24px;
		flex-wrap: wrap;
	}
	.flytsteg > span {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 7px 10px;
		border-radius: 5px;
		font: 10px monospace;
		color: #82947d;
		background: #f1f5ec;
	}
	.flytsteg b {
		font: 500 11px system-ui;
	}
	.flytsteg .aktiv {
		background: #d8eee1;
		color: #18664e;
		box-shadow: inset 0 -2px #359071;
	}
	.demogrid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 145px minmax(0, 1fr);
		align-items: start;
	}
	.klient,
	.server {
		border: 1px solid var(--border);
		border-radius: 10px;
		overflow: hidden;
		min-width: 0;
	}
	.paneltopp {
		padding: 15px;
		background: #edf4e9;
		display: flex;
		justify-content: space-between;
		gap: 8px;
		align-items: center;
	}
	.paneltopp > span {
		font: 9px monospace;
		color: #688467;
	}
	.paneltopp > b {
		font-size: 14px;
	}
	.server .paneltopp {
		background: #f6eddf;
	}
	.panelinnhold {
		padding: 18px;
	}
	label {
		font-size: 12px;
	}
	input:not([type='checkbox']),
	select,
	textarea {
		display: block;
		width: 100%;
		padding: 10px 12px;
		border: 1px solid #cedbca;
		background: white;
		color: var(--ink);
		border-radius: 6px;
		font-size: 13px;
		margin-top: 7px;
		min-width: 0;
	}
	input:disabled,
	select:disabled {
		opacity: 0.7;
	}
	.variabel {
		font: 11px monospace;
		color: #8b7595;
		margin: 12px 0 23px;
	}
	.variabel code {
		color: var(--teal);
	}
	.knapper {
		display: flex;
		gap: 8px;
		margin: 13px 0 20px;
	}
	.listetittel {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		font-size: 11px;
		margin: 0 0 12px;
	}
	.listetittel > span {
		font: 10px monospace;
		color: #749069;
	}
	.meldinger {
		max-height: 250px;
		overflow: auto;
		border: 1px dashed #cbdac5;
		background: #f7faf3;
		border-radius: 7px;
		min-height: 90px;
	}
	.chatmelding {
		padding: 12px;
		font-size: 11px;
		border-bottom: 1px solid #dce6d4;
		animation: inn 0.4s ease-out;
	}
	.chatmelding p {
		margin: 5px 0;
		overflow-wrap: anywhere;
	}
	.chatmelding small {
		font: 9px monospace;
		color: #7b8f6d;
	}
	.tom {
		padding: 20px;
		font-size: 11px;
		color: #85997b;
	}
	.liten {
		font-size: 10px;
		color: #7b8d70;
		line-height: 1.7;
		margin: 12px 0 0;
	}
	.nettverk {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding-top: 60px;
		min-width: 0;
	}
	.nettverk .overlinje {
		margin: 0;
		font-size: 9px;
	}
	.nettverk > b {
		font: 12px monospace;
		color: var(--teal);
	}
	.nettverk > span:not(.overlinje) {
		font-size: 9px;
		color: #809573;
		text-align: center;
	}
	.nettverk button {
		font-size: 11px;
		padding: 10px;
		margin: 8px 0;
	}
	.linje {
		height: 25px;
		width: 100%;
		position: relative;
	}
	.linje:before {
		content: '';
		position: absolute;
		top: 12px;
		left: 0;
		right: 0;
		border-top: 2px dashed #bed4bd;
	}
	.linje i {
		position: absolute;
		left: 0;
		top: 0;
		display: grid;
		place-items: center;
		background: #087f79;
		color: white;
		font-style: normal;
		width: 30px;
		height: 24px;
		border-radius: 5px;
		animation: rejse 1.8s infinite ease-in-out;
	}
	.linje.tilbake i {
		animation-direction: reverse;
		background: #b87935;
	}
	.backend-liste {
		display: grid;
		gap: 8px;
		max-height: 410px;
		overflow: auto;
		margin-top: 15px;
	}
	.lagret {
		padding: 12px;
		border: 1px solid #e3e6d9;
		border-radius: 7px;
		background: #faf9f1;
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 7px 10px;
		transition:
			background 0.3s,
			border-color 0.3s;
	}
	.lagret > b {
		font-size: 11px;
	}
	.lagret p {
		grid-column: 1/-1;
		margin: 0;
		font-size: 11px;
		overflow-wrap: anywhere;
	}
	.lagret > code {
		grid-column: 1/-1;
		font-size: 10px;
		color: #8b8466;
	}
	.rommerke {
		font: 9px monospace;
		padding: 4px 6px;
		border-radius: 4px;
		background: #dbeee1;
		color: #326c50;
	}
	.rommerke.gaming {
		background: #e8def4;
		color: #6d4e88;
	}
	.lagret.treff {
		background: #e9f3df;
		border-color: #87b76d;
	}
	.lagret.ny {
		border-color: #d99f58;
		animation: inn 0.4s ease-out;
	}
	.status {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-top: 22px;
		background: #ecf4e6;
		padding: 16px;
		border-left: 3px solid #62a27f;
		border-radius: 0 7px 7px 0;
	}
	.status > span {
		font: 27px monospace;
		color: #8cad7b;
	}
	.status p {
		font-size: 12px;
		margin: 0;
		color: #456d50;
	}
	.inspektor {
		display: grid;
		grid-template-columns: 1fr 0.7fr 1fr;
		gap: 12px;
		margin-top: 20px;
	}
	.inspektor > div {
		background: #183739;
		color: #c1d8c6;
		padding: 15px;
		border-radius: 8px;
		min-width: 0;
	}
	.inspektor h3 {
		font: 10px monospace;
		color: #91b997;
		letter-spacing: 0.5px;
		margin-bottom: 12px;
	}
	pre {
		margin: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font:
			11px/1.75 Consolas,
			monospace;
	}
	.inspektor pre {
		max-height: 220px;
		overflow: auto;
	}
	.fotnote {
		margin-top: 15px;
	}
	.bygg {
		margin-top: 50px;
	}
	.fremdrift {
		font: 11px monospace;
		color: #6a8d5b;
	}
	.arbeidsflate {
		display: grid;
		grid-template-columns: 260px minmax(0, 1fr);
		gap: 25px;
		align-items: start;
	}
	nav {
		display: grid;
		gap: 6px;
	}
	nav button {
		display: flex;
		align-items: center;
		text-align: left;
		gap: 12px;
		background: transparent;
		border-color: transparent;
		padding: 13px 10px;
	}
	nav button > span {
		font: 11px monospace;
		color: #83a174;
		min-width: 20px;
	}
	nav b {
		font-size: 12px;
		font-weight: 550;
	}
	nav .valgt {
		background: #e3eddb;
		border-color: #d0dec7;
	}
	nav .valgt b {
		color: #166b56;
		font-weight: 750;
	}
	.oppgave {
		padding: 30px;
		background: #fffefa;
		border: 1px solid #d0ddca;
		border-radius: 12px;
		min-width: 0;
	}
	.oppgave > h3 {
		font-size: 29px;
		margin-bottom: 17px;
	}
	.sporsmal {
		font-size: 16px;
		line-height: 1.7;
		max-width: 640px;
	}
	.oppdrag {
		background: #f1f5eb;
		padding: 17px;
		border-radius: 7px;
		margin: 20px 0;
	}
	.oppdrag > b {
		font-size: 11px;
		color: #518048;
	}
	.oppdrag p {
		font-size: 12px;
		color: #657c56;
		margin: 7px 0 0;
	}
	.notatlabel {
		font-size: 11px;
		font-weight: 600;
	}
	.notatlabel > span {
		font-size: 10px;
		font-weight: 400;
		color: #8c9d7e;
		margin-left: 5px;
	}
	textarea {
		resize: vertical;
		margin-bottom: 22px;
		line-height: 1.7;
	}
	details {
		border-top: 1px solid #dce6d5;
		padding: 15px 0;
	}
	summary {
		font-size: 12px;
		font-weight: 650;
		list-style: none;
		display: flex;
		justify-content: space-between;
		gap: 12px;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	details p {
		font-size: 12px;
		color: #5b7751;
		margin: 15px 0 0;
	}
	details .liten {
		font-size: 10px;
	}
	.kode {
		margin-top: 13px;
		background: #193639;
		color: #c8dfbd;
		padding: 20px;
		border-radius: 8px;
		font-size: 12px;
	}
	.egenkontroll {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		background: #eef5e7;
		padding: 14px;
		border-radius: 7px;
		font-size: 11px;
		line-height: 1.7;
		margin-top: 15px;
	}
	input[type='checkbox'] {
		accent-color: var(--teal);
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		margin: 2px 0 0;
	}
	.stegknapper {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		border-top: 1px solid #e0e7db;
		margin-top: 22px;
		padding-top: 20px;
	}
	.stegknapper > span {
		font: 10px monospace;
		color: #849a76;
	}
	.avslutning {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 45px;
		padding: 35px;
		background: #e7eddf;
		border-radius: 12px;
		margin-top: 40px;
	}
	.test {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		font-size: 12px;
		line-height: 1.7;
		margin-bottom: 15px;
	}
	.avslutning aside {
		border-left: 1px solid #cad9bf;
		padding-left: 30px;
	}
	.avslutning h3 {
		font-size: 23px;
	}
	.avslutning ol {
		padding-left: 18px;
		font-size: 12px;
		line-height: 1.8;
		color: #637959;
	}
	.avslutning li {
		margin-bottom: 7px;
	}
	.obs {
		font-size: 10px;
		line-height: 1.7;
		background: #fff2dc;
		color: #8a672e;
		border-radius: 6px;
		padding: 10px;
		margin: 0 0 12px;
	}
	footer {
		padding: 30px 0;
		display: flex;
		justify-content: space-between;
		gap: 25px;
		align-items: center;
	}
	footer a {
		font-size: 12px;
		font-weight: 600;
	}
	footer p {
		font-size: 10px;
		color: #839475;
		margin: 0;
	}
	@keyframes rejse {
		from {
			left: 0;
			opacity: 0.2;
		}
		50% {
			opacity: 1;
		}
		to {
			left: calc(100% - 30px);
			opacity: 0.2;
		}
	}
	@keyframes inn {
		from {
			opacity: 0.5;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@media (max-width: 950px) {
		header,
		main {
			width: calc(100% - 40px);
		}
		.demogrid {
			grid-template-columns: minmax(0, 1fr) 115px minmax(0, 1fr);
		}
		.demo {
			padding: 20px;
		}
		.panelinnhold {
			padding: 14px;
		}
		.arbeidsflate {
			grid-template-columns: 210px minmax(0, 1fr);
			gap: 16px;
		}
		.oppgave {
			padding: 23px;
		}
		.avslutning {
			gap: 25px;
			padding: 25px;
		}
		.avslutning aside {
			padding-left: 22px;
		}
		.inspektor {
			grid-template-columns: 1fr 1fr;
		}
		.inspektor > div:last-child {
			grid-column: 1/-1;
		}
	}
	@media (max-width: 650px) {
		header,
		main {
			width: calc(100% - 30px);
		}
		header {
			height: 68px;
		}
		.merke {
			font-size: 8px;
		}
		.intro {
			padding: 35px 0 30px;
		}
		h1 {
			font-size: 53px;
		}
		.ingress {
			font-size: 14px;
		}
		.mal {
			font-size: 12px;
		}
		.seksjonstopp {
			align-items: start;
			flex-wrap: wrap;
			gap: 12px;
		}
		h2 {
			font-size: 23px;
		}
		.demo {
			padding: 15px;
		}
		.demogrid {
			grid-template-columns: 1fr;
		}
		.nettverk {
			padding: 15px 0;
			display: grid;
			grid-template-columns: 1fr 1fr;
			text-align: center;
			justify-items: center;
			gap: 10px;
		}
		.nettverk .linje {
			grid-column: 1;
		}
		.nettverk > span:not(.overlinje) {
			grid-column: 1;
		}
		.nettverk button {
			grid-column: 2;
			grid-row: 2/4;
			margin: 0;
		}
		.nettverk > b {
			grid-column: 2;
			grid-row: 1;
		}
		.flytsteg {
			gap: 4px;
		}
		.flytsteg > span {
			font-size: 9px;
			padding: 6px;
		}
		.flytsteg b {
			font-size: 9px;
		}
		.backend-liste {
			max-height: 300px;
		}
		.inspektor {
			grid-template-columns: 1fr;
		}
		.inspektor > div:last-child {
			grid-column: auto;
		}
		.arbeidsflate {
			grid-template-columns: 1fr;
		}
		.arbeidsflate nav {
			grid-template-columns: 1fr 1fr;
		}
		nav button {
			padding: 10px 7px;
			gap: 7px;
		}
		nav b {
			font-size: 10px;
		}
		nav button > span {
			font-size: 10px;
			min-width: 16px;
		}
		.oppgave {
			padding: 20px;
		}
		.oppgave > h3 {
			font-size: 25px;
		}
		.sporsmal {
			font-size: 14px;
		}
		.kode {
			font-size: 11px;
			padding: 14px;
		}
		.avslutning {
			grid-template-columns: 1fr;
			gap: 25px;
			padding: 22px;
		}
		.avslutning aside {
			border-left: 0;
			border-top: 1px solid #cad9bf;
			padding: 24px 0 0;
		}
		footer {
			flex-direction: column;
			align-items: start;
			gap: 12px;
		}
		.status {
			padding: 13px;
			gap: 10px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			animation: none !important;
			transition: none !important;
		}
		.linje i {
			left: calc(50% - 15px);
		}
	}

	.romstruktur {
		margin-top: 40px;
		padding: 30px;
		border: 1px solid #cadbc5;
		background: #fffefa;
		border-radius: 13px;
	}
	.struktur-intro {
		font-size: 14px;
		color: #5f7957;
		max-width: 850px;
		margin: 19px 0 24px;
	}
	.struktur-sammenligning {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		margin-bottom: 26px;
	}
	.struktur-sammenligning > div {
		padding: 20px;
		border: 1px solid #dbe5d4;
		border-radius: 8px;
		background: #f5f7ef;
	}
	.struktur-sammenligning > div:last-child {
		background: #eaf3e2;
		border-color: #b7d1ac;
	}
	.struktur-sammenligning > div > span {
		font: 9px monospace;
		color: #6d8b61;
	}
	.struktur-sammenligning h3 {
		font-size: 18px;
		margin: 12px 0 8px;
	}
	.struktur-sammenligning p {
		font-size: 12px;
		color: #647b59;
	}
	.struktur-sammenligning code {
		font-size: 11px;
		color: #43805c;
		overflow-wrap: anywhere;
	}
	.struktur-demo {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
		align-items: start;
	}
	.romkart,
	.struktur-kode {
		min-width: 0;
	}
	.romvalg {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.romvalg button {
		display: grid;
		gap: 9px;
		text-align: left;
		background: #f8faf4;
	}
	.romvalg code {
		font: 10px monospace;
		color: #72906c;
	}
	.romvalg span {
		font-size: 10px;
		font-weight: 400;
	}
	.romvalg .romvalgt {
		background: #deeedc;
		border-color: #7eae79;
		box-shadow: inset 0 -3px #6d9e70;
	}
	.rominnhold {
		margin: 18px 0;
		padding: 18px;
		border: 1px solid #adcaa3;
		border-left: 4px solid #78a573;
		border-radius: 8px;
		background: #f3f8ed;
	}
	.rominnhold .overlinje {
		font-size: 8px;
	}
	.rominnhold h3 {
		margin-bottom: 10px;
	}
	.rominnhold > code {
		font: 11px monospace;
		color: #79936b;
	}
	.indre-liste {
		display: grid;
		gap: 7px;
		margin-top: 12px;
		max-height: 260px;
		overflow: auto;
	}
	.indre-liste > div {
		background: white;
		border: 1px solid #d8e5cf;
		border-radius: 6px;
		padding: 10px;
		font-size: 11px;
		animation: inn 0.3s ease-out;
	}
	.indre-liste p {
		margin: 4px 0 0;
		overflow-wrap: anywhere;
	}
	.struktur-kode {
		border-radius: 9px;
		background: #193739;
		color: #cee1c2;
		overflow: hidden;
	}
	.struktur-kode > div {
		padding: 14px 17px;
		background: #25474a;
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px;
		font-size: 10px;
	}
	.struktur-kode > div > span {
		font-size: 9px;
		color: #a3c4a6;
	}
	.struktur-kode pre {
		padding: 20px;
		font-size: 11px;
		max-height: 540px;
		overflow: auto;
	}
	.struktur-oppgaver {
		display: grid;
		grid-template-columns: 1.2fr 1fr;
		gap: 30px;
		border-top: 1px solid #d5e2ce;
		margin-top: 27px;
		padding-top: 26px;
	}
	.struktur-oppgaver article,
	.struktur-oppgaver aside {
		min-width: 0;
	}
	.struktur-oppgaver article > p:not(.overlinje) {
		font-size: 12px;
		color: #617958;
	}
	.struktur-oppgaver ol {
		font-size: 12px;
		line-height: 1.8;
		color: #617958;
		padding-left: 20px;
	}
	.struktur-oppgaver li {
		margin-bottom: 9px;
	}
	.struktur-oppgaver .obs {
		margin-top: 20px;
	}
	.struktur-oppgaver .kode {
		font-size: 11px;
	}
	@media (max-width: 650px) {
		.romstruktur {
			padding: 20px;
		}
		.struktur-sammenligning,
		.struktur-demo,
		.struktur-oppgaver {
			grid-template-columns: 1fr;
			gap: 18px;
		}
		.struktur-intro {
			font-size: 12px;
		}
		.struktur-kode pre {
			max-height: 410px;
		}
		.romkart .knapper {
			flex-wrap: wrap;
		}
		.struktur-oppgaver {
			padding-top: 22px;
		}
		.romstruktur h2 {
			font-size: 24px;
		}
	}
</style>
