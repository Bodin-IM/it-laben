<script>
	import PageLinks from '#lib/components/PageLinks.svelte';
	import { onMount } from 'svelte';
	import BadgeIcon from '#lib/components/BadgeIcon.svelte';
	import {
		activityLab as lab,
		learningContext,
		timedChallengeRequest,
		saveTimedAttempt,
		randomId,
		refreshLab,
		ApiError
	} from '#lib/lab.js';
	import { labPreferences, setLabPreferences } from '#lib/labPreferences.js';
	import { timedChallenges, shiftClock, taskAnswered } from '#lib/timedChallenges.js';
	import { createNightwatchAudio } from '#lib/nightwatchAudio.js';
	import { avatarFeedback } from '#lib/avatarFeedback.js';

	const definition = (() => {
		const match = timedChallenges.find((item) => item.id === 'nattvakt');
		if (!match) throw new Error('Nattevakten mangler i aktivitetsregisteret.');
		return match;
	})();
	/** @type {import('#lib/timedChallenges.js').ShiftState|null} */
	let info = $state(null);
	/** @type {import('#lib/timedChallenges.js').TimedAnswers} */
	let answers = $state({});
	let mounted = $state(false);
	let loadedFor = $state('');
	let busy = $state(false);
	let saving = $state(false);
	let dirty = $state(false);
	let conflict = $state(false);
	let error = $state('');
	let localWarning = $state(false);
	let audioReady = $state(false);
	let audioError = $state('');
	let selected = $state(0);
	let remaining = $state(definition.durationMs);
	let serverNow = 0;
	let anchor = 0;
	let serial = 0;
	let changes = 0;
	/** @type {ReturnType<typeof setTimeout>|null} */
	let debounce = null;
	/** @type {ReturnType<typeof createNightwatchAudio>|null} */
	let audio = $state.raw(null);
	const practice = $derived($learningContext.mode === 'practice');
	const teaching = $derived($learningContext.mode === 'teaching');
	const active = $derived.by(() => info?.active ?? null);
	const report = $derived.by(() => info?.report ?? null);
	const pending = $derived(
		$lab.pendingObjectives.includes(`${definition.id}:${definition.objectiveId}`)
	);
	const incidents = $derived.by(() => active?.scenario.incidents ?? []);
	const incident = $derived(incidents[selected]);
	const ready = $derived(
		incidents.filter((item) => item.tasks.every((task) => taskAnswered(task, answers[task.id])))
			.length
	);
	const untimed = $derived(!!active && active.deadlineAt === null);
	const urgent = $derived(!!active && remaining <= 60000);
	$effect(() => {
		if (urgent)
			avatarFeedback(
				'nattvakt',
				'thinking',
				'Siste minutt. Prioriter én feil av gangen og husk å levere.'
			);
	});
	const phase = $derived(
		untimed
			? 'TEST UTEN TIDSFRIST'
			: remaining <= 60000
				? 'SISTE MINUTT'
				: remaining <= 180000
					? 'ÅPNING NÆRMER SEG'
					: 'VAKTEN ER I GANG'
	);
	const disabled = $derived(pending || remaining <= 0 || conflict || busy);
	const prerequisiteList = $derived.by(
		() =>
			info?.prerequisites ?? definition.prerequisites.map((item) => ({ ...item, completed: false }))
	);
	const nextOpen = $derived.by(() =>
		info?.nextAttemptAt
			? new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium', timeStyle: 'short' }).format(
					info.nextAttemptAt
				)
			: ''
	);
	function localKey(attemptId = active?.id) {
		return `it-laben-shift-draft-v1-${$lab.user?.id}-${attemptId}`;
	}
	function forgetDraft(attemptId = active?.id) {
		try {
			localStorage.removeItem(localKey(attemptId));
		} catch {
			/* Server storage remains available. */
		}
	}
	/** @param {import('#lib/timedChallenges.js').TimedAnswers} value */
	function answerKey(value) {
		return JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
	}
	function keepLocal() {
		if (!active) return;
		try {
			localStorage.setItem(
				localKey(),
				JSON.stringify({ revision: active.revision, answers: $state.snapshot(answers) })
			);
		} catch {
			localWarning = true;
		}
	}
	/** @param {import('#lib/timedChallenges.js').ShiftResponse} response @param {boolean} [restore] @param {boolean} [ownSave] */
	function accept(response, restore = false, ownSave = false) {
		serverNow = response.serverNow;
		anchor = performance.now();
		const previousId = info?.active?.id;
		if (previousId && response.state.active && response.state.active.id !== previousId)
			forgetDraft(previousId);
		if (
			!ownSave &&
			dirty &&
			response.state.active?.id === previousId &&
			response.state.active?.revision !== info?.active?.revision
		)
			conflict = true;
		info = response.state;
		if (!info.active) {
			if (previousId) forgetDraft(previousId);
			dirty = false;
			conflict = false;
			return;
		}
		remaining =
			info.active.deadlineAt === null
				? definition.durationMs
				: Math.max(0, info.active.deadlineAt - serverNow);
		if (!dirty || previousId !== info.active.id) answers = $state.snapshot(info.active.answers);
		if (previousId !== info.active.id) {
			selected = 0;
			dirty = false;
			conflict = false;
		}
		if (restore) {
			try {
				const local = JSON.parse(localStorage.getItem(localKey()) || 'null');
				if (local?.answers && typeof local.answers === 'object' && !Array.isArray(local.answers)) {
					const tasks = info.active.scenario.incidents.flatMap((item) => item.tasks);
					const valid = Object.entries(local.answers).every(([id, value]) => {
						const task = tasks.find((item) => item.id === id);
						return (
							task &&
							(task.type === 'order'
								? Array.isArray(value) &&
									new Set(value).size === value.length &&
									value.every((choice) => task.choices.some((item) => item.id === choice))
								: task.choices.some((item) => item.id === value))
						);
					});
					if (valid && answerKey(local.answers) !== answerKey(info.active.answers)) {
						answers = local.answers;
						dirty = true;
						conflict = local.revision !== info.active.revision;
						if (!conflict) scheduleSave();
					}
				}
			} catch {
				/* Ignore a damaged local copy; the server draft is intact. */
			}
		}
	}
	async function syncStatus(reset = false) {
		const accountId = $lab.user?.id;
		if (!accountId) return;
		if (!reset && active && dirty && remaining > 0) {
			void saveDraft();
			return;
		}
		const request = ++serial;
		try {
			const response = await timedChallengeRequest(definition.id);
			if ($lab.user?.id !== accountId || request !== serial) return;
			if (reset) {
				dirty = false;
				conflict = false;
				forgetDraft();
			}
			accept(response, !info);
			error = '';
		} catch (problem) {
			if ($lab.user?.id === accountId && request === serial) {
				error = problem instanceof Error ? problem.message : 'Kunne ikke hente vaktstatus.';
				if (problem instanceof ApiError && (problem.status === 401 || problem.code === 'CSRF'))
					void refreshLab();
			}
		}
	}
	function scheduleSave() {
		if (debounce) clearTimeout(debounce);
		debounce = setTimeout(() => {
			void saveDraft();
		}, 700);
	}
	async function saveDraft() {
		if (!active || !dirty || saving || conflict || pending || remaining <= 0) return;
		const accountId = $lab.user?.id;
		const attemptId = active.id;
		const change = changes;
		const draft = $state.snapshot(answers);
		const revision = active.revision;
		saving = true;
		serial++;
		try {
			const response = await timedChallengeRequest(definition.id, 'draft', {
				attemptId,
				revision,
				answers: draft
			});
			if ($lab.user?.id !== accountId || active?.id !== attemptId) return;
			if (changes === change) dirty = false;
			accept(response, false, true);
			error = '';
			if (!dirty) forgetDraft(attemptId);
			else keepLocal();
		} catch (problem) {
			if ($lab.user?.id !== accountId || active?.id !== attemptId) return;
			conflict = problem instanceof ApiError && problem.code === 'TIMED_DRAFT_CONFLICT';
			error = problem instanceof Error ? problem.message : 'Kunne ikke lagre utkastet.';
		} finally {
			if ($lab.user?.id === accountId) {
				saving = false;
				if (dirty && !conflict && !error) scheduleSave();
			}
		}
	}
	/** @param {string} taskId @param {string|string[]} value */
	function choose(taskId, value) {
		if (disabled) return;
		answers = { ...answers, [taskId]: value };
		changes++;
		dirty = true;
		keepLocal();
		scheduleSave();
	}
	/** @param {string} taskId @returns {string[]} */
	function ordered(taskId) {
		const value = answers[taskId];
		return Array.isArray(value) ? value : [];
	}
	/** @param {string} taskId @param {number} index @param {number} direction */
	function move(taskId, index, direction) {
		const order = [...ordered(taskId)];
		[order[index], order[index + direction]] = [order[index + direction], order[index]];
		choose(taskId, order);
	}
	async function enableAudio() {
		if (!audio) return;
		audioReady = await audio.enable();
		audioError = audioReady ? '' : 'Nettleseren kunne ikke starte lyden. Vakten fungerer fortsatt.';
	}
	async function start(reset = false) {
		if (busy || !$lab.user) return;
		busy = true;
		serial++;
		error = '';
		const accountId = $lab.user.id;
		if ($labPreferences.sound) await enableAudio();
		try {
			const response = await timedChallengeRequest(definition.id, 'start', {
				startId: randomId(),
				reset
			});
			if ($lab.user?.id !== accountId) return;
			accept(response);
		} catch (problem) {
			if ($lab.user?.id === accountId) {
				error = problem instanceof Error ? problem.message : 'Kunne ikke starte vakten.';
				void syncStatus();
			}
		} finally {
			if ($lab.user?.id === accountId) busy = false;
		}
	}
	function submitShift() {
		if (!active || disabled || ready !== incidents.length) return;
		if (debounce) clearTimeout(debounce);
		saveTimedAttempt(definition.id, definition.objectiveId, active.id, $state.snapshot(answers));
	}
	$effect(() => {
		if (!mounted || !$lab.ready) return;
		const accountId = `${$lab.user?.id ?? 'guest'}:${$learningContext.mode}:${$learningContext.openingId}:${$learningContext.untimed}`;
		if (loadedFor === accountId) return;
		loadedFor = accountId;
		serial++;
		info = null;
		answers = {};
		dirty = false;
		conflict = false;
		busy = false;
		saving = false;
		error = '';
		selected = 0;
		changes = 0;
		if ($lab.user) void syncStatus();
	});
	let wasPending = false;
	$effect(() => {
		if (wasPending && !pending && $lab.user) void syncStatus(true);
		wasPending = pending;
	});
	$effect(() => {
		audio?.update(
			remaining,
			definition.durationMs,
			$labPreferences.volume,
			!!active && audioReady && $labPreferences.sound
		);
	});
	onMount(() => {
		audio = createNightwatchAudio();
		mounted = true;
		let expiredFor = '';
		const clock = setInterval(() => {
			if (!active || active.deadlineAt === null) return;
			remaining = Math.max(0, active.deadlineAt - (serverNow + performance.now() - anchor));
			if (!remaining && expiredFor !== active.id) {
				expiredFor = active.id;
				void syncStatus(true);
			}
		}, 250);
		const poll = setInterval(() => {
			if ($lab.user && !saving && !busy && !conflict) void syncStatus();
		}, 15000);
		const reconnect = () => {
			if (!saving && !busy) void syncStatus();
		};
		window.addEventListener('online', reconnect);
		window.addEventListener('focus', reconnect);
		return () => {
			clearInterval(clock);
			clearInterval(poll);
			if (debounce) clearTimeout(debounce);
			window.removeEventListener('online', reconnect);
			window.removeEventListener('focus', reconnect);
			audio?.destroy();
		};
	});
