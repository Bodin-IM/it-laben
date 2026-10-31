<script>
	import { validationJourney } from '#lib/backendValidation.js';
	import { moduleLink } from '#lib/moduleNavigation.js';
	/** @type {{current?:string,moduleId?:string|null}} */
	let { current = '', moduleId = 'backend' } = $props();
</script>

<nav class="journey" aria-label="Validering: fra øving til egen kode">
	<p><strong>Validering: fra øving til egen kode</strong></p>
	<ol>
		{#each validationJourney as step, index (step.id)}
			<li class:current={current === step.id}>
				<a href={moduleLink(step.href, moduleId)} aria-current={current === step.id ? 'step' : undefined}>
					{index + 1}. {step.title}
				</a>
				<span>{step.description}</span>
			</li>
		{/each}
	</ol>
</nav>

<style>
	.journey { margin-block: 20px; padding: 16px; border: 1px solid var(--color-info-border); border-radius: var(--radius-card); background: var(--color-info-soft); color: var(--color-text); font-family: var(--font-ui); overflow-wrap: anywhere; }
	p { margin: 0 0 8px; font-size: var(--font-body); }
	ol { list-style: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding: 0; margin: 0; }
	li { min-width: 0; padding: 8px 12px; border: 1px solid transparent; border-radius: 8px; }
	.current { border-color: var(--color-info-border); background: var(--color-surface); }
	a { display: flex; align-items: center; min-height: 44px; color: var(--color-action); font-weight: 650; text-underline-offset: 4px; }
	a:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	span { display: block; font-size: var(--font-small); line-height: var(--leading-body); }
	@media (max-width: 640px) { ol { grid-template-columns: minmax(0, 1fr); gap: 4px; } }
</style>
