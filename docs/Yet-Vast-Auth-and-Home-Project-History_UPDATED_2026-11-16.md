# Yet Vast Auth & Yet Vast Home
## Consolidated Project History, Architecture, Implementation Record, and Next-Step Handoff

**Document date:** 14 November 2026  
**Scope:** Yet Vast Auth and Yet Vast Home only  
**Explicit exclusion:** VastAlliance development discussions and product-specific implementation are intentionally excluded.  
**Status:** Yet Vast Auth is deployed at `https://auth.yetvast.com`; Google sign-in and GitHub account linking have been demonstrated successfully in the production account UI. Yet Vast Home is the intended first consumer/product hub; its current implementation and integration status are recorded separately below.

---

## 1. Executive summary

The work established a central identity service for the Yet Vast product ecosystem rather than implementing independent authentication systems inside every product.

The central service is **Yet Vast Auth**, hosted at:

- `https://auth.yetvast.com`
- Vercel-assigned deployment domain: `https://yetvast-auth.vercel.app`

Its responsibility is to establish and manage a persistent Yet Vast identity, authenticate users through approved identity providers, expose public verification material, and let registered Yet Vast applications obtain their own application-scoped sessions.

The first persistent identity provider is Google. A Google sign-in creates or retrieves a persistent Yet Vast identity stored centrally in Firestore. GitHub can be explicitly linked to an existing Google-backed identity. GitHub-only access, where an individual application is permitted to offer it, is an ephemeral/application-specific pathway and does not silently create a permanent central Yet Vast identity.

The implementation uses OAuth authorization-code flows with PKCE and state/nonce protections, short-lived single-use authorization codes, server-to-server exchange, application-owned sessions, and asymmetric signing. The central signing private key remains on the auth server; applications verify signed assertions using public keys published through JWKS.

The latest production screenshot provides direct user-interface evidence that GitHub linking succeeded: the account page displays **“Successfully linked your GitHub account”**, shows **2 connected** providers, and lists both GitHub and Google as linked with verified email. The account remains active under user ID `yvnowyv`. The screenshot also shows one active session, associated with Google / `auth-server`, and zero remaining account recovery codes.

This is a meaningful milestone: central Google identity creation, production account access, and explicit GitHub account linking have all reached a visible successful state. The next phase should be a controlled integration and end-to-end verification of Yet Vast Home as the first consumer, followed by operational hardening and documentation of the stable integration contract.

---

## 2. Product and naming context

### 2.1 Public naming

The public product/brand name is **Yet Vast**.

The authentication service is **Yet Vast Auth**. The product hub is **Yet Vast Home**.

The organizational umbrella and engineering standards context may use the name **Yet Vast Solutions** internally. Public-facing application branding should use **Yet Vast**, not “Yet Vast Solutions”, unless a specific legal or organizational context requires the longer name.

### 2.2 Products and services in scope

| Name | Role in this project |
|---|---|
| Yet Vast Auth | Central identity authority and authentication service |
| Yet Vast Home | Product hub and intended first consumer of Yet Vast Auth |
| `@yetvast/auth` | Shared authentication integration package |
| `@yetvast/auth-ui` | Shared authentication UI package |

Other Yet Vast products were discussed as potential consumers of the central identity service. Their product-specific development is outside this document.

### 2.3 Domain and repository identifiers

| Item | Value |
|---|---|
| Public homepage | `https://yetvast.com` |
| Central auth origin | `https://auth.yetvast.com` |
| Auth repository | `yetvast/yetvast-auth` |
| GitHub Packages registry | `https://npm.pkg.github.com` |
| Auth server app path in monorepo | `apps/auth-server` |
| Shared package paths | `packages/auth`, `packages/auth-ui` |
| Playground app path | `apps/auth-playground` |

The repository is a monorepo with the auth server, shared packages, and a playground. Vercel's Root Directory is configured as `apps/auth-server`, with access to files outside that directory enabled so the workspace packages can be built.

---

## 3. Original architectural objective

The underlying objective was to create one shared Yet Vast identity rather than allowing every application to independently create and manage unrelated user identities.

The intended identity lifecycle is:

1. A user authenticates with an approved provider at Yet Vast Auth.
2. Yet Vast Auth resolves or creates the central Yet Vast identity.
3. The central identity and provider relationship are stored in the central identity store.
4. A registered application initiates its own authentication transaction with Yet Vast Auth.
5. The user authenticates centrally and is returned to the requesting application using a short-lived authorization code.
6. The application backend exchanges that code with Yet Vast Auth.
7. The application creates its own host-bound session.
8. The application verifies signed identity assertions using the public signing keys published by Yet Vast Auth.

This separates **identity authority** from **application session ownership**:

