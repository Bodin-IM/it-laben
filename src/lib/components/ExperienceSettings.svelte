<script>
	import {
		labPreferences,
		setLabPreferences,
		unlockSound,
		playRewardSound
	} from '#lib/labPreferences.js';
	async function preview() {
		await unlockSound();
		playRewardSound('achievement', true);
	}
</script>

<details class="experience">
	<summary>Lyd og animasjoner <span>{$labPreferences.sound ? 'Lyd på' : 'Lyd av'}</span></summary>
	<div class="controls">
		<div>
			<label class="toggle"
				><input
					type="checkbox"
					checked={$labPreferences.companion}
					onchange={(event) => setLabPreferences({ companion: event.currentTarget.checked })}
				/>Vis labpartneren på sidene</label
			>
			<p>Avataren følger arbeidet ditt med små reaksjoner.</p>
		</div>
		<div>
			<label class="toggle"
				><input
					type="checkbox"
					checked={$labPreferences.sound}
					onchange={(event) => setLabPreferences({ sound: event.currentTarget.checked })}
				/>Korte lyder ved fullføring</label
			>
			<p>Lyd er valgfritt. Innstillingen gjelder denne nettleseren.</p>
			{#if $labPreferences.sound}
				<div class="volume">
					<label for="lab-volume">Lydstyrke</label><input
						id="lab-volume"
						type="range"
						min="0"
						max="0.6"
						step="0.05"
						value={$labPreferences.volume}
						oninput={(event) => setLabPreferences({ volume: Number(event.currentTarget.value) })}
					/><button type="button" onclick={preview}>Prøv lyd</button>
				</div>
			{/if}
		</div>
		<div>
			<label class="toggle"
				><input
					type="checkbox"
					checked={$labPreferences.reduceMotion}
					onchange={(event) => setLabPreferences({ reduceMotion: event.currentTarget.checked })}
				/>Rolige animasjoner</label
			>
			<p>Vi følger også PC-ens innstilling for redusert bevegelse.</p>
		</div>
	</div>
</details>

<style>
	.experience {
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
		color: var(--color-text);
		font:
			var(--font-small)/1.5 system-ui,
			sans-serif;
		margin-block: 20px;
	}
	summary {
		cursor: pointer;
		padding: 17px 20px;
		font-weight: 650;
	}
	summary span {
		font-weight: 400;
		color: var(--color-text-muted);
		margin-left: 12px;
	}
	.controls {
		padding: 0 20px 20px;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
		gap: 20px;
	}
	.toggle {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 36px;
		font-weight: 600;
	}
	input[type='checkbox'] {
		width: 18px;
		height: 18px;
		accent-color: var(--color-action);
		flex: 0 0 18px;
	}
	p {
		margin: 3px 0 8px;
		color: var(--color-text-muted);
	}
	.volume {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	input[type='range'] {
		width: 120px;
		max-width: 100%;
		accent-color: var(--color-action);
	}
	button {
		background: var(--color-surface-soft);
		color: var(--color-accent);
		border: 1px solid var(--color-border);
		border-radius: 7px;
		padding: 8px 12px;
		min-height: 40px;
		font: inherit;
		cursor: pointer;
	}
	summary:focus-visible,
	input:focus-visible,
	button:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
</style>
