# Daymark Offline-First Implementation Plan

**Purpose:** Give an implementation agent a concrete, verifiable plan for making
Daymark useful when the network is unavailable, without losing or duplicating
task and note changes.

**Status:** Planning document only. No application code is changed by this plan.

## 1. Product Outcome

Daymark should remain usable when the user temporarily loses connectivity:

- Previously loaded tasks and notes remain available.
- The user can create, edit, complete/reopen, and delete tasks and notes offline.
- Offline changes are saved on the device immediately and are visibly marked as
  pending synchronization.
- Changes synchronize automatically after connectivity returns.
- The app explains when it is offline, synchronizing, blocked by an error, or
  fully synchronized.
- Data and queued changes remain isolated by signed-in account on the device.
- The installed PWA can load the app shell while offline.

The server remains authoritative for account identity and final persisted data.
Offline support must not imply that a queued change has reached the server.

## 2. Existing State (Verified)

This repository already has a partial, read-only offline implementation:

- [`client/src/main.jsx`](./client/src/main.jsx) registers
  [`client/public/service-worker.js`](./client/public/service-worker.js) in
  production.
- The service worker pre-caches the app shell and built assets. It explicitly
  does not cache API requests.
- [`client/src/App.jsx`](./client/src/App.jsx) tracks
  `navigator.onLine`, fetches tasks, notes, and streak data, and saves a
  last-loaded workspace snapshot in `localStorage` under an account-specific
  key.
- If the initial authenticated API check fails while offline, the app can
  restore the last snapshot using `daymark-offline-user` and the saved account
  snapshot.
- The UI displays an offline notice and prevents some writes, but offline
  actions are not queued or synchronized. Some task actions can still be
  attempted and fail as ordinary network requests.
- [`client/src/api.js`](./client/src/api.js) uses `fetch` directly. It has no
  persistent data store, mutation queue, retry policy, or synchronization
  protocol.
- Task and note API responses have no shared optimistic-concurrency or
  idempotency protocol. Notes provide `updatedAt`; tasks do not.
- The PWA manifest and app shell provide installability, not offline data
  synchronization.

Do not mistake a cached app shell or snapshot for full offline support.

## 3. Scope and Product Decisions

### In scope

- Offline viewing from a valid, previously synchronized local workspace.
- Offline create, edit, completion/reopen, and delete for tasks and notes.
- Per-account persistent local storage and a durable outbox.
- Automatic and manual synchronization, clear pending/error states, and
  conflict resolution.
- Task/note detail routes and calendar/insights reading from the local
  workspace store.
- Service-worker shell caching and documented behavior in supported browsers.
- Browser tests for offline use, reconnection, account isolation, and failures.

### Out of scope for the first release

- First-time registration or login while offline.
- Offline PDF generation/export; keep export online-only and explain why.
- Multi-device real-time collaboration while both devices are offline.
- Background Sync as a requirement. Use it only as a progressive enhancement;
  foreground retry on app open, `online`, and explicit user action is mandatory.
- Offline recovery from a device/browser storage wipe.
- Restoring data after the user clears site storage or uninstalls the browser.

### Authentication and local access policy

- A user must authenticate online at least once on the device before offline
  workspace access is offered.
- Never store the password, Flask session cookie, or bearer credentials in
  IndexedDB, localStorage, or the service-worker cache.
- Offline access is a local convenience for an already authenticated browser
  profile, not proof of current server authentication.
- Explain that locally stored workspace data is accessible to anyone with
  access to that browser profile/device. Do not present a local username marker
  as cryptographic authentication.
- Online logout must clear that account's local workspace and outbox only after
  the server logout succeeds. If logout cannot reach the server, state clearly
  that the session could not be revoked and offer a separate explicit
  “clear this device's offline data” action.
- Switching accounts must never display another account's records or queued
  changes.

## 4. Recommended Architecture

### 4.1 IndexedDB local workspace

