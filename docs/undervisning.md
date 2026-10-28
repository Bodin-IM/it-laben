# Undervisningsmodus og elevleksjoner

Undervisningssiden samler modulstyring, læreropplegg, lærerveiledninger og storskjermvisning. Lærere og administratorer starter i moduloversikten på `/laerer/undervisning/`. Bruk den separate lokale dev-databasen fra [elevadministrasjon](elevadministrasjon.md) når du prøver løsningen med testprofiler.

Eksempelvisninger fra den første undervisningsversjonen: [undervisningsbibliotek](teaching-library.png), [lærerveiledning](teaching-guide.png) og [storskjermvisning](teaching-presentation.png). De viser ikke den nye moduladministrasjonen.

## Lærerens startside og moduloversikt

Når en innlogget lærer eller administrator åpner den vanlige forsiden `/`, går hen til **Undervisning**. Det samme skjer etter vellykket nøkkelinnlogging. Logoen og **Lærerpanel** går dit, og **Undervisning** er første lærerfane. **Oversikt**, **Elever** og **Aktiviteter** beholdes.

**Fagoversikt** og **Åpne elevvisningen** bruker `/?visning=elev`, slik at læreren kan åpne elevoversikten uten å bli sendt tilbake. Eksplisitte fagvalg, søk, ankere og direktelenker bevares. Å åpne **Min lab** som allerede innlogget lærer gir fortsatt tilgang til profil og innstillinger.

Læreroversikten viser én kompakt rad per modul i fast katalogrekkefølge. Raden beholder plassen når status endres. Modulnavnet åpner innholdet; fag og omfang står under navnet. Søk og fagfilter avgrenser modulene, og antall aktive, fullførte og kommende gjelder det synlige utvalget. Elevoversikten viser fortsatt aktive moduler først. Under listen ligger **Støtte til undervisningen**, med lenker til alle opplegg og elevleksjoner. Relevante forslag til gjennomgang vises inne i hver modul, der læreren også ser mål, forkunnskaper og elevarbeid.

Læreren velger **Kommende**, **Aktiv** eller **Fullført** i tre synlige radiovalg. Valget lagres automatisk. Raden viser **Lagrer …** og deretter **Lagret** først etter bekreftet svar. Ved feil vises sist bekreftede status og en forklaring; læreren kan hente siste status eller velge på nytt. Inne på selve modulsiden beholdes den eksisterende statusmenyen med eksplisitt lagreknapp; **Fullført** og **Ferdig** er samme status (`completed`). Statusen gjelder begge klassene, **2ITA og 2ITB**. Flere moduler kan være aktive; ingen annen modul avsluttes automatisk. Kommende moduler skjules fra elevoversikten, mens ferdige moduler fortsatt kan åpnes for repetisjon. **Ferdig** beskriver undervisningsforløpet og endrer ingen elevs progresjon, vurdering eller XP.

Status lagres i backend, med revisjonskontroll ved samtidige endringer. Ved konflikt henter læreren siste lagrede status før et nytt valg lagres. Oversikten har nå Backend og Databaser. Øving 10 inngår i Backend og følger modulens eksisterende status; den har ingen egen modulrad. Nye moduler uten lagret status er kommende. [Modulveiledningen](moduler.md) beskriver migreringshistorikk, lagring, rettigheter og avgrensninger.

Skolens åpne HTTP-versjon beholder enkeltleksjoner, øvinger og spill. Den administrerte moduloversikten peker til HTTPS, hvor modulstatus kan hentes. Skjuling av kommende moduler styrer navigasjonen; den beskytter ikke det statiske leksjonsinnholdet. Private lærernotater og skrivehandlinger krever fortsatt autorisasjon på serveren.

