import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrace, textError } from '../src/lib/ovingModel.js';
import { lessons } from '../src/lib/ovingene.js';

const defaults = (number) =>
	Object.fromEntries(lessons[number - 5].fields.map((f) => [f.key, f.value]));
const run = (number, values = {}) => buildTrace(number, { ...defaults(number), ...values });
const end = (number, values = {}) => run(number, values).at(-1);
const unchanged = (steps) => {
	for (const key of ['Minne · meldinger', 'Disk · meldinger.json']) {
		assert.deepEqual(steps.at(-1).data[key], steps[0].data[key], key + ' skal være uendret');
	}
};

test('alle valgbare forsøk gir selvstendige snapshots og forklarte kodelinjer', () => {
	for (const lesson of lessons) {
		const scenarios = lesson.fields.find((f) => f.key === 'scenario')?.choices ?? [{ value: '' }];
		for (const scenario of scenarios) {
			const trace = run(lesson.number, scenario.value ? { scenario: scenario.value } : {});
			assert.ok(trace.length >= 2);
			for (const step of trace) {
				assert.ok(step.title && step.text && step.file && step.status);
				assert.ok(
					step.code.length && step.code.every((line) => line.length === 2 && line.every(Boolean))
				);
			}
			const expected = JSON.stringify(trace.at(-1).data);
			trace[0].data.test = 'endret snapshot';
			assert.equal(JSON.stringify(trace.at(-1).data), expected);
		}
	}
});

test('lagring: midlertidig fil → datafil → minne → 201', () => {
	const trace = run(5);
	const temp = trace.find((s) => s.title === 'Skriv til den midlertidige filen');
	assert.equal(JSON.parse(temp.data['Midlertidig fil']).length, 3);
	assert.equal(JSON.parse(temp.data['Disk · meldinger.json']).length, 2);
	const disk = trace.find((s) => s.title === 'Erstatt datafilen');
	assert.equal(JSON.parse(disk.data['Disk · meldinger.json']).length, 3);
	assert.equal(disk.data['Minne · meldinger'].length, 2);
	assert.equal(trace.at(-1).data['Minne · meldinger'].length, 3);
	assert.equal(trace.at(-1).status, '201 Created');
	assert.ok(!trace.slice(0, -1).some((s) => s.status.startsWith('201')));
});

test('lagringsfeil og tom tekst bevarer gamle data', () => {
	unchanged(run(5, { scenario: 'fail' }));
	assert.match(end(5, { scenario: 'fail' }).status, /500/);
	unchanged(run(5, { text: '   ' }));
	assert.match(end(5, { text: '   ' }).status, /400/);
});

test('bare manglende fil gir tom liste; ødelagt fil beholdes', () => {
	assert.deepEqual(end(5, { scenario: 'missing' }).data['Minne · meldinger'], []);
	for (const scenario of ['broken', 'object']) {
		const trace = run(5, { scenario });
		assert.equal(trace.at(-1).data['Minne · meldinger'], null);
		assert.equal(
			trace.at(-1).data['Disk · meldinger.json'],
			trace[0].data['Disk · meldinger.json']
		);
		assert.match(trace.at(-1).status, /Oppstart feilet/);
	}
	assert.equal(end(5, { scenario: 'restart' }).data['Minne · meldinger'].length, 2);
});

test('PATCH treffer ID, bevarer metadata og oppdaterer frontend først ved GET', () => {
	const trace = run(6, { id: 'm2', text: '  Endret  ' });
	const before = trace[0].data['Minne · meldinger'];
	const saved = trace.find((s) => s.title === 'Ta i bruk listen og svar');
	assert.deepEqual(saved.data['Minne · meldinger'][0], before[0]);
	assert.deepEqual(saved.data['Minne · meldinger'][1], { ...before[1], tekst: 'Endret' });
	assert.deepEqual(saved.data['Nettleserens liste'], before);
	assert.deepEqual(trace.at(-1).data['Nettleserens liste'], saved.data['Minne · meldinger']);
});

test('DELETE fjerner bare valgt ID, krever ikke tekst og håndterer feil', () => {
	const result = end(6, { method: 'DELETE', id: 'm1', text: '' });
	assert.deepEqual(
		result.data['Minne · meldinger'].map((m) => m.id),
		['m2']
	);
	for (const method of ['PATCH', 'DELETE']) {
		unchanged(run(6, { method, id: 'ukjent' }));
		assert.match(end(6, { method, id: 'ukjent' }).status, /404/);
		unchanged(run(6, { method, disk: 'fail' }));
		assert.match(end(6, { method, disk: 'fail' }).status, /500/);
	}
});

test('tekstkontroll: type, trim, 500/501 og UTF-16', () => {
	assert.ok(textError(123));
	assert.ok(textError(null));
	assert.ok(textError(' \n '));
	assert.equal(textError(' ' + 'a'.repeat(500) + ' '), '');
	assert.ok(textError('a'.repeat(501)));
	assert.equal(textError('😀'.repeat(250)), '');
	assert.ok(textError('😀'.repeat(251)));
});