- Yet Vast Auth owns the persistent Yet Vast identity and provider relationships.
- Each consuming application owns its own local session and application authorization rules.
- A central sign-out or session-management operation can be designed to revoke relevant central or application sessions according to the agreed token/session contract, but the consumer must still enforce its own session lifecycle.

The design avoids making every product responsible for implementing Google/GitHub OAuth, provider credential storage, account linking, and central identity resolution independently.

---

## 4. Central identity and provider policy

The provider policy is a core product invariant. It is not merely a UI preference.

### 4.1 Google is the default persistent identity provider

Google is the default identity provider for creating or retrieving a persistent Yet Vast identity.

When a user signs in with Google:

- Yet Vast Auth verifies the Google OAuth result.
- It resolves an existing Google-to-Yet-Vast identity mapping or creates a new persistent identity.
- The central identity and provider mapping are stored in Firestore.
- The user receives a stable Yet Vast user ID.
- The persistent identity is not tied to one individual consumer application's database.

The central identity store is intended to be shared by Yet Vast Auth and its registered applications through controlled server-side contracts. Consumer applications should not independently create competing central identity records.

### 4.2 GitHub-only access is a distinct, optional pathway

GitHub-only sign-in is not equivalent to Google-backed persistent identity creation.

The policy established was:

- GitHub-only access may be offered only by applications whose registration explicitly permits anonymous/ephemeral GitHub access.
- A GitHub-only user in that pathway is not automatically persisted as a permanent Yet Vast user.
- No permanent GitHub-to-Yet-Vast identity mapping is created for a GitHub-only ephemeral user.
- Temporary OAuth transactions, authorization state, and short-lived security records may be stored as needed.
- An explicit GitHub link performed while authenticated to an existing persistent Google-backed Yet Vast identity creates the durable provider relationship.

This distinction prevents the presence of GitHub OAuth credentials on the server from unintentionally making GitHub a universal persistent sign-in option.

### 4.3 Provider visibility is registration-driven

The auth server must decide which providers are offered based on the verified requesting application's registration and server-side policy.

It must not decide based on an untrusted hostname, a client-controlled query parameter, or the mere existence of provider credentials.

The confirmed policy for the central service and Yet Vast Home is Google-only sign-in. GitHub linking is available from the authenticated account-management area. Other applications may have a separate provider policy only when their server-side registration explicitly permits it.

Default GitHub anonymous access is false; the policy fails closed.

### 4.4 No automatic account merging

Google and GitHub identities must never be merged solely because they report the same email address.

The user must explicitly initiate account linking while authenticated to the existing persistent Yet Vast identity. The provider subject identifier, not email equality, is the decisive external identity key.

If the GitHub identity is already linked to a different Yet Vast identity, the operation must be rejected rather than merging the two accounts.

---

## 5. Yet Vast user ID policy

The user ID policy was refined during implementation.

### 5.1 Final rule

For a new Google-backed persistent identity, derive the initial Yet Vast user ID from the username portion of the verified Google email address:

- lowercase;
- remove the domain portion;
- do not append a provider suffix.

Example:

`yvnowyv@gmail.com` → `yvnowyv`

### 5.2 Collision behavior

If the proposed user ID is already taken by a different identity, allocate a deterministic numeric suffix:

- `username`
- `username-1`
- `username-2`
- and so on, until an unused ID is found.

Existing user IDs must not be migrated or renamed by this change. The collision rule applies when creating new identities.

### 5.3 Verified production evidence

The production account screenshot shows the user ID as `yvnowyv`, consistent with the final username-only rule. Earlier discussion included a provider suffix proposal; that is superseded by the final username-only policy.

---

## 6. Authentication and security architecture

### 6.1 OAuth flow

The central sign-in design uses OAuth authorization-code flow with:

- PKCE;
- state validation;
- nonce validation where applicable;
- short-lived authorization codes;
- single-use code redemption;
- server-to-server code exchange;
- strict redirect URI validation;
- OAuth transaction expiry and replay protection.

The consumer application must not receive provider access tokens in browser-visible URLs or client-side JavaScript.

### 6.2 Application-specific sessions

After successful central authentication:

- Yet Vast Auth returns a short-lived, single-use authorization code to the registered callback.
- The consuming application's backend exchanges the code with the central auth server.
- The consuming application creates its own HTTP-only, host-bound session cookie.
- No wildcard `.yetvast.com` cookie is used.

This keeps session cookies scoped to each application host and avoids making every application depend on a shared browser cookie.

### 6.3 Signing and token verification

The architecture uses asymmetric signing:

- EdDSA / Ed25519 is the default signing approach.
- RS256 support was included as an alternative.
- The signing private key remains exclusively on the central auth server.
- Consumers verify signed assertions using the public key set published by Yet Vast Auth.

JWKS endpoint:

`https://auth.yetvast.com/.well-known/jwks.json`

The private signing key must never be placed in a consumer application's browser bundle, shared client package, source repository, or public environment variable.

