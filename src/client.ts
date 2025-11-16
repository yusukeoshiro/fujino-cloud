import { HoudiniClient } from '$houdini';
import { getDeviceTokenValue } from '$lib/device-token/accessor';
import { env } from '$env/dynamic/private';

export default new HoudiniClient({
	url: env.GRAPHQL_URL,

	fetchParams({ session }) {
		const token = getDeviceTokenValue({ session });
		return {
			headers: {
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		};
	},
});
