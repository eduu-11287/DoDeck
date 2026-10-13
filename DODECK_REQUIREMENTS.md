# DoDeck — Codebase Audit & Enhancement Plan

**Document generated:** 2026-10-06  
**Scope:** Full audit of both the main repo (`/home/b-127/projects/DoDeck`) and the `mercury-year` worktree at `.kilo/worktrees/mercury-year`.

---

## 1. Repository State Summary

The project is in a **hybrid/incomplete state**. The backend is fully modernized; the frontend is split between an old Tailwind-based UI and a new semantic-CSS design system. The `mercury-year` worktree contains an earlier but complete iteration of the redesign.

### 1.1 Server (main project) — **Complete & Advanced**

All server files match the worktree except where the main project is *more* advanced:

| File | Main project | Worktree (mercury-year) |
|---|---|---|
| `app/models/task.py` | Priority + description + checklist_data | Priority only |
| `app/models/note.py` | Tags + task_id FK + linked task | Tags only |
| `app/routes/tasks.py` | Input validation + checklist + task deletion cascades note links | Input validation + priority only |
| `app/routes/notes.py` | Tags + taskId linking + validated_task_id | Tags only |
| `app/routes/auth.py` | Password/username validation, `get_json(silent=True)` | Same |
| `app/routes/export.py` | Uses `app.utils.decorators.login_required` | Same |
| `app/routes/auth.py` | `user = db.session.get(User, ...)` (SQLAlchemy 2.0 style) | Same |
| `app/utils/decorators.py` | `login_required` extracted, shared across routes | Present |
| `app/__init__.py` | Same as worktree | Same |
| `app/config.py` | Same as worktree | Same |
| `run.py` | Same as worktree | Same |
| `requirements.txt` | Same as worktree | Same |
| `migrations/` | 3 migrations (initial, note tags, task context & note links) | 2 migrations (initial, note tags) |
| `tests/test_api.py` | 5 tests covering auth, priority, checklist, note-task linking, tags | Not present |

**Server is production-ready** for all planned features except the worktree is slightly behind on task descriptions, checklists, and note-task linking.

### 1.2 Client (main project) — **In Progress / Inconsistent**

The main project's client has been **partially modernized**:

| Layer | Status | Details |
|---|---|---|
| **index.html** | DONE | Rebranded to "Daymark", Plus Jakarta Sans + Manrope fonts, PWA meta tags, manifest link, theme-color |
| **index.css** | DONE (760 lines) | Fully rewritten: semantic CSS variables (`--accent`, `--surface`, `--ink`, etc.), dark mode variants, responsive breakpoints, all component styles as semantic classes |
| **main.jsx** | DONE | Service worker registration for PWA, `TooltipLayer` rendered alongside `App` |
| **package.json** | DONE | Renamed to `daymark-client`, removed `@tailwindcss/forms` |
| **postcss.config.js** | DONE | Removed `tailwindcss` from plugins (only autoprefixer remains) |
| **vite.config.js** | DONE | Added `serveItemDetailPage` bypass — routes matching `/tasks/<id>` or `/notes/<id>` are served to the SPA instead of being proxied to the backend (enables deep-linking to item detail views) |
| **.env.example** | DONE | Still references `daymark` |
| **PWA assets** | DONE | `manifest.webmanifest`, `service-worker.js`, `daymark-192.svg`, `daymark-512.svg` |
| **New components (not yet integrated)** | DONE | `BrandMural`, `DateTimePickers`, `DropdownSelect`, `ItemDetail`, `ItemDetailLink`, `TooltipLayer`, `HighlightedText` |
| **Old components (NOT yet updated)** | NOT DONE | `App.jsx`, `AuthOverlay.jsx`, `Header.jsx`, `Sidebar.jsx`, `TaskPanel.jsx`, `NotesPanel.jsx`, `CalendarView.jsx`, `StatsView.jsx` |
| **tailwind.config.js** | DELETED | Removed — old components still reference Tailwind utility classes |

### 1.3 Worktree (mercury-year) — **Complete but Older**

The worktree represents a **fully functional but slightly older** version of the redesign:

