import { writable } from 'svelte/store';

export class DeviceTokenAccessor {
	private current: string | null = null;
	private readonly readyStore = writable(false);

	get(): string | null {
		return this.current;
	}

	set(token: string | null) {
		this.current = token ?? null;
		this.readyStore.set(Boolean(this.current));
	}

	get ready() {
		return {
			subscribe: this.readyStore.subscribe,
		};
	}
}

export const deviceTokenAccessor = new DeviceTokenAccessor();
