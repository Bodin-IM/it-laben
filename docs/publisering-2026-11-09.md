# Kontroll av dev mot main – 9. november 2026

Grunnlag: main `1fec0ad` og dev `f2043c0`. Lokal sammenslåing hadde samme filinnhold som dev, uten konflikter. Kontrollen omfatter kodeeksemplene og de samlede endringene i Nettverksligaen: dokumentasjon, automatisk lagring, felles ping, innstillingspanel, enhetsflytting og kabelvisning.

## Utførte kontroller og rettinger

- Full testsuite kjørte 356 tester. 354 bestod; én feilende deltest og dens overordnede test stod for to feilmarkeringer. Deltesten forventet 404 for en enhet fra et annet rom. API-ets eksisterende kontrakt gir 409 når enheten ikke finnes i det aktuelle rommet. Forventningen er rettet; alle 15 tester i `vlanTogetherApi.test.js` bestod etterpå. Serverens tilgangskontroll er ikke endret.
- Svelte-sjekken avdekket for snever type for dra-tilstanden og bruk av `conflict` før deklarasjonen. Tilstandens uniontype er nå angitt i `$state`-initialiseringen, og `conflict` er deklarert før statusen som bruker den.
- En gjenværende feil i genererte rutetyper skyldtes at den lokale `node_modules`-mappen var en lenke til en annen utsjekking. Egne lokale avhengigheter rettet typeoppløsningen uten endring av prosjektkonfigurasjon eller pakkeversjoner.
- Avsluttende `npm run check`: null feil og én advarsel om ubrukt `.row input` i Nettverksligaen.
- `npm run build` bestod med rettingene i Svelte-komponentene og skrev det statiske nettstedet.
- Alle tolv kodeutdrag ble kontrollert for gyldige linje-ID-er og rekkefølge, riktig endpoint/funksjon og hele blokker. Frontendutdragene beholder meldingslisten. De eksisterende katalogtestene kompilerte de komplette Svelte-eksemplene og prøvde servereksemplenes request-/respons- og lagringsflyt.
- Kildekode, samlet diff og `git diff --check` er gjennomgått. Svelte MCP er ikke tilgjengelig i miljøet.

## Nettleserkontroll som gjenstår

Nettleserprøving ble forsøkt, men kunne ikke gjennomføres i dette miljøet. Lokal Chromium ble stoppet med `socket() failed: Operation not permitted`. Den delte nettleseren startet, men kunne ikke nå den lokale testserveren (`ERR_CONNECTION_REFUSED`). En separat lokal HTTP-klient kunne heller ikke nå serveren fra en annen kommandosesjon. Ingen bestått nettleserprøving av denne versjonen hevdes.

Prøv særlig standardutdrag/helvisning, linjeforklaring og kopiering; tannhjul og fokusretur; kabler, draing, plassbytte og Flytt-knappen; automatisk lagring og felles ping i to elevfaner. Kontroller smal skjerm, tastatur, berøring, tekstzoom, begge temaer og redusert bevegelse. Eksisterende kontroll fra 5. november dekker ikke disse nye flytene. Belastning med 24 deltakere og elevutprøving gjenstår også.

## Faglig gjennomgang og drift

Kodeeksemplene gir korte innganger til sammenhengende frontend-/backendkode og forklaringer ved behov. Eleven kan forklare og tilpasse eksemplet i eget prosjekt. Nettverksligaen lar eleven avtale, konfigurere, dokumentere og undersøke kommunikasjon; ping viser funksjon og returvei. Forståelse må fortsatt undersøkes gjennom elevens forklaring og et nytt oppsett med mindre støtte, som beskrevet i aktivitetsdokumentasjonen. Klikk, kopiering eller vellykket ping er ikke alene dokumentasjon på forståelse eller læringseffekt.

Frontend og backend må oppdateres sammen. Start API-et på nytt etter oppdateringen, slik at migrasjonene for områdedokumentasjon og ping og den nye flyttekommandoen tas i bruk.
