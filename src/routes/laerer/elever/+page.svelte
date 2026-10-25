<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { lab, schoolRequest, randomId } from '#lib/lab.js';
	import { hasTeacherRole } from '#lib/learning.js';
	import { schoolDate } from '#lib/school.js';
	import { fag } from '#lib/innhold.js';
	import TeacherShell from '#lib/components/TeacherShell.svelte';
	import BadgeIcon from '#lib/components/BadgeIcon.svelte';
	const browser = typeof window !== 'undefined';
	/** @type {import('#lib/school.js').StudentList|null} */
	let listing = $state(null);
	/** @type {import('#lib/school.js').StudentDetail|null} */
	let detail = $state(null);
	let search = $state(''),
		status = $state('active'),
		subject = $state('alle');
	let error = $state(''),
		message = $state(''),
		loadedKey = $state('');
	let loading = $state(false),
		busy = $state(false),
		confirmation = $state(''),
		actionError = $state('');
	/** @type {HTMLDialogElement|undefined} */
	let dialog = $state();
	/** @type {{id:string,actorId:string,studentId:string,name:string,action:string,disabled?:boolean}|null} */
	let pendingAction = $state(null);
	let revision = 0;
	const selectedId = $derived(browser ? page.url.searchParams.get('elev') : null);
	const administrator = $derived($lab.user?.role === 'admin');
	const visibleActivities = $derived.by(() =>
		(detail?.activities ?? []).filter((item) => subject === 'alle' || item.subject === subject)
	);
	const listQuery = $derived.by(() => {
		const params = new URLSearchParams(browser ? page.url.search : '');
		params.delete('elev');
		return params.toString();
	});
	function listHref(/** @type {number|undefined} */ number) {
		const params = new URLSearchParams(listQuery);
		if (number) params.set('page', String(number));
		return '/laerer/elever/' + (params.size ? `?${params}` : '');
	}
	function studentHref(/** @type {string} */ id) {
		const params = new URLSearchParams(listQuery);
		params.set('elev', id);
		return `/laerer/elever/?${params}`;
	}
	async function load() {
		const request = ++revision,
			userId = $lab.user?.id,
			target = selectedId;
		loading = true;
		try {
			const result = await schoolRequest(
				target
					? `/teacher/students/${encodeURIComponent(target)}`
					: `/teacher/students?${listQuery}`
			);
			if (request !== revision || userId !== $lab.user?.id || !hasTeacherRole($lab.user?.role))
				return;
			if (target) detail = result;
			else listing = result;
			error = '';
		} catch (problem) {
			if (request === revision && userId === $lab.user?.id)
				error = problem instanceof Error ? problem.message : 'Kunne ikke hente elevene.';
		} finally {
			if (request === revision) loading = false;
		}
	}
	$effect(() => {
		const key = hasTeacherRole($lab.user?.role)
			? `${$lab.user?.id}:${$lab.user?.role}:${selectedId}:${listQuery}`
			: '';
		if (key === loadedKey) return;
		loadedKey = key;
		revision++;
		listing = null;
		detail = null;
		error = '';
		message = '';
		pendingAction = null;
		dialog?.close();
		const params = new URLSearchParams(listQuery);
		search = params.get('q') ?? '';
		status = params.get('status') ?? 'active';
		if (key) void load();
	});
	onMount(() => {
		const poll = setInterval(() => {
			if (
				hasTeacherRole($lab.user?.role) &&
				!busy &&
				!loading &&
				!pendingAction &&
				document.visibilityState === 'visible'
			)
				void load();
		}, 30000);
		return () => clearInterval(poll);
	});
	function find() {
		const params = new URLSearchParams();
		if (search.trim()) params.set('q', search.trim());
		params.set('status', status);
		void goto(`/laerer/elever/?${params}`);
	}
	function openAction(/** @type {string} */ action) {
		if (!detail || !$lab.user || busy) return;
		pendingAction = {
			id: randomId(),
			actorId: $lab.user.id,
			studentId: detail.student.id,
			name: detail.student.nickname,
			action,
			...(action === 'status' ? { disabled: detail.student.disabledAt === null } : {})
		};
		confirmation = '';
		actionError = '';
		dialog?.showModal();
	}
	async function executeAction() {
		const command = pendingAction;
		if (!command || busy) return;
		busy = true;
		actionError = '';
		try {
			await schoolRequest(`/teacher/students/${command.studentId}/${command.action}`, {
				id: command.id,
				confirmName: command.action === 'delete' ? confirmation : command.name,
				...(command.action === 'status' ? { disabled: command.disabled } : {})
			});
			if ($lab.user?.id !== command.actorId || selectedId !== command.studentId) return;
			dialog?.close();
			pendingAction = null;
			if (command.action === 'delete') {
				await goto(listHref(undefined));
				return;
			}
			message =
				command.action === 'rename'
					? 'Et nytt brukernavn er tildelt. Nøkkelfil og progresjon er beholdt.'
					: command.disabled
						? 'Profilen er deaktivert, og aktive pålogginger er avsluttet.'
						: 'Profilen er aktivert. Eleven kan logge inn igjen med nøkkelfilen.';
			await load();
		} catch (problem) {
			if ($lab.user?.id === command.actorId && selectedId === command.studentId)
				actionError = problem instanceof Error ? problem.message : 'Kunne ikke lagre endringen.';
		} finally {
			busy = false;
		}
	}
	function activityTitle(/** @type {string} */ id) {
		return detail?.activities.find((item) => item.id === id)?.title ?? id;
	}
