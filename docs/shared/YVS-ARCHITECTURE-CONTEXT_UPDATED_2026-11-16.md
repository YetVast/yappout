# Yet Vast Solutions — Architecture Context

**Purpose:** Persistent project handoff context for future YVS architecture and product discussions.

**Last updated:** 2026-11-16

---

# 1. Organization

**Organization:** Yet Vast Solutions
**GitHub organization:** `yetvastsolutions`

YVS is an umbrella software/product organization. Individual products are maintained in separate repositories under the YVS GitHub organization.

Current/referenced products include:

* YAI Studio
* Cogmit
* VastComm
* FYUniverse
* Yapout
* YVS-Illu

Not every named product is necessarily live. Product status must be represented accurately rather than assuming that an idea is a launched product.

---

# 2. YVS Guidelines

Repository:

`yetvastsolutions/yvs-guidelines`

Current established version:

**v1.2.2**

The repository is the central YVS engineering and product-development standards repository.

It contains:

1. Engineering constitution
2. AI development/implementation guidance
3. Architecture standards
4. Security standards
5. Development standards
6. Deployment standards
7. Public YVS organization information
8. YVS Visual Language
9. Canonical visual tokens
10. Standards/versioning rules

The repository has already gone through multiple reviews and targeted hardening.

Do not repeatedly redesign or re-audit it without a concrete reason.

---

# 3. YVS Guidelines Versioning

YVS Guidelines versions are treated as explicit standards versions.

Products should follow a specific pinned YVS Guidelines version.

A product should not silently change its implementation because the guidelines repository changed.

Conceptually:

```
YVS Guidelines vX.Y.Z
         |
         | development/reference
         v
   Product repository
         |
         | local implementation
         v
   Production application
```

YVS Guidelines is **not a runtime dependency**.

Products must not:

* import it as an application dependency
* fetch it during normal application operation
* require GitHub access for the application to function
* dynamically retrieve design tokens from it at runtime
* use it as a runtime configuration service

The product implements the applicable standards locally.

---

# 4. YVS Public Information

YVS Guidelines contains:

```
public/
  README.md
  organization.md
  principles.md
  faq.md
```

This is intentionally public-facing organization information.

It is separate from the internal engineering constitution.

The public directory is NOT:

* a CMS
* a runtime API
* a product database
* a product-content repository
* a synchronization system

Only information intentionally placed in the public area should be considered public YVS knowledge.

---

# 5. Product Information Ownership

A fundamental YVS architectural rule is:

> Products own their own product information.

YVS-Illu should not become a centralized database containing manually duplicated descriptions of every YVS product.

Conceptually:

```
YVS organization information
    → yvs-guidelines/public/

Product information
    → individual product repository/application

YVS-Illu
    → presentation/discovery layer
```

Eventually, each product may expose a small public machine-readable contract, conceptually similar to:

```
public/product.yaml
```

with fields such as:

* name
* slug
* description
* status
* homepage

This is a conceptual contract at present unless a product-specific implementation is explicitly created.

Do not create synchronization infrastructure merely to support this.

---

# 6. YVS-Illu

The next major repository is:

`yetvastsolutions/yvs-illu`

YVS-Illu replaces the earlier working concept/name `yvs-home`.

YVS-Illu should be a **very shallow public presentation and discovery layer for YVS**.

It should:

* explain what YVS is
* present YVS products
* provide short product descriptions
* link visitors to the actual products
* expose public YVS principles/information
* eventually provide access to a public YAI instance

It should NOT become:

* a CMS
* a product database
* a copy of every product's content
* a synchronization hub
* a backend for all YVS products
* a central database for product applications

The intended philosophy is:

> **YVS-Illu presents YVS; it does not become the source of truth for YVS products.**

---

# 7. YVS-Illu Product Presentation

YVS-Illu should eventually display product tiles/cards using information owned by the respective products.

A product's own public information should be the source of truth.

The desired relationship is:

