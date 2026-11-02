# Offentlig versjon av IT-laben

Testbranchen `public-version` lager en vanlig statisk nettside som fungerer uten tilgang til skolebackend. Skoleutgaven og den offentlige utgaven bruker de samme Svelte-komponentene, undervisningssidene og simuleringsmodellene. Byggemodus velger hvilke tilkoblede funksjoner som er tilgjengelige.

Branchen er opprettet fra `main` ved `1f32d552230bc18564da7efb5cd67d5af57bd14f`. Selve Pages-publiseringen er utsatt. Endringen legger ikke til en Pages-workflow eller endrer skolens publiseringsoppsett.

## Prøve versjonen

Kommandoene kjøres fra prosjektmappen. Bruk Node.js-versjonen prosjektet krever, minst 24.17.0, og installer avhengighetene med `npm ci` ved første oppsett.

```bash
git switch public-version
npm run dev:public
```

For å prøve ferdigbygde filer:

```bash
npm run build:public
npm run preview:public
```

Åpne adressen terminalen viser. `build-public/` inneholder de ferdige HTML-, JavaScript- og CSS-filene og undervisningsnedlastingene. Denne katalogen er distribusjonen; en statisk vert trenger ingen Node-prosess, Express-server eller database for å vise den. Nettleseren må kunne hente nettsiden fra verten. Det er ikke lagt til en service worker eller en installert klient.

Vanlige `npm run dev`, `npm run build` og `npm run preview` velger fortsatt skoleutgaven. Den bygges til `build/`.

### Adresse med prosjektsti

En framtidig prosjektadresse kan ligge under for eksempel `/it-laben/`. Bygg og forhåndsvis med samme sti, uten avsluttende skråstrek i variabelen:

```bash
ITLAB_BASE_PATH=/it-laben npm run build:public
ITLAB_BASE_PATH=/it-laben npm run preview:public
```

I PowerShell settes variabelen før kommandoene:

```powershell
$env:ITLAB_BASE_PATH = '/it-laben'
npm run build:public
npm run preview:public
Remove-Item Env:ITLAB_BASE_PATH
```

Prefikset bygges inn i lenker, klientnavigasjon, modulaliaser og ressursadresser. Filene i `build-public/` monteres på den valgte stien; det skal ikke legges til en ekstra `it-laben`-undermappe inni selve distribusjonen. For publisering på domenets rot lar man variabelen være usatt eller tom.

Alle kjente sider forhåndsbygges som kataloger med `index.html`. Direkte åpning og omlasting av disse sidene krever derfor ingen generell SPA-omskriving. En ukjent adresse får foreløpig vertens vanlige 404-side.

## Hva eleven kan bruke

| Funksjon | Offentlig utgave |
| --- | --- |
| Backend og Databaser | Åpne moduler med de samme undervisningssidene og øvingene som i skoleutgaven. |
| Lokale kodeeksempler og simuleringer | Forsøk, stegvis forklaring og lokal respons. Eksempeldata er del av undervisningen. |
| Redd chatten, Meldingsdetektiven og To nettlesere, én chat | Lokale spill og tilbakemeldinger uten ordinær XP. |
| Databasemodul | Lokale modeller, nettleserlagret arbeidsstatus og nedlasting av startprosjekt. Arbeid med elevens egen MongoDB krever fortsatt at eleven har en slik database. |
| VLAN 1 og VLAN 2 | Lokal kontroll og gjenoppretting av sist beståtte oppsett. Seks lokalt beståtte VLAN 1-oppdrag åpner VLAN 2. |
| Tutorial, Sidehjelp og «Vis meg hvor» | Lokal hjelp. Veiviseren vises på sider som har registrerte kontroller. |
| Tema, lyd og figurinnstillinger | Lokale innstillinger i nettleseren. |
| Konto, skoleprogresjon, XP og toppliste | Brukes i skoleutgaven. Offentlige direkteadresser viser en forklaring. |
| Fagsjekker og Nattevakten | Krever skoleutgaven. Den offentlige siden oppretter ikke lokale vurderingsforsøk. |
| KI, lærerpanel og elevtilbakemeldinger | Krever skolens tjenester og er ikke tilgjengelige i offentlig utgave. |

Forklaringer av sessions, innlogging, HTTP og backend inne i undervisningen er fortsatt tilgjengelige. Disse simulerer faglige situasjoner og er adskilt fra elevens innlogging i IT-laben.

