<script>
	import { validationTransfer } from '#lib/backendValidation.js';
	/** @type {{id?:string}} */
	let { id = 'eget-prosjekt' } = $props();
</script>

<section {id} tabindex="-1" aria-labelledby="validation-project-title">
	<p class="eyebrow">BRUK SELV · I DITT EGET PROSJEKT</p>
	<h2 id="validation-project-title">Gi brukeren et gyldig visningsnavn</h2>
	<p><strong>Her jobber du:</strong> I kodeeditoren, med din egen Express-backend og Svelte-frontend. Bruk testdata.</p>
	<p><strong>Gjør dette:</strong> {validationTransfer.instruction}</p>
	<ol>
		<li>Finn ruten som oppretter eller endrer profilen. Har du ingen slik rute, lag en liten <code>POST /profil</code>-rute med feltet <code>visningsnavn</code>.</li>
		<li>Kontroller verdien før du endrer data. Ugyldig verdi skal gi HTTP 400 og en forklaring. Gyldig verdi skal lagres uten mellomrom i starten og slutten.</li>
		<li>Send fra frontend med <code>fetch</code>, og vis feilbeskjeden. Behold feltet ved feil, slik at brukeren kan rette og prøve igjen.</li>
	</ol>
	<h3>Slik undersøker du løsningen</h3>
	<p>{validationTransfer.check}</p>
	<ul>
		<li>Vanlig navn og et navn med mellomrom rundt: lagres de som forventet?</li>
		<li>Tom tekst og bare mellomrom: avvises begge uten å endre data?</li>
		<li>Et tall eller et manglende felt: får du en kontrollert feil uten at serveren krasjer?</li>
		<li>30 og 31 enkle bokstaver: virker begge sider av grensen?</li>
	</ul>
	<p>Vis en medelev eller læreren én gyldig og én ugyldig request. Forklar hvilken kontroll som stopper feiltilfellet, og vis dataene før og etter.</p>
	<details>
		<summary>Trenger du hjelp til å komme i gang?</summary>
		<p>Finn først linjen som leser feltet fra <code>req.body</code>, og linjen som endrer data. Kontrollene skal stå mellom disse.</p>
		<details>
			<summary>Vis en tydeligere ledetråd</summary>
			<p>Sjekk typen før du bruker <code>trim()</code>. Undersøk deretter lengden på den ryddede teksten. Et tidlig <code>return</code> hindrer at lagringen kjører etter et feilsvar.</p>
		</details>
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