```
Product
   |
   | public product information
   v
YVS-Illu
   |
   | presentation
   v
visitor
```

Avoid building:

```
Product
   |
   v
synchronization service
   |
   v
YVS-Illu database
   |
   v
website
```

unless a future scale/technical requirement genuinely justifies it.

The first implementation should remain simple.

---

# 8. YVS-Illu and YAI

YVS-Illu will eventually contain a small public chatbot representing an actual **YAI instance**, rather than merely being a generic chatbot UI.

Conceptually:

```
YVS-Illu
    |
    v
YAI-Illu public instance
    |
    v
Scoped public YVS context
```

The public YAI instance should understand the public information represented by YVS-Illu.

It should be able to answer questions about:

* Yet Vast Solutions
* public YVS principles
* public YVS products
* intentionally published product information
* public FAQs
* intentionally published public documentation

It must NOT automatically have access to:

* private YAI Studio memory
* private user information
* private product data
* credentials
* secrets
* unpublished business information
* internal-only engineering information

The public YAI instance is therefore a **scoped YAI instance**.

It should not be treated as an unrestricted gateway into YAI Studio.

---

# 9. Shared Public Context

A key architectural goal is that the YVS-Illu website and its public YAI instance should be based on the same appropriately scoped public knowledge.

Conceptually:

```
                     Public YVS Knowledge
                              |
                 +------------+------------+
                 |                         |
                 v                         v
             YVS-Illu                 YAI-Illu
              website               YAI instance
```

This avoids maintaining one information source for the website and another unrelated source for the chatbot.

However, the implementation should remain simple.

Do not immediately introduce:

* vector databases
* complex retrieval pipelines
* synchronization workers
* crawlers
* microservices
* event buses
* unnecessary AI infrastructure

Build only what the actual requirement needs.

---

# 10. YVS Visual Language

YVS Guidelines v1.2.2 contains the YVS Visual Language.

The purpose is to make YVS applications feel like members of the same product family without making them identical.

The visual philosophy is:

* simple
* restrained
* modern
* readable
* high information clarity
* strong hierarchy
* disciplined whitespace
* subtle structural borders
* limited shadows
* purposeful color
* minimal decoration
* accessible by default
* responsive by default

Avoid a generic "AI-generated startup landing page" aesthetic.

Avoid excessive:

* gradients
* glassmorphism
* decorative blobs
* giant hero typography
* excessive shadows
* excessive rounded cards
* unnecessary animation
* visual noise

The target is:

> **simple but polished**

---

# 11. YVS Brand Colors

Canonical YVS brand colors:

**YVS Yellow**

```
#FFFF11
```

**YVS Indigo-Violet**

```
#4B0084
```

These are the two canonical YVS brand colors.

They should not be replaced with arbitrary product-specific brand colors without an intentional standards decision.

---

# 12. Light and Dark Theme Direction

### Light mode

Indigo-Violet is the primary brand/action color.

Yellow is the distinctive accent.

Conceptually:

```
light surface
     +
indigo primary
     +
yellow accent
```

### Dark mode

Yellow becomes the primary/high-attention brand color.

Indigo-Violet becomes a structural/brand accent against dark surfaces.

Conceptually:

```
dark surface
     +
yellow primary
     +
indigo structural accent
```

Brand colors should NOT dominate every UI element.

Neutral colors should carry most of the interface.

---

# 13. Canonical Semantic Colors

The current canonical semantic palette is:

## Light

| Token                  | Value     |
| ---------------------- | --------- |
| background             | `#FFFFFF` |
| foreground             | `#17121C` |
| card                   | `#FFFFFF` |
| card-foreground        | `#17121C` |
| muted                  | `#F4F1F6` |
| muted-foreground       | `#655C6B` |
| border                 | `#DDD6E2` |
| input                  | `#DDD6E2` |
| primary                | `#4B0084` |
| primary-foreground     | `#FFFFFF` |
| secondary              | `#F1EDF4` |
| secondary-foreground   | `#4B0084` |
| accent                 | `#FFFF11` |
| accent-foreground      | `#160020` |
| destructive            | `#C62828` |
| destructive-foreground | `#FFFFFF` |
| success                | `#16803C` |
| success-foreground     | `#FFFFFF` |
| warning                | `#A15C00` |
| warning-foreground     | `#FFFFFF` |
| ring                   | `#4B0084` |
| brand-border           | `#4B0084` |

