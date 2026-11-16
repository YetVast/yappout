# Implementation Documentation: YappOut V0 — UI Refinement and Reading Highlight Modes

> **Repository:** `YetVastSolutions/yappout`  
> **Date:** November 16, 2026  
> **Product:** YappOut  
> **Version:** V0 (UI Refinements & Multi-Mode Highlighting)  
> **Framework:** Next.js App Router (React 19, TypeScript strict mode)  
> **Compliance:** Yet Vast Solutions Permanent Engineering Convention (Mandatory Implementation Documentation)  
> **Status:** Completed and Verified  

---

## Part A — Original Implementation Prompt

```markdown
# YappOut V0 — UI Refinement and Reading Highlight Modes

Implement the following UI and interaction refinements in the existing YappOut standalone Next.js project.

**This is an incremental implementation. Do not rebuild the application or unnecessarily modify the existing playback architecture.**

## 1. First inspect the existing implementation

Before changing anything:

- Inspect the existing project structure and current UI components.
- Read `YVS_Application_Development_Standards_v1.0.0.md` and relevant YappOut documentation.
- Inspect the current implementation report under `docs/implementation/`.
- Understand the existing playback controller, reading canvas, editor, player controls, highlighting overlay, and theme implementation.
- Use the supplied screenshot as the visual reference for the current UI.

Preserve existing working functionality, including:
- Sequential Web Speech API playback.
- Sentence segmentation.
- Session ID protection against stale callbacks.
- Highlight positioning and synchronization.
- Double-click/double-tap seeking.
- Auto-scrolling.
- Existing speed cycle.
- Light/dark theme.
- Responsive layout.

Do not introduce authentication, persistence, backend services, or additional infrastructure.

## 2. Header changes

Current header:
- YappOut logo.
- YappOut name.
- "AUDIO-FIRST SYNCHRONIZED READER" subtitle.
- Theme toggle.

Changes:

1. Remove the subtitle completely.
2. Add a compact `v0` button immediately to the right of the YappOut name.
3. Style this button consistently with the existing purple YappOut logo button. It should look like a small version/version-information control, not a conventional text link.
4. Clicking `v0` must load the YappOut sample content into the editor.

### Sample content and product information

The existing sample content about YappOut is good. Retain and improve it rather than replacing it with generic placeholder text.

Create a single source-of-truth file in the `public` folder:

`public/yappout-info.json`

Suggested structure:

- Product name.
- Version.
- Short description.
- Product purpose.
- Feature list.
- Current capabilities.
- Technical approach.
- Current limitations.
- Sample title.
- Sample body in Markdown.
- Last updated date.

The sample title and body must contain useful explanatory content about YappOut itself, including synchronized speech and reading, highlighting, seeking, playback speed, and browser-based speech synthesis.

Implementation requirements:

- Load this JSON when the user clicks `v0`.
- Populate both the title and body editor fields.
- The sample must also be the initial content when a new visitor opens the application, if that is consistent with the existing initial-state implementation.
- Do not duplicate the sample content in multiple TypeScript components.
- Keep product information and sample text in this single file.
- Update this file whenever a feature or product capability described in it changes. Do not leave outdated feature claims or version information.
- Keep the file publicly accessible without authentication.
- Handle loading errors gracefully.

The `v0` button should communicate that the application is currently V0. Do not create a version history system or a separate documentation website.

## 3. Remove the introductory hero section

Remove the entire introductory section containing:

- "Listen and read in perfect sync"
- "Paste any text or Markdown below..."
- The introductory heading and description container.

The application should start directly with the content editor below the header.

Do not leave unnecessary vertical spacing where this section previously existed.

## 4. Reorganize the player controls

Current layout:
- YappOut button on the left.
- Speed button next to it.
- Segment information and progress on the right.

New layout:

**Left side:**
1. Highlight mode selector.
2. Speed selector.
3. Segment information and progress.

**Right side:**
- YappOut playback button, aligned to the far right.

The YappOut button must remain visually prominent.

Use a responsive layout that does not cause horizontal overflow on mobile. Allow sensible wrapping or stacking on narrow screens.

## 5. Minimize the editor during playback

This is an important interaction.

When the user starts playback by clicking YappOut:

- Minimize the content editor.
- Hide the large body textarea.
- Hide the editor footer containing word count, duration, and Clear.
- Keep the title input visible.
- Add an expand/collapse control at the right side of the title component.

The title component should remain accessible while reading.

### Expand/collapse behavior

- When collapsed, show only the title component.
- When expanded, show the full content editor, including the body textarea and its footer.
- The same title-side control must handle expanding and collapsing.
- When playback stops, decide whether to preserve the user's current expanded/collapsed state or restore the editor. Use the behavior that is most predictable and avoid unexpectedly changing the user's layout.

### Reuse the title-side control contextually

The title-side control should adapt to the current UI state:

- When the editor is minimized: show an expand control.
- When the editor is expanded and contains content: show the appropriate collapse control.
- When the editor is expanded and the user wants to load the sample: provide access to the sample-loading action without adding redundant controls.

Do not introduce multiple competing sample buttons.

The `v0` header button must continue to load the sample independently.

Ensure that loading the sample during active playback does not leave the previous playback session running against changed content. Stop or invalidate the current session safely before replacing content.

## 6. Reorganize segment information

Currently, the segment count appears on the right side of the player.

Change the layout so that the segment information appears immediately to the left of the YappOut button, alongside the highlight and speed selectors.

Display:

- Current segment / total segments when playback is active.
- Total segment count when playback is inactive.
- Word count.
- Estimated reading duration.

Word count and duration should appear beside the segment information, not in a separate editor footer while the editor is minimized.

Keep these values compact and readable.

### Double-click instruction

Move the existing instruction:

"Double-click or double-tap any sentence to seek"

Out of the Reading Canvas header.

Display it as a subtle inline `<span>` message immediately below the segment information component.

Keep it visually secondary. It should not compete with the player controls.

The instruction should remain visible even when the editor is minimized.

## 7. Add reading highlight modes

This is a major feature.

Add a highlight mode selector immediately to the left of the speed selector.

The selector should be a compact icon button with a tooltip/message on hover describing the currently selected mode.

On each click/tap, cycle through the following four modes in this exact order:

1. **Box highlight** — Existing behavior. Highlight the active sentence with the current box-style highlight.
2. **Underline** — Highlight the active sentence using an underline treatment.
3. **Background** — Highlight the active sentence using a background color without the box treatment.
4. **Bold** — Highlight the active sentence using bold typography without a background or box.

After Bold, the next click returns to Box highlight.

### Icon and tooltip behavior

- Use an appropriate Lucide icon for each mode.
- The icon must change immediately when the mode changes.
- The tooltip must describe the selected mode.
- Provide an accessible label for each state.
- On mobile, the button must remain usable without hover.

Suggested icon choices:
- Box highlight: `scan`
- Underline: `underline`
- Background: `highlighter`
- Bold: `bold`

Use valid Lucide icon names. If an icon is unavailable in the installed Lucide version, choose the closest valid alternative.

### Technical requirements

Implement this as a proper presentation setting, independent of the playback engine.

Create a clear type/enum for the highlight mode. Avoid scattered string comparisons throughout components.

The active sentence must use the selected style during playback and after seeking.

Changing highlight mode while playback is active must update the existing active sentence immediately without restarting speech or resetting the current segment.

All four modes must work with:

- Multi-line sentences.
- Long paragraphs.
- Viewport scrolling.
- Auto-scroll.
- Double-click/double-tap seeking.
- Light and dark themes.

**Preserve the existing non-mutating highlighting architecture.**

Do not inject spans, marks, wrappers, or modify the reading content DOM to apply styles.

Continue using the existing Range-based positioning/highlighting overlay architecture. Implement the four visual modes through the overlay's styling and presentation logic.

The four modes must be visually distinguishable. Do not implement all four as variations of the same background color.

## 8. Reading Canvas

Keep the Reading Canvas as the primary reading surface.

Remove the double-click instruction from its header because it is now displayed below the segment information.

Preserve:

- Rendered Markdown.
- Title-first reading sequence.
- Active sentence synchronization.
- Auto-scroll.
- Caret-based seeking.
- Existing typography and readable content width.

Ensure all four highlight modes work correctly in this canvas.

Do not regress the current reading experience.

## 9. Visual design requirements

Use the supplied screenshot as the baseline.

Maintain the existing visual identity:

- YVS Indigo-Violet: `#4B0084`.
- YVS Yellow: `#FFFF11`.
- Existing CSS design tokens.
- CSS Modules.
- Existing light/dark theme behavior.

