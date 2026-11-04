import { get } from 'svelte/store';
import { lab } from '#lib/lab.js';

/**
 * Transport headers stay separate from the student's JSON. All calls are same-origin.
 * @param {string} path
 * @param {{method?:string,body?:unknown,requestId?:string}} [options]
 */
async function request(path, { method = 'GET', body, requestId } = {}) {
	const account = get(lab);
	if (!account.user) throw new Error('Logg inn i Min lab før du blir med.');
	/** @type {Record<string,string>} */
	const headers = { 'X-Lab-Account': account.user.id };
	if (method !== 'GET') {
		headers['Content-Type'] = 'application/json';
		headers['X-CSRF-Token'] = account.csrfToken ?? '';
	}
	if (requestId) headers['X-Simulator-Request'] = requestId;
	const response = await fetch(`/api/simulator${path}`, {
		method, headers, credentials: 'same-origin', cache: 'no-store',
		body: method === 'GET' ? undefined : JSON.stringify(body),
		signal: AbortSignal.timeout(10000)
	});
	if (get(lab).user?.id !== account.user.id) throw new Error('Påloggingen er endret.');
	const data = await response.json();
	const eventId = response.headers.get('X-Simulator-Event');
	if (!response.ok && !eventId) throw new Error(data.error?.message ?? 'Kunne ikke nå rommet. Prøv igjen.');
	return { status: response.status, data, eventId };
}

/** @param {string} path @param {unknown} [body] @returns {Promise<any>} */
export async function simulatorRequest(path, body) {
	return (await request(path, { method: body === undefined ? 'GET' : 'POST', body })).data;
}

/** @param {string} roomId @param {string} serverId @param {string} path */
export function simulatorAddress(roomId, serverId, path) {
	// Keep requests inside the selected virtual server, including erroneous endpoint paths.
	if (!/^\/[a-z0-9/-]{0,80}$/.test(path)) throw new Error('Bruk en adresse som starter med / og inneholder små bokstaver, tall eller bindestrek.');
	return `/rooms/${encodeURIComponent(roomId)}/servers/${encodeURIComponent(serverId)}${path}`;
}

/** @param {string} path @param {string} method @param {unknown} body @param {string} requestId */
export const simulatorExchange = (path, method, body, requestId) => request(path, { method, body, requestId });
