# Cogmit — Current Architecture, Audit Context and Product Handoff

**Document ID:** COGMIT-PROJECT-HANDBOOK  
**Version:** 1.0  
**Documentation baseline:** 16 November 2026  
**Repository inspected:** `yvnow/cogmit`  
**Branch inspected:** `MainCode`  
**Latest inspected commit:** `9d9fa9743fc2142580ce1646afb5abcf72679743` (26 January 2026)

> Evidence discipline: this handbook combines the checked-in Cogmit repository baseline, earlier project documentation and recent product-owner direction. The inspected GitHub branch is older than the recent discussions. Do not assume it contains the latest local implementation or YappOut feature work.

## 1. Product purpose

Cogmit is a personal publishing product for creating, editing, organizing and publishing individual content pieces called **Cogs**. The checked-in product description includes:
- draft management and version history;
- public publishing with SEO-oriented URLs;
- public author/profile pages;
- text-to-speech playback for published content;
- a focused writing interface.

Cogmit owns its content experience and publishing behavior. It should not become a general-purpose identity provider for the Yet Vast ecosystem.

## 2. Repository and checked-in technical baseline

The inspected repository is `yvnow/cogmit`, branch `MainCode`.

The checked-in `package.json` reports:
- Next.js `^16.1.4`;
- React `^19.2.3`;
- TypeScript;
- Firebase client SDK `^12.8.0`;
- version `0.1.0`;
- scripts for `dev`, `build`, `start`, and `lint`.

The checked-in README describes:
- Firebase Authentication with Google OAuth;
- Google Drive API for user-owned drafts;
- Firestore for draft indexes and public published content;
- Vercel-ready deployment;
- CSS Modules and no Tailwind as the stated product styling approach.

The checked-in branch's package manifest does not declare a `test` or `typecheck` script. Do not claim current automated test coverage from the README alone.

## 3. Checked-in architecture: data ownership

The existing Cogmit architecture document defines a multi-backend system involving Firebase Authentication, Google Drive, Firestore and Next.js.

### 3.1 Canonical identifiers

| Concept | Canonical field | Meaning |
|---|---|---|
| Content identity | `pageId` | Internal identifier for a Cog |
| User identity | `uid` | Firebase user ID in the checked-in architecture |
| Public author handle | `username` | Public profile handle |
| URL slug | `slug` | SEO/presentation field, not the content identity |

The architecture document says all internal content operations should use `pageId`, not the slug.

### 3.2 Google Drive — private mutable drafts

The checked-in design stores:
- individual draft JSON files;
- one `draft_index.json` file per user;
- draft-to-published status markers.

A user's `Cogmit/` root folder and `drafts/` subfolder are created during first-time bootstrap. Folder IDs are persisted in the Firestore user profile and reused on later visits. Folder creation must be sequential, idempotent and occur once per user.

### 3.3 Firestore — queryable index and public content

The checked-in architecture describes:
- `users/{uid}` for user profile and Drive folder IDs;
- `draft_index/{uid}` for one per-user draft index;
- `published_pages/{pageId}` for public published Cog content.

Draft content remains in Drive. Public published content is stored in Firestore for public rendering. Publishing updates Drive metadata and Firestore records and must handle partial failure/reconciliation carefully.

### 3.4 Routes recorded in the checked-in docs

- `/` — public landing;
- `/home` — auth-aware entry;
- `/dashboard` — authenticated workspace;
- `/post/new` — create a draft and generate a `pageId`;
- `/post/[pageId]` — draft editor;
- `/publish/[pageId]` — publish flow;
- `/cog/[pageId]/[slug]` — public Cog;
- `/cogs/[username]` — author page.

The checked-in README and architecture document differ slightly in whether they call the content ID `pageId` or `cogId`. The architecture document's canonical `pageId` rule should be reconciled with current source before refactoring route contracts.

## 4. Lifecycle invariants from the checked-in architecture

1. First-time user bootstrap must be sequential and idempotent.
2. Drive folders must be created once per user and reused by persisted IDs.
3. Draft content is private and mutable; published content is public and queryable.
4. A slug is not a content identifier.
5. Missing route parameters or required storage identifiers must fail early.
6. Bootstrap overlays should prevent interaction while authentication, profile creation, Drive folder creation or index synchronization is incomplete.
7. Errors must be surfaced; do not silently continue after Drive or Firestore failures.
8. Multi-step publish operations must be consistent, recoverable and observable.

## 5. Recent architecture direction — GitHub-backed storage

Recent project discussions explored replacing or supplementing Cogmit's Drive-backed storage with GitHub-backed user storage. The stated development constraint is to avoid paid cloud/server/database services during development and early operation.

The design discussion separates two concerns:

- **Yet Vast identity authentication:** the user signs in through the central Yet Vast identity system.
- **GitHub storage authorization:** the user separately grants/links the GitHub access required for repository and file operations.

A successful Yet Vast sign-in must not be treated as proof that the application has GitHub repository access. GitHub access tokens and repository permissions must remain server-side and be validated for the intended storage operations.

Potential reusable modules discussed:
- `@yvsol/auth-client` — shared identity/auth client integration;
- `@yvsol/github-storage` — GitHub repository/file storage operations.

These package names and abstractions are proposals, not verified published packages or completed extraction work. The checked-in `MainCode` README and architecture docs still describe Google Drive storage. The current source branch must be inspected before recording GitHub storage as implemented.

## 6. Cogmit audit principles