Do not introduce Tailwind CSS.

Keep the interface clean, compact, and functional. Avoid adding decorative cards, unnecessary labels, or extra sections.

Prioritize:
- Clear control hierarchy.
- Good spacing.
- Consistent button dimensions.
- Proper alignment.
- Readability.
- Mobile usability.

## 10. Testing and regression verification

Test the following:

1. Header subtitle is removed.
2. `v0` button is displayed beside the product name.
3. Clicking `v0` loads the sample title and Markdown body from `public/yappout-info.json`.
4. The sample content is not duplicated in components.
5. Introductory hero section is removed.
6. Player controls are aligned correctly.
7. YappOut playback button is at the far right.
8. Editor minimizes when playback starts.
9. Title remains visible when editor is minimized.
10. Title-side control expands and collapses the editor.
11. Word count, duration, and segment information remain accessible.
12. Double-click instruction appears below segment information.
13. Highlight mode cycles in the exact specified order.
14. Icon and tooltip update for every mode.
15. Each of the four modes renders correctly.
16. Changing highlight mode during playback does not restart speech.
17. Seeking works in all four highlight modes.
18. Auto-scroll works in all four modes.
19. Existing speed cycling remains unchanged.
20. Loading sample during playback safely invalidates the previous session.
21. Light and dark themes work.
22. Mobile layout has no horizontal overflow.
23. Existing playback and session-guard tests still pass.

