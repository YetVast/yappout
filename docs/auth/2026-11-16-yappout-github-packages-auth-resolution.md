# Forensic Diagnosis and Resolution: GitHub Packages Authentication on Vercel

> **Document ID:** YVS-AUDIT-2026-11-16-YAPPOUT-PKG-AUTH-RESOL  
> **Target Repository:** YappOut (`YetVastSolutions/yappout`)  
> **Upstream Authority:** Yet Vast Auth (`YetVastSolutions/yetvast-auth`, `https://auth.yetvast.com`)  
> **Reference Baseline:** `YET_VAST_HOME_GITHUB_PACKAGES_AUTHENTICATION_AUDIT.md` (`yvs-illu`)  
> **Date:** November 16, 2026  
> **Auditor:** Antigravity AI Engineering Assistant  
> **Standard:** `YVS-STD-2026-PKG-001`  
> **Status:** Repository-Side Resolution Complete; Production Vercel Dashboard Action Specified  

---

## 1. Original Error

During previous deployment attempts on Vercel, the dependency installation phase (`npm install` or `npm ci`) aborted with the following error:

```text
npm error code E401
401 Unauthorized - GET https://npm.pkg.github.com/download/@yetvast/auth/0.2.0/ba719cb98d432f1f1d367a05483cf10faf8df8d2
unauthenticated: User cannot be authenticated with the token provided.
```

---

## 2. Root Cause Analysis

A forensic analysis of npm registry authentication mechanics reveals the exact failure chain:

1. **Private GitHub Packages Scoped Registry:**  
   `@yetvast/auth` is published exclusively to GitHub Packages (`https://npm.pkg.github.com`). Unlike the public npmjs registry (`https://registry.npmjs.org`), GitHub Packages strictly requires authenticated HTTP requests with Bearer tokens even for read-only downloads of private packages.
2. **Container Isolation on Vercel:**  
   Vercel build runners execute inside ephemeral, pristine Linux container environments. They do not inherit developer workstation configurations (such as `~/.npmrc`). Dependency resolution depends entirely on the repository's `.npmrc` and environment variables configured in the Vercel project dashboard.
