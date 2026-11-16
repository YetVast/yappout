# Implementation Record: Forensic Diagnosis and Resolution of GitHub Packages Authentication on Vercel

> **Document ID:** YVS-IMPL-2026-11-16-YAPPOUT-PKG-AUTH-RESOL  
> **Repository:** `YetVastSolutions/yappout`  
> **Date:** November 16, 2026  
> **Author:** Antigravity AI Engineering Assistant  
> **Standard:** `YVS-STD-2026-PKG-001`  
> **Audit Companion:** `docs/audits/2026-11-16-yappout-github-packages-auth-resolution.md`  
> **Status:** Completed, Fully Verified Locally, Documented, Vercel Dashboard Action Specified  

---

## Part A — Original Implementation Prompt

The complete, verbatim original prompt supplied for this task is recorded below:

```markdown
# YappOut — Forensic Diagnosis and Resolution of GitHub Packages Authentication Failure on Vercel

## 1. Objective

Resolve the Vercel deployment failure when YappOut installs its private dependency:

`@yetvast/auth@0.2.0`

Previous deployment error:

```text
npm error code E401
401 Unauthorized - GET https://npm.pkg.github.com/download/@yetvast/auth/0.2.0/...
unauthenticated: User cannot be authenticated with the token provided.
```

A comprehensive audit of Yet Vast Home and YappOut has already been prepared:

`YET_VAST_HOME_GITHUB_PACKAGES_AUTHENTICATION_AUDIT.md`

Read this document before making changes.

Your task is to use its findings, inspect the actual YappOut repository, identify the remaining authentication failure, implement any necessary repository-side corrections, and establish a precise verification procedure for Vercel.

The goal is a reproducible production deployment, not merely a successful local build.

## 2. Existing YappOut configuration — preserve unless evidence proves otherwise

The current root `.npmrc` is:

```ini
@yetvast:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

This configuration follows the canonical Yet Vast Auth deployment standard.

**Do not replace `NODE_AUTH_TOKEN` with `NPM_TOKEN`.**

The Yet Vast Home repository uses `${NPM_TOKEN}`, but that is a project-specific divergence and is not the standard we want.

YappOut's current `package-lock.json` was previously verified to contain proper `resolved` and `integrity` metadata.

Do not regenerate or modify the lockfile unnecessarily.

## 3. Phase 1 — Repository configuration audit

Inspect:

- `.npmrc`
- `package.json`
- `package-lock.json`
- `next.config.*`
- `vercel.json`, if present
- `.gitignore`
- `.env.example`
- README
- deployment documentation
- any npm installation scripts
- Git history for authentication-related changes

Verify:

1. `@yetvast` is mapped to `https://npm.pkg.github.com`.
2. `.npmrc` references exactly `${NODE_AUTH_TOKEN}`.
3. No hardcoded GitHub token exists in tracked files.
4. No incorrect registry override exists.
5. No installation script overwrites npm authentication.
6. The lockfile resolves `@yetvast/auth@0.2.0` from GitHub Packages.
7. The dependency installation process is compatible with Vercel.

Inspect whether `NODE_AUTH_TOKEN` is being confused with `NEXT_PUBLIC_*` variables or runtime application environment variables.

GitHub package authentication must be available during dependency installation. It must not be exposed to browser-side application code.

## 4. Phase 2 — Determine the actual authentication failure

Investigate these possible causes systematically:

### A. Environment variable mismatch

YappOut's `.npmrc` expects:

`NODE_AUTH_TOKEN`

Verify that the Vercel project is configured with precisely this variable name.

Check for:
- `NPM_TOKEN` configured instead of `NODE_AUTH_TOKEN`.
- Incorrect spelling or capitalization.
- Variable configured only for Preview instead of Production.
- Variable configured in a different Vercel project.
- Variable added after the deployment without triggering a fresh deployment.
- Empty or incorrectly copied secret value.

Do not assume the variable exists merely because the repository documentation mentions it.

### B. Invalid GitHub token

The canonical Yet Vast Auth production deployment documentation requires a GitHub Classic Personal Access Token for GitHub Packages npm consumption.

The token should have:

- `read:packages`
- `repo` when required to access the private package's source repository.

`write:packages` is not required for consumer applications.

Verify whether the credential provisioned for Vercel is:
- A Classic PAT.
- A Fine-grained PAT.
- A GitHub Actions `GITHUB_TOKEN`.
- Another credential.

