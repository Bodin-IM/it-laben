# Publiseringskontroll: modulvisning og Backend sammen

Kontrollert 4. november 2026 før merge av `dev` til `main`. Grunnlaget er `main` på `1f32d55` og `dev` på `c65970e`, inkludert kompakt modulvisning (`3633362`) og første utkast av Backend sammen. Kontrollen bruker den samlede, konfliktfrie mergeversjonen med rettelsene nedenfor. Labpartner-faneikonet fra main beholdes.

## Rettelser

- Simulatorens nullable rom- og svartilstand har eksplisitt type på startverdien i `$state`. Dette retter seks Svelte/TypeScript-feil uten å endre spillogikken.
- Simulatorens kode- og JSON-felt kan fokuseres og rulles med tastatur. En mobilkontroll fant at GET-koden ellers manglet tastaturtilgang til vannrett rulling. Feltene har navn og synlig fokus, etter mønsteret i eksisterende kodekomponenter.
- Katalogtesten godtar at en utviklingsaktivitet er tilgjengelig som modulsteg eller som lenket ekstraressurs. Backend sammen ligger allerede under Ressurser og repetisjon; testen krever fortsatt at hver aktivitet faktisk kan finnes i modulen.

## Teknisk kontroll

- Node 24.22.1 og installerte avhengigheter som samsvarer med prosjektets uendrede lockfil.
- Full `npm test`: 318 tester, hvor én eldre katalogforventning først feilet. Etter rettingen består alle fire tester i den berørte filen. De øvrige 317 resultatene gjenbrukes; ingen domenelogikk er endret etter fullkjøringen.
- `npm run check`: 0 feil og 0 advarsler etter rettelsene.
- `npm run build`: produksjonsbygg består etter rettelsene.
- `git diff --check`: består.
- Svelte MCP var ikke tilgjengelig. Offisiell dokumentasjon for `$state` og typer, prosjektets lokale kontroll og nettleserprøving er brukt.

## Nettleser og API

Chromium 141/Playwright mot produksjonsbygget og det faktiske lokale API-et, med isolert SQLite-database og syntetiske kontoer. Ingen elevdata eller skolens driftssystem er brukt.

- Begge modulene: direkte åpning med tastatur uten utfelling, separat Info med Enter/mellomrom og berøring, tilbakevei og skjult læreradministrasjon for elever.
- Lærerens synlighetsmeny: automatisk lagring, avbrutt nettverkskall uten falsk lagringsbekreftelse, innhenting av lagret status, revisjonskonflikt og nytt vellykket valg.
- Tre separate nettleserprofiler: lærer oppretter rom; elever blir med; ugyldig JSON og retting; publisering; GET, visning av felt, gammel respons etter endring og 404; POST med for stort antall (409) og vellykket reservasjon (201).
- Tapt svar etter en faktisk lagret POST: samme forespørsel forsøkes på nytt og returnerer kvitteringen uten å reservere dobbelt. Frontendkortet beholder sitt merkede øyeblikksbilde til ny henting.
- Utdatert backendutkast etter reservasjon, innhenting av lagret oppsett, pause/fortsett, bevaring av lokale tekstfelt under polling og gjenåpning av rom etter omlasting.
- Kontobytte mens et HTTP-svar holdes igjen: gammel respons og romdata blir ikke vist hos den nye brukeren.
- Tastaturbetjening av arbeidsområde, hjelp og vannrett rulling i kodefelt. Begge moduler og simulatoren er kontrollert ved 320 og 1440 px, lyst/mørkt tema og 200 % tekstforstørrelse. Ingen vannrett rulling av hele siden i de prøvde visningene. Utvalgte skjermbilder er gjennomgått.
- Axe med WCAG 2/2.1/2.2 AA-regler: ingen registrerte avvik i de 12 kombinasjonene av side, tema og bredde etter rettingen. Dette er en avgrenset automatisk kontroll, ikke en full samsvarsvurdering. Ingen JavaScript-feil i de prøvde flytene.
- API-testene dekker medlemskap, eierskap, Origin/CSRF, feilkoder, samtidighet, gjentakelsessikring, pause og database-/API-omstart, samt avgrenset Labpartner-kontekst.
- Lokal belastningsprøve med aktive hastighetsgrenser: 24 API-klienter, 240 statuskall i ti samtidige runder; median omtrent 18 ms, 95-persentil 22 ms og maksimum 27 ms. Deltaker 25 avvises. Av 23 samtidige reservasjoner av åtte PC-er fikk åtte 201 og femten 409; lageret endte på null. Dette er ikke en kapasitetsmåling av skolens server eller nettverk.

## Pedagogikk og videre bruk

Modulvisningen gir innholdet førsteplass, direkte aktivitetslenker og utdyping ved behov. Den endrer ikke oppgavenes læringsmål, XP eller vurdering. Utprøving med elever må avklare om de finner riktig aktivitet og hjelp lettere.

I Backend sammen publiserer eleven et endepunkt, sender faktiske HTTP-kall til en medelev og følger JSON til frontend. Statuskode, respons og dataendring gir grunnlag for neste forsøk. Handlingsmarkeringene er ikke vurdering av forståelse. Læreren undersøker forståelsen gjennom forklaring og den nye Express-oppgaven med garderobedata i [aktivitetsbeskrivelsen](backend-simulator.md). Kompetansemål, forkunnskaper og avgrensninger står der. Ingen elevutprøving eller læringseffekt er dokumentert her.

Frontend og API må oppdateres sammen. Migrasjon `016_backend_simulator.sql` kjøres ved API-oppstart. Skolens installasjon, lokale KI-modell og langvarig rombruk er ikke prøvd; romadministrasjon og retensjon er fortsatt beskrevet som videre arbeid. Merge til main bekrefter kildekoden, ikke at skolens server har hentet og startet den nye versjonen.
