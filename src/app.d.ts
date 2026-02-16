// See https://svelte.dev/docs/kit/types#app.d.ts

import type { MemberDto } from './lib/services/member.dto';

// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: {
				uid: string;
				email: string | null;
				name: string | null;
				picture: string | null;
				members: MemberDto[];
			} | null;
		}

		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}


declare module 'jspreadsheet-ce' {
	export interface SpreadsheetInstance {
		el: HTMLElement;
		destroy: () => void;
		setValueFromCoords: (x: number, y: number, value: string | number, force?: boolean) => void;
	}
}

export {};
