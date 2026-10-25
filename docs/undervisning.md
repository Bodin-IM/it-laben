# Undervisningsmodus og elevleksjoner

Utvidelsen ligger på `dev`. `main` og skolens automatiske publisering endres ikke av en push til denne branchen. Bruk den separate lokale dev-databasen fra [elevadministrasjon](elevadministrasjon.md) når du prøver løsningen.

Eksempelvisninger: [undervisningsbibliotek](teaching-library.png), [lærerveiledning](teaching-guide.png) og [storskjermvisning](teaching-presentation.png).

## To typer innhold

**Elevleksjoner** er materialet på forsiden. Eleven kan lese, prøve forsøk, løse oppgaver og ta fagsjekker selv. Kortene er merket **Leksjon · Gjør selv**. Vanlige regler for progresjon og XP gjelder.

**Undervisningsopplegg** ligger under **Lærerpanel → Undervisning**, på `/laerer/undervisning/`. Et opplegg samler mål, tidsforslag, leksjonsrekkefølge, spørsmål til klassen, private lærernotater og forslag til selvarbeid etterpå. Oppleggene er egne innholdselementer og inngår ikke i elevenes aktivitetsliste, fullføringskrav eller XP.

Lærere og administratorer får en **Undervisning →**-lenke på forsiden og en egen inngang i lærerpanelet. Elevvisningen inneholder ikke disse kontrollene.

## Gjennomfør en økt

1. Åpne **Undervisning** og finn et opplegg med søk eller fagfilter.
2. Velg **Åpne opplegget** for å lese mål, forberedelser og lærernotater.
3. Velg **Start gjennomgangen** eller **Vis på storskjerm**.
4. Bruk forsøkskontrollene i leksjonen som vanlig. Verktøylinjen lar deg velge leksjon, gå videre eller tilbake og bruke fullskjerm.
5. **Lærerveiledning** åpner forberedelsene i en egen fane. Den kan ligge på lærerskjermen mens leksjonen vises for klassen.
6. **Avslutt visning** går tilbake til opplegget. Elevene bruker de vanlige elevlenkene til etterarbeidet.

Storskjermvisningen bruker `?visning=presentasjon`, eventuelt med `opplegg=...`. Den krever innlogget lærer-/administratorrolle. En elev som følger samme leksjonslenke får vanlig elevvisning.

I presentasjon skjules vanlig sidehode, Min lab-lenker, personlig progresjon, fagsjekker og belønningsmeldinger. Øving 5–10 viser selve forsøket; egne oppgavekort og prosjektkontekst skjules under fellesvisningen. Ingen gjennomgang, XP, fagsjekkforsøk eller øvingsforsøk registreres for læreren ved å vise leksjonene. Allerede ventende innsendinger fra eget arbeid beholder sin vanlige synkronisering.

**Elevleksjoner · rask tilgang** viser alle elevleksjonene samlet. Du kan vise én direkte uten å bruke et helt undervisningsopplegg.

## De første oppleggene

| Opplegg               | Tid    | Gjennomgang                                                                 |
| --------------------- | ------ | --------------------------------------------------------------------------- |
| Meldingens reise      | 35 min | Frontend/backend og chatrom, deretter To nettlesere, én chat som selvarbeid |
| Hvem er logget inn?   | 45 min | Sessions, avsender og eierskap; forslag til Øving 8 og Redd chatten etterpå |
| Data som overlever    | 40 min | Minne, fillagring og trygg endring med Øving 5–6                            |
| Fra kode til tjeneste | 45 min | Validering, tilgang og publisering; forberedelse til videre driftsarbeid    |

Tidsforslagene inkluderer avslutning og samtale. Oppleggene gir ikke automatisk elever godkjenning eller poeng. **Undervisningsforsøk** under **Aktiviteter** er fortsatt et separat verktøy for å åpne et ekstra vurdert forsøk for klassen.

## Legg til mer innhold

- Elevleksjoner registreres som før i `src/lib/innhold.js`, med `audience: 'student'` og en passende tracking-definisjon. De kommer med på forsiden og under rask tilgang.
- Undervisningsopplegg registreres i `teachingPlans` i `src/lib/teaching.js`, med `audience: 'teacher'`. Referer til leksjoner med stabile ID-er. `selfWorkIds` peker bare til elevaktiviteter.
- Lærernotater registreres i `teachingGuides` i `server/teaching.js`. Hver leksjon i opplegget har fokus, spørsmål, notater og et tidsforslag. Valideringen kontrollerer referanser, rekkefølge og tidsramme.
- Egne lærerstyrte leksjonssider kan registreres i `teacherLessons`, adskilt fra elevkatalogen og uten elevtracking. Legg siden på en egen rute, og gi den metadata med ID, tittel, beskrivelse, adresse, fag, `format: 'leksjon'` og `audience: 'teacher'`. Den kan deretter brukes i opplegg og presentasjonsnavigasjon uten å få elev-XP.
- Nye driftsopplegg bruker `subject: 'drift'` og tilsvarende ressurser. Fagfilter og visning trenger ingen egen spesialkode.

Lærernotater hentes fra `GET /api/teacher/teaching`, med serverkontroll av lærerrollen ved hvert kall. Notatene importeres ikke i frontendpakken. En ny lærerstyrt side med privat veiledning må bruke samme tilgangsprinsipp; ikke legg private notater i en elevkomponent.

## Toppliste med mulighet til å skjule seg

Topplisten er på som standard for nye elevprofiler og kontoer som oppgraderes fra skoleversjonen uten tidligere topplisteinnstilling. Eleven kan velge **Skjul meg fra topplisten** på topplistesiden eller i **Min lab → Profil og nøkkelfil**. **Vis meg på topplisten** viser profilen igjen. Poeng og progresjon beholdes i begge tilfeller.

Migrasjon `007_teaching_and_leaderboard_defaults.sql` bevarer innstillingen til profiler som allerede har vært i bruk i tidligere `dev`. Det omfatter profiler som er skjult. Et eksplisitt valg lagres for senere oppgraderinger. Migrasjon 006 endres ikke.

Elevsidene forklarer bare det eleven trenger for å bruke funksjonen. Merknader om lærerroller, API, serverberegning og rangeringens interne unntak ligger i lærerveiledningen og driftsdokumentasjonen. Regelen om at lærerprofiler, administratorer, skjulte/deaktiverte elever og øvings-XP holdes utenfor rangeringen gjelder fortsatt på serveren.
