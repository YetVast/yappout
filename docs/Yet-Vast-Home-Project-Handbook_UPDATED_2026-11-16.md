# Yet Vast Home — Project Architecture, Implementation & Operations Handbook

**Document ID:** YVH-PROJECT-HANDBOOK  
**Version:** 1.0  
**Documentation baseline:** 16 November 2026  
**Product:** Yet Vast Home  
**Production origin:** https://yetvast.com  
**Repository:** `yvnow/yvs-illu`  
**Central identity authority:** https://auth.yetvast.com

> **Purpose:** This is the standalone context document for the Yet Vast Home ChatGPT Project. It describes Home's product role, architecture, authentication integration, App Admin model, repository and deployment details, implementation history, current architectural boundary and next work.
>
> **Evidence discipline:** This document consolidates project context, implementation-agent reports, build logs and production screenshots. Reports describe the state at the time they were generated. The current repository, deployed Vercel configuration and live behavior must be inspected before implementation changes.

---

## 1. Executive summary

Yet Vast Home is the public presentation and discovery layer for the Yet Vast ecosystem. It introduces Yet Vast, presents products, communicates principles and links visitors to the actual products.

Production:

- `https://yetvast.com`

Repository:

- `yvnow/yvs-illu`

Yet Vast Home is also the first intended consumer of Yet Vast Auth. It uses the central Yet Vast identity authority rather than implementing independent Google/GitHub identity management.

**Home does not own central identity or application registration.** Yet Vast Auth owns central identity, provider linking, application registration, approval, OAuth policy and signing. Home owns its product experience, local authorization and host-bound session.

The recent architectural decision is that application developers register directly through Yet Vast Auth. Home must not require a consumer-side onboarding challenge or an Auth registration portal inside `/admin`. Home's `/admin`, if retained, is for Home-specific administration and can be designed according to Home's needs.

## 2. Product purpose and scope

### 2.1 Public role

Yet Vast Home should:
- explain what Yet Vast is;
- present and link to Yet Vast products;
- provide public information and principles;
- act as a shallow discovery/presentation layer;
- avoid becoming a CMS, product database or synchronization hub.

The organizational/product principle is:

> Yet Vast Home presents the ecosystem; it does not become the source of truth for each product.

Product information belongs to the respective product. Home should not become a central database of manually duplicated product descriptions unless a concrete future requirement justifies it.

### 2.2 Product boundaries

Home is not:
- the Yet Vast Auth control plane;
- the global application registry;
- a central product database;
- the owner of other products' user data;
- a shared session service for all Yet Vast products.

Home can own:
- its homepage and public content;
- product discovery and links;
- public Yet Vast principles and organization information;
- its own application UI;
- Home-specific administrative tools if needed;
- its own local session and product-level authorization.

### 2.3 Relationship with future YAI

The earlier YVS architecture context describes a future scoped public YAI instance associated with Home. It should use appropriately scoped public Yet Vast knowledge, not private YAI Studio memory, private user information, credentials or unpublished business information.

This is a future direction, not a claim that the public YAI feature is already implemented.

## 3. Repository and deployment

| Item | Value |
|---|---|
| Product | Yet Vast Home |
| Production origin | `https://yetvast.com` |
| Repository | `yvnow/yvs-illu` |
| Hosting | Vercel |
| Framework | Next.js App Router |
| Language | TypeScript |
| Central Auth | `https://auth.yetvast.com` |
| Shared Auth package | `@yetvast/auth` |
| Shared Auth UI package | `@yetvast/auth-ui` |
| Package registry | `https://npm.pkg.github.com` |

The repository name `yvs-illu` is the current repository identifier; the public product name is Yet Vast Home.

### Stack and UI standards

The project history records:
- Next.js App Router;
- React and TypeScript;
- Vercel hosting;
- CSS Modules and design tokens in the Home implementation standards used in recent tasks;
- no Tailwind CSS in the recent Home-specific implementation instructions.

Check the current `package.json`, Next.js configuration and repository standards before changing versions or adding dependencies.

## 4. Relationship with Yet Vast Auth

Yet Vast Auth is the central identity authority:

- `https://auth.yetvast.com`

Home is a consumer.

### Responsibility split