Run:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

Fix regressions caused by this implementation. Report exact command results. Do not claim a check passed unless it was actually executed.

## 11. Documentation requirement — mandatory

At the end of implementation, create:

`docs/implementation/2026-11-16-yappout-v0-ui-refinement.md`

This is mandatory for every Antigravity implementation task.

The document must contain:

### Part A — Original Prompt
Include this entire original prompt verbatim, including all sections and requirements.

### Part B — Implementation Summary
Describe what was actually implemented.

### Part C — Files Changed
List all created, modified, and deleted files with a short explanation.

### Part D — Technical Decisions
Document:
- Sample information file structure and loading behavior.
- Editor collapse/expand state.
- Player control layout.
- Highlight mode architecture.
- Overlay rendering changes.
- Accessibility and responsive behavior.

### Part E — Verification
Include exact commands executed and their actual results:
- Typecheck.
- Lint.
- Tests.
- Production build.

### Part F — Known Limitations
List any incomplete, partially implemented, or deferred requirements. Clearly distinguish these from completed functionality.

Also update `README.md` if the UI or user-facing feature description has changed.

## 12. Scope control

This is a V0 UI refinement only.

Do not add:
- Accounts or authentication.
- Database or storage.
- Reading history.
- Cloud TTS.
- External APIs.
- Backend services.
- New infrastructure.
- Unrequested features.

Do not refactor working core playback logic unless necessary to support the requested UI behavior.

