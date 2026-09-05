# Apple App Icon Guidelines

Use this reference when generating, reviewing, or exporting iOS app icons. Re-check the linked Apple pages before final App Store submission because exact platform requirements can change.

## Official Sources

- Apple Human Interface Guidelines: App icons
  https://developer.apple.com/design/human-interface-guidelines/app-icons
- Apple Human Interface Guidelines: Icons
  https://developer.apple.com/design/human-interface-guidelines/icons
- App Store Connect Help
  https://developer.apple.com/help/app-store-connect/
- Xcode asset catalog documentation
  https://developer.apple.com/documentation/xcode

## Design Checklist

- Make the icon unique, memorable, and tied to the app's real purpose and personality.
- Optimize for recognition at a glance, not for explaining every feature.
- Use one dominant metaphor or symbol; do not combine a pile of unrelated feature symbols.
- Keep the silhouette readable at small sizes.
- Avoid text unless the app's established brand mark depends on a very short, legible letterform.
- Avoid screenshots, full UI mockups, charts with tiny labels, or photographic detail that disappears at icon sizes.
- Use an opaque square master image for iOS/App Store artwork unless current Apple docs for the target platform say otherwise.
- Do not bake iOS rounded corners into the source artwork; let the system apply the platform mask.
- Leave comfortable visual breathing room near the edges so the mask does not cut off key content.
- Avoid unlicensed trademarks, Apple logos, Apple hardware silhouettes, and designs that could be confused with Apple system apps or competitor icons.

## Project-Derived Brief Checklist

- App name and display name
- Platform target and app category
- Primary user and main job-to-be-done
- Three to five product-specific keywords
- Existing brand colors or visual assets
- Existing icon or asset catalog state
- Any legal, trademark, medical, finance, or safety constraints

## Technical Defaults

- Generate a 1024 x 1024 square master PNG for the primary concept.
- Keep the background fully opaque for App Store-oriented iOS icons.
- Export additional sizes only after inspecting the existing Xcode asset catalog or the user's requested target.
- Validate the result at common small icon sizes before integration.

## Review Questions

- Could a user identify the app's category from the icon alone?
- Is the icon visually distinct from nearby apps in the same category?
- Does the small-size version still read as the same symbol?
- Does the design avoid text, clutter, transparent corners, UI screenshots, and unauthorized marks?
- Does the icon reflect what the codebase actually does rather than a generic app stereotype?