| Responsibility | Owner |
|---|---|
| Persistent Yet Vast identity | Yet Vast Auth |
| Google/GitHub provider OAuth | Yet Vast Auth |
| Explicit provider account linking | Yet Vast Auth |
| Application registration | Yet Vast Auth |
| Application approval/rejection/suspension | Yet Vast Auth |
| Allowed redirect URI policy | Yet Vast Auth |
| Central signing keys and JWKS | Yet Vast Auth |
| Home UI and content | Yet Vast Home |
| Home-specific permissions | Yet Vast Home |
| Home local session | Yet Vast Home |
| Home product administration | Yet Vast Home |

Home must not directly read or mutate the central Firestore `applications` collection.

### Current registration model

The latest product decision replaces the earlier Home-generated onboarding challenge model:

1. A developer signs in to Yet Vast Auth.
2. The developer registers the application directly at `https://auth.yetvast.com/admin/applications/register`.
3. The developer supplies the primary application URL, designated App Admin identity, redirect URI(s), providers and identity policy.
4. Yet Vast Auth validates and stores the application as `PENDING`.
5. An independent Auth Admin reviews it.
6. Only after `APPROVED` may Home authenticate users through Yet Vast Auth.

The applicant no longer supplies the Application ID; Auth generates the immutable internal ID.

Home's `/admin` does not need to explain Auth registration or expose Auth registration controls. It may be a Home-specific admin experience or may be omitted if no Home-specific admin function is required.

### Superseded Home onboarding implementation

An earlier implementation created:
- `/admin` registration lifecycle UI;
- `AppAdminOnboardingView`;
- `initiateAppOnboarding()` integration;
- `/api/admin/onboard`;
- `/api/admin/status`;
- `/api/admin/resubmit`;
- server-side challenge initiation;
- consumer-side PENDING/APPROVED/REJECTED/SUSPENDED registration presentation.

This design was introduced to solve a bootstrap problem but was later judged unnecessarily coupled. The latest direction is direct registration at central Auth. Audit the current repository and remove obsolete consumer-side onboarding code carefully, retaining any genuinely useful Home-specific admin/session/security functionality.

Do not blindly delete every file named `admin`.

## 5. Home authentication integration

### 5.1 Intended Home registration policy

The documented intended policy for Home is:

- Google enabled.
- Persistent Yet Vast identity required.
- Anonymous GitHub-only access forbidden.
- GitHub linking is performed explicitly in the central Auth account area.
- No automatic account merging based on email.

The central registration record is authoritative. The actual live record must be checked before changing Home configuration.

### 5.2 Callback URI

The Home implementation report identified the exact callback route from source:

`https://yetvast.com/api/auth/callback`

This URI must be registered exactly in Yet Vast Auth's Allowed Redirect URIs. Do not change the callback path based on assumptions. Inspect `src/app/api/auth/callback/route.ts` and current environment configuration before modifying it.

Local development callback(s), if used, must be explicitly registered under the allowed localhost exception.

### 5.3 OAuth sequence

1. Home server starts an authorization request to Yet Vast Auth.
2. Home generates and stores transaction state and PKCE verifier securely.
3. Browser is redirected to central Auth.
4. Auth validates Home's registration status, redirect URI and provider policy.
5. User authenticates centrally.
6. Auth redirects to the exact Home callback with a short-lived, single-use authorization code and state.
7. Home callback validates state and exchanges the code server-to-server.
8. Home verifies the signed identity assertion using central JWKS.
9. Home creates its own host-bound session.
10. Home uses its own session for subsequent requests.

Provider access tokens must not be exposed to Home's browser code.

### 5.4 Session ownership

Home's session cookie is documented as:

`yv_home_session`

Expected security properties:
- HttpOnly;
- Secure in production;
- SameSite=Lax (subject to current flow requirements);
- host-bound, with no `Domain=.yetvast.com`;
- server-side signature/issuer/audience/expiry validation;
- no acceptance of `yv_auth_session` as a Home session.

The central Auth session cookie and Home's local session are different security domains.

### 5.5 JWKS verification

Home verifies central signed assertions using:

`https://auth.yetvast.com/.well-known/jwks.json`

The central private signing key must never be copied into Home. Home uses public verification keys only.

## 6. App Admin authorization

### 6.1 Designation

