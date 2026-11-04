# Backend sammen – første utkast på dev

En samarbeidsaktivitet for Vg2 informasjonsteknologi på `/spill/backend-simulator/`, lenket fra Backend-modulen og aktivitetskatalogen. Elevene planlegger en LAN-kveld med hver sin tjeneste. Hver elev lager både backend-endepunkter og forespørsler fra frontend. Dette er avgrenset øving før elevene lager egne tjenester.

## Første gjennomføring

1. Logg inn med lærer- eller administratorkonto. Velg en rolle, navngi rommet og opprett det. Læreren får også en server for demonstrasjon.
2. Elevene logger inn med egne IT-laben-kontoer, velger roller og skriver inn romkoden. Ett rom har plass til 24 deltakere inkludert læreren. Bruk flere rom ved behov.
3. Fordel utstyr, program, påmelding og kiosk. Flere elever kan ha samme rolle; fordel ulike roller i hver samarbeidsgruppe. Bruk bare oppdiktede data, fordi forespørsler og svar vises i rommets trafikklogg.
4. Elevene undersøker JSON-startdataene og Express-eksempelet i **Min backend**. De kan endre data og GET-adresse og publisere endepunktet.
5. Elevene velger GET på en annens serverkort, forutsier svaret og sender fra **Min frontend**. De velger ett felt i svaret og viser det i sitt frontendkort.
6. Utstyrsansvarlig aktiverer POST for reservasjoner. En annen elev sender `{ "antall": 1 }`. Sammen undersøker de 201-svaret og sender GET på nytt for å se at `pcLedige` er redusert.
7. Be elevene sende et for stort antall og forklare 409-svaret. La to elever forsøke å reservere den siste PC-en, og sammenligne svarene.
8. Læreren kan sette rommet på pause for en felles forklaring. Tidligere oppsett og svar kan fortsatt leses. Rommet finnes igjen under **Fortsett i et rom** etter omlasting eller innlogging på nytt.

Avsett eksempelvis 10 minutter til felles eksempel, 20 minutter til samarbeid og 10 minutter til forklaring og ny anvendelse. Dette er et lokalt forslag som må tilpasses gruppen.

## Mål og forkunnskaper

Eleven skal kunne forklare sammenhengen mellom metode, adresse, JSON, statuskode og det frontend viser; teste et API med gyldige og ugyldige forespørsler; og beskrive hvorfor frontend må hente nye data etter at backend er endret.

Forkunnskaper: JavaScript-objekter, grunnleggende JSON og introduksjon til GET/POST. Bruk **Frontend møter backend** først ved behov. Startdata og kodeeksempel gir støtte; rå serverkode kan ikke kjøres i simulatoren.

Læreplantilknytningen følger [ITK02-01 i fulltekst](laereplan/ITK02-01.md) og [IT-labens arbeidsgrunnlag](laereplangrunnlag.md). Referansene nedenfor er lokale henvisninger, ikke offisielle Udir-koder.

| Programfag og mål | Kompetansemålets ordlyd | Avgrenset arbeid i aktiviteten |
| --- | --- | --- |
| Utvikling, UTV-08, hovedmål | «anvende relevant testmiljø og utføre testing tilpasset IT-løsningen som utvikles» | Prøve en faktisk HTTP-tjeneste med gyldige og ugyldige input, undersøke samtidige reservasjoner og dokumentere resultatet. Fullstendig teststrategi for egen løsning krever videre arbeid. |
| Utvikling, UTV-04, hovedmål | «gjøre rede for hensikten med teknisk dokumentasjon og utarbeide teknisk dokumentasjon for IT-løsninger» | Skrive en liten API-beskrivelse som en medelev kan bruke, med metode, adresse, JSON-eksempel og feilsvar. Dokumentasjonen lages utenfor simulatoren. |
| Driftsstøtte, DRS-05, støttemål | «utforske og beskrive relevante nettverksprotokoller, nettverkstjenester og serverroller» | Utforske HTTP og skillet mellom klient og server. De fire spillrollene er ansvarsområder i scenarioet, ikke fire nettverksprotokoller eller egne operativsystemroller. |

Samarbeid og muntlig forklaring konkretiserer IT-støtte og kommunikasjon. Sammenkoblingen av tjenester støtter løsningsarkitektur og systemutvikling. Elevene leser kode og skriver teknisk dokumentasjon. Bruk av oppdiktede data gir et konkret utgangspunkt for å diskutere hvilke data en tjeneste bør dele.

## Elevhandlinger og respons

