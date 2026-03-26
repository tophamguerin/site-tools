# Severity Definitions

Used by site-qa and site-performance for consistent issue classification.

## Levels

### Critical
**The site is broken or unusable for some users.**

Must be fixed before launch or as an emergency patch.

Examples:
- Page returns 404/500 error
- Navigation link goes to wrong page or dead end
- Form submission completely fails (JS error, no feedback)
- Page is blank or unreadable on mobile
- Console shows unhandled exceptions on page load
- SSL/security warnings displayed to users
- Content is wrong language or completely garbled

### Major
**Functionality is impaired or user experience is significantly degraded.**

Should be fixed in the current sprint.

Examples:
- Broken link on a primary navigation path
- Image fails to load (broken src)
- Form validation missing -- user can submit invalid data with no feedback
- Content overflows its container on tablet/mobile
- Interactive element (button, dropdown) doesn't respond to clicks
- `href="#"` on a clickable element (should be a button)
- Placeholder text visible to users ("Lorem ipsum", "TODO", "[Company Name]")
- Console errors triggered by user interaction
- Page takes >5s to become interactive (performance)
- CLS >0.25 causing visible layout shift

### Minor
**A quality issue that doesn't block functionality.**

Should be tracked and fixed when convenient.

Examples:
- Inconsistent capitalisation in headings
- Missing alt text on decorative images
- Slight misalignment or spacing inconsistency
- Link opens in same tab when it should open in new tab (or vice versa)
- Console warnings (not errors)
- Missing favicon or Open Graph image
- Heading hierarchy skip (h1 -> h3)
- Touch target slightly undersized on mobile
- LCP 2.5-4s (needs improvement, not poor)

### Note
**An observation worth recording but not necessarily a bug.**

For context, documentation, or future improvement.

Examples:
- Design pattern that differs from other pages (intentional?)
- Feature that works but has an unusual interaction pattern
- Content that may be outdated but isn't technically wrong
- Accessibility enhancement opportunity beyond WCAG AA
- Performance optimisation opportunity (not a regression)
- External link to a third-party site that may change
- Analytics or tracking scripts present (note, not judge)
