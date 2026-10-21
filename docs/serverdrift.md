# IT-laben – oppdatering og kontroll av serveren

Gjelder Ubuntu-oppsettet som henter `main` fra GitHub, bygger med brukeren `itlab` og viser nettsiden gjennom Nginx på port **8080**.

## Huskeliste – kjøres på Ubuntu-serveren

| Hva vil du gjøre?                      | Kommando                                                      |
| -------------------------------------- | ------------------------------------------------------------- |
| Se etter endringer og publiser manuelt | `sudo systemctl start it-laben-update.service`                |
| Se de siste logglinjene                | `sudo journalctl -u it-laben-update.service -n 60 --no-pager` |
| Sjekk timerens status                  | `systemctl status it-laben-update.timer --no-pager`           |
| Se neste planlagte kjøring             | `systemctl list-timers it-laben-update.timer --all`           |
| Sjekk siste oppdateringsjobb           | `systemctl status it-laben-update.service --no-pager`         |
| Sjekk Nginx                            | `systemctl status nginx --no-pager`                           |
| Test HTTP på serveren                  | `curl -I http://127.0.0.1:8080/`                              |
| Se hvilken commit som er publisert     | `cat /var/www/it-laben/current/.commit`                       |

HTTP-testen skal normalt gi **200 OK**. Fra en annen maskin åpner du `http://SERVER-IP:8080/` i nettleseren, med serverens faktiske IP-adresse.

## 1. Publiser endringer fra utviklingsmaskinen

**På PC-en der du redigerer prosjektet:** Start med en oppdatert lokal kopi. Med et rent arbeidsområde kan du hente siste versjon med `git pull --ff-only`. Har du egne ucommittede endringer, ta vare på dem før du henter.

Gjør endringene og kjør kontrollene fra prosjektmappen:

```bash
npm run check
npm run build
git status
```

Når kontrollene lykkes, kontroller hvilke filer som er endret, og lagre dem i Git:

```bash
git add .
git commit -m "Oppdater IT-laben"
git push origin main
```

Har du endret npm-avhengigheter, kjører du `npm install` og tar med både `package.json` og `package-lock.json` i samme commit.

**På Ubuntu-serveren:** Timeren henter nye commits fra `main` og kjører `npm ci --include=dev`, `npm run check` og `npm run build` automatisk. Du trenger ikke å kjøre disse kommandoene manuelt der. Vil du publisere med en gang, bruk den manuelle oppdateringskommandoen i huskelisten.

Endringer i serverens klonede arbeidsmappe blir ikke med i bygget. Skriptet bygger en ren kopi av commit-en som er hentet fra GitHub.

## 2. Kontroller at oppdateringen gikk bra

Timeren starter første sjekk omtrent ett minutt etter at serveren starter (eller straks hvis dette tidspunktet er passert når timeren aktiveres). Deretter sjekker den omtrent to minutter etter at forrige jobb er ferdig. Hvis samme commit allerede er publisert, hopper skriptet over byggingen.

I loggen betyr **`Publisert: …`** at en ny versjon er aktivert. **`IT-laben er allerede oppdatert: …`** betyr at ingen ny publisering var nødvendig.

Oppdateringstjenesten er en **oneshot-tjeneste**: den kjører én jobb og avslutter. Derfor er `inactive (dead)` normalt etter en vellykket kjøring. Se etter `status=0/SUCCESS` og bekreft resultatet i loggen. Timeren skal normalt stå som `active (waiting)`.

For å følge loggen mens en jobb kjører:

```bash
sudo journalctl -u it-laben-update.service -f
```

Avslutt loggvisningen med **Ctrl+C**. Dette stopper ikke oppdateringsjobben.

**Publisert commit leses fra `current/.commit`.** Git `HEAD` eller utsjekket commit i `/srv/it-laben/repo` viser ikke nødvendigvis det som er publisert. Skriptet bruker `git fetch` og `git archive` uten å bytte commit i den klonede arbeidsmappen.

Test også den konkrete siden du har endret, for eksempel `curl -I http://127.0.0.1:8080/sessions/`, og åpne den i nettleseren.

## 3. Hvis noe ikke fungerer

**Ved byggefeil beholdes forrige publiserte versjon.** Les loggen, rett eventuelle kodefeil på utviklingsmaskinen og push på nytt. Ved midlertidige feil forsøker timeren samme commit igjen. Du kan også starte jobben manuelt.

Vises gammelt innhold, sammenlign publisert commit med GitHub og oppdater nettleserfanen. Faner som var åpne under publisering, kan trenge en full oppdatering.

Feiler HTTP-testen, sjekk Nginx-status og eventuelt `sudo journalctl -u nginx -n 40 --no-pager`. Vanlig publisering krever ingen omstart av Nginx. Etter en endring i Nginx-konfigurasjonen bruker du `sudo nginx -t && sudo systemctl reload nginx`.

## 4. Pause og start automatisk oppdatering

| Handling          | Kommando                                     |
| ----------------- | -------------------------------------------- |
| Pause midlertidig | `sudo systemctl stop it-laben-update.timer`  |
| Start igjen       | `sudo systemctl start it-laben-update.timer` |

Dette endrer ikke nettsiden som vises. En oppdateringsjobb som allerede kjører, fortsetter. En aktivert timer kommer tilbake ved neste omstart. For å beholde pausen også etter omstart, bruk `sudo systemctl disable --now it-laben-update.timer`; aktiver igjen med `sudo systemctl enable --now it-laben-update.timer`.

## 5. Følg med på diskplassen

Gamle publiserte versjoner ligger i `releases` og slettes ikke automatisk. Disse kommandoene viser diskplass, størrelsen på versjonsmappene og hvilken mappe som brukes nå:

```bash
df -h /var/www/it-laben
du -h --max-depth=1 /var/www/it-laben/releases
readlink -f /var/www/it-laben/current
```

Behold alltid versjonen `current` peker på. Vurder behovet for eldre versjoner når lagringsbruken øker. Gamle versjonsmapper er tilgjengelige for tilbakeføring, men gjør ikke gamle filadresser tilgjengelige gjennom den aktive nettsiden.

Referanser: [systemd-timere](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html), [oneshot-tjenester](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html) og [journalctl](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html).