</script>

<div
	class="nightwatch"
	class:urgent
	class:running={!!active}
	style:--remaining={`${Math.max(0, remaining / definition.durationMs) * 100}%`}
>
	<main id="hovedinnhold" tabindex="-1">
		<div class="dispatch-label">
			<span class="live-dot"></span> OPERASJONSSENTRAL <span>UTVIKLING / Vg2 IT</span>
		</div>
		<div class="hero">
			<div>
				<p class="eyebrow">
					{practice ? 'ØVING UTEN XP' : teaching ? 'UNDERVISNINGSFORSØK' : 'HARDCORE UTFORDRING'}
				</p>
				<h1>Nattevakten<span>.</span></h1>
				<p class="lead">Fire feil. Åtte minutter.<br />Få produksjonen klar før åpning.</p>
			</div>
			<div class="clock-panel" class:live={!!active}>
				<span class="clock-label"
					>{active ? phase : report ? 'NESTE ÅPNING' : 'TID TIL ÅPNING'}</span
				>
				<strong
					class="clock"
					role="timer"
					aria-label={untimed
						? 'Test uten tidsfrist'
						: active
							? `${shiftClock(remaining)} igjen`
							: 'Åtte minutter'}
					>{untimed ? 'TEST' : active ? shiftClock(remaining) : '08:00'}</strong
				>
				<div class="time-track" aria-hidden="true"><span></span></div>
				<span class="clock-caption"
					>{untimed
						? 'Test uten tidsfrist · ingen XP'
						: active
							? 'Fristen fortsetter hvis du forlater siden.'
							: practice
								? 'Fri øving · ingen XP eller ordinære forsøk'
								: teaching
									? 'Ett ekstra forsøk · vanlig XP ved bestått'
									: 'Én vakt per 24 timer · 50 XP første gang'}</span
				>
			</div>
		</div>
		<div class="sound-bar">
			<label
				><input
					type="checkbox"
					checked={$labPreferences.sound}
					onchange={async (event) => {
						setLabPreferences({ sound: event.currentTarget.checked });
						if (event.currentTarget.checked) await enableAudio();
					}}
				/><span>Spenningslyd</span></label
			>
			<label class="volume"
				>Volum<input
					type="range"
					min="0"
					max="0.6"
					step="0.05"
					value={$labPreferences.volume}
					oninput={(event) => setLabPreferences({ volume: Number(event.currentTarget.value) })}
				/></label
			>
			{#if active && $labPreferences.sound && !audioReady}<button
					class="text-button"
					type="button"
					onclick={enableAudio}>Start lydbildet</button
				>{:else}<span class="sound-caption"
					>{active && audioReady && $labPreferences.sound
						? 'Lav ambience → raskere puls mot slutten'
						: 'Velg lyd før start, eller spill i stillhet.'}</span
				>{/if}
		</div>
		{#if active}<div class="shift-hud" aria-label="Vaktstatus">
				<span class="hud-status"><span class="live-dot"></span>{phase}</span>
				<strong>{untimed ? 'TEST' : shiftClock(remaining)}</strong><span
					>{ready}/{incidents.length} klargjort</span
				>
				<a href="#vaktrapport">Til innlevering ↓</a
				>{#if practice && info?.access?.canRestart}<button
						type="button"
						class="text-button"
						disabled={busy || pending}
						onclick={() => start(true)}>Start ny øvingsvakt</button
					>{/if}
			</div>{/if}
		{#if error || audioError}<div class="notice" role="status">
				<p>{error || audioError}</p>
				{#if conflict}<button type="button" class="secondary" onclick={() => syncStatus(true)}
						>Hent lagret utkast</button
					>{:else if $lab.user}<button
						type="button"
						class="text-button"
						onclick={() => syncStatus()}>Oppdater vaktstatus</button
					>{/if}
			</div>{/if}
		{#if $lab.error && $lab.user && !pending}<p class="notice" role="status">
				{$lab.error}
				<button type="button" class="text-button" onclick={() => refreshLab()}
					>Prøv å synkronisere</button
				>
			</p>{/if}
		{#if localWarning}<p class="notice">
				Nettleseren tillater ikke lokal lagring. Utkastet lagres på serveren når du har forbindelse.
			</p>{/if}
		{#if active}
			<div class="workspace">
				<aside class="incident-nav" aria-label="Hendelser">
					<div class="panel-heading">
						<span>HENDELSESKØ</span><span>{ready}/{incidents.length} klargjort</span>
					</div>
					{#each incidents as item, index (item.id)}
						<button
							type="button"
							class:current={selected === index}
							aria-pressed={selected === index}
							onclick={() => (selected = index)}
							><span class="incident-number">0{index + 1}</span><span
								><strong>{item.title}</strong><small
									>{item.tasks.every((task) => taskAnswered(task, answers[task.id]))
										? 'Rettinger valgt'
										: 'Trenger retting'}</small
								></span
							><span class="queue-mark" aria-hidden="true"
								>{item.tasks.every((task) => taskAnswered(task, answers[task.id]))
									? '◇'
									: '○'}</span
							></button
						>
					{/each}
					<div class="dispatch-note">
						<span class="eyebrow">VAKTLOGG / {active.scenario.name}</span>
						<p>Undersøk sporene. Velg rettelser. Lever alle fire samlet når du er klar.</p>
						<span class="save-state" role="status"
							>{pending
								? 'Innlevering venter …'
								: conflict
									? 'Utkast må hentes på nytt'
									: saving
										? 'Lagrer utkast …'
										: dirty
											? 'Endringer venter på lagring'
											: 'Utkast lagret'}</span
						>
					</div>
				</aside>
				{#if incident}<section class="incident-panel" aria-labelledby="incident-title">
						<div class="panel-heading">
							<span>SAK 0{selected + 1} / 04</span><span class="signal">{incident.signal}</span>
						</div>
						<h2 id="incident-title">{incident.title}</h2>
						<div class="evidence">
							<div>
								<h3>SPOR FRA OVERVÅKINGEN</h3>
								<ul>
									{#each incident.logs as line}<li>{line}</li>{/each}
								</ul>
							</div>
							<div class="code-window">
								<div>{incident.file}</div>
								<pre><code>{incident.code}</code></pre>
							</div>
						</div>
						<div class="repairs">
							{#each incident.tasks as task (task.id)}
								<fieldset {disabled}>
									<legend>{task.title}</legend>
									{#if task.type === 'select'}
										<div class="choice-list">
											{#each task.choices as choice (choice.id)}<label
													class:chosen={answers[task.id] === choice.id}
													><input
														type="radio"
														name={task.id}
														value={choice.id}
														checked={answers[task.id] === choice.id}
														onchange={() => choose(task.id, choice.id)}
													/><span
														><strong>{choice.label}</strong>{#if choice.code}<code
																>{choice.code}</code
															>{/if}</span
													></label
												>{/each}
										</div>
									{:else}
										<p class="task-hint">
											Legg til blokkene i rekkefølge. Bruk pilene for å flytte dem.
										</p>
										<ol class="block-order">
											{#each ordered(task.id) as choiceId, index (choiceId)}{@const choice =
													task.choices.find((item) => item.id === choiceId)}
												<li>
													<span class="block-position">{index + 1}</span>
													<div><strong>{choice?.label}</strong><code>{choice?.code}</code></div>
													<div class="block-actions">
														<button
															type="button"
															class="icon-button"
															aria-label={`Flytt ${choice?.label} opp`}
															disabled={disabled || index === 0}
															onclick={() => move(task.id, index, -1)}>↑</button
														><button
															type="button"
															class="icon-button"
															aria-label={`Flytt ${choice?.label} ned`}
															disabled={disabled || index === ordered(task.id).length - 1}
															onclick={() => move(task.id, index, 1)}>↓</button
														><button
															type="button"
															class="icon-button"
															aria-label={`Fjern ${choice?.label}`}
															{disabled}
															onclick={() =>
																choose(
																	task.id,
																	ordered(task.id).filter((id) => id !== choiceId)
																)}>×</button
														>
													</div>
												</li>{/each}
										</ol>
										<div class="block-bank">
											{#each task.choices.filter((item) => !ordered(task.id).includes(item.id)) as choice (choice.id)}<button
													type="button"
													{disabled}
													onclick={() => choose(task.id, [...ordered(task.id), choice.id])}
													><span>＋ {choice.label}</span><code>{choice.code}</code></button
												>{/each}
										</div>
									{/if}
								</fieldset>
							{/each}
						</div>
						<div class="case-footer">
							<span>Valgene kontrolleres samlet ved levering.</span
							>{#if selected < incidents.length - 1}<button
									type="button"
									class="secondary"
									onclick={() => selected++}>Neste hendelse →</button
								>{:else}<button type="button" class="secondary" onclick={() => (selected = 0)}
									>Se gjennom fra starten ↗</button
								>{/if}
						</div>
					</section>{/if}
			</div>
			<section class="handover" id="vaktrapport" aria-labelledby="handover-title">
				<div>
					<p class="eyebrow">KLAR FOR ÅPNING?</p>
					<h2 id="handover-title">Lever vaktrapporten.</h2>
					<p>
						{ready} av {incidents.length} hendelser har alle rettinger valgt. Én sluttinnlevering — alle
						kontrollene må bestås innen fristen.
					</p>
				</div>
				<button
					type="button"
					class="primary"
					disabled={disabled || ready !== incidents.length}
					onclick={submitShift}
					>{pending ? 'Leveringen venter på bekreftelse …' : 'Lever alle rettingene →'}</button
				>
			</section>
			{#if pending}<p class="notice" role="status">
					Innleveringen venter på bekreftelse. Den må være mottatt før fristen for at vakten skal
					bestås. <button type="button" class="text-button" onclick={() => refreshLab()}
						>Prøv å synkronisere</button
					>
				</p>{/if}
		{:else}
			{#if report}
				<section class="report" class:passed={report.passed} aria-labelledby="report-title">
					<div class="report-heading">
						<BadgeIcon symbol={report.passed ? '08' : '…'} earned={report.passed} size={64} />
						<div>
							<p class="eyebrow">HENDELSESRAPPORT</p>
							<h2 id="report-title">
								{report.passed
									? 'Produksjonen er klar.'
									: report.reason === 'expired'
										? 'Åpningstiden er her.'
										: 'Vakten trenger en ny runde.'}
							</h2>
							<p>
								{report.passed
									? `Alle fire hendelser løst på ${shiftClock(report.elapsedMs)}. ${practice ? 'Øvingsresultatet er lagret uten XP.' : 'Resultatet er lagret i Min lab.'}`
									: report.reason === 'expired'
										? `Tiden er ute. ${report.score} av ${report.total} hendelser hadde riktige rettinger i det lagrede utkastet. Denne vakten gir ikke XP.`
										: `${report.score} av ${report.total} hendelser bestått. Se hva som gjenstår før neste vakt.`}
							</p>
						</div>
					</div>
					<div class="report-grid">
						{#each report.incidents as item}<details open={!item.passed}>
								<summary
									><span class:ok={item.passed} class="result-dot"></span><span>{item.title}</span
									><small>{item.passed ? 'BESTÅTT' : 'ØV VIDERE'}</small></summary
								>
								<div class="report-body">
									<ul>
										{#each item.checks as check}<li>
												<strong>{check.passed ? '✓' : '·'} {check.name}</strong
												>{#if !check.passed}<span>{check.detail}</span>{/if}
											</li>{/each}
									</ul>
									<p>{item.explanation}</p>
									<details class="solution">
										<summary>Se løsningsprinsippet</summary>{#each item.solution as line}<pre><code
													>{line}</code
												></pre>{/each}
									</details>
									<a href={item.lesson.href}>Øv: {item.lesson.title} →</a>
								</div>
							</details>{/each}
					</div>
				</section>
			{/if}
			<section class="briefing">
				<div class="briefing-copy">
					<p class="eyebrow">DIN NESTE VAKT</p>
					<h2>07:52. Du har ansvaret.</h2>
					<p>
						Om åtte minutter åpner chatten. Meldinger feiler, innloggingen svikter, feil bruker får
						slettet data og en omstart tømmer historikken. Følg sporene og reparer systemet.
					</p>
					<div class="rules">
						<span>08 MINUTTER</span><span>04 HENDELSER</span><span>01 INNLEVERING</span>
					</div>
					<ul class="briefing-rules">
						<li>
							{practice
								? 'Du kan starte nye øvingsvakter uten å bruke ordinære forsøk.'
								: teaching
									? 'Dette er ett ekstra forsøk i undervisningsåpningen.'
									: 'Forsøket brukes når du starter. Neste vakt åpner 24 timer senere.'}
						</li>
						<li>Du kan lese spor og endre valgene helt fram til innlevering.</li>
						<li>
							Utkast lagres underveis. {untimed
								? 'Dette testforsøket har ingen tidsfrist.'
								: 'Fristen fortsetter ved oppdatering eller utlogging.'}
						</li>
						<li>
							{practice
								? 'Øving gir ingen XP eller merker og påvirker ikke din personlige rekord.'
								: 'Alle fire hendelser må bestås. Første bestått gir 50 XP og merket Nattevakten.'}
						</li>
					</ul>
					{#if info?.bestMs !== null && info?.bestMs !== undefined}<p class="best">
							DIN REKORD <strong>{shiftClock(info.bestMs)}</strong><span
								>Nye vakter kan forbedre rekorden. XP gis én gang.</span
							>
						</p>{/if}
				</div>
				<div class="preflight">
					<p class="eyebrow">FØR DU TAR VAKTEN</p>
					<h3>
						{practice
							? 'Din øvingsvakt'
							: teaching
								? 'Ekstra undervisningsforsøk'
								: 'Forberedelsene dine'}
					</h3>
					{#if $learningContext.mode === 'normal'}<p>
							Bestå disse fagsjekkene for å låse opp utfordringen.
						</p>
						<ul>
							{#each prerequisiteList as item}<li>
									<span class:complete={item.completed}>{item.completed ? '✓' : '○'}</span><a
										href={item.href}>{item.title}<span>→</span></a
									>
								</li>{/each}
						</ul>{:else}<p>
							{practice
								? 'Egen øvingsprogresjon uten XP. Du kan starte på nytt mens øvingen er åpen.'
								: 'Forkunnskapskravene er åpnet. Du har ett ekstra forsøk i denne åpningen.'}
						</p>{/if}
					{#if !$lab.ready}<p role="status">Henter Min lab …</p>{:else if !$lab.user}<a
							class="primary"
							href="/min-lab/">Start Min lab →</a
						>{:else if !info}<button type="button" class="secondary" onclick={() => syncStatus()}
							>Hent vaktstatus</button
						>{:else if teaching && info.access?.used}<p class="cooldown">
							Undervisningsforsøket i denne åpningen er brukt.
						</p>
					{:else if info.access?.closed}<p class="cooldown">Åpningen er stengt for nye forsøk.</p>
					{:else if info.nextAttemptAt}<p class="cooldown" role="status">
							Neste vakt åpner <strong>{nextOpen}</strong>
						</p>
						<button type="button" class="secondary" onclick={() => syncStatus()}
							>Oppdater vaktstatus</button
						>{:else}<button
							type="button"
							class="primary"
							disabled={!info.unlocked || busy || info.access?.canStart === false}
							onclick={() => start()}
							>{busy
								? 'Starter vakten …'
								: practice
									? $learningContext.untimed
										? 'Start test uten tidsfrist →'
										: 'Start øvingsvakten · 08:00 →'
									: 'Start vakten · 08:00 →'}</button
						><small class="start-note"
							>{info.unlocked
								? practice
									? 'Øving påvirker ikke dine ordinære forsøk eller XP.'
									: 'Startknappen bruker forsøket og starter nedtellingen.'
								: 'Fullfør forberedelsene for å starte.'}</small
						>{/if}
				</div>
			</section>
		{/if}
		<footer class="mission-footer">
			<span>IT-LABEN / NATTEVAKTEN</span><span
				>En simulert produksjonsvakt. Prøv. Forstå. Ta med deg læringen.</span
			>
		</footer>
		<PageLinks links={[{ href: '/#spill', label: 'Alle oppdrag og spill' }]} />
	</main>
</div>

<style>
	.nightwatch {
		--ink: #e6eee9;
		--muted: #99afa6;
		--line: #2b4039;
		--mint: #b9e5bb;
		--amber: #e8b578;
		min-height: 100vh;
		background: #0a1512;
		color: var(--ink);
		font:
			400 15px/1.6 system-ui,
			sans-serif;
		padding: 0 min(32px, var(--layout-gutter));
		overflow-wrap: anywhere;
		color-scheme: dark;
	}
	.nightwatch * {
		box-sizing: border-box;
	}

	main {
		max-width: 1240px;
		margin: auto;
	}
	.dispatch-label {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 30px 0 0;
		color: var(--muted);
		font-size: 10px;
		letter-spacing: 1.7px;
		font-weight: 650;
		flex-wrap: wrap;
	}
	.dispatch-label > span:last-child {
		margin-left: auto;
		color: #789187;
	}
	.live-dot,
	.result-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--amber);
		flex: 0 0 auto;
	}
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
		align-items: center;
		gap: 36px;
		padding: 35px 0;
	}
	.eyebrow {
		font-size: 10px;
		letter-spacing: 2px;
		color: var(--mint);
		font-weight: 700;
		margin: 0 0 10px;
	}
	h1 {
		font-size: clamp(2.5rem, 7vw, 6.5rem);
		letter-spacing: -6px;
		line-height: 1.05;
		font-weight: 650;
		margin: 0 0 18px;
	}
	h1 > span {
		color: var(--mint);
	}
	.lead {
		color: var(--muted);
		font-size: 17px;
		line-height: 1.65;
		margin: 0;
	}
	.clock-panel {
		padding: 24px 28px;
		background: radial-gradient(ellipse at top right, #1c3427aa, transparent 70%), #101f19;
		border: 1px solid #334c3d;
		border-radius: 12px;
		position: relative;
		min-width: 0;
	}
	.clock-label {
		display: block;
		letter-spacing: 2px;
		color: var(--muted);
		font-size: 10px;
	}
	.clock {
		display: block;
		color: var(--mint);
		font:
			500 clamp(3.6rem, 6.5vw, 5rem)/1.3 ui-monospace,
			monospace;
		letter-spacing: -4px;
		font-variant-numeric: tabular-nums;
	}
	.time-track {
		height: 3px;
		background: #2a3d33;
		margin: 10px 0 15px;
		overflow: hidden;
	}
	.time-track > span {
		display: block;
		height: 100%;
		background: var(--mint);
		width: 100%;
	}
	.live .time-track > span {
		width: var(--remaining);
		transition: width 0.25s linear;
	}
	.clock-caption {
		color: var(--muted);
		font-size: 11px;
	}
	.urgent {
		--mint: #efb677;
	}
	.urgent .clock-panel {
		border-color: #936744;
		box-shadow: 0 0 40px #a85c2010;
	}
	.sound-bar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px 24px;
		padding: 14px 0;
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
		color: var(--muted);
		margin-bottom: 28px;
		font-size: 12px;
	}
	.shift-hud {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 12px 24px;
		flex-wrap: wrap;
		padding: 12px 18px;
		border: 1px solid #425c45;
		border-radius: 7px;
		background: #102018f5;
		box-shadow: 0 8px 22px #07100b66;
		font-size: 11px;
	}
	.shift-hud .hud-status {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--muted);
		font-size: 9px;
		letter-spacing: 1px;
	}
	.shift-hud strong {
		font:
			550 24px/1.2 ui-monospace,
			monospace;
		font-variant-numeric: tabular-nums;
		color: var(--mint);
	}
	.shift-hud > a {
		color: var(--mint);
		margin-left: auto;
		font-size: 11px;
		text-decoration: none;
		min-height: 30px;
		display: flex;
		align-items: center;
	}
	.urgent .shift-hud {
		border-color: #a47a50;
	}
	.handover {
		scroll-margin-top: 100px;
	}
	.sound-bar label {
		display: flex;
		align-items: center;
		gap: 9px;
		min-height: 32px;
		cursor: pointer;
	}
	.sound-bar input {
		accent-color: var(--mint);
	}
	.volume input {
		width: 94px;
	}
	.sound-caption {
		margin-left: auto;
		font-size: 11px;
	}
	button,
	input,
	a,
	summary {
		-webkit-tap-highlight-color: transparent;
	}
	button {
		font: inherit;
		cursor: pointer;
	}
	button:disabled {
		cursor: default;
		opacity: 0.5;
	}
	button:focus-visible,
	a:focus-visible,
	input:focus-visible,
	summary:focus-visible {
		outline: 3px solid #ebc58a;
		outline-offset: 4px;
	}
	.primary,
	.secondary {
		min-height: 46px;
		padding: 11px 18px;
		border-radius: 6px;
		border: 1px solid #bcdeb0;
		background: #c0e1b4;
		color: #10231a;
		font-size: 13px;
		font-weight: 750;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		text-decoration: none;
		max-width: 100%;
	}
	.secondary {
		background: #192c23;
		color: var(--ink);
		border-color: #3c5447;
		font-size: 12px;
	}
	.text-button {
		padding: 4px 0;
		color: var(--mint);
		background: none;
		border: 0;
		font-size: 12px;
		text-decoration: underline;
		min-height: 32px;
	}
	.notice {
		border: 1px solid #755b37;
		background: #2d2518;
		color: #ebc68d;
		border-radius: 8px;
		padding: 14px 18px;
		margin: 16px 0;
		font-size: 13px;
	}
	.notice p {
		margin: 0 0 8px;
	}
	.briefing {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr);
		gap: 48px;
		padding: 28px 0 48px;
	}
	h2 {
		font-size: 26px;
		line-height: 1.3;
		letter-spacing: -0.8px;
		margin: 0 0 15px;
		font-weight: 650;
	}
	.briefing-copy > p:not(.eyebrow) {
		max-width: 570px;
		color: var(--muted);
	}
	.rules {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin: 24px 0;
	}
	.rules > span {
		border: 1px solid var(--line);
		border-radius: 4px;
		padding: 6px 10px;
		font:
			10px/1.4 ui-monospace,
			monospace;
		letter-spacing: 1px;
		color: #bdcfc4;
	}
	.briefing-rules {
		padding-left: 18px;
		font-size: 13px;
		color: var(--muted);
	}
	.briefing-rules li {
		margin: 9px 0;
		padding-left: 5px;
	}
	.preflight {
		border: 1px solid var(--line);
		background: #101f19;
		padding: 26px;
		border-radius: 10px;
		align-self: start;
	}
	.preflight h3 {
		margin: 0 0 8px;
		font-size: 20px;
		font-weight: 650;
	}
	.preflight > p:not(.eyebrow) {
		font-size: 13px;
		color: var(--muted);
	}
	.preflight ul {
		padding: 0;
		margin: 20px 0;
		list-style: none;
	}
	.preflight li {
		display: flex;
		align-items: center;
		gap: 10px;
		border-top: 1px solid var(--line);
		padding: 13px 0;
		font-size: 12px;
		color: #81968a;
	}
	.preflight li a {
		color: #c4d6c9;
		text-decoration: none;
		display: flex;
		justify-content: space-between;
		flex: 1;
		gap: 12px;
	}
	.preflight .complete {
		color: #b5e5ac;
	}
	.preflight .primary,
	.preflight > .secondary {
		width: 100%;
	}
	.start-note {
		display: block;
		color: var(--muted);
		font-size: 11px;
		margin-top: 12px;
	}
	.cooldown strong {
		display: block;
		color: #eac795;
		margin-top: 4px;
	}
	.best {
		border-left: 2px solid var(--mint);
		padding-left: 14px;
		font-size: 10px;
		letter-spacing: 1px;
	}
	.best strong {
		font:
			500 22px ui-monospace,
			monospace;
		color: var(--ink);
		margin-left: 10px;
	}
	.best span {
		display: block;
		letter-spacing: 0;
		font-size: 12px;
		margin-top: 5px;
	}
	.workspace {
		display: grid;
		grid-template-columns: 270px minmax(0, 1fr);
		gap: 20px;
		margin: 28px 0 20px;
		align-items: start;
	}
	.incident-nav {
		position: sticky;
		top: 84px;
		border: 1px solid var(--line);
		border-radius: 9px;
		background: #101e19;
		overflow: hidden;
	}
	.panel-heading {
		padding: 14px 18px;
		border-bottom: 1px solid var(--line);
		color: var(--muted);
		font-size: 9px;
		letter-spacing: 1px;
		display: flex;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
	}
	.incident-nav > button {
		display: flex;
		align-items: center;
		gap: 11px;
		width: 100%;
		padding: 18px 14px;
		border: 0;
		border-bottom: 1px solid var(--line);
		border-left: 2px solid transparent;
		background: transparent;
		color: var(--ink);
		text-align: left;
	}
	.incident-nav > button.current {
		background: #1c3327;
		border-left-color: var(--mint);
	}
	.incident-number {
		color: #86a08f;
		font:
			11px ui-monospace,
			monospace;
	}
	.incident-nav strong {
		display: block;
		font-size: 12px;
		font-weight: 650;
	}
	.incident-nav small {
		display: block;
		font-size: 10px;
		color: var(--muted);
		margin-top: 3px;
	}
	.queue-mark {
		margin-left: auto;
		color: #88a88c;
	}
	.dispatch-note {
		padding: 20px 17px;
	}
	.dispatch-note .eyebrow {
		font-size: 8px;
		letter-spacing: 1px;
	}
	.dispatch-note p {
		font-size: 12px;
		color: var(--muted);
		margin: 8px 0 20px;
	}
	.save-state {
		color: #a9c4ac;
		font-size: 10px;
	}
	.incident-panel {
		border: 1px solid var(--line);
		border-radius: 9px;
		overflow: hidden;
		background: #101e19;
		min-width: 0;
	}
	.incident-panel > h2 {
		padding: 24px 25px 0;
		font-size: 25px;
	}
	.signal {
		color: #dab386;
		letter-spacing: 0;
	}
	.evidence {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
		gap: 16px;
		padding: 0 25px 24px;
	}
	.evidence h3 {
		font-size: 9px;
		color: #99b3a4;
		letter-spacing: 1px;
		margin: 3px 0 12px;
	}
	.evidence ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.evidence li {
		color: #a2b7a9;
		font:
			11px/1.7 ui-monospace,
			monospace;
		padding: 7px 0;
		border-bottom: 1px solid #22392c;
	}
	.code-window {
		background: #0a1610;
		border: 1px solid #2c4034;
		border-radius: 5px;
		min-width: 0;
	}
	.code-window > div {
		padding: 8px 12px;
		color: #7e9e88;
		font-size: 10px;
		border-bottom: 1px solid #293e30;
	}
	pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		margin: 0;
		font:
			11px/1.8 ui-monospace,
			monospace;
	}
	.code-window pre {
		padding: 13px;
		color: #c1d5bb;
	}
	.repairs {
		border-top: 1px solid var(--line);
		padding: 24px 25px;
	}
	fieldset {
		min-width: 0;
		padding: 0;
		margin: 0 0 25px;
		border: 0;
	}
	fieldset:last-child {
		margin-bottom: 0;
	}
	legend {
		padding: 0;
		font-size: 13px;
		color: var(--ink);
		font-weight: 650;
		margin-bottom: 12px;
	}
	.choice-list {
		display: grid;
		gap: 8px;
	}
	.choice-list label {
		display: flex;
		gap: 12px;
		padding: 13px 14px;
		background: #13251b;
		border: 1px solid #2d4435;
		border-radius: 5px;
		cursor: pointer;
		align-items: flex-start;
	}
	.choice-list label.chosen {
		background: #203b28;
		border-color: #7ea47a;
	}
	.choice-list label > span {
		min-width: 0;
	}
	.choice-list input {
		accent-color: #bdddb0;
		margin: 4px 0 0;
		flex: 0 0 16px;
		width: 16px;
		height: 16px;
	}
	.choice-list strong {
		display: block;
		font-size: 12px;
		font-weight: 550;
	}
	.choice-list code,
	.block-order code,
	.block-bank code {
		display: block;
		font:
			10px/1.7 ui-monospace,
			monospace;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		color: #96b49b;
		margin-top: 4px;
	}
	.task-hint {
		font-size: 12px;
		color: var(--muted);
		margin: 0 0 14px;
	}
	.block-order {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.block-order li {
		display: flex;
		align-items: center;
		gap: 10px;
		border: 1px solid #435f47;
		border-radius: 5px;
		margin-bottom: 8px;
		padding: 12px;
		background: #1b3022;
	}
	.block-position {
		font:
			11px ui-monospace,
			monospace;
		color: #bddcb8;
	}
	.block-order li > div:first-of-type {
		min-width: 0;
		flex: 1;
	}
	.block-order strong {
		font-size: 11px;
		font-weight: 600;
	}
	.block-actions {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}
	.icon-button {
		padding: 4px 7px;
		min-height: 36px;
		min-width: 32px;
		color: #c6ddc3;
		border: 1px solid #4c6650;
		background: #213a28;
		border-radius: 4px;
	}
	.block-bank {
		display: grid;
		gap: 7px;
	}
	.block-bank > button {
		background: #122118;
		border: 1px dashed #405b45;
		color: #b8cdb9;
		border-radius: 4px;
		padding: 11px 13px;
		text-align: left;
	}
	.block-bank > button > span {
		font-size: 11px;
		font-weight: 600;
	}
	.case-footer {
		border-top: 1px solid var(--line);
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 15px;
		padding: 16px 25px;
	}
	.case-footer > span {
		font-size: 10px;
		color: var(--muted);
	}
	.handover {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 20px;
		border: 1px solid #3f5844;
		border-radius: 9px;
		padding: 25px;
		background: #15271b;
		margin: 20px 0 36px;
	}
	.handover > div {
		flex: 1 1 300px;
	}
	.handover h2 {
		font-size: 22px;
		margin-bottom: 7px;
	}
	.handover p:not(.eyebrow) {
		margin: 0;
		color: var(--muted);
		font-size: 12px;
	}
	.report {
		padding: 28px;
		border: 1px solid #6c5538;
		border-radius: 10px;
		background: #191f16;
		margin: 28px 0;
	}
	.report.passed {
		border-color: #618958;
		background: radial-gradient(ellipse at top right, #31512b55, transparent 65%), #14271a;
	}
	.report-heading {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 26px;
	}
	.report-heading h2 {
		margin-bottom: 9px;
	}
	.report-heading p:not(.eyebrow) {
		margin: 0;
		color: #b2c6b4;
		font-size: 13px;
	}
	.report-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		align-items: start;
		gap: 12px;
	}
	.report-grid > details {
		background: #102016;
		border: 1px solid #344d39;
		border-radius: 7px;
		min-width: 0;
	}
	.report-grid > details > summary {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 15px;
		cursor: pointer;
		font-size: 12px;
		list-style: none;
	}
	.report-grid > details > summary > small {
		margin-left: auto;
		font-size: 8px;
		letter-spacing: 1px;
		color: var(--muted);
	}
	.result-dot.ok {
		background: #a5d391;
	}
	.report-body {
		border-top: 1px solid #344d39;
		padding: 16px;
		font-size: 12px;
		color: #b4c8b6;
	}
	.report-body > ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.report-body li {
		margin-bottom: 10px;
	}
	.report-body li strong {
		display: block;
		font-size: 11px;
		font-weight: 550;
	}
	.report-body li span {
		display: block;
		font-size: 11px;
		color: #c9b796;
		margin: 4px 0;
	}
	.report-body a {
		color: #c4e4b8;
		font-size: 11px;
	}
	.solution {
		margin: 18px 0;
		color: var(--muted);
		font-size: 11px;
	}
	.solution summary {
		cursor: pointer;
		min-height: 30px;
	}
	.solution pre {
		padding: 10px;
		background: #0c170e;
		border-radius: 4px;
		margin-top: 8px;
		font-size: 10px;
	}
	.mission-footer {
		border-top: 1px solid var(--line);
		padding: 22px 0 30px;
		display: flex;
		justify-content: space-between;
		gap: 20px;
		flex-wrap: wrap;
		font-size: 10px;
		color: #81988a;
	}
	.mission-footer > span:first-child {
		letter-spacing: 1.5px;
		font-size: 9px;
	}
	@media (max-width: 1050px) {
		.evidence {
			grid-template-columns: 1fr;
		}
		.workspace {
			grid-template-columns: 235px minmax(0, 1fr);
		}
	}
	@media (max-width: 760px) {
		.nightwatch {
			padding: 0 20px;
		}
		.hero {
			grid-template-columns: 1fr 250px;
			gap: 22px;
		}
		h1 {
			letter-spacing: -3px;
		}
		.clock-panel {
			padding: 20px;
		}
		.briefing {
			grid-template-columns: 1fr;
			gap: 25px;
		}
		.workspace {
			grid-template-columns: 1fr;
		}
		.incident-nav {
			position: static;
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.incident-nav .panel-heading,
		.dispatch-note {
			grid-column: 1/-1;
		}
		.incident-nav > button {
			padding: 14px 12px;
		}
		.dispatch-note {
			padding: 14px;
		}
		.dispatch-note p {
			margin: 5px 0 10px;
		}
		.report-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 540px) {
		.shift-hud {
			gap: 8px 13px;
			padding: 10px 12px;
		}
		.shift-hud .hud-status {
			width: 100%;
			font-size: 8px;
		}
		.nightwatch {
			padding: 0 16px;
		}

		.hero {
			grid-template-columns: 1fr;
			gap: 24px;
			padding: 28px 0;
		}
		.hero > div:first-child {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
		}
		h1 {
			font-size: clamp(2.5rem, 12vw, 4.2rem);
			letter-spacing: -2px;
			margin-bottom: 12px;
		}
		.lead {
			font-size: 15px;
		}
		.clock-panel {
			display: grid;
			grid-template-columns: 1fr auto;
			gap: 0 14px;
			align-items: center;
			padding: 16px 20px;
		}
		.clock {
			grid-column: 2;
			grid-row: 1/3;
			font-size: 3.3rem;
		}
		.clock-label {
			font-size: 8px;
		}
		.time-track {
			margin: 8px 0;
		}
		.clock-caption {
			grid-column: 1/-1;
			font-size: 10px;
		}
		.sound-bar {
			gap: 8px 18px;
		}
		.sound-caption {
			width: 100%;
			margin: 0;
			font-size: 10px;
		}
		.dispatch-label {
			padding-top: 22px;
			font-size: 8px;
			gap: 6px;
		}
		.dispatch-label > span:last-child {
			letter-spacing: 0.5px;
		}
		.briefing {
			padding-top: 12px;
		}
		h2 {
			font-size: 23px;
		}
		.preflight {
			padding: 20px;
		}
		.incident-nav {
			grid-template-columns: 1fr;
		}
		.incident-nav > button {
			min-height: 57px;
			padding: 11px 14px;
		}
		.incident-nav strong {
			font-size: 12px;
		}
		.incident-panel > h2 {
			padding: 20px 17px 0;
			font-size: 23px;
		}
		.panel-heading {
			padding: 12px 16px;
		}
		.evidence {
			padding: 0 17px 20px;
		}
		.repairs {
			padding: 20px 16px;
		}
		.case-footer {
			padding: 16px;
		}
		.block-order li {
			flex-wrap: wrap;
		}
		.block-actions {
			width: 100%;
			justify-content: flex-end;
		}
		.handover {
			padding: 20px;
		}
		.handover > .primary {
			width: 100%;
		}
		.report {
			padding: 20px 16px;
		}
		.report-heading {
			align-items: flex-start;
			gap: 14px;
		}
		.report-heading h2 {
			font-size: 22px;
		}
		.report-heading :global(.badge-icon) {
			--badge-size: 46px !important;
		}
		.report-grid > details > summary {
			flex-wrap: wrap;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.live .time-track > span {
			transition: none;
		}
	}
	:global(html[data-lab-motion='reduced']) .live .time-track > span {
		transition: none;
	}
</style>
