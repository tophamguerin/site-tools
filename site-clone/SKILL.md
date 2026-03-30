---
name: site-clone
description: >
  Reverse-engineer any website into a pixel-perfect Next.js clone. Screenshots the site,
  extracts every design token, downloads all assets, maps page sections with computed styles,
  then spawns parallel builder agents to reconstruct each section simultaneously.
  Use when: "clone this site", "rebuild this website", "replicate this page",
  "reverse-engineer this design", "make a copy of this site".
  Do NOT use for: auditing (use site-qa), screenshots only (use site-archive),
  or documentation (use site-docs).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
argument-hint: "<url> [project-dir]"
disable-model-invocation: true
compatibility: "Requires Chrome MCP server (chrome-devtools). See ~/.claude/skills/_site-shared/references/setup-guide.md"
---

# Site Clone — Reverse-Engineer Any Website

> **Philosophy:** Completeness beats speed. Builders fail when they have to guess.
> Extract exhaustively, spec precisely, build in parallel.

## Quick Start

```
/site-clone https://example.com my-clone
```

The output is a working Next.js project with Tailwind CSS and shadcn/ui, pixel-matched to the original.

---

## Core Principles

1. **Extract how it looks AND how it behaves** — not just CSS, but triggers, before/after states, transitions
2. **Small tasks, perfect results** — break complex sections (150+ lines of spec) into sub-components
3. **Real content, real assets** — extract actual text, images, SVGs, not placeholders
4. **Spec files are source of truth** — every builder gets inline spec contents, never guesses
5. **Build must always compile** — `npm run build` after each merge, `npx tsc --noEmit` before builder finishes
6. **Identify interaction model first** — BEFORE building: is this scroll-driven, click-driven, or hybrid?

---

## Operational Constraints

### Context Window Management
Extraction produces a lot of data. Keep context lean:

1. Save screenshots to disk: `take_screenshot({ savePng: "{project-dir}/docs/design-references/{name}.png" })`
2. Write spec files and extraction results to disk immediately
3. Only load a snapshot into context when you need a specific `uid` to click
4. After extracting a section, summarise findings in a few lines and move on

### Builder Dispatch Model
Builders run as **Agent tool calls with `isolation: "worktree"`**. This gives each builder an isolated copy of the repo. After a builder finishes, merge its worktree branch into main.

You (the foreman) continue extracting section N+1 while builders work on sections 1–N. Dispatch builders as soon as their spec is ready — don't wait for all specs to be complete.

### Throughput
Realistic: 3-6 sections per hour for extraction + build. For large sites (10+ sections), tell the user upfront and ask if they want the full site or priority sections only.

---

## STATE 1: ORIENT

**Goal:** Reconnaissance — screenshot, extract tokens, discover assets, map sections, document behaviors.

### 1a. Connect & Scaffold

1. **Prerequisite check:** Verify the `navigate_page` tool is available. If not, read `~/.claude/skills/_site-shared/references/setup-guide.md` and show setup instructions. **Stop.**
2. Parse `$ARGUMENTS` for URL and optional project directory (default: `./clone-{domain}`)
3. **Scaffold the project:**
   ```bash
   npx create-next-app@latest {project-dir} --typescript --tailwind --eslint --app --src-dir --no-git
   cd {project-dir}
   npx shadcn@latest init -y
   mkdir -p docs/research/components docs/design-references scripts public/images public/videos public/seo
   ```
   See `~/.claude/skills/site-clone/references/project-scaffold.md` for full structure.
4. `navigate_page` to the target URL
5. `take_screenshot` at desktop (1440x900) — save to `docs/design-references/00-full-page-desktop.png`
6. `take_screenshot` at mobile (390x812) — save to `docs/design-references/00-full-page-mobile.png`
7. Install console monitor: read `~/.claude/skills/_site-shared/scripts/console-monitor.js`, run `consoleMonitorInstall` via `evaluate_script`

### 1b. Extract Design Tokens

Read `~/.claude/skills/site-clone/scripts/design-tokens.js` and run `designTokens` via `evaluate_script`.

