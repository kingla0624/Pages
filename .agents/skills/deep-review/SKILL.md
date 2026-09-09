---
name: deep-review
description: Engineering-grade code audit across correctness, security, performance, architecture, maintainability, and — where the code draws an interface — product behaviour, UI consistency and interaction. Reads a whole codebase along axes derived from its own structure, sends every claim to an adversarial verifier that defaults to refuting it, grades severity by measured reachability, and publishes a findings register as an HTML artifact plus a Markdown summary. The method is language-agnostic, with stack-specific reading lists (C/C++, Java, Swift and SwiftUI, Python, PHP, Go, JS/TS/Node/Next.js, shell, SQL, Prometheus/InfluxDB, GPU APIs) and a bundled mutation runner. Use this whenever the user asks for a deep, thorough, full, or "engineering-grade" review, an audit, a security or performance review of existing code, a code-quality or maintainability assessment, a UI or interaction review of implemented screens, a design-consistency check against a design system, a pre-release quality pass, a correctness sweep, or says something like "review the whole codebase" or "find everything wrong with this" — anything more serious than a look at the current diff. Also use it when asked to re-verify, re-grade, or reproduce findings from an earlier review, or to turn review notes into a findings report. Prefer this over a quick read whenever the user signals they want to trust the result.
---

# Deep Review

A quick review reads a diff and reports what looks wrong. This produces a register
of findings graded by measured reachability, with the reviewer's own mistakes
recorded in the open.

The difference is not thoroughness. It is that **a claim only enters the register
after someone tried to refute it and failed.**

For the report structure and the writing rules that make it readable, read
`references/report-format.md` before writing entries. For choosing what to review
along which lines, read `references/review-axes.md`; for what to read for in a
specific language or runtime, `references/stack-notes.md`. The HTML template is
`assets/findings-register.html`, and `scripts/mutate.mjs` measures a suite by
breaking the code under it (`node scripts/mutate.mjs --help`).

Scale the effort to the stakes — measured, the full method costs about 1.5x a plain
careful review. A 400-line utility wants two or three axes, one reviewer, serial
verification; a codebase whose failures cost money wants the whole apparatus. The
disciplines scale down; the ordering does not.

## Phase 1 — Baseline, before any reading

Establish and record: current branch and commit, line and file counts, whether the
build is clean, whether the tests pass and how many there are, and what the suite
actually covers.

Run the build and the test suite yourself. Do not take the README's word for it —
noting that both execute the repository's own code: on a codebase you have no reason
to trust, run them sandboxed, or ask first. Take coverage too if the runner offers
it. An uncovered line is not a defect, but it is a map of where to look.

Some of these will not apply. A directory that is not a repository has no commit to
anchor to; a zero-dependency package has no build to be clean. Record those as not
applicable rather than inventing a value, and say what it costs: without history you
cannot tell a fresh regression from a defect that shipped years ago, and a reader
deciding how urgently to act needs to know you could not tell either.

State caveats exactly. If the build emits one pre-existing warning, the baseline is
"clean, 1 pre-existing warning" — not "clean". A wrong baseline quietly invalidates
every later statement that references it, and you will not notice, because a later
run that contradicts it looks like your own change broke something.

## Phase 2 — Derive the review axes from the codebase

Do not apply a fixed checklist. Read the directory structure and the entry points
first, then carve the repository into axes that match how *this* system is actually
built — subsystem crossed with concern.

Size each axis so one reviewer can hold it in a single context. Overlap is useful —
two reviewers reaching the same defect independently is evidence, and duplicates get
merged in phase 4.

Always include one axis for the test suite itself and one for cross-cutting drift
(comments, docs and user-facing copy that no longer describe the code). Both
consistently yield findings and neither belongs to any single subsystem.
`references/review-axes.md` has a catalog to draw from and a worked example.