test('parser, validering, 404, lagringsfeil og nettverk gir riktig resultat uten dataendring', () => {
	for (const [scenario, status] of Object.entries({
		empty: '400',
		number: '400',
		501: '400',
		malformed: '400',
		large: '413',
		disk: '500',
		offline: 'Nettverksfeil',
		route: '404'
	})) {
		const trace = run(7, { scenario });
		assert.ok(trace.at(-1).status.startsWith(status), scenario);
		unchanged(trace);
	}
	assert.equal(end(7, { scenario: '500' }).data['Minne · meldinger'].length, 3);
	for (const body of [
		'null',
		'123',
		'"tekst"',
		'[]',
		'{}',
		'{"avsender":123,"tekst":"ok"}',
		'{"avsender":"' + 'a'.repeat(41) + '","tekst":"ok"}'
	]) {
		const trace = run(7, { scenario: 'custom', body });
		unchanged(trace);
		assert.match(trace.at(-1).status, /400/);
	}
});

test('tom JSON-body når valideringen; bare mellomrom feiler i parseren', () => {
	const empty = run(7, { scenario: 'custom', body: '' });
	assert.ok(empty.some((step) => step.title === 'Kontroller verdiene'));
	unchanged(empty);
	const whitespace = run(7, { scenario: 'custom', body: '   ' });
	assert.ok(!whitespace.some((step) => step.title === 'Kontroller verdiene'));
	unchanged(whitespace);
});

test('registrering oppretter bruker uten session og uten klartekstpassord', () => {
	const trace = run(8, { username: ' ADA ' });
	const result = trace.at(-1);
	assert.match(result.status, /201/);
	assert.equal(result.data['Disk · brukere.json'][0].brukernavn, 'ada');
	assert.deepEqual(result.data.Sessionlager, {});
	assert.equal(result.data['Nettleserens cookie'], null);
	assert.ok(!JSON.stringify(trace).includes(defaults(8).password));
	assert.match(end(8, { scenario: 'duplicate' }).status, /409/);
	for (const password of ['kort', 'æ'.repeat(37)]) assert.match(end(8, { password }).status, /400/);
});

test('innlogging, manglende cookie, utlogging og restart skiller brukerfil fra session', () => {
	assert.match(end(8, { scenario: 'wrong' }).status, /401/);
	assert.equal(end(8, { scenario: 'login' }).data['Frontend · meg'].id, 'u1');
	for (const scenario of ['nocookie', 'logout', 'restart']) {
		const result = end(8, { scenario });
		assert.match(result.status, /401/);
		assert.equal(result.data['Disk · brukere.json'].length, 1);
		if (scenario === 'nocookie') assert.equal(Object.keys(result.data.Sessionlager).length, 1);
		else assert.deepEqual(result.data.Sessionlager, {});
		if (scenario === 'logout') assert.equal(result.data['Nettleserens cookie'], null);
		else assert.ok(result.data['Nettleserens cookie']);
	}
});

test('tilgangsmatrisen: offentlig GET, 401 før oppslag, 404 før eiersjekk, 403 før endring', () => {
	for (const actor of ['ada', 'noah', 'guest'])
		assert.match(end(9, { actor, method: 'GET' }).status, /200/);
	for (const method of ['POST', 'PATCH', 'DELETE']) {
		const trace = run(9, { actor: 'guest', method, id: 'ukjent' });
		unchanged(trace);
		assert.match(trace.at(-1).status, /401/);
	}
	for (const method of ['PATCH', 'DELETE']) {
		let trace = run(9, { actor: 'noah', id: 'm1', method, text: '' });
		unchanged(trace);
		assert.match(trace.at(-1).status, /403/);
		trace = run(9, { actor: 'ada', id: 'ukjent', method });
		unchanged(trace);
		assert.match(trace.at(-1).status, /404/);
		assert.match(end(9, { actor: 'ada', id: 'm1', method }).status, /200/);
	}
});

test('falsk eier ignoreres både ved POST og PATCH', () => {
	const post = end(9, { actor: 'ada', method: 'POST', forge: 'yes' }).data['Minne · meldinger'].at(
		-1
	);
	assert.equal(post.eierId, 'ada');
	assert.equal(post.avsender, 'Ada');
	const patch = end(9, { actor: 'ada', method: 'PATCH', id: 'm1', forge: 'yes' }).data[
		'Minne · meldinger'
	][0];
	assert.equal(patch.eierId, 'ada');
	assert.equal(patch.avsender, 'Ada');
});

test('drift: frontend skal bygges/publiseres; prosessrestart bevarer data men tømmer sessions', () => {
	assert.equal(end(10, { scenario: 'source' }).data['Nettleseren ser'], 'Versjon 1');
	for (const framework of ['kit', 'vite']) {
		const result = end(10, { framework });
		assert.equal(result.data['Nettleseren ser'], 'Versjon 2');
		assert.ok(
			result.data['Lokalt frontendbygg'].includes(framework === 'kit' ? 'build/' : 'dist/')
		);
	}
	for (const scenario of ['restart', 'reboot']) {
		const result = end(10, { scenario });
		assert.equal(result.data['Disk · data/'], 'Meldinger og brukere bevart');
		assert.match(result.data.Sessionlager, /Tomt/);
	}
	assert.match(end(10, { scenario: 'backup' }).data['Disk · data/'], /melding B er ikke med/);
});
