# Build and Test Workflow

Read this reference when the task requires compilation, tests, result-bundle analysis, or build-failure diagnosis.

## Choose the Smallest Sufficient Action

| User outcome | Minimum action |
| --- | --- |
| Confirm a source change compiles | Build the affected scheme/target for the intended platform |
| Prepare tests without running them | Build for testing |
| Validate logic or regression coverage | Run the relevant unit tests |
| Validate app integration | Run relevant integration/UI tests on a concrete destination |
| Launch and inspect the app | Use a build-and-run operation when available, then verify runtime state |

A preview, syntax check, or standalone `swiftc` invocation is not a substitute for an Xcode project build when macros, generated sources, resources, build settings, or linked frameworks matter.

## Build Procedure

1. Confirm entry point, scheme, configuration, platform, and destination.
2. If code changed, capture existing diagnostics relevant to the changed area.
3. Use the official Xcode MCP if its current build capability satisfies the request.
4. Otherwise use the corresponding XcodeBuildMCP workflow. Reuse valid session defaults; supply missing or conflicting values explicitly.
5. Use direct `xcodebuild` only as the selected fallback, preserving the same execution context.
6. Inspect the terminal status and structured result, not just the final human-readable line.
7. Separate pre-existing warnings from warnings introduced by the task when the baseline permits that comparison.

For Simulator-only compile validation, disabling code signing can be appropriate when no install or launch follows. Do not apply that override to physical-device builds or assume it is compatible with every target.

When stale output is suspected, prefer a new task-specific DerivedData path. Deleting shared DerivedData or package caches is destructive cleanup and requires explicit authorization.

## Test Procedure

- Start with the narrowest test target or test identifier that proves the requested behavior.
- Expand to the enclosing suite or full scheme when regression risk or the user request warrants it.
- If “relevant tests” is requested without a named change or behavior, derive scope from the affected targets, repository test plan, and CI configuration. If those do not establish a defensible scope, ask rather than silently presenting a narrow subset as comprehensive.
- Record test plan, destination, filters, repetitions, retries, and any parallelization settings that affect interpretation.
- Distinguish “tests did not start” from “tests ran and failed.” Tool, destination, signing, and host failures are not product test failures.
- Prefer structured test results or an `.xcresult` bundle when available. Report passed, failed, skipped, expected-failure, and retried tests accurately.
- Do not silently re-run only failures and then present that subset as a full clean suite.
- Tests, especially UI tests, may mutate app data or installation state. Re-confirm the installed artifact and expected state before later visual validation; do not erase data merely to regain a clean screen.

## Direct Command-Line Fallback

Build commands vary by repository. Derive values first; the following shapes are examples, not defaults:

```bash
xcodebuild \
  -workspace /absolute/path/App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination 'platform=iOS Simulator,id=SIMULATOR_UDID' \
  build
```

```bash
xcodebuild \
  -project /absolute/path/App.xcodeproj \
  -scheme App \
  -destination 'platform=iOS Simulator,id=SIMULATOR_UDID' \
  -only-testing:AppTests \
  test
```

Never copy placeholder identifiers into an actual invocation. Do not pass both `-workspace` and `-project`.

## Failure Handling

Classify the first actionable failure rather than reacting to the last line of a large log. Common layers include:

- dependency resolution;
- Swift/Objective-C compile diagnostics;
- generated code or macro expansion;
- linker or resource processing;
- signing and entitlements;
- destination or runtime availability;
- test-host launch;
- test assertion, timeout, or crash;
- MCP transport or Xcode service state.

Apply a targeted correction only when implementation is authorized. After moving types, renaming APIs, or changing target membership, search call sites and compile promptly.

Do not keep retrying an unchanged failure. After one informed retry fails at the same layer, gather a fresh diagnostic and either change the hypothesis or report the blocker.

## Build/Test Evidence

Report:

- backend used;
- exact entry point, scheme, configuration, and destination;
- action performed;
- terminal result;
- relevant diagnostics or test counts;
- `.xcresult`, log, or artifact path when available;
- warnings and skipped coverage;
- what the result does and does not prove.
