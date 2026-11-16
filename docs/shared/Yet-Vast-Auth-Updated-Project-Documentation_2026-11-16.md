# Yet Vast Auth --- Current Architecture and Implementation Update

**Update date:** 16 November 2026\
**Purpose:** Authoritative update to the earlier consolidated Yet Vast
Auth and Yet Vast Home project history.\
**Scope:** Yet Vast Auth only, including the central application
registry, application approval, administrator bootstrap, administrative
access control, deployment posture, and next steps for Yet Vast Home.

> **Document precedence:** This update records the latest implementation
> decisions and evidence available as of 14 November 2026. Where an
> earlier section below conflicts with this update, this update takes
> precedence. In particular, the Central Application Registry is now an
> Auth-Admin-only control plane. The earlier description of App Admins
> registering applications through `/admin` is superseded.

------------------------------------------------------------------------

## 1. Current Executive Status

Yet Vast Auth is the central identity and authentication authority for
applications in the Yet Vast Solutions ecosystem. It is deployed at
`https://auth.yetvast.com` and uses Vercel for application hosting and
Firebase/Cloud Firestore for central persistence.

The system has progressed beyond an isolated authentication proof of
concept. It now includes a central application registry and approval
lifecycle, public-client OAuth with PKCE, central administrator
authorization, and a protected administrative interface.

### 1.1 Current verified or implementation-reported state

  --------------------------------------------------------------------------
  Capability           Current status       Evidence / qualification
  -------------------- -------------------- --------------------------------
  Yet Vast Auth        Deployed             Production domain
  production                                `auth.yetvast.com` is accessible
  deployment                                

  Google persistent    Implemented and      Account page screenshot shows
  identity             production exercised active identity and linked
                                            Google account

  GitHub account       Implemented and      Account page screenshot shows
  linking              production exercised GitHub and Google connected to
                                            the same Yet Vast identity

  Central Firestore    Implemented          `applications` collection
  application registry                      through server-side Firestore
                                            store

  Application          Implemented          Shared contracts and Zod schema
  registration schema                       in `packages/auth`
  and validation                            

  Application approval Implemented          `PENDING`, `APPROVED`,
  lifecycle                                 `REJECTED`, `SUSPENDED`

  Auth Admin registry  Implemented and      `/admin` displays one approved
  dashboard            production UI        application, `Yet Vast Auth`
                       observed             (`auth-server`)

  Auth Admin bootstrap Implemented          Server-side allowlist via
                                            `YETVAST_AUTH_ADMIN_USER_IDS`;
                                            exact production value must be
                                            configured and kept secret from
                                            documentation

  Registry navigation  Implemented          Registry link is shown only to a
  visibility                                server-validated Auth Admin

  `/admin` route       Implemented          Server-side admin layout and
  authorization                             page checks

  Registry API         Implemented          Administrative API routes use
  authorization                             `requireAuthAdmin()`

  Public OAuth client  Implemented          Consumer static client secret is
  / PKCE                                    optional for public clients;
                                            PKCE S256 is required

  Approval enforcement Implemented          Application status and policy
  in OAuth                                  checked during authorization and
                                            code redemption

  Automated            Reported passed      91 unit tests, 12 Playwright E2E
  verification                              tests, typecheck, lint, format
                                            and monorepo build

  Yet Vast Home        Local integration    Separate Home project report
  integration          previously reported  states local integration
                                            completed; Home deployment and
                                            live production flow are not
                                            established by the Auth registry
                                            screenshots

  Production capacity  Requires ongoing     Paid plans are available; scale
  and operational      work                 testing, monitoring,
  readiness                                 backup/restore, rate limits and
                                            operational procedures remain
                                            explicit responsibilities
  --------------------------------------------------------------------------

The verification figures above are taken from the implementation reports
available for this handoff. They are not a substitute for rerunning
checks against the exact current commit.

### 1.2 Current production UI observations

The supplied production screenshots dated 14 November 2026 show:

1.  `/account` displays the persistent account profile, the Yet Vast
    user ID `yvnowyv`, Google and GitHub linked accounts, active
    sessions, and account recovery-code controls.
2.  The Authority Home page displays the central identity authority and
    authentication policy.
3.  `/admin` displays the Central Application Registry with the
    `Auth Admin` badge and one approved application:
    -   Application name: `Yet Vast Auth`
    -   Application ID: `auth-server`
    -   Status: `APPROVED`

These screenshots establish that the corresponding pages are accessible
and render the shown data in production. They do not, by themselves,
prove every backend security property; those are supported by
implementation and test reports and should continue to be verified.

------------------------------------------------------------------------

## 2. Product and Infrastructure Position

### 2.1 Yet Vast Auth is shared YVS infrastructure

Yet Vast Auth is not merely a login page for Yet Vast Home. It is a
central identity authority intended to serve multiple independent YVS
applications.

Its responsibilities include:

-   persistent Yet Vast identity;
-   external identity-provider authentication;
-   explicit provider account linking;
-   central application registration and approval;
-   authorization-code issuance and redemption;
-   signed identity assertions and public-key publication;
-   central account and session-management capabilities;
-   application-specific authentication policy enforcement.

Each consumer application remains responsible for its own product
authorization and its own host-bound application session.

### 2.2 Current hosting choices are scalable starting infrastructure

Current hosting and persistence choices:

  -----------------------------------------------------------------------
  Layer                   Current technology      Growth path
  ----------------------- ----------------------- -----------------------
  Web application / API   Vercel                  Upgrade from Hobby to
  hosting                                         Pro or Enterprise as
                                                  usage, collaboration,
                                                  support and deployment
                                                  requirements grow

  Central persistence     Firebase / Cloud        Upgrade from Spark to
                          Firestore               Blaze pay-as-you-go;
                                                  monitor and optimize
                                                  reads, writes, storage
                                                  and network usage

  Authentication          Google OAuth and GitHub Retain central provider
  providers               OAuth                   integration; review
                                                  provider quotas,
                                                  policies and credential
                                                  management as adoption
                                                  grows

  Signing                 Ed25519/EdDSA and JWKS  Maintain key custody,
                                                  rotation, overlapping
                                                  public keys and
                                                  verification
                                                  compatibility

  Shared packages         `@yetvast/auth`,        Version, test and
                          `@yetvast/auth-ui`      publish through
                                                  controlled package
                                                  release workflows
  -----------------------------------------------------------------------

The use of free tiers during early development does not make the
architecture a disposable POC. Vercel and Firebase provide paid tiers
that can support production workloads. Moving to a paid tier does not
itself guarantee scalability: performance, cost, reliability and
security depend on application design and operational controls.

### 2.3 Scale-readiness principles

As user and application volume increases, evaluate:

-   request volume, concurrency and function execution duration;
-   Firestore read/write volume, indexes, document contention and query
    patterns;
-   regional placement and latency;
-   provider quotas and OAuth rate limits;
-   rate limiting and abuse protection;
-   caching only where it does not weaken authorization or revocation
    semantics;
-   structured logging, metrics, alerting and error tracking;
-   Firestore backup, restore and disaster-recovery procedures;
-   signing-key rotation and incident response;
-   staging/production separation;
-   cost budgets, usage alerts and per-feature cost attribution;
-   load and soak testing before material traffic increases.

Do not introduce distributed infrastructure, queues, microservices or a
database migration solely in anticipation of hypothetical scale.
Introduce them when measured load, reliability requirements or product
needs justify them.

------------------------------------------------------------------------

## 3. Central Application Registry

### 3.1 Purpose and authority

The Central Application Registry is the authoritative record of which
applications may use Yet Vast Auth.

The registry is stored in the Firebase project used by Yet Vast Auth, in
the Firestore `applications` collection. Production reads and writes are
performed by the Auth server through the Firebase Admin SDK.

Application approval is a security boundary. A consumer application
cannot grant itself approval by changing client-side configuration,
request payloads, hostnames or environment variables.

### 3.2 Application record

The implemented contract includes the following fields (optional fields
are conditional):

``` ts
type CanonicalApplicationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

interface ApplicationRegistration {
  applicationId: ApplicationId;
  applicationName: string;
  description?: string;
  adminUserId: YvUserId;
  status: CanonicalApplicationStatus;
  allowedRedirectUris: string[];
  enabledProviders: ProviderId[];
  allowEphemeralGithub: boolean;
  requirePersistentIdentity: boolean;
  clientSecretHash?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: YvUserId;
  rejectionReason?: string;
}
```

The actual source contract is authoritative if it evolves. Do not
duplicate this interface in consumer projects; use the shared package
contract.

### 3.3 Validation and integrity

The implementation report records these controls:

-   application IDs are normalized lowercase alphanumeric/hyphen
    identifiers with a constrained length and syntax;
-   reserved system identifiers are rejected to prevent namespace
    collisions or hijacking;
-   production redirect URIs require HTTPS;
-   localhost and loopback HTTP exceptions are limited to local
    development;
-   redirect URI fragments are rejected;
-   provider settings are validated against supported provider policy;
-   Google persistent identity is the default;
-   enabling ephemeral GitHub access automatically includes GitHub in
    the allowed provider set;
-   `adminUserId` is derived from the authenticated server-side Yet Vast
    identity, not trusted from the request body;
-   creation and update timestamps are generated server-side;
-   privileged status and review fields cannot be set by an untrusted
    consumer.

### 3.4 Lifecycle