| Layer | Status | Details |
|---|---|---|
| **All components** | Updated | App.jsx, AuthOverlay, Header, Sidebar, TaskPanel, NotesPanel, CalendarView, StatsView all rewritten with semantic CSS classes |
| **API integration** | Working | Auth wired to backend, search functional, priority/tags/filters all working |
| **CSS** | Complete (331 lines) | `index.css` with semantic classes matching the worktree's component style |
| **CSS framework** | Minimal Tailwind | Keeps `tailwind.config.js` but uses mostly custom CSS classes |
| **New components** | Missing | No ItemDetail, DateTimePickers, DropdownSelect, TooltipLayer, BrandMural |
| **PWA** | Missing | No service worker, no manifest, no PWA icons |
| **Server** | Slightly behind | Missing task description, checklist, and note-task linking |
| **Name** | "daymark" | Consistent rebranding throughout |

---

## 2. The Core Problem: Client-Server Mismatch

The main project's **server and new components are ahead** of its **old UI components**. Specifically:

### 2.1 Tailwind Was Removed But Old Components Still Use It

**Files:** `client/src/App.jsx`, `client/src/components/*.jsx` (old versions), `client/src/index.css`

The old components use thousands of Tailwind utility classes (e.g., `bg-gradient-to-br`, `backdrop-blur-xl`, `dark:bg-slate-900/70`, `shadow-xl`, `rounded-3xl`). But:
- `tailwind.config.js` has been deleted
- `postcss.config.js` no longer includes the `tailwindcss` plugin
- `@tailwindcss/forms` removed from `package.json`
- `index.css` no longer imports Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`)

**Result:** All Tailwind utility classes will be **stripped during build**. The old components will render with **no styling at all** — invisible or completely unstyled.

### 2.2 Old Client Components Don't Use New Server API Fields

The server now supports these fields that the old UI doesn't render or send:

| Server field | Old UI support | Worktree UI support |
|---|---|---|
| `Task.priority` | No — no priority UI | Yes — priority chip, filter, sort |
| `Task.description` | No | No (not in worktree server) |
| `Task.checklist` | No | Yes — checklist items with checkboxes |
| `Task.due_date` / `Task.due_time` | Yes (browser-native date/time inputs) | Yes (custom DateTimePickers) |
| `Task.completed_at` | Implicit (via `isActive` toggle) | Explicit, displayed in StatsView |
| `Note.tags` | No | Yes — tag chips, tag filtering |
| `Note.task_id` | No | No (not in worktree server) |
| `Note.linked_task` | No | Yes — ItemDetail shows related task |
| Global search | No (stub only) | Yes — searchQuery state, HighlightedText |
| Keyboard shortcuts | No | Yes — Cmd/Ctrl+K, N, /, Escape |
| Mobile navigation | No (sidebar hidden on mobile) | Yes (`mobile-nav` bottom tab bar) |
| Error/toast notifications | No | Yes — notice system in App.jsx |
| Auth API wiring | **BROKEN** — never calls login/register | Fixed — calls `login()`/`register()` |

### 2.3 Old AuthOverlay Is Completely Non-Functional

**File:** `client/src/components/AuthOverlay.jsx:15-26` (main project)

```js
// BROKEN — never calls the API:
await new Promise(resolve => setTimeout(resolve, 1200));
onAuth({ authenticated: true, username: username.trim() });
```

The server requires passwords of 8+ characters and usernames of 3-80 characters. The old AuthOverlay:
- Never sends credentials to the server
- Has no password visibility toggle
- Has no password strength indicator
- Has no server-side error display
- Has a 1.2s fake delay

The worktree's AuthOverlay fixes all of this.

### 2.4 API Error Handling Mismatches

**File:** `client/src/api.js` (main project, original version)

The main project's `api.js` still has the **old error handling**:
```js
const text = await res.text();
throw new Error(text || res.statusText);
```

The worktree's `api.js` has **improved error parsing**:
```js
const text = await res.text();
try {
  const payload = JSON.parse(text);
  message = payload.error || payload.message || message;
} catch {
  if (text) message = text;
}
throw new Error(message);
```

The server now returns structured JSON errors (`{"error": "Priority must be an integer from 1 to 4"}`), and the old `api.js` would throw raw JSON text instead of the clean error message.

---

## 3. Migration Chain & Database State

### 3.1 Migration History

| Revision ID | Name | Changes |
|---|---|---|
| `5e68c0dbbf8b` | Initial migration | `user` table, `task` table (with legacy `time_left` column) |
| `20261005_note_tags` | (not in files yet) | Note model additions — tags column |
| `20261006_task_context` | `20261006_task_context_and_note_links.py` | Task: `description`, `checklist_data`; Note: `task_id` FK with `ON DELETE SET NULL` |

**Issue:** The migration chain references `20261005_note_tags` as the `down_revision` for `20261006_task_context`, but the `20261005_note_tags` migration file does NOT exist in the main project. Only the initial migration and `20261006_task_context` exist.

If running `flask db upgrade` in production, this would fail because Alembic cannot find the `20261005_note_tags` revision.

### 3.2 Model/Migration Mismatches

| Model field | Migration has column? | Notes |
|---|---|---|
| `Task.priority` | No | Added in code but no migration adds it |
| `Task.description` | Yes | Added by `20261006_task_context` migration |
| `Task.checklist_data` | Yes | Added by `20261006_task_context` migration |
| `Note.tags` | No | Added in code but no migration adds it |
| `Note.task_id` | Yes | Added by `20261006_task_context` migration |
| `Task.time_left` | Yes (legacy) | Exists in migration but is a computed Python `@property`, not a real column — should be dropped |

**Issue:** `priority` and `tags` columns are in the SQLAlchemy models but have **no corresponding migrations**. Running `flask db upgrade` will fail to add these columns to the database.

### 3.3 Legacy Migration Bug

**File:** `server/migrations/versions/5e68c0dbbf8b_initial_migration.py:33`

The initial migration creates a `time_left` column on the `task` table, but the model defines `time_left` as a Python `@property` (computed, not a column). This column should be dropped in a new migration.

---

## 4. Detailed Findings by Category

### 4.1 Security

| # | Finding | Severity | Location |
|---|---|---|---|
| 1 | AuthOverlay bypasses server auth entirely — no real login | **Critical** | `client/src/components/AuthOverlay.jsx:15-26` |
| 2 | No password length validation in old AuthOverlay | High | `AuthOverlay.jsx` |
| 3 | No password visibility toggle | Medium | `AuthOverlay.jsx` |
| 4 | Server password validation requires 8 chars but no complexity rules | Low | `server/app/routes/auth.py:34` |
| 5 | Hardcoded default `SECRET_KEY` in config | Medium | `server/app/config.py:6-8` |
| 6 | `SESSION_COOKIE_SECURE` not set — sessions over HTTP in prod | Medium | `server/app/config.py` |
| 7 | No rate limiting on `/login` or `/register` | Medium | `server/app/routes/auth.py` |
| 8 | No CSRF protection (Flask sessions are vulnerable to CSRF) | Medium | Server-wide |
| 9 | Service worker caches shell including auth pages | Low | `client/public/service-worker.js:27` |
| 10 | `init-db` endpoint is unauthenticated | Low | `server/app/routes/auth.py:13-18` |

### 4.2 Functionality

| # | Finding | Severity | Location |
|---|---|---|---|
| 1 | Search bar renders but filters nothing | **Critical** | `client/src/components/Header.jsx:8-9` (old version) |
| 2 | Mood selector state never persisted to backend | Medium | `TaskPanel.jsx:47,152-166` (old) |
| 3 | Old components don't send `priority` to server | High | `TaskPanel.jsx:58-66` (old `handleAddTask`) |
| 4 | Old components don't send `tags` for notes | High | `NotesPanel.jsx` (old) |
| 5 | Old components don't handle note-task linking | Low | `NotesPanel.jsx` (old) |
| 6 | Old `api.js` doesn't parse structured JSON error messages | Medium | `client/src/api.js:14-18` |
| 7 | No deep-linking support for task/note detail views | Medium | `vite.config.js` (main has bypass, old App.jsx doesn't handle detail routes) |
| 8 | Old `vite.config.js` has no `serveItemDetailPage` bypass | Medium | Main project `vite.config.js` HAS this; worktree does NOT |

### 4.3 User Experience

| # | Finding | Severity | Location |
|---|---|---|---|
| 1 | No mobile navigation — sidebar hidden on mobile with no alternative | High | `Sidebar.jsx:13` (old: `hidden lg:block`) |
| 2 | No keyboard shortcuts in old App.jsx | Medium | `client/src/App.jsx` (old has none; worktree adds them) |
| 3 | No loading skeletons per component — only global spinner | Low | `App.jsx` |
| 4 | Old AuthOverlay has a 1.2s fake loading delay | Medium | `AuthOverlay.jsx:18` |
| 5 | No toast/notification system in old UI | Medium | `App.jsx` (old has none; worktree adds `notice` state) |
| 6 | Browser-native date/time pickers — inconsistent UX | Low | `TaskPanel.jsx` (old uses `<input type="date">`) |
| 7 | No task priority display in old TaskPanel | High | `TaskPanel.jsx` (old) |
| 8 | No tag display/filter in old NotesPanel | High | `NotesPanel.jsx` (old) |
| 9 | Old components use 70+ Tailwind classes — will be invisible after Tailwind removal | **Critical** | All old components |

### 4.4 Code Quality

| # | Finding | Severity | Location |
|---|---|---|---|
| 1 | Inconsistent auth checking — notes.py originally had inline checks; now uses decorator | Low | Fixed in both main and worktree |
| 2 | Auth race condition in old App.jsx — `checkAuth` and `loadData` both set `loading=false` | High | `client/src/App.jsx:47-53` (old) |
| 3 | No frontend tests at all | Medium | No `tests/` in client |
| 4 | No TypeScript — all `.jsx` files | Low | Client-wide |
| 5 | `tailwind.config.js` deleted but old components still reference Tailwind classes | **Critical** | `client/` |
| 6 | `postcss.config.js` no longer includes tailwindcss | Medium | `client/postcss.config.js` |
| 7 | `package-lock.json` out of sync — still references old deps | Medium | `client/package-lock.json` |
| 8 | Unused `time_left` column in migration | Low | `server/migrations/versions/5e68c0dbbf8b_initial_migration.py:33` |

### 4.5 Build & Deployment

| # | Finding | Severity | Location |
|---|---|---|---|
| 1 | `docker-compose.yml` CORS_ORIGINS references old URLs | Low | `docker-compose.yml:28` |
| 2 | No healthcheck on server container in Docker Compose | Low | `docker-compose.yml` |
| 3 | nginx.conf proxies API routes individually — verbose but works | Low | `client/nginx.conf` |
| 4 | `server/Dockerfile` doesn't run migrations on startup | Medium | `server/Dockerfile` |
| 5 | PWA service worker registered in `main.jsx` but no workbox/vite PWA plugin | Low | `client/src/main.jsx:7-12` |

---

## 5. Gap Analysis: What Needs to Happen

### 5.1 Immediate Blocking Issues (Must Fix Before App Works)

1. **Replace all old client components with worktree versions** (or equivalent). The old components use Tailwind classes that no longer exist in the CSS. The worktree's versions use semantic CSS classes that match the new `index.css`.

   Specifically, these main-project components need to be replaced/updated:
   - `client/src/App.jsx` → use worktree `App.jsx` as base (it has search, keyboard shortcuts, notices, quick-add, mobile nav)
   - `client/src/components/AuthOverlay.jsx` → use worktree version (real API calls)
   - `client/src/components/Header.jsx` → use worktree version (search with counts, Cmd+K)
   - `client/src/components/Sidebar.jsx` → use worktree version (mobile prop, simpler labels)
   - `client/src/components/TaskPanel.jsx` → use worktree version (priority, filters, search, collapsible completed)
   - `client/src/components/NotesPanel.jsx` → use worktree version (tags, tag filtering, export button)
   - `client/src/components/CalendarView.jsx` → use worktree version (simpler, cleaner)
   - `client/src/components/StatsView.jsx` → use worktree version (week chart, animated bars)

2. **Update the worktree components to also support ItemDetail**. The main project's `index.css` (760 lines) has CSS for `ItemDetail`, `DateTimePickers`, `DropdownSelect`, `TooltipLayer`, `BrandMural`, and `HighlightedText` — but the worktree's component files don't use these. The new components need to be integrated:
   - `TaskPanel` and `NotesPanel` should use `ItemDetailLink` to navigate to detail views
   - The edit dialog should use `DateTimePickers` instead of native inputs
   - Filters should use `DropdownSelect`
   - `TooltipLayer` is already registered in `main.jsx`
   - `BrandMural` should be added to the background

3. **Fix the missing migration.** The `20261005_note_tags` migration is referenced but doesn't exist. Either:
   - Create it (adds `tags` column to `note` table, `priority` column to `task` table), or
   - Update `20261006_task_context_and_note_links.py` to have `down_revision = '5e68c0dbbf8b'` and include the `tags` and `priority` column additions

4. **Update `index.css`** from the worktree's minimal 331-line version to the main project's 760-line version, since the main project's CSS includes all the new component styles.

5. **Update `vite.config.js`** — the main project already has the `serveItemDetailPage` bypass, which is good. The worktree doesn't have this. Keep the main project's version.

6. **Update `api.js`** — use the worktree's improved version with structured JSON error parsing.

### 5.2 High-Impact Integrations (After Immediate Fixes)

- Wire `ItemDetail.jsx` into the task/note list views for deep-linking
- Use `DateTimePickers` (custom DatePicker/TimePicker) instead of native inputs in the edit modals
- Use `DropdownSelect` for filter dropdowns in TaskPanel and NotesPanel
- Use `BrandMural` as a background element on the auth screen
- Use `ItemDetailLink` for task/note titles to enable detail view navigation

### 5.3 Server-Side Fixes

- Create the missing `20261005_note_tags` migration OR merge it into `20261006_task_context_and_note_links`
- Drop the legacy `time_left` column from the `task` table
- Add indexes on `Task.due_date`, `Task.priority`, `Note.note_date`, `Note.tags`
- Run the existing tests: `cd server && python -m pytest tests/`

---

## 6. File Reference Map (Complete)

### Client — Main Project

| File | Status | Notes |
|---|---|---|
| `client/src/main.jsx` | **Updated** | PWA service worker, TooltipLayer | 
| `client/src/api.js` | **Old** | Needs improved error parsing from worktree |
| `client/src/App.jsx` | **Old** | Uses Tailwind classes, no search, broken auth |
| `client/src/index.css` | **Updated** (760 lines) | Semantic CSS, dark mode, PWA, all component styles |
| `client/index.html` | **Updated** | Renamed to "Daymark", new fonts, PWA meta |
| `client/package.json` | **Updated** | Named `daymark-client`, no `@tailwindcss/forms` |
| `client/postcss.config.js` | **Updated** | No tailwindcss |
| `client/vite.config.js` | **Updated** | Has `serveItemDetailPage` bypass |
| `client/tailwind.config.js` | **Deleted** | Old components still reference Tailwind |
| `client/src/components/App.jsx` | Old | See above |
| `client/src/components/AuthOverlay.jsx` | **Old** | Broken — doesn't call API |
| `client/src/components/Header.jsx` | **Old** | Search stub, Tailwind classes |
| `client/src/components/Sidebar.jsx` | **Old** | No mobile nav, Tailwind classes |
| `client/src/components/TaskPanel.jsx` | **Old** | No priority, no filters, Tailwind classes |
| `client/src/components/NotesPanel.jsx` | **Old** | No tags, no search, Tailwind classes |
| `client/src/components/CalendarView.jsx` | **Old** | Heavy Tailwind, framer-motion |
| `client/src/components/StatsView.jsx` | **Old** | Heavy Tailwind, no week chart |
| `client/src/components/HighlightedText.jsx` | **New** | For search highlighting |
| `client/src/components/DateTimePickers.jsx` | **New** | Custom DatePicker + TimePicker |
| `client/src/components/DropdownSelect.jsx` | **New** | Custom dropdown with keyboard nav |
| `client/src/components/ItemDetail.jsx` | **New** | Detail view for tasks and notes |
| `client/src/components/ItemDetailLink.jsx` | **New** | Click handler for detail links |
| `client/src/components/TooltipLayer.jsx` | **New** | Global tooltip system |
| `client/src/components/BrandMural.jsx` | **New** | Decorative background |
| `client/public/service-worker.js` | **New** | PWA offline support |
| `client/public/manifest.webmanifest` | **New** | PWA manifest |
| `client/public/daymark-192.svg` | **New** | PWA icon |
| `client/public/daymark-512.svg` | **New** | PWA icon |

### Client — Worktree (mercury-year)

| File | Status | Notes |
|---|---|---|
| All old components | **Updated** | Use semantic CSS classes, match new index.css |
| `tailwind.config.js` | Present (old version) | Kept but unused primarily |
| New components | Missing | No ItemDetail, DateTimePickers, etc. |
| PWA assets | Missing | No service worker, manifest |

### Server (both projects match)

| File | Status | Notes |
|---|---|---|
| `server/app/__init__.py` | Same | App factory, CORS, blueprint registration |
| `server/app/config.py` | Same | Dev/prod/testing configs |
| `server/app/utils/decorators.py` | Present | `login_required` decorator |
| `server/app/models/user.py` | Same | Werkzeug password hashing |
| `server/app/models/task.py` | Main advanced | Priority + description + checklist_data |
| `server/app/models/note.py` | Main advanced | Tags + task_id FK |
| `server/app/routes/auth.py` | Same | Validation, `get_json(silent=True)` |
| `server/app/routes/tasks.py` | Main advanced | Checklist validation, cascade note unlinking |
| `server/app/routes/notes.py` | Main advanced | Tags, taskId linking |
| `server/app/routes/export.py` | Same | PDF export, login_required |
| `server/tests/test_api.py` | Main only | 5 tests |
| `server/run.py` | Same | Entry point |
| `server/migrations/` | Main advanced | 3 migrations (worktree has 2) |
| `server/Dockerfile` | Same | Python 3.10-slim + Gunicorn |
| `server/requirements.txt` | Same | Flask 2.3, SQLAlchemy 2.0, fpdf2 |

---

## 7. Action Plan (No Coding Yet — Analysis Only)

### Step 1: Reconcile Client Components
- Take the worktree's updated components as the base (they work with the new CSS)
- Apply the main project's new features on top (ItemDetail integration, DateTimePickers, DropdownSelect)
- Ensure all components use semantic CSS classes, not Tailwind utilities

### Step 2: Fix Migrations
- Create the missing `20261005_note_tags` migration OR rewrite `20261006_task_context_and_note_links.py` to include priority and tags columns with `down_revision = '5e68c0dbbf8b'`
- Create a migration to drop the legacy `time_left` column from `task`

### Step 3: Update api.js
- Merge the worktree's improved error parsing into the main project's `api.js`

### Step 4: Verify Server
- Run the existing tests in `server/tests/test_api.py`
- Ensure migrations apply cleanly to a fresh database

### Step 5: Verify Build
- Ensure `npm run build` produces a working bundle (no missing CSS classes)
- Ensure Docker Compose builds and starts all services

---

## 8. Summary

The project has **two parallel tracks converging**:

1. **The main project** has a fully modernized backend (priority, tags, checklists, note-task linking, validation, decorators, tests) and a forward-looking CSS framework + new components — but the old UI components haven't been updated to use them, creating a **broken build** (Tailwind removed but old components still reference it).

2. **The `mercury-year` worktree** has a fully functional redesigned UI (all components updated, search working, auth wired, priority/tags/filters, mobile nav) — but its server is slightly behind (no task descriptions, checklists, or note-task linking) and it lacks the new components and PWA assets.

**The path forward:** Take the worktree's fully-functional UI components as the base, then layer in the main project's more advanced server features (description, checklist, note-task linking, ItemDetail deep-linking, DateTimePickers, DropdownSelect, PWA support, and the 760-line CSS). Fix the migration chain (missing `20261005_note_tags` file). Then the app will be fully functional and ready for daily use.
