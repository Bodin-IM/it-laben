import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicNetworkProgress } from '../src/lib/publicNetworkProgress.js';
import { vlanTasks, initialVlanConfig } from '../src/lib/vlanLab.js';
import { vlan2Tasks } from '../src/lib/vlanLab2.js';
import { solveLab1, solveLab2 } from './helpers/networkLabs.js';

function browserStorage() {
	const data = new Map();
	return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('public network practice restores both labs from configurations without account progress', () => {
	const storage = browserStorage();
	const practice = createPublicNetworkProgress(() => storage);
	for (const task of vlanTasks) assert.deepEqual(practice.vlan1.save(task.id, solveLab1(task)), { saved: true, persisted: true });
	for (const task of vlan2Tasks) assert.deepEqual(practice.vlan2.save(task.id, solveLab2(task)), { saved: true, persisted: true });
	const reopened = createPublicNetworkProgress(() => storage);
	assert.equal(reopened.vlan1.load().tasks.length, vlanTasks.length, 'all prerequisites remain available after reopening');
	assert.equal(reopened.vlan2.load().tasks.length, vlan2Tasks.length);
	assert.ok(reopened.vlan1.load().tasks.every((task) => task.result.passed));
	assert.ok(reopened.vlan2.load().tasks.every((task) => task.result.passed));
	assert.ok([...storage.data.keys()].every((key) => key.startsWith('it-laben-public:network:v1:')));
	assert.ok([...storage.data.values()].every((json) => !json.includes('passedAt') && !json.includes('xp')));
});

test('public practice keeps the last passing configuration when a later attempt fails or is edited', () => {
	const storage = browserStorage(), practice = createPublicNetworkProgress(() => storage);
	const task = vlanTasks[0], solved = solveLab1(task);
	practice.vlan1.save(task.id, solved);
	solved.ips.pc2 = '';
	assert.deepEqual(practice.vlan1.save(task.id, solved), { saved: false, persisted: false });
	const restored = practice.vlan1.load().tasks[0];
	assert.equal(restored.result.passed, true);
	assert.notEqual(restored.config.ips.pc2, '');
	restored.config.ips.pc2 = '';
	assert.equal(practice.vlan1.load().tasks[0].result.passed, true, 'open edits do not mutate the stored pass');
});

test('public practice rechecks restored configurations and ignores damaged browser data', () => {
	const storage = browserStorage(), practice = createPublicNetworkProgress(() => storage);
	practice.vlan1.save(vlanTasks[0].id, solveLab1(vlanTasks[0]));
	const key = [...storage.data.keys()][0];
	storage.setItem(key, '{broken');
	assert.deepEqual(practice.vlan1.load(), { tasks: [], persisted: true, ignored: true });
	storage.setItem(key, JSON.stringify({
		[vlanTasks[0].id]: { ...initialVlanConfig(vlanTasks[0]), passed: true },
		[vlanTasks[1].id]: { ips: { pc1: 123 }, switches: {} },
		unknown: { passed: true }
	}));
	assert.equal(practice.vlan1.load().tasks.length, 0, 'stored pass flags cannot unlock a task');
	assert.equal(practice.vlan1.load().ignored, true);
	const valid = solveLab1(vlanTasks[0]);
	storage.setItem(key, JSON.stringify({ [vlanTasks[0].id]: valid, [vlanTasks[1].id]: null }));
	assert.equal(practice.vlan1.load().tasks.length, 1, 'one damaged task does not erase other valid work');
	const second = vlan2Tasks[0];
	practice.vlan2.save(second.id, solveLab2(second));
	const secondKey = [...storage.data.keys()].find((item) => item.endsWith('vlan-lab-2'));
	const invalid = solveLab2(second);
	invalid.router.interfaces = null;
	storage.setItem(secondKey, JSON.stringify({ [second.id]: invalid }));
	assert.equal(practice.vlan2.load().tasks.length, 0);
	assert.equal(practice.vlan2.load().ignored, true);
});

test('blocked browser storage allows local navigation without claiming persistence', () => {
	const practice = createPublicNetworkProgress(() => { throw new Error('Storage blocked'); });
	assert.equal(practice.vlan1.load().persisted, false);
	for (const task of vlanTasks) assert.deepEqual(practice.vlan1.save(task.id, solveLab1(task)), { saved: true, persisted: false });
	assert.equal(practice.vlan1.load().tasks.length, vlanTasks.length);
	assert.equal(practice.vlan1.load().persisted, false);
	assert.equal(createPublicNetworkProgress(() => null).vlan1.load().tasks.length, 0, 'a fresh page cannot restore memory-only passes');
});

test('quota failure retains new passes and retries durable storage on the next check', () => {
	const storage = browserStorage();
	let full = false;
	const practice = createPublicNetworkProgress(() => ({
		getItem: storage.getItem,
		setItem(key, value) { if (full) throw new Error('Quota exceeded'); storage.setItem(key, value); }
	}));
	practice.vlan1.save(vlanTasks[0].id, solveLab1(vlanTasks[0]));
	full = true;
	assert.equal(practice.vlan1.save(vlanTasks[1].id, solveLab1(vlanTasks[1])).persisted, false);
	assert.equal(practice.vlan1.load().tasks.length, 2);
	assert.equal(createPublicNetworkProgress(() => storage).vlan1.load().tasks.length, 1);
	full = false;
	assert.equal(practice.vlan1.save(vlanTasks[1].id, solveLab1(vlanTasks[1])).persisted, true);
	assert.equal(createPublicNetworkProgress(() => storage).vlan1.load().tasks.length, 2);
});
