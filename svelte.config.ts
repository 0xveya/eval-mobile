import adapter from '@sveltejs/adapter-node';
import type { Config } from '@sveltejs/kit';

const config: Config = {
	kit: {
		adapter: adapter(),
		experimental: {
			remoteFunctions: true
		}
	},
	compilerOptions: {
		// Keep the project in runes mode, except for dependencies.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
		experimental: {
			async: true
		}
	}
};

export default config;
