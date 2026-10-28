import test from 'node:test';
import assert from 'node:assert/strict';
import { moduleContext, moduleLink } from '../src/lib/moduleNavigation.js';
import { entries, load } from '../src/routes/moduler/[slug]/+page.js';

test('modulens øvinger får en tilbakevei til riktig del', () => {
	assert.equal(moduleLink('/oving-5/', 'data-og-lagring'), '/oving-5/?modul=backend');
	assert.equal(moduleContext('/oving-5/', 'data-og-lagring').backHref, '/moduler/backend/#del-6');
});
test('gjennomgang og oppgitte repetisjonsressurser beholder sin modul', () => {
	assert.equal(moduleContext('/backend/', 'meldingens-reise').backHref, '/moduler/backend/#del-2');
	assert.equal(moduleContext('/backend/', 'data-og-lagring').backHref, '/moduler/backend/#del-2');
});
test('gamle driftlenker og direkte Øving 10-lenker viser riktig del av Backend', () => {
	assert.ok(entries().some(({ slug }) => slug === 'fra-kode-til-drift'));
	assert.throws(() => load({ params: { slug: 'fra-kode-til-drift' } }), {
		status: 307,
		location: '/moduler/backend/#del-16'
	});
	for (const id of [null, 'backend', 'fra-kode-til-drift', 'data-og-lagring']) {
		const context = moduleContext('/oving-10/', id);
		assert.equal(context.module.id, 'backend');
		assert.equal(context.backHref, '/moduler/backend/#del-16');
	}
	assert.equal(
		moduleLink('/oving-10/?modul=fra-kode-til-drift', 'fra-kode-til-drift'),
		'/oving-10/?modul=backend'
	);
});
test('ukjent eller feil modul kan ikke vises som tilhørighet', () => {
	assert.equal(moduleContext('/oving-5/', 'ukjent'), null);
	assert.equal(moduleContext('/oving-10/', 'databaser'), null);
	assert.equal(moduleContext('/min-lab/', 'data-og-lagring'), null);
	assert.equal(moduleContext('/oving-5/', null).module.id, 'backend');
	assert.equal(moduleContext('/min-lab/', null), null);
	assert.equal(moduleLink('/oving-10/?modul=databaser', 'databaser'), '/oving-10/');
});
test('lenker bevarer andre parametre og ankre, men påfører aldri modulkontekst til eksterne sider', () => {
	assert.equal(
		moduleLink('/oving-5/?test=1#forsok', 'data-og-lagring'),
		'/oving-5/?test=1&modul=backend#forsok'
	);
	assert.equal(
		moduleLink('https://example.org/oving-5/', 'data-og-lagring'),
		'https://example.org/oving-5/'
	);
	assert.equal(moduleLink('//example.org/oving-5/', 'data-og-lagring'), '//example.org/oving-5/');
});
