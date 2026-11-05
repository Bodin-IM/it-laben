import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/database.js';
import { readConfig } from '../server/config.js';
import { createApp } from '../server/app.js';

test('shared VLAN API: membership, consent, atomic ports, saved drafts and restart', async (t) => {
	const directory = mkdtempSync(join(tmpdir(), 'it-lab-vlan-together-'));
	const filename = join(directory, 'lab.sqlite'), config = readConfig({});
	let db = openDatabase(filename), now = Date.now(), server, base;
	async function start() {
		server = createApp({ db, config, limits: false, clock: () => now }).listen(0, '127.0.0.1');
		await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}/api`;
	}
	async function stop() { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
	await start();
	t.after(async () => { await stop(); db.close(); rmSync(directory, { recursive: true, force: true }); });
	async function call(user, path, body, headers = {}) {
		const response = await fetch(base + path, {
			method: body === undefined ? 'GET' : 'POST',
			headers: { Cookie: user?.cookie ?? '', Origin: config.origin, 'Content-Type': 'application/json', 'X-CSRF-Token': user?.csrf ?? '', 'X-Lab-Account': user?.id ?? '', ...headers },
			body: body === undefined ? undefined : JSON.stringify(body)
		});
		return { status: response.status, data: await response.json(), cookie: response.headers.getSetCookie()[0]?.split(';')[0] };
	}
	async function account(role = 'student') {
		const created = await call(null, '/auth/create', {}); assert.equal(created.status, 201);
		const user = { id: created.data.user.id, csrf: created.data.csrfToken, cookie: created.cookie };
		if (role !== 'student') db.prepare('INSERT INTO user_roles VALUES (?,?,?)').run(user.id, role, now);
		return user;
	}
	const teacher = await account('teacher'), a = await account(), b = await account(), c = await account(), outsider = await account();
	const root = '/vlan-together';
	assert.equal((await call(null, `${root}/rooms`)).status, 401);
	assert.equal((await call(a, `${root}/rooms`, { title: 'Elevrom' })).status, 403);
	const created = await call(teacher, `${root}/rooms`, { title: 'Nettverk sammen' });
	assert.equal(created.status, 201);
	const initial = created.data, path = `${root}/rooms/${initial.id}`;
	const joinRoom = async (user) => (await call(user, `${root}/join`, { roomId: initial.id })).data;
	const ar = await joinRoom(a), br = await joinRoom(b), cr = await joinRoom(c);
	const owned = (room, kind) => room.devices.find((d) => d.owner === room.me && d.kind === kind);
	const as = owned(ar, 'switch'), bs = owned(br, 'switch'), cs = owned(cr, 'switch'), ap = owned(ar, 'pc'), bp = owned(br, 'pc');
	const run = (user, body, requestId = randomUUID(), headers) => call(user, `${path}/commands`, { ...body, requestId }, headers);
	const read = async (user = a) => (await call(user, path)).data;
	const configure = (user, device, patch = {}) => run(user, { action: 'configure', deviceId: device.id, revision: device.revision, name: device.name, config: device.config, ...patch });
	let addId, acceptedId, acceptedRequest;

	await t.test('signed-in students discover room metadata and join by selection without a code', async () => {
		const listing = await call(outsider, `${root}/rooms`);
		assert.equal(listing.status, 200);
		const row = listing.data.rooms.find((r) => r.id === initial.id);
		assert.deepEqual(Object.keys(row).sort(), ['id', 'joined', 'participants', 'paused', 'teacherName', 'title']);
		assert.equal(row.title, 'Nettverk sammen'); assert.equal(row.participants, 4);
		assert.equal(row.joined, false); assert.equal(row.paused, false);
		assert.equal((await call(a, `${root}/rooms`)).data.rooms.find((r) => r.id === initial.id).joined, true);
		assert.equal((await call(outsider, path)).status, 404, 'listing metadata does not grant access to the board');
		assert.equal(Object.hasOwn(initial, 'code'), false);
		assert.equal((await call(outsider, `${root}/join`, { code: 'ABC123' })).status, 400);
		assert.equal((await call(outsider, `${root}/join`, { roomId: randomUUID() })).status, 404);
	});

	await t.test('boards require membership and mutations enforce owner, account, CSRF and Origin', async () => {
		assert.equal((await call(outsider, path)).status, 404);
		assert.equal((await call(a, path, undefined, { 'X-Lab-Account': b.id })).status, 409);
		assert.equal((await run(a, { action: 'add', kind: 'pc' }, randomUUID(), { 'X-CSRF-Token': 'wrong' })).status, 403);
		assert.equal((await run(a, { action: 'add', kind: 'pc' }, randomUUID(), { Origin: 'https://other.invalid' })).status, 403);
		assert.equal((await configure(b, ap)).status, 403);
		assert.equal((await run(a, { action: 'connect', source: as.id, port: 'eth1', target: bs.id, targetPort: 'eth1' })).status, 403, 'cross-owner cables require consent');
		assert.equal((await call(b, `${path}/ping`, { from: ap.id, to: bp.id })).status, 403);
		assert.equal((await joinRoom(a)).me, ar.me);
		assert.equal((await read()).devices.filter((d) => d.owner === ar.me).length, 2, 'rejoining does not add starting devices');
		assert.equal(new Set(cr.devices.filter((d) => d.kind === 'pc').map((d) => d.config.ip)).size, 4);
		const other = (await call(teacher, `${root}/rooms`, { title: 'Et annet rom' })).data;
		await call(outsider, `${root}/join`, { roomId: other.id });
		assert.equal((await run(a, { action: 'request', source: as.id, port: 'eth1', target: other.devices[0].id })).status, 409);
		assert.equal((await call(outsider, path)).status, 404);
	});

	await t.test('existing rooms survive the documentation migration with empty defaults', async () => {
		const before = await read();
		await stop();
		// Recreate the previous member schema around a populated room, then run the real migration.
		db.exec('ALTER TABLE vlan_members DROP COLUMN area_name; ALTER TABLE vlan_members DROP COLUMN notes; ALTER TABLE vlan_members DROP COLUMN document_revision;');
		db.prepare('DELETE FROM migrations WHERE name=?').run('018_vlan_documentation.sql');
		db.exec('DROP TABLE vlan_pings');
		db.prepare('DELETE FROM migrations WHERE name=?').run('019_vlan_pings.sql');
		db.close(); db = openDatabase(filename); await start();
		const after = await read();
		assert.deepEqual(after.pings, []);
		assert.deepEqual(after.devices, before.devices); assert.deepEqual(after.links, before.links);
		assert.deepEqual(after.members.map((m) => m.id), before.members.map((m) => m.id));
		assert.ok(after.members.every((m) => m.areaName === '' && m.notes === '' && m.documentRevision === 0));
	});

	await t.test('documentation is shared only inside the room, owned, revisioned and retry-safe', async () => {
		const before = await read(), requestId = randomUUID();
		const body = { action: 'document', revision: 0, areaName: '  Pakkeparadiset  ', notes: 'VLAN 10\neth1: trunk til naboen. <b>Ren tekst</b>' };
		const first = await run(a, body, requestId);
		assert.equal(first.status, 200);
		assert.equal(first.data.revision, before.revision, 'notes do not invalidate a network ping');
		const saved = first.data.members.find((m) => m.id === ar.me);
		assert.equal(saved.areaName, 'Pakkeparadiset'); assert.equal(saved.notes, body.notes); assert.equal(saved.documentRevision, 1);
		assert.deepEqual((await read(b)).members.find((m) => m.id === ar.me), saved);
		assert.equal((await run(a, body, requestId)).data.members.find((m) => m.id === ar.me).documentRevision, 1);
		assert.equal((await run(a, { ...body, notes: 'Gammelt utkast' })).status, 409);
		assert.equal((await run(a, { ...body, notes: 'Annen handling' }, requestId)).status, 409);
		for (const patch of [{ areaName: 'x'.repeat(41) }, { areaName: 'To\nlinjer' }, { notes: null }, { notes: 'x'.repeat(2001) }]) {
			assert.equal((await run(a, { ...body, revision: 1, ...patch })).status, 400);
		}
		assert.equal((await run(outsider, body)).status, 404);
		// Forging the member/owner cannot overwrite A's document; B can only save B's own.
		assert.equal((await run(b, { ...body, memberId: ar.me, owner: ar.me, areaName: 'Ruterriket', notes: 'Vårt eget oppsett' })).status, 200);
		assert.deepEqual((await read()).members.find((m) => m.id === ar.me), saved);
		assert.equal((await read()).members.find((m) => m.id === br.me).areaName, 'Ruterriket');
		const listing = await call(outsider, `${root}/rooms`);
		assert.equal(JSON.stringify(listing.data).includes('Pakkeparadiset'), false);
		assert.equal(JSON.stringify(listing.data).includes(body.notes), false);
	});

	await t.test('cables end on switches or routers; a PC can start a local cable', async () => {
		assert.equal((await run(a, { action: 'request', source: as.id, port: 'eth7', target: bp.id })).status, 400);
		assert.equal((await run(a, { action: 'connect', source: as.id, port: 'eth7', target: ap.id, targetPort: 'eth0' })).status, 400);
		const link = (await read()).links.find((l) => l.a === ap.id || l.b === ap.id);
		assert.equal((await run(a, { action: 'disconnect', id: link.id })).status, 200);
		assert.equal((await run(a, { action: 'request', source: ap.id, port: 'eth0', target: bs.id })).status, 400);
		assert.equal((await run(a, { action: 'connect', source: ap.id, port: 'eth0', target: as.id, targetPort: 'eth0' })).status, 200);
	});

	await t.test('configuration revisions preserve newer work and reject invalid input', async () => {
		assert.equal((await configure(a, ap, { name: 'Arbeids-PC' })).status, 200);
		assert.equal((await configure(a, ap, { name: 'Gammelt utkast' })).status, 409);
		const stored = (await read()).devices.find((d) => d.id === ap.id);
		assert.equal(stored.name, 'Arbeids-PC');
		assert.equal((await configure(a, stored, { config: { ip: '10.10.10.255', gateway: '' } })).status, 400);
		assert.deepEqual((await read()).devices.find((d) => d.id === ap.id), stored);
	});

	await t.test('recipient chooses its own free port; acceptance and retries create exactly one cable', async () => {
		const sent = await run(a, { action: 'request', source: as.id, port: 'eth1', target: bs.id });
		assert.equal(sent.status, 200); acceptedRequest = sent.data.requests[0].id;
		assert.equal((await read(c)).requests.length, 0, 'uninvolved members do not see pending requests');
		assert.equal((await read(b)).requests.length, 1);
		assert.equal((await run(a, { action: 'respond', id: acceptedRequest, accept: true, targetPort: 'eth1' })).status, 403);
		assert.equal((await run(b, { action: 'respond', id: acceptedRequest, accept: true, targetPort: 'eth0' })).status, 409, 'occupied destination port is rejected without consuming request');
		assert.equal((await read(b)).requests.length, 1);
		acceptedId = randomUUID();
		const body = { action: 'respond', id: acceptedRequest, accept: true, targetPort: 'eth1' };
		const [first, retry] = await Promise.all([run(b, body, acceptedId), run(b, body, acceptedId)]);
		assert.equal(first.status, 200); assert.equal(retry.status, 200);
		const connected = await read();
		assert.equal(connected.links.filter((l) => l.a === as.id && l.b === bs.id).length, 1);
		assert.equal(connected.requests.length, 0);
		const ping = await call(a, `${path}/ping`, { from: ap.id, to: bp.id });
		assert.equal(ping.data.ok, true); assert.equal(ping.data.revision, connected.revision);
		assert.equal((await call(b, `${path}/ping`, { from: bp.id, to: ap.id })).data.ok, true);
	});

	await t.test('shared ping is room-scoped, bounded, retry-safe and invalidated by network edits', async () => {
		const before = await read(), requestId = randomUUID();
		const body = { from: ap.id, to: bp.id, requestId };
		assert.equal((await call(outsider, `${path}/ping`, body)).status, 404);
		assert.equal((await call(b, `${path}/ping`, body)).status, 403);
		assert.equal((await call(a, `${path}/ping`, { ...body, to: as.id })).status, 400);
		const sent = await call(a, `${path}/ping`, body);
		assert.equal(sent.status, 200); assert.equal(sent.data.ok, true);
		assert.equal(sent.data.serverNow, now);
		assert.equal(sent.data.startsAt, now + 2800);
		assert.ok(sent.data.steps.some((step) => step.phase === 'request'));
		assert.ok(sent.data.steps.some((step) => step.phase === 'reply'));
		const observed = await read(c);
		assert.equal(observed.revision, before.revision, 'ping never changes the network');
		assert.equal(observed.pings[0].id, sent.data.id);
		assert.equal(observed.pings[0].by, ar.me, 'only the room member ID is shared');
		assert.equal((await call(a, `${path}/ping`, body)).data.id, sent.data.id);
		assert.equal((await read()).pings.length, 1, 'retry does not rebroadcast');
		assert.equal((await call(a, `${path}/ping`, { ...body, to: owned(cr, 'pc').id })).status, 409);
		assert.equal((await call(a, `${path}/ping`, { ...body, requestId: randomUUID() })).status, 429);
		const other = (await call(teacher, `${root}/rooms`, { title: 'Annet rom' })).data;
		assert.deepEqual(other.pings, []);
		assert.equal((await call(teacher, `${root}/rooms/${other.id}/ping`, body)).status, 404);
		const member = before.members.find((m) => m.id === br.me);
		const documented = await run(b, { action: 'document', revision: member.documentRevision, areaName: member.areaName, notes: 'Returveien er undersøkt.' });
		assert.equal(documented.status, 200); assert.equal(documented.data.pings[0].id, sent.data.id);
		now = sent.data.startsAt + sent.data.duration;
		assert.equal((await call(a, `${path}/ping`, { ...body, requestId: randomUUID() })).status, 200);
		const paused = await run(teacher, { action: 'pause', paused: true });
		assert.deepEqual(paused.data.pings, [], 'events for the old revision are not replayed');
		assert.equal((await call(a, `${path}/ping`, { ...body, requestId: randomUUID() })).status, 409);
		await run(teacher, { action: 'pause', paused: false });
		now += 30000;
		assert.deepEqual((await read()).pings, []);
		assert.equal(db.prepare('SELECT COUNT(*) AS n FROM vlan_pings WHERE room_id=?').get(initial.id).n, 0);
	});

	await t.test('simultaneous acceptance cannot reuse a port, and a redundant switch loop is rejected', async () => {
		const qa = (await run(a, { action: 'request', source: as.id, port: 'eth2', target: cs.id })).data.requests[0];
		const qb = (await run(b, { action: 'request', source: bs.id, port: 'eth2', target: cs.id })).data.requests[0];
		const outcomes = await Promise.all([qa, qb].map((q) => run(c, { action: 'respond', id: q.id, accept: true, targetPort: 'eth1' })));
		assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 409]);
		const remaining = (await read(c)).requests[0];
		const loop = await run(c, { action: 'respond', id: remaining.id, accept: true, targetPort: 'eth2' });
		assert.equal(loop.status, 409); assert.match(loop.data.error.message, /STP/);
		assert.equal((await run(c, { action: 'respond', id: remaining.id, accept: false })).status, 200);
		const link = (await read()).links.find((l) => l.a === as.id && l.b === bs.id);
		assert.equal((await run(c, { action: 'disconnect', id: link.id })).status, 403);
	});

	await t.test('pending requests expire, can be cancelled and do not reserve source ports forever', async () => {
		const request = (await run(a, { action: 'request', source: as.id, port: 'eth3', target: bs.id })).data.requests[0];
		now += 5 * 60000 + 1;
		assert.equal((await read(b)).requests.length, 0);
		assert.equal((await run(b, { action: 'respond', id: request.id, accept: true, targetPort: 'eth3' })).status, 409);
		const fresh = await run(a, { action: 'request', source: as.id, port: 'eth3', target: bs.id });
		assert.equal(fresh.status, 200);
		assert.equal((await run(a, { action: 'respond', id: fresh.data.requests[0].id, accept: false })).status, 200);
		assert.equal((await read()).requests.length, 0);
	});

	await t.test('adding devices is idempotent, and only the room teacher can pause edits', async () => {
		addId = randomUUID();
		const before = (await read()).devices.length;
		const body = { action: 'add', kind: 'router', owner: br.me };
		const results = await Promise.all([run(a, body, addId), run(a, body, addId)]);
		assert.ok(results.every((r) => r.status === 200));
		const state = await read(); assert.equal(state.devices.length, before + 1);
		assert.equal(state.devices.find((d) => d.kind === 'router').owner, ar.me);
		assert.equal((await run(a, { ...body, kind: 'switch' }, addId)).status, 409);
		assert.equal((await run(a, { action: 'pause', paused: true })).status, 403);
		assert.equal((await run(teacher, { action: 'pause', paused: true })).status, 200);
		assert.equal((await run(a, { action: 'add', kind: 'pc' })).status, 409);
		assert.equal((await run(a, { action: 'document', revision: 1, areaName: 'Pause', notes: 'Endring under pause' })).status, 409);
		assert.equal((await call(outsider, `${root}/join`, { roomId: initial.id })).status, 409);
		const pausedMember = await call(a, `${root}/join`, { roomId: initial.id });
		assert.equal(pausedMember.status, 200, 'an existing member can reopen a paused room');
		assert.equal(pausedMember.data.me, ar.me); assert.equal(pausedMember.data.paused, true);
		assert.equal((await call(a, path)).status, 200);
		assert.equal((await run(teacher, { action: 'pause', paused: false })).status, 200);
	});

	await t.test('graphs and retry receipts survive restart; no XP is awarded', async () => {
		const before = await read(); await stop(); db.close(); db = openDatabase(filename); await start();
		const after = await read();
		assert.deepEqual(after.devices, before.devices); assert.deepEqual(after.links, before.links);
		assert.deepEqual(after.members, before.members);
		assert.equal(after.members.find((m) => m.id === ar.me).areaName, 'Pakkeparadiset');
		assert.equal((await run(a, { action: 'add', kind: 'router', owner: br.me }, addId)).data.devices.length, before.devices.length);
		assert.equal((await call(a, `${path}/ping`, { from: ap.id, to: bp.id })).data.ok, true);
		assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rewards').get().n, 0);
	});

	await t.test('device bounds, deliberate disconnects and account deletion preserve the remaining graph', async () => {
		let state = await read();
		while (state.devices.filter((d) => d.owner === ar.me).length < 8) {
			const added = await run(a, { action: 'add', kind: 'pc' }); assert.equal(added.status, 200); state = added.data;
		}
		assert.equal((await run(a, { action: 'add', kind: 'pc' })).status, 409);
		assert.equal((await run(a, { action: 'remove', deviceId: as.id })).status, 409, 'connected devices must be unplugged first');
		const link = state.links.find((l) => l.a === as.id && l.b === bs.id);
		assert.equal((await run(b, { action: 'disconnect', id: link.id })).status, 200, 'either endpoint owner may unplug');
		const cp = owned(cr, 'pc');
		assert.equal((await call(c, `${path}/ping`, { from: cp.id, to: ap.id, requestId: randomUUID() })).status, 200);
		db.prepare('DELETE FROM users WHERE id=?').run(c.id);
		assert.equal(db.prepare('SELECT COUNT(*) AS n FROM vlan_pings WHERE member_id=?').get(cr.me).n, 0);
		state = await read();
		assert.equal(state.members.some((m) => m.id === cr.me), false);
		assert.equal(state.devices.some((d) => d.owner === cr.me), false);
		assert.ok(state.links.every((l) => state.devices.some((d) => d.id === l.a) && state.devices.some((d) => d.id === l.b)));
		assert.equal(db.prepare('SELECT COUNT(*) AS n FROM vlan_commands WHERE member_id=?').get(cr.me).n, 0);
		assert.equal(JSON.stringify(state).includes(a.id), false, 'account IDs stay out of the shared board');
	});
});
