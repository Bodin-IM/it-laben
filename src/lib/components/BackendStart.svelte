<section class="backend-start" aria-labelledby="backend-start-title">
	<h2 id="backend-start-title">Bygg en chat som tåler å bli brukt</h2>
	<p>Undersøk én del i IT-laben, og bruk den i ditt eget prosjekt. Du bygger videre på samme Svelte-frontend og Express-backend gjennom modulen, med JSON-filer som lagring.</p>
	<a class="start" href="/backend/?modul=backend">Start med dataflyten →</a>
	<p class="note">Følg delen læreren har valgt hvis dere allerede er i gang. Øving 1–4 arbeides med gjennom dataflyten og eget prosjekt; de nummererte simulatorene begynner på øving 5.</p>
	<details>
		<summary>Før du begynner på egen maskin</summary>
		<ol>
			<li>Åpne chatprosjektet og øvingsarket fra læreren. Hold frontend og backend i hver sin mappe og terminal. Ta vare på arbeidet i Git.</li>
			<li>Installer pakkene i de mappene som har <code>package.json</code>, og bruk prosjektets startkommandoer. Svelte-koden hører hjemme i <code>src/routes/+page.svelte</code>; Express-rutene hører hjemme i backend.</li>
			<li>Kontroller adressen og porten til begge. På en annen PC betyr <code>localhost</code> den andre PC-en. Frontend må bruke adressen til maskinen som kjører backend.</li>
			<li>Åpne nettleserens Network-fane og backend-terminalen. Se metode, adresse, status og svar når du tester. Bruk eksempelmeldinger og testkontoer.</li>
		</ol>
		<p>Hvis PowerShell blokkerer <code>npm.ps1</code>, kan du bruke <code>npm.cmd</code> i stedet for <code>npm</code>, eller åpne terminalen Ledetekst.</p>
	</details>
	<details>
		<summary>Slik bruker du hjelp og fremgang</summary>
		<p>Prøv én handling, les resultatet og velg neste test. Åpne hint, linjeforklaring eller labpartneren når du trenger hjelp. Hint og eksempler virker også uten et KI-svar.</p>
		<p>«Gjennomgått» er din egen markering. Oppdragstester og fagsjekker kontrollerer bestemte krav; du viser forståelse ved å forklare og bruke prinsippet i egen kode. Et ventende fagsjekkforsøk hindrer ikke videre øving eller arbeid i prosjektet.</p>
		<p>Simulatorenes valg og kjøringer starter på nytt når siden åpnes igjen. Min lab lagrer gjennomgang og bekreftede oppdragsresultater når du er innlogget. Følg lagringsmeldingen i aktiviteten.</p>
	</details>
</section>

<style>
	.backend-start { margin-block: 20px; padding: 24px; border: 1px solid var(--color-border); border-radius: var(--radius-card); background: var(--color-surface); color: var(--color-text); font: 400 var(--font-body)/1.6 var(--font-ui); overflow-wrap: anywhere; }
	h2 { margin: 0 0 12px; font-size: 1.4rem; line-height: 1.35; }
	p, ol { max-width: 75ch; }
	p { margin: 0 0 14px; }
	li { margin-bottom: 10px; }
	.start { display: inline-flex; align-items: center; min-height: 44px; color: var(--color-accent); font-weight: 650; text-underline-offset: 4px; }
	.note { color: var(--color-text-muted); font-size: var(--font-small); }
	details { border-top: 1px solid var(--color-border); }
	summary { padding-block: 12px; min-height: 44px; box-sizing: border-box; cursor: pointer; font-weight: 650; }
	code { font-family: ui-monospace, monospace; font-size: 0.95em; }
	:is(a, summary):focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	@media (max-width: 500px) { .backend-start { padding: 18px 16px; } }
</style>
