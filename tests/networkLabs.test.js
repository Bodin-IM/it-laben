import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/database.js';
import { readConfig } from '../server/config.js';
import { createApp } from '../server/app.js';
import {
	networkLabSnapshot,
	checkNetworkLab,
	validateNetworkConfig
} from '../server/network-labs.js';
import { vlanTasks, initialVlanConfig } from '../src/lib/vlanLab.js';
import { vlan2Tasks } from '../src/lib/vlanLab2.js';
import { solveLab1, solveLab2 } from './helpers/networkLabs.js';

test('network lab API: real session, server gate, sequential validation, no XP and account isolation', async (t) => {
	const db = openDatabase(':memory:'),
		config = readConfig({});
	const server = createApp({ db, config, limits: false }).listen(0, '127.0.0.1');
	await once(server, 'listening');
	t.after(async () => {
		server.closeAllConnections();
		await new Promise((r) => server.close(r));
		db.close();
	});
	const base = `http://127.0.0.1:${server.address().port}`;
	let cookie = '',
		csrf = '',
		id = '';
	async function request(path, body, extra = {}) {
		const response = await fetch(base + '/api' + path, {
			method: body ? 'POST' : 'GET',
			headers: {
				Cookie: cookie,
				Origin: config.origin,
				'Content-Type': 'application/json',
				'X-CSRF-Token': csrf,
				...extra
			},
			body: body ? JSON.stringify(body) : undefined
		});
		return {
			status: response.status,
			value: await response.json(),
			cookie: response.headers.getSetCookie()[0]?.split(';')[0]
		};
	}
	assert.equal((await request('/network-labs/vlan-lab-2')).status, 401);
	const created = await request('/auth/create', {});
	cookie = created.cookie;
	csrf = created.value.csrfToken;
	id = created.value.user.id;
	const post = (labId, task, c, extra = {}) =>
		request(`/network-labs/${labId}/${task.id}/check`, {
			accountId: id,
			version: 1,
			config: c,
			...extra
		});
	assert.equal((await request('/network-labs/vlan-lab-2')).value.unlocked, false);
	assert.equal((await post('vlan-lab-2', vlan2Tasks[0], solveLab2(vlan2Tasks[0]))).status, 403);
	assert.equal((await post('vlan-lab', vlanTasks[5], solveLab1(vlanTasks[5]))).status, 403);
	assert.equal(
		(await post('vlan-lab', vlanTasks[0], solveLab1(vlanTasks[0]), { passed: true })).status,
		400
	);
	assert.equal(
		(await post('vlan-lab', vlanTasks[0], solveLab1(vlanTasks[0]), { accountId: 'other' })).status,
		409
	);
	const wrong = await post('vlan-lab', vlanTasks[0], initialVlanConfig(vlanTasks[0]));
	assert.equal(wrong.value.saved, false);
	assert.equal(wrong.value.tasks.length, 0);
	for (const task of vlanTasks) {
		const result = await post('vlan-lab', task, solveLab1(task));
		assert.equal(result.status, 200, JSON.stringify(result));
		assert.equal(result.value.saved, true, task.id);
	}
	assert.equal((await request('/network-labs/vlan-lab-2')).value.unlocked, true);
	const oldCount = db.prepare('SELECT count(*) AS n FROM network_lab_passes').get().n;
	await post('vlan-lab', vlanTasks[0], solveLab1(vlanTasks[0]));
	assert.equal(db.prepare('SELECT count(*) AS n FROM network_lab_passes').get().n, oldCount);
	await post('vlan-lab', vlanTasks[0], initialVlanConfig(vlanTasks[0]));
	assert.equal(
		(await request('/network-labs/vlan-lab-2')).value.unlocked,
		true,
		'earned prerequisite survives later experimentation'
	);
	const path = '/network-labs/vlan-lab-2/gateway/check',
		body = { accountId: id, version: 1, config: solveLab2(vlan2Tasks[0]) };
	assert.equal((await request(path, body, { 'X-CSRF-Token': 'wrong' })).status, 403);
	assert.equal((await request(path, body, { Origin: 'https://other.invalid' })).status, 403);
	for (const task of vlan2Tasks) {
		const result = await post('vlan-lab-2', task, solveLab2(task));
		assert.equal(result.status, 200, JSON.stringify(result));
		assert.equal(result.value.saved, true, task.id);
	}
	const me = (await request('/me')).value;
	assert.equal(me.summary.xp, 0);
	assert.equal((await request('/network-labs/vlan-lab-2')).value.tasks.length, 5);
	assert.equal(networkLabSnapshot(db, 'another-profile', 'vlan-lab-2').unlocked, false);
	const before = JSON.stringify(networkLabSnapshot(db, id, 'vlan-lab-2'));
	assert.equal((await request(path, { ...body, config: { ips: {} } })).status, 400);
	assert.equal(JSON.stringify(networkLabSnapshot(db, id, 'vlan-lab-2')), before);
});
test('network labs: persisted passed configurations survive reopen and are deleted with the account', () => {
	const dir = mkdtempSync(join(tmpdir(), 'network-labs-')),
		file = join(dir, 'test.sqlite');
	let db = openDatabase(file);
	try {
		db.prepare('INSERT INTO users(id,nickname,created_at) VALUES (?,?,?)').run(
			'student',
			'Test-elev',
			1
		);
		for (const task of vlanTasks)
			checkNetworkLab(db, 'student', 'vlan-lab', task.id, {
				accountId: 'student',
				version: 1,
				config: solveLab1(task)
			});
		db.close();
		db = openDatabase(file);
		assert.equal(networkLabSnapshot(db, 'student', 'vlan-lab-2').unlocked, true);
		assert.deepEqual(
			networkLabSnapshot(db, 'student', 'vlan-lab').tasks.find((t) => t.taskId === 'ip').config,
			solveLab1(vlanTasks[0])
		);
		db.prepare('DELETE FROM users WHERE id=?').run('student');
		assert.equal(db.prepare('SELECT count(*) AS n FROM network_lab_passes').get().n, 0);
	} finally {
		db.close();
		rmSync(dir, { recursive: true });
	}
});
test('network labs: malformed, expanded and modified fixed configurations are rejected before simulation', () => {
	const first = vlanTasks[0],
		good = solveLab1(first);
	for (const mutate of [
		(c) => (c.switches.s1.ports.eth0.pvid = 9999),
		(c) => (c.switches.s1.ports.eth0.members['1'] = 'tagged'),
		(c) => (c.ips.pc1 = 'x'.repeat(100)),
		(c) => (c.switches.fake = {}),
		(c) => (c.switches.s1.vlans = Array(100).fill(1))
	]) {
		const c = structuredClone(good);
		mutate(c);
		assert.throws(() => validateNetworkConfig('vlan-lab', first, c));
	}
	const t = vlan2Tasks[0],
		c = solveLab2(t);
	c.router.allow['admin:ansatt'] = false;
	assert.throws(() => validateNetworkConfig('vlan-lab-2', t, c), /Tilgangsreglene/);
	const w = solveLab2(vlan2Tasks[2]);
	w.ssids.pc3 = '__proto__';
	assert.throws(() => validateNetworkConfig('vlan-lab-2', vlan2Tasks[2], w), /SSID/);
});
