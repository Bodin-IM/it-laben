# Kodeeksempler under modulene – alternativ arbeidsmåte på dev

Modulsiden har valgene **Innhold** og **Kodeeksempler**. Eksempeloversikten viser kompakte kort med tittel. Når et eksempel åpnes, får koden hovedplassen og kortene en egen kolonne til høyre. På smale skjermer ligger en vannrett liste over koden. Modulinformasjon og øvingslisten vises under Innhold, slik at de ikke fortrenger eksemplet.

Eksemplene velges etter hva eleven trenger å gjøre i egen kode. Antall øvinger og øvingssteg bestemmer ikke antall kort. Kortene har funksjonsnavn uten løpenummer; kildeøvingen ligger som en lenke under koden. Dette er brukerens avklarte retning for samlingen.

| Modul | Eksempel | Hva koden viser |
| --- | --- | --- |
| Backend | Hent meldinger med GET | Hel Express-server og Svelte-side med henting og visning av listen |
| Backend | Send en melding med POST | Tekstfelt, knapp, JSON, validering, ny ID og oppdatert liste i frontend |
| Backend | Lese og skrive en JSON-fil | Hel liten chat med frontend, GET/POST og filoperasjonene framhevet |
| Backend | Lagre en ny melding | Samme komplette filoppsett, med lagring og bekreftelse i POST framhevet |
| Backend | Endre én melding med map | Redigeringsfelt i each, PATCH, ID-oppslag, validering, map, lagring og oppdatert frontend |
| Backend | Slett én melding med filter | Sletteknapp i each, DELETE, filter, lagring, 204 og fjerning fra frontend |
| Databaser | Koble Node.js til MongoDB | Tilkobling, database og collection |
| Databaser | Hente og filtrere dokumenter | Fire valg: alle dokumenter, ett vilkår, flere vilkår og prisgrense |
| Databaser | Legg inn ett dokument | Objekt, insertOne og bekreftet ID |

Backend har seks kort og Databaser tre. Hvert backendkort inneholder både en komplett `server.js` og en komplett `src/routes/+page.svelte`, men åpnes med et kortere utdrag. Backend viser hele den aktuelle ruten, eller lese-/skrivefunksjonene i JSON-eksemplet. Frontend viser den aktuelle funksjonen og tilhørende HTML, inkludert meldingslisten. **Vis hele koden** åpner resten av filen og oppstartsinstruksjonene; **Skjul resten av koden** går tilbake til utdraget. Bytte av eksempel eller fil starter med utdraget igjen.

Frontend- og backendfilen i samme kort brukes sammen; eksemplene er alternativer, ikke kodeblokker som skal limes etter hverandre. Utdraget forutsetter oppsettet fra hele filen. Backend vises først. Gamle delte lenker med eksplisitt `fil=frontend` åpner fortsatt frontend.

Eksemplene er en alternativ arbeidsmåte med mindre interaktivitet: en kort introduksjon, kode med valgfri helvisning, kopiering og en forklaring når eleven trykker på en kodelinje. Ingen simulator, oppgavefelt, stegvis kjøring eller kontrollspørsmål er lagt til. De viktigste linjene markeres med bakgrunn, kant og ◆ ved linjenummeret, og omtales som viktige i knappens tilgjengelige navn. Markeringen endrer ikke koden som kopieres. Den eksisterende `CodeExplanation` åpnes ved linjen med mus eller tastatur; Escape og lukkeknappen gir fokus tilbake.

GET/POST-eksemplene begynner med én melding i serverminnet. De fire eksemplene med fillagring begynner med en tom liste når filen mangler; alle har sendefelt og POST slik at eleven kan opprette data uten et annet eksempel. PATCH og DELETE har også GET og POST, ID-er opprettes på serveren, og feil vises i frontend uten at utkastet eller listen tømmes. POST svarer med 201 og meldingsobjektet, PATCH med 200 og det endrede objektet, DELETE med 204 uten body. Frontend behandler akkurat disse formatene. Den oppdaterer sin lokale liste etter bekreftet svar; **Hent meldinger** leser hele listen på nytt.

Fillagringens to kort viser samme komplette kode med ulike framhevinger: lese-/skrivefunksjonene i det ene og rekkefølgen ny liste → lagre → minne → svar i det andre. Lagringsfunksjonen kommer fra øving 5. Forsøket med feil rekkefølge blir værende i øvingen. Eksemplene er lokale øvingsservere uten innlogging eller eierskapskontroll; disse temaene behandles i øving 8–9. Databaseeksemplenes innhold og varianter er uendret.

## Mål, elevarbeid og oppfølging

Målgruppen er Vg2 IT. Dette er en valgfri måte å arbeide med komplette eksempler i eget prosjekt, med mindre interaktivitet enn øvingene. Eleven bør kjenne variabler, funksjoner og JavaScript-objekter, og ha arbeidet med innledningen til den aktuelle modulen. Målet er å kunne forklare en bestemt linjes rolle i dataflyten og bruke eksemplet i en beslektet oppgave.

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

`moduleCodeExamples.js` samler katalog og valg. `backendModuleExamples.js` eier de komplette backendeksemplene og setter sammen felles server-/frontenddeler med linjeforklaringer og valgfrie `important`-markeringer. De er egne sammenhengende eksempler, ikke lenger løse utdrag fra simulatorens trinn. Lese-/skrivefunksjonene og den rettede POST-lagringen gjenbrukes fortsatt fra `storageExercise.js`; linjeforklaringene til disse er knyttet til tekst, og nye ukjente linjer krever en forklaring. Databasekoden hentes fortsatt fra `databaseIntro.js`. De eksisterende interaktive øvingene og deres modeller er ikke endret.