## Dark

| Token                  | Value     |
| ---------------------- | --------- |
| background             | `#09060D` |
| foreground             | `#F8F5FA` |
| card                   | `#100B16` |
| card-foreground        | `#F8F5FA` |
| muted                  | `#17121F` |
| muted-foreground       | `#B9AFBF` |
| border                 | `#3A2450` |
| input                  | `#3A2450` |
| primary                | `#FFFF11` |
| primary-foreground     | `#160020` |
| secondary              | `#21152A` |
| secondary-foreground   | `#F8F5FA` |
| accent                 | `#FFFF11` |
| accent-foreground      | `#160020` |
| destructive            | `#FF6B6B` |
| destructive-foreground | `#240006` |
| success                | `#55D98A` |
| success-foreground     | `#06180D` |
| warning                | `#FFC44D` |
| warning-foreground     | `#241400` |
| ring                   | `#FFFF11` |
| brand-border           | `#4B0084` |

These values are intended to be deterministic for AI agents implementing YVS applications.

Accessibility takes precedence over decorative use of brand colors.

---

# 14. Border Philosophy

Normal UI structure uses:

```
border
input
```

These should remain subtle.

`brand-border` exists for intentional YVS/brand emphasis.

Do NOT interpret the YVS color philosophy as:

> every border must be yellow in light mode or indigo in dark mode.

Brand-colored borders should be used selectively for:

* featured sections
* selected states
* product identity
* special YVS presentation elements
* intentional emphasis

---

# 15. Typography

Current YVS Visual Language default:

**Inter**

Monospace companion:

**JetBrains Mono**

Typography should emphasize:

* readability
* clear hierarchy
* restrained scale
* appropriate line height
* consistent weights
* strong UI legibility

Do not substitute arbitrary fonts per product without an intentional exception.

---

# 16. Icons

**Lucide** is the standard YVS icon library.

Products should not casually introduce multiple icon libraries.

Icons should:

* communicate meaning
* maintain consistent sizing
* align correctly with text
* support accessibility
* not be used merely as decoration

---

# 17. UI Implementation

The established YVS UI implementation foundation is:

* Tailwind CSS
* shadcn/ui
* Base UI
* Lucide

YVS Visual Language defines the design standard.

Tailwind/shadcn/Base UI are implementation mechanisms.

Do not confuse the design standard with the implementation framework.

Products implement the standards locally.

Do NOT create a shared `@yvs/ui` package yet.

Do NOT make `yvs-guidelines` an npm package.

A shared runtime UI package can be considered later if repeated implementation genuinely justifies it.

---

# 18. Product Individuality

YVS standardization has three conceptual layers:

### Layer 1 — Mandatory YVS Foundation

Examples:

* typography foundation
* semantic token architecture
* spacing foundation
* accessibility
* icon family
* control conventions

### Layer 2 — Common YVS Patterns

Examples:

* cards
* content surfaces
* metadata
* navigation
* buttons
* forms
* product presentation

### Layer 3 — Product Expression

Products may develop their own:

* imagery
* illustrations
* editorial layouts
* media presentation
* specialized interactions
* product-specific presentation

provided they remain consistent with the YVS foundation.

The goal is:

> visually related, not visually identical.

---

# 19. Cogmit and YVS-Illu Content Presentation

Cogmit is intended as a personal publishing/social content platform, with future plans involving user-generated media such as vlogs.

Cogmit's content/post presentation can therefore become a useful **pattern reference** for YVS-Illu.

For example, a Cogmit post may contain:

* author
* title
* excerpt
* media
* metadata
* reading time
* publication date