The designated Home App Admin is recorded in the central application registration and configured in Home's Vercel environment using:

`YETVAST_APP_ADMIN_USER_IDS`

This value must match the canonical Yet Vast user ID designated in the central application record.

The variable is server-only. It must never be exposed through a `NEXT_PUBLIC_` variable or accepted from browser input.

### 6.2 Authorization

Where Home provides App Admin functionality:
- authenticate the user;
- verify the Home host-bound session;
- derive the canonical `yvUserId` from the verified assertion;
- compare it with server-configured designated admin IDs;
- fail closed if the variable is absent or invalid in production;
- never grant admin access from an email string, browser-supplied ID, query parameter or client-side role.

The earlier SDK `0.2.0` implementation report records:
- `resolveAppAdminUserIds()`;
- `isAppAdminIdentity()`;
- canonical identity normalization;
- comma-separated admin IDs;
- production fail-closed behavior;
- timing-safe identity comparison.

Verify these functions and semantics against the currently installed/published package version before use.

### 6.3 Admin identity changes

Changing `YETVAST_APP_ADMIN_USER_IDS` in Vercel does not automatically change the central Auth application record.

The designated administrator in central Auth and Home's Vercel environment must be updated consistently. Otherwise:
- Home's local admin authorization may reject the intended admin;
- central Auth may still identify the previous administrator as the registered owner;
- self-review restrictions may continue to treat the previous identity as the owner.

A Vercel environment change requires a new deployment for the runtime to receive it. Confirm the exact current identity from the authenticated Yet Vast account; do not guess it from an email address.

## 7. Historical application registration and deletion events

### 7.1 Historical application record

The Home application has been represented in central Auth as:

- Application ID: `yetvast-home`
- Name: `Yet Vast Home`
- Primary/canonical origin: `https://yetvast.com`
- Callback: `https://yetvast.com/api/auth/callback`
- Provider: Google
- Persistent identity: required
- Anonymous GitHub: forbidden
- Designated administrator shown in supplied screenshots: `yetvasts`

These values are historical screenshot/report evidence. Verify the current central application record and current Home Vercel environment before changing them.

### 7.2 Self-review restriction issue

The user encountered the central Auth **Self-review restriction** because the application administrator identity matched the Auth Admin identity attempting to review the application.

Changing the Vercel environment variable name/value alone did not change the central application's stored administrator identity. This led to the decision to delete/recover/re-register and then redesign registration so the administrator is explicitly selected and verified during central registration.

Core lesson:
- Vercel environment configuration and central application registration are separate records.
- Both must agree.
- A consumer environment change does not mutate the central registry.

### 7.3 Deletion/tombstone history

Screenshots showed:
- a deleted application page with `APPLICATION_DELETED`;
- Auth Admin application detail showing a `Deleted` tombstone;
- deletion reason `mini app admin changed`;
- Auth Admin recovery control;
- a subsequent recovered/approved application view.

The later Auth implementation report describes a formal deletion lifecycle with:
- `deletionStatus: NONE | REQUESTED | DELETED`;
- App Admin deletion request;
- Auth Admin direct deletion;
- Auth Admin confirm/reject request;
- Auth Admin recovery;
- tombstone preservation;
- OAuth and code-redemption blocking;
- central session revocation.

The exact current status of `yetvast-home` must be read from the central Auth Application List/detail page or current source-backed API. Do not infer current state from an old screenshot.

### 7.4 Avoid unnecessary deletion

For ordinary App Admin changes, prefer a controlled administrator reassignment/update workflow in central Auth if supported. Deleting an application should be reserved for actual decommissioning or an explicit lifecycle reset. A tombstone may prevent simple re-registration under the same application ID or origin.

## 8. Home `/admin` direction

The latest architectural decision:

- `/admin` is not an Auth registration page.
- `/admin` does not need to duplicate Yet Vast Auth's Application List or approval controls.
- `/admin` can be designed according to what the Home developer needs.
- It may provide Home-specific administration, content controls or operational views if these are actual product requirements.
- It must not approve or mutate central Auth registrations.
- It must not be a prerequisite for a developer to register the application with Yet Vast Auth.

Do not invent admin features merely to keep the route. If no Home-specific admin capability is required, a simple authorized page or removal of the route may be appropriate after inspecting navigation and dependencies.

