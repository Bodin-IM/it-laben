/** @typedef {'normal'|'practice'|'teaching'} LearningMode */
/** @typedef {{activityId:string,mode:LearningMode,openingId:string|null,untimed:boolean}} LearningContext */
/** @typedef {{id:string,activityId:string,mode:'practice'|'teaching',createdAt:number,closesAt:number,closedAt?:number|null}} ActivityOpening */
/** @typedef {{serverNow:number,activities:{id:string,title:string,href:string,subject:string,format:string}[],openings:ActivityOpening[]}} TeacherView */

/** @param {string|undefined} role */
export function hasTeacherRole(role) {
	return role === 'teacher' || role === 'admin';
}

/** @param {string} href @param {LearningMode} mode @param {string|null} [openingId] @param {boolean} [untimed] */
export function learningLink(href, mode, openingId = null, untimed = false) {
	const url = new URL(href, 'https://itlab.invalid');
	if (mode === 'practice') url.searchParams.set('modus', 'oving');
	if (mode === 'teaching') {
		url.searchParams.set('modus', 'undervisning');
		if (openingId) url.searchParams.set('apning', openingId);
	}
	if (untimed) url.searchParams.set('utenTid', '1');
	return url.pathname + url.search + url.hash;
}
