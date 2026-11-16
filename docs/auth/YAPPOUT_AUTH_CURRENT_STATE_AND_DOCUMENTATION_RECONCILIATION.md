# YappOut — Current Authentication State and Documentation Reconciliation

**Prepared:** 16 November 2026  
**Purpose:** Resolve status conflicts among the YappOut SSO integration report, redirect-URI incident report and package-authentication incident report.  
**Evidence boundary:** This reconciliation uses the supplied dated reports. It does not independently query the live Auth registry, Vercel dashboard or deployed application.

## 1. Current best-supported status

| Area | Best-supported state in supplied evidence | Qualification |
|---|---|---|
| YappOut V0 reader | Implemented as anonymous-first, client-side reading app | See canonical V0 product specification |
| Yet Vast Auth SDK integration | Implemented and locally verified | SSO integration report records SDK usage and automated tests |
| Central app registration | `yappout` is reported as `APPROVED` | Later redirect incident report explicitly confirms this; it supersedes the earlier SSO report's "not yet registered" statement |
| Redirect URI mismatch | Resolved in the 16 November incident report | The deployed login endpoint was observed sending the canonical `https://yappout.yetvast.com/api/auth/callback` URI |
| Central authorize page | HTTP 200 and sign-in interface rendered | This proves the authorization page is reachable, not that a complete real-user callback/session round trip succeeded |
| End-to-end production sign-in | Not conclusively demonstrated by the supplied reports | A successful real Google sign-in, callback, code exchange, JWKS verification and session persistence should be recorded separately |
| Private package installation locally | Verified with isolated `NODE_AUTH_TOKEN`; clean install and local quality gates reported passing | See GitHub Packages resolution report |
| Vercel package install / production build | Pending in the package-auth report | Verify current Vercel environment configuration and latest deployment; do not infer success from local installation |

## 2. Superseded statements

### 2.1 Central application registration

The SSO integration report says `yappout` was not registered and gives a proposed registration JSON. The later `2026-11-16-yappout-invalid-redirect-uri-resolution.md` states that the production registry already contained `yappout` with `APPROVED` status, verified domain, canonical primary URL and canonical callback URI. It also says no central registration change was required.

**Use the later incident report as the newer status record.** Do not repeat the old "not registered" statement or treat its proposed JSON as an instruction to create a duplicate registration.

### 2.2 Redirect URI

The redirect incident report identifies the previous runtime origin mismatch (`yappout.vercel.app` versus `yappout.yetvast.com`) and records the code/configuration correction. The canonical production callback in that report is:

`https://yappout.yetvast.com/api/auth/callback`

Do not reintroduce the Vercel hostname as the production callback.

### 2.3 Test counts

The supplied reports record different test totals at different implementation snapshots:
- SSO integration report: 98 tests.
- Redirect incident report: 101 tests.
- Package-authentication incident report: 93 tests.

These figures must not be combined or represented as one current total. Rerun the current repository's `npm test`, typecheck, lint and build to establish the present baseline.

### 2.4 Provider-policy discrepancy

The SSO report's proposed registration JSON lists Google only, while its flow description and the later redirect incident's authorization-page observation mention a GitHub provider. The supplied documents do not conclusively establish the current enabled-provider configuration for `yappout`.

Check the live central application record and current Auth policy before claiming that GitHub is enabled for YappOut. Do not alter provider policy based only on an old example JSON or a rendered sign-in page.

## 3. Required next verification

1. Confirm the latest deployed YappOut commit and Vercel deployment status.
2. Confirm `YAPPOUT_ORIGIN` is `https://yappout.yetvast.com` in the Production environment and that no runtime configuration overrides the canonical origin.
3. Confirm the central `yappout` application remains `APPROVED`, its primary origin is correct, and the allowed callback is exactly `https://yappout.yetvast.com/api/auth/callback`.
4. Confirm the intended provider list in the central application record.
5. Execute a real Google sign-in from `https://yappout.yetvast.com`.
6. Verify callback state validation, server-to-server code exchange, JWKS signature/claims validation, host-bound session cookie creation, authenticated session retrieval and logout.
7. Separately verify Vercel can install private `@yetvast/*` packages using `NODE_AUTH_TOKEN` in the Production environment.
8. Record fresh command output, deployment identifier and observed browser results in a new dated implementation report.

## 4. Non-negotiable distinction

- `NODE_AUTH_TOKEN` is a build-time GitHub Packages credential.
- OAuth state, PKCE verifier, central authorization code and signed identity assertion belong to the runtime user-authentication flow.
- The application session cookie is a separate, host-bound YappOut session.

These credentials have different purposes and must never be interchanged.

## 5. Documentation precedence

For current YappOut sign-in:
1. This reconciliation document — resolves status conflicts among supplied reports.
2. `2026-11-16-yappout-invalid-redirect-uri-resolution.md` — later redirect and registration observation.
3. `2026-11-16-yappout-yetvast-auth-sso-integration.md` — SDK implementation and original integration test record.
4. `2026-11-16-yappout-github-packages-auth-resolution.md` — private package build-auth incident.
5. Current central Yet Vast Auth documentation and source — authoritative for central identity, registration, provider and SDK contracts.

A later source-code inspection or live production observation supersedes this snapshot and should be documented with its date and evidence.
