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
		labPartner: readPartnerConfig(env),
		production,
		origin: origin.origin,
		allowedOrigins,
		secure: origin.protocol === 'https:',
		cookieName: origin.protocol === 'https:' ? '__Host-itlab-session' : 'itlab_dev_session',
		dbPath: resolve(env.ITLAB_DB_PATH || 'data/it-laben.sqlite'),
		port
	};
}

export function readPartnerConfig(env = process.env) {
	const model = env.LAB_PARTNER_MODEL?.trim() || '';
	const endpoint = new URL(env.LAB_PARTNER_OLLAMA_URL || 'http://127.0.0.1:11434/api/chat');
	if (
		!['http:', 'https:'].includes(endpoint.protocol) ||
		endpoint.username ||
		endpoint.password ||
		endpoint.hash ||
		endpoint.search
	)
		throw new Error(
			'LAB_PARTNER_OLLAMA_URL må være en HTTP(S)-adresse uten innloggingsdata, spørring eller fragment.'
		);
	if (model.length > 120 || /\s|(?:^|[:/-])cloud(?:$|[:/.-])/i.test(model))
		throw new Error('LAB_PARTNER_MODEL skal være navnet på en lokal Ollama-modell.');
	if (env.LAB_PARTNER_THINK && !['true', 'false'].includes(env.LAB_PARTNER_THINK))
		throw new Error('LAB_PARTNER_THINK må være true, false eller tom.');
	function number(name, fallback, min, max) {
		const value = Number(env[name] || fallback);
		if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Ugyldig ${name}.`);
		return value;
	}
	return {
		think: env.LAB_PARTNER_THINK ? env.LAB_PARTNER_THINK === 'true' : undefined,
		enabled: Boolean(model),
		model,
		endpoint: endpoint.href,
		token: env.LAB_PARTNER_API_TOKEN || '',
		timeoutMs: number('LAB_PARTNER_TIMEOUT_MS', 45000, 1000, 120000),
		concurrency: number('LAB_PARTNER_CONCURRENCY', 2, 1, 4)
	};
}
