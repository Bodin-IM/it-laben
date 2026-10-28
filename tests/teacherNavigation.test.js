import test from 'node:test';
import assert from 'node:assert/strict';
import { teacherLanding } from '../src/lib/teacherNavigation.js';

const url = (path) => new URL(path, 'https://it-laben.test');

test('lærere og administratorer starter i undervisning fra den vanlige forsiden', () => {
	for (const role of ['teacher', 'admin'])
		assert.equal(teacherLanding(role, url('/')), '/laerer/undervisning/');
	for (const role of ['student', 'guest', 'unknown', '', null, undefined])
		assert.equal(teacherLanding(role, url('/')), null);
});

test('lærere beholder elevvisning, fagvalg, søk og ankere på forsiden', () => {
	for (const role of ['teacher', 'admin'])
		for (const path of [
			'/?visning=elev',
			'/?fag=utvikling',
			'/?sok=backend',
			'/?visning=elev&fag=driftsstotte',
			'/#moduler',
			'/?fag=utvikling#moduler'
		]) {
			const destination = url(path),
				original = destination.href;
			assert.equal(teacherLanding(role, destination), null);
			assert.equal(destination.href, original);
		}
});

test('direktelenker, læreroversikten og Min lab-innstillingene omdirigeres ikke', () => {
	for (const role of ['teacher', 'admin', 'student', undefined])
		for (const path of [
			'/min-lab/',
			'/min-lab/#profil',
			'/laerer/',
			'/laerer/undervisning/',
			'/laerer/elever/',
			'/moduler/meldingens-reise/',
			'/oving-5/?modul=data-og-lagring',
			'/backend/#fagsjekk'
		])
			assert.equal(teacherLanding(role, url(path)), null);
});
