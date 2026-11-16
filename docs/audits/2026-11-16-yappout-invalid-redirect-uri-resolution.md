# Technical Audit & Incident Resolution: Yet Vast Auth INVALID_REDIRECT_URI

**Date:** 2026-11-16  
**Component:** YappOut Authentication Layer (`@yetvast/auth`)  
**Deployment Target:** `https://yappout.yetvast.com`  
**Central Authority:** `https://auth.yetvast.com`  
**Application ID:** `yappout`  
**Status:** RESOLVED & VERIFIED

---

## 1. Actual Redirect URI Observed

During production inspection, triggering the sign-in flow at `https://yappout.yetvast.com/api/auth/login` resulted in a 302 redirect with the following authorization URL:

```text
https://auth.yetvast.com/authorize?app_id=yappout&redirect_uri=https%3A%2F%2Fyappout.vercel.app%2Fapi%2Fauth%2Fcallback&state=...&code_challenge=...&code_challenge_method=S256
```

Extracting and URL-decoding the `redirect_uri` parameter:

```text
Actual redirect_uri: https://yappout.vercel.app/api/auth/callback
```

---

## 2. Registered Redirect URI

From the approved Yet Vast Auth central application registry for `yappout`:

- **Application ID:** `yappout`
- **Application Name:** `YappOut`
- **Status:** `APPROVED`
- **Domain Verification:** Verified
- **Primary Application URL:** `https://yappout.yetvast.com`
- **Registered Allowed Redirect URI:**

```text
Registered redirect_uri: https://yappout.yetvast.com/api/auth/callback
```

---

## 3. Exact Character-by-Character Mismatch

| Parameter | Actual Sent by YappOut | Registered in Yet Vast Auth | Match Status |
| :--- | :--- | :--- | :--- |
| **Scheme** | `https://` | `https://` | **MATCH** |
| **Hostname** | `yappout.vercel.app` | `yappout.yetvast.com` | **MISMATCH** (`vercel.app` vs `yetvast.com`) |
| **Port** | 443 (default HTTPS) | 443 (default HTTPS) | **MATCH** |
| **Path** | `/api/auth/callback` | `/api/auth/callback` | **MATCH** |
| **Query/Fragment** | None | None | **MATCH** |
| **Trailing Slash** | None | None | **MATCH** |

Central Yet Vast Auth enforces strict character-by-character validation of `redirect_uri` against the registered allowlist per OAuth 2.0 / RFC 6749 and OIDC specifications. Because the hostname differed (`yappout.vercel.app` vs `yappout.yetvast.com`), Yet Vast Auth returned:

```text
INVALID_REDIRECT_URI
The requested callback URL is not registered for "yappout".
```

---

## 4. Root Cause

1. **Origin Resolution Disconnect:**
   When YappOut was first configured for deployment on Vercel, the environment variable `YAPPOUT_ORIGIN` in the Vercel dashboard was assigned to the default Vercel preview domain `https://yappout.vercel.app`.
2. **Lack of Production Canonicalization in SDK Config:**
   `src/auth/config.ts` (`getYappoutAuthConfig()`) read `process.env.YAPPOUT_ORIGIN` directly without asserting or canonicalizing known preview domains (`*.vercel.app`) to the approved custom production domain (`https://yappout.yetvast.com`).
3. **Missing Request Host Inspection in Route Handlers:**
   `src/app/api/auth/login/route.ts` previously invoked `initiateLogin()` without inspecting the incoming HTTP `Request` headers (`host`, `x-forwarded-host`). Even when an end user navigated to `https://yappout.yetvast.com`, `initiateLogin()` fell back to the static `env.appOrigin` (`yappout.vercel.app`).
4. **Subsequent CSRF Inconsistency:**
   Because `env.appOrigin` was set to `https://yappout.vercel.app`, any subsequent POST to `/api/auth/logout` or origin check executed from `https://yappout.yetvast.com` would have encountered CSRF origin mismatch validation errors (`validateMutationOrigin`).

---

## 5. Files Changed

1. **`src/auth/config.ts`**:
   - Added `YAPPOUT_CANONICAL_ORIGIN = 'https://yappout.yetvast.com'` constant.
   - Enhanced `getYappoutAuthConfig()` to detect if `rawAppOrigin` references `*.vercel.app` in production and automatically canonicalize to `YAPPOUT_CANONICAL_ORIGIN`.
2. **`src/auth/authService.ts`**:
   - Updated `InitiateLoginInput` and `HandleCallbackInput` interfaces to accept optional `appOrigin?: string`.
   - Updated `initiateLogin` and `handleCallback` to prioritize `effectiveAppOrigin` across OAuth authorize redirect generation, code exchange, and safe returnTo validation.