Replace `localStorage` as the source of task/note snapshots and queued writes.
Keep localStorage only for small non-sensitive preferences (theme, collapsed
sidebar, and a non-secret last-account hint if still required).

Create a small client data layer, for example:

- `client/src/offline/db.js`: IndexedDB open/upgrade and transaction helpers.
- `client/src/offline/workspaceRepository.js`: account-scoped reads/writes for
  tasks, notes, streak, metadata, and pending mutations.
- `client/src/offline/syncEngine.js`: ordered outbox processing and refresh.
- `client/src/offline/connectivity.js`: browser signal plus request-failure
  status and retry coordination.
- `client/src/offline/types.js` or equivalent JSDoc definitions: stable record
  and mutation shapes if this project remains JavaScript.

Use the existing dependency set unless implementation demonstrates that a
small IndexedDB wrapper is needed. If adding a dependency, update the client
manifest and lockfile together.

Every workspace record and outbox entry must carry an `accountKey` derived from
the authenticated username or, preferably, a stable server user ID returned
from `/check_auth`. Do not trust client-supplied ownership when sending a
mutation; the server must continue to derive the user from its authenticated
session.

### 4.2 Suggested IndexedDB stores

Use database versioning and explicit upgrade handling:

1. `workspaces`
   - Key: `[accountKey, kind, id]`
   - `kind`: `task`, `note`, `streak`, or workspace metadata.
   - Store canonical server fields plus local sync state.
2. `mutations`
   - Key: stable client-generated `mutationId`.
   - Fields: `accountKey`, entity kind, operation, entity/server ID or local
     temporary ID, payload, sequence, creation time, attempts, status, and
     last error.
3. `mappings`
   - Key: `[accountKey, entityKind, localId]`.
   - Value: assigned server ID, used to replace temporary IDs and repair
     pending note-to-task links after an offline-created task is synchronized.
4. `metadata`
   - Key: `[accountKey, name]`.
   - Store last successful full refresh, schema version, last sync result, and
     optional server cursor/revision.

Use IndexedDB transactions to atomically save a local record and enqueue its
mutation. An offline save must never update the UI as successful if the
transaction failed.

### 4.3 Canonical records and pending overlays

- Keep the latest known server version as the base record.
- Apply queued local mutations as a pending overlay to render the optimistic
  current record.
- Store local-only metadata separately, such as `syncState`, `pendingMutationId`,
  and `localId`; never send those UI fields as normal task/note payload fields.
- Mark unsynchronized local creates with collision-safe IDs such as
  `local:<uuid>`. Do not guess future integer server IDs.
- Preserve ordering for multiple offline changes to the same entity.
- Coalesce safe queued edits to the same entity when doing so cannot reorder a
  create, delete, or relationship change.
- A queued delete should hide the item locally immediately but retain a
  tombstone until the server confirms the delete.

### 4.4 Mutation delivery and idempotency

An HTTP request can reach the server even when the browser never receives its
response. Retrying a create must not create a duplicate.

Before enabling offline writes, add an idempotency strategy:

- Assign each logical create a stable `mutationId` before saving locally.
- Send it with the API request (for example, an `Idempotency-Key` header or a
  documented JSON field).
- Persist the result associated with that key server-side, scoped to the
  authenticated user, and return the original created record on retries.
- Keep the key stable across retries and clear it only after success is
  persisted locally.
- Make sync requests serial per account initially. Parallel uploads can be
  considered only after dependency and ordering behavior is tested.

Do not implement blind retries for non-idempotent POST operations.

### 4.5 Conflicts and server revisions

The current API does not provide consistent conflict detection. Add a revision
contract before implementing automatic overwrite:

- Add a monotonically changing `version` integer or equivalent concurrency
  token to tasks and notes and include it in API responses.
- Require updates to provide the version they edited.
- Return `409 Conflict` with the current server record when the version is
  stale.