3. **Evaluation of `${NODE_AUTH_TOKEN}` in `.npmrc`:**  
   YappOut's root `.npmrc` specifies:
   ```ini
   @yetvast:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
   ```
   When npm parses this file in Vercel:
   - If `NODE_AUTH_TOKEN` is **unset**, **empty**, or **misnamed** in Vercel (for instance, if configured as `NPM_TOKEN` based on Yet Vast Home's historical divergence, or missing from the Production environment scope), npm evaluates the variable as an empty string.
   - npm sends an HTTP request with `Authorization: Bearer ` (empty token) to `https://npm.pkg.github.com/download/@yetvast/auth/0.2.0/...`.
   - GitHub Packages responds specifically with:  
     `unauthenticated: User cannot be authenticated with the token provided.`
4. **Token Incompatibilities:**  
   If an operator configured a GitHub **Fine-Grained Personal Access Token (beta)** or a token without the `repo` scope, GitHub Packages rejects the request with HTTP 401/403 because fine-grained tokens have limited npm registry support and cannot access packages tied to private source repositories (`yetvast/yetvast-auth`).

---

## 3. Repository Configuration Findings

An exhaustive inspection of the YappOut codebase confirmed the following repository state:

| Configuration Item | File Location | Observed State | Finding / Assessment |
|---|---|---|---|
| **Root `.npmrc`** | [/.npmrc](file:///c:/Users/yviyv/yvscodes/YetVastSolutions/yappout/.npmrc) | `@yetvast:registry=https://npm.pkg.github.com`<br>`//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}` | **Correct & Standard-Compliant.** Mapped strictly to `@yetvast` scope and uses `${NODE_AUTH_TOKEN}`. |
| **Git Tracking of `.npmrc`** | `git ls-files .npmrc` | Tracked (`.npmrc` present in index) | Confirmed tracked; not ignored by `.gitignore`. |
| **Declared Dependency** | [/package.json](file:///c:/Users/yviyv/yvscodes/YetVastSolutions/yappout/package.json#L14) | `"@yetvast/auth": "^0.2.0"` | Valid caret range matching published release `0.2.0`. |
| **Lockfile Metadata** | [/package-lock.json](file:///c:/Users/yviyv/yvscodes/YetVastSolutions/yappout/package-lock.json) | Complete entry with `resolved` and `integrity` sha512 checksums | **Clean & Valid.** Unlike Yet Vast Home, YappOut's lockfile contains valid checksums and the exact download URL. |
| **Framework Config** | [/next.config.ts](file:///c:/Users/yviyv/yvscodes/YetVastSolutions/yappout/next.config.ts) | Pure Next.js config (`reactStrictMode: true`) | Zero registry overrides or postinstall hooks. |
| **Vercel Config** | `vercel.json` | Absent | Standard Next.js auto-detection applies. |
| **Hardcoded Secrets** | Repository-wide | `git grep -i "ghp_"`, `github_pat_` | **Zero hardcoded credentials** found in tracked files. |
| **Environment Docs** | [/.env.example](file:///c:/Users/yviyv/yvscodes/YetVastSolutions/yappout/.env.example) | Updated to include `NODE_AUTH_TOKEN` in CI/CD Build section | Clearly separates build-time token from runtime auth variables. |

---

## 4. Token and Package Permission Requirements

Based on `yetvast-auth/docs/PRODUCTION_DEPLOYMENT.md` and live GitHub Packages verification:

### 4.1 Required Token Type
- **Mandatory:** GitHub **Classic** Personal Access Token (PAT).
- **Prohibited:** Fine-Grained PATs (beta). Fine-grained tokens frequently fail with HTTP 401 against GitHub Packages.

### 4.2 Required Token Scopes
1. **`read:packages`** (Mandatory): Grants authorization to download private npm packages from `npm.pkg.github.com`.
2. **`repo`** (Mandatory): Required because the package source repository `yetvast/yetvast-auth` is private. Without `repo`, GitHub denies access to packages originating from private repos even if `read:packages` is enabled.
3. **`write:packages`** (Publishers only): Prohibited for consumer applications like YappOut.

### 4.3 Organization Access
- In GitHub Organization settings (`https://github.com/orgs/yetvast/packages`):
- Package `@yetvast/auth` $\rightarrow$ **Package settings** $\rightarrow$ **Manage Actions access**:
  - `yappout` must be listed with **Read** access.
- The user account generating the Classic PAT must be a member or collaborator of the `yetvast` organization with access to the private repository.

---

## 5. Changes Implemented

1. **Repository `.env.example` Update:**  
   Added a dedicated build-time dependency installation section explicitly documenting `NODE_AUTH_TOKEN`, its required Classic PAT scopes (`read:packages`, `repo`), and a prominent warning that the variable must be named `NODE_AUTH_TOKEN` and never `NPM_TOKEN`.
2. **Permanent Engineering Standard Refinement:**  
   Updated [YET_VAST_PRIVATE_PACKAGE_CONSUMPTION_STANDARD.md](file:///c:/Users/yviyv/yvscodes/YetVastSolutions/yappout/docs/standards/YET_VAST_PRIVATE_PACKAGE_CONSUMPTION_STANDARD.md) with:
   - An isolated testing procedure utilizing `--userconfig nul` (Windows) / `--userconfig /dev/null` (POSIX) to verify package access independently of workstation `~/.npmrc`.
   - The invariant rationale for `NODE_AUTH_TOKEN` over `NPM_TOKEN`.
3. **Repository `README.md` Update:**  
   Updated Section 8 (*Deployment Verification Procedure*) to include the isolated token testing command and explicit Vercel environment setup instructions.
4. **Preserved Configuration Invariants:**  
   - Root `.npmrc` strictly preserved with `${NODE_AUTH_TOKEN}`.
   - `package-lock.json` strictly preserved without regeneration.
   - Core reading engine and V1 authentication architecture remained untouched.

---

## 6. Local Verification Results

To guarantee that the solution works without contamination from developer-level `~/.npmrc` credentials, isolated authentication tests were conducted:

### 6.1 Isolated Failure Reproduction Test
Simulated Vercel's clean container by passing `--userconfig nul` with `NODE_AUTH_TOKEN` unset:
```bash
cmd.exe /c "set NODE_AUTH_TOKEN=& npm view @yetvast/auth@0.2.0 version --userconfig nul --registry=https://npm.pkg.github.com"
```
- **Result:** `npm error code E401 / 401 Unauthorized - unauthenticated: User cannot be authenticated with the token provided.`
- **Significance:** Proved that when `NODE_AUTH_TOKEN` is unset in a clean environment, npm fails with the exact Vercel deployment error.

### 6.2 Isolated Variable Mismatch Test
Tested with `NPM_TOKEN` provided but `NODE_AUTH_TOKEN` unset:
```bash
# Injected NPM_TOKEN, deleted NODE_AUTH_TOKEN, with --userconfig nul
```
- **Result:** Failed with exact same E401 error.
- **Significance:** Proved that configuring `NPM_TOKEN` in Vercel instead of `NODE_AUTH_TOKEN` directly produces the observed deployment failure.

### 6.3 Isolated Authentication Success Test
Injected valid Classic PAT into `NODE_AUTH_TOKEN` with `--userconfig nul`:
```bash
# Injected valid token into NODE_AUTH_TOKEN with --userconfig nul
npm view @yetvast/auth@0.2.0 version --userconfig nul --registry=https://npm.pkg.github.com
```
- **Result:** `0.2.0` (HTTP 200 Success).
- **Significance:** Proved that YappOut's `.npmrc` interpolates `${NODE_AUTH_TOKEN}` and successfully authenticates against GitHub Packages in complete isolation from workstation configs.

### 6.4 Isolated Clean Installation (`npm ci`)
Executed `npm ci` with `--userconfig nul` and explicit `NODE_AUTH_TOKEN`:
```text
npm ci SUCCESS: added 574 packages, and audited 575 packages in 1m
exit code: 0
```
- Lockfile integrity verified; 574 packages installed cleanly.

### 6.5 Full Quality Verification Gates
Executed all quality gates in the repository workspace:
- **TypeScript Typecheck:** `npm run typecheck` (`tsc --noEmit`) $\rightarrow$ **0 errors (Pass)**.
- **ESLint Analysis:** `npm run lint` (`eslint .`) $\rightarrow$ **0 errors, 0 warnings (Pass)**.
- **Automated Tests:** `npm test` (`vitest run`) $\rightarrow$ **16 test files passed, 93/93 tests passed (100% Pass in 10.20s)**.
- **Next.js Production Build:** `npm run build` (Turbopack) $\rightarrow$ **Compiled in 711ms, static routes prerendered, dynamic routes generated (Pass)**.

---

## 7. Vercel Configuration Status

Direct API / dashboard access to the YappOut Vercel project is unavailable from this terminal environment. Therefore, no simulated or fabricated dashboard modifications are claimed.

### Mandatory Vercel Project Settings Configuration
An operator with administrative access to the Vercel project must verify and configure the following:

| Setting | Required Value | Notes |
|---|---|---|
| **Variable Name** | `NODE_AUTH_TOKEN` | **Must be exact.** Do NOT name it `NPM_TOKEN`. |
| **Variable Value** | Valid GitHub Classic Personal Access Token | Belongs to an authorized `yetvast` organization account. |
| **Token Scopes** | `read:packages` + `repo` | Both scopes mandatory for private source repository access. |
| **Environments** | **Production**, **Preview**, **Development** | Ensure Production is explicitly checked. |
| **Type / Protection** | **Sensitive** (Masked) | Prevents token display in build logs. |

---

## 8. Production Deployment Verification

Verification is strictly partitioned into distinct operational tiers:

| Verification Level | Requirement | Verified Status | Evidence |
|---|---|---|---|
| **Level 1: Repository Configuration** | `.npmrc` committed with `${NODE_AUTH_TOKEN}` | **VERIFIED** | Tracked in Git, validated syntax. |
| **Level 2: Isolated Local Auth** | Exact package retrieved via isolated token injection | **VERIFIED** | `npm view` returned `0.2.0` with `--userconfig nul`. |
| **Level 3: Local Installation** | Clean `npm ci` succeeds without global config | **VERIFIED** | Added 574 packages cleanly in 1m. |
| **Level 4: Local Quality Gates** | Typecheck, lint, 93 tests, and production build pass | **VERIFIED** | 100% green across all 4 gates. |
| **Level 5: Vercel Dependency Install** | Vercel retrieves `@yetvast/auth@0.2.0` | **PENDING** | Requires Vercel redeploy with dashboard env var. |
| **Level 6: Vercel Production Build** | Next.js Turbopack build succeeds on Vercel | **PENDING** | Awaits Vercel build execution. |
| **Level 7: Production Deployment** | Vercel reports successful live deployment | **PENDING** | Awaits live deployment URL confirmation. |

> [!IMPORTANT]
> In accordance with YVS documentation integrity rules, production deployment is explicitly marked **PENDING** until executed and verified in the Vercel project dashboard.

---

## 9. Remaining Blockers & Resolution Procedure

The only remaining blocker is the manual configuration of the secret in Vercel and triggering a cache-free redeployment:

1. Log in to [Vercel](https://vercel.com) and navigate to the **YappOut** project.
2. Go to **Settings** $\rightarrow$ **Environment Variables**.
3. Check existing variables:
   - If `NPM_TOKEN` exists, **delete it** or rename it to **`NODE_AUTH_TOKEN`**.
   - If `NODE_AUTH_TOKEN` is missing, **add it**.
4. Value: Paste an active GitHub Classic PAT with `read:packages` and `repo` scopes.
5. Environments: Check **Production**, **Preview**, and **Development**.
6. Save the variable.
7. Go to **Deployments**, click $\dots$ on the latest deployment, select **Redeploy**, and **uncheck "Use existing Build Cache"**.

---

## 10. Final Assessment

- **Diagnosis:** The Vercel `401 Unauthorized` failure was caused by Vercel evaluating `${NODE_AUTH_TOKEN}` as empty due to a missing or mismatched environment variable (`NPM_TOKEN` vs `NODE_AUTH_TOKEN`), or an incompatible token type.
- **Repository State:** The YappOut repository configuration (`.npmrc`, `package-lock.json`, `package.json`) is 100% correct, verified, and adheres to the canonical Yet Vast standard.
- **Path to Success:** Once `NODE_AUTH_TOKEN` is saved in Vercel project settings and a redeployment without build cache is triggered, Vercel will install `@yetvast/auth@0.2.0` and complete the production build cleanly.
