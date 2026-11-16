# YappOut (V1) — Audio-First Synchronized Reader with Optional Yet Vast Auth

**Product:** YappOut  
**Organization:** Yet Vast Solutions (YVS)  
**Version:** V1 (Optional Central Authentication Release)  
**Baseline:** Completed V0 Standalone Client-Side Engine  
**Framework:** Next.js App Router (React 19, TypeScript strict mode)  
**Styling:** CSS Modules with canonical YVS design tokens (No Tailwind CSS)  
**Deployment:** Vercel (Edge / CDN Static Prerendering + Dynamic Auth Handlers)

---

## 1. Overview & Core Philosophy

**YappOut** is an audio-first, multimodal reading application that converts user-provided text and Markdown into natural spoken speech while maintaining real-time visual highlight tracking synchronized with the spoken sentence or clause.

### Non-Negotiable Core Principle
> **Authentication must enhance YappOut, never become a prerequisite for using it.**

YappOut V1 introduces optional authentication through the central Yet Vast Auth infrastructure (`https://auth.yetvast.com`), establishing an identity foundation for future cloud features while preserving the complete, 100% free, anonymous client-side reading engine.

---

## 2. V1 Optional Authentication Features

- **Anonymous by Default:** Any visitor can immediately input text, load sample content, cycle speeds, switch highlight modes, seek by double-clicking or double-tapping, and listen without logging in or creating an account.
- **Central Yet Vast Auth Integration:** Uses the shared `@yetvast/auth` SDK with OAuth 2.0 Authorization Code Flow and PKCE S256. No independent competing user registries or custom OAuth endpoints are introduced.
- **Asymmetric JWKS Assertion Verification:** Server-side verification of identity assertion JWTs (`EdDSA` / `RS256`) against `https://auth.yetvast.com/.well-known/jwks.json`, validating issuer, audience (`yappout`), expiration, and cryptographic signatures without shared symmetric secrets.
- **Support for Central Identity Policies:**
  - **Persistent Yet Vast Identity (Google):** Resolves or creates a durable Yet Vast user identity (`yvUserId`) across the YVS ecosystem.
  - **Ephemeral Service Access (GitHub):** Supports non-persistent, ephemeral service sessions without fabricating permanent user records.
- **Host-Bound Session Security:**
  - Secure, `HttpOnly`, `SameSite=Lax`, host-bound session cookies (`yv_yappout_session`).
  - Never sets wildcard `.yetvast.com` cookies.
  - CSRF protection on mutating endpoints (`/api/auth/logout`) validating Origin and Referer.
- **Non-Intrusive Header Account Area:**
  - Compact `Sign in` action in anonymous state.
  - Profile badge and dropdown `AccountMenu` in authenticated state showing identity metadata and `Sign out`.
  - Logging out or experiencing an expired session does not clear reading text or stop narration.

---

## 3. Core V0 Reading Engine (Preserved Invariants)

- **Responsive & Collapsible Content Input Workspace:** Large multiline text editor supporting plain text and Markdown without arbitrary character limits. The Clear action is accessible on the title row immediately before the collapse button. During playback, the editor automatically minimizes to keep the reading canvas in focus while leaving title and expand/collapse controls accessible.
- **Multiple Reading Highlight Modes:** Cycle seamlessly between four distinct visual presentation treatments using the highlight mode selector:
  1. **Box highlight:** Canonical YVS Yellow outline with Indigo-Violet outer shadow around line rects.
  2. **Underline:** Solid underline bar anchored directly along the bottom of the active sentence.
  3. **Background:** Translucent highlighter color wash over the active sentence without box borders.
  4. **Bold:** Bold typography treatment emphasizing the active sentence without box or background fills.
- **Continuous Sequential Speech:** Uses the native browser Web Speech API (`window.speechSynthesis`) to speak sentences and clauses sequentially rather than submitting monolithic utterances.
- **Non-Mutating Visual Highlighting:** Highlights the active segment using DOM Range calculations (`Range.getClientRects()`) projected onto a fixed-position floating overlay (`z-index: 9000`). The underlying document innerHTML is never mutated.
- **Spatial Caret Seeking (Double-Click & Double-Tap):** Double-clicking (desktop) or double-tapping (touchscreen) resolves client coordinates via browser caret APIs (`caretRangeFromPoint` / `caretPositionFromPoint`) and re-anchors playback.
- **Viewport Auto-Scrolling:** Smoothly scrolls the reading canvas container to maintain the active segment comfortably within view with an 80px margin buffer.
- **In-Flight Speed Cycling:** Cycles playback speed through `1× → 1.5× → 2× → 0.5× → 0.75× → 1×` without restarting narration.
- **Monotonic Session Guards:** Every play, stop, seek, or speed change increments a monotonic `sessionIdRef` token, preventing stale asynchronous TTS callbacks from desynchronizing state.
- **Design Tokens:** Canonical YVS brand colors:
  - **YVS Indigo-Violet:** `#4B0084`
  - **YVS Yellow:** `#FFFF11`

