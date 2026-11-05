import test from 'node:test';
import assert from 'node:assert/strict';
import { acknowledgeDevice, acknowledgeDocument, deviceDraftKey, documentDraftKey } from '../src/lib/vlanTogetherDrafts.js';

const device = { id: 'pc', owner: 'student', kind: 'pc', revision: 3, name: 'PC', config: { ip: '10.1.1.2', gateway: '' } };

test('autosave acknowledgements preserve typing and edits reverted during the request', () => {
	const sent = { ...device, name: 'Ny PC' }, saved = { ...sent, revision: 4 };
	for (const name of ['Fortsatt skriving', device.name]) {
		const current = { ...sent, name, config: { ip: '10.1.1.3', gateway: '' } };
		const next = acknowledgeDevice(current, sent, saved);
		assert.equal(deviceDraftKey(next), deviceDraftKey(current));
		assert.equal(next.revision, 4, 'the next save uses the acknowledged revision');
	}
	assert.deepEqual(acknowledgeDevice(device, sent, saved), { ...device, revision: 4 }, 'reverting to the old stored value is also a newer edit');
	assert.equal(device.revision, 3, 'the caller draft is not mutated');
});

test('acknowledged unchanged fields adopt server normalization without crossing devices or revisions', () => {
	const sent = { ...device, name: ' PC ' }, saved = { ...device, revision: 4 };
	assert.deepEqual(acknowledgeDevice(sent, sent, saved), saved);
	const other = { ...device, id: 'another-pc' };
	assert.equal(acknowledgeDevice(other, sent, saved), other);
	assert.equal(acknowledgeDevice(null, sent, saved), null);
	const newer = { ...device, revision: 5 };
	assert.equal(acknowledgeDevice(newer, sent, saved), newer, 'late replies cannot roll back a newer draft');
	assert.equal(acknowledgeDevice(sent, sent, { ...saved, revision: 6 }), sent, 'a retry snapshot containing another tab’s edit requires conflict handling');
});

test('notes keep text written during saving, including a return to the old text', () => {
	const sent = { areaName: ' Område ', notes: 'Første utkast', revision: 1 };
	const saved = { areaName: 'Område', notes: sent.notes, revision: 2 };
	assert.deepEqual(acknowledgeDocument(sent, sent, saved), saved);
	for (const notes of ['Neste setning', '']) {
		const current = { ...sent, notes };
		const next = acknowledgeDocument(current, sent, saved);
		assert.equal(documentDraftKey(next), documentDraftKey(current));
		assert.equal(next.revision, 2);
	}
	assert.equal(acknowledgeDocument(sent, sent, { ...saved, revision: 3 }), sent);
	assert.equal(acknowledgeDocument(saved, sent, saved), saved);
});
