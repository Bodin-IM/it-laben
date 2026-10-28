# Fag, moduler og enkeltinnhold

Moduler samler undervisning, øvinger og oppdrag. I elevens fagoversikt vises aktive moduler først og ferdige moduler etterpå. Kommende moduler er skjult fra elevoversikten til læreren aktiverer dem. Kortene har tekstmerket **Modul** og en tydelig status. Under modulene ligger fortsatt alle fagets enkeltøvinger, oppdrag og spill, også innhold som er lenket fra en modul. Søket finner både synlige moduler og enkeltaktiviteter. Typefilteret gjelder enkeltaktivitetene, mens fagvalget gjelder begge oversiktene. [Designvurderingen og utkastet](designvurdering-og-utkast.md) dokumenterer den første utformingen.

## Modulstatus og lærerens styring

Lærere og administratorer kan endre status fra **Lærerpanel → Undervisning** og inne på hver modul. Statusen er felles for **2ITA og 2ITB**; klassene har ikke separate modulplaner.

| Status   | Hva eleven ser                                                                                        | Lærerens bruk                                                 |
| -------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Kommende | Modulen er skjult fra elevoversikten. En direktelenke til modulsiden viser at den ikke er åpnet ennå. | Forbered innholdet før klassen skal bruke det.                |
| Aktiv    | Modulen vises først i oversikten.                                                                     | Vis hva klassen arbeider med nå.                              |
| Ferdig   | Modulen er synlig etter de aktive og kan åpnes igjen.                                                 | Behold forløpet tilgjengelig for repetisjon og videre arbeid. |

Læreren velger status og lagrer med **Aktiver modulen**, **Marker som ferdig** eller **Skjul som kommende**. Flere moduler kan være aktive samtidig. Å aktivere én modul avslutter ingen andre; læreren velger selv når en modul er ferdig eller skal bli kommende igjen. Innenfor hver statusgruppe beholdes modulenes innholdsrekkefølge.

**Ferdig** betyr at undervisningsforløpet er avsluttet av læreren. Det endrer ikke elevenes gjennomføring, vurdering, forsøk, lagrede løsninger eller XP. En elev kan fortsatt arbeide i en ferdig modul og bruke aktivitetenes vanlige progresjonsregler.

### Lagring og tilgang

Status lagres i backendens SQLite-database og følger med ved omstart og vanlig databasebackup. Migrasjon `010_module_publication.sql` setter de fire eksisterende modulene til aktive for å bevare tidligere tilgjengelighet. Nye katalogmoduler uten lagret status starter som kommende.

Hver endring bruker en revisjon. Hvis en annen lærer eller fane har endret modulen siden statusen ble hentet, avvises en motstridende lagring med `MODULE_CONFLICT`. Hent siste lagrede status og velg endringen på nytt. Identisk gjentakelse av den siste endringen etter et tapt svar oppretter ikke en ekstra endring. Grensesnittet bekrefter lagring først etter svar fra serveren.

`GET /api/modules` gir bare modul-ID, status, revisjon og oppdateringstid, uten innlogging eller elevdata. Lesekallet bruker ingen sesjonscookie. Endringer via `POST /api/teacher/modules/:moduleId` krever lærer-/administratorrolle, riktig konto og de vanlige Origin- og CSRF-kontrollene. API-et krever HTTPS i produksjon.

På skolens åpne HTTP-adresse er enkeltleksjoner, øvinger og spill fortsatt tilgjengelige. Den administrerte moduloversikten og modulsidene peker videre til HTTPS, der statusen kan hentes. Dersom status ikke kan hentes første gang, vises en feilmelding med mulighet til å prøve igjen; systemet antar ikke at alle moduler er aktive. En tidligere hentet status kan vises med melding om at den ikke er oppdatert.

Dette er styring av navigasjon og undervisningstempo. **Kommende** er ingen sikkerhetssperre rundt de statiske leksjonene: enkeltaktivitetene kan fortsatt åpnes direkte. Private lærernotater og administrasjon har egne kontroller på serveren.

