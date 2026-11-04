# Kodeeksempler under modulene – oppslagsverk på dev

Modulsiden har valgene **Innhold** og **Kodeeksempler**. Eksempeloversikten viser kompakte kort med nummer og tittel. Når et eksempel åpnes, får koden hovedplassen og kortene en egen kolonne til høyre. På smale skjermer ligger en vannrett liste over koden. Modulinformasjon og øvingslisten vises under Innhold, slik at de ikke fortrenger eksemplet.

Eksemplene velges etter hva eleven trenger å gjøre i egen kode. Antall øvinger og øvingssteg bestemmer ikke antall kort. Kortene har funksjonsnavn uten løpenummer; kildeøvingen ligger som en lenke under koden. Dette er brukerens avklarte retning for samlingen.

| Modul | Eksempel | Hva koden viser |
| --- | --- | --- |
| Backend | Hent meldinger med GET | Forespørsel i frontend og svar fra Express |
| Backend | Send en melding med POST | JSON fra frontend, mottak og kontroll i backend |
| Backend | Lese og skrive en JSON-fil | Import, filsti, innlesing ved oppstart og skrivefunksjon samlet |
| Backend | Lagre en ny melding | Ny liste, lagring, oppdatering av minnet og svar med try/catch |
| Backend | Endre én melding med map | Ny liste med én endret melding |
| Backend | Slett én melding med filter | Ny liste uten meldingen som skal slettes |
| Databaser | Koble Node.js til MongoDB | Tilkobling, database og collection |
| Databaser | Hente og filtrere dokumenter | Fire valg: alle dokumenter, ett vilkår, flere vilkår og prisgrense |
| Databaser | Legg inn ett dokument | Objekt, insertOne og bekreftet ID |

Backend har dermed seks kort og Databaser tre. GET og POST har valg for frontend/backend. Søkevariantene erstatter hverandre og samles under ett kort fordi de viser samme operasjon med forskjellige filtre. Fillagring deles i to fordi oppsettet plasseres før rutene, mens lagringen av en ny melding plasseres inne i POST-ruten. Relaterte eksempler lenkes sammen.

Eksemplene har en kort forklaring, plassering/forutsetninger, kopiering og lenke tilbake til kildeøvingen. De viser kode; de kjører ikke elevens kode eller starter nettverkskall. Utdrag merkes med sammenhengen de hører til i. Lagringsreferansen bruker den rettede rekkefølgen fra øving 5. Forsøket med feil rekkefølge blir værende i øvingen, der eleven undersøker feilen. Hver ikke-tomme kodelinje kan åpnes med mus eller tastatur; den eksisterende `CodeExplanation` brukes for forklaringen. Escape og lukkeknappen lukker og gir fokus tilbake til linjen.

## Mål, elevarbeid og oppfølging

Målgruppen er Vg2 IT. Dette er en valgfri lesestøtte til eksisterende øvinger og arbeid i eget prosjekt. Eleven bør kjenne variabler, funksjoner og JavaScript-objekter, og ha arbeidet med innledningen til den aktuelle modulen. Målet er å kunne forklare en bestemt linjes rolle i dataflyten og bruke eksemplet i en beslektet oppgave.

Læreplantilknytning i Utvikling, [ITK02-01](laereplan/ITK02-01.md):

- **UTV-08:** «anvende relevant testmiljø og utføre testing tilpasset IT-løsningen som utvikles». Eksempellesingen forbereder prøving i kildeøvingen eller eget prosjekt; lesing og klikk alene oppfyller ikke testmålet.
- **UTV-10:** «beskrive ulike datalagringsmodeller og metoder for å hente ut og sette inn bestemte data fra databaser som brukes av andre systemer». Databaseeksemplene støtter forståelse av tilkobling, søk og innsetting. Sammenligning av lagringsmodeller og anvendelse i en faktisk database følges opp i modulens øvrige arbeid.

UTV-referansene er lokale henvisninger, ikke offisielle Udir-koder. Lesing av kode og muntlig forklaring støtter grunnleggende ferdigheter. Å følge data mellom klient, backend og database konkretiserer løsningsarkitektur og systemutvikling.

