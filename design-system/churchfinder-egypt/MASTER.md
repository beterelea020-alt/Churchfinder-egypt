# ChurchFinder Egypt — Design System (MASTER)

Source: ui-ux-pro-max-skill searches, reviewed against the project's own rules
(keep the existing identity: navy / gold / cream, Cairo, RTL, /design-preview).

## Decisions
- Kept brand palette. The skill's generated palette (green #059669 + orange #EA580C)
  and its "Funnel landing page" pattern were rejected: they don't fit a trust-first
  faith directory and conflict with "do not redesign".
- Kept Cairo (Arabic-first, already loaded). Alternative if ever needed: Noto Sans Arabic.
- Style direction: Minimalism / Swiss — calm, spacious, high contrast, functional.

## Tokens
| Role | Value |
|---|---|
| Primary / ink | #142f55 (navy) |
| Accent | #c99f5c (gold) — decoration only, never small text |
| Gold text | #7a5a1e (6.0:1 on cream) |
| Background / card | #faf8f3 / #fffefa |
| Secondary text | #4f5b6b (6.5:1) |
| Tertiary text | #5b6675 (5.5:1) — lightest allowed text colour |
| Success text | #1f7a5f (4.9:1) |
| Focus ring | #1d4f91, 3px, offset 2px |

## Rules
- Text floor 12px (meta), 13-14px supporting, 14px+ card titles. Never below 12px.
- Interactive targets >= 44px (dense toggles >= 36px), 8px gap between targets.
- Status is never colour-only: icon/dot + text ("مفتوحة" / "مغلقة" / "غير معروفة").
- Unknown stays "غير معروفة" — never guessed.
- Icons are SVG (lucide / inline), never emoji or text glyphs.
- Every list/search has loading, empty (with a next action) and error states.
- Respect prefers-reduced-motion; motion <= 250ms.
- Verify at 375 / 768 / 1024 / 1440 px.
