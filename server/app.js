import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { transaction } from './database.js';
import { summary, submit, reconcileAchievements } from './progress.js';
import { labColors } from '../src/lib/progression.js';
import { catalog } from './catalog.js';
import { openCheckpoint } from './checkpoints.js';
import { getTimedState, startTimedChallenge, saveTimedDraft } from './timed-challenges.js';
import {
	userRole,
	requireTeacher,
	activeOpenings,
	createOpening,
	closeOpening,
	practiceAccess
} from './learning-access.js';
import {
	learningActivity,
	openPracticeCheckpoint,
	getPracticeTimed,
	startPracticeTimed,
	savePracticeTimed,
	submitPractice
} from './practice.js';
import { assignExistingUsernames, generateUsername } from './usernames.js';
import {
	teacherOverview,
	listStudents,
	studentDetail,
	manageStudent,
	deleteUser
} from './students.js';
import { leaderboard } from './leaderboard.js';
import { teachingLibrary } from './teaching.js';
import { modulePublications, setModulePublication } from './modules.js';
import { avatars } from '../src/lib/avatars.js';
import { schoolClasses, classCapacities } from '../src/lib/classes.js';
import { labPartnerRouter } from './lab-partner/router.js';
import { saveFeedback, listFeedback, setFeedbackStatus } from './feedback.js';
import { networkLabSnapshot, checkNetworkLab } from './network-labs.js';

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
	assignExistingUsernames(db);
	reconcileAchievements(db, clock());
	const app = express();
	app.disable('x-powered-by');
	app.set('trust proxy', 'loopback');
	app.use(helmet());
	// Read-only publication metadata never reads or changes an incoming session.
	// It still follows the production HTTPS requirement for all API requests.
	app.get('/api/modules', (req, res) => {
		res.set('Cache-Control', 'no-store');
		if (config.secure && !req.secure)
			return fail(res, 400, 'HTTPS_REQUIRED', 'Bruk nettstedets HTTPS-adresse.');
		res.json(modulePublications(db));
	});
	app.use((req, res, next) => {
		res.set('Cache-Control', 'no-store');
		res.set('Vary', 'Cookie');
		if (config.secure && !req.secure)
			return fail(res, 400, 'HTTPS_REQUIRED', 'Bruk nettstedets HTTPS-adresse.');
		next();
	});
	app.use('/api/lab-partner/ask', express.json({ limit: '16kb', strict: true }));
	app.use('/api/network-labs', express.json({ limit: '32kb', strict: true }));
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
						.prepare(
							'SELECT id,nickname,created_at AS createdAt,disabled_at AS disabledAt,leaderboard_visible AS leaderboardVisible,class_code AS classCode FROM users WHERE id=?'
						)
						.get(session.user_id);
					if (req.labUser?.disabledAt != null) {
						db.prepare('DELETE FROM sessions WHERE user_id=?').run(req.labUser.id);
						return fail(
							res,
							403,
							'ACCOUNT_DISABLED',
							'Profilen er deaktivert. Ta kontakt med læreren.'
						);
					}
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
		app.use('/api/network-labs', limit(60000, 120));
		app.use('/api/checkpoints', limit(60000, 600));
		app.use('/api/timed', limit(60000, 3000));
		app.use('/api/practice', limit(60000, 3000));
		app.use('/api/teacher', limit(60000, 120));
		app.use('/api/admin', limit(60000, 120));
		app.use('/api/feedback', limit(10 * 60000, 120));
		app.use('/api/leaderboard', limit(60000, 120));
	}
	const authenticated = (req, res, next) => {
		if (!req.labUser) return fail(res, 401, 'LOGIN_REQUIRED', 'Logg inn for å lagre fremgangen.');
		next();
	};
	app.use('/api/lab-partner', labPartnerRouter({ db, config, authenticated, limits }));
	app.get('/api/network-labs/:labId', authenticated, (req, res) => res.json(networkLabSnapshot(db, req.labUser.id, req.params.labId)));
	app.post('/api/network-labs/:labId/:taskId/check', authenticated, (req, res) => res.json(checkNetworkLab(db, req.labUser.id, req.params.labId, req.params.taskId, req.body, clock())));
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
			user: {
				id: user.id,
				nickname: user.nickname,
				createdAt: user.createdAt,
				role: userRole(db, user.id),
				leaderboardVisible: user.leaderboardVisible === 1,
				classCode: user.classCode ?? null
			},
			openings: activeOpenings(db, clock()),
			csrfToken: session.csrf,
			summary: summary(db, user.id, clock()),
			development: !config.secure
		};
	}
	app.get('/api/me', (req, res) => {
		if (!req.labUser)
			return res.json({
				user: null,
				csrfToken: null,
				summary: null,
				openings: activeOpenings(db, clock()),
				development: !config.secure
			});
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
		const result = transaction(db, () => {
			// Names supplied by older browser tabs are ignored. Only the server assigns names.
			const user = {
				id: randomUUID(),
				nickname: generateUsername(db),
				createdAt: clock(),
				leaderboardVisible: 1
			};
			db.prepare('DELETE FROM sessions WHERE expires_at<?').run(clock());
			db.prepare(
				'INSERT INTO users(id,nickname,created_at,name_assigned,leaderboard_visible) VALUES (?,?,?,1,1)'
			).run(user.id, user.nickname, user.createdAt);
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
				.prepare(
					'SELECT id,nickname,created_at AS createdAt,disabled_at AS disabledAt,leaderboard_visible AS leaderboardVisible,class_code AS classCode FROM users WHERE id=?'
				)
				.get(credential.user_id);
			if (user.disabledAt !== null)
				throw Object.assign(new Error('Profilen er deaktivert. Ta kontakt med læreren.'), {
					code: 'ACCOUNT_DISABLED',
					status: 403
				});
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
	app.post('/api/auth/prepare-key', authenticated, (req, res) => {
		if (req.body.accountId !== req.labUser.id)
			return fail(res, 409, 'ACCOUNT_CHANGED', 'En annen profil er pålogget.');
		const result = transaction(db, () => {
			const now = clock(),
				key = `itlab_${token()}`,
				expiresAt = now + 30 * 60000;
			db.prepare('DELETE FROM pending_recovery_keys WHERE expires_at<=?').run(now);
			// Bound abandoned preparations without touching any currently valid credential.
			db.prepare(
				'DELETE FROM pending_recovery_keys WHERE user_id=? AND hash NOT IN (SELECT hash FROM pending_recovery_keys WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 4)'
			).run(req.labUser.id, req.labUser.id);
			db.prepare('INSERT INTO pending_recovery_keys VALUES (?,?,?,?)').run(
				hash(key),
				req.labUser.id,
				now,
				expiresAt
			);
			return {
				recoveryKey: {
					format: 'it-laben-key',
					version: 1,
					key,
					createdAt: new Date(now).toISOString(),
					site: config.origin
				},
				expiresAt
			};
		});
		res.json(result);
	});
	app.post('/api/auth/rotate-key', authenticated, (req, res) => {
		if (req.body.accountId !== req.labUser.id)
			return fail(
				res,
				409,
				'ACCOUNT_CHANGED',
				'Påloggingen eller nøkkelbyttet er endret. Oppdater siden.'
			);
		if (
			req.body.confirmed !== true ||
			typeof req.body.key !== 'string' ||
			!/^itlab_[A-Za-z0-9_-]{43}$/.test(req.body.key)
		)
			return fail(
				res,
				400,
				'KEY_PREPARATION_REQUIRED',
				'Last ned den nye nøkkelfilen og bekreft at du har lagret den før du bytter.'
			);
		transaction(db, () => {
			const keyHash = hash(req.body.key);
			// A retry after a lost response proves possession of the already activated key.
			if (
				db
					.prepare('SELECT hash FROM recovery_keys WHERE hash=? AND user_id=?')
					.get(keyHash, req.labUser.id)
			)
				return;
			const pending = db
				.prepare('SELECT * FROM pending_recovery_keys WHERE hash=? AND user_id=? AND expires_at>?')
				.get(keyHash, req.labUser.id, clock());
			if (!pending)
				throw new TypeError(
					'Denne nøkkelfilen er utløpt eller erstattet. Lag en ny fil og prøv igjen.'
				);
			db.prepare('DELETE FROM recovery_keys WHERE user_id=?').run(req.labUser.id);
			db.prepare('INSERT INTO recovery_keys VALUES (?,?,?)').run(keyHash, req.labUser.id, clock());
			db.prepare('DELETE FROM pending_recovery_keys WHERE user_id=?').run(req.labUser.id);
			// Keep this session: even losing both response body and headers cannot lock the
			// user out. They also already possess the newly active, downloaded key.
			db.prepare('DELETE FROM sessions WHERE user_id=? AND hash<>?').run(
				req.labUser.id,
				req.labSession.hash
			);
		});
		res.json(me(req.labUser, req.labSession));
	});
	app.post('/api/me/nickname', authenticated, (req, res) => {
		return fail(
			res,
			403,
			'NAME_MANAGED',
			'Brukernavnet tildeles av IT-laben. Be læreren om hjelp hvis det må endres.'
		);
	});
	app.get('/api/leaderboard', (req, res) =>
		res.json(leaderboard(db, req.labUser?.id, req.query.page ?? 1))
	);
	app.post('/api/me/class', authenticated, (req, res) => {
		if (req.body.accountId !== req.labUser.id)
			return fail(res, 409, 'ACCOUNT_CHANGED', 'En annen profil er pålogget.');
		if (userRole(db, req.labUser.id) !== 'student')
			return fail(res, 403, 'STAFF_NOT_RANKED', 'Bare elevprofiler kan velge klasse.');
		const { classCode, confirmed } = req.body;
		if (!schoolClasses.includes(classCode) || confirmed !== true)
			return fail(res, 400, 'INVALID_CLASS', 'Velg 2ITA eller 2ITB og bekreft at valget låses.');
		const saved = transaction(db, () => {
			const current = db
				.prepare('SELECT class_code AS classCode FROM users WHERE id=?')
				.get(req.labUser.id).classCode;
			// Existing choices stay locked; retries must also succeed when the class is full.
			if (current !== null) return current;
			// Count every assigned profile, including hidden/disabled profiles. Checking and
			// saving inside BEGIN IMMEDIATE prevents two students from taking the last place.
			const members = db
				.prepare('SELECT COUNT(*) AS n FROM users WHERE class_code=?')
				.get(classCode).n;
			if (members >= classCapacities[classCode]) return null;
			// The conditional write also protects against competing choices from other tabs/devices.
			db.prepare('UPDATE users SET class_code=? WHERE id=? AND class_code IS NULL').run(
				classCode,
				req.labUser.id
			);
			return db.prepare('SELECT class_code AS classCode FROM users WHERE id=?').get(req.labUser.id)
				.classCode;
		});
		if (saved === null)
			return fail(
				res,
				409,
				'CLASS_FULL',
				`${classCode} er full. Klassen har plass til maks ${classCapacities[classCode]} brukere. Ta kontakt med læreren.`
			);
		if (saved !== classCode)
			return fail(res, 409, 'CLASS_LOCKED', `Klassevalget er allerede låst til ${saved}.`);
		// Repeating the same confirmed choice is safe after a lost response.
		res.json(me({ ...req.labUser, classCode: saved }, req.labSession));
	});
	app.post('/api/me/leaderboard', authenticated, (req, res) => {
		if (req.body.accountId !== req.labUser.id)
			return fail(res, 409, 'ACCOUNT_CHANGED', 'En annen profil er pålogget.');
		if (typeof req.body.visible !== 'boolean')
			throw new TypeError('Velg om du vil vises på topplisten.');
		if (userRole(db, req.labUser.id) !== 'student')
			return fail(res, 403, 'STAFF_NOT_RANKED', 'Lærerprofiler deltar ikke på topplisten.');
		db.prepare(
			'UPDATE users SET leaderboard_visible=?,leaderboard_preference_set=1 WHERE id=?'
		).run(req.body.visible ? 1 : 0, req.labUser.id);
		res.json(me({ ...req.labUser, leaderboardVisible: req.body.visible ? 1 : 0 }, req.labSession));
	});
	app.post('/api/me/lab', authenticated, (req, res) => {
		if (req.body.accountId !== undefined && req.body.accountId !== req.labUser.id)
			return fail(res, 409, 'ACCOUNT_CHANGED', 'En annen profil er pålogget.');
		const current = summary(db, req.labUser.id, clock());
		const avatarId = req.body.avatarId ?? current.lab.avatarId;
		if (!avatars.some((item) => item.id === avatarId))
			return fail(res, 400, 'INVALID_AVATAR', 'Velg en av avatarene fra IT-laben.');
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
			`INSERT INTO lab_profiles (user_id,color_id,featured_achievement_id,avatar_id) VALUES (?,?,?,?)
			ON CONFLICT(user_id) DO UPDATE SET color_id=excluded.color_id, featured_achievement_id=excluded.featured_achievement_id, avatar_id=excluded.avatar_id`
		).run(req.labUser.id, color.id, featured, avatarId);
		res.json(me(req.labUser, req.labSession));
	});
	app.post('/api/me/delete', authenticated, (req, res) => {
		if (req.body.confirm !== 'SLETT')
			return fail(res, 400, 'CONFIRM_DELETE', 'Bekreft sletting av profilen.');
		transaction(db, () => {
			deleteUser(db, req.labUser.id);
		});
		res.clearCookie(config.cookieName, cookieOptions);
		res.json({ ok: true });
	});
	app.post('/api/checkpoints/open', authenticated, (req, res) => {
		if (req.body.accountId !== req.labUser.id)
			return fail(res, 409, 'ACCOUNT_CHANGED', 'En annen profil er pålogget. Oppdater siden.');
		const activity = catalog.find((item) => item.id === req.body.activityId);
		if (!activity) throw new TypeError('Ukjent aktivitet.');
		const result = openCheckpoint(
			db,
			req.labUser.id,
			activity,
			req.body.objectiveId,
			clock(),
			req.body.openingId ?? null
		);
		res.json({ ...result, summary: summary(db, req.labUser.id, clock()) });
	});
	const accountMatches = (req, res, next) => {
		if (req.method !== 'GET' && req.body.accountId !== req.labUser.id)
			return fail(res, 409, 'ACCOUNT_CHANGED', 'En annen profil er pålogget. Oppdater siden.');
		next();
	};
	const teacherView = (userId) => {
		requireTeacher(db, userId);
		return {
			serverNow: clock(),
			activities: catalog.map(({ id, title, href, subject, format }) => ({
				id,
				title,
				href,
				subject,
				format
			})),
			openings: db
				.prepare(
					'SELECT id,activity_id AS activityId,mode,created_at AS createdAt,closes_at AS closesAt,closed_at AS closedAt FROM activity_openings ORDER BY created_at DESC,rowid DESC LIMIT 40'
				)
				.all()
		};
	};
	app.post('/api/feedback', (req, res) => {
		const accountId = req.labUser?.id ?? null;
		if (req.body.accountId !== accountId)
			return fail(
				res,
				409,
				'ACCOUNT_CHANGED',
				'Påloggingen er endret. Last siden på nytt før du sender.'
			);
		res.status(201).json(saveFeedback(db, accountId, req.body, clock()));
	});
	app.get('/api/admin/feedback', authenticated, (req, res) =>
		res.json(listFeedback(db, req.labUser.id, req.query))
	);
	app.post('/api/admin/feedback/:id/status', authenticated, accountMatches, (req, res) =>
		res.json(setFeedbackStatus(db, req.labUser.id, req.params.id, req.body, clock()))
	);
	app.get('/api/teacher', authenticated, (req, res) => res.json(teacherView(req.labUser.id)));
	app.get('/api/teacher/teaching', authenticated, (req, res) =>
		res.json(teachingLibrary(db, req.labUser.id))
	);
	app.post('/api/teacher/modules/:moduleId', authenticated, accountMatches, (req, res) =>
		res.json(setModulePublication(db, req.labUser.id, req.params.moduleId, req.body, clock()))
	);
	app.get('/api/teacher/overview', authenticated, (req, res) =>
		res.json(teacherOverview(db, req.labUser.id, clock()))
	);
	app.get('/api/teacher/students', authenticated, (req, res) =>
		res.json(listStudents(db, req.labUser.id, req.query, clock()))
	);
	app.get('/api/teacher/students/:id', authenticated, (req, res) =>
		res.json(studentDetail(db, req.labUser.id, req.params.id, clock()))
	);
	app.post('/api/teacher/students/:id/:action', authenticated, accountMatches, (req, res) =>
		res.json(manageStudent(db, req.labUser.id, req.params.id, req.params.action, req.body, clock()))
	);
	app.post('/api/teacher/openings', authenticated, accountMatches, (req, res) => {
		createOpening(
			db,
			req.labUser.id,
			req.body,
			catalog.map((item) => item.id),
			clock()
		);
		res.json(teacherView(req.labUser.id));
	});
	app.post('/api/teacher/openings/:id/close', authenticated, accountMatches, (req, res) => {
		closeOpening(db, req.labUser.id, req.params.id, clock());
		res.json(teacherView(req.labUser.id));
	});
	app.get('/api/learning/:activityId', authenticated, (req, res) => {
		const mode = req.query.mode === 'teaching' ? 'teaching' : 'practice';
		res.json({
			activity: learningActivity(
				db,
				req.labUser.id,
				req.params.activityId,
				clock(),
				mode,
				req.query.openingId ?? null
			),
			access: practiceAccess(db, req.labUser.id, req.params.activityId, clock())
		});
	});
	app.use('/api/practice', authenticated, accountMatches);
	app.post('/api/practice/:activityId/checkpoints/open', (req, res) =>
		res.json(openPracticeCheckpoint(db, req.labUser.id, req.params.activityId, req.body, clock()))
	);
	app.get('/api/practice/:activityId/timed', (req, res) =>
		res.json(getPracticeTimed(db, req.labUser.id, req.params.activityId, clock()))
	);
	app.post('/api/practice/:activityId/timed/start', (req, res) =>
		res.json(startPracticeTimed(db, req.labUser.id, req.params.activityId, req.body, clock()))
	);
	app.post('/api/practice/:activityId/timed/draft', (req, res) =>
		res.json(savePracticeTimed(db, req.labUser.id, req.params.activityId, req.body, clock()))
	);
	app.post('/api/practice/:activityId/progress', (req, res) =>
		res.json(submitPractice(db, req.labUser.id, req.params.activityId, req.body, clock()))
	);
	app.get('/api/timed/:activityId', authenticated, (req, res) => {
		res.json(
			getTimedState(db, req.labUser.id, req.params.activityId, clock(), req.query.openingId ?? null)
		);
	});
	app.post('/api/timed/:activityId/:action', authenticated, (req, res) => {
		if (req.body.accountId !== req.labUser.id)
			return fail(res, 409, 'ACCOUNT_CHANGED', 'En annen profil er pålogget. Oppdater siden.');
		if (req.params.action === 'start') {
			const result = startTimedChallenge(
				db,
				req.labUser.id,
				req.params.activityId,
				req.body.startId,
				clock(),
				req.body.openingId ?? null
			);
			return res.json({ ...result, summary: summary(db, req.labUser.id, clock()) });
		}
		if (req.params.action === 'draft')
			return res.json(saveTimedDraft(db, req.labUser.id, req.params.activityId, req.body, clock()));
		return fail(res, 404, 'NOT_FOUND', 'API-adressen finnes ikke.');
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
		if (
			error.code?.startsWith('PARTNER_') ||
			error.code?.startsWith('NETWORK_') ||
			error.code?.startsWith('FEEDBACK_') ||
			error.code === 'CHECKPOINT_COOLDOWN' ||
			error.code?.startsWith('ASSESSMENT_') ||
			error.code?.startsWith('TIMED_') ||
			error.code?.startsWith('PRACTICE_') ||
			error.code?.startsWith('OPENING_') ||
			error.code?.startsWith('TEACHER_') ||
			error.code?.startsWith('ADMIN_') ||
			error.code?.startsWith('STUDENT_') ||
			error.code?.startsWith('MODULE_') ||
			error.code === 'ACCOUNT_DISABLED'
		) {
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
