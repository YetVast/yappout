# Yet Vast Auth — Project Architecture, Implementation & Operations Handbook

**Document ID:** YVA-PROJECT-HANDBOOK  
**Version:** 1.0  
**Documentation baseline:** 16 November 2026  
**Product:** Yet Vast Auth  
**Production origin:** https://auth.yetvast.com  
**Repository:** `yetvast/yetvast-auth`  
**Registry:** `https://npm.pkg.github.com`

> **Purpose:** This is the standalone context document for the Yet Vast Auth ChatGPT Project. It consolidates the product purpose, architecture, security model, application registration, approval and deletion lifecycle, shared packages, deployment model, implementation history, known decisions and next work.
>
> **Evidence discipline:** This document combines prior project documentation, implementation-agent reports, deployment logs and user-provided production screenshots. A reported test/build result is not proof that the same result still holds at the current commit. When a section says “reported”, rerun the relevant command before relying on it. The live source code, deployed environment and Firestore data remain authoritative.

---

## 1. Executive summary

Yet Vast Auth is the central identity and authentication authority for applications in the Yet Vast ecosystem. It is intended to provide one persistent Yet Vast identity across independent consumer applications while allowing each consumer to own its own application session and product-level authorization.

Production service:

- `https://auth.yetvast.com`

Primary responsibilities:

- Establish and manage persistent Yet Vast identities.
- Authenticate users through application-approved identity providers.
- Support explicit provider linking, particularly GitHub linking to an existing persistent identity.
- Maintain the authoritative application registration and approval list.
- Enforce application status, provider policy and exact redirect URI rules during OAuth.
- Issue short-lived, single-use authorization codes.
- Support server-to-server code exchange.
- Sign identity assertions and publish public verification keys through JWKS.
- Provide central account, session and application administration.
- Record security-sensitive application lifecycle events.

Yet Vast Auth is shared infrastructure, not the admin portal or backend for every consumer product.

**Architectural ownership rule:** Yet Vast Auth owns central identity and application authorization. Each consumer application owns its product experience, local authorization rules and host-bound application session.

## 2. Project identity and repository structure

| Item | Value |
|---|---|
| Product | Yet Vast Auth |
| Production origin | `https://auth.yetvast.com` |
| Vercel deployment domain | `https://yetvast-auth.vercel.app` |
| GitHub repository | `yetvast/yetvast-auth` |
| GitHub Packages registry | `https://npm.pkg.github.com` |
| Monorepo server | `apps/auth-server` |
| Playground | `apps/auth-playground` |
| Shared SDK | `packages/auth` |
| Shared UI | `packages/auth-ui` |
| Firestore application collection | `applications` |

The Auth repository is a monorepo. The Vercel project has historically used `apps/auth-server` as its Root Directory and must be configured to include files outside that directory so workspace packages can be built.

### Shared packages

- `@yetvast/auth`: shared contracts, schemas, identity helpers and consumer integration functions.
- `@yetvast/auth-ui`: shared sign-in, account, application status and OAuth error presentation components.

Private package access uses GitHub Packages. Consumer builds use a GitHub Personal Access Token with `read:packages`; publication requires the appropriate write permission. A GitHub OAuth App client secret is not a package-registry token.

Example consumer `.npmrc`:

```ini
@yetvast:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

Never commit `NPM_TOKEN` or any GitHub PAT.

### Package version history

- `@yetvast/auth@0.1.0` and `@yetvast/auth-ui@0.1.0` were the initial published versions.
- `0.2.0` added the App Admin identity helpers, onboarding contracts and UI exports needed by the earlier Home integration.
- A later Auth implementation report describes the application deletion lifecycle and changes across the SDK, UI and server. The exact package versions containing those later deletion contracts must be checked in the current `package.json`, package registry and lockfiles before publishing or consuming them.
- Do not assume that local workspace build output and a published GitHub Packages version are identical.

## 3. System architecture

### 3.1 Identity authority and consumer sessions

The intended authentication sequence is:

1. User visits a registered consumer application.
2. Consumer backend starts an OAuth authorization transaction with Yet Vast Auth.
3. Auth validates the application registration, application status, provider policy, redirect URI, state and PKCE requirements.
4. User authenticates with an enabled provider.
5. Auth resolves or creates the central Yet Vast identity according to the application's identity policy.
6. Auth returns a short-lived, single-use authorization code to the exact registered callback.
7. Consumer backend exchanges the code with Auth server-to-server.
8. Consumer verifies the signed identity assertion using the Auth JWKS.
9. Consumer creates its own host-bound local session.
10. Consumer enforces its own product permissions using the verified identity.

This is deliberately not a shared wildcard-cookie architecture.

- Auth owns the central Yet Vast identity.
- Each consumer owns its own session cookie and local application state.
- Consumer sessions must be host-bound and must not be shared by setting a `.yetvast.com` cookie domain.
- Central Auth session cookies must never be mistaken for consumer session cookies.

### 3.2 High-level component view

```text
                  User / Browser
                        |
                        v
             Consumer Application
             (Yet Vast Home, Cogmit, ...)
                        |
             OAuth Authorization + PKCE
                        |
                        v
                 Yet Vast Auth
              auth.yetvast.com
                 /     |      \
                /      |       \
       Identity      App       OAuth / Code
       Services    List        Services
          |          |              |
          +----------+--------------+
                     |
                  Firestore
              central persistence
                     |
             Signing private key
                     |
              Public JWKS endpoint
                     |
          Consumer verifies assertion
                     |
          Consumer-owned host session
```

## 4. Identity and provider policy

### 4.1 Persistent Google identity

Google is the default persistent identity provider.

A verified Google sign-in resolves or creates a central Yet Vast identity and provider mapping in Firestore. Consumer applications do not create their own competing central identity records.

### 4.2 Yet Vast user ID

The documented final rule for new Google-backed persistent identities is:

- derive the initial ID from the username portion of the verified Google email;
- lowercase it;
- remove the domain;
- do not append a provider suffix.

Example:

`yvnowyv@gmail.com` → `yvnowyv`

If occupied by another identity, allocate a deterministic numeric suffix (`username-1`, `username-2`, etc.) until unused. Existing user IDs must not be renamed as a side effect of this rule.

The source implementation is authoritative. Never infer identity from an unverified email or silently change existing IDs.

### 4.3 GitHub linking and GitHub-only ephemeral access

These are separate flows:

**Explicit linking**
- User already has a persistent Yet Vast identity.
- User initiates GitHub linking while authenticated.
- The link operation is bound to the authenticated `yvUserId`.
- Provider subject ID is the decisive external identity key.
- Email equality must not merge identities.
- If GitHub subject is linked to another Yet Vast identity, reject the operation and do not merge accounts.

The earlier implementation report records:
- an account-linking operation ID with a 10-minute expiry;
- OAuth state and PKCE;
- a callback that rechecks the bound central session;
- collision audit event `identity.link_collision_blocked`;
- recent reauthentication for unlinking (reported as within 15 minutes);
- prevention of unlinking the only remaining authentication method;
- revocation of sessions associated with an unlinked provider.

**GitHub-only ephemeral access**
- Permitted only when the individual application registration explicitly enables it.
- Does not automatically create a permanent Yet Vast identity.
- Does not create a durable GitHub-to-Yet-Vast identity mapping.
- Must be governed by server-side application policy, not a browser query parameter or hostname.

### 4.4 No automatic account merging

Never merge Google and GitHub accounts merely because they report the same email address. Explicit authenticated account linking is required. Provider subject identifiers are the external identity keys.

## 5. Authentication and security controls

### 5.1 OAuth

The central design uses OAuth Authorization Code flow with:

- PKCE S256;
- state validation;
- nonce validation where applicable;
- short-lived, single-use authorization codes;
- exact redirect URI allowlisting;
- server-to-server code exchange;
- transaction expiry and replay prevention;
- application registration and status checks.

Provider access tokens must not be exposed in browser-visible URLs or client-side JavaScript.

### 5.2 Signing and JWKS

- EdDSA / Ed25519 is the documented default signing approach.
- RS256 support was recorded as an alternative.
- Private signing keys remain exclusively on the central Auth server.
- Consumer applications verify assertions using public keys published through:

`https://auth.yetvast.com/.well-known/jwks.json`

