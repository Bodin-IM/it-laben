<script>
	import { validationTransfer } from '#lib/backendValidation.js';
	/** @type {{id?:string}} */
	let { id = 'eget-prosjekt' } = $props();
</script>

<section {id} tabindex="-1" aria-labelledby="validation-project-title">
	<p class="eyebrow">BRUK SELV · I DITT EGET PROSJEKT</p>
	<h2 id="validation-project-title">Gi forståelige tilbakemeldinger i chatten</h2>
	<p><strong>Her jobber du:</strong> I din egen Express-backend og Svelte-frontend fra del 6, med sending, redigering, sletting og JSON-lagring. Bruk testdata.</p>
	<p><strong>Gjør dette:</strong> {validationTransfer.instruction}</p>
	<ol>
		<li><strong>Valider før lagring.</strong> Lag <code>tekstFeil(tekst)</code>: krev en streng på 1–500 tegn etter <code>trim()</code>. Kall den i både POST og PATCH. Returner 400 med <code>beskjed</code> ved feil. Behold ID-oppslaget og 404 i PATCH.</li>
		<li><strong>Samle uventede feil.</strong> Legg til <code>next</code> i POST, PATCH og DELETE. La <code>try</code> inneholde lagring og suksessvar; send feilen videre med <code>next(feil)</code> i <code>catch</code>. Plasser 404 for ukjent rute og felles feilmiddleware etter rutene.</li>
		<li><strong>Vis resultatet.</strong> Sjekk <code>svar.ok</code> ved sending, redigering og sletting. Vis <code>beskjed</code> ved feil og en bekreftelse ved suksess i et felt med <code>role="status"</code>. Behold utkastet ved feil; oppdater listen og tøm feltet først etter bekreftet suksess.</li>
	</ol>
	<p>Uten innlogging: valider avsender som en streng på 1–40 tegn etter trim. Med innlogging: hent avsender fra sessionen og behold innlogging, eierskapskontroll og <code>credentials: "include"</code>.</p>
	<details>
		<summary>Hvor skal koden stå, og hvordan skal svaret leses?</summary>
		<p>Rekkefølge: JSON-parser og eventuell session → ruter → 404 for ukjent rute → feilmiddleware → <code>app.listen</code>. Legg hjelpefunksjonene før rutene.</p>
		<p>Feilmiddleware har fire parametere: <code>(feil, req, res, next)</code>. Ugyldig JSON gir 400. Uventede feil logges i backend og gir 500 med en generell beskjed. Innlesingsfeil ved oppstart håndteres i filfunksjonen, før serveren starter.</p>
		<p>I IT-labens eksempler gir POST og PATCH selve meldingsobjektet, uten et <code>beskjed</code>-felt ved suksess. Frontend lager derfor bekreftelsen selv. DELETE gir 204 uten innhold: les bare JSON fra feilsvaret. Et ubetinget <code>await svar.json()</code> vil feile på 204.</p>
		<p>Har du valgt 200 med JSON og <code>beskjed</code> ved sletting i egen chat, kan frontend lese den. Velg ett svarformat og få begge sider til å passe sammen. Henter du listen på nytt med GET etter en endring, vis bekreftelsen etter hentingen.</p>
	</details>
	<h3>Slik undersøker du løsningen</h3>
	<p>{validationTransfer.check}</p>
	<ul>
		<li><strong>POST og PATCH:</strong> vanlig tekst med mellomrom rundt skal lagres trimmet (201/200). Tom tekst, bare mellomrom, tallet 123 og manglende tekstfelt skal gi 400.</li>
		<li><strong>Grensen:</strong> send 500 og 501 enkle bokstaver med begge metodene. 500 godtas, 501 gir 400. Bruk et API-verktøy når HTML-feltet begrenser inntastingen. Navn uten session testes med 40/41 tegn.</li>
		<li><strong>JSON og adresse:</strong> send ødelagt JSON med <code>Content-Type: application/json</code> (400), prøv en ukjent rute (404), og bruk en ukjent meldings-ID i PATCH og DELETE (404).</li>
		<li><strong>Frontend:</strong> prøv vellykket sending, endring og sletting. Ved avvist redigering skal både utkastet og den gamle meldingen være igjen. Ved vellykket sletting skal bare valgt melding forsvinne, uten JSON-feil.</li>
		<li><strong>Nettverksfeil:</strong> stopp backend og prøv igjen. Dette gir ingen HTTP-status; <code>fetch</code> går til <code>catch</code>. Start serveren og kontroller at du kan prøve på nytt.</li>
	</ul>
	<p>Vis en medelev eller læreren én gyldig og én ugyldig request i både POST og PATCH. Forklar kontrollrekkefølgen og vis dataene før og etter.</p>
	<details>
		<summary>Prøv felles feilbehandling ved lagringsfeil</summary>
		<p>I en testkopi: legg midlertidig <code>throw new Error("Testfeil");</code> først i lagringsfunksjonen, før filskriving. Send, endre og slett. Alle tre skal gi 500 via <code>next(feil)</code>, med detaljer bare i backend-terminalen. Kontroller at minnet, filen og listen i frontend er uendret. Fjern testlinjen og prøv igjen.</p>
	</details>
	<details>
		<summary>Ekstra: body-grense og tegnteller</summary>
		<p>Erstatt den gamle JSON-parseren med <code>express.json(&#123; limit: "10kb" &#125;)</code>. Håndter <code>entity.too.large</code> med 413 før den generelle 500-feilen, som i kodeeksemplet.</p>
		<p>Send gyldig JSON med 11 000 vanlige bokstaver i tekstfeltet fra et API-verktøy. Parseren skal stoppe bodyen med 413 før tekstvalideringen. 501 bokstaver er under body-grensen og skal fortsatt gi 400 fra tekstkontrollen.</p>
		<p>Vis gjerne <code>&lt;p&gt;&#123;tekst.trim().length&#125; / 500 tegn&lt;/p&gt;</code> ved tekstfeltet. Telleren hjelper brukeren; backend må fortsatt validere. JavaScripts <code>length</code> teller UTF-16-kodeenheter, så enkelte emoji teller som to.</p>
	</details>
	<details>
		<summary>Prøv prinsippet på et annet felt</summary>
		<p>Lag validering for et visningsnavn på 1–30 tegn etter trim. Velg egne normal-, feil- og grensetester. Forklar hva som kan gjenbrukes fra meldingskontrollen, og hva som må endres.</p>
	</details>
	<p class="note">Koden og testene lagrer du i ditt eget prosjekt. IT-laben leser eller godkjenner ikke denne løsningen automatisk.</p>
</section>

<style>
	section { margin-block: 28px; padding: clamp(18px, 4vw, 28px); border: 1px solid var(--color-info-border); border-radius: var(--radius-card); background: var(--color-surface); color: var(--color-text); font-family: var(--font-ui); overflow-wrap: anywhere; scroll-margin-top: 24px; }
	h2 { margin: 6px 0 16px; font-size: 1.5rem; line-height: 1.3; }
	h3 { margin: 24px 0 8px; font-size: 1.2rem; }
	p, li { max-width: 70ch; font-size: var(--font-body); line-height: var(--leading-body); }
	li + li { margin-top: 10px; }
	ul, ol { padding-left: 1.5rem; }
	.eyebrow, .note { font-size: var(--font-small); color: var(--color-text-muted); }
	.eyebrow { margin: 0; font-weight: 650; }
	code { overflow-wrap: anywhere; }
	details { margin-top: 12px; padding: 0 14px; border: 1px solid var(--color-border); border-radius: 8px; }
	details details { margin-bottom: 14px; }
	summary { min-height: 44px; padding-block: 12px; box-sizing: border-box; cursor: pointer; color: var(--color-action); }
	summary:focus-visible, section:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 4px; }
</style>
