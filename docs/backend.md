# Min lab – første backendversjon

Backend utvikles på branchen `backend` og publiseres via `main` etter sammenslåing. [Engangsoppsettet for Ubuntu](installasjon-main.md) klargjør HTTPS uten offentlig domene, API, databasebackup og den eksisterende oppdateringstimeren. Serveren henter fortsatt bare `main`. Klargjør serveren før sammenslåingen, siden en push til `main` kan utløse publisering med en gang.

Neste versjon utvikles isolert på `dev`: [elevadministrasjon, tildelte brukernavn og frivillig toppliste](elevadministrasjon.md). Bruk en egen database til lokal utprøving. Migrasjon 006 og de nye funksjonene blir ikke publisert på skoleserveren før en senere merge til `main`.

GitHub Actions er konfigurert for tester, Svelte-kontroll og statisk bygg ved push og pull requests. Workflowen publiserer ikke til skolens server.

[Se forhåndsvisning av Min lab med en eksempelprofil](backend-preview.png).

Fagspor, ni merker, fagsjekker med døgnsgrense, labkort og lydeffekter er beskrevet i [veiledningen for progresjon](progresjon.md). Den viser også hvordan nye leksjoner, spill, praktiske aktiviteter og driftsinnhold legges til.

## Dette er med

- Profil med server-tildelt unikt brukernavn, uten e-post eller passord. På `dev` kan eleven ikke velge eller endre navnet selv.
- Husket pålogging på egen skole-PC, og kortere økt på delte maskiner.
- Nedlastbar nøkkelfil. Samme fil kan brukes på flere enheter fram til den erstattes.
- Ny nøkkel sperrer den gamle og logger ut andre enheter. Nåværende enhet får en ny økt.
- Min lab med XP, nivåer, achievements, fagfilter og fortsett-lenker.
- Alle dagens leksjoner kan markeres som gjennomgått. De 15 XP frigjøres først ved bestått fagsjekk, som gir 10 XP ekstra. Gjennomgangen er egenrapportert.
- De tre ordinære spillene kontrolleres på serveren med de eksisterende simuleringsmodellene. Hvert oppdrag gir 25 XP og et ferdig spill gir 25 ekstra, frigjort etter at alle oppdragene og spillets fagsjekk er bestått. Ingen fri elevkode kjøres.
- 13 fagsjekker med to varierte spørsmål, begge riktige for å bestå. Ett innsendt forsøk per fagsjekk per 24 timer, håndhevet på serveren per konto. Oppdatering og ny pålogging nullstiller ikke grensen.
- [Nattevakten](nattvakt.md): åtte minutter, fire reparasjoner, ett forsøk per 24 timer, serverstyrt frist, lagrede utkast, hendelsesrapport og 50 XP første gang.
- Lærerpanel med «Test selv», egne øvingsforsøk uten XP og tidsbegrensede åpninger for alle. Undervisningsåpninger gir ett ekstra kontrollert forsøk uten å doble allerede opptjent XP.
- Progresjon og innsendte spillvalg gjenopprettes. Et bestått oppdrag beholdes selv om neste forsøk feiler.
- Innsendinger som venter på nett lagres lokalt per konto, med et tak på 100. Nøkler og påloggingshemmeligheter lagres aldri i localStorage. Dersom lokal lagring er sperret, må fanen holdes åpen til synkronisering er ferdig.
- Sletting av konto fjerner også økter, nøkler, poeng og progresjon fra aktiv database. Eldre sikkerhetskopier følger serverens sletterutine/retensjon.

[Lærerpanelet](laererpanel.md) lar lærere teste innhold og åpne aktiviteter for alle. Lærerrollen gis én gang fra serveren med eksisterende profil-ID. Passkeys, skolepålogging, klasseadministrasjon og offentlig poengtavle er ikke med i denne versjonen.

## Kjør lokalt

Node.js **24.17 eller nyere** kreves. SQLite følger med Node; en egen databaseserver trengs ikke.

```bash
npm ci
cp .env.example .env
npm run dev:full
```

Åpne Vites localhost-adresse. Vite videresender `/api/` til `127.0.0.1:3001`. Lokale testkontoer bruker en utviklingscookie; bruk eksempeldata. HTTP tillates bare for lokale utviklingsadresser, aldri når `NODE_ENV=production`.

