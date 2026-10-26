# Installer backend og HTTPS med fortsatt publisering fra main

Har du allerede et fungerende API og HTTPS på 8443? Bruk [flytting til DNS-navn og standardportene](dns-og-standardporter.md) for `itlab.im.local`. Den gjenbruker eksisterende CA og database og samordner Nginx, API og publiseringsjobb. Oppskriften under beskriver førstegangsoppsettet.

Dette er engangsoppsettet for Ubuntu-serveren som allerede henter `main` med `it-laben-update.timer`. Utvikling skjer på `backend`; serveren fortsetter å hente **bare `main`** etter sammenslåing. Det opprettes ingen separat backend-publisering fra featurebranchen.

Kjør oppsettet **før backend merges til main**. Installatøren oppgraderer oppdateringsjobben. Den nye jobben venter hvis `main` ennå mangler API-et, og beholder siden som vises nå. Når backend er merget, bygger og aktiverer neste timerkjøring både API og frontend fra samme commit.

Skriptene må kjøres **på Ubuntu-serveren, i SSH-terminalen din**, ikke i Windows-terminalen uten SSH. Du trenger sudo. Ingen SSH-port må gjøres offentlig tilgjengelig.

## 1. Hent oppsettet fra backend

Bruk en midlertidig mappe. Ikke endre serverens publiseringsrepo eller lokale database.

```bash
itlab_setup_dir="$(mktemp -d)"
curl --fail --location \
  https://github.com/Bodin-IM/it-laben/archive/refs/heads/backend.tar.gz \
  --output "$itlab_setup_dir/source.tar.gz"
tar -xzf "$itlab_setup_dir/source.tar.gz" --strip-components=1 -C "$itlab_setup_dir"
cd "$itlab_setup_dir"
```

Etter at sammenslåingen er publisert, kan samme oppsett hentes fra `refs/heads/main.tar.gz`.

Skriptet forventer systemd, Nginx, Git, curl, OpenSSL og **Node.js 24.17 eller nyere**, med Node og npm i `/usr/bin/`. Kontroller:

```bash
/usr/bin/node --version
/usr/bin/npm --version
sudo nginx -t
```

Installatøren oppgraderer ikke Node, operativsystemet eller brannmuren. Mangler noen forutsetninger, stopper den med en forklaring.

## 2. Lag sertifikat uten offentlig domene

Velg serverens faste IP-adresse som begge subnettene kan nå. Erstatt `SERVER_IP` med den faktiske adressen, for eksempel `192.168.10.20`:

```bash
sudo bash server/deploy/create-local-certificate.sh --ip SERVER_IP --name im.local
```

Dette lager:

- `/etc/ssl/it-laben/server.crt`: serversertifikat som dekker både IP-adressen og `im.local`.
- `/etc/ssl/it-laben/server.key`: privat servernøkkel, bare lesbar for root.
- `/etc/ssl/it-laben/root-ca.crt`: offentlig CA-fil som PC-ene må stole på.
- `/root/it-laben-ca/`: CA-privatnøkkel og grunnlag for senere fornyelse, bare tilgjengelig for root.

Skriptet nekter å overskrive eksisterende sertifikat-/CA-mapper. Det oppretter ikke DNS. For første test er det enklest å bruke **IP-adressen**, så trenger du ikke gjøre noe med de to DNS-serverne. Skal du bruke navnet senere, må begge nett kunne slå opp `im.local` til riktig IP, og `APP_ORIGIN`/HTTPS-oppsettet må bruke den samme adressen som elevene åpner.

Serversertifikatet varer ett år og CA-en ti år. Ta vare på CA-nøkkelen i et beskyttet backupområde; den skal ikke kopieres til elever eller legges i repoet.

## 3. Kontroller og installer

Vi bruker **8443** som HTTPS-port for den første installasjonen. Dermed beholdes eksisterende HTTP-visning på 8080. API-port 3001 forblir på loopback og skal ikke åpnes i brannmuren.

Erstatt `SERVER_IP` i adressen. Kjør først kontrollen, som ikke endrer serveren:

```bash
sudo bash server/deploy/install-main.sh \
  --origin https://SERVER_IP:8443 \
  --cert /etc/ssl/it-laben/server.crt \
  --key /etc/ssl/it-laben/server.key \
  --ca /etc/ssl/it-laben/root-ca.crt \
  --check
```

