<script>
	import PageLinks from '#lib/components/PageLinks.svelte';
	import { onMount, tick } from 'svelte';
	import BackendRouteEditor from '#lib/components/BackendRouteEditor.svelte';
	import RequestWalkthrough from '#lib/components/RequestWalkthrough.svelte';
	import {
		casesFor,
		routeFrame,
		programCode,
		evaluateCase,
		evaluateProgram,
		evaluateTextInput,
		walkthroughCase
	} from '#lib/reddChatten.js';
	import {
		PILOT_START,
		PILOT_BLOCKS,
		STEPS,
		HINTS,
		ROOM_START,
		ROOM_BLOCKS,
		ROOM_FRAME,
		ROOM_CASES,
		evaluateRoom,
		validProgram
	} from '#lib/reddChattenPilot.js';

	const STORAGE_KEY = 'it-laben:redd-chatten-pilot:v1';
	const cases = casesFor('tekst');
	const codeFrame = routeFrame('tekst');
	const startCode = programCode('tekst', PILOT_START);
	let step = $state(0);
	let program = $state([...PILOT_START]);
	let roomProgram = $state([...ROOM_START]);
	let prediction = $state('');
	let reasoning = $state('');
	let predictionCompared = $state(false);
	let exampleSeen = $state(false);
	let traceSeen = $state(false);
	let ownInput = $state('');
	let missingField = $state(false);
	let testReason = $state('');
	let testExpectation = $state('400');
	/** @type {import('#lib/reddChatten.js').CaseResult|null} */
	let ownResult = $state(null);
	let testedInput = $state('');
	let testedReason = $state('');
	let testedExpectation = $state('');
	/** @type {import('#lib/reddChatten.js').Run|null} */
	let repairRun = $state(null);
	/** @type {ReturnType<typeof evaluateRoom>[]|null} */
	let roomResults = $state(null);
	let reflection = $state('');
	let explanationShown = $state(false);
	let selfAssessment = $state('');
	let hintCount = $state(0);
	let roomHelp = $state(false);
	let milestones = $state([false, false, false, false]);
	let frameIndex = $state(0);
	let caseIndex = $state(2);
	let attempts = $state(0);
	let roomAttempts = $state(0);
	let selectedResult = $state(0);
	let roomSelected = $state(0);
	let ready = $state(false);
	let storageWarning = $state('');
	let notice = $state('');
	let resetOpen = $state(false);
	let revision = $state(0);
	/** @type {HTMLElement|undefined} */
	let heading = $state();
	/** @type {HTMLElement|undefined} */
	let boundary = $state();

	const traceCases = $derived(step === 0 ? [cases[0]] : cases);
	const traceCaseIndex = $derived(step === 0 ? 0 : caseIndex);
	const walkthrough = $derived(
		walkthroughCase('tekst', PILOT_START, traceCases[traceCaseIndex].id)
	);
	const frame = $derived(walkthrough.frames[Math.min(frameIndex, walkthrough.frames.length - 1)]);
	const activeSource = $derived.by(() =>
		frame.lineIds.flatMap((id) => {
			if (id.startsWith('opening-')) return [codeFrame.opening[Number(id.split('-')[1]) - 1]];
			const line = PILOT_BLOCKS.flatMap((block) => block.lines).find((line) => line.id === id);
			return line ? [line.text] : [];
		})
	);
	const predictionResult = evaluateCase('tekst', PILOT_START, 'mellomrom');
	const points = $derived(milestones.filter(Boolean).length * 10);
	const repaired = $derived.by(() => repairRun?.success === true);
	const transferred = $derived.by(
		() => roomResults !== null && roomResults.every((result) => result.passed)
	);
	const done = $derived([
		exampleSeen,
		predictionCompared,
		traceSeen && milestones[1],
		repaired,
		explanationShown && reflection.trim().length > 0,
		transferred
	]);
	const ownChanged = $derived(
		ownResult !== null &&
			(testedInput !== (missingField ? 'Feltet mangler' : JSON.stringify(ownInput)) ||
				testedReason !== testReason.trim() ||
				testedExpectation !== testExpectation)
	);
	const report = $derived(
		[
			'Redd chatten · arbeidsnotat fra piloten',
			`Prediksjon: ${prediction || 'ikke valgt'} · ${reasoning || 'ingen begrunnelse'}`,
			`Sammenlignet med kjøringen: ${predictionCompared ? 'ja' : 'nei'}`,
			`Egen test: ${testedInput || 'ikke kjørt'} · forventet ${testedExpectation || '—'}`,
			`Hvorfor denne testen: ${testedReason || 'ingen begrunnelse'}`,
			`Chatten: ${repaired ? 'alle seks tester bestått med nåværende kode' : 'ikke bekreftet med nåværende kode'} · ${attempts} prøverunder · ${hintCount} hint åpnet`,
			`Min forklaring: ${reflection || 'ikke skrevet'}`,
			`Egen vurdering: ${selfAssessment || 'ikke valgt'}`,
			`Romnavn: ${transferred ? 'alle seks tester bestått med nåværende kode' : 'ikke bekreftet med nåværende kode'} · ${roomAttempts} prøverunder · ${roomHelp ? 'hjelp åpnet' : 'hjelp ikke åpnet'}`,
			'Forklaringen og egenvurderingen er ikke automatisk faglig vurdert.'
		].join('\n\n')
	);

	/** @param {unknown} value @param {number} max */
	function count(value, max) {
		return typeof value === 'number' && Number.isInteger(value)
			? Math.max(0, Math.min(max, value))
			: 0;
	}
	/** @param {unknown} value */
	function text(value) {
		return typeof value === 'string' ? value.slice(0, 1000) : '';
	}
	onMount(() => {
		try {
			const raw = sessionStorage.getItem(STORAGE_KEY);
			if (raw) {
				const saved = JSON.parse(raw);
				if (!saved || typeof saved !== 'object' || saved.version !== 1)
					throw new Error('Gammel lagring');
				if (
					validProgram(
						saved.program,
						PILOT_BLOCKS.map((item) => item.id),
						5
					)
				) {
					try {
						evaluateProgram('tekst', saved.program);
						program = saved.program;
					} catch {
						/* Keep safe start code. */
					}
				}
				if (
					validProgram(
						saved.roomProgram,
						ROOM_BLOCKS.map((item) => item.id),
						4
					)
				)
					roomProgram = saved.roomProgram;
				step = count(saved.step, 5);
				prediction = ['201', '400', '500'].includes(saved.prediction) ? saved.prediction : '';
				reasoning = text(saved.reasoning);
				predictionCompared =
					saved.predictionCompared === true && !!prediction && !!reasoning.trim();
				exampleSeen = saved.exampleSeen === true;
				traceSeen = saved.traceSeen === true;
				ownInput = text(saved.ownInput).slice(0, 120);
				missingField = saved.missingField === true;
				testReason = text(saved.testReason);
				testExpectation = saved.testExpectation === '201' ? '201' : '400';
				testedInput = text(saved.testedInput);
				testedReason = text(saved.testedReason);
				testedExpectation = text(saved.testedExpectation);
				reflection = text(saved.reflection);
				explanationShown = saved.explanationShown === true;
				selfAssessment = ['Kan forklare', 'Vil prøve mer'].includes(saved.selfAssessment)
					? saved.selfAssessment
					: '';
				hintCount = count(saved.hintCount, 3);
				roomHelp = saved.roomHelp === true;
				milestones = [0, 1, 2, 3].map((index) => saved.milestones?.[index] === true);
				attempts = count(saved.attempts, 10000);
				roomAttempts = count(saved.roomAttempts, 10000);
				if (saved.repairKey === program.join('|')) repairRun = evaluateProgram('tekst', program);
				if (saved.roomKey === roomProgram.join('|'))
					roomResults = ROOM_CASES.map((item) => evaluateRoom(roomProgram, item.value));
			}
		} catch {
			storageWarning = 'Forrige økt kunne ikke hentes. Du kan arbeide videre her.';
		}
		ready = true;
	});
	$effect(() => {
		if (!ready) return;
		const saved = {
			version: 1,
			step,
			program: [...program],
			roomProgram: [...roomProgram],
			prediction,
			reasoning,
			predictionCompared,
			exampleSeen,
			traceSeen,
			ownInput,
			missingField,
			testReason,
			testExpectation,
			testedInput,
			testedReason,
			testedExpectation,
			reflection,
			explanationShown,
			selfAssessment,
			hintCount,
			roomHelp,
			milestones: [...milestones],
			attempts,
			roomAttempts,
			repairKey: repairRun ? program.join('|') : null,
			roomKey: roomResults ? roomProgram.join('|') : null
		};
		try {
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
		} catch {
			storageWarning = 'Nettleseren kan ikke huske denne økten. Hold fanen åpen mens du arbeider.';
		}
	});

	/** @param {number} next */
	async function go(next) {
		step = Math.max(0, Math.min(5, next));
		frameIndex = 0;
		notice = '';
		revision += 1;
		await tick();
		heading?.focus();
	}
	/** @param {number} index */
	function walkTo(index) {
		frameIndex = Math.max(0, Math.min(walkthrough.frames.length - 1, index));
		if (frameIndex === walkthrough.frames.length - 1) {
			if (step === 0) exampleSeen = true;
			else traceSeen = true;
		}
	}
	function comparePrediction() {
		if (!prediction || !reasoning.trim()) return;
		predictionCompared = true;
		milestones[0] = true;
	}
	function ownTest() {
		if (!testReason.trim()) return;
		ownResult = evaluateTextInput(PILOT_START, ownInput, missingField);
		testedInput = missingField ? 'Feltet mangler' : JSON.stringify(ownInput);
		testedReason = testReason.trim();
		testedExpectation = testExpectation;
		milestones[1] = true;
	}
	/** @param {string[]} next @param {string} message */
	function edit(next, message) {
		program = next;
		repairRun = null;
		revision += 1;
		notice = `${message} Test koden på nytt.`;
	}
	function testRepair() {
		repairRun = evaluateProgram('tekst', program);
		attempts += 1;
		selectedResult = Math.max(
			0,
			repairRun.results.findIndex((result) => !result.passed)
		);
		if (repairRun.success) milestones[2] = true;
		notice = `${repairRun.passed} av ${repairRun.total} tester bestått.`;
	}
	/** @param {string[]} next @param {string} message */
	function editRoom(next, message) {
		roomProgram = next;
		roomResults = null;
		revision += 1;
		notice = `${message} Test romruten på nytt.`;
	}
	function testRooms() {
		roomResults = ROOM_CASES.map((item) => evaluateRoom(roomProgram, item.value));
		roomAttempts += 1;
		roomSelected = Math.max(
			0,
			roomResults.findIndex((result) => !result.passed)
		);
		if (roomResults.every((result) => result.passed)) milestones[3] = true;
		notice = `${roomResults.filter((result) => result.passed).length} av 6 romtester bestått.`;
	}
	async function copyReport() {
		try {
			await navigator.clipboard.writeText(report);
			notice = 'Arbeidsnotatet er kopiert.';
		} catch {
			notice = 'Marker teksten i arbeidsnotatet og kopier den selv.';
		}
	}
	function restart() {
		step = 0;
		program = [...PILOT_START];
		roomProgram = [...ROOM_START];
		prediction = '';
		reasoning = '';
		predictionCompared = false;
		exampleSeen = false;
		traceSeen = false;
		ownInput = '';
		missingField = false;
		testReason = '';
		testExpectation = '400';
		ownResult = null;
		testedInput = '';
		testedReason = '';
		testedExpectation = '';
		repairRun = null;
		roomResults = null;
		reflection = '';
		explanationShown = false;
		selfAssessment = '';
		hintCount = 0;
		roomHelp = false;
		milestones = [false, false, false, false];
		frameIndex = 0;
		caseIndex = 2;
		attempts = 0;
		roomAttempts = 0;
		resetOpen = false;
		revision += 1;
		notice = 'En ny pilotøkt er startet.';
	}
	/** @param {unknown} value */
	function json(value) {
		return JSON.stringify(value, null, 2) ?? 'undefined';
	}