| Situasjon | Elevens arbeid | Systemets respons | Neste forsøk |
| --- | --- | --- | --- |
| Publisere | Velge GET-adresse og redigere et JSON-objekt | Serverkortet viser det publiserte endepunktet; kodeeksempelet viser samme GET-adresse og JSON | Bytt feltnavn eller verdi og undersøk hva klienten må endre |
| Hente | Velge en annen tjeneste og sende GET | Faktisk HTTP-status, JSON-svar og trafikk mellom avsender og mottaker | Sammenlign forutsigelsen med svaret |
| Vise | Velge et enkelt felt fra eget vellykket GET-svar | Frontendkort med verdi, kilde og hentetidspunkt | Endre backend og forklar hvorfor kortet fortsatt viser gammel verdi |
| Reservere | Sende POST med `antall` til utstyrsrollen | 201 og redusert lager, 400 ved ugyldig input eller 409 ved for lite lager | Hent gjeldende lager og endre antallet |
| Feilsøke | Prøve feil adresse eller metode | 404 eller 405 med en konkret forklaring | Sammenlign med publisert serverkort og endre én ting |
| Samtidighet | To klienter prøver å reservere samme siste PC | Bare tilgjengelig antall kan reserveres; øvrig forsøk får 409 | Forklar hvorfor lesing og endring må kontrolleres samlet |

Formatet gir eleven en medelev som faktisk trenger dataene og gjør konsekvensen av en forespørsel synlig. Det er ingen konkurranse, tidsfrist, poengtrekk eller nye XP-regler. Tre markeringer viser publisering, et vellykket GET-kall til en annen tjeneste og visning av et felt. En ekstra melding viser en vellykket POST. De er kvitteringer for handlinger, ikke vurdering av forståelse eller kontroll av at riktig rolleavhengighet er løst. Hint ligger under **Hvordan henger det sammen?**.

Læreren undersøker forståelse gjennom forklaring, API-beskrivelse og nytt testtilfelle. Et klikk eller et vellykket HTTP-svar godkjenner ikke elevens forklaring. Alternative gyldige feltnavn og adresser tillates innenfor de tekniske grensene.

## Ny anvendelse med mindre støtte

Parene skriver et kort API-kort for en garderobetjeneste: `GET /garderobe` skal gi antall ledige skap. De lager ruten i egen Express-app og henter data fra en enkel egen frontend uten simulatorens feltvelger. API-kortet skal være tilstrekkelig for en annen gruppe til å lage klientkallet. Be dem dokumentere ett gyldig kall, ett feiltilfelle og forskjellen på å hente data og å vise data. Vanlig dokumentasjon og tidligere eksempler kan brukes.

Tegn på forståelse er at eleven kan følge en bestemt verdi fra serverens objekt via HTTP til DOM, forklare hvorfor et gammelt svar ikke endres av seg selv og begrunne et testtilfelle. Tilfeldig veksling mellom GET og POST uten å lese responsen kan vise behov for en ny gjennomgang.

## Teknisk løsning og avgrensning