---

## 4. Technology Stack

- **Framework:** Next.js App Router (16.3.6)
- **UI Runtime:** React 19 (19.2.8)
- **Language:** TypeScript 5.7 (Strict mode enabled)
- **Auth Foundation:** `@yetvast/auth` (0.2.0+) with server-to-server PKCE & JWKS verifiers
- **Styling Architecture:** Pure CSS Modules and CSS Custom Properties (zero Tailwind CSS)
- **Icons:** Lucide React
- **Markdown Parser & Sanitizer:** Marked (v15) with DOMPurify
- **Testing Engine:** Vitest (v3) with jsdom & node environments (71 tests passing)
- **Linter:** ESLint 9 (Flat config with `eslint-config-next`)

---

## 5. Repository Structure

```text
public/
└── yappout-info.json                 # Single source-of-truth product metadata & sample content
src/
├── adapters/
│   └── speechSynthesisAdapter.ts     # Web Speech API wrapper & mock test adapter
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── callback/route.ts     # OAuth authorization code exchange & session setup
│   │       ├── login/route.ts        # PKCE S256 authorize redirect initiation
│   │       ├── logout/route.ts       # Host-bound session clearance & CSRF verification
│   │       └── session/route.ts      # Session verification and user status endpoint
│   ├── globals.css                   # Resets, typography foundations & tokens import
│   ├── layout.tsx                    # Root layout with AuthProvider wrapper
│   ├── page.module.css               # Homepage layout styles
│   └── page.tsx                      # Primary standalone reading application
├── auth/
│   ├── authService.ts                # PKCE flow initiation and callback orchestration
│   ├── config.ts                     # Environment validation and origin normalization
│   ├── identityService.ts            # Assertion mapping to authoritative YappoutUser
│   ├── index.ts                      # Clean domain exports
│   ├── sessionService.ts             # Host-bound cookie lifecycle and JWKS verification
│   └── types.ts                      # Domain types (AuthStatus, YappoutUser, AuthContext)
├── components/
│   ├── auth/
│   │   ├── AccountMenu.tsx           # Authenticated user dropdown and sign-out action
│   │   ├── AuthButton.tsx            # Header account action (Sign in / User Avatar)
│   │   ├── AuthModal.tsx             # Modal dialog explaining Google vs GitHub access
│   │   ├── AuthProvider.tsx          # React Context providing auth state and methods
│   │   └── auth.module.css           # Auth UI CSS module with YVS tokens
│   ├── input/
│   │   ├── ContentEditor.module.css  # Collapsible editor styling
│   │   └── ContentEditor.tsx         # Text editor, collapsible card & contextual controls
│   ├── layout/
│   │   ├── Header.module.css         # Header styling & v0 badge
│   │   └── Header.tsx                # Branding, AuthButton, sample loader & theme switch
│   ├── player/
│   │   ├── HighlightModeSelector.tsx # Presentation mode cycler
│   │   ├── PlayerControls.module.css # Reorganized player toolbar styling
│   │   ├── PlayerControls.tsx        # Unified playback toolbar with metadata & progress
│   │   ├── YappOutButton.tsx         # Play/Stop primary action button
│   │   └── YappOutSpeed.tsx          # Speed cycler button
│   └── reader/
│       ├── ReadingCanvas.module.css  # Reader typography & canvas styling
│       ├── ReadingCanvas.tsx         # Rendered Markdown reader
│       └── YappoutHighlight.tsx      # Fixed non-mutating multi-mode highlight overlay
├── constants/
│   └── index.ts                      # Brand tokens, highlight modes & playback speeds
├── core/
│   ├── playbackController.ts         # Segment-by-segment session-guarded controller
│   ├── readingSequence.ts            # Reading sequence construction from title + body
│   ├── scrollController.ts           # Auto-scroll view with 80px margin buffer
│   ├── seekController.ts             # Seek request types
│   ├── speedController.ts            # Speed cycle calculations & labels
│   └── wordTracker.ts                # DOM TreeWalker range mapper & caret resolver
├── hooks/
│   └── useYappout.ts                 # Authoritative React hook orchestrating state
├── styles/
│   └── tokens.css                    # Canonical YVS design tokens
├── types/
│   └── index.ts                      # Core reading application types
└── utils/
    ├── doubleTapDetector.ts          # Touchscreen gesture detector
    ├── markdownExtractor.ts          # Markdown text extraction
    └── textNormalizer.ts             # Punctuation-aware sentence segmentation
```

---

## 6. Verification & Quality Gates

Run quality verification commands:

```bash
# Automated Test Suite (71 tests across 14 suites)
npm test

# TypeScript Static Typecheck
npm run typecheck

# Code Style and Linting
npm run lint

# Production Next.js Turbopack Build
npm run build
```
