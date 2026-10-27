<script>
	import Avatar from '#lib/components/Avatar.svelte';
	import { avatars } from '#lib/avatars.js';
	import { lab, changeLabProfile } from '#lib/lab.js';
	import { labPreferences, setLabPreferences } from '#lib/labPreferences.js';
	let saving = $state(false);
	let message = $state('');
	const selected = $derived($lab.summary?.lab.avatarId ?? $labPreferences.partnerAvatar);
	/** @param {string} id */
	async function choose(id) {
		if (saving) return;
		message = '';
		saving = true;
		try {
			if ($lab.user && $lab.summary) {
				const profile = $lab.summary.lab;
				await changeLabProfile(profile.colorId, profile.featuredAchievementId, id);
			} else setLabPreferences({ partnerAvatar: id });
			message = 'Figuren er lagret.';
		} catch {
			message = 'Kunne ikke lagre figuren. Prøv igjen når forbindelsen er tilbake.';
		} finally {
			saving = false;
		}
	}
</script>

<fieldset disabled={saving}>
	<legend>Velg labpartner</legend>
	<div class="figures">
		{#each avatars as avatar (avatar.id)}
			<button type="button" aria-pressed={selected === avatar.id} onclick={() => choose(avatar.id)}>
				<Avatar id={avatar.id} size={44} animate={false} decorative /><span>{avatar.title}</span>
			</button>
		{/each}
	</div>
</fieldset>
<p class="note">
	{$lab.user
		? 'Figuren lagres på profilen og vises også i Min lab.'
		: 'Figuren lagres i denne nettleseren. Logg inn for å bruke en profil.'}
</p>
<label for="partner-scene">Bakgrunn</label>
<select
	id="partner-scene"
	value={$labPreferences.partnerScene}
	onchange={(event) => setLabPreferences({ partnerScene: event.currentTarget.value })}
>
	<option value="lab">Laboratorium</option><option value="space">Verdensrom</option><option
		value="garden">Hage</option
	>
</select>
<label class="motion"
	><input
		type="checkbox"
		checked={!$labPreferences.reduceMotion}
		onchange={(event) => setLabPreferences({ reduceMotion: !event.currentTarget.checked })}
	/>Animasjoner på</label
>
<p class="note">
	Bakgrunn og bevegelse gjelder denne nettleseren. Rolige bevegelser i enhetsinnstillingene
	respekteres alltid.
</p>
<p role="status">{saving ? 'Lagrer …' : message}</p>

<style>
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	legend,
	label {
		font-weight: 650;
		margin-bottom: 8px;
		display: block;
	}
	.figures {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}
	button {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 8px 2px;
		min-height: 44px;
		border: 1px solid var(--color-border-strong);
		border-radius: 12px;
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
		font-size: var(--font-small);
		cursor: pointer;
		overflow-wrap: anywhere;
	}
	button[aria-pressed='true'] {
		border: 2px solid var(--color-accent);
		background: var(--color-accent-soft);
		padding: 7px 1px;
	}
	select {
		width: 100%;
		min-height: 44px;
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
		padding: 8px;
	}
	.motion {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		margin-top: 12px;
	}
	.motion input {
		width: 20px;
		height: 20px;
		accent-color: var(--color-accent);
	}
	.note {
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	:is(button, select, input):focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 2px;
	}
	p {
		margin: 10px 0;
	}
</style>
