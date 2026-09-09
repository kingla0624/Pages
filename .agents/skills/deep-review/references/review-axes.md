# Choosing review axes

An axis is one reviewer's assignment: a slice of the repository plus the question it
is reading for. Getting the slicing right matters more than the number of reviewers,
because an axis that spans too much produces shallow claims and an axis that spans
too little produces none.

## Derive, do not select

Read the directory tree and the entry points before deciding anything. The axes
should be recognisable to someone who works on the codebase — they are that system's
actual seams, not categories imported from a checklist.

Two shapes work:

- **Subsystem axes** — one coherent module and everything it owns. The reviewer reads
  it end to end and asks whatever that subsystem makes it natural to ask.
- **Concern axes** — one question swept across the whole repository. The reviewer
  reads narrowly but everywhere.

Most reviews want mostly subsystem axes plus two or three concern axes. The concern
axes catch what subsystem reviewers each see a fragment of and none reports.

## Sizing

One axis should be readable in full in a single context, with room left to think.
Roughly: one subsystem, or one concern across all of them.

Split an axis when the files under it do not share a vocabulary — a reviewer holding
two unrelated mental models does neither well. Merge two when neither can produce a
claim without reading the other.

Overlap is deliberate. Two reviewers reaching the same finding independently is
corroboration, and merging duplicates at the end costs little. Gaps cost much more,
so err toward overlapping coverage.

## Worked example

The audit this skill is modeled on — an 8,600-line SwiftUI options analyzer — used
twelve axes:

| Axis | Kind | Reads for |
|---|---|---|
| Quant core | subsystem | Pricing and greeks correctness, numerical safety |
| Vol surface | subsystem | Surface parameterisation, arbitrage bounds, edit clamps |
| Model caching | concern | Cache keys, invalidation, observation dependencies |
| Model intents | subsystem | State mutations and their invariants |
| Persistence | subsystem | Write ordering, load repair, deletion |
| Concurrency | concern | Isolation, races, cancellation |
| Pager and gestures | subsystem | Recognizer arbitration, cleanup on cancel |
| Cards | subsystem | Presentation correctness, units |
| Components | subsystem | Shared widgets, duplication |
| Library and sheets | subsystem | Load paths, caps, truncation |
| Tests | concern | What the suite cannot catch |
| Cross-cutting drift | concern | Comments and copy that no longer match code |

Note what the split follows: the app's own module boundaries, with three concern axes
(caching, concurrency, drift) laid across them, plus tests. Nothing here would
transfer unchanged to a different codebase — derive your own.

## The two axes to always include

**The test suite as a subject, not a tool.** Read the tests asking what they would
fail to catch. This axis reliably produces the findings nobody else can see:
assertions that cannot fail, tests that restate the implementation instead of
checking behaviour, coverage claimed in a doc comment but not in code, whole
subsystems with no test at all. In the worked example this axis produced a third of
the register.

Useful probes: would a constant-false return pass this assertion? Does this test vary
the input it claims to test? Does the fixture make the failure mode unreachable?

Do not stop at reading. Run `scripts/mutate.mjs` against the suite and report the
survivors — they answer those questions by measurement instead of inspection, and
they turn a vague "coverage looks thin" into a line a reader can act on. The two
mutation classes that pay best here are collapsing a computed predicate to a constant,
which finds guards that never actually guard, and inverting a sign, which finds
arithmetic the suite only ever exercises in one direction.

Read the survivor list, not the score. A percentage invites an argument about the
target; "the correct fix for finding 01, applied, leaves every test green" ends it.

**Cross-cutting drift.** Comments, doc comments, README claims, and user-facing copy
that no longer describe the code. These are individually small and collectively
corrosive — a comment promising a stop where the code jumps will mislead the next
reader, human or model, and drift is invisible to every subsystem reviewer because
each one sees only their own.

## A starting catalog

Draw from these when carving axes; none is mandatory, and the useful ones depend
entirely on what the system does.

- **Core domain logic** — the math, the algorithm, the protocol, the state machine.
  Whatever the system exists to get right. Verify against an independent derivation.
- **Boundaries and clamps** — every place a value is bounded, snapped, rounded, or
  truncated. Directional clamps applied absolutely, ranges that coincide only over
  part of their domain, and rounding that is not injective all live here.
- **State transitions** — what invariants hold across each mutation, and whether any
  writer can break one.
- **Persistence** — write ordering, partial-failure behaviour, what load repairs and
  what it silently accepts, caps and truncation.
- **Caching** — key construction, what the key does *not* cover, and whether a hit
  and a miss register the same dependencies.
- **Concurrency** — isolation, cancellation, cleanup on the paths nobody tests.
- **Security** — every place an untrusted value crosses a boundary: parsers, query
  construction, deserialization, path handling, authorization checks, secrets in
  code or logs. In memory-unsafe languages, every buffer length and lifetime. The
  probe: who controls this value, and what is the worst thing they can make it do?
  Grade by the same reachability rule as everything else — "attacker-controlled in
  one request" and "requires local file access" are different severities.
