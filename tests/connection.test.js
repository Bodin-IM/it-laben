import test from 'node:test';
import assert from 'node:assert/strict';
import {
	isPublicHttp,
	parseConnectionConfig,
	checkHttps,
	resolveHttpsOrigin,
	secureHref,
	initializeConnection,
	connection
} from '../src/lib/connection.js';
import { get } from 'svelte/store';

test('lenker til sikker visning beholder valgt vertsnavn og riktig HTTPS-port', () => {
	for (const address of [
		'https://10.100.0.14',
		'https://10.100.0.14:8443',
		'https://itlab.im.local'
	]) {
		assert.equal(resolveHttpsOrigin('https://itlab.im.local', new URL(address)), address);
	}
	assert.equal(
		resolveHttpsOrigin('https://itlab.im.local', new URL('http://10.100.0.14:8080')),
		'https://10.100.0.14'
	);
	assert.equal(
		resolveHttpsOrigin('https://itlab.im.local:8443', new URL('http://10.100.0.14:8080')),
		'https://10.100.0.14:8443'
	);
	assert.equal(
		resolveHttpsOrigin('https://itlab.im.local', new URL('http://itlab.im.local')),
		'https://itlab.im.local'
	);
	assert.equal(
		secureHref('https://10.100.0.14', '/laerer/?aktivitet=chat'),
		'https://10.100.0.14/laerer/?aktivitet=chat'
	);
});

test('HTTP via IP blir på HTTP og undersøker HTTPS via IP selv om metadata bruker DNS', async (t) => {
	const requests = [];
	const location = new URL('http://10.100.0.14/spill/redd-chatten/');
	const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
	Object.defineProperty(globalThis, 'window', { configurable: true, value: { location } });
	t.after(() => {
		if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
		else delete globalThis.window;
	});
	t.mock.method(globalThis, 'fetch', async (url, options) => {
		requests.push({ url, options });
		return Response.json(
			url === '/itlab-config.json'
				? { httpsOrigin: 'https://itlab.im.local', caSha256: 'ab'.repeat(32) }
				: { ok: true }
		);
	});
	const dispose = initializeConnection();
	t.after(dispose);
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(location.href, 'http://10.100.0.14/spill/redd-chatten/');
	assert.equal(get(connection).publicHttp, true);
	assert.equal(get(connection).httpsOrigin, 'https://10.100.0.14');
	assert.equal(get(connection).probe, 'reachable');
	assert.deepEqual(
		requests.map((item) => item.url),
		['/itlab-config.json', 'https://10.100.0.14/tilkobling.json']
	);
	assert.equal(requests[1].options.credentials, 'omit');
});

test('HTTP-visning: skoleadresse og IP bruker ingen backend, mens HTTPS og lokal utvikling støttes', () => {
	for (const hostname of ['itlab.im.local', '10.100.0.14']) {
		assert.equal(isPublicHttp({ protocol: 'http:', hostname }), true);
		assert.equal(isPublicHttp({ protocol: 'https:', hostname }), false);
	}
	for (const hostname of ['localhost', '127.0.0.1', '[::1]', 'terminal.local'])
		assert.equal(isPublicHttp({ protocol: 'http:', hostname }), false);
});
test('offentlig konfigurasjon: bare en HTTPS-origin uten innloggingsdata og et gyldig sertifikatfingeravtrykk godtas', () => {
	assert.deepEqual(
		parseConnectionConfig({ httpsOrigin: 'https://itlab.im.local', caSha256: 'ab'.repeat(32) }),
		{ httpsOrigin: 'https://itlab.im.local', caSha256: 'AB'.repeat(32) }
	);
	assert.equal(
		parseConnectionConfig({ httpsOrigin: 'https://itlab.im.local:8443/' }).httpsOrigin,
		'https://itlab.im.local:8443'
	);
	for (const httpsOrigin of [
		'http://itlab.im.local',
		'javascript:alert(1)',
		'https://user:secret@itlab.im.local',
		'https://itlab.im.local/path',
		'https://itlab.im.local/?key=secret',
		'https://itlab.im.local/#secret'
	])
		assert.throws(() => parseConnectionConfig({ httpsOrigin }));
	assert.throws(() =>
		parseConnectionConfig({ httpsOrigin: 'https://itlab.im.local', caSha256: 'invalid' })
	);
});
test('HTTPS-kontroll: ingen cookies eller brukerdata sendes, og bare forventet statisk svar godtas', async () => {
	let seen;
	const result = await checkHttps('https://itlab.im.local', async (url, options) => {
		seen = { url, options };
		return Response.json({ ok: true });
	});
	assert.equal(result, true);
	assert.equal(seen.url, 'https://itlab.im.local/tilkobling.json');
	assert.equal(seen.options.credentials, 'omit');
	assert.equal(seen.options.mode, 'cors');
	assert.equal(seen.options.redirect, 'error');
	assert.equal(seen.options.body, undefined);
	for (const response of [
		Response.json({ user: { id: 'unexpected' } }),
		Response.json({ ok: true }, { status: 503 }),
		new Response('<html>Welcome</html>')
	])
		assert.equal(await checkHttps('https://itlab.im.local', async () => response), false);
});
test('HTTPS-kontroll: nettverks- og sertifikatfeil gir en ubekreftet forbindelse, uten forsøk på å omgå TLS', async () => {
	assert.equal(
		await checkHttps('https://itlab.im.local', async () => {
			throw new TypeError('TLS or network error');
		}),
		false
	);
	let contacted = false;
	assert.equal(
		await checkHttps('http://itlab.im.local', async () => {
			contacted = true;
			return Response.json({ ok: true });
		}),
		false
	);
	assert.equal(contacted, false);
});
