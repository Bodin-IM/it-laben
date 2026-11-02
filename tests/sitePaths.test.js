import test from 'node:test';
import assert from 'node:assert/strict';
import { appPathname, siteHref } from '../src/lib/sitePaths.js';

test('site paths work at the origin root and below a project prefix', () => {
	for (const base of ['', '/it-laben']) {
		assert.equal(siteHref('/', base), `${base}/`);
		assert.equal(
			siteHref('/backend/?modul=backend#test', base),
			`${base}/backend/?modul=backend#test`
		);
		assert.equal(
			siteHref('/ressurser/utstyrsboden-start.zip', base),
			`${base}/ressurser/utstyrsboden-start.zip`
		);
		assert.equal(siteHref('/eksempler/lagre.mjs', base), `${base}/eksempler/lagre.mjs`);
		assert.equal(appPathname(`${base}/`, base), '/');
		assert.equal(appPathname(`${base}/backend/`, base), '/backend/');
	}
});

test('site paths keep query, fragment, external and already-prefixed links intact', () => {
	for (const href of [
		'#forsok',
		'?modul=backend',
		'https://example.com/backend/',
		'//example.com/backend/',
		'mailto:teacher@example.com',
		'relative-path/',
		'/it-laben/',
		'/it-laben/backend/?modul=backend#test',
		'/it-laben?fag=utvikling',
		'/it-laben#hovedinnhold',
		'',
		undefined,
		null
	]) {
		assert.equal(siteHref(href, '/it-laben'), href);
	}
	assert.equal(siteHref('/it-laben-extra/', '/it-laben'), '/it-laben/it-laben-extra/');
});

test('canonical paths strip only a complete deployment prefix', () => {
	assert.equal(appPathname('/it-laben', '/it-laben'), '/');
	assert.equal(appPathname('/it-laben/moduler/backend/', '/it-laben'), '/moduler/backend/');
	assert.equal(appPathname('/it-laben-extra/backend/', '/it-laben'), '/it-laben-extra/backend/');
	assert.equal(appPathname('/backend/', '/it-laben'), '/backend/');
});
