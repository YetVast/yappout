# Implementation Record: YappOut — Yet Vast Auth SSO Integration

> **Document ID:** YVS-IMPL-2026-11-16-YAPPOUT-SSO-INTEGRATION  
> **Repository:** `YetVastSolutions/yappout`  
> **Date:** November 16, 2026  
> **Author:** Antigravity AI Engineering Assistant  
> **Upstream Authority:** Yet Vast Auth (`https://auth.yetvast.com`)  
> **Standard:** `YVS-STD-2026-PKG-001`  
> **Status:** Implemented, Fully Verified Locally, Production Ready (Pending Central Application Registration & Live Verification)  

---

## Part A — Original Implementation Prompt

The complete, verbatim original prompt supplied for this task is recorded below:

```markdown
# YappOut — Implement Yet Vast Auth SSO Integration

YappOut V0 is now publicly deployed at `https://yappout.yetvast.com`.

The current application is anonymous-first and does not display a sign-in button. We now want to implement integration with the central Yet Vast Auth service.

## 1. First: inspect before implementing

Read:
- YappOut product and technical documentation.
- Existing authentication-related documentation.
- `package.json` and installed `@yetvast/auth` package.
- The current Yet Vast Auth SDK documentation.
- Yet Vast Home's latest authentication integration as a reference.
- Yet Vast Auth application registration and production deployment documentation.

Inspect the actual SDK exports and implementation. Do not assume API names or copy outdated examples.

## 2. Product requirements

Preserve YappOut's anonymous-first experience.

Unauthenticated visitors must continue to:
- Open YappOut.
- Paste or type content.
- Load sample content.
- Use speech synthesis.
- Control reading speed.
- Use synchronized highlighting.

Add a visible **Sign in** action in the application header.

For authenticated users:
- Display their authenticated account identity.
- Provide a sign-out action.
- Handle expired sessions.
- Support the central Yet Vast Auth sign-in and callback flow.

Do not force authentication before using existing V0 features.

## 3. Authentication architecture

Integrate with the central Yet Vast Auth service at `https://auth.yetvast.com`.

Implement:
- Application registration and client identification.
- Secure sign-in initiation.
- OAuth/OIDC authorization flow as supported by the SDK.
- Callback handling.
- State and nonce validation.
- PKCE where required.
- Secure session management.
- Server-side identity verification.
- Sign-out and session cleanup.
- Authentication error handling.

Use the official `@yetvast/auth` SDK APIs.

Do not implement a separate authentication system or duplicate the central identity provider.

## 4. UI requirements

Update the existing YappOut header.

Unauthenticated state:
- Show a Sign in button.
- Maintain the existing YappOut branding and layout.

Authenticated state:
- Show the user's name or appropriate account identifier.
- Provide an account menu with Sign out.

Ensure responsive desktop and mobile layouts.

Preserve existing CSS Modules and design tokens. Do not introduce Tailwind CSS.

## 5. Environment configuration

Audit the actual SDK and application implementation to identify required environment variables.

Distinguish:
- Build-time private package installation credentials.
- Authentication client configuration.
- Server-side secrets.
- Public application configuration.

Do not assume that every variable used by Yet Vast Home is required by YappOut.

Never expose client secrets or session secrets to browser-side code.

The existing `NODE_AUTH_TOKEN` remains exclusively a build-time dependency installation credential.

## 6. Application registration

Determine whether YappOut has already been registered in Yet Vast Auth.

If not:
- Identify the exact registration process.
- Determine the required production callback URL.
- Determine the required application ID and credentials.
- Document any manual action required in the Yet Vast Auth administration interface.

Do not invent application IDs or callback URLs.

## 7. Security requirements

- Validate authentication state on the server.
- Validate issuer and audience.
- Validate callback parameters.
- Use secure, HTTP-only cookies where appropriate.
- Prevent open redirects.
- Never trust client-provided user IDs.
- Keep anonymous reading functionality independent of authenticated sessions.
- Do not introduce unnecessary database dependencies.

## 8. Testing

