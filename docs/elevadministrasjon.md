# Elevadministrasjon, tildelte brukernavn og toppliste

Denne videreutviklingen ligger på **`dev`**. Skolens automatiske publisering henter fortsatt bare `main`; push til `dev` endrer ikke serveren. Administrator kan klargjøre en ny nøkkelfil til en eksisterende elevprofil, som beskrevet nedenfor.

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

Bruk aldri produksjonsdatabasen som testdatabase for `dev`. Migrasjonene 006–008 er skjemaoppgraderinger, og dagens eldre `main`-API vil avvise et skjema som er nyere enn API-koden. Den lokale databasefilen er ignorert av Git.

## Brukernavn tildeles av IT-laben

Eleven oppretter profil uten å skrive et navn. Serveren tildeler for eksempel **Rolig Oter 4816** eller **Modig Falk 7352**. Dette er visningsnavnet; innlogging bruker fremdeles den hemmelige nøkkelfilen.

Den tidligere generatoren kombinerte ett adjektiv, seks dyr og 900 tall: bare **5 400 kombinasjoner**, uten unikhetskontroll. Den nye har 100 adjektiver, 100 dyr og 9 000 tall: **90 000 000 kombinasjoner**. `crypto.randomInt` velger navnet; databasen kontrollerer unikhet. Kollisjoner trekkes på nytt i samme skrivetransaksjon, og generatoren har en begrenset feilgrense fremfor en uendelig løkke.

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
| Gi ny nøkkelfil til en elev                | Nei   | Ja            |
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

### Mistet nøkkelfil: gi eleven tilgang igjen

På dev finnes **Lærerpanel → Elever → velg elevprofil → Gi ny nøkkelfil** for administratorer. Vanlige lærere har ikke denne handlingen. Den gjelder aktive elevprofiler; en deaktivert profil må først aktiveres. Lærer- og administratorprofiler kan ikke gjenopprettes gjennom elevlisten.

1. Kontroller elevens tildelte brukernavn og profil-ID sammen med eleven, og velg **Gi ny nøkkelfil**.
2. Velg **Lag ny nøkkelfil**, deretter **Last ned ny nøkkelfil**. Filnavnet inneholder elevprofilens navn og en del av ID-en, slik at filer kan skilles fra hverandre.
3. Bekreft at filen er lagret og at du har valgt riktig elevprofil. Velg **Aktiver nøkkelfilen** innen 30 minutter.
4. Gi filen til riktig elev gjennom en privat kanal. Eleven bruker den vanlige nøkkelinnloggingen i Min lab. Filen gir tilgang til kontoen; fjern administratorkopien når overleveringen er ferdig.

Den gamle nøkkelen og elevens pålogginger beholdes frem til aktiveringen. Avbrudd før aktivering endrer ikke tilgangen. Ved aktivering sperres alle gamle nøkler, klargjøringer og pålogginger for eleven. Administratorens egen pålogging beholdes. Konto-ID, brukernavn, klasse, labfigur, XP, merker, innsendte svar og serverlagret progresjon beholdes. Arbeid som ennå ikke er sendt fra en gammel elevøkt, er ikke omfattet av serverlagringen.

Et tapt svar etter aktivering kan prøves igjen med samme fil og hendelses-ID. Det logger ikke ut en elev som allerede har brukt den nye filen. En fil som senere er erstattet, kan ikke gjenaktiveres gjennom et gammelt omforsøk. Ved utløp eller en nyere klargjøring må administratoren lage og laste ned en ny fil. En vellykket aktivering viser også **Last ned filen igjen** frem til dialogen lukkes.

Implementasjon: `StudentKeyRecovery.svelte`, `server/student-recovery.js` og migrasjon `015_admin_recovery_keys.sql`. API-rutene `POST /api/teacher/students/:id/recovery/prepare` og `/activate` krever innlogging, aktiv administratorrolle, riktig Origin, CSRF og aktørens konto-ID. Klargjøringen er bundet til både elev, administrator, nåværende navn og nøkkelsett. Bare SHA-256-verifikatorer lagres på serveren. Aktivering og historikk (`management_actions`, handling `recover-key`) skrives i samme transaksjon; historikken inneholder ikke nøkkelen. Ny klargjøring for samme elev erstatter en tidligere klargjøring. Elevens eget nøkkelbytte og administrerte navne-/statusendringer opphever en ventende admin-klargjøring.

Valgene om tilfeldig nøkkel, tidsavgrenset klargjøring, ingen sperring før bekreftelse og tilbakekalling av tidligere økter støtter seg på [OWASPs veiledning om kontogjenoppretting](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). Den konkrete flyten er et lokalt designvalg for skolens profiler: administratoren må identifisere eleven, siden tildelt brukernavn alene ikke beviser identitet. Dialogen gjenbruker lærerpanelets tema, fokusmarkering og knapper og viser bare det aktuelle trinnet.

