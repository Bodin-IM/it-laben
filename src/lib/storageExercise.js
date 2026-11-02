/** Øving 5: worked examples and small changes in the student's own chat.
 * The page displays code; it does not run or grade the student's project.
 * @typedef {{text:string,code?:string}} StorageTrial
 * @typedef {{id:string,label:string,title:string,placement:string,code:string,explanation:string,trials:StorageTrial[],scenario:string}} StorageStep
 */
export const storageSaveCode = `function lagreMeldinger(liste) {
  const json = JSON.stringify(liste, null, 2);
  writeFileSync(fil, json, "utf8");
}`;
export const storagePostCode = `meldinger.push(nyMelding);
lagreMeldinger(meldinger);
res.status(201).json(nyMelding);`;
export const storageReadCode = `const tekst = readFileSync(fil, "utf8");
let meldinger = JSON.parse(tekst);`;
export const storageTestError = 'throw new Error("Test: skrivingen feiler");';
export const storageCatchCode = `try {
  meldinger.push(nyMelding);
  lagreMeldinger(meldinger);
  res.status(201).json(nyMelding);
} catch (feil) {
  res.status(500).json({ beskjed: "Kunne ikke lagre." });
}`;
export const storageRepairedCode = `try {
  const nyListe = [...meldinger, nyMelding];
  lagreMeldinger(nyListe);
  meldinger = nyListe;
  res.status(201).json(nyMelding);
} catch (feil) {
  res.status(500).json({ beskjed: "Kunne ikke lagre." });
}`;
export const storageSafeReadCode = `function lesMeldinger() {
  try {
    const tekst = readFileSync(fil, "utf8");
    const liste = JSON.parse(tekst);
    if (!Array.isArray(liste)) throw new Error("Forventet en liste");
    return liste;
  } catch (feil) {
    if (feil.code === "ENOENT") return [];
    throw feil;
  }
}

let meldinger = lesMeldinger();`;

/** @type {StorageStep[]} */
export const storageSteps = [
  {
    id: 'lagre', label: 'Lagre', title: 'Lagre listen i en JSON-fil', scenario: 'save',
    placement: 'I server.js: erstatt lagreMeldinger med denne funksjonen. Behold filstien du allerede bruker i variabelen fil.',
    code: storageSaveCode,
    explanation: 'JSON.stringify gjør listen om til tekst. writeFileSync skriver teksten til filen. Funksjonen lagrer hele listen du sender inn; tallet 2 gir lesbart innrykk.',
    trials: [
      { text: 'I POST /meldinger: erstatt den gamle push-linjen, lagringskallet og svaret med dette. Behold koden som lager og kontrollerer nyMelding.', code: storagePostCode },
      { text: 'Start backend og send en melding du kjenner igjen. Åpne meldinger.json og finn teksten. Send en til: begge meldingene skal stå i filen.' }
    ]
  },
  {
    id: 'omstart', label: 'Omstart', title: 'Les meldingene tilbake etter omstart', scenario: 'restart',
    placement: 'Før rutene i server.js: erstatt den gamle innlesingen og opprettelsen av meldinger med disse to linjene. Fjern også if-blokken som oppretter en tom fil. Behold filstien og filen fra del 1.',
    code: storageReadCode,
    explanation: 'readFileSync leser filen som tekst. JSON.parse gjør teksten om til en liste igjen. Serveren får dermed tilbake meldingene som ble lagret før den stoppet.',
    trials: [
      { text: 'Stopp backend med Ctrl+C og start den igjen med node server.js. Hent meldingene med GET. Finn igjen teksten du lagret i del 1.' },
      { text: 'Send en ny melding og gjenta omstarten. Den nye meldingen skal også komme tilbake.' }
    ]
  },
  {
    id: 'skrivefeil', label: 'Skrivefeil', title: 'Prøv en feil før filen skrives', scenario: 'fail',
    placement: 'I POST /meldinger: erstatt de tre linjene fra del 1 med dette. nyMelding er fortsatt laget og kontrollert før denne koden.',
    code: storageCatchCode,
    explanation: 'try/catch lar ruten svare med 500 når lagringen feiler. Men push har allerede endret minnet. Et feilsvar angrer ikke den endringen.',
    trials: [
      { text: 'Legg denne midlertidige testlinjen først inne i lagreMeldinger, før JSON.stringify. Den lager en feil før noe skrives.', code: storageTestError },
      { text: 'Start backend på nytt og send en ny melding. POST skal gi 500. Hent med GET og åpne JSON-filen: meldingen finnes i minnet, men mangler i filen. Behold testlinjen til neste del.' }
    ]
  },
  {
    id: 'endre-koden', label: 'Endre koden', title: 'Lagre før du endrer minnet', scenario: 'fail',
    placement: 'Erstatt try/catch-blokken i POST med denne. Lagringsfunksjonen fra del 1 tar allerede imot en liste.',
    code: storageRepairedCode,
    explanation: 'nyListe er en ny liste med de gamle meldingene og den nye. meldinger endres først når lagringen lykkes. Ved feil går koden til catch og hopper over meldinger = nyListe.',
    trials: [
      { text: 'Behold testlinjen. Start backend på nytt for å lese filen og fjerne den ulagrede meldingen fra del 3. Send en ny melding: du skal få 500, og meldingen skal nå mangle både i GET og i filen.' },
      { text: 'Fjern testlinjen fra lagreMeldinger. Start backend på nytt og send igjen. Nå skal du få 201, og meldingen skal finnes også etter en ny omstart.' }
    ]
  },
  {
    id: 'oppstart', label: 'Oppstart', title: 'Skill en manglende fil fra ødelagt JSON', scenario: 'missing',
    placement: 'Før rutene: erstatt de to leselinjene fra del 2 med funksjonen og oppstartslinjen nedenfor.',
    code: storageSafeReadCode,
    explanation: 'ENOENT betyr at filen mangler, og gir en tom liste. Ødelagt JSON eller noe annet enn en liste stopper oppstarten. Koden skriver aldri en tom liste over en eksisterende fil.',
    trials: [
      { text: 'Stopp backend og gi meldinger.json navnet meldinger.backup.json. Start igjen uten å sende nye meldinger. GET skal nå gi en tom liste: [].' },
      { text: 'Stopp backend og gi filen det opprinnelige navnet tilbake. Fjern den siste ] i filen og start igjen. Oppstarten skal stoppe med en feil, og filen skal være bevart. Sett ] tilbake og prøv på nytt.' }
    ]
  }
];

/** Shared lesson metadata for project help and the existing course registry. */
export const storageTasks = storageSteps.map((step) => ({
  title: step.title, label: step.label,
  instruction: step.trials.map((trial) => trial.text).join(' '),
  observe: step.explanation, hint: step.explanation, answer: step.explanation,
  start: { scenario: step.scenario }
}));
