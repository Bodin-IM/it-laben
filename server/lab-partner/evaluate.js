import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { readPartnerConfig } from '../config.js';
import { buildPartnerMessages } from './context.js';
import { requestPartnerAnswer, partnerModelOptions } from './model-client.js';
import { partnerEvaluationCases, evaluationCriteria } from './evaluation-cases.js';

export async function evaluatePartner({ settings, cases = partnerEvaluationCases(), repeat = 1,
	dryRun = false, signal, onProgress = async () => {} }) {
	if (!Number.isInteger(repeat) || repeat < 1 || repeat > 5) throw new Error('repeat må være 1–5.');
	if (!dryRun && !settings?.enabled) throw new Error('LAB_PARTNER_MODEL er ikke konfigurert. Bruk --dry-run for å kontrollere konteksten uten modellkall.');
	const prepared = cases.map(({ body, ...item }) => {
		const messages = buildPartnerMessages(body);
		return { ...item, question: body.question, messages,
			contextHash: createHash('sha256').update(JSON.stringify(messages)).digest('hex') };
	});
	const report = {
		version: 1, startedAt: new Date().toISOString(), finishedAt: null,
		mode: dryRun ? 'contexts-only' : 'model-answers',
		model: dryRun ? null : settings.model,
		settings: dryRun ? null : { think: settings.think ?? null, timeoutMs: settings.timeoutMs,
			options: partnerModelOptions, stream: false, keep_alive: '10m' },
		repeat, criteria: evaluationCriteria, cases: prepared, results: [],
		quality: 'Ikke faglig vurdert. Vellykket modellkall eller kontekstkontroll er ikke et kvalitetsstempel.'
	};
	await onProgress(report);
	if (!dryRun) {
		for (const item of prepared) for (let round = 1; round <= repeat; round++) {
			if (signal?.aborted) break;
			const controller = new AbortController();
			const abort = () => controller.abort();
			signal?.addEventListener('abort', abort, { once: true });
			let timedOut = false;
			const timer = setTimeout(() => { timedOut = true; controller.abort(); }, settings.timeoutMs);
			const started = performance.now();
			const result = { id: item.id, round, contextHash: item.contextHash, answer: null,
				error: null, elapsedMs: 0, review: null };
			try {
				result.answer = await requestPartnerAnswer(settings, item.messages, controller);
			} catch (error) {
				// Do not copy endpoint addresses, tokens or raw transport errors into the report.
				result.error = signal?.aborted ? 'CANCELLED' : timedOut ? 'PARTNER_TIMEOUT'
					: error.code?.startsWith('PARTNER_') ? error.code : 'PARTNER_UNAVAILABLE';
			} finally {
				clearTimeout(timer);
				signal?.removeEventListener('abort', abort);
				result.elapsedMs = Math.round(performance.now() - started);
			}
			report.results.push(result);
			await onProgress(report);
		}
	}
	report.finishedAt = new Date().toISOString();
	report.cancelled = Boolean(signal?.aborted);
	await onProgress(report);
	return report;
}

async function main() {
	const { values } = parseArgs({ options: {
		'dry-run': { type: 'boolean', default: false },
		repeat: { type: 'string', default: '1' },
		case: { type: 'string', multiple: true },
		output: { type: 'string' },
		help: { type: 'boolean', default: false }
	} });
	if (values.help) {
		console.log('npm run partner:eval -- [--dry-run] [--repeat=1..5] [--case=ID] [--output=data/rapport.json]');
		console.log('Bruker bare faste eksempeldata. Vanlig kjøring kontakter konfigurert modell; --dry-run sender ingenting.');
		return;
	}
	const all = partnerEvaluationCases();
	if (values.case?.some((id) => !all.some((item) => item.id === id)))
		throw new Error('Ukjent eksempel. Gyldige ID-er: ' + all.map((item) => item.id).join(', '));
	const cases = values.case ? all.filter((item) => values.case.includes(item.id)) : all;
	const output = resolve(values.output || `data/labpartner-evaluering-${new Date().toISOString().replaceAll(':', '-')}.json`);
	const settings = values['dry-run'] ? null : readPartnerConfig();
	const controller = new AbortController();
	const cancel = () => controller.abort();
	process.on('SIGINT', cancel);
	let first = true;
	let logged = 0;
	let sourceCommit = null;
	try { sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* Packaged installs may not have Git. */ }
	try {
		const report = await evaluatePartner({ settings, cases, repeat: Number(values.repeat),
			dryRun: values['dry-run'], signal: controller.signal,
			onProgress: async (report) => {
				if (first) await mkdir(dirname(output), { recursive: true });
				await writeFile(output, JSON.stringify({ ...report, sourceCommit }, null, 2) + '\n',
					{ encoding: 'utf8', flag: first ? 'wx' : 'w', mode: 0o600 });
				first = false;
				for (const result of report.results.slice(logged))
					console.log(`${result.id} · runde ${result.round}: ${result.error || 'svar mottatt'} (${result.elapsedMs} ms)`);
				logged = report.results.length;
			} });
		console.log(`${report.mode === 'contexts-only' ? 'Kontekst kontrollert, ingen modellkall' : 'Modellprøve ferdig'}: ${cases.length} eksempler. Rapport: ${output}`);
		console.log(report.quality);
		if (report.cancelled || report.results.some((result) => result.error)) process.exitCode = 1;
	} finally { process.off('SIGINT', cancel); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
	main().catch((error) => { console.error(error.message); process.exitCode = 1; });
