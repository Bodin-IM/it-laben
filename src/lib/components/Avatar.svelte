<script>
	import { avatarDefinition } from '#lib/avatars.js';
	/** @type {{id?:string,mood?:import('#lib/avatarFeedback.js').AvatarMood,size?:number,animate?:boolean,decorative?:boolean}} */
	let { id = 'robot', mood = 'idle', size = 56, animate = true, decorative = false } = $props();
	const avatar = $derived(avatarDefinition(id));
	const happy = $derived(mood === 'success' || mood === 'celebrate');
</script>

<svg
	class="lab-avatar"
	class:animated={animate}
	data-avatar={avatar.id}
	data-mood={mood}
	width={size}
	height={size}
	viewBox="0 0 100 100"
	role={decorative ? undefined : 'img'}
	aria-hidden={decorative ? true : undefined}
	aria-label={decorative ? undefined : `Avatar: ${avatar.title}`}
	style:--avatar-color={avatar.color}
	style:--avatar-bg={avatar.background}
>
	<rect x="2" y="2" width="96" height="96" rx="29" fill={avatar.background} />
	<circle cx="78" cy="19" r="9" fill={avatar.color} opacity=".12" />
	<path d="M14 80h72" stroke={avatar.color} stroke-width="2" opacity=".16" stroke-linecap="round" />
	<ellipse cx="50" cy="85" rx="28" ry="5" fill="#000" opacity=".16" />
	<path
		d="M15 38V27q0-12 12-12h20"
		fill="none"
		stroke="#fff"
		stroke-width="2"
		opacity=".09"
		stroke-linecap="round"
	/>
	<g class="character">
		{#if avatar.kind === 'robot'}
			<path
				d="M50 21v-7M20 46h-6v15h6m60-15h6v15h-6"
				stroke={avatar.color}
				stroke-width="5"
				stroke-linecap="round"
			/>
			<circle cx="50" cy="13" r="4" fill="#f2d68c" />
			<rect x="21" y="27" width="58" height="51" rx="15" fill={avatar.color} />
			<rect x="27" y="35" width="46" height="34" rx="11" fill={avatar.background} />
			<path d="M36 82h28" stroke={avatar.color} stroke-width="5" stroke-linecap="round" />
		{:else if avatar.kind === 'fox'}
			<path d="m23 43-3-25 24 14h12l24-14-3 25 4 15-31 24-31-24z" fill={avatar.color} />
			<path d="m25 25 2 18 11-8m37-10-2 18-11-8" fill="#b45f45" />
			<path d="m21 48 20 10 9 21 9-21 20-10-5 20-24 15-24-15z" fill="#f7e6cd" />
		{:else if avatar.kind === 'owl'}
			<path d="M22 27 37 34q13-7 26 0l15-7-2 25q8 26-26 32-34-6-26-32z" fill={avatar.color} />
			<ellipse cx="36" cy="51" rx="15" ry="17" fill="#f0e6f6" />
			<ellipse cx="64" cy="51" rx="15" ry="17" fill="#f0e6f6" />
			<path d="m46 61 4 7 4-7" fill="#ddac65" />
			<path
				d="m26 70 9 4m39-4-9 4M40 84h5m10 0h5"
				stroke={avatar.color}
				stroke-width="4"
				stroke-linecap="round"
			/>
		{:else if avatar.kind === 'otter'}
			<circle cx="25" cy="35" r="10" fill={avatar.color} /><circle
				cx="75"
				cy="35"
				r="10"
				fill={avatar.color}
			/>
			<ellipse cx="50" cy="53" rx="31" ry="29" fill={avatar.color} />
			<ellipse cx="50" cy="66" rx="21" ry="16" fill="#f0dcc3" />
			<path
				d="M17 61h15m-12 8 13-3m50-5H68m12 8-13-3"
				stroke={avatar.color}
				stroke-width="2"
				stroke-linecap="round"
			/>
		{:else if avatar.kind === 'cat'}
			<path d="m22 44 1-25 21 15h12l21-15 1 25q15 36-28 38Q7 80 22 44" fill={avatar.color} />
			<path d="m28 28 1 15 10-6m33-9-1 15-10-6" fill="#d6a0b1" />
			<path
				d="m34 66-18-3m18 8-17 4m49-9 18-3m-18 8 17 4"
				stroke={avatar.color}
				stroke-width="2"
				stroke-linecap="round"
			/>
			<ellipse cx="50" cy="66" rx="17" ry="13" fill="#deedf5" />
		{:else if avatar.kind === 'penguin'}
			<ellipse cx="50" cy="53" rx="29" ry="34" fill={avatar.color} />
			<path d="M24 47Q9 58 17 73l13-10m46-16q15 11 7 26L70 63" fill={avatar.color} />
			<path d="M28 47q0-22 22-9 22-13 22 9v14q0 22-22 22T28 61z" fill="#edf2ed" />
			<path
				d="m44 59 6 7 6-7M28 85h15m14 0h15"
				stroke="#edba76"
				stroke-width="5"
				stroke-linecap="round"
				fill="#edba76"
			/>
		{:else if avatar.kind === 'turtle'}
			<ellipse cx="50" cy="69" rx="36" ry="18" fill="#567d55" />
			<path
				d="m22 73 10-13h36l10 13M32 60l6 22m30-22-6 22M16 74h68"
				fill="none"
				stroke={avatar.color}
				stroke-width="2"
				opacity=".6"
			/>
			<ellipse cx="50" cy="49" rx="27" ry="29" fill={avatar.color} />
			<ellipse cx="24" cy="83" rx="10" ry="5" fill={avatar.color} /><ellipse
				cx="76"
				cy="83"
				rx="10"
				ry="5"
				fill={avatar.color}
			/>
			<path
				d="M36 29q6-5 14-4"
				stroke="#fff"
				stroke-width="4"
				opacity=".25"
				stroke-linecap="round"
			/>
		{:else if avatar.kind === 'axolotl'}
			<g class="frills" stroke="#d77ca5" stroke-width="6" stroke-linecap="round"
				><path d="m27 39-13-12m13 20H10m17 8L13 66m60-27 13-12M73 47h17M73 55l14 11" /></g
			>
			<path d="M23 48q0-23 27-23t27 23v12q0 22-27 22T23 60z" fill={avatar.color} />
			<ellipse cx="29" cy="61" rx="6" ry="3" fill="#d782a0" /><ellipse
				cx="71"
				cy="61"
				rx="6"
				ry="3"
				fill="#d782a0"
			/>
			<path
				d="M35 34q6-4 13-3"
				stroke="#fff"
				stroke-width="4"
				opacity=".3"
				stroke-linecap="round"
			/>
		{:else if avatar.kind === 'octopus'}
			<path
				class="tentacles"
				d="M27 61q-15 8-10 19 6 9 13-3 1 17 13 4 7 15 14 0 12 13 13-4 7 12 13 3 5-11-10-19"
				fill={avatar.color}
			/>
			<path d="M22 52q0-32 28-32t28 32v8q0 20-28 20T22 60z" fill={avatar.color} />
			<path
				d="M33 32q7-7 17-6"
				stroke="#fff"
				stroke-width="5"
				opacity=".26"
				stroke-linecap="round"
			/>
			<circle cx="28" cy="63" r="3" fill="#d98fae" /><circle cx="72" cy="63" r="3" fill="#d98fae" />
		{:else}
			<ellipse cx="50" cy="60" rx="33" ry="24" fill={avatar.color} />
			<circle cx="33" cy="39" r="14" fill={avatar.color} /><circle
				cx="67"
				cy="39"
				r="14"
				fill={avatar.color}
			/>
			<circle cx="33" cy="41" r="9" fill="#e7efd7" /><circle cx="67" cy="41" r="9" fill="#e7efd7" />
			<ellipse cx="27" cy="64" rx="6" ry="3" fill="#d7a796" /><ellipse
				cx="73"
				cy="64"
				rx="6"
				ry="3"
				fill="#d7a796"
			/>
		{/if}
		<g
			class="face"
			fill={avatar.kind === 'robot' ? '#e6f5ed' : '#152d32'}
			stroke={avatar.kind === 'robot' ? '#e6f5ed' : '#152d32'}
			stroke-linecap="round"
		>
			<g class="eyes">
				{#if happy}
					<path
						d={avatar.kind === 'frog'
							? 'M29 42q4-6 8 0m26 0q4-6 8 0'
							: 'M31 50q5-7 10 0m18 0q5-7 10 0'}
						fill="none"
						stroke-width="3.5"
					/>
				{:else}
					<ellipse
						cx={avatar.kind === 'frog' ? 33 : 36}
						cy={avatar.kind === 'frog' ? 41 : 50}
						rx="3.2"
						ry={mood === 'thinking' ? 3 : 4.2}
					/>
					<ellipse
						cx={avatar.kind === 'frog' ? 67 : 64}
						cy={avatar.kind === 'frog' ? 41 : 50}
						rx="3.2"
						ry={mood === 'thinking' ? 3 : 4.2}
					/>
				{/if}
			</g>
			{#if ['fox', 'cat', 'otter'].includes(avatar.kind)}<path
					d="M46 60q4-3 8 0l-4 4z"
					stroke-width="1"
				/>{/if}
			{#if mood === 'thinking'}<path d="m46 71 8-2M29 42l11-2" fill="none" stroke-width="2.5" />
			{:else if mood === 'retry'}<path
					d="M45 71q5-2 10 0M30 42l10-2"
					fill="none"
					stroke-width="2.5"
				/>
			{:else}<path
					d={avatar.kind === 'robot'
						? happy
							? 'M40 59q10 13 20 0'
							: 'M43 59q7 6 14 0'
						: happy
							? 'M40 68q10 12 20 0'
							: 'M44 70q6 5 12 0'}
					fill="none"
					stroke-width="2.7"
				/>{/if}
		</g>
	</g>
	{#if happy}<g class="sparkles" stroke="#f4d589" stroke-width="2.5" stroke-linecap="round"
			><path d="M15 18v8m-4-4h8M84 70v8m-4-4h8" /></g
		>{/if}
	{#if mood === 'thinking'}<g fill={avatar.color}
			><circle cx="80" cy="20" r="2" /><circle cx="87" cy="14" r="3" /></g
		>{/if}
</svg>

<style>
	.animated[data-mood='greeting'] .character {
		animation: hello 1.3s ease-in-out 2;
	}
	.animated[data-mood='greeting'] .eyes,
	.animated[data-mood='idle'] .eyes {
		transform-origin: center;
		transform-box: fill-box;
		animation: blink 3.6s ease-in-out 1;
	}
	.animated[data-mood='thinking'] .eyes {
		animation: look 1.8s ease-in-out 2;
	}
	.animated[data-mood='greeting'] .frills,
	.animated[data-mood='greeting'] .tentacles {
		transform-origin: 50px 55px;
		animation: wave 0.65s ease-in-out 4;
	}
	@keyframes hello {
		25% {
			transform: rotate(-5deg) translateY(-2px);
		}
		65% {
			transform: rotate(5deg);
		}
		100% {
			transform: rotate(0);
		}
	}
	@keyframes blink {
		0%,
		40%,
		46%,
		100% {
			transform: scaleY(1);
		}
		43% {
			transform: scaleY(0.12);
		}
	}
	@keyframes look {
		50% {
			transform: translateX(2px);
		}
	}
	@keyframes wave {
		50% {
			transform: scaleX(1.07) rotate(2deg);
		}
	}

	.lab-avatar {
		display: block;
		flex-shrink: 0;
		overflow: visible;
	}
	.character {
		transform-origin: 50px 77px;
	}
	.animated[data-mood='working'] .character {
		animation: focus 1.4s ease-in-out 3;
	}
	.animated[data-mood='thinking'] .character {
		animation: ponder 1.8s ease-in-out 2;
	}
	.animated[data-mood='retry'] .character {
		animation: nod 0.7s ease-in-out;
	}
	.animated[data-mood='success'] .character,
	.animated[data-mood='celebrate'] .character {
		animation: hop 0.65s ease-out 2;
	}
	.animated .sparkles {
		animation: twinkle 1s ease-in-out 2;
		transform-origin: center;
	}
	@keyframes focus {
		50% {
			transform: translateY(2px);
		}
	}
	@keyframes ponder {
		50% {
			transform: rotate(-6deg);
		}
	}
	@keyframes nod {
		50% {
			transform: rotate(5deg);
		}
	}
	@keyframes hop {
		35% {
			transform: translateY(-6px) rotate(-3deg);
		}
		70% {
			transform: translateY(1px);
		}
	}
	@keyframes twinkle {
		50% {
			opacity: 0.3;
		}
	}
	:global([data-lab-motion='reduced']) .lab-avatar *,
	:global([data-lab-motion='reduced']) .lab-avatar {
		animation: none !important;
	}
	@media (prefers-reduced-motion: reduce) {
		.lab-avatar,
		.lab-avatar * {
			animation: none !important;
		}
	}
</style>
