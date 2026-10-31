import { feedbackPilot, feedbackQuestion, feedbackAnswers } from '../src/lib/activityFeedback.js';
import { feedbackPage } from '../src/lib/feedback.js';
import { transaction } from './database.js';
import { isTeacher, requireAdmin, learningError } from './learning-access.js';

function requireStudent(db, userId) {
	if (!userId || !db.prepare('SELECT id FROM users WHERE id=? AND disabled_at IS NULL').get(userId))
		throw learningError('AUTH_REQUIRED', 'Logg inn for å svare.', 401);
	if (isTeacher(db, userId))
		throw learningError('STUDENT_REQUIRED', 'Spørsmålene er bare for elevprofiler.', 403);
}
function keys(body, allowed) {
	if (Object.keys(body).some((key) => !['accountId', ...allowed].includes(key)))
		throw new TypeError('Innsendingen inneholder ukjente felt.');
}
export function feedbackPreferences(db, userId) {
	requireStudent(db, userId);
	return { enabled: db.prepare('SELECT prompts_enabled FROM feedback_preferences WHERE user_id=?').get(userId)?.prompts_enabled !== 0 };
}
export function setFeedbackPreferences(db, userId, body) {
	requireStudent(db, userId);
	keys(body, ['enabled']);
	if (typeof body.enabled !== 'boolean') throw new TypeError('Velg om du vil få spørsmål.');
	db.prepare('INSERT INTO feedback_preferences VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET prompts_enabled=excluded.prompts_enabled')
		.run(userId, Number(body.enabled));
	return { enabled: body.enabled };
}
function publicPrompt(row) {
	return { id: row.id, activityId: row.activity_id, activityVersion: row.activity_version,
		title: row.activity_title, pageHref: row.page_href, question: row.question_text, questionId: row.question_id };
}
export function offerFeedbackPrompt(db, userId, body, now) {
	requireStudent(db, userId);
	keys(body, ['id', 'activityId', 'version', 'pageHref', 'trigger']);
	const activity = feedbackPilot.find((item) => item.id === body.activityId && item.version === body.version);
	const page = feedbackPage(body.pageHref);
	if (!activity || page?.path !== activity.href ||
		typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id) ||
		!['run-finished', 'left-activity'].includes(body.trigger))
		throw new TypeError('Ukjent oppgave eller oppgaveversjon.');
	const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
	return transaction(db, () => {
		const existing = db.prepare('SELECT * FROM activity_feedback_prompts WHERE id=?').get(body.id);
		if (existing && (existing.user_id !== userId || existing.activity_id !== activity.id ||
			existing.activity_version !== activity.version || existing.page_href !== page.href || existing.trigger !== body.trigger))
			throw learningError('FEEDBACK_CONFLICT', 'Forespørselen tilhører et annet forsøk.');
		if (!feedbackPreferences(db, userId).enabled) return { prompt: null };
		if (existing) return { prompt: existing.answer || existing.dismissed_at !== null ? null : publicPrompt(existing) };
		// Reserving the invitation and checking both caps is one transaction, across tabs/devices.
		if (db.prepare('SELECT id FROM activity_feedback_prompts WHERE user_id=? AND (school_day=? OR (activity_id=? AND activity_version=?))')
			.get(userId, day, activity.id, activity.version)) return { prompt: null };
		db.prepare(`INSERT INTO activity_feedback_prompts
			(id,user_id,activity_id,activity_version,activity_title,question_id,question_text,page_href,trigger,school_day,created_at)
			VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(body.id, userId, activity.id, activity.version, activity.title,
			feedbackQuestion.id, feedbackQuestion.text, page.href, body.trigger, day, now);
		return { prompt: publicPrompt(db.prepare('SELECT * FROM activity_feedback_prompts WHERE id=?').get(body.id)) };
	});
}
export function respondToFeedbackPrompt(db, userId, id, body, now) {
	requireStudent(db, userId);
	keys(body, ['answer', 'dismiss']);
	const answering = feedbackAnswers.some((item) => item.id === body.answer) && body.dismiss === undefined;
	const dismissing = body.dismiss === true && body.answer === undefined;
	if (!answering && !dismissing) throw new TypeError('Velg Ja, Delvis, Nei eller Hopp over.');
	return transaction(db, () => {
		const row = db.prepare('SELECT * FROM activity_feedback_prompts WHERE id=? AND user_id=?').get(id, userId);
		if (!row) throw learningError('FEEDBACK_NOT_FOUND', 'Spørsmålet finnes ikke for denne profilen.', 404);
		if (answering) {
			if (row.answer && row.answer !== body.answer)
				throw learningError('FEEDBACK_CONFLICT', 'Et annet svar er allerede lagret.');
			db.prepare('UPDATE activity_feedback_prompts SET answer=?,answered_at=COALESCE(answered_at,?) WHERE id=?')
				.run(body.answer, now, id);
		} else if (!row.answer) {
			db.prepare('UPDATE activity_feedback_prompts SET dismissed_at=COALESCE(dismissed_at,?) WHERE id=?').run(now, id);
		}
		return { ok: true, answer: answering ? body.answer : row.answer };
	});
}
export function feedbackTotals(db, actorId) {
	requireAdmin(db, actorId);
	return { items: db.prepare(`SELECT activity_id AS activityId,activity_version AS activityVersion,
		activity_title AS title,question_id AS questionId,question_text AS question,
		COUNT(*) AS invited,COUNT(answer) AS answered,
		SUM(CASE WHEN answer='yes' THEN 1 ELSE 0 END) AS yes,
		SUM(CASE WHEN answer='partly' THEN 1 ELSE 0 END) AS partly,
		SUM(CASE WHEN answer='no' THEN 1 ELSE 0 END) AS no,
		SUM(CASE WHEN answer IS NULL AND dismissed_at IS NOT NULL THEN 1 ELSE 0 END) AS dismissed
		FROM activity_feedback_prompts GROUP BY activity_id,activity_version,question_id
		ORDER BY activity_version DESC,activity_id`).all() };
}
