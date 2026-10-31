/** Shared timing and wire types. The server owns questions, answer keys and attempt history. */
export const assessmentPolicy = { questionsPerAttempt: 2, cooldownMs: 24 * 60 * 60 * 1000 };

/** @typedef {{id:string,label:string}} AssessmentChoice */
/** @typedef {{id:string,prompt:string,choices:AssessmentChoice[]}} AssessmentQuestion */
/** @typedef {{id:string,number:number,questions:AssessmentQuestion[]}} Assessment */
/** @typedef {{title:string,href:string,instruction:string,lookFor:string}} CheckpointPractice */
/** @typedef {{prompt:string,selectedLabel:string,correctLabel:string,explanation:string,correct:boolean,practice?:CheckpointPractice|null}} QuestionResult */
/** @typedef {{id:string,submittedAt:number,score:number,total:number,passed:boolean,questions:QuestionResult[]}} AssessmentResult */
/** @typedef {{completed:boolean,prerequisitesMet:boolean,canStart:boolean,hasPending:boolean,nextAttemptAt:number|null,lastResult:AssessmentResult|null,openingId?:string|null,openingUsed?:boolean,openingClosed?:boolean,practice?:boolean}} AssessmentState */
