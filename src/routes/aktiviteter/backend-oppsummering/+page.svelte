<script>
	import { tick } from 'svelte';
	import {
		backendQuestions as questions,
		backendTopics as topics,
		answerQuestion,
		revealQuestion,
		isResolved,
		quizSummary
	} from '#lib/backendQuiz.js';

	/** @type {import('#lib/backendQuiz.js').Answers} */
	let answers = $state({});
	let index = $state(0);
	let selected = $state(-1);
	/** @type {Record<string, boolean>} */
	let hints = $state({});
	let showSummary = $state(false);
	/** @type {HTMLHeadingElement|undefined} */
	let heading = $state();
	const question = $derived(questions[index]);
	const answer = $derived(answers[question.id]);
	const last = $derived(answer?.attempts.at(-1));
	const resolved = $derived(isResolved(question, answer));
	const summary = $derived(quizSummary(answers));
	const completed = $derived(questions.length - summary.remaining);
	const feedbackChoice = $derived(answer?.revealed ? question.correct : last);
	const showFeedback = $derived(answer?.revealed || (last !== undefined && last === selected));
	const letters = ['A', 'B', 'C', 'D'];

	async function focusHeading() {
		await tick();
		heading?.focus();
	}
	/** @param {number} next */
	async function goTo(next) {
		index = next;
		selected = answers[questions[index].id]?.attempts.at(-1) ?? -1;
		showSummary = false;
		await focusHeading();
	}
	async function openSummary() {
		showSummary = true;
		await focusHeading();
	}
	function checkAnswer() {
		answers = answerQuestion(answers, question.id, selected);
	}
	async function restart() {
		answers = {};
		hints = {};
		await goTo(0);
	}
	/** @param {import('#lib/backendQuiz.js').Question} q */
	function status(q) {
		const a = answers[q.id];
		if (a?.revealed) return 'Forklaring vist';
		if (isResolved(q, a))
			return a.attempts.length === 1 ? 'Riktig på første svar' : 'Rettet etter tilbakemelding';
		return a?.attempts.length ? 'Prøv igjen' : 'Ikke besvart';
	}
</script>

<svelte:head>
	<title>Backend: oppsummering av øving 1–10 – IT-laben</title>
	<meta
		name="description"
		content="20 flervalgsspørsmål om backend, med hint, forklaringer og nye forsøk. Repeter servere, meldinger, lagring, innlogging og drift."
	/>
</svelte:head>