De komplette frontendfilene har script, import, tilstandsvariabler, hendelsesfunksjoner og HTML samlet. De komplette backendfilene har import, app, middleware, liste, nødvendige ruter og app.listen. Utdragene velges som hele blokker fra de samme kildene og beholder opprinnelige linjenumre, ID-er, forklaringer og markeringer. Utelatt kode vises med en liten skillelinje. **Kopier utdrag** kopierer bare de synlige kodelinjene; **Kopier hele koden** kopierer hele filen. Markeringer, forklaringer og tekst om skjult kode følger ikke med i utklippstavlen. Databaseeksemplene har fortsatt full visning uten denne bryteren.

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


## Publiseringskontroll 5. november 2026

Kontrollert samlet med main `ac695f5` før PR #25. Full testsuite kjørte 338 tester: 337 bestod, og søkets katalogforventning manglet den nye aktiviteten `vlan-sammen`. Forventningen er oppdatert. Etter retting bestod alle 22 berørte søke-, VLAN-modell- og API-tester. Svelte-sjekken fant først 66 typefeil; presise typeangivelser og eksplisitte adressekontroller rettet disse. Sluttkontrollen har null feil og én advarsel om en ubrukt CSS-selektor. Produksjonsbygget bestod etter retting. Svelte MCP er ikke tilgjengelig i dette miljøet.

Chromium mot ekte lokal API, med lærer og to separate elevprofiler: opprette og velge rom, kabelforespørsel og mottakers godkjenning, vellykket ping, ulagret utkast gjennom fokus-/nettverksoppdatering og automatisk profiloppdatering etter 30 sekunder, lagring og pause/fortsett bestod uten JavaScript-feil. Enhetsvalg og fokus ble prøvd med tastatur ved 390 og 1280 pikslers bredde i lyst og mørkt tema. Kodeeksemplenes åpning, linjeforklaring med tastatur, kopiering til utklippstavlen, delt URL etter omlasting og forstørret tekst ble også prøvd. API-testene dekker ugyldige handlinger, eierskap, samtykke, portkonflikter, utløp, retry og omstart.

Dette er teknisk kontroll. Berøring på fysisk utstyr, full belastning med 24 deltakere og utprøving med elever er ikke gjennomført. Eleven avtaler og konfigurerer et nettverk; ping forklarer funksjon og returvei, mens forståelse må undersøkes gjennom forklaring og et nytt oppsett med mindre støtte som beskrevet ovenfor. Ingen dokumentert læringseffekt eller full WCAG-samsvarsvurdering hevdes.


## Komplette backendeksempler på dev – 9. november 2026

Brukerens gjennomgang avdekket at særlig lagring, PATCH og DELETE manglet både omgivende rutekode og frontend. Alle seks backendeksempler er derfor utvidet til hele filpar med konsistente request- og responseformater. De to sentrale PATCH-linjene med objektspredning og map er framhevet inne i hele ruten; frontend viser redigeringsfelt, ID i adressen, JSON-body og oppdatering etter bekreftelse. Dette følger pedagogikkens kobling mellom handling, kode og resultat og designgrunnlagets hjelp ved behov. Det er ikke lagt inn nye elevoppgaver eller progresjonskrav.

Kildekode, linjeforklaringer, dataflyt, lenker og diff er gjennomgått. Eksisterende katalogtester er oppdatert for hele Svelte-filer, gjenbruk av lagringskode og markeringer. En regresjonstest beskriver kjøring av den viste serverkoden med kontrollerte request-/respons- og filadaptere: GET, POST, PATCH, DELETE, ugyldig input, ukjent ID, skrivefeil og gjeninnlesing. Testene er ikke kjørt i denne dev-leveransen. Samlet testing, Svelte-sjekk, bygg og nettleserprøving gjenstår før main. Svelte MCP er ikke tilgjengelig; offisiell Svelte 5- og Express-dokumentasjon er brukt.

Før main: prøv alle seks filpar i egne øvingsmapper mot en faktisk Express-server og Svelte-frontend. Kontroller oppstart, manglende fil, innlegging av to meldinger, endring/sletting av bare valgt ID, feilvisning, omstart og 204 uten JSON-parsing. Prøv linjeforklaring og kopiering på markerte og umarkerte linjer, begge temaer, smal skjerm, forstørret tekst og gamle direktelenker. Kontroller også labpartnerens validerte eksempel-/fil-/linjevalg. Elevutprøving må undersøke om eleven nå finner hvor koden hører hjemme og kan tilpasse den til eget arbeid.

## Kortere standardvisning på dev – 9. november 2026

Brukeren ønsket mindre kode synlig ved åpning, med hele filen tilgjengelig ved behov. Utdragene beholder hele den aktuelle ruten eller funksjonen, inkludert feilhåndtering, og frontendens relevante HTML. Oppsett og andre funksjoner skjules som standard. Knappen for helvisning kan brukes med tastatur og angir åpen/lukket tilstand; linjevalget tømmes ved bytte av visning. Dette endrer støttemengden, ikke læringsmål eller vurdering.

Kilde og diff er gjennomgått. Ingen tester, Svelte-sjekk, bygg eller nettleserprøving er kjørt i denne dev-justeringen. Samlet testing gjenstår før main. Prøv da standardutdraget og helvisningen i alle seks filpar, hele kodeblokker med riktige linjenumre, kopiering i begge visninger, linjeforklaring, tastaturfokus, fil-/eksempelbytte og smal skjerm.
