# YappOut (V0) — Audio-First Synchronized Reader

**Product:** YappOut  
**Organization:** Yet Vast Solutions (YVS)  
**Version:** V0 (Standalone Client-Side Release)  
**Framework:** Next.js App Router (React 19, TypeScript strict mode)  
**Styling:** CSS Modules with canonical YVS design tokens (No Tailwind CSS)  
**Deployment:** Vercel (Zero environment variables or external backend required)

---

## 1. Overview

**YappOut** is an audio-first, multimodal reading application that converts user-provided text and Markdown into natural spoken speech while maintaining real-time visual highlight tracking synchronized with the spoken sentence or clause.

The V0 objective is intentionally frictionless:
Any visitor can open YappOut, paste or type content of any practical length, click the **YappOut** button, and immediately start listening with visual synchronization.

No authentication, registration, database, persistence, or external backend is required. All speech synthesis and text processing run locally in the user's browser.

---

## 2. Core V0 Features

- **Responsive Content Input Workspace:** Large multiline text editor supporting plain text and Markdown without arbitrary character limits, featuring real-time word count, estimated reading duration, and empty-state guidance.
- **Continuous Sequential Speech:** Uses the native browser Web Speech API (`window.speechSynthesis`) to speak sentences and clauses sequentially rather than submitting massive monolithic utterances.
- **Non-Mutating Visual Highlighting:** Highlights the active segment using DOM Range calculations (`Range.getClientRects()`) projected onto a fixed-position floating overlay (`z-index: 9000`). The underlying document innerHTML is never mutated, preserving React component trees and Markdown formatting completely intact.
- **Spatial Caret Seeking (Double-Click & Double-Tap):** Double-clicking (desktop) or double-tapping (touchscreen) on any text segment resolves client coordinates via browser caret APIs (`caretRangeFromPoint` / `caretPositionFromPoint`) and immediately re-anchors playback to that exact segment.
- **Viewport Auto-Scrolling:** Smoothly scrolls the reading canvas container to maintain the active segment comfortably within view with an 80px margin buffer.
- **In-Flight Speed Cycling:** Cycles playback speed through `1× → 1.5× → 2× → 0.5× → 0.75× → 1×`. Changing speeds continues playback from the current segment without restarting from the beginning.
- **Monotonic Session Guards:** Every play, stop, seek, or speed change increments a monotonic `sessionIdRef` token, completely preventing stale, out-of-order asynchronous TTS callbacks from causing state desynchronization.
- **Yet Vast Solutions Design System:** Built using canonical brand colors:
  - **YVS Indigo-Violet:** `#4B0084`
  - **YVS Yellow:** `#FFFF11`
  - Supports light and dark modes with dedicated semantic CSS variables.

---

## 3. Technology Stack

- **Framework:** Next.js App Router (16.3.6)
- **UI Runtime:** React 19 (19.2.8)
- **Language:** TypeScript 5.7 (Strict mode enabled)
- **Styling Architecture:** Pure CSS Modules and CSS Custom Properties (zero Tailwind CSS, zero runtime CSS-in-JS)
- **Icons:** Lucide React
- **Markdown Parser & Sanitizer:** Marked (v15) with DOMPurify
- **Testing Engine:** Vitest (v3) with jsdom environment
- **Linter:** ESLint 9 (Flat config with `eslint-config-next`)

---

## 4. Repository Structure

```text
src/
├── adapters/
│   └── speechSynthesisAdapter.ts     # Web Speech API wrapper & mock test adapter
├── app/
│   ├── globals.css                   # Resets, typography foundations & tokens import
│   ├── layout.tsx                    # Root HTML layout and metadata
│   ├── page.module.css               # Homepage layout styles
│   └── page.tsx                      # Primary standalone reading application
├── components/
│   ├── input/
│   │   ├── ContentEditor.module.css  # Editor styling
│   │   └── ContentEditor.tsx         # Text editor, word counter & sample loader
│   ├── layout/
│   │   ├── Header.module.css         # Header styling
│   │   └── Header.tsx                # Branding & light/dark theme toggle
│   ├── player/
│   │   ├── PlayerControls.module.css # Controls styling
│   │   ├── PlayerControls.tsx        # Unified playback toolbar
│   │   ├── YappOutButton.tsx         # Play/Stop primary action button
│   │   └── YappOutSpeed.tsx          # Speed cycler button
│   └── reader/
│       ├── ReadingCanvas.module.css  # Reader typography & canvas styling
│       ├── ReadingCanvas.tsx         # Rendered Markdown reader
│       └── YappoutHighlight.tsx      # Fixed non-mutating highlight overlay
├── constants/
│   └── index.ts                      # Canonical brand colors & playback buffer tokens
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
│   └── tokens.css                    # Semantic design tokens & light/dark palettes
├── types/
│   └── index.ts                      # Central TypeScript type declarations
└── utils/
    ├── doubleTapDetector.ts          # Touch & mouse gesture detector
    ├── markdownExtractor.ts          # Markdown stripping & paragraph extractor
    └── textNormalizer.ts             # Punctuation boundary segmenter & normalizer
```

---

## 5. Getting Started

### Prerequisites

- Node.js 20+ or 22+ (tested on Node v26)
- npm 10+ or 11+

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Quality Verification Commands

- **Unit Tests:** `npm test` (Runs 28 automated Vitest unit tests)
- **Type Checking:** `npm run typecheck` (`tsc --noEmit`)
- **Linting:** `npm run lint` (`eslint .`)
- **Production Build:** `npm run build` (`next build`)

---

## 6. Vercel Deployment Instructions

YappOut V0 requires **no backend databases, no server-side storage, and zero environment variables**.

1. Connect the GitHub repository `YetVastSolutions/yappout` to [Vercel](https://vercel.com).
2. Set Framework Preset to **Next.js**.
3. Leave Root Directory as `./`.
4. Leave Environment Variables empty.
5. Click **Deploy**.

The application will build statically and run immediately worldwide on Vercel's Edge/Serverless CDN.

---

## 7. Mandatory Engineering Conventions

This standalone implementation was built in strict accordance with the Yet Vast Solutions Engineering Standards and the YappOut extraction specifications:

- **Zero DOM Mutation:** Highlighting is completely isolated from the document DOM tree.
- **Zero Cost Phase:** Operates exclusively using client-side browser Web Speech API.
- **Strict Scope Boundaries:** V0 omits user authentication, databases, and third-party APIs by design.

---

## 8. License

Copyright &copy; 2026 Yet Vast Solutions. All rights reserved.
