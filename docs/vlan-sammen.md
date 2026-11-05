# Nettverksligaen – samarbeid om VLAN og ruting

Tidligere navn: **VLAN sammen**. Rute og aktivitets-ID beholdes: `/nettverk/vlan-sammen/`, under **Driftsstøtte**. Det nye navnet er en leken ramme for samarbeid, uten rangering eller konkurransepoeng. Aktiviteten lar elever bygge og koble sammen egne nett på et felles brett. Eget område ligger nederst, de andre over. Den bygger videre på [VLAN-lab 1](vlan-lab.md) og [VLAN-lab 2](vlan-lab-2.md), men krever ikke bestått-status fra dem. Læreren kan bruke den som en åpen samarbeidsøkt.

## Mål og utgangspunkt

Målgruppe: Vg2 informasjonsteknologi. Eleven skal kunne avtale en port- og adresseplan, konfigurere VLAN, få forbindelse til en medelev og forklare både fram- og returvei. Forkunnskaper er PC/switch, unike IPv4-adresser med /24, U/E/T og ping. Gateway og ruting trengs først i utvidelsen med ulike IP-nett. Bevegelsen fra et fungerende lite nett til egne endringer er et lokalt pedagogisk valg som skal gi en rask, forståelig start.

Hovedmål fra **ITK02-01, driftsstøtte**, med læreplanens ordlyd og lokale referanser:

