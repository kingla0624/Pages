---
name: xcode-project-workflow
description: Develop, build, test, run, debug, and visually verify Xcode projects, especially iOS apps on Simulator. Use when a task involves an Xcode project or workspace, Swift or SwiftUI changes requiring Xcode validation, XCTest, app installation or launch, runtime logs, UI interaction, or screenshots. Prefer Apple's official Xcode MCP and use XcodeBuildMCP as a complement or fallback.
metadata:
  short-description: Xcode build, test, Simulator, and UI workflow
---

# Xcode Project Workflow

Use the best Xcode-aware tooling actually available in the current task, preserve the user's project state, and make each completion claim match observable evidence.

## Respect Scope and Authority

- Read the applicable repository instructions before acting. They override this skill.
- Inspect the project and relevant call sites before editing. Preserve unrelated working-tree changes.
- Treat code edits, dependency changes, signing changes, tool installation, MCP registration, permission changes, destructive cleanup, and external publication as separate actions requiring whatever authorization the current environment specifies.
- Do not widen a build, test, or inspection request into a refactor. Diagnose without implementing when the user asks only for diagnosis or review.

## Select the Tool Backend

1. Inspect the tools exposed to the current task. Do not infer availability from a previous task or from configuration alone, and do not invent tool names.
2. Prefer Apple's official Xcode MCP for every requested Xcode-specific operation it can currently perform.
3. Use XcodeBuildMCP as a complement or fallback when the official MCP lacks the required build, test, Simulator, device, logging, debugging, UI-automation, screenshot, or artifact capability.
4. Use direct `xcodebuild`, `xcrun`, or `simctl` only when neither MCP can perform the operation reliably, or when the user specifically requests a command-line workflow.
5. Use one backend for one atomic operation. Do not concurrently mutate the same project, build directory, app installation, debugger session, or Simulator through multiple backends.

If the user explicitly requires official Xcode MCP, do not silently substitute another backend. Report the capability or availability gap and stop before the requested operation unless the user separately authorizes relaxing that constraint.

If official Xcode MCP tools are absent, report the most specific state supported by read-only evidence: for example, tools are not exposed to this task, registration exists, and bridge/Xcode readiness remains unverified. Do not claim that the MCP is uninstalled or misconfigured until that has been established. Briefly provide the relevant setup or restart reminder. When the request is not official-only, continue with an authorized fallback that can produce the same result. Use the checklist in [tool-routing-and-setup.md](references/tool-routing-and-setup.md).

## Establish Execution Context

Before the first build or runtime action, resolve and retain:

- repository root and applicable instructions;
- `.xcworkspace`, `.xcodeproj`, or `Package.swift` entry point;
- scheme and build configuration;
- requested platform and destination;
- Simulator or device identifier when execution is required;
- app bundle identifier before install, launch, or log filtering;
- launch arguments, environment variables, test filters, and expected app state.

Prefer an explicit identifier over a display name when names are ambiguous. When switching backends, re-check this context rather than assuming both tools chose the same defaults.

For project and destination discovery details, read [project-discovery.md](references/project-discovery.md).

## Choose the Required Evidence Level

Match validation to the user's requested outcome:

1. **Source validation** — diff inspection and focused static checks.
2. **Build validation** — the intended target compiles and links.
3. **Test validation** — the relevant test selection executes with reported results.
4. **Installation validation** — the expected app bundle is installed on the selected destination.
5. **Runtime validation** — the expected process launches and remains alive long enough to inspect.
6. **Behavior validation** — the requested interaction produces the expected state.
7. **Visual validation** — a current screenshot or equivalent rendering shows the intended UI.

Do not substitute a lower level for a higher-level claim. In particular, build success is not proof of launch, behavior, or visual correctness.

## Execute in Short Feedback Loops

1. Capture a read-only baseline: project context, Git state, current diagnostics, and relevant tests.
2. If implementation is authorized, make the smallest coherent change and remove only artifacts made obsolete by that change.
3. Run the narrowest meaningful validation immediately; expand only when risk or the user's request warrants it.
4. On failure, classify the layer before changing anything: source, dependency, compile, link, test, signing, install, launch, runtime, UI, tool, or host environment.
5. Change one relevant variable per retry. Do not repeat an identical failing operation without new evidence.
6. Finish by reviewing the diff and reporting both verified outcomes and remaining uncertainty.

For builds and tests, read [build-and-test.md](references/build-and-test.md). For app launch, interaction, logs, and screenshots, read [simulator-runtime-and-ui.md](references/simulator-runtime-and-ui.md). When a workflow fails or requires a formal handoff, read [diagnostics-and-reporting.md](references/diagnostics-and-reporting.md).

## Non-Negotiable Invariants

- Never silently change the project/workspace, scheme, configuration, SDK, destination, Simulator, device, bundle identifier, or test filter.
- Never erase a Simulator, delete DerivedData, reset package caches, modify signing, or install tooling merely to make a command pass without the required authorization.
- Prefer a fresh task-specific DerivedData path over destructive cleanup when stale build state is suspected and an override is appropriate.
- Separate product defects from environment or tooling failures; provide the evidence for that classification.
- After every navigation or layout-changing UI action, refresh the UI hierarchy or screenshot before the next coordinate-dependent action.
- Keep long-running log, video, debugger, and browser-mirroring sessions scoped to the selected app and destination, and stop them when the task finishes.
- Report which backend produced each material result when more than one backend was used.

## Completion Report

Lead with the outcome, then state:

- backend or backends used;
- project/workspace, scheme, configuration, and destination;
- build and test result;
- installation, launch, behavior, and visual evidence when requested;
- paths to screenshots, result bundles, or logs that the user can inspect;
- warnings, skipped checks, environment failures, and anything still unverified.

Use precise language such as “build succeeded; launch not tested” instead of “everything works.”
