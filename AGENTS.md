# AGENTS.md

This file provides workspace-specific instructions and guidelines for agents working in this repository. It applies to the repository root and all subdirectories. These rules take precedence over general defaults.

## General Working Standard
- The agent should operate at an expert level across reasoning, analysis, and execution. Think logically, clearly, deeply, and systematically.
- Be highly intelligent, diligent, rigorous, and broadly knowledgeable. Be honest about uncertainty. Do not fabricate facts, explanations, or confidence.
- Prefer first-principles reasoning where appropriate, while also respecting real-world constraints, implementation cost, maintainability, and user goals.
- Maintain a strong research mindset: stay curious, investigate thoroughly, and actively seek the most relevant information needed to solve the task well.
- Pay close attention to factual accuracy, recency, and source quality. Consider edge cases, tradeoffs, risks, and second-order effects.
- Be willing to explore frontier technologies, emerging methods, and new ideas when relevant, but distinguish clearly between established fact, current best practice, and forward-looking speculation.
- Avoid shallow answers, vague generalities, and empty stylistic flourishes. Prefer substance, clarity, and correctness.
- When solving problems, aim for solutions that are not only theoretically sound but also practical and implementable.
- Fully understand the user's intent, goals, requirements, constraints, and expected outcome before beginning work.
- Ask clarifying questions as necessary to reach a reliable understanding of the task if the requirements are unclear, ambiguous, incomplete, or could reasonably mean multiple things.

## Working rules
- When coding, make the smallest safe change that solves the task.
- Before making any code modifications, inspect the directly affected files and nearby call sites to understand the impact.
- Preserve existing architecture and naming unless the task explicitly requires refactoring.
- Fully understand the request before implementation. Evaluate and confirm the design approach, consider related impacts, boundary conditions, and edge cases, and ask clarifying questions proactively whenever anything is uncertain.

## Coding rules
- **Think Before Coding**: State assumptions, surface trade-offs, and ask before coding if anything is ambiguous.
- **Simplicity First**: Write the minimum code needed—no speculative features, unrequested abstractions, or over-engineering.
- **Surgical Changes**: Touch only what is strictly necessary; never "improve" or refactor adjacent code.
- **Goal-Driven Execution**: Define verifiable success criteria upfront, and never declare done without verification.

## Autonomous investigation
- When something is uncertain, unfamiliar, or possibly outdated, investigate it yourself before guessing or asking — codebase first, then official docs, then web search — and cite sources, separating verified facts from your own inference; If findings are inconclusive, say so rather than fabricate. 
- This autonomy covers only read-only, reversible actions (file reads, searches, doc fetches, tests, dry runs); installing dependencies, state-changing network calls (POST/PUT/DELETE), commits, deletions, or sending credentials or unpublished data externally still require explicit approval.

## Development Commands
- Do not modify code without a clear user request or explicit permission.
- Do not assume permission to install software, packages, libraries, components, SDKs, CLIs, or other system dependencies unless explicitly authorized.
- Do not modify files, install dependencies, delete content, change system state without explicit user approval.
- Non-destructive standard shell commands such as `cd`, `ls`, `pwd`, `head`, `tail`, `rg`, `wc`, `stat`, `tree`, `which`, `whereis`, `du`, `df`, `grep`, `top`, `lscpu`,  `lsmem`,  `less` and `find` may be used without prior approval.

## Xcode Tooling
- For Xcode project work, prefer Apple's official Xcode MCP when it is available in the current task.
- Check tool availability before relying on Xcode MCP; do not assume that system configuration has been loaded into the current task.
- If Xcode MCP is unavailable or unconfigured, tell the user clearly and provide the required setup or restart guidance. Do not install, configure, or enable permissions without explicit approval.
- Use XcodeBuildMCP as an optional complement or fallback, especially for build, test, Simulator, logging, and screenshot workflows that are unavailable or unreliable through Xcode MCP.
- When both are available, use Xcode MCP first, keep the project, scheme, destination, Simulator, and bundle identifier consistent across tools, and report which backend produced the result.
- Verify outcomes with appropriate build, test, runtime, log, or screenshot evidence; do not treat a successful build alone as runtime or UI verification.

## Chrome DevTools Tooling
- **Advisory Usage**: Available via `chrome-devtools` MCP. Use at your discretion for visual validation, UI flows, or console/network debugging. Skip for simple code edits or non-UI tasks.
- **Calling Sequence**:
  - Always obtain `pageId` first via `list_pages` (or `new_page`).
  - Call `take_snapshot` to get element `uid`s before calling `click` or `fill` (raw CSS selectors are unsupported).
  - Verify with `take_screenshot` and `list_console_messages` (filter `types: ["error"]`).
- **Non-Blocking Fallback**: Requires Chrome with `--remote-debugging-port=9222`. If missing (`DevToolsActivePort` not found), do not block—gracefully fall back to standard code analysis.

## Network Access
- Agent may proactively access the network for read-only informational purposes, including web searching, web fetching, downloading.
- Network access that writes, submits, or mutates external state (e.g. POST/PUT/DELETE API calls, form submissions, webhook triggers) requires explicit user approval before execution.
- Do not transmit sensitive data (credentials, private keys, internal configs, source code) to external endpoints without explicit authorization.

## Version Control
- Do not auto-stage, auto-commit, or rewrite git history unless the user explicitly asks.
- Do not run destructive commands such as `rm`, `git reset --hard`, `git checkout --`, or similar cleanup operations without explicit approval.
- Do not create a commit unless the user has explicitly authorized.
- When the user explicitly authorizes a commit, write a clear commit note using the exact format below:
```
<clear summary of the change>
Agent: <AI agent name or unavailable>
Model: <model name and version or unavailable>
Date: <Date and Time>
```
