// Shared, versioned allowlist. It accepts descriptions of learning state, never DOM or arbitrary text.
import { guideSteps } from '#lib/studentGuide.js';
import { lessons } from '#lib/ovingene.js';
import { partnerPageById } from '#lib/partnerPages.js';
import { LEVELS, actionsFor, MAX_ACTIONS } from '#lib/chatSpill.js';
import { CASES, patchesFor, probesFor } from '#lib/meldingsdetektiven.js';
import { PILOT_BLOCKS, ROOM_BLOCKS, STEPS } from '#lib/reddChattenPilot.js';
import { casesFor } from '#lib/reddChatten.js';
import { backendQuestions } from '#lib/backendQuiz.js';
import { queryTasks, queryOptions, equipment, databasePhases } from '#lib/databaseCourse.js';
import { databaseSections, readExamples, insertStages } from '#lib/databaseIntro.js';
import { vlanTasks } from '#lib/vlanLab.js';
import { vlan2Tasks } from '#lib/vlanLab2.js';
export const PAGE_CONTEXT_VERSION = 2;
export const ADAPTER_VERSION = 1;
export const MAX_CONTEXT_BYTES = 6000;
/** @typedef {(value:unknown)=>any} Rule */
/** @returns {never} */
export function invalidContext() {
	throw new Error('Ugyldig eller utdatert sidekontekst. Oppdater siden og prøv igjen.');
}
/** @param {unknown} value */
export function object(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/** @param {unknown[]} values @returns {Rule} */
const choice = (values) => (value) => (values.includes(value) ? value : invalidContext());
/** @param {number} min @param {number} max @returns {Rule} */
const integer = (min, max) => (value) =>
	typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
		? value
		: invalidContext();
const bool = choice([true, false]);
const side = choice(['frontend', 'backend']);
const count = integer(0, 1000);
const line = integer(-1, 100);
const status = choice([null, 200, 201, 204, 400, 401, 403, 404, 409, 413, 500]);
/** @param {Record<string,Rule>} shape @returns {Rule} */
export const record = (shape) => (value) => {
	if (!object(value)) return invalidContext();
	const input = /** @type {Record<string,unknown>} */ (value);
	if (Object.keys(input).some((key) => !Object.hasOwn(shape, key))) return invalidContext();
	return Object.fromEntries(Object.entries(shape).map(([key, rule]) => [key, rule(input[key])]));
};
/** @param {Rule} rule @returns {Rule} */
const nullable = (rule) => (value) => (value === null ? null : rule(value));
/** @param {Rule} rule @param {number} max @returns {Rule} */
const array = (rule, max) => (value) =>
	Array.isArray(value) && value.length <= max ? value.map(rule) : invalidContext();
/** Coarse semantic properties preserve the teaching branch without sharing typed text. @param {unknown} value */
export function textShape(value) {
	if (typeof value !== 'string') return 'not-string';
	if (!value.length) return 'empty';
	if (!value.trim()) return 'whitespace';
	return value.trim().length > 500 ? 'long' : 'text';
}
/** @param {string} raw */
function jsonShape(raw) {
	if (new TextEncoder().encode(raw).length > 10240) return 'large';
	try {
		const data = raw.length === 0 ? {} : JSON.parse(raw);
		if (data === null || typeof data !== 'object') return 'malformed';
		if (
			typeof data.avsender !== 'string' ||
			!data.avsender.trim() ||
			data.avsender.trim().length > 40
		)
			return 'invalid-sender';
		return textShape(data.tekst);
	} catch {
		return 'malformed';
	}
}
const textKinds = ['empty', 'whitespace', 'text', 'long', 'not-string'];
const fieldKinds = {
	text: textKinds,
	body: [...textKinds, 'large', 'malformed', 'invalid-sender'],
	username: ['valid', 'invalid'],
	password: ['short', 'large', 'valid']
};
/** @param {import('#lib/ovingene.js').Lesson} lesson */
function lessonRules(lesson) {
	return Object.fromEntries(
		lesson.fields.map((field) => {
			const values =
				field.kind === 'select'
					? field.choices?.map((item) => item.value)
					: fieldKinds[/** @type {keyof typeof fieldKinds} */ (field.key)];
			if (!values) throw new Error(`Mangler delingsregel for øving ${lesson.number}: ${field.key}`);
			return [field.key, choice(values)];
		})
	);
}
/** @param {import('#lib/ovingene.js').Lesson} lesson @param {Record<string,string>} values */
export function lessonChoices(lesson, values) {
	return Object.fromEntries(
		lesson.fields.map((field) => {
			const value = values[field.key] ?? field.value;
			return [
				field.key,
				field.kind === 'select'
					? value
					: field.key === 'body'
						? jsonShape(value)
						: field.key === 'username'
							? /^[a-z0-9_]{3,20}$/.test(value.trim().toLowerCase())
								? 'valid'
								: 'invalid'
							: field.key === 'password'
								? value.length < 12
									? 'short'
									: new TextEncoder().encode(value).length > 72
										? 'large'
										: 'valid'
								: textShape(value)
			];
		})
	);
}
/** @param {string} pageId @param {unknown} raw @returns {Record<string,any>|null} */
export function readPartnerState(pageId, raw) {
	if (raw === null) return null;
	if (new TextEncoder().encode(JSON.stringify(raw) ?? '').length > MAX_CONTEXT_BYTES)
		return invalidContext();
	const page = partnerPageById(pageId);
	if (!page) return invalidContext();
	const wrap = record({ version: choice([ADAPTER_VERSION]), values: (value) => value })(raw);
	const v = wrap.values;
	/** @type {Record<string,Rule>} */
	let shape;
	if (page.kind === 'vlan2') {
		if (!object(v)) return invalidContext();
		const task = vlan2Tasks.find((t) => t.id === v.taskId);
		if (!task) return invalidContext();
		shape = { taskId: choice(vlan2Tasks.map((t) => t.id)), deviceId: choice(task.devices.map((d) => d.id)), hints: integer(0, task.hints.length), hasRun: bool, stale: bool, revision: integer(0, 1000000000) };
	} else if (page.kind === 'vlan') {
		if (!object(v)) return invalidContext();
		const task = vlanTasks.find((item) => item.id === v.taskId);
		if (!task) return invalidContext();
		const sw = task.switches.find((item) => item.id === v.deviceId);
		shape = {
			taskId: choice(vlanTasks.map((item) => item.id)),
			deviceId: choice([...task.pcs, ...task.switches].map((item) => item.id)),
			portId: sw ? choice(sw.ports.map((port) => port.id)) : choice([null]),
			hints: integer(0, task.hints.length),
			hasRun: bool,
			stale: bool,
			revision: integer(0, 1000000000)
		};
	} else if (page.kind === 'tutorial') {
		const attempt = record({ sample: choice(['spaces', 'message']), trim: bool });
		shape = {
			section: (value) =>
				value === undefined ? 'all' : choice(['all', ...guideSteps.map((step) => step.id)])(value),
			sample: choice(['spaces', 'message']),
			trim: bool,
			run: nullable(attempt)
		};
	} else if (page.kind === 'database-theory')
		shape = {
			section: choice(databaseSections.map((item) => item.id)),
			operation: (value) => (value === undefined ? 'hente' : choice(['hente', 'lagre'])(value)),
			flowStep: (value) => (value === undefined ? 0 : integer(0, 4)(value)),
			readId: (value) =>
				value === undefined ? 'alle' : choice(readExamples.map((item) => item.id))(value),
			readShown: (value) => (value === undefined ? false : bool(value)),
			insertStep: (value) => (value === undefined ? 0 : integer(0, insertStages.length - 1)(value))
		};
	else if (page.kind === 'database-practice') shape = { phase: choice(databasePhases) };
	else if (page.kind === 'database-query') {
		const choices = record(
			Object.fromEntries(
				Object.entries(queryOptions).map(([key, options]) => [
					key,
					choice(options.map((option) => option.value))
				])
			)
		);
		const ids = array(choice(equipment.map((item) => item._id)), equipment.length);
		shape = {
			taskId: choice(queryTasks.map((task) => task.id)),
			choices,
			prediction: ids,
			run: nullable(record({ choices, prediction: ids })),
			inspectedId: choice(equipment.map((item) => item._id)),
			action: choice([
				'opened',
				'task-selected',
				'filter-changed',
				'query-run',
				'document-inspected',
				'hint-opened'
			]),
			hintCount: integer(0, 2)
		};
	} else if (page.kind === 'lesson') {
		const lesson = lessons.find((item) => `oving-${item.number}` === pageId);
		if (!lesson) return invalidContext();
		shape = {
			choices: record(lessonRules(lesson)),
			step: line,
			line,
			task: integer(-1, lesson.tasks.length - 1)
		};
	} else if (page.kind === 'backend')
		shape = {
			kind: choice(['get', 'post']),
			side,
			wrongKey: bool,
			text: choice(textKinds),
			sender: choice(textKinds),
			step: integer(0, 30),
			status,
			serverCount: count,
			clientCount: count,
			selectedLine: line
		};
	else if (page.kind === 'chatroom')
		shape = {
			kind: choice(['rooms', 'session', 'delete']),
			codeKind: choice(['rooms', 'session', 'delete']),
			side,
			room: choice(['generelt', 'gaming', 'ukjent']),
			session: choice(['ada', 'noah', 'none']),
			credentials: bool,
			spoofSender: bool,
			text: choice(textKinds),
			messageId: integer(0, 100000),
			step: integer(0, 30),
			method: choice([null, 'GET', 'POST', 'DELETE']),
			status,
			serverCount: count,
			clientCount: count,
			nestedRoom: choice(['generelt', 'gaming']),
			nestedCount: count,
			nestedText: choice(textKinds)
		};
	else if (page.kind === 'storage')
		shape = {
			action: choice(['start', 'post', 'restart']),
			step: integer(0, 20),
			activeLine: line,
			selectedLine: line,
			saveEnabled: bool,
			serverRunning: bool,
			filePresent: bool,
			memoryCount: nullable(count),
			fileCount: nullable(count),
			unsaved: bool,
			failed: bool
		};
	else if (page.kind === 'session')
		shape = {
			section: choice(['grunnlag', 'ekstra', 'kode']),
			step: integer(0, 3),
			experiment: choice(['profiler', 'cookie', 'utlopt']),
			profile: choice(['A', 'B']),
			credentials: bool,
			cookiePresent: bool,
			sessionCount: integer(0, 2),
			status: choice([null, 200, 401]),
			code: choice(['oppsett', 'innlogging', 'ruter', 'fetch'])
		};
	else if (page.kind === 'chat') {
		if (!object(v)) return invalidContext();
		const level = LEVELS.find((item) => item.id === v.level);
		if (!level) return invalidContext();
		const action = choice(actionsFor(level.id).map((item) => item.id));
		shape = {
			level: choice(LEVELS.map((item) => item.id)),
			program: array(action, MAX_ACTIONS),
			action,
			side,
			step: integer(-1, 100),
			tested: bool,
			running: bool
		};
	} else if (page.kind === 'detective') {
		if (!object(v)) return invalidContext();
		const current = CASES.find((item) => item.id === v.caseId);
		if (!current) return invalidContext();
		const settings = record(
			Object.fromEntries(
				patchesFor(current.id).map((patch) => [
					patch.id,
					choice(patch.choices.map((item) => item.id))
				])
			)
		);
		const probe = choice(probesFor(current.id).map((item) => item.id));
		shape = {
			caseId: choice(CASES.map((item) => item.id)),
			settings,
			probe,
			side,
			event: integer(-1, 100),
			run: nullable(record({ settings, probe }))
		};
	} else if (page.kind === 'pilot')
		shape = {
			step: integer(0, STEPS.length - 1),
			program: array(choice(PILOT_BLOCKS.map((item) => item.id)), 5),
			roomProgram: array(choice(ROOM_BLOCKS.map((item) => item.id)), 4),
			caseId: choice(casesFor('tekst').map((item) => item.id)),
			frame: integer(0, 100),
			repairTested: bool,
			roomTested: bool,
			hints: integer(0, 3)
		};
	else if (page.kind === 'quiz')
		shape = {
			questionId: choice(backendQuestions.map((item) => item.id)),
			selected: integer(-1, 3),
			last: integer(-1, 3),
			revealed: bool,
			summary: bool
		};
	else if (page.kind === 'challenge')
		shape = {
			phase: choice(['not-started', 'active', 'finished']),
			incident: integer(-1, 20),
			untimed: bool
		};
	else return invalidContext();
	return { version: ADAPTER_VERSION, values: record(shape)(v) };
}
/** Validate catalogue policies early, including future exercise fields. */
export function validatePartnerLessons() {
	for (const lesson of lessons) lessonRules(lesson);
}
validatePartnerLessons();
