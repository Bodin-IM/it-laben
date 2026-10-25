<script>
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { lab, schoolRequest } from '#lib/lab.js';
	import { hasTeacherRole } from '#lib/learning.js';
	import { aktiviteter, fag } from '#lib/innhold.js';
	import { teachingPlans, presentationLessons, presentationLink } from '#lib/teaching.js';
	import TeacherShell from '#lib/components/TeacherShell.svelte';
	const browser = typeof window !== 'undefined';
	/** @type {import('#lib/teaching.js').TeachingLibrary|null} */
	let library = $state(null);
	let subject = $state('alle'),
		search = $state(''),
		view = $state('plans'),
		owner = $state(''),
		error = $state('');
	let loading = $state(false),
		revision = 0;
	const planId = $derived(browser ? page.url.searchParams.get('opplegg') : null);
	const plan = $derived(teachingPlans.find((item) => item.id === planId));
	const guide = $derived.by(() => library?.guides.find((item) => item.planId === planId));
	const words = $derived(search.trim().toLocaleLowerCase('nb-NO').split(/\s+/).filter(Boolean));
	const plans = $derived(
		teachingPlans.filter(
			(item) =>
				(subject === 'alle' || item.subject === subject) &&
				words.every((word) =>
					`${item.title} ${item.description} ${item.goals.join(' ')}`
						.toLocaleLowerCase('nb-NO')
						.includes(word)
				)
		)
	);
	const lessons = $derived(
		aktiviteter.filter(
			(item) =>
				item.format === 'leksjon' &&
				(subject === 'alle' || item.fag === subject) &&
				words.every((word) =>
					`${item.tittel} ${item.beskrivelse} ${item.emner.join(' ')}`
						.toLocaleLowerCase('nb-NO')
						.includes(word)
				)
		)
	);
	async function load() {
		const userId = $lab.user?.id,
			request = ++revision;
		loading = true;
		try {
			const result = await schoolRequest('/teacher/teaching');
			if (userId !== $lab.user?.id || request !== revision || !hasTeacherRole($lab.user?.role))
				return;
			library = result;
			error = '';
		} catch (problem) {
			if (request === revision && userId === $lab.user?.id)
				error = problem instanceof Error ? problem.message : 'Kunne ikke hente lærerveiledningene.';
		} finally {
			if (request === revision) loading = false;
		}
	}
	$effect(() => {
		const key = hasTeacherRole($lab.user?.role) ? `${$lab.user?.id}:${$lab.user?.role}` : '';
		if (key === owner) return;
		owner = key;
		revision++;
		library = null;
		error = '';
		if (key) void load();
	});
	onMount(() => {
		if (page.url.searchParams.get('vis') === 'leksjoner') view = 'lessons';
	});
	function activity(/** @type {string} */ id) {
		return (
			presentationLessons.find((item) => item.id === id) ??
			aktiviteter.find((item) => item.id === id)
		);
	}
</script>

<TeacherShell
	title={plan?.title ?? 'Undervisning'}
	intro={plan
		? plan.description
		: 'Velg et opplegg for felles gjennomgang, eller finn en elevleksjon å vise på storskjerm.'}