## 9. Shared packages and Vercel build history

Home consumes private packages:
- `@yetvast/auth`
- `@yetvast/auth-ui`

### 9.1 Registry configuration

Home `.npmrc`:

```ini
@yetvast:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

`NPM_TOKEN` is a GitHub PAT classic with `read:packages`, configured in Vercel. It is not the GitHub OAuth App client secret.

### 9.2 Version 0.2.0 integration

A Home build failed with:

```text
npm error code ETARGET
No matching version found for @yetvast/auth-ui@0.2.0
```

The cause was package availability in GitHub Packages, not Next.js compilation. The Auth agent later reported publishing both:
- `@yetvast/auth@0.2.0`
- `@yetvast/auth-ui@0.2.0`

It reported independently verifying each with `npm view` and listing versions `0.1.0` and `0.2.0`.

The Home report then recorded:
- dependencies updated to `^0.2.0`;
- required exports verified;
- 98 tests passed;
- typecheck and lint passed;
- Next.js production build passed.

These are historical report results. Check current `package.json`, lockfile, registry and Vercel build logs before changing package versions.

### 9.3 Missing export issue

The earlier Vercel compilation also failed because the installed `0.1.0` packages did not export:
- `isAppAdminIdentity`
- `resolveAppAdminUserIds`
- `ResubmitApplicationSchema`
- `initiateAppOnboarding` from `@yetvast/auth/server`
- `AppAdminOnboardingView`

The Auth implementation report states that these were added/reconciled and included in `0.2.0`.

This integration was for the earlier Home onboarding architecture. The direct central registration direction may make some of these exports unnecessary in Home. Do not retain unused imports merely because they exist in the package.

## 10. Environment configuration

The Home implementation reports list these server-side variables:

| Variable | Historical purpose |
|---|---|
| `YETVAST_HOME_ORIGIN` | Canonical Home origin, `https://yetvast.com` |
| `YETVAST_AUTH_ORIGIN` | Central Auth origin, `https://auth.yetvast.com` |
| `YETVAST_AUTH_ISSUER` | Expected assertion issuer |
| `YETVAST_AUTH_JWKS_URL` | Optional explicit JWKS URL |
| `YETVAST_HOME_APP_ID` | Historical internal app ID, `yetvast-home` |
| `YETVAST_APP_ADMIN_USER_IDS` | Server-only App Admin allowlist |
| `YETVAST_ALLOW_TEST_MODE` | Local/CI test behavior; must not enable test mode in production |
| `NPM_TOKEN` | GitHub Packages read token for Vercel dependency installation |

The actual current runtime config and `.env.example` are authoritative. Do not remove variables until code references and deployment behavior have been audited.

## 11. Reported implementation and verification history

### Earlier Home integration report

The Home agent reported:
- `/admin` registration/onboarding portal;
- central challenge initiation;
- App Admin identity checking;
- OAuth callback and session isolation;
- 58 tests passed;
- TypeScript, lint, formatting and Next.js production build passed.

### Deletion UI implementation report

A later Home report describes:
- `src/lib/auth/deletion.ts`;
- `requestCentralApplicationDeletion()`;
- `/api/admin/delete`;
- `/api/admin/request-deletion`;
- CSRF/Origin validation;
- App Admin session authorization;
- duplicate request prevention;
- deletion pending and deleted UI;
- onboarding/resubmission blocked during deletion;
- 98 tests passed across 8 files;
- typecheck, lint and production build passed.

This deletion UI was built while Home still contained the earlier consumer-side registration portal. Under the latest architecture, review whether it should remain. Central Auth is the authoritative deletion UI and registry owner. Home should not duplicate global application deletion controls unless a specifically approved requestor-side workflow remains part of the product contract.

### Production screenshots

User-supplied screenshots showed:
- Yet Vast Home `/admin` with `UNREGISTERED / BOOTSTRAP`;
- cross-origin request blocked;
- central Auth onboarding challenge page asking for a manually entered token;
- central application detail for `yetvast-home`;
- pending approval and self-review restriction;
- application deleted error;
- deleted tombstone and recovery action;
- recovered/approved application;
- old registration form at `/admin/applications/register`.

