import { HoudiniClient } from '$houdini';
import { getDeviceToken } from '$lib/stores/device-token.store';
import { GRAPHQL_URL } from '$env/static/private';

export default new HoudiniClient({
	url: GRAPHQL_URL,

	fetchParams({ session }) {
		const token = getDeviceToken();
		return {
			headers: {
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		};
	},
});
