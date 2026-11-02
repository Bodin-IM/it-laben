<script>
	import { siteHref } from '#lib/sitePaths.js';
	import { storageSteps } from '#lib/storageExercise.js';
	import { moduleLink } from '#lib/moduleNavigation.js';
	import { getInterfaceHelp } from '#lib/interfaceHelp.js';
	import CodeTokens from '#lib/components/CodeTokens.svelte';
	import PartnerContext from '#lib/components/PartnerContext.svelte';
	/** @type {{moduleId?:string|null}} */ let { moduleId = null } = $props();
	const helpTarget = getInterfaceHelp().target;
	/** @type {Record<string,string>} */ let copyStatus = $state({});
	/** @param {string} id @param {string} code */
	async function copyCode(id, code) {
		try { await navigator.clipboard.writeText(code); copyStatus[id] = 'Koden er kopiert.'; }
		catch { copyStatus[id] = 'Marker koden og kopier med Ctrl+C eller Cmd+C.'; }
	}
</script>

<PartnerContext pageId="oving-5" values={{}} />

<div id="forsok" class="storage-guide">
	<div id="eget-prosjekt" class="start">
		<p>Bruk en testkopi av chatprosjektet fra <a href={siteHref(moduleLink('/fillagring/', moduleId))}>Fillagring</a>. Du trenger en fungerende GET/POST-rute, listen <code>meldinger</code> og <code>fil</code> som peker på JSON-filen din.</p>
		<p>Legg <code>readFileSync</code> og <code>writeFileSync</code> til den eksisterende importen fra <code>node:fs</code>. Arbeid i <code>server.js</code>, én del om gangen, og start Node fra backendmappen.</p>
	</div>

	{#each storageSteps as step, index (step.id)}
		<section id={step.id} aria-labelledby={`storage-${step.id}`}>
			<h2 id={`storage-${step.id}`}>{index + 1}. {step.title}</h2>
			<h3>Eksempel</h3>
			<p class="placement">{step.placement}</p>
			<div class="code" use:helpTarget={{ label: `Kode · ${step.label}`, hint: 'Les eksemplet. Teksten over viser hvor det hører hjemme i server.js.', order: index * 2 }}>
				<div class="code-bar"><span>server.js · utdrag</span><button type="button" onclick={() => copyCode(step.id, step.code)} aria-label={`Kopier eksemplet: ${step.title}`}>Kopier kode</button></div>
				<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard scrolling for code on narrow screens.) -->
				<pre tabindex="0" role="region" aria-label={`Kode: ${step.title}`}><code><CodeTokens source={step.code} /></code></pre>
				<p class="copy-status" role="status">{copyStatus[step.id] ?? ''}</p>
			</div>
			<h3>Hva gjør koden?</h3>
			<p>{step.explanation}</p>
			<div class="try" use:helpTarget={{ label: `Prøv selv · ${step.label}`, hint: 'Gjør den lille endringen i egen chat og sammenlign med resultatet som er beskrevet her.', order: index * 2 + 1 }}>
				<h3>Prøv selv</h3>
				<ol>
					{#each step.trials as trial, trialIndex}
						<li><p>{trial.text}</p>
							{#if trial.code}
								{@const codeId = `${step.id}-${trialIndex}`}
								<div class="code-bar"><span>server.js · endring</span><button type="button" onclick={() => copyCode(codeId, trial.code ?? '')} aria-label={`Kopier endring i ${step.label}`}>Kopier kode</button></div>
								<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard scrolling for code on narrow screens.) -->
								<pre tabindex="0" role="region" aria-label={`Endring: ${step.label}`}><code><CodeTokens source={trial.code} /></code></pre>
								<p class="copy-status" role="status">{copyStatus[codeId] ?? ''}</p>
							{/if}
						</li>
					{/each}
				</ol>
			</div>
		</section>
	{/each}
	<p class="next-example">Til det separate Node-eksemplet i øving 6: <a href={siteHref('/eksempler/lagre.mjs')} download>last ned lagre.mjs</a>.</p>
</div>

<style>
	.storage-guide { max-width: 850px; margin-inline: auto; color: var(--color-text); }
	.start { padding-bottom: 16px; }
	section { padding-block: 28px; border-top: 1px solid var(--color-border); scroll-margin-top: 90px; }
	#forsok, #eget-prosjekt { scroll-margin-top: 90px; }
	h2 { margin: 0 0 22px; font-size: 1.5rem; line-height: 1.35; }
	h3 { margin: 20px 0 8px; font-size: 1.1rem; }
	p, li { font-size: var(--font-body); line-height: var(--leading-body); }
	p { max-width: 70ch; margin: 8px 0 14px; }
	.placement { color: var(--color-text-muted); }
	.code-bar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; padding: 8px 12px; background: var(--color-surface-soft); border: 1px solid var(--color-border); border-radius: 8px 8px 0 0; }
	.code-bar span, .copy-status, .next-example { font-size: var(--font-small); color: var(--color-text-muted); }
	button { min-height: 44px; padding: 8px 12px; font: inherit; color: var(--color-action); background: var(--color-surface); border: 1px solid var(--color-border-strong); border-radius: 6px; cursor: pointer; }
	button:hover { background: var(--color-surface-hover); }
	pre { margin: 0; padding: 16px; overflow-x: auto; background: var(--color-code-bg); color: var(--color-code-text); border-radius: 0 0 8px 8px; }
	code { font: var(--font-code)/var(--leading-code) monospace; }
	.copy-status { min-height: 1.5em; margin: 4px 0 0; }
	.try { margin-top: 20px; padding-left: 16px; border-left: 3px solid var(--color-border-strong); }
	.try h3 { margin-top: 0; }
	ol { padding-left: 22px; margin: 0; }
	li + li { margin-top: 12px; }
	li p { margin-bottom: 8px; }
	a { color: var(--color-action); text-underline-offset: 3px; }
	.next-example { padding-block: 16px; border-top: 1px solid var(--color-border); }
	:is(button, a, pre):focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
	@media (max-width: 500px) { section { padding-block: 24px; } pre { padding: 12px; } .try { padding-left: 10px; } }
</style>
