# IT-laben

Interaktive forklaringer, små øvelser og kodeeksempler for IT-fagene i videregående skole.

IT-laben skal hjelpe elevene å se hvordan ting henger sammen: følge data, prøve en handling og forstå resultatet. Sidene kan brukes i felles gjennomgang eller som støtte når elevene arbeider med egne prosjekter.

Innholdet handler foreløpig om webutvikling. Laben skal også kunne romme driftsstøtte og etter hvert brukerstøtte.

## Innhold

| Side                                                         | Adresse på nettstedet | Hva elevene kan utforske                                                                                        |
| ------------------------------------------------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| [Forside](src/routes/+page.svelte)                           | `/`                   | Oversikt over forklaringene og øvelsene.                                                                        |
| [Frontend møter backend](src/routes/backend/+page.svelte)    | `/backend/`           | Følge en melding fra inputfeltet via `fetch`, GET/POST og `req.body` til serveren.                              |
| [Bygg chatrom](src/routes/chatrom/+page.svelte)              | `/chatrom/`           | Koble sammen romvalg, requests og filtrering. Sammenligne én meldingsliste med rom som har egne meldingslister. |
| [Sessions og pålogging](src/routes/sessions/+page.svelte)    | `/sessions/`          | Utforske sammenhengen mellom cookie, session, pålogging, utlogging og `credentials`.                            |
| [Sessions 2 – test](src/routes/sessions-2-test/+page.svelte) | `/sessions-2-test/`   | Følge innlogging i fire trinn, med kode som følger trinnet og markeringer som forklarer resultatet.             |

Sessions 2 er en test av en mer trinnvis presentasjon, med ekstra forsøk og fordypning tilgjengelig ved behov.

## Hvordan vi bygger undervisningssidene

Når vi lager og videreutvikler sider, legger vi vekt på å:

- Ta utgangspunkt i et konkret spørsmål eller en liten funksjon.
- La eleven prøve selv og se hva som endrer seg.
- Vise korte kodeutdrag sammen med handlingen de forklarer.
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

| Fil eller mappe                  | Bruk                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `src/routes/+page.svelte`        | Forsiden. Listen `sider` bestemmer hvilke kort som vises.                          |
| `src/routes/<tema>/+page.svelte` | En undervisningsside med egen adresse.                                             |
| `src/lib/components/`            | Komponenter som kan brukes på sidene, blant annet kodevisningen i sessions-testen. |
| `docs/serverdrift.md`            | Publisering, kontroll av serveren og feilsøking.                                   |

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
