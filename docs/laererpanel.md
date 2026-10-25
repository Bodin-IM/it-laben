# Lærerpanel, testmodus og åpning for alle

Lærerpanelet ligger på `/laerer/` i `backend`-versjonen. Du bruker din eksisterende Min lab-profil og nøkkelfil. Ingen nye passord eller skolepålogging er nødvendig.

Se eksempelvisning av [lærerpanelet](teacher-panel.png), [test uten tidsfrist](teacher-practice.png) og [et undervisningsforsøk](teacher-opening.png).

## Aktiver lærerrollen én gang

Oppgrader frontend og API til samme versjon, og ta en backup av databasen før migrasjon. Migrasjon `005_teachers_and_openings.sql` kjøres ved API-oppstart og bevarer eksisterende elever, progresjon og forsøk.

1. Logg inn i Min lab med profilen som skal få lærertilgang.
2. Finn **Din profil-ID** under **Profil og nøkkelfil**, eller åpne `/laerer/`. Kopier hele ID-en. ID-en er en offentlig identifikator; ikke bruk eller del nøkkelfilens hemmelighet som profil-ID.
3. Kjør serverkommandoen mot **samme database som API-tjenesten bruker**. Fra checkouten som inneholder backendkoden:

```bash
ITLAB_DB_PATH=/var/lib/it-laben/it-laben.sqlite npm run teacher -- grant PROFIL_ID
```

Med tjenestebrukeren og stiene fra backendveiledningen kan du i stedet kjøre:

```bash
cd /srv/it-laben-backend/current
sudo -u itlab env ITLAB_DB_PATH=/var/lib/it-laben/it-laben.sqlite /usr/bin/node server/teacher.js grant PROFIL_ID
```

Erstatt `PROFIL_ID` og tilpass stier/tjenestebruker til installasjonen. Kjør med tjenestebrukerens tilgang slik at SQLite-filer beholder riktig eier. Kommandoen nekter å opprette en ny tom database hvis filen mangler, og nekter ukjente profil-ID-er.

4. Oppdater Min lab. Lenken **Lærerpanel** vises nå, og rollen følger profilen ved innlogging med samme nøkkelfil på en annen PC.

Lokalt kan kommandoen bruke `ITLAB_DB_PATH` fra `.env` eller standardfilen `data/it-laben.sqlite`.

Andre serverkommandoer:

```bash
ITLAB_DB_PATH=/var/lib/it-laben/it-laben.sqlite npm run teacher -- list
ITLAB_DB_PATH=/var/lib/it-laben/it-laben.sqlite npm run teacher -- revoke PROFIL_ID
```

`list` viser profil-ID, kallenavn og rolle, aldri innloggingsnøkler. `revoke` fjerner lærertilgangen uten å slette profilen eller vanlig progresjon. Serveren kontrollerer rollen på nytt ved hvert lærerkall. Ingen profil blir automatisk lærer, og rollen kan ikke velges ved registrering eller endres fra nettleseren.

## Test selv

I panelet kan du søke etter en leksjon eller et spill og velge **Test selv**. Samme knapp vises ved aktivitetene når du er lærer.

- Fagsjekker kan prøves uten forberedelser og døgnsgrense. Etter retting kan du starte **Nytt øvingsforsøk**.
- Alle oppdrag i de tre vanlige spillene er tilgjengelige, også de som vanligvis låses opp trinnvis.
- Nattevakten kan testes med vanlig nedtelling eller **uten tidsfrist**. En pågående øvingsvakt gjenopptas ved oppdatering; **Start ny øvingsvakt** starter på nytt. Bytt til et nytt forsøk for å bruke et endret tidsvalg.
- Øving får egen progresjon, egne utkast, rapporter og kvitteringer. Den gir ingen XP, merker eller personlig rekord, og bruker ingen ordinære forsøk.

Øvingsmodus er tydelig merket **Øving · uten XP**. **Til vanlig aktivitet** går tilbake til elevens ordinære progresjon. Vanlige undervisningssimuleringer er fortsatt fritt lesbare uten lærertilgang.

## Åpne en aktivitet for alle

Velg aktivitet, åpningstype og **30 eller 60 minutter**, og trykk **Åpne for alle**. Åpningen vises på forsiden og ved aktiviteten. Den gjelder alle innloggede profiler på installasjonen, uavhengig av fagfilter.

| Type                    | Virkning                                                                                                                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Åpen øving**          | Elevene kan prøve aktiviteten uten forkunnskapskrav og døgnsgrense. Forsøk og progresjon lagres som øving uten XP. Nattevakten har vanlig åtte minutters frist for elever; bare lærere kan velge test uten tidsfrist.       |
| **Undervisningsforsøk** | Elevene får ett ekstra fagsjekkforsøk, eller én ekstra vakt i Nattevakten, for den konkrete åpningen. Forkunnskapskrav og vanlig døgnsgrense hindrer ikke dette forsøket. Riktig løsning kontrolleres fortsatt på serveren. |

Et undervisningsforsøk kan gi vanlig XP ved bestått, men allerede opptjente poeng gis ikke på nytt. Forkunnskapskrav blir ikke automatisk markert som fullført. Leksjonens gjennomgang eller spillets hovedoppdrag må fortsatt faktisk utføres for å få poengene for disse målene. De vanlige spillene kan testes flere ganger; det ekstra forsøket gjelder forståelsessjekken som frigjør XP.

Åpningen bruker et eget forsøksrom: en mislykket undervisningssjekk endrer ikke tidspunktet for elevens ordinære døgnsgrense. Et bestått undervisningsforsøk teller som vanlig læringsprogresjon.

**Steng åpningen** hindrer nye forsøk med en gang. Utløp håndheves også automatisk med serverklokken. En ny åpning for samme aktivitet erstatter den forrige. Påbegynte vakter beholder sin opprinnelige frist; allerede utstedte fagsjekker kan leveres ferdig. En stengt åpning gir ingen nye forsøk eller nye øvingsstarter.

## Lagring og kontroll

- `user_roles` lagrer lærerrollen på profilen.
- `activity_openings` lagrer aktivitet, type, opprettelse, sluttid og eventuell manuell stenging.
- `teacher_actions` lagrer rolleendringer og åpning/stenging uten innloggingshemmeligheter.
- `practice_runs`, `practice_progress` og `practice_receipts` holder øving separat fra ordinære resultater.
- Ordinære fagsjekker og vakter kan ha en serverutstedt `opening_id`. Hvert undervisningsforsøk er bundet til konto, aktivitet og åpning.

Å bytte en URL eller sende andre XP-/rolleverdier fra klienten gir ikke lærertilgang eller et gyldig ekstra forsøk. Serveren sjekker roller, aktive åpninger, forsøkseierskap og kvoter. En øvings-ID kan ikke brukes for XP i det ordinære API-et. Origin- og CSRF-kontroll gjelder også for lærerhandlinger.

Backup inkluderer roller, åpninger og øvingsdata. Kontosletting fjerner rollen og elevens øvingsforsøk/progresjon; historikk for felles åpninger kan beholdes med lærerreferansen anonymisert. Bruk en API-versjon som forstår det nye skjemaet ved eventuell tilbakeføring.

De felles tilgangsreglene bruker stabile aktivitets-ID-er. Nye leksjoner og driftsaktiviteter som registreres i innholdskatalogen kommer automatisk med i panelet; de trenger ikke egne lærerknapper eller nye regler for åpninger.