3. **`src/app/api/auth/login/route.ts`**:
   - Inspects incoming `request.headers` (`x-forwarded-host`, `host`) and `url.host`.
   - Explicitly passes `https://yappout.yetvast.com` whenever the request originates from `yetvast.com`.
4. **`src/app/api/auth/callback/route.ts`**:
   - Inspects incoming request host and ensures `appOrigin` is `https://yappout.yetvast.com` for code exchange and post-login redirection.
5. **`src/auth/sessionService.ts`**:
   - Enhanced `validateMutationOrigin(request: Request)` to dynamically resolve the expected origin based on request headers, ensuring same-origin CSRF validation passes when running on `https://yappout.yetvast.com`.
6. **`.env.example`**:
   - Documented that `YAPPOUT_ORIGIN` must point to `https://yappout.yetvast.com` in production and must never be assigned `*.vercel.app`.
7. **`tests/authConfig.test.ts`**:
   - Added unit test verifying canonicalization of `vercel.app` domains to `https://yappout.yetvast.com`.
8. **`tests/authRoutes.test.ts`**:
   - Added integration test verifying `GET /api/auth/login` sends the canonical `yetvast.com` redirect URI when requested on `yetvast.com`.
9. **`tests/authService.test.ts`**:
   - Added unit test verifying `initiateLogin` respects explicit `appOrigin` overrides.

---

## 6. SDK Configuration Changes

The `@yetvast/auth` SDK consumption was corrected and hardened:

- Central authority configuration remains pinned to `https://auth.yetvast.com`.
- Application ID remains pinned to `yappout`.
- `createAppAuthorizeRedirect` now consistently receives `redirectUri: 'https://yappout.yetvast.com/api/auth/callback'`.
- `exchangeCodeForAssertion` now consistently passes `redirectUri: 'https://yappout.yetvast.com/api/auth/callback'`.
- All PKCE S256 parameters, transaction state cookies, and asymmetric JWKS verification contracts remain intact without weakening security boundaries.

---

## 7. Callback Route Verification

The callback route at `src/app/api/auth/callback/route.ts` was audited:

1. **URI Alignment:** Exactly matches `/api/auth/callback`.
2. **State Verification:** Validates `state` against the host-bound `yv_yappout_tx` cookie using constant-time string comparison (`timingSafeEqualStrings`).
3. **Code Exchange:** Executes server-to-server `exchangeCodeForAssertion` against `https://auth.yetvast.com/api/token`.
4. **JWKS Verification:** Asymmetrically verifies assertion tokens using remote JWKS endpoint at `https://auth.yetvast.com/.well-known/jwks.json`.
5. **Session Establishment:** Generates host-bound `yv_yappout_session` cookie and clears transaction cookie.
6. **Safe Navigation:** Enforces safe redirect destination using `isSafeRedirectUri` preventing open-redirect attacks.

---

## 8. Test Results

- **Unit & Integration Tests:** 101/101 tests passed across 16 test files.
- **TypeScript Static Typecheck (`npm run typecheck`):** PASSED with zero errors.
- **ESLint Code Quality (`npm run lint`):** PASSED with zero warnings or errors.
- **Production Build (`npm run build`):** PASSED with static optimization and dynamic route emission.

---

## 9. Manual Yet Vast Auth Registration Changes Required

**NONE.**  
The registered application in Yet Vast Auth (`yappout`) already has:
- Primary Application URL: `https://yappout.yetvast.com`
- Allowed Redirect URIs: `https://yappout.yetvast.com/api/auth/callback`
- Status: `APPROVED`

Testing `https://auth.yetvast.com/authorize` with `https://yappout.yetvast.com/api/auth/callback` succeeds with HTTP 200 OK and renders the sign-in interface. No modification to the approved central registration was required or performed.

---

## 10. Production Verification Status

- Code deployed to `main` (`commit 9929be7`).
- **Live Production Authorization Endpoint Probed (`https://yappout.yetvast.com/api/auth/login`):**
  - Returned HTTP 302 with Location:
    `https://auth.yetvast.com/authorize?app_id=yappout&redirect_uri=https%3A%2F%2Fyappout.yetvast.com%2Fapi%2Fauth%2Fcallback&state=...&code_challenge=...&code_challenge_method=S256`
  - URL-decoded `redirect_uri`: `https://yappout.yetvast.com/api/auth/callback`.
- **Live Yet Vast Auth Response:**
  - Invoking the generated URL against `https://auth.yetvast.com/authorize` returned **HTTP 200 OK**.
  - `INVALID_REDIRECT_URI` error is completely eliminated.
  - Successfully rendered the official "Sign in to yappout" authorization page with GitHub authentication provider.
- **Anonymous Reading Engine Verification:**
  - `GET /api/auth/session` returns `{"authenticated":false,"status":"ANONYMOUS","user":null}`.
  - Core text-to-speech reading engine remains 100% accessible to anonymous users without requiring sign-in.