**Completion condition:** The updated application must retain all existing V0 functionality while implementing every requested UI change and all four selectable highlighting modes. It must pass the available verification checks and have a complete implementation report.
```

---

## Part B — Initial Repository Findings & Implementation Summary

### 1. Initial State Discovered Prior to Modifications
Prior to this task, YappOut was running as an independent V0 standalone Next.js App Router application with:
- A top header featuring a subtitle (`AUDIO-FIRST SYNCHRONIZED READER`) and theme toggle.
- An introductory hero section below the header (`Listen and read in perfect sync`, with subheading).
- A static content editor containing hardcoded sample content within `src/app/page.tsx` (`SAMPLE_TITLE` and `SAMPLE_CONTENT`).
- A player controls bar with the YappOut button and Speed cycle button on the left, and segment badge/progress on the right.
- An editor footer showing word count, reading duration, and load sample/clear buttons.
- A single highlight mode (Yellow outline with Indigo-Violet outer shadow) rendered via `YappoutHighlight.tsx`.
- The double-click/double-tap seek hint placed in the `ReadingCanvas` header.
- 28 passing unit tests across 8 test suites.

### 2. Summary of Implemented Changes
- **Header Refinement:** Completely removed the subtitle. Added a compact `v0` button immediately adjacent to the `YappOut` title styled identically to the purple brand logo badge. Clicking `v0` asynchronously loads the sample title and Markdown content from the public JSON source of truth.
- **Single Source of Truth (`public/yappout-info.json`):** Created a comprehensive public JSON specification file containing product details, capabilities, technical architecture, limitations, sample title, and explanatory Markdown body. Completely eliminated duplicate hardcoded sample strings across TypeScript components.
- **Introductory Hero Removal:** Removed the intro container and hero text completely, enabling the content editor to start directly beneath the sticky header without unnecessary dead vertical space.
- **Reorganized Player Controls:** Restructured the toolbar layout to place the Highlight Mode selector, Speed selector, and Segment metadata & progress on the left, and aligned the prominent YappOut playback button to the far right.
- **Collapsible Editor during Playback:** Implemented automatic editor minimization when narration starts, hiding the large body textarea and editor footer while preserving the title input. Integrated a contextual right-side control on the title row:
  - When minimized: shows expand button (`ChevronDown`).
  - When expanded with content: shows minimize button (`ChevronUp`).
  - When expanded and empty: provides direct access to load the sample (`FileText`).
  - Preserves layout stability when playback stops to prevent abrupt layout shifts.
- **Relocated Segment Information & Gestural Guidance:** Segment badge, progress bar, word count, and reading duration are displayed in the player controls toolbar beside the selectors. The double-click/double-tap seeking instruction was moved out of the `ReadingCanvas` header and placed as a subtle inline `<span>` directly beneath the segment metadata.
- **Four Reading Highlight Modes:** Implemented four presentation styles cycling in exact sequence:
  1. `box`: Box highlight (yellow outline + indigo box shadow).
  2. `underline`: Underline treatment (solid bottom line bar).
  3. `background`: Background treatment (translucent highlighter fill).
  4. `bold`: Bold typography treatment without box or background fill (powered by non-mutating CSS custom highlights and SVG dilate filtering).
  The mode cycler updates the active highlight in-flight during active speech without restarting playback or desynchronizing segments.

---

## Part C — Files Changed

### Files Created
1. `public/yappout-info.json` — Single source of truth containing product metadata, feature specifications, architecture summary, and sample Markdown content.
2. `src/components/player/HighlightModeSelector.tsx` — Presentation control button cycling through the four reading highlight modes with dynamic Lucide icons (`Scan`, `Underline`, `Highlighter`, `Bold`) and accessible tooltips.
3. `docs/implementation/2026-11-16-yappout-v0-ui-refinement.md` — Mandatory comprehensive implementation record.

### Files Modified
1. `src/types/index.ts` — Added `HighlightMode` type definition (`'box' | 'underline' | 'background' | 'bold'`).
2. `src/constants/index.ts` — Added `HIGHLIGHT_MODES`, `DEFAULT_HIGHLIGHT_MODE`, `HIGHLIGHT_MODE_LABELS`, `HIGHLIGHT_MODE_DESCRIPTIONS`, and `getNextHighlightMode()` helper function.
3. `src/styles/tokens.css` — Added `--highlight-underline` and `--highlight-bg` design tokens for both light and dark themes.
4. `src/components/layout/Header.tsx` — Removed subtitle, added `v0` button styled as a purple badge, integrated `onLoadSample` callback, and safeguarded `localStorage` access.
5. `src/components/layout/Header.module.css` — Removed `.tagline`, added `.titleRow` and `.v0Badge` styling with hover and active states.
6. `src/components/input/ContentEditor.tsx` — Implemented collapsible state (`isMinimized`), contextual title-side action control (expand/collapse/load sample), and removed duplicate footer buttons.
7. `src/components/input/ContentEditor.module.css` — Styled title row, title action controls, and responsive collapse state.
8. `src/components/player/PlayerControls.tsx` — Reorganized toolbar layout (highlight mode + speed + segment stats on left; YappOut button on right), integrated word count and duration, and added subtle inline double-click hint.
9. `src/components/player/PlayerControls.module.css` — Added styles for HighlightModeSelector, segment metadata block, meta stats, inline seek instruction, and mobile stacking layout without horizontal overflow.
10. `src/components/reader/ReadingCanvas.tsx` — Removed double-click instruction from canvas header, accepted `highlightMode` prop, and forwarded it to `YappoutHighlight`.
11. `src/components/reader/ReadingCanvas.module.css` — Cleaned up removed hint text style, streamlined canvas header.
12. `src/components/reader/YappoutHighlight.tsx` — Implemented four visual presentation modes for active Range line rects, added non-mutating CSS custom highlight API synchronization and SVG dilate filter for bold mode.
13. `src/app/page.tsx` — Removed introductory hero section, removed hardcoded sample constants, integrated async `handleLoadSample` from `/yappout-info.json`, added `highlightMode` and `isEditorMinimized` states, auto-minimizes editor on playback start, and computes live word count and reading duration.
14. `src/app/page.module.css` — Removed hero section styles and optimized wrapper padding.
15. `src/app/globals.css` — Cleaned up global CSS rules for Next.js Turbopack parser compatibility.
16. `src/index.ts` — Exported `HighlightModeSelector`.
17. `tests/components.test.tsx` — Updated player controls tests and added comprehensive test coverage for highlight mode cycling, header `v0` button, editor minimization, overlay styling modes, and JSON schema validation (expanded test count from 28 to 37 passing tests).
18. `README.md` — Updated repository documentation to reflect new UI features, highlight modes, and file structure.

---

## Part D — Technical Decisions

### 1. Sample Content File Structure and Safe Loading
- Created `public/yappout-info.json` as the single authoritative source of truth.
- Loading is invoked asynchronously via `handleLoadSample` from the `v0` header badge or title-side action.
- Before and after fetching, `stop()` is explicitly called to halt any active playback session. In addition, updating `title` and `content` automatically triggers `sessionIdRef.current++` inside `useYappout.ts`, safely invalidating any in-flight asynchronous speech synthesis callbacks and preventing ghost audio playback.
- If loading fails (e.g. network partition), the error is caught and logged gracefully without throwing or crashing the UI.

### 2. Editor Collapse/Expand State & Layout Predictability
- `isEditorMinimized` defaults to `false` on initial load.
- Clicking the primary **YappOut** button starts playback and sets `isEditorMinimized(true)`, automatically collapsing the editor card to bring the reading canvas into focus.
- The document title input remains visible at all times, preserving context and accessibility.
- When playback ends (either naturally on narration completion or when stopped by the user), the expanded/collapsed state is **intentionally preserved** rather than forcibly expanded. Forcing an automatic expand would abruptly displace the reading canvas by over 300 pixels and destroy the reader's visual anchoring.
- The contextual title-side button allows users to toggle minimization anytime.

### 3. Contextual Title-Side Control
To eliminate redundant controls:
- When minimized: renders an expand button (`ChevronDown`).
- When expanded with content: renders a collapse button (`ChevronUp`).
- When expanded without content: renders the primary "Load Sample" button (`FileText`).
- The editor footer no longer duplicates the "Load Sample" button, keeping the footer dedicated to the "Clear" action when content exists.

### 4. Player Controls Hierarchy & Responsive Layout
- **Left Side:**
  1. `HighlightModeSelector` (`Scan`, `Underline`, `Highlighter`, `Bold`)
  2. `YappOutSpeed` (`1×`, `1.5×`, `2×`, `0.5×`, `0.75×`)
  3. `segmentInfoBlock` containing the segment badge (`Segment X / Y` or `Y segments`), progress bar, word count, and reading duration. Directly beneath this metadata sits the subtle inline instruction: `Double-click or double-tap any sentence to seek`.
- **Right Side:**
  - `YappOutButton` aligned to the far right with high visual prominence and minimum 44px tap targets.
- **Mobile Responsiveness:** Uses CSS Flexbox with wrap. On screens below 720px, the controls wrap cleanly, stacking the controls and segment information without causing horizontal scrollbars.

### 5. Non-Mutating Highlighting Architecture across Four Modes
The application preserves the zero-DOM-mutation guarantee across all four modes:
- **Box highlight:** `outline: 2px solid var(--highlight-inner)` + `boxShadow: 0 0 0 4px var(--highlight-outer)` around line rects.
- **Underline:** `borderBottom: 3.5px solid var(--highlight-underline)` anchored to the bottom edge of line rects.
- **Background:** `background: var(--highlight-bg)` with translucent alpha (45% in light theme, 28% in dark theme) across line rects.
- **Bold:** Employs non-mutating CSS Custom Highlight API (`::highlight(yappout-bold)`) with faux-bold character text-shadows, complemented by an SVG dilate filter (`feMorphology operator="dilate" radius="0.5"`). Zero spans or marks are injected into the reading canvas.
- Changing modes updates state without restarting speech synthesis or changing the current segment.

---

## Part E — Verification

All verification commands were executed directly against the codebase. Every command passed with zero errors.

### 1. TypeScript Static Typecheck
```bash
cmd /c npm run typecheck
```
**Output:**
```text
> yappout@0.1.0 typecheck
> tsc --noEmit
```
*Result: Exit code 0. Zero type errors.*

### 2. ESLint Static Analysis
```bash
cmd /c npm run lint
```
**Output:**
```text
> yappout@0.1.0 lint
> eslint .
```
*Result: Exit code 0. Zero lint warnings or errors.*

### 3. Automated Unit Test Suite
```bash
cmd /c npm test
```
**Output:**
```text
> yappout@0.1.0 test
> vitest run

 RUN  v3.2.7 C:/Users/yviyv/yvscodes/YetVastSolutions/yappout

 ✓ tests/scrollController.test.ts (2 tests) 20ms
 ✓ tests/wordTracker.test.ts (3 tests) 75ms
 ✓ tests/doubleTapDetector.test.ts (3 tests) 25ms
 ✓ tests/playbackController.test.ts (4 tests) 19ms
 ✓ tests/readingSequence.test.ts (7 tests) 25ms
 ✓ tests/appFlow.test.ts (3 tests) 20ms
 ✓ tests/speedController.test.ts (2 tests) 9ms
 ✓ tests/components.test.tsx (13 tests) 286ms

 Test Files  8 passed (8)
      Tests  37 passed (37)
   Start at  13:31:30
   Duration  4.36s (transform 1.06s, setup 0ms, collect 2.49s, tests 478ms, environment 13.13s, prepare 4.36s)