## Moduler og oppdateringer

Den offentlige moduloversikten kommer fra [`src/lib/publicModules.js`](../src/lib/publicModules.js). Listen inneholder eksplisitt `backend` og `databaser`. Den er klar allerede i den forhåndsbygde HTML-en, så siden venter ikke på `/api/modules`.

Skolens lærerpanel styrer fortsatt status i skolebackend. En slik endring slår ikke automatisk gjennom på den offentlige nettsiden. Offentlige moduler vises som **Åpen modul**, slik at de ikke framstår som klassens aktive undervisningsmodul.

Ved nytt eller endret innhold:

1. Rediger de vanlige sidene, modellene og moduldataene i repoet.
2. Legg en ny modul til i `publicModules.js` når den skal vises offentlig. En ukjent modul får kommende status som standard.
3. Bygg offentlig utgave med riktig adresseprefiks, og kontroller modul, oppgaver og nedlastinger.
4. Publiser de nye filene samlet når ekstern publisering senere er satt opp.

Elevene trenger ingen klientoppdatering. De får den publiserte versjonen når nettsiden lastes på nytt. En fane som allerede er åpen kan fortsatt vise den gamle versjonen til den lastes om. Senere kan bygging og publisering automatiseres fra GitHub; det inngår ikke i denne branchen.

Modulstatus styrer navigasjon, ikke fortrolighet. Alt som følger med den statiske distribusjonen må regnes som offentlig, også kode og innhold som ikke vises i en meny. Materiale som skal holdes tilbake må utelates fra distribusjonen, ikke bare skjules i grensesnittet.

## Lokal progresjon og begrensninger

Databasemodulen beholder sin lokale arbeidsstatus. VLAN-oppgavene lagrer sist beståtte konfigurasjon under en egen offentlig lagringsnøkkel, `it-laben-public:network:v1:`. Ved gjenoppretting kontrolleres konfigurasjonen på nytt med den samme lokale modellen. Et gammelt lagret «bestått»-flagg brukes ikke alene som bevis.

VLAN lagrer beståtte oppsett; uferdige endringer i et oppsett bevares bare mens siden er åpen. Ved blokkert eller full lokal lagring vises et varsel, og oppsettet kan brukes i minnet under besøket. Omlasting kan da miste den nye statusen.

Lokal status hører til nettleserprofilen og nettstedets origin. Elever som deler nettleserprofil på samme adresse deler også gjestestatus. Bytte av nettleser eller adresse, privat nettlesing og sletting av nettstedsdata kan gjøre at statusen ikke følger med. Det er ingen kobling mellom denne lokale statusen og en skolekonto, ingen synkronisering til skolebackend og ingen gjenoppretting fra skolens backup.

Alle aktivitetene får ikke automatisk lagring av hele arbeidsøkten. De eksisterende lokale modellene beholder sine egne lagringsregler. Bestått funksjonstest viser hva løsningen gjør i de prøvde situasjonene; den er ikke i seg selv en vurdering av elevens forståelse. Bruk de eksisterende forklarings- og overføringsoppgavene i [det pedagogiske grunnlaget](pedagogisk-grunnlag.md), [backendmodulen](moduler.md) og [databasemodulen](databasemodul.md).

## Teknisk avgrensning

- `src/lib/deployment.js` leser Vites byggemodus. Den offentlige utgaven forsøker ikke å gjette om skolebackend er tilgjengelig ut fra nettverket eleven er på.
- API-laget, KI-klienten og tilkoblingskontrollen stopper skolekall i offentlig modus. Konfigurasjon og HTTPS-tilkobling til skolen sonderes ikke.
- Vites API-proxy er slått av i både offentlig utvikling og forhåndsvisning. Testing lokalt skal derfor ikke lykkes bare fordi en skolebackend tilfeldigvis kjører på maskinen.
- `src/lib/sitePaths.js` legger til publiseringsprefikset ved navigasjon og fjerner det ved sammenligning med de kanoniske innholdsstiene. Faglige kodeeksempler og simulert API-trafikk beholder sine opprinnelige adresser.
- SvelteKit 3 laster konfigurasjonen på nytt i prerenderarbeidere med `process.env.MODE`. `vite.config.js` viderefører den valgte Vite-modusen til disse arbeiderne, slik at katalog, utmappe og adresseprefiks er like under hele byggingen.
- Det er ikke lagt til avhengigheter. Byggemodusene bruker samme låsefil.