- Keep the local and server versions and queue entry intact on conflict.
- Show a clear conflict state with choices to keep server data, replace it with
  the local version, or copy local text for manual merging. Do not silently
  implement last-write-wins.
- For the first release, make conflict resolution explicit rather than
  attempting a field-by-field merge.

If scope requires deferring server revisions, do not claim conflict-safe offline
editing. Use an explicit overwrite warning and retain a recoverable local copy.

## 5. Expected User Experience

### Connectivity and sync status

Provide one shared status model, not independent booleans scattered among
components:

- `online`: connected and no pending mutations.
- `offline`: network unavailable; local data can be used.
- `syncing`: mutations or refresh currently in progress.
- `pending`: online or offline with unsent changes.
- `sync-error`: a mutation or refresh failed and needs retry/action.
- `conflict`: at least one server revision conflict needs user input.
- `no-local-data`: no workspace has been saved on this device.

Show:

- Offline and last-synced time in the existing status banner.
- A pending count while mutations await the server.
- Per-record “Pending sync” or “Sync failed” indication where helpful.
- A retry action for retryable failure and an explicit action for conflicts.
- An accessible live-region announcement when sync starts, succeeds, or fails.

Do not equate `navigator.onLine === true` with working API connectivity. A
failed request should mark the app as unable to reach the service, preserve the
local operation, and schedule a retry with backoff.

### CRUD behavior while offline

- Task create/edit/complete/reopen/delete is immediately reflected locally.
- Note create/edit/delete is immediately reflected locally.
- Note links to tasks must work when either item has a local temporary ID.
- Search, filters, task details, calendar, and insights must use the local
  repository-backed state and include pending records.
- Keep PDF export disabled offline with a clear explanation.
- Form validation remains immediate and follows the same constraints as the
  server. A queued invalid request must not be represented as synced.
- On reload while offline, the app restores the IndexedDB workspace and pending
  queue before it requires network calls.

## 6. Implementation Sequence

Implement one milestone at a time. Do not start by changing the service worker
to cache API responses: authenticated API caching can leak user-specific data
and does not provide reliable mutation delivery.

### Milestone 0 — Baseline and behavior tests

1. Record current behavior and identify online-only controls.
2. Add client test infrastructure only if none exists, following current repo
   conventions and using the smallest viable test stack.
3. Add tests around current online create/edit/delete, authentication, and
   workspace load behavior before changing the data flow.
4. Add a manual browser test checklist for Chrome desktop, Chrome Android, and
   Safari/iOS if supported.

**Exit criteria:** Baseline tests pass; tests demonstrate that the service
worker caches the shell but not API responses.

### Milestone 1 — Local persistence and migration

1. Implement versioned IndexedDB open/upgrade, typed/JSDoc schemas, and
   repository operations.
2. Add tests for first install, upgrade, corrupted/unsupported DB handling,
   quota failure, account isolation, and transaction failure.
3. Add a one-time import path from the existing `daymark-offline-*` localStorage
   snapshot for the matching account. Validate parsed structure before import.
4. Do not delete the legacy snapshot until the IndexedDB transaction succeeds.
5. Add data-age and schema metadata; surface stale data rather than silently
   claiming it is current.

**Exit criteria:** Existing cached snapshots can be imported once, with no
cross-account reads, and repository errors are visible to the user.

### Milestone 2 — Read-only offline from repository

1. Make the repository the source for cached tasks, notes, and streak.
2. After successful online authentication and refresh, atomically replace the
   local server snapshot for that account.
3. On reload without network, load the local workspace before rendering the
   authenticated application.
4. Preserve service-worker behavior: app shell/assets only; no authenticated
   API responses in Cache Storage.
5. Add stale-data messaging with a last successful sync timestamp.

**Exit criteria:** A previously signed-in account can reload and browse its
cached data offline; a fresh browser profile cannot invent an authenticated
workspace.

### Milestone 3 — Mutation outbox and task writes

