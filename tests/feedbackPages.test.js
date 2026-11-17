import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { feedbackPage, feedbackPages } from '../src/lib/feedback.js';
import { feedbackActivities, feedbackActivity, createFeedbackVisitTracker } from '../src/lib/activityFeedback.js';
import { openDatabase } from '../server/database.js';
import { offerFeedbackPrompt, respondToFeedbackPrompt, setFeedbackPreferences } from '../server/activity-feedback.js';
import { saveFeedback, listFeedback } from '../server/feedback.js';

test('feedback covers every current route and module, with student-only automatic questions', () => {
	const routes = readdirSync(new URL('../src/routes/', import.meta.url), { recursive: true })
		.filter((path) => path.endsWith('+page.svelte') && !path.includes('['))
		.map((path) => `/${path.replace('+page.svelte', '')}`);
	for (const href of routes) {
		assert.ok(feedbackPage(href), href);
		assert.equal(!!feedbackActivity(href), !href.startsWith('/laerer/'), href);
	}
	assert.equal(new Set(feedbackPages.map((item) => item.id)).size, feedbackPages.length);
	for (const item of feedbackActivities) assert.equal(feedbackPage(item.href)?.title, item.title);
	for (const href of ['/backend', '/nettverk/vlan-sammen', '/moduler/backend'])
		assert.equal(feedbackPage(href)?.href, href + '/');
	for (const href of ['//example.com/', '/api/feedback/', '/ukjent/', '/laerer/ukjent/'])
		assert.equal(feedbackPage(href), null);
});

test('reading questions wait for navigation and count visible time only', () => {
	const visits = createFeedbackVisitTracker();
	visits.enter('/databaser/grunnlag/?del=tilkobling&token=secret', true, 0);
	visits.visibility(false, 10000);
	visits.visibility(true, 100000);
	assert.equal(visits.leave('/databaser/grunnlag/?del=tabeller', 110000), null);
	const invitation = visits.leave('/backend/', 120000);
	assert.equal(invitation?.pageHref, '/databaser/grunnlag/?del=tilkobling');
	assert.equal(visits.leave('/backend/', 120001), null);
	visits.enter('/backend/', true, 0);
	assert.equal(visits.leave('/oving-7/', 29999), null);
	visits.enter('/backend/', false, 0);
	assert.equal(visits.leave('/oving-7/', 60000), null);
	visits.enter('/backend/', true, 0);
	assert.equal(visits.leave('/laerer/', 60000), null);
	visits.enter('/backend/', true, 0);
	visits.reset();
	assert.equal(visits.leave('/oving-7/', 60000), null);
});

test('expanded pages save the right question, preserve pilot limits, and strip private page data', () => {
	const db = openDatabase(':memory:');
	try {
		for (const id of ['student', 'teacher', 'admin'])
			db.prepare('INSERT INTO users(id,nickname,created_at) VALUES (?,?,0)').run(id, id);
		for (const role of ['teacher', 'admin']) db.prepare('INSERT INTO user_roles VALUES (?,?,0)').run(role, role);
		const now = Date.parse('2026-11-16T10:00:00Z');
		const nextDay = now + 86400000;
		function invitation(href) {
			const activity = feedbackActivity(href);
			return { id: randomUUID(), activityId: activity.id, version: activity.version, pageHref: href, trigger: 'left-activity' };
		}
		const body = invitation('/moduler/backend/?token=secret');
		const first = offerFeedbackPrompt(db, 'student', body, now).prompt;
		assert.equal(first.question, 'Var det enkelt å finne fram på denne siden?');
		assert.equal(first.pageHref, '/moduler/backend/');
		respondToFeedbackPrompt(db, 'student', body.id, { answer: 'partly' }, now);
		const comment = { id: randomUUID(), category: 'other', message: 'Savnet en tydelig lenke.', pageHref: body.pageHref, promptId: body.id };
		saveFeedback(db, 'student', comment, now);
		assert.equal(listFeedback(db, 'admin', { activity: body.activityId }).items[0].answer, 'partly');
		assert.deepEqual(offerFeedbackPrompt(db, 'student', invitation('/oving-7/'), now), { prompt: null, schoolDay: '2026-11-16' });
		assert.equal(offerFeedbackPrompt(db, 'student', invitation('/moduler/backend/'), nextDay).prompt, null);
		setFeedbackPreferences(db, 'student', { enabled: false });
		assert.equal(offerFeedbackPrompt(db, 'student', invitation('/nettverk/vlan/'), nextDay).prompt, null);
		setFeedbackPreferences(db, 'student', { enabled: true });
		assert.equal(offerFeedbackPrompt(db, 'student', invitation('/oving-7/'), nextDay).prompt.question, 'Var det tydelig hva du skulle gjøre?');
		for (const number of [5, 8, 10]) assert.equal(feedbackActivity(`/oving-${number}/`).version, '2026-10-31.1');
		assert.throws(() => offerFeedbackPrompt(db, 'teacher', invitation('/backend/'), now), { code: 'STUDENT_REQUIRED' });
		assert.throws(() => offerFeedbackPrompt(db, 'student', { ...invitation('/backend/'), pageHref: '/laerer/' }, now));
		const teacherFeedback = { id: randomUUID(), category: 'problem', message: 'Knappen er vanskelig å finne.', pageHref: '/laerer/elever/?elev=private&token=secret' };
		saveFeedback(db, 'teacher', teacherFeedback, now);
		const saved = listFeedback(db, 'admin', {}).items.find((item) => item.id === teacherFeedback.id);
		assert.equal(saved.pageHref, '/laerer/elever/');
		assert.equal(saved.pageTitle, 'Elever · lærer');
		assert.throws(() => listFeedback(db, 'teacher', {}), { code: 'ADMIN_REQUIRED' });
	} finally { db.close(); }
});
