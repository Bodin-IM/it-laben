<script>
	import { publicMode } from '#lib/deployment.js';
	import PublicSchoolNotice from '#lib/components/PublicSchoolNotice.svelte';
	import { siteHref } from '#lib/sitePaths.js';
	import SecureAccessGuide from '#lib/components/SecureAccessGuide.svelte';
</script>

<svelte:head
	><title>Kom i gang med Min lab | IT-laben</title><meta
		name="robots"
		content="noindex"
	/></svelte:head
>
{#if publicMode}
	<PublicSchoolNotice title="Du kan øve uten innlogging" description="Denne utgaven er åpen for alle. Bruk skolens adresse når du skal logge inn eller registrere fremgang på skolekontoen din." />
{:else}<div class="guide-page">
	<main id="hovedinnhold" tabindex="-1">
		<p><a href={siteHref('/tutorial/')}>Ny her? Se hvordan du bruker oppgavene i IT-laben →</a></p>
		<SecureAccessGuide />
	</main>
</div>{/if}

<style>
	.guide-page {
		min-height: 100vh;
		background: var(--color-page);
		color: var(--color-text);
		font-family: var(--font-ui);
	}
	main {
		width: min(var(--layout-width), calc(100% - 2 * var(--layout-gutter)));
		margin-inline: auto;
	}

	main {
		padding: 24px 0 50px;
	}
</style>