| Elevhandling | Respons og støtte | Videre arbeid |
| --- | --- | --- |
| Velge et kjent problem | Kort tittel, kildeøving og riktig kode | Forutsi hva én linje gjør før forklaringen åpnes |
| Trykke på en linje | Forklaring ved den valgte linjen, med samme lukkemønster som ellers | Forklare linjen med egne ord |
| Bytte frontend/backend eller eksempel | Ny kode og tømt linjevalg | Sammenligne hvor forespørselen sendes og hvor den behandles |
| Åpne øvingen | Original oppgave med forsøk og prosjektarbeid | Gjøre én endring, kjøre og sammenligne med forventningen |

Som ny anvendelse kan eleven tilpasse en meldingsrute til en annen datatype eller lage et databasesøk med en annen kombinasjon av felter. Læreren ber eleven begrunne endringen og vise et testresultat. Et åpnet eksempel, et kopieringsklikk eller en lest forklaring gir ingen ny XP, fullføringsmarkering eller vurdering av forståelse.

For fillagring kan eleven lagre en liste med utstyr i eget prosjekt og finne den igjen etter omstart. Læreren undersøker om eleven kan forklare forskjellen mellom en liste i minnet og JSON-tekst på disk, hvorfor skrivefunksjonen må kalles, og hvorfor minnet oppdateres etter lagringen. Oppsettet er avgrenset til én lokal øvingsserver med synkron filtilgang; det er ikke en løsning for samtidige serverprosesser eller en garanti mot avbrutt diskskriving. JSON-filer forbereder forståelse av lagring, men erstatter ikke databasearbeidet i UTV-10.

## Felles kilder og vedlikehold

`moduleCodeExamples.js` samler metadata og henter selve koden fra `frontendBackendLab.js`, `storageExercise.js`, `ovingModel.js` og `databaseIntro.js`. Utvalget er redaksjonelt og opprettes ikke automatisk fra alle øvingssteg. Fillagringsoppsettet setter sammen `storageSetupCode`, `storageSafeReadCode` og `storageSaveCode`; bruken i POST henter `storageRepairedCode`. Import og filsti eies også av `storageExercise.js`. Koden fra øvingene kopieres ikke inn i en ny innholdskilde. Eksisterende linjeforklaringer gjenbrukes; manglende forklaringer til lagring og databaseutdrag er knyttet til linjenes tekst. Hvis disse kildene endres med en ny linje, skal forklaringen oppdateres samtidig. Ukjent tekst stopper katalogopprettingen i stedet for å få en upresis standardforklaring.

`ModuleCodeExamples` eier oversikt, kort og filvalg. `AnnotatedCode` gjenbruker `CodeTokens` og `CodeExplanation`, og åpnes på nytt ved bytte av eksempel/fil. Forklaringsboksen ligger rett under linjen også på stor skjerm, slik at høyrekolonnen kan brukes til eksemplene. Den nye valgfrie `responsive`-innstillingen i `CodeExplanation` lar denne visningen bruke inline-modus på alle bredder; standardoppførselen på eksisterende sider er uendret.

Valgt eksempel og fil ligger i URL-en, for eksempel `/moduler/backend/?visning=eksempler&eksempel=get-meldinger&fil=backend`. Omlasting, deling og nettleserens tilbake/frem bruker samme valg. Linjeforklaringer lagres ikke i URL eller lokal lagring. Ukjente eksempler gir en melding og oversikten; et eksempel fra en annen modul kan ikke åpnes gjennom feil modul. Visningen ligger innenfor den eksisterende kontrollen av modulens synlighet.

Tidligere delte lenker til `fil-lagre`, `fil-omstart` og `fil-oppstart` åpner det samlede `json-fil`-eksemplet. `fil-skrivefeil` og `fil-endre-koden` åpner den rettede lagringsblokken i `lagre-melding`. De fire tidligere databasesøkene åpner riktig variant i `mongo-hente`, også med den gamle `fil=node`-parameteren. `moduleCodeExampleSelection` gjør denne omleggingen innenfor riktig modul. Nye lenker og labpartnerkontekst bruker de nåværende ID-ene.

