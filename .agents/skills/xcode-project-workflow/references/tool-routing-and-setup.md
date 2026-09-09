# Tool Routing and Setup

Read this reference when choosing between Xcode MCP, XcodeBuildMCP, and direct command-line tools, or when the expected MCP is unavailable.

## Capability-First Routing

Tool capabilities evolve independently of this skill. Inspect what the current task exposes and route by capability rather than by remembered server prefixes or tool names.

| Need | Preferred route | Complement or fallback |
| --- | --- | --- |
| Open-Xcode project context, IDE diagnostics, Apple documentation, previews, supported build/test actions | Apple official Xcode MCP | XcodeBuildMCP, then direct tools |
| Deterministic project discovery and structured build/test execution | Apple official Xcode MCP when supported | XcodeBuildMCP |
| Simulator lifecycle, install/launch, semantic UI inspection, gestures, screenshots, video, or scoped logs | Apple official Xcode MCP when its current tools support the exact action | XcodeBuildMCP |
| LLDB, coverage, physical-device, macOS, or Swift Package workflows | Apple official Xcode MCP when supported | XcodeBuildMCP or direct native tools |
| CI, scripting, or a capability absent from both MCP servers | Relevant MCP if it satisfies the task | `xcodebuild`, `xcrun`, or `simctl` |

“Official first” is a preference, not permission to force an unsuitable tool. Use XcodeBuildMCP for a missing capability without replaying an already completed atomic operation.

## Availability Checks

Distinguish these states:

- **Available:** the current task exposes callable tools and a minimal read-only call succeeds.
- **Registered but not loaded:** client configuration lists the server, but this task has no callable tools. A client restart or new task may be required.
- **Connected but not ready:** tools exist, but Xcode has no suitable project open, permission is disabled, or the bridge cannot reach Xcode.
- **Unavailable:** registration, executable, compatible Xcode, or a required XcodeBuildMCP workflow is absent.
- **Unknown:** the environment does not allow the relevant read-only checks. Report uncertainty rather than guessing.

Do not probe availability with a mutating build, install, or UI action when a read-only inventory or status operation is sufficient.

## Apple Official Xcode MCP Checklist

Apple's documented external-agent setup currently requires:

1. A compatible Xcode version.
2. Xcode → Settings → Intelligence → Model Context Protocol → **Allow external agents to use Xcode tools** enabled.
3. Codex registration checked with:

   ```bash
   codex mcp list
   ```

4. If an Xcode bridge entry is absent and registration is authorized, Apple's documented Codex command is:

   ```bash
   codex mcp add xcode -- xcrun mcpbridge
   ```

5. The target project opened in Xcode before the external agent attempts to use Xcode capabilities.

If the executable itself must be checked, use a read-only lookup such as `xcrun --find mcpbridge`. Registration does not prove that the current task hot-loaded the server. Do not re-register an entry that is already present merely because tools are missing. Suggest restarting Codex or opening a new task, then verify that the official tools are exposed and that a minimal read-only operation succeeds before attempting a build.

Do not run registration commands, enable the Xcode setting, update Xcode, install components, or use privileged alternatives unless the user has authorized that state change. Do not recommend preview-era unsafe persistent authorization flags as the normal desktop setup.

## XcodeBuildMCP Checks

Tool absence may mean either the server is missing or the required workflow is disabled. Inspect the exposed tools and, when available, use the project's diagnostic or doctor capability. Do not automatically install XcodeBuildMCP or rewrite `.xcodebuildmcp/config.yaml`.

When session defaults exist, read and reuse them. Discover the project only when defaults are absent, invalid, or conflict with the user's request. For a fresh build-and-run request, prefer a combined operation when no compatible product has already been built. If a preceding build or test produced the intended app artifact, prefer install-and-launch or launch-only capabilities when available instead of rebuilding without reason.

Do not assume that an artifact produced through one backend can be handed directly to another. If a backend switch requires rebuilding, reassert the complete build context, verify the resulting bundle identifier and artifact, and disclose the rebuild.

## Backend Handoff Record

Before changing backends, retain and re-confirm:

- project or workspace path;
- scheme and configuration;
- SDK and destination;
- Simulator/device name and identifier;
- bundle identifier;
- DerivedData path if overridden;
- launch arguments and environment;
- test plan, test identifiers, and filters;
- stateful log, debugger, video, or UI sessions.

Do not leave two backends controlling the same stateful session.

## Avoid Global Hard-Coding

Discover rather than fix in this skill:

- Xcode, Swift, SDK, or runtime versions;
- Xcode application path;
- project/workspace, scheme, bundle identifier, or configuration;
- Simulator model, name, identifier, or boot state;
- MCP server prefixes, individual tool names, or tool counts;
- DerivedData locations;
- package-manager availability;
- the assumption that configuration changes hot-load into an existing task.

## Maintained Sources

- [Apple: Giving external agents access to Xcode](https://developer.apple.com/documentation/xcode/giving-external-agents-access-to-xcode)
- [Apple: Xcode updates](https://developer.apple.com/documentation/Updates/Xcode)
- [XcodeBuildMCP documentation](https://www.xcodebuildmcp.com/docs)
- [XcodeBuildMCP tools reference](https://www.xcodebuildmcp.com/docs/tools)

Consult these sources when a version-specific capability or configuration detail matters.