Test:
1. Anonymous visitor can use YappOut.
2. Sign-in action redirects to Yet Vast Auth.
3. Successful authentication returns to YappOut.
4. Authenticated identity is displayed.
5. Refresh preserves a valid session.
6. Sign-out clears the session.
7. Invalid callback parameters are rejected.
8. Expired sessions are handled correctly.
9. Anonymous functionality continues working.

Run typecheck, lint, tests and production build.

## 9. Documentation

Update the authentication architecture documentation and `.env.example`.

Create an implementation audit documenting:
- SDK APIs used.
- Authentication flow.
- Environment variables.
- Application registration.
- Callback URLs.
- Security controls.
- Test results.
- Remaining deployment actions.

Do not claim production SSO works until it has been tested against the actual Yet Vast Auth production service.

## 10. Constraints

Do not redesign the existing reading experience.
Do not make sign-in mandatory.
Do not introduce unrelated features.
Do not break the existing V0 reading engine.
Do not invent SDK APIs or application registration details.

The objective is to make YappOut a public, anonymous-first application with optional centralized Yet Vast account authentication.
```

---

## Part B — Initial Repository Findings

### 1. Architectural and Cross-Repository Inspection
Before making modifications, a systematic investigation of the three key repositories was performed:
1. **YappOut (`YetVastSolutions/yappout`):**
   - V0 client-side reading engine is complete and fully functional.
   - Authentication foundations were present from V1 architecture (`src/auth/*`, `src/app/api/auth/*`), but sign-in was gated behind an explanatory modal rather than offering a direct, seamless single-click SSO sign-in button.
   - All 95 existing tests passed cleanly.
2. **Yet Vast Home (`YetVastSolutions/yvs-illu`):**
   - Implemented direct OAuth PKCE sign-in (`/api/auth/login`) with `returnTo` state preservation.
   - Implemented centralized error code normalization (`normalizeCentralAuthError`) mapping errors like `APPLICATION_NOT_REGISTERED`, `APPLICATION_PENDING_APPROVAL`, `APPLICATION_SUSPENDED`, `INVALID_REDIRECT_URI`, etc., into friendly user messages.
   - Used `isSafeRedirectUri` to prevent open-redirect vulnerabilities.
3. **Yet Vast Auth (`YetVastSolutions/yetvast-auth`):**
   - Analyzed `@yetvast/auth` SDK exports:
     - `@yetvast/auth`: `AuthError`, `toPublicAuthError`, `isSafeRedirectUri`, `assertSafeRedirectUri`, `asApplicationId`.
     - `@yetvast/auth/server`: `assertServerRuntime`, `createAppAuthorizeRedirect`, `exchangeCodeForAssertion`, `verifyApplicationAssertionJwt`, `timingSafeEqualStrings`, `parseCookieHeader`, `buildSessionCookieHeader`, `buildClearSessionCookieHeader`, `verifyCsrfAndOrigin`.
   - Analyzed Central Authorization Page (`apps/auth-server/src/app/authorize/page.tsx`):
     - Receives `app_id`, `redirect_uri`, `state`, `code_challenge`, `code_challenge_method=S256`.
     - Checks central session cookie; renders `AuthorizeClient` with provider buttons (Google / GitHub).
     - Does not require consumer-side provider selection modals.
   - Evaluated Firestore application registrations (`docs/backups/production-backup-2026-11-16.json`):
     - Registered applications: `yetvast-home`, `www-yetvast-com-6negk210`, `auth-server`.
     - **Critical Finding:** `yappout` is **NOT yet registered** in central Yet Vast Auth.

---

## Part C — Implementation Report

### 1. Files Created and Modified

| Action | Path | Description |
|---|---|---|
| **Modified** | `src/auth/authService.ts` | Added `normalizeCentralAuthError()`, enhanced `initiateLogin()` with `returnTo` support and safe URL validation, and updated `handleCallback()` to return sanitized `returnTo`. |
| **Modified** | `src/auth/sessionService.ts` | Updated `createTxCookieHeader()` to store optional `returnTo` alongside `state` and `codeVerifier`. |
| **Modified** | `src/app/api/auth/login/route.ts` | Extracted `returnTo` query parameter, passed it into `initiateLogin()`, and set the transaction cookie. |
| **Modified** | `src/app/api/auth/callback/route.ts` | Supported safe redirect to `returnTo` destination upon successful authentication; attached `auth_error_code` on failure. |
| **Modified** | `src/components/auth/AuthButton.tsx` | Streamlined `Sign in` action to directly invoke `signIn()`, launching the central Yet Vast Auth SSO flow in one click. Removed unused modal state. |
| **Modified** | `.env.example` | Clearly documented all 4 environment variable tiers with scopes, sensitivity, and defaults. |
| **Modified** | `README.md` | Updated test metrics to 98 tests across 16 test files. |
| **Modified** | `docs/YAPPOUT_V0_PRODUCT_AND_TECHNICAL_DOCUMENTATION.md` | Added Section 43 (Application Registration in Central Yet Vast Auth) and updated Section 41, 42, and 46. |
| **Created** | `docs/audits/2026-11-16-yappout-yetvast-auth-sso-integration.md` | Formal audit report detailing SSO flow, SDK APIs, security controls, and registration steps. |
| **Created** | `docs/implementation/2026-11-16-yappout-yetvast-auth-sso-integration.md` | This permanent 5-part implementation record. |

### 2. SDK APIs Utilized
All integration code strictly uses the official `@yetvast/auth` SDK without custom OAuth endpoints:
- `createAppAuthorizeRedirect`: Generates cryptographically secure 24-byte `state`, 32-byte `codeVerifier`, Base64URL-encoded SHA-256 `codeChallenge`, and the target authorize URL.
- `exchangeCodeForAssertion`: Performs server-to-server POST to `https://auth.yetvast.com/api/token` and verifies the returned JWT assertion against central JWKS (`/.well-known/jwks.json`).
- `verifyApplicationAssertionJwt`: Validates cryptographic signature (`EdDSA`/`RS256`), issuer (`https://auth.yetvast.com`), audience (`yappout`), and expiration timestamp.
- `isSafeRedirectUri`: Enforces strict open-redirect prevention on `returnTo` paths.
- `timingSafeEqualStrings`: Protects against timing attacks during OAuth `state` parameter validation.
- `buildSessionCookieHeader` & `buildClearSessionCookieHeader`: Manages host-bound session cookies.
- `verifyCsrfAndOrigin`: Validates `Origin` and `Referer` headers on mutating endpoints (`POST /api/auth/logout`).
- `assertServerRuntime`: Prevents server-only modules from leaking into client browser bundles.

### 3. Header UI & Anonymous Preservation
- Unauthenticated: Prominently renders **Sign in** button with `LogIn` icon in the header actions row. Clicking it immediately directs the user to central SSO.
- Authenticated: Renders the user's avatar initial, display name or user ID, identity badge (`Persistent` or `Ephemeral`), and an account dropdown menu offering user metadata and `Sign out`.
- Expired Session: Renders a warning badge with one-click re-authentication.
- Zero V0 Friction: Anonymous users have 100% access to Markdown input, text pasting, sample content loading, TTS narration, speed cycling, and highlighting. Authentication is strictly optional.

### 4. Application Registration Details
- Application ID: `yappout`
- Application Name: `YappOut`
- Primary Origin: `https://yappout.yetvast.com`
- Allowed Callback URLs:
  - Production: `https://yappout.yetvast.com/api/auth/callback`
  - Local Dev: `http://localhost:3000/api/auth/callback`
- Client Type: Public Client (OAuth 2.0 PKCE S256)
- Enabled Providers: `["google"]` (or `["google", "github"]`)

---

## Part D — Verification

All verification gates were executed locally in the repository workspace.

### 1. Automated Test Suites (`npm test`)
```text
> yappout@0.1.0 test
> vitest run

 RUN  v3.2.7 C:/Users/yviyv/yvscodes/YetVastSolutions/yappout

 ✓ tests/authConfig.test.ts (5 tests)
 ✓ tests/sessionService.test.ts (8 tests)
 ✓ tests/speedController.test.ts (2 tests)
 ✓ tests/playbackController.test.ts (4 tests)
 ✓ tests/doubleTapDetector.test.ts (3 tests)
 ✓ tests/identityService.test.ts (3 tests)
 ✓ tests/scrollController.test.ts (2 tests)
 ✓ tests/readingSequence.test.ts (7 tests)
 ✓ tests/speechSynthesisAdapter.test.ts (9 tests)
 ✓ tests/appFlow.test.ts (3 tests)
 ✓ tests/wordTracker.test.ts (3 tests)
 ✓ tests/webSpeechReliability.test.tsx (13 tests)
 ✓ tests/authRoutes.test.ts (8 tests)
 ✓ tests/authIntegration.test.tsx (9 tests)
 ✓ tests/authService.test.ts (5 tests)
 ✓ tests/components.test.tsx (14 tests)

 Test Files  16 passed (16)
      Tests  98 passed (98)
   Start at  19:50:38
   Duration  8.70s
```
- **16 of 16 test files passed (100%)**.
- **98 of 98 unit and integration tests passed (100%)**.
- Tests specifically cover all 9 scenarios requested:
  1. Anonymous visitor usage (core reading engine).
  2. Sign-in action redirect to Yet Vast Auth `/authorize`.
  3. Successful authentication callback processing and cookie issuance.
  4. Display of authenticated identity, avatar, and badges.
  5. Session preservation across re-renders and refreshes.
  6. Sign-out cookie clearance and session invalidation.
  7. Rejection of invalid callback parameters and state mismatches.
  8. Handling of expired sessions with one-click reconnect.
  9. Preservation of reading engine invariants when unauthenticated or signed out.

### 2. TypeScript Static Typecheck (`npm run typecheck`)
```text
> yappout@0.1.0 typecheck
> tsc --noEmit

exit code: 0
```
- 0 type errors across all application, adapter, core, and test files.

### 3. ESLint Static Analysis (`npm run lint`)
```text
> yappout@0.1.0 lint
> eslint .

exit code: 0
```
- 0 errors, 0 warnings. Conforms strictly to Next.js flat-config rules.

### 4. Production Turbopack Build (`npm run build`)
```text
▲ Next.js 16.3.6 (Turbopack)
✓ Compiled successfully in 1849ms
  Running TypeScript ...
  Finished TypeScript in 4.0s ...
  Collecting page data using 8 workers ...
✓ Generating static pages using 8 workers (3/3) in 2.1s
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/auth/callback
├ ƒ /api/auth/login
├ ƒ /api/auth/logout
└ ƒ /api/auth/session

exit code: 0
```
- Next.js production build succeeded cleanly. Static pre-rendering for `/` and dynamic server-rendering for `/api/auth/*` routes.

---

## Part E — Remaining Work

### 1. Central Yet Vast Auth Application Registration (Action Required)
`yappout` is not yet present in the central Yet Vast Auth database. A central administrator must complete registration:
1. Log in to `https://auth.yetvast.com/admin` using an authorized administrator account (`YETVAST_AUTH_ADMIN_USER_IDS`).
2. Add a new application:
   - **Application ID:** `yappout`
   - **Application Name:** `YappOut`
   - **Allowed Redirect URIs:**
     - `https://yappout.yetvast.com/api/auth/callback`
     - `http://localhost:3000/api/auth/callback`
   - **Primary URL:** `https://yappout.yetvast.com`
   - **Enabled Providers:** `google` (and `github` if ephemeral access is enabled)
   - **Status:** `APPROVED`
3. Save the registration.

### 2. Vercel Environment Variables Configuration for Production
In the YappOut Vercel project dashboard:
- `NODE_AUTH_TOKEN`: GitHub Classic PAT (`read:packages`, `repo`) for build-time dependency downloads.
- `YAPPOUT_ORIGIN`: `https://yappout.yetvast.com`
- `YAPPOUT_APP_ID`: `yappout`
- `YETVAST_AUTH_ORIGIN`: `https://auth.yetvast.com`
- `YETVAST_AUTH_ISSUER`: `https://auth.yetvast.com`
- `YETVAST_AUTH_JWKS_URL`: `https://auth.yetvast.com/.well-known/jwks.json`
- `YETVAST_ALLOW_TEST_MODE`: `0`

### 3. Production SSO Verification
In accordance with documentation integrity standards, **production SSO verification is marked PENDING**. Live SSO must be tested against `https://auth.yetvast.com` once central registration is saved and the application is redeployed to `https://yappout.yetvast.com`.