## Innholdstyper

| Type              | Bruk                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Undervisning      | Eksisterende opplegg for felles gjennomgang. Elever får lenker til åpent repetisjonsinnhold. Innloggede lærere får i tillegg lenke til læreropplegget. |
| Teori og eksempel | Kort faglig innføring før øving, som tabeller og dokumenter i databasemodulen.                                                                         |
| Øving             | Veiledet arbeid eleven kan gjøre selv. Tilsvarer den eksisterende tekniske kategorien `leksjon`.                                                       |
| Oppdrag           | Anvendelse og feilsøking. Eksisterende spill vises med merket **Oppdrag · Spill**.                                                                     |
| På egen maskin    | Praktisk kodeoppgave med oppsett, startprosjekt og testkriterier. Arbeidet vurderes utenfor IT-laben.                                                  |

Modulen er en samling, ikke en ny aktivitetstype som gir XP. «Aktiviteter» er fortsatt et samlebegrep. Betegnelser i oversikten endrer ikke aktivitetenes ID-er, URL-er, tester, forsøk eller belønninger. Gamification bestemmer ikke innholdets pedagogiske rolle.

## Første samlinger

- **Meldingens reise:** felles gjennomgang, frontend/backend-øving og dataflytspillet.
- **Data og lagring:** gjennomgang av minne og fil, fillagring og Øving 5–7.
- **Innlogging og tilgang:** gjennomgang, sessions, Øving 8–9, chatrom og de to feilsøkingsspillene. Forutsetter tidligere arbeid med dataflyt og lagring.
- **Fra kode til drift:** det eksisterende tverrfaglige opplegget «Fra kode til tjeneste», Øving 10 og repetisjonslenker. Dette er en første samling av eksisterende stoff, ikke et komplett driftskurs.

Nattevakten ligger fortsatt tilgjengelig blant enkeltspillene. Moduler må ikke ha alle innholdstypene, og elever kan alltid åpne enkeltdeler direkte.

## Modulsiden

Hver modul har mål, forkunnskaper, anbefalt rekkefølge og eventuelle repetisjonsressurser. Mål og forkunnskaper åpnes rett under introduksjonen. På mobil vises arbeidsrekkefølgen før ekstraressursene. Lenker til modulens aktiviteter tar med `modul` i adressen, slik at eleven får en tilbakevei også etter oppfrisking. Tilhørighet vises bare for sider som faktisk er del av eller lenket fra modulen. Gjennomgang og elevarbeid kan bruke samme side i ulike sammenhenger. Innholdet til gjennomgangen kan åpnes uten lærerrolle; private notater hentes fortsatt bare gjennom det beskyttede lærer-API-et.

Under **Ditt arbeid** ser eleven antall unike elevaktiviteter som API-et allerede har merket **Gjennomgått** eller **Bestått**. Dette er elevens personlige progresjon, atskilt fra lærerens modulstatus. Undervisning, åpning av modulsiden og bare påbegynt arbeid teller ikke som fullføring. Modulen tildeler ingen nye poeng eller merker, og progresjonen kalles ikke dokumentert forståelse. Uten innlogging eller tilgjengelig progresjon vises ingen personlig status.

Læreren får statuskontroll og relevante forslag til gjennomgang inne i modulen. Forslagene leder til eksisterende læreropplegg og storskjermvisning. Hele biblioteket er fortsatt tilgjengelig fra mindre lenker under modulene på undervisningssiden. Se [undervisningsveiledningen](undervisning.md).

## Begrunnelse for organiseringen

