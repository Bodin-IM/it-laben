import test from 'node:test';
import assert from 'node:assert/strict';
import {
	evaluateCase,
	evaluateProgram,
	evaluateTextInput,
	walkthroughCase
} from '../src/lib/reddChatten.js';
import { PILOT_START, ROOM_START, ROOM_CASES, evaluateRoom } from '../src/lib/reddChattenPilot.js';

const repaired = ['normalize-text', 'guard-text', 'save-body', 'reply-created'];
const roomSolution = ['clean', 'guard', 'save', 'reply'];

test('pilotens startkode godtar vanlig tekst, men lagrer mellomrom', () => {
	assert.equal(evaluateCase('tekst', PILOT_START, 'vanlig').passed, true);
	const spaces = evaluateCase('tekst', PILOT_START, 'mellomrom');
	assert.equal(spaces.status, 201);
	assert.equal(spaces.passed, false);
	assert.equal(spaces.after.length, spaces.before.length + 1);
	assert.equal(spaces.after.at(-1).tekst, '   ');
});

test('egne data bruker samme kontrakt som alle seks innebygde tester', () => {
	const cases = [
		['vanlig', 'Hei, alle sammen!'],
		['tom', ''],
		['mellomrom', '   '],
		['luft-rundt', '  Er dere klare?  '],
		['mangler', undefined],
		['tall', 42]
	];
	for (const program of [
		PILOT_START,
		repaired,
		['save-body', 'normalize-text', 'guard-text', 'reply-created']
	]) {
		for (const [id, value] of cases) {
			const custom = evaluateTextInput(program, value, id === 'mangler');
			const fixed = evaluateCase('tekst', program, id);
			assert.equal(custom.passed, fixed.passed, `${program.join(',')}: ${id}`);
			assert.equal(custom.status, fixed.status);
			assert.equal(custom.after.length, fixed.after.length);
		}
	}
});

test('reparasjonen håndterer egne strenger, unicode, typefeil og manglende felt', () => {
	for (const value of ['', ' \t\n ', undefined, null, 0, 42, {}, []]) {
		const result = evaluateTextInput(repaired, value);
		assert.equal(result.passed, true);
		assert.equal(result.status, 400);
		assert.deepEqual(result.after, result.before);
	}
	for (const value of ['Hei', '  Æøå 🎮  ', '0', 'to ord']) {
		const result = evaluateTextInput(repaired, value);
		assert.equal(result.passed, true);
		assert.equal(result.after.at(-1).tekst, value.trim());
	}
	assert.equal(evaluateProgram('tekst', repaired).success, true);
});

test('400 etter push er fortsatt feil, og en feilkode alene gir ingen godkjenning', () => {
	const result = evaluateTextInput(
		['save-body', 'normalize-text', 'guard-text', 'reply-created'],
		'   '
	);
	assert.equal(result.status, 400);
	assert.equal(result.passed, false);
	assert.equal(result.after.length, result.before.length + 1);
	assert.equal(evaluateProgram('tekst', ['reject-all']).success, false);
});

test('stegvis visning og vurdering viser samme sluttdata uten å mutere snapshots', () => {
	for (const program of [PILOT_START, repaired]) {
		for (const caseId of ['vanlig', 'mellomrom', 'mangler']) {
			const walk = walkthroughCase('tekst', program, caseId);
			assert.deepEqual(walk.frames.at(-1).messages, walk.result.after);
			assert.equal(walk.frames.at(-1).status, walk.result.status);
			assert.equal(walk.frames[0].messages.length, 3);
		}
	}
});

test('romoppgaven krever status, ryddet navn, svarinnhold og uendrede data ved avvisning', () => {
	assert.equal(
		ROOM_CASES.every((item) => evaluateRoom(roomSolution, item.value).passed),
		true
	);
	assert.equal(
		ROOM_CASES.every((item) => evaluateRoom(ROOM_START, item.value).passed),
		false
	);
	const earlyWrite = evaluateRoom(['clean', 'save', 'guard', 'reply'], '   ');
	assert.equal(earlyWrite.status, 400);
	assert.equal(earlyWrite.rooms.length, 2);
	assert.equal(earlyWrite.passed, false);
	assert.equal(evaluateRoom(['reply', 'clean', 'guard', 'save'], 'Gaming').passed, false);
	assert.equal(evaluateRoom(['guard', 'clean', 'save', 'reply'], '   ').passed, false);
	assert.equal(evaluateRoom(['guard', 'save', 'reply'], '  Gaming  ').passed, false);
	assert.equal(evaluateRoom(['clean', 'guard'], 'Gaming').status, null);
});

test('romtolken tillater bare kjente unike blokker og nye forsøk bruker ferske data', () => {
	assert.throws(() => evaluateRoom(['save', 'save'], 'X'), TypeError);
	assert.throws(() => evaluateRoom(['eval'], 'X'), TypeError);
	const first = evaluateRoom(roomSolution, '  Spill  ');
	first.rooms[0].navn = 'Endret utenfor forsøket';
	const next = evaluateRoom(roomSolution, '\t\n');
	assert.deepEqual(next.rooms, [{ id: 1, navn: 'Generelt' }]);
	assert.equal(next.passed, true);
});
