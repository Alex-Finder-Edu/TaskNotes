# Persistence, Multi-User Accounts, and Multi-Vault Support

Analysis for prompt `prompts/09_explore_make_notes_persistent.txt`. No implementation has been done — this is a design/options document to reference when the work is actually picked up.

## Current state

`app/src/context/NotesContext.jsx` already persists to `localStorage` (key `notetasks.workspace`) on every change, so notes should survive a normal browser close. If data is actually being lost, likely causes: private/incognito browsing, a different browser or profile, cleared site data, or an expectation of cross-device sync (which localStorage cannot provide — it's per-browser, per-origin, non-syncing storage).

The app has **no backend** — no API server, no database, no auth libraries in `app/package.json`. Multi-user accounts and multi-vault support are a from-scratch architecture decision, not a bug fix.

## Why these three problems are coupled

Persistence-across-devices, multi-user accounts, and multi-vault support aren't independent features — they're one problem: *where does the source of truth live, and who can read/write it*. Vaults are a scoping layer on top of that (each vault ≈ an isolated `{folders, notes}` tree owned by a user, similar to how Obsidian scopes a folder-on-disk to a vault).

## Options considered

### A. Stay client-only, upgrade to IndexedDB
Bigger quota, async, better for larger note bodies than localStorage. Does not solve accounts or multi-device sync — still one browser, one device. Only useful as a cache/fallback layer under a real solution.

### B. Custom backend (Node/Express + Postgres/SQLite + hand-rolled auth)
Full control, no vendor lock-in. Requires building auth (password hashing, sessions/JWT, password reset), a DB schema, an API, and hosting/ops from scratch. Correct long-term if the app needs to be fully platform-independent, but a lot of security-sensitive surface area to build and maintain for what's currently a personal notes app.

### C. BaaS — Supabase or Firebase
Managed database + auth + security rules, generous free tiers, no server to run.
- **Supabase**: relational Postgres (good fit for `users → vaults → folders → notes`), plus Row Level Security enforced at the DB layer so "a user only sees their own vaults" doesn't rely on remembering to filter in app code.
- **Firebase/Firestore**: document store, easier realtime, but weaker at relational/hierarchical queries and a clunkier security-rules language for nested ownership than SQL+RLS.

Tradeoff: vendor lock-in and eventual usage-based cost, in exchange for by far the least effort to get multi-user auth and persistence correct.

### D. Local-first sync (CRDT-based: Yjs/Automerge, or PouchDB/CouchDB replication, ElectricSQL)
Keeps instant local writes (no save spinner) and syncs in the background across devices, with real offline support and conflict resolution. Closest architectural match to how Obsidian itself behaves. Also the most complex option — conflict/merge semantics for concurrent edits — likely over-engineering unless offline editing and multi-device conflicts are actual near-term requirements.

## Data model implication (any option B/C/D)

Today: a single global blob, `workspace = { notes: [], folders: [] }`.

Needed: `User 1—* Vault`, `Vault 1—* Folder`, `Vault 1—* Note` (folder `parentId` shape unchanged). Vault becomes the new top-level scope; folders/notes gain a `vaultId`; the app needs a vault switcher and a "current vault" concept in routing/context.

Worth modeling vault membership as its own join table (`vault_members`) now, even with a single owner initially, rather than a bare `ownerId` on vault — sharing a vault with another user is a natural next ask once accounts exist, and retrofitting shared ownership later is more painful than including the join table up front.

## Recommendation

**Supabase (Postgres + Auth + Row Level Security).** It directly fixes the persistence complaint (data lives server-side, tied to an account, so it survives any browser/device) and gets multi-user + multi-vault "for free" as a natural extension of the schema, without building or maintaining custom auth/API infrastructure. Keep `localStorage`/optimistic local state as a write-through cache for snappy UX (save locally instantly, sync to Supabase in the background) rather than ripping it out — a small evolution of the existing `NotesContext` pattern rather than a rewrite.

Specific to "per account/vault, across multiple devices":
- Data is keyed to the authenticated user, not the browser — log in anywhere, see the same vaults/notes. Options A and the current localStorage setup cannot do this at all.
- RLS policies enforce per-user/per-vault isolation at the database layer — one policy per table, automatically applied to every query, rather than relying on every API call remembering to filter by `userId`/`vaultId` (a common source of bugs in hand-rolled backends).
- The relational hierarchy (`users → vaults → folders → notes`) fits Postgres foreign keys more naturally than Firestore's document model or a custom CRDT store.
- Supabase Auth handles password/email auth, session tokens, and refresh — avoids writing security-sensitive auth code by hand.

Where this falls short of option D: no offline editing with automatic conflict resolution — writes made offline queue until reconnect rather than merging seamlessly. If offline-first editing across devices becomes an actual requirement, that's the trigger to revisit option D. For "same account, same vaults, works from multiple devices," Supabase is the right amount of complexity without rebuilding what it already provides.

## Next step (not yet done)

Concrete schema (`users`, `vaults`, `vault_members`, `folders`, `notes`) and RLS policy shapes, still as a design doc before any code changes.
