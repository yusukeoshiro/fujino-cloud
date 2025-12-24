# Agent Instructions

This repository contains an SvelteKit application.

## Verification

Before submitting any changes, you **must** run the verification script to ensure that the code is correct, formatted properly, and passes all tests.

Run the following command in the root directory:

```bash
npm run verify
```

This command runs:

1.  `npm run check`: SvelteKit sync, Svelte check, and TypeScript check.
2.  `npm run lint`: Prettier check and ESLint.
3.  `npm run test`: Unit tests with Vitest.

If any of these checks fail, you must fix the issues before submitting.

## Common Issues

- **Playwright Browsers**: If tests fail due to missing browsers, run `npx playwright install`.
- **Houdini**: If you encounter errors related to `$houdini`, run `npx houdini generate`.

## Internationalization (i18n)

- Always have i18n in mind when implementing the UI in the future.
- Use `svelte-i18n` for internationalization.
- All user-facing text must be internationalized using keys from the locale files (`src/lib/i18n/locales/`).
- Support English (`en`), Japanese (`ja`), and Korean (`ko`).
