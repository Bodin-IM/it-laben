// Public protocol only. The teaching instructions and context builder stay on the server.
export const PARTNER_VERSION = 1;
export const PARTNER_ACTIVITY = 'redd-chatten';
export const PARTNER_EVENT_LIMIT = 10;

/** @typedef {{type:'code-changed'|'case-selected'|'test-started'|'test-completed'|'test-cancelled'|'hint-opened'|'line-explained'|'trace-inspected'|'walkthrough-started'|'walkthrough-stepped'|'reset', caseId?:string, index?:number, lineId?:string, before?:string[], after?:string[]}} PartnerEvent */
/** @typedef {{version:number, activityId:'redd-chatten', missionId:string, program:string[], caseId:string, lastRun:{program:string[], caseId:string|null}|null, inspection:{kind:'trace'|'walkthrough', index:number}|null, running:boolean, events:PartnerEvent[]}} RepairPartnerSnapshot */
/** @typedef {{version:1,activityId:'page-help',pageId:string,running:false,events:[]}} PagePartnerSnapshot */
/** @typedef {RepairPartnerSnapshot|PagePartnerSnapshot} PartnerSnapshot */
/** @typedef {{question:string, answer:string, snapshotKey:string}} PartnerTurn */

/** A response belongs to this exact work/view, not to a later code edit or test.
 * @param {PartnerSnapshot} snapshot */
export function partnerSnapshotKey(snapshot) {
	const { events: _events, ...work } = snapshot;
	return JSON.stringify(work);
}

/** @param {PartnerEvent[]} events @param {PartnerEvent} event */
export function appendPartnerEvent(events, event) {
	return [...events, event].slice(-PARTNER_EVENT_LIMIT);
}

/** @param {string} path @param {string} csrf @param {AbortSignal} signal @param {unknown} [body] */
export async function partnerRequest(path, csrf, signal, body) {
	const response = await fetch(`/api/lab-partner/${path}`, {
		method: body === undefined ? 'GET' : 'POST',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
		body: body === undefined ? undefined : JSON.stringify(body),
		signal
	});
	let result;
	try {
		result = await response.json();
	} catch {
		throw new Error(
			'KI-tjenesten ga ikke et lesbart svar. Spørsmålet er beholdt. Prøv igjen senere.'
		);
	}
	if (!response.ok) throw new Error(result.error?.message || 'Labpartneren kunne ikke svare nå.');
	return result;
}