Labpartneren bruker modulens kjente side-ID og adapterversjon 1. Bare valgt eksempel-ID, fil-ID og linje-ID deles. Backend kontrollerer at kombinasjonen finnes i den aktuelle modulen og henter kode/forklaring fra de samme offentlige kildene. Ingen innlimt kode, DOM, elevdata eller kjøreresultat deles. Når eksemplene lukkes, frigjøres denne arbeidsstatusen.

## Kontroll før main

**Omgruppering 4. november 2026:** Kildekode, linjeforklaringer, avhengigheter, lenker og diff er gjennomgått. Eksisterende tester er oppdatert for det kuraterte utvalget, og regresjonstester beskriver gamle delte lenker og riktig søkevariant i labpartnerkonteksten. Testene er ikke kjørt i denne dev-justeringen. Svelte MCP er ikke tilgjengelig; ingen MCP-kontroll er utført. Kontrollen nedenfor gjelder versjonen før omgrupperingen. Den nye samlingen skal prøves samlet før main, særlig kopiering av fillagringsoppsettet, gamle lenker, variantbytte og lenkene mellom eksempler.

Kode og diff gjennomgås på dev. Testene i `tests/moduleCodeExamples.test.js` er lagt til for kildeidentitet, linjeforklaringer, lenker, ugyldige valg og avgrenset labpartnerkontekst. Samlet testing, Svelte-sjekk, bygg og nettleserprøving gjenstår før main.

**Feilretting 4. november 2026:** Den rapporterte `props_id_invalid_placement` i `AnnotatedCode` er gjenskapt og rettet ved å tilordne `$props.id()` direkte til en egen variabel før suffikset legges til. Den rettede komponenten, `ModuleCodeExamples`, `CodeExplanation` og modulsiden er kompilert isolert for både klient og server uten advarsler. Dette er en avgrenset kontroll av kompileringsfeilen; samlet kontroll før main gjenstår.

**Klikkfeil 4. november 2026:** Feilen er gjenskapt i nettleseren: klikk på et eksempelkort ga `goto_options_removed`, og URL og visning forble uendret. Prosjektet bruker SvelteKit 3; navigasjonen bruker nå `reset: false` i stedet for de fjernede valgene `noScroll` og `keepFocus`. En egen feil i `CodeExplanation` gjorde at inline-forklaringer lukket seg straks på stor skjerm selv med `responsive={false}`. Oppstartskontrollen respekterer nå dette valget, som visnings- og størrelseskontrollene allerede gjorde.

Avgrenset nettleserprøve mot lokal Vite-server med simulerte API-svar for aktiv modulstatus og gjestekonto: alle ni backendeksempler og seks databaseeksempler åpnet riktig kode; filvalg og første linjeforklaring i hver fil, Escape med fokus tilbake til linjen, tilbake til oversikten, åpning med Enter, nettleserens tilbake/frem, direktelenke og omlasting bestod. Eksempelbytte og linjeforklaring med lukkeknapp ble også prøvd ved 390 px. Den eksisterende linjeforklaringen på `/backend/` ble kontrollert ved 1440 og 390 px. Ingen kjøretidsfeil ble registrert i disse prøvene. Dette kontrollerer de konkrete klikkfeilene; full testsuite, Svelte-sjekk, produksjonsbygg og samlet kontroll mot ekte backend gjenstår før main.

Prøv særlig modulenes synlighetskontroll, første åpning fra kort, raske eksempelbytter, frontend/backend, kopiering og reservebeskjed, klikk og tastatur på alle kodelinjer, Escape/lukk, kildeøvingens tilbakevei, delte lenker, ukjente ID-er, tilbake/frem og omlasting. Prøv begge temaer, 320 px, tekstzoom og lange kodelinjer. Kontroller at det gamle linjeforklaringsmønsteret på eksisterende aktiviteter fortsatt virker, og at labpartneren får valgt offentlig eksempel uten gammel arbeidsstatus.

Ved elevutprøving undersøkes om elevene finner riktig eksempel og kan forklare og tilpasse det. Bruk av eksempelsamlingen er ikke i seg selv dokumentasjon på læringseffekt. Utformingen følger [aktivitetsmalen](aktivitetsmal.md), [det pedagogiske grunnlaget](pedagogisk-grunnlag.md) og [designgrunnlaget](webdesign-og-brukeropplevelse.md).