1. Implement the persistent mutation queue and deterministic status transitions.
2. Make task create/edit/complete/reopen/delete repository-first and optimistic.
3. Add server idempotency and version/conflict contracts before automatic
   retries/overwrite.
4. Add mapping from local task IDs to server IDs.
5. During replay, persist the response/mapping before marking the mutation
   complete; recover safely if the browser closes at any point.
6. Add retry policy: exponential backoff with jitter, capped delay, maximum
   automatic retry window, and manual retry. Validation/auth/conflict errors
   are not transient-network retries.

**Exit criteria:** Offline task changes survive reload, sync exactly once after
reconnection, and failed/conflicting changes remain recoverable.

### Milestone 4 — Note writes and linked records

1. Apply the same outbox and conflict rules to note create/edit/delete.
2. Support offline note-to-task linking, including locally created task IDs.
3. Ensure deleting a queued local create cancels that create safely; deleting a
   server-backed record enqueues a tombstone/delete.
4. Handle task deletion and note unlinking consistently with existing backend
   behavior.

**Exit criteria:** Offline task/note create-edit-delete sequences replay in
order without dangling links or duplicate records.

### Milestone 5 — Sync UX and auth lifecycle

1. Add a central sync/connectivity provider or hook and make all views subscribe
   to it.
2. Replace ad-hoc `isOffline` guards with explicit capability/status handling.
3. Add pending counts, retry, per-record state, stale timestamp, and conflict
   resolution UI.
4. Retry after app startup, `online`, visible-tab return, and user request.
5. Prevent duplicate concurrent sync loops.
6. Implement account switching and logout cleanup. Retain data if server logout
   fails, and explain the local/server distinction.
7. Ensure read-only local access is distinguishable from online-authenticated
   access.

**Exit criteria:** Every sync outcome is visible; no failure becomes a silent
success; logout/account switching cannot expose another account's local data.

### Milestone 6 — PWA, resilience, and release

1. Verify service-worker update/install behavior and shell fallback on a clean
   install, repeat visit, and after deployment.
2. Make sure caches are versioned and old app-shell caches are safely removed.
3. Test storage quota failures, private browsing limitations, browser restart,
   expired server session, server outage with network still connected, and
   repeated online/offline transitions.
4. Add operational logs/diagnostics that contain no note content, task text,
   credentials, or session tokens.
5. Update README/PWA help text to explain offline limitations and device storage
   privacy.

**Exit criteria:** Acceptance tests in section 9 pass and the release notes
state exactly what is and is not available offline.

## 7. Likely Code Surfaces

Inspect current code before editing; these paths may have changed since this
plan was written.

### Client

- `client/src/App.jsx`: startup auth, local workspace bootstrap, connectivity,
  load/refresh lifecycle, account cleanup.
- `client/src/api.js`: HTTP errors, idempotency headers, revision tokens,
  retryable-error classification.
- `client/src/main.jsx`: service-worker registration/update handling.
- `client/public/service-worker.js`: app-shell caching only; do not cache
  authenticated API responses.
- `client/src/components/TaskPanel.jsx`: task writes and task status actions.
- `client/src/components/NotesPanel.jsx`: note writes, deletes, task links,
  online-only export.
- `client/src/components/CalendarView.jsx`, `StatsView.jsx`,
  `ItemDetail.jsx`: ensure views reflect repository state and pending changes.
- New `client/src/offline/` modules for IndexedDB, repository, mutation queue,
  sync, and connectivity.
- New shared sync status/banner component or provider.

### Server

- `server/app/models/task.py` and `note.py`: revision and idempotency result
  persistence as required by the chosen protocol.
- `server/app/routes/tasks.py` and `notes.py`: validate revision tokens,
  return conflict details, enforce per-user idempotency.
- Add Alembic migrations for new columns/tables and indexes.
- `server/tests/test_api.py`: idempotent retry, conflict, ownership isolation,
  and normal online regression tests.

Do not create a second persistence implementation inside each UI component.
The repository and sync engine must be the single client-side authority.