Den kompakte visningen følger U1, U3, U6 og U7 i [designgrunnlaget](webdesign-og-brukeropplevelse.md): vis valgene samtidig, gi forståelig lagringsstatus, fjern gjentatt tekst og bevar stabil plassering. Radiovalgene har native tastaturbetjening, felles `fieldset`/`legend` med modulnavn og minst 44 piksler høye trykkflater. Valgt status vises med tekst, markert radioknapp, ramme og farge. Se også [W3Cs veiledning om gruppering av kontroller](https://www.w3.org/WAI/tutorials/forms/grouping/). Tre statusbokser og fast rekkefølge er lokale designvalg, ikke et forskningskrav. Ferdige moduler beholdes i tråd med muligheten til å gå tilbake i [pedagogikkgrunnlagets del 3](pedagogisk-grunnlag.md#3-progresjon-støtte-og-elevens-styring); skillet fra vurdert forståelse følger [del 7](pedagogisk-grunnlag.md#7-vurdering-og-lærerens-rolle). Dette er lokale valg for organisering av eksisterende innhold, uten nye læreplanmål eller endrede vurderingsregler.

## To typer innhold

**Elevleksjoner** er materialet på forsiden. Eleven kan lese, prøve forsøk, løse oppgaver og ta fagsjekker selv. Kortene er merket **Øving · Gjør selv**. Vanlige regler for progresjon og XP gjelder. [Moduler](moduler.md) samler undervisning og elevarbeid i en anbefalt rekkefølge; alle øvinger og spill er også tilgjengelige hver for seg under modulene.

**Undervisningsopplegg** ligger under **Lærerpanel → Undervisning**, på `/laerer/undervisning/`. Et opplegg samler mål, tidsforslag, leksjonsrekkefølge, spørsmål til klassen, private lærernotater og forslag til selvarbeid etterpå. Oppleggene er egne innholdselementer og inngår ikke i elevenes aktivitetsliste, fullføringskrav eller XP.

Modulsiden viser relevante opplegg og administrasjonskontroller til lærer og administrator. Elever får modulens vanlige gjennomgangs- og aktivitetslenker.

Direktelenker med `?opplegg=<id>` åpner tilgjengelige læreropplegg, og `?vis=leksjoner` åpner **Elevleksjoner · rask tilgang**. `?vis=opplegg` åpner hele undervisningsbiblioteket; undervisningssidens adresse uten slike valg åpner moduloversikten. «Fra kode til tjeneste» er fjernet fra biblioteket og lærer-API-et. Den gamle oppleggslenken viser at opplegget ikke finnes. Øving 7, 9 og 10 er fortsatt tilgjengelige som enkeltøvinger og i Backend.

## Gjennomfør en økt

1. Åpne **Undervisning** og velg modulen klassen arbeider med. Velg **Aktiv** når elevene skal begynne, og se at raden bekrefter lagring.
2. Åpne et av modulens forslag til gjennomgang for å lese mål, forberedelser og lærernotater. **Alle undervisningsopplegg** under moduloversikten gir også tilgang til hele biblioteket med søk og fagfilter.
3. Velg **Start gjennomgangen** eller **Vis på storskjerm**.
4. Bruk forsøkskontrollene i leksjonen som vanlig. Verktøylinjen lar deg velge leksjon, gå videre eller tilbake og bruke fullskjerm.
5. **Lærerveiledning** åpner forberedelsene i en egen fane. Den kan ligge på lærerskjermen mens leksjonen vises for klassen.
6. **Avslutt visning** går tilbake til opplegget. Elevene bruker de vanlige elevlenkene til etterarbeidet.
7. Når dere er ferdige med forløpet, velg **Fullført** i oversikten og se at raden bekrefter lagring. Elevene beholder tilgang til modulen for repetisjon.

Storskjermvisningen bruker `?visning=presentasjon`, eventuelt med `opplegg=...`. Den krever innlogget lærer-/administratorrolle. En elev som følger samme leksjonslenke får vanlig elevvisning.

I presentasjon skjules vanlig sidehode, Min lab-lenker, personlig progresjon, fagsjekker og belønningsmeldinger. Øving 5–10 viser selve forsøket; egne oppgavekort og prosjektkontekst skjules under fellesvisningen. Ingen gjennomgang, XP, fagsjekkforsøk eller øvingsforsøk registreres for læreren ved å vise leksjonene. Allerede ventende innsendinger fra eget arbeid beholder sin vanlige synkronisering.

**Elevleksjoner · rask tilgang** viser alle elevleksjonene samlet. Du kan vise én direkte uten å bruke et helt undervisningsopplegg.

## De første oppleggene

| Opplegg             | Tid    | Gjennomgang                                                                 |
| ------------------- | ------ | --------------------------------------------------------------------------- |
| Meldingens reise    | 35 min | Frontend/backend og chatrom, deretter To nettlesere, én chat som selvarbeid |
| Hvem er logget inn? | 45 min | Sessions, avsender og eierskap; forslag til Øving 8 og Redd chatten etterpå |
| Data som overlever  | 40 min | Minne, fillagring og trygg endring med Øving 5–6                            |

Tidsforslagene inkluderer avslutning og samtale. Oppleggene gir ikke automatisk elever godkjenning eller poeng. **Undervisningsforsøk** under **Aktiviteter** er fortsatt et separat verktøy for å åpne et ekstra vurdert forsøk for klassen.

## Legg til mer innhold

- Elevleksjoner registreres som før i `src/lib/innhold.js`, med `audience: 'student'` og en passende tracking-definisjon. De kommer med på forsiden og under rask tilgang.
- Undervisningsopplegg registreres i `teachingPlans` i `src/lib/teaching.js`, med `audience: 'teacher'`. Referer til leksjoner med stabile ID-er. `selfWorkIds` peker bare til elevaktiviteter.
- Lærernotater registreres i `teachingGuides` i `server/teaching.js`. Hver leksjon i opplegget har fokus, spørsmål, notater og et tidsforslag. Valideringen kontrollerer referanser, rekkefølge og tidsramme.
- Egne lærerstyrte leksjonssider kan registreres i `teacherLessons`, adskilt fra elevkatalogen og uten elevtracking. Legg siden på en egen rute, og gi den metadata med ID, tittel, beskrivelse, adresse, fag, `format: 'leksjon'` og `audience: 'teacher'`. Den kan deretter brukes i opplegg og presentasjonsnavigasjon uten å få elev-XP.
- Nye driftsopplegg bruker `subject: 'drift'` og tilsvarende ressurser. Fagfilter og visning trenger ingen egen spesialkode.

Lærernotater hentes fra `GET /api/teacher/teaching`, med serverkontroll av lærerrollen ved hvert kall. Notatene importeres ikke i frontendpakken. En ny lærerstyrt side med privat veiledning må bruke samme tilgangsprinsipp; ikke legg private notater i en elevkomponent.

## Utprøving av endret lærerflyt

Den kompakte oversikten ble kontrollert 28. oktober 2026 med en lokal testdatabase og oppdiktet lærerprofil. Denne kontrolloggen gjelder versjonen før publisering og drift ble innlemmet i Backend:

- Automatisk lagring av alle tre statuser, omlasting, søk, fagfilter og tomt søkeresultat.
- Feilet lagring og nytt forsøk, tregt svar, konflikt med en annen lærerendring og mislykket første henting av modulstatus. Ingen status er valgt før metadata er hentet. Rader og tastaturfokus beholder plassen ved vanlig lagring; fokus trekkes ikke tilbake fra søkefeltet ved et sent svar.
- Elevvisningen skjuler kommende moduler og beholder fullførte moduler tilgjengelige.
- Tastatur med piltaster, emulert berøring, begge temaer og bredder på 1440, 768, 390 og 320 CSS-piksler. Radiovalg har minst 44 piksler høye trykkflater. På smale skjermer stables de tre valgene, uten å krympe teksten.
- 200 % tekststørrelse kombinert med overstyrt linje-, ord- og bokstavavstand ved 1440 og 320 piksler, uten horisontal sideoverflyt. Lange ord i lærerinnholdet kan brytes ved behov.
- Axe-core fant ingen avvik i de prøvde A/AA-reglene for disse skjermbreddene og temaene. Ingen JavaScript-feil ble registrert.
- 199 tester består, samt `npm run check` og produksjonsbygg. Oversikten er også kontrollert etter samlingen til Backend, med tre moduler og ni radiovalg. Backendens statusverdier, revisjonskontroll, elevprogresjon og vurderingsregler er uendret; migreringen av de gamle modulenhetene er beskrevet i [modulveiledningen](moduler.md).

Dette er teknisk kontroll, ikke full WCAG-samsvarsvurdering eller utprøving med en virkelig skjermleser. Den faktiske skoleinstallasjonen og læreres bruk av den nye oversikten må prøves etter oppdatering.

For den senere innlemmingen av publisering og drift i Backend: se [kontroll og gjenstående nettleserprøve](backend-og-tutorial.md#kontroll-av-innlemmingen-av-publisering-og-drift).

## Toppliste med mulighet til å skjule seg

Topplisten er på som standard for nye elevprofiler og kontoer som oppgraderes fra skoleversjonen uten tidligere topplisteinnstilling. Eleven kan velge **Skjul meg fra topplisten** på topplistesiden eller i **Min lab → Profil og nøkkelfil**. **Vis meg på topplisten** viser profilen igjen. Poeng og progresjon beholdes i begge tilfeller.

Migrasjon `007_teaching_and_leaderboard_defaults.sql` bevarer innstillingen til profiler som allerede har vært i bruk i tidligere `dev`. Det omfatter profiler som er skjult. Et eksplisitt valg lagres for senere oppgraderinger. Migrasjon 006 endres ikke.

Elevsidene forklarer bare det eleven trenger for å bruke funksjonen. Merknader om lærerroller, API, serverberegning og rangeringens interne unntak ligger i lærerveiledningen og driftsdokumentasjonen. Regelen om at lærerprofiler, administratorer, skjulte/deaktiverte elever og øvings-XP holdes utenfor rangeringen gjelder fortsatt på serveren.
