import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
	// Kit 3 reloads this config in prerender workers using process.env.MODE.
	// Keep those workers on the same mode as the original Vite command.
	process.env.MODE = mode;
	const publicBuild = mode === 'public';
	const basePath = publicBuild ? (process.env.ITLAB_BASE_PATH ?? '') : '';
	if (!/^(?:\/[A-Za-z0-9._~-]+)*$/.test(basePath))
		throw new Error('ITLAB_BASE_PATH must be empty or a path such as /it-laben, without a trailing slash.');
	const output = publicBuild ? 'build-public' : 'build';
	const proxy = publicBuild
		? undefined
		: { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: false } };
	return {
		define: { 'import.meta.env.VITE_ITLAB_BASE_PATH': JSON.stringify(basePath) },
		// Exact host used by the managed development preview; does not affect static hosting.
		server: {
			allowedHosts: ['terminal.local'],
			proxy
		},
		preview: { proxy },
		plugins: [
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},
				adapter: adapter({ pages: output, assets: output }),
				paths: { base: /** @type {'' | `/${string}`} */ (basePath) }
			})
		]
	};
});