## 8. Error and Retry Rules

Classify failures; do not catch all errors and continue as if successful.

- **Network/timeout/5xx:** keep the mutation pending; retry with backoff.
- **401/403:** stop replay, retain the queue, request online authentication.
  Never discard changes because a session expired.
- **400/422 validation:** mark the mutation as needing correction; show the
  field/server error and keep the local draft.
- **404 on update/delete:** mark as conflict/needs resolution, do not silently
  recreate or drop the local item.
- **409 version conflict:** preserve both versions and require an explicit
  choice.
- **Idempotency-key retry:** return the original server result; do not duplicate
  data.
- **IndexedDB/quota/security error:** report the inability to save offline and
  do not claim the action succeeded.
- **Service-worker install/precache error:** keep online app usable, log a
  non-sensitive diagnostic, and indicate offline shell may be unavailable.

## 9. Test and Acceptance Matrix

### Automated tests

- IndexedDB repository CRUD, transactions, schema upgrade, and account scoping.
- Legacy localStorage snapshot validation/import.
- Outbox ordering, coalescing, create-then-edit, create-then-delete, and
  task/note dependency mapping.
- Idempotent create replay where the server commits but the client loses the
  response.
- Server version conflict and retry behavior.
- API validation/auth failures do not disappear from the queue.
- Online CRUD regression tests remain passing.
- React state updates are driven by repository changes, not only network
  responses.

### Browser/manual scenarios

1. Sign in online, load workspace, go offline, reload: cached workspace appears
   with an offline and last-synced indicator.
2. While offline, create/edit/complete/delete a task; reload; verify it remains
   and is marked pending.
3. Repeat for notes, including linking a note to an offline-created task.
4. Reconnect with pending changes: verify visible sync progress, one copy of
   each created record, server IDs replace local IDs, and pending indicators
   clear only after local acknowledgement is committed.
5. Force an API timeout after server commit: retry and verify idempotency.
6. Edit the same record on a second browser/device, then sync stale local
   changes: verify a conflict is shown and neither version is silently lost.
7. Expire the session while offline, reconnect: retain queue, ask user to
   authenticate, then sync only after authentication for the same account.
8. Logout successfully: verify this account's workspace/outbox is deleted and
   another account cannot read it.
9. Fail logout while offline: explain that server revocation did not happen;
   verify explicit local-clear behavior.
10. Simulate IndexedDB quota/write failure: action must not be reported as
    safely saved.
11. Install the PWA, reopen it offline, navigate to task/note detail routes,
    and confirm shell/assets are available without caching API responses.
12. Test browser restart, duplicate `online` events, and multiple tabs to ensure
    there is no duplicate sync worker or mutation replay.

### Release acceptance

- All local writes are durable before success is shown.
- No queued create is duplicated after retries, reload, or lost responses.
- No user can read or sync another account's records or mutations.
- No session cookie, password, or authorization secret is persisted by the
  offline subsystem.
- No authenticated API response is placed in Cache Storage.
- Conflict, validation, auth, storage, and network errors remain visible and
  recoverable.
- The UI distinguishes “saved on this device” from “synced to your account”.
- Online behavior and existing server/API tests pass.

## 10. Agent Working Instructions

1. Read the current source and tests before relying on file locations in this
   plan.
2. Check the worktree first and preserve unrelated user changes.
3. Implement milestones in order; do not mark later milestones complete when
   only shell caching or read-only snapshots work.
4. Before changing the API contract or migration strategy, document the exact
   request/response shapes and add server tests.
5. Prefer focused tests for each milestone, then run the complete client build
   and backend test suite.
6. Never suppress API, IndexedDB, migration, or service-worker errors with a
   broad catch, silent fallback, or success-shaped default.
7. Do not log task/note content, passwords, cookies, or tokens.
8. At completion, report implemented milestones, migrations, validation
   commands/results, remaining limitations, and manual browser checks still
   required.