Key custody, rotation, overlap periods and verifier compatibility are operational responsibilities.

### 5.3 Firebase / Firestore

Firestore is the central persistence layer. Production reads and writes are performed server-side through Firebase Admin SDK.

- Firebase Admin credentials are server-only.
- No Firebase service account private key belongs in browser bundles or public environment variables.
- Consumer apps do not directly mutate the central `applications` collection.
- Firestore rules and server-side authorization must preserve central registry ownership.

### 5.4 Security boundaries

Security must be enforced at server trust boundaries, not only through UI visibility.

Preserve:
- CSRF protection for state-changing browser operations;
- strict Origin/Referer checks where applicable;
- server-side role checks;
- no browser-supplied admin identity or role claims;
- no secrets in client bundles or logs;
- exact redirect URI checks;
- rate limiting and abuse protection as operational hardening;
- structured logs with token, cookie and secret redaction;
- explicit account-linking and collision checks.

## 6. Application List: central application registration authority

### 6.1 Ownership

The Firestore `applications` collection is the authoritative list of applications permitted to use Yet Vast Auth.

Only the central Auth server mutates this registry. Consumer applications cannot approve themselves, change their global registration, or access another application's private registration details.

The user-facing label is now intended to be **Application List** rather than **Application Registry**. This is a presentation terminology change; internal collection names, types and API paths need not be renamed.

### 6.2 Current registration direction

The latest product decision supersedes the earlier consumer-side onboarding design:

- Developers register applications directly at Yet Vast Auth.
- Registration route: `https://auth.yetvast.com/admin/applications/register`.
- Yet Vast Home and other consumer applications do not need a special `/admin` onboarding challenge to register.
- A consumer application's `/admin` page is owned by that product developer and can provide product-specific administration.
- Only after central approval may the application authenticate users through Yet Vast Auth.

The earlier `initiateAppOnboarding()` / `/onboarding` challenge workflow was implemented for a previous architecture and should be treated as legacy unless current source confirms it remains needed for a distinct use case.

### 6.3 Registration form — intended current product contract

**Primary Application URL — mandatory**
- Primary identifier supplied by the applicant, e.g. `https://yetvast.com` or `https://cogmit.yetvast.com`.
- Must be normalized and validated server-side.
- Production uses HTTPS.
- Localhost/127.0.0.1 HTTP exceptions may be supported for development.
- URL credentials, query strings and fragments should be rejected.
- Duplicate active/pending claims to the same normalized origin must be prevented.
- Domain ownership verification should be required before approval, preferably with a DNS TXT challenge or another secure proof.

**Application Name — optional**
- Display metadata only.
- Not unique.
- If omitted, a readable hostname-derived fallback may be displayed.
- Must not be used as the application identifier.

**Designated App Administrator User ID — mandatory**
- Must be a canonical Yet Vast user ID.
- Must match the consumer deployment's server-only `YETVAST_APP_ADMIN_USER_IDS`.
- Should default to the authenticated submitter's identity and be read-only where possible.
- If registering on behalf of someone else is supported, that other administrator must explicitly prove/accept the designation.
- Never accept arbitrary browser-supplied identity as proof.

**Description — optional**
- Display metadata only.

**Allowed Redirect URIs — mandatory**
- At least one exact callback URI.
- One URI per line in the form.
- Production HTTPS; local development exceptions only for loopback.
- No fragments.
- Redirect origins must be consistent with the registered primary origin or separately verified/approved additional origins.
- Exact URI matching remains mandatory during OAuth.

