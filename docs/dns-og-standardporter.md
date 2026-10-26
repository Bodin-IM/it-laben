# DNS-navn og IP-adresse på port 80/443

IT-laben kan åpnes både med **itlab.im.local** og **10.100.0.14**. IP-adressen beholdes når lokal DNS ikke er tilgjengelig. HTTP på port 80 viser leksjoner og vanlige spill uten innlogging eller backend. HTTPS på 443 gir pålogging, progresjon og lærerfunksjoner. `/api/` bruker samme adresse som nettstedet; Node fortsetter på `127.0.0.1:3001`.

Dette er flytting av en allerede fungerende installasjon. Skriptet `change-origin.sh` gjenbruker serverens eksisterende lokale CA og private servernøkkel. Det oppgraderer ingen database eller publisert API-kode. Publiser først versjonen av `main` som støtter `APP_ORIGIN_ALIASES`. Skriptet kontrollerer denne støtten før serveroppsettet endres.

## Beholde IP-adressen når DNS er utilgjengelig

Etter oppdatering gjelder dette:

| Adresse                     | Oppførsel                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| `http://10.100.0.14/`       | Åpne aktiviteter over HTTP; ingen automatisk overgang til HTTPS eller DNS-navn.                  |
| `https://10.100.0.14/`      | Nettsted og pålogging over HTTPS med IP-adressen beholdt.                                        |
| `http://itlab.im.local/`    | Åpne aktiviteter over HTTP når DNS virker.                                                       |
| `https://itlab.im.local/`   | Nettsted og pålogging over HTTPS når DNS virker.                                                 |
| `https://10.100.0.14:8443/` | Hvis den gamle porten finnes, flyttes besøket til 443 på samme IP med sti og søkestreng beholdt. |

Det gamle Nginx-oppsettet videresendte HTTPS-besøk med IP permanent til DNS-navnet. Dette må rettes i Nginx på serveren; en vanlig frontendbygging gjør det ikke. Lenkene og HTTPS-kontrollen i nettsiden bruker nå vertsnavnet eller IP-adressen som besøket allerede bruker. Det skjer ingen automatisk navigering til HTTPS. Pålogging, lagring og lærerfunksjoner krever fortsatt HTTPS.

**For en server som allerede er satt opp:** Når rettingen er flettet inn i `main`, publiser den først og kontroller at oppdateringen lykkes:

```bash
sudo systemctl start it-laben-update.service
sudo journalctl -u it-laben-update.service -n 100 --no-pager
cat /var/www/it-laben/current/.commit
```

Hent deretter siste `change-origin.sh` som beskrevet nedenfor, kjør `--check`, og kjør uten `--check` når kontrollen består. Samme kommando med samme DNS-navn og IP oppdaterer eksisterende oppsett. API-et får en eksplisitt tillatelse til `https://10.100.0.14` gjennom `APP_ORIGIN_ALIASES`; andre Origin-adresser tillates ikke automatisk. Eventuelle eksisterende aliaser bevares. Skriptet kontrollerer HTTPS, Origin, statisk HTTP og avvist HTTP-API via både DNS-navnet og IP-adressen, uten behov for DNS-oppslag fra serveren.

En gammel permanent videresending kan ligge i nettleserens hurtiglager. Hvis IP fortsatt blir til DNS etter serveroppdateringen, prøv et privat vindu og tøm eventuelt hurtiglagrede nettstedsfiler. Et nytt besøk på IP bruker et annet cookie- og lagringsområde enn DNS-navnet: logg inn med samme nøkkelfil for å bruke samme konto og serverlagrede progresjon. Ventende lokale endringer bør synkroniseres før adressebytte. Nettverket må fortsatt gi tilgang til serverens IP, og HTTPS-sertifikatet må være betrodd og dekke IP-adressen.

## 1. DNS og nøkkelfiler

På Windows DNS opprettes en A-oppføring med navn **itlab** i sonen **im.local**, med IP **10.100.0.14**. Begge elevnettenes DNS-servere må kunne slå opp navnet, gjennom oppføringer eller videresending. Elev-PC-ene trenger ikke være domenemedlemmer.

Test fra en PC i hvert elevnett:

```powershell
nslookup itlab.im.local
```

Begge skal returnere `10.100.0.14`. Før byttet må ventende arbeid være synkronisert og eksisterende brukere ha nøkkelfilen sin lagret. Pålogging og lokal lagring følger nettadressen; ved bytte fra IP til DNS-navn logger eleven inn igjen med samme fil. Konto-ID, XP og serverlagret progresjon beholdes.

## 2. Kontroller på Ubuntu-serveren

Hent skriptet fra `main` til din egen mappe i SSH-terminalen etter at rettingen er flettet inn og publisert:

```bash
curl --fail --location \
  https://raw.githubusercontent.com/Bodin-IM/it-laben/main/server/deploy/change-origin.sh \
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
- Ved adressebytte lages et nytt ettårig serversertifikat med samme CA og servernøkkel. Hvis serveren allerede bruker riktig HTTPS-adresse og sertifikatet dekker både DNS-navn og IP, beholdes sertifikatet. Et sertifikat som mangler en av adressene fornyes med samme CA og nøkkel. Alle eksisterende DNS/IP-navn beholdes, og `itlab.im.local` legges til. CA-sertifikat og CA-nøkkel endres ikke. PC-er som allerede stoler på CA-en trenger ingen ny rotsertifikatinstallasjon.
- Oppdaterer Nginx, `APP_ORIGIN`, `APP_ORIGIN_ALIASES` og publiseringsjobbens adresse samlet. Ny adresse er `https://itlab.im.local`, ny HTTPS-port er `443` og HTTP på `80` viser det statiske nettstedet uten profil-API. IP-adressen på 443 vises direkte. Den tidligere HTTPS-porten, normalt `8443`, videresender til 443 og beholder IP-adressen ved IP-besøk. Eksisterende HTTP-oppsett på `8080` beholdes i overgangsperioden.
- Kontrollerer Nginx, starter eksisterende API på nytt og laster Nginx på nytt. Det kontrollerer HTTPS, API-helse, API-ets Origin-kontroll, HTTP-forsiden og at API-kall på HTTP avvises med 426, via både DNS-navnet og IP-adressen.
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
http://10.100.0.14/
https://10.100.0.14/min-lab/
```

HTTP skal bli værende på HTTP og vise innhold uten pålogging. `/kom-i-gang/` gir sertifikatnedlasting, Windows-veiledning og en test av HTTPS-forbindelsen. Nettleseren skal godta sertifikatet, og helsesjekken skal vise `{"ok":true}`. Logg inn med eksisterende nøkkelfil og kontroller progresjon og lagring med dagens main-versjon.

Den tidligere HTTPS-versjonen kan ha lagret HSTS i nettleseren, som automatisk oppgraderer HTTP. Det nye Nginx-oppsettet fjerner denne policyen med `Strict-Transport-Security: max-age=0`, også på API-svar. Besøk **https://itlab.im.local/** én gang etter oppdateringen, og prøv deretter HTTP igjen. En tidligere permanent HTTP-videresending kan også ligge i nettleserens hurtiglager; tøm hurtiglagrede nettstedsfiler hvis den fortsatt brukes. Opplegget forutsetter at ingen overordnet domene-policy tvinger HTTPS.

Den ordinære publiseringsjobben fortsetter å hente `main`. Migrasjonene 006–008 beholder kontoer, nøkkelfiler og poeng; eksisterende brukernavn blir tildelt på nytt én gang. Databasebackup og en kompatibel API-versjon trengs ved eventuell tilbakeføring etter migrasjon.

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

## Åpen HTTP og veiledning for sertifikat

Frontendversjonen på `main` viser en liten påminnelse om Min lab på HTTP. `/min-lab/` viser veiledningen i stedet for innloggingsskjema. Toppliste og lærerpanel viser lenker til HTTPS. Fagsjekker, lagring og Nattevakten krever den sikre versjonen; de vanlige leksjonene og tre lokale spillene kan utforskes uten backend.

Sertifikatveiledningen er tilgjengelig på `/kom-i-gang/`. Den laster ned **bare** den offentlige CA-filen fra `/sertifikat/it-laben-root-ca.crt`, gir tre steg for Windows og tilbyr en ny kontroll etter installasjon. Ingen privatnøkkel kopieres til nettstedet eller repoet. Læreren kan bekrefte CA-ens SHA-256-fingeravtrykk fra en annen kjent kanal; HTTP-siden alene er ikke en uavhengig verifikasjon av sertifikatet.

Nettleseren kan ikke lese Windows sitt sertifikatlager. Kontrollen forsøker derfor å hente den statiske HTTPS-ressursen `/tilkobling.json` uten cookies eller brukerdata. Lykkes det, viser siden at HTTPS er tilgjengelig i nettleseren. Feil betyr at HTTPS ikke kunne bekreftes; det kan skyldes sertifikatet eller nettverket. Kontrollen hevder ikke at et bestemt sertifikat er installert, og den omgår ingen nettleservarsler.

Nginx serverer `/itlab-config.json` fra `/etc/it-laben-public.json`, med HTTPS-adressen og det offentlige CA-fingeravtrykket. Filen inneholder ingen innloggingsdata. Bare `/tilkobling.json` har åpen CORS for testen; profil-API-ets Origin-, CSRF- og cookie-regler er beholdt. HTTP `/api/` videresendes aldri til Node.

For en server som allerede er flyttet til `https://itlab.im.local`, hentes siste `change-origin.sh` og kjøres med samme argumenter som ovenfor. Det oppdaterer HTTP-visning, metadata og sertifikatnedlasting og direkte IP-tilgang uten å fornye et allerede riktig serversertifikat. Eksisterende 8443-videresending beholdes, med IP-adressen beholdt ved IP-besøk. Publiser den nye API-/frontendversjonen før skriptet kjøres.

Eksempelbilder bruker en syntetisk test-CA: [HTTP-forside](http-browsing.png), [sertifikatveiledning](certificate-guide.png) og [mobilvisning](certificate-guide-mobile.png).