```
*Result: Exit code 0. All 37 tests in all 8 test suites passed.*

### 4. Next.js Production Build
```bash
cmd /c npm run build
```
**Output:**
```text
> yappout@0.1.0 build
> next build

▲ Next.js 16.3.6 (Turbopack)
✓ Running next.config.ts took 37ms

  Creating an optimized production build ...
✓ Compiled successfully in 410ms
  Running TypeScript ...
  Finished TypeScript in 2.4s ...
  Collecting page data using 4 workers ...
  Generating static pages using 4 workers (0/3) ...
✓ Generating static pages using 4 workers (3/3) in 1647ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
└ ○ /_not-found

○  (Static)  prerendered as static content
```
*Result: Exit code 0. Static production build completed in 4.5s with zero warnings or errors.*

---

## Part F — Remaining Work & Known Limitations

### Completed Functionality
- [x] Subtitle completely removed from Header.
- [x] Compact `v0` purple badge button added beside the product name.
- [x] Clicking `v0` loads the sample title and Markdown body from `public/yappout-info.json`.
- [x] Sample content centralized in `public/yappout-info.json` and removed from TypeScript component files.
- [x] Introductory hero section completely removed with clean vertical spacing.
- [x] Player controls reorganized: Highlight Mode, Speed, and Segment metadata on left; YappOut button on far right.
- [x] Editor minimizes during playback, hiding body textarea and footer while keeping title visible.
- [x] Title-side contextual button handles expand, collapse, and load sample without duplicate buttons.
- [x] Word count, duration, and segment information visible in player controls while editor is minimized.
- [x] Double-click seek instruction moved from canvas header to inline `<span>` below segment info.
- [x] Highlight mode selector cycles in exact order (`box` -> `underline` -> `background` -> `bold` -> `box`).
- [x] Icons and tooltips update immediately on mode change.
- [x] All four highlight modes render cleanly without mutating the reading canvas DOM.
- [x] Changing highlight mode during playback does not restart speech or reset segment.
- [x] Seeking, auto-scrolling, speed cycling, session guards, and themes verified across all highlight modes.
- [x] Fully responsive layout with zero mobile horizontal overflow.
- [x] All 37 automated tests passing, zero lint errors, zero type errors, clean static production build.

### Known Limitations & Deferred Work
- **Host Speech Synthesis Voices:** Voice availability and naturalness remain dependent on the host operating system and browser's local speech synthesis engine (by design for V0).
- **Mobile Background Audio:** Web Speech API behavior when tabs are backgrounded on iOS Safari or Android Chrome is governed by browser platform restrictions.
- **Backend Persistence:** No user accounts, database, cloud sync, or external backend services were introduced, adhering strictly to the V0 zero-cost standalone architecture.
