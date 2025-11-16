import { HoudiniClient } from '$houdini';
import { deviceTokenAccessor } from '$lib/accessors/device-token.accessor';
import { env } from '$env/dynamic/private';

export default new HoudiniClient({
	url: env.GRAPHQL_URL,

	fetchParams() {
		const token = deviceTokenAccessor.get();
		return {
			headers: {
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		};
	},
});