From the results, update the project:
- **Fonts:** Configure in `src/app/layout.tsx` using `next/font/google` or `next/font/local`
- **Colors:** Write to `src/app/globals.css` as CSS custom properties (oklch preferred)
- **Spacing, radii, shadows:** Add to the CSS theme
- **Keyframes:** Add `@keyframes` rules to globals.css
- **Scroll behavior:** Note Lenis/Locomotive/scroll-snap for later implementation

### 1c. Discover & Download Assets

Read `~/.claude/skills/site-clone/scripts/asset-discovery.js` and run `assetDiscovery` via `evaluate_script`.

From the results:
1. Generate `scripts/download-assets.mjs` with all discovered image/video/font URLs
2. Run it: `node scripts/download-assets.mjs`
3. Extract inline SVGs → create named React components in `src/components/icons.tsx`
4. Download favicons and OG images to `public/seo/`

### 1d. Map Page Sections

Read `~/.claude/skills/site-clone/scripts/section-map.js` and run `sectionMap` via `evaluate_script`.

Write `docs/research/PAGE_TOPOLOGY.md`:

```markdown
# Page Topology: {site name}

> URL: {url}
> Sections: {N}

| # | Section | Type | Complexity | Interaction Model | Height |
|---|---------|------|-----------|-------------------|--------|
| 0 | Header/Nav | nav | simple | sticky | 80px |
| 1 | Hero | section | moderate | scroll-driven | 600px |
| ... | ... | ... | ... | ... | ... |

## Z-Index Layers
{Fixed/sticky overlays, their z-index values and purposes}

## Dependencies
{Which sections depend on shared state, scroll position, or each other}
```

### 1e. Sweep Interactions

Read `~/.claude/skills/site-clone/scripts/behavior-sweep.js` and run `behaviorSweep` via `evaluate_script`.

Then do a **manual interaction sweep** via Chrome MCP:

1. **Scroll sweep:** Slowly scroll the page. At each scroll position, screenshot. Note:
   - Header changes (transparent → solid, shrinks)
   - Entrance animations firing
   - Scroll-snap points
   - Parallax elements
   - Lazy-loaded content appearing

2. **Click sweep:** Click every interactive element (tabs, accordions, buttons, toggles). Screenshot each state change. Follow safety rules from `~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md`.

3. **Hover sweep:** For key interactive elements (cards, buttons, links), note hover transitions from the behavior-sweep results.

4. **Responsive sweep:** Resize to 1440px, 768px, 390px. Screenshot each. Note layout shifts, hidden elements, navigation changes.

Write findings to `docs/research/BEHAVIORS.md`:

```markdown
# Interaction Behaviors: {site name}

## Overall Model: {scroll-driven + animated | hover + transitions | static | etc.}

## Scroll Behaviors
{List each scroll-triggered change with trigger point and before/after states}

## Click Interactions
{Each interactive element, what it does, what UI appears}

## Hover Effects
{Key hover state changes}

## Responsive Breakpoints
{What changes at each breakpoint}
```

### 1f. Foundation Build

Before any section builders are dispatched, the foundation must be solid:

1. Fonts configured in `layout.tsx` ✓ (from 1b)
2. Design tokens in `globals.css` ✓ (from 1b)
3. TypeScript interfaces in `src/types/index.ts` (if needed)
4. Icons extracted to `src/components/icons.tsx` ✓ (from 1c)
5. Assets downloaded ✓ (from 1c)
6. **Verify:** `npm run build` must pass

**Do not proceed to STATE 2 until the build passes.**

---

## STATE 2: BUILD (repeat per section)

**Goal:** For each section in the page topology, extract a detailed spec and dispatch a builder.

Work through sections in visual order (top to bottom). You can extract section N+1 while builders work on sections 1–N.

### 2a. Extract Section Spec

For each section:

