<script>
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import AccountLink from '#lib/components/AccountLink.svelte';
	import { lessons } from '#lib/ovingene.js';
	import { buildTrace } from '#lib/ovingModel.js';

	/** @type {{lesson: import('../ovingene.js').Lesson}} */
	let { lesson } = $props();
	/** @type {Record<string,string>} */
	let values = $state({});
	/** @type {import('../ovingModel.js').Step[]} */
	let trace = $state([]);
	let index = $state(0);
	let selectedLine = $state(0);
	let current = $derived(trace[index]);
	let finished = $derived(trace.length > 0 && index === trace.length - 1);
	let previous = $derived(lessons.find((item) => item.number === lesson.number - 1));
	let next = $derived(lessons.find((item) => item.number === lesson.number + 1));

	$effect(() => {
		values = Object.fromEntries(lesson.fields.map((field) => [field.key, field.value]));
		trace = [];
		index = 0;
		selectedLine = 0;
	});

	function clearTrace() {
		trace = [];
		index = 0;
		selectedLine = 0;
	}
	function run() {
		trace = buildTrace(lesson.number, values);
		index = 0;
		selectedLine = 0;
	}
	/** @param {number} delta */
	function move(delta) {
		index = Math.max(0, Math.min(trace.length - 1, index + delta));
		selectedLine = 0;
	}
	/** @param {unknown} value */
	function display(value) {
		return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
	}
	/** @param {string} key */
	function isRelevant(key) {
		if (lesson.number === 5 && key === 'text') return ['save', 'fail'].includes(values.scenario);
		if (lesson.number === 6 && key === 'text') return values.method === 'PATCH';
		if (lesson.number === 7 && key === 'body') return values.scenario === 'custom';
		if (lesson.number === 8 && ['username', 'password'].includes(key))
			return ['register', 'duplicate'].includes(values.scenario);
		if (lesson.number === 9 && key === 'id') return ['PATCH', 'DELETE'].includes(values.method);
		if (lesson.number === 9 && ['text', 'forge'].includes(key))
			return ['POST', 'PATCH'].includes(values.method);
		return true;
	}
</script>

<svelte:head>
	<title>Øving {lesson.number}: {lesson.title} – IT-laben</title>
	<meta name="description" content={lesson.intro} />
</svelte:head>

