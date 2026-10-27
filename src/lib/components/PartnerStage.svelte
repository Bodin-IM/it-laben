<script>
	import Avatar from '#lib/components/Avatar.svelte';
	import { avatarDefinition } from '#lib/avatars.js';
	import { labPreferences } from '#lib/labPreferences.js';
	/** @type {{avatarId:string,mood?:import('#lib/avatarFeedback.js').AvatarMood}} */
	let { avatarId, mood = 'greeting' } = $props();
</script>

<div class="stage" data-scene={$labPreferences.partnerScene}>
	<div class="scenery" aria-hidden="true"><i></i><i></i><i></i></div>
	<Avatar id={avatarId} {mood} size={84} />
	<div>
		<span class="eyebrow">DIN LABPARTNER</span><strong>{avatarDefinition(avatarId).title}</strong
		><span>Et lite hint. Et nytt forsøk.</span>
	</div>
</div>

<style>
	.stage {
		isolation: isolate;
		position: relative;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 18px 14px;
		margin-bottom: 18px;
		border-radius: 16px;
		overflow: hidden;
		background: var(--color-surface-soft);
		border: 1px solid var(--color-border);
		min-width: 0;
	}
	.stage > div:last-child {
		display: grid;
		gap: 3px;
		min-width: 0;
		font-size: var(--font-small);
		color: var(--color-text-muted);
	}
	strong {
		font-size: 1.2rem;
		color: var(--color-text);
	}
	.eyebrow {
		font-size: 0.65rem;
		letter-spacing: 0.13em;
		font-weight: 700;
	}
	.scenery {
		position: absolute;
		inset: 0;
		z-index: -1;
		opacity: 0.17;
		background-image:
			linear-gradient(var(--color-accent) 1px, transparent 1px),
			linear-gradient(90deg, var(--color-accent) 1px, transparent 1px);
		background-size: 24px 24px;
	}
	.scenery i {
		position: absolute;
		border: 2px solid var(--color-accent);
		border-radius: 50%;
		width: 60px;
		height: 60px;
		right: -12px;
		top: -18px;
	}
	.scenery i:nth-child(2) {
		width: 100px;
		height: 100px;
		top: 65px;
		right: 20px;
	}
	.scenery i:nth-child(3) {
		width: 12px;
		height: 12px;
		right: 76px;
		top: 18px;
		background: var(--color-accent);
	}
	[data-scene='space'] .scenery {
		background-image: radial-gradient(var(--color-accent) 1.5px, transparent 2px);
		background-size: 23px 29px;
	}
	[data-scene='space'] i:first-child {
		transform: rotate(-25deg);
		width: 100px;
		height: 35px;
		top: 25px;
	}
	[data-scene='garden'] .scenery {
		background-image: radial-gradient(ellipse at bottom, var(--color-accent), transparent 65%);
	}
	[data-scene='garden'] i {
		border-radius: 90% 0 90% 0;
		transform: rotate(-20deg);
		top: 15px;
	}
	[data-scene='garden'] i:nth-child(2) {
		top: 60px;
		transform: rotate(30deg);
	}
</style>
