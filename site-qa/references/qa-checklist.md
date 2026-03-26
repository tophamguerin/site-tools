# QA Checklist -- Detailed Reference

Extended detail for each check category. The SKILL.md has the workflow; this has the nuance.

## Links: What to Actually Check

### Internal links
- Navigate to each. Does it load? Does it land on the right page?
- Check for soft 404s: page loads but shows "not found" content
- Check for redirect chains: link goes to A which redirects to B which redirects to C
- Check that back button works after following the link

### Anchor links
- Click the anchor. Does the page scroll to the right section?
- Does the target element exist? (linkCheck script detects missing targets)
- On long pages, is the scroll position correct? (heading not hidden behind sticky header)

### External links
- Don't navigate (outside scope), but note if they're present
- Check `target="_blank"` has `rel="noopener noreferrer"` (security)
- Flag any external links that look like they should be internal (wrong domain)

### Special cases
- Mailto links: hover to verify the email address looks correct
- Tel links: check the number format
- Download links: note that they exist (don't test download)

## Copy: What Human Eyes Catch That Scripts Miss

The text-scan script catches placeholder patterns and encoding issues. You need to catch:

- **Wrong dates or years** -- "Copyright 2024" when it's 2026
- **Inconsistent brand names** -- "TophamGuerin" vs "Topham Guerin" vs "TG"
- **Broken sentences** -- text cut off mid-thought, missing periods
- **Repeated paragraphs** -- same content block appearing twice
- **Wrong language** -- English page with a paragraph in another language
- **Legal/disclaimer text** -- is it present where expected? (footer, forms)
- **Social proof** -- do testimonials/stats look plausible?

## Forms: The Full Testing Protocol

### Step 1: Discover
Run form-tester.js to get the form inventory.

### Step 2: Empty submit test
For each form with a submit button:
1. Don't fill in anything
2. Click submit
3. Does validation fire?
4. Are all required fields highlighted?
5. Are error messages specific ("Email is required") not generic ("Please fill in all fields")?
6. Screenshot the error state

### Step 3: Invalid data test
For email fields: type "not-an-email"
For phone fields: type "abc"
For number fields: type "abc"
For URL fields: type "not-a-url"
Submit and check validation.

### Step 4: Keyboard navigation
Tab through all fields. Is the order logical (top-to-bottom, left-to-right)?
Can you reach the submit button via Tab?
Does Enter submit the form from the last field?

### Step 5: Cancel/close
Close the form without submitting. Is there a cancel button or X?
Does the form state reset if you reopen it?

**Remember: NEVER submit with valid-looking data. You don't know where it goes.**

## Responsive: What Breaks at Each Viewport

### Desktop (1440px) -- baseline
- Everything should look good. This is the "designed-for" width.

### Tablet (768px)
Common breakages:
- Sidebar doesn't collapse or overlaps content
- Table columns get crushed or overflow
- Fixed-width elements overflow their containers
- Font sizes not adjusted (too large or too small)
- Images not scaling (overflowing or pixelated)

### Mobile (375px)
Common breakages:
- Horizontal scroll (most common and most critical)
- Navigation unreachable (no hamburger menu, or hamburger doesn't work)
- Touch targets too small (buttons/links < 44px)
- Text input fields wider than screen
- Modal/popup wider than viewport
- Fixed position elements covering content
- Footer links unreachable

## Interactive Elements: Edge Cases

### Tabs
- Click the already-active tab. Does anything break?
- Are tab contents accessible via keyboard (arrow keys)?
- Do tabs have proper ARIA roles?

### Accordions
- Can multiple sections be open at once, or does opening one close others?
- Is the expanded/collapsed state visually clear?
- Does the accordion animate, or is the transition jarring?

### Modals
- Does clicking outside close the modal? (Expected behavior)
- Does pressing Escape close the modal? (a11y requirement)
- Is focus trapped inside the modal? (a11y requirement)
- Can you scroll the page behind the modal? (Should not be possible)

### Dropdowns
- Does clicking outside close the dropdown?
- Can you search/filter options? (For long lists)
- Does the dropdown overflow the viewport? (Especially near bottom of page)
