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
	scalars: {
		/* in your case, something like */
		DateTime: {
			type: 'Date', // <-  The TypeScript type
			unmarshal(val) {
				return val ? new Date(val) : null;
			},
			// turn the value into something the API can use
			marshal(date) {
				if (!date) return null;
				if (typeof date === 'string') {
					console.warn(`string is not expected, got ${date}`);
					return date;
				}
				if (date.toISOString) return date.toISOString();

				return date;
			},
		},
		JSON: {
			// <- The GraphQL Scalar
			type: 'Object', // <-  The TypeScript type
		},
	},
};

export default config;
