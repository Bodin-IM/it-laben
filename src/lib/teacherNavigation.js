import { hasTeacherRole } from './learning.js';

/** Direct teachers to their workspace only when they open the plain front page.
 * Explicit filters, student view, anchors and deeper links keep their destination.
 * @param {string|null|undefined} role
 * @param {{pathname:string,search:string,hash:string}} url
 * @returns {'/laerer/undervisning/'|null}
 */
export function teacherLanding(role, url) {
	return hasTeacherRole(role ?? undefined) && url.pathname === '/' && !url.search && !url.hash
		? '/laerer/undervisning/'
		: null;
}