**Identity Providers**
- Google and GitHub options remain available, subject to policy validation.

**Provider Policy Controls — mutually exclusive**
1. `Allow anonymous GitHub-only service access without persistent Google identity`
   - GitHub must be enabled.
   - `allowEphemeralGithub = true`.
   - `requirePersistentIdentity = false`.
2. `Require Google persistent Yet Vast identity`
   - Google must be enabled.
   - `requirePersistentIdentity = true`.
   - `allowEphemeralGithub = false`.

Default: Google persistent Yet Vast identity.

The two options must be a single-choice radio control or equivalent, not independent checkboxes. Validate the policy in UI, Zod schema, server registration service, persisted record and OAuth authorization logic. A UI-only mutual exclusion is insufficient.

### 6.4 Application ID

The applicant does not enter an Application ID. Auth generates an immutable internal `applicationId` server-side.

- It must be unique and stable.
- It must not be derived from the optional display name.
- It must not be client-controlled.
- It is returned after registration and shown in the Application List and detail page.
- The primary origin is the principal external uniqueness attribute; the internal ID remains the OAuth identifier.

### 6.5 Deleted-origin re-registration

Existing tombstones must not be overwritten or silently reused.

If a previously deleted application registers the same origin:
- preserve the old tombstone and audit history;
- verify domain control again;
- require Auth Admin review;
- create an explicit successor/new registration identity;
- record `supersedesApplicationId` or equivalent lineage;
- prevent simultaneous active registrations for the same origin.

This is especially relevant to the historical `yetvast-home` record, which was shown as deleted and later recovered in screenshots. The exact current Firestore state must be checked before making any further registration change.

### 6.6 Registration lifecycle

Canonical registration status:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `SUSPENDED`

Expected high-level transitions:
- New submission → `PENDING`
- `PENDING` → `APPROVED` or `REJECTED`
- `APPROVED` → `SUSPENDED`
- `SUSPENDED` → explicit restoration to `APPROVED`

`PENDING`, `REJECTED` and `SUSPENDED` applications cannot authenticate. Rejection must preserve reviewer identity, timestamp and reason.

### 6.7 Self-review restriction

An Auth Admin must not approve, reject or review an application they administer. Compare canonical immutable Yet Vast user IDs, not email addresses. Enforce on the server even if the UI hides the action.

The registration submitter and designated App Admin must be represented accurately. The Auth Admin review must be performed by a different eligible identity.

## 7. Application deletion and recovery lifecycle

A later implementation report records a separate deletion state orthogonal to registration status:

- `deletionStatus: NONE | REQUESTED | DELETED`

This avoids overloading `PENDING`, `APPROVED`, `REJECTED` and `SUSPENDED`.

Reported metadata includes:
- `deletionRequestedAt`
- `deletionRequestedBy`
- `deletionReason`
- `deletedAt`
- `deletedBy`
- `deletionActorType` (`APP_ADMIN` or `AUTH_ADMIN`)

### 7.1 Requestor deletion request

A verified designated App Admin may request deletion of their own application through central Auth. The request requires a reason and confirmation.

The reported implementation:
- validates the central Auth session and CSRF;
- verifies application ownership against the central record;
- records requestor, reason and timestamp;
- sets `deletionStatus=REQUESTED`;
- blocks new OAuth authorization and code redemption;
- revokes central application sessions where supported;
- preserves a tombstone and audit history.

### 7.2 Auth Admin deletion and resolution

Auth Admin can:
- directly delete an application with explicit application ID confirmation and mandatory reason;
- confirm a requestor's deletion request;
- reject a requestor's deletion request and restore the previous operational state when appropriate;
- recover a deleted application through an explicit action, target state and audit reason.

### 7.3 Deleted applications

