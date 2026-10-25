# Elevadministrasjon, tildelte brukernavn og toppliste

Denne videreutviklingen ligger på **`dev`**. Skolens automatiske publisering henter fortsatt bare `main`; push til `dev` endrer ikke serveren. Klasseadministrasjon og gjenopprettingskoder er senere utvidelser.

Eksempelvisninger med oppdiktede profiler: [oversikt](admin-overview.png), [elevliste](admin-students.png), [toppliste](leaderboard.png) og [toppliste på mobil](leaderboard-mobile.png).

## Prøv lokalt i VS Code

Hent og bytt til branchen i terminalen i prosjektmappen:

```bash
git fetch origin
git switch dev
npm ci
```

Bruk en egen lokal database til `dev`. Sett dette i prosjektets lokale `.env` før du starter, og behold eventuelle andre lokale innstillinger:

```text
APP_ORIGIN=http://localhost:5173
API_PORT=3001
ITLAB_DB_PATH=data/dev-it-laben.sqlite
```

```bash
npm run dev:full
```

Åpne `http://localhost:5173/min-lab/`, opprett en profil og last ned nøkkelfilen. Finn profil-IDen under **Profil og nøkkelfil** eller på `/laerer/`.

Gi testprofilen administratorrollen fra en ny VS Code-terminal i samme prosjektmappe:

```bash
npm run admin -- grant PROFIL_ID
```

Kommandoen leser samme `.env` som API-et. Oppdater nettleseren. Du får både lærerfunksjonene og brukeradministrasjonen.

Bruk aldri produksjonsdatabasen som testdatabase for `dev`. Migrasjonene 006 og 007 er skjemaoppgraderinger, og dagens eldre `main`-API vil avvise et skjema som er nyere enn API-koden. Den lokale databasefilen er ignorert av Git.

## Brukernavn tildeles av IT-laben

Eleven oppretter profil uten å skrive et navn. Serveren tildeler for eksempel **Rolig Oter 4816** eller **Modig Falk 7352**. Dette er visningsnavnet; innlogging bruker fremdeles den hemmelige nøkkelfilen.

Den tidligere generatoren kombinerte ett adjektiv, seks dyr og 900 tall: bare **5 400 kombinasjoner**, uten unikhetskontroll. Den nye har 32 adjektiver, 32 dyr og 9 000 tall: **9 216 000 kombinasjoner**. `crypto.randomInt` velger navnet; databasen kontrollerer unikhet. Kollisjoner trekkes på nytt i samme skrivetransaksjon, og generatoren har en begrenset feilgrense fremfor en uendelig løkke.

- Navnefeltet er fjernet ved registrering og fra profilinnstillingene.
- Registrerings-API-et ignorerer eventuelle navn sendt av eldre nettleserfaner.
- Det gamle endepunktet for selvvalgt navneendring avviser også direkte API-kall.
- Læreren kan velge **Tildel nytt brukernavn** i elevprofilen. Serveren lager et nytt ledig navn; det finnes ingen fritekst eller navnevelger for eleven.

Ved første API-oppstart med den nye versjonen får **eksisterende profiler, inkludert lærerprofiler**, et nytt tildelt navn. Det gjøres én gang i en transaksjon og tåler gamle duplikatnavn. Konto-ID, nøkkelfil, økter, XP, merker og progresjon beholdes. Brukernavnene er ikke unike på tvers av uavhengige installasjoner og er ikke en innloggingshemmelighet.

## Lærerpanelet

Panelet har fem innganger: **Oversikt**, **Undervisning**, **Elever**, **Aktiviteter** og **Toppliste**. [Undervisningsmodus](undervisning.md) skiller læreropplegg fra elevleksjoner og gir en egen storskjermvisning.

### Oversikt

`/laerer/` viser aktive og deaktiverte elevprofiler, antall elever som har jobbet siste sju dager, fullførte aktiviteter og beståtte fagsjekker. Aktivitetstabellen kan filtreres på fag. Lærerprofiler, deaktiverte elever og egne øvingsresultater inngår ikke i progresjonstallene.

En gjennomgått leksjon regnes som gjennomgått også før fagsjekken er bestått. Derfor vises beståtte fagsjekker separat, og XP følger fortsatt de ordinære kontrollreglene.

«Sist jobbet» og aktive siste uke bygger på faglige handlinger i ordinære aktiviteter eller øving. Automatisk polling, innlogging eller en åpen fane flytter ikke tidspunktet.

### Elever

`/laerer/elever/` viser 25 elever per side, med søk i tildelt brukernavn og filter for aktive, deaktiverte eller alle profiler. Lærere og administratorer er holdt utenfor elevlisten.

Velg **Se progresjon** for å se:

- XP, nivå, siste faglige aktivitet og profil-ID.
- Gjennomgåtte leksjoner, beståtte oppdrag og fagsjekker, med fagfilter.
- De siste 15 ordinære fagsjekkresultatene og de siste ti vaktene.
- Oppnådde merker og neste fagsjekkforsøk der det finnes en døgnsgrense.

Undervisningsforsøk er merket. Øvingsforsøk påvirker ikke ordinær progresjon. Lærersvaret inneholder ikke nøkkelhash, øktdata, komplette private spørsmålsbanker eller rå løsningssnapshots.

### Aktiviteter

