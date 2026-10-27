# Driftsstøtte – Modul 1: Fra bits til bytes

Første import av nettverksopplegget fra `drift_web`. Siden ligger på `/drift/`
og vises under Driftsstøtte på forsiden. Branchen heter `Driftsstøtte`.
Utgangspunktet er siste leverte side fra planleggingsøkten; hq var utilgjengelig
ved importen, så eventuelle senere endringer der er ikke hentet inn.

## Mål og utgangspunkt

- **Målgruppe:** Vg2 IT, med SMB-installasjon på egne Siter som praksisramme.
- **Mål:** Forklare LAN/WAN, komponenter og kabler, IP og /24-maske,
  pakkebasert trafikk, MAC-læring, rutede interface og TCP-/UDP-porter.
- **Forkunnskaper:** Kjenne igjen PC, switch og ruter fra fysisk oppkobling.
  Avansert subnetting er ikke nødvendig. Wi-Fi-fordypning, subnetting og VLAN
  kommer senere og inngår ikke i denne importen.
- **Misforståelser:** WAN er alltid internett; alle switchporter trenger IP;
  en TCP-port er en fysisk kontakt; en switch videresender ut fra sin egen IP.

## Elevens arbeid og respons

| Del            | Elevhandling                                   | Respons og nytt forsøk                                                               |
| -------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| LAN/WAN        | Følge trafikken fra PC gjennom switch og ruter | Enhet og forbindelse fremheves sammen med forklaring; gå tilbake eller start på nytt |
| Utstyr         | Velge og sammenligne komponenter               | Oppgave og kabling beskrives ved valgt komponent                                     |
| IP og maske    | Sammenligne et lokalt og et eksternt mål       | Viser direkte levering eller levering via gateway, med ARP forklart                  |
| Pakker         | Endre nyttelasten og følge pakken              | Egen tekst vises som tekst, separat fra adresser; gjennomgangen kan gjentas          |
| MAC            | Stegvis undersøke en tom og en lært MAC-tabell | Forklarer læring, flooding og kjent mottaker; tabellen kan nullstilles               |
| Interface      | Sammenligne rutet interface og switchport      | Viser funksjonsforskjellen og unntak som virtuelle interface                         |
| Tjenesteporter | Sammenligne HTTPS, DNS og SSH                  | Viser protokoll, kildeport, målport og hva tjenesten gjør                            |

Dette er en forklaringsressurs med undersøkelser, ikke en automatisk fagprøve.
Valgene er sammenligninger, ikke riktige eller gale svar. Klikk og viste
leksjoner dokumenterer ikke forståelse. Det gis ingen nye faglige poeng i
leksjonskoden. Felles funksjoner i Min lab beholder sin eksisterende virkemåte;
eventuell markering av gjennomgang er ikke en vurdering av mestring.

## Ny anvendelse med mindre støtte

Bruk elevenes egen Site og en annen adresseplan enn illustrasjonens:

1. Tegn forbindelsen fra mngt-PC til klassenettet, og merk LAN, WAN og gateway.
2. Velg to mål, ett i eget subnett og ett utenfor. Forutsi neste mottaker på
   Ethernet før eleven undersøker egen IP-konfigurasjon og prøver forbindelsen.
3. Finn en klient i switchens MAC-tabell og begrunn porten den er lært på.
4. Beskriv en brannmurtilgang til web og en til SSH med kilde, mål, protokoll
   og målport. Forklar forskjellen fra å velge en fysisk switchport.

La gjerne elevene forklare i par og foreslå en test av hverandres forklaring.
Læreren følger særlig opp om de kan begrunne gateway-valget og skille MAC,
IP og tjenesteport. Hjelp og leksjoner forblir tilgjengelige uten poengkrav.

## Kontroll og videre utprøving

- Kjør `npm run check` og `npm run build` i hele prosjektet.
- Kontroller at forsiden finner siden under Driftsstøtte og at tilbake-lenken virker.
- Prøv alle valg, steg tilbake, omstart, tom nyttelast og tekst som ligner HTML.
- Prøv tastatur, smal skjerm, lyst/mørkt tema og redusert bevegelse.
- Ingen læringseffekt er dokumentert. Utprøving med elever må undersøke både
  begrepsforståelse, bruk av forklaringene og overføring til egen Site.

Den avklarte layouten og de egentegnede symbolene i Cisco-stil er beholdt.
Importen kobler siden til felles temavariabler og eksisterende komponenter;
den endrer ikke andre aktiviteter eller XP-/vurderingsregler.

### Verifisert ved import

- `npm run check`: ingen feil eller advarsler.
- `npm run build`: statisk bygg med `/drift/`.
- Nettleser: lenke fra fagfilteret, alle sju leksjoner, steg tilbake og omstart,
  lokale/eksterne mål, tom og HTML-lignende nyttelast, begge temaer,
  tastaturets hopp-lenke og mobilbredde 390 px. Ingen kjørefeil.
- En mobilfeil der leksjonsmenyen utvidet hele siden ble rettet; menyen ruller
  nå innenfor tilgjengelig bredde.
- Katalogtillegget bruker eksisterende gjennomgangstype. Tre forventninger om
  maksimal XP i backendtestene er økt med katalogens 15 poeng for en ny leksjon;
  opptjening og reglene for eksisterende oppgaver er ikke endret.
- Elevenes forståelse er ennå ikke vurdert gjennom denne importen.
