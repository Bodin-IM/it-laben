import { readConfig } from './config.js';
import { openDatabase } from './database.js';
import { createApp } from './app.js';

process.umask(0o077);
const config = readConfig();
const db = openDatabase(config.dbPath);
const server = createApp({ db, config }).listen(config.port, '127.0.0.1', (error) => {
	if (error) {
		console.error(`IT-laben API kunne ikke starte på port ${config.port} (${error.code}).`);
		db.close();
		process.exitCode = 1;
		return;
	}
	console.log(
		`IT-laben API klar på 127.0.0.1:${config.port} (${config.production ? 'produksjon' : 'lokal utvikling'}).`
	);
});
let stopping = false;
function shutdown() {
	if (stopping) return;
	stopping = true;
	server.close(() => {
		db.close();
		process.exit(0);
	});
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