- **Performance** — the hot paths, measured rather than guessed: complexity of loops
  over unbounded data, allocation inside them, I/O per element (the N+1 shape),
  missing indexes, needless synchronization, work redone that a cache already did.
  A performance claim needs a number from a run — "quadratic" is a hypothesis until
  doubling the input has quadrupled the time.
- **Architecture, cohesion and coupling** — dependency direction, layering, one
  module reaching into another's representation, a function serving two masters.
  The probe: which import would surprise this module's author? A presentation
  helper used as a persistence key is the canonical catch — each file fine alone,
  the composition wrong.
- **Readability and conventions** — names that promise something the code does not
  do, style that shifts mid-file, dead parameters, functions whose size hides their
  one real branch. These file as Low, and they belong in the register anyway: they
  are the compound interest on every future change, and a reader deciding where to
  refactor first needs them listed.
- **Failure modes** — what a transient error cascades into. A fetch failure that is
  indistinguishable from an empty result is a classic.
- **Interaction** — gesture arbitration, hit targets, cleanup when the system cancels
  rather than the user; and the state ledger of every control — loading, empty,
  error, disabled, the double-tap window while a request is in flight. Every action
  answers with feedback; destructive ones are gated by confirm or undo; error copy
  says what to do next; keyboard and focus paths reach what touch reaches.
- **Product intent vs implementation** — what the product promises (spec, README,
  onboarding copy, the UI's own labels) against what the code does: defaults that
  are not the documented defaults, flows that dead-end, features no navigation
  reaches, limits promised but unenforced — or enforced but never disclosed. A
  mismatch is a finding with the promise as its evidence. A deliberate choice you
  merely dislike is an Owner's call entry or nothing: taste has no severity.
- **UI consistency and visual language** — hardcoded colors beside a token system;
  styles copy-pasted where a shared component exists; theme coverage (every color
  the light theme defines, defined in dark too — a token that exists in one mode is
  how pages go unreadable); contrast computed against WCAG where text sits on
  tinted grounds, not eyeballed; typography and spacing drifting between sibling
  screens; layouts that break under long strings or RTL. The project's own design
  system is the standard to hold it to. Where none exists, inconsistency between
  two screens is a fact but not yet a finding: variation applied consistently
  across screens of a kind is a system nobody wrote down, and emphasis is
  supposed to differ. File the one-off that matches nothing, name what it
  departs from, and let the owner pick either side. Taste has no severity here
  either.
- **Units and formatting** — per-share vs per-contract, signed zero, one view using a
  different unit from the view beside it.
- **Accessibility** — controls indistinguishable to a screen reader, unlabelled
  steppers.
- **Duplication** — the same logic written out two or three times. Worth finding
  because the copies drift, and because a fix applied to one is a fix that looks done.
- **Build and configuration** — language mode, deployment targets, warnings that
  predate the review.

What any of these mean concretely depends on the stack: "concurrency" reads
differently in Go than under Swift's main actor, and "performance" means something
else again when the loop is a GPU pipeline. `stack-notes.md` carries the per-stack
reading lists — hand the relevant section to the reviewer whose axis touches that
stack.

## Three probes that cut across every axis

The catalog above slices the repository by subject. These three slice it by way
of looking, and they find what subject-slicing structurally cannot: each asks
about a relationship between two places rather than about the contents of one.
Give them to whichever axis owns the code they touch — or, on a large review, to
one reviewer as its whole assignment.

**What the code stopped doing.** Every guard, clamp, validation and error path
that exists on one route and not on its sibling is a candidate: two entry points
into the same subsystem where one validates and the other does not, a check
present in the fast path and absent in the slow one, a constructor that
normalises where a deserializer does not. Name the invariant, then find every
route that reaches the same state and ask which of them enforces it. On a diff-
scoped review this becomes literal: for each deleted or replaced line, name what
it enforced and locate where the new code re-establishes it — if nowhere, that is
the finding.

**Follow the call, both ways.** For each function an axis reads, find its callers
and ask what the function now requires that they do not supply — a precondition,
a return shape, an exception, an ordering. Then look the other way: what does it
call, and would a change here make that call unsafe? Defects between modules live
in exactly this gap and belong to neither file's reviewer, which is why they
survive subject-sliced reviews.

**Wrappers must forward.** Any type that stands in front of another — cache,
proxy, decorator, adapter, repository, façade — gets two questions: does every
method reach the wrapped instance rather than looping back through a registry,
session, or global (which re-enters the wrapper, or recurses); and does it
forward every method its callers actually use, or does one fall through to a
default that quietly does something else? The failure is silent and the symptom
appears far away.

## What to hand each reviewer

Give it the axis name, the file list, and instructions that:

1. It reads its files **completely**, not by search.
2. It verifies checkable claims against an independent source rather than against the
   comments.
3. Every claim comes back with a location, a mechanism, a proposed severity, and the
   evidence — for anything above Low, a reachability path counted from a default
   state.
4. It also reports what it checked and found **correct**, especially anything a
   reader would worry about.
5. Uncertainty is reported as uncertainty. A claim it could not substantiate should
   come back marked open, not dropped and not asserted — the verification pass can
   settle it, but only if it survives to get there.
