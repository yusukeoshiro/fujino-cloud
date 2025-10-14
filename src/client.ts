import { HoudiniClient } from '$houdini';

export default new HoudiniClient({
	url: 'https://api.dev.mobili-platform.com/graphql',

	// uncomment this to configure the network call (for things like authentication)
	// for more information, please visit here: https://www.houdinigraphql.com/guides/authentication
	fetchParams({ session }) {
		return {
			headers: {
				Authorization: `Bearer device_c068272d24b705966f12a28a8cbed42510d8353ef124a61f06a6f782a7362cac`,
			},
		};
	},
});