## Kontroll før levering

Kontrollert 2. november 2026 med Node.js 24.22.1 og Chromium 153. Nettleserprøvene brukte en enkel statisk HTTP-server uten API eller Vite-proxy.

| Kontroll | Resultat |
| --- | --- |
| Full `npm test` | 322 tester bestått, ingen feil eller hoppede tester. |
| Berørte tester etter siste retting av delt hjelpetekst | 26 tester bestått for tutorial, labpartnerprotokoll, offentlig katalog, lokal VLAN-lagring og lenkeprefiks. |
| `npm run check` etter siste kodeendring | 0 feil og 0 advarsler. |
| `npm run build:public` | Bestått, utmappe `build-public/`. |
| `ITLAB_BASE_PATH=/it-laben npm run build:public` | Bestått, med samme prefiks i prerendering, navigasjon og ressurser. |
| `npm run build` | Skoleutgaven bygger fortsatt til `build/`. |
| `npm run preview:public` | Starter og leverer den offentlige forsiden med HTTP 200. |
| Direkte sider og aliaser | Alle 38 ruter åpnet i nettleser på både roten og `/it-laben/`. |
| Modul → oppgave → modul | Backend og Databaser åpner, og klientnavigasjonen beholder riktig base. |
| Tutorial | Mellomrom gir 201 før retting og 400 med `trim()`, vanlig melding gir 201, og endrede valg markerer gammelt resultat. |
| Databasesøk | Korrekt filter gir riktig resultat, endring markerer gammelt resultat, og filter/forsøk gjenopprettes ved omlasting. |
| Sidehjelp og innstillinger | Faste tips, «Vis meg hvor» på databasesiden, tema og lyd fungerer. Tema og lydvalg overlever omlasting. Ingen KI-knapp vises. |
| Nedlasting | Startprosjektets ZIP lastes ned med riktig navn og gyldig ZIP-signatur. |
| Skolefunksjoner | Direkte adresser til Min lab, toppliste, lærerpanel, kom-i-gang og Nattevakten viser riktig forklaring. |
| Smale skjermer og input | 320 og 390 CSS-piksler, begge temaer, meny med Enter/Escape og berøring. Ingen vannrett sideoverflyt på de prøvde felles sidene. |
| Forstørret tekst | 200 % rottekststørrelse på forside og backendmodul uten vannrett sideoverflyt. Skjermbilder gjennomgått. |
| Nettverk under prøvene | Ingen API-kall, skoleprober, 404-svar, JavaScript-feil eller mislykkede forespørsler i de gjennomførte flytene. |

VLAN 1 og VLAN 2 ble i tillegg prøvd i egen nettleserprofil: feil oppsett, retting gjennom faktiske UI-felt, bestått kontroll, neste oppgave og omlasting i første oppgave i hver lab. Fem kontra seks beståtte VLAN 1-oppdrag ga riktig adgang til VLAN 2; de øvrige oppsettene i denne gateprøven var modellvaliderte testdata. Injisert full lagringskvote ga et tydelig varsel, brukbar minnetilstand og korrekt gjenoppretting fra det som faktisk var varig lagret.

En separat filkontroll fant ingen manglende mål blant 755 lokale ankerreferanser, 1 942 HTML-ressursreferanser og 463 relative JS-importreferanser i prefiksbygget. Distribusjonen inneholdt ingen serverdatabase, kontofiler, sertifikater eller faktiske miljøfiler. Startprosjektets `.env.example` inneholder kun et lokalt MongoDB-eksempel.

Dette er teknisk utprøving, ikke brukertesting med elever eller en full tilgjengelighetsrevisjon. Alle elleve VLAN-oppdrag er modelltestet, men bare første oppgave i hver lab er løst manuelt gjennom nettlesergrensesnittet i denne prøven. Svelte MCP var ikke tilgjengelig; kontrollen brukte prosjektets tester, Svelte-sjekk, installert Kit-kode og den offisielle [adapterdokumentasjonen](https://svelte.dev/docs/kit/adapter-static).

GitHub Pages, offentlig HTTPS/domene, vertens cacheinnstillinger og en faktisk ekstern utrulling gjenstår når publiseringsmåten er valgt.
