# YappOut — Curated Project Documentation Pack

**Prepared:** 16 November 2026  
**Purpose:** Keep the product baseline, completed Yet Vast Auth sign-in integration, shared YVS standards, and essential extraction history together without retaining duplicate or superseded documents in the active documentation root.

## Current documentation authority

Read in this order:

1. `docs/auth/YAPPOUT_AUTH_CURRENT_STATE_AND_DOCUMENTATION_RECONCILIATION.md` — resolves dated status conflicts and states what production sign-in is and is not proven to do.
2. `docs/product/YAPPOUT_V0_PRODUCT_AND_TECHNICAL_DOCUMENTATION.md` — authoritative V0 product and implementation baseline.
3. `docs/auth/2026-11-16-yappout-yetvast-auth-sso-integration.md` — application-specific central Auth integration, SDK usage, app registration and verification report.
4. `docs/auth/2026-11-16-yappout-invalid-redirect-uri-resolution.md` — concrete redirect URI incident, correction and remaining production verification.
5. `docs/auth/2026-11-16-yappout-github-packages-auth-resolution.md` — private package install / Vercel build authentication resolution.
6. `docs/shared/Yet-Vast-Auth-Updated-Project-Documentation_2026-11-16.md` — current central Auth architecture and policy. The central Auth source code and live registration remain authoritative.
7. `docs/shared/Yet-Vast-Auth-Project-Handbook_UPDATED_2026-11-16.md` — operational and integration handbook for the central Auth service.
8. `docs/shared/YET_VAST_PRIVATE_PACKAGE_CONSUMPTION_STANDARD.md` — mandatory build-time package authentication standard.
9. `docs/shared/YVS_Application_Development_Standards_v1.0.0.md` — mandatory engineering conventions.
10. `docs/shared/YVS-ARCHITECTURE-CONTEXT_UPDATED_2026-11-16.md` — umbrella architecture, brand and product-boundary context.

## Important interpretation: V0 baseline versus current app

The supplied dated reports contain conflicting registration and test-status statements. The reconciliation document above identifies which later evidence supersedes earlier statements. The V0 product specification intentionally excluded accounts and authentication. That exclusion accurately describes the original V0 release scope; it is not the current application scope after the later Yet Vast Auth SSO integration. For sign-in behavior, use the dated SSO integration report and current central Auth documentation. Do not rewrite the historical V0 scope as if authentication had existed from the beginning.

The V0 reader remains browser-local for reading content. Authentication does not imply that the reader's text, documents, or playback state are uploaded to a backend. Any future persistence or account-linked features require a separate product and privacy decision.

## Folder map

- `docs/product/` — current product and technical baseline.
- `docs/auth/` — YappOut-specific SSO integration and two operational incident records.
- `docs/shared/` — shared YVS and central Auth references.
- `docs/history/` — pre-extraction audit and discovery records; useful provenance, not current implementation instructions.

## What was deliberately not copied

The following were excluded because they are superseded duplicates, belong to another application, or are not needed to build/maintain YappOut sign-in:

- Original, non-updated copies of the Yet Vast Auth handbook, project history, Home handbook and architecture context.
- `Yet-Vast-Auth-Updated-Project-Documentation-2026-11-14.md` (superseded by the 16 November update).
- `Yet-Vast-Auth-and-Home-Project-History.md` (superseded by its 16 November updated version and not needed in the consumer repo).
- `Yet-Vast-Home-Project-Handbook.md` and its updated version (Home-specific).
- `Cogmit-Project-Handbook_UPDATED_2026-11-16.md` (Cogmit-specific).
- `UPDATE-README.md` (archive assembly note, not a project standard).

## Maintenance rules

- Do not edit shared Auth architecture in this consumer repository. Update it in the Yet Vast Auth source project, then refresh this reference copy.
- Keep YappOut-specific implementation reports in `docs/auth/` and update them when the actual code or central registration changes.
- Do not treat a locally passing build as proof of successful production sign-in. Verify the deployed OAuth round trip, registered callback URI, app approval/status, allowed provider and host-bound session.
- Package download authentication (`NODE_AUTH_TOKEN`) is build-time GitHub Packages access. It is not an end-user sign-in credential.
- Never commit tokens, OAuth secrets, service-account keys or private keys.
