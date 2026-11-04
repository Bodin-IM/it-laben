import { get } from 'svelte/store';
import { lab } from '#lib/lab.js';

export class TogetherApiError extends Error {
	constructor(message, uncertain = false) { super(message); this.uncertain = uncertain; }
}
/** @param {string} path @param {unknown} [body] @returns {Promise<any>} */
export async function togetherRequest(path, body) {
	const account = get(lab);
	if (!account.user) throw new TogetherApiError('Logg inn i Min lab før du blir med.');
	try {
		const response = await fetch(`/api/vlan-together${path}`, {
			method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
			headers: { 'Content-Type': 'application/json', 'X-Lab-Account': account.user.id, 'X-CSRF-Token': account.csrfToken ?? '' },
			body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000)
		});
		if (get(lab).user?.id !== account.user.id) throw new TogetherApiError('Påloggingen er endret.');
		const value = await response.json();
		if (!response.ok) throw new TogetherApiError(value.error?.message ?? 'Kunne ikke fullføre handlingen.', response.status >= 500);
		return value;
	} catch (error) {
		if (error instanceof TogetherApiError) throw error;
		throw new TogetherApiError('Mistet kontakten med laben. Kontroller tilkoblingen og prøv igjen.', body !== undefined);
	}
}
