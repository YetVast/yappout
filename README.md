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

No authentication, registration, database, persistence, or external backend is required. All speech synthesis, highlighting calculations, and text processing run locally in the user's browser.

---

## 2. Core V0 Features

- **Responsive & Collapsible Content Input Workspace:** Large multiline text editor supporting plain text and Markdown without arbitrary character limits. During playback, the editor automatically minimizes to keep the reading canvas in focus while leaving the title and expand/collapse controls accessible.
- **Multiple Reading Highlight Modes:** Cycle seamlessly between four distinct visual presentation treatments using the highlight mode selector:
  1. **Box highlight:** Canonical YVS Yellow outline with Indigo-Violet outer shadow around line rects.
  2. **Underline:** Solid underline bar anchored directly along the bottom of the active sentence.
  3. **Background:** Translucent highlighter color wash over the active sentence without box borders.
  4. **Bold:** Bold typography treatment emphasizing the active sentence without box or background fills.
- **Continuous Sequential Speech:** Uses the native browser Web Speech API (`window.speechSynthesis`) to speak sentences and clauses sequentially rather than submitting massive monolithic utterances.
- **Non-Mutating Visual Highlighting:** Highlights the active segment using DOM Range calculations (`Range.getClientRects()`) projected onto a fixed-position floating overlay (`z-index: 9000`). The underlying document innerHTML is never mutated, preserving React component trees and Markdown formatting completely intact.
- **Spatial Caret Seeking (Double-Click & Double-Tap):** Double-clicking (desktop) or double-tapping (touchscreen) on any text segment resolves client coordinates via browser caret APIs (`caretRangeFromPoint` / `caretPositionFromPoint`) and immediately re-anchors playback to that exact segment.
- **Subtle Inline Gesture Guidance:** The double-click/double-tap seek instruction is positioned directly beneath the segment metadata in the player toolbar.
- **Viewport Auto-Scrolling:** Smoothly scrolls the reading canvas container to maintain the active segment comfortably within view with an 80px margin buffer.
- **In-Flight Speed Cycling:** Cycles playback speed through `1× → 1.5× → 2× → 0.5× → 0.75× → 1×`. Changing speeds continues playback from the current segment without restarting from the beginning.
- **Reorganized Player Controls:** Clean control hierarchy placing the Highlight Mode selector, Speed selector, and Segment metadata & progress on the left, with the prominent YappOut playback button on the right.
- **Single Source-of-Truth Product Information:** All product specifications and sample content reside in `public/yappout-info.json`, loaded on demand via the compact `v0` button in the header or contextual title-side action.
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
public/
└── yappout-info.json                 # Single source-of-truth product metadata & sample content
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
│   │   ├── ContentEditor.module.css  # Collapsible editor styling
│   │   └── ContentEditor.tsx         # Text editor, collapsible card & contextual controls
│   ├── layout/
│   │   ├── Header.module.css         # Header styling & v0 badge
│   │   └── Header.tsx                # Branding, v0 sample loader & theme switch
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

- **Unit Tests:** `npm test` (Runs 37 automated Vitest unit tests across 8 test suites)
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

The application builds statically and runs immediately worldwide on Vercel's Edge/Serverless CDN.

---

## 7. Mandatory Engineering Conventions

This implementation strictly complies with the Yet Vast Solutions Engineering Standards:

- **Zero DOM Mutation:** Highlighting is completely isolated from the document DOM tree via fixed Range overlays.
- **Monotonic Sessions:** All asynchronous speech synthesis operations are protected against stale callbacks.
- **Single Source of Truth:** Product specifications and sample Markdown content are maintained centrally in `public/yappout-info.json`.
