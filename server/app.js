import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { randomBytes, randomUUID, randomInt, createHash, timingSafeEqual } from 'node:crypto';
import { transaction } from './database.js';
import { summary, submit, reconcileAchievements } from './progress.js';
import { labColors } from '../src/lib/progression.js';
import { catalog } from './catalog.js';
import { openCheckpoint } from './checkpoints.js';

const DAY = 86400000;
const hash = (value) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } });
const matches = (a, b) =>
	typeof a === 'string' &&
	typeof b === 'string' &&
	Buffer.byteLength(a) === Buffer.byteLength(b) &&
	timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function createApp({ db, config, clock = Date.now, limits = true }) {
	reconcileAchievements(db, clock());
	const app = express();
	app.disable('x-powered-by');
	app.set('trust proxy', 'loopback');
	app.use(helmet());
	app.use((req, res, next) => {
		res.set('Cache-Control', 'no-store');
		res.set('Vary', 'Cookie');
		if (config.secure && !req.secure)
			return fail(res, 400, 'HTTPS_REQUIRED', 'Bruk nettstedets HTTPS-adresse.');
		next();
	});
	app.use(express.json({ limit: '8kb', strict: true }));
	app.use(cookieParser());
	app.get('/api/health', (_req, res) => {
		db.prepare('SELECT 1').get();
		res.json({ ok: true });
	});

	app.use('/api', (req, res, next) => {
		if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
			if (!config.allowedOrigins.has(req.get('origin')))
				return fail(res, 403, 'ORIGIN', 'Forespørselen kommer ikke fra IT-laben.');
			if (!req.is('application/json'))
				return fail(res, 415, 'CONTENT_TYPE', 'Bruk JSON ved innsending.');
			if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
				return fail(res, 400, 'INVALID_INPUT', 'Innsendingen må være et JSON-objekt.');
		}
		const raw = req.cookies[config.cookieName];
		if (typeof raw === 'string' && /^[A-Za-z0-9_-]{43}$/.test(raw)) {
			const session = db.prepare('SELECT * FROM sessions WHERE hash=?').get(hash(raw));
			if (session) {
				const now = clock(),
					idle = session.remembered ? 30 * DAY : 30 * 60000;
				if (session.expires_at <= now || session.last_seen_at + idle <= now)
					db.prepare('DELETE FROM sessions WHERE hash=?').run(session.hash);
				else {
					req.labSession = session;
					req.labUser = db
						.prepare('SELECT id,nickname,created_at AS createdAt FROM users WHERE id=?')
						.get(session.user_id);
					if (now - session.last_seen_at > 60000)
						db.prepare('UPDATE sessions SET last_seen_at=? WHERE hash=?').run(now, session.hash);
				}
			}
		}
		if (
			req.labSession &&
			!['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
			!matches(req.get('x-csrf-token'), req.labSession.csrf)
		)
			return fail(res, 403, 'CSRF', 'Påloggingen er endret. Oppdater siden og prøv igjen.');
		next();
	});

	const limit = (windowMs, max) =>
		rateLimit({
			windowMs,
			limit: max,
			standardHeaders: 'draft-8',
			legacyHeaders: false,
			handler: (_req, res) =>
				fail(
					res,
					429,
					'RATE_LIMIT',
					'Mange forespørsler akkurat nå. Vent litt før du prøver igjen.'
				)
		});
	if (limits) {
		app.use('/api/auth/create', limit(60 * 60000, 200));
		app.use('/api/auth/key', limit(15 * 60000, 120));
		app.use('/api/progress', limit(60000, 600));
		app.use('/api/checkpoints', limit(60000, 600));
	}
	const authenticated = (req, res, next) => {
		if (!req.labUser) return fail(res, 401, 'LOGIN_REQUIRED', 'Logg inn for å lagre fremgangen.');
		next();
	};
	const cookieOptions = { httpOnly: true, secure: config.secure, sameSite: 'lax', path: '/' };
	function newSession(userId, remember) {
		const raw = token(),
			now = clock(),
			expires = now + (remember ? 180 * DAY : 8 * 3600000);
		const session = {
			hash: hash(raw),
			user_id: userId,
			csrf: token(),
			created_at: now,
			last_seen_at: now,
			expires_at: expires,
			remembered: remember ? 1 : 0
		};
		db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?,?)').run(
			session.hash,
			userId,
			session.csrf,
			now,
			now,
			expires,
			session.remembered
		);
		return { ...session, token: raw };
	}
	function setSessionCookie(res, session) {
		res.cookie(config.cookieName, session.token, {
			...cookieOptions,
			maxAge: session.expires_at - clock()
		});
	}
	function keyFile(userId) {
		const key = `itlab_${token()}`,
			now = clock();
		db.prepare('INSERT INTO recovery_keys VALUES (?,?,?)').run(hash(key), userId, now);
		return {
			format: 'it-laben-key',
			version: 1,
			key,
			createdAt: new Date(now).toISOString(),
			site: config.origin
		};
	}
	function me(user, session) {
		return {
			user,
			csrfToken: session.csrf,
			summary: summary(db, user.id, clock()),
			development: !config.secure
		};
	}
	function nickname(value) {
		if (value === undefined || value === '') {
			const animals = ['Oter', 'Rev', 'Ugle', 'Gaupe', 'Panda', 'Hauk'];
			return `Lur ${animals[randomInt(animals.length)]} ${randomInt(100, 1000)}`;
		}
		if (
			typeof value !== 'string' ||
			value.trim().length < 2 ||
			value.trim().length > 24 ||
			/[\p{Cc}\p{Cf}]/u.test(value)
		)
			throw new TypeError('Kallenavnet må ha mellom 2 og 24 tegn.');
		return value.trim();
	}

	app.get('/api/me', (req, res) => {
		if (!req.labUser)
			return res.json({ user: null, csrfToken: null, summary: null, development: !config.secure });
		res.json(me(req.labUser, req.labSession));
	});
	app.post('/api/auth/create', (req, res) => {
		if (req.labUser)
			return fail(
				res,
				409,
				'ALREADY_LOGGED_IN',
				'Du har allerede en profil. Logg ut før du lager en ny.'
			);
		if (req.body.remember !== undefined && typeof req.body.remember !== 'boolean')
			return fail(res, 400, 'INVALID_INPUT', 'Ugyldig valg av husket pålogging.');
		const user = { id: randomUUID(), nickname: nickname(req.body.nickname), createdAt: clock() };
		const result = transaction(db, () => {
			db.prepare('DELETE FROM sessions WHERE expires_at<?').run(clock());
			db.prepare('INSERT INTO users VALUES (?,?,?)').run(user.id, user.nickname, user.createdAt);
			const recovery = keyFile(user.id),
				session = newSession(user.id, req.body.remember !== false);
			return { payload: { ...me(user, session), recoveryKey: recovery }, session };
		});
		setSessionCookie(res, result.session);
		res.status(201).json(result.payload);
	});
	app.post('/api/auth/key', (req, res) => {
		if (req.labUser) return fail(res, 409, 'ALREADY_LOGGED_IN', 'Logg ut før du bytter profil.');
		const key = req.body.key;
		if (typeof key !== 'string' || !/^itlab_[A-Za-z0-9_-]{43}$/.test(key))
			return fail(res, 401, 'INVALID_KEY', 'Nøkkelen er ugyldig eller erstattet.');
		if (req.body.remember !== undefined && typeof req.body.remember !== 'boolean')
			return fail(res, 400, 'INVALID_INPUT', 'Ugyldig valg av husket pålogging.');
		const credential = db.prepare('SELECT user_id FROM recovery_keys WHERE hash=?').get(hash(key));
		if (!credential) return fail(res, 401, 'INVALID_KEY', 'Nøkkelen er ugyldig eller erstattet.');
		const result = transaction(db, () => {
			const user = db
				.prepare('SELECT id,nickname,created_at AS createdAt FROM users WHERE id=?')
				.get(credential.user_id);
			const session = newSession(user.id, req.body.remember !== false);
			return { payload: me(user, session), session };
		});
		setSessionCookie(res, result.session);
		res.json(result.payload);
	});
	app.post('/api/auth/logout', (req, res) => {
		if (req.labSession) db.prepare('DELETE FROM sessions WHERE hash=?').run(req.labSession.hash);
		res.clearCookie(config.cookieName, cookieOptions);
		res.json({ ok: true });
	});
	app.post('/api/auth/rotate-key', authenticated, (req, res) => {
		const result = transaction(db, () => {
			db.prepare('DELETE FROM recovery_keys WHERE user_id=?').run(req.labUser.id);
			db.prepare('DELETE FROM sessions WHERE user_id=?').run(req.labUser.id);
			const recoveryKey = keyFile(req.labUser.id),
				session = newSession(req.labUser.id, req.labSession.remembered === 1);
			return { payload: { ...me(req.labUser, session), recoveryKey }, session };
		});
		setSessionCookie(res, result.session);
		res.json(result.payload);
	});
	app.post('/api/me/nickname', authenticated, (req, res) => {
		const name = nickname(req.body.nickname);
		db.prepare('UPDATE users SET nickname=? WHERE id=?').run(name, req.labUser.id);
		res.json(me({ ...req.labUser, nickname: name }, req.labSession));
	});
	app.post('/api/me/lab', authenticated, (req, res) => {
		const current = summary(db, req.labUser.id, clock());
		const color = labColors.find((item) => item.id === req.body.colorId);
		if (
			!color ||
			(color.requires &&
				!current.achievements.some((item) => item.id === color.requires && item.earnedAt !== null))
		)
			return fail(res, 400, 'LOCKED_COLOR', 'Velg en labfarge du har låst opp.');
		const featured = req.body.featuredAchievementId;
		if (
			featured !== null &&
			!current.achievements.some((item) => item.id === featured && item.earnedAt !== null)
		)
			return fail(res, 400, 'LOCKED_ACHIEVEMENT', 'Velg et merke du har oppnådd.');
		db.prepare(
			`INSERT INTO lab_profiles (user_id,color_id,featured_achievement_id) VALUES (?,?,?)
			ON CONFLICT(user_id) DO UPDATE SET color_id=excluded.color_id, featured_achievement_id=excluded.featured_achievement_id`
		).run(req.labUser.id, color.id, featured);
		res.json(me(req.labUser, req.labSession));
	});
	app.post('/api/me/delete', authenticated, (req, res) => {
		if (req.body.confirm !== 'SLETT')
			return fail(res, 400, 'CONFIRM_DELETE', 'Bekreft sletting av profilen.');
		db.prepare('DELETE FROM users WHERE id=?').run(req.labUser.id);
		res.clearCookie(config.cookieName, cookieOptions);
		res.json({ ok: true });
	});
	app.post('/api/checkpoints/open', authenticated, (req, res) => {
		if (req.body.accountId !== req.labUser.id)
			return fail(res, 409, 'ACCOUNT_CHANGED', 'En annen profil er pålogget. Oppdater siden.');
		const activity = catalog.find((item) => item.id === req.body.activityId);
		if (!activity) throw new TypeError('Ukjent aktivitet.');
		const result = openCheckpoint(db, req.labUser.id, activity, req.body.objectiveId, clock());
		res.json({ ...result, summary: summary(db, req.labUser.id, clock()) });
	});
	app.post('/api/progress', authenticated, (req, res) => {
		if (req.body.accountId !== req.labUser.id)
			return fail(res, 409, 'ACCOUNT_CHANGED', 'En annen profil er pålogget. Oppdater siden.');
		res.json(submit(db, req.labUser.id, req.body, clock()));
	});
	app.use('/api', (_req, res) => fail(res, 404, 'NOT_FOUND', 'API-adressen finnes ikke.'));
	app.use((error, _req, res, _next) => {
		if (error.type === 'entity.too.large')
			return fail(res, 413, 'TOO_LARGE', 'Innsendingen er for stor.');
		if (error.type === 'entity.parse.failed')
			return fail(res, 400, 'INVALID_JSON', 'Ugyldig JSON.');
		if (error.code === 'CONTENT_VERSION' || error.code === 'EVENT_CONFLICT')
			return fail(res, 409, error.code, error.message);
		if (error.code === 'CHECKPOINT_COOLDOWN' || error.code?.startsWith('ASSESSMENT_')) {
			if (error.retryAt)
				res.set('Retry-After', String(Math.max(1, Math.ceil((error.retryAt - clock()) / 1000))));
			return res
				.status(error.status)
				.json({ error: { code: error.code, message: error.message, retryAt: error.retryAt } });
		}
		if (error instanceof TypeError || error instanceof RangeError)
			return fail(res, 400, 'INVALID_INPUT', error.message);
		// Never log request bodies: account creation and login contain recovery credentials.
		console.error('IT-laben API: uventet serverfeil.');
		return fail(res, 500, 'INTERNAL', 'Kunne ikke lagre akkurat nå. Prøv igjen.');
	});
	return app;
}
