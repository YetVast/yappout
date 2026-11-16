# Yet Vast Solutions
# Application Development Standards

**Document ID:** YVS-ADS-001  
**Version:** 1.0.0  
**Status:** Consolidated baseline — review before publication  
**Organization:** Yet Vast Solutions (YVS)  
**Intended repository:** `yetvastsolutions/yvs-guidelines`  
**Applies to:** Applications and software products developed under the Yet Vast Solutions umbrella

---

## Document purpose

This document establishes the common engineering, architecture, security, AI-development, quality, and visual-design foundation for software products developed under Yet Vast Solutions.

It consolidates two complementary bodies of work:

1. The YVS architecture context, which establishes organizational identity, product independence, standards governance, visual language, cost philosophy, and AI-development principles.
2. The later engineering standards work, which expands implementation discipline around architecture, security, data integrity, code quality, testing, and verification, informed in part by the Cogmit implementation audit.

The objective is consistent engineering discipline across YVS products—not identical product architectures.

**Products retain their own requirements, architecture, data ownership, and product-specific invariants.** This standard defines the shared foundation; it does not prescribe one universal application design.

## 1. Organization and scope

### 1.1 Organization identity

- **Organization:** Yet Vast Solutions
- **GitHub organization:** `yetvastsolutions`
- **Standards repository:** `yetvastsolutions/yvs-guidelines`

Yet Vast Solutions is the organizational umbrella. Product names, application names, and product families must not be represented as the organization itself.

Each product is maintained in its own repository unless an explicitly approved organizational decision establishes otherwise.

Products referenced in existing YVS context include YAI Studio, Cogmit, VastComm, FYUniverse, Yapout, and YVS-Illu. This list is not a declaration that every referenced product is live. Product status must be stated accurately and must not be inferred from its presence in documentation.

### 1.2 Applicability

This standard applies to software applications developed under YVS, including web applications, APIs, services, and supporting software.

A product may have additional specifications and stricter controls. Those remain applicable to that product.

### 1.3 What this standard does not do

This standard does not:

- define every product's features or user journeys;
- select a database, hosting provider, authentication system, or framework for every product;
- make all products share one architecture;
- make YVS Guidelines a runtime service or application dependency;
- authorize infrastructure or features merely because they are described here;
- supersede product-specific locked specifications or security requirements.

## 2. Standards authority and precedence

### 2.1 Central standards ownership

The `yvs-guidelines` repository is the central home for YVS organization-wide engineering and product-development standards. Its scope includes the engineering constitution, AI implementation guidance, architecture, security, development, deployment, public organization information, YVS Visual Language, canonical visual tokens, and standards versioning.

The YVS Architecture Context recorded **YVS Guidelines v1.2.2** as the established version on 2026-09-21. Before adopting this document as a repository release, verify the actual current repository version and reconcile any intervening changes. Do not assume that the recorded version is still the latest.

### 2.2 Product version pinning

Every product must identify the specific YVS Guidelines version it adopts.

A product must not silently change implementation because the central guidelines repository changes. A new guidelines release becomes applicable to a product through an explicit adoption or upgrade decision.

YVS Guidelines is a development/reference standard, not a runtime dependency. Products must not:

- import the guidelines repository as an application dependency;
- fetch guidelines during normal application operation;
- require GitHub access for the application to function;
- dynamically retrieve design tokens from the guidelines repository at runtime;
- use the guidelines repository as a runtime configuration service.

Products implement the applicable standards locally.

### 2.3 Precedence

When requirements conflict, use this order:

1. Applicable law, binding regulatory requirements, and platform security requirements.
2. Organization-wide YVS standards adopted by the product, including the pinned guidelines version.
3. Product-specific approved architecture, specifications, and locked invariants.
4. Technology-specific conventions and implementation guidance.
5. Local implementation choices.

This ordering does not authorize a general standard to erase a more restrictive product-specific invariant. Where an apparent conflict exists, stop and resolve it explicitly with the responsible decision-maker. Do not silently reinterpret either requirement.

### 2.4 Change control

AI agents and developers must not silently modify YVS standards during ordinary product implementation. Changes to organization-wide standards require an explicit standards change, review, version update, and communication to affected products.

## 3. Product independence and ownership

### 3.1 Products own their own product information

Each product is the source of truth for its own product information, application data, and product-specific documentation.

