import { createHash } from 'node:crypto';
import { feedbackPage, feedbackCategories, feedbackMaxLength } from '../src/lib/feedback.js';
import { requireAdmin, learningError } from './learning-access.js';
import { transaction } from './database.js';
import { feedbackPilot } from '../src/lib/activityFeedback.js';

export function saveFeedback(db, userId, body, now) {
	if (
		Object.keys(body).some(
			(key) => !['id', 'accountId', 'category', 'message', 'pageHref', 'promptId'].includes(key)
		) ||
		typeof body.id !== 'string' ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id) ||
		!feedbackCategories.some((item) => item.id === body.category) ||
		typeof body.message !== 'string' ||
		!body.message.trim() ||
		body.message.length > feedbackMaxLength ||
		/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(body.message)
	)
		throw new TypeError('Velg en type og skriv en melding på 1–2000 tegn.');
	const page = feedbackPage(body.pageHref);
	if (!page)
		throw new TypeError('Siden kunne ikke gjenkjennes. Åpne tilbakemeldingen fra en elevside.');
	const message = body.message.trim();
	const prompt = body.promptId === undefined ? null : db.prepare(
		'SELECT id,page_href FROM activity_feedback_prompts WHERE id=? AND user_id=? AND answer IS NOT NULL'
	).get(typeof body.promptId === 'string' ? body.promptId : '', userId);
	if (body.promptId !== undefined && (!prompt || prompt.page_href !== page.href))
		throw new TypeError('Kommentaren må tilhøre ditt svar og siden spørsmålet gjaldt.');
	const fingerprint = createHash('sha256')
		.update(JSON.stringify([body.category, message, page.href, ...(prompt ? [prompt.id] : [])]))
		.digest('hex');
	return transaction(db, () => {
		const existing = db.prepare('SELECT * FROM student_feedback WHERE id=?').get(body.id);
		if (existing) {
			if (existing.user_id !== userId || existing.fingerprint !== fingerprint)
				throw learningError(
					'FEEDBACK_CONFLICT',
					'Denne innsendingen er endret. Start en ny tilbakemelding.',
					409
				);
			return { id: existing.id, createdAt: existing.created_at };
		}
		if (
			userId &&
			db
				.prepare('SELECT COUNT(*) AS n FROM student_feedback WHERE user_id=? AND created_at>?')
				.get(userId, now - 600000).n >= 5
		)
			throw learningError(
				'FEEDBACK_LIMIT',
				'Du har sendt flere meldinger på kort tid. Vent ti minutter før du sender en ny.',
				429
			);
		db.prepare(
			'INSERT INTO student_feedback(id,user_id,category,message,page_href,page_title,fingerprint,created_at,prompt_id) VALUES (?,?,?,?,?,?,?,?,?)'
		).run(body.id, userId, body.category, message, page.href, page.title, fingerprint, now, prompt?.id ?? null);
		return { id: body.id, createdAt: now };
	});
}

export function listFeedback(db, actorId, query) {
	requireAdmin(db, actorId);
	const status = query.status ?? 'new';
	if (
		!['new', 'handled', 'all'].includes(status) ||
		(query.activity !== undefined && !feedbackPilot.some((item) => item.id === query.activity)) ||
		(query.page !== undefined &&
			(typeof query.page !== 'string' || !/^[1-9][0-9]{0,5}$/.test(query.page)))
	)
		throw new TypeError('Velg en gyldig status og side.');
	const conditions = status === 'all' ? [] : ['f.status=?'];
	const params = status === 'all' ? [] : [status];
	if (query.activity) {
		conditions.push('p.activity_id=?');
		params.push(query.activity);
	}
	const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
	const join = 'LEFT JOIN activity_feedback_prompts p ON p.id=f.prompt_id';
	const total = db
		.prepare(`SELECT COUNT(*) AS n FROM student_feedback f ${join} ${where}`)
		.get(...params).n;
	const pages = Math.max(1, Math.ceil(total / 20));
	const page = Math.min(Number(query.page ?? 1), pages);
	const items = db
		.prepare(
			`SELECT f.id,f.category,f.message,f.page_href AS pageHref,f.page_title AS pageTitle,f.created_at AS createdAt,f.status,f.handled_at AS handledAt,u.nickname,
		p.question_text AS question,p.answer,p.activity_version AS activityVersion
		FROM student_feedback f LEFT JOIN users u ON u.id=f.user_id ${join} ${where} ORDER BY f.created_at DESC,f.id DESC LIMIT 20 OFFSET ?`
		)
		.all(...params, (page - 1) * 20);
	return {
		items,
		total,
		page,
		pages,
		newCount: db.prepare("SELECT COUNT(*) AS n FROM student_feedback WHERE status='new'").get().n
	};
}

export function setFeedbackStatus(db, actorId, id, body, now) {
	requireAdmin(db, actorId);
	if (!['new', 'handled'].includes(body.status)) throw new TypeError('Velg ny eller behandlet.');
	const result = db
		.prepare(
			'UPDATE student_feedback SET status=?,handled_at=CASE WHEN status=? THEN handled_at ELSE ? END WHERE id=?'
		)
		.run(body.status, body.status, body.status === 'handled' ? now : null, id);
	if (!result.changes)
		throw learningError('FEEDBACK_NOT_FOUND', 'Tilbakemeldingen finnes ikke lenger.', 404);
	return { ok: true };
}