Når kontrollen er OK, kjør den samme kommandoen **uten `--check`**:

```bash
sudo bash server/deploy/install-main.sh \
  --origin https://SERVER_IP:8443 \
  --cert /etc/ssl/it-laben/server.crt \
  --key /etc/ssl/it-laben/server.key \
  --ca /etc/ssl/it-laben/root-ca.crt
```

Skriptet:

1. Kontrollerer sertifikat, nøkkel, ledig HTTPS-port, Node og eksisterende oppsett. En pågående publisering får fullføre; installasjonen ber deg prøve igjen hvis en jobb kjører.
2. Tar vare på berørte konfigurasjonsfiler under `/var/backups/it-laben/setup/`.
3. Beholder `it-laben-update.timer`, og erstatter `it-laben-update.service` med en jobb som henter `origin/main`, bygger som `itlab`, tester og publiserer.
4. Installerer `it-laben-api.service`, med separat database utenfor kildekoden. Tjenesten startes først når en backend-commit faktisk skal publiseres.
5. Legger til en egen Nginx-konfigurasjon for HTTPS, kontrollerer `nginx -t` og laster Nginx på nytt. Eksisterende 8080-konfigurasjon redigeres ikke.
6. Aktiverer daglig konsistent SQLite-backup, omtrent kl. 03:00 etter serverens klokke. Før første API-publisering hoppes denne backupen over.

Installatøren kjenner stiene i den eksisterende driftsveiledningen. Den stopper ved egne systemd-overstyringer, manuelt installert API-tjeneste, annen databasesti eller konflikt med eksisterende HTTPS-konfigurasjon. Da må oppsettet vurderes; ikke slett eksisterende data for å få kontrollen til å gå gjennom.

Om port 8443 er filtrert, må den tillates fra begge elevnettene i server-/nettverksbrannmuren. Det trengs ingen ruting fra internett.

Før merge kan du allerede åpne `https://SERVER_IP:8443/` for å kontrollere sertifikatet og den gamle forsiden. `/api/health` blir først tilgjengelig når en backend-versjon fra `main` er publisert.

## 4. Stol på CA-en på test-PC-en

Hent **bare** `/etc/ssl/it-laben/root-ca.crt` til PC-en. Bruk VS Code Remote SSHs nedlasting, eller SCP med samme SSH-vertsnavn og tunnelport som du allerede bruker. Eksempel med en lokal tunnel på port 2222:

```powershell
scp -P 2222 BRUKERNAVN@localhost:/etc/ssl/it-laben/root-ca.crt .\it-laben-root-ca.crt
```

I PowerShell på Windows kan du installere den for din egen bruker:

```powershell
certutil -user -addstore Root .\it-laben-root-ca.crt
```

Alternativt: åpne filen, velg **Installer sertifikat → Gjeldende bruker → Plasser alle sertifikater i følgende lager → Klarerte rotsertifiseringsinstanser**. Skolens maskinpolicy kan kreve hjelp fra administrator.

Åpne `https://SERVER_IP:8443/` i Chrome/Edge på nytt. Bruk samme vertsnavn/IP som sertifikatet dekker; tunnelens `localhost` er ikke serverens IP. Elevmaskinene trenger den samme offentlige CA-filen før de bruker påloggingen. De trenger ikke være medlem av et Windows-domene.

## 5. Merge til main og kontroller publiseringen

Når serveroppsettet og HTTPS er klart, merges `backend` til `main` og pushes. **Dette kan utløse publisering innen et par minutter.** Timeren beholder samme navn og henter fortsatt `main`.

Vil du starte umiddelbart etter merge:

```bash
sudo systemctl start it-laben-update.service
sudo journalctl -u it-laben-update.service -n 100 --no-pager
sudo journalctl -u it-laben-api.service -n 60 --no-pager
cat /var/www/it-laben/current/.commit
```

Jobben kjører `npm ci --include=dev`, `npm test`, `npm run check` og `npm run build` i en ren release. Først etter vellykket bygg stoppes API-et kort. Den tar en konsistent databasebackup, starter det nye API-et med sjekksumbeskyttede migrasjoner og kontrollerer helse både direkte og gjennom HTTPS. Først deretter byttes den statiske nettsiden.

Åpne fra PC-en:

```text
https://SERVER_IP:8443/api/health
https://SERVER_IP:8443/min-lab/
```