A presentation or discovery application must not become a central database containing manually duplicated descriptions or operational data for every product.

### 3.2 Organization information versus product information

Keep these ownership domains distinct:

- Organization-wide public information belongs in the intentionally public area of YVS Guidelines or another explicitly approved YVS public source.
- Product information belongs to the individual product repository or application.
- A presentation/discovery layer presents information; it does not become the source of truth for the products it presents.

Only information intentionally placed in an approved public area is public YVS knowledge.

### 3.3 Public product contracts

A product may eventually expose a small public machine-readable contract, conceptually such as `public/product.yaml`, containing fields like name, slug, description, status, and homepage.

This is a design option, not a universal implementation requirement. Do not create synchronization infrastructure merely to support it. Introduce a contract only when a concrete consumer and ownership model exist.

### 3.4 No accidental coupling

Products must not depend on another product's private application, database, UI implementation, or internal operational data unless an explicitly approved integration contract requires it.

Prefer stable, minimal interfaces over shared internal implementation.

## 4. Core engineering philosophy

YVS software should be understandable, maintainable, secure, and proportionate to actual requirements.

The following principles apply across products:

1. **Simplicity before infrastructure.** Choose the simplest architecture that satisfies established requirements.
2. **Least redundancy.** Do not store facts already reliably represented by structure or authoritative data.
3. **Explicit behavior.** Important state changes, permissions, side effects, and failure conditions must be visible in the design.
4. **One source of truth per responsibility.** Avoid competing pipelines or duplicated authorities for the same operation.
5. **Clear ownership.** Every important piece of data and behavior should have an identifiable owner.
6. **Minimal change surface.** Implement the requested change without unrelated refactoring.
7. **Reuse before duplication.** Inspect existing code and capabilities before creating new ones.
8. **Native capability before dependency.** Prefer platform or framework capabilities when they meet the requirement.
9. **Evidence before invention.** Distinguish verified facts from assumptions and unknowns.
10. **No speculative abstraction.** Do not build generic systems for hypothetical future requirements.
11. **Preserve intent and invariants.** Refactoring must not alter externally observable behavior or violate approved constraints unless that change is explicitly requested and approved.
12. **Incremental evolution.** Architecture grows in response to demonstrated needs, not imagined scale.

## 5. Architecture and module boundaries

### 5.1 Architecture must follow product requirements

Each product must document its own architecture at an appropriate level before implementation. The architecture should identify:

- application boundaries and deployment units;
- trust boundaries;
- data ownership and persistence locations;
- authentication and authorization responsibilities;
- important request and mutation flows;
- external integrations;
- failure and recovery behavior;
- operational dependencies.

Do not copy another YVS product's architecture merely because it exists.

### 5.2 Dependency direction

Use clear dependency direction. Business rules should not be entangled with presentation, transport, or infrastructure details.

For a Next.js application, a reasonable default is:

`app → components → lib → constants`

This is a starting convention, not a universal mandate. Adapt it only where the chosen framework or documented architecture requires a different structure.

Specific rules:

- Components must not import from route modules.
- Route handlers and server entry points should coordinate application behavior rather than become repositories for all business logic.
- Shared modules should have clear ownership and stable responsibilities.
- Avoid circular dependencies.
- Keep server-only code and secrets out of client bundles.
- Do not introduce layers that merely forward calls without adding a meaningful boundary.

### 5.3 One authoritative workflow per responsibility

A responsibility such as publishing, importing, processing, or synchronizing should have one clearly authoritative workflow unless multiple workflows are an explicit product requirement.

Avoid parallel implementations that produce competing state or inconsistent results.

### 5.4 Read and write separation

Read operations should not mutate persistent state or cause hidden side effects.

- A read function must not silently write, repair, migrate, publish, or delete data.
- If repair or normalization is needed, expose it as an explicit mutation with an observable result.
- Keep side effects visible at the boundary that initiates them.
- Do not disguise mutations as getters, loaders, or rendering operations.

### 5.5 Asynchronous behavior

Asynchronous browser and server operations must account for lifecycle, cancellation, and stale results.

Where an operation can outlive the state or identity that initiated it, use an appropriate cancellation or identity/session fencing strategy. Do not allow a stale completion to overwrite newer state.

## 6. Technology and dependency management

### 6.1 Technology selection

Select frameworks, databases, hosting, authentication, and major infrastructure according to actual product requirements, team capability, security, operational cost, and maintainability.