Correctness is never the only lens. Before settling the axes, weigh each of the
standing concerns and give every one that applies a home in some axis: **security**
(untrusted input, injection, secrets, unsafe memory), **performance** (hot-path
complexity, allocation, I/O amplification — claimed with a measured number, like any
other claim), **architecture** (dependency direction, layering, cohesion and
coupling), **readability and conventions** (naming that lies, style drift, comments
as a maintenance surface), and — when the code draws an interface — **product
intent and interaction** (does behaviour match what the product promises; do
states, feedback, visual language and theme coverage hold together; judged against
the product's own claims and design system, never against taste). These are lenses
to check for applicability, not a checklist to transcribe — the axes are still
carved from this codebase's own seams.
Every standing lens then appears exactly once at the top of Verified correct, as a
disposition: swept and clean (naming the sweep), findings filed (naming which), not
applicable (naming why), or unswept (naming what stopped it — scope cut, absent
toolchain). The template holds a slot for this line and report-format.md specifies
it. The slot exists because an absent line is
indistinguishable from an unswept lens — and an unswept lens is how a quadratic
hot path ships unremarked while the register reads as complete.

When the code is in a stack with well-known failure modes — memory-unsafe languages,
SQL, GPU pipelines, async runtimes — read the matching section of
`references/stack-notes.md` before assigning that axis, so its reviewer reads for
the failure modes that stack actually has.

## Phase 3 — Read every file along each axis

Fan out one reviewer per axis. Each reads its assigned files completely and reports
claims, each with a location, a mechanism, a proposed severity, and the evidence —
what was run or derived, stated so that a verifier can try to reproduce it.

Size the fan-out to the stakes, and say in Method what was spent: one reviewer per
axis is the ceiling, and on a small target one reviewer taking two axes serially
loses little. Verification adds one verifier per axis-worth of claims, batched;
reserve a verifier per single finding — and the two-skeptic treatment — for the
findings that will drive decisions.

Three rules govern what counts as a claim:

**Derive, do not read off.** When code implements something checkable — a formula, an
invariant, a protocol, a state machine — verify it against an independent source: a
finite-difference check, a known identity, a brute-force search over the reachable
input space, the actual built artifact. A comment saying the clamp prevents a stall
is not evidence that it does.

**Break the code to test the tests.** A green suite is evidence only if it can go red.
On the axis that reviews the tests, mutate the source on purpose — invert a return,
drop a sign, delete a clamp — and see which mutations the suite still passes. Every
survivor is a coverage claim no amount of reading the tests would have produced —
"the correct fix for finding 01, applied, leaves all tests green" tells a reader more
about their suite than any coverage percentage.

Use `scripts/mutate.mjs` rather than writing a harness. Hand-rolled ones tend to parse
the runner's output to decide whether a mutant died, which breaks on locale, colour
and Unicode, and it breaks in the direction that flatters the suite — reporting
mutants killed that in fact survived. The bundled script decides on exit status
instead, and refuses to run at all if the suite is not green to begin with.

When the suite is red, or there is no suite, this axis does not disappear — its
subject changes. A red baseline is itself the finding (phase 1 recorded it), and the
tool rightly refuses to measure against it; read the tests statically for what they
could catch once green. No tests at all: report the top invariants a suite would need
to pin, ranked by what the review found most dangerous, and say in the register that
every other finding stands unprotected by regression.

**Say what is correct, too.** Have each reviewer report the parts it checked and
found sound, especially the parts most likely to be quietly wrong. These become the
"Verified correct" section.

## Phase 4 — Adversarial verification

Send every claim to an independent verifier that did not produce it. The verifier
receives the claim — location, mechanism, proposed severity, evidence — plus the
same repository access and the phase 1 baseline, and nothing else of the reviewer's
reasoning: it must be able to reach the code, or "could not reproduce" means
nothing. Instruct it to **refute** the claim, and to default to refuted when the
evidence cannot be reproduced. This asymmetry is deliberate: a false finding costs
the reader more than a missed one, because it burns their trust in the whole
register.

The verifier returns confirmed or refuted. **Open is yours, not the verifier's**:
after the pass, promote a refuted claim to open when what defeated it was missing
authority rather than missing evidence — no spec says which behaviour is intended,
or the toolchain that would settle it is not available here. An open entry names
what would settle it and who could. Uncertainty that a rerun could resolve is not
open, it is refuted.

When independent verifiers cannot be spawned, run the degraded protocol rather than
skipping the phase: finish the whole review pass, set the claims aside, then
re-approach each one fresh — re-derive from the source before rereading your own
evidence, with the same refute-by-default stance. Say in Method which protocol ran.
Serial self-verification is weaker, and the reader can price that in only if told.

Keep a ledger and publish it: how many claims were **raised**, how many
**confirmed**, how many **refuted** and dropped, how many left **open**. Those four
words are the claim vocabulary everywhere in the report — "survived" is not a fifth
state, it is confirmed. A register reporting "3 refuted" is more credible than one
reporting none.

After verification, merge duplicates. Two claims are one finding only when they name the
same mechanism at the same site **for the same reason**; the merged entry carries
every location and says two reviewers reached it independently. Same line, two
mechanisms, is two findings — a merge there deletes one of them, and the one that
survives is whichever reviewer wrote first. Merge confirmed claims only: a claim refuted
under one axis's phrasing must not re-enter the register wearing another's.

Where a finding could fail in more than one way, give each verifier a different lens
— one attacking the arithmetic, one attacking reachability — rather than running the
same check twice. Redundancy catches noise; diversity catches errors.

## Phase 5 — Grade by reachability, and re-grade

Severity is **reachability × consequence**, and reachability is a measurement, not an
adjective.

Before filing anything above Low, state the shortest path to it from a default state.
Count it in the unit the thing under review actually has — taps for an app, API calls
for a library, records for a batch job — and say which unit you picked, or a reader
weights "two calls" as if it were "two taps". "Reachable in one tap from an ordinary
session" is a severity argument. "Could occur under certain conditions" is not.

When you cannot find a path, that **caps the severity — it does not delete the
finding.** File it as Low and say plainly that no reachable path was found. An
exported function that returns NaN on empty input still earns a line when nothing
internal calls it, because the caller who eventually does is not reading your report.
A finding graded Low costs the reader one line; a finding dropped for want of a path
costs them the whole defect, and they never learn it was considered.

Then quantify the blast radius by sweeping the reachable input space rather than
reasoning about it: how many cases fail, out of how many. A sweep turns "this can
collide" into "50 colliding pairs across every reachable transition", which a reader
can act on.

Sweeps need bounds. Exhaust the space when it is finite and reachable — a strike
grid, an enum, a config matrix. When it is not — a parser, a server, arbitrary
floats — fix a sampling frame first (ranges, step, count), report numbers against
that frame, and never let a sampled sweep wear the word exhaustive. The stopping
rule for the phase is the ledger's: every claim confirmed, refuted, or deliberately
left open. An open entry that names what would settle it is a finished state, not an
unfinished review.

**Expect to have over-graded.** This is the most reliable failure mode in practice —
in the audit this skill is modeled on, a second adversarial round found that *all
four* top findings were over-graded on the first pass, and none was actually High.
Re-verify the top findings before any code changes, with two skeptics each and an
adjudicator that settles disagreements against the source.

Record every re-grade visibly on the finding (`re-graded from High`). Silently
lowering a severity looks like hiding; showing it is the rigour.

Also check whether the entry is a defect at all. Some are decisions the owner already
made. File those as `Owner's call` with the evidence for why it looks deliberate, or
leave them out.

## Phase 6 — Reproduce the important ones yourself

For findings that will drive real work, re-derive them outside the reviewing agents:
drive the real object, run a brute-force search, inspect the built artifact. Mark
only these `Reproduced`, and say in the Method section exactly how. The badge is
worth something only if it is scarce: do not mark a finding reproduced because a
reviewing agent said it reproduced.

## Phase 7 — If fixing, mutation-verify the fix

Phase 3 used mutation to measure the suite; here it proves the test you just wrote
actually pins the fix.

Only fix what the user asked to have fixed. When you do:

1. Write the test that fails on the current behaviour.
2. Revert the fix in an isolated copy and confirm the new test fails there. A test
   that passes against the unfixed code is testing nothing.
3. Mutate the fix several ways — drop a sign, restore the old clamp, remove the
   collision resolution — and attribute each kill: the full suite must fail, and
   the new test **run alone** must fail against the same mutant. If the new test
   alone passes while the suite fails, something else caught it and the new test
   pins nothing. Apply these mutations by hand in a copy: the bundled runner
   measures a suite against its own catalog and keeps no mutant afterwards, so it
   cannot re-run one test against one mutation. A mutation that kills nothing
   means the fix is untested.
4. Re-run the sweep from phase 5 and report the after-number beside the before-number.

State the residue honestly. If the fix narrows the failure rather than removing it,
say which cases remain.

## Phase 8 — Publish

Produce both:

**The HTML findings register**, from `assets/findings-register.html`, published with
the Artifact tool. The template is theme-aware, has severity filtering wired up, and
is already in the shape the Artifact publisher expects — fill the placeholders, drop
the sections you do not need, and keep the class names. The field rules in
`references/report-format.md` are what make the register scannable rather than a wall
of prose.

**A Markdown summary** in the reply: the baseline, the counts by severity, the claim
ledger, the top findings in one line each, and the artifact link. Someone reading the
terminal should learn the outcome without opening the report.

Write both in the language the user is working in.

If findings are fixed later in the session, republish the register to the same URL
with each entry carrying what happened — `Fixed` and its post-fix measurement, or a
line saying it was considered and left. A register that still reports as open what
the session already closed is worse than no register: the reader acts on it.

## Scoped invocations

The full method assumes a whole repository and a from-scratch mandate. Three
narrower requests arrive often; they reuse the phases rather than shrinking them.

**A single concern** — "security review", "performance pass". Keep every phase;
restrict phase 2 to that concern's axes swept across all subsystems, and say in the
standfirst that the register covers one concern, not the codebase. Verified-correct
matters double here: it is the concern-wide clearance list.

**A module or a diff.** Root the axes at the named scope, then read one ring outward
— the callers and callees that touch it — because cross-module defects live on the
boundary, and the boundary is where this method earns its keep. Findings outside the
ring get one line each, not a chase.

**Re-verifying an earlier review** — inherited findings, or notes to be turned into
a register. Treat each inherited finding as a raised claim entering phase 4: verify
with refute-by-default, re-grade by phase 5, reproduce what matters (phase 6), and
publish with the ledger separating the confirmed from the refuted. The earlier
review's severities are proposals, never anchors.

## Ordering matters more than completeness

If the review has to be cut short, cut scope — fewer axes, fewer files — rather than
phases. Ten files reviewed with verification and reachability measurement are worth
more than a whole repository skimmed, because the reader can act on the first without
re-checking it.

A repository too large to read completely is the same decision made up front: choose
subsystems by risk — where money or data can be corrupted, what changed most
recently, what the user named — read those completely, and let the scope declaration
name every directory left unread. Say what was left out: a register that silently
covered less than it appears to is the one failure this whole method exists to
prevent.