<div class="lesson-page">
	<a class="skip" href="#forsok">Hopp til forsøket</a>
	<header>
		<a class="brand" href="/"><span aria-hidden="true">IT</span> IT-laben.</a>
		<div class="header-right">
			<a href="/#ovingene">Alle øvingene</a><AccountLink /><ThemeToggle />
		</div>
	</header>
	<main>
		<nav class="course" aria-label="Backend · øving 5 til 10">
			<span class="course-label">BACKEND /</span>
			{#each lessons as item}
				<a
					class:active={lesson.number === item.number}
					href={`/oving-${item.number}/`}
					aria-current={lesson.number === item.number ? 'page' : undefined}
					aria-label={`Øving ${item.number}: ${item.title}`}
				>
					<span>{item.number}</span><span class="course-name"
						>{item.number === 5
							? 'Lagring'
							: item.number === 6
								? 'CRUD'
								: item.number === 7
									? 'Validering'
									: item.number === 8
										? 'Innlogging'
										: item.number === 9
											? 'Tilgang'
											: 'Drift'}</span
					>
				</a>
			{/each}
		</nav>

		<section class="intro" aria-labelledby="title">
			<p class="eyebrow">
				ØVING {lesson.number} <span aria-hidden="true">/</span>
				{lesson.category.toUpperCase()}
			</p>
			<h1 id="title">{lesson.title}</h1>
			<p class="lead">{lesson.intro}</p>
			<p class="simulation">
				<span aria-hidden="true">◉</span> Lokal undervisningssimulering · brukere og innlogging i forsøket
				er eksempler · nye eksempeldata ved hvert forsøk
			</p>
		</section>

		<section id="forsok" class="lab" aria-labelledby="lab-title">
			<div class="lab-heading">
				<div>
					<p class="eyebrow">SE. PRØV. FØLG KODEN.</p>
					<h2 id="lab-title">{lesson.question}</h2>
				</div>
				<span class="lab-number">{String(lesson.number).padStart(2, '0')}</span>
			</div>
			<div class="workbench">
				<form
					class="controls"
					onsubmit={(event) => {
						event.preventDefault();
						run();
					}}
				>
					<h3>1. Velg et forsøk</h3>
					<p>Endre én ting og se hva det gjør med resultatet.</p>
					{#each lesson.fields as field}
						{#if isRelevant(field.key)}
							<label for={`field-${field.key}`}>{field.label}</label>
							{#if field.kind === 'select'}
								<select
									id={`field-${field.key}`}
									bind:value={values[field.key]}
									onchange={clearTrace}
								>
									{#each field.choices ?? [] as option}<option value={option.value}
											>{option.label}</option
										>{/each}
								</select>
							{:else if field.kind === 'textarea'}
								<textarea
									id={`field-${field.key}`}
									rows={field.key === 'body' ? 5 : 3}
									maxlength="16000"
									bind:value={values[field.key]}
									oninput={clearTrace}
									spellcheck="false"></textarea>
							{:else}
								<input
									id={`field-${field.key}`}
									type="text"
									maxlength="200"
									autocomplete="off"
									bind:value={values[field.key]}
									oninput={clearTrace}
								/>
							{/if}
						{/if}
					{/each}
					<button class="primary run" type="submit" disabled={Object.keys(values).length === 0}
						>{trace.length ? 'Start forsøket på nytt' : 'Start forsøket'}
						<span aria-hidden="true">→</span></button
					>
					<p class="small">Forrige og Neste viser øyeblikksbilder. De sender ikke nye requests.</p>
				</form>

				<div class="execution">
					{#if current}
						<div class="step-toolbar">
							<span class="step-count">STEG {index + 1} / {trace.length}</span>
							<div class="step-actions">
								<button type="button" onclick={() => move(-1)} disabled={index === 0}
									>← Forrige</button
								><button class="primary" type="button" onclick={() => move(1)} disabled={finished}
									>Neste →</button
								>
							</div>
						</div>
						<progress value={index + 1} max={trace.length} aria-label="Fremdrift i forsøket"
						></progress>
						<div class="step-intro" role="status" aria-live="polite" aria-atomic="true">
							<h3>{current.title}</h3>
							<p>{current.text}</p>
						</div>
						<div class="code-heading"><span>{current.file}</span><span>UTDRAG</span></div>
						<div class="code-and-note">
							<div
								class="code-lines"
								role="group"
								aria-label="Klikk på en kodelinje for forklaring"
							>
								{#each current.code as line, i}
									<button
										type="button"
										class:chosen={selectedLine === i}
										onclick={() => (selectedLine = i)}
										aria-pressed={selectedLine === i}
										aria-label={`Forklar linje ${i + 1}: ${line[0]}`}
										><span class="line-number" aria-hidden="true">{i + 1}</span><code
											>{line[0]}</code
										></button
									>
								{/each}
							</div>
							<aside class="line-note" aria-live="polite">
								<p class="eyebrow">LINJE {selectedLine + 1}</p>
								<p>{current.code[selectedLine]?.[1]}</p>
								<small>Klikk på en annen linje for å undersøke den.</small>
							</aside>
						</div>
						<p class="response"><span>Svar / tilstand</span><strong>{current.status}</strong></p>
					{:else}
						<div class="waiting">
							<span class="waiting-symbol" aria-hidden="true">{'{ }'}</span>
							<p class="eyebrow">2. FØLG DET SOM SKJER</p>
							<h3>Én handling. Ett steg om gangen.</h3>
							<p>
								Start forsøket til venstre. Her ser du koden, verdiene og svaret mens handlingen
								utføres.
							</p>
							<div class="waiting-flow" aria-hidden="true">
								<span>Inndata</span><b>→</b><span>Kode</span><b>→</b><span>Resultat</span>
							</div>
						</div>
					{/if}
				</div>
			</div>

			{#if current}
				<div class="data-area">
					<div class="data-heading">
						<h3>Følg verdiene</h3>
						<p>Tilstanden etter steg {index + 1}. Åpne feltene du vil undersøke.</p>
					</div>
					<div class="data-grid">
						{#each Object.entries(current.data) as [label, value], i (label)}
							<details class="data-card" open={i < 3}>
								<summary>{label}</summary>
								<pre>{display(value)}</pre>
							</details>
						{/each}
					</div>
					{#if finished}<div class="completed">
							<span aria-hidden="true">✓</span>
							<div>
								<h3>Forsøket er ferdig</h3>
								<p>{lesson.takeaway}</p>
								<p class="small">
									Velg en annen situasjon for å sammenligne. Startdataene nullstilles for hvert
									forsøk.
								</p>
							</div>
						</div>{/if}
				</div>
			{/if}
		</section>

		<section class="tasks" aria-labelledby="tasks-title">
			<div>
				<p class="eyebrow">PRØV SELV</p>
				<h2 id="tasks-title">Tre ting å undersøke</h2>
				<p>Gjør et forsøk først. Åpne forklaringen når du vil sjekke resonnementet ditt.</p>
			</div>
			<div class="task-grid">
				{#each lesson.tasks as task, i}<article class="task">
						<span class="task-number">0{i + 1}</span>
						<h3>{task.title}</h3>
						<p>{task.hint}</p>
						<details>
							<summary>Vis forklaring</summary>
							<p>{task.answer}</p>
						</details>
					</article>{/each}
			</div>
		</section>

		<details class="context">
			<summary>Fra simuleringen til ditt eget prosjekt</summary>
			<p>{lesson.context}</p>
			<p>
				Kodepanelene viser avgrensede utdrag, ikke komplette serverfiler. Bruk øvingsarket for hele
				oppsettet og test endringene i din egen app.
			</p>
			{#if lesson.number === 8}<p>
					Oppsettet trenger en hemmelig SESSION_SECRET, express.json før rutene og
					session-middleware før /meg. Ved separate origins bruker du CORS med den konkrete
					frontendadressen og credentials: true. Bruk konsekvent localhost eller samme vertsnavn.
					Øvingsarkets Origin-kontroll for POST, PATCH og DELETE skal også være med.
				</p>{/if}
			{#if lesson.number === 9}<p>
					Meldinger fra eldre øvinger kan mangle eierId. Ta backup før du rydder testdata. Ikke gi
					gamle meldinger en eier basert på avsendernavn fra klienten.
				</p>{/if}
			{#if lesson.number === 10}<p>
					Øvingsarket bruker intern HTTP og testkontoer. En offentlig tjeneste trenger blant annet
					HTTPS, riktig secure-cookie, varig sessionlager og begrensning av innloggingsforsøk.
					IT-labens egen Ubuntu-publisering er beskrevet i prosjektets docs/serverdrift.md.
				</p>{/if}
			{#each lesson.related as related}<a href={related.href}>{related.label} →</a>{/each}
		</details>
		<nav class="lesson-footer" aria-label="Forrige og neste øving">
			<a href={previous ? `/oving-${previous.number}/` : '/#ovingene'}
				>← {previous ? `Øving ${previous.number}: ${previous.title}` : 'Til oversikten'}</a
			>{#if next}<a href={`/oving-${next.number}/`}>Øving {next.number}: {next.title} →</a>{:else}<a
					href="/#ovingene">Til oversikten →</a
				>{/if}
		</nav>
	</main>
</div>

<style>
	.lesson-page {
		font-family: 'Trebuchet MS', 'Segoe UI', sans-serif;
		color: var(--color-text);
	}
	.lesson-page :global(*) {
		box-sizing: border-box;
	}
	a {
		color: var(--color-action);
		text-underline-offset: 4px;
	}
	button,
	input,
	select,
	textarea {
		font: inherit;
	}
	button,
	select,
	summary {
		cursor: pointer;
	}
	button,
	input,
	select,
	textarea {
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
	}
	button {
		background: var(--color-surface);
		color: var(--color-text);
		padding: 0.65rem 0.9rem;
		font-weight: 700;
	}
	button:hover:enabled {
		background: var(--color-surface-hover);
	}
	button:disabled {
		opacity: 0.45;
		cursor: default;
	}
	:is(a, button, input, select, textarea, summary):focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.primary {
		background: var(--color-action);
		color: var(--color-on-action);
		border-color: var(--color-action);
	}
	.primary:hover:enabled {
		background: var(--color-action-hover);
	}
	header {
		max-width: 1440px;
		margin: auto;
		padding: 1.4rem 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
		border-bottom: 1px solid var(--color-border);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		font-size: 1.25rem;
		font-weight: 800;
		text-decoration: none;
	}
	.brand span {
		display: grid;
		place-items: center;
		background: var(--color-brand);
		color: var(--color-on-brand);
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 9px;
		font-size: 1rem;
	}
	.header-right {
		display: flex;
		flex-wrap: wrap;
		max-width: 100%;
		margin-left: auto;
		align-items: center;
		gap: 1.25rem;
	}
	.header-right > a {
		font-size: var(--font-small);
	}
	main {
		max-width: 1380px;
		margin: auto;
		padding: 0 2rem 3rem;
	}
	.course {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		padding: 1.4rem 0;
		border-bottom: 1px solid var(--color-border);
	}
	.course-label {
		font-size: var(--font-meta);
		font-weight: 700;
		letter-spacing: 0.12em;
		margin-right: 0.5rem;
	}
	.course a {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.7rem;
		text-decoration: none;
		border-radius: 7px;
		font-size: var(--font-small);
	}
	.course a > span:first-child {
		font-family: monospace;
		font-weight: 700;
	}
	.course a.active {
		background: var(--color-brand);
		color: var(--color-on-brand);
	}
	.course a:hover:not(.active) {
		background: var(--color-surface-hover);
	}
	.intro {
		padding: 2.6rem 0 1.8rem;
		max-width: 900px;
	}
	.eyebrow {
		font-size: var(--font-meta);
		font-weight: 800;
		letter-spacing: 0.1em;
		color: var(--color-accent);
		margin: 0 0 0.7rem;
	}
	.eyebrow span {
		padding: 0 0.5rem;
	}
	h1 {
		font-size: clamp(2rem, 4vw, 3.4rem);
		letter-spacing: -0.04em;
		line-height: 1.1;
		margin: 0 0 1rem;
	}
	h2 {
		font-size: clamp(1.4rem, 2.5vw, 1.9rem);
		line-height: 1.25;
		margin: 0;
		letter-spacing: -0.025em;
	}
	h3 {
		font-size: 1.15rem;
		margin: 0 0 0.5rem;
		line-height: 1.35;
	}
	p {
		margin: 0.5rem 0 1rem;
	}
	.lead {
		font-size: 1.15rem;
		line-height: 1.65;
		max-width: 78ch;
		color: var(--color-text-muted);
	}
	.simulation {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.simulation span {
		color: var(--color-accent);
		margin-right: 0.3rem;
	}
	.lab {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 8px 30px var(--color-shadow);
		scroll-margin-top: 1rem;
	}
	.lab-heading {
		padding: 1.5rem 1.75rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid var(--color-border);
	}
	.lab-number {
		font: 3rem/1 monospace;
		color: var(--color-border-strong);
	}
	.workbench {
		display: grid;
		grid-template-columns: 260px minmax(0, 1fr);
	}
	.controls {
		background: var(--color-surface-soft);
		padding: 1.5rem;
		border-right: 1px solid var(--color-border);
	}
	.controls > p {
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	label {
		display: block;
		margin: 1.2rem 0 0.4rem;
		font-size: var(--font-small);
		font-weight: 700;
	}
	input,
	select,
	textarea {
		width: 100%;
		background: var(--color-surface);
		color: var(--color-text);
		padding: 0.6rem;
		font-size: var(--font-body);
	}
	textarea {
		resize: vertical;
		min-height: 90px;
	}
	.run {
		width: 100%;
		margin: 1.4rem 0 0.3rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}
	.small {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.execution {
		padding: 1.5rem;
		min-width: 0;
	}
	.waiting {
		min-height: 390px;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 1.5rem;
	}
	.waiting > p {
		max-width: 48ch;
		color: var(--color-text-muted);
	}
	.waiting-symbol {
		font: 3rem/1 monospace;
		color: var(--color-accent);
		background: var(--color-accent-soft);
		padding: 1rem;
		border-radius: 14px;
		margin-bottom: 1.5rem;
	}
	.waiting-flow {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
		margin-top: 1rem;
		font-size: var(--font-small);
	}
	.waiting-flow span {
		padding: 0.4rem 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
	}
	.step-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.step-count {
		font: 700 var(--font-small)/1.5 monospace;
		color: var(--color-accent);
	}
	.step-actions {
		display: flex;
		gap: 0.5rem;
	}
	progress {
		appearance: none;
		border: 0;
		display: block;
		width: 100%;
		height: 4px;
		margin: 1rem 0 1.5rem;
		background: var(--color-border);
	}
	progress::-webkit-progress-bar {
		background: var(--color-border);
	}
	progress::-webkit-progress-value {
		background: var(--color-accent);
	}
	progress::-moz-progress-bar {
		background: var(--color-accent);
	}
	.step-intro {
		min-height: 128px;
	}
	.step-intro h3 {
		font-size: 1.5rem;
	}
	.step-intro p {
		color: var(--color-text-muted);
		max-width: 80ch;
	}
	.code-heading {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem;
		background: var(--color-code-bg);
		color: var(--color-code-text);
		padding: 0.65rem 1rem;
		border-bottom: 1px solid var(--color-code-border);
		border-radius: 8px 8px 0 0;
		font-size: var(--font-small);
	}
	.code-heading > span:last-child {
		font-size: var(--font-meta);
		opacity: 0.75;
	}
	.code-and-note {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 230px;
		min-height: 240px;
		border: 1px solid var(--color-border);
		border-top: 0;
		border-radius: 0 0 8px 8px;
		overflow: hidden;
	}
	.code-lines {
		background: var(--color-code-bg);
		overflow-x: auto;
		padding: 0.75rem 0;
	}
	.code-lines button {
		display: flex;
		align-items: baseline;
		gap: 0.8rem;
		width: 100%;
		min-width: max-content;
		text-align: left;
		border: 0;
		border-radius: 0;
		padding: 0.45rem 1rem;
		background: transparent;
		color: var(--color-code-text);
		font-weight: 400;
	}
	.code-lines button.chosen {
		background: #294e42;
		box-shadow: inset 3px 0 #b7e889;
	}
	.code-lines button:hover {
		background: #294e42;
	}
	.code-lines code {
		font-size: var(--font-code);
		line-height: var(--leading-code);
		white-space: pre;
	}
	.line-number {
		font: var(--font-code-small)/1.6 monospace;
		color: #a5bba9;
		min-width: 1.2rem;
		text-align: right;
		user-select: none;
	}
	.line-note {
		padding: 1rem;
		background: var(--color-accent-soft);
		border-left: 1px solid var(--color-border);
	}
	.line-note p:not(.eyebrow) {
		font-size: var(--font-body);
	}
	.line-note small {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.response {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
		padding: 0.8rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: 7px;
		margin: 1rem 0 0;
	}
	.response > span {
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.response > strong {
		font: 700 var(--font-code)/1.6 monospace;
		overflow-wrap: anywhere;
	}
	.data-area {
		padding: 1.5rem 1.75rem;
		border-top: 1px solid var(--color-border);
	}
	.data-heading {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.3rem 1.5rem;
	}
	.data-heading p {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.data-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.8rem;
		align-items: start;
	}
	.data-card {
		border: 1px solid var(--color-border);
		border-radius: 8px;
		overflow: hidden;
		background: var(--color-surface-soft);
	}
	.data-card summary {
		padding: 0.75rem;
		font-weight: 700;
		font-size: var(--font-small);
		overflow-wrap: anywhere;
	}
	.data-card pre {
		margin: 0;
		border-top: 1px solid var(--color-border);
		padding: 0.8rem;
		font: var(--font-code-small)/var(--leading-code) monospace;
		max-height: 240px;
		overflow: auto;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		background: var(--color-surface);
	}
	.completed {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
		padding: 1.3rem;
		border-radius: 8px;
		border: 1px solid var(--color-success-border);
		background: var(--color-success-soft);
	}
	.completed > span {
		color: var(--color-success);
		font-size: 1.6rem;
	}
	.completed p:last-child {
		margin-bottom: 0;
	}
	.tasks {
		padding: 3rem 0 2rem;
	}
	.tasks > div > p:not(.eyebrow) {
		color: var(--color-text-muted);
	}
	.task-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.2rem;
		margin-top: 1.5rem;
	}
	.task {
		border-top: 2px solid var(--color-border-strong);
		padding: 1rem 0;
	}
	.task-number {
		font: var(--font-meta)/2 monospace;
		color: var(--color-accent);
	}
	.task p {
		color: var(--color-text-muted);
	}
	.task summary {
		color: var(--color-action);
		font-size: var(--font-small);
		font-weight: 700;
	}
	.task details p {
		border-left: 3px solid var(--color-border-strong);
		padding-left: 1rem;
	}
	.context {
		padding: 1.25rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface);
	}
	.context summary {
		font-weight: 700;
	}
	.context > p {
		max-width: 95ch;
		color: var(--color-text-muted);
	}
	.context > a {
		display: block;
		margin-top: 0.5rem;
	}
	.lesson-footer {
		display: flex;
		justify-content: space-between;
		gap: 2rem;
		padding-top: 2rem;
		font-size: var(--font-small);
	}
	.lesson-footer a:last-child {
		text-align: right;
	}
	.skip {
		position: absolute;
		top: -100px;
		left: 1rem;
		padding: 1rem;
		background: var(--color-surface);
		z-index: 10;
	}
	.skip:focus {
		top: 1rem;
	}
	@media (max-width: 1100px) {
		.code-and-note {
			grid-template-columns: minmax(0, 1fr);
		}
		.line-note {
			min-height: 160px;
			border-left: 0;
			border-top: 1px solid var(--color-border);
		}
		.step-intro {
			min-height: 150px;
		}
	}
	@media (max-width: 760px) {
		header {
			padding: 1rem;
		}
		main {
			padding: 0 1rem 2rem;
		}
		.header-right {
			gap: 0.6rem;
		}
		.header-right > a {
			display: none;
		}
		.course {
			gap: 0.3rem;
		}
		.course-label {
			width: 100%;
		}
		.course a {
			padding: 0.3rem 0.55rem;
		}
		.course-name {
			display: none;
		}
		.intro {
			padding: 2rem 0 1rem;
		}
		.workbench {
			grid-template-columns: minmax(0, 1fr);
		}
		.controls {
			border-right: 0;
			border-bottom: 1px solid var(--color-border);
			padding: 1.2rem;
		}
		.execution {
			padding: 1.2rem;
		}
		.lab-heading,
		.data-area {
			padding: 1.2rem;
		}
		.lab-number {
			display: none;
		}
		.task-grid,
		.data-grid {
			grid-template-columns: minmax(0, 1fr);
		}
		.step-intro {
			min-height: 0;
		}
		.step-toolbar {
			gap: 0.5rem;
		}
		.step-actions button {
			padding: 0.6rem 0.7rem;
		}
		.line-note {
			min-height: 145px;
		}
		.waiting {
			min-height: 300px;
			padding: 0.5rem;
		}
		.lesson-footer {
			flex-direction: column;
			gap: 1rem;
		}
		.lesson-footer a:last-child {
			text-align: left;
		}
	}
</style>