Do not assume that one technology choice applies to every YVS product.

### 6.2 Dependency discipline

Before adding a dependency:

1. Inspect the existing project and its installed capabilities.
2. Search for an existing dependency or native platform feature that already solves the problem.
3. Assess maintenance status, security posture, license, bundle impact, and transitive dependencies.
4. Add the dependency only when it provides a concrete benefit that justifies its cost.
5. Declare direct dependencies explicitly; do not rely on accidental transitive availability.

Avoid multiple libraries for the same concern without a documented reason. Prefer one primary parser, validator, date library, icon family, or other implementation choice per concern.

### 6.3 Bundle and execution boundaries

- Keep expensive processing server-side where practical and consistent with product requirements.
- Avoid shipping large libraries to the browser when a smaller or server-side alternative meets the requirement.
- Measure bundle impact when adding substantial client-side dependencies.
- Do not add workers, queues, microservices, or distributed infrastructure without a demonstrated requirement and explicit architectural approval where material.

## 7. Data architecture, persistence, and integrity

### 7.1 Data ownership

Every persistent data entity must have a clear owner, lifecycle, and authoritative storage location.

Document important relationships, uniqueness rules, retention, deletion behavior, and access boundaries.

### 7.2 Persistence must be explicit

Persistence behavior must be deliberate and understandable.

- Do not introduce autosave, background persistence, drafts, or implicit writes unless the product specification explicitly authorizes them.
- Make user-initiated versus system-initiated persistence clear.
- Do not assume that a UI interaction is permission to persist data.
- Follow product-specific persistence rules where they are stricter.

### 7.3 Atomicity and consistency

Where a logical operation changes multiple related records or resources, define what happens if only part of the operation succeeds.

Use transactions or an appropriate consistency strategy where supported and justified. If true atomicity is unavailable, define recoverability, idempotency, and reconciliation behavior rather than pretending the operation is atomic.

### 7.4 Mutation contracts

Mutations should return explicit, typed outcomes. Avoid ambiguous booleans or success-shaped responses that hide failure details.

A TypeScript pattern may use a discriminated union:

```ts
type Result<T, E> =
  | { ok: true; data: T }
  | { ok: false; error: E };
```

Use domain-appropriate error types. Do not expose secrets, internal stack traces, or sensitive implementation details to clients.

### 7.5 Idempotency and retries

For operations that may be retried, define whether they are idempotent. Avoid duplicate records, repeated charges, or repeated side effects caused by retry behavior.

### 7.6 No silent data loss

Do not swallow persistence errors. Do not report success when a write, upload, deletion, or external operation has not been confirmed.

## 8. Security and privacy

Security controls must be enforced at trust boundaries, not merely represented in UI behavior.

### 8.1 Input and boundary validation

- Validate untrusted input at the server boundary.
- Validate identifiers, paths, URLs, payload shape, size, and allowed values.
- Use allowlists where the valid set is known.
- Treat browser input, request headers, query parameters, uploaded files, external API responses, and model-generated output as untrusted.
- Do not rely exclusively on client-side validation.

### 8.2 Authentication and authorization

- Authentication establishes identity; authorization determines permitted actions.
- Enforce authorization on the server for every protected operation.
- Do not assume that hiding a button or page establishes access control.
- Check ownership and resource-level permissions where applicable.
- Apply least privilege to service accounts, API credentials, and integrations.

### 8.3 Secrets and sensitive information

- Keep credentials and private tokens server-side.
- Never commit secrets to source control.
- Use environment or secret-management facilities appropriate to the deployment platform.
- Do not expose private data through logs, error messages, public metadata, or client bundles.
- Separate public information from private organizational, user, and product data.

### 8.4 URL, host, and path safety

- Do not construct trusted origins from unvalidated Host headers.
- Validate redirect destinations against an explicit allowlist or trusted-origin policy.
- Prevent path traversal and unsafe file access.
- Avoid accepting arbitrary filesystem paths or remote URLs where a constrained identifier or allowlisted destination is sufficient.

### 8.5 External services and generated content

Treat external service responses and AI-generated content as untrusted until validated. Do not allow generated text to determine privileged actions, permissions, or executable behavior without explicit validation and authorization.

### 8.6 Security failures

Security-sensitive failures must be visible to the appropriate caller and observable through safe operational logging. Do not silently continue after failed authorization, validation, or integrity checks.

