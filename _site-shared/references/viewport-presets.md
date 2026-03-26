# Viewport Presets

## Standard Presets

| Name | Width | Height | DPR | Flags | Use Case |
|------|-------|--------|-----|-------|----------|
| Desktop HD | 1920 | 1080 | 1 | — | Large monitors |
| Desktop | 1440 | 900 | 1 | — | **Default primary capture** |
| Laptop | 1280 | 800 | 1 | — | Small laptops |
| Tablet Landscape | 1024 | 768 | 2 | mobile,touch | iPad landscape |
| Tablet Portrait | 768 | 1024 | 2 | mobile,touch | **Default tablet capture** |
| Mobile Large | 428 | 926 | 3 | mobile,touch | iPhone 14 Pro Max |
| Mobile | 375 | 812 | 3 | mobile,touch | **Default mobile capture** |
| Mobile Small | 320 | 568 | 2 | mobile,touch | iPhone SE |

## Chrome MCP Commands

### Resize only (no device emulation)
```
resize_page: { width: 1440, height: 900 }
resize_page: { width: 768, height: 1024 }
resize_page: { width: 375, height: 812 }
```

### Full device emulation (includes touch, user agent)
```
emulate: { viewport: "768x1024x2,mobile,touch" }      # Tablet
emulate: { viewport: "375x812x3,mobile,touch" }        # Mobile
emulate: { viewport: "1440x900x1" }                    # Reset to desktop
```

## When to Use Full Emulation vs Resize

- **Resize only** (default): Good enough for most responsive captures. Shows layout reflow.
- **Full emulation**: Use when the site serves different content based on user agent (e.g., mobile-specific pages, app download banners, touch-specific UI).

## Common Breakpoints by Framework

| Framework | Breakpoints |
|-----------|-------------|
| Tailwind CSS | 640, 768, 1024, 1280, 1536 |
| Bootstrap | 576, 768, 992, 1200, 1400 |
| Material UI | 600, 900, 1200, 1536 |

Capture at the framework's breakpoints if the site uses a known framework.
The standard 3-viewport capture (1440, 768, 375) covers the most important transitions.