A YVS-Illu product presentation can use a related visual/content structure:

* product identity
* product name
* description
* product visual
* status
* metadata
* link

This should be a shared **presentation philosophy/pattern**, not technical coupling.

YVS-Illu must NOT:

* import Cogmit UI components
* depend on Cogmit's database
* depend on Cogmit's application
* treat Cogmit as the source of truth for YVS products

Both products independently implement the common YVS visual language.

---

# 20. YVS-Illu Initial Scope

The initial YVS-Illu implementation should remain intentionally small.

Expected initial capabilities:

1. YVS introduction
2. Product discovery
3. Product cards/tiles
4. Links to product applications/pages
5. Public YVS information
6. Public principles
7. Future Ask YAI entry point

Initial YVS-Illu should NOT require:

* authentication
* database
* CMS
* vector database
* AI SDK
* complex backend
* product synchronization service

unless a concrete implementation requirement later establishes the need.

---

# 21. Hosting Direction

YVS-Illu is intended to use **Vercel**.

The initial application can remain mostly static.

Vercel is preferred because the future public YAI instance may require server-side functionality, allowing YVS-Illu to evolve without moving hosting platforms.

Do not add AI infrastructure to v1 merely because the future chatbot is planned.

---

# 22. Free-First Philosophy

YVS products should initially favor:

* free tiers
* managed services
* minimal operational overhead
* local development
* incremental migration to paid infrastructure

Do not prematurely introduce:

* microservices
* Kubernetes
* Kafka
* complex distributed systems
* unnecessary databases
* unnecessary queues
* speculative abstraction layers

Architecture should grow in response to real requirements.

---

# 23. AI Development Philosophy

YVS uses AI agents heavily for software implementation.

Therefore YVS standards emphasize:

* inspect before changing
* reuse before creating
* search before adding
* modify before duplicating
* native capability before dependency
* evidence before invention
* minimal change surface
* no speculative abstraction
* no unrelated refactoring
* no architecture drift

AI agents should distinguish:

* OBSERVED
* DOCUMENTED
* TESTED
* INFERRED
* UNKNOWN

Inferred or unknown information must not be presented as established fact.

---

# 24. Stop-and-Ask Boundaries

AI agents should stop and ask before making high-impact architectural decisions involving, for example:

* database technology
* authentication architecture
* hosting provider
* major frameworks/dependencies
* security boundaries
* payments
* financial transactions
* roles/permissions
* sensitive data
* production migrations
* destructive operations
* changes to YVS standards

Agents should not silently change YVS standards during ordinary product implementation.

---

# 25. Current Next Step

The next repository to discuss and initialize is:

**`yetvastsolutions/yvs-illu`**

The discussion should begin from this context rather than re-deriving the architecture.

The immediate goal is to design and initialize YVS-Illu as:

> **the shallow public presentation/discovery layer for Yet Vast Solutions, with a future scoped YAI instance that understands the same public YVS/product context presented by the site.**

The first implementation should consume **YVS Guidelines v1.2.2** as its development/reference standard.

Do not modify YVS Guidelines further unless a genuinely new architectural requirement emerges.


---

# Authoritative Project Status Addendum

**Update date: 16 November 2026**

## Current project and product status

This addendum supersedes older project-status statements where they conflict. It does not change the pinned YVS Guidelines version or make the guidelines a runtime dependency.

### Product naming and roles

- **Yet Vast Home** is the public presentation and discovery layer for the Yet Vast ecosystem. The repository remains `yvnow/yvs-illu`; the public product name is Yet Vast Home.
- **Yet Vast Auth** is the central identity authority and application-registration control plane at `https://auth.yetvast.com`.
- **Cogmit** is the personal publishing product. Its checked-in `MainCode` branch currently documents the Google Drive + Firestore publishing architecture. More recent GitHub-backed storage and YappOut discussions must be treated as newer product direction until the relevant implementation branch/worktree is inspected.
- **YappOut** is a capability the product owner has stated is already implemented inside Cogmit and is intended to become an independent product/repository. Its exact feature inventory and extraction boundary are not yet established by the checked-in Cogmit branch inspected for this update.

