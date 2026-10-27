# Backend: oppsummering av øving 1–10

Flervalgsaktivitet på `/aktiviteter/backend-oppsummering/`, tilgjengelig under
Utvikling → Aktiviteter på forsiden, etter modulene. 20 spørsmål, to fra hvert
øvingsark. Innholdet ligger i `src/lib/backendQuiz.js`.

## Læringsmål og forutsetninger

For elever som har jobbet med backend-øving 1–10. Elevene skal kunne forutsi og
forklare HTTP-flyten, identifisere riktig datakilde og velge tiltak ved feil i
lagring, validering, innlogging, tilgangskontroll og publisering.

De bør ha sendt GET og POST, sett requests i Network eller et API-verktøy og
prøvd meldingsappen. Begrepene introduseres ikke fra bunnen av i denne aktiviteten.
Lenker i oppsummeringen peker tilbake til relevante kodelaber. Øving 1–4 deler
introduksjonslaben `/backend/`; den erstatter ikke alle oppgavene i de fire arkene.

## Handling, respons og ny utprøving

Eleven leser en konkret situasjon, forutsier utfallet og velger ett av fire svar.
«Sjekk svaret» gir en begrunnelse for det valgte alternativet. Ved feil kan eleven
velge på nytt. Hint er valgfritt og gir ingen trekk. «Vis riktig svar og forklaring»
gjør at eleven kan komme videre uten å måtte gjette. Alle spørsmål kan besøkes
igjen, og en ny runde kan startes fra oppsummeringen.

Førstesvaret beholdes når eleven retter svaret. Resultatet skiller mellom riktig
førstesvar, rettet etter tilbakemelding, vist forklaring og uløste spørsmål.
Hint kan ha blitt brukt også før et riktig førstesvar; dette er ikke et mål på
selvstendig mestring. Det er ingen beståttgrense, timer, liv eller XP.
Runden holdes i siden og nullstilles ved ny innlasting. Dette opplyses før spørsmålene.

## Hvorfor flervalg

Formatet gir rask gjenhenting og synliggjør vanlige misforståelser før videre
praktisk arbeid. Distraktorene bygger på kode eller arbeidsmåter elevene kjenner:
console.log kontra HTTP-svar, req.body kontra params, avsenderens kontra mottakerens
innboks, klient-IP kontra origin, indeks kontra stabil ID, minne kontra fil,
autentisering kontra autorisasjon og kildekode kontra bygg.

Alle spørsmål har ett svar som passer det uttrykkelig beskrevne øvingsoppsettet.
For eksempel er PATCH og 403 begrunnet i rutene i arkene, ikke presentert som de
eneste mulige designvalgene for alle API-er. CORS omtales ikke som tilgangskontroll.
Alternativene har parallell form, og fasitposisjonene er fordelt med fem på hver
posisjon. Ingen «alle ovenfor», lurespørsmål eller poengtrekk ved feil.

## Dekning og kilder

Spørsmålene bygger på de ti øvingsarkene i prosjektets mappe «Interaktive leksjoner».
Sidetall nedenfor er trykte sidetall. Kildene har lokale skoleoppsett; oppgaven om
publisering gjelder uttrykkelig `public`-oppsettet i øving 10, ikke IT-labens eget
SvelteKit-bygg.

