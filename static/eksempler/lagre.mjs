import { readFileSync, writeFileSync } from "node:fs";

const fil = "ovingsdata.json"; // I terminalens mappe
const meldinger = [
  { id: "m1", avsender: "Ada", tekst: "Hei!" },
  { id: "m2", avsender: "Noah", tekst: "Hei!" }
];

// 1. Liste → JSON-tekst → fil
const json = JSON.stringify(meldinger, null, 2);
writeFileSync(fil, json, "utf8");

// 2. Fil → tekst → liste
const filtekst = readFileSync(fil, "utf8");
const lest = JSON.parse(filtekst);
console.log(lest[0].tekst); // Hei!
