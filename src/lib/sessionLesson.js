/** @typedef {'profiler'|'cookie'|'utlopt'} Forsok */
export const trinnene = [
	{
		navn: 'Før innlogging',
		sporsmal: 'Vet serveren hvem du er?',
		start: 'Ingen er logget inn. Nettleseren har ingen cookie, og sessionlageret er tomt.',
		handling: 'Spør hvem jeg er',
		hint: 'Send GET /meg og se om serveren finner en bruker.'
	},
	{
		navn: 'Logg inn',
		sporsmal: 'Hva må lagres for å kjenne deg igjen?',
		start: 'Vi starter uten cookie og session. I øvelsen bruker vi visningsnavnet Ada.',
		handling: 'Logg inn som Ada',
		hint: 'Se etter samme ID i nettleseren og på serveren.'
	},
	{
		navn: 'Spør igjen',
		sporsmal: 'Hvordan finner serveren navnet ditt?',
		start:
			'Dette eksemplet starter med Ada innlogget: en cookie og en tilhørende session er lagt inn.',
		handling: 'Spør hvem jeg er',
		hint: 'Nettleseren sender ID-en. Serveren må slå den opp på nytt.'
	},
	{
		navn: 'Logg ut',
		sporsmal: 'Hvem er du etter utlogging?',
		start:
			'Dette eksemplet starter med Ada innlogget. Handlingen logger ut og sender så en ny GET /meg.',
		handling: 'Logg ut og spør på nytt',
		hint: 'Følg både cookien og sessionen når innloggingen avsluttes.'
	}
];
export const forsokene = [
	{
		id: /** @type {Forsok} */ ('profiler'),
		navn: 'To profiler',
		sporsmal: 'Samme backend. Hvem får svar?',
		start: 'Ada er allerede logget inn i profil A, og Noah i profil B. De har hver sin cookie.',
		handling: 'Spør hvem jeg er',
		hint: 'Velg en profil og spør. Bare ID-en fra den valgte profilen sendes.'
	},
	{
		id: /** @type {Forsok} */ ('cookie'),
		navn: 'Cookie sendes ikke',
		sporsmal: 'Hvorfor får Ada 401 selv om sessionen finnes?',
		start: 'Ada har en cookie, og serveren har sessionen. Første forsøk sender ikke cookien.',
		handling: 'Spør hvem jeg er',
		hint: 'Prøv uten cookie. Slå deretter på bryteren og spør igjen.'
	},
	{
		id: /** @type {Forsok} */ ('utlopt'),
		navn: 'Session utløper',
		sporsmal: 'Er en cookie nok til å være innlogget?',
		start:
			'Ada er innlogget. Handlingen lar sessionen utløpe, beholder cookien og spør så backend.',
		handling: 'La sessionen utløpe og spør',
		hint: 'Se hva som skjer når ID-en fortsatt finnes i nettleseren, men ikke på serveren.'
	}
];

// Denne kilden er identisk før og etter innlogging, og i de ekstra /meg-forsøkene.
export const megBackend = [
	'app.get("/meg", (req, res) => {',
	'  const bruker = req.session.bruker;',
	'  if (!bruker) {',
	'    return res.status(401).json({ beskjed: "Du er ikke logget inn." });',
	'  }',
	'  res.json({ bruker });',
	'});'
];
export const innloggingBackend = [
	'req.session.regenerate((feil) => {',
	'  if (feil) return next(feil);',
	'  req.session.bruker = { id: bruker.id, navn: bruker.navn };',
	'  req.session.save((feil) => {',
	'    if (feil) return next(feil);',
	'    res.json({ bruker: req.session.bruker });',
	'  });',
	'});'
];
export const utloggingBackend = [
	'app.post("/loggut", (req, res, next) => {',
	'  req.session.destroy((feil) => {',
	'    if (feil) return next(feil);',
	'    res.clearCookie("itlab.sid", cookieOptions);',
	'    res.sendStatus(204);',
	'  });',
	'});'
];
export const utloggingFrontend = [
	'async function loggUtOgSpor() {',
	'  const ut = await fetch(API + "/loggut", {',
	'    method: "POST", credentials: "include"',
	'  });',
	'  if (!ut.ok) throw new Error("Utlogging feilet");',
	'  // 204 har ingen JSON-body.',
	'  const meg = await fetch(API + "/meg", {',
	'    credentials: "include"',
	'  });',
	'  if (meg.status === 401) return null;',
	'  if (!meg.ok) throw new Error("Kunne ikke hente bruker");',
	'  return (await meg.json()).bruker;',
	'}'
];

