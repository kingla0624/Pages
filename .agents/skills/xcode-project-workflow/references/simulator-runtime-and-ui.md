# Simulator, Runtime, and UI Workflow

Read this reference when installing or launching an app, reproducing behavior, interacting with UI, capturing logs, or taking screenshots.

## Select and Stabilize the Destination

1. List actual available Simulators and their runtimes.
2. Use an explicitly requested compatible Simulator when provided.
3. Otherwise reuse the compatible Xcode-selected run destination when it is known.
4. If there is no suitable Xcode-selected destination, reuse an already booted compatible Simulator when possible.
5. Otherwise select an installed compatible Simulator from actual availability.
6. Record the Simulator name, runtime, and identifier.
7. Boot only when runtime work is in scope; wait for readiness before install or launch.
8. Do not create, erase, or replace a Simulator, or download a runtime, without explicit authorization.

Do not target “latest” by assumption when the task names an OS version or compatibility matters.

## Build, Install, and Launch Are Separate Claims

A combined operation may perform all three, but verify the result at each required level:

- **Built:** expected product compiled and linked.
- **Installed:** expected bundle identifier exists on the chosen Simulator.
- **Launched:** expected process started on that Simulator.
- **Ready:** the app reached an inspectable state rather than only spawning a process.

After launch, obtain a current semantic UI description when interaction requires it. Capture a current screenshot for every visual claim; a process identifier or accessibility hierarchy alone is not visual proof.

Keep build-system arguments separate from application launch arguments and environment variables. Confirm the launched process received the intended runtime inputs when they affect the result.

## UI Interaction Discipline

- Capture the initial UI hierarchy and/or screenshot before interaction.
- Prefer semantic identifiers or accessibility labels. Use coordinates only when no stable semantic target exists.
- Resolve coordinates from the current frame, not from an older screenshot or another device size.
- Perform one meaningful interaction at a time, then refresh the hierarchy or screenshot after navigation, rotation, keyboard appearance, sheet presentation, or layout change.
- Verify the resulting state; a successful tap command is not proof that the intended control responded.
- Preserve user data and avoid dismissing privacy, purchase, authentication, or destructive confirmation dialogs without clear authority.

For a visual comparison, keep device, runtime, appearance, orientation, locale, Dynamic Type, reduce-motion setting, and app data state consistent. Record any factor that could not be controlled.

Derive the expected screen from the user's acceptance criteria, product specification, source, snapshot, or other stated baseline. Without one, report what rendered rather than claiming it is the correct first screen. Existing app data may lead to onboarding, authentication, restored navigation, or a permission prompt; do not reset that state silently.

When “home screen” could mean either the app's landing screen or Simulator SpringBoard, use surrounding context to state the likely interpretation and ask only if the distinction would change the requested artifact.

Before installing over an existing app, identify whether persisted state matters to the requested result. Installation is normally part of an authorized run request, but it may trigger migration or alter state; record that limitation and ask before resetting or replacing data.

## Logs and Runtime Diagnosis

Start log capture before reproducing the behavior when supported. Scope it to the confirmed bundle identifier or process and stop the capture when finished.

Prioritize:

- crashes, uncaught exceptions, assertions, and watchdog termination;
- Swift concurrency and main-thread violations;
- relevant subsystem/category messages;
- app-originated errors near the reproduction window;
- install or launch-service failures.

Treat common Simulator, WebKit, metadata-extraction, accessibility, and system-service messages as noise only after confirming they are unrelated. Do not hide warnings merely because the app remains visible.

## Screenshots and Other Artifacts

- Capture the state the user requested, not merely the first launched frame.
- Wait for intentional loading or animation when necessary, but avoid arbitrary long sleeps; prefer readiness signals and bounded polling.
- If readiness remains unresolved after bounded polling and two unchanged observations, capture the state and diagnose it rather than waiting indefinitely.
- Use lossless output when pixel inspection matters.
- Store files in the user-requested location or a task-scoped artifact/temp directory with a collision-resistant name. Preserve the original and provide its absolute path. If the tool returns only an inline image, surface it directly and do not invent a path.
- State device/runtime, orientation, appearance, and interaction state alongside the screenshot.
- Check the visible frame for credentials, personal data, notifications, or other sensitive content before sharing or retaining it. If sensitive content is not necessary to the task, stop and request a safe test state rather than exposing it.
- If browser mirroring is used, verify that a real Simulator frame is updating; a loaded browser page alone is insufficient.
- Stop stateful video, log, debugger, or mirror sessions when the task is complete.

## Runtime Failure Boundaries

Distinguish:

- build product missing or from the wrong configuration;
- bundle identifier mismatch;
- incompatible runtime or deployment target;
- install-service failure;
- launch-service failure;
- immediate app crash;
- app running but blocked by a system prompt or missing data;
- UI automation unable to address an otherwise healthy UI;
- Simulator or CoreSimulator service failure.

Do not erase the device as a first response. Prefer re-checking the selected destination, app artifact, bundle identifier, process, and service diagnostics.

## Runtime/UI Evidence

Report the execution context and a compact sequence:

```text
build: succeeded
install: confirmed for com.example.app
launch: confirmed on named runtime / UDID
interaction: action and observed result
logs: no relevant crash/assertion, or summarized finding
visual proof: /absolute/path/screenshot.png
```

Omit unperformed lines rather than implying they succeeded.