Helsesjekken skal vise `{"ok":true}`. Opprett en testprofil, last ned nøkkelfilen, logg ut og inn igjen, og prøv en aktivitet. Kontroller at progresjonen kommer tilbake etter oppdatering. Bruk HTTPS-adressen til Min lab; gammel HTTP-adresse på 8080 er fortsatt en undervisningsvisning uten gyldig elevpålogging.

## 6. Gi deg selv lærerrollen

Finn profil-IDen på `/laerer/` eller under **Min lab → Profil og nøkkelfil**, og kjør på serveren:

```bash
sudo -u itlab env ITLAB_DB_PATH=/var/lib/it-laben/it-laben.sqlite \
  /usr/bin/node /srv/it-laben/api-current/server/teacher.js grant PROFIL_ID
```

Oppdater nettsiden. Se [lærerpanelet](laererpanel.md) for testmodus og åpning av aktiviteter.

## Stier, backup og tilbakeføring

| Formål                                | Plassering                                                 |
| ------------------------------------- | ---------------------------------------------------------- |
| Repo som henter main                  | `/srv/it-laben/repo`                                       |
| API-kode og avhengigheter per release | `/srv/it-laben/releases/`                                  |
| Aktivt API                            | `/srv/it-laben/api-current`                                |
| Statiske versjoner og aktiv nettside  | `/var/www/it-laben/releases/`, `/var/www/it-laben/current` |
| Database, økter og progresjon         | `/var/lib/it-laben/it-laben.sqlite`                        |
| Databasebackuper                      | `/var/backups/it-laben/database/`                          |
| Installatørens konfigurasjonsbackup   | `/var/backups/it-laben/setup/`                             |
| API-miljø og deploykonfigurasjon      | `/etc/it-laben-api.env`, `/etc/it-laben-deploy.conf`       |

Backup inkluderer lærerroller, nøklenes verifikatorer, økter, ordinær progresjon og øvingsforsøk. Kopier databasebackuper til et beskyttet separat lagringssted, og bestem oppbevaringstid. Skriptet sletter ikke gamle backuper eller releaser automatisk.

Test daglig backup manuelt etter første publisering:

```bash
sudo systemctl start it-laben-backup.service
sudo journalctl -u it-laben-backup.service -n 20 --no-pager
sudo ls -lh /var/backups/it-laben/database/
```

Ved byggefeil beholdes aktivt API og nettside. Ved aktiveringsfeil forsøkes forrige API og frontendlenke gjenopprettet. Databasen overskrives aldri automatisk med en backup: det kan slette nye elevsvar, og et migrert skjema kan kreve en nyere API-versjon. Les feilen i loggen og bruk en kompatibel versjon eller en kontrollert databasegjenoppretting som beskrevet i [backendveiledningen](backend.md#backup-og-gjenoppretting).

For å stanse nye publiseringer mens du undersøker:

```bash
sudo systemctl stop it-laben-update.timer
```

Skriptendringer i `server/deploy/` installeres ikke automatisk som root. Kjør installatøren på nytt fra den kontrollerte nye versjonen når selve publiseringsoppsettet skal oppgraderes. Vanlig innhold, API-kode og migrasjoner publiseres automatisk fra `main`.

## Forny serversertifikatet

Forny før det ene året er gått, med den samme CA-en. Da trenger ikke PC-ene en ny rotsertifikatinstallasjon:

```bash
sudo openssl x509 -req -sha256 -days 365 \
  -in /root/it-laben-ca/server.csr \
  -CA /root/it-laben-ca/root-ca.crt \
  -CAkey /root/it-laben-ca/root-ca.key \
  -CAserial /root/it-laben-ca/root-ca.srl \
  -extfile /root/it-laben-ca/server.ext \
  -out /etc/ssl/it-laben/server.next.crt
sudo openssl verify -CAfile /etc/ssl/it-laben/root-ca.crt /etc/ssl/it-laben/server.next.crt
sudo mv /etc/ssl/it-laben/server.next.crt /etc/ssl/it-laben/server.crt
sudo nginx -t && sudo systemctl reload nginx
```

Dette beholder samme DNS-navn/IP som ved opprettelse. Hvis serveradressen endres, må sertifikatets SAN og API-ets `APP_ORIGIN` tilpasses samtidig.
