import { lessons } from '#lib/ovingene.js';

// A small pilot. Bump this version when the task/instructions materially change.
// It is deliberately independent of progression, checkpoint and XP versions.
export const feedbackPilot = [5, 8, 10].map((number) => ({
	id: `oving-${number}`,
	href: `/oving-${number}/`,
	title: `Øving ${number}: ${lessons.find((lesson) => lesson.number === number)?.title}`,
	version: '2026-10-31.1'
}));
export const feedbackQuestion = {
	id: 'clarity-v1',
	text: 'Var det tydelig hva du skulle gjøre?'
};
export const feedbackAnswers = [
	{ id: 'yes', label: 'Ja', symbol: '👍' },
	{ id: 'partly', label: 'Delvis', symbol: '' },
	{ id: 'no', label: 'Nei', symbol: '👎' }
];
/** @typedef {{id:string,activityId:string,activityVersion:string,title:string,pageHref:string,question:string,questionId:string}} FeedbackPrompt */
/** @typedef {{activityId:string,activityVersion:string,title:string,question:string,questionId:string,invited:number,answered:number,yes:number,partly:number,no:number,dismissed:number}} FeedbackTotals */
