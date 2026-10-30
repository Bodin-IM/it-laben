<script>
	import { lab } from '#lib/lab.js';
	import { hasTeacherRole } from '#lib/learning.js';
	import { labPreferences, setLabPreferences } from '#lib/labPreferences.js';
	/** @type {{open?:boolean}} */
	let { open = false } = $props();
</script>

{#if hasTeacherRole($lab.user?.role)}
	<details class="teacher-settings" id="laererinnstillinger" {open}>
		<summary>Lærerinnstillinger · {$labPreferences.teacherUnlockTasks ? 'Alle oppgaver åpne' : 'Vanlig progresjon'}</summary>
		<div>
			<label><input type="checkbox" checked={$labPreferences.teacherUnlockTasks}
				onchange={(event) => setLabPreferences({ teacherUnlockTasks: event.currentTarget.checked })}
				aria-describedby="teacher-unlock-help" />Lås opp alle oppgaver for meg</label>
			<p id="teacher-unlock-help">På som standard. Gå direkte til oppgaver og prøv dem uten krav om tidligere bestått. Gjelder bare læreren, og gir ingen XP. Slå av for å følge vanlig progresjon.</p>
			<p>Valget lagres i denne nettleseren.</p>
		</div>
	</details>
{/if}

<style>
	.teacher-settings { border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface); color: var(--color-text); margin: 1rem 0; font: var(--font-small)/1.5 var(--font-ui); }
	summary { padding: 1rem 1.25rem; min-height: 44px; box-sizing: border-box; cursor: pointer; font-weight: 650; }
	div { padding: 0 1.25rem 1rem; }
	label { display: flex; align-items: center; gap: 0.75rem; min-height: 44px; font-weight: 650; cursor: pointer; }
	input { width: 22px; height: 22px; flex: none; accent-color: var(--color-accent); }
	p { color: var(--color-text-muted); max-width: 75ch; margin: 0.5rem 0; }
	:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
</style>