A token that works in a developer's global `~/.npmrc` does not prove that the Vercel environment variable contains the same valid credential.

### C. Package access permissions

Inspect the actual package ownership and linked source repository for `@yetvast/auth`.

Do not assume repository ownership based solely on old documentation or organization naming.

Verify:
- Actual GitHub package owner.
- Linked source repository.
- Whether the token owner can access the private source repository.
- Whether the consuming YappOut project has the required package read access.
- Whether organization policies, SAML SSO or token authorization restrictions apply.

Differentiate authentication failures from package authorization failures.

## 5. Phase 3 — Test without global npm authentication contamination

Local developer machines may have a working global `~/.npmrc`.

This can conceal the actual problem.

Perform an isolated authentication test.

The test must:

1. Use the repository's `.npmrc`.
2. Explicitly inject the `NODE_AUTH_TOKEN` environment variable.
3. Avoid silently falling back to global credentials.
4. Never print the token.
5. Query the exact private package version.

Test:

```bash
npm view @yetvast/auth@0.2.0 version --registry=https://npm.pkg.github.com
```

Then perform a clean dependency installation using the same explicit credential.

If the test succeeds, record the result without exposing the credential.

If it fails, capture the sanitized error and determine whether it indicates:
- Missing token.
- Invalid token.
- Insufficient scopes.
- Missing package access.
- Package/version not found.
- Network or registry issue.

Do not report a successful authentication test unless the exact package can be retrieved using the explicitly injected credential.

## 6. Phase 4 — Vercel configuration resolution

Determine whether you have access to the actual YappOut Vercel project settings.

If access is available:

1. Inspect the environment variable configuration.
2. Confirm `NODE_AUTH_TOKEN` exists.
3. Verify its Production, Preview and Development environment assignments.
4. Confirm that it is configured as a sensitive secret.
5. Replace it only if it is missing, invalid or incorrectly configured.
6. Do not expose its value in terminal output, logs, generated reports or source files.

If access is unavailable, do not pretend to have modified Vercel.

Instead, provide the exact manual configuration required:

| Setting | Required value |
|---|---|
| Variable name | `NODE_AUTH_TOKEN` |
| Value | Valid GitHub Classic PAT |
| Scope | `read:packages` and `repo` where required |
| Environment | Production, Preview, Development |
| Sensitive | Enabled |

The token must belong to an account authorized to read the actual private package.

After correcting the environment variable, trigger a fresh deployment without using the existing build cache.

## 7. Phase 5 — Validate the complete application

After repository-side corrections, execute:

1. Clean dependency installation (`npm ci`).
2. TypeScript type checking.
3. Lint.
4. Unit and integration tests.
5. Next.js production build.

Preserve the existing project standards and avoid unrelated code changes.

Do not change authentication application logic, UI, routes or Firebase configuration unless the investigation establishes a direct connection to the npm installation failure.

## 8. Phase 6 — Establish Vercel production verification

The final verification must distinguish:

| Verification level | Requirement |
|---|---|
| Repository configuration | `.npmrc` is correct and committed |
| Local authentication | Exact private package retrieved using explicit `NODE_AUTH_TOKEN` |
| Local installation | Clean `npm ci` succeeds |
| Local quality gates | Typecheck, lint, tests and production build succeed |
| Vercel dependency installation | Vercel successfully retrieves `@yetvast/auth@0.2.0` |
| Vercel production build | Next.js production build succeeds |
| Production deployment | Vercel reports successful deployment |

Do not label the problem resolved at the production level until the actual Vercel deployment succeeds.

## 9. Phase 7 — Documentation

Update the existing YappOut deployment documentation and private-package consumption standard only where necessary.

Document:

- The actual root cause.
- The exact correction.
- Why `NODE_AUTH_TOKEN` is the standard.
- Required token type and permissions.
- Vercel environment configuration.
- How to test authentication independently of global npm credentials.
- Verification status.

If the Vercel environment variable was not accessible, explicitly mark that action as pending.

Do not mark Vercel deployment as verified based on local results.

## 10. Deliverables

Create:

`docs/audits/2026-11-16-yappout-github-packages-auth-resolution.md`

Include:

1. Original error.
2. Root cause.
3. Repository configuration findings.
4. Token and package permission findings.
5. Changes implemented.
6. Local verification results.
7. Vercel configuration status.
8. Production deployment verification.
9. Remaining blockers.
10. Final assessment.

