import { writable, get } from 'svelte/store';

/** @typedef {{ready:boolean,publicHttp:boolean,httpsOrigin:string,caSha256:string|null,probe:'unknown'|'checking'|'reachable'|'unverified'}} Connection */
/** @type {Connection} */
const initial = {
	ready: false,
	publicHttp: false,
	httpsOrigin: '',
	caSha256: null,
	probe: 'unknown'
};
const state = writable(initial);
export const connection = { subscribe: state.subscribe };
let probeRevision = 0;

/** Local development remains usable with its development-only cookie.
 * @param {{protocol:string,hostname:string}} location */
export function isPublicHttp(location) {
	return (
		location.protocol === 'http:' &&
		!['localhost', '127.0.0.1', '[::1]', 'terminal.local'].includes(location.hostname)
	);
}
export function backendDisabled() {
	return typeof window !== 'undefined' && isPublicHttp(window.location);
}
/** @param {unknown} value @returns {{httpsOrigin:string,caSha256:string|null}} */
export function parseConnectionConfig(value) {
	const config = /** @type {{httpsOrigin?:unknown,caSha256?:unknown}|null} */ (value);
	if (!config || typeof config.httpsOrigin !== 'string') throw new Error('Missing HTTPS origin');
	const url = new URL(config.httpsOrigin);
	if (
		url.protocol !== 'https:' ||
		url.pathname !== '/' ||
		url.search ||
		url.hash ||
		url.username ||
		url.password
	)
		throw new Error('Invalid HTTPS origin');
	const fingerprint =
		typeof config.caSha256 === 'string' ? config.caSha256.replaceAll(':', '').toUpperCase() : null;
	if (fingerprint !== null && !/^[0-9A-F]{64}$/.test(fingerprint))
		throw new Error('Invalid CA fingerprint');
	return { httpsOrigin: url.origin, caSha256: fingerprint };
}
/** Keep the address the visitor can reach, including when local DNS is unavailable.
 * @param {string} configuredOrigin
 * @param {{protocol:string,origin:string,hostname:string}} location */
export function resolveHttpsOrigin(configuredOrigin, location) {
	if (location.protocol === 'https:') return location.origin;
	const url = new URL(parseConnectionConfig({ httpsOrigin: configuredOrigin }).httpsOrigin);
	url.hostname = location.hostname;
	return url.origin;
}
/** @param {string} origin @param {typeof fetch} [request] */
export async function checkHttps(origin, request = fetch) {
	try {
		const { httpsOrigin } = parseConnectionConfig({ httpsOrigin: origin });
		const response = await request(`${httpsOrigin}/tilkobling.json`, {
			mode: 'cors',
			credentials: 'omit',
			cache: 'no-store',
			redirect: 'error',
			signal: AbortSignal.timeout(5000)
		});
		if (!response.ok) return false;
		const result = await response.json();
		return result?.ok === true;
	} catch {
		return false;
	}
}
export async function probeHttps() {
	const origin = get(state).httpsOrigin;
	if (!origin) return;
	const revision = ++probeRevision;
	state.update((value) => ({ ...value, probe: 'checking' }));
	const reachable = await checkHttps(origin);
	if (revision === probeRevision)
		state.update((value) => ({ ...value, probe: reachable ? 'reachable' : 'unverified' }));
}
/** @param {string} origin @param {string} [path] */
export function secureHref(origin, path = '/min-lab/') {
	if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Use an internal path');
	return origin ? origin + path : path;
}
export function initializeConnection() {
	const location = window.location;
	const local = ['localhost', '127.0.0.1', '[::1]', 'terminal.local'].includes(location.hostname);
	state.set({
		...initial,
		ready: true,
		publicHttp: isPublicHttp(location),
		httpsOrigin:
			location.protocol === 'https:'
				? location.origin
				: local
					? ''
					: `https://${location.hostname}`,
		probe: location.protocol === 'https:' ? 'reachable' : 'unknown'
	});
	if (local) return;
	const controller = new AbortController();
	let disposed = false;
	void (async () => {
		try {
			const response = await fetch('/itlab-config.json', {
				credentials: 'omit',
				cache: 'no-store',
				signal: AbortSignal.any([controller.signal, AbortSignal.timeout(3000)])
			});
			if (response.ok) {
				const config = parseConnectionConfig(await response.json());
				if (!disposed)
					state.update((value) => ({
						...value,
						...config,
						httpsOrigin: resolveHttpsOrigin(config.httpsOrigin, location)
					}));
			}
		} catch {
			/* Older installations can still browse; no login API is contacted over HTTP. */
		}
		if (!disposed && isPublicHttp(location)) void probeHttps();
	})();
	return () => {
		disposed = true;
		probeRevision++;
		controller.abort();
	};
}
