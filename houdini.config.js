/// <references types="houdini-svelte">

/** @type {import('houdini').ConfigFile} */
const config = {
	watchSchema: {
		url: 'https://api.dev.mobili-platform.com/graphql',
	},
	runtimeDir: '.houdini',
	plugins: {
		'houdini-svelte': {},
	},
};

export default config;