## 9. Backend, APIs, and mutation handling

- Keep API contracts explicit and version them when compatibility requires it.
- Validate request and response shapes at boundaries.
- Use appropriate HTTP status codes and consistent error structures.
- Separate transport concerns from business rules.
- Avoid duplicating the same multi-step API sequence across multiple callers; centralize the authoritative workflow where appropriate.
- Define timeouts, retry policies, and failure handling for external calls.
- Make side effects and authorization requirements explicit.
- Do not return internal exception details to untrusted clients.
- Do not use bare `catch {}` blocks that discard errors.
- Catch errors only when the code can handle, translate, recover from, or meaningfully report them.

## 10. Frontend, React, and Next.js standards

These are defaults for products using the relevant stack, not a mandate that every YVS product use it.

### 10.1 React

- Follow the Rules of Hooks.
- Keep component responsibilities focused.
- Avoid effects for values that can be derived during rendering.
- Clean up subscriptions, listeners, and asynchronous work appropriately.
- Prevent stale asynchronous results from overwriting current state.
- Use stable keys for repeated elements.
- Keep state ownership clear and avoid unnecessary duplicated state.

### 10.2 Next.js

- Respect server/client component boundaries.
- Keep secrets and server-only modules out of client code.
- Do not import route modules into components.
- Use server-side authorization for protected data and mutations.
- Keep route handlers focused on request coordination and boundary validation.
- Choose rendering and caching behavior deliberately; do not rely on accidental defaults for security-sensitive or user-specific data.

### 10.3 UI behavior

- Provide clear loading, empty, success, and error states where relevant.
- Avoid hidden mutations during render or data loading.
- Preserve user input when appropriate and communicate when an operation has or has not been saved.
- Ensure controls have accessible names, keyboard behavior, and visible focus.
- Prefer semantic HTML and established accessible primitives over custom controls without a demonstrated need.

## 11. YVS Visual Language and design system

### 11.1 Design philosophy

YVS applications should feel related without being visually identical.

The shared visual direction is:

- simple but polished;
- restrained and modern;
- readable and information-focused;
- clear visual hierarchy;
- disciplined whitespace;
- subtle structural borders;
- limited shadows;
- purposeful color;
- accessible and responsive by default.

Avoid generic, template-like visual treatment and unnecessary decoration, including excessive gradients, glassmorphism, decorative blobs, oversized hero typography, excessive shadows, excessive rounded cards, unnecessary animation, and visual noise.

### 11.2 Canonical YVS brand colors

These are the two canonical YVS brand colors:

| Brand color | Hex |
|---|---|
| YVS Yellow | `#FFFF11` |
| YVS Indigo-Violet | `#4B0084` |

They establish YVS identity. They are not a requirement to use brand colors on every element.

### 11.3 Semantic palettes and tokens

Use the semantic color-token system and complete light/dark palettes defined by the applicable current YVS Visual Language in YVS Guidelines.

The engineering standards document is not a second source of truth for token values. The canonical token definitions remain in the YVS Visual Language.

The design system must distinguish:

- **Brand identity:** YVS Yellow and YVS Indigo-Violet.
- **Semantic function:** background, foreground, card, muted, border, input, primary, secondary, accent, destructive, success, warning, ring, and corresponding foreground tokens.
- **Product expression:** product-specific imagery, illustrations, editorial layouts, media presentation, and specialized interactions.

Semantic tokens—not arbitrary hardcoded colors scattered through components—should drive UI implementation.

Accessibility and semantic meaning take precedence over decorative brand usage.

### 11.4 Light and dark theme direction

The established YVS direction is:

- **Light mode:** Indigo-Violet is the primary brand/action color; Yellow is the distinctive accent.
- **Dark mode:** Yellow becomes the primary/high-attention brand color; Indigo-Violet is a structural and brand accent against dark surfaces.

Neutral colors should carry most of the interface. Brand colors should not dominate every UI element.

### 11.5 Borders

Normal UI structure uses subtle semantic `border` and `input` tokens.

The `brand-border` token is reserved for intentional brand emphasis, such as featured sections, selected states, product identity, and special YVS presentation elements. Do not make every border brand-colored.

### 11.6 Typography and icons

The established YVS typography foundation is:

- **Inter** as the default UI typeface.
- **JetBrains Mono** as the monospace companion.