The registry uses four statuses:

  -----------------------------------------------------------------------
  Status                  Meaning                 Authentication effect
  ----------------------- ----------------------- -----------------------
  `PENDING`               Submitted but not       Blocked
                          approved                

  `APPROVED`              Authorized to use Yet   Permitted, subject to
                          Vast Auth               redirect and provider
                                                  policy

  `REJECTED`              Registration request    Blocked
                          rejected                

  `SUSPENDED`             Previously registered   Blocked
                          application temporarily 
                          disabled                
  -----------------------------------------------------------------------

Expected transitions:

-   New registration → `PENDING`
-   `PENDING` → `APPROVED` or `REJECTED`
-   `APPROVED` → `SUSPENDED`
-   `SUSPENDED` → `APPROVED` through explicit restoration
-   Rejection and restoration behavior must follow the implemented
    transition validation; do not allow arbitrary client-selected status
    changes.

The registry records reviewer identity and review timestamps for
approval/rejection operations. Rejection requires a meaningful reason.

------------------------------------------------------------------------

## 4. Administrative Roles and Trust Model

There are three conceptual roles. This is intentionally a small model,
not a general-purpose enterprise IAM system.

### 4.1 Yet Vast Auth Admin

The central Auth Admin controls the registry and the Auth service's
application approval decisions.

Capabilities:

-   view all registered applications;
-   view registry totals and status filters;
-   inspect application registration details;
-   approve or reject registrations;
-   suspend or restore applications;
-   designate an application's App Admin during registration or
    management where supported;
-   access the Central Application Registry.

The initial production Auth Admin is the account controlled by
`yetvastsolutions@gmail.com`. Authorization is bound to the account's
immutable Yet Vast user ID, not merely to its Google email or display
name.

### 4.2 Yet Vast App Admin

An App Admin is the person responsible for a particular child
application.

Conceptual responsibilities:

-   request registration for their application;
-   view the registration status of their own application;
-   respond to rejection feedback;
-   manage only those application settings explicitly delegated to them.

An App Admin is not a central Auth Admin. App Admin status must never
grant access to the global registry, global metrics, approval operations
or another application's private registration data.

**Current implementation boundary:** The latest security change
restricts `/admin` and `/api/admin/*` to Auth Admins. A separate App
Admin developer/application-management portal is not established by the
supplied latest evidence. Do not describe the `/admin` area as an App
Admin portal.

### 4.3 Yet Vast App User

An ordinary end user of a registered application.

-   Can authenticate through an application only while its registry
    status is `APPROVED`.
-   Cannot view or manage the central registry.
-   Cannot approve, reject, suspend or restore applications.
-   Does not gain App Admin or Auth Admin privileges through ordinary
    sign-in.

### 4.4 Initial Auth Admin bootstrap

The central administrator is configured through the server-only
environment variable:

`YETVAST_AUTH_ADMIN_USER_IDS`

The variable accepts a comma-separated list of immutable `yvUserId`
values. The production value must be the actual `yvUserId` belonging to
the Google account `yetvastsolutions@gmail.com`.

Operational procedure:

1.  Sign in to Yet Vast Auth using `yetvastsolutions@gmail.com`.
2.  Retrieve the immutable Yet Vast user ID from the authenticated
    account.
3.  Add `YETVAST_AUTH_ADMIN_USER_IDS` to the Vercel project hosting
    `auth.yetvast.com`.
4.  Set its value to the exact user ID (or comma-separated IDs for
    additional trusted central administrators).
5.  Apply it to the intended deployment environment, normally
    Production.
6.  Redeploy so the server runtime receives the updated environment.
7.  Sign in again and verify `/admin` is accessible and the UI
    identifies the account as `Auth Admin`.

Do not put the production ID in source code, public documentation,
browser variables or a client-side role field.

The implementation report also records `YETVAST_AUTH_ADMIN_EMAILS` and
non-production/test fallback identities. Production authorization should
use the immutable user-ID allowlist as the authoritative mechanism.
Verify that development/test fallback identities cannot grant access in
production. Missing or empty production configuration must fail closed.

### 4.5 Authentication versus authorization

These are distinct:

-   Google OAuth proves control of the external Google account.
-   The Yet Vast identity maps that account to a stable central
    `yvUserId`.
-   The administrator allowlist designates which central identity has
    Auth Admin authority.
-   The server validates the active session and identity.
-   `requireAuthAdmin()` enforces authorization on privileged requests.

There is no separate administrator password or administrator login
provider.

------------------------------------------------------------------------

## 5. Administrative Interface and Access Restrictions

### 5.1 Central registry location

The central dashboard is hosted by Yet Vast Auth:

-   `/admin`
-   `/admin/applications/register`
-   `/admin/applications/[appId]`

It is not hosted in Vercel's dashboard or Firebase Console. Those remain
infrastructure administration tools, not the routine
application-registration interface.

### 5.2 Auth-Admin-only visibility

The following navigation visibility rules are implemented:

  -------------------------------------------------------------------------
  Location      Auth Admin    App Admin     Retail user   Unauthenticated
                                                          visitor
  ------------- ------------- ------------- ------------- -----------------
  Authority     Visible       Hidden        Hidden        Hidden
  Home `/` ---                                            
  Application                                             
  Registry link                                           

  Account       Visible       Hidden        Hidden        Hidden
  `/account`                                              
  ---                                                     
  Application                                             
  Registry link                                           

  `/admin`      Allowed       Denied        Denied        Sign-in required
  route                                                   / denied
  hierarchy                                               

  Global        Allowed       Denied        Denied        Unauthorized
  registry APIs                                           
  -------------------------------------------------------------------------

The Application Registry link is not merely disabled for ordinary users;
it is omitted from their UI.

### 5.3 Server-side enforcement

The latest access-control implementation includes:

-   `apps/auth-server/src/app/admin/layout.tsx` as a server-side
    boundary for the `/admin` route hierarchy;
-   server-side checks on individual administrative pages as defense in
    depth;
-   `requireAuthAdmin()` on administrative API endpoints;
-   server-validated Auth Admin status when rendering the Authority Home
    and Account navigation.

Unauthenticated requests are rejected as unauthenticated (HTTP 401 for
APIs). Authenticated non-admin users are rejected as forbidden (HTTP 403
for APIs). The page-level experience may render a sign-in-required or
access-restricted screen.

The server is the security boundary. Hiding a link in React is not
authorization.

### 5.4 Administrative API coverage

The implementation report identifies the following protected operations:

-   list and create application records through the administrative
    registry API;
-   retrieve application details;
-   approve;
-   reject;
-   suspend;
-   restore.

All such operations must independently enforce Auth Admin authorization.
Direct API requests must not bypass the UI restriction.

### 5.5 Current App Admin onboarding boundary

The implementation evolved from an initial design in which App Admins
would register applications under `/admin`. That design was superseded
because the global registry must remain private.

Current rule:

-   `/admin` is exclusively for Yet Vast Auth Admins.
-   An App Admin must not be shown the global registry.
-   A separate App Admin entry point and onboarding flow must be
    implemented before child application owners can self-serve
    registration.
-   The initial application bootstrap/designation process must avoid
    circular dependency: the app needs an assigned owner before it can
    request approval, but it cannot become an approved consumer before
    review.
-   For the first application, the Auth Admin can designate the App
    Admin through a trusted central administrative operation. Do not add
    extra statuses or a complex invitation/organization system without a
    concrete requirement.

------------------------------------------------------------------------

## 6. OAuth Application Approval Enforcement

The registry is enforced at multiple points in the OAuth lifecycle.

### 6.1 Authorization request

The authorization flow loads the application record from the central
registry. It must reject:

-   unknown application IDs;
-   `PENDING` applications;
-   `REJECTED` applications;
-   `SUSPENDED` applications.

Only `APPROVED` applications proceed, and then only with a registered
redirect URI and enabled provider.

### 6.2 Provider initiation

The provider-start route checks:

-   application exists;
-   application is approved;
-   redirect URI is explicitly allowlisted;
-   requested provider is enabled;
-   provider/identity policy is consistent with the registry.

Client-supplied parameters must not override the registry's application
name, approval state, redirect allowlist, enabled providers or identity
policy.

### 6.3 Callback and authorization-code issuance

The OAuth callback validates transaction state and rechecks that the
application remains approved before issuing an authorization code.

### 6.4 Token/code redemption

The token exchange validates:

-   authorization code exists;
-   code has not expired;
-   code has not previously been redeemed;
-   PKCE verifier matches the stored S256 challenge;
-   redirect URI matches the transaction;
-   code is bound to the correct application;
-   application remains approved at redemption time.

The final status recheck prevents an application suspended after the
user began sign-in from redeeming a previously issued code.

### 6.5 Public clients and static consumer secrets

Consumer applications use Authorization Code Flow with PKCE S256. The
static consumer client secret previously proposed for Yet Vast Home
(`YETVAST_HOME_CLIENT_SECRET` or equivalent) is not required for
public-client code exchange when the application registration has no
`clientSecretHash`.

This does **not** mean all secrets are removed. Central provider
secrets, Firebase service credentials and signing private keys remain
server-side secrets and must be protected.

PKCE protects the authorization-code transaction against interception.
It is not proof of the consumer backend's identity and must not be
described as server authentication.

------------------------------------------------------------------------

## 7. Identity, Provider Policy and Sessions

The existing identity and session architecture remains in force.

### 7.1 Google persistent identity

Google is the default persistent identity provider. Successful Google
sign-in resolves or creates a central Yet Vast identity and stable
`yvUserId`.

### 7.2 GitHub linking and ephemeral access

GitHub has two distinct uses:

-   explicit account linking while authenticated to an existing
    persistent Yet Vast identity;
-   optional ephemeral GitHub access only where the application's
    approved registration explicitly enables it.

No automatic account merge occurs because two providers report the same
email. Provider subject identifiers and explicit authenticated linking
govern account association.

### 7.3 Session ownership

Yet Vast Auth owns the central identity and its provider mappings. Each
consuming application owns its own host-bound session.

No wildcard `.yetvast.com` session cookie is used. Consumer session
cookies must be HTTP-only, secure in production, appropriately
SameSite-scoped, and host-bound.

### 7.4 Signed identity assertions

Yet Vast Auth signs identity assertions using asymmetric signing.
Consumers verify assertions against the published JWKS:

`https://auth.yetvast.com/.well-known/jwks.json`

Private signing keys remain on the Auth server. Public keys may be
distributed for verification.

### 7.5 Account portal

The production account page currently exposes:

-   persistent account identity and status;
-   linked external accounts;
-   link/unlink controls;
-   active session listing;
-   individual session sign-out;
-   sign-out-all-devices;
-   recovery-code status and generation.

The screenshot shows zero remaining recovery codes. The presence of a
recovery-code UI is not proof that a complete recovery journey has been
tested. Recovery generation, one-time use, rotation, account recovery
and session revocation require explicit verification.

------------------------------------------------------------------------

## 8. Repository and Package Boundaries

The established monorepo structure is:

``` text
yetvast-auth/
├── apps/
│   ├── auth-server/
│   └── auth-playground/
├── packages/
│   ├── auth/
│   └── auth-ui/
├── docs/
├── e2e/
└── ...
```

Responsibilities:

-   `apps/auth-server`: central OAuth service, identity authority,
    application registry, administrative authorization, server-side
    Firestore operations and public JWKS.
-   `apps/auth-playground`: development/testing playground; it is not
    the production authority.
-   `packages/auth`: shared types, schemas, contracts and client/server
    integration utilities.
-   `packages/auth-ui`: reusable authentication UI components and design
    tokens.
-   `docs`: architecture, application registry, operational and
    integration documentation.
-   `e2e`: browser-level end-to-end tests.

Published package versions recorded in the earlier implementation
handoff:

-   `@yetvast/auth@0.1.0`
-   `@yetvast/auth-ui@0.1.0`

Verify the actual current package versions and release state before
publishing another version.

Privileged Firestore access, application approval authority and
administrator authorization remain server-side. A consumer browser must
not receive Firebase Admin credentials or privileged registry mutation
functions.

------------------------------------------------------------------------

## 9. Verification Record for Registry and Access-Control Work

The implementation report dated 14 November 2026 records the following
checks after the registry and access-control changes:

  ---------------------------------------------------------------------
  Check                              Reported result
  ---------------------------------- ----------------------------------
  Monorepo typecheck                 Passed across 4 workspaces

  Unit tests                         91 / 91 passed

  Lint                               Passed, 0 errors and 0 warnings

  Formatting                         Passed after running formatter and
                                     rechecking

  Monorepo build                     Passed across 4 workspaces

  Playwright E2E                     12 / 12 passed

  Admin API authorization tests      30 cases reported within the Auth
                                     Admin test work

  Production deployment              Not automatically performed by the
                                     implementation task
  ---------------------------------------------------------------------

The E2E lifecycle test was expanded to cover an unauthenticated visitor,
a non-admin retail user, Auth Admin approval and retail authorization.
The final report states that all 12 Playwright tests passed.

**Verification discipline:** These are implementation-reported results,
not independently rerun in this document. Future release records should
include the exact Git commit SHA, deployment ID, command output and
environment tested. Mock-provider tests do not prove live third-party
OAuth operation.

------------------------------------------------------------------------

## 10. Implementation Areas and Files

The following paths were identified in the implementation reports.
Confirm exact current paths before making subsequent edits.

### 10.1 Registry contracts and storage

-   `packages/auth/src/applications/contracts.ts`
-   `packages/auth/src/applications/schema.ts`
-   application registry store/service modules in `packages/auth`
-   Firestore production adapter through `FirestoreAuthStore`

### 10.2 Administrator authority and HTTP guards

-   `apps/auth-server/src/lib/authority.ts`
-   `apps/auth-server/src/lib/http.ts`

Key functions:

-   `isAuthAdmin(...)`
-   `requireAppAdmin(...)`
-   `requireAuthAdmin(...)`

### 10.3 Administrative pages

-   `apps/auth-server/src/app/admin/layout.tsx`
-   `apps/auth-server/src/app/admin/page.tsx`
-   `apps/auth-server/src/app/admin/applications/register/page.tsx`
-   `apps/auth-server/src/app/admin/applications/[appId]/page.tsx`

### 10.4 Admin API routes

-   `apps/auth-server/src/app/api/admin/applications/route.ts`
-   `apps/auth-server/src/app/api/admin/applications/[appId]/route.ts`
-   approval, rejection, suspension and restoration action routes
    beneath the application API hierarchy

### 10.5 Conditional navigation

-   `apps/auth-server/src/app/page.tsx`
-   `apps/auth-server/src/app/account/page.tsx`
-   `apps/auth-server/src/components/AccountClient.tsx`

### 10.6 Tests and documentation

-   `apps/auth-server/tests/auth-admin.test.ts`
-   `e2e/auth-flows.spec.ts`
-   `docs/APPLICATION_REGISTRY.md`

The latest access-control report states that the global registry link is
hidden from non-admins on both Authority Home and Account pages, the
`/admin` hierarchy is protected by a server component layout, and all
`/api/admin/*` operations require Auth Admin authorization.

------------------------------------------------------------------------

## 11. Deployment and Environment Configuration

### 11.1 Deployment model

-   Production Auth origin: `https://auth.yetvast.com`
-   Hosting: Vercel
-   Persistence: Firebase / Cloud Firestore
-   Runtime Firebase access: Firebase Admin SDK, server-side only
-   Custom domain: `auth.yetvast.com`

### 11.2 Environment-variable handling

Environment variable names may be documented; secret values must not be
included.

The registry/admin work introduces or relies on:

-   `YETVAST_AUTH_ADMIN_USER_IDS` --- comma-separated immutable Yet Vast
    user IDs authorized as central Auth Admins.
-   `YETVAST_AUTH_ADMIN_EMAILS` --- legacy/additional verified-email
    bootstrap support recorded by the implementation; production policy
    should prefer immutable user IDs and avoid email-only authority.
-   existing Auth origin, OAuth provider credentials, Firebase
    service-account configuration and signing-key configuration.

The exact environment-variable inventory must be reconciled with the
current `.env.example` and runtime config module before release. Never
infer variable names or values from old deployment notes if the current
source differs.

### 11.3 Production configuration checklist

-   [ ] `YETVAST_AUTH_ADMIN_USER_IDS` contains the actual immutable
    `yvUserId` for `yetvastsolutions@gmail.com`.
-   [ ] No development/test fallback identity can authorize production.
-   [ ] Admin allowlist is server-only and is not exposed through
    `NEXT_PUBLIC_*`.
-   [ ] Firebase Admin service credentials are server-only.
-   [ ] OAuth client secrets remain server-only.
-   [ ] Signing private key remains server-only.
-   [ ] Redirect URI allowlists match the actual consumer configuration.
-   [ ] Production and non-production configuration are separated.
-   [ ] A redeployment has loaded any changed Vercel environment
    variables.
-   [ ] Direct unauthorized route and API access has been tested against
    production using a non-admin account.

------------------------------------------------------------------------

## 12. Yet Vast Home Integration --- Current Boundary

Yet Vast Home (`https://yetvast.com`) is the first intended consumer
application. Its repository is recorded as `yetvastsolutions/yvs-illu`.

An earlier local integration report states that Home installed:

-   `@yetvast/auth@0.1.0`
-   `@yetvast/auth-ui@0.1.0`

It also records local implementation of PKCE login, callback exchange,
JWKS assertion verification, Home-owned host-bound sessions, account
APIs, logout and UI integration.

However, the same report explicitly states that Yet Vast Home had not
been deployed. A later implementation report describes the Home
integration as a future phase. Therefore, current Home integration state
must be verified directly from the latest Home repository and deployment
before claiming it is production complete.

The Home integration must eventually:

1.  use the approved `yetvast-home` application registration;
2.  use exact registered callback URI(s);
3.  use the public-client PKCE flow without a static consumer secret;
4.  verify the central assertion server-side against JWKS;
5.  create a Home-owned host-bound session;
6.  preserve Google persistent identity as the default;
7.  avoid changing the homepage/product directory unnecessarily;
8.  reject authentication if the central application is pending,
    rejected or suspended.

Do not change the Home repository as part of an Auth-only documentation
or hardening task unless explicitly requested.

------------------------------------------------------------------------

## 13. Decisions and Invariants to Preserve

1.  Yet Vast Auth is the central identity authority for YVS
    applications.
2.  The central application registry is the source of truth for
    application approval and OAuth policy.
3.  Only `APPROVED` applications may authenticate.
4.  Approval is checked at authorization initiation and code redemption.
5.  Consumer applications use Authorization Code Flow with PKCE S256.
6.  Consumer static client secrets are not required for public clients.
7.  Central provider credentials, Firebase Admin credentials and signing
    private keys remain protected server-side.
8.  Google is the default persistent identity provider.
9.  GitHub linking is explicit; no automatic email-based identity merge.
10. Consumer applications own their host-bound sessions.
11. The global Application Registry is exclusively for verified Yet Vast
    Auth Admins.
