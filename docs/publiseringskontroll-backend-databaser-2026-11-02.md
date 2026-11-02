# Publiseringskontroll: øving 5–7 og databasemodulen

Kontrollert 2. november 2026 før merge fra `dev` til `main`. Omfanget er endringene fra publisert `main` (`ebd23a1`) til `dev` (`1f2191b`), pluss rettelsene nedenfor. Dette omfatter den forenklede øving 5, kodeeksempler og utprøving i øving 6–7, Utstyrsboden, databaseoppgaven, lokale bokmerker og tilhørende Labpartner-kontekst.

## Rettet før merge

- Kodeeksemplet `const filter = {};` på databaseoppgaven er gjort til en eksplisitt tekststreng i Svelte. Krøllparentesene ble tidligere tolket som et tomt Svelte-uttrykk.
- Databasebokmerket venter nå til den første kontohentingen er avklart. Tidligere kunne en direkte lenke til oppdrag 2 bli erstattet av oppdrag 1 når den påloggede profilen ble hentet. Et senere profilbytte bruker fortsatt den nye profilens eget bokmerke. Dette er prøvd med forsinket kontohenting, profilbytte på samme side og bytte mellom normalmodus og øvingsmodus.

## Teknisk kontroll

- Node 24.22.1 og prosjektets installerte avhengigheter.
- Full `npm test`: **311 beståtte tester**, ingen feil eller hoppede tester. Dette inkluderer kjøring av de faktisk viste lagringsutdragene mot midlertidige filer, databasefiltre, datatyper, datamodell, ZIP-innhold og avgrenset Labpartner-kontekst.
- `npm run check`: **0 feil og 0 advarsler** etter rettelsene.
- `npm run build`: produksjonsbygget består etter rettelsene.
- `git diff --check`: består for den samlede endringen.
- Etter rettelsene er de berørte Svelte-/byggkontrollene og databaseflytene kjørt på nytt. Domenemodellene som ble kontrollert av de 311 testene er uendret.

Øving 5s faktiske kodeutdrag er dessuten satt inn i et midlertidig Express-prosjekt: POST/GET, JSON-fil og omstart; kontrollert feil før skriving med `push` og `nyListe`; normal lagring etter reparasjon; oppstart uten fil; og stopp ved ødelagt JSON uten å overskrive filen. Alle kontrollene består.

## Nettleserprøving

Chromium/Playwright mot produksjonsbygget og prosjektets API, med isolert SQLite-database, syntetiske kontoer og en modellstub. Ingen faktiske elevdata eller skolens driftssystem ble brukt.

- **Øving 5:** fem åpne deler med synlig kode, eksempel/forklaring/prøv selv, tastaturkopiering, nedlasting, hopplenke og Labpartnerens kontekstkontrakt. «Vis meg hvor» og Escape er prøvd med berøringshendelser.
- **Øving 6:** PATCH og etterfølgende GET, DELETE med ukjent ID (404), lagringsfeil (500) og nye forsøk.
- **Øving 7:** tom tekst, 500/501 tegn, tallverdi, ugyldig JSON, lagringsfeil, synlig kode og nye forsøk.
- **Finn utstyr:** tre bestillinger, feil og retting, fokus ved inspeksjon og oppdragsbytte, utdatert resultat etter endring, gjenåpning og Labpartner.
- **Dataverkstedet:** testdata på begge sider av 500-grensen; retting av én og begge datatyper; flere gyldige feltmodeller; lagrede forsøk; bokmerke; tilbakeknapp og Labpartner.
- **Kodeoppgaven:** ZIP-nedlasting, fire steg, fokus etter stegbytte, konkret feilhjelp og Labpartner.
- **Lagring og profil:** atskilte forsøk ved profil-/modusbytte, skadet lokal lagring og ny lagring etter retting. Aktiviteten virker også med blokkert lokal lagring og utilgjengelig API; lagringsproblemet blir forklart.
- **Visning:** de seks sidene ovenfor på 320 og 1440 px, lyst og mørkt tema, temabytte og 200 % tekstforstørrelse. Ingen vannrett rulling av selve siden i disse visningene. Skjermbilder av øving 5 og verkstedet er også gjennomgått.
- **Tilgjengelighet:** axe-kontroll med WCAG 2/2.1/2.2 AA-regler i 24 kombinasjoner av side, tema og bredde, uten registrerte avvik. Dette er en avgrenset automatisk kontroll, ikke dokumentasjon av full WCAG-samsvar. Ingen JavaScript-feil ble registrert i de prøvde flytene.

## Pedagogisk vurdering og videre utprøving

I øving 5 følger eleven et kort kodeeksempel, leser hva det gjør og tester det i egen chat. Den faktiske HTTP-responsen, meldingslisten og filen viser resultatet. Læreren kan undersøke forståelsen ved å be eleven forklare hvorfor `catch` ikke angrer `push`, og bruke samme lagringsprinsipp på en ny liste uten ferdig oppskrift.

I Utstyrsboden endrer eleven filter, testdata, datatype eller feltvalg og undersøker dokumentene som blir funnet. Responsen knytter resultatet til en konkret betingelse eller verdi. Overføring prøves i egen MongoDB-kode og i en ny samling med supporthenvendelser. Bokmerke, gjennomført handling, funksjonstest og vurdert forståelse er fortsatt forskjellige ting; klikk gir ikke faglig godkjenning.

Kontrollen viser teknisk funksjon. Elevenes forståelse, motivasjon og opplevelse av enkelhet må undersøkes i undervisningen. Skolens MongoDB-installasjon og lokale KI-modell er ikke prøvd her. Startprosjektet er kontrollert gjennom kode-/arkivtester og driverstub; modellstubben bekrefter API og kontekst, ikke kvaliteten på modellens veiledning. Se [databasemodulen](databasemodul.md), [øving 5](oving-5-lagring.md) og [Labpartnerens faglige prøve](labpartner-kvalitetsprove.md).

Svelte MCP var ikke tilgjengelig. Offisiell Svelte-dokumentasjon, prosjektets lokale Svelte-kontroll og nettleserprøving er brukt. Merge til `main` er ikke i seg selv en bekreftelse på at skolens server er oppdatert.
