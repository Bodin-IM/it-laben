<script>
	// Samme tekstbaserte fargekoding for kodeeksempler og interaktive kodelinjer.
	/** @type {{ source: string }} */
	let { source } = $props();
	/** @typedef {{ text: string, type: string }} Token */
	const tokens = $derived(highlight(source));

	/** @param {string} source @returns {Token[]} */
	function highlight(source) {
		const pattern =
			/\/\/.*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:import|from|const|let|if|else|return|async|await|function|try|catch|throw|new|typeof|for|of|export|true|false|null)\b|\b(?:fetch|stringify|json|push|trim|status|post|get|set|use|filter|map|Error|JSON|express|URLSearchParams|encodeURIComponent)\b|\b\d+\b/g;
		/** @type {Token[]} */
		const tokens = [];
		let end = 0;
		for (const match of source.matchAll(pattern)) {
			const index = match.index ?? 0;
			if (index > end) tokens.push({ text: source.slice(end, index), type: 'vanlig' });
			const word = match[0];
			const type = word.startsWith('//')
				? 'kommentar'
				: /^["'`]/.test(word)
					? 'streng'
					: /^\d+$/.test(word)
						? 'tall'
						: /^(import|from|const|let|if|else|return|async|await|function|try|catch|throw|new|typeof|for|of|export|true|false|null)$/.test(
									word
							  )
							? 'nokkelord'
							: 'funksjon';
			tokens.push({ text: word, type });
			end = index + word.length;
		}
		if (end < source.length) tokens.push({ text: source.slice(end), type: 'vanlig' });
		return tokens;
	}
</script>

{#each tokens as token}<span class={token.type}>{token.text}</span>{/each}

<style>
	.nokkelord {
		color: #9cded1;
	}
	.streng {
		color: #e0d29f;
	}
	.funksjon {
		color: #e6bd8c;
	}
	.tall {
		color: #d8c0e4;
	}
	.kommentar {
		color: #8fa98d;
		font-style: italic;
	}
</style>
