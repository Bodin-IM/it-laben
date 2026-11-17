// Production UI smoke checks against the real API with disposable, synthetic data.
// Run after npm run build and npx playwright install chromium.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { openDatabase } from '../server/database.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
import { backendModuleExamples } from '../src/lib/backendModuleExamples.js';

const base = 'http://127.0.0.1:4173', output = 'test-results/browser-smoke';
await mkdir(output, { recursive: true });
const db = openDatabase(':memory:');
db.prepare("UPDATE module_publication SET status='active'").run();
const api = createApp({ db, config: readConfig({ APP_ORIGIN: base }), limits: false }).listen(3001, '127.0.0.1');
await once(api, 'listening');
const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'inherit' });
let browser;
const errors = [], checks = [];
const deadline = setTimeout(() => { console.error('Browser smoke timeout'); process.exit(1); }, 300000);
async function ready() {
	for (let i = 0; i < 100; i++) {
		if (preview.exitCode !== null) throw new Error('Preview exited before readiness');
		try { if ((await fetch(base)).ok) return; } catch { /* startup */ }
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error('Preview did not start');
}
async function actor(role = 'student', options = {}) {
	const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'], ...options });
	await context.addInitScript(() => localStorage.setItem('it-laben-experience-v1', JSON.stringify({ sound: false, companion: false, reduceMotion: true })));
	let user;
	if (role !== 'guest') {
		const response = await context.request.post(base + '/api/auth/create', { data: {}, headers: { Origin: base } });
		assert.equal(response.status(), 201);
		user = (await response.json()).user;
		if (role !== 'student') db.prepare('INSERT INTO user_roles VALUES (?,?,0)').run(user.id, role);
	}
	const page = await context.newPage();
	page.on('pageerror', (error) => errors.push(error.message));
	return { context, page, user };
}
async function go(page, path) {
	await page.goto(base + path);
	await page.locator('.feedback-launcher').waitFor();
}
async function noOverflow(page) {
	assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'page must not overflow horizontally');
}
try {
	await ready();
	browser = await chromium.launch({ headless: true });
	const student = await actor();
	const page = student.page;
	await go(page, '/oving-7/?modul=backend#eget-prosjekt');
	assert.equal(await page.locator('#eget-prosjekt').getAttribute('open'), '');
	assert.ok(await page.getByRole('heading', { name: 'Gi forståelige tilbakemeldinger i chatten' }).isVisible());
	for (const id of ['valider-melding', 'felles-feilbehandling', 'vis-feilmelding']) {
		const example = backendModuleExamples.find((item) => item.id === id);
		await page.locator(`.validation-next a[href*="eksempel=${id}"]`).click();
		await page.locator('#current-example').waitFor();
		assert.equal(await page.locator('#current-example').innerText(), example.title);
		for (const file of example.files) {
			await page.getByRole('link', { name: file.label, exact: true }).click();
			await page.getByRole('button', { name: 'Vis hele koden', exact: true }).waitFor();
			const line = page.locator('.annotated-code .line').first();
			await line.press('Enter');
			assert.equal(await line.getAttribute('aria-expanded'), 'true');
			await page.keyboard.press('Escape');
			assert.equal(await line.getAttribute('aria-expanded'), 'false');
			assert.ok(await line.evaluate((element) => element === document.activeElement));
			await page.getByRole('button', { name: 'Kopier utdrag', exact: true }).click();
			assert.ok((await page.evaluate(() => navigator.clipboard.readText())).length > 50);
			await page.getByRole('button', { name: 'Vis hele koden', exact: true }).click();
			await page.getByRole('button', { name: 'Kopier hele koden', exact: true }).click();
			assert.equal(await page.evaluate(() => navigator.clipboard.readText()), file.lines.map((line) => line.text).join('\n'));
			await page.getByRole('button', { name: 'Skjul resten av koden', exact: true }).click();
		}
		await page.reload();
		await page.locator('#current-example').waitFor();
		assert.equal(await page.locator('#current-example').innerText(), example.title);
		await page.locator('.source-link').click();
		await page.locator('#validation-project').waitFor();
		checks.push(`example ${id}: both files, explanations, focus, copy, reload, return`);
	}
	for (const role of ['guest', 'student', 'teacher', 'admin']) {
		const subject = role === 'student' ? student : await actor(role);
		await go(subject.page, role === 'admin' ? '/laerer/tilbakemeldinger/' : role === 'teacher' ? '/laerer/' : '/oving-7/');
		await subject.page.locator('.feedback-launcher').press('Enter');
		const dialog = subject.page.getByRole('dialog');
		await dialog.waitFor();
		const message = `Nettlesertest fra ${role}: knappen fungerer.`;
		await dialog.getByLabel('Meldingen din', { exact: true }).fill(message);
		await subject.page.keyboard.press('Escape');
		assert.ok(await subject.page.locator('.feedback-launcher').evaluate((element) => element === document.activeElement));
		await subject.page.locator('.feedback-launcher').click();
		assert.equal(await dialog.getByLabel('Meldingen din', { exact: true }).inputValue(), message);
		await dialog.getByRole('button', { name: 'Send tilbakemelding', exact: true }).click();
		await dialog.getByRole('heading', { name: 'Takk! Meldingen er sendt.' }).waitFor();
		assert.equal(db.prepare('SELECT COUNT(*) AS n FROM student_feedback WHERE message=?').get(message).n, 1);
		await dialog.getByRole('button', { name: 'Tilbake til siden' }).click();
		checks.push(`manual feedback ${role}: keyboard, draft, submission stored once`);
		if (role === 'admin') {
			await subject.page.reload();
			await subject.page.getByText(message, { exact: true }).waitFor();
			checks.push('admin inbox displays submitted feedback');
		}
		if (role !== 'student') await subject.context.close();
	}
	// A new student gets a prompt after reading and internal navigation, even with the partner hidden.
	const reader = await actor();
	await reader.page.clock.install();
	await go(reader.page, '/oving-7/');
	await reader.page.clock.fastForward(31000);
	await reader.page.locator('.validation-next a').first().click();
	await reader.page.getByRole('heading', { name: 'Var det tydelig hva du skulle gjøre?' }).waitFor();
	await reader.page.locator('aside.prompt').getByRole('button', { name: 'Delvis', exact: true }).click();
	await reader.page.getByRole('heading', { name: 'Takk! Svaret er lagret.' }).waitFor();
	assert.equal(db.prepare('SELECT answer FROM activity_feedback_prompts WHERE user_id=?').get(reader.user.id).answer, 'partly');
	checks.push('reading prompt after 30 seconds; answer stored with hidden lab partner');
	await reader.context.close();
	for (const width of [1440, 390, 320]) for (const theme of ['light', 'dark']) {
		const device = await actor('guest', { viewport: { width, height: 1000 }, hasTouch: width < 500 });
		await device.context.addInitScript((mode) => localStorage.setItem('it-laben-theme', mode), theme);
		await go(device.page, '/oving-7/#eget-prosjekt');
		await noOverflow(device.page);
		await device.page.screenshot({ path: `${output}/exercise7-${width}-${theme}.png` });
		await device.page.locator('.validation-next a').first().click();
		await device.page.locator('#current-example').waitFor();
		await noOverflow(device.page);
		await device.page.screenshot({ path: `${output}/example-${width}-${theme}.png` });
		if (width < 500) await device.page.locator('.feedback-launcher').tap();
		else await device.page.locator('.feedback-launcher').click();
		await device.page.getByRole('dialog').waitFor();
		await noOverflow(device.page);
		await device.page.screenshot({ path: `${output}/feedback-${width}-${theme}.png` });
		await device.page.keyboard.press('Escape');
		await device.page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
		await noOverflow(device.page);
		checks.push(`${width}px ${theme}: exercise, example, feedback, 200% text, ${width < 500 ? 'touch' : 'mouse'}`);
		await device.context.close();
	}
	assert.deepEqual(errors, [], 'no browser runtime errors');
	console.log(checks.join('\n'));
	await writeFile(`${output}/result.json`, JSON.stringify({ checks, errors }, null, 2));
} catch (error) {
	console.error(error);
	if (browser) for (const [i, context] of browser.contexts().entries()) for (const [j, page] of context.pages().entries()) {
		await page.screenshot({ path: `${output}/failure-${i}-${j}.png` }).catch(() => {});
		await writeFile(`${output}/failure-${i}-${j}.txt`, await page.locator('body').innerText().catch(() => 'page unavailable'));
	}
	process.exitCode = 1;
} finally {
	clearTimeout(deadline);
	await browser?.close();
	preview.kill('SIGTERM');
	api.closeAllConnections();
	await new Promise((resolve) => api.close(resolve));
	db.close();
}
