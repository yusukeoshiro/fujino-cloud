import { HoudiniClient } from '$houdini';
import { getDeviceToken } from '$lib/stores/device-token.store';
import { env } from '$env/dynamic/private';

export default new HoudiniClient({
	url: env.GRAPHQL_URL,

	fetchParams({ session }) {
		const token = getDeviceToken();
		return {
			headers: {
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		};
	},
});