The reported implementation uses a tombstone rather than hard-deleting Firestore records. It preserves original registration metadata, administrator, redirect URIs and audit history.

Deletion must block:
- OAuth authorization initiation;
- authorization-code issuance;
- outstanding code redemption;
- onboarding/registration challenge creation for the deleted ID;
- re-registration that would overwrite the tombstone.

The Auth server must check deletion state at each relevant authorization boundary, not merely hide a UI button.

### 7.4 Consumer sessions

The implementation report states that central application sessions are revoked. A consumer's host-bound stateless JWT session cannot necessarily be cleared remotely across origins. Consumer operations that require central refresh/re-authentication must fail after application deletion. This boundary must be tested and documented; do not claim all consumer cookies are instantly erased unless a real revocation mechanism exists.

### 7.5 Reported deletion endpoints

The implementation report lists:

```text
POST /api/applications/[appId]/deletion-request
POST /api/admin/applications/[appId]/delete
POST /api/admin/applications/[appId]/deletion-request/resolve
POST /api/admin/applications/[appId]/recover
```

Verify actual current route paths and schemas against source before integrating another consumer. Do not rely on a Home-side fallback between guessed endpoint paths.

## 8. Roles and authorization

### Yet Vast Auth Admin
- Identified by server-only `YETVAST_AUTH_ADMIN_USER_IDS`.
- Can see the Application List and central administrative controls.
- Can review, approve, reject, suspend, restore, delete and recover applications according to policy.
- Must not review their own application.

### App Admin
- Designated in the central application registration.
- Must match the consumer deployment's `YETVAST_APP_ADMIN_USER_IDS`.
- Can only administer their own consumer application where that product provides App Admin features.
- Does not gain global Application List or Auth Admin permissions.

### App User
- Authenticates through an approved application.
- Has no central registry or application lifecycle authority.

### Auth Admin bootstrap

`YETVAST_AUTH_ADMIN_USER_IDS` is server-only and contains comma-separated immutable Yet Vast user IDs. Production must fail closed if the allowlist is missing or empty. Do not store production admin IDs in public docs, client code or public environment variables.

## 9. Auth Admin and account routes

Important known routes and URLs:

| Route | Purpose |
|---|---|
| `/` | Yet Vast Auth homepage |
| `/account` | Central account and linked providers |
| `/admin` | Auth Admin control plane |
| `/admin/applications/register` | Application registration form |
| `/admin/applications/[appId]` | Application detail/review |
| `/.well-known/jwks.json` | Public signing keys |
| `/api/oauth/start` | OAuth initiation (reported route) |
| `/api/token` | Authorization code/token exchange (reported route) |

Actual source route structure is authoritative.

Homepage change requested/implemented direction:
- Add **Register Application** beside existing homepage actions.
- It should be available to developers, not only Auth Admins.
- If sign-in is required, preserve a return path to registration.
- Change user-facing “Application Registry” wording to “Application List” everywhere. Do not rename internal Firestore collection or API contracts without a separate reason.

## 10. Yet Vast Home integration boundary

Yet Vast Home is a consumer, not a co-owner of central Auth registration.

Its primary origin is `https://yetvast.com`. Its callback was documented and inspected in the Home report as:

`https://yetvast.com/api/auth/callback`

Its intended provider policy:
- Google enabled.
- Persistent identity required.
- Anonymous GitHub forbidden.
- GitHub account linking occurs centrally from the authenticated account area; it is not an alternative Home login provider unless registration policy explicitly changes.

Home owns:
- its UI and product content;
- its own session cookie (`yv_home_session`);
- local user experience and product-level authorization;
- its own server-side App Admin configuration.

Auth owns:
- central identity;
- provider linking;
- application registration and approval;
- redirect URI allowlist;
- application OAuth policy;
- signed assertion and JWKS.

The historical consumer-side `/admin` onboarding challenge flow is superseded by the direct central registration form. The Home `/admin` page may be whatever Home developers need; it is not required to explain or manage Yet Vast Auth.

