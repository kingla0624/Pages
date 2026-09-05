---
name: generate-ios-app-icon
description: Generate Apple-platform app icon concepts, image prompts, and raster app icon artwork from an iOS or iPadOS app codebase. Use when Codex is asked to create, redesign, critique, or export an app icon, App Store icon, Assets.xcassets AppIcon, or image-generation prompt based on Swift, SwiftUI, UIKit, Info.plist, README, screenshots, existing assets, or product requirements while following Apple HIG and App Store icon constraints.
---

# Generate iOS App Icon

## Overview

Create app icon artwork by first understanding the iOS app as a product, then producing a concise design brief, image-generation prompt, and validation checklist. Use available image-generation tooling when the user asks for an actual bitmap image; otherwise provide the brief and prompt.

## Workflow

1. Inspect the project before designing.
   - Start with `rg --files`.
   - Prioritize `*.xcodeproj/project.pbxproj`, `Package.swift`, `Info.plist`, `*.xcassets`, `*.swift`, `*.storyboard`, `*.xcstrings`, localization files, README files, screenshots, widgets, intents, and app extension targets.
   - Identify app name, target platform, category, audience, core user jobs, distinctive objects, tone, existing brand colors, and current app icon assets.

2. Build an icon brief.
   - Summarize the app purpose in one sentence.
   - Extract 3-5 visual keywords and 2-4 plausible metaphors from the product, not from generic category tropes.
   - Choose one primary symbol, a simple background system, a limited color palette, and a style direction.
   - State negative constraints: avoid text, UI screenshots, tiny details, unlicensed trademarks, Apple product silhouettes, and anything too close to existing platform or competitor icons.

3. Check Apple constraints.
   - Read `references/apple-app-icon-guidelines.md` when exact platform, App Store, or asset-catalog compliance matters.
   - Treat the reference as a checklist, not a substitute for current Apple docs. Re-check the linked Apple pages before final submission or when the user asks for exact export specs.

4. Generate or prepare the artwork.
   - Use the image-generation tool for bitmap output when the user asks to generate the icon image.
   - Prompt for a square, opaque, 1024 x 1024 master image suitable for an iOS app icon.
   - Do not ask the image model to render rounded corners; iOS applies the icon mask.
   - Keep the main silhouette centered and legible at small sizes.
   - Prefer a small set of visually distinct alternatives when the user has not already chosen a direction.

5. Validate the result.
   - Inspect the generated icon at large size and thumbnail sizes.
   - Verify it remains recognizable around 180 x 180, 60 x 60, 40 x 40, and 29 x 29.
   - Check for transparency, accidental text, malformed shapes, clutter, brand/IP problems, and mismatch with the app's real purpose.
   - Do not overwrite an existing `AppIcon.appiconset` or project file unless the user explicitly asks for integration.

## Output Shape

For concept-only requests, return:

- app understanding
- icon strategy
- 2-4 concept directions
- final image prompt
- Apple compliance notes

For image-generation requests, also generate the bitmap and return:

- the chosen concept
- the generated image path or rendered image
- validation notes
- any remaining export/integration steps

## Image Prompt Template

Use this shape and fill it with project-specific details:

```text
Create a square 1024 x 1024 iOS app icon for [APP NAME], an app that [PURPOSE].
Visual concept: [ONE CLEAR METAPHOR].
Style: polished Apple-platform app icon, simple centered symbol, strong silhouette,
opaque background, high contrast, legible at small sizes, no text, no screenshots,
no device frame, no rounded-corner mask baked into the art.
Palette: [COLORS].
Mood: [TONE].
Avoid: [PROJECT-SPECIFIC NEGATIVES].
```

## Integration Caution

If the user asks to install the icon into an iOS project, inspect the existing `Assets.xcassets` structure first. Preserve existing assets until the user confirms replacement, then generate the required sizes or asset catalog entries based on the project's current Xcode structure and current Apple documentation.
