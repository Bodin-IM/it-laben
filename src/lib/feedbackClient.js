import { get } from 'svelte/store';
import { lab, ApiError } from '#lib/lab.js';
import { backendDisabled } from '#lib/connection.js';

/** @param {string} path @param {Record<string,unknown>} [body] @param {AbortSignal} [signal] */
export async function feedbackRequest(path, body, signal) {
	if (backendDisabled())
		throw new ApiError(
			'Åpne den sikre HTTPS-adressen for å sende tilbakemeldinger.',
			426,
			'HTTPS_REQUIRED'
		);
	const account = get(lab);
	const accountId = account.user?.id ?? null;
	const headers = {
		Accept: 'application/json',
		...(body ? { 'Content-Type': 'application/json' } : {}),
		...(body && account.csrfToken ? { 'X-CSRF-Token': account.csrfToken } : {})
	};
	let response;
	try {
		response = await fetch(`/api${path}`, {
			method: body ? 'POST' : 'GET',
			credentials: 'same-origin',
			cache: 'no-store',
			headers,
			body: body ? JSON.stringify({ ...body, accountId }) : undefined,
			signal: signal
				? AbortSignal.any([signal, AbortSignal.timeout(12000)])
				: AbortSignal.timeout(12000)
		});
	} catch {
		throw new ApiError(
			body
				? 'Kunne ikke bekrefte lagringen. Prøv igjen når forbindelsen er tilbake.'
				: 'Kunne ikke hente tilbakemeldingene. Prøv igjen når forbindelsen er tilbake.',
			0,
			'OFFLINE'
		);
	}
	if (accountId !== (get(lab).user?.id ?? null))
		throw new ApiError(
			'Påloggingen er endret. Last siden på nytt før du sender.',
			409,
			'ACCOUNT_CHANGED'
		);
	let result;
	try {
		result = await response.json();
	} catch {
		throw new ApiError(
			'Tilbakemeldinger er ikke tilgjengelig akkurat nå. Prøv igjen.',
			response.status,
			'UNAVAILABLE'
		);
	}
	if (!response.ok)
		throw new ApiError(
			result.error?.message || 'Kunne ikke fullføre forespørselen. Prøv igjen.',
			response.status,
			result.error?.code || 'FEEDBACK_ERROR'
		);
	return result;
}
