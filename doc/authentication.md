## Authentication Overview

Our stack has two complementary layers of authentication:

1. **User authentication (Firebase session cookie)**
   - `src/hooks.server.ts` verifies the `fb.session` cookie with Firebase Admin and stores the basic user profile plus organization memberships on `event.locals.user`.
   - Route guards rely on this information to protect all `/_/...` pages and enforce org-level access.

2. **Device token authentication (Mobili GraphQL API)**
   - Each organization has one device token stored in Firestore (`deviceTokenService`).
   - Server routes and API handlers must include this token as a Bearer header when calling the GraphQL API so Nest’s `UserDeviceGuard` accepts the request.

### DeviceTokenAccessor

The `DeviceTokenAccessor` singleton (`src/lib/device-token/device-token-accessor.ts`) centralizes how we read/update the device token.

- `deviceTokenAccessor.set(token)` updates the in-memory token and notifies listeners (Svelte components).
- `deviceTokenAccessor.get()` returns the current token for server-side callers (e.g., `src/client.ts`).
- `deviceTokenAccessor.subscribe(...)` / `subscribeReady(...)` expose Svelte-store-like APIs so UI elements can react to changes.

`hooks.server.ts` loads the token for the referenced org (route param `oid` or `orgId` query) and calls `deviceTokenAccessor.set(...)` before any other logic runs. Client components still call `deviceTokenAccessor.set(...)` when layouts provide initial data so hydration stays in sync.

Because Houdini is only used from backend routes, `src/client.ts` simply fetches the token via `deviceTokenAccessor.get()` when building GraphQL requests—no session or metadata plumbing is required.