12. App Admin status does not imply Auth Admin status.
13. UI hiding is not a substitute for server-side authorization.
14. Registry APIs must independently enforce Auth Admin authorization.
15. Production administrator authority is rooted in a server-side
    immutable-user-ID allowlist.
16. Missing production admin configuration must fail closed.
17. Firestore Admin operations remain server-side.
18. YVS standards are development references, not runtime dependencies.
19. Do not add speculative IAM, organization hierarchy, billing or
    marketplace functionality.
20. Do not report a deployment, live OAuth test or production behavior
    as verified unless there is direct evidence.

------------------------------------------------------------------------

## 14. Next Work --- Recommended Sequence

### Phase 1 --- Freeze the Auth baseline

-   Record the current Auth Git commit SHA and Vercel deployment ID.
-   Reconcile `.env.example`, runtime config and actual Vercel
    environment variable names.
-   Confirm the production Auth Admin allowlist is configured with the
    correct immutable `yvUserId`.
-   Verify production admin and non-admin access using separate
    accounts.
-   Verify every `/api/admin/*` endpoint rejects non-admin access.
-   Capture the exact output of current build, typecheck, lint, unit and
    E2E checks.

### Phase 2 --- Operational readiness

-   Establish staging and production Firebase separation if not already
    present.
-   Configure Firestore backup and restore procedures.
-   Add usage and cost monitoring for Vercel and Firebase.
-   Add rate limiting and abuse protection for authentication and
    account-management endpoints.
-   Establish signing-key rotation and incident response procedures.
-   Confirm logging redacts tokens, secrets and unnecessary personal
    data.
-   Define capacity thresholds and load-test scenarios based on expected
    usage.

### Phase 3 --- App Admin onboarding

-   Define the minimal App Admin entry point separate from `/admin`.
-   Ensure an Auth Admin can designate the initial owner of an
    application.
-   Ensure the designated App Admin can request registration and view
    only their own app's status.
-   Keep approval decisions exclusively with the Auth Admin.
-   Avoid new roles, organization structures or invitation workflows
    unless required by a real product use case.

### Phase 4 --- Yet Vast Home integration

-   Inspect the current Home repository and deployment state.
-   Confirm `yetvast-home` registration, allowed callback URIs and
    provider policy.
-   Remove any obsolete `YETVAST_HOME_CLIENT_SECRET` dependency if
    present.
-   Verify PKCE login, callback, assertion verification and Home-owned
    session.
-   Test sign-out, expiry and rejected/suspended application behavior.
-   Perform live production OAuth verification only after configuration
    is confirmed.

### Phase 5 --- Controlled platform growth

As additional YVS applications adopt Yet Vast Auth:

-   onboard each through the central registry;
-   assign an App Admin;
-   review exact redirect URIs and provider policy;
-   approve explicitly;
-   publish and pin compatible SDK versions;
-   monitor traffic, error rates, Firestore usage and hosting cost;
-   scale plans and infrastructure based on measured requirements.

------------------------------------------------------------------------

## 15. Release and Change Record

### 14 November 2026 --- Application Registry and administrative boundary

-   Implemented central Firestore application registry.
-   Added four-state application approval lifecycle.
-   Added server-side registration validation and immutable owner
    identity.
-   Added central Auth Admin dashboard and application review actions.
-   Enforced application approval during OAuth initiation and code
    redemption.
-   Removed the requirement for static consumer client secrets for
    public-client PKCE exchange.
-   Configured Auth Admin authorization through server-side allowlist
    support.
-   Restricted `/admin` route hierarchy to verified Auth Admins.
-   Restricted all administrative registry APIs to verified Auth Admins.
-   Hid Application Registry navigation from non-admin users on
    Authority Home and Account pages.
-   Added tests for admin API access control and expanded E2E lifecycle
    coverage.
-   Implementation report recorded 91/91 unit tests and 12/12 Playwright
    tests passing, plus successful typecheck, lint, formatting and
    build.
-   No automatic deployment was performed by the implementation task.

### Existing production account evidence --- 14 November 2026

-   Account page showed active Yet Vast identity `yvnowyv`.
-   Google and GitHub were both shown as linked and verified.
-   Account page showed one active session.
-   Authority Home showed the central identity authority and provider
    policy.
-   `/admin` showed the Auth Admin interface and one approved
    application, `auth-server`.

------------------------------------------------------------------------

## Appendix C --- Key URLs

  ----------------------------------------------------------------------------------
  Purpose                     URL
  --------------------------- ------------------------------------------------------
  Yet Vast public homepage    `https://yetvast.com`

  Yet Vast Auth               `https://auth.yetvast.com`

  Auth account page           `https://auth.yetvast.com/account`

  Auth Admin registry         `https://auth.yetvast.com/admin`

  JWKS                        `https://auth.yetvast.com/.well-known/jwks.json`

  Google OAuth callback       `https://auth.yetvast.com/api/oauth/callback/google`

  GitHub OAuth callback       `https://auth.yetvast.com/api/oauth/callback/github`
  ----------------------------------------------------------------------------------

------------------------------------------------------------------------

## Appendix D --- Secret and Sensitive Configuration Policy

Never commit or place in this documentation:

-   Google OAuth client secret;
-   GitHub OAuth client secret;
-   Firebase service-account private key;
-   Yet Vast Auth signing private key;
-   GitHub Personal Access Token;
-   production session tokens or cookies;
-   private administrator configuration values;
-   any other production credential.

Document variable names and setup procedures only. Store actual values
in Vercel environment variables or the relevant secret-management
system.

------------------------------------------------------------------------

## Appendix E --- Source Documents Used for This Update

This update consolidates the earlier
`Yet-Vast-Auth-and-Home-Project-History.md` handoff with the 14 November
2026 implementation reports covering:

-   Central Application Registry and approval lifecycle;
-   Auth Admin bootstrap and route/API authorization;
-   navigation visibility restrictions;
-   automated verification results;
-   production UI screenshots and observations.

Where reports describe implementation rather than independently verified
live behavior, this document preserves that distinction.

------------------------------------------------------------------------

# Earlier Consolidated Project History (Retained Reference)

# Yet Vast Auth & Yet Vast Home

## Consolidated Project History, Architecture, Implementation Record, and Next-Step Handoff

**Document date:** 14 November 2026\
**Scope:** Yet Vast Auth and Yet Vast Home only\
**Explicit exclusion:** VastAlliance development discussions and
product-specific implementation are intentionally excluded.\
**Status:** Yet Vast Auth is deployed at `https://auth.yetvast.com`;
Google sign-in and GitHub account linking have been demonstrated
successfully in the production account UI. Yet Vast Home is the intended
first consumer/product hub; its current implementation and integration
status are recorded separately below.

------------------------------------------------------------------------

## 1. Executive summary

The work established a central identity service for the Yet Vast product
ecosystem rather than implementing independent authentication systems
inside every product.

The central service is **Yet Vast Auth**, hosted at:

-   `https://auth.yetvast.com`
-   Vercel-assigned deployment domain: `https://yetvast-auth.vercel.app`

Its responsibility is to establish and manage a persistent Yet Vast
identity, authenticate users through approved identity providers, expose
public verification material, and let registered Yet Vast applications
obtain their own application-scoped sessions.

The first persistent identity provider is Google. A Google sign-in
creates or retrieves a persistent Yet Vast identity stored centrally in
Firestore. GitHub can be explicitly linked to an existing Google-backed
identity. GitHub-only access, where an individual application is
permitted to offer it, is an ephemeral/application-specific pathway and
does not silently create a permanent central Yet Vast identity.

The implementation uses OAuth authorization-code flows with PKCE and
state/nonce protections, short-lived single-use authorization codes,
server-to-server exchange, application-owned sessions, and asymmetric
signing. The central signing private key remains on the auth server;
applications verify signed assertions using public keys published
through JWKS.

The latest production screenshot provides direct user-interface evidence
that GitHub linking succeeded: the account page displays **"Successfully
linked your GitHub account"**, shows **2 connected** providers, and
lists both GitHub and Google as linked with verified email. The account
remains active under user ID `yvnowyv`. The screenshot also shows one
active session, associated with Google / `auth-server`, and zero
remaining account recovery codes.

This is a meaningful milestone: central Google identity creation,
production account access, and explicit GitHub account linking have all
reached a visible successful state. The next phase should be a
controlled integration and end-to-end verification of Yet Vast Home as
the first consumer, followed by operational hardening and documentation
of the stable integration contract.

------------------------------------------------------------------------

## 2. Product and naming context

### 2.1 Public naming

The public product/brand name is **Yet Vast**.

The authentication service is **Yet Vast Auth**. The product hub is
**Yet Vast Home**.

The organizational umbrella and engineering standards context may use
the name **Yet Vast Solutions** internally. Public-facing application
branding should use **Yet Vast**, not "Yet Vast Solutions", unless a
specific legal or organizational context requires the longer name.

### 2.2 Products and services in scope

  ---------------------------------------------------------------------
  Name                               Role in this project
  ---------------------------------- ----------------------------------
  Yet Vast Auth                      Central identity authority and
                                     authentication service

  Yet Vast Home                      Product hub and intended first
                                     consumer of Yet Vast Auth

  `@yetvast/auth`                    Shared authentication integration
                                     package

  `@yetvast/auth-ui`                 Shared authentication UI package
  ---------------------------------------------------------------------

Other Yet Vast products were discussed as potential consumers of the
central identity service. Their product-specific development is outside
this document.