>
	{#if planId}
		<p><a href="/laerer/undervisning/">← Alle undervisningsopplegg</a></p>
		{#if !plan}<p class="notice error" role="alert">Undervisningsopplegget finnes ikke.</p>
		{:else}
			<div class="plan-actions">
				<a
					class="button-link"
					href={presentationLink(activity(plan.lessonIds[0])?.href ?? '/', plan.id)}
					>Start gjennomgangen →</a
				><span>{plan.minutes} minutter · {fag.find((item) => item.id === plan.subject)?.navn}</span>
			</div>
			<section class="panel">
				<p class="eyebrow">MÅL FOR ØKTEN</p>
				<ul class="goals">
					{#each plan.goals as goal}<li>{goal}</li>{/each}
				</ul>
			</section>
			{#if error}<p class="notice error" role="alert">{error}</p>
				<button type="button" disabled={loading} onclick={load}>Prøv igjen</button>{/if}
			{#if !guide}<p role="status">
					{loading ? 'Henter lærerveiledningen …' : 'Lærerveiledningen er ikke tilgjengelig.'}
				</p>
			{:else}
				<section class="panel teacher-notes">
					<p class="eyebrow">FØR DU STARTER</p>
					<h2>Forberedelser</h2>
					<ul>
						{#each guide.preparation as note}<li>{note}</li>{/each}
					</ul>
				</section>
				<section class="panel">
					<p class="eyebrow">FELLES GJENNOMGANG</p>
					<h2>Rekkefølge og lærernotater</h2>
					<p class="small">
						Bruk storskjermvisningen foran klassen. Veiledningen kan være åpen i et eget vindu på
						lærerskjermen.
					</p>
					<div class="plan-steps">
						{#each guide.steps as step, index}{@const lesson = activity(step.activityId)}
							<article>
								<div class="step-title">
									<span class="number">{index + 1}</span>
									<div>
										<h3>{lesson?.tittel}</h3>
										<p>{step.minutes} minutter · {step.focus}</p>
									</div>
									<a
										class="button-link secondary"
										href={presentationLink(lesson?.href ?? '/', plan.id)}>Vis leksjon →</a
									>
								</div>
								<div class="step-notes">
									<div>
										<h4>Spør klassen</h4>
										<ul>
											{#each step.questions as question}<li>{question}</li>{/each}
										</ul>
									</div>
									<div>
										<h4>Lærernotater</h4>
										<ul>
											{#each step.notes as note}<li>{note}</li>{/each}
										</ul>
									</div>
								</div>
							</article>{/each}
					</div>
				</section>
				<section class="panel">
					<p class="eyebrow">AVRUNDING OG SELVARBEID</p>
					<h2>Etter gjennomgangen</h2>
					<ul>
						{#each guide.wrapUp as note}<li>{note}</li>{/each}
					</ul>
					<div class="self-work">
						{#each plan.selfWorkIds as id}{@const item = activity(id)}<a href={item?.href}
								>{item?.tittel} →</a
							>{/each}
					</div>
				</section>
			{/if}
		{/if}
	{:else}
		<div class="mode-links">
			<a class="button-link secondary" href="/">Åpne elevvisningen →</a>
			<p class="small">
				Elevleksjoner er laget for selvarbeid. Undervisningsopplegg samler leksjoner med veiledning
				for læreren.
			</p>
		</div>
		<div class="filters">
			<div>
				<label for="teaching-search">Finn tema eller leksjon</label><input
					id="teaching-search"
					type="search"
					bind:value={search}
					placeholder="Søk i undervisningen …"
				/>
			</div>
			<div>
				<label for="teaching-subject">Fag</label><select id="teaching-subject" bind:value={subject}
					><option value="alle">Alle fag</option>{#each fag as item}<option value={item.id}
							>{item.navn}</option
						>{/each}</select
				>
			</div>
		</div>
		<div class="view-switch" role="group" aria-label="Innhold for undervisningen">
			<button
				type="button"
				class:secondary={view !== 'plans'}
				aria-pressed={view === 'plans'}
				onclick={() => (view = 'plans')}>Undervisningsopplegg</button
			><button
				type="button"
				class:secondary={view !== 'lessons'}
				aria-pressed={view === 'lessons'}
				onclick={() => (view = 'lessons')}>Elevleksjoner · rask tilgang</button
			>
		</div>
		{#if view === 'plans'}<div class="plan-grid">
				{#each plans as item}<article class="panel plan-card">
						<p class="eyebrow">FELLES GJENNOMGANG · {item.minutes} MIN</p>
						<h2><a href={`/laerer/undervisning/?opplegg=${item.id}`}>{item.title}</a></h2>
						<p>{item.description}</p>
						<p class="small">{item.lessonIds.length} leksjoner · med spørsmål og lærernotater</p>
						<div>
							<a class="button-link" href={`/laerer/undervisning/?opplegg=${item.id}`}
								>Åpne opplegget →</a
							><a href={presentationLink(activity(item.lessonIds[0])?.href ?? '/', item.id)}
								>Vis på storskjerm →</a
							>
						</div>
					</article>{/each}
			</div>
			{#if !plans.length}<section class="panel">
					<h2>Ingen opplegg å vise</h2>
					<p>Prøv et annet søk eller fag. Nye opplegg dukker opp her etter hvert.</p>
				</section>{/if}
		{:else}<section class="panel">
				<p class="eyebrow">ELEVMATERIELL TIL GJENNOMGANG</p>
				<h2>Leksjoner, lett tilgjengelig</h2>
				<div class="lesson-list">
					{#each lessons as item}<article>
							<div>
								<strong>{item.tittel}</strong>
								<p>{item.beskrivelse}</p>
							</div>
							<div>
								<a class="button-link secondary" href={presentationLink(item.href)}>Vis leksjon →</a
								><a href={item.href}>Åpne elevversjon</a>
							</div>
						</article>{/each}
				</div>
				{#if !lessons.length}<p>Ingen leksjoner passer med søket i dette faget.</p>{/if}
			</section>{/if}
	{/if}
</TeacherShell>

<style>
	.plan-actions,
	.mode-links,
	.filters,
	.view-switch {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 14px;
		margin: 20px 0;
	}
	.plan-actions > span {
		color: var(--color-text-muted);
	}
	.mode-links p {
		flex: 1 1 350px;
		margin: 0;
	}
	.filters {
		align-items: flex-end;
		gap: 18px;
	}
	.filters > div:first-child {
		flex: 1;
		min-width: 200px;
	}
	input {
		width: 100%;
	}
	.plan-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px;
	}
	.plan-card {
		display: flex;
		flex-direction: column;
	}
	.plan-card h2 a {
		text-decoration: none;
	}
	.plan-card > p {
		color: var(--color-text-muted);
	}
	.plan-card > div {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 14px;
		margin-top: auto;
		padding-top: 12px;
	}
	.goals {
		font-size: 18px;
		padding-left: 22px;
		margin-bottom: 0;
	}
	li {
		margin: 8px 0;
		line-height: 1.65;
	}
	.plan-steps article {
		border-top: 1px solid var(--color-border);
		padding: 24px 0;
	}
	.plan-steps article:last-child {
		padding-bottom: 0;
	}
	.step-title {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 14px;
	}
	.step-title > div {
		flex: 1 1 250px;
	}
	h3 {
		margin: 0 0 5px;
		font-size: 20px;
	}
	h4 {
		margin: 12px 0;
	}
	.step-title p {
		margin: 0;
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	.number {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 9px;
		font-weight: 750;
		background: var(--color-accent-soft);
		color: var(--color-accent);
	}
	.step-notes {
		display: grid;
		grid-template-columns: 1fr 1.3fr;
		gap: 24px;
		margin: 12px 0 0 50px;
	}
	.step-notes ul {
		padding-left: 18px;
		margin-top: 0;
	}
	.self-work {
		display: flex;
		gap: 14px;
		flex-wrap: wrap;
	}
	.lesson-list article {
		display: flex;
		align-items: center;
		gap: 22px;
		border-top: 1px solid var(--color-border);
		padding: 18px 0;
	}
	.lesson-list article > div:first-child {
		flex: 1;
	}
	.lesson-list article > div:last-child {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		flex-shrink: 0;
	}
	.lesson-list p {
		color: var(--color-text-muted);
		font-size: var(--font-small);
		margin-bottom: 0;
	}
	@media (max-width: 760px) {
		.plan-grid,
		.step-notes {
			grid-template-columns: 1fr;
		}
		.step-notes {
			margin-left: 0;
			gap: 5px;
		}
		.lesson-list article {
			align-items: flex-start;
			flex-direction: column;
			gap: 12px;
		}
	}
</style>
