import test from 'node:test';
import assert from 'node:assert/strict';
import { moduleContext, moduleLink } from '../src/lib/moduleNavigation.js';

test('modulens øvinger får en tilbakevei til riktig del', () => {
	assert.equal(moduleLink('/oving-5/', 'data-og-lagring'), '/oving-5/?modul=data-og-lagring');
	assert.equal(
		moduleContext('/oving-5/', 'data-og-lagring').backHref,
		'/moduler/data-og-lagring/#del-3'
	);
});
test('gjennomgang og oppgitte repetisjonsressurser beholder sin modul', () => {
	assert.equal(
		moduleContext('/backend/', 'meldingens-reise').backHref,
		'/moduler/meldingens-reise/#del-2'
	);
	assert.equal(
		moduleContext('/backend/', 'data-og-lagring').backHref,
		'/moduler/data-og-lagring/#forlop'
	);
});
test('ukjent eller feil modul kan ikke vises som tilhørighet', () => {
	assert.equal(moduleContext('/oving-5/', 'ukjent'), null);
	assert.equal(moduleContext('/oving-10/', 'data-og-lagring'), null);
	assert.equal(moduleContext('/min-lab/', 'data-og-lagring'), null);
	assert.equal(moduleContext('/oving-5/', null), null);
	assert.equal(moduleLink('/oving-10/?modul=data-og-lagring', 'data-og-lagring'), '/oving-10/');
});
test('lenker bevarer andre parametre og ankre, men påfører aldri modulkontekst til eksterne sider', () => {
	assert.equal(
		moduleLink('/oving-5/?test=1#forsok', 'data-og-lagring'),
		'/oving-5/?test=1&modul=data-og-lagring#forsok'
	);
	assert.equal(
		moduleLink('https://example.org/oving-5/', 'data-og-lagring'),
		'https://example.org/oving-5/'
	);
	assert.equal(moduleLink('//example.org/oving-5/', 'data-og-lagring'), '//example.org/oving-5/');
});