## 11. Infrastructure and deployment

### Hosting
- Vercel hosts the Auth Next.js server.
- Firebase / Cloud Firestore stores central identity and application data.
- GitHub Packages distributes private shared packages.

### Production origin
`YETVAST_AUTH_ORIGIN=https://auth.yetvast.com`

The earlier deployment history records a production runtime failure when this variable was missing; it must be present in the correct Vercel environment and a redeploy is required after changes.

### Environment variables

The exact current `.env.example`, runtime schema and Vercel environment are authoritative. Historically discussed variables include:

- `YETVAST_AUTH_ORIGIN`
- `YETVAST_AUTH_ADMIN_USER_IDS`
- Firebase project/service-account configuration
- Google OAuth client ID/secret
- GitHub OAuth client ID/secret
- signing key material and key identifiers
- provider endpoint overrides (normally unset)
- runtime/test-mode flags

Do not copy secrets into this handbook. Do not assume a historical variable remains required; compare source runtime schema and deployment settings.

### Google OAuth
The central Google OAuth callback and client configuration must be read from current source and Google Cloud Console. Never infer callback routes from a consumer callback. Each OAuth provider app has its own exact callback configuration.

### GitHub OAuth
The documented GitHub callback is:

`https://auth.yetvast.com/api/oauth/callback/github`

A separate development OAuth app may be needed for a different localhost callback because provider applications may allow only one callback URL.

## 12. Verification history and evidence

### Historical Auth baseline
A 14 November 2026 documentation update reported:
- 91 unit tests;
- 12 Playwright E2E tests;
- typecheck, lint, format and monorepo build passed.

These numbers describe that recorded implementation baseline, not necessarily the latest deletion changes.

### Deletion lifecycle implementation report
The later report claims:
- `@yetvast/auth`: 115 passing tests;
- `@yetvast/auth-ui`: 16 passing tests;
- `@yetvast/auth-server`: 55 passing tests;
- total 186 passing tests across 20 files;
- build, typecheck, lint and format check passed.

The report also records new deletion routes, tombstone behavior, session revocation, OAuth guards and UI.

### Home integration report
A separate Home report records 98 passing tests, typecheck, lint and Next.js production build. See the Yet Vast Home handbook.

### Production screenshots supplied
Screenshots showed:
- central account page with Google and GitHub linked;
- Auth Admin application detail for `yetvast-home`;
- `PENDING` state;
- `APPLICATION_DELETED` error page;
- deleted tombstone and Auth Admin recovery action;
- recovered/approved application view;
- registration form at `/admin/applications/register`.

Screenshots prove the displayed production UI state at the time of capture, not all underlying authorization or persistence guarantees.

## 13. Important decisions and superseded designs

| Decision | Current position |
|---|---|
| One central Yet Vast identity | Retain |
| Consumer-owned sessions | Retain |
| OAuth Code + PKCE S256 | Retain |
| Exact redirect allowlist | Retain |
| No email-only account merge | Retain |
| Central Auth owns application approval | Retain |
| Consumer app self-onboarding challenge | Superseded by direct central registration |
| Applicant manually enters Application ID | Removed; Auth generates ID |
| Application display name unique | No; optional and non-unique |
| Application URL as primary registration attribute | Current direction |
| App Admin ID optional | No; mandatory and verified |
| Provider policy as two independent checkboxes | Replaced by mutually exclusive selection |
| “Application Registry” user-facing label | “Application List” |
| Consumer `/admin` must be an Auth onboarding page | No; consumer owns its own admin experience |
| Hard delete Firestore application | No; tombstone/audit-preserving deletion |

## 14. Operational and security work still to maintain

Even when functional flows work, production readiness remains ongoing:

- separate staging and production Firebase projects/data;
- Firestore backup and restore drills;
- rate limiting and abuse protection;
- structured monitoring, alerting and error tracking;
- signing-key rotation and incident response;
- cost and quota monitoring for Vercel, Firebase and OAuth providers;
- domain verification operations;
- audit-log retention and review;
- load and concurrency tests;
- secret rotation and access review;
- documented recovery and re-registration process.

Do not add microservices, queues, Kubernetes or a new database solely for hypothetical scale.

## 15. Current next steps

1. Verify the redesigned registration form and server-side schema against current source.
2. Confirm primary-origin uniqueness and domain ownership verification are actually implemented, not only documented as intended.
3. Confirm generated application ID and successor/tombstone re-registration behavior.
4. Verify mutually exclusive provider policy in schema, persistence and OAuth enforcement.
5. Verify homepage Register Application button and “Application List” terminology.
6. Confirm current Home registration record and administrator identity match Home's Vercel configuration.
7. Run current tests/build against the current commit; record exact commit SHA and deployment ID.
8. Freeze a known-good Auth release and publish shared package versions only after inspecting tarball contents and export maps.
9. Maintain an operational runbook for backups, signing-key rotation, incident response and recovery.

## 16. Working rules for the Yet Vast Auth ChatGPT Project

Use this document as project context, but inspect source code before making implementation claims.

Required AI-agent workflow:
1. Inspect repository structure, package scripts, current Git status and recent commits.
2. Read the relevant source, tests, docs and environment schema before editing.
3. Separate OBSERVED, DOCUMENTED, TESTED, INFERRED and UNKNOWN facts.
4. Prefer minimal changes; do not refactor unrelated code.
5. Preserve central Auth ownership of the identity and application list.
6. Enforce security server-side.
7. Add tests for security boundaries and lifecycle transitions.
8. Run the repository's actual quality commands.
9. Report changed files, exact command results, remaining risks and deployment steps.
10. Never claim deployment, publication or production verification without evidence.

Stop and ask before changing:
- identity format or identity mappings;
- OAuth flow or token contract;
- Firestore schema/migrations;
- application approval or deletion semantics;
- admin authorization;
- signing algorithms/key management;
- production secrets or infrastructure;
- domain ownership rules;
- destructive data operations.

## 17. Source and precedence

This handbook consolidates:
- `Yet-Vast-Auth-Updated-Project-Documentation-2026-11-14.md`;
- `Yet-Vast-Auth-and-Home-Project-History.md`;
- Auth and Home implementation reports supplied during 14–15 November 2026;
- user-provided production screenshots and deployment logs;
- later product decisions about direct central registration and the Application List.

When sources conflict:
1. Current source code, current deployed behavior and current persisted data determine actual behavior.
2. Latest explicit user decisions determine intended product direction.
3. Latest implementation reports provide evidence, subject to verification.
4. Earlier project history is historical context and is superseded where noted.

**End of Yet Vast Auth project handbook.**


---

# Current Identity Resolution and Release Readiness

**Update date: 16 November 2026**

## 15. Current implementation update — 16 November 2026

This section is authoritative over earlier descriptions of application identity, registration lifecycle and release readiness.

### 15.1 Current source baseline

- Repository: `yvnow/yetvast-auth`
- Branch: `main`
- Latest inspected commit: `872e25e452c249a64a50a304a3b782907b7e4c8e`
- Commit date: 16 November 2026
- Workspace version in inspected manifests: `0.3.0`
- Production origin: `https://auth.yetvast.com`

### 15.2 Logical application vs registration instance

The latest implementation separates three concepts:

1. `logicalAppId`: stable identity of the consumer application, retained across registration replacement.
2. `registrationId`: immutable identifier for one registration instance.
3. `supersedesApplicationId`: explicit predecessor relationship.

This prevents an old deleted registration from permanently blocking a logical product that has a newer independently approved registration.

### 15.3 Application resolution