Aktive moduler først og synlig lagringsstatus følger prosjektets anvendelse av U1 og U6 i [designgrunnlaget](webdesign-og-brukeropplevelse.md): gjør dagens arbeid lett å finne, vis hva en handling førte til, og plasser støtte i en forståelig sammenheng. Å beholde ferdige moduler tilgjengelige støtter muligheten til å gå tilbake og styre eget arbeid i [det pedagogiske grunnlagets del 3](pedagogisk-grunnlag.md#3-progresjon-støtte-og-elevens-styring). Skillet mellom undervisningsstatus og elevprogresjon viderefører [del 7](pedagogisk-grunnlag.md#7-vurdering-og-lærerens-rolle): gjennomføring dokumenterer ikke alene forståelse.

Statusnavnene, rekkefølgen og plasseringen av forslag er lokale designvalg. Endringen organiserer eksisterende innhold og innfører ingen nye læreplanmål eller vurderingsregler. Faktisk bruk med elever og lærere må vise om organiseringen er forståelig.

## Videre innhold og pedagogisk avgrensning

Databasemodulen har en første ferdig runde med teori, tre søkeøvinger og en praktisk Node.js-oppgave. Modulen starter som kommende og aktiveres fra lærerens undervisningspanel. Videre runder er merket som planlagt. Se [opplegg, læreplan og avgrensninger](databasemodul.md). Denne modulen bruker lokal øvingsstatus uten XP; den eksisterende serverstatusen teller bare aktiviteter i progresjonskatalogen. `teori` og `praksis` er egne stegtyper, og moduler kan hente offentlig øvingsinnhold fra `altElevinnhold` uten å opprette poengaktiviteter.

Ved nye eller vesentlig endrede Vg2-moduler brukes [læreplangrunnlaget](laereplangrunnlag.md) og [aktivitetsmalen](aktivitetsmal.md). Oppgi relevante programfag og kompetansemål i modulens veiledning eller arbeidsplan, og beskriv hvordan undervisning, øving og ny anvendelse bidrar til dem. De korte elevmålene på modulsiden skal konkretisere opplegget; de skal ikke fremstilles som ordrette kompetansemål. Gjør avgrensninger og videre arbeid synlig.

Samlingene følger [det pedagogiske grunnlaget](https://github.com/Bodin-IM/it-laben/blob/main/docs/pedagogisk-grunnlag.md). Denne endringen organiserer eksisterende innhold. Tilbakemeldinger og faglige tester beholdes på enkeltsidene; navigasjonen vurderer ingen elevsvar. Videre utvikling av en modul skal beskrive en ny anvendelse med mindre støtte, og hvordan lærer eller elev kan undersøke forståelsen. En gjennomgått samling dokumenterer ikke i seg selv overføring eller læringseffekt.

Registrer moduler i `src/lib/moduler.js`. Bruk stabile aktivitets-ID-er fra `innhold.js` og oppleggs-ID-er fra `teaching.js`. `steps` angir rekkefølge og innholdstype; `resources` lenker til åpne aktiviteter. Private lærernotater skal fortsatt ligge i `server/teaching.js`. De dynamiske modulrutene blir forhåndsbygget som statiske sider, også for direkte åpning og oppfrisking.

Ved utprøving: sjekk om elever finner riktig modul, forstår forskjellen på gjennomgang og elevarbeid, og finner igjen et spill uten å gå gjennom modulen først. Vurder pedagogisk effekt separat fra teknisk navigasjon.

## Teknisk kontroll av første modulversjon – historikk

`npm run check`, `npm run build` og 127 tester bestod. Nettleserprøven kontrollerte fagvalg, modulrekkefølge, søk og typefilter, gamle `#spill`-/`#ovingene`-lenker, alle modulrutene, oppfrisking, tilbakeknapp og lenker til enkeltsider. Elev-/lærervisning og progresjon ble prøvd med simulerte API-svar. Ingen progresjonsskriving ble utløst ved modulnavigasjon. Lyst/mørkt tema, tastatur og bredder på 1440, 390 og 320 piksler er kontrollert. Pedagogisk utprøving med elever gjenstår.

Denne kontrolloggen gjelder den første modulversjonen, før læreradministrert modulstatus. Den dokumenterer ikke nettleserprøving av de nye statuskontrollene eller den endrede lærerinngangen. Slik nettleserprøving er ikke gjennomført i denne arbeidsøkten og gjenstår, sammen med utprøving med elever og lærere.
