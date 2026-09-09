# Diagnostics and Reporting

Read this reference when a workflow fails, multiple backends are involved, or the result needs a durable engineering handoff.

## Classify Before Correcting

Use the earliest supported failure layer:

1. **Tool availability** — expected tools are not exposed to this task.
2. **MCP/IDE connection** — bridge exists but cannot reach a ready Xcode project.
3. **Host environment** — Xcode selection, SDK/runtime, CoreSimulator, permissions, disk, or process state.
4. **Project discovery** — wrong workspace/project, missing/shared scheme, or invalid destination.
5. **Dependency/build system** — package resolution, generated files, target membership, or build database.
6. **Compile/link/sign** — source diagnostic, linker error, signing, entitlements, or provisioning.
7. **Test infrastructure** — runner or test host did not start.
8. **Product test failure** — assertion, crash, timeout, or incorrect behavior.
9. **Install/launch** — artifact, bundle identifier, install service, or launch service.
10. **Runtime/UI automation** — app state, accessibility tree, gesture targeting, logs, or rendering.

State whether the evidence proves a product defect, an environment failure, or only an unresolved correlation.

## Controlled Retry Policy

- Never issue an identical retry merely because a command failed.
- Form a hypothesis from the first actionable diagnostic.
- Change one relevant input, backend, destination, or environment condition.
- Record why the retry is expected to be informative.
- If the same layer fails again, gather a stronger diagnostic instead of cycling.
- Stop when further progress requires permission, credentials, installation, destructive reset, external coordination, or a user choice that materially changes the result.

Safe alternatives often include a new task-specific DerivedData directory, a read-only tool inventory, a destination re-check, a narrower test, or raw log/result-bundle inspection. Do not use cache deletion or Simulator erasure as routine troubleshooting.

A product test failure does not automatically forbid independent launch or UI evidence when the app artifact is usable and the user requested the broader workflow. Continue only when doing so is safe and informative, keep the failing test prominent, and never let later runtime evidence turn the overall test result into a pass.

## Backend-Specific Diagnosis

When official Xcode MCP fails, distinguish unavailable tools, unopened project, disabled Xcode permission, bridge registration, client session loading, and an operation-specific Xcode error.

When XcodeBuildMCP fails, distinguish server absence, disabled workflow, invalid session defaults, daemon/stateful-session problems, and the underlying Xcode operation. Use its diagnostic or doctor capability when exposed, and consult the live tools reference rather than assuming a remembered tool name.

When direct tools fail, retain the full exit status and the first actionable diagnostic. Filter large logs for readability only after preserving enough context to avoid misclassification.

## Evidence Matrix

| Claim | Minimum useful evidence |
| --- | --- |
| Source change is clean | focused diff plus relevant static checks |
| Target builds | successful tool or terminal result for the stated scheme/configuration/destination |
| Tests pass | executed test scope, counts/status, and result bundle when available |
| App is installed | confirmed bundle on the selected destination |
| App launches | launch result/process plus readiness observation |
| Behavior works | reproduced interaction and observed postcondition |
| UI matches | current screenshot under recorded visual conditions |
| Runtime is healthy | scoped logs across the reproduction window; no relevant crash/assertion |

Evidence is cumulative only when all steps used the same intended product and compatible execution context.

## Final Handoff Template

Use only sections that add value:

```markdown
Outcome: concise verified result.

Context: backend; project/workspace; scheme; configuration; destination.

Validation:
- Build: result.
- Tests: executed scope and result.
- Runtime/UI: install, launch, interaction, and visual result.

Artifacts:
- Absolute paths to screenshot, logs, or result bundle.

Remaining risk:
- Explicitly untested behavior, warnings, or environment blockers.
```

Do not report “passed” for skipped checks. If an environment failure prevented runtime validation, say that the build or test evidence remains valid at its own level while runtime/UI status is unverified.
