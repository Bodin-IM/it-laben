<script>
	import { untaggedVlan } from '#lib/networkCheckFeedback.js';
	import { membership } from '#lib/vlanLab.js';
	/** @type {{device:import('#lib/vlanLab2.js').Switch,config:import('#lib/vlanLab.js').SwitchConfig,networks:import('#lib/vlanLab2.js').Network[],disabled?:boolean,onchange:(config:import('#lib/vlanLab.js').SwitchConfig)=>void}} */
	let { device, config, networks, disabled = false, onchange } = $props();
	let newVlan = $state(''),
		message = $state('');
	const labels = { untagged: 'Untagged', excluded: 'Exclude', tagged: 'Tagged' };
	const symbols = { untagged: 'U', excluded: 'E', tagged: 'T' };
	/** @type {import('#lib/vlanLab.js').Membership[]} */
	const order = ['untagged', 'excluded', 'tagged'];
	/** @returns {import('#lib/vlanLab.js').SwitchConfig} */
	const copy = () => JSON.parse(JSON.stringify(config));
	/** @param {string} port @param {number} vlan */
	function cycle(port, vlan) {
		if (disabled) return;
		const next = copy(),
			p = next.ports[port],
			mode = order[(order.indexOf(membership(p, vlan)) + 1) % 3];
		if (mode === 'untagged')
			for (const id of Object.keys(p.members))
				if (p.members[id] === 'untagged') p.members[id] = 'excluded';
		p.members[String(vlan)] = mode;
		p.pvid = untaggedVlan(p) ?? 1;
		onchange(next);
		message = `${device.name} ${port}, VLAN ${vlan}: ${labels[mode]}.`;
	}
	function add() {
		const id = Number(newVlan);
		if (!/^\d+$/.test(newVlan) || id < 1 || id > 4094) {
			message = 'Bruk VLAN-ID 1–4094.';
			return;
		}
		if (config.vlans.includes(id) || config.vlans.length >= 8) {
			message = 'VLAN-et finnes allerede, eller grensen på åtte VLAN er nådd.';
			return;
		}
		const next = copy();
		next.vlans = [...next.vlans, id].sort((a, b) => a - b);
		onchange(next);
		newVlan = '';
		message = `VLAN ${id} opprettet.`;
	}
	/** @param {number} id */
	function remove(id) {
		if (
			Object.values(config.ports).some((p) => membership(p, id) !== 'excluded')
		) {
			message = 'Sett alle portene til Exclude før VLAN-et fjernes.';
			return;
		}
		const next = copy();
		next.vlans = next.vlans.filter((v) => v !== id);
		for (const p of Object.values(next.ports)) { delete p.members[String(id)]; p.pvid = untaggedVlan(p) ?? 1; }
		onchange(next);
		message = `VLAN ${id} fjernet.`;
	}
</script>

{#if disabled}<p>Ferdig oppsatt · kun visning</p>{/if}
<div class="heading">
	<h3>{device.name} · VLAN-medlemskap</h3>
	<p><b>U</b> Untagged · <b>E</b> Exclude · <b>T</b> Tagged</p>
</div>
{#if !disabled}
	<details>
		<summary>Opprett og fjern VLAN</summary>
		<div class="management">
			<form
				onsubmit={(event) => {
					event.preventDefault();
					add();
				}}
			>
				<label for="switch-new-vlan">Ny VLAN-ID</label>
				<div>
					<input
						id="switch-new-vlan"
						inputmode="numeric"
						maxlength="4"
						bind:value={newVlan}
					/><button>Legg til</button>
				</div>
			</form>
			<div>
				{#each config.vlans.filter((v) => v !== 1) as id}<button
						type="button"
						onclick={() => remove(id)}>Fjern {id}</button
					>{/each}
			</div>
		</div>
	</details>
{/if}
<!-- svelte-ignore a11y_no_noninteractive_tabindex (The two-dimensional port table needs keyboard scrolling.) -->
<div class="scroll" role="region" aria-label="VLAN-tabell, rull vannrett ved behov" tabindex="0">
	<table>
		<thead
			><tr
				><th scope="col">VLAN</th>{#each device.ports as p}<th scope="col"
						>{p.id}<small>{p.peer}</small></th
					>{/each}</tr
			></thead
		><tbody>
			{#each config.vlans as id}<tr
					><th scope="row"
						>{id}<small
							>{networks.find((n) => n.vlan === id)?.name ?? (id === 1 ? 'Default' : '')}</small
						></th
					>{#each device.ports as p}{@const mode = membership(config.ports[p.id], id)}<td
							><button
								type="button"
								class="cell"
								data-mode={mode}
								{disabled}
								aria-label={`${device.name} ${p.id}, VLAN ${id}: ${labels[mode]}`}
								onclick={() => cycle(p.id, id)}>{symbols[mode]}</button
							></td
						>{/each}</tr
				>{/each}
		</tbody>
	</table>
</div>
<p role="status" class="status">{message}</p>
<details>
	<summary>Hjelp: U, E og T</summary>
	<p>
		Trykk på en portrute: U → E → T → U. Ny U erstatter tidligere U på samme port og velger også VLAN for umerket trafikk inn. En port uten U avviser umerket trafikk.
	</p>
	<p>
		U sender uten tag; T sender med VLAN-ID; E utelukker
		VLAN-et. R1 og AP1 bruker tagged trafikk på kabelen i lab 2.
	</p>
</details>

<style>
	.heading,
	.management {
		display: flex;
		gap: 1rem;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
	}
	.heading h3,
	.heading p {
		margin: 0.4rem 0;
	}
	.management {
		padding: 1rem 0;
		justify-content: flex-start;
	}
	.management form > div,
	.management > div {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.management input {
		width: 7rem;
	}
	.management label {
		display: block;
		margin-bottom: 0.4rem;
	}
	.scroll {
		overflow-x: auto;
		max-width: 100%;
		margin-top: 1rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		text-align: center;
	}
	th,
	td {
		padding: 0.6rem;
		border-bottom: 1px solid var(--color-border);
	}
	th {
		font-weight: 700;
	}
	th small {
		display: block;
		max-width: 10rem;
		font-weight: 400;
		font-size: var(--font-small);
		margin: 0.25rem auto;
	}
	button,
	input {
		min-height: 44px;
		border: 1px solid var(--color-border-strong);
		border-radius: 7px;
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
		padding: 0.5rem 0.75rem;
	}
	button {
		cursor: pointer;
	}
	.cell {
		min-width: 48px;
		font-weight: 800;
	}
	.cell[data-mode='tagged'] {
		background: var(--color-accent-soft);
		color: var(--color-accent);
	}
	.cell[data-mode='untagged'] {
		background: var(--color-success-soft);
		color: var(--color-success);
	}
	button:disabled {
		cursor: default;
	}
	.status {
		min-height: 1.5em;
		font-size: var(--font-small);
	}
	summary {
		cursor: pointer;
		padding: 0.6rem 0;
	}
	p {
		line-height: 1.6;
	}
	button:focus-visible,
	input:focus-visible,
	summary:focus-visible,
	.scroll:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 3px;
	}
</style>