<div class="quiz-page">
	<a class="skip" href="#quiz">Hopp til spørsmålene</a>
	<main id="hovedinnhold" tabindex="-1">
		<a class="back" href="/?fag=utvikling#utforsk">← Tilbake til Utvikling</a>
		<section class="intro" aria-labelledby="page-title">
			<p class="eyebrow">AKTIVITET · FLERVALG</p>
			<h1 id="page-title">Backend, fra første rute til drift.</h1>
			<p class="lead">
				Oppsummer øving 1–10 med 20 spørsmål. Følg dataene, finn årsaken og velg løsningen som
				passer.
			</p>
			<p>
				Hvert spørsmål har ett riktig svar. Bruk hint og prøv igjen så mye du trenger. Forklar
				gjerne valget ditt for en medelev før du sjekker.
			</p>
			<p class="note">
				Fri repetisjon uten tidspress eller XP. Svarene gjelder denne runden og nullstilles hvis du
				laster siden på nytt.
			</p>
		</section>

		<div class="workspace" id="quiz">
			<aside aria-label="Spørsmålsoversikt">
				<div class="progress-label">
					<strong>Din runde</strong><span>{completed} / {questions.length}</span>
				</div>
				<progress
					value={completed}
					max={questions.length}
					aria-label="Spørsmål løst eller med forklaring vist"
				></progress>
				<p class="note">Løst eller forklaring vist</p>
				<nav class="question-nav" aria-label="Velg spørsmål">
					{#each questions as q, i (q.id)}
						<button
							type="button"
							class:current={!showSummary && index === i}
							class:done={isResolved(q, answers[q.id])}
							aria-current={!showSummary && index === i ? 'step' : undefined}
							aria-label={`Spørsmål ${i + 1}, øving ${q.exercise}: ${q.title}. ${status(q)}`}
							onclick={() => goTo(i)}
							>{i + 1}{#if isResolved(q, answers[q.id])}<span aria-hidden="true">✓</span
								>{/if}</button
						>
					{/each}
				</nav>
				<button class="summary-link" type="button" onclick={openSummary}>Se oppsummeringen →</button
				>
			</aside>

			{#if showSummary}
				<section class="panel results" aria-labelledby="summary-title">
					<p class="eyebrow">OPPSUMMERING AV RUNDEN</p>
					<h2 id="summary-title" tabindex="-1" bind:this={heading}>
						{summary.remaining ? 'Dette har du jobbet med' : 'Ta forståelsen med videre'}
					</h2>
					<p>
						Bruk oversikten til å velge hva du vil repetere. Et riktig flervalgssvar er et
						utgangspunkt for å forklare og prøve selv.
					</p>
					<dl class="scores">
						<div>
							<dt>Riktig på første svar</dt>
							<dd>{summary.first} <span>/ 20</span></dd>
						</div>
						<div>
							<dt>Rettet etter tilbakemelding</dt>
							<dd>{summary.improved}</dd>
						</div>
						<div>
							<dt>Forklaring vist</dt>
							<dd>{summary.revealed}</dd>
						</div>
						<div>
							<dt>Gjenstår å løse</dt>
							<dd>{summary.remaining}</dd>
						</div>
					</dl>
					<p class="note">
						Hint gir ingen trekk. Førstesvaret beholdes i oversikten når du prøver igjen.
					</p>
					<h3>Tilbake til temaene</h3>
					<ul class="topic-list">
						{#each topics as topic}
							<li>
								<strong>Øving {topic.number} · {topic.title}</strong>
								{#each questions.filter((q) => q.exercise === topic.number) as q}
									<button type="button" onclick={() => goTo(questions.indexOf(q))}>
										<span>{q.title}</span><span class="note">{status(q)} →</span>
									</button>
								{/each}
								<a href={topic.href}>Åpne kodelab for repetisjon →</a>
							</li>
						{/each}
					</ul>
					<section class="transfer" aria-labelledby="transfer-title">
						<h3 id="transfer-title">Prøv uten svaralternativer</h3>
						<p>
							Lag en liten gjestebok med en medelev. Beskriv reisen fra POST til lagring og ny GET.
							Vis at et innlegg overlever omstart, og at en annen bruker ikke kan slette det.
						</p>
						<p>
							Forutsi resultatet før hver test. Bruk request, statuskode og datafil som bevis når
							dere forklarer hva som skjedde.
						</p>
					</section>
					{#if summary.remaining}<button
							class="primary"
							type="button"
							onclick={() => goTo(questions.findIndex((q) => !isResolved(q, answers[q.id])))}
							>Fortsett med et spørsmål som gjenstår →</button
						>{/if}
					<details class="restart">
						<summary>Ta en ny runde</summary>
						<p>Dette nullstiller svarene og oppsummeringen for denne runden.</p>
						<button type="button" onclick={restart}>Nullstill og start på nytt</button>
					</details>
				</section>
			{:else}
				<section class="panel question" aria-labelledby="question-title">
					<div class="question-meta">
						<p class="eyebrow">ØVING {question.exercise} · {topics[question.exercise - 1].title}</p>
						<span>{index + 1} av {questions.length}</span>
					</div>
					<h2 id="question-title" tabindex="-1" bind:this={heading}>{question.title}</h2>
					<p id="question-prompt" class="prompt">{question.prompt}</p>
					{#if question.code}
						<!-- svelte-ignore a11y_no_noninteractive_tabindex (The scrollable code region needs keyboard focus so arrow keys can reveal long lines.) -->
						<pre tabindex="0" role="region" aria-label="Kodeutdrag til spørsmålet"><code
								>{question.code}</code
							></pre>{/if}
					<form
						onsubmit={(event) => {
							event.preventDefault();
							checkAnswer();
						}}
					>
						<fieldset disabled={resolved} aria-describedby="question-prompt">
							<legend>Velg ett svar</legend>
							{#each question.choices as choice, choiceIndex}
								<label
									class="choice"
									class:selected={selected === choiceIndex}
									class:correct={resolved && question.correct === choiceIndex}
								>
									<input
										type="radio"
										name={question.id}
										value={choiceIndex}
										bind:group={selected}
									/>
									<span class="letter" aria-hidden="true">{letters[choiceIndex]}</span>
									<span
										>{choice.text}{#if resolved && question.correct === choiceIndex}<strong
												class="answer-tag">Riktig svar</strong
											>{/if}</span
									>
								</label>
							{/each}
						</fieldset>
						{#if !resolved}<div class="answer-actions">
								<button class="primary" type="submit" disabled={selected < 0 || selected === last}
									>Sjekk svaret</button
								>
								<button
									type="button"
									aria-expanded={Boolean(hints[question.id])}
									aria-controls="hint"
									onclick={() => (hints = { ...hints, [question.id]: !hints[question.id] })}
									>{hints[question.id] ? 'Skjul hint' : 'Vis et hint'}</button
								>
							</div>{/if}
					</form>
					{#if hints[question.id]}<p class="hint" id="hint">
							<strong>Hint:</strong>
							{question.hint}
						</p>{/if}
					<div aria-live="polite" aria-atomic="true">
						{#if showFeedback && feedbackChoice !== undefined}
							<div class="feedback" class:success={resolved}>
								<p class="feedback-label">
									{answer?.revealed
										? 'Forklaring'
										: resolved
											? 'Det stemmer'
											: 'Se nærmere på dette'}
								</p>
								<p>{question.choices[feedbackChoice].feedback}</p>
								{#if !resolved}<p class="note">
										Velg et annet alternativ og sjekk igjen, eller åpne forklaringen.
									</p>{/if}
							</div>
						{/if}
					</div>
					{#if !resolved}<button
							class="reveal"
							type="button"
							onclick={() => (answers = revealQuestion(answers, question.id))}
							>Vis riktig svar og forklaring</button
						>{/if}
					<div class="navigation">
						<button type="button" disabled={index === 0} onclick={() => goTo(index - 1)}
							>← Forrige</button
						>
						{#if index < questions.length - 1}<button type="button" onclick={() => goTo(index + 1)}
								>Neste spørsmål →</button
							>{:else}<button class="primary" type="button" onclick={openSummary}
								>Se oppsummeringen →</button
							>{/if}
					</div>
				</section>
			{/if}
		</div>
	</main>
	<footer>
		<a href="/?fag=utvikling#utforsk">← Alle aktiviteter i Utvikling</a><span
			>IT-laben · Se. Prøv. Forstå.</span
		>
	</footer>
</div>

<style>
	.quiz-page {
		font-family: system-ui, sans-serif;
		color: var(--color-text);
	}
	.quiz-page :global(*) {
		box-sizing: border-box;
	}
	main,
	footer {
		width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		margin-inline: auto;
	}
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 18px;
		padding-block: 22px;
	}
	.answer-actions,
	.navigation {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}
	main {
		padding-block: 28px 48px;
	}
	a {
		color: var(--color-accent);
		text-underline-offset: 3px;
	}
	.back,
	.note,
	footer {
		font-size: var(--font-small);
	}
	.note,
	footer {
		color: var(--color-text-muted);
	}
	.intro {
		max-width: 760px;
		padding-block: 24px 30px;
	}
	.eyebrow {
		color: var(--color-accent);
		font-size: var(--font-meta);
		font-weight: 750;
		letter-spacing: 0.08em;
		margin: 0 0 10px;
	}
	h1 {
		font-size: clamp(2rem, 4vw, 3rem);
		letter-spacing: -0.04em;
		line-height: 1.15;
		margin: 0 0 20px;
	}
	.lead {
		font-size: 1.15rem;
	}
	h2 {
		font-size: clamp(1.4rem, 3vw, 1.8rem);
		line-height: 1.3;
		margin: 0 0 20px;
		letter-spacing: -0.02em;
	}
	h3 {
		font-size: 1.1rem;
	}
	p {
		line-height: var(--leading-body);
	}
	.workspace {
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr);
		gap: 24px;
		scroll-margin-top: 20px;
		align-items: start;
	}
	aside {
		padding-top: 16px;
	}
	.progress-label {
		display: flex;
		justify-content: space-between;
		gap: 8px;
	}
	progress {
		display: block;
		width: 100%;
		height: 8px;
		margin-top: 12px;
		accent-color: var(--color-accent);
	}
	aside .note {
		margin-top: 8px;
	}
	.question-nav {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 5px;
		margin-top: 24px;
	}
	button {
		font: inherit;
		font-size: var(--font-small);
		border: 1px solid var(--color-border-strong);
		border-radius: 7px;
		background: var(--color-surface);
		color: var(--color-text);
		min-height: 44px;
		padding: 10px 15px;
		cursor: pointer;
	}
	button:hover:not(:disabled) {
		background: var(--color-surface-hover);
	}
	button:disabled {
		opacity: 0.55;
		cursor: default;
	}
	.question-nav button {
		padding: 8px 0;
		position: relative;
	}
	.question-nav button span {
		position: absolute;
		right: 2px;
		top: 0;
		font-size: 0.65rem;
	}
	.question-nav .done {
		background: var(--color-success-soft);
		border-color: var(--color-success-border);
	}
	.question-nav .current {
		outline: 2px solid var(--color-accent);
		outline-offset: 1px;
		font-weight: 800;
	}
	.summary-link {
		margin-top: 18px;
		width: 100%;
	}
	.panel {
		padding: clamp(20px, 3vw, 36px);
		border: 1px solid var(--color-border);
		border-radius: 16px;
		background: var(--color-surface);
		min-width: 0;
	}
	.question-meta {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: baseline;
		font-size: var(--font-meta);
		color: var(--color-text-muted);
	}
	.question-meta > span {
		white-space: nowrap;
	}
	.prompt {
		margin-block: 0 24px;
	}
	pre {
		background: var(--color-code-bg);
		color: var(--color-code-text);
		padding: 18px;
		border-radius: 8px;
		overflow-x: auto;
		font-size: var(--font-code-small);
		line-height: var(--leading-code);
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
	}
	legend {
		padding: 0 0 12px;
		font-weight: 700;
		font-size: var(--font-small);
	}
	.choice {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 16px;
		border: 1px solid var(--color-border);
		border-radius: 9px;
		margin-bottom: 10px;
		cursor: pointer;
		line-height: 1.55;
	}
	.choice input {
		margin: 5px 0 0;
		width: 17px;
		height: 17px;
		flex-shrink: 0;
		accent-color: var(--color-accent);
	}
	.choice .letter {
		font-weight: 750;
		color: var(--color-text-muted);
	}
	.choice.selected {
		background: var(--color-info-soft);
		border-color: var(--color-info-border);
	}
	.choice.correct {
		background: var(--color-success-soft);
		border-color: var(--color-success-border);
	}
	fieldset:disabled .choice {
		cursor: default;
	}
	.choice:focus-within {
		outline: 3px solid var(--color-focus);
		outline-offset: 2px;
	}
	.answer-tag {
		display: block;
		color: var(--color-success);
		font-size: var(--font-small);
		margin-top: 5px;
	}
	.answer-actions {
		margin-top: 18px;
	}
	.primary {
		background: var(--color-action);
		border-color: var(--color-action);
		color: var(--color-on-action);
		font-weight: 700;
	}
	.primary:hover:not(:disabled) {
		background: var(--color-action-hover);
	}
	.hint,
	.feedback,
	.transfer {
		border-radius: 8px;
		padding: 18px;
		margin-top: 20px;
		background: var(--color-info-soft);
		border: 1px solid var(--color-info-border);
	}
	.feedback {
		background: var(--color-warning-soft);
		border-color: var(--color-warning-border);
	}
	.feedback.success {
		background: var(--color-success-soft);
		border-color: var(--color-success-border);
	}
	.feedback p {
		margin: 0;
	}
	.feedback .feedback-label {
		font-weight: 750;
		margin-bottom: 6px;
	}
	.feedback .note {
		margin-top: 10px;
	}
	.reveal {
		border: 0;
		background: transparent;
		padding-inline: 0;
		margin-top: 12px;
		color: var(--color-accent);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.navigation {
		justify-content: space-between;
		border-top: 1px solid var(--color-border);
		margin-top: 28px;
		padding-top: 22px;
	}
	.scores {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
		margin-block: 24px;
	}
	.scores div {
		border-radius: 8px;
		padding: 16px;
		background: var(--color-surface-soft);
	}
	dt {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	dd {
		font-size: 2rem;
		margin: 6px 0 0;
		font-weight: 750;
	}
	dd span {
		font-size: 1rem;
		font-weight: 400;
	}
	.topic-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.topic-list li {
		border-bottom: 1px solid var(--color-border);
		padding-block: 18px;
	}
	.topic-list strong {
		display: block;
		margin-bottom: 10px;
	}
	.topic-list button {
		display: flex;
		text-align: left;
		justify-content: space-between;
		align-items: baseline;
		gap: 6px 12px;
		flex-wrap: wrap;
		width: 100%;
		margin-bottom: 8px;
	}
	.topic-list a {
		font-size: var(--font-small);
	}
	.transfer {
		margin-bottom: 24px;
	}
	.transfer h3 {
		margin-top: 0;
	}
	.transfer p:last-child {
		margin-bottom: 0;
	}
	.restart {
		margin-top: 24px;
	}
	summary {
		cursor: pointer;
		color: var(--color-accent);
		min-height: 44px;
		padding-block: 10px;
	}
	button:focus-visible,
	pre:focus-visible,
	a:focus-visible,
	summary:focus-visible,
	h2:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 4px;
	}
	.skip {
		position: fixed;
		top: 10px;
		left: 20px;
		z-index: 30;
		transform: translateY(-200%);
		clip-path: inset(50%);
		background: var(--color-surface);
		padding: 12px;
	}
	.skip:focus {
		transform: translateY(0);
		clip-path: none;
	}
	@media (max-width: 760px) {
		.workspace {
			grid-template-columns: minmax(0, 1fr);
			gap: 20px;
		}
		aside {
			padding-top: 0;
		}
		.question-nav {
			grid-template-columns: repeat(10, minmax(0, 1fr));
			margin-top: 16px;
		}
		.summary-link {
			width: auto;
			margin-top: 12px;
		}
	}
	@media (max-width: 480px) {
		main,
		footer {
			width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		}
		.question-nav {
			grid-template-columns: repeat(5, minmax(0, 1fr));
		}
		.question-meta {
			display: block;
			margin-bottom: 16px;
		}
		.question-meta .eyebrow {
			margin-bottom: 4px;
		}
		.choice {
			padding: 13px 10px;
			gap: 8px;
		}
		.scores {
			grid-template-columns: minmax(0, 1fr);
		}
		.panel {
			padding: 20px 16px;
		}
	}
</style>
