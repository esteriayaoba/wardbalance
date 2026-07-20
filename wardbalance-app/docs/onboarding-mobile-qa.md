# Onboarding Mobile QA Checklist

Run on real devices before production deployment.

## Devices

| Device | Viewport | OS | Browser |
|--------|----------|-----|---------|
| iPhone SE | 375×667 | iOS 17+ | Safari |
| iPhone 14 | 390×844 | iOS 17+ | Safari |
| Samsung A-series (e.g. A14) | 360×800 | Android 13+ | Chrome |
| Samsung Galaxy S23 | 390×844 | Android 14+ | Chrome |
| iPad Mini | 768×1024 | iPadOS 17+ | Safari |
| Desktop | 1280×720 | Windows 11 | Chrome |
| Desktop (design base) | 1440×900 | macOS | Chrome/Safari |

## Critical Paths

### Signup Flow
- [ ] Form fields render without horizontal scroll at 360px
- [ ] Password requirements panel is readable at 360px
- [ ] School type dropdown is fully tappable
- [ ] Step 4 dashboard preview cards don't overlap at 390px
- [ ] "Start Fresh" / "Import Students" / "Explore Demo" buttons are stacked vertically at 360px

### Setup Wizard
- [ ] Phase bar stacks vertically at 360px (single column, full width)
- [ ] Phase progress bars are visible at 360px
- [ ] Step rows show CTA button below description at 360px (`flex-col` layout)
- [ ] Status badges ("Done", "Needs Attention", "Locked") don't overflow
- [ ] Overall progress ring + text don't wrap awkwardly

### Celebration Overlay
- [ ] Dialog fits within viewport at 360px (no clipping on top/bottom)
- [ ] Confetti animation doesn't cause layout shift
- [ ] Continue / Back to Dashboard buttons are fully tappable (≥44px)

### Common Failures at 360px
- Grid with more than 2 columns
- Horizontal scroll on any page
- Text truncation without ellipsis on status badges
- Touch targets smaller than 44×44px
- Modals that extend beyond viewport edges
