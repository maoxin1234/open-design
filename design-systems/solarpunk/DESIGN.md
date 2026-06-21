# Solarpunk

> Category: Themed & Unique
> Optimistic eco-futurist design system where technology, community, and living systems coexist in warm sunlight and breathable space.

## 1. Visual Theme & Atmosphere

Solarpunk is a hopeful vision of the future: human-scale technology embedded in abundant nature, clean energy, shared spaces, and craft-quality materials. The interface should feel like a sunlit greenhouse, a community garden notice board, or a solar-powered workshop dashboard.

- **Visual style:** organic, optimistic, warm, crafted
- **Color stance:** sun-warmed greens and golds on cream and parchment surfaces
- **Design intent:** Every artifact should feel breathable, living, and quietly optimistic. Preserve readability and accessibility while evoking nature, renewal, and collective care.

## 2. Color

- **Primary:** `#4D7C4B` — Sunlit fern green. Use for primary actions, key links, and the main focal accent.
- **Secondary:** `#D4A03C` — Warm solar gold. Use for highlights, badges, energy metaphors, and secondary emphasis.
- **Tertiary:** `#6397A6` — Clear-sky teal. Use for water, air, data visualization, calm informational moments, and info badge fills.
- **Success:** `#65A30D` — Fresh leaf green.
- **Warning:** `#D97706` — Sunflower amber.
- **Danger:** `#DC2626` — Terracotta red, used sparingly.
- **Surface:** `#FDFCF7` — Warm off-white, like sun-bleached paper.
- **Surface-2:** `#F5F1E8` — Parchment, for cards and sections.
- **Surface-3:** `#E8E4D9` — Light hemp, for borders and subtle separation.
- **Text:** `#1F291D` — Deep forest, near-black for body copy.
- **Text-muted:** `#5C6B56` — Sage gray for secondary text.
- **Neutral:** `#FDFCF7` — Derived from surface token.

Color usage rules:
- Favor Primary (#4D7C4B) for CTAs and the most important action on the page.
- Use Surface (#FDFCF7) for large backgrounds; Surface-2 (#F5F1E8) for cards.
- Keep body copy on Text (#1F291D) for legibility.
- Reserve Secondary (#D4A03C) for highlights, solar/energy metaphors, and key data points.
- On the default light surfaces, treat Secondary (#D4A03C), Success (#65A30D), and Tertiary (#6397A6) as background/fill accents paired with Text (#1F291D). Do not use these hues as standalone foreground text on Surface or Surface-2.
- Avoid cold blues, neon purples, or dark cyberpunk palettes.

## 3. Typography

- **Scale:** 13/15/17/21/28/38/52
- **Families:** primary="Fraunces", display="Fraunces", body="Inter", mono="JetBrains Mono"
- **Weights:** 400 (regular), 500 (medium), 600 (semibold)
- Use Fraunces for display headings and editorial moments; Inter for UI text and body.
- Headings should feel editorial and warm; body text should optimize scanability and contrast.
- Keep line-height generous (1.55–1.7) to reinforce the breathable, open feeling.

## 4. Spacing & Grid

- **Spacing scale:** 4/8/12/16/24/32/48/64/96
- Use an 8px baseline grid.
- Keep vertical rhythm consistent; generous whitespace between sections.
- Prefer organic, asymmetric layouts over rigid corporate grids where appropriate.
- Align columns and modules to a predictable underlying grid; avoid ad-hoc offsets.

## 5. Layout & Composition

- Prefer clear content blocks with consistent internal padding and soft, rounded corners.
- Keep hierarchy obvious: headline → support text → primary action.
- Use whitespace to separate concerns before adding borders or shadows.
- Incorporate subtle organic shapes: soft radii, arch-like forms, leaf motifs, and sun-ray accents.
- Allow content to "breathe" — avoid dense, cramped layouts.

## 6. Components

- **Buttons:** Primary action uses `#4D7C4B` with cream text; secondary actions use `#F5F1E8` with forest text. Use pill or large-radius shapes. Add subtle hover transitions.
- **Inputs:** soft focus-visible states with a gold or green ring, clear labels, and parchment backgrounds.
- **Cards/sections:** use Surface-2 (`#F5F1E8`) backgrounds, large radii (16–24px), and minimal shadows. Prefer 1px border in Surface-3 over heavy shadows.
- **Badges:** use solar gold (`#D4A03C`) for energy/status fills, leaf green (`#65A30D`) for success fills, and sky teal (`#6397A6`) for info fills. Keep badge text in deep forest (`#1F291D`) so status labels stay accessible on the default parchment surfaces. Do not use the accent colors as badge text directly on light surfaces.
- **Icons:** line-style, rounded stroke, botanical or solar motifs when relevant. Avoid sharp, angular, or industrial icons.

## 7. Motion & Interaction

- Use subtle transitions that emphasize Primary (#4D7C4B) or Secondary (#D4A03C) as the interaction signal.
- Default to short, purposeful transitions (150–250ms) with stable easing (`cubic-bezier(0.2, 0, 0, 1)`).
- Prefer growth-like motion: gentle scale-up, fade-in, or slide-from-bottom rather than jarring snaps.
- Ensure hover, focus-visible, active, disabled, and loading states are explicit.

## 8. Voice & Brand

- Tone: hopeful, collaborative, grounded, and warm.
- Write like a community notice, a garden journal, or a solar-cooperative update — not a corporate dashboard.
- Keep microcopy action-oriented and human: "Start together", "Grow this idea", "Powered by today's sun".
- Avoid fear-based, urgency-driven, or extractive language.

## 9. Anti-patterns

- Do not introduce off-palette colors when an existing token can solve the problem.
- Do not flatten hierarchy by using the same type size/weight for all text.
- Do not use dark mode as the default; Solarpunk lives in daylight.
- Do not add decorative effects that reduce readability or accessibility.
- Do not mix unrelated visual metaphors (cyberpunk, brutalism, corporate SaaS) in the same interface.
