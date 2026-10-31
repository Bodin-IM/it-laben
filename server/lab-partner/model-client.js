import { partnerError } from './context.js';

export const partnerModelOptions = Object.freeze({ num_ctx: 8192, num_predict: 450, temperature: 0.3 });

async function readAnswer(response, controller) {
	if (!response.ok || !response.body) {
		await response.body?.cancel();
		throw partnerError(
			response.status === 503 ? 503 : 502,
			'PARTNER_UPSTREAM',
			'KI-tjenesten kunne ikke svare. Prøv igjen litt senere, eller bruk oppgavens hint.'
		);
	}
	const reader = response.body.getReader();
	const chunks = [];
	let bytes = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			bytes += value.byteLength;
			if (bytes > 65536) {
				controller.abort();
				throw new Error('Upstream response too large');
			}
			chunks.push(Buffer.from(value));
		}
	} finally {
		reader.releaseLock();
	}
	const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
	const answer = result.message?.content;
	if (
		result.done !== true ||
		result.message?.role !== 'assistant' ||
		typeof answer !== 'string' ||
		!answer.trim() ||
		answer.length > 3000
	)
		throw partnerError(
			502,
			'PARTNER_RESPONSE',
			'Labpartneren ga ikke et brukbart svar. Prøv et kortere spørsmål, eller bruk oppgavens hint.'
		);
	return answer.trim();
}

// Used by the API and the offline evaluation runner: identical settings and response limits.
export async function requestPartnerAnswer(settings, messages, controller) {
	const headers = { 'Content-Type': 'application/json' };
	if (settings.token) headers.Authorization = `Bearer ${settings.token}`;
	const upstream = await fetch(settings.endpoint, {
		method: 'POST',
		redirect: 'error',
		headers,
		signal: controller.signal,
		body: JSON.stringify({
			...(settings.think === undefined ? {} : { think: settings.think }),
			model: settings.model,
			messages,
			stream: false,
			keep_alive: '10m',
			options: partnerModelOptions
		})
	});
	return readAnswer(upstream, controller);
}
