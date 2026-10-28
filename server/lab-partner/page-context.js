// Server-owned teaching context. Client fields are validated before any reconstruction.
import { guideSteps, tutorialResult } from '../../src/lib/studentGuide.js';
import { lessons } from '../../src/lib/ovingene.js';
import { buildTrace } from '../../src/lib/ovingModel.js';
import { moduleContext } from '../../src/lib/moduleNavigation.js';
import { partnerPageById } from '../../src/lib/partnerPages.js';
import { readPartnerState, invalidContext } from '../../src/lib/partnerContext.js';
import { codeLines as backendCode } from '../../src/lib/frontendBackendLab.js';
import { codeLines as roomCode, CHATROOM_LESSONS } from '../../src/lib/chatromLab.js';
import { kilde, forklaringer } from '../../src/lib/storageLesson.js';
import {
	trinnene,
	forsokene,
	kodebiter,
	megBackend,
	innloggingBackend,
	utloggingBackend
} from '../../src/lib/sessionLesson.js';
import { LEVELS, codeLines as chatCode, planAttempt } from '../../src/lib/chatSpill.js';
import {
	CASES,
	codeFor,
	probesFor,
	runProbe,
	settingsKey
} from '../../src/lib/meldingsdetektiven.js';
import {
	PILOT_START,
	ROOM_BLOCKS,
	ROOM_FRAME,
	STEPS,
	HINTS,
	validProgram
} from '../../src/lib/reddChattenPilot.js';
import { programCode, walkthroughCase } from '../../src/lib/reddChatten.js';
import { backendQuestions } from '../../src/lib/backendQuiz.js';
import {
	databaseTheory,
	equipment,
	queryTasks,
	queryCode,
	inspectQuery,
	sameQuery,
	practicalRequirements,
	practiceChecks,
	starterCode
} from '../../src/lib/databaseCourse.js';

const selected = (items, index) => items[index] ?? invalidContext();
const codeText = (lines) =>
	lines.map((line) => (typeof line === 'string' ? line : line.text)).join('\n');