- Eksisterende Svelte-frontend og Express-backend, uten nye npm-avhengigheter. Brett og trafikk hentes hvert andre sekund mens fanen er synlig. Første utkast bruker polling; Socket.IO er ikke tatt inn.
- Hvert serverkort er en isolert virtuell tjeneste i den felles Express-prosessen. Kall til `/api/simulator/rooms/:roomId/servers/:serverId/<endepunkt>` bruker faktisk GET/POST og faktiske statuskoder. Ingen vilkårlig elevkode evalueres, ingen prosess eller port opprettes per elev, og ingen forespørsler videresendes til eksterne adresser.
- Eleven redigerer felter i en ferdig mal. GET-koden og fetch-koden vises med farger. Fetch-eksempelet utelater spillets transportfelter for konto, CSRF og forespørsels-ID; dette forklares ved koden. POST-logikken er foreløpig fast PC-reservasjon, ikke en fri kodeeditor.
- SQLite-migrasjon `016_backend_simulator.sql` lagrer rom, deltakere, data, endepunkter, handlingsmarkeringer, valgt frontendverdi og trafikk. Dette er JSON-data i databasen, ikke separate JSON-filer. API-et må oppgraderes sammen med frontend; migrasjonen kjøres ved oppstart og følger eksisterende backupordning.
- Romdeltakelse bestemmes av lærerens romkode. Alle deltakere kan se servernavn, roller, publiserte adresser og siste 30 forespørsler/svar. Egen datakilde og frontendverdi vises bare i eget oppsett; delte HTTP-svar er synlige i trafikkloggen. Romkoden skal deles med den aktuelle gruppen.
- Innlogging, kontobinding, Origin og CSRF bygger på eksisterende API. Bare lærer/admin oppretter rom, og bare rommets eier kan pause det. Alle lesinger og endringer krever medlemskap. En elev kan bare publisere egen backend og velge felt fra en egen GET-kvittering til en annen tjeneste i samme rom.
- Reservasjon og kvittering lagres i én SQLite-transaksjon. En gjentatt forespørsels-ID med samme innhold returnerer den samme kvitteringen, slik at et avbrutt svar kan hentes uten ny reservasjon. Endret innhold med brukt ID avvises. UI-et beholder ID ved nytt forsøk etter tilkoblingsfeil, men ikke etter et mottatt svar.
- Oppsett bruker revisjonsnummer. En reservasjon fra en medelev gjør et tidligere redigeringsutkast utdatert. Eleven må hente lagret oppsett før ny publisering; polling overskriver aldri lokale tekstfelt.
- Maksimalt 24 deltakere per rom og 30 rom per eier. JSON-startdata begrenses til 3000 byte; API-et har eksisterende 8 KiB-grense. Den delte IP-grensen er satt for klasser bak samme nettadresse. Maksimum 24 er en produktgrense, ikke et resultat fra belastningsprøving.
- I utkastet velger eleven rollen selv og kan ikke bytte den etter innmelding. Lærertildeling, nullstilling/sletting av rom, flere typer POST, PATCH/DELETE, frie kodeoppgaver og WebSocket-oppdatering er videre arbeid. Loggen viser siste 30 hendelser, mens kvitteringer foreløpig beholdes i databasen for gjentakelsessikring. Retensjon og romadministrasjon må avklares før langvarig bruk.

Labpartneren bruker `page-help` v2 og adapter v1. Bare kjent rolle, valgt panel, publiseringsstatus, siste HTTP-status og om resultatet gjelder tidligere input deles. Backend bygger mål, hint og begrensninger selv. JSON-tekst, romkode, ID-er, navn, trafikk, svarinnhold og andre elevers data inngår ikke i adapteren. Et spørsmål eleven selv skriver følger den eksisterende spørreflyten.

## Kontroll og utprøving

Samlet publiseringskontroll er gjennomført 4. november 2026. Se [kontrollnotatet](publiseringskontroll-modulvisning-2026-11-04.md) for rettelser, tester, nettleserprøving og lokal prøve med 24 API-klienter. Elevutprøving og prøving på skolens server gjenstår. Avsnittene nedenfor beskriver status og kontrollplan ved den opprinnelige dev-leveransen.

Kode og diff er gjennomgått på `dev`. En konkret Svelte-syntaksfeil ble rettet, og den nye siden ble deretter kompilert isolert med Svelte-kompilatoren uten advarsler. Full testsuite, Svelte-sjekk, produksjonsbygg og nettleserprøving er utsatt til før `main`, i tråd med repoets arbeidsflyt. Ingen dokumentert elevutprøving eller læringseffekt foreligger.

`tests/backendSimulator.test.js` beskriver regresjonsprøver for faktisk HTTP mellom flere kontoer: GET/POST og feilstatus, medlemskap og eierskap, Origin/CSRF, samtidige reservasjoner, gjentatt kvittering, utdatert oppsett, pause, lagring gjennom API-/databaseomstart og avgrenset labpartnerkontekst. Testene er lagt til, men ikke kjørt i denne dev-leveransen.

Før publisering: kjør full testsuite, Svelte-sjekk og bygg; prøv to eller flere nettleserprofiler, nettbrudd og samme forespørsel på nytt, kontobytte mens en forespørsel pågår, omlasting og omstart. Prøv også 24 samtidige klienter og mål respons og belastning. Kontroller tastatur, synlig fokus, skjermlesermeldinger, begge temaer, 320 px bredde og tekstzoom. Se særlig på lange navn/adresser, JSON, stabil plassering av respons, rombytte og bevaring av redigeringsutkast under polling.

Elevenes første utprøving skal avklare om de skiller frontendens øyeblikksbilde fra backendens gjeldende data, og om trafikkloggen hjelper dem å forklare et feiltilfelle. Observer både faglig forståelse og vansker med grensesnittet. Dette følger [aktivitetsmalen](aktivitetsmal.md), [det pedagogiske grunnlaget](pedagogisk-grunnlag.md) og [designgrunnlaget](webdesign-og-brukeropplevelse.md).
