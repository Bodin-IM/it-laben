import { resolve } from 'node:path';

export function readConfig(env = process.env) {
	const production = env.NODE_ENV === 'production';
	if (production && !env.APP_ORIGIN)
		throw new Error('APP_ORIGIN må settes til nettstedets HTTPS-adresse.');
	const origin = new URL(env.APP_ORIGIN || 'http://localhost:5173');
	if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password)
		throw new Error('APP_ORIGIN skal bare inneholde protokoll, vertsnavn og eventuell port.');
	const local = ['localhost', '127.0.0.1', '[::1]', 'terminal.local'].includes(origin.hostname);
	if (origin.protocol !== 'https:' && (production || !local || origin.protocol !== 'http:'))
		throw new Error('HTTPS er påkrevd. HTTP tillates bare i lokal utvikling.');
	const allowedOrigins = new Set([origin.origin]);
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
