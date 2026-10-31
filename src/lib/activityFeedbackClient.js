import { get, writable } from 'svelte/store';
import { lab, randomId } from '#lib/lab.js';
import { feedbackRequest } from '#lib/feedbackClient.js';
import { feedbackPilot } from '#lib/activityFeedback.js';
import { feedbackPage } from '#lib/feedback.js';

/** @typedef {{accountId:string,activityId:string,version:string,pageHref:string}} FeedbackAttempt */
/** @typedef {FeedbackAttempt & {id:string,trigger:'run-finished'|'left-activity'}} FeedbackOpportunity */
/** @type {import('svelte/store').Writable<FeedbackOpportunity|null>} */
export const feedbackOpportunity = writable(null);
/** @type {import('svelte/store').Writable<{accountId:string|null,enabled:boolean|null}>} */
export const feedbackPromptPreference = writable({ accountId: null, enabled: null });
/** @type {FeedbackAttempt|null} */
let attempt = null;
const offered = new Set();
let epoch = 0;

function studentId() {
	const user = get(lab).user;
	return user?.role === 'student' ? user.id : null;
}
/** Clears all in-memory opportunities and invalidates pending preference requests on account change. */
export function resetFeedbackSession() {
	epoch++;
	attempt = null;
	offered.clear();
	feedbackOpportunity.set(null);
	feedbackPromptPreference.set({ accountId: studentId(), enabled: null });
}
export async function loadFeedbackPreference() {
	const accountId = studentId(), request = epoch;
	if (!accountId) return;
	const result = await feedbackRequest('/feedback/preferences');
	if (request === epoch && accountId === studentId())
		feedbackPromptPreference.set({ accountId, enabled: result.enabled });
}
/** @param {boolean} enabled */
export async function setFeedbackPromptPreference(enabled) {
	const accountId = studentId(), request = epoch;
	if (!accountId) return;
	const result = await feedbackRequest('/feedback/preferences', { enabled });
	if (request === epoch && accountId === studentId())
		feedbackPromptPreference.set({ accountId, enabled: result.enabled });
}
/** No field values, code or test results are collected. @param {string} activityId @param {string} href */
export function noteFeedbackAttempt(activityId, href) {
	const accountId = studentId();
	const activity = feedbackPilot.find((item) => item.id === activityId);
	const page = feedbackPage(href);
	if (!accountId || !activity || page?.path !== activity.href) return;
	attempt = { accountId, activityId, version: activity.version, pageHref: page.href };
}
/** @param {'run-finished'|'left-activity'} trigger */
function offer(trigger) {
	if (!attempt || attempt.accountId !== studentId()) return;
	const key = `${attempt.accountId}:${attempt.activityId}:${attempt.version}`;
	if (offered.has(key)) return;
	offered.add(key);
	feedbackOpportunity.set({ ...attempt, id: randomId(), trigger });
}
/** End of a trace is a pause, not proof of passing or learning. @param {string} activityId */
export function finishFeedbackAttempt(activityId) {
	if (attempt?.activityId === activityId) offer('run-finished');
}
/** Called only after internal navigation; never intercepts closing the tab. @param {string} pathname */
export function leaveFeedbackActivity(pathname) {
	if (attempt && feedbackPage(attempt.pageHref)?.path !== pathname) {
		offer('left-activity');
		attempt = null;
	}
}
