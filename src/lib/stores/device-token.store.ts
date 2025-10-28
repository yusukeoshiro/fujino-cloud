import { derived, writable } from 'svelte/store';

const deviceTokenStore = writable<string | null>(null);

export const deviceToken = {
	subscribe: deviceTokenStore.subscribe,
	set: (value: string | null) => deviceTokenStore.set(value)
};

export const deviceTokenReady = derived(deviceTokenStore, (value) => Boolean(value));

export const getDeviceToken = () => {
	let current: string | null = null;
	const unsubscribe = deviceTokenStore.subscribe((value) => {
		current = value;
	});
	unsubscribe();
	return current;
};