De eksisterende verktøyene **Test selv**, test uten tidsfrist og **Åpne for alle** ligger på `/laerer/aktiviteter/`. Funksjonene fungerer som før. Eldre lærerlenker med `?aktivitet=...` videresendes fra oversikten til riktig aktivitetsvalg.

## Lærer og administrator

| Tilgang                                    | Lærer | Administrator |
| ------------------------------------------ | ----- | ------------- |
| Test selv og åpne aktiviteter              | Ja    | Ja            |
| Elevliste, oversikt og progresjonsdetaljer | Ja    | Ja            |
| Tildele nytt generert brukernavn           | Ja    | Ja            |
| Deaktivere og reaktivere elever            | Nei   | Ja            |
| Slette en deaktivert elevprofil            | Nei   | Ja            |
| Endre roller fra nettleseren               | Nei   | Nei           |

Administratorrollen gis fra serverterminalen, og eksisterende lærere oppgraderes ikke automatisk. Etter en eventuell senere publisering til produksjon brukes denne kommandoen mot API-ets eksisterende database:

```bash
sudo -u itlab env ITLAB_DB_PATH=/var/lib/it-laben/it-laben.sqlite \
  /usr/bin/node /srv/it-laben/api-current/server/admin.js grant PROFIL_ID
```

Kommandoen er tilgjengelig på serveren først når denne versjonen er publisert. Lokalt brukes `npm run admin -- grant PROFIL_ID`.

Andre kommandoer:

```bash
npm run admin -- list
npm run admin -- revoke PROFIL_ID
```

`revoke` gjør en administrator til lærer. Siste administrator kan ikke fjernes eller slette seg selv før en annen profil har fått rollen. Den eksisterende lærerkommandoen kan ikke nedgradere en administrator. Listene viser aldri innloggingshemmeligheter.

### Deaktivering og sletting

**Deaktiver profil** avslutter alle eksisterende pålogginger, sperrer nøkkelinnlogging og skjuler eleven på topplisten. Progresjon, XP og nøkkelfilen beholdes. **Aktiver profil** lar eleven logge inn igjen med samme fil; tidligere økter gjenåpnes ikke. Elevens tidligere valg om å delta på topplisten beholdes.

En elevprofil må først være deaktivert før **Slett elevprofil** tilbys. Sletting krever at administratoren skriver elevens nåværende brukernavn. Det sletter konto, nøkler, økter, XP og ordinære/øvende forsøk fra aktiv database. Eldre backuper følger skolens oppbevaringsrutine. Administrasjonshistorikk beholdes med slettet brukerreferanse anonymisert.

Verktøyene gjelder elevprofiler. Man kan ikke deaktivere eller slette andre lærere eller administratorer gjennom elevlisten.

Alle elevhandlinger krever ny kontroll av serverrollen, Origin, CSRF og aktørens konto-ID. Hver handling har egen hendelses-ID og fingeravtrykk. Et nytt forsøk etter tapt nettverkssvar utfører ikke navnebytte, deaktivering eller sletting på nytt.

## Offentlig toppliste

`/toppliste/` kan leses uten innlogging av alle som har tilgang til IT-laben. Dette endrer ikke skolens nettverk eller gjør siden tilgjengelig fra internett.

Nye elevprofiler og kontoer som oppgraderes fra skoleversjonen uten tidligere innstilling er **synlige som standard**. **Skjul meg fra topplisten** fjerner deltakelsen uten å endre poeng eller progresjon. **Vis meg på topplisten** viser profilen igjen. Tidligere innstillinger fra `dev` beholdes, inkludert skjulte profiler. Valget finnes i **Min lab → Profil og nøkkelfil** og på topplistesiden.

Den offentlige responsen inneholder bare plassering, tildelt brukernavn, XP, nivå, labfarge og et valgt opptjent merke. Konto-ID, aktivitetshistorikk, tidspunkt og nøkkel-/øktdata returneres ikke. En innlogget deltaker får i tillegg sin egen plassering, selv om profilen er utenfor siden som vises.

- Samlet XP hentes fra serverens ordinære belønningslogg.
- Lærere, administratorer, deaktiverte og skjulte elever deltar ikke.
- Øving gir ingen poeng i rangeringen.
- Lik XP gir delt plassering, for eksempel 1, 1, 3. Lik poengsum sorteres på navn uten en belønning for å være først.
- Listen har ti deltakere per side og oppdateres omtrent hvert 30. sekund mens fanen er synlig.
- Ingen ukentlig nullstilling eller nye XP-kilder innføres.

## Videreutvikling og drift

Migrasjon `006_students_and_leaderboard.sql` legger til kontostatus, navnetildeling, deltakelsesvalg, administratorrolle og `management_actions`. Navnetildeling for eksisterende kontoer skjer deretter én gang ved API-oppstart. Tidligere migrasjoner endres ikke.

Oversiktene bruker den eksisterende aktivitetskatalogen og stabile aktivitets-ID-er. Nye leksjoner, spill og driftsaktiviteter kommer med automatisk. Elevlisten henter progresjon samlet per side fremfor å kjøre en komplett profilsammenstilling for hver elev; detaljvisningen laster én valgt profil.

Daglig backup og backup før publisering inkluderer de nye feltene og tabellene. Før eventuell merge til `main`: kontroller navn/rolleovergangen, ta backup og bruk en API-versjon som forstår skjema 007 ved tilbakeføring.

Se [undervisningsmodus](undervisning.md) for migrasjon 007, separate læreropplegg, private lærernotater og de nye topplisteinnstillingene.
