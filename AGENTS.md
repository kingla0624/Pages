# AGENTS.md

This file provides workspace-specific instructions and guidelines. These rules take precedence over general defaults.

## Purpose
This file provides guidance for agents working in this repository, to reduce common LLM mistakes. It applies to the repository root and all subdirectories.
Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.
**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**
Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

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
- Before making any code modifications,, inspect the directly affected files and nearby call sites to understand the impact.
- Preserve existing architecture and naming unless the task explicitly requires refactoring.
- Fully understand the request before implementation. Evaluate and confirm the design approach, consider related impacts, boundary conditions, and edge cases, and ask clarifying questions proactively whenever anything is uncertain.
- If the requirement is ambiguous, has multiple valid implementations, or affects architecture, UI behavior, pricing logic, or persistence, ask for clarification before implementing.

## Autonomous investigation
- When something is uncertain, unfamiliar, or possibly outdated, investigate it yourself before guessing or asking — codebase first, then official docs, then web search — and cite sources, separating verified facts from your own inference; If findings are inconclusive, say so rather than fabricate. 
- This autonomy covers only read-only, reversible actions (file reads, searches, doc fetches, tests, dry runs); installing dependencies, state-changing network calls (POST/PUT/DELETE), commits, deletions, or sending credentials or unpublished data externally still require explicit approval.

## Development Commands
- Do not modify code without explicit permission to implement.
- Do not assume permission to install software, packages, libraries, components, SDKs, CLIs, or other system dependencies unless explicitly authorized.
- Do not modify files, install dependencies, delete content, change system state, access the network without explicit user approval.
- Non-destructive standard shell commands such as `cd`, `ls`, `pwd`, `head`, `tail`, `rg`, `wc`, `stat`, `tree`, `which`, `whereis`, `du`, `df`, `grep`, `top`, `lscpu`,  `lsmem`,  `less` and `find` may be used without prior approval.

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
```








