# VLAN sammen – første versjon på dev

Rute: `/nettverk/vlan-sammen/`, under **Driftsstøtte**. Aktiviteten lar elever bygge og koble sammen egne nett på et felles brett. Eget område ligger nederst, de andre over. Den bygger videre på [VLAN-lab 1](vlan-lab.md) og [VLAN-lab 2](vlan-lab-2.md), men krever ikke bestått-status fra dem. Læreren kan bruke den som en åpen samarbeidsøkt.

## Mål og utgangspunkt

Målgruppe: Vg2 informasjonsteknologi. Eleven skal kunne avtale en port- og adresseplan, konfigurere VLAN, få forbindelse til en medelev og forklare både fram- og returvei. Forkunnskaper er PC/switch, unike IPv4-adresser med /24, U/E/T og ping. Gateway og ruting trengs først i utvidelsen med ulike IP-nett. Bevegelsen fra et fungerende lite nett til egne endringer er et lokalt pedagogisk valg som skal gi en rask, forståelig start.

Hovedmål fra **ITK02-01, driftsstøtte**, med læreplanens ordlyd og lokale referanser:

- [DRS-02](laereplan/ITK02-01.md#drs-02): «planlegge, implementere og drifte fysiske og virtuelle løsninger med segmenterte nettverk».
- [DRS-05](laereplan/ITK02-01.md#drs-05): «utforske og beskrive relevante nettverksprotokoller, nettverkstjenester og serverroller».

Støttemål:

- **Driftsstøtte**, [DRS-06](laereplan/ITK02-01.md#drs-06): «planlegge og dokumentere arbeidsprosesser og IT-løsninger».
- **Brukerstøtte**, [BRU-06](laereplan/ITK02-01.md#bru-06): «feilsøke og rette feil ved hjelp av feilsøkingsstrategier og relevante rammeverk».

Laben øver avgrenset planlegging, segmentering, adressering og feilsøking i en modell. Den dekker ikke hele målene, faktisk drift eller produktspesifikk switchkonfigurasjon. Samarbeidet øver faglig kommunikasjon: elevene må forklare hvilke porter og VLAN de trenger, lese hverandres oppsett og avklare hvem som endrer hva. Skriftlig portplan og en kort feilrapport inngår i lærerens opplegg. Kjerneelementene IT-støtte og kommunikasjon, løsningsarkitektur og kreativ problemløsing får dermed konkrete handlinger.

Misforståelser som skal undersøkes: kabel betyr fungerende nett; samme VLAN-ID alene gir forbindelse; en trunk ruter mellom IP-nett; hvilken som helst ruteradresse kan være gateway; én fungerende retning er nok for ping.

## Start med to elever

1. Læreren logger inn i Min lab, åpner aktiviteten og oppretter et rom. Del romkoden med klassen.
2. Elevene blir med på egne kontoer. Hver deltaker, inkludert læreren, får S1 og PC1 med en kabel på eth0. Start-PC-ene får ulike adresser i `10.10.10.0/24`. Switchene starter med U i VLAN 1.
3. Elev A velger S1, velger en ledig port og trykker **Start kabel**. Deretter velges elev Bs switch i brettet. B får en forespørsel, velger en ledig port og trykker **Godta kabel**.
4. A velger sin PC og Bs PC under **Får du svar?** og sender ping. Undersøk den forklarte pakke- og returveien.
5. Avtal VLAN 10. Opprett det på begge switchene, sett PC-portene til U i VLAN 10 og forbindelsen mellom switchene til T i VLAN 10. Lagre begge oppsett og prøv igjen. Elevene forklarer hvor taggen legges til og fjernes.

Ingen kabel opprettes mellom ulike eiere uten mottakerens godkjenning. Egne enheter kan kobles direkte ved å velge kildeport, målenhet og målport. Begge eiere kan senere koble fra en felles kabel. Konfigurasjonen til andre er synlig, men kan bare redigeres av eieren. Bruk labadresser og oppdiktede enhetsnavn.

## Elevhandling, respons og videre arbeid

| Situasjon | Elevens handling | Respons og nytt forsøk |
| --- | --- | --- |
| Første forbindelse | Avtale porter og sende/godta kabel. | Kabelen kommer på begge brett. En opptatt port gir beskjed og kan byttes. Godkjent kabel er en handling, ikke en faglig godkjenning. |
| VLAN mellom områder | Forutsi, endre U/T, lagre og sende ping. | Serveren undersøker faktiske kabler og medlemskap. Resultatet peker på adresse, VLAN-vei, gateway eller rute som stopper forsøket. |
| Ulike IP-nett | Legge til rutere og velge gateway, interfacer og eventuelle statiske ruter. | Ping prøver framveien og deretter et selvstendig svar. Eleven kan derfor oppdage en manglende returvei. |
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

Alle medlemmer ser brettet, med eget område nederst. Det åpnes ved eget område én gang ved rombytte; polling skal ikke flytte eleven mens andre områder undersøkes. **Til mitt område** fører tilbake. Nettverksbrettet og VLAN-tabellen kan rulles i to dimensjoner. En vanlig enhetsliste er et alternativ til å velge i brettet. Knapper og skjemafelt støtter tastatur, og valget fører til innstillingene. Et kabelvalg fører tilbake til brettet. Farge suppleres av tekst, status og hendelser.

Grensene i første versjon er 24 deltakere per rom, åtte enheter per deltaker og 30 opprettede rom per lærer. Rom kan gjenbrukes; egen arkiverings-/slettevisning finnes foreløpig ikke. Læreren kan pause redigering og ny innmelding. Eksisterende oppsett forblir lesbart. «Aktiv nå» betyr at kontoen har hentet rommet de siste 15 sekundene, ikke en måling av nettverkstilkoblingen.

`017_vlan_together.sql` lagrer rom, medlemskap og kvitteringer for endringskommandoer i den eksisterende SQLite-databasen. Rommet inneholder topologi, konfigurasjoner og ventende forespørsler. API-et bruker pålogging, kontoheader, Origin/CSRF og eksisterende 8 KiB-grense. Alle skrivehandlinger kontrollerer medlemskap og eierskap. Vanlig SQLite-backup inkluderer tabellene. Serveren må oppdateres sammen med klienten; migrasjonen kjøres ved API-oppstart, før laben kan brukes.

Portvalg kontrolleres på nytt i én transaksjon ved godkjenning. To samtidige aksepter kan ikke legge to kabler i samme port. Forespørsler utløper etter fem minutter; maksimalt fire per avsender og 48 per rom venter samtidig. Bare sender og mottaker ser forespørselen, mens godkjente kabler er felles. Switch-løkker, gjenbrukte porter, slettede enheter og gamle forespørsler gir forklarte avslag.

Klienten henter rommet omtrent hvert 2,5 sekund når fanen er synlig. Enhetsutkast redigeres lokalt til **Lagre oppsett**; oppdateringer fra andre erstatter ikke utkastet. Revisjon per enhet hindrer en eldre fane i å overskrive et nyere lagret oppsett. Brukeren velger eksplisitt om lagret oppsett skal erstatte et lokalt utkast. Et API-svar fra tidligere konto eller rom ignoreres. Ulagrede utkast overlever ikke en full omlasting.

Hver endringskommando har en UUID og en kvittering med innholdets hash. Ved tapt svar kan samme handling prøves igjen uten dobbel virkning, også etter serveromstart. En endret handling med samme UUID avvises. Kvitteringene beholdes så lenge medlemskapet/rommet eksisterer; automatisk arkivering og aldersbasert opprydding er videre driftsarbeid. Sletting av en konto fjerner medlemskap og kvitteringer; tilhørende enheter/kabler renses før neste lesing eller endring av rommet. Sletting av rommets eier fjerner hele rommet med kaskade.

## Labpartner

Adapter `vlan-together`, side-ID `vlan-sammen`, protokoll 2 / adapterversjon 1. Den deler bare kjent enhetstype, handlingstype (`configure`/`connect`), om ping er kjørt/utdatert, og romrevisjon. Serveren bygger mål, hint og videre utfordring fra offentlig innhold i `vlanTogether.js`. Ingen romkode, rom-ID, elevnavn, IP-adresse, konfigurasjon, pakkevei eller pingresultat sendes som kontekst. KI må be eleven beskrive et relevant funn og kan ikke påstå at ping lyktes.

En separat, lokal `localTaskKey` bruker romidentiteten til å tømme samtalen ved rombytte. Den inngår ikke i statusen som sendes til API-et eller modellen. Eksisterende aktiviteter beholder sine oppdragsnøkler når den valgfrie egenskapen ikke brukes.

## Kontroll og utprøving

**Dev-status:** Kildekode og diff er gjennomgått. Nye modell-, API- og kontrakttester er skrevet, men ikke kjørt. Ingen påstand om bestått bygg, Svelte-sjekk, nettleser- eller elevutprøving. Samlet testing gjenstår før main, i tråd med repoets dev-avtale. Svelte MCP var ikke tilgjengelig; eksisterende komponenter og offisiell Svelte-dokumentasjon brukes som grunnlag.

Før publisering:

- Kjør full testsuite, Svelte-sjekk og produksjonsbygg mot endringene som faktisk skal merges. Modelltestene dekker kabler/U/T, ulike lokale native-VLAN, ruting via én og flere rutere, returfeil, løkker, adressekonflikter og validering. API-testene dekker eierskap, romisolasjon, samtykke, opptatte porter, samtidige aksepter, gamle revisjoner, utløp, pause, retry, omstart og kontosletting uten XP.
- Prøv med lærer og minst to separate elevkontoer: opprett/join, godta/avslå/avbryt, egne kabler, manglende porter, utløpte forespørsler, configkonflikt i to faner, tapt svar/retry, konto-/rombytte og serveromstart. Verifiser at enhetsutkast bevares under polling og tilføying av enheter, og at gamle pingresultater mister markeringen.
- Prøv 24 samtidige deltakere, inntil åtte enheter hver og en meningsfull felles topologi. Kontroller brettets brukbarhet, responstid, statusoppdatering og faktisk API-grense bak skolens delte IP.
- Kontroller tastatur og berøring, fokus ved enhets-/kabelvalg, forespørsler mens eleven er langt nede på siden, smal skjerm, zoom og begge temaer. Kontroller at labpartneren tømmer romsamtalen og at eldre aktiviteter fortsatt beholder sine oppdragsgrenser og switchforklaringer.

Prøv deretter med elever. Observer hvor lenge det tar å få første svar, om de finner egen port og mottakerens godkjenning, om de kan forklare U/T og returvei, og om de klarer et nytt IP-/VLAN-oppsett med mindre støtte. Skill navigasjonsproblemer fra faglige misforståelser. Ingen læringseffekt er dokumentert av denne implementasjonen alene.
