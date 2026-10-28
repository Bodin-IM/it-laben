# Fag, moduler og enkeltinnhold

Utprøving på `dev`: Når brukeren velger et fag, vises moduler først. Kortene har en dempet blåfarge i begge temaer og tekstmerket **Modul**. Under modulene ligger fortsatt alle fagets øvinger, oppdrag og spill, også innhold som er lenket fra en modul. Søket øverst finner både moduler og enkeltaktiviteter. Typefilteret under aktivitetene gjelder bare denne listen. Fagvalget gjelder begge oversiktene. Se [designvurderingen og utkastet](designvurdering-og-utkast.md) for utformingen som nå prøves på `dev`.

## Innholdstyper

| Type         | Bruk                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Undervisning | Eksisterende opplegg for felles gjennomgang. Elever får lenker til åpent repetisjonsinnhold. Innloggede lærere får i tillegg lenke til læreropplegget. |
| Øving        | Veiledet arbeid eleven kan gjøre selv. Tilsvarer den eksisterende tekniske kategorien `leksjon`.                                                       |
| Oppdrag      | Anvendelse og feilsøking. Eksisterende spill vises med merket **Oppdrag · Spill**.                                                                     |

Modulen er en samling, ikke en ny aktivitetstype som gir XP. «Aktiviteter» er fortsatt et samlebegrep. Betegnelser i oversikten endrer ikke aktivitetenes ID-er, URL-er, tester, forsøk eller belønninger. Gamification bestemmer ikke innholdets pedagogiske rolle.

## Første samlinger

- **Meldingens reise:** felles gjennomgang, frontend/backend-øving og dataflytspillet.
- **Data og lagring:** gjennomgang av minne og fil, fillagring og Øving 5–7.
- **Innlogging og tilgang:** gjennomgang, sessions, Øving 8–9, chatrom og de to feilsøkingsspillene. Forutsetter tidligere arbeid med dataflyt og lagring.
- **Fra kode til drift:** det eksisterende tverrfaglige opplegget «Fra kode til tjeneste», Øving 10 og repetisjonslenker. Dette er en første samling av eksisterende stoff, ikke et komplett driftskurs.

Nattevakten ligger fortsatt tilgjengelig blant enkeltspillene. Moduler må ikke ha alle tre innholdstypene, og elever kan alltid åpne enkeltdeler direkte.

## Modulsiden

Hver modul har mål, forkunnskaper, anbefalt rekkefølge og eventuelle repetisjonsressurser. Mål og forkunnskaper åpnes rett under introduksjonen. På mobil vises arbeidsrekkefølgen før ekstraressursene. Lenker til modulens aktiviteter tar med `modul` i adressen, slik at eleven får en tilbakevei også etter oppfrisking. Tilhørighet vises bare for sider som faktisk er del av eller lenket fra modulen. Gjennomgang og elevarbeid kan bruke samme side i ulike sammenhenger. Innholdet til gjennomgangen kan åpnes uten lærerrolle; private notater hentes fortsatt bare gjennom det beskyttede lærer-API-et.

Modulens status viser antall unike elevaktiviteter som API-et allerede har merket **Gjennomgått** eller **Bestått**. Undervisning, åpning av modulsiden og bare påbegynt arbeid teller ikke som fullføring. Modulen tildeler ingen nye poeng eller merker, og status kalles ikke dokumentert forståelse. Uten innlogging eller tilgjengelig progresjon vises ingen personlig status.

## Videre innhold og pedagogisk avgrensning

Ved nye eller vesentlig endrede Vg2-moduler brukes [læreplangrunnlaget](laereplangrunnlag.md) og [aktivitetsmalen](aktivitetsmal.md). Oppgi relevante programfag og kompetansemål i modulens veiledning eller arbeidsplan, og beskriv hvordan undervisning, øving og ny anvendelse bidrar til dem. De korte elevmålene på modulsiden skal konkretisere opplegget; de skal ikke fremstilles som ordrette kompetansemål. Gjør avgrensninger og videre arbeid synlig.

Samlingene følger [det pedagogiske grunnlaget](https://github.com/Bodin-IM/it-laben/blob/main/docs/pedagogisk-grunnlag.md). Denne endringen organiserer eksisterende innhold. Tilbakemeldinger og faglige tester beholdes på enkeltsidene; navigasjonen vurderer ingen elevsvar. Videre utvikling av en modul skal beskrive en ny anvendelse med mindre støtte, og hvordan lærer eller elev kan undersøke forståelsen. En gjennomgått samling dokumenterer ikke i seg selv overføring eller læringseffekt.

Registrer moduler i `src/lib/moduler.js`. Bruk stabile aktivitets-ID-er fra `innhold.js` og oppleggs-ID-er fra `teaching.js`. `steps` angir rekkefølge og innholdstype; `resources` lenker til åpne aktiviteter. Private lærernotater skal fortsatt ligge i `server/teaching.js`. De dynamiske modulrutene blir forhåndsbygget som statiske sider, også for direkte åpning og oppfrisking.

Ved utprøving: sjekk om elever finner riktig modul, forstår forskjellen på gjennomgang og elevarbeid, og finner igjen et spill uten å gå gjennom modulen først. Vurder pedagogisk effekt separat fra teknisk navigasjon.

## Teknisk kontroll av første versjon

`npm run check`, `npm run build` og 127 tester bestod. Nettleserprøven kontrollerte fagvalg, modulrekkefølge, søk og typefilter, gamle `#spill`-/`#ovingene`-lenker, alle modulrutene, oppfrisking, tilbakeknapp og lenker til enkeltsider. Elev-/lærervisning og progresjon ble prøvd med simulerte API-svar. Ingen progresjonsskriving ble utløst ved modulnavigasjon. Lyst/mørkt tema, tastatur og bredder på 1440, 390 og 320 piksler er kontrollert. Pedagogisk utprøving med elever gjenstår.
