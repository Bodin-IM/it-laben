import { resolve } from 'node:path';

export function readConfig(env = process.env) {
	const production = env.NODE_ENV === 'production';
	if (production && !env.APP_ORIGIN)
		throw new Error('APP_ORIGIN må settes til nettstedets HTTPS-adresse.');
	function parseOrigin(value, setting) {
		const url = new URL(value);
		if (url.pathname !== '/' || url.search || url.hash || url.username || url.password)
			throw new Error(`${setting} skal bare inneholde protokoll, vertsnavn og eventuell port.`);
		const local = ['localhost', '127.0.0.1', '[::1]', 'terminal.local'].includes(url.hostname);
		if (url.protocol !== 'https:' && (production || !local || url.protocol !== 'http:'))
			throw new Error('HTTPS er påkrevd. HTTP tillates bare i lokal utvikling.');
		return url;
	}
	const origin = parseOrigin(env.APP_ORIGIN || 'http://localhost:5173', 'APP_ORIGIN');
	const allowedOrigins = new Set([origin.origin]);
	if (env.APP_ORIGIN_ALIASES?.trim()) {
		for (const value of env.APP_ORIGIN_ALIASES.split(',')) {
			const alias = parseOrigin(value.trim(), 'APP_ORIGIN_ALIASES');
			if (alias.protocol !== origin.protocol)
				throw new Error('APP_ORIGIN_ALIASES må bruke samme protokoll som APP_ORIGIN.');
			allowedOrigins.add(alias.origin);
		}
	}
	if (!production && ['localhost', '127.0.0.1'].includes(origin.hostname)) {
		const alternate = new URL(origin);
		alternate.hostname = origin.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
		allowedOrigins.add(alternate.origin);
	}
	const port = Number(env.API_PORT || 3001);
	if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Ugyldig API_PORT.');
	return {
		production,
		origin: origin.origin,
		allowedOrigins,
		secure: origin.protocol === 'https:',
		cookieName: origin.protocol === 'https:' ? '__Host-itlab-session' : 'itlab_dev_session',
		dbPath: resolve(env.ITLAB_DB_PATH || 'data/it-laben.sqlite'),
		port
	};
}
