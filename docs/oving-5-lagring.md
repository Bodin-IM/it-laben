# Øving 5 – eksempel, forklaring og prøv selv

Dev, 2. november 2026. Brukeren opplevde den forrige utgaven som uoversiktlig: for mye skjedde i hvert steg. Siden er derfor lagt om til fem åpne deler under hverandre i én kolonne. Hver del følger **eksempel → kort forklaring → prøv selv**. Kodefaner, simulerte data, valg av kodevariant, kjøringsknapper og separate prosjektpaneler er fjernet. Eleven arbeider i en testkopi av egen chat.

[Pedagogisk grunnlag](pedagogisk-grunnlag.md), [designgrunnlaget](webdesign-og-brukeropplevelse.md) og [aktivitetsmalen](aktivitetsmal.md) styrer valgene. Enkel betjening frigjør plass til å lese, endre og teste kode. Nettsiden er et forklart eksempel; elevens eget prosjekt er aktiviteten. Det kreves ingen refleksjonsfelter eller nye fullføringsknapper.

## Mål og forkunnskaper

Målgruppe: Vg2 informasjonsteknologi, programfaget Utvikling. Eleven skal lagre en melding i JSON, lese samme melding etter omstart, undersøke en kontrollert feil og endre rekkefølgen slik at minnet oppdateres etter lagring. Eleven skal skille manglende fil fra eksisterende, ødelagt JSON.

Læreplan [ITK02-01](laereplan/ITK02-01.md):

- **UTV-08:** «anvende relevant testmiljø og utføre testing tilpasset IT-løsningen som utvikles». Eleven prøver sending, omstart, en kontrollert feil før skriving og oppstartsfeil i eget chatprosjekt.
- **UTV-01**, støttemål: «vurdere fordeler og ulemper ved ulike programmeringsspråk og velge og anvende relevante programmeringsspråk og algoritmer i eget arbeid». Her anvendes JavaScript og en lagringsrekkefølge. Sammenligning og valg mellom språk dekkes ikke.

UTV-numrene er lokale referanser. Kjerneelementet utviklingsprosesser og kreativ problemløsing konkretiseres gjennom å teste og forbedre samme kode. Grunnleggende lesing og skriving inngår gjennom kodeforståelse og kodeendring.

Forkunnskaper: Fillagring, fungerende GET/POST, meldingsliste, filsti, objekter, lister og funksjoner. Import, filsti, opprettelse av listen og rutene beholdes fra elevens prosjekt; siden sier hva som erstattes. Ny melding er allerede laget og kontrollert i POST. Eksemplene er utdrag, ikke en komplett Express-server.

Vanlige misforståelser: stringify skriver filen; catch angrer push; omstart bevarer minnet; ødelagt og manglende fil kan alltid behandles likt.

## Arbeid og respons

| Del | Eksempel og elevhandling | Forventet resultat å undersøke |
| --- | --- | --- |
| 1. Lagre | Funksjon som gjør listen til tekst og skriver den. Eleven kaller funksjonen i POST og sender egne meldinger. | Meldingene finnes i JSON-filen. |
| 2. Omstart | Les tekst og bruk JSON.parse. Eleven stopper og starter backend. | GET viser samme lagrede meldinger. |
| 3. Feil | try/catch rundt POST. Eleven legger en midlertidig throw først i lagringsfunksjonen. | 500, men push har allerede endret minnet. Filen er urørt fordi feilen kom før skriving. |
| 4. Endre rekkefølge | Lag nyListe, lagre og bytt minnet etterpå. Eleven starter fra filen og prøver feil og normal sending. | Testfeilen gir ingen ny melding i GET eller fil; uten testlinjen virker lagring og omstart. |
| 5. Oppstart | Lesefunksjon med egen håndtering av ENOENT. Eleven prøver manglende og ødelagt fil. | Bare manglende fil gir []; ødelagt fil bevares og oppstarten stopper. |

Forventningene står ved prøv-selv-oppgavene. De er ikke observerte resultater. Læreren følger opp forskjellen mellom forventning og faktisk GET, HTTP-status og filinnhold. Ved behov kan eleven gå tilbake til eksemplet, bruke Labpartner eller be om hjelp. Ingen obligatorisk spørsmålsrekke eller poengtrekk.

Fem deler er en innholdsrekkefølge, ikke registrert progresjon. Aktivitets-ID, fagsjekk og XP-regler beholdes. Klikk på kopier eller nedlasting registreres ikke som forsøk eller forståelse. Den generelle tilbakemeldingsmuligheten består; siden lager ikke automatiske invitasjoner basert på påståtte lokale kjøringer.

## Avgrensninger og læreroppfølging

Direkte writeFileSync viderefører det enkle grunnprinsippet fra Fillagring. Midlertidig fil og rename er tatt ut av denne siden. Testfeilen utløses før skriving; den viser betydningen av rekkefølge, ikke beskyttelse mot delvis filskriving, strømbrudd eller alle diskfeil. Oppsettet er for små datamengder og én backendprosess. Filbytte, backup og mer robust lagring må behandles videre når det er relevant.

La eleven vise en normal test og en feiltest, og forklare forskjellen mellom push og nyListe. Funksjon og begrunnelse teller; alternative gyldige løsninger er mulige. Overføring med mindre støtte kan være å lagre en annen liten liste i eget prosjekt og velge egne testtilfeller. Dette kan følges opp i undervisningen uten en ekstra del på siden.

Øving 6–7 er ikke redesignet. Det gamle selvstendige lagre.mjs-eksemplet tilbys som en liten nedlastingslenke nederst, fordi øving 6s separate Node-eksempel bruker filen det lager. Det er ikke del av chatprosjektets fem steg.

## Teknisk kontroll og utprøving

`storageExercise.js` eier eksempler og prøveoppgaver. `StorageExercise.svelte` viser dem i leserekkefølge med kopiering, tastaturtilgjengelige kodefelt og felles temastiler. Den tidligere simulatorens tilstand og kjøringsmodell er fjernet.

Labpartner bruker `storage-guide`, adapterversjon 1, med en tom og streng values-kontrakt. Serveren deler bare sidens offentlige eksempler og oppgaver. Den vet ikke hvilken del eleven leser eller hva som er kjørt på elevens maskin. Gamle simulatorpayloads avvises. Praksislenker, lærerhjelp og syntetiske KI-prøver bruker den nye arbeidsformen.

Kildekode og diff gjennomgås på dev. Eksisterende tester er tilpasset de faktiske viste kodeutdragene: lagring/omstart, kontrollert feil før skriving, reparert rekkefølge, manglende/ødelagt fil, avgrenset KI-kontekst og nedlastingen til øving 6. Testene er ikke kjørt i denne dev-leveransen. Samlet testsuite, Svelte-sjekk, bygg og relevant nettleserprøving gjenstår før main etter AGENTS.md. Svelte MCP er ikke tilgjengelig; eksisterende offisiell Svelte-referanse og prosjektets mønstre brukes.

Før main: prøv alle delene i et chatprosjekt og kontroller kodeplassering, kopiering/reservevei, nedlasting, ankerlenker, Labpartner/Vis meg hvor, tastatur, mobil, zoom og begge temaer. I undervisningen undersøkes om eleven lettere finner neste handling og kan forklare og bruke koden. Det er ikke dokumentert læringseffekt.