### 6.4 Firebase access

Firestore is used as the central persistence layer through the Firebase Admin SDK on the server.

The browser must not receive Firebase Admin credentials. The Firebase service account private key and client email are server-only configuration.

Firebase in this design is the database/persistence service; it is not being used as the user-facing authentication authority. Google and GitHub OAuth are handled by Yet Vast Auth.

### 6.5 Other security controls captured in the design

The implementation requirements include:

- strict app registration and redirect allowlists;
- validation of requesting application identity;
- CSRF protection for account mutations;
- OAuth transaction binding;
- replay prevention;
- short-lived transaction and authorization records;
- server-side authorization checks;
- no provider token leakage into URLs or browser JavaScript;
- no automatic provider-account merging;
- explicit account linking;
- safe handling of identity-link collisions;
- audit events for security-sensitive operations;
- server-only secret handling;
- no trust in user-controlled hostnames or query parameters.

These controls are intended to be enforced at server trust boundaries, not merely represented by hiding or showing UI controls.

---

## 7. Account linking implementation

### 7.1 User-facing behavior

The authenticated `/account` page contains a **Linked accounts** section and a **Link another account** action. A Google-authenticated user can initiate GitHub linking without creating a second Yet Vast identity.

### 7.2 Linking transaction

The implementation report describes this flow:

1. The user must have an active persistent central session.
2. The user initiates linking from the account page.
3. The `/api/account/link` route validates the session and CSRF protection.
4. An `AccountLinkingOperation` is created with an `lnk_...` identifier and a 10-minute expiry.
5. An OAuth transaction is created with flow type `link`, PKCE and state.
6. The operation is bound to the authenticated `yvUserId`.
7. The user is redirected to GitHub for authorization.
8. The callback verifies the OAuth transaction and confirms that the active central session still matches the identity to which the operation was bound.
9. The linking service checks the provider subject identifier for an existing mapping.
10. If no conflicting mapping exists, the GitHub identity is linked to the existing Yet Vast identity.
11. The user is returned to the account page with a success indication.

### 7.3 Collision handling

If the GitHub provider subject is already associated with another Yet Vast identity:

- linking is rejected;
- identities are not merged;
- the audit event `identity.link_collision_blocked` is recorded;
- the user is redirected to `/account?error=IDENTITY_COLLISION`.

### 7.4 Unlinking safeguards

The implementation report states:

- unlinking requires recent reauthentication within 15 minutes;
- the system prevents unlinking the only remaining authentication method;
- active sessions associated with the unlinked provider are revoked.

The purpose is to prevent accidental account lockout and reduce the risk of removing a provider from an account without recent proof of control.

### 7.5 GitHub OAuth callback

The callback URI is constructed from `YETVAST_AUTH_ORIGIN`:

`https://auth.yetvast.com/api/oauth/callback/github`

The local development callback recorded in the implementation report is:

`http://localhost:3001/api/oauth/callback/github`

A GitHub OAuth App supports one callback URL, so a separate development OAuth App is appropriate if local OAuth callback testing is required.

### 7.6 GitHub OAuth environment variables

Required production variables:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

The implementation also supports optional endpoint overrides:

- `GITHUB_AUTH_URL`
- `GITHUB_TOKEN_URL`
- `GITHUB_USER_URL`
- `GITHUB_EMAILS_URL`

The optional endpoint variables should remain unset for standard GitHub OAuth unless a concrete need arises.

The GitHub OAuth App configuration used:

- Application name: `Yet Vast Auth`
- Homepage URL: `https://auth.yetvast.com`
- Authorization callback URL: `https://auth.yetvast.com/api/oauth/callback/github`

The homepage URL identifies the service represented by the OAuth application. The callback URL is the operational redirect endpoint and must match the application configuration exactly.

---

## 8. Repository and package structure

The auth implementation is organized as a monorepo:

```text
yetvast-auth/
├── apps/
│   ├── auth-server/
│   └── auth-playground/
├── packages/
│   ├── auth/
│   └── auth-ui/
└── ...
```

Responsibilities:

| Path | Responsibility |
|---|---|
| `apps/auth-server` | Central auth authority, OAuth routes, account management, server configuration and deployment |
| `apps/auth-playground` | Playground for exercising the auth integration |
| `packages/auth` | Shared auth integration logic/contracts for consuming applications |
| `packages/auth-ui` | Shared authentication UI components and tokens |

### 8.1 Published packages

The following packages were published to GitHub Packages:

- `@yetvast/auth@0.1.0`
- `@yetvast/auth-ui@0.1.0`

GitHub's package UI confirmed that both packages were **Private**.

Registry configuration:

```ini
@yetvast:registry=https://npm.pkg.github.com
```