| Øving og kildefil                                  | Spørsmål                            | Sider  | Misforståelse som undersøkes                                                 |
| -------------------------------------------------- | ----------------------------------- | ------ | ---------------------------------------------------------------------------- |
| 1 · Øving 1 - Backend.pdf                          | server-svar, server-rute            | 1–2    | Terminalutskrift sender ikke HTTP-svar; lytteadresse er ikke besøksadresse.  |
| 2 · Backend_del_2_Send_meldinger.pdf               | melding-json, melding-mottaker      | 1–4    | JSON-middleware må kjøre før ruten; respons er ikke en ny innboksmelding.    |
| 3 · Backend_del_3_Frontend_og_backend.pdf          | frontend-localhost, frontend-origin | 1–2    | fetch i klikkfunksjonen kjører hos besøkeren; origin tilhører siden.         |
| 4 · Backend_del_4_Data.pdf                         | data-stabil-id, data-tomt-utvalg    | 1–3    | Indeks/tekst er ikke stabil ID; tomt søkeresultat er ikke manglende ressurs. |
| 5 · Backend_del_5_Lagring_i_JSON_fil.pdf           | lagring-omstart, lagring-feil       | 1–3    | Lagring krever innlesing etter omstart; bekreftelse må vente på lagring.     |
| 6 · Backend_del_6_CRUD.pdf                         | crud-patch, crud-sletting           | 1–3    | Rute og metode må passe API-et; også sletting må lagres.                     |
| 7 · Backend_del_7_Validering_og_feilhandtering.pdf | validering-type, validering-fetch   | 1, 3   | Gyldig JSON er ikke gyldige felt; HTTP 400 avviser ikke fetch automatisk.    |
| 8 · Backend_del_8_Registrering_og_palogging.pdf    | innlogging-hash, innlogging-omstart | 1, 3–6 | Hash sammenlignes med bcrypt; lagret konto er ikke en aktiv sesjon.          |
| 9 · Backend_del_9_Tilgangskontroll.pdf             | tilgang-eier, tilgang-direkte       | 2–3    | Identitet kommer fra kontrollert sesjon; skjult knapp er ikke autorisasjon.  |
| 10 · Backend_del_10_Drift_og_publisering.pdf       | drift-bygg, drift-tjeneste          | 1, 3–4 | Kildeendring er ikke nytt bygg; start/reload/restart-policy er ikke enable.  |

Utvalget er en oppsummering, ikke en uttømmende prøve i alt fra arkene. Blant annet
sikkerhetskopiering, størrelsesgrenser, utlogging og feilhåndtering ved ødelagte
datafiler må også undersøkes praktisk.

## Lærerbruk og overføring

La eleven velge alene før en kort samtale i par: «Hvorfor passer dette svaret, og
hvorfor passer ikke det nærmeste alternativet?» Se særlig på begrunnelsen etter et
feilvalg. Spør hva eleven endret i forståelsen før et nytt forsøk. Førstesvar og
gjennomgåtte spørsmål er støtte til samtalen, ikke dokumentasjon på bred mestring.

Oppsummeringen gir et nytt anvendelsesoppdrag uten svaralternativer: bygg en liten
gjestebok, forklar POST → lagring → GET, test omstart og kontroller at bruker B ikke
kan slette bruker A sitt innlegg. Be eleven forutsi status og data før testen,
vise bevis fra request/status/datafil etterpå, og forklare en feil som ble funnet.
Reduser støtten ved å la elevene velge testdata og forklare feilen uten hint først.

Tegn på forståelse er at eleven kan begrunne serverens valg og overføre det til
gjesteboken. Et riktig alternativ alene, eller en høyere sum etter flere forsøk,
er ikke tilstrekkelig. En lærer må prøve aktiviteten med elever før det kan hevdes
at den gir læringsutbytte eller passende vanskelighetsgrad.

## Teknikk og kontroll

`repetisjonsaktiviteter` er offentlig innhold uten servervurdering.
`altElevinnhold` samler det med eksisterende aktiviteter på forsiden.
Den eksisterende serverkatalogen, XP-reglene, modulprogresjonen og fagsjekkene
forblir basert på `aktiviteter`. Fasit er synlig i klientkoden med hensikt.

Modelltestene kontrollerer dekning, gyldige alternativer, fasitfordeling,
førstesvar kontra gjentatte forsøk, fasitvisning, ufullført runde og at aktiviteten
ikke gir en ny XP-aktivitet. Kontroller også faktisk tastaturbruk, hint, feilvalg,
nytt forsøk, navigasjon tilbake, oppsummering, ny runde, lys/mørk visning og mobil.
Teknisk testing kan bekrefte oppførselen, men ikke pedagogisk effekt.