API og Vite kan også kjøres separat med `npm run api` og `npm run dev`. For å prøve det statiske produksjonsbygget brukes `APP_ORIGIN=http://localhost:4173 npm run api` sammen med `npm run preview`.

Databasen opprettes i `data/it-laben.sqlite`. Denne mappen er ignorert av Git. Ikke bruk undervisningssidenes eksempel-session som ekte pålogging; undervisningsmodellene er fremdeles simuleringer.

## Kontrollene

```bash
npm test
npm run check
npm run build
```

Backendtestene kontrollerer blant annet nøkkelgjenoppretting, lagring av nøkkelhash, cookie-egenskaper, CSRF, Origin, utløp av økter, kontoisolasjon, samtidige/dupliserte innsendinger, validering av alle tre spill, engangsbelønninger, nøkkelbytte, kontosletting og backup av en aktiv SQLite-database.

## API og lagring

API-et bruker samme origin som nettstedet, under `/api/`:

| Adresse                      | Bruk                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| `GET /api/health`            | Helsesjekk uten brukerdata                                           |
| `GET /api/me`                | Profil, CSRF-token og samlet progresjon; `user: null` uten pålogging |
| `POST /api/auth/create`      | Opprett profil og returner nøkkelfilen én gang                       |
| `POST /api/auth/key`         | Logg inn med nøkkelfilens hemmelighet                                |
| `POST /api/auth/logout`      | Avslutt gjeldende økt                                                |
| `POST /api/auth/rotate-key`  | Erstatt nøkkelfil og andre pålogginger                               |
| `POST /api/me/nickname`      | Avviser selvvalgte navneendringer på `dev`                           |
| `POST /api/me/lab`           | Lagre labfarge og et opptjent merke på labkortet                     |
| `POST /api/me/delete`        | Slett konto med eksplisitt bekreftelse                               |
| `POST /api/checkpoints/open` | Åpne/gjenoppta samme serverutstedte fagsjekkforsøk                   |
| `POST /api/progress`         | Gjennomgang, fagsjekk eller kontroll av en spill-/aktivitetsløsning  |

Alle skrivekall krever riktig `Origin` og JSON. Påloggede skrivekall krever dessuten øktens `X-CSRF-Token`. Progresjonskall må ha samme konto-ID som økten. Brukeren bestemmes alltid av den servervaliderte cookien. API-et tillater ikke CORS fra andre nettsteder.

Session og gjenopprettingsnøkkel er separate tilfeldige hemmeligheter på 256 bit. Databasen lagrer SHA-256-verifikatorer, ikke de rå hemmelighetene. Cookie er HttpOnly, SameSite=Lax og Secure i produksjon, med `__Host-`-prefiks. Ved husket pålogging er tomgangsgrensen 30 dager og absoluttgrensen 180 dager. Midlertidige økter har 30 minutters tomgang og maksimalt 8 timer. Utløp håndheves på serveren.

Innholds-ID-ene i `src/lib/innhold.js` beholdes selv om en adresse eller tittel endres. Nytt innhold og belønningsregler registreres i `server/catalog.js`. `CONTENT_VERSION` endres når innsendinger krever et nytt format. Backend avviser ukjente aktiviteter, oppdrag, løsninger og versjoner. Backend bestemmer XP og achievements. En unik belønningsnøkkel per konto/mål forhindrer gjentatte poeng også med en ny hendelses-ID. Forsøk, poeng, progresjon og kvittering skrives i én transaksjon. Fagsjekker bruker innsendingversjon 2, med `attemptId` og `solution` som kart fra utstedt spørsmåls-ID til utstedt alternativ-ID. Forsøksgrenser og XP beregnes fra serverdata. Se progresjonsveiledningen for oppgraderingsregler og spørsmålsbanker.

Migrasjoner ligger i `server/migrations/` og kjøres ved oppstart. Anvendte migrasjoner er sjekksumbeskyttet: opprett en ny migrasjon i stedet for å redigere den gamle. Tilbakeføring må bruke en API-versjon som forstår aktivt skjema.

## Før skolens elever tar løsningen i bruk

Skolens nåværende HTTP-adresse på port 8080 skal ikke brukes til ekte elevpålogging. Velg et fast HTTPS-vertsnavn og et sertifikat som skole-PC-ene stoler på. En intern DNS-/sertifikatløsning kan brukes. API-et nekter usikre produksjonsadresser.