The established icon family is **Lucide**. Do not casually introduce multiple icon libraries.

Typography should prioritize readability, restrained hierarchy, appropriate line height, consistent weights, and UI legibility. Icons should communicate meaning rather than serve as decoration.

### 11.7 UI implementation foundation

The established implementation foundation is:

- Tailwind CSS
- shadcn/ui
- Base UI
- Lucide

These are implementation mechanisms. The YVS Visual Language is the design standard.

Products implement the standards locally. Do not create a shared `@yvs/ui` package or make `yvs-guidelines` an npm package merely for convenience. Consider a shared runtime UI package only when repeated implementation demonstrates a real need and the decision is approved.

### 11.8 Product individuality

YVS standardization has three layers:

1. **Mandatory YVS foundation:** typography foundation, semantic token architecture, spacing foundation, accessibility, icon family, and control conventions.
2. **Common YVS patterns:** cards, content surfaces, metadata, navigation, buttons, forms, and product presentation.
3. **Product expression:** imagery, illustrations, editorial layouts, media presentation, and specialized interactions.

The objective is **visually related, not visually identical**.

## 12. Accessibility and responsive behavior

Accessibility is a baseline engineering requirement, not a final styling pass.

- Use semantic HTML and accessible component primitives.
- Ensure keyboard access and visible focus.
- Associate labels with controls.
- Provide meaningful alternative text for informative images.
- Maintain adequate contrast in both themes.
- Do not use color as the only signal for status or meaning.
- Respect reduced-motion preferences.
- Ensure layouts work across supported screen sizes.
- Avoid interactions that require pointer precision when an accessible alternative is practical.

Test important user journeys with keyboard navigation and appropriate accessibility tooling.

## 13. AI-assisted development protocol

YVS uses AI agents extensively in software development. AI-assisted implementation must be evidence-based, constrained, and reviewable.

### 13.1 Required workflow

Use this workflow:

**Inspect → Search → Reuse → Plan → Implement → Verify → Report**

1. **Inspect:** Read the relevant product instructions, specifications, architecture, repository structure, and existing implementation.
2. **Search:** Find existing components, utilities, dependencies, tests, and established patterns before creating alternatives.
3. **Reuse:** Prefer existing project capabilities when they satisfy the requirement.
4. **Plan:** Identify the intended change, affected boundaries, risks, and verification steps. Keep the plan proportional to the task.
5. **Implement:** Make the smallest coherent change that satisfies the approved requirement.
6. **Verify:** Run relevant type checks, lint, tests, build, and manual checks as applicable. Inspect the resulting diff.
7. **Report:** State what changed, what was verified, what was not verified, and any remaining risks.

### 13.2 Evidence classification

AI agents and developers must distinguish:

- **OBSERVED:** directly seen in the current code, tool output, or system behavior.
- **DOCUMENTED:** stated in an authoritative project or organization document.
- **TESTED:** verified by an executed test or reproducible procedure.
- **INFERRED:** a reasoned conclusion that has not been directly established.
- **UNKNOWN:** not established by available evidence.

Do not present inferred or unknown information as an observed or tested fact.

### 13.3 Change discipline

AI agents must:

- read project instructions before editing;
- preserve locked specifications and invariants;
- avoid unrelated refactoring;
- avoid creating duplicate utilities or competing workflows;
- avoid changing dependencies or architecture without a reason;
- not claim a test passed unless it was actually run and passed;
- not claim completion when verification is incomplete;
- report assumptions and limitations explicitly.

### 13.4 Stop-and-ask boundaries

Stop and request an explicit decision before making high-impact choices involving:

- database technology or major data-model changes;
- authentication architecture;
- hosting provider or deployment architecture;
- major frameworks or dependencies;
- security and trust boundaries;
- payments or financial transactions;
- roles, permissions, or ownership models;
- sensitive data handling;
- production migrations;
- destructive operations;
- changes to YVS-wide standards;
- changes to product-specific locked invariants.

Do not silently make these decisions during routine implementation.

## 14. Code quality and maintainability

- Use clear names that express domain meaning.
- Keep functions and modules focused.
- Prefer explicit types over unsafe casts and broad `any`.
- Handle nullable and optional values deliberately.
- Avoid duplicated business rules.
- Avoid premature generalization.
- Keep comments focused on intent, constraints, and non-obvious reasoning rather than restating code.
- Remove dead code only when it is within the approved change scope or explicitly requested.
- Keep configuration understandable and environment-specific values out of source.
- Maintain consistent formatting and lint rules.
- Fix warnings and errors introduced by the change; do not hide them by disabling checks without justification.