These screenshots are historical evidence of the transition and the issues that motivated the new direct central registration model.

## 12. Current architecture decisions

| Topic | Current decision |
|---|---|
| Home's product role | Public Yet Vast presentation/discovery layer |
| Central identity | Yet Vast Auth |
| Application registration | Directly through Yet Vast Auth |
| Application ID | Generated by Auth; not entered by applicant |
| Home `/admin` | Home-specific, not central Auth onboarding |
| Home App Admin | Designated in central Auth and mirrored in server-only Vercel config |
| Home provider policy | Google persistent identity |
| Anonymous GitHub-only Home access | Forbidden |
| Home callback | `https://yetvast.com/api/auth/callback` (verify source) |
| Home session | Host-bound `yv_home_session` |
| Central Auth session | Never reused as Home session |
| Product information | Owned by each product; Home presents/links |
| CSS | CSS Modules in recent Home implementation; no Tailwind |

## 13. Next steps for Yet Vast Home

1. Inspect the current repository and identify all remaining consumer-side onboarding code.
2. Confirm direct central registration is now the only registration path.
3. Remove obsolete Home onboarding challenge routes and UI if no longer used.
4. Decide whether Home needs a product-specific `/admin` route; retain only real Home administration.
5. Confirm current central application record and primary origin.
6. Confirm `YETVAST_APP_ADMIN_USER_IDS` matches the central designated App Admin identity.
7. Confirm callback route and redirect URI exactly match.
8. Verify OAuth login, callback, PKCE, state, nonce, JWKS assertion validation and host-bound session.
9. Verify pending/rejected/suspended/deleted application behavior is enforced by central Auth and displayed appropriately in Home only where useful.
10. Review whether Home-side deletion request UI is still required or should be removed in favor of the central Auth application detail workflow.
11. Remove unused package imports and dependencies only after confirming they are not used elsewhere.
12. Run tests, typecheck, lint, format and production build against the current commit.
13. Verify Vercel production deployment and perform a real login/logout smoke test.

## 14. Working rules for the Yet Vast Home ChatGPT Project

Use this document as context, but inspect current repository source before editing.

Required workflow:
1. Inspect `git status`, current branch, recent commits, repository structure and package scripts.
2. Read relevant source, tests, docs, environment schema and shared package declarations.
3. Separate OBSERVED, DOCUMENTED, TESTED, INFERRED and UNKNOWN facts.
4. Keep Home independent from central Auth internals.
5. Use shared SDK contracts instead of duplicating Auth logic.
6. Keep secrets server-only.
7. Preserve PKCE, state, nonce, callback validation, JWKS verification and cookie isolation.
8. Use CSS Modules and existing design tokens; do not introduce Tailwind CSS.
9. Make minimal, scoped changes.
10. Run actual repository quality commands and report exact results.
11. Never claim deployment or production success without evidence.

Stop and ask before:
- changing callback routes or registered origins;
- changing the central App Admin identity;
- changing OAuth provider policy;
- changing session/cookie semantics;
- modifying central application registration;
- changing package major versions or server/client boundaries;
- removing Home `/admin` or product functionality;
- destructive user/session/data changes.

## 15. Source and precedence

This handbook consolidates:
- `YVS-ARCHITECTURE-CONTEXT.md`;
- `YVS_Application_Development_Standards_v1.0.0.md`;
- `Yet-Vast-Auth-and-Home-Project-History.md`;
- `Yet-Vast-Auth-Updated-Project-Documentation-2026-11-14.md`;
- Home implementation reports and Vercel build logs;
- user-provided production screenshots;
- latest explicit user decisions about central registration and Home's `/admin`.

When sources conflict:
1. Current Home source code, deployed configuration and live behavior determine actual implementation.
2. Latest explicit user decisions determine intended product direction.
3. Latest implementation reports provide historical evidence, subject to verification.
4. Earlier Home onboarding documents describe superseded architecture where noted.

**End of Yet Vast Home project handbook.**


---

# Current Architecture, Integration and Release Status

**Update date: 16 November 2026**

## 16. Current implementation update — 16 November 2026

This section supersedes earlier Home onboarding descriptions where they conflict.

### 16.1 Current repository evidence