### 2.3 Domain and repository identifiers

  Item                               Value
  ---------------------------------- -------------------------------------
  Public homepage                    `https://yetvast.com`
  Central auth origin                `https://auth.yetvast.com`
  Auth repository                    `yetvast/yetvast-auth`
  GitHub Packages registry           `https://npm.pkg.github.com`
  Auth server app path in monorepo   `apps/auth-server`
  Shared package paths               `packages/auth`, `packages/auth-ui`
  Playground app path                `apps/auth-playground`

The repository is a monorepo with the auth server, shared packages, and
a playground. Vercel's Root Directory is configured as
`apps/auth-server`, with access to files outside that directory enabled
so the workspace packages can be built.

------------------------------------------------------------------------

## 3. Original architectural objective

The underlying objective was to create one shared Yet Vast identity
rather than allowing every application to independently create and
manage unrelated user identities.

The intended identity lifecycle is:

1.  A user authenticates with an approved provider at Yet Vast Auth.
2.  Yet Vast Auth resolves or creates the central Yet Vast identity.
3.  The central identity and provider relationship are stored in the
    central identity store.
4.  A registered application initiates its own authentication
    transaction with Yet Vast Auth.
5.  The user authenticates centrally and is returned to the requesting
    application using a short-lived authorization code.
6.  The application backend exchanges that code with Yet Vast Auth.
7.  The application creates its own host-bound session.
8.  The application verifies signed identity assertions using the public
    signing keys published by Yet Vast Auth.

This separates **identity authority** from **application session
ownership**:

-   Yet Vast Auth owns the persistent Yet Vast identity and provider
    relationships.
-   Each consuming application owns its own local session and
    application authorization rules.
-   A central sign-out or session-management operation can be designed
    to revoke relevant central or application sessions according to the
    agreed token/session contract, but the consumer must still enforce
    its own session lifecycle.

The design avoids making every product responsible for implementing
Google/GitHub OAuth, provider credential storage, account linking, and
central identity resolution independently.

------------------------------------------------------------------------

## 4. Central identity and provider policy

The provider policy is a core product invariant. It is not merely a UI
preference.

### 4.1 Google is the default persistent identity provider

Google is the default identity provider for creating or retrieving a
persistent Yet Vast identity.

When a user signs in with Google:

-   Yet Vast Auth verifies the Google OAuth result.
-   It resolves an existing Google-to-Yet-Vast identity mapping or
    creates a new persistent identity.
-   The central identity and provider mapping are stored in Firestore.
-   The user receives a stable Yet Vast user ID.
-   The persistent identity is not tied to one individual consumer
    application's database.

The central identity store is intended to be shared by Yet Vast Auth and
its registered applications through controlled server-side contracts.
Consumer applications should not independently create competing central
identity records.

### 4.2 GitHub-only access is a distinct, optional pathway

GitHub-only sign-in is not equivalent to Google-backed persistent
identity creation.

The policy established was:

-   GitHub-only access may be offered only by applications whose
    registration explicitly permits anonymous/ephemeral GitHub access.
-   A GitHub-only user in that pathway is not automatically persisted as
    a permanent Yet Vast user.
-   No permanent GitHub-to-Yet-Vast identity mapping is created for a
    GitHub-only ephemeral user.
-   Temporary OAuth transactions, authorization state, and short-lived
    security records may be stored as needed.
-   An explicit GitHub link performed while authenticated to an existing
    persistent Google-backed Yet Vast identity creates the durable
    provider relationship.

This distinction prevents the presence of GitHub OAuth credentials on
the server from unintentionally making GitHub a universal persistent
sign-in option.

### 4.3 Provider visibility is registration-driven

The auth server must decide which providers are offered based on the
verified requesting application's registration and server-side policy.

It must not decide based on an untrusted hostname, a client-controlled
query parameter, or the mere existence of provider credentials.

The confirmed policy for the central service and Yet Vast Home is
Google-only sign-in. GitHub linking is available from the authenticated
account-management area. Other applications may have a separate provider
policy only when their server-side registration explicitly permits it.

Default GitHub anonymous access is false; the policy fails closed.

### 4.4 No automatic account merging

Google and GitHub identities must never be merged solely because they
report the same email address.

The user must explicitly initiate account linking while authenticated to
the existing persistent Yet Vast identity. The provider subject
identifier, not email equality, is the decisive external identity key.

If the GitHub identity is already linked to a different Yet Vast
identity, the operation must be rejected rather than merging the two
accounts.

------------------------------------------------------------------------

## 5. Yet Vast user ID policy

The user ID policy was refined during implementation.

### 5.1 Final rule

For a new Google-backed persistent identity, derive the initial Yet Vast
user ID from the username portion of the verified Google email address:

-   lowercase;
-   remove the domain portion;
-   do not append a provider suffix.

Example:

`yvnowyv@gmail.com` → `yvnowyv`

### 5.2 Collision behavior

If the proposed user ID is already taken by a different identity,
allocate a deterministic numeric suffix:

-   `username`
-   `username-1`
-   `username-2`
-   and so on, until an unused ID is found.

Existing user IDs must not be migrated or renamed by this change. The
collision rule applies when creating new identities.

### 5.3 Verified production evidence

The production account screenshot shows the user ID as `yvnowyv`,
consistent with the final username-only rule. Earlier discussion
included a provider suffix proposal; that is superseded by the final
username-only policy.

------------------------------------------------------------------------

## 6. Authentication and security architecture

### 6.1 OAuth flow

The central sign-in design uses OAuth authorization-code flow with:

-   PKCE;
-   state validation;
-   nonce validation where applicable;
-   short-lived authorization codes;
-   single-use code redemption;
-   server-to-server code exchange;
-   strict redirect URI validation;
-   OAuth transaction expiry and replay protection.

The consumer application must not receive provider access tokens in
browser-visible URLs or client-side JavaScript.

### 6.2 Application-specific sessions

After successful central authentication:

-   Yet Vast Auth returns a short-lived, single-use authorization code
    to the registered callback.
-   The consuming application's backend exchanges the code with the
    central auth server.
-   The consuming application creates its own HTTP-only, host-bound
    session cookie.
-   No wildcard `.yetvast.com` cookie is used.

This keeps session cookies scoped to each application host and avoids
making every application depend on a shared browser cookie.

### 6.3 Signing and token verification

The architecture uses asymmetric signing:

-   EdDSA / Ed25519 is the default signing approach.
-   RS256 support was included as an alternative.
-   The signing private key remains exclusively on the central auth
    server.
-   Consumers verify signed assertions using the public key set
    published by Yet Vast Auth.

JWKS endpoint:

`https://auth.yetvast.com/.well-known/jwks.json`

The private signing key must never be placed in a consumer application's
browser bundle, shared client package, source repository, or public
environment variable.

### 6.4 Firebase access

Firestore is used as the central persistence layer through the Firebase
Admin SDK on the server.

The browser must not receive Firebase Admin credentials. The Firebase
service account private key and client email are server-only
configuration.

Firebase in this design is the database/persistence service; it is not
being used as the user-facing authentication authority. Google and
GitHub OAuth are handled by Yet Vast Auth.

### 6.5 Other security controls captured in the design

The implementation requirements include:

-   strict app registration and redirect allowlists;
-   validation of requesting application identity;
-   CSRF protection for account mutations;
-   OAuth transaction binding;
-   replay prevention;
-   short-lived transaction and authorization records;
-   server-side authorization checks;
-   no provider token leakage into URLs or browser JavaScript;
-   no automatic provider-account merging;
-   explicit account linking;
-   safe handling of identity-link collisions;
-   audit events for security-sensitive operations;
-   server-only secret handling;
-   no trust in user-controlled hostnames or query parameters.

These controls are intended to be enforced at server trust boundaries,
not merely represented by hiding or showing UI controls.

------------------------------------------------------------------------

## 7. Account linking implementation

### 7.1 User-facing behavior

The authenticated `/account` page contains a **Linked accounts** section
and a **Link another account** action. A Google-authenticated user can
initiate GitHub linking without creating a second Yet Vast identity.

### 7.2 Linking transaction

The implementation report describes this flow:

1.  The user must have an active persistent central session.
2.  The user initiates linking from the account page.
3.  The `/api/account/link` route validates the session and CSRF
    protection.
4.  An `AccountLinkingOperation` is created with an `lnk_...` identifier
    and a 10-minute expiry.
5.  An OAuth transaction is created with flow type `link`, PKCE and
    state.
6.  The operation is bound to the authenticated `yvUserId`.
7.  The user is redirected to GitHub for authorization.
8.  The callback verifies the OAuth transaction and confirms that the
    active central session still matches the identity to which the
    operation was bound.
9.  The linking service checks the provider subject identifier for an
    existing mapping.
10. If no conflicting mapping exists, the GitHub identity is linked to
    the existing Yet Vast identity.
11. The user is returned to the account page with a success indication.

### 7.3 Collision handling

If the GitHub provider subject is already associated with another Yet
Vast identity:

-   linking is rejected;
-   identities are not merged;
-   the audit event `identity.link_collision_blocked` is recorded;
-   the user is redirected to `/account?error=IDENTITY_COLLISION`.

### 7.4 Unlinking safeguards

The implementation report states:

-   unlinking requires recent reauthentication within 15 minutes;
-   the system prevents unlinking the only remaining authentication
    method;
-   active sessions associated with the unlinked provider are revoked.

The purpose is to prevent accidental account lockout and reduce the risk
of removing a provider from an account without recent proof of control.

