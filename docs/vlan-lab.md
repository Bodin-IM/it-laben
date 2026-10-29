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
| 1. IP-adresser | Retter én adresse på et ferdig oppsatt VLAN 1-nett | Skiller ugyldig adresse, ulikt IP-nett og ping med svar |
| 2. To nett | Setter fire adresser i to forhåndsoppsatte VLAN | Kontrollerer kommunikasjon innenfor gruppene og VLAN-skillet |
| 3. PC-porter | Oppretter VLAN 10/20, setter PVID og untagged | Viser klassifisering inn, medlemskap og tagging ut |
| 4. Trunk | Frakter VLAN 10/20 over to switcher | Viser tagg på linken, mottakets VLAN og returveien |
| 5. Tre switcher | Bygger VLAN 30/40 gjennom tre switcher med mindre støtte | Undersøker alle hopp, begge grupper og isolasjonen mellom dem |

«Prøv ping» undersøker et valgt par, med en manuelt styrt hendelsesrekke og markert kabel/enhet. «Kontroller oppdraget» undersøker alle relevante par, riktig VLAN-tilhørighet, adresser, tagged uplinker og native-samsvar. Isolasjon undersøkes på VLAN-nivå, slik at ulike IP-nett på samme VLAN ikke feilaktig godkjennes som segmentering. Flere gyldige vertsadresser godtas; systemet krever ikke en bestemt .11/.12-fasit.

Gamle resultater merkes ved endret oppsett eller ping-par, og telles ikke som et nåværende bestått oppsett. Oppdragene er fritt tilgjengelige; hjelp og nye forsøk har ingen poengtrekk. Arbeidet ligger i sidens minne og beholdes ved oppdragsbytte. Det nullstilles ved konto-/læringsmodusbytte, omlasting og navigasjon bort. Nullstilling av ett oppdrag har et eget, forklart bekreftelsessteg.

## Modellens grenser og tekniske valg

- Alle PC-er bruker /24 og sender/mottar untagged. PVID klassifiserer umerket innkommende trafikk. Medlemskap styrer tillatelse og tagged/untagged ut. VLAN 1 er startens default VLAN, ikke en gateway.
- VLAN-ID er 1–4094, inntil åtte VLAN per switch i utkastet. Det er høyst ett untagged VLAN per port i grensesnittet. Endring av untagged oppdaterer ikke PVID automatisk, slik at eleven må undersøke begge retninger.
- En native/PVID-mismatch oversettes faktisk ved mottaket i modellen; den gjøres ikke til en kunstig kabelbruddfeil. Oppdragskontrollen fanger opp både mismatch og mulige lekkasjer mellom gruppene.
- Ingen ekte nettverkspakker sendes. Ruting, DHCP, ARP-tabeller, MAC-læring, STP, løkker og leverandørspesifikk CLI er utelatt. Hendelsesrekken forklarer en forenklet vei for forespørsel/svar, ikke et fullstendig pakkeopptak.
- Modellen starter med VLAN 1 untagged på uplinker. Oppdragene krever at arbeids-VLAN-ene bæres tagged. Dette er et undervisningsoppsett, ikke en sikkerhetsanbefaling om native VLAN i produksjon.

Faglig referanse: [Ciscos VLAN Trunking-guide](https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/vlan/vlan-configuration-guide/configure-vlan-trunks.html), særlig trunk, tillatte VLAN og native VLAN. Lest 29. oktober 2026. Vi gjenbruker prinsippene, ikke Ciscos konkrete kommandogrensesnitt eller alle standardverdier. Betegnelser og innstillingsmåter må sammenlignes med utstyret elevene bruker.

## Design og pedagogisk oppfølging

Et interaktivt kart med et separat panel for valgt enhet holder oppgaven og endringen synlig samtidig. Native knapper, feltetiketter, en alternativ enhetsliste og kabler som tekst gir betjening uten dragging. Smal skjerm stabler panelene; bare selve topologien kan rulles vannrett. Farge suppleres av tekst og hendelser. Felles tema og tekstvariabler gjenbrukes, uten animasjoner som krever pause. Dette er lokale valg etter designgrunnlagets U1, U3 og U6, med tilgjengelighet som arbeidsmål.

Forløpet følger pedagogikkgrunnlagets overkommelige start, undersøking, endring og ny anvendelse. Be eleven forutsi før ping, forklare stoppstedet og endre én ting om gangen. En medelev kan være observatør og begrunne neste test før rollene byttes.

Tegn på forståelse: Eleven kan skille IP-nett fra VLAN, forklare PVID inn/untagged ut, følge en tag gjennom midtswitchen og forklare hvorfor en trunk ikke ruter mellom VLAN. En bestått kontroll alene er ikke vurdert forståelse. Be eleven bygge en ny plan med andre VLAN-ID-er og IP-nett, først på papir og deretter i Packet Tracer eller på labens switcher. Dokumenter både ønsket forbindelse og ønsket isolasjon, og begrunn feilsøkingen.

## Labpartner

Ny adapter `kind: vlan`, felles protokollversjon 2 og adapterversjon 1. Tillatte felt er kjent oppdrags-ID, enhet og gyldig port på den enheten, antall åpne hint, om et forsøk er kjørt/utdatert og en begrenset revisjonsteller. Ukjente felt, oppdrag, porter og versjoner avvises. Ingen inntastede IP-adresser, konfigurasjonsobjekter, testfasit, elevdata eller fritekst sendes. Oppdragsbytte bruker eksisterende `taskKey` og tømmer samtalen; endringer i konfigurasjon merker gamle svar som utdaterte via revisjonen.

Serveren bygger mål, teori og bare åpne hint fra samme oppdragsmetadata. Begrensningen forteller uttrykkelig at veilederen ikke ser konfigurasjonen eller testresultatet og ikke kan anta at arbeidet er riktig. Dette er bevisst avgrenset i første utkast; full, validert konfigurasjonskontekst kan vurderes senere.

## Kontroll og utprøving

Koden og diffen er gjennomgått på `dev`. Seks testgrupper er skrevet for gyldige alternative adresser, feilede startoppsett, IP-konflikter, VLAN-isolasjon, manglende trunk-hopp, returtrafikk, native-mismatch og kontekstgrenser. **Testene er ikke kjørt på dev**, etter avtalt arbeidsflyt. Svelte MCP var ikke tilgjengelig; offisiell dokumentasjon for [$state](https://svelte.dev/docs/svelte/$state) og [each-blokker](https://svelte.dev/docs/svelte/each) er brukt.

Før `main`: kjør samlet testsuite, Svelte-sjekk og bygg. Prøv alle oppdrag og gyldige/ugyldige forsøk, retting etter feil, endring etter bestått, tilbakebytte mellom oppdrag, nullstilling og kontobytte. Kontroller tastatur, fokus, 320/390 px, zoom og begge temaer, samt markering av riktig kabel ved valgt hendelse. Prøv labpartnerens stegbytte, utdatert svar og delingsgrenser. Testene og nettleserprøvingen gjenstår.

Prøv deretter med noen elever: Skiller de VLAN fra IP-nett? Forstår de PVID uten at de bare kopierer hintet? Finner de riktig port og stopper de der trafikken faktisk stoppet? Undersøk den nye praktiske oppgaven separat fra interesse og opplevd brukervennlighet. Ingen læringseffekt er dokumentert.