</script>

<TeacherShell
	title={detail ? detail.student.nickname : 'Elever'}
	intro={selectedId
		? 'Se ordinær progresjon, beståtte fagsjekker og resultater for denne elevprofilen.'
		: 'Finn elevprofiler og følg hva elevene har jobbet med.'}
>
	{#if error}<p class="notice error" role="alert">{error}</p>{/if}
	{#if message}<p class="notice" role="status">{message}</p>{/if}
	{#if selectedId}
		<p><a href={listHref(undefined)}>← Til elevlisten</a></p>
		{#if !detail}<p role="status">
				{loading ? 'Henter elevprofilen …' : 'Elevprofilen kunne ikke hentes.'}
			</p>
			<button class="secondary" type="button" disabled={loading} onclick={load}>Prøv igjen</button>
		{:else}
			<section class="panel student-summary">
				<div>
					<p class="eyebrow">
						{detail.student.disabledAt === null ? 'AKTIV ELEVPROFIL' : 'DEAKTIVERT ELEVPROFIL'}
					</p>
					<strong class="xp"
						>{detail.student.xp} XP <span>· nivå {detail.student.level}</span></strong
					>
					<p>
						{detail.student.completed}/{detail.activities.length} aktiviteter · {detail.student
							.checksCompleted} beståtte fagsjekker
					</p>
					<p class="small">
						Sist jobbet: {schoolDate(detail.student.lastWorkedAt)}<br />Opprettet: {schoolDate(
							detail.student.createdAt
						)}
					</p>
					<p class="small">Profil-ID: <code>{detail.student.id}</code></p>
				</div>
				<div class="student-actions">
					<button
						class="secondary"
						type="button"
						disabled={busy}
						onclick={() => openAction('rename')}>Tildel nytt brukernavn</button
					>
					{#if administrator}<button
							class="secondary"
							type="button"
							disabled={busy}
							onclick={() => openAction('status')}
							>{detail.student.disabledAt === null ? 'Deaktiver profil' : 'Aktiver profil'}</button
						>{#if detail.student.disabledAt !== null}<button
								class="danger"
								type="button"
								disabled={busy}
								onclick={() => openAction('delete')}>Slett elevprofil</button
							>{/if}
					{:else}<p class="small">Deaktivering og sletting krever administratorrollen.</p>{/if}
				</div>
			</section>
			<section class="panel">
				<div class="section-heading">
					<div>
						<p class="eyebrow">ORDINÆR PROGRESJON</p>
						<h2>Leksjoner og spill</h2>
					</div>
					<div>
						<label for="student-subject">Fag</label><select
							id="student-subject"
							bind:value={subject}
							><option value="alle">Alle fag</option>{#each fag as item}<option value={item.id}
									>{item.navn}</option
								>{/each}</select
						>
					</div>
				</div>
				<p class="small">
					Gjennomgått og bestått vises hver for seg. Øvingsforsøk gir ingen ordinær progresjon eller
					XP.
				</p>
				{#if !visibleActivities.length}<p>Ingen publisert innhold i dette faget ennå.</p>{/if}
				<div class="student-activities">
					{#each visibleActivities as item}<details>
							<summary
								><span
									>{item.title}<small
										>{item.status === 'reviewed'
											? 'Gjennomgått'
											: item.status === 'passed'
												? 'Bestått'
												: item.status === 'started'
													? 'Påbegynt'
													: 'Ikke startet'}{item.checksTotal
											? ` · ${item.checksCompleted}/${item.checksTotal} fagsjekker bestått`
											: ''}</small
									></span
								><span aria-hidden="true">＋</span></summary
							>
							<ul>
								{#each item.objectives as objective}<li>
										<span class:done={objective.completedAt !== null}
											>{objective.completedAt !== null ? '✓' : '○'} {objective.title}</span
										><small
											>{objective.completedAt !== null
												? schoolDate(objective.completedAt)
												: objective.nextAttemptAt !== null
													? `Neste forsøk: ${schoolDate(objective.nextAttemptAt)}`
													: 'Ikke fullført'}</small
										>
									</li>{/each}
							</ul>
							<a href={item.href}>Åpne aktiviteten →</a>
						</details>{/each}
				</div>
			</section>
			<div class="detail-grid">
				<section class="panel">
					<p class="eyebrow">FAGSJEKKER</p>
					<h2>Siste innleveringer</h2>
					{#if !detail.checks.length}<p>Ingen ordinære fagsjekker levert ennå.</p>{:else}<ul
							class="history"
						>
							{#each detail.checks as check}<li>
									<strong>{activityTitle(check.activityId)}</strong><span
										>{check.passed ? 'Bestått' : 'Ikke bestått'} · {check.score}/2 riktige{check.teaching
											? ' · Undervisningsforsøk'
											: ''}</span
									><small>{schoolDate(check.submittedAt)}</small>
								</li>{/each}
						</ul>{/if}
				</section>
				<section class="panel">
					<p class="eyebrow">OPPNÅDD</p>
					<h2>Elevens merker</h2>
					{#if !detail.achievements.length}<p>Ingen merker oppnådd ennå.</p>{:else}<div
							class="badges"
						>
							{#each detail.achievements as badge}<div>
									<BadgeIcon symbol={badge.symbol} earned size={42} /><span
										>{badge.title}<small>{schoolDate(badge.earnedAt)}</small></span
									>
								</div>{/each}
						</div>{/if}
					{#if detail.shifts.length}<h3>Nattevakten</h3>
						<ul class="history">
							{#each detail.shifts as shift}<li>
									<strong
										>{shift.status === 'passed'
											? 'Bestått'
											: shift.status === 'active'
												? 'Pågår'
												: shift.status === 'expired'
													? 'Tiden ute'
													: 'Ikke bestått'}</strong
									><small
										>{schoolDate(shift.startedAt)}{shift.teaching
											? ' · Undervisningsforsøk'
											: ''}</small
									>
								</li>{/each}
						</ul>{/if}
				</section>
			</div>
		{/if}
	{:else}
		<section class="panel">
			<form
				class="filters"
				onsubmit={(event) => {
					event.preventDefault();
					find();
				}}
			>
				<div>
					<label for="student-search">Finn brukernavn</label><input
						id="student-search"
						type="search"
						bind:value={search}
						maxlength="80"
						placeholder="Søk i elevprofilene …"
					/>
				</div>
				<div>
					<label for="student-status">Kontostatus</label><select
						id="student-status"
						bind:value={status}
						><option value="active">Aktive profiler</option><option value="disabled"
							>Deaktiverte profiler</option
						><option value="all">Alle profiler</option></select
					>
				</div>
				<button type="submit" disabled={loading}>Søk</button><button
					class="secondary"
					type="button"
					disabled={loading}
					onclick={load}>Oppdater</button
				>
			</form>
			{#if !listing}<p role="status">
					{loading ? 'Henter elevene …' : 'Ingen elevliste tilgjengelig.'}
				</p>{:else}<p class="small">
					{listing.total} elevprofiler · side {listing.page} av {Math.max(
						1,
						Math.ceil(listing.total / listing.pageSize)
					)}. Lærerprofiler er holdt utenfor.
				</p>
				{#if !listing.students.length}<p>
						Ingen elever passer med søket. Prøv et annet navn eller en annen kontostatus.
					</p>{:else}<div class="table-scroll">
						<table>
							<caption class="sr-only">Elevprofiler og ordinær progresjon</caption><thead
								><tr
									><th>Elev</th><th>Sist jobbet</th><th>XP / nivå</th><th>Aktiviteter</th><th
										>Fagsjekker</th
									><th></th></tr
								></thead
							><tbody
								>{#each listing.students as student}<tr
										><td
											><a class="student-name" href={studentHref(student.id)}>{student.nickname}</a
											>{#if student.disabledAt !== null}<small class="disabled-label"
													>Deaktivert</small
												>{/if}</td
										><td>{schoolDate(student.lastWorkedAt)}</td><td
											>{student.xp} XP <small>· {student.level}</small></td
										><td>{student.completed}/{listing.activityCount}</td><td
											>{student.checksCompleted} bestått</td
										><td
											><a
												href={studentHref(student.id)}
												aria-label={`Se progresjon for ${student.nickname}`}>Se progresjon →</a
											></td
										></tr
									>{/each}</tbody
							>
						</table>
					</div>{/if}
				<nav class="pagination" aria-label="Sider i elevlisten">
					{#if listing.page > 1}<a href={listHref(listing.page - 1)}>← Forrige</a
						>{/if}{#if listing.page * listing.pageSize < listing.total}<a
							href={listHref(listing.page + 1)}>Neste →</a
						>{/if}
				</nav>{/if}
		</section>
		<p class="small">
			«Sist jobbet» bruker faglige handlinger, også øving. En åpen fane eller automatisk oppdatering
			teller ikke som arbeid.
		</p>
	{/if}
	<dialog
		bind:this={dialog}
		oncancel={(event) => {
			if (busy) event.preventDefault();
		}}
		onclose={() => {
			if (!busy) pendingAction = null;
		}}
	>
		{#if pendingAction}<h2>
				{pendingAction.action === 'rename'
					? 'Tildel nytt brukernavn?'
					: pendingAction.action === 'delete'
						? 'Slett elevprofilen?'
						: pendingAction.disabled
							? 'Deaktiver elevprofilen?'
							: 'Aktiver elevprofilen?'}
			</h2>
			<p><strong>{pendingAction.name}</strong></p>
			<p>
				{pendingAction.action === 'rename'
					? 'IT-laben lager et nytt, unikt navn. Nøkkelfil, poeng og progresjon beholdes.'
					: pendingAction.action === 'delete'
						? 'Profilen, nøklene, poengene, progresjonen og øvingsforsøkene slettes permanent fra den aktive databasen.'
						: pendingAction.disabled
							? 'Eleven logges ut og kan ikke logge inn eller vises på topplisten mens profilen er deaktivert. Progresjonen beholdes.'
							: 'Eleven kan logge inn igjen med samme nøkkelfil. Tidligere økter gjenåpnes ikke.'}
			</p>
			<form
				onsubmit={(event) => {
					event.preventDefault();
					void executeAction();
				}}
			>
				{#if pendingAction.action === 'delete'}<label for="delete-student-name"
						>Skriv {pendingAction.name} for å bekrefte</label
					><input
						id="delete-student-name"
						bind:value={confirmation}
						autocomplete="off"
					/>{/if}{#if actionError}<p class="notice error" role="alert">{actionError}</p>{/if}
				<div class="modal-actions">
					<button class="secondary" type="button" disabled={busy} onclick={() => dialog?.close()}
						>Avbryt</button
					><button
						class:danger={pendingAction.action === 'delete'}
						type="submit"
						disabled={busy ||
							(pendingAction.action === 'delete' && confirmation !== pendingAction.name)}
						>{busy
							? 'Lagrer …'
							: actionError
								? 'Prøv igjen'
								: pendingAction.action === 'rename'
									? 'Tildel nytt brukernavn'
									: pendingAction.action === 'delete'
										? 'Slett permanent'
										: pendingAction.disabled
											? 'Deaktiver profil'
											: 'Aktiver profil'}</button
					>
				</div>
			</form>
		{/if}
	</dialog>
</TeacherShell>

<style>
	.filters,
	.section-heading,
	.student-summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 16px;
	}
	.filters {
		align-items: flex-end;
		justify-content: flex-start;
		margin-bottom: 24px;
	}
	.filters > div:first-child {
		flex: 1 1 240px;
	}
	.filters input {
		width: 100%;
	}
	.student-name {
		font-weight: 700;
		white-space: nowrap;
	}
	.disabled-label {
		display: block;
		color: var(--color-danger);
	}
	.pagination {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		margin-top: 24px;
	}
	.xp {
		font-size: 34px;
		color: var(--color-accent);
		letter-spacing: -0.04em;
	}
	.xp span {
		font-size: 17px;
		font-weight: 500;
		letter-spacing: 0;
		color: var(--color-text-muted);
	}
	.student-actions {
		display: grid;
		gap: 10px;
		max-width: 280px;
	}
	.section-heading {
		margin-bottom: 12px;
	}
	.student-activities details {
		border-top: 1px solid var(--color-border);
		padding: 14px 0;
	}
	summary {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		cursor: pointer;
		font-weight: 650;
	}
	summary small {
		display: block;
		margin-top: 4px;
		font-weight: 400;
		color: var(--color-text-muted);
	}
	.student-activities ul {
		padding: 0;
		list-style: none;
	}
	.student-activities li {
		padding: 8px 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 6px;
	}
	.student-activities small {
		color: var(--color-text-muted);
	}
	.done {
		color: var(--color-success);
	}
	.detail-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}
	.history {
		padding: 0;
		list-style: none;
	}
	.history li {
		padding: 12px 0;
		border-bottom: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.history span,
	.history small {
		color: var(--color-text-muted);
		font-size: var(--font-small);
	}
	.badges {
		display: grid;
		gap: 15px;
	}
	.badges > div {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.badges small {
		display: block;
		color: var(--color-text-muted);
	}
	dialog {
		width: min(520px, calc(100% - 32px));
		padding: 26px;
		border: 1px solid var(--color-border-strong);
		border-radius: 12px;
		color: var(--color-text);
		background: var(--color-surface);
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 55%);
	}
	dialog p {
		line-height: 1.6;
		overflow-wrap: anywhere;
	}
	dialog input {
		width: 100%;
	}
	.modal-actions {
		display: flex;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 24px;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	@media (max-width: 760px) {
		.detail-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