## 15. Testing and verification

### 15.1 Quality gates

Use the checks applicable to the product and change:

- type checking;
- linting;
- unit tests;
- integration tests;
- end-to-end tests for critical journeys;
- production build;
- security checks;
- accessibility checks;
- manual verification where automation is insufficient.

A project should document its actual quality commands. Do not invent test scripts or claim a check exists without inspecting the repository.

### 15.2 Test meaningful behavior

Prioritize tests for:

- business rules and state transitions;
- authorization and ownership boundaries;
- data validation and integrity;
- mutation success and failure paths;
- critical integrations;
- regressions in previously corrected defects.

Tests should be deterministic and should not depend on undocumented external state.

### 15.3 Verification reporting

A completion report must distinguish:

- checks executed and passed;
- checks executed and failed;
- checks not run;
- behavior verified manually;
- known remaining risks.

Do not describe unexecuted checks as passed.

## 16. Git, repository, and documentation standards

- Keep each product's source and product-specific documentation in its own repository.
- Use clear commit messages that describe the change.
- Keep commits focused where practical.
- Do not commit credentials, generated secrets, local environment files, or unnecessary build artifacts.
- Keep README and setup instructions aligned with actual behavior.
- Document architecture decisions when they affect boundaries, data ownership, security, or future compatibility.
- Record important decisions with context, options considered, decision, and consequences.
- Keep product status and roadmap statements accurate.
- Avoid duplicating authoritative information across documents. Link to or reference the source of truth where possible.

## 17. Hosting, deployment, and infrastructure

Infrastructure choices must follow the product's approved architecture.

YVS's default economic philosophy is free-first and operationally lightweight where this is viable:

- prefer suitable free tiers and managed services;
- minimize operational overhead;
- support local development;
- scale infrastructure incrementally;
- understand usage limits, pricing transitions, and exit costs.

Do not prematurely introduce:

- microservices;
- Kubernetes;
- Kafka;
- event buses;
- complex distributed systems;
- unnecessary databases;
- queues or background processing;
- speculative AI infrastructure.

This is not a prohibition against these technologies. They require a concrete requirement, a documented trade-off, and approval when the decision is architecturally significant.

Deployment must include appropriate environment separation, secret handling, build verification, rollback or recovery planning proportionate to risk, and monitoring appropriate to the product.

## 18. Architecture decisions and change management

For a significant architectural decision, record:

- context and problem;
- constraints and invariants;
- options considered;
- chosen option and rationale;
- security, operational, and cost implications;
- consequences and known limitations;
- approval or decision owner.

Do not use an architecture decision record to legitimize an unapproved change to a locked requirement.

When requirements are ambiguous, ask one precise question if the ambiguity blocks safe implementation. Otherwise, make the narrowest defensible decision, document the assumption, and avoid irreversible choices.

## 19. Product initialization requirements

Before implementation begins on a new YVS product:

1. Identify the product owner and repository.
2. Pin the applicable YVS Guidelines version.
3. Read the applicable YVS standards and local project instructions.
4. Create a product-specific requirements and scope document.
5. Define the product's architecture, data ownership, trust boundaries, and persistence model.
6. Identify authentication and authorization needs.
7. Select technologies based on requirements rather than copying another product.
8. Identify high-impact decisions requiring approval.
9. Establish local development, quality commands, and verification expectations.
10. Record product-specific invariants and ensure AI agents are instructed to preserve them.

A new product must not inherit another product's storage model, identifiers, lifecycle, publishing model, or other product-specific behavior by default.

## 20. Definition of done

A change is complete only when all applicable items are satisfied:

- [ ] The implementation matches an approved requirement.
- [ ] Relevant product instructions and invariants were respected.
- [ ] Existing capabilities were inspected before adding new ones.
- [ ] No unnecessary dependency or infrastructure was introduced.
- [ ] Data ownership, authorization, and persistence behavior remain correct.
- [ ] Read operations do not cause hidden mutations.
- [ ] Errors are handled and surfaced appropriately.
- [ ] Accessibility and responsive behavior were considered for UI changes.
- [ ] Relevant type, lint, test, and build checks were run.
- [ ] The diff was reviewed for unrelated changes, secrets, and accidental behavior changes.
- [ ] Documentation was updated where behavior or setup changed.
- [ ] The completion report accurately states verification and remaining risks.

