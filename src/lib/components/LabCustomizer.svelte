<script>
	import { lab, changeLabProfile } from '#lib/lab.js';
	import AnimatedNumber from '#lib/components/AnimatedNumber.svelte';
	let chosenColor = $state('forest');
	let chosenBadge = $state('');
	let busy = $state(false);
	let message = $state('');
	let restored = '';
	const earned = $derived(
		($lab.summary?.achievements ?? []).filter((item) => item.earnedAt !== null)
	);
	const color = $derived(
		$lab.summary?.lab.colors.find((item) => item.id === chosenColor) ?? $lab.summary?.lab.colors[0]
	);
	const badge = $derived(earned.find((item) => item.id === chosenBadge));
	$effect(() => {
		const profile = $lab.summary?.lab;
		const key = `${$lab.user?.id}:${profile?.colorId}:${profile?.featuredAchievementId}`;
		if (key !== restored) {
			restored = key;
			chosenColor = profile?.colorId ?? 'forest';
			chosenBadge = profile?.featuredAchievementId ?? '';
			message = '';
		}
	});
	async function save() {
		busy = true;
		message = '';
		try {
			await changeLabProfile(chosenColor, chosenBadge || null);
			message = 'Labkortet ditt er lagret.';
		} catch (error) {
			message = error instanceof Error ? error.message : 'Kunne ikke lagre labkortet.';
		} finally {
			busy = false;
		}
	}
</script>