A GitHub Personal Access Token with package read/write permissions was used for package publication. The token must remain in user-level or CI/deployment secret configuration and must not be committed to the repository.

The package publication was completed. The deployment work then used the monorepo workspace packages directly, avoiding an unnecessary package republish merely to resolve local workspace build issues.

### 8.2 Build and workspace corrections

The initial Vercel build encountered workspace package resolution problems and a missing export target for:

`@yetvast/auth-ui/tokens.css`

The monorepo configuration, workspace build handling, CSS export target, and Vercel configuration were corrected. The reported final checks passed.

---

## 9. Yet Vast Auth deployment

### 9.1 Hosting decision

The initial live deployment target is Vercel. The goal was to deploy and test the real central service online rather than rely exclusively on local development.

### 9.2 Vercel project configuration

The confirmed deployment configuration:

| Setting | Value |
|---|---|
| Framework | Next.js |
| Root Directory | `apps/auth-server` |
| Include files outside Root Directory | Enabled |
| Build/install/output overrides | Left disabled; project `vercel.json` supplies commands |
| Node.js | Vercel default 26.x; project engine requirement `>=20.9.0` |

The project is a monorepo, so access to files outside the Root Directory is required for the shared workspace packages.

### 9.3 Custom domain and origin

Custom domain:

`auth.yetvast.com`

Vercel provided the DNS target. The CNAME record was configured using the exact target shown in the Vercel domain settings rather than guessing a target. DNS verification completed; SSL issuance was initially pending.

Production origin environment variable:

`YETVAST_AUTH_ORIGIN=https://auth.yetvast.com`

This variable is required in production and is used to construct canonical callback URLs and service-origin behavior. An initial runtime error stated that `YETVAST_AUTH_ORIGIN` was required in production; adding the variable and redeploying addressed that failure.

### 9.4 Vercel environment variables

The production configuration discussed and added includes:

| Variable | Purpose |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase project ID (`project_id` from service-account JSON) |
| `FIREBASE_CLIENT_EMAIL` | Service-account `client_email` |
| `FIREBASE_PRIVATE_KEY` | Service-account `private_key`, including PEM markers and newline formatting |
| `YETVAST_AUTH_ORIGIN` | Canonical production auth origin |
| `YETVAST_SIGNING_PRIVATE_KEY` | Ed25519 or RSA PKCS#8 PEM signing private key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |

Only the variables required for the relevant deployment environment should be configured there. Secrets must not be pasted into chat, committed, or exposed to client-side code.

### 9.5 Signing key generation

The signing key was generated locally using OpenSSL on Windows.

Commands used/recommended:

```powershell
openssl genpkey -algorithm ED25519 -out yetvast-signing-private.pem
openssl pkey -in yetvast-signing-private.pem -pubout -out yetvast-signing-public.pem
```

The private key is configured on the server as `YETVAST_SIGNING_PRIVATE_KEY`. The public key is exposed through JWKS by the auth service.

The private key should be backed up securely. It must not be casually regenerated after production use, because changing the signing key without a planned key-rotation strategy can invalidate existing signed tokens or break consumer verification.

### 9.6 Firebase project and service account

A Firebase project named `yetvast-auth` was created.

The service-account JSON fields map to Vercel as follows:

- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY`

The personal Gmail address is not the service-account email. The exact service-account `client_email` from the JSON must be used.

The implementation uses Firebase Admin SDK server-side. Firebase test mode was not selected; the intent was to use the real Firebase project and service-account configuration.

### 9.7 Deployment troubleshooting history

The following issues were encountered and addressed during deployment:

1. **Workspace package resolution:** Vercel initially could not resolve the local `@yetvast/auth` and `@yetvast/auth-ui` packages. The monorepo/workspace build setup was corrected.
2. **CSS export target:** The `@yetvast/auth-ui/tokens.css` export pointed to a missing target. The export/build arrangement was corrected.
3. **Production origin missing:** Runtime reported `YETVAST_AUTH_ORIGIN is required in production`. The environment variable was added and the deployment was redeployed.
4. **Signing key missing:** Runtime reported `YETVAST_SIGNING_PRIVATE_KEY (Ed25519 or RSA PKCS#8 PEM) is required in production`. An Ed25519 key pair was generated and the private key was configured in Vercel.
5. **No identity provider enabled:** Runtime validation reported `identity.providers: At least one identity provider must be enabled unless access.anonymousAccess is true.` The correct resolution was to configure Google as the persistent default provider, not to enable global anonymous access.
6. **Google OAuth configuration:** Google OAuth credentials and the exact callback URI were configured.
7. **GitHub linking configuration:** GitHub OAuth App credentials and the GitHub callback URI were configured for account linking.

The live service subsequently reached a successful deployed state and Google sign-in was tested.

---

## 10. Google OAuth configuration

Google is the persistent default identity provider.

The Google OAuth application was configured with:

- Authorized JavaScript origin: `https://auth.yetvast.com`
- Authorized redirect URI: `https://auth.yetvast.com/api/oauth/callback/google`

Production environment variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

The Google callback must match exactly between Google Cloud configuration and the auth server's callback construction.

Google sign-in was successfully exercised after deployment. The account page displayed the generated Yet Vast user ID.

---

## 11. Yet Vast Home

### 11.1 Product role

Yet Vast Home is the product hub for the Yet Vast ecosystem and is intended to be the first consumer of Yet Vast Auth.

The public application should use the brand **Yet Vast**.

### 11.2 Initial implementation context

The prior implementation status recorded in project discussions described the first Yet Vast Home implementation as having:

- a public product directory;
- light and dark themes;
- an account page;
- an isolated authentication boundary.

At that point, the auth server still needed live deployment and package/session integration, and live provider verification remained outstanding.

The subsequent work focused on completing the central auth service first. This document does not claim that the later Yet Vast Home integration has been completed unless verified by a current repository or deployment report.

### 11.3 Authentication policy

Yet Vast Home is Google-only for sign-in under the established provider policy.

GitHub account linking is managed inside the authenticated Yet Vast Auth account experience. This does not mean Yet Vast Home should offer GitHub as a second persistent sign-in button.

### 11.4 Integration model

The intended Home integration is through the shared auth package and central auth service:

- Home redirects users to Yet Vast Auth for authentication.
- The central service authenticates the user and returns a short-lived authorization code to the registered Home callback.
- Home's backend exchanges the code server-to-server.
- Home creates its own application-scoped session.
- Home uses the resulting Yet Vast identity reference for account-aware product hub behavior.
- Home must not store or manage Google/GitHub provider credentials itself.
- Home must not create a second independent persistent Yet Vast identity store.

The exact Home production callback, registered application identifier, environment variable names, and current integration status should be confirmed from the current Home repository before being recorded as completed.

---

## 12. Verification and implementation evidence

### 12.1 Reported automated checks

The final implementation report for the GitHub account-linking work stated:

| Check | Reported result |
|---|---|
| Production build | Passed |
| TypeScript typecheck | Passed |
| Vitest unit tests | 49 passed |
| Lint | Clean |
| Format check | Clean |
| Playwright E2E | 11/11 passed |

The E2E suite was reported to cover GitHub linking, identity resolution/persistence behavior, and unlinking protection.

These are implementation-agent test results as reported in the conversation. They are not independently reproduced in this document.

### 12.2 Production UI evidence — 14 November 2026

The user supplied a screenshot from:

`https://auth.yetvast.com/account?linked=github`

Visible evidence in the screenshot:

- Account page title: **Yet Vast Auth — Account**
- Account status: **active**
- Displayed user ID: `yvnowyv`
- Success message: **Account updated**
- Success detail: **Successfully linked your GitHub account.**
- Linked accounts count: **2 connected**
- GitHub listed as linked, with a **Verified email** label
- Google listed as linked, with a **Verified email** label
- Both provider rows display the same email address
- Active sessions count: **1 active**
- Current session row identifies Google / `auth-server`
- Recovery-code status: **0 remaining**

This screenshot directly confirms that the production account UI completed the GitHub-linking flow and rendered both providers as connected.

### 12.3 What the screenshot does not prove by itself

The screenshot is strong end-to-end UI evidence, but it does not independently prove every backend invariant. In particular, it does not by itself demonstrate:

- the exact Firestore document layout;
- the stored provider subject IDs;
- the audit log contents;
- token signature verification by a separate consumer;
- the complete unlink/re-authentication flow;
- the behavior of Yet Vast Home against the live auth service.

Those are covered by implementation reports and automated tests to the extent described above, but should remain distinct from direct production UI verification.

---

## 13. Important decisions and rejected shortcuts

The following decisions should be preserved during future implementation:

1. **Do not enable global anonymous access** merely to satisfy a provider configuration validation error. Configure the intended persistent provider.
2. **Do not make GitHub universally available** just because GitHub OAuth credentials exist.
3. **Do not treat GitHub-only ephemeral access as a persistent Yet Vast identity.**
4. **Do not auto-merge Google and GitHub accounts based on matching email.**
5. **Do not change existing user IDs** when adjusting the new-user ID generation rule.
6. **Do not use a wildcard `.yetvast.com` session cookie.** Each app owns a host-bound session.
7. **Do not put provider credentials or signing private keys in browser code or shared client packages.**
8. **Do not put GitHub PATs in the repository `.npmrc`.**
9. **Do not use a personal Gmail address as the Firebase service-account email.**
10. **Do not regenerate the production signing key casually.**
11. **Do not assume a successful build means production authentication works.** Verify real OAuth flows and account state against the deployed domain.
12. **Do not treat Yet Vast Home as the identity authority.** It consumes the central service.
13. **Do not claim Home integration is complete without current repository and live-flow evidence.**

---

## 14. Current status matrix

| Area | Status | Evidence / qualification |
|---|---|---|
| Central auth architecture | Defined | OAuth, identity, session and signing model documented in project decisions |
| Persistent Google identity | Implemented and production-tested | Successful Google sign-in and account page |
| User ID generation | Implemented per final rule | Production account shows `yvnowyv` |
| Firebase Admin persistence configuration | Configured | Production environment variables and successful account flow; backend data layout not independently inspected here |
| Ed25519 signing configuration | Configured | Production deployment progressed past missing-key error; JWKS consumer verification still merits a separate integration test |
| JWKS endpoint | Specified/implemented in architecture | Endpoint is `/.well-known/jwks.json`; consumer verification should be explicitly tested |
| GitHub OAuth App | Configured | Production linking completed |
| GitHub account linking | Implemented and production UI verified | Success message and 2 connected providers |
| Account-link collision protection | Implemented per report | `identity.link_collision_blocked`; automated tests reported |
| Unlinking safeguards | Implemented per report | Recent reauthentication, last-provider protection and session revocation; live manual test not shown |
| Private npm packages | Published | `@yetvast/auth@0.1.0`, `@yetvast/auth-ui@0.1.0`, Private in GitHub UI |
| Vercel deployment | Deployed | `auth.yetvast.com` live and account page accessible |
| Yet Vast Home initial UI | Previously reported implemented | Product directory, themes, account page, isolated auth boundary |
| Yet Vast Home live auth integration | Not confirmed in latest evidence | Must verify current repository and production flow |
| Cross-app session lifecycle | Architecture defined | Needs consumer-level integration and end-to-end verification |
| Recovery codes | UI visible; 0 remaining in screenshot | Generation/rotation and recovery journey need explicit test evidence |

---

## 15. Recommended next implementation sequence

This sequence is limited to Yet Vast Auth and Yet Vast Home.

### Phase A — Freeze and document the working auth baseline

1. Tag or otherwise identify the exact deployed source revision that produced the working production auth service.
2. Record the production environment-variable names and which deployment environments use them. Never put secret values in documentation.
3. Verify the live JWKS response and document the key ID, algorithm and rotation expectations without exposing private key material.
4. Verify the Google sign-in flow from a clean browser session.
5. Verify GitHub linking from a clean authenticated session.
6. Verify collision handling and unlinking safeguards in a controlled test account.
7. Test recovery-code generation and recovery behavior; the current screenshot shows zero remaining codes.

### Phase B — Integrate Yet Vast Home

1. Inspect the current Home repository and identify its actual implementation state before changing anything.
2. Confirm the registered Home application ID, exact callback URI, allowed origin and server-side provider policy.
3. Integrate the published/shared auth package or the agreed workspace/package version.
4. Implement the server-side authorization-code exchange.
5. Create and validate a Home-owned, host-bound session.
6. Confirm Home offers Google-only sign-in.
7. Verify sign-in, refresh/revisit, sign-out and expired/invalid authorization-code behavior.
8. Confirm Home does not create duplicate central identity records or store provider credentials.

### Phase C — Operational hardening

1. Establish a documented signing-key rotation procedure, including overlapping public keys and token lifetime handling.
2. Review OAuth transaction and authorization-code TTLs, replay behavior and cleanup.
3. Confirm audit events for sign-in, linking, unlinking, collisions, session revocation and recovery actions.
4. Review rate limiting and abuse controls on OAuth and account-management endpoints.
5. Confirm production logging excludes secrets, provider tokens, private keys and unnecessary personal data.
6. Verify backup and recovery expectations for the Firestore identity store.
7. Establish a repeatable staging/production configuration process.

### Phase D — Stable integration contract

Document the consumer contract for Yet Vast Home:

- application registration fields;
- authorization start URL and parameters;
- callback contract;
- server-to-server code exchange;
- token/assertion claims;
- JWKS verification rules;
- session creation and cookie requirements;
- logout and revocation semantics;
- error codes and retry behavior;
- provider policy and account-linking boundaries.

Do not add speculative abstractions beyond the needs of the first consumer. Use the Home integration to validate the contract before broadening it.

---

## 16. Open questions to resolve from source code or live tests

These are not assumptions; they are items that should be confirmed before declaring the platform fully production-ready:

- What exact application registration record and client identifier are currently assigned to Yet Vast Home?
- What is the exact registered Home callback URI?
- Is Home currently using the published package versions or local workspace packages?
- Does the production JWKS endpoint expose the expected Ed25519 public key and key ID?
- Does a consumer independently verify the signed assertion and reject invalid, expired or wrong-audience tokens?
- What are the exact assertion claims, issuer, audience and expiration semantics?
- What is the current refresh-session or reauthentication policy?
- How are central sign-out, consumer sign-out and “sign out all devices” propagated across applications?
- Are recovery codes generated, hashed, single-use and rotated as intended? The supplied screenshot shows zero remaining.
- Are account-link and unlink operations fully audited in production?
- Is there a separate staging Firebase project and OAuth configuration, or is production currently the only live environment?
- Is there a documented Firestore backup/restore process?

Resolve these from the repository, deployment configuration, or controlled tests. Do not infer them from the account page alone.

---

## 17. Project development and AI-agent working rules

The wider Yet Vast engineering standards supplied for this project establish several working principles relevant to future Auth and Home changes:

- Inspect the existing implementation before modifying it.
- Make the smallest change that satisfies the explicit requirement.
- Preserve approved architecture and security invariants.
- Distinguish verified implementation from planned or assumed behavior.
- Do not invent missing repository facts or report tests that were not run.
- Keep business logic, route coordination, presentation and infrastructure responsibilities separated.
- Validate all untrusted inputs at server boundaries.
- Keep secrets server-side.
- Make mutations explicit and report failures rather than silently swallowing them.
- Avoid unnecessary dependencies and speculative abstractions.
- Provide evidence for build, typecheck, lint, unit and E2E claims.
- Preserve clear loading, success and error states in the UI.
- Treat authentication, account linking, identity merging, session revocation and key management as security-sensitive changes requiring explicit verification.

The supplied Application Development Standards document is a broad organizational standard. It is not itself a runtime dependency of Yet Vast Auth or Yet Vast Home. Product-specific auth invariants in this handoff remain more specific and must not be weakened by generic implementation conventions.

---

## 18. Milestone chronology

| Period | Milestone |
|---|---|
| Initial architecture discussions | Established the need for a central Yet Vast identity and a separate auth authority rather than independent app-level identity systems |
| 12 November 2026 | Confirmed Google as persistent identity provider; GitHub-only as optional ephemeral access; explicit GitHub linking as the route to durable association |
| 12 November 2026 | Recorded Yet Vast Home as product hub and first intended consumer of Yet Vast Auth |
| 12 November 2026 | Auth implementation and Home initial UI were reported complete, while live credentials, deployment and end-to-end verification remained |
| 12 November 2026 | Published `@yetvast/auth@0.1.0` and `@yetvast/auth-ui@0.1.0` as private GitHub Packages |
| 12–13 November 2026 | Configured Firebase project/service account, Vercel monorepo deployment and custom auth domain |
| 13 November 2026 | Resolved production configuration errors for auth origin, signing key and enabled identity provider |
| 13 November 2026 | Configured Google OAuth and verified Google sign-in against the deployed service |
| 13–14 November 2026 | Implemented GitHub account linking, collision handling and unlinking safeguards; implementation report stated all automated checks passed |
| 14 November 2026 | Production account page showed successful GitHub linking, two connected providers and active account state |

Dates reflect the conversation and implementation reports available for this handoff. Exact commit timestamps and deployment IDs should be added from GitHub/Vercel if a release-grade audit trail is required.

---

## 19. Final handoff

**What is demonstrably working now:** Yet Vast Auth is deployed at `auth.yetvast.com`; Google sign-in has been exercised; the production account page shows the persistent Yet Vast user ID; and GitHub has now been successfully linked to that same account. The supplied screenshot is direct evidence of the completed linking result.

**What should happen next:** Treat the deployed Auth service as the baseline, verify its remaining security and recovery behaviors, then complete and test Yet Vast Home's integration as the first consumer. Do not broaden scope until that consumer flow is verified.

**What this document deliberately does not cover:** VastAlliance product development, its requirements, architecture, UI, implementation or roadmap.

---

## Appendix A — Key production URLs

| Purpose | URL |
|---|---|
| Yet Vast public homepage | `https://yetvast.com` |
| Yet Vast Auth | `https://auth.yetvast.com` |
| Auth account page | `https://auth.yetvast.com/account` |
| JWKS | `https://auth.yetvast.com/.well-known/jwks.json` |
| Google OAuth callback | `https://auth.yetvast.com/api/oauth/callback/google` |
| GitHub OAuth callback | `https://auth.yetvast.com/api/oauth/callback/github` |
| GitHub OAuth App settings | `https://github.com/settings/developers` |
| GitHub Packages registry | `https://npm.pkg.github.com` |

## Appendix B — Secret handling reminder

This document records environment-variable **names**, not secret values. Do not add any of the following to this file or commit them to Git:

- Google OAuth client secret;
- GitHub OAuth client secret;
- Firebase service-account private key;
- Yet Vast Auth signing private key;
- GitHub Personal Access Token;
- any production session or API secret.

Store and rotate these only through the appropriate secret-management or deployment environment controls.


---

# Latest Milestones and Current State

**Update date: 16 November 2026**

## 20. Consolidated update — 15–16 November 2026

This section extends the chronology and supersedes earlier status claims where explicitly stated.

### 15 November — Yet Vast Auth registration and lifecycle hardening

- Simplified developer application registration around a mandatory primary application URL, mandatory designated App Admin identity, mandatory exact redirect URI(s), optional non-unique display name and server-generated immutable application ID.
- Replaced independent identity-policy checkboxes with a mutually exclusive policy selection:
  - anonymous/ephemeral GitHub-only access without persistent Google identity; or
  - Google persistent Yet Vast identity.
- Kept application review and approval inside Yet Vast Auth. The central control plane is Auth-Admin-only; App Admins do not receive global registry access.
- Added/strengthened application deletion request, soft-deletion tombstone, recovery and audit-history behavior.
- Hardened domain verification persistence and error reporting. Reported fixes include recursive removal of `undefined` values before Firestore writes, stale verification-attempt reconciliation, concurrency conflict responses, event correlation and more useful UI diagnostics.
- Resolved production domain-verification API HTTP 500 issues according to the implementation record. Treat the implementation report as evidence of the code fix; independently verify live behavior before claiming ongoing production health.

### 15 November — Yet Vast Home boundary correction

- Removed the earlier Home-side Auth registration/onboarding direction. Developers register directly through Yet Vast Auth.
- Home's `/admin` is not the global Application List or approval interface. It may remain for Home-specific administration.
- Home continues to consume Auth as a public OAuth client using PKCE and its own host-bound session.
- The Home repository's latest inspected commit is `0c51c7b` (`remove auth registration`, 14 November UTC). The current source retains a Home-specific `/admin` page and a logical application identifier of `yetvast-home`.

### 16 November — Yet Vast Auth application identity resolution

- Production investigation identified a deleted historical registration `yetvast-home` and a newer approved, domain-verified registration instance `www-yetvast-com-6negk210`.
- Root cause: Home continued to send the stable logical ID `yetvast-home`, but Auth performed a direct Firestore document lookup against the old tombstoned registration and returned `APPLICATION_DELETED`.
- Implemented a three-part model:
  - `logicalAppId` — stable consumer-facing application identity;
  - `registrationId` — immutable registration instance;
  - `supersedesApplicationId` — registration succession.
- Added central resolution across authorization, OAuth initiation/continuation/callback and authorization-code issuance/redemption. A valid approved successor can satisfy a logical-ID request, while an explicitly requested deleted registration instance remains blocked.
- Added conflict detection for ambiguous multiple active registrations and preserved predecessor tombstones, audit history and historical ownership.
- Standardized administrative action button semantics and corrected contrast/disabled-state readability using the existing design system and CSS Modules.
- The Auth implementation report records a later full suite of 358 passing tests across 30 test files, with typecheck, lint, format check and production builds passing. An earlier implementation run recorded 353 tests; the later 358-test run supersedes that earlier count for the later source state.
- Production Firestore identity migration remains **pending explicit administrator authorization** in the implementation record. Its dry run was read-only and reported two records requiring identity metadata updates. Do not claim the migration was executed.
- Production deployment of the latest identity-resolution implementation and a live Home OAuth smoke test remain outstanding unless separately confirmed after the recorded implementation report.

### Cogmit and YappOut — current planning context

- Cogmit has been identified as containing an implemented YappOut capability. The product owner requested a reverse-engineering/extraction task to inventory all YappOut functionality and create YappOut as an independent project.
- The intended first step is an extraction specification and dependency map, not an immediate code move.
- Recent discussion also explored GitHub-backed storage and reusable GitHub authorization/storage modules. These are not treated as completed implementation until the relevant current Cogmit branch and code are inspected.
- The checked-in `yvnow/cogmit` `MainCode` branch inspected for this update still documents the earlier Firebase Auth + Google Drive drafts + Firestore publishing architecture and has a latest visible commit dated 26 January 2026. It does not provide source evidence for the newer YappOut implementation.

### Current repository evidence snapshot

| Project | Repository / branch | Latest inspected commit | Evidence status |
|---|---|---|---|
| Yet Vast Home | `yvnow/yvs-illu` / `main` | `0c51c7b` — 14 Nov 2026 | Source inspected; central registration removal confirmed in commit history |
| Yet Vast Auth | `yvnow/yetvast-auth` / `main` | `872e25e` — 16 Nov 2026 | Source and implementation records inspected; production migration/deployment still require confirmation |
| Cogmit | `yvnow/cogmit` / `MainCode` | `9d9fa97` — 26 Jan 2026 | Checked-in baseline is older than recent YappOut/GitHub-storage discussions |

Do not infer that the local Cogmit worktree is identical to the inspected GitHub branch.