Not every item applies to every change. Inapplicable items should be treated as not applicable, not falsely reported as completed.

## 21. Explicit prohibitions

Unless a product-specific approved specification explicitly authorizes the behavior, do not:

- introduce hidden mutations into read paths;
- create competing authoritative workflows for one responsibility;
- bypass server-side authorization;
- trust unvalidated external input;
- swallow errors with empty catch blocks;
- claim verification that was not performed;
- add dependencies without inspecting existing capabilities;
- create infrastructure for speculative future scale;
- duplicate authoritative product data in an unrelated product;
- make runtime behavior depend on the availability of the YVS Guidelines repository;
- silently change organization-wide or product-specific standards;
- perform unrelated refactoring under the cover of a feature change;
- assume that another YVS product's architecture is a template to copy.

Product-specific prohibitions may be stricter. They remain binding for that product.

---

# Appendix A — Practices retained from the Cogmit audit

The Cogmit audit identified implementation practices worth retaining as general engineering guidance, while also identifying product-specific architecture and defects that must not be generalized.

Retain these positive practices where applicable:

- pure, zero-dependency constants that are safe for client and server use;
- session or identity fencing for asynchronous browser operations;
- non-mutating DOM Range overlays;
- Unicode-safe truncation;
- server-only segregation of OAuth tokens;
- deterministic SVG output and source hashing;
- evidence classification using OBSERVED, DOCUMENTED, TESTED, INFERRED, and UNKNOWN.

General lessons to apply across products:

- enforce allowlists and validation at trust boundaries;
- prevent open redirects and Host-header trust errors;
- keep reads free of hidden mutations;
- use one authoritative pipeline per responsibility;
- make multi-step writes consistent and recoverable;
- use typed mutation outcomes;
- do not swallow errors;
- avoid duplicated API sequences;
- ensure tests and quality scripts actually run;
- control dependency and bundle duplication;
- keep documentation aligned with implementation.

These are engineering lessons, not a mandate to copy Cogmit's architecture or its product-specific data model.

# Appendix B — Suggested project AI instruction

The following can be adapted into a product repository's `AGENTS.md` or equivalent project instruction file.

```md
# Project Development Rules

1. Read this file and all applicable product specifications before editing.
2. Follow the product's pinned YVS Guidelines version.
3. Product-specific locked specifications and invariants are binding.
4. Inspect before changing; search before adding; reuse before creating.
5. Prefer the smallest coherent change that satisfies the approved requirement.
6. Do not introduce speculative abstractions, dependencies, or infrastructure.
7. Do not perform unrelated refactoring.
8. Keep reads free of hidden mutations.
9. Enforce validation and authorization at server trust boundaries.
10. Do not swallow errors or claim unexecuted checks passed.
11. Stop and ask before high-impact architectural or destructive decisions.
12. Preserve the YVS Visual Language while allowing product-specific expression.
13. Verify relevant type, lint, test, and build checks.
14. Report what changed, what was verified, what was not verified, and remaining risks.
15. Never assume another YVS product's architecture applies to this product.
```

# Appendix C — Product standards adoption record

Each product should record:

| Field | Value |
|---|---|
| Product name | |
| Repository | |
| Product owner | |
| Adopted YVS Guidelines version | |
| Product specification version | |
| Architecture document | |
| Technology stack | |
| Data ownership and storage | |
| Authentication/authorization model | |
| Deployment target | |
| Quality commands | |
| Product-specific locked invariants | |
| Approved exceptions | |

An exception must identify its scope, rationale, decision owner, and review conditions. An exception for one product does not automatically apply to another.

---

## Document maintenance

This document is an organization-wide baseline candidate. Before publishing it as an authoritative YVS Guidelines release:

1. Compare it against the actual current contents of `yetvastsolutions/yvs-guidelines`.
2. Preserve any existing locked or more specific standards not represented here.
3. Resolve conflicts explicitly rather than silently replacing existing rules.
4. Update the repository's version and changelog according to its established versioning policy.
5. Have the responsible YVS decision-maker approve the release.
6. Require products to pin the released version they adopt.

**Core principle: One YVS engineering foundation; independent product architectures; explicit ownership; evidence-based implementation.**
