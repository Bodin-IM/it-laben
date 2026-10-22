# IT-laben

Interaktive forklaringer, små øvelser og kodeeksempler for IT-fagene i videregående skole.

IT-laben skal hjelpe elevene å se hvordan ting henger sammen: følge data, prøve en handling og forstå resultatet. Sidene kan brukes i felles gjennomgang eller som støtte når elevene arbeider med egne prosjekter.

Innholdet handler foreløpig om webutvikling. Laben skal også kunne romme driftsstøtte og etter hvert brukerstøtte.

## Innhold

| Side                                                      | Adresse på nettstedet | Hva elevene kan utforske                                                                                 |
| --------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------- |
| [Forside](src/routes/+page.svelte)                        | `/`                   | Oversikt over forklaringene og øvelsene.                                                                 |
| [Frontend møter backend](src/routes/backend/+page.svelte) | `/backend/`           | Følge POST og GET stegvis, klikke fram forklaringer ved kodelinjene og prøve validering i backend.       |
| [Bygg videre på chatten](src/routes/chatrom/+page.svelte) | `/chatrom/`           | Hente riktig rom, bruke session som avsender og kontrollere hvem som får slette en melding.              |
| [Lagring i JSON-fil](src/routes/fillagring/+page.svelte)  | `/fillagring/`        | Følge koden stegvis, endre en melding, slå lagringen av og på og undersøke hva som overlever en omstart. |
| [Sessions og pålogging](src/routes/sessions/+page.svelte) | `/sessions/`          | Følge innlogging i fire trinn, med kode som følger trinnet, cookie, session og egne feilforsøk.          |

De nyeste frontend/backend- og sessions-visningene er hovedversjonene på de vanlige adressene. Forsiden har én inngang til hvert tema.

På chatrom-siden følger eleven tre avgrensede kodeforsøk: filtrering per rom, avsender fra `req.session.bruker` og sletting med kontroll av `avsenderId` på backend. Etter en vellykket sending eller sletting hentes rommet på nytt med GET. Data, feilforsøk og alternativet med en meldingsliste inne i hvert rom åpnes ved behov.

### Spill og utfordringer

Spillene har en egen seksjon på forsiden. Eleven får et oppdrag og bygger et forsøk selv, med kodeforklaringer tilgjengelig underveis.

| Spill                                                        | Adresse på nettstedet | Oppdrag                                                      |
| ------------------------------------------------------------ | --------------------- | ------------------------------------------------------------ |
| [To nettlesere, én chat](src/routes/spill/chat/+page.svelte) | `/spill/chat/`        | Bygg en handlingsrekke som får riktig melding fram til Noah. |

Kodepuslespillet har tre starttilstander: meldingen er ikke sendt, meldingen ligger allerede på backend, eller meldingen ligger i et annet rom enn Noah viser. Eleven velger handlinger for Ada og Noah, tester rekkefølgen og undersøker resultatet. Oppdraget vurderes ut fra dataene på serveren og i Noahs visning, så flere handlingsrekker kan gi riktig løsning.

Hvert forsøk starter fra oppdragets opprinnelige tilstand. Begge nettleserne og backend er lokale simuleringer; spillet sender ingen ekte chatmeldinger mellom brukere.

## Hvordan vi bygger undervisningssidene

Når vi lager og videreutvikler sider, legger vi vekt på å:

- Ta utgangspunkt i et konkret spørsmål eller en liten funksjon.
- La eleven prøve selv og se hva som endrer seg.
- Vise korte kodeutdrag sammen med handlingen de forklarer.
- La eleven undersøke én kodelinje om gangen, med en forklaring tett på linjen.
- Dele opp informasjonen og gjøre flere detaljer tilgjengelige når eleven trenger dem.

## Teknisk oppsett

Prosjektet er bygget med **Svelte 5, SvelteKit 3 og Vite**. Demonstrasjonene simulerer handlinger i nettleseren, så selve IT-laben kan kjøres uten en egen Express-backend eller database. Express-koden på undervisningssidene er eksempler til elevenes egne prosjekter.

Nettsiden bygges som statiske filer med `@sveltejs/adapter-static`, konfigurert i [vite.config.js](vite.config.js). [Rotlayouten](src/routes/+layout.js) aktiverer prerendering og avsluttende skråstrek i sidestiene. Produksjonsbygget legges i `build/` og kan serveres av Nginx.

## Kjøre prosjektet lokalt

**Disse kommandoene kjøres på utviklingsmaskinen.** Du trenger Git og Node.js med npm.

Første gang:

```bash
git clone https://github.com/Bodin-IM/it-laben.git
cd it-laben
npm ci
npm run dev
```

Åpne adressen som vises i terminalen. Senere starter du prosjektet med `npm run dev` fra prosjektmappen.

### Kontrollere og bygge

Kjør disse før du publiserer endringer:

```bash
npm run check
npm run build
```

For å se produksjonsbygget lokalt etter bygging:

```bash
npm run preview
```

`npm run lint` kontrollerer formatering med Prettier. `npm run format` formaterer filene og skriver endringene.

## Finne fram i prosjektet

| Fil eller mappe                  | Bruk                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `src/routes/+page.svelte`        | Forsiden. Listen `sider` bestemmer hvilke kort som vises.                     |
| `src/routes/<tema>/+page.svelte` | En undervisningsside med egen adresse.                                        |
| `src/lib/components/`            | Felles kodevisninger og forklaringer ved klikk på kodelinjer.                 |
| `src/lib/chatromLab.js`          | Rene simuleringssteg og kodeutdrag for chatrom, session-avsender og sletting. |
| `src/lib/chatSpill.js`           | Oppdrag, handlingskort, kjøreplaner og målsjekker for kodepuslespillet.       |
| `docs/serverdrift.md`            | Publisering, kontroll av serveren og feilsøking.                              |

### Legge til en ny undervisningsside

1. Opprett `src/routes/<tema>/+page.svelte`, for eksempel `src/routes/nettverk/+page.svelte` for adressen `/nettverk/`.
2. Lag innholdet med et tydelig mål og en konkret handling eleven kan prøve.
3. Legg et nytt objekt i listen `sider` i `src/routes/+page.svelte`. Fyll inn `tittel`, `beskrivelse`, `href`, `kategori`, `type`, `emner` og `symbol`.
4. Kjør `npm run check` og `npm run build`. Prøv både lenken fra forsiden og den nye siden direkte, og kontroller visningen på stor og liten skjerm.

## Publisering og serverdrift

IT-laben hostes på en egen **Ubuntu-server med Nginx**. Serveren henter selv endringer fra GitHub med en systemd-timer.

1. **På utviklingsmaskinen:** Rediger og kontroller prosjektet, lag en commit og push til `main`. Endrer du avhengigheter, tar du med både `package.json` og `package-lock.json`.
2. **På Ubuntu-serveren:** Oppdateringsjobben henter nye commits med `git fetch` og bygger en ren kopi med `npm ci --include=dev`, `npm run check` og `npm run build`.
3. **Publisering:** Når bygget lykkes, aktiveres den nye versjonen for Nginx. Ved byggefeil beholdes forrige publiserte versjon.

Gjennomfør kode- og avhengighetsendringer på utviklingsmaskinen. Serverens oppdateringsjobb håndterer installasjon og bygging automatisk.

Se [driftsveiledningen](docs/serverdrift.md) for manuell oppdatering, logger, timerstatus, Nginx, kontroll av publisert commit og feilsøking.