- Repository: `yvnow/yvs-illu`
- Branch: `main`
- Latest inspected commit: `0c51c7b09e2938ced5dbecd2780ddcc968048353`
- Commit date: 14 November 2026
- Commit message: `remove auth registration`
- Production origin documented by the project: `https://yetvast.com`
- Central Auth: `https://auth.yetvast.com`

### 16.2 Registration ownership is central

The earlier Home-side onboarding challenge and registration portal are superseded. Developers register directly through Yet Vast Auth. Home must not:
- create or approve central application registrations;
- maintain a duplicate central application list;
- write to Auth's Firestore application collection;
- initiate the old consumer-side registration challenge as a prerequisite for central registration.

Home's `/admin` remains a Home-specific App Admin surface. The current source contains `src/app/admin/page.tsx` and `AdminPortalClient`; this is not the Auth Admin control plane.

### 16.3 Home authentication configuration and current logical ID

The inspected Home source defines:
- `HOME_DEFAULT_APP_ID = "yetvast-home"`;
- `HOME_ENABLED_PROVIDERS = ["google"]`;
- `HOME_SESSION_COOKIE = "yv_home_session"`;
- `HOME_TX_COOKIE = "yv_home_tx"`.

The application ID sent by Home is the stable logical ID. The new Auth implementation is responsible for resolving that ID to the current approved registration instance.

The Home login route creates an authorization redirect with PKCE S256 and stores state, verifier and return path in a short-lived host-bound transaction cookie. The callback validates state, exchanges the single-use code server-to-server, verifies the returned assertion through the shared Auth integration and establishes the Home-owned session. Logout clears Home's cookies with same-origin protections.

### 16.4 Registration and callback alignment is a release gate

The latest Auth implementation record identifies the new registration instance:
- registration ID: `www-yetvast-com-6negk210`;
- primary URL: `https://www.yetvast.com`;
- allowed callback recorded in the production evidence: `https://www.yetvast.com/api/auth/callback`;
- domain verification: `VERIFIED`;
- approval: `APPROVED`.

Home constructs the callback from `YETVAST_HOME_ORIGIN`. Older Home docs list `https://yetvast.com/api/auth/callback`, while the newer Auth record references the `www` host. Confirm the actual Vercel environment value and central redirect allowlist. Do not assume apex and `www` are interchangeable for exact OAuth redirect matching.

### 16.5 Central migration and deployment dependency

Auth's identity-resolution implementation is reported complete and tested, but its production Firestore migration is still pending explicit administrator authorization in the latest implementation record. The latest Auth deployment and live Home OAuth flow are not established by the repository commit alone.

Home's successful local/mock OAuth tests are not proof that the new production registration resolution works. A live production login must be performed after the migration and Auth deployment are confirmed.

### 16.6 Shared package compatibility

The current Home `package.json` declares:
- `@yetvast/auth: ^0.2.0`;
- `@yetvast/auth-ui: ^0.2.0`.

The inspected Auth monorepo manifests are `0.3.0`. Publication of `0.3.0` and Home's lockfile resolution were not established by this inspection. Upgrade only after package publication and contract compatibility are verified.

### 16.7 UI standards discrepancy requiring reconciliation

The Home product requirements and prior user instructions specify CSS Modules/design tokens and no Tailwind CSS. However:
- current `AGENTS.md` says to use Tailwind CSS;
- current `package.json` includes `tailwindcss`, `@tailwindcss/postcss` and `tailwind-merge`.

This is a source/documentation conflict. Do not silently treat the repository as already compliant with a CSS-Modules-only standard. The product owner’s explicit CSS Modules-only constraint should govern future Home work; remove Tailwind dependencies and correct agent instructions only through a scoped, verified cleanup task.

### 16.8 Existing Home scope remains

- Public presentation/discovery layer.
- Local typed product directory; product destinations must not be invented.
- Public principles and organization information.
- Scoped public YAI remains a placeholder, not a live AI integration.
- No CMS, central product database or synchronization hub.
- Home owns its local session and Home-specific authorization only.

### 16.9 Historical quality results

The prior Home implementation report recorded 98 tests passing, typecheck/lint and production build passing. These results predate the latest Auth identity-resolution release work and do not prove that Home has been tested against the new Auth `0.3.0` contracts or live production registration. Rerun all checks against the current commit and package lockfile before release.
