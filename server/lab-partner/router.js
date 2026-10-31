import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { buildPartnerMessages, partnerError } from './context.js';
import { requestPartnerAnswer } from './model-client.js';
import { PARTNER_VERSION } from '../../src/lib/labPartner.js';

export function labPartnerRouter({ db, config, authenticated, limits }) {
	const router = Router();
	const active = new Set();
	const settings = config.labPartner;
	router.use(authenticated);
	router.get('/status', (_req, res) =>
		res.json({ enabled: Boolean(settings?.enabled), version: PARTNER_VERSION })
	);
	if (limits)
		router.use(
			'/ask',
			rateLimit({
				windowMs: 60000,
				limit: 8,
				keyGenerator: (req) => req.labUser.id,
				standardHeaders: 'draft-8',
				legacyHeaders: false,
				handler: (_req, res) =>
					res.status(429).json({
						error: {
							code: 'PARTNER_RATE',
							message: 'Du har sendt flere spørsmål på kort tid. Vent litt og prøv igjen.'
						}
					})
			})
		);
	router.post('/ask', async (req, res) => {
		if (req.body.accountId !== req.labUser.id)
			throw partnerError(
				409,
				'PARTNER_ACCOUNT',
				'En annen profil er pålogget. Oppdater siden før du spør.'
			);
		if (!settings?.enabled)
			throw partnerError(
				503,
				'PARTNER_DISABLED',
				'KI-piloten er ikke åpnet ennå. Du kan fortsatt bruke oppgavens hint og forklaringer.'
			);
		const messages = buildPartnerMessages(req.body);
		const account = req.labUser.id;
		if (active.has(account))
			throw partnerError(
				429,
				'PARTNER_ACTIVE',
				'Labpartneren arbeider allerede med et spørsmål fra profilen din.'
			);
		if (active.size >= settings.concurrency)
			throw partnerError(
				503,
				'PARTNER_BUSY',
				'Labpartneren er opptatt med andre elever. Prøv igjen om litt.'
			);
		const controller = new AbortController();
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			controller.abort();
		}, settings.timeoutMs);
		const disconnect = () => {
			if (!res.writableEnded) controller.abort();
		};
		res.on('close', disconnect);
		active.add(account);
		try {
			const answer = await requestPartnerAnswer(settings, messages, controller);
			if (!res.destroyed) res.json({ answer, version: PARTNER_VERSION });
		} catch (error) {
			if (res.destroyed) return;
			if (timedOut)
				throw partnerError(
					504,
					'PARTNER_TIMEOUT',
					'Det tok for lang tid å få svar. Spørsmålet ditt er beholdt, og du kan prøve igjen.'
				);
			if (error.code?.startsWith('PARTNER_')) throw error;
			throw partnerError(
				502,
				'PARTNER_UNAVAILABLE',
				'Kunne ikke kontakte KI-tjenesten. Prøv igjen senere, eller bruk oppgavens hint.'
			);
		} finally {
			clearTimeout(timer);
			res.off('close', disconnect);
			active.delete(account);
		}
	});
	return router;
}
