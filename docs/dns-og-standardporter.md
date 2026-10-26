# Fast DNS-navn, port 80/443 og publisering av dev

Målet er **https://itlab.im.local**, som peker til **10.100.0.14**. Nginx videresender HTTP på 80 til HTTPS på 443. `/api/` bruker samme adresse som nettstedet; Node fortsetter på `127.0.0.1:3001`.

Dette er flytting av en allerede fungerende installasjon. Skriptet `change-origin.sh` gjenbruker serverens eksisterende lokale CA og private servernøkkel. Det oppgraderer ingen database eller publisert API-kode. Den senere sammenslåingen av `dev` til `main` publiserer funksjonene og databasemigrasjonene separat.

## 1. DNS og nøkkelfiler

På Windows DNS opprettes en A-oppføring med navn **itlab** i sonen **im.local**, med IP **10.100.0.14**. Begge elevnettenes DNS-servere må kunne slå opp navnet, gjennom oppføringer eller videresending. Elev-PC-ene trenger ikke være domenemedlemmer.

Test fra en PC i hvert elevnett:

```powershell
nslookup itlab.im.local
```

Begge skal returnere `10.100.0.14`. Før byttet må ventende arbeid være synkronisert og eksisterende brukere ha nøkkelfilen sin lagret. Pålogging og lokal lagring følger nettadressen; ved bytte fra IP til DNS-navn logger eleven inn igjen med samme fil. Konto-ID, XP og serverlagret progresjon beholdes.

## 2. Kontroller på Ubuntu-serveren

Hent skriptet fra `dev` til din egen mappe i SSH-terminalen. Etter sammenslåing kan det samme skriptet hentes fra `main`.

```bash
curl --fail --location \
  https://raw.githubusercontent.com/Bodin-IM/it-laben/dev/server/deploy/change-origin.sh \
  --output "$HOME/it-laben-change-origin.sh"

sudo bash "$HOME/it-laben-change-origin.sh" \
  --name itlab.im.local --ip 10.100.0.14 --check
```

Kontrollen leser konfigurasjon, sertifikater, porter og eksisterende API-helse. Den endrer ikke filer eller tjenester. Den forventer oppsettet fra `install-main.sh`, inkludert CA-en under `/root/it-laben-ca/`. Feiler den, behold resultatet og rett den konkrete forutsetningen før byttet.

## 3. Gjør adressebyttet

Kjør uten `--check`:

```bash
sudo bash "$HOME/it-laben-change-origin.sh" \
  --name itlab.im.local --ip 10.100.0.14
```

Skriptet gjør følgende:

- Pauser oppdateringstimeren og bruker samme publiseringslås som main-jobben. En pågående publisering får fullføre; ved opptatt lås avsluttes forsøket og timerens tilstand gjenopprettes.
- Tar konfigurasjonsbackup under `/var/backups/it-laben/origin/` og en konsistent databasebackup under `/var/backups/it-laben/database/`.
- Lager et nytt ettårig serversertifikat med samme CA og servernøkkel. Alle eksisterende DNS/IP-navn beholdes, og `itlab.im.local` legges til. CA-sertifikat og CA-nøkkel endres ikke. PC-er som allerede stoler på CA-en trenger ingen ny rotsertifikatinstallasjon.
- Oppdaterer Nginx, `APP_ORIGIN` og publiseringsjobbens adresse samlet. Ny adresse er `https://itlab.im.local`, ny HTTPS-port er `443` og HTTP på `80` videresender til den faste adressen. Den tidligere HTTPS-porten, normalt `8443`, videresender også. Eksisterende HTTP-oppsett på `8080` beholdes i overgangsperioden.
- Kontrollerer Nginx, starter eksisterende API på nytt og laster Nginx på nytt. Det kontrollerer HTTPS, API-helse, API-ets Origin-kontroll, HTTP-videresending og forsiden.
- Gjenoppretter timerens tidligere tilstand. Var automatisk oppdatering på, fortsetter den å hente bare `main`. Var timeren allerede pauset, forblir den pauset.

Ved feil etter aktivering forsøker skriptet å gjenopprette konfigurasjon og sertifikat og friskmelde den gamle adressen. Databasen overskrives aldri med backup. Hvis tilbakeføringen ikke kan friskmeldes, forblir oppdateringstimeren pauset for manuell kontroll. Backupområdet inneholder originalfilene og testloggen.

Skriptet endrer ikke brannmurregler. Tillat TCP 80 og 443 fra begge elevnett der server- eller nettverksbrannmur krever det. Ikke åpne API-port 3001 ut på nettet.

## 4. Test den nye adressen fra begge nett

```powershell
Test-NetConnection itlab.im.local -Port 443
```

Åpne disse adressene i nettleseren:

```text
http://itlab.im.local/
https://itlab.im.local/api/health
https://itlab.im.local/min-lab/
```

HTTP skal videresende til HTTPS. Nettleseren skal godta sertifikatet, og helsesjekken skal vise `{"ok":true}`. Logg inn med eksisterende nøkkelfil og kontroller progresjon og lagring med dagens main-versjon.

Når ny adresse virker fra begge nett, kan `dev` slås sammen med `main`. Serveren publiserer da elevadministrasjon, undervisningsmodus, avatarer og feilrettinger. Migrasjonene 006–008 beholder kontoer, nøkkelfiler og poeng; eksisterende brukernavn blir tildelt på nytt én gang. Databasebackup og en kompatibel API-versjon trengs ved eventuell tilbakeføring etter migrasjon.

Ved behov kan publiseringen startes manuelt:

```bash
sudo systemctl start it-laben-update.service
sudo journalctl -u it-laben-update.service -n 100 --no-pager
cat /var/www/it-laben/current/.commit
```

Hvis timeren var pauset, start den igjen når publiseringen er kontrollert:

```bash
sudo systemctl start it-laben-update.timer
```

Administratorrollen kan gis til din eksisterende profil etter at den nye API-versjonen er publisert, som beskrevet i [elevadministrasjon](elevadministrasjon.md).
