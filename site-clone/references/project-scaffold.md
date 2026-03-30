# Project Scaffold — Next.js Clone Base

The clone target is a Next.js 15+ project with Tailwind CSS v4 and shadcn/ui. This reference defines the initial project structure and setup steps.

## Initial Setup

```bash
npx create-next-app@latest {project-name} --typescript --tailwind --eslint --app --src-dir
cd {project-name}
npx shadcn@latest init
```

## Directory Structure

```
{project-name}/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout — fonts, metadata, global providers
│   │   ├── page.tsx            # Home page — imports all section components
│   │   └── globals.css         # Tailwind v4 config + design tokens (oklch)
│   ├── components/
│   │   ├── ui/                 # shadcn primitives (button, card, tabs, etc.)
│   │   ├── icons.tsx           # Extracted SVG icons as React components
│   │   ├── {section-name}.tsx  # One component per page section
│   │   └── ...
│   ├── lib/
│   │   └── utils.ts            # cn() utility from shadcn
│   ├── types/
│   │   └── index.ts            # Shared TypeScript interfaces
│   └── hooks/
│       └── ...                 # Custom React hooks (scroll, intersection, etc.)
├── public/
│   ├── images/                 # Downloaded raster images
│   ├── videos/                 # Downloaded video assets
│   └── seo/                    # Favicons, OG images, webmanifest
├── docs/
│   ├── research/
│   │   ├── components/         # Component spec files (*.spec.md)
│   │   ├── BEHAVIORS.md        # Interaction sweep findings
│   │   └── PAGE_TOPOLOGY.md    # Section map + visual order
│   └── design-references/      # Screenshots of target site
└── scripts/
    └── download-assets.mjs     # Asset download script (generated per project)
```

## Design Token Setup

In `globals.css`, define tokens extracted by the design-tokens script:

```css
@import "tailwindcss";

@theme {
  /* Fonts */
  --font-sans: "{extracted font}", system-ui, sans-serif;
  --font-heading: "{extracted heading font}", serif;

  /* Colors — use oklch for perceptual uniformity */
  --color-background: oklch(0.98 0 0);
  --color-foreground: oklch(0.15 0 0);
  --color-primary: oklch({extracted});
  --color-secondary: oklch({extracted});
  --color-accent: oklch({extracted});
  --color-muted: oklch({extracted});
  --color-border: oklch({extracted});

  /* Spacing scale */
  --spacing-section: {extracted}px;

  /* Radii */
  --radius-sm: {extracted};
  --radius-md: {extracted};
  --radius-lg: {extracted};

  /* Shadows */
  --shadow-card: {extracted};
  --shadow-elevated: {extracted};
}
```

## Font Configuration

In `layout.tsx`:

```tsx
import { {FontName} } from 'next/font/google'

const font = {FontName}({
  subsets: ['latin'],
  weight: ['{weights}'],
  variable: '--font-{name}',
})

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={font.variable}>
      <body>{children}</body>
    </html>
  )
}
```

For self-hosted fonts, use `next/font/local` instead.

## Asset Download Script

Generate `scripts/download-assets.mjs` from the asset-discovery results:

```js
import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';

const ASSETS = [
  // Populated from asset-discovery script results
  { url: '...', path: 'public/images/...' },
];

const CONCURRENCY = 4;

async function download(asset) {
  const dir = dirname(asset.path);
  await mkdir(dir, { recursive: true });
  const res = await fetch(asset.url);
  if (!res.ok) { console.error(`Failed: ${asset.url}`); return; }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(asset.path, buf);
  console.log(`✓ ${asset.path}`);
}

// Batch downloads with concurrency limit
for (let i = 0; i < ASSETS.length; i += CONCURRENCY) {
  await Promise.all(ASSETS.slice(i, i + CONCURRENCY).map(download));
}
```

## Icon Extraction Pattern

Convert inline SVGs to React components in `src/components/icons.tsx`:

```tsx
export function LogoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="{extracted}" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* paths extracted from source */}
    </svg>
  )
}
```

## Builder Agent Instructions

Each builder agent receives:
1. The full spec file contents (inline, not a file reference)
2. The section screenshot path
3. Shared imports: `cn()` from `@/lib/utils`, icons from `@/components/icons`, shadcn primitives
4. Target file path: `src/components/{section-name}.tsx`
5. Build check: `npx tsc --noEmit` before finishing

Builders work in **isolated worktrees** (`isolation: "worktree"` on the Agent tool). After each builder finishes, merge the worktree branch into main and verify `npm run build`.

## Build Verification

After every merge and at each phase boundary:

```bash
npm run build
```

The build must pass before proceeding. If it fails, fix the issue before dispatching more builders.