1. **Scroll to the section** and screenshot it in isolation
2. **Extract computed styles** for every visible element using `evaluate_script`:
   ```js
   // Target specific elements within the section
   () => {
     const section = document.querySelector('{section-selector}');
     const els = section.querySelectorAll('*');
     return [...els].slice(0, 50).map(el => {
       const s = getComputedStyle(el);
       return {
         tag: el.tagName,
         classes: el.className?.toString().slice(0, 80),
         text: el.textContent?.trim().slice(0, 100),
         styles: {
           display: s.display, position: s.position,
           width: s.width, height: s.height,
           padding: s.padding, margin: s.margin, gap: s.gap,
           fontSize: s.fontSize, fontWeight: s.fontWeight, fontFamily: s.fontFamily,
           lineHeight: s.lineHeight, letterSpacing: s.letterSpacing,
           color: s.color, backgroundColor: s.backgroundColor,
           borderRadius: s.borderRadius, boxShadow: s.boxShadow,
           transform: s.transform, transition: s.transition,
           opacity: s.opacity, overflow: s.overflow
         }
       };
     });
   }
   ```
3. **Extract multi-state styles** — if the section has tabs, scroll triggers, or hover states:
   - Click each tab and re-extract styles
   - Scroll to trigger point and re-extract
   - Record before/after for each state
4. **Extract text content** — every heading, paragraph, button label, caption, verbatim
5. **List assets used** — images, videos, icons from `icons.tsx`
6. **Check responsive** — resize to 768px and 390px, note layout changes

### 2b. Write Spec File

Write `docs/research/components/{ComponentName}.spec.md` following the template in `~/.claude/skills/site-clone/references/spec-template.md`.

**Complexity check:** If the spec exceeds ~150 lines, split into sub-component specs.

### 2c. Dispatch Builder

Spawn a builder agent using the Agent tool:

```
Agent(
  description: "Build {SectionName} component",
  isolation: "worktree",
  prompt: "You are a component builder. Build the following React component exactly as specified.

    TARGET: src/components/{section-name}.tsx

    SPEC:
    {paste full spec file contents here — inline, not a file reference}

    SCREENSHOT: docs/design-references/{NN}-{section-slug}.png

    IMPORTS:
    - import { cn } from '@/lib/utils'
    - import { {icons} } from '@/components/icons'
    - shadcn components from @/components/ui/ as needed

    REQUIREMENTS:
    - Match the spec exactly — every CSS value, every text string, every asset path
    - Use Tailwind classes where possible, inline styles for exact computed values
    - Implement all states and transitions from the spec
    - Responsive: must work at 1440px, 768px, 390px
    - Run: npx tsc --noEmit
    - The build must pass before you finish

    DO NOT guess any values. If the spec is unclear, build what you can and leave a TODO comment."
)
```

For complex sections (split into sub-components), dispatch one builder per sub-component plus one for the wrapper.

### 2d. Merge Builder Output

As each builder completes:

1. Merge the worktree branch into main: `git merge {worktree-branch}`
2. Resolve any conflicts (you have full context as foreman)
3. Verify: `npm run build`
4. If the build fails, fix it before merging the next builder

---

## STATE 3: ASSEMBLE

**Goal:** Wire all section components into the page and implement page-level behaviors.

### 3a. Page Assembly

After all sections are built, edit `src/app/page.tsx`:

```tsx
import { Header } from '@/components/header'
import { Hero } from '@/components/hero'
// ... import all section components

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      {/* ... all sections in visual order */}
      <Footer />
    </>
  )
}
```

### 3b. Page-Level Behaviors

Implement behaviors that span multiple sections:

- **Scroll containers** — if the site uses scroll-snap or custom scroll
- **Scroll-driven animations** — IntersectionObserver, animation-timeline, parallax
- **Smooth scroll** — Lenis/Locomotive if detected in BEHAVIORS.md
- **Dark/light transitions** — if sections alternate themes on scroll
- **Sticky elements** — header scroll behavior (transparent → solid, shrink)

### 3c. Build Verification

```bash
npm run build
```

Must pass. Fix any issues before proceeding.

---

## STATE 4: VERIFY

**Goal:** Visual QA — compare the clone against the original side-by-side.

### 4a. Start Dev Server

```bash
cd {project-dir} && npm run dev &
```