- [DRS-02](laereplan/ITK02-01.md#drs-02): «planlegge, implementere og drifte fysiske og virtuelle løsninger med segmenterte nettverk».
- [DRS-05](laereplan/ITK02-01.md#drs-05): «utforske og beskrive relevante nettverksprotokoller, nettverkstjenester og serverroller».

Støttemål:

- **Driftsstøtte**, [DRS-06](laereplan/ITK02-01.md#drs-06): «planlegge og dokumentere arbeidsprosesser og IT-løsninger».
- **Brukerstøtte**, [BRU-06](laereplan/ITK02-01.md#bru-06): «feilsøke og rette feil ved hjelp av feilsøkingsstrategier og relevante rammeverk».

Laben øver avgrenset planlegging, segmentering, adressering og feilsøking i en modell. Den dekker ikke hele målene, faktisk drift eller produktspesifikk switchkonfigurasjon. Samarbeidet øver faglig kommunikasjon: elevene må forklare hvilke porter og VLAN de trenger, lese hverandres oppsett og avklare hvem som endrer hva. Elevene kan skrive portplan og en kort feilrapport i områdets dokumentasjon, og lese hverandres notater før de avtaler forbindelser. Kjerneelementene IT-støtte og kommunikasjon, løsningsarkitektur og kreativ problemløsing får dermed konkrete handlinger.

Misforståelser som skal undersøkes: kabel betyr fungerende nett; samme VLAN-ID alene gir forbindelse; en trunk ruter mellom IP-nett; hvilken som helst ruteradresse kan være gateway; én fungerende retning er nok for ping.

## Start med to elever

1. Læreren logger inn i Min lab, åpner aktiviteten og oppretter et rom med et gjenkjennelig navn. Rommet vises i elevenes romliste, uten kode.
2. Elevene logger inn, velger rommet og trykker **Bli med**. **Fortsett** åpner et rom de allerede er med i. Hver deltaker, inkludert læreren, får S1 og PC1 med en kabel på eth0. Start-PC-ene får ulike adresser i `10.10.10.0/24`. Switchene starter med U i VLAN 1.
3. Elev A trykker **Koble kabel**, velger sin S1 og en ledig port i den lille menyen ved enheten. Deretter trykker A på elev Bs switch eller ruter i brettet. B får en forespørsel, velger en ledig port og trykker **Godta kabel**.
4. A velger sin PC og Bs PC under **Får du svar?** og sender ping. Undersøk den forklarte pakke- og returveien.
5. Avtal VLAN 10. Opprett det på begge switchene, sett PC-portene til U i VLAN 10 og forbindelsen mellom switchene til T i VLAN 10. Lagre begge oppsett og prøv igjen. Elevene forklarer hvor taggen legges til og fjernes.

Ingen kabel opprettes mellom ulike eiere uten mottakerens godkjenning. Egne enheter kobles direkte i samme kabelmodus: velg kildeport, trykk på egen switch/ruter og velg målport i menyen. En PC kan være start på en lokal kabel, men avvises som mål. Mellom ulike eiere må begge ender være switch eller ruter. En avvisning beholder kildevalget, slik at eleven kan velge et annet mål. Opptatte porter og porter med ventende forespørsel er merket og kan ikke velges i menyen. Begge eiere kan senere koble fra en felles kabel. Konfigurasjonen til andre er synlig, men kan bare redigeres av eieren. Bruk labadresser og oppdiktede enhets- og områdenavn. **Avslutt kabelmodus** eller Escape avbryter; Escape i portmenyen lukker bare menyen. Etter vellykket kobling eller sendt forespørsel går brettet tilbake til vanlig enhetsvalg.

## Elevhandling, respons og videre arbeid

| Situasjon | Elevens handling | Respons og nytt forsøk |
| --- | --- | --- |
| Første forbindelse | Avtale porter og sende/godta kabel. | Kabelen kommer på begge brett. En opptatt port gir beskjed og kan byttes. Godkjent kabel er en handling, ikke en faglig godkjenning. |
| VLAN mellom områder | Forutsi, endre U/T, lagre og sende ping. | Serveren undersøker faktiske kabler og medlemskap. Resultatet peker på adresse, VLAN-vei, gateway eller rute som stopper forsøket. |
| Ulike IP-nett | Legge til rutere og velge gateway, interfacer og eventuelle statiske ruter. | Ping prøver framveien og deretter et selvstendig svar. Eleven kan derfor oppdage en manglende returvei. |
| Dokumentere og avtale | Gi området navn, beskriv VLAN, adresser, portbruk og én observert feil; les medelevens dokumentasjon. | Lagret navn vises på brettet. Teksten kan brukes til å avtale neste test, men blir ikke automatisk faglig godkjent. |
| Feilsøking i par | Én forklarer forventningen; den andre velger neste undersøkelse. Bytt roller. | Hendelsene og markerte kabler kan undersøkes. Gamle resultater merkes når oppsett eller testvalg endres. Hint koster ingenting. |

Videre utfordring med mindre støtte: La A bruke `10.20.0.0/24`, B `10.30.0.0/24` og et eget transportnett mellom ruterne. Elevene avtaler VLAN, portbruk, ruter og returvei selv. Lag en kort port-/adresseplan og dokumenter én feil med forventning, observasjon, retting og forklaring. Gjenta deretter med nye adresser på fysisk utstyr eller i en egnet nettverkssimulator.

Et vellykket ping dokumenterer bare funksjon mellom de valgte PC-ene i det lagrede modelloppsettet. Det gir ingen XP, bestått-markering eller automatisk vurdering av forståelse. Læreren følger opp hvorfor portene må passe, hvorfor gateway tilhører eget nett og hvordan returen finner fram. Prøving av alle U/E/T-kombinasjoner uten hypotese er ikke alene tegn på forståelse. Alternative fungerende topologier godtas av modellen; det finnes ingen skjult fasittopologi.

## Nettverksmodell og grenser

- PC-er har én eth0-port, IPv4 og valgfri gateway. Alle adresser bruker fast /24. Ingen DHCP eller DNS.
- Switcher har åtte porter og opptil åtte VLAN. Den eksisterende U/E/T-komponenten gjenbrukes. U velger VLAN for umerket trafikk inn og fjerner taggen ut, T sender VLAN-tag og E utelukker VLAN-et. Det finnes ikke et separat PVID-valg. Tagged inngang tillates for et VLAN porten er medlem av; modellen dekker ikke alle produsenters ingressfiltre.
- Untagged-forbindelser kan koble sammen ulike lokale VLAN-ID-er. Modellen later derfor ikke som ulike VLAN-numre alltid gir isolasjon. På en tagged forbindelse må VLAN-ID og medlemskap passe.
- Rutere har fire fysiske porter og opptil åtte interfacer. `0` i interfacefeltet er labens valg for **uten tag**, ikke et eget VLAN. `1–4094` velger en tagged VLAN-interface. Hver interface må ha et eget /24-nett; flere taggede interfacer kan dele samme kabel.
- Ruteren kjenner direkte tilkoblede nett. Opptil åtte statiske ruter angir et eksakt /24-målnett og neste hopp i et direkte tilkoblet nett. Ingen default route, dynamisk ruting eller andre masker inngår i første versjon.
- Adresseoppslag følger kabelgrafen og switchmedlemskapet. Relevante lokale adressekonflikter avvises; duplikater i et frakoblet område gir ikke en global feil. Svaret rutes separat. Ruteløkker avbrytes, og modellen har en grense på 16 rutere per retning.
- Fysiske switch-løkker avvises fordi modellen ikke har STP. Dette gjelder også en redundant forbindelse der noen VLAN foreløpig er utelukket. Ingen link aggregation, Wi-Fi, NAT, brannmur/ACL, tidsmodell, reell pakkefangst eller faktiske nettverkspakker til skolens utstyr.

Faglig kildegrunnlag: [Cisco: inter-VLAN-ruting med ekstern ruter](https://www.cisco.com/c/en/us/support/docs/lan-switching/inter-vlan-routing/14976-50.html), lest i utviklingsarbeidet 4. november 2026. Modellen viderefører lab 1 og 2 sine forenklinger og er ikke en full emulering av en bestemt switch eller ruter.

## Grensesnitt, samtidighet og lagring

Romlisten er synlig for innloggede brukere og viser navn på rom og lærer, deltakerantall, pause og eget medlemskap. Den viser opptil 100 rom, med egne medlemskap først, deretter nyeste rom. Elevene kan bli med ved å velge et rom; bare lærer/administrator kan opprette rom. Listen oppdateres hvert femte sekund når den er synlig, og har en egen oppdateringsknapp. Nye medlemmer slipper ikke inn i fulle eller pausede rom; eksisterende medlemmer kan fortsatt åpne sitt lagrede område. Før innmelding vises ingen nettverk eller deltakerliste.

Alle medlemmer ser brettet, med eget område nederst. Det åpnes ved eget område én gang ved rombytte; polling skal ikke flytte eleven mens andre områder undersøkes. **Til mitt område** fører tilbake. Nettverksbrettet og VLAN-tabellen kan rulles i to dimensjoner. En vanlig enhetsliste er et alternativ til å velge i brettet. Knapper og skjemafelt støtter tastatur, og valget fører til innstillingene. Kabelmodus aktiveres på brettet; portmenyen åpnes ved klikkpunktet, eller ved enheten når tastatur brukes. Menyen begrenses til skjermen og kan lukkes uten å miste kildevalget. Vanlige tilbakemeldinger ligger i dokumentflyten over brettet, uten sticky/fixed-posisjon eller lukkeknapp. De erstattes ved neste handling. Feil og usikker lagring blir stående med mulighet til å prøve igjen. Farge suppleres av tekst, status og hendelser.

**Dokumentasjon:** Hvert område har en dokumentasjonsknapp. Eieren får et navnefelt og en større notatboks; andre medlemmer får en lesbar tekstvisning. En områdeliste lar eleven bytte mellom dokumentene. Eget utkast beholdes ved lesing av andres dokumenter og ved rom-/profiloppdateringer. Lagrede notater er synlige for alle som er med i rommet, men verken navn eller notater vises i den åpne romlisten. Lagring er eksplisitt, med bekreftelse først etter svar fra serveren. Navn kan ha opptil 40 tegn, notater opptil 2000 tegn. Tomt navn bruker vanlig deltaker-/områdenavn. Notater vises som ren tekst, aldri som HTML.

Dokumentasjonen har en egen revisjon per medlem, slik at en gammel fane ikke overskriver nyere tekst. Ved konflikt kan eleven kopiere utkastet og hente lagret tekst. Notatendringer endrer ikke nettverksrevisjonen og gjør derfor ikke et pingresultat utdatert. Ved rombytte eller navigasjon bort varsles det om ulagrede notater. Utkastet ligger bare i fanens minne fram til lagring; faktisk kontobytte og utlogging rydder det.

Grensene i første versjon er 24 deltakere per rom, åtte enheter per deltaker og 30 opprettede rom per lærer. Rom kan gjenbrukes; egen arkiverings-/slettevisning finnes foreløpig ikke. Læreren kan pause redigering og ny innmelding. Eksisterende oppsett forblir lesbart. «Aktiv nå» betyr at kontoen har hentet rommet de siste 15 sekundene, ikke en måling av nettverkstilkoblingen.

`017_vlan_together.sql` lagrer rom, medlemskap og kvitteringer for endringskommandoer i den eksisterende SQLite-databasen. Rommet inneholder topologi, konfigurasjoner og ventende forespørsler. API-et bruker pålogging, kontoheader, Origin/CSRF og eksisterende 8 KiB-grense. Alle skrivehandlinger kontrollerer medlemskap og eierskap. `018_vlan_documentation.sql` legger til områdenavn, notater og dokumentrevisjon på medlemskapet. Eksisterende medlemmer starter med tom dokumentasjon; rom og topologi bevares. Vanlig SQLite-backup inkluderer tabellene. Serveren må oppdateres sammen med klienten; migrasjonen kjøres ved API-oppstart, før laben kan brukes. Innmelding bruker `roomId` fra romlisten. Den gamle kodekolonnen beholdes internt for databasekompatibilitet, men sendes ikke til klienten og brukes ikke til innmelding; eksisterende rom og nettverk bevares.

Portvalg kontrolleres på nytt i én transaksjon ved godkjenning. To samtidige aksepter kan ikke legge to kabler i samme port. Forespørsler utløper etter fem minutter; maksimalt fire per avsender og 48 per rom venter samtidig. Bare sender og mottaker ser forespørselen, mens godkjente kabler er felles. Switch-løkker, gjenbrukte porter, slettede enheter og gamle forespørsler gir forklarte avslag.

Klienten henter rommet omtrent hvert 2,5 sekund når fanen er synlig. Enhetsutkast redigeres lokalt til **Lagre oppsett**; oppdateringer fra andre erstatter ikke utkastet. Revisjon per enhet hindrer en eldre fane i å overskrive et nyere lagret oppsett. Brukeren velger eksplisitt om lagret oppsett skal erstatte et lokalt utkast. Rommet ryddes bare ved faktisk endret konto-ID eller utlogging. Min labs vanlige profiloppdatering hvert 30. sekund, ved fokus og ved nettverkstilbakekomst beholder rom og utkast for samme konto. Et API-svar fra tidligere konto eller rom ignoreres. Ulagrede utkast overlever ikke en full omlasting.

Hver endringskommando har en UUID og en kvittering med innholdets hash. Ved tapt svar kan samme handling prøves igjen uten dobbel virkning, også etter serveromstart. En endret handling med samme UUID avvises. Kvitteringene beholdes så lenge medlemskapet/rommet eksisterer; automatisk arkivering og aldersbasert opprydding er videre driftsarbeid. Sletting av en konto fjerner medlemskap og kvitteringer; tilhørende enheter/kabler renses før neste lesing eller endring av rommet. Sletting av rommets eier fjerner hele rommet med kaskade.

## Labpartner

Adapter `vlan-together`, side-ID `vlan-sammen`, protokoll 2 / adapterversjon 1. Den deler bare kjent enhetstype, handlingstype (`configure`/`connect`), om ping er kjørt/utdatert, og romrevisjon. Serveren bygger mål, hint og videre utfordring fra offentlig innhold i `vlanTogether.js`. Ingen romkode, rom-ID, elevnavn, områdenavn, notater, IP-adresse, konfigurasjon, pakkevei eller pingresultat sendes som kontekst. KI må be eleven beskrive et relevant funn og kan ikke påstå at ping lyktes.

En separat, lokal `localTaskKey` bruker romidentiteten til å tømme samtalen ved rombytte. Den inngår ikke i statusen som sendes til API-et eller modellen. Eksisterende aktiviteter beholder sine oppdragsnøkler når den valgfrie egenskapen ikke brukes.

## Kontroll og utprøving

**Dev-status 4. november 2026:** Feilen der romvisningen ble tømt ved profiloppdatering er gjenskapt i nettleser på forrige versjon. `$effect` leste hele `$lab`-storeobjektet og ryddet lokalt arbeid også når konto-ID-en var uendret. Effekten avhenger nå av en separat `$derived` konto-ID. En avgrenset nettleserkontroll mot ekte lokal API, med én lærer og to separate elevprofiler, bekreftet at gjentatte fokusoppdateringer og den automatiske profiloppdateringen etter 30 sekunder beholder rom og ulagret enhetsnavn. Faktisk kontobytte og utlogging rydder fortsatt rommet. Kodefri innmelding, gjenåpning uten doble medlemskap og pause/fortsett ble også prøvd uten JavaScript-feil. Dette er feilrettingskontroll, ikke full publiseringskontroll eller elevutprøving.

Den avgrensede API-kontrollen `node --test tests/vlanTogetherApi.test.js` besto med 10 tester. Den omfatter også at romlisten ikke gir tilgang til brettet før innmelding, og at eksisterende medlemmer kan åpne et pauset rom. Kontrollen avdekket dessuten at labens feil hadde en kode som den felles feilbehandleren ikke kjente, slik at forventede 400/403/404/409 ble til generiske 500-svar. Feilene bruker nå den eksisterende `NETWORK_`-familien og beholder riktig status og forklaring.

Kildekode og diff er gjennomgått. Samlet testing, Svelte-sjekk og produksjonsbygg gjenstår før main, i tråd med dev-avtalen. Svelte MCP var ikke tilgjengelig; [offisiell dokumentasjon om `$derived`](https://svelte.dev/docs/svelte/$derived) og [`$effect`](https://svelte.dev/docs/svelte/$effect) ble brukt.

Før publisering:

- Kjør full testsuite, Svelte-sjekk og produksjonsbygg mot endringene som faktisk skal merges. Modelltestene dekker kabler/U/T, ulike lokale native-VLAN, ruting via én og flere rutere, returfeil, løkker, adressekonflikter og validering. API-testene dekker eierskap, romisolasjon, samtykke, opptatte porter, samtidige aksepter, gamle revisjoner, utløp, pause, retry, omstart og kontosletting uten XP.
- Prøv med lærer og minst to separate elevkontoer: opprett/join, godta/avslå/avbryt, egne kabler, manglende porter, utløpte forespørsler, configkonflikt i to faner, tapt svar/retry, konto-/rombytte og serveromstart. Verifiser at enhetsutkast bevares under rompolling, profiloppdatering for samme konto og tilføying av enheter, og at gamle pingresultater mister markeringen.
- Prøv 24 samtidige deltakere, inntil åtte enheter hver og en meningsfull felles topologi. Kontroller brettets brukbarhet, responstid, statusoppdatering og faktisk API-grense bak skolens delte IP.
- Kontroller tastatur og berøring, fokus ved enhets-/kabelvalg, forespørsler mens eleven er langt nede på siden, smal skjerm, zoom og begge temaer. Kontroller at labpartneren tømmer romsamtalen og at eldre aktiviteter fortsatt beholder sine oppdragsgrenser og switchforklaringer.

Prøv deretter med elever. Observer hvor lenge det tar å få første svar, om de finner egen port og mottakerens godkjenning, om de kan forklare U/T og returvei, og om de klarer et nytt IP-/VLAN-oppsett med mindre støtte. Skill navigasjonsproblemer fra faglige misforståelser. Ingen læringseffekt er dokumentert av denne implementasjonen alene.


## Publiseringskontroll 5. november 2026

Kontrollert samlet med main `ac695f5` før PR #25. Full testsuite kjørte 338 tester: 337 bestod, og søkets katalogforventning manglet den nye aktiviteten `vlan-sammen`. Forventningen er oppdatert. Etter retting bestod alle 22 berørte søke-, VLAN-modell- og API-tester. Svelte-sjekken fant først 66 typefeil; presise typeangivelser og eksplisitte adressekontroller rettet disse. Sluttkontrollen har null feil og én advarsel om en ubrukt CSS-selektor. Produksjonsbygget bestod etter retting. Svelte MCP er ikke tilgjengelig i dette miljøet.

Chromium mot ekte lokal API, med lærer og to separate elevprofiler: opprette og velge rom, kabelforespørsel og mottakers godkjenning, vellykket ping, ulagret utkast gjennom fokus-/nettverksoppdatering og automatisk profiloppdatering etter 30 sekunder, lagring og pause/fortsett bestod uten JavaScript-feil. Enhetsvalg og fokus ble prøvd med tastatur ved 390 og 1280 pikslers bredde i lyst og mørkt tema. Kodeeksemplenes åpning, linjeforklaring med tastatur, kopiering til utklippstavlen, delt URL etter omlasting og forstørret tekst ble også prøvd. API-testene dekker ugyldige handlinger, eierskap, samtykke, portkonflikter, utløp, retry og omstart.

Dette er teknisk kontroll. Berøring på fysisk utstyr, full belastning med 24 deltakere og utprøving med elever er ikke gjennomført. Eleven avtaler og konfigurerer et nettverk; ping forklarer funksjon og returvei, mens forståelse må undersøkes gjennom forklaring og et nytt oppsett med mindre støtte som beskrevet ovenfor. Ingen dokumentert læringseffekt eller full WCAG-samsvarsvurdering hevdes.


## Videre arbeid på dev – 5. november 2026

Brukerens utprøving avdekket at statusmeldingen la seg over brettet og krevde gjentatt lukking. Den er nå en vanlig statuslinje. Kabelvalg er flyttet til brettet med en eksplisitt modus og en portmeny ved klikket. Dokumentasjon gir elevene et felles port-/adressegrunnlag de kan bruke i samarbeidet. Dette følger pedagogikkens krav om anvendelig respons og faglig elevproduksjon, og designgrunnlagets punkt 4.3 om stabil responsplass og tydelig lagringsstatus.

Kildekode og diff er gjennomgått. Regresjonstester er utvidet for migrering av eksisterende rom, dokumenteierskap, revisjonskonflikter, idempotent lagring, romisolasjon, pause/omstart og kabelavslag til PC. De nye testene er ikke kjørt i denne dev-leveransen. Samlet testing, Svelte-sjekk, produksjonsbygg og nettleserprøving av den nye flyten gjenstår før main; publiseringskontrollen ovenfor gjelder forrige versjon. Svelte MCP er ikke tilgjengelig. Offisiell [Svelte-dokumentasjon](https://svelte.dev/docs/svelte/$effect), [SvelteKit-navigasjon](https://svelte.dev/docs/kit/$app-navigation#beforeNavigate) og [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using) er brukt.

Før main: prøv portmeny ved mus, tastatur og berøring, Escape/klikk utenfor, skjermkant og smal skjerm; egne kabler og godkjente/avslåtte forespørsler; PC som feil mål og som lokal kilde; opptatte porter og sletting mens menyen er åpen. Kontroller at tilbakemeldinger ikke dekker brettet. Prøv områdenavn, tom/lengste dokumentasjon, tekst som ligner HTML, lesing av andre områder med eget ulagret utkast, konflikt i to faner, tapt lagringssvar/retry, pause, rom-/kontobytte og oppgradering fra migrasjon 017. Kontroller at notatlagring bevarer et gyldig pingresultat og at friteksten ikke deles med labpartneren. Elevutprøving må undersøke om dokumentasjonen faktisk hjelper elevene å avtale og forklare nettverket.
