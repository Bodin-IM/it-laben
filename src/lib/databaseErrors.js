// Fixed messages only: never interpolate driver messages, URI, database names or credentials.
/** @param {{code?:number,name?:string}|null|undefined} error @param {string} stage */
export function databaseFailure(error, stage) {
	if (error?.code === 18) return '[INNLOGGING] Databasen avviste innloggingen. Be læreren kontrollere bruker og innloggingsdatabase. Ikke del .env.';
	if (error?.code === 13) return '[TILGANG] Brukeren mangler tilgang til operasjonen. Be læreren kontrollere rettighetene til øvingsdatabasen.';
	if (error?.code === 11000) return '[DUPLIKAT] En unik verdi er allerede i bruk. Bruk en ny ID for et nytt dokument. Eksisterende data er ikke overskrevet.';
	if (error?.name === 'MongoParseError' || error?.name === 'MongoInvalidArgumentError') return '[OPPSETT] Kontroller formatet på MONGODB_URI i .env sammen med læreren. Ikke del tilkoblingsstrengen.';
	if (stage === 'kobling' || error?.name === 'MongoServerSelectionError' || error?.name === 'MongoNetworkError') return '[KONTAKT] Kunne ikke opprette eller beholde forbindelsen. Kontroller serveradresse, nettverk og om MongoDB kjører. localhost betyr denne maskinen.';
	if (stage === 'data') return '[STARTDATA] Kontroller JSON, felttyper og unike ID-er i utstyr.json. Ingen eksisterende dokumenter er slettet.';
	if (stage === 'lagring') return '[LAGRING] Innsettingen kunne ikke bekreftes. Hent data på nytt for å undersøke hva som finnes før du prøver igjen.';
	return '[LESING] Søket kunne ikke fullføres. Kontroller filteret og databasetilgangen. Dette er forskjellig fra en vellykket kjøring med null treff.';
}

export const connectionCheckCode = `import { MongoClient } from 'mongodb';

const databaseFailure = ${databaseFailure.toString()};

const uri = process.env.MONGODB_URI;
const database = process.env.MONGODB_DATABASE;
if (!uri || !database) {
  console.error('[OPPSETT] Fyll inn MONGODB_URI og MONGODB_DATABASE i .env.');
  process.exit(1);
}
let client;
let stage = 'kobling';
try {
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  stage = 'lesing';
  await client.db(database).collection('utstyr').findOne({});
  console.log('[KLAR] Forbindelsen og lesetilgangen virker. Du kan nå kjøre klargjor.mjs.');
  console.log('Kontrollen endret ingen data. Skrivetilgang prøves først når du legger inn eksempeldata.');
} catch (error) {
  console.error(databaseFailure(error, stage));
  process.exitCode = 1;
} finally {
  await client?.close();
}
`;
