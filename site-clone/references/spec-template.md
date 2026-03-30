# Component Spec Template

Every section dispatched to a builder agent MUST have a spec file. This template is mandatory — fill every section or explicitly mark it N/A. Builders should never need to guess.

---

## `{ComponentName}.spec.md`

```markdown
# {ComponentName}

> Target: `src/components/{component-name}.tsx`
> Screenshot: `docs/design-references/{NN}-{section-slug}.png`
> Interaction model: {static | hover + transitions | scroll-driven | animated | click-driven}

## DOM Structure

{Element hierarchy — use indented list or pseudo-HTML}

## Computed Styles

{EXACT values from getComputedStyle for every visible element. Not estimates.}

### Container
- display: {value}
- max-width: {value}
- padding: {value}
- background-color: {value}
- gap: {value}

### Heading
- font-family: {value}
- font-size: {value}
- font-weight: {value}
- line-height: {value}
- letter-spacing: {value}
- color: {value}

### {Repeat for each distinct element...}

## States & Behaviors

### {State Name} (e.g., "Header on scroll", "Tab active", "Card hover")
- **Trigger:** {scroll position > 80px | click on tab | hover | IntersectionObserver}
- **State A (before):** {exact CSS values}
- **State B (after):** {exact CSS values}
- **Transition:** {CSS transition definition}
- **Implementation:** {CSS transition | IntersectionObserver | animation-timeline | JS scroll listener}

### Hover States
- **{Element}:** {property changes on hover — transform, opacity, color, shadow, etc.}

## Per-State Content

{If the section has tabs or stateful content, list each state's content separately}

### Tab: "{Tab Label 1}"
{Cards, text, images visible in this state}

### Tab: "{Tab Label 2}"
{Cards, text, images visible in this state}

## Assets

| Asset | Type | Path | Notes |
|-------|------|------|-------|
| {description} | image/svg/video | `public/images/{file}` | {hero, layered, icon, etc.} |

## Text Content

{Verbatim text from the site. Every heading, paragraph, button label, caption.}

## Responsive Behavior

### Desktop (1440px)
{Layout description}

### Tablet (768px)
{What changes — columns, spacing, font sizes, hidden elements}

### Mobile (390px)
{What changes — stacking, hamburger, reflow}

### Breakpoint Values
{Exact pixel values where layout shifts, from the site's CSS}
```

---

## Complexity Budget

If a spec exceeds ~150 lines, the section is too complex for one builder. Split into sub-components:

1. Create separate spec files: `{ComponentName}Header.spec.md`, `{ComponentName}Cards.spec.md`, etc.
2. One builder per sub-component + one for the wrapper that imports them
3. Each sub-component spec must be self-contained (include its own styles, assets, text)

## Spec Quality Checklist

Before dispatching to a builder, verify:

- [ ] Every CSS value is from `getComputedStyle()`, not estimated
- [ ] Interaction model identified (static/click/scroll/time)
- [ ] All states extracted (clicked each tab, scrolled to each trigger)
- [ ] All images listed (including overlays, layered compositions)
- [ ] Responsive behavior documented at 1440px, 768px, 390px
- [ ] Text is verbatim from the site
- [ ] Spec is under ~150 lines (split if over)