The YVS Application Development Standards addendum records general engineering practices retained from the Cogmit audit:
- pure, zero-dependency constants where appropriate;
- session/identity fencing for asynchronous browser operations;
- non-mutating DOM Range overlays;
- Unicode-safe truncation;
- server-only segregation of OAuth tokens;
- deterministic SVG output and source hashing;
- evidence classification using OBSERVED, DOCUMENTED, TESTED, INFERRED and UNKNOWN.

Cross-product lessons:
- enforce allowlists and validation at trust boundaries;
- prevent open redirects and Host-header trust errors;
- keep reads free of hidden mutations;
- use one authoritative pipeline per responsibility;
- make multi-step writes consistent and recoverable;
- use typed mutation outcomes;
- do not swallow errors;
- avoid duplicated API sequences;
- ensure test and quality scripts actually run;
- control dependency and bundle duplication;
- keep documentation aligned with source.

These are general lessons. They do not authorize copying Cogmit's storage, schema or lifecycle into another YVS product.

## 7. YappOut — implemented capability inside Cogmit, extraction pending

**Product-owner statement:** YappOut functionality is already implemented inside Cogmit. The intended next step is to extract YappOut into an individual project.

**Current evidence limitation:** The inspected `yvnow/cogmit` `MainCode` branch and its checked-in file tree do not expose a YappOut-named module, route or implementation record. The branch's latest visible commit is dated 26 January 2026, so it may not represent the current local worktree or the branch where YappOut exists.

Therefore:
- treat YappOut's existence inside the current Cogmit development work as user-confirmed;
- do not invent its features, data model, routes, screens, APIs or dependencies;
- do not claim extraction has begun or completed;
- first inspect the current Cogmit worktree/branch and identify every YappOut entry point and implementation dependency.

### Required extraction discovery

The extraction task should produce:
1. Complete YappOut feature inventory, including implemented, partial, hidden, disabled and experimental capabilities.
2. User journeys and state transitions for each capability.
3. Route, page, component, hook, service and API inventory.
4. Data model, persistence locations, ownership and migration requirements.
5. Authentication and authorization requirements.
6. Third-party integrations and required scopes/permissions.
7. All Cogmit imports and shared dependencies used by YappOut.
8. Which dependencies are truly shared platform capabilities versus Cogmit-specific coupling.
9. Standalone YappOut architecture and proposed repository structure.
10. Data migration/export plan, if YappOut owns existing data.
11. Regression and acceptance test plan.
12. A phased extraction plan that preserves Cogmit behavior during separation.

The first task is discovery/specification, not an automatic code move. Do not delete or refactor the in-Cogmit implementation until the standalone boundary and migration plan are approved.

## 8. Known inconsistencies and risks to resolve

| Topic | Checked-in baseline | Recent direction / issue |
|---|---|---|
| Draft storage | Google Drive | GitHub-backed storage explored; implementation not confirmed in inspected branch |
| Authentication | Firebase Google Auth | Central Yet Vast Auth integration discussed; verify current branch and migration status |
| GitHub | Not established in checked-in README | GitHub linking/access is required for GitHub-backed storage; separate from identity login |
| Content ID | Architecture says `pageId`; README sometimes says `cogId` | Inspect source and standardize only after tracing all consumers |
| Quality scripts | Package manifest lacks test/typecheck scripts | Add/repair quality scripts as part of a scoped audit |
| YappOut | Not visible in inspected branch | Product owner confirms implemented in current Cogmit work; locate correct branch/worktree |
| Shared packages | Not present in checked-in package manifest | `@yvsol/auth-client` and `@yvsol/github-storage` remain proposals |

## 9. Next work

### Phase 1 — Establish the real current source state
- Identify the active Cogmit working directory and branch.
- Inspect `git status`, recent commits and all branches.
- Locate YappOut route/component/service entry points.
- Confirm whether GitHub storage is implemented, partial or still a design direction.
- Record actual package versions and quality scripts.
- Compare current source with the older checked-in README and architecture docs.

### Phase 2 — Complete Cogmit audit
- Trace identity, GitHub OAuth scopes, token storage and revocation.
- Trace repository/file CRUD, content hashing/SHA handling and GitHub API errors.
- Trace draft/publish state transitions and concurrency behavior.
- Inspect user/session fencing, async UI operations and error propagation.
- Verify all server/client boundaries and secret handling.
- Create a prioritized defect and risk register.

### Phase 3 — YappOut extraction specification
- Produce the feature and dependency inventory.
- Define the standalone product boundary and ownership model.
- Define identity and GitHub storage authorization requirements independently.
- Decide whether any shared packages are justified by actual repeated behavior.
- Plan data migration and backward compatibility.
- Obtain approval before implementation or destructive changes.

### Phase 4 — Implementation and verification
- Implement only after the extraction specification is accepted.
- Preserve Cogmit's remaining features.
- Add tests for YappOut's standalone user journeys and data lifecycle.
- Run typecheck, lint, tests and production build; report exact commands/results.
- Verify that Cogmit and YappOut operate independently after extraction.

## 10. Working rules

- Inspect the active branch/worktree; do not rely solely on the January 2026 GitHub snapshot.
- Treat product-owner confirmation as valid context but keep it distinct from source verification.
- Do not equate Google/YV identity with GitHub storage authorization.
- Keep OAuth tokens and GitHub credentials server-side.
- Keep storage operations explicit, validated and recoverable.
- Do not introduce paid services during the stated zero-cost development phase.
- Do not create abstractions before proving they are needed by more than one product.
- Do not remove YappOut code from Cogmit until the standalone implementation and migration are verified.
- Follow the applicable YVS standards and product-specific constraints.

**End of Cogmit project handbook.**
