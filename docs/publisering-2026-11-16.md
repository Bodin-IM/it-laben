# Kontroll av dev før main · 16. november 2026

Omfang: `3505abe` (tilbakemeldinger på alle sider) og `70e5859` (øving 7 og tre kodeeksempler), sammenlignet med main `c92985d`.

## Lokal kontroll

- Hele testsuiten: 361 av 361 bestod.
- Svelte-sjekk: null feil. En ny ubrukt CSS-regel i `ValidationProject` er fjernet; komponenten er deretter kompilert for klient og server uten advarsler. Den eksisterende advarselen om `.row input` på VLAN-samarbeidssiden er utenfor endringen.
- Produksjonsbygget bestod etter CSS-rettingen.
- Diff, kodeeksemplenes svarformater og dokumentasjon er gjennomgått. Svelte MCP er ikke tilgjengelig.

## Nettleserprøving

Den lokale Chrome-prosessen ble stoppet ved oppstart (`socket() failed: Operation not permitted`). Den delte nettleseren kunne heller ikke nå forhåndsvisningen. Installasjon av Playwrights separate headless-nettleser feilet med en ugyldig nedlastingsfil. Disse forsøkene dokumenterer ingen bestått nettleserprøve.

En gjentakbar nettleserkontroll er lagt i `tests/browser-smoke.mjs` og GitHub Actions. Den bruker produksjonsbygget, ekte lokal API og en midlertidig database med oppdiktede profiler. Den kontrollerer øving 7, de tre eksempelkortene og begge kodefiler, linjeforklaringer, tastaturfokus, kopiering, direktelenker og tilbakevei. Den prøver manuell innsending som gjest, elev, lærer og admin, admininnboksen og spørsmål etter 30 sekunders lesing med avslått labpartner. Skjermbredder 1440/390/320, begge temaer, emulert berøring og 200 prosent tekst inngår. Bilder og resultat lagres som et kortvarig Actions-artefakt.

Nettleserkontrollen må bestå før merge. Kommandolinje lokalt: `npm ci`, `npm run build`, `npx playwright install chromium`, `node tests/browser-smoke.mjs`.

## Pedagogisk oppfølging

Eleven tester input og feilbehandling i egen chat. HTTP-svar, synlige beskjeder og data før/etter brukes til å undersøke funksjon. Læreren følger opp forklaringer av kontrollrekkefølge, POST/PATCH og svarformat, og en valgfri oppgave med visningsnavn undersøker anvendelse med mindre støtte. Tilbakemeldingsskjemaet måler erfaringer med IT-laben, ikke faglig forståelse. Ingen XP- eller vurderingsregler er endret.

Utprøving med elever, fysisk berøringsutstyr og skjermleser gjenstår. Automatiske tester og skjermbilder er ikke en full tilgjengelighetsrevisjon eller dokumentasjon på læringseffekt.