export const kodebiter = [
	{
		id: 'oppsett',
		navn: '1. Oppsett',
		sted: 'EXPRESS-BACKEND',
		tittel: 'La middleware håndtere sessionen.',
		intro:
			'Installer express-session og cors i elevens Express-backend. Legg dette før rutene som bruker req.session.',
		kode: [
			'import express from "express";',
			'import session from "express-session";',
			'import cors from "cors";',
			'',
			'const app = express();',
			'const secret = process.env.SESSION_SECRET;',
			'if (!secret) throw new Error("SESSION_SECRET mangler");',
			'',
			'app.use(cors({',
			'  origin: "http://localhost:5173",',
			'  credentials: true',
			'}));',
			'app.use(express.json());',
			'',
			'const cookieOptions = {',
			'  path: "/",',
			'  httpOnly: true,',
			'  sameSite: "lax",',
			'  secure: false // Bare i den lokale HTTP-laben.',
			'};',
			'app.use(session({',
			'  name: "itlab.sid", secret,',
			'  resave: false,',
			'  saveUninitialized: false,',
			'  cookie: { ...cookieOptions, maxAge: 30 * 60 * 1000 }',
			'}));',
			'',
			'// Legg rutene her.',
			'app.listen(3000);'
		].join('\n'),
		forklaring:
			'saveUninitialized: false hindrer lagring av nye, uendrede sessioner. resave: false unngår unødvendig lagring. HttpOnly hindrer JavaScript i å lese cookien; nettleseren kan fortsatt sende den.'
	},
	{
		id: 'innlogging',
		navn: '2. Innlogging',
		sted: 'INNE I POST /logginn',
		tittel: 'Lagre en bruker som faktisk er kontrollert.',
		intro:
			'Dette er et utdrag etter vellykket autentisering. bruker må komme fra en reell identitetskontroll. Et navn fra req.body er ikke nok.',
		kode: [
			'// Inne i ruten med (req, res, next).',
			'// bruker er allerede autentisert.',
			'req.session.regenerate((feil) => {',
			'  if (feil) return next(feil);',
			'  req.session.bruker = {',
			'    id: bruker.id,',
			'    navn: bruker.navn',
			'  };',
			'  req.session.save((feil) => {',
			'    if (feil) return next(feil);',
			'    res.json({ bruker: req.session.bruker });',
			'  });',
			'});'
		].join('\n'),
		forklaring:
			'regenerate gir en ny session-ID etter innlogging. Lagre brukerdata før svaret sendes. Passord skal ikke lagres i sessionen.'
	},
	{
		id: 'ruter',
		navn: '3. /meg og utlogging',
		sted: 'EXPRESS-BACKEND',
		tittel: 'Sjekk sessionen ved hver beskyttet request.',
		intro:
			'Middleware slår opp sessionen før ruten kjører. Ruten avgjør om den gir tilgang. cookieOptions er de samme innstillingene som i oppsettet.',
		kode: [
			'app.get("/meg", (req, res) => {',
			'  if (!req.session.bruker) {',
			'    return res.status(401).json({',
			'      beskjed: "Du er ikke logget inn."',
			'    });',
			'  }',
			'  res.json({ bruker: req.session.bruker });',
			'});',
			'',
			'app.post("/loggut", (req, res, next) => {',
			'  req.session.destroy((feil) => {',
			'    if (feil) return next(feil);',
			'    res.clearCookie("itlab.sid", cookieOptions);',
			'    res.sendStatus(204);',
			'  });',
			'});'
		].join('\n'),
		forklaring:
			'destroy fjerner sessionen. clearCookie må bruke samme cookienavn, path og eventuell domain, uten maxAge/expires. I en chat hentes avsender fra req.session.bruker etter kontroll, ikke fra req.body.avsender.'
	},
	{
		id: 'fetch',
		navn: '4. Fetch',
		sted: 'SVELTE-FRONTEND',
		tittel: 'Send cookien med forespørselen.',
		intro:
			'Utdrag til egne hendelsesfunksjoner. Bruk credentials: "include" ved innlogging, henting og utlogging når frontend og backend har ulike origins.',
		kode: [
			'const API = "http://localhost:3000";',
			'',
			'// I deres innloggingsfunksjon:',
			'const svar = await fetch(API + "/logginn", {',
			'  method: "POST",',
			'  credentials: "include",',
			'  headers: { "Content-Type": "application/json" },',
			'  body: JSON.stringify({ brukernavn, passord })',
			'});',
			'if (!svar.ok) throw new Error("Innlogging mislyktes");',
			'',
			'async function hentMeg() {',
			'  const svar = await fetch(API + "/meg", {',
			'    credentials: "include"',
			'  });',
			'  if (svar.status === 401) return null;',
			'  if (!svar.ok) throw new Error("Kunne ikke hente bruker");',
			'  return (await svar.json()).bruker;',
			'}',
			'',
			'async function loggUt() {',
			'  const svar = await fetch(API + "/loggut", {',
			'    method: "POST", credentials: "include"',
			'  });',
			'  if (!svar.ok) throw new Error("Utlogging mislyktes");',
			'  // 204 har ingen JSON-body.',
			'}'
		].join('\n'),
		forklaring:
			'Nettleseren setter Cookie-headeren og tar imot Set-Cookie. Frontend gjør ikke dette selv. Kall funksjonene fra hendelser, fang feil og oppdater Svelte-state med svaret.'
	}
];