{#if $lab.user && $lab.summary && color}
	<section class="lab-customizer" aria-labelledby="lab-card-title">
		<div class="lab-card" style:--lab-ink={color.color} style:--lab-background={color.background}>
			<div class="card-top">
				<span>MIN PERSONLIGE LAB</span><span>LV. {$lab.summary.level}</span>
			</div>
			<div class="card-body">
				<div>
					<h2 id="lab-card-title">{$lab.user.nickname}</h2>
					<p>{badge?.title ?? 'Se. Prøv. Forstå.'}</p>
					<strong><AnimatedNumber value={$lab.summary.xp} /> <small>XP</small></strong>
				</div>
				<svg class="rack" viewBox="0 0 110 130" fill="none" aria-hidden="true">
					<path class="frame" d="M17 8h76v108H17zM10 122h90" />
					{#each [0, 1, 2, 3] as row}<g
							><rect x="25" y={17 + row * 23} width="60" height="17" rx="3" /><path
								d={`M34 ${25 + row * 23}h18`}
							/><circle
								class:lit={row < Math.min(4, earned.length)}
								cx="76"
								cy={25 + row * 23}
								r="2.5"
							/></g
						>{/each}
					<path class="wire" d="M55 116v6h28" />
				</svg>
			</div>
			<div class="card-bottom">
				{#if badge}<span class="featured">{badge.symbol} · Valgt merke</span>{:else}<span
						>{earned.length} merker i samlingen</span
					>{/if}<span>DITT TEMPO. DIN FREMDRIFT.</span>
			</div>
		</div>
		<div class="customize-controls">
			<span class="eyebrow">GJØR LABEN TIL DIN</span>
			<h3>Et lite sted som viser fremgangen din.</h3>
			<p>Velg en farge og vis frem et merke. Du beholder alle poengene dine.</p>
			<details>
				<summary>Tilpass labkortet</summary>
				<form
					onsubmit={(event) => {
						event.preventDefault();
						void save();
					}}
				>
					<fieldset disabled={busy}>
						<legend>Labfarge</legend>
						<div class="colors">
							{#each $lab.summary.lab.colors as option (option.id)}<button
									type="button"
									class:chosen={chosenColor === option.id}
									disabled={!option.unlocked}
									aria-pressed={chosenColor === option.id}
									onclick={() => {
										chosenColor = option.id;
										message = '';
									}}
									title={option.unlocked
										? option.title
										: `Lås opp med ${$lab.summary?.achievements.find((item) => item.id === option.requires)?.title}`}
									><span class="swatch" style:background={option.color}
									></span>{option.title}{!option.unlocked ? ' · låst' : ''}</button
								>{/each}
						</div>
					</fieldset>
					{#if $lab.summary.lab.colors.some((item) => !item.unlocked)}<p class="unlock-note">
							{#each $lab.summary.lab.colors.filter((item) => !item.unlocked) as locked (locked.id)}<span
									>{locked.title}: låses opp med «{$lab.summary.achievements.find(
										(item) => item.id === locked.requires
									)?.title}».</span
								>{/each}
						</p>{/if}
					<label class="badge-label" for="featured-badge">Merke på kortet</label><select
						id="featured-badge"
						bind:value={chosenBadge}
						disabled={busy}
						><option value="">Ingen valgt</option>{#each earned as item (item.id)}<option
								value={item.id}>{item.title}</option
							>{/each}</select
					>
					<button class="save" type="submit" disabled={busy || !$lab.available}
						>{busy ? 'Lagrer …' : 'Lagre labkort'}</button
					>
				</form>
			</details>
			{#if message}<p class="message" role="status">{message}</p>{/if}
		</div>
	</section>
{/if}

<style>
	.lab-customizer {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 30px;
		align-items: start;
		margin: 30px 0;
		font:
			var(--font-small)/1.5 system-ui,
			sans-serif;
		color: var(--color-text);
	}
	.lab-card {
		color: #f2f5ef;
		background:
			radial-gradient(
				ellipse at 90% 15%,
				color-mix(in srgb, var(--lab-ink) 13%, transparent),
				transparent 65%
			),
			var(--lab-background);
		border: 1px solid color-mix(in srgb, var(--lab-ink) 40%, transparent);
		border-radius: 16px;
		padding: 24px 26px 19px;
		box-shadow: 0 10px 30px var(--color-shadow);
		position: relative;
		overflow: hidden;
	}
	.card-top,
	.card-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		font-size: 0.65rem;
		letter-spacing: 1.2px;
		color: var(--lab-ink);
		font-weight: 650;
	}
	.card-body {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		margin: 20px 0 12px;
		min-height: 130px;
	}
	.card-body > div {
		min-width: 0;
	}
	h2 {
		font-size: clamp(1.25rem, 2.5vw, 1.7rem);
		letter-spacing: -0.5px;
		line-height: 1.25;
		margin: 0 0 5px;
		overflow-wrap: anywhere;
		color: #f2f5ef;
	}
	.card-body p {
		color: var(--lab-ink);
		margin: 0 0 20px;
		font-size: var(--font-small);
	}
	strong {
		font-size: 2rem;
		line-height: 1;
		font-weight: 750;
	}
	strong small {
		font-size: var(--font-small);
		color: var(--lab-ink);
		font-weight: 500;
	}
	.rack {
		width: 110px;
		flex: 0 0 110px;
		height: 130px;
		color: var(--lab-ink);
		opacity: 0.85;
	}
	.rack path,
	.rack rect {
		stroke: currentColor;
		stroke-width: 1.3;
	}
	.rack rect {
		fill: color-mix(in srgb, var(--lab-ink) 6%, transparent);
	}
	.rack circle {
		stroke: currentColor;
		stroke-width: 1;
	}
	.rack .lit {
		fill: currentColor;
	}
	.wire {
		opacity: 0.6;
	}
	.card-bottom {
		padding-top: 15px;
		border-top: 1px solid color-mix(in srgb, var(--lab-ink) 20%, transparent);
		font-size: 0.6rem;
	}
	.eyebrow {
		font-size: 0.7rem;
		color: var(--color-accent);
		font-weight: 750;
		letter-spacing: 1.3px;
	}
	h3 {
		font-size: 1.2rem;
		line-height: 1.4;
		margin: 8px 0;
		letter-spacing: -0.3px;
	}
	p {
		color: var(--color-text-muted);
		margin: 6px 0 14px;
		overflow-wrap: anywhere;
	}
	summary {
		cursor: pointer;
		min-height: 36px;
		font-weight: 650;
		color: var(--color-accent);
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 12px 0;
		min-width: 0;
	}
	legend,
	.badge-label {
		font-weight: 600;
		margin-bottom: 8px;
		display: block;
	}
	.colors {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	button {
		font: inherit;
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: 7px;
		background: var(--color-surface);
		padding: 9px 11px;
		min-height: 42px;
		cursor: pointer;
	}
	.colors button {
		display: inline-flex;
		align-items: center;
		gap: 7px;
	}
	.colors .chosen {
		border-color: var(--color-accent);
		background: var(--color-accent-soft);
	}
	button:disabled {
		cursor: default;
		opacity: 0.65;
	}
	.swatch {
		width: 13px;
		height: 13px;
		border-radius: 50%;
		border: 1px solid rgb(0 0 0 / 25%);
	}
	select {
		width: 100%;
		padding: 10px;
		font: inherit;
		color: var(--color-text);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 7px;
		min-height: 44px;
	}
	.save {
		margin-top: 12px;
		background: var(--color-action);
		color: var(--color-on-action);
		border-color: var(--color-action);
	}
	.message {
		color: var(--color-accent);
	}
	.unlock-note {
		display: grid;
		gap: 4px;
		font-size: var(--font-meta);
	}
	button:focus-visible,
	summary:focus-visible,
	select:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
	@media (max-width: 760px) {
		.lab-customizer {
			grid-template-columns: 1fr;
			gap: 22px;
		}
	}
	@media (max-width: 380px) {
		.lab-card {
			padding: 20px;
		}
		.rack {
			width: 80px;
			flex-basis: 80px;
		}
		.card-body {
			gap: 10px;
		}
	}
</style>