Bruk normalt [installasjonsskriptene for main](installasjon-main.md). Oppsettet under er et manuelt alternativ for en separat prøveinstallasjon, med et eget vertsnavn. Dette alternativet berører ikke eksisterende `main`-publisering eller `/var/www/it-laben/current`. Tilpass stier og bruker til serveren; tjenestemalen forventer eksisterende bruker `itlab` og Node i `/usr/bin/node`.

1. Klargjør en separat checkout/release under `/srv/it-laben-backend/`. La `current` peke til den kontrollerte releasen som inneholder både kildekode, produksjonsavhengigheter og `build/`. Bygg som vanlig bruker med `npm ci`, `npm test`, `npm run check` og `npm run build`. Nginx må kunne lese `build/`; den skal aldri servere repoets rotmappe.
2. Opprett `/var/lib/it-laben/` eid av tjenestebrukeren, med modus 0700. Databasen må ligge her, utenfor kildekode og statisk publisering.
3. Opprett `/etc/it-laben-api.env` med modus 0600 og disse verdiene, tilpasset eget vertsnavn:

```text
NODE_ENV=production
APP_ORIGIN=https://itlab.example.test
API_PORT=3001
ITLAB_DB_PATH=/var/lib/it-laben/it-laben.sqlite
```

4. Kopier `server/deploy/it-laben-api.service` til `/etc/systemd/system/`, kontroller Node-stien og brukeren, og aktiver tjenesten:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now it-laben-api
```

5. Tilpass `server/deploy/nginx-backend.conf.example` med korrekt vertsnavn, sertifikater og statisk rot. Kontroller med `sudo nginx -t` før reload. API-port 3001 lytter bare på loopback og skal ikke åpnes i brannmuren. `proxy_pass` må bevare `/api/`-prefikset.
6. Kontroller `/api/health` via HTTPS og prøv opprettelse, nedlasting, utlogging og innlogging med filen på en annen nettleser. Kontroller deretter fullføring av et spill, gjenopprettet progresjon og backup.

Ved nye releaser: ta backup, bygg og test den nye releasen, aktiver kompatible migrasjoner/API, kontroller helse og bytt den statiske releasen. Ved feil brukes en kompatibel forrige API-/frontendversjon; databasen skal ikke overskrives med filer fra Git. API-et og allerede åpne nettleserfaner må støtte samme innsendingversjon.

## Backup og gjenoppretting

Ta en konsistent backup med SQLite mens tjenesten kjører:

```bash
ITLAB_DB_PATH=/var/lib/it-laben/it-laben.sqlite npm run backup -- /trygt-backupomrade/it-laben-2026-10-24.sqlite
```

Kommandoen nekter å overskrive en eksisterende fil. Kjør daglig som tjenestebrukeren og før migrasjoner. Ta kopien videre til et separat, tilgangsbeskyttet lagringssted. Tilgang og oppbevaringstid settes for skolens elevdata. Verifiser regelmessig med gjenoppretting i en egen prøveinstallasjon.

Ved gjenoppretting stoppes API-et først, gjeldende database og tilhørende WAL/SHM tas vare på som ett sett, og en testet backup legges tilbake med riktig eier og modus. Start deretter kompatibel API-versjon og kontroller helse/progresjon. En gammel backup kan også gjeninnføre tidligere økter og nøkler: tilbakekall økter etter gjenoppretting og vurder nøkkelbytte. En nøkkelfil alene er ikke backup av databasen.

## Feilsøking

- `journalctl -u it-laben-api -n 60 --no-pager` viser driftsfeil. Logg aldri innloggingsbody, nøkkelfiler eller rå cookies.
- «Forespørselen kommer ikke fra IT-laben»: kontroller `APP_ORIGIN` mot adressen i elevens nettleser.
- «Bruk nettstedets HTTPS-adresse»: kontroller Nginx sitt `X-Forwarded-Proto` og at TLS faktisk er aktivt.
- Mistet nettleserdata: logg inn med filen. Hvis både filen og alle økter er borte, finnes ingen identitetskobling for sikker gjenoppretting i denne versjonen.
- Kunne ikke kontakte Min lab: undervisningen virker fortsatt. Ventende innsendinger er knyttet til kontoen og synkroniseres når den samme brukeren er pålogget og tilkoblingen er tilbake.