**Kontrollstatus på dev:** Kode og diff gjennomgått. Fire nye regresjonstester er skrevet for tilgangskontroll, bevart profil, tilbakekalling, omforsøk, utløp og samtidige endringer; de er ikke kjørt i denne dev-runden. Før main gjenstår samlet testing, Svelte-sjekk, bygg og nettleserprøving av nedlasting, aktivering, feil/omforsøk, tastatur/Escape, smal skjerm/zoom, begge temaer og konto-/elevbytte under en forespørsel. Migrasjonen legger bare til en tabell og indeks og omskriver ingen elevdata.

### Deaktivering og sletting

**Deaktiver profil** avslutter alle eksisterende pålogginger, sperrer nøkkelinnlogging og skjuler eleven på topplisten. Progresjon, XP og nøkkelfilen beholdes. **Aktiver profil** lar eleven logge inn igjen med samme fil; tidligere økter gjenåpnes ikke. Elevens tidligere valg om å delta på topplisten beholdes.

En elevprofil må først være deaktivert før **Slett elevprofil** tilbys. Sletting krever at administratoren skriver elevens nåværende brukernavn. Det sletter konto, nøkler, økter, XP og ordinære/øvende forsøk fra aktiv database. Eldre backuper følger skolens oppbevaringsrutine. Administrasjonshistorikk beholdes med slettet brukerreferanse anonymisert.

Verktøyene gjelder elevprofiler. Man kan ikke deaktivere eller slette andre lærere eller administratorer gjennom elevlisten.

Alle elevhandlinger krever ny kontroll av serverrollen, Origin, CSRF og aktørens konto-ID. Hver handling har egen hendelses-ID og fingeravtrykk. Et nytt forsøk etter tapt nettverkssvar utfører ikke navnebytte, deaktivering eller sletting på nytt.

## Offentlig toppliste

`/toppliste/` kan leses uten innlogging av alle som har tilgang til IT-laben. Dette endrer ikke skolens nettverk eller gjør siden tilgjengelig fra internett.

Nye elevprofiler og kontoer som oppgraderes fra skoleversjonen uten tidligere innstilling er **synlige som standard**. **Skjul meg fra topplisten** fjerner deltakelsen uten å endre poeng eller progresjon. **Vis meg på topplisten** viser profilen igjen. Tidligere innstillinger fra `dev` beholdes, inkludert skjulte profiler. Valget finnes i **Min lab → Profil og nøkkelfil** og på topplistesiden.

Den offentlige responsen inneholder bare plassering, tildelt brukernavn, valgt klasse, XP, nivå, avatar, labfarge og et valgt opptjent merke, samt klassenes samlede XP og antall deltakere. Konto-ID, aktivitetshistorikk, tidspunkt og nøkkel-/øktdata returneres ikke. En innlogget deltaker får i tillegg sin egen plassering, selv om profilen er utenfor siden som vises.

Eleven kan velge 2ITA eller 2ITB én gang. Topplisten viser hvilken klasse som leder etter samlet XP. Skjulte profiler bidrar ikke til klassepoengene. Se [klassevalg og klassenes toppliste](klasser-og-toppliste.md) for regler, kontroll og migrasjon 009.

- Samlet XP hentes fra serverens ordinære belønningslogg.
- Lærere, administratorer, deaktiverte og skjulte elever deltar ikke.
- Øving gir ingen poeng i rangeringen.
- Lik XP gir delt plassering, for eksempel 1, 1, 3. Lik poengsum sorteres på navn uten en belønning for å være først.
- Listen har ti deltakere per side og oppdateres omtrent hvert 30. sekund mens fanen er synlig.
- Ingen ukentlig nullstilling eller nye XP-kilder innføres.

## Videreutvikling og drift

Migrasjon `006_students_and_leaderboard.sql` legger til kontostatus, navnetildeling, deltakelsesvalg, administratorrolle og `management_actions`. Navnetildeling for eksisterende kontoer skjer deretter én gang ved API-oppstart. Tidligere migrasjoner endres ikke.

Oversiktene bruker den eksisterende aktivitetskatalogen og stabile aktivitets-ID-er. Nye leksjoner, spill og driftsaktiviteter kommer med automatisk. Elevlisten henter progresjon samlet per side fremfor å kjøre en komplett profilsammenstilling for hver elev; detaljvisningen laster én valgt profil.

Daglig backup og backup før publisering inkluderer de nye feltene og tabellene. Før eventuell merge til `main`: kontroller navn/rolleovergangen, ta backup og bruk en API-versjon som forstår aktivt skjema ved tilbakeføring (009 etter klasseoppdateringen).

Se [undervisningsmodus](undervisning.md) for migrasjon 007, separate læreropplegg, private lærernotater og de nye topplisteinnstillingene.

Se [avatarer og tryggere lagring](avatarer-og-trygg-lagring.md) for migrasjon 008, trygt nøkkelbytte og innsendinger fra flere faner.