Also provide a concise implementation summary containing:
- Files changed.
- Commands executed and results.
- Whether a new commit was created.
- Whether Vercel settings were actually modified.
- Whether a successful production deployment was observed.

## 11. Non-negotiable constraints

- Do not expose or commit secrets.
- Do not create a new token automatically.
- Do not change `.npmrc` to `${NPM_TOKEN}`.
- Do not weaken package security.
- Do not regenerate a valid lockfile without a demonstrated reason.
- Do not make unrelated application changes.
- Do not claim that Vercel authentication is fixed without actual Vercel evidence.
- Preserve the existing Yet Vast Solutions development standards.

**Final objective: Make YappOut reliably consume `@yetvast/auth@0.2.0` from GitHub Packages during Vercel dependency installation and achieve a verified production deployment.**
```

---

## Part B — Initial Repository Findings

### 1. Context and Audit Input
The audit document `YET_VAST_HOME_GITHUB_PACKAGES_AUTHENTICATION_AUDIT.md` (located in `yvs-illu`) established that:
- Yet Vast Home previously committed `.npmrc` with `//npm.pkg.github.com/:_authToken=${NPM_TOKEN}`, which diverges from the upstream Yet Vast Auth specification (`NODE_AUTH_TOKEN`).
- Yet Vast Home's production Vercel deployment remains officially **Pending** and unverified.
- Developer workstations possess a global `~/.npmrc` containing an authenticated GitHub Classic PAT, which concealed authentication failures during local development.

### 2. YappOut Repository Findings Prior to Modifications
- **`.npmrc`:** Correctly configured at the repository root with `@yetvast:registry=https://npm.pkg.github.com` and `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}`. Tracked in git (`git ls-files .npmrc`).
- **`package.json`:** Correctly declares `"@yetvast/auth": "^0.2.0"`.
- **`package-lock.json`:** Verified to contain valid `version: 0.2.0`, `resolved: "https://npm.pkg.github.com/download/@yetvast/auth/0.2.0/ba719cb98d432f1f1d367a05483cf10faf8df8d2"`, and `integrity: "sha512-oBzZhERDQ/nkXXjrgLGUdmS7FnvHy/tv/I9wq4lKqVMZHn+5ZPNivrzVN4Z+JWN9beUQ603SmOfyjwlw+B9Ndw=="`. Lockfile is clean and intact.
- **`next.config.ts`:** Standard configuration with no custom build hooks or registry overrides.
- **`vercel.json`:** Absent (Next.js auto-detection standard on Vercel).
- **`.gitignore`:** Does not ignore `.npmrc`.
- **Tracked Secrets Inspection:** `git grep -i "ghp_"` and `git grep -i "github_pat_"` yielded zero hardcoded tokens.
- **`.env.example`:** Contained runtime variables only; lacked explicit build-time `NODE_AUTH_TOKEN` documentation.
- **Vercel CLI / Access:** No Vercel CLI credentials or `.vercel` project links exist on this workstation.

---

## Part C — Implementation Report

### 1. Files Created and Modified

| Action | Path | Description |
|---|---|---|
| **Created** | `docs/audits/2026-11-16-yappout-github-packages-auth-resolution.md` | Formal 10-section forensic audit and resolution specification. |
| **Created** | `docs/implementation/2026-11-16-yappout-github-packages-auth-resolution.md` | This permanent 5-part implementation record. |
| **Modified** | `.env.example` | Added dedicated Build-Time CI/CD section documenting `NODE_AUTH_TOKEN` with required scopes and explicit warning against `NPM_TOKEN`. |
| **Modified** | `README.md` | Updated Section 8 to include isolated authentication test commands (`--userconfig nul` / `--userconfig /dev/null`). |
| **Modified** | `docs/standards/YET_VAST_PRIVATE_PACKAGE_CONSUMPTION_STANDARD.md` | Updated Step 4 and Section 3 to document isolated token testing and the `NODE_AUTH_TOKEN` invariant. |

### 2. Configuration Invariants Preserved
- Root `.npmrc` strictly preserved with `${NODE_AUTH_TOKEN}`.
- `package-lock.json` preserved without unnecessary regeneration.
- No changes to application UI, player controls, TTS adapters, or auth routes.

