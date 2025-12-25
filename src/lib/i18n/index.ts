import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';
import { supportedLocales, translations, type Locale } from './translations';

const storageKey = 'preferredLanguage';
const fallbackLocale: Locale = 'en';

const normalizeLocale = (value: string | null): Locale | null => {
	if (!value) return null;
	const lower = value.toLowerCase();
	if (lower.startsWith('ja')) return 'ja';
	if (lower.startsWith('ko')) return 'ko';
	if (lower.startsWith('en')) return 'en';
	return null;
};

const detectLocale = (): Locale => {
	if (!browser) return fallbackLocale;
	const stored = normalizeLocale(localStorage.getItem(storageKey));
	if (stored) return stored;
	const candidates = navigator.languages ?? [navigator.language];
	for (const candidate of candidates) {
		const normalized = normalizeLocale(candidate);
		if (normalized) return normalized;
	}
	return fallbackLocale;
};

export const locale = writable<Locale>(fallbackLocale);

export const t = derived(locale, ($locale) => {
	return (key: string, vars: Record<string, string | number> = {}) => {
		const template = translations[$locale]?.[key] ?? translations[fallbackLocale]?.[key] ?? key;
		return template.replace(/\{\{(\w+)\}\}/g, (_match, name) => String(vars[name] ?? ''));
	};
});

export const initLocale = () => {
	if (!browser) return;
	const detected = detectLocale();
	locale.set(detected);
	document.documentElement.lang = detected;
};

export const setLocale = (next: Locale) => {
	locale.set(next);
	if (browser) {
		localStorage.setItem(storageKey, next);
		document.documentElement.lang = next;
	}
};

export { supportedLocales, type Locale };
