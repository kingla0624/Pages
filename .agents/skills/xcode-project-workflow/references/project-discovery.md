# Project and Destination Discovery

Read this reference before the first build, test, install, or launch when the execution context is not already explicit and verified.

## Read-Only Baseline

Capture only what the task needs:

1. Repository root and applicable instruction files.
2. Git branch and working-tree state, including user-owned uncommitted changes.
3. Candidate `.xcworkspace`, `.xcodeproj`, and `Package.swift` entry points.
4. Shared schemes, configurations, targets, and test plans.
5. Project deployment targets and locally available SDKs/runtimes.
6. Booted and available destinations.
7. Dependency managers, unresolved packages, and any network or cache write that the first build may trigger.
8. Signing, entitlements, extensions, and host-app relationships when the selected destination requires them.

Do not modify project metadata merely to make discovery easier. If a scheme is not shared or a workspace cannot be resolved, diagnose that fact before proposing a project-file change.

## Select the Entry Point

- Use the workspace when it is the project's intended integration entry point, including when dependencies or multiple projects are coordinated through it.
- Use the project when it is the canonical entry point and no required workspace owns the scheme.
- Use Swift Package workflows for a package-only task unless an application host is required by the requested validation.
- When multiple candidates remain plausible, inspect repository documentation, CI configuration, existing session defaults, and scheme listings. Ask the user only if the choice would materially change the result.

Never pass both project and workspace arguments to a tool that treats them as mutually exclusive.

## Resolve the Scheme and Configuration

- Prefer the scheme named by the user or repository instructions.
- Otherwise choose the shared scheme that owns the requested app or tests; do not infer solely from the repository folder name.
- Use the requested configuration. If none is specified, use the project's normal development configuration for local validation and report it.
- Confirm any test plan or `only-testing`/`skip-testing` filters before treating results as comprehensive.

## Resolve the Destination

For compile-only validation, a generic platform destination can avoid binding the build to one device when supported. Runtime, UI, screenshot, and device-specific tests require a concrete compatible destination.

Choose destinations in this order:

1. explicit user-provided device or Simulator identifier;
2. already selected compatible Xcode run destination;
3. an already booted compatible Simulator;
4. another installed compatible destination chosen from actual availability.

If runtime work is in scope and no Simulator is booted, booting a compatible available Simulator is reasonable only when simulator control is authorized by the request and current environment. Do not download a runtime or create/erase devices implicitly.

Prefer an explicit device identifier over a name when duplicate names or runtimes exist. Record the OS/runtime with the identifier.

Preserve the pre-task boot state unless the user's requested outcome implies otherwise. If the user asked to launch the app, normally leave that app and Simulator running after verification; do not silently shut them down or restore an earlier process state.

## Dependency and Signing Boundaries

A first build may resolve packages, access the network, populate caches, or propose a `Package.resolved` update. Check repository policy before triggering those side effects. When they are not already authorized by the request and local instructions, ask before proceeding; never accept an unintended lockfile change silently.

Inspect signing only to the depth required by the destination. Do not rewrite the team, bundle identifier, entitlements, capabilities, provisioning profile, or signing style to bypass a build or install failure without explicit implementation authority.

## Bundle Identifier and App Artifact

Do not guess the bundle identifier from the scheme or product name. Resolve it from build settings or the built app. Before install, launch, terminate, container inspection, or log filtering, confirm that the bundle identifier and app path belong to the selected configuration and destination.

## Preserve Cross-Tool Consistency

When a second backend is necessary, compare its inferred defaults to the established context. Re-state changed values in the call rather than accepting a different implicit destination. A successful operation against the wrong scheme or Simulator is not valid evidence.

## Discovery Output

Retain a compact execution record:

```text
entry point: /absolute/path/App.xcworkspace
scheme: App
configuration: Debug
platform: iOS Simulator
destination: iPhone model / runtime / UDID
bundle id: com.example.app
test filter: AppTests or none
```

Populate only verified values; mark unresolved fields as unresolved.
