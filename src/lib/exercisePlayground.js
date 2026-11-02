/** Presentation of the existing lesson models. No new scoring or simulator rules. */
/** @type {Record<number, string[][]>} */
const scenarios = {
	5: [['save', 'fail'], ['fail', 'save'], ['missing', 'broken']],
	7: [['500', '501'], ['number', 'custom'], ['blank', 'offline'], ['empty', 'custom']]
};

/** @param {import('./ovingene.js').Lesson} lesson @param {number} task */
export function playgroundChoices(lesson, task) {
	return (scenarios[lesson.number]?.[task] ?? []).map((value) => ({
		value,
		label: value === 'custom' ? (task === 1 ? 'Tekst' : 'Vanlig melding')
			: lesson.fields.find((field) => field.key === 'scenario')?.choices?.find((item) => item.value === value)?.label ?? value
	}));
}

/** Stop a successful edit before GET, so the student can update the browser explicitly.
 * @param {number} number @param {import('./ovingModel.js').Step[]} trace */
export function playgroundResultIndex(number, trace) {
	const get = number === 6 ? trace.findIndex((step) => step.title === 'Hent listen på nytt') : -1;
	return get > 0 ? get - 1 : trace.length - 1;
}

/** @typedef {{id:string,avsender:string,tekst:string}} Message */
/** @param {unknown} value @returns {Message[]|null} */
export function messageList(value) {
	if (typeof value === 'string') {
		try { value = JSON.parse(value); } catch { return null; }
	}
	if (!Array.isArray(value)) return null;
	if (!value.every((item) => item && typeof item.id === 'string' && typeof item.avsender === 'string' && typeof item.tekst === 'string')) return null;
	return value;
}

/** @param {unknown} before @param {unknown} after */
export function messageChanges(before, after) {
	const old = messageList(before), current = messageList(after);
	if (!current) return { messages: null, removed: [] };
	return {
		messages: current.map((message) => {
			const previous = old?.find((item) => item.id === message.id);
			return { ...message, change: !old ? '' : !previous ? 'Ny' : previous.tekst !== message.tekst ? 'Endret' : '' };
		}),
		removed: (old ?? []).filter((message) => !current.some((item) => item.id === message.id))
	};
}

/** @param {number} number @param {Record<string,string>} values */
export function playgroundAction(number, values) {
	if (number === 6) return values.method === 'DELETE' ? 'Slett meldingen' : 'Endre meldingen';
	if (number === 5 && !['save', 'fail'].includes(values.scenario)) return 'Start serveren';
	return 'Send meldingen';
}

/** @param {string} body */
export function requestText(body) {
	try { const value = JSON.parse(body)?.tekst; return typeof value === 'string' ? value : ''; }
	catch { return ''; }
}