const examples = {
	empty: '',
	whitespace: '   ',
	text: 'Eksempeltekst',
	long: 'x'.repeat(501),
	'not-string': 42
};
function exampleValues(lesson, choices) {
	return Object.fromEntries(
		lesson.fields.map((field) => {
			const value = choices[field.key];
			if (field.kind === 'select') return [field.key, value];
			if (field.key === 'username') return [field.key, value === 'valid' ? 'ada' : '!'];
			if (field.key === 'password')
				return [
					field.key,
					value === 'short' ? 'x' : value === 'large' ? 'x'.repeat(73) : 'Eksempelpassord!'
				];
			if (field.key === 'body')
				return [
					field.key,
					value === 'large'
						? ' '.repeat(10241)
						: value === 'malformed'
							? '{'
							: value === 'invalid-sender'
								? '{}'
								: JSON.stringify({ avsender: 'Ada', tekst: examples[value] })
				];
			return [field.key, examples[value]];
		})
	);
}
const frameInfo = (frame) => ({
	title: frame.title,
	explanation: frame.explanation ?? frame.text ?? frame.detail,
	status: frame.httpStatus ?? frame.status ?? null
});
export function pageTask(page, moduleId) {
	let module = null;
	if (moduleId !== null) {
		const match = typeof moduleId === 'string' && moduleContext(page.path, moduleId);
		if (!match) return invalidContext();
		const definition = partnerPageById(`module-${match.module.id}`);
		module = {
			title: definition.title,
			goals: definition.topics,
			prerequisites: match.module.prerequisites,
			sequence: definition.contents
		};
	}
	const lesson = lessons.find((item) => `oving-${item.number}` === page.id);
	return {
		title: page.title,
		summary: page.summary,
		topics: page.topics,
		tips: page.tips,
		contents: page.contents,
		module,
		...(page.kind?.startsWith('database-')
			? {
					learningGoals: databaseTheory.goals,
					framework: databaseTheory.principles,
					...(page.kind === 'database-query'
						? {
								dataset: equipment,
								modelLimit:
									'Avgrenset øvingsmodell for likhet, implisitt AND og $lte. Ikke en kjørende MongoDB.'
							}
						: {}),
					...(page.kind === 'database-practice'
						? {
								requirements: practicalRequirements,
								limit:
									'Du ser IKKE elevens lokale kode, tilkoblingsstreng, database eller terminal. Ikke anta at oppsettet fungerer. Be om en kort beskrivelse uten hemmeligheter.'
							}
						: {})
				}
			: {}),
		...(lesson
			? {
					learningQuestion: lesson.question,
					framework: lesson.context,
					tasks: lesson.tasks.map(({ title, hint }) => ({ title, hint })),
					related: lesson.related
				}
			: {})
	};
}
export function pageWork(page, raw) {
	const state = readPartnerState(page.id, raw);
	if (!state) return { source: 'Bare sidegrunnlag. Ingen arbeidsstatus er delt.', selection: null };
	const v = state.values;
	const work = {
		source:
			'Avgrenset status rapportert av nettleseren, ikke dokumentasjon på forståelse. Kode og forklaringer hentes fra IT-labens undervisningsmodeller. Tekstfelt er bare kategorier; eksempler er ikke elevens faktiske tekst.',
		selection: v
	};
	if (page.kind === 'tutorial') {
		work.guideStep = guideSteps.find((step) => step.id === v.section) ?? null;
		work.current = { sample: v.sample, trim: v.trim };
		work.oldRun = v.run !== null && (v.run.sample !== v.sample || v.run.trim !== v.trim);
		work.lastRun = v.run ? tutorialResult(v.run) : null;
		work.limit =
			'Lokalt prøveforsøk for å lære arbeidsmåten. Ingen XP eller vurdering av forståelse. Forklar bare resultatet av kjøringen som faktisk er vist.';
	} else if (page.kind === 'database-theory') {
		work.topic = v.section;
	} else if (page.kind === 'database-practice') {
		work.phase = v.phase;
		if (v.phase === 'kode') work.referenceCode = starterCode;
		if (v.phase === 'forklar') work.visibleChecks = practiceChecks;
		work.limit =
			'Status angir bare hvilket oppgavesteg som er åpnet. Ingen lokal kode, terminalutskrift eller bekreftelse på gjennomføring er delt.';
	} else if (page.kind === 'database-query') {
		const task = queryTasks.find((item) => item.id === v.taskId);
		work.task = { title: task.title, brief: task.brief, goal: task.goal };
		work.code = queryCode(v.choices);
		work.openHints = task.hints.slice(0, v.hintCount);
		if (v.run) {
			const rows = inspectQuery(v.run.choices);
			work.oldRun = !sameQuery(v.choices, v.run.choices);
			work.lastRun = {
				code: queryCode(v.run.choices),
				prediction: v.run.prediction,
				result: rows.filter((row) => row.matches).map((row) => row.document._id)
			};
			work.inspectedDocument = rows.find((row) => row.document._id === v.inspectedId);
		}
		work.limit =
			'Resultatet er rekonstruert fra kjente filtervalg. En bestått søkeøving er ikke en vurdering av forståelse. Gi hjelp som kan brukes i neste forsøk; ikke finn opp støtte for andre operatorer i simulatoren.';
	} else if (page.kind === 'lesson') {
		const lesson = lessons.find((item) => `oving-${item.number}` === page.id);
		const frame =
			v.step < 0
				? null
				: selected(buildTrace(lesson.number, exampleValues(lesson, v.choices)), v.step);
		work.viewedStep = frame
			? {
					...frameInfo(frame),
					code: frame.code.map((line) => line[0]).join('\n'),
					selectedLine: v.line < 0 ? null : selected(frame.code, v.line)
				}
			: null;
		work.task =
			v.task < 0 ? null : { title: lesson.tasks[v.task].title, hint: lesson.tasks[v.task].hint };
	} else if (page.kind === 'backend') {
		const lines = backendCode(v.kind, v.side, v.wrongKey);
		work.code = codeText(lines);
		work.selectedLine = v.selectedLine < 0 ? null : selected(lines, v.selectedLine);
	} else if (page.kind === 'chatroom') {
		work.task = CHATROOM_LESSONS.find((item) => item.id === v.kind);
		work.code = codeText(
			roomCode(v.codeKind, v.side, {
				room: v.room,
				session: v.session,
				credentials: v.credentials,
				spoofSender: v.spoofSender,
				messageId: v.messageId,
				text: ''
			})
		);
	} else if (page.kind === 'storage') {
		work.code = kilde
			.map((line, i) => (i === 14 && !v.saveEnabled ? '// lagreMeldinger();' : line))
			.join('\n');
		work.selectedLine =
			v.selectedLine < 0 ? null : (forklaringer[v.selectedLine] ?? invalidContext());
		work.activeLine = v.activeLine < 0 ? null : (forklaringer[v.activeLine] ?? invalidContext());
	} else if (page.kind === 'session') {
		work.task =
			v.section === 'ekstra'
				? forsokene.find((item) => item.id === v.experiment)
				: trinnene[v.step];
		work.referenceCode =
			v.section === 'kode'
				? kodebiter.find((item) => item.id === v.code)
				: v.step === 1
					? innloggingBackend
					: v.step === 3
						? utloggingBackend
						: megBackend;
	} else if (page.kind === 'chat') {
		const level = LEVELS.find((item) => item.id === v.level);
		work.task = { title: level.title, brief: level.brief, goal: level.goal, hint: level.hint };
		work.code = codeText(chatCode(v.level, v.action, v.side));
		if (v.step >= 0) {
			if (!v.tested) invalidContext();
			work.viewedStep = frameInfo(selected(planAttempt(v.level, v.program).steps, v.step));
		}
	} else if (page.kind === 'detective') {
		const current = CASES.find((item) => item.id === v.caseId);
		work.task = {
			title: current.title,
			report: current.report,
			goal: current.goal,
			context: current.context,
			hint: current.hint
		};
		work.probe = probesFor(v.caseId).find((item) => item.id === v.probe);
		work.code = codeText(codeFor(v.caseId, v.settings, v.side));
		if (v.run) {
			work.oldRun = settingsKey(v.caseId, v.settings) !== settingsKey(v.caseId, v.run.settings);
			if (v.event >= 0)
				work.viewedStep = frameInfo(
					selected(runProbe(v.caseId, v.run.settings, v.run.probe).events, v.event)
				);
		} else if (v.event >= 0) invalidContext();
	} else if (page.kind === 'pilot') {
		if (
			!validProgram(
				v.program,
				['normalize-text', 'guard-text', 'guard-present', 'save-body', 'reply-created'],
				5
			) ||
			!validProgram(
				v.roomProgram,
				ROOM_BLOCKS.map((item) => item.id),
				4
			)
		)
			invalidContext();
		work.task = STEPS[v.step];
		work.openHints = HINTS.slice(0, v.hints);
		work.code =
			v.step === 5
				? [
						...ROOM_FRAME.opening,
						...v.roomProgram.flatMap((id) =>
							ROOM_BLOCKS.find((item) => item.id === id).lines.map((line) => line.text)
						),
						...ROOM_FRAME.closing
					].join('\n')
				: programCode('tekst', v.step < 3 ? PILOT_START : v.program);
		if (v.step === 0 || v.step === 2)
			work.viewedStep = frameInfo(
				selected(walkthroughCase('tekst', PILOT_START, v.caseId).frames, v.frame)
			);
		work.limit =
			'Egen testtekst, refleksjon og selvvurdering er ikke delt. Ikke påstå at du har lest dem eller at en kjøring er bestått.';
	} else if (page.kind === 'quiz') {
		const q = backendQuestions.find((item) => item.id === v.questionId);
		work.task = v.summary
			? { title: 'Oppsummering av øving 1–10' }
			: {
					title: q.title,
					prompt: q.prompt,
					code: q.code,
					choices: q.choices.map((choice) => choice.text)
				};
		if (!v.summary && (v.revealed || (v.last >= 0 && v.last === v.selected)))
			work.visibleFeedback = q.choices[v.revealed ? q.correct : v.last].feedback;
	} else if (page.kind === 'challenge') {
		work.limit =
			'Bare arbeidsfasen er delt. Gi generell metodehjelp. Ikke gjett oppgavetekst, scenario, riktige svar eller vurderingskriterier.';
	}
	return work;
}