</script>

<svelte:head>
	<title>Redd chatten · læringspilot | IT-laben</title>
	<meta
		name="description"
		content="Finn hvorfor tomme meldinger slipper inn. Forutsi, følg koden, reparer og prøv prinsippet på et romnavn."
	/>
</svelte:head>

<div class="pilot-page">
	<main id="hovedinnhold" tabindex="-1">
		<section class="hero" aria-labelledby="pilot-title">
			<div>
				<p class="eyebrow">REDD CHATTEN / LÆRINGSPILOT</p>
				<h1 id="pilot-title">En tom boble.<br /><em>En ekte kodefeil.</em></h1>
				<p>
					Chatten har fått tomme meldinger. Hva skjer når Mina sender tre mellomrom? Undersøk koden,
					reparer ruten og bruk det du lærer på et romnavn.
				</p>
				<div class="meta">
					<span>Ca. 20–25 min</span><span>Jobb alene eller i par</span><span
						>Ubegrensede forsøk</span
					>
				</div>
			</div>
			<div class="incident" aria-label="Feilrapport fra chatten">
				<div class="incident-top">
					<span class:fixed={repaired} class="status-dot"></span>{repaired
						? 'CHATTEN ER REPARERT'
						: 'FEILRAPPORT #001'}
				</div>
				<p class="sender">Mina <span>i #generelt</span></p>
				<div class="chat-bubble">{repaired ? 'Ugyldig melding avvist ✓' : '· · ·'}</div>
				<p class="incident-note">
					{repaired
						? 'Alle seks testene består. Gyldige meldinger kommer fortsatt fram.'
						: 'Mina har skrevet tre mellomrom. Undersøk hva serveren gjør med dem.'}
				</p>
			</div>
		</section>
		<details class="teacher-note">
			<summary>Til læreren · mål og gjennomføring</summary>
			<p>
				<strong>Mål:</strong> Eleven kan forklare og plassere validering før lagring. Forkunnskaper: if,
				lister, req.body og HTTP-svar. Vis kort hva trim() gjør dersom det er nytt.
			</p>
			<p>
				La eleven formulere en prediksjon før kjøring. I par: én forklarer, den andre foreslår en
				test. Bytt roller ved romoppgaven. Be om en tilsvarende forklaring i neste time uten denne
				siden.
			</p>
			<p>
				Testresultater viser oppførselen til koden. Elevens fritekst er ikke automatisk vurdert.
				Bruk arbeidsnotatet på siste del til samtale om forståelse og hjelpebehov. Pilotpoeng er
				separate fra XP og karakterer.
			</p>
		</details>
		{#if storageWarning}<p class="storage-note" role="status">{storageWarning}</p>{/if}
		<div class="lesson-layout">
			<aside class="lesson-menu" aria-label="Leksjonsoversikt">
				<p class="eyebrow">DITT OPPDRAG</p>
				<nav aria-label="Deler i piloten">
					{#each STEPS as item, index}
						<button
							type="button"
							class:current={step === index}
							aria-current={step === index ? 'step' : undefined}
							onclick={() => go(index)}
							><span class:done={done[index]}
								>{done[index] ? '✓' : String(index + 1).padStart(2, '0')}</span
							><strong>{item.short}</strong></button
						>
					{/each}
				</nav>
				<div class="points">
					<strong>{points}<span> / 40</span></strong>
					<p>Pilotpoeng denne økten</p>
					<progress value={points} max="40" aria-label="Opptjente pilotpoeng"></progress>
					<p class="small">10 poeng per milepæl. Hint og nye forsøk koster ingenting.</p>
					<details>
						<summary>Se milepælene</summary>
						<ul>
							{#each ['Sammenlignet en prediksjon', 'Laget og kjørt en egen test', 'Bestått chattestene', 'Bestått romtestene'] as label, index}<li
								>
									{milestones[index] ? '✓' : '○'}
									{label}
								</li>{/each}
						</ul>
						<p class="small">Opptjente poeng beholdes. Endrer du kode, må den testes på nytt.</p>
					</details>
				</div>
				<button class="quiet reset" type="button" onclick={() => (resetOpen = !resetOpen)}
					>Start en ny økt</button
				>
				{#if resetOpen}<div class="reset-confirm">
						<p>Slette svar, kode og pilotpoeng fra denne økten?</p>
						<button type="button" onclick={restart}>Ja, start på nytt</button><button
							type="button"
							class="quiet"
							onclick={() => (resetOpen = false)}>Behold arbeidet</button
						>
					</div>{/if}
			</aside>
			<section class="lesson" aria-labelledby="step-title">
				<div class="step-heading">
					<p class="eyebrow">DEL {step + 1} AV 6</p>
					<h2 id="step-title" tabindex="-1" bind:this={heading}>{STEPS[step].title}</h2>
					<p>{STEPS[step].description}</p>
				</div>
				{#if step === 0 || step === 2}
					<p class="instruction">
						{step === 0
							? 'Start med Ada sin vanlige melding. Bruk «Neste» og se når objektet opprettes, når listen endres og når svaret sendes.'
							: 'Dette er startkoden. Følg Mina sin request. Legg merke til tekstverdien når kontrollen kjører, og når meldingslisten endres.'}
					</p>
					<div class="workbench">
						<div class="code-pane">
							<h3>Startkoden</h3>
							<BackendRouteEditor
								blocks={PILOT_BLOCKS}
								program={PILOT_START}
								opening={codeFrame.opening}
								closing={codeFrame.closing}
								maxBlocks={5}
								disabled={true}
								disabledMessage="Dette er startkoden. Du kan endre den i del 4."
								onprogramchange={() => {}}
								activeBlockId={frame.blockId}
								activeLineIds={frame.lineIds}
								executedBlockIds={frame.executedBlockIds}
								skippedBlockIds={frame.skippedBlockIds}
								resetKey={`trace-${step}-${caseIndex}`}
								explanationBoundary={boundary ?? null}
							/>
						</div>
						<div bind:this={boundary}>
							<RequestWalkthrough
								{frame}
								previous={walkthrough.frames[frameIndex - 1] ?? null}
								index={frameIndex}
								total={walkthrough.frames.length}
								cases={traceCases}
								caseIndex={traceCaseIndex}
								source={activeSource}
								result={frame.phase === 'done' ? walkthrough.result : null}
								onstep={walkTo}
								oncase={(index) => {
									caseIndex = index;
									frameIndex = 0;
								}}
								onclose={() => go(step === 0 ? 1 : 3)}
								ontestall={() => go(step === 0 ? 1 : 3)}
								actionLabel={step === 0 ? 'Videre til prediksjonen →' : 'Videre til reparasjonen →'}
							/>
						</div>
					</div>
					{#if step === 2}
						<form
							class="panel own-test"
							onsubmit={(event) => {
								event.preventDefault();
								ownTest();
							}}
						>
							<p class="eyebrow">DIN EGEN UNDERSØKELSE</p>
							<h3>Velg en test som forteller deg noe</h3>
							<p>
								Prøv startkoden med en annen tekst, eller send uten tekstfeltet. Forklar hva du vil
								undersøke.
							</p>
							<label for="own-input">Tekst i requesten</label><input
								id="own-input"
								bind:value={ownInput}
								disabled={missingField}
								maxlength="120"
								placeholder="Skriv testdata, også mellomrom"
							/>
							<label class="check"
								><input type="checkbox" bind:checked={missingField} />Send uten tekstfelt</label
							>
							<p class="small">
								Sendes som: <code>{missingField ? '{}' : JSON.stringify({ tekst: ownInput })}</code>
							</p>
							<label for="test-expectation">Hva bør en riktig rute gjøre?</label><select
								id="test-expectation"
								bind:value={testExpectation}
								><option value="400">Avvise · 400 · uendret liste</option><option value="201"
									>Godta · 201 · lagre én melding</option
								></select
							>
							<label for="test-reason">Hva undersøker denne testen?</label><textarea
								id="test-reason"
								bind:value={testReason}
								rows="2"
								maxlength="1000"
								placeholder="Jeg vil finne ut om …"
								required></textarea><button type="submit" disabled={!testReason.trim()}
								>Kjør min test</button
							>
							{#if ownResult}<div class="feedback" role="status">
									<strong
										>{ownChanged
											? 'Resultat fra forrige test'
											: 'Dette skjedde i startkoden'}</strong
									>
									<p><code>{testedInput}</code> → {ownResult.actualSummary}</p>
									<p>{ownResult.feedback}</p>
									<p class="small">
										Du forventet {testedExpectation}. Kravet for disse dataene er {ownResult.expectedSummary}.
										Begrunnelsen din kan du diskutere med en medelev eller lærer.
									</p>
									{#if ownChanged}<p>
											Testdata eller begrunnelse er endret. Kjør testen igjen.
										</p>{/if}
								</div>{/if}
						</form>
					{/if}
				{:else if step === 1}
					<div class="prediction-layout">
						<div class="panel">
							<h3>Samme kode. Ny melding.</h3>
							<p>
								Mina sender <code>{JSON.stringify('   ')}</code> — tre mellomrom. Les startkoden og vurder
								hva den faktisk gjør.
							</p>
							<pre class="source"><code>{startCode}</code></pre>
						</div>
						<form
							class="panel"
							onsubmit={(event) => {
								event.preventDefault();
								comparePrediction();
							}}
						>
							<fieldset disabled={predictionCompared}>
								<legend>Hva tror du skjer?</legend>
								{#each [{ value: '201', label: '201 · meldingen blir lagret' }, { value: '400', label: '400 · meldingen blir avvist' }, { value: '500', label: '500 · koden krasjer' }] as option}<label
										class="choice"
										><input
											type="radio"
											name="prediction"
											value={option.value}
											bind:group={prediction}
										/>{option.label}</label
									>{/each}
								<label for="reason">Hvorfor tror du det?</label><textarea
									id="reason"
									bind:value={reasoning}
									rows="3"
									maxlength="1000"
									placeholder="Jeg tror … fordi …"
									required></textarea>
							</fieldset>
							{#if !predictionCompared}<button
									type="submit"
									disabled={!prediction || !reasoning.trim()}>Kjør og sammenlign</button
								>{:else}<div class="feedback" role="status">
									<strong
										>{prediction === '201'
											? 'Prediksjonen din stemte med kjøringen.'
											: 'Kjøringen ga et annet resultat enn prediksjonen.'}</strong
									>
									<p>
										{predictionResult.actualSummary}. En streng med mellomrom er truthy, så
										<code>!tekst</code> er false. Kontrollen stopper ikke lagringen.
									</p>
									<p>Se på begrunnelsen din: hva vil du beholde eller justere?</p>
								</div>
								<button class="quiet" type="button" onclick={() => (predictionCompared = false)}
									>Endre prediksjonen</button
								>{/if}
						</form>
					</div>
				{:else if step === 3}
					<p class="instruction">
						Rydd teksten, stopp ugyldig innhold før lagring, og la vanlige meldinger slippe gjennom.
						Bruk «Legg til / bytt kode» og pilene for å endre ruten.
					</p>
					<div class="workbench">
						<div class="code-pane">
							<h3>Din reparasjon</h3>
							<BackendRouteEditor
								blocks={PILOT_BLOCKS}
								{program}
								opening={codeFrame.opening}
								closing={codeFrame.closing}
								maxBlocks={5}
								onprogramchange={edit}
								resetKey={`repair-${revision}`}
								explanationBoundary={boundary ?? null}
							/>
						</div>
						<div class="panel" bind:this={boundary}>
							<h3>Holder løsningen?</h3>
							<p>Testene sjekker både svaret og innholdet i listen. Du kan teste så ofte du vil.</p>
							<button type="button" onclick={testRepair}>Test alle seks tilfellene</button>
							{#if repairRun}<p class="test-score" class:success={repaired}>
									{repairRun.passed} / 6 tester bestått
								</p>
								<div class="test-list" role="group" aria-label="Velg testresultat">
									{#each repairRun.results as result, index}<button
											type="button"
											class:chosen={selectedResult === index}
											onclick={() => (selectedResult = index)}
											><span>{result.passed ? '✓' : '↺'}</span>{cases[index].name}</button
										>{/each}
								</div>
								<div class="feedback" role="status">
									<strong>{cases[selectedResult].name}</strong>
									<p>{repairRun.results[selectedResult].feedback}</p>
									<p class="small">
										Faktisk: {repairRun.results[selectedResult].actualSummary}<br />Krav: {repairRun
											.results[selectedResult].expectedSummary}
									</p>
								</div>
								{#if repaired}<p class="success-note">
										Reparasjonen består alle testene. Forklar nå hvorfor den virker.
									</p>{/if}
							{:else}<p class="small">Nåværende kode er ikke testet ennå.</p>{/if}
							<div class="hints">
								<h4>Hjelp når du trenger det</h4>
								{#each HINTS.slice(0, hintCount) as hint, index}<p>
										<strong>Hint {index + 1}.</strong>
										{hint}
									</p>{/each}{#if hintCount < HINTS.length}<button
										type="button"
										class="quiet"
										onclick={() => (hintCount += 1)}
										>{hintCount ? 'Vis et tydeligere hint' : 'Vis første hint'}</button
									>{/if}
								<p class="small">Hint endrer ikke pilotpoengene.</p>
							</div>
						</div>
					</div>
				{:else if step === 4}
					{#if !repaired}<p class="feedback">
							Nåværende reparasjon er ikke bekreftet av testene. <button
								class="link-button"
								type="button"
								onclick={() => go(3)}>Tilbake til reparasjonen →</button
							>
						</p>{/if}
					<div class="panel reflection">
						<h3>Hvorfor blir listen uendret?</h3>
						<p>
							Forklar hva som skjer når en melding med bare mellomrom kommer inn i den reparerte
							ruten. Bruk gjerne ordene <code>trim</code>, <code>if</code>, <code>return</code> og
							<code>push</code>.
						</p>
						<label for="reflection">Din forklaring · én til tre setninger</label><textarea
							id="reflection"
							bind:value={reflection}
							rows="4"
							maxlength="1000"
							placeholder="Først … Derfor blir …"></textarea><button
							type="button"
							disabled={!reflection.trim()}
							onclick={() => (explanationShown = true)}>Sammenlign med en faglig forklaring</button
						>
						{#if explanationShown}<div class="feedback">
								<strong>Et mulig svar</strong>
								<p>
									trim() gjør mellomrommene om til en tom streng. if-testen oppdager at teksten er
									tom. return sender 400 og stanser ruten før push. Derfor blir ingen melding lagt i
									listen. En feilkode etter push ville ikke gjort lagringen ugjort.
								</p>
								<p>
									Sammenlign med din forklaring: har du med både kontrollen og hvorfor lagringen
									ikke blir kjørt? Forklar gjerne til en medelev som foreslår en test.
								</p>
							</div>
							<fieldset>
								<legend>Hvordan vurderer du forståelsen din nå?</legend><label class="choice"
									><input
										type="radio"
										name="self-assessment"
										value="Kan forklare"
										bind:group={selfAssessment}
									/>Jeg kan forklare sammenhengen</label
								><label class="choice"
									><input
										type="radio"
										name="self-assessment"
										value="Vil prøve mer"
										bind:group={selfAssessment}
									/>Jeg vil prøve eller spørre mer</label
								>
							</fieldset>
							<p class="small">
								Dette er din egen vurdering. Teksten er ikke automatisk godkjent.
							</p>{/if}
					</div>
				{:else}
					<p class="instruction">
						En annen rute oppretter chatterom. Reparer den: gyldige navn skal ryddes og lagres én
						gang med 201. Tomme navn, mellomrom, manglende navn og tall skal få 400 uten å endre
						romlisten.
					</p>
					<div class="workbench">
						<div class="code-pane">
							<h3>En ny rute · /rom</h3>
							<BackendRouteEditor
								blocks={ROOM_BLOCKS}
								program={roomProgram}
								opening={ROOM_FRAME.opening}
								closing={ROOM_FRAME.closing}
								maxBlocks={4}
								onprogramchange={editRoom}
								onexplain={() => (roomHelp = true)}
								resetKey={`room-${revision}`}
								explanationBoundary={boundary ?? null}
							/>
						</div>
						<div class="panel" bind:this={boundary}>
							<h3>Prøv prinsippet selv</h3>
							<p>
								Her får du testresultater, men ingen stegvis gjennomgang. Bruk det du lærte fra
								meldingsruten.
							</p>
							<button type="button" onclick={testRooms}>Test romruten</button>
							{#if roomResults}<p class="test-score" class:success={transferred}>
									{roomResults.filter((result) => result.passed).length} / 6 tester bestått
								</p>
								<div class="test-list" role="group" aria-label="Velg romtest">
									{#each roomResults as result, index}<button
											type="button"
											class:chosen={roomSelected === index}
											onclick={() => (roomSelected = index)}
											><span>{result.passed ? '✓' : '↺'}</span>{ROOM_CASES[index].name}</button
										>{/each}
								</div>
								<div class="feedback" role="status">
									<strong>{ROOM_CASES[roomSelected].name}</strong>
									<p>{roomResults[roomSelected].feedback}</p>
									<p class="small">
										Sendt navn: <code>{json(ROOM_CASES[roomSelected].value)}</code>
									</p>
									<details>
										<summary>Se romlisten og svaret</summary>
										<pre><code
												>{json({
													rom: roomResults[roomSelected].rooms,
													status: roomResults[roomSelected].status,
													svar: roomResults[roomSelected].response
												})}</code
											></pre>
									</details>
								</div>{/if}
							<div class="hints">
								{#if roomHelp}<p>
										Undersøk rekkefølgen: behandle navnet, kontroller det, lagre rommet og send
										svaret. Kontroller at return ved feil skjer før push.
									</p>{:else}<button class="quiet" type="button" onclick={() => (roomHelp = true)}
										>Jeg trenger hjelp med romruten</button
									>{/if}
								<p class="small">Du kan bruke hjelp uten poengtrekk.</p>
							</div>
						</div>
					</div>
					{#if transferred}<div class="completion" role="status">
							<span class="completion-mark">✓</span>
							<div>
								<h3>Romruten består alle testene.</h3>
								<p>
									Du har brukt validering før lagring i en ny sammenheng. {roomHelp
										? 'Du brukte hjelp underveis. Prøv gjerne å forklare løsningen uten hjelpeteksten.'
										: 'Du åpnet ikke hjelpen i denne delen. Forklar gjerne løsningen til en medelev.'}
								</p>
								<p>
									Ta med prinsippet til ditt eget prosjekt: hva må være sant før data skal endres?
								</p>
							</div>
						</div>{/if}
					<details class="panel report">
						<summary>Arbeidsnotat · svarene og forsøkene dine</summary>
						<p>Bruk notatet i en samtale med læreren. Det sendes ikke automatisk.</p>
						<pre>{report}</pre>
						<button type="button" onclick={copyReport}>Kopier arbeidsnotatet</button>
					</details>
				{/if}
				<p class="announcement" role="status" aria-live="polite">{notice}</p>
				<footer class="step-footer">
					<button type="button" class="quiet" disabled={step === 0} onclick={() => go(step - 1)}
						>← Forrige del</button
					><span>{step + 1} / 6</span>{#if step < 5}<button
							type="button"
							onclick={() => go(step + 1)}>Neste: {STEPS[step + 1].short} →</button
						>{:else}<a href="/spill/redd-chatten/">Til Redd chatten →</a>{/if}
				</footer>
			</section>
		</div>
		<PageLinks links={[{ href: '/spill/redd-chatten/', label: 'Tilbake til Redd chatten' }]} />
	</main>
</div>

<style>
	.pilot-page {
		font-family: 'Segoe UI', system-ui, sans-serif;
		color: var(--color-text);
		min-height: 100vh;
		background:
			radial-gradient(ellipse at 85% 0%, var(--color-page-glow), transparent 45%), var(--color-page);
	}

	a {
		color: var(--color-accent);
		text-underline-offset: 4px;
	}

	main {
		width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		padding: 0 0 50px;
		margin: auto;
	}
	.hero {
		display: grid;
		grid-template-columns: 1.3fr 0.7fr;
		gap: 70px;
		align-items: center;
		padding: 48px 0 32px;
	}
	.eyebrow {
		color: var(--color-text-muted);
		font-size: 12px;
		font-weight: 750;
		letter-spacing: 1.7px;
		margin: 0 0 12px;
	}
	h1 {
		font-size: clamp(36px, 4.2vw, 62px);
		line-height: 1.08;
		letter-spacing: -2px;
		margin: 0 0 22px;
		font-weight: 750;
	}
	h1 em {
		color: var(--color-accent);
		font-style: normal;
	}
	.hero p:not(.eyebrow) {
		max-width: 660px;
	}
	.hero > div > p:not(.eyebrow) {
		font-size: 18px;
		line-height: 1.65;
	}
	.meta {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		margin-top: 22px;
	}
	.meta span {
		font-size: 12px;
		border: 1px solid var(--color-border-strong);
		padding: 5px 10px;
		border-radius: 99px;
	}
	.incident {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 18px;
		padding: 24px;
		box-shadow: 0 16px 45px var(--color-shadow);
		transform: rotate(1deg);
	}
	.incident-top {
		font-size: 11px;
		font-weight: 750;
		letter-spacing: 1.1px;
		display: flex;
		align-items: center;
		gap: 9px;
		padding-bottom: 18px;
		border-bottom: 1px solid var(--color-border);
	}
	.status-dot {
		width: 9px;
		height: 9px;
		background: var(--color-warning);
		border-radius: 50%;
	}
	.status-dot.fixed {
		background: var(--color-success);
	}
	.sender {
		font-weight: 700;
		margin-bottom: 7px;
	}
	.sender span {
		font-weight: 400;
		font-size: 13px;
		color: var(--color-text-muted);
	}
	.chat-bubble {
		width: fit-content;
		min-width: 100px;
		padding: 12px 20px;
		background: var(--color-surface-active);
		border-radius: 2px 14px 14px;
		font:
			600 18px/1.5 ui-monospace,
			monospace;
	}
	.incident-note {
		font-size: 13px;
		color: var(--color-text-muted);
		margin-bottom: 0;
	}
	.teacher-note {
		border-block: 1px solid var(--color-border);
		padding: 16px 0;
		margin-bottom: 30px;
		font-size: 14px;
	}
	.teacher-note p {
		max-width: 1000px;
	}
	summary {
		cursor: pointer;
		font-weight: 650;
	}
	.lesson-layout {
		display: grid;
		grid-template-columns: 188px minmax(0, 1fr);
		gap: 30px;
		align-items: start;
	}
	.lesson-menu {
		position: sticky;
		top: 20px;
	}
	.lesson-menu nav {
		display: grid;
		gap: 6px;
	}
	button,
	input,
	textarea,
	select {
		font: inherit;
	}
	button {
		background: var(--color-action);
		color: var(--color-on-action);
		border: 1px solid transparent;
		padding: 11px 16px;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 650;
		line-height: 1.4;
	}
	button:hover:not(:disabled) {
		background: var(--color-action-hover);
	}
	button:disabled {
		opacity: 0.48;
		cursor: default;
	}
	:where(button, a, input, textarea, select, summary):focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	.quiet {
		background: var(--color-surface);
		color: var(--color-text);
		border-color: var(--color-border-strong);
	}
	.quiet:hover:not(:disabled) {
		background: var(--color-surface-hover);
	}
	.lesson-menu nav button {
		display: flex;
		gap: 11px;
		align-items: center;
		text-align: left;
		background: transparent;
		color: var(--color-text-muted);
		padding: 10px 8px;
	}
	.lesson-menu nav button:hover,
	.lesson-menu nav button.current {
		background: var(--color-surface-active);
		color: var(--color-text);
	}
	.lesson-menu nav button span {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border: 1px solid var(--color-border-strong);
		border-radius: 7px;
		font:
			12px ui-monospace,
			monospace;
	}
	.lesson-menu nav button span.done {
		background: var(--color-success-soft);
		color: var(--color-success);
	}
	.lesson-menu nav strong {
		font-size: 14px;
	}
	.points {
		border-top: 1px solid var(--color-border);
		padding: 22px 5px 0;
		margin-top: 22px;
	}
	.points > strong {
		font-size: 30px;
		letter-spacing: -1px;
	}
	.points > strong span {
		font-size: 16px;
		color: var(--color-text-muted);
	}
	.points p {
		font-size: 13px;
		margin: 2px 0 10px;
	}
	.points .small {
		font-size: 12px;
	}
	.points summary,
	.points li {
		font-size: 12px;
	}
	.points ul {
		padding-left: 0;
		list-style: none;
		display: grid;
		gap: 7px;
	}
	progress {
		width: 100%;
		height: 8px;
		accent-color: var(--color-accent);
		margin: 8px 0 12px;
	}
	.reset {
		font-size: 12px;
		margin-top: 24px;
	}
	.reset-confirm {
		font-size: 13px;
	}
	.reset-confirm button {
		font-size: 12px;
		margin-bottom: 8px;
	}
	.lesson {
		min-width: 0;
	}
	.step-heading {
		margin-bottom: 22px;
	}
	.step-heading h2 {
		font-size: 30px;
		line-height: 1.25;
		letter-spacing: -0.8px;
		margin: 0;
	}
	.step-heading h2:focus {
		outline: none;
	}
	.step-heading > p:last-child {
		color: var(--color-text-muted);
		margin: 10px 0 0;
	}
	.instruction {
		border-left: 3px solid var(--color-accent);
		padding: 4px 0 4px 16px;
		margin-bottom: 24px;
		max-width: 850px;
	}
	.workbench {
		display: grid;
		grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.9fr);
		gap: 20px;
		align-items: start;
	}
	.code-pane {
		min-width: 0;
	}
	h3 {
		margin: 0 0 14px;
		font-size: 20px;
		letter-spacing: -0.3px;
	}
	h4 {
		margin: 0 0 10px;
	}
	.panel {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		padding: 23px;
		min-width: 0;
	}
	.panel p:first-child {
		margin-top: 0;
	}
	p {
		line-height: 1.65;
	}
	.small {
		font-size: 13px;
		color: var(--color-text-muted);
		overflow-wrap: anywhere;
	}
	code {
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		font-size: 0.94em;
		white-space: pre-wrap;
	}
	pre {
		overflow-x: auto;
		font-size: 14px;
		line-height: 1.7;
	}
	.source {
		background: var(--color-code-bg);
		color: var(--color-code-text);
		padding: 16px;
		border-radius: 8px;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.prediction-layout {
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		gap: 20px;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0 0 16px;
		min-width: 0;
	}
	legend {
		font-weight: 700;
		margin-bottom: 12px;
		padding: 0;
	}
	label:not(.choice):not(.check) {
		display: block;
		font-size: 14px;
		font-weight: 650;
		margin: 18px 0 8px;
	}
	input:not([type='radio']):not([type='checkbox']),
	textarea,
	select {
		box-sizing: border-box;
		width: 100%;
		background: var(--color-surface-raised);
		border: 1px solid var(--color-border-strong);
		border-radius: 7px;
		color: var(--color-text);
		padding: 11px 12px;
	}
	textarea {
		resize: vertical;
		min-height: 78px;
		margin-bottom: 16px;
	}
	input[type='radio'],
	input[type='checkbox'] {
		accent-color: var(--color-accent);
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}
	.choice {
		display: flex;
		align-items: center;
		gap: 11px;
		padding: 12px;
		margin-bottom: 8px;
		border: 1px solid var(--color-border);
		border-radius: 7px;
		cursor: pointer;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 12px;
	}
	.feedback {
		background: var(--color-info-soft);
		border-left: 3px solid var(--color-info-border);
		padding: 16px;
		margin-top: 20px;
		border-radius: 0 8px 8px 0;
		overflow-wrap: anywhere;
	}
	.feedback p:last-child {
		margin-bottom: 0;
	}
	.feedback p {
		margin: 8px 0;
	}
	.own-test {
		margin-top: 24px;
		max-width: 780px;
	}
	.test-score {
		font:
			700 24px/1.4 ui-monospace,
			monospace;
		color: var(--color-warning);
		margin: 22px 0 14px;
	}
	.test-score.success {
		color: var(--color-success);
	}
	.test-list {
		display: grid;
		gap: 6px;
	}
	.test-list button {
		display: flex;
		align-items: center;
		gap: 10px;
		background: var(--color-surface-soft);
		color: var(--color-text);
		text-align: left;
		font-size: 14px;
		font-weight: 500;
		padding: 10px 12px;
	}
	.test-list button:hover,
	.test-list button.chosen {
		background: var(--color-surface-active);
		border-color: var(--color-border-strong);
	}
	.test-list span {
		font-weight: 800;
	}
	.hints {
		margin-top: 25px;
		padding-top: 20px;
		border-top: 1px solid var(--color-border);
		font-size: 14px;
	}
	.success-note {
		color: var(--color-success);
		font-weight: 600;
	}
	.reflection {
		max-width: 780px;
	}
	.reflection fieldset {
		margin-top: 24px;
	}
	.link-button {
		display: inline;
		padding: 0;
		background: transparent;
		color: var(--color-accent);
		text-decoration: underline;
	}
	.link-button:hover {
		color: var(--color-on-action);
	}
	.completion {
		display: flex;
		gap: 20px;
		background: var(--color-success-soft);
		border: 1px solid var(--color-success-border);
		border-radius: 12px;
		padding: 25px;
		margin-top: 24px;
	}
	.completion p {
		margin-bottom: 0;
	}
	.completion-mark {
		font-size: 30px;
		color: var(--color-success);
	}
	.report {
		margin-top: 20px;
	}
	.report pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		background: var(--color-surface-soft);
		padding: 16px;
		border-radius: 7px;
	}
	.announcement {
		min-height: 25px;
		color: var(--color-text-muted);
		font-size: 14px;
		margin: 18px 0 8px;
	}
	.step-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		padding-top: 20px;
		border-top: 1px solid var(--color-border);
	}
	.step-footer span {
		font-size: 13px;
		color: var(--color-text-muted);
	}
	.step-footer a {
		font-weight: 650;
	}
	.storage-note {
		background: var(--color-warning-soft);
		padding: 10px;
		font-size: 14px;
	}
	@media (max-width: 1150px) {
		.lesson-layout {
			grid-template-columns: 155px minmax(0, 1fr);
			gap: 22px;
		}
		.workbench,
		.prediction-layout {
			grid-template-columns: 1fr;
		}
		.hero {
			gap: 35px;
		}
	}
	@media (max-width: 700px) {
		main {
			padding: 0 0 30px;
		}

		.hero {
			grid-template-columns: 1fr;
			gap: 24px;
			padding: 32px 0 24px;
		}
		h1 {
			letter-spacing: -1.3px;
		}
		.hero > div > p:not(.eyebrow) {
			font-size: 16px;
		}
		.incident {
			transform: none;
			padding: 18px;
		}
		.lesson-layout {
			grid-template-columns: 1fr;
		}
		.lesson-menu {
			position: static;
		}
		.lesson-menu nav {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		.lesson-menu nav button {
			gap: 6px;
			padding: 8px 4px;
		}
		.lesson-menu nav strong {
			font-size: 12px;
		}
		.lesson-menu nav button span {
			width: 23px;
			height: 23px;
			flex-shrink: 0;
		}
		.points {
			margin-top: 14px;
			padding-top: 10px;
		}
		.points > strong {
			font-size: 23px;
		}
		.points > p,
		.points > progress,
		.points > .small,
		.points details {
			display: inline-block;
			margin-right: 8px;
		}
		.points > progress {
			width: 75px;
		}
		.points details {
			display: block;
		}
		.reset {
			margin-top: 8px;
		}
		.panel {
			padding: 17px;
		}
		.step-heading h2 {
			font-size: 26px;
		}
		.step-footer {
			flex-wrap: wrap;
		}
		.step-footer button {
			font-size: 13px;
			padding: 10px 12px;
		}
		.step-footer span {
			display: none;
		}
	}
</style>
