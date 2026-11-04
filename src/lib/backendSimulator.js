/** Shared teaching content. No account details or live room data. */
export const simulatorRoles = [
	{ id: 'utstyr', title: 'Utstyrsansvarlig', symbol: '▤', path: '/utstyr', need: 'Hent antall påmeldte fra en annen server.', data: { pcLedige: 8, skjermerLedige: 6 } },
	{ id: 'program', title: 'Programansvarlig', symbol: '◷', path: '/program', need: 'Hent antall ledige PC-er fra utstyrsansvarlig.', data: { aktivitet: 'Spillturnering', start: '18:00', pcBehov: 4 } },
	{ id: 'pamelding', title: 'Påmeldingsansvarlig', symbol: '◎', path: '/pameldinger', need: 'Hent aktiviteten fra programansvarlig.', data: { antall: 6, kapasitet: 12 } },
	{ id: 'kiosk', title: 'Kioskansvarlig', symbol: '◇', path: '/meny', need: 'Hent antall påmeldte og planlegg mat til dem.', data: { vare: 'Pizza', pris: 35, porsjoner: 12 } }
];

export const simulatorActivity = {
	id: 'backend-simulator', tittel: 'Backend sammen',
	beskrivelse: 'Bygg API-er til en LAN-kveld. Hent data fra medelever og følg forespørslene på et felles brett.',
	href: '/spill/backend-simulator/', fag: 'utvikling', audience: 'student', format: 'spill',
	type: 'Flerspiller · første utkast', emner: ['GET / POST', 'JSON', 'Frontend', 'Backend'],
	sokeord: ['simulator', 'samarbeid', 'API', 'endepunkter', 'fetch', 'LAN'], symbol: '↔'
};

/** @param {string} id */
export const simulatorRole = (id) => simulatorRoles.find((role) => role.id === id);

/** @param {string} path @param {string} json */
export function simulatorGetCode(path, json) {
	return `app.get(${JSON.stringify(path)}, (req, res) => {\n  res.json(${json.split('\n').join('\n  ')});\n});`;
}

/** @param {string} url @param {string} method @param {string} body */
export function simulatorFetchCode(url, method, body) {
	const options = method === 'POST'
		? `, {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(${body})\n}` : '';
	return `const svar = await fetch(${JSON.stringify(url || '/velg-en-server')}${options});\nconst data = await svar.json();\nconsole.log(svar.status, data);`;
}

/** @typedef {{id:string,method:string,path:string,from:string,to:string,status:number,at:number,body:Record<string,unknown>|null,response:Record<string,unknown>}} SimulatorEvent */
/** @typedef {{source:string,field:string,value:string|number|boolean|null,at:number}} SimulatorDisplay */
/** @typedef {{id:string,name:string,role:string,online:boolean,getPath:string|null,postPath:string|null,revision:number,data?:Record<string,unknown>,display:SimulatorDisplay|null,published:boolean,fetched:boolean,shown:boolean,posted:boolean}} SimulatorPlayer */
/** @typedef {{id:string,code:string,title:string,paused:boolean,owner:boolean,me:string,players:SimulatorPlayer[],events:SimulatorEvent[]}} SimulatorRoom */