### Central identity and consumer ownership

Yet Vast Auth owns:
- persistent Yet Vast identity and provider mappings;
- provider linking;
- application registration, approval, suspension, deletion and recovery;
- application identity and registration-instance resolution;
- OAuth policy, redirect allowlists, authorization-code issuance and signed identity assertions.

Each consumer owns its own product behavior, local authorization and host-bound session. Home must not duplicate the central application list or mutate central Auth Firestore records.

### Current Yet Vast Auth architecture update

The Auth repository's latest inspected main commit is `872e25e` (16 November 2026). The latest implementation work separates:
- `logicalAppId`: stable identity used by a consumer across registration replacement;
- `registrationId`: immutable identity of one registration instance;
- `supersedesApplicationId`: predecessor/succession relationship.

A deleted registration remains a tombstone. A valid approved successor can serve the same logical application. A direct request for a deleted registration instance remains blocked. Ambiguous multiple active registrations fail closed with a persistence conflict.

The production migration was dry-run inspected but is documented as awaiting explicit administrator authorization. Do not state that production Firestore has been migrated or that the latest server code has been deployed unless a later deployment/read-back confirms it.

### Current Yet Vast Home integration boundary

Home's checked-in source retains `HOME_DEFAULT_APP_ID = "yetvast-home"` as its logical application identifier and uses the callback route `/api/auth/callback`. It uses the central Auth service through the shared SDK and creates its own `yv_home_session` cookie.

The current Auth dry-run evidence identifies a new registration instance `www-yetvast-com-6negk210` for `https://www.yetvast.com`, while the Home source constructs its callback from `YETVAST_HOME_ORIGIN`. Confirm the production value of that variable and exact registered redirect URI before claiming the production callback is aligned. Do not replace the logical application ID with the registration-instance ID.

The Home repository's latest inspected main commit is `0c51c7b` (14 November 2026), titled `remove auth registration`. Home's consumer-side central registration/onboarding flow is superseded. Its `/admin` route is a Home-specific App Admin surface, not the central Auth Application List.

### Current Cogmit and YappOut position

The checked-in Cogmit repository inspected for this update is `yvnow/cogmit`, branch `MainCode`, latest commit `9d9fa97` from 26 January 2026. Its checked-in README and architecture document describe:
- Firebase Authentication with Google OAuth;
- Google Drive as user-owned draft storage;
- Firestore as user/profile, draft-index and public published-content storage;
- Next.js App Router;
- draft creation/editing, version history, publishing and public Cog/profile routes.

Recent project discussions introduced a GitHub-backed storage direction and the requirement to distinguish Yet Vast identity authentication from GitHub repository authorization. The current checked-in branch does not establish that this migration has been implemented. The proposed `@yvsol/auth-client` and `@yvsol/github-storage` packages are proposals unless a source repository confirms otherwise.

YappOut extraction is a separate productization task. First inventory the implementation inside Cogmit, map its dependencies and data ownership, then define a standalone project. Do not copy Cogmit's entire architecture or storage model into YappOut by default.

### Standards and implementation discipline

The supplied `YVS_Application_Development_Standards_v1.0.0.md` remains the pinned organizational standard. This update does not silently create a new standards version. Project-specific constraints remain binding, including CSS Modules-only requirements where explicitly set by the product owner, server-side authorization, no secrets in client code, evidence-based verification and minimal scoped changes.

### Evidence classification

For all future project updates, label claims as:
- **OBSERVED** — inspected in current source, repository metadata or live behavior;
- **TESTED** — a command or reproducible test was actually run;
- **DOCUMENTED** — recorded in an implementation report or project document;
- **USER-CONFIRMED** — explicitly stated by the product owner but not independently inspected;
- **PLANNED** — agreed future work;
- **UNKNOWN** — not established.

Do not collapse these categories into a single “implemented” status.