### 3. Isolated Testing Mechanism
Documented the command to test GitHub Packages authentication in total isolation from global `~/.npmrc` credentials:
```bash
# Windows
set NODE_AUTH_TOKEN=ghp_...
npm view @yetvast/auth@0.2.0 version --userconfig nul --registry=https://npm.pkg.github.com

# Linux / macOS
NODE_AUTH_TOKEN=ghp_... npm view @yetvast/auth@0.2.0 version --userconfig /dev/null --registry=https://npm.pkg.github.com
```

---

## Part D — Verification

All verification steps were performed locally in the repository workspace.

### 1. Failure Reproduction Test (Isolated)
- Executed `npm view @yetvast/auth@0.2.0 version --userconfig nul` with `NODE_AUTH_TOKEN` unset.
- **Result:** Failed with `npm error code E401 / 401 Unauthorized - unauthenticated: User cannot be authenticated with the token provided.`
- **Finding:** Reproduces the exact Vercel failure mode.

### 2. Variable Mismatch Failure Test (Isolated)
- Executed with `NPM_TOKEN` set and `NODE_AUTH_TOKEN` unset, passing `--userconfig nul`.
- **Result:** Failed with exact same E401 error.
- **Finding:** Confirms that setting `NPM_TOKEN` instead of `NODE_AUTH_TOKEN` in Vercel causes the observed build failure.

### 3. Isolated Authentication Success Test
- Executed `npm view @yetvast/auth@0.2.0 version --userconfig nul` with valid Classic PAT injected into `NODE_AUTH_TOKEN`.
- **Result:** `0.2.0` (HTTP 200).
- **Finding:** Confirms repository `.npmrc` successfully authenticates against GitHub Packages when `NODE_AUTH_TOKEN` is present, without reliance on developer `~/.npmrc`.

### 4. Isolated Clean Installation (`npm ci`)
- Executed `npm ci --userconfig nul` with explicit `NODE_AUTH_TOKEN`.
- **Result:** `added 574 packages, and audited 575 packages in 1m` (exit code: 0).

### 5. Quality Verification Gates
- **TypeScript Typecheck:** `npm run typecheck` (`tsc --noEmit`) $\rightarrow$ **0 errors (exit code: 0)**.
- **ESLint Analysis:** `npm run lint` (`eslint .`) $\rightarrow$ **0 errors, 0 warnings (exit code: 0)**.
- **Automated Tests:** `npm test` (`vitest run`) $\rightarrow$ **16 passed test files, 93 passed tests (100% pass in 10.20s, exit code: 0)**.
- **Next.js Production Build:** `npm run build` (Turbopack) $\rightarrow$ **Compiled in 711ms, TypeScript finished in 3.5s, static and dynamic routes generated (exit code: 0)**.

### 6. Production Deployment Verification Tiers
- **Levels 1–4 (Repository, Local Auth, Local Install, Quality Gates):** **VERIFIED (100%)**.
- **Levels 5–7 (Vercel Install, Vercel Build, Production Deployment):** **PENDING MANUAL VERCEL DASHBOARD CONFIGURATION**.

---

## Part E — Remaining Work

### 1. Required Manual Operator Actions in Vercel
Because direct Vercel CLI credentials are not configured in this environment, an operator must perform the following configuration in the Vercel web console:

1. Open project **YappOut** at `https://vercel.com`.
2. Go to **Settings** $\rightarrow$ **Environment Variables**.
3. Configure `NODE_AUTH_TOKEN`:
   - **Key:** `NODE_AUTH_TOKEN` (Ensure it is NOT named `NPM_TOKEN`).
   - **Value:** Valid GitHub Classic PAT belonging to an authorized `yetvast` organization member.
   - **Scopes Required:** `read:packages` and `repo`.
   - **Environments:** Check **Production**, **Preview**, and **Development**.
   - **Sensitive:** Checked (enabled).
4. Save the environment variable.
5. In **Deployments**, trigger a **Redeploy** on the latest commit with **"Use existing Build Cache" unchecked**.

### 2. Recommended Next Steps for Other Repositories
- Update `yvs-illu` (`YetVastSolutions/yetvast-home`) to replace its `.npmrc` `${NPM_TOKEN}` with `${NODE_AUTH_TOKEN}` to unify all Yet Vast consumer applications under the canonical standard `YVS-STD-2026-PKG-001`.
