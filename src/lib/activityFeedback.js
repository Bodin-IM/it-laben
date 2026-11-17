import { feedbackPages, feedbackPage } from '#lib/feedback.js';
import { altElevinnhold } from '#lib/innhold.js';

export const feedbackQuestion = {
	id: 'clarity-v1',
	text: 'Var det tydelig hva du skulle gjøre?'
};
const pageQuestion = {
	id: 'page-clarity-v1',
	text: 'Var det enkelt å finne fram på denne siden?'
};
// Versions are independent of progression and XP. Preserve the pilot versions
// so existing answers and "once per version" limits remain valid.
export const feedbackActivities = feedbackPages.filter((item) => item.student).map((item) => ({
	...item,
	version: ['oving-5', 'oving-8', 'oving-10'].includes(item.id) ? '2026-10-31.1' : '2026-11-16.1',
	question: altElevinnhold.some((activity) => activity.id === item.id) || item.href === '/spill/redd-chatten/pilot/'
		? feedbackQuestion : pageQuestion
}));

/** @param {string} href */
export function feedbackActivity(href) {
	const page = feedbackPage(href);
	return feedbackActivities.find((item) => item.href === page?.path) ?? null;
}

// A reading visit can offer a question after leaving, never just on a timer.
export const feedbackVisitMinimumMs = 30000;

/** @param {number} now */
export function feedbackSchoolDay(now) {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Tracks visible reading time in memory. No timer, field values or events are stored.
 * @returns {{enter:(href:string,visible:boolean,now:number)=>void,visibility:(visible:boolean,now:number)=>void,leave:(href:string,now:number)=>{activityId:string,version:string,pageHref:string}|null,reset:()=>void}}
 */
export function createFeedbackVisitTracker() {
	/** @type {{activityId:string,version:string,pageHref:string,path:string,elapsed:number,since:number|null}|null} */
	let visit = null;
	return {
		enter(href, visible, now) {
			const activity = feedbackActivity(href), page = feedbackPage(href);
			if (!activity || !page) { visit = null; return; }
			if (visit?.path === page.path) { visit.pageHref = page.href; return; }
			visit = { activityId: activity.id, version: activity.version, pageHref: page.href,
				path: page.path, elapsed: 0, since: visible ? now : null };
		},
		visibility(visible, now) {
			if (!visit) return;
			if (visit.since !== null) visit.elapsed += Math.max(0, now - visit.since);
			visit.since = visible ? now : null;
		},
		leave(href, now) {
			if (!visit || feedbackPage(href)?.path === visit.path) return null;
			const previous = visit;
			visit = null;
			const elapsed = previous.elapsed + (previous.since === null ? 0 : Math.max(0, now - previous.since));
			if (!feedbackActivity(href) || elapsed < feedbackVisitMinimumMs) return null;
			return { activityId: previous.activityId, version: previous.version, pageHref: previous.pageHref };
		},
		reset() { visit = null; }
	};
}
export const feedbackAnswers = [
	{ id: 'yes', label: 'Ja', symbol: '👍' },
	{ id: 'partly', label: 'Delvis', symbol: '' },
	{ id: 'no', label: 'Nei', symbol: '👎' }
];
/** @typedef {{id:string,activityId:string,activityVersion:string,title:string,pageHref:string,question:string,questionId:string}} FeedbackPrompt */
/** @typedef {{activityId:string,activityVersion:string,title:string,question:string,questionId:string,invited:number,answered:number,yes:number,partly:number,no:number,dismissed:number}} FeedbackTotals */
