# VLAN-lab 2 – ruter og Wi-Fi

Rute: `/nettverk/vlan-2/`, under Driftsstøtte. Fortsettelse av [VLAN-lab 1](vlan-lab.md). Fem oppdrag, ingen XP. Eleven må være innlogget og ha bestått alle seks kontrollene i lab 1 på kontoen. Oppdragene i lab 2 åpnes i rekkefølge etter bestått serverkontroll.

## Mål og utgangspunkt

Målgruppe: Vg2 informasjonsteknologi, elever som har arbeidet med /24, unike vertsadresser, VLAN, U/E/T, PVID, trunk og ping i lab 1. Ny teori introduserer gateway, VLAN-interfacer og SSID før eleven konfigurerer dem. Laben er avgrenset øving før implementering i et faktisk driftsmiljø.

Hovedmål fra **ITK02-01, driftsstøtte**, med lokale målreferanser og læreplanens ordlyd:

- [DRS-02](laereplan/ITK02-01.md#drs-02): «planlegge, implementere og drifte fysiske og virtuelle løsninger med segmenterte nettverk».
- [DRS-05](laereplan/ITK02-01.md#drs-05): «utforske og beskrive relevante nettverksprotokoller, nettverkstjenester og serverroller».

Støttemål fra **brukerstøtte**, [BRU-06](laereplan/ITK02-01.md#bru-06): «feilsøke og rette feil ved hjelp av feilsøkingsstrategier og relevante rammeverk».

Eleven skal kunne velge gateway i riktig IP-nett, følge pakke og svar gjennom en ruter, koble SSID til VLAN og skille en tilsiktet tilgangssperre fra en ødelagt forbindelse. Forklaring av funn, valg av neste test og dokumentasjon øver lesing av nettverksplaner, faglig kommunikasjon og systematisk problemløsing. Gjestetilgang knytter informasjonssikkerhet til en konkret handling. Bestått modellkontroll dekker ikke et helt kompetansemål eller dokumenterer selvstendig forståelse.

Vanlige misforståelser: trunk ruter mellom IP-nett; gateway kan være en vilkårlig ruteradresse; VLAN gir automatisk isolasjon også når ruting er tillatt; to SSID-navn sikrer segmentering; et mislykket ping beviser at en sikkerhetsregel virker.

## Elevens arbeid og respons

| Oppdrag | Elevhandling | Respons og støtte |
| --- | --- | --- |
| 1. Veien til et annet nett | Undersøk ferdig ruter og velg gateway på begge PC-er. Forutsi returveien. | Ping skiller manglende gateway fra returfeil. Teori med adresseeksempel står åpen. |
| 2. Én kabel, flere rutenett | Opprett VLAN-interfacer på R1 og tagged uplinker mellom to switcher og ruter. | Pakken stopper ved manglende medlemskap eller feil tag. Nettverksplan og åpningsbare hint støtter nytt forsøk. |
| 3. Trådløst inn i riktig VLAN | Aktiver SSID, koble hvert SSID til VLAN, sett AP-trunk og konfigurer laptopene. | Egen gateway kan testes før trafikk mellom nett. Avslått/feil SSID og feil kabeltagg gir ulike forklaringer. |
| 4. Gjest betyr begrenset tilgang | Sammenlign før/etter og endre R1s tilgangsregler. | Kontrollen krever både fungerende gateway og at R1-regelen sperrer gjesten. Ødelagt trunk blir ikke godkjent som isolasjon. |
| 5. Nøtta | Feilsøk tre switcher med nye VLAN-ID-er, ulike adresser/gatewayer og omkoblede porter. | Mindre oppskrift, flere uavhengige feil og samme tilgjengelige verktøy. Forklar ett funn sammen. |

Fast topologi holder oppmerksomheten på konfigurasjon og årsak/virkning. Eleven undersøker og reparerer, og oppretter egne ruterinterfacer i del 2. Sluttnøtta undersøker overføring med mindre støtte. Flere gyldige vertsadresser godtas; gateway og VLAN følger den oppgitte nettverksplanen. Gjentatte forsøk og hint har ingen kostnad. Automatisk kontroll gjelder konfigurasjon og funksjon. Refleksjon vurderes gjennom samtale, aldri ved at et tekstfelt bare er fylt ut.

## Modell og faglige grenser

- Alle klienter bruker statiske IPv4-adresser og maske /24. R1 har direkte tilkoblede ruter via tagged VLAN-interfacer på én fysisk kabel. Egen gateway betyr den konfigurerte gatewayen til valgt klient.
- Switchtrafikken følger faktisk PVID, VLAN-medlemskap, utgående tag og hver fysisk forbindelse. Ingen forventet fasit brukes til å «teleportere» en pakke. Ping prøver både fram- og returvei og oppdager relevante adressekonflikter.
- AP1 har to faste SSID-navn, Lab-Ansatt og Lab-Gjest. Eleven velger aktivering, VLAN og klientens SSID. AP-trafikken på kabelen er tagged. Modellen undersøker ikke radio, autentisering, kryptering eller AP-administrasjon.
- R1s tilgangstabell tillater/sperrer hvert nettpar i begge retninger. Dette er en forenkling, ikke en full tilstandsbasert brannmur eller en produktspesifikk ACL. R1s egen adresse kan nås fra sitt VLAN selv når ruting til andre nett er sperret.
- Ingen DHCP, DNS, NAT, internett, dynamisk ruting, ARP-tidsforløp, pakketap, STP eller løkker simuleres. Kartet viser ett forklart forløp, ikke en faktisk pakkefangst. Trådløs trafikk undersøkes via AP-uplinken; optimal lokal videresending inne i AP-et inngår ikke.

Faglig kontrollgrunnlag, lest 29. oktober 2026: [Cisco: inter-VLAN-ruting med ekstern ruter](https://www.cisco.com/c/en/us/support/docs/lan-switching/inter-vlan-routing/14976-50.html), [Cisco: SSID til VLAN](https://www.cisco.com/c/en/us/support/docs/smb/wireless/cisco-small-business-100-series-wireless-access-points/smb5172-configure-ssid-to-vlan-mapping-on-a-wireless-access-point.html) og [Cisco: trådløse enheter i VLAN](https://www.cisco.com/c/en/us/td/docs/routers/access/wireless/software/guide/wireless_vlans.html). Laben gjenbruker prinsippene, ikke alle produktinnstillinger eller standardverdier. U/E/T-visningen viderefører brukerens ønskede EdgeSwitch-mønster.

## Grensesnitt og lagring

Kartet har klientvalg, eth-navn ved kablene og en kompakt pingrad nederst. IP/gateway og kontroll ligger ved kartet på bred skjerm og under på mobil. Switchtabellen bruker U → E → T → U og egen PVID-rad; ny U erstatter tidligere U uten å endre PVID. Ruter og AP har egne tydelige områder, side ved side når plassen tillater det. Teori, hendelsesdetaljer og hjelp kan åpnes ved behov.

Dette viderefører gjenkjenning og kort respons fra lab 1 (designgrunnlagets U1/U6), samtidig som nye faglige valg får navn og forklaring. Native knapper, felt og avkrysninger støtter tastatur og berøring. Farge suppleres med hake/kryss, status og forklaring. Lyd styres av den globale knappen, og redusert bevegelse følger felles innstilling og operativsystemet. Ping kan pauses og undersøkes stegvis. Redigering gjør tidligere kontroll utdatert og skjuler gammel pakke.

`013_network_labs.sql` lagrer siste **beståtte** konfigurasjon per konto, lab, oppdrag og innholdsversjon. Bare serverens modellkontroll kan opprette en slik rad. API-et kontrollerer pålogging, Origin, CSRF, konto, innholdsversjon, skjema, låste innstillinger, lab 1-kravet og tidligere oppdrag. Topologi og krav kommer fra serverens kilder. Innsendingen er begrenset til 32 KiB og rutene hastighetsbegrenset. Lagringen gir ingen XP, merker eller topplisteendringer.

Bestått er varig dokumentasjon på en funksjonskontroll. Senere eksperimentering eller et mislykket forsøk trekker ikke tilbake det tidligere adgangskravet. Den åpne fanens neste-knapp krever fortsatt en aktuell bestått kontroll. Omlasting henter sist beståtte oppsett; endringer som ikke er bestått går tapt. Teknisk lagringsfeil beholder åpne inndata og lar eleven prøve kontrollen på nytt. Konto-/modusbytte rydder lokalt arbeid og ignorerer gamle svar. Lab 2 bruker vanlig modus; lab 1 kan fortsatt øves lokalt som gjest/praksis uten å åpne lab 2.

Tidligere utgaver av lab 1 lagret ikke serverbevis. Det finnes derfor ingen historikk å migrere for disse forsøkene. Elever uten lagret bestått må gjennomføre kontrollene på nytt mens de er innlogget. Dette forklares i den låste lab 2-visningen. Kontoens sletting fjerner også laboppsettene med fremmednøkkel/kaskade; ordinær SQLite-backup inkluderer tabellen.

Labpartneren bruker adapter `vlan2`, protokoll 2 / adapterversjon 1. Bare kjent oppdrag, valgt enhet, åpne hint, om kontroll/ping er kjørt eller utdatert, og revisjon deles. Serveren bygger faglig kontekst fra oppdragsmetadata. Ingen elevadresser, SSID-valg, konfigurasjon, resultater eller kontodata deles. Oppdragsbytte tømmer samtalen og redigering merker gamle svar. Animasjonen må pauses før et spørsmål. KI godkjenner aldri oppdrag.

## Ny anvendelse og lærerens oppfølging

La elevene arbeide i par: én forklarer forventet pakkevei, den andre velger en test. Bytt roller. Etter sluttnøtta: gi et nytt VLAN/IP-oppsett på faktiske switcher/ruter/AP eller en egnet nettverkssimulator. Be dem lage en port- og adresseplan og dokumentere to tillatte forbindelser og én tilsiktet sperre, med returvei og begrunnelse. Legg gjerne inn en ny skriver-/IoT-sone. Nettsidens hint er ikke en fasit til det nye nettet.

Se etter om eleven kan forklare forskjellen mellom PVID, tag, gateway og regel, og bruke stoppstedet til å snevre inn feilen. Stadig klikk gjennom U/E/T uten testhypotese kan tyde på gjetting. Oppfølgingen må skille faglige vansker fra navigasjonsvansker. Teknisk kontroll erstatter ikke utprøving med elever; prøv gjerne 3–5 elever med ulike forkunnskaper og følg opp en ny situasjon senere.

## Kontroll før publisering

Se [publiseringskontrollen for lab 2](publisering-vlan-2.md). Svelte MCP var ikke tilgjengelig; offisiell Svelte-dokumentasjon for `$effect` og `$props`, prosjektets Svelte-sjekk og faktisk nettleserprøving brukes. Pedagogisk utprøving og kontroll mot skolens konkrete nettverksutstyr gjenstår.