### 7.5 GitHub OAuth callback

The callback URI is constructed from `YETVAST_AUTH_ORIGIN`:

`https://auth.yetvast.com/api/oauth/callback/github`

The local development callback recorded in the implementation report is:

`http://localhost:3001/api/oauth/callback/github`

A GitHub OAuth App supports one callback URL, so a separate development
OAuth App is appropriate if local OAuth callback testing is required.

### 7.6 GitHub OAuth environment variables

Required production variables:

-   `GITHUB_CLIENT_ID`
-   `GITHUB_CLIENT_SECRET`

The implementation also supports optional endpoint overrides:

-   `GITHUB_AUTH_URL`
-   `GITHUB_TOKEN_URL`
-   `GITHUB_USER_URL`
-   `GITHUB_EMAILS_URL`

The optional endpoint variables should remain unset for standard GitHub
OAuth unless a concrete need arises.

The GitHub OAuth App configuration used:

-   Application name: `Yet Vast Auth`
-   Homepage URL: `https://auth.yetvast.com`
-   Authorization callback URL:
    `https://auth.yetvast.com/api/oauth/callback/github`

The homepage URL identifies the service represented by the OAuth
application. The callback URL is the operational redirect endpoint and
must match the application configuration exactly.

------------------------------------------------------------------------

## 8. Repository and package structure

The auth implementation is organized as a monorepo:

``` text
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

  ---------------------------------------------------------------------
  Path                               Responsibility
  ---------------------------------- ----------------------------------
  `apps/auth-server`                 Central auth authority, OAuth
                                     routes, account management, server
                                     configuration and deployment

  `apps/auth-playground`             Playground for exercising the auth
                                     integration

  `packages/auth`                    Shared auth integration
                                     logic/contracts for consuming
                                     applications

  `packages/auth-ui`                 Shared authentication UI
                                     components and tokens
  ---------------------------------------------------------------------

### 8.1 Published packages

The following packages were published to GitHub Packages:

-   `@yetvast/auth@0.1.0`
-   `@yetvast/auth-ui@0.1.0`

GitHub's package UI confirmed that both packages were **Private**.

Registry configuration:

``` ini
@yetvast:registry=https://npm.pkg.github.com
```

A GitHub Personal Access Token with package read/write permissions was
used for package publication. The token must remain in user-level or
CI/deployment secret configuration and must not be committed to the
repository.

The package publication was completed. The deployment work then used the
monorepo workspace packages directly, avoiding an unnecessary package
republish merely to resolve local workspace build issues.

### 8.2 Build and workspace corrections

The initial Vercel build encountered workspace package resolution
problems and a missing export target for:

`@yetvast/auth-ui/tokens.css`

The monorepo configuration, workspace build handling, CSS export target,
and Vercel configuration were corrected. The reported final checks
passed.

------------------------------------------------------------------------

## 9. Yet Vast Auth deployment

### 9.1 Hosting decision

The initial live deployment target is Vercel. The goal was to deploy and
test the real central service online rather than rely exclusively on
local development.

### 9.2 Vercel project configuration

The confirmed deployment configuration:

  ---------------------------------------------------------------------
  Setting                            Value
  ---------------------------------- ----------------------------------
  Framework                          Next.js

  Root Directory                     `apps/auth-server`

  Include files outside Root         Enabled
  Directory                          

  Build/install/output overrides     Left disabled; project
                                     `vercel.json` supplies commands

  Node.js                            Vercel default 26.x; project
                                     engine requirement `>=20.9.0`
  ---------------------------------------------------------------------

The project is a monorepo, so access to files outside the Root Directory
is required for the shared workspace packages.

### 9.3 Custom domain and origin

Custom domain:

`auth.yetvast.com`

Vercel provided the DNS target. The CNAME record was configured using
the exact target shown in the Vercel domain settings rather than
guessing a target. DNS verification completed; SSL issuance was
initially pending.

Production origin environment variable:

`YETVAST_AUTH_ORIGIN=https://auth.yetvast.com`

This variable is required in production and is used to construct
canonical callback URLs and service-origin behavior. An initial runtime
error stated that `YETVAST_AUTH_ORIGIN` was required in production;
adding the variable and redeploying addressed that failure.

### 9.4 Vercel environment variables

The production configuration discussed and added includes:

  ---------------------------------------------------------------------
  Variable                           Purpose
  ---------------------------------- ----------------------------------
  `FIREBASE_PROJECT_ID`              Firebase project ID (`project_id`
                                     from service-account JSON)

  `FIREBASE_CLIENT_EMAIL`            Service-account `client_email`

  `FIREBASE_PRIVATE_KEY`             Service-account `private_key`,
                                     including PEM markers and newline
                                     formatting

  `YETVAST_AUTH_ORIGIN`              Canonical production auth origin

  `YETVAST_SIGNING_PRIVATE_KEY`      Ed25519 or RSA PKCS#8 PEM signing
                                     private key

  `GOOGLE_CLIENT_ID`                 Google OAuth client ID

  `GOOGLE_CLIENT_SECRET`             Google OAuth client secret

  `GITHUB_CLIENT_ID`                 GitHub OAuth App client ID

  `GITHUB_CLIENT_SECRET`             GitHub OAuth App client secret
  ---------------------------------------------------------------------

Only the variables required for the relevant deployment environment
should be configured there. Secrets must not be pasted into chat,
committed, or exposed to client-side code.

### 9.5 Signing key generation

The signing key was generated locally using OpenSSL on Windows.

Commands used/recommended:

``` powershell
openssl genpkey -algorithm ED25519 -out yetvast-signing-private.pem
openssl pkey -in yetvast-signing-private.pem -pubout -out yetvast-signing-public.pem
```

The private key is configured on the server as
`YETVAST_SIGNING_PRIVATE_KEY`. The public key is exposed through JWKS by
the auth service.

The private key should be backed up securely. It must not be casually
regenerated after production use, because changing the signing key
without a planned key-rotation strategy can invalidate existing signed
tokens or break consumer verification.

### 9.6 Firebase project and service account

A Firebase project named `yetvast-auth` was created.

The service-account JSON fields map to Vercel as follows:

-   `project_id` → `FIREBASE_PROJECT_ID`
-   `client_email` → `FIREBASE_CLIENT_EMAIL`
-   `private_key` → `FIREBASE_PRIVATE_KEY`

The personal Gmail address is not the service-account email. The exact
service-account `client_email` from the JSON must be used.

The implementation uses Firebase Admin SDK server-side. Firebase test
mode was not selected; the intent was to use the real Firebase project
and service-account configuration.

### 9.7 Deployment troubleshooting history

The following issues were encountered and addressed during deployment:

1.  **Workspace package resolution:** Vercel initially could not resolve
    the local `@yetvast/auth` and `@yetvast/auth-ui` packages. The
    monorepo/workspace build setup was corrected.
2.  **CSS export target:** The `@yetvast/auth-ui/tokens.css` export
    pointed to a missing target. The export/build arrangement was
    corrected.
3.  **Production origin missing:** Runtime reported
    `YETVAST_AUTH_ORIGIN is required in production`. The environment
    variable was added and the deployment was redeployed.
4.  **Signing key missing:** Runtime reported
    `YETVAST_SIGNING_PRIVATE_KEY (Ed25519 or RSA PKCS#8 PEM) is required in production`.
    An Ed25519 key pair was generated and the private key was configured
    in Vercel.
5.  **No identity provider enabled:** Runtime validation reported
    `identity.providers: At least one identity provider must be enabled unless access.anonymousAccess is true.`
    The correct resolution was to configure Google as the persistent
    default provider, not to enable global anonymous access.
6.  **Google OAuth configuration:** Google OAuth credentials and the
    exact callback URI were configured.
7.  **GitHub linking configuration:** GitHub OAuth App credentials and
    the GitHub callback URI were configured for account linking.

The live service subsequently reached a successful deployed state and
Google sign-in was tested.

------------------------------------------------------------------------

## 10. Google OAuth configuration

Google is the persistent default identity provider.

The Google OAuth application was configured with:

-   Authorized JavaScript origin: `https://auth.yetvast.com`
-   Authorized redirect URI:
    `https://auth.yetvast.com/api/oauth/callback/google`

Production environment variables:

-   `GOOGLE_CLIENT_ID`
-   `GOOGLE_CLIENT_SECRET`

The Google callback must match exactly between Google Cloud
configuration and the auth server's callback construction.

Google sign-in was successfully exercised after deployment. The account
page displayed the generated Yet Vast user ID.

------------------------------------------------------------------------

## 11. Yet Vast Home

### 11.1 Product role

Yet Vast Home is the product hub for the Yet Vast ecosystem and is
intended to be the first consumer of Yet Vast Auth.

The public application should use the brand **Yet Vast**.

### 11.2 Initial implementation context

The prior implementation status recorded in project discussions
described the first Yet Vast Home implementation as having:

-   a public product directory;
-   light and dark themes;
-   an account page;
-   an isolated authentication boundary.

At that point, the auth server still needed live deployment and
package/session integration, and live provider verification remained
outstanding.

The subsequent work focused on completing the central auth service
first. This document does not claim that the later Yet Vast Home
integration has been completed unless verified by a current repository
or deployment report.

### 11.3 Authentication policy

Yet Vast Home is Google-only for sign-in under the established provider
policy.

GitHub account linking is managed inside the authenticated Yet Vast Auth
account experience. This does not mean Yet Vast Home should offer GitHub
as a second persistent sign-in button.