### 4b. Side-by-Side Comparison

For each section, compare original vs. clone:

1. Navigate to the original site, screenshot the section at 1440px
2. Navigate to `localhost:3000`, screenshot the same section at 1440px
3. Compare visually — check:
   - Layout and spacing
   - Typography (font, size, weight, line-height)
   - Colors (background, text, borders, accents)
   - Images and icons
   - Responsive at 768px and 390px

### 4c. Interaction Verification

Test all interactive behaviors:
- Scroll through the page — do entrance animations fire?
- Click tabs, accordions, buttons — do state changes match?
- Check hover effects on cards, buttons, links
- Test responsive: does the hamburger menu work? Do layouts reflow correctly?

### 4d. Fix Discrepancies

For each discrepancy found:
1. Check the spec file — was it accurate?
2. If spec was wrong: re-extract from the original, update spec, fix component
3. If spec was right but component is wrong: fix the component to match spec

### 4e. Final Report

Report to the user:
- Sections cloned: N
- Build status: passing/failing
- Known discrepancies (if any)
- Files created: list key files
- Next steps: deployment, content updates, etc.

---

## Gotchas

1. **Building click UI when original is scroll-driven** — identify interaction model BEFORE building. This is the most expensive mistake.
2. **Extracting only default state** — you must click every tab, scroll to every trigger, capture ALL states
3. **Missing layered images** — background + foreground = 2 separate assets. Check for overlapping images in the same container.
4. **Approximating CSS** — "looks like text-lg" is wrong. Extract exact computed values with `getComputedStyle()`.
5. **Skipping asset download** — without real images and fonts, the clone looks fake.
6. **Giving builders too much scope** — keep specs under ~150 lines. Split complex sections.
7. **Dispatching without spec** — never send a builder just a screenshot. The spec forces exhaustive extraction.
8. **Missing smooth scroll libraries** — Lenis and Locomotive Scroll feel very different from native scroll.
9. **Session expiry** — long extraction sessions may hit auth timeouts on protected sites. Check auth at each section.
10. **Videos masquerading as images** — check for `<video>`, Lottie, canvas elements before assuming an image.

---

## File Organization

```
{project-dir}/
  src/
    app/
      layout.tsx                # Fonts, metadata, global providers
      page.tsx                  # All sections composed
      globals.css               # Design tokens, Tailwind config
    components/
      ui/                       # shadcn primitives
      icons.tsx                 # Extracted SVGs as React components
      {section-name}.tsx        # One per page section
    lib/
      utils.ts                  # cn() utility
    types/
      index.ts                  # Shared interfaces
    hooks/                      # Custom hooks (scroll, intersection)
  public/
    images/                     # Downloaded raster images
    videos/                     # Downloaded video assets
    seo/                        # Favicons, OG images
  docs/
    research/
      components/               # Spec files (*.spec.md)
      BEHAVIORS.md              # Interaction sweep findings
      PAGE_TOPOLOGY.md          # Section map
    design-references/          # Original site screenshots
  scripts/
    download-assets.mjs         # Asset download script
```

---

## References

### Clone-specific
- [Component spec template](references/spec-template.md)
- [Project scaffold](references/project-scaffold.md)

### Scripts (run via Chrome MCP evaluate_script)
- [Design token extraction](scripts/design-tokens.js)
- [Asset discovery](scripts/asset-discovery.js)
- [Section mapping](scripts/section-map.js)
- [Behavior sweep](scripts/behavior-sweep.js)

### Shared (site-tools suite)
- [Chrome MCP patterns](~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md) — safety rules, session handling, auth walls
- [Viewport presets](~/.claude/skills/_site-shared/references/viewport-presets.md)
- [Setup guide](~/.claude/skills/_site-shared/references/setup-guide.md) — Chrome MCP installation for team
- [Nav discovery script](~/.claude/skills/_site-shared/scripts/nav-discovery.js)
- [Interactive elements script](~/.claude/skills/_site-shared/scripts/interactive-elements.js)
- [Console monitor script](~/.claude/skills/_site-shared/scripts/console-monitor.js)
