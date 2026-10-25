<script>
	import { lab, changeLabProfile } from '#lib/lab.js';
	import AnimatedNumber from '#lib/components/AnimatedNumber.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import { avatars } from '#lib/avatars.js';
	/** @type {import('#lib/avatarFeedback.js').AvatarMood} */
	let previewMood = $state('idle');
	let chosenAvatar = $state('robot');
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
		const key = `${$lab.user?.id}:${profile?.colorId}:${profile?.featuredAchievementId}:${profile?.avatarId}`;
		if (key !== restored) {
			restored = key;
			chosenColor = profile?.colorId ?? 'forest';
			chosenBadge = profile?.featuredAchievementId ?? '';
			chosenAvatar = profile?.avatarId ?? 'robot';
			message = '';
		}
	});
	async function save() {
		busy = true;
		message = '';
		try {
			await changeLabProfile(chosenColor, chosenBadge || null, chosenAvatar);
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
				<div class="card-avatar"><Avatar id={chosenAvatar} mood={previewMood} size={112} /></div>
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
			<p>Velg en avatar, en farge og et merke. Du beholder alle poengene dine.</p>
			<details>
				<summary>Tilpass labkortet</summary>
				<form
					onsubmit={(event) => {
						event.preventDefault();
						void save();
					}}
				>
					<fieldset disabled={busy}>
						<legend>Din avatar</legend>
						<div class="avatars">
							{#each avatars as option (option.id)}<button
									type="button"
									class:chosen={chosenAvatar === option.id}
									aria-pressed={chosenAvatar === option.id}
									onclick={() => {
										chosenAvatar = option.id;
										previewMood = 'success';
										message = '';
									}}
									><Avatar id={option.id} size={52} animate={false} decorative /><span
										>{option.title}</span
									></button
								>{/each}
						</div>
						<label class="badge-label" for="avatar-reaction">Prøv en reaksjon</label><select
							id="avatar-reaction"
							bind:value={previewMood}
							><option value="idle">Klar</option><option value="working">Jobber</option><option
								value="thinking">Tenker</option
							><option value="retry">Prøver igjen</option><option value="success"
								>Riktig løsning</option
							><option value="celebrate">Feirer</option></select
						>
					</fieldset>
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
	.card-avatar {
		flex: 0 0 112px;
	}
	.avatars {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
		margin-bottom: 16px;
	}
	.avatars button {
		display: flex;
		flex-direction: column;
		gap: 5px;
		align-items: center;
		justify-content: center;
		min-width: 0;
	}
	.avatars .chosen {
		border-color: var(--color-accent);
		background: var(--color-accent-soft);
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
		.card-avatar {
			flex-basis: 80px;
		}
		.card-avatar :global(svg) {
			width: 80px;
			height: 80px;
		}
		.card-body {
			gap: 10px;
		}
	}
</style>
