import { browser } from '$app/environment';
import type { RequestEvent } from '@sveltejs/kit';
import { deviceToken, deviceTokenReady, getDeviceToken } from '$lib/stores/device-token.store';

type DeviceTokenContext = {
	event?: Pick<RequestEvent, 'locals'>;
	session?: App.Session | null;
};

export { deviceToken, deviceTokenReady };

export function setDeviceTokenValue(token: string | null, context?: { event?: Pick<RequestEvent, 'locals'> }) {
	const normalized = token ?? null;

	if (context?.event) {
		context.event.locals.deviceToken = normalized;
	}

	if (browser) {
		deviceToken.set(normalized);
	}
}

export function getDeviceTokenValue(context?: DeviceTokenContext): string | null {
	if (browser) {
		return getDeviceToken();
	}

	if (context?.event) {
		return context.event.locals.deviceToken ?? null;
	}

	if (context?.session) {
		return context.session?.deviceToken ?? null;
	}

	return null;
}
