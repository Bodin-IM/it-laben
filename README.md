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

Spillene har en egen seksjon på forsiden. Alle tre er tilgjengelige, slik at elevene kan prøve ulike måter å utforske og forstå chatten på.

| Spill                                                                  | Adresse på nettstedet        | Oppdrag                                                                                   |
| ---------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------- |
| [Meldingsdetektiven](src/routes/spill/meldingsdetektiven/+page.svelte) | `/spill/meldingsdetektiven/` | Følg sporene, rett feil i frontend og backend, og test om chatten fungerer.               |
| [Redd chatten](src/routes/spill/redd-chatten/+page.svelte)             | `/spill/redd-chatten/`       | Reparer backend-koden, og få serveren til å håndtere både vanlige requests og feilforsøk. |
| [To nettlesere, én chat](src/routes/spill/chat/+page.svelte)           | `/spill/chat/`               | Bygg en handlingsrekke som får riktig melding fram til Noah.                              |

**Meldingsdetektiven** har fire saker med ulike feil på tvers av frontend og backend. Koden står i fokus mens eleven undersøker spor i requests, svar og serverdata, retter feil og tester hva endringen gjør. Feilsøkingen simuleres lokalt i nettleseren.

**Redd chatten** bruker koden som spillebrett. Eleven legger til, bytter og flytter kodeblokker i en feilaktig Express-rute. Tre oppdrag handler om validering før lagring, avsender fra session og kontroll av eierskap før sletting. Virtuelle brukere prøver ulike situasjoner. Vurderingen ser både på svaret og hva som faktisk ble lagret eller slettet, så det er ikke nok å sende riktig HTTP-status. Flere korrekte løsninger kan godtas.

De viktigste kravene står synlig ved hvert oppdrag. Etter en bestått prøverunde får eleven en kort forklaring på hva løsningen gjør, hvorfor den virker, og hva som kan brukes videre. I første oppdrag kan eleven også velge **«Følg requesten steg for steg»**. Forrige og Neste viser kodelinjene, variablene `tekst` og `lagret`, serverlisten og svaret ved hvert tidspunkt. Objektet opprettes før det legges i listen, og kode etter `return` vises som hoppet over. Gjennomgangen bruker elevens nåværende kode; en kodeendring avslutter den slik at gamle verdier ikke knyttes til ny kode. En enkelt gjennomgang gir ikke godkjenning av hele oppdraget.

**To nettlesere, én chat** er den første varianten. Den har tre starttilstander: meldingen er ikke sendt, meldingen ligger allerede på backend, eller meldingen ligger i et annet rom enn Noah viser. Eleven velger handlinger for Ada og Noah, tester rekkefølgen og undersøker resultatet.

Spillene bruker faste startdata for å gjøre forsøkene sammenlignbare. Nettleserne, brukerne og backend er lokale simuleringer; spillene sender ingen ekte chatmeldinger mellom brukere.

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

### Lyst og mørkt tema

Alle sidene har den felles Svelte-komponenten [ThemeToggle](src/lib/components/ThemeToggle.svelte) i toppfeltet. Første besøk følger enhetens fargetema. Et manuelt valg lagres som `light` eller `dark` i `localStorage` under nøkkelen `it-laben-theme`, og gjelder videre på tvers av sidene og neste besøk. Åpne faner synkroniseres også.

[theme.js](src/lib/theme.js) holder felles tilstand og startes fra rotlayouten. Et lite skript i `src/app.html` velger tema før siden tegnes, slik at lagret mørkt tema ikke først vises som lyst. Om lokal lagring er utilgjengelig, kan temaet fortsatt byttes under besøket.

Fargene er samlet i [theme.css](src/lib/theme.css). Nye sider bruker variabler som `var(--color-surface)`, `var(--color-text)` og `var(--color-border)` for å støtte begge temaer. Kodepanelene beholder en mørk editorpalett i begge temaer. Legg temavelgeren i toppfeltet på nye sider:

```svelte
<script>
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
</script>

<ThemeToggle />
```

### Felles lesbarhet

Skriftstørrelser og linjehøyder ligger også i `src/lib/theme.css`. Sidene og de felles komponentene bruker disse variablene, slik at videre justeringer kan gjøres samlet:

| CSS-variabel                        | Standard       | Bruk                                                       |
| ----------------------------------- | -------------- | ---------------------------------------------------------- |
| `--font-body`                       | `1rem`         | Forklaringer, oppgavekrav og annen tekst eleven skal lese. |
| `--font-small`                      | `0.875rem`     | Knapper og kompakte støttetekster.                         |
| `--font-meta`                       | `0.8125rem`    | Korte merkelapper og sekundær informasjon.                 |
| `--font-code`                       | `0.9375rem`    | Kode i de større panelene.                                 |
| `--font-code-small`                 | `0.875rem`     | Kompakte kodeutdrag og verdier.                            |
| `--leading-body` / `--leading-code` | `1.6` / `1.65` | Linjehøyde for tekst og kode.                              |

Størrelsene bruker `rem` og følger nettleserens grunnstørrelse. På små skjermer tilpasses oppsettet, og tekst og kontroller får bryte over flere linjer i stedet for at teksten krympes. Kodepaneler kan ha egen vannrett rulling når hele kodelinjen må beholdes. Nye sider bør bruke de samme variablene og kontrolleres både med liten skjermbredde og forstørret tekst.

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
| `src/lib/chatSpill.js`           | Oppdrag, handlingskort, kjøreplaner og målsjekker for det første chatspillet. |
| `src/lib/reddChatten.js`         | Backend-blokker, requests og vurdering av svar og data i Redd chatten.        |
| `src/lib/meldingsdetektiven.js`  | Saker, kode, spor og simulerte feilforsøk i Meldingsdetektiven.               |
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