The reported `resolveRegisteredApplication(identifier, redirectUri, tx)` logic:
- resolves candidates by exact registration identity, logical identity and explicit succession relationships;
- requires active approval, valid domain verification and exact redirect URI match;
- selects a valid approved successor for a logical-ID request;
- blocks direct use of a deleted registration instance;
- blocks pending, rejected, suspended and deletion-requested records;
- returns an explicit persistence conflict when multiple active registrations conflict;
- is used consistently through authorization, OAuth initiation/continuation/callback and code issuance/redemption.

Do not bypass this shared resolution path with direct Firestore document lookups.

### 15.4 Production migration remains pending

The migration script is:
`packages/auth/scripts/migrate-application-identities.mjs`

The recorded production dry run was read-only. It found three application records and identified two needing identity metadata updates. It did not modify Firestore.

Production execution is explicitly pending administrator authorization. Do not execute it automatically. After approval, run the execute mode and verify the records independently.

### 15.5 Registration and administration boundaries

Retain the current product contract:
- application registration is performed directly through Yet Vast Auth;
- primary application URL is mandatory;
- display name is optional and non-unique;
- designated App Admin identity is mandatory and verified;
- at least one exact redirect URI is mandatory;
- Auth generates the immutable registration ID;
- provider policy is a mutually exclusive choice;
- the central Application List and review operations are Auth-Admin-only;
- consumer App Admins do not gain global registry access;
- approval is enforced during authorization and code redemption;
- deletion is a soft-deletion/tombstone lifecycle with preserved history and controlled recovery.

### 15.6 Domain verification persistence hardening

The 15 November implementation record describes:
- recursive stripping of `undefined` values before Firestore writes and Firestore configuration with `ignoreUndefinedProperties`;
- concurrency conflict handling for verification attempts already in progress;
- reconciliation of stale verification attempts;
- `VERIFICATION_ABANDONED` audit events linked to their start event;
- transaction rollback/recovery handling;
- correlation IDs in API error responses;
- typed persistence/internal error classification;
- richer UI display of verification failures and correlated events.

These are implementation-report claims. Re-run relevant tests and verify live domain verification before treating them as current production behavior.

### 15.7 UI consistency

The 16 November implementation report records CSS Module-based semantic styles for administrative actions:
- purple primary;
- neutral outlined secondary;
- red destructive;
- green approval/activation;
- readable disabled states;
- consistent dimensions, focus and hover states.

It also records a fix for white destructive-foreground text rendered on light backgrounds.

### 15.8 Latest reported verification

The latest implementation record reports:
- `@yetvast/auth`: 196 tests;
- `@yetvast/auth-ui`: 16 tests;
- `@yetvast/auth-server`: 146 tests;
- total: 358 tests across 30 files;
- typecheck passed across all four workspaces;
- lint passed;
- format check passed;
- production builds passed for packages, Auth server and playground.

A prior run reported 353 tests. The 358-test run is the later recorded result. These are not tests rerun as part of this documentation update.

### 15.9 Consumer integration and package release

The Auth source manifests are at `0.3.0`. The Home repository still declares `@yetvast/auth` and `@yetvast/auth-ui` `^0.2.0`. Package publication and Home consumption of `0.3.0` must be confirmed before describing the consumer upgrade as complete.

Home should continue sending logical ID `yetvast-home`; it should not hardcode the registration-instance ID. The production migration and latest Auth deployment must precede the final live Home OAuth test.

### 15.10 Remaining release gates

1. Obtain explicit administrator authorization for the Firestore migration.
2. Execute migration and independently verify the affected records.
3. Publish `@yetvast/auth@0.3.0` and `@yetvast/auth-ui@0.3.0` if not already published.
4. Verify package contents/exports and update Home dependency/lockfile.
5. Deploy the latest Auth server.
6. Verify exact production Home origin and redirect URI (`www` vs apex).
7. Run live OAuth through the stable logical ID and confirm the active registration instance is selected.
8. Re-test deletion, suspension, recovery, domain verification, token exchange, session and account-linking boundaries in the deployed environment.
