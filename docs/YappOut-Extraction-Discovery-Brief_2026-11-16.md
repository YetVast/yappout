# YappOut — Extraction Discovery Brief

**Date:** 16 November 2026  
**Current location:** Implemented inside Cogmit, according to product-owner confirmation  
**Target:** Independent YappOut project/repository  
**Status:** Discovery/specification pending; no extraction claimed

## Objective

Reverse-engineer the existing YappOut implementation inside the current Cogmit development source and define how it can become a standalone product without losing existing functionality or breaking Cogmit.

This is an extraction and architecture-discovery task first. It is not authorization to immediately move files, change data ownership, migrate user data or delete Cogmit code.

## Required deliverables

1. Feature inventory: every YappOut capability, including partial, hidden, experimental and disabled behavior.
2. User journeys: entry points, screens, actions, states, errors and completion conditions.
3. Code map: routes, components, hooks, services, server actions, API routes and shared utilities.
4. Data map: schemas, collections, documents, storage locations, identifiers, ownership and lifecycle.
5. Dependency map: Cogmit-specific dependencies, reusable shared capabilities and external services.
6. Identity and authorization model: Yet Vast identity, GitHub linking, GitHub repository authorization and any YappOut-specific roles.
7. Security review: OAuth scopes, token storage, CSRF, authorization checks, URL validation, secret exposure and auditability.
8. Integration contract: how YappOut currently interacts with Cogmit and what must become an explicit API or shared package.
9. Standalone architecture: proposed repository structure, runtime, persistence, deployment and environment configuration.
10. Data migration and compatibility plan.
11. Test and acceptance plan.
12. Phased implementation plan with rollback strategy.

## Constraints

- Do not invent features not found in source.
- Do not assume Cogmit's current storage model should be copied.
- Do not equate central Yet Vast sign-in with GitHub storage authorization.
- Do not expose GitHub OAuth tokens to browser code.
- Do not introduce paid cloud/server/database dependencies during the stated zero-cost development phase.
- Do not create shared packages merely for theoretical reuse.
- Do not remove or disable the existing Cogmit implementation during discovery.
- Preserve user data and existing YappOut behavior.
- Stop before production data migration, destructive changes or identity-model changes.

## Source-state warning

The inspected GitHub snapshot `yvnow/cogmit` / `MainCode` is dated January 2026 and does not show YappOut-named code. The current local branch/worktree or another branch must be located before the inventory can be considered complete.

## Acceptance condition

The discovery phase is complete only when the feature inventory, code/data/dependency maps, standalone boundary, migration approach, risks and implementation phases are documented and reviewed. Only then should extraction implementation begin.
