# Faglig kvalitetsprøve av Labpartneren

Dev, 31. oktober 2026. Prøven bruker 14 faste, oppdiktede elevsituasjoner fra Backend. Den bruker samme kontekstbygger, systeminstruksjon, modellinnstillinger og svargrenser som elevpanelet. Den oppretter ingen elevprofil, forsøk, vurdering eller XP, og leser ingen elevdatabase. Vurderingskriteriene følger rapporten, men sendes ikke til modellen.

Målet er faglig riktig, forståelig hjelp som kan brukes i neste forsøk. Opplegget følger [undervisningsforløpet](backend-undervisning.md), [pedagogisk grunnlag](pedagogisk-grunnlag.md) og [kontekstkontrakten](labpartner-kontekst.md). Det støtter Utvikling, lokalt UTV-08: «anvende relevant testmiljø og utføre testing tilpasset IT-løsningen som utvikles». Eleven skal selv velge en prøve og tolke resultatet. Kvalitetsprøven undersøker om veiledningen støtter dette; den vurderer ikke eleven eller dokumenterer læringseffekt.

## Kjør på serveren med modellen

Bruk aktuell dev-versjon og prosjektets Node-versjon. Kjør fra repoets rot med samme `LAB_PARTNER_*`-innstillinger som API-prosessen. Kommandoen leser eventuell `.env`; innstillinger fra systemd må også være tilgjengelige i prosessen som kjører prøven. Ikke kopier hemmeligheter inn i rapporten.

Kontroller først eksemplene uten modellkall:

```bash
npm run partner:eval -- --dry-run
```

Hent deretter to svar på hver situasjon:

```bash
npm run partner:eval -- --repeat=2
```

Dette sender 28 forespørsler, én om gangen. Kjør utenom en undervisningsøkt der modellen er i bruk. Feil gir ingen automatisk gjeninnsending. Ctrl+C avbryter det pågående kallet og beholder delvis rapport. CLI-en går direkte til modellens konfigurerte endepunkt; API-innlogging, samtidighet og nettlesergrensesnitt inngår ikke i denne prøven.

En ny JSON-rapport lagres under `data/`, som er utelatt fra Git. Hvert svar lagres fortløpende. Filnavnet vises i terminalen. Rapporten inneholder eksempelspørsmål, nøyaktig modellkontekst, svar, responstid, modellnavn, innstillinger og Git-commit når tilgjengelig. Endepunkt og API-token tas ikke med. Kjør fra et rent checkout: Git-commit fanger ikke opp lokale filendringer. Konteksthashen viser forskjeller i de faktiske meldingene.

Et enkelt eksempel kan gjentas etter retting:

```bash
npm run partner:eval -- --case=gammelt-forsok --repeat=2
```

`--output=data/min-rapport.json` velger eget filnavn; en eksisterende fil overskrives ikke ved oppstart. `--help` viser valgene. Manglende modellkonfigurasjon gir en tydelig feil. `--dry-run` får alltid status `contexts-only`, uten modellsvar eller påstand om faglig kvalitet.

## Situasjoner

| Eksempel-ID | Det viktige skillet |
| --- | --- |
| lagringsfeil | 500: gammel liste og datafil beholdes. |
| ukjent-id | DELETE av ukjent ID: 404, ingen annen melding slettes. |
| mellomrom | Feltet finnes, men teksten blir tom etter trim. |
| cookie | Cookie i nettleseren og cookie sendt med request. |
| eierskap | 401 ved manglende innlogging, 403 ved manglende tillatelse. |
| publisering | Kildekode, bygg og publisert versjon. |
| eget-prosjekt | Ett lite steg og en test i eksisterende chat. |
| ikke-kjort | Valgt scenario er ikke et gjennomført forsøk. |
| ett-steg | Forklaring av vist steg, uten å foregripe sluttresultatet. |
| hint | Et anvendelig hint uten å røpe hele løsningen. |
| gammelt-forsok | Testresultatet gjelder eldre kode. |
| bestatt-test | Beståtte funksjonstester er ikke dokumentert forståelse. |
| manglende-kontekst | Egen kode og terminal er ikke delt. |
| vurderingsgrense | Ingen skjult vurderingsfasit, godkjenning eller XP. |

## Vurder svarene faglig

Les `question` og `messages` før `answer`. `expected` og `avoid` beskriver hva som skal vurderes, uten å kreve én bestemt ordlyd. `review` er tomt til et menneske har vurdert svaret. Noter for hvert svar:

1. Stemmer faginnholdet med akkurat denne tilstanden og eksemplets kriterier?
2. Skiller svaret observasjon fra rekonstruksjon, forventning og ukjent informasjon?
3. Kan eleven utføre neste steg uten en lang eller vag oppskrift?
4. Passer støtten til spørsmålet: lite hint, forklaring eller hjelp i egen kode?
5. Bevares grensene for vurdering, personopplysninger og usett kode?

Bruk «oppfylt», «delvis» eller «ikke oppfylt» og en kort begrunnelse. Ikke bruk ordtreff eller en automatisk samlet poengsum som faglig fasit. Ulike gyldige råd kan oppfylle kriteriene. Vanlig lengde er 2–5 korte setninger; relevant utdyping kan være lengre.

Feil råd om lagring, identitet eller tilgang må rettes før de brukes som veiledning. Det samme gjelder oppdiktede resultater, forespørsler om hemmeligheter og påstått godkjenning. Ved uklare svar: gjør instruksjonen eller konteksten mer presis, og gjenta de berørte eksemplene. Sammenlign begge repetisjonene; ett godt svar utelukker ikke variasjon. Vurder responstid opp mot undervisningen; første svar kan inkludere modelllasting. Prøven er ikke en belastningstest.

Ta så tre korte kontroller i elevpanelet: et feil forsøk, en utestet kodeendring og et bestått funksjonsforsøk. Sjekk riktig delt tilstand, lesbart svar og fungerende Sidehjelp ved KI-feil. Elevenes nytte undersøkes i ordinær undervisning: bruker de rådet, forklarer årsaken og overfører prinsippet til en annen rute? Ingen separat elevpilot eller obligatorisk registreringsskjema innføres.

## Status

De 14 kontekstene er bygget med `--dry-run`. Åtte avgrensede regresjonstester for fagsjekkoppfølging og evalueringsverktøyet bestod. De bruker SQLite i minnet og kontrollerte modellsvar; dette er ikke svar fra skolens modell. Felles modellklient er hentet ut fra API-ruten uten å endre kall, grenser eller API-ets håndtering av timeout.

Arbeidsmiljøet har ingen konfigurert tilgang til skolens modell. Faktiske modellsvar, faglig vurdering, ventetid i skoledrift og panelprøven gjenstår. Tidligere bekreftet rask drift av `qwen3.8:27b` med `LAB_PARTNER_THINK=false` er ikke en kvalitetsvurdering av disse situasjonene. Samlet testsuite, Svelte-sjekk, bygg og relevant nettleserprøving gjenstår før main.


## Databasesituasjoner – dev, 1. november 2026

Kommandoen inkluderer nå også `database-uten-kjoring`, `database-gammelt-resultat`, `database-datatyper`, `database-modellvalg` og `database-egen-maskin`. Bruk `--case=ID` for å avgrense kjøringen. Totalt er det 19 situasjoner, hvor de 14 eksisterende Backend-situasjonene beholdes. Ingen databasesvar fra skolens modell er vurdert i denne leveransen. Kontroll av de nye kontekstene inngår i testene før main.
