import { altElevinnhold, fag } from '#lib/innhold.js';
import { moduler } from '#lib/moduler.js';
import { moduleContext } from '#lib/moduleNavigation.js';
import { guideSteps } from '#lib/studentGuide.js';
import { databaseSections } from '#lib/databaseIntro.js';

export const feedbackCategories = [
	{ id: 'problem', label: 'Noe virker ikke' },
	{ id: 'idea', label: 'Et forslag' },
	{ id: 'other', label: 'Noe annet' }
];
export const feedbackMaxLength = 2000;
const pages = new Map([
	['/', 'Fagoversikten'],
	['/min-lab/', 'Min lab'],
	['/toppliste/', 'Topplisten'],
	['/kom-i-gang/', 'Kom i gang'],
	['/tutorial/', 'Slik bruker du IT-laben'],
	['/spill/redd-chatten/pilot/', 'Redd chatten · pilot'],
	...altElevinnhold.map((item) => /** @type {[string,string]} */ ([item.href, item.tittel])),
	...moduler.map((item) => /** @type {[string,string]} */ ([`/moduler/${item.id}/`, item.title]))
]);

/** Curated page context shared by client and server. Never retain arbitrary URL parameters.
 * @param {unknown} href
 * @returns {{href:string,path:string,title:string}|null}
 */
export function feedbackPage(href) {
	if (
		typeof href !== 'string' ||
		href.length > 4096 ||
		!href.startsWith('/') ||
		href.startsWith('//') ||
		/[\\\u0000-\u001f]/.test(href)
	)
		return null;
	const url = new URL(href, 'https://it-laben.invalid');
	const title = pages.get(url.pathname);
	if (!title) return null;
	const clean = new URLSearchParams();
	let label = title;
	if (url.pathname === '/') {
		const subject = fag.find((item) => item.id === url.searchParams.get('fag'));
		if (subject) {
			clean.set('fag', subject.id);
			label = `Fagoversikten · ${subject.navn}`;
		}
	}
	const module = url.searchParams.has('modul')
		? moduleContext(url.pathname, url.searchParams.get('modul'))?.module
		: null;
	if (module) {
		clean.set('modul', module.id);
		label += ` · ${module.title}`;
	}
	if (url.pathname === '/min-lab/' && url.searchParams.get('visning') === 'innstillinger') {
		clean.set('visning', 'innstillinger');
		label += ' · Innstillinger';
	}
	if (url.pathname === '/tutorial/') {
		const step = guideSteps.find((item) => item.id === url.searchParams.get('tur'));
		if (step) {
			clean.set('tur', step.id);
			label += ` · ${step.shortTitle}`;
		}
	}
	if (url.pathname === '/databaser/grunnlag/') {
		const section = databaseSections.find((item) => item.id === url.searchParams.get('del'));
		if (section) {
			clean.set('del', section.id);
			label += ` · ${section.label}`;
		}
	}
	return { path: url.pathname, href: url.pathname + (clean.size ? `?${clean}` : ''), title: label };
}

/** @typedef {{id:string,category:string,message:string,pageHref:string,pageTitle:string,createdAt:number,status:'new'|'handled',handledAt:number|null,nickname:string|null,question:string|null,answer:string|null,activityVersion:string|null}} FeedbackItem */
/** @typedef {{items:FeedbackItem[],total:number,newCount:number,page:number,pages:number}} FeedbackList */
