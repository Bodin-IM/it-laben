# VLAN-laben – første utkast

Status: utviklet på `dev`, 29. oktober 2026. Rute: `/nettverk/vlan/`, tilgjengelig som fri aktivitet under Driftsstøtte. Ingen ny modul, serverlagret fremgang eller XP. Utkastet skal prøves før det publiseres til `main`.

## Mål og faglig ramme

Målgruppe: Vg2 informasjonsteknologi. Forkunnskaper: PC, kabel, switch og grunnleggende IP-adresser. Første oppdrag introduserer /24 med et konkret adressepar; VLAN, PVID og tagging kommer senere.

Hovedmål fra **ITK02-01, driftsstøtte**, med prosjektets lokale målreferanser:

- [DRS-02](laereplan/ITK02-01.md#drs-02): «planlegge, implementere og drifte fysiske og virtuelle løsninger med segmenterte nettverk».
- [DRS-05](laereplan/ITK02-01.md#drs-05): «utforske og beskrive relevante nettverksprotokoller, nettverkstjenester og serverroller».

Støttemål fra **brukerstøtte**, [BRU-06](laereplan/ITK02-01.md#bru-06): «feilsøke og rette feil ved hjelp av feilsøkingsstrategier og relevante rammeverk».

Avgrensning: Eleven konfigurerer og undersøker IP-adresser, VLAN-medlemskap og 802.1Q-prinsippet i en avgrenset modell. Dette forbereder praktisk implementering; det dokumenterer ikke hele kompetansemålene eller drift av et faktisk nett. Kjerneelementene løsningsarkitektur, informasjonssikkerhet og kreativ problemløsing kommer til uttrykk gjennom topologi, segmentering og systematisk feilsøking. Muntlige ferdigheter brukes i forklaringen til en medelev.

## Forløp og respons

| Oppdrag | Eleven gjør | Modellens respons |
| --- | --- | --- |
| 1. IP-adresser | Retter én adresse for Ansatt på et ferdig oppsatt VLAN 1-nett | Skiller ugyldig adresse, ulikt IP-nett og ping med svar |
| 2. To nett | Setter fire adresser for Ansatt (VLAN 10) og Gjest (VLAN 20) | Kontrollerer kommunikasjon innenfor gruppene og VLAN-skillet |
| 3. PC-porter | Oppretter Ansatt/Gjest i VLAN 10/20, setter PVID og Untagged | Viser klassifisering inn, medlemskap og tagging ut |
| 4. Trunk | Frakter Ansatt/Gjest i VLAN 10/20 over to switcher | Viser tagg på linken, mottakets VLAN og returveien |
| 5. Tre switcher | Bygger Admin (VLAN 30) og Gjest (VLAN 40) gjennom tre switcher med mindre støtte | Undersøker alle hopp, begge grupper og isolasjonen mellom dem |

Hvert oppdrag viser ønsket kommunikasjon, hva som er ferdig satt opp, to konkrete arbeidssteg og en nettverksplan med navn, VLAN-ID, IP-nett og tilhørende PC-er. PC-ene heter for eksempel «Ansatt-PC 1» og «Gjest-PC 2» i kart, innstillinger, ping, hint og kontrolliste. Nettverksplanen beskriver målet, ikke en påstand om at dagens konfigurasjon er riktig. Sluttoppdraget beholder to nett og nye VLAN-ID-er; Admin-navnet er ikke en egen tilgangs- eller rutingsfunksjon.

«Prøv ping» undersøker et valgt par, med en manuelt styrt hendelsesrekke og markert kabel/enhet. «Kontroller oppdraget» undersøker alle relevante par, riktig VLAN-tilhørighet, adresser, tagged uplinker og native-samsvar. Isolasjon undersøkes på VLAN-nivå, slik at ulike IP-nett på samme VLAN ikke feilaktig godkjennes som segmentering. Flere gyldige vertsadresser godtas; systemet krever ikke en bestemt .11/.12-fasit. Ved feil vises inntil tre krav å starte med, mens hele kontrollisten kan åpnes ved behov.

Oppdragene åpnes i rekkefølge. Første oppdrag er tilgjengelig fra start; senere oppdrag krever en bestått, gjeldende oppdragskontroll for alle oppdragene foran. Én vellykket ping er ikke tilstrekkelig. Samme adgangsregel brukes av oppdragsmenyen og funksjonen som bytter oppdrag; «Neste oppdrag» er synlig, men deaktivert til kontrollen består.

Gamle resultater merkes ved endret oppsett eller ping-par, og telles ikke som et nåværende bestått oppsett. Et endret ping-par gjør bare ping-resultatet utdatert; endret IP-/portoppsett gjør også oppdragskontrollen utdatert. Eleven kan gå tilbake til tidligere oppdrag. Endres eller nullstilles et tidligere oppsett, låses oppdragene etterpå til en ny kontroll består. Arbeidet i dem beholdes. Hjelp og nye forsøk har ingen poengtrekk. Arbeidet ligger i sidens minne og beholdes ved oppdragsbytte. Det nullstilles ved konto-/læringsmodusbytte, omlasting og navigasjon bort. Nullstilling av ett oppdrag har et eget bekreftelsessteg som også forklarer låsingen.

Kravet om bestått kontroll før videre progresjon følger brukerens uttrykkelige ønske og erstatter utkastets frie oppdragsvalg. Dette er en lokal avklaring av pedagogikkgrunnlagets elevstyring: eleven beholder tempo, tilbakevei, hjelp og nye forsøk, mens rekkefølgen styres av funksjonskravene. Bestått kontroll er fortsatt ikke dokumentasjon på forståelse. Adgangsregelen er lokal øvingslogikk, ikke serverlagret vurdering.

## Modellens grenser og tekniske valg

- Alle PC-er bruker /24 og sender/mottar untagged. PVID klassifiserer umerket innkommende trafikk. Medlemskap styrer tillatelse og tagged/untagged ut. VLAN 1 er startens default VLAN, ikke en gateway.
- VLAN-ID er 1–4094, inntil åtte VLAN per switch i utkastet. Det er høyst ett untagged VLAN per port i grensesnittet. Endring av untagged oppdaterer ikke PVID automatisk, slik at eleven må undersøke begge retninger.
- En native/PVID-mismatch oversettes faktisk ved mottaket i modellen; den gjøres ikke til en kunstig kabelbruddfeil. Oppdragskontrollen fanger opp både mismatch og mulige lekkasjer mellom gruppene.
- Ingen ekte nettverkspakker sendes. Ruting, DHCP, ARP-tabeller, MAC-læring, STP, løkker og leverandørspesifikk CLI er utelatt. Hendelsesrekken forklarer en forenklet vei for forespørsel/svar, ikke et fullstendig pakkeopptak.
- Modellen starter med VLAN 1 untagged på uplinker. Oppdragene krever at arbeids-VLAN-ene bæres tagged. Dette er et undervisningsoppsett, ikke en sikkerhetsanbefaling om native VLAN i produksjon.

Faglig referanse: [Ciscos VLAN Trunking-guide](https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/vlan/vlan-configuration-guide/configure-vlan-trunks.html), særlig trunk, tillatte VLAN og native VLAN. Lest 29. oktober 2026. Vi gjenbruker prinsippene, ikke Ciscos konkrete kommandogrensesnitt eller alle standardverdier. Betegnelser og innstillingsmåter må sammenlignes med utstyret elevene bruker.

## Design og pedagogisk oppfølging

Arbeidsflaten samler kart og PC-innstillinger øverst, med en separat switchkonfigurasjon i full bredde under og et tydelig markert testområde nederst. På brede skjermer har PC-panelet en fast plass ved siden av kartet. PC-klikk oppdaterer panelet og flytter fokus til overskriften; visningen rulles bare så langt som nødvendig for å få panelet fram. På smal skjerm ligger panelet rett under kartet, med PC-liste og tilbakevei. Dette erstatter den tidligere flyten der et PC-klikk oppdaterte et felles konfigurasjonspanel lenger ned, ofte utenfor synsfeltet.

PC-valget og switchvalget beholdes hver for seg. VLAN-tabellen forsvinner derfor ikke når eleven velger eller redigerer en PC. Switchknappene S1–S3 lar eleven bytte switch ved tabellen; klikk på en switch i kartet går direkte til dette området. «Vis S1, port 2» fra PC-panelet velger riktig switch og markerer portkolonnen og det tilhørende PVID-feltet. Portkolonnens «Valgt»-tekst supplerer fargen. Dette er lokale designvalg etter nærhet mellom handling og respons, stabil plassering og gruppering i U1/U6 og designgrunnlagets del 4.3.

Lokale snarveier og «Gå til testing» gjør testen tilgjengelig uten å plassere den øverst. Oppdragskontroll og neste-knapp står først i testområdet; ping er en separat feilsøkingsdel under. Manglende krav får «Se …»-snarveier til PC-en eller switchporten som kravet gjelder. Par- og trunkkrav kan ha to snarveier; de peker på relevante steder å undersøke, ikke en påstått enkeltårsak. Navigasjonsmålene følger kontrollradene som navngitte enhets-/port-ID-er, uten å tolke visningsteksten. Utdaterte kontrollresultater vises som historikk uten feilsnarveier. Selve godkjenningsreglene er uendret.

Etter en ping kan eleven følge hendelsene ved selve kartet, der styreknappene og kabelmarkeringen vises sammen. Lenker går begge veier mellom kart og testområde. Dette motvirker den ekstra rullingen som en stablet arbeidsflate ellers kunne gitt ved stegvis feilsøking.

Native knapper, feltetiketter, en alternativ PC-liste, switchknapper og kabler som tekst gir betjening uten dragging. Topologien og VLAN-tabellen kan rulles vannrett i egne felt ved behov på smal skjerm. Farge suppleres av tekst og hendelser. Felles tema og tekstvariabler gjenbrukes, uten animasjoner som krever pause. Dette er lokale valg etter designgrunnlagets U1, U3 og U6, med tilgjengelighet som arbeidsmål.

Switchpanelet har én samlet VLAN-tabell, med brukerens EdgeSwitch-skjermbilde som referanse. Valget mellom Per port og Per VLAN er fjernet. VLAN-ID og nettverksnavn står til venstre; nummererte portkolonner viser medlemskapet på hver VLAN-rad. Bare topologiens faktiske porter vises.

- Hver portrute er en native knapp som bytter **U → E → T → U** ved klikk, Enter eller mellomrom. U betyr Untagged, E betyr Exclude og T betyr Tagged. Bokstav, forklaring og farge brukes sammen, med 44 × 44 px trykkflater.
- Knappens tilgjengelige navn oppgir switch, port, tilkobling, VLAN, nåværende medlemskap og neste valg. Fokus blir i samme rute når medlemskapet endres.
- PVID vises separat under tabellen for hver nummererte port, sammen med tilkoblet PC/switch. Portsnarveien fra en PC flytter fokus til riktig portkolonne i tabellen.
- Når U settes på et nytt VLAN, blir tidligere U til E på samme port. En statusmelding forklarer denne endringen og oppgir at PVID er beholdt. PVID må fortsatt konfigureres av eleven.

Medlemskap og PVID endrer samme konfigurasjon og merker tidligere ping/kontroll som utdatert. Ferdig oppsatte switcher kan undersøkes, men innstillingene er låst. Matrisen gjenbruker dagens nettverksmodell; den er ikke en full kopi av EdgeSwitch-funksjonene.

Dette synliggjør sammenhengen mellom porter og VLAN i én oversikt og følger brukerens ønskede, gjenkjennelige arbeidsmåte. Valget følger designgrunnlagets synlige valgmuligheter og gruppering (U1/U6), men må prøves med elever. Kartet beholder enhetsvalg; IP-innstillinger ligger ved kartet, og switchkonfigurasjonen ligger under.

Forløpet følger pedagogikkgrunnlagets overkommelige start, undersøking, endring og ny anvendelse. Be eleven forutsi før ping, forklare stoppstedet og endre én ting om gangen. En medelev kan være observatør og begrunne neste test før rollene byttes.

Tegn på forståelse: Eleven kan skille IP-nett fra VLAN, forklare PVID inn/untagged ut, følge en tag gjennom midtswitchen og forklare hvorfor en trunk ikke ruter mellom VLAN. En bestått kontroll alene er ikke vurdert forståelse. Be eleven bygge en ny plan med andre VLAN-ID-er og IP-nett, først på papir og deretter i Packet Tracer eller på labens switcher. Dokumenter både ønsket forbindelse og ønsket isolasjon, og begrunn feilsøkingen.

## Labpartner

Ny adapter `kind: vlan`, felles protokollversjon 2 og adapterversjon 1. Tillatte felt er kjent oppdrags-ID, enhet og gyldig port på den enheten, antall åpne hint, om et forsøk er kjørt/utdatert og en begrenset revisjonsteller. Ukjente felt, oppdrag, porter og versjoner avvises. Ingen inntastede IP-adresser, konfigurasjonsobjekter, testfasit, elevdata eller fritekst sendes. Oppdragsbytte bruker eksisterende `taskKey` og tømmer samtalen; endringer i konfigurasjon merker gamle svar som utdaterte via revisjonen.

Serveren bygger mål, utgangspunkt, arbeidssteg, teori og bare åpne hint fra samme oppdragsmetadata. Begrensningen forteller uttrykkelig at veilederen ikke ser konfigurasjonen eller testresultatet og ikke kan anta at arbeidet er riktig. Dette er bevisst avgrenset i første utkast; full, validert konfigurasjonskontekst kan vurderes senere. Valgt VLAN-rad deles ikke; portfeltet viser sist valgt, fokusert eller redigert port på switchen.

Etter oppdelingen i to synlige paneler er delt enhet fortsatt den eleven sist valgte eller redigerte. En PC deler fortsatt `portId: null`, selv om en switchtabell også er synlig. Panelets valgte switch beholdes lokalt og endrer ikke delingskontrakten.

## Kontroll og utprøving

Koden og diffen er gjennomgått på `dev`. Sju testgrupper er skrevet for gyldige alternative adresser, feilede startoppsett, IP-konflikter, VLAN-isolasjon, manglende trunk-hopp, returtrafikk, native-mismatch, kontekstgrenser og adgang til neste oppdrag. Den nye progresjonsgruppen dekker ping alene, mislykket/full kontroll, forsøk på å hoppe over et oppdrag, utdatert resultat, ny kontroll og nullstilling med bevart senere arbeid. **Testene er ikke kjørt på dev**, etter avtalt arbeidsflyt. Svelte MCP var ikke tilgjengelig; offisiell dokumentasjon for [$state](https://svelte.dev/docs/svelte/$state) og [each-blokker](https://svelte.dev/docs/svelte/each) er brukt.

Revisjonene med tydeligere oppdrag og den samlede VLAN-tabellen er også kun kode-/diffgjennomgått. Ingen nye automatiserte tester er lagt til for visningsendringene. Før main må alle tre medlemskap prøves med gjentatte klikk og tastatur: kontroller U → E → T → U, at nytt U setter tidligere U til E på samme port, og at PVID beholdes. Bytt switch, opprett/fjern VLAN, prøv forhåndsoppsatte switcher og bekreft at gamle resultater merkes. Prøv portsnarveien, rulling av tabellen og PVID-feltene med tastatur, mobil, zoom og begge temaer.

Før `main`: kjør samlet testsuite, Svelte-sjekk og bygg. Prøv alle oppdrag og gyldige/ugyldige forsøk, retting etter feil, endring etter bestått, tilbakebytte mellom oppdrag, nullstilling og kontobytte. Kontroller tastatur, fokus, 320/390 px, zoom og begge temaer, samt markering av riktig kabel ved valgt hendelse. Prøv labpartnerens stegbytte, utdatert svar og delingsgrenser. Testene og nettleserprøvingen gjenstår.

Endringen med låst progresjon er også kun kode-/diffgjennomgått. Prøv særlig at både meny og neste-knapp håndhever rekkefølgen, at endring av et gammelt oppsett krever ny kontroll uten å slette senere arbeid, og at reset/kontobytte starter riktig. Kontroller snarveier til testområdet, visning av manglende krav og ping-forløpet med styreknapper ved kartet.

Den siste revisjonen med PC-panel ved kartet, selvstendig switchvalg og feilsnarveier er kode-/diffgjennomgått. Ingen testkjøring, Svelte-sjekk, bygg eller nettleserprøving er utført på dev. Før main må flyten prøves på begge sider av 1100 px, på mobil og med zoom: velg flere PC-er, rediger en IP mens en annen switch er valgt, bruk portsnarveien, bytt switch ved tabellen og gå fra hver type feilmelding til riktig sted. Kontroller at tastaturfokus og portmarkering følger snarveiene, at synlige kontroller ikke hoppes over eller skjules, at oppdragsbytte/nullstilling setter begge panelene tilbake, og at ren navigasjon ikke gjør en bestått kontroll utdatert. Bekreft at labpartnerens enhet/port fortsatt følger aktiv handling og at gamle resultater merkes etter reelle konfigurasjonsendringer.

Prøv deretter med noen elever: Skiller de VLAN fra IP-nett? Forstår de PVID uten at de bare kopierer hintet? Finner de riktig port og stopper de der trafikken faktisk stoppet? Undersøk den nye praktiske oppgaven separat fra interesse og opplevd brukervennlighet. Ingen læringseffekt er dokumentert.