### 11.4 Integration model

The intended Home integration is through the shared auth package and
central auth service:

-   Home redirects users to Yet Vast Auth for authentication.
-   The central service authenticates the user and returns a short-lived
    authorization code to the registered Home callback.
-   Home's backend exchanges the code server-to-server.
-   Home creates its own application-scoped session.
-   Home uses the resulting Yet Vast identity reference for
    account-aware product hub behavior.
-   Home must not store or manage Google/GitHub provider credentials
    itself.
-   Home must not create a second independent persistent Yet Vast
    identity store.

The exact Home production callback, registered application identifier,
environment variable names, and current integration status should be
confirmed from the current Home repository before being recorded as
completed.

------------------------------------------------------------------------

## 12. Verification and implementation evidence

### 12.1 Reported automated checks

The final implementation report for the GitHub account-linking work
stated:

  Check                  Reported result
  ---------------------- -----------------
  Production build       Passed
  TypeScript typecheck   Passed
  Vitest unit tests      49 passed
  Lint                   Clean
  Format check           Clean
  Playwright E2E         11/11 passed

The E2E suite was reported to cover GitHub linking, identity
resolution/persistence behavior, and unlinking protection.

These are implementation-agent test results as reported in the
conversation. They are not independently reproduced in this document.

### 12.2 Production UI evidence --- 14 November 2026

The user supplied a screenshot from:

`https://auth.yetvast.com/account?linked=github`

Visible evidence in the screenshot:

-   Account page title: **Yet Vast Auth --- Account**
-   Account status: **active**
-   Displayed user ID: `yvnowyv`
-   Success message: **Account updated**
-   Success detail: **Successfully linked your GitHub account.**
-   Linked accounts count: **2 connected**
-   GitHub listed as linked, with a **Verified email** label
-   Google listed as linked, with a **Verified email** label
-   Both provider rows display the same email address
-   Active sessions count: **1 active**
-   Current session row identifies Google / `auth-server`
-   Recovery-code status: **0 remaining**

This screenshot directly confirms that the production account UI
completed the GitHub-linking flow and rendered both providers as
connected.

### 12.3 What the screenshot does not prove by itself

The screenshot is strong end-to-end UI evidence, but it does not
independently prove every backend invariant. In particular, it does not
by itself demonstrate:

-   the exact Firestore document layout;
-   the stored provider subject IDs;
-   the audit log contents;
-   token signature verification by a separate consumer;
-   the complete unlink/re-authentication flow;
-   the behavior of Yet Vast Home against the live auth service.

Those are covered by implementation reports and automated tests to the
extent described above, but should remain distinct from direct
production UI verification.

------------------------------------------------------------------------

## 13. Important decisions and rejected shortcuts

The following decisions should be preserved during future
implementation:

1.  **Do not enable global anonymous access** merely to satisfy a
    provider configuration validation error. Configure the intended
    persistent provider.
2.  **Do not make GitHub universally available** just because GitHub
    OAuth credentials exist.
3.  **Do not treat GitHub-only ephemeral access as a persistent Yet Vast
    identity.**
4.  **Do not auto-merge Google and GitHub accounts based on matching
    email.**
5.  **Do not change existing user IDs** when adjusting the new-user ID
    generation rule.
6.  **Do not use a wildcard `.yetvast.com` session cookie.** Each app
    owns a host-bound session.
7.  **Do not put provider credentials or signing private keys in browser
    code or shared client packages.**
8.  **Do not put GitHub PATs in the repository `.npmrc`.**
9.  **Do not use a personal Gmail address as the Firebase
    service-account email.**
10. **Do not regenerate the production signing key casually.**
11. **Do not assume a successful build means production authentication
    works.** Verify real OAuth flows and account state against the
    deployed domain.
12. **Do not treat Yet Vast Home as the identity authority.** It
    consumes the central service.
13. **Do not claim Home integration is complete without current
    repository and live-flow evidence.**

------------------------------------------------------------------------

## 14. Current status matrix

  --------------------------------------------------------------------------------
  Area                Status                  Evidence / qualification
  ------------------- ----------------------- ------------------------------------
  Central auth        Defined                 OAuth, identity, session and signing
  architecture                                model documented in project
                                              decisions

  Persistent Google   Implemented and         Successful Google sign-in and
  identity            production-tested       account page

  User ID generation  Implemented per final   Production account shows `yvnowyv`
                      rule                    

  Firebase Admin      Configured              Production environment variables and
  persistence                                 successful account flow; backend
  configuration                               data layout not independently
                                              inspected here

  Ed25519 signing     Configured              Production deployment progressed
  configuration                               past missing-key error; JWKS
                                              consumer verification still merits a
                                              separate integration test

  JWKS endpoint       Specified/implemented   Endpoint is
                      in architecture         `/.well-known/jwks.json`; consumer
                                              verification should be explicitly
                                              tested

  GitHub OAuth App    Configured              Production linking completed

  GitHub account      Implemented and         Success message and 2 connected
  linking             production UI verified  providers

  Account-link        Implemented per report  `identity.link_collision_blocked`;
  collision                                   automated tests reported
  protection                                  

  Unlinking           Implemented per report  Recent reauthentication,
  safeguards                                  last-provider protection and session
                                              revocation; live manual test not
                                              shown

  Private npm         Published               `@yetvast/auth@0.1.0`,
  packages                                    `@yetvast/auth-ui@0.1.0`, Private in
                                              GitHub UI

  Vercel deployment   Deployed                `auth.yetvast.com` live and account
                                              page accessible

  Yet Vast Home       Previously reported     Product directory, themes, account
  initial UI          implemented             page, isolated auth boundary

  Yet Vast Home live  Not confirmed in latest Must verify current repository and
  auth integration    evidence                production flow

  Cross-app session   Architecture defined    Needs consumer-level integration and
  lifecycle                                   end-to-end verification

  Recovery codes      UI visible; 0 remaining Generation/rotation and recovery
                      in screenshot           journey need explicit test evidence
  --------------------------------------------------------------------------------

------------------------------------------------------------------------

## 15. Recommended next implementation sequence

This sequence is limited to Yet Vast Auth and Yet Vast Home.

### Phase A --- Freeze and document the working auth baseline

1.  Tag or otherwise identify the exact deployed source revision that
    produced the working production auth service.
2.  Record the production environment-variable names and which
    deployment environments use them. Never put secret values in
    documentation.
3.  Verify the live JWKS response and document the key ID, algorithm and
    rotation expectations without exposing private key material.
4.  Verify the Google sign-in flow from a clean browser session.
5.  Verify GitHub linking from a clean authenticated session.
6.  Verify collision handling and unlinking safeguards in a controlled
    test account.
7.  Test recovery-code generation and recovery behavior; the current
    screenshot shows zero remaining codes.

### Phase B --- Integrate Yet Vast Home

1.  Inspect the current Home repository and identify its actual
    implementation state before changing anything.
2.  Confirm the registered Home application ID, exact callback URI,
    allowed origin and server-side provider policy.
3.  Integrate the published/shared auth package or the agreed
    workspace/package version.
4.  Implement the server-side authorization-code exchange.
5.  Create and validate a Home-owned, host-bound session.
6.  Confirm Home offers Google-only sign-in.
7.  Verify sign-in, refresh/revisit, sign-out and expired/invalid
    authorization-code behavior.
8.  Confirm Home does not create duplicate central identity records or
    store provider credentials.

### Phase C --- Operational hardening

1.  Establish a documented signing-key rotation procedure, including
    overlapping public keys and token lifetime handling.
2.  Review OAuth transaction and authorization-code TTLs, replay
    behavior and cleanup.
3.  Confirm audit events for sign-in, linking, unlinking, collisions,
    session revocation and recovery actions.
4.  Review rate limiting and abuse controls on OAuth and
    account-management endpoints.
5.  Confirm production logging excludes secrets, provider tokens,
    private keys and unnecessary personal data.
6.  Verify backup and recovery expectations for the Firestore identity
    store.
7.  Establish a repeatable staging/production configuration process.

### Phase D --- Stable integration contract

Document the consumer contract for Yet Vast Home:

-   application registration fields;
-   authorization start URL and parameters;
-   callback contract;
-   server-to-server code exchange;
-   token/assertion claims;
-   JWKS verification rules;
-   session creation and cookie requirements;
-   logout and revocation semantics;
-   error codes and retry behavior;
-   provider policy and account-linking boundaries.

Do not add speculative abstractions beyond the needs of the first
consumer. Use the Home integration to validate the contract before
broadening it.

------------------------------------------------------------------------

## 16. Open questions to resolve from source code or live tests

These are not assumptions; they are items that should be confirmed
before declaring the platform fully production-ready:

-   What exact application registration record and client identifier are
    currently assigned to Yet Vast Home?
-   What is the exact registered Home callback URI?
-   Is Home currently using the published package versions or local
    workspace packages?
-   Does the production JWKS endpoint expose the expected Ed25519 public
    key and key ID?
-   Does a consumer independently verify the signed assertion and reject
    invalid, expired or wrong-audience tokens?
-   What are the exact assertion claims, issuer, audience and expiration
    semantics?
-   What is the current refresh-session or reauthentication policy?
-   How are central sign-out, consumer sign-out and "sign out all
    devices" propagated across applications?
-   Are recovery codes generated, hashed, single-use and rotated as
    intended? The supplied screenshot shows zero remaining.
-   Are account-link and unlink operations fully audited in production?
-   Is there a separate staging Firebase project and OAuth
    configuration, or is production currently the only live environment?
