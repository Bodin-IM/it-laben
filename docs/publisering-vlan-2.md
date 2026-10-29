# Publiseringskontroll: VLAN-lab 2

Dato: 29. oktober 2026. Samlet endring: fem nye oppdrag med ruter og Wi-Fi, serverkontrollert adgang etter VLAN-lab 1, lagring av beståtte oppsett i begge laber og avgrenset labpartnerkontekst. Ingen endring i XP, merker, karaktergrunnlag eller toppliste.

## Utført kontroll

- Full `npm test`: **242 bestått, 0 feil**. Nye modelltester dekker ulike gyldige adresser, mislykkede startoppsett, gateway i begge retninger, direkte trafikk innenfor ett VLAN, hver trunk, PVID, tagg mot ruter/AP, SSID-valg/aktivering, adressekonflikter, manglende ruter og tilsiktet sperre på R1. En ødelagt forbindelse godkjennes ikke som gjesteisolasjon.
- API-prøvene bruker ekte lokal Express/SQLite, sesjon og CSRF. De dekker gjest, kontoavvik, Origin, CSRF, forsøk på å hoppe over lab/oppdrag, klientrapportert `passed`, ugyldig konfigurasjon og endring av ferdig oppsatte enheter. Bestått er varig og gir ingen XP. Gjeninnsending lager ikke flere rader. Åpning av databasen på nytt bevarer status, og sletting av konto fjerner oppsettene.
- `npm run check`: **0 feil og 0 advarsler**. Produksjonsbygg med `npm run build`: **bestått**. Første Svelte-kontroll fant typeannotasjoner og en manglende tabellavslutning; disse ble rettet og berørte kontroller gjentatt.
- Alle **seks oppdrag i lab 1 og fem i lab 2 er løst via grensesnittet** mot lokal backend. Innlogging, låst direkteadresse, sekvensielle oppdrag, serverlagring, omlasting og tilbakekomst er prøvd. En annen innlogget profil forblir låst. Endring etter bestått låser senere oppdrag i den åpne fanen til ny kontroll; tidligere bestått arbeid gjenopprettes etter omlasting.
- Ruterinterfacer opprettet/fjernet, switch-U/E/T og PVID endret, SSID-er aktivert og klienter tilkoblet. Både tillatt kommunikasjon, gateway fra Wi-Fi og sperret gjestetrafikk prøvd. Den røde pakken stopper på R1 ved regelavvisning. Animasjon, pause, videre avspilling, manuelle steg og redusert bevegelse er prøvd. Felles lydknapp gjenbrukes; kontrollavspilling ble observert med nettleserens Web Audio.
- Teknisk lagringsfeil og nytt forsøk bevarer inndata; feil ved lasting viser ingen åpen lab før ny vellykket lesing. Nullstilling/avbryt og gjenhenting av bestått er prøvd. Tastaturens Space/Enter, synlig fokus, PC-/enhetssnarveier og berøring er prøvd. Ny U endrer ikke PVID. Ugyldig VLAN-ID, oppretting og fjerning er prøvd.
- Begge temaer ved **1440, 390 og 320 CSS-piksler**, samt **200 % tekst med økt tekstavstand ved 320 px**. Ingen horisontal siderulling; det todimensjonale kartet og VLAN-tabellen har egne rulleområder. Kartet beholder nødvendig minimumsbredde for å skille portetikettene. Skjermbilder er gjennomgått. Kontrast på mørke primærknapper, rekkefølge på portetiketter ved korte kabler og linjebryting i «Stopp» ble rettet under prøvingen.
- Avgrenset axe-kontroll av labens `main` i begge temaer uten funn etter retting. Dette er ikke en full samsvarserklæring for hele nettstedet. Ingen JavaScript-feil i elevflytene.
- Tre labpartnerspørsmål mot en kontrollert lokal testtjeneste bekrefter serverbygd oppdragsgrunnlag, utelatte elevadresser, utdatert svar etter redigering og tom samtale ved oppdragsbytte. Kontrakttester avviser ukjente felt, enheter og oppdrag. Ingen ekte KI-modell eller elevdata ble brukt.

Full testsuite ble kjørt samlet. Etter påfølgende rettinger av typer, HTML og visning ble bare relevante Svelte-/bygg- og nettleserkontroller gjentatt. Svelte MCP var utilgjengelig; offisiell Svelte-dokumentasjon ble brukt. Detaljert faglig begrunnelse og avgrensning står i [aktivitetens veiledning](vlan-lab-2.md).

## Drift og gjenstående utprøving

Migrasjon `013_network_labs.sql` oppretter én ny tabell ved vanlig backendoppstart. Frontend og backend må oppdateres sammen. Gamle lab 1-forsøk hadde ingen serverhistorikk og kan derfor ikke automatisk åpne lab 2; grensesnittet forklarer at kontrollene må gjennomføres på kontoen.

Testene er kjørt på lokal testinstans med syntetiske kontoer. Skoleserveren er ikke oppdatert eller prøvd her. Etter vanlig utrulling bør læreren kontrollere databaseoppstart og åpne laben fra skolens miljø. Elevutprøving, faktisk lydopplevelse på elevutstyr, lokal KI-kvalitet og praktisk overføring til skolens ruter/AP gjenstår. Bestått funksjonstest dokumenterer ikke forståelse eller læringseffekt.
