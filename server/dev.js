import { spawn } from 'node:child_process';

const processes = [
	spawn(process.execPath, ['--env-file-if-exists=.env', 'server/index.js'], { stdio: 'inherit' }),
	spawn(
		process.execPath,
		['node_modules/vite/bin/vite.js', '--strictPort', ...process.argv.slice(2)],
		{ stdio: 'inherit' }
	)
];
let stopping = false;
function stop(code) {
	if (stopping) return;
	stopping = true;
	process.exitCode = code;
	for (const child of processes) if (child.exitCode === null) child.kill('SIGTERM');
	setTimeout(() => {
		for (const child of processes) if (child.exitCode === null) child.kill('SIGKILL');
	}, 3000).unref();
}
for (const child of processes) {
	child.once('error', () => {
		console.error('Kunne ikke starte utviklingsserveren.');
		stop(1);
	});
	child.once('exit', (code) => {
		if (!stopping) stop(code ?? 1);
	});
}
process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));