-   Is there a documented Firestore backup/restore process?

Resolve these from the repository, deployment configuration, or
controlled tests. Do not infer them from the account page alone.

------------------------------------------------------------------------

## 17. Project development and AI-agent working rules

The wider Yet Vast engineering standards supplied for this project
establish several working principles relevant to future Auth and Home
changes:

-   Inspect the existing implementation before modifying it.
-   Make the smallest change that satisfies the explicit requirement.
-   Preserve approved architecture and security invariants.
-   Distinguish verified implementation from planned or assumed
    behavior.
-   Do not invent missing repository facts or report tests that were not
    run.
-   Keep business logic, route coordination, presentation and
    infrastructure responsibilities separated.
-   Validate all untrusted inputs at server boundaries.
-   Keep secrets server-side.
-   Make mutations explicit and report failures rather than silently
    swallowing them.
-   Avoid unnecessary dependencies and speculative abstractions.
-   Provide evidence for build, typecheck, lint, unit and E2E claims.
-   Preserve clear loading, success and error states in the UI.
-   Treat authentication, account linking, identity merging, session
    revocation and key management as security-sensitive changes
    requiring explicit verification.

The supplied Application Development Standards document is a broad
organizational standard. It is not itself a runtime dependency of Yet
Vast Auth or Yet Vast Home. Product-specific auth invariants in this
handoff remain more specific and must not be weakened by generic
implementation conventions.

------------------------------------------------------------------------

## 18. Milestone chronology

  ---------------------------------------------------------------------
  Period                             Milestone
  ---------------------------------- ----------------------------------
  Initial architecture discussions   Established the need for a central
                                     Yet Vast identity and a separate
                                     auth authority rather than
                                     independent app-level identity
                                     systems

  12 November 2026                   Confirmed Google as persistent
                                     identity provider; GitHub-only as
                                     optional ephemeral access;
                                     explicit GitHub linking as the
                                     route to durable association

  12 November 2026                   Recorded Yet Vast Home as product
                                     hub and first intended consumer of
                                     Yet Vast Auth

  12 November 2026                   Auth implementation and Home
                                     initial UI were reported complete,
                                     while live credentials, deployment
                                     and end-to-end verification
                                     remained

  12 November 2026                   Published `@yetvast/auth@0.1.0`
                                     and `@yetvast/auth-ui@0.1.0` as
                                     private GitHub Packages

  12--13 November 2026               Configured Firebase
                                     project/service account, Vercel
                                     monorepo deployment and custom
                                     auth domain

  13 November 2026                   Resolved production configuration
                                     errors for auth origin, signing
                                     key and enabled identity provider

  13 November 2026                   Configured Google OAuth and
                                     verified Google sign-in against
                                     the deployed service

  13--14 November 2026               Implemented GitHub account
                                     linking, collision handling and
                                     unlinking safeguards;
                                     implementation report stated all
                                     automated checks passed

  14 November 2026                   Production account page showed
                                     successful GitHub linking, two
                                     connected providers and active
                                     account state
  ---------------------------------------------------------------------

Dates reflect the conversation and implementation reports available for
this handoff. Exact commit timestamps and deployment IDs should be added
from GitHub/Vercel if a release-grade audit trail is required.

------------------------------------------------------------------------

## 19. Final handoff

**What is demonstrably working now:** Yet Vast Auth is deployed at
`auth.yetvast.com`; Google sign-in has been exercised; the production
account page shows the persistent Yet Vast user ID; and GitHub has now
been successfully linked to that same account. The supplied screenshot
is direct evidence of the completed linking result.

**What should happen next:** Treat the deployed Auth service as the
baseline, verify its remaining security and recovery behaviors, then
complete and test Yet Vast Home's integration as the first consumer. Do
not broaden scope until that consumer flow is verified.

**What this document deliberately does not cover:** VastAlliance product
development, its requirements, architecture, UI, implementation or
roadmap.

------------------------------------------------------------------------

## Appendix A --- Key production URLs

  ----------------------------------------------------------------------------------
  Purpose                     URL
  --------------------------- ------------------------------------------------------
  Yet Vast public homepage    `https://yetvast.com`

  Yet Vast Auth               `https://auth.yetvast.com`

  Auth account page           `https://auth.yetvast.com/account`

  JWKS                        `https://auth.yetvast.com/.well-known/jwks.json`

  Google OAuth callback       `https://auth.yetvast.com/api/oauth/callback/google`

  GitHub OAuth callback       `https://auth.yetvast.com/api/oauth/callback/github`

  GitHub OAuth App settings   `https://github.com/settings/developers`

  GitHub Packages registry    `https://npm.pkg.github.com`
  ----------------------------------------------------------------------------------

## Appendix B --- Secret handling reminder

This document records environment-variable **names**, not secret values.
Do not add any of the following to this file or commit them to Git:

-   Google OAuth client secret;
-   GitHub OAuth client secret;
-   Firebase service-account private key;
-   Yet Vast Auth signing private key;
-   GitHub Personal Access Token;
-   any production session or API secret.

Store and rotate these only through the appropriate secret-management or
deployment environment controls.


---

# 16 November Architecture and Implementation Update

**Update date: 16 November 2026**

## 19. Authoritative update — 16 November 2026

This section takes precedence over earlier status descriptions in this 14 November document and the earlier consolidated history.

### 19.1 Application identity resolution: three distinct identifiers

The 16 November implementation introduces a durable distinction between the logical product and each registration attempt:

| Field | Meaning | Example |
|---|---|---|
| `logicalAppId` | Stable consumer-facing identity across registration replacement | `yetvast-home` |
| `registrationId` | Immutable ID for one registration instance | `www-yetvast-com-6negk210` |
| `supersedesApplicationId` | Predecessor registration reference | `yetvast-home` |

A logical application is not a registration document. Deleting a registration must not permanently delete the logical product identity.

### 19.2 Confirmed production issue and root cause

The implementation report records three production Firestore application records:
- `auth-server`: active, deletion state `NONE`;
- `www-yetvast-com-6negk210`: approved, deletion state `NONE`, domain verification `VERIFIED`, primary URL `https://www.yetvast.com`;
- `yetvast-home`: historical registration with deletion state `DELETED`.

Home requested authentication using `app_id=yetvast-home`. The previous Auth implementation treated that value as a Firestore document ID, retrieved the old deleted registration and returned `APPLICATION_DELETED`, even though a newer approved registration existed.

### 19.3 Resolution behavior now implemented

The latest code report records `resolveRegisteredApplication(identifier, redirectUri, tx)` and updates to `getRegisteredApplication()`, authorization-code issuance and code exchange.

Resolution:
- considers registration ID, logical ID and explicit succession relationships;
- selects only a valid active, approved, domain-verified registration with an exact matching redirect URI;
- permits a valid approved successor to satisfy a logical-ID request;
- continues to block an explicitly requested deleted registration instance;
- blocks pending, rejected, suspended and deletion-requested registrations;
- fails closed with `PERSISTENCE_CONFLICT` when multiple conflicting active registrations cannot be resolved safely;
- carries the same resolved registration through OAuth stages rather than switching registrations mid-flow.

### 19.4 Migration status — not executed

The migration script is `packages/auth/scripts/migrate-application-identities.mjs`. The documented production dry run inspected three application records and identified two records requiring metadata updates. The dry run did not write data.

**Execution remains pending explicit administrator authorization.** Do not execute the production migration autonomously. After authorization, run the documented `--execute` mode and independently read back the records.

### 19.5 Latest reported verification

The later 16 November implementation record reports:
- 30 test files;
- 358 tests passed;
- typecheck passed across all four workspaces;
- lint passed;
- Prettier format check passed;
- production builds passed for the shared packages, Auth server and playground.

An earlier run in the same implementation history recorded 353 tests. The later 358-test run is the most recent recorded test result. These are implementation-record results, not a new test execution performed during this documentation update.

### 19.6 Package version and consumer compatibility

The inspected Auth monorepo package manifests are at version `0.3.0` for:
- `@yetvast/auth`;
- `@yetvast/auth-ui`;
- `@yetvast/auth-server`.

The inspected Yet Vast Home `package.json` still declares `@yetvast/auth` and `@yetvast/auth-ui` as `^0.2.0`.

The repository manifests do not prove that `0.3.0` has been published to GitHub Packages or consumed by Home. Confirm package publication and consumer lockfile resolution before describing the consumer as upgraded.

### 19.7 Remaining release gates

1. Obtain explicit authorization for the production Firestore identity migration.
2. Execute the migration only after approval; read back and verify the affected records.
3. Publish the required `0.3.0` shared packages, if not already published.
4. Upgrade Home only after package publication and compatibility checks.
5. Deploy the latest Auth server.
6. Verify Home login with the stable logical ID `yetvast-home`, the exact production callback URI and the new active registration resolution.
7. Confirm the actual production `YETVAST_HOME_ORIGIN` and registered redirect URI. The implementation evidence references `https://www.yetvast.com/api/auth/callback`; older Home documentation references the apex domain. Resolve this using the live deployment configuration, not assumption.
8. Verify deletion, suspension, recovery, domain verification and account/session behavior against production after deployment.

### 19.8 Important boundary

The Home-side `YETVAST_HOME_APP_ID` remains the logical application identifier. Do not replace it with `www-yetvast-com-6negk210` merely because that value is the current registration-instance ID. The new Auth resolution layer exists to preserve the consumer-facing logical identity across registration replacement.
