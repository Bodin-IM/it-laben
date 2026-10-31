# Publiseringskontroll: Backend og felles elevflyt

Kontrollen omfatter de 16 commitene fra `main` (`7b1354c`) til `dev` (`33ec889`), og rettelsene beskrevet nedenfor. Utgangspunktet er Backend-forløpet, elevrespons, Labpartneren, nøkkelgjenoppretting og de samtidige endringene i fagoversikt og VLAN-labene.

## Rettet før merge

- Seks typefeil og to Svelte-advarsler: typedeklarasjon i øvingsresponsen, nullsjekk i elevresponsen, reaktiv forutsigelse i Redd chatten, programmatisk fokus på prosjektoppgaven og ubrukt VLAN-stil.
- En utdatert test forventet tre læreropplegg og veiledninger; katalogen har nå fem.
- Nettleserkontrollen fant manglende tastaturrulling i kodeeksemplet, ugyldig skjermlesermerking på serverindikatoren og for svak kontrast på etiketten i valgt reparasjon. Kode- og datafeltene kan nå fokuseres og rulles med tastaturet; indikatoren har en eksplisitt rolle og etiketten bruker temaets tekstfarge.
- Ekstra blanke linjer ved filslutt er fjernet fra den samlede diffen.

## Teknisk kontroll

- Node 24, avhengigheter installert med `npm ci`.
- Hele `npm test`: 292 tester, hvor 291 bestod direkte. Etter at antallet læreropplegg ble rettet, bestod også den ene berørte testen ved avgrenset ny kjøring. Senere rettelser endrer tilgjengelighetsmerking og stil, ikke domenelogikken.
- `npm run check`: 0 feil og 0 advarsler på den ferdige koden.
- `npm run build`: produksjonsbygg bestod på den ferdige koden.
- `shellcheck server/deploy/*.sh`: bestod.
- `git diff --check` mot publisert main: bestod.

## Nettleserprøving

Prøvd med Chromium og Playwright mot produksjonsbygget og det virkelige API-et, med isolert SQLite-database, syntetiske elev- og administratorkontoer og en kontrollert modellstub. Ingen faktiske elevdata eller skolens driftssystem ble brukt.

- Øving 5–10: to oppgaver i hver øving, gjennomgang av kjøringen, konkret resultat/årsak/neste forsøk, tilbake til forrige steg og endring av input. Gammel slutrespons fjernes. Prosjekthjelpen kan åpnes med tastatur.
- Fagsjekk: feil svar gir konkrete øvingslenker, ordinær ventetid beholdes, og resultatet med øvingslenker finnes fortsatt etter omlasting.
- Valideringsforløpet: lenke fra øving 7 til tekstreparasjonen, forutsigelse og sammenligning med faktisk kjøring. Redd chatten er også prøvd med feil startkode, gyldig reparasjon, bekreftet serverlagring, en utestet endring og gjenoppretting av lagret kode.
- Labpartneren: «Vis meg hvor», fokus på riktig område, Escape, bevart spørsmål ved lukking og gjenåpning, og visning av svar fra modellstubben.
- Frivillig elevrespons og kommentar: sendt med berøringshendelser og lest i administratoroversikten.
- Ny elevnøkkel: nedlasting og bekreftelse kreves før aktivering. Ny nøkkelfil ga innlogging på samme profil etter at den gamle økten var avsluttet; progresjon og XP var uendret.
- VLAN 1 og 2: lærerforhåndsvisning, feilrespons, knapper til riktig innstilling og lukking av resultatdialogen. Et gyldig VLAN 1-oppsett ble kontrollert uten å lagre bestått som elevresultat.
- Fagoversikt og Backend-oversikt, søk etter validering, 320/390 px mobilvisning, 1440 px desktop, begge temaer, hopplenke, fokus og 200 % tekstforstørrelse. Ingen vannrett rulling av selve siden i de kontrollerte visningene; nettverkskart og kode kan rulles i egne områder.
- Avgrenset axe-kontroll av øvingssiden, Redd chatten og VLAN-resultatdialogene. De tre funnene ble rettet og berørte visninger kontrollert på nytt uten regelbrudd. Skjermbilder ble også gjennomgått. Ingen JavaScript-feil ble registrert i de prøvde flytene.

## Pedagogisk vurdering og gjenstående utprøving

Eleven undersøker hva kode og data gjør, reparerer en feil og bruker prinsippet i egen chat. Responsen beskriver hva som skjedde, hvorfor og hva som kan prøves videre. Lærer eller medelev kan undersøke forståelsen ved å be eleven velge nye gyldige og ugyldige requests, vise data før og etter og forklare kontrollen som stopper feilen. Gjennomgang, bestått funksjonstest og forståelse er fortsatt ulike typer informasjon.

Kontrollen dokumenterer teknisk funksjon, ikke læringseffekt. Brukbarhet og faglig verdi prøves videre i den ordinære undervisningen. Skolens faktiske lokale KI-modell var ikke tilgjengelig; kvaliteten på dens svar må fortsatt vurderes med opplegget i [Labpartnerens faglige prøve](labpartner-kvalitetsprove.md). Svelte MCP var ikke tilgjengelig; prosjektets lokale Svelte-kontroll og nettleserprøving er brukt.
