# Stack notes — what to read for, per language and runtime

These are reading lists for the reviewer whose axis touches the stack, not
checklists to transcribe into findings. A probe here becomes a claim only the way
phase 3 demands: with a location, a mechanism, a proposed severity, and the
evidence. Most probes below name
the failure mode *and* the innocent look-alike, because the axis reviewer who reads
for one without the other files false positives — the trap half of a probe matters
as much as the defect half.

If the stack's toolchain is not available to run — no compiler, no simulator, no
database, no GPU — say so in the baseline. Code that was read but never built or
executed is a different level of assurance, and the reader must know which one they
are getting.

Sections: [C and C++](#c-and-c) · [Java](#java) ·
[Swift, SwiftUI, Swift Charts, SwiftData](#swift-swiftui-swift-charts-swiftdata) ·
[Python](#python) · [PHP](#php) · [Go](#go) ·
[JavaScript, TypeScript, Node.js](#javascript-typescript-nodejs) ·
[Next.js](#nextjs) · [UI code, any framework](#ui-code--any-framework) ·
[Shell](#shell-bash) · [SQL](#sql--mysql-sqlite) ·
[Prometheus and InfluxDB](#prometheus-and-influxdb) ·
[GPU APIs](#gpu--webgl-opengl-vulkan-directx-metal)

## C and C++

- Every buffer: who owns the length, and is the arithmetic that computes it done
  before or after the bound it feeds? Off-by-one lives at allocation sites and at
  `<=` loop bounds over sizes.
- Unsigned underflow: `for (i = 0; i <= n - 1; i++)` with `n == 0` and `n`
  unsigned is an effectively infinite loop. Any subtraction on a `size_t` is worth
  a look.
- Lifetimes: pointers escaping the scope that owns them, use-after-free on *error*
  paths specifically (the happy path is usually right), double free in cleanup
  that runs twice, iterator invalidation across `erase`/`push_back` (C++).
- Error paths: early returns that skip `free`/`close` in C; in C++, whether RAII
  actually covers the resource or a raw `new` slipped through; exception safety of
  constructors that acquire two things.
- Concurrency: flags shared between threads without atomics, lock ordering across
  call chains, signal handlers touching non-async-safe state.
- UB that reads as style: strict-aliasing casts, reading uninitialized members,
  null checks *after* dereference. The compiler is allowed to delete that check.

## Java

- `equals`/`hashCode`/`compareTo` contracts against how the object is actually
  used — a mutable field in `hashCode` plus a `HashSet` is a lost object.
- Concurrency: shared mutable state reached from more than one thread without a
  happens-before edge; `volatile` used as a lock substitute for compound ops;
  executor pools created per call and never shut down.
- Resources: every stream, connection and channel inside try-with-resources, or
  a named reason why not. Finalizers are not a reason.
- Exceptions: empty catch blocks, `catch (Exception e)` swallowing what a caller
  needed, checked exceptions laundered into `RuntimeException` with the cause
  dropped.
- Nullability at boundaries: what the API accepts versus what its annotations or
  Optionals claim, especially across module seams.

## Swift, SwiftUI, Swift Charts, SwiftData

- Value vs reference semantics: a struct captured, mutated, and expected to have
  changed elsewhere; a class shared where a copy was assumed. `[weak self]`
  discipline in escaping closures — and note the innocent look-alike: a
  non-escaping closure needs none.
- SwiftUI state ownership: does the property wrapper match the mutation site —
  `@State` mutated from outside the view, `@Binding` to a computed value,
  `@Observable` objects recreated per body call. View identity: an `id(_:)` or a
  `ForEach` key that changes under edit resets state and animation silently.
- Actor isolation: UI-touching code that can run off the main actor;
  `@unchecked Sendable` as a warning silencer; `Task {}` inheriting an actor the
  author did not intend.
- SwiftData: one `ModelContext` used from more than one task or actor; fetches on
  a context other than the one the object came from; save ordering against
  relationship deletes; whether the schema change in this diff is actually a
  lightweight migration.
- Swift Charts: series data fed unsampled at sizes where the chart re-renders per
  frame; axis domains assumed rather than derived, so an out-of-range point
  silently clips.
- Caching keyed off `@Observable` properties: a hit must register the same
  observation dependencies as a miss, or the view stops updating exactly when the
  cache starts working.

## Python

- Mutable default arguments; closures in loops binding the loop variable late.
- `except:` breadth — what else gets swallowed besides the error the author meant;
  cleanup in `finally` or a context manager, not after the last statement.
- The GIL makes single bytecodes atomic, not compound operations — `d[k] += 1`
  from two threads is still a race. In asyncio, any blocking call inside a
  coroutine stalls the whole loop.
- Type hints as drift: annotations that no longer match what the function accepts
  or returns are the comment-accuracy axis wearing a different coat.
- Money and floats: `0.1 + 0.2` arithmetic anywhere near currency; `round()` is
  banker's rounding, which surprises ledger code.

## PHP

- Loose comparison: `==` where `===` was meant — `"0e42" == "0"` is true, and
  `in_array($x, $a)` without `strict` inherits the same rules.
- Injection at every interpolation: SQL, HTML, shell, header strings built with
  variables. Parameterization or a named escape at each one.
- `@` error suppression and APIs that return `false`-or-value: the check that
  distinguishes `0`, `""` and `false` is either `===` or a bug.
- Encoding: byte functions (`strlen`, `substr`) on user text that needed `mb_*`.

## Go

- Goroutine leaks: a send or receive with no cancellation path; whether the
  `context` actually reaches the blocking call, or stops one frame above it.
- Errors: `err` shadowed by `:=` in an inner scope, checked but not returned,
  compared with `==` where `errors.Is`/`As` was needed.
- `defer` inside a loop releases at function end, not iteration end — a
  file-handle or lock accumulation the happy path never notices.
- Slices: `append` aliasing a shared backing array, so a "copy" mutates its
  source; subslices pinning large arrays in memory.
- A mutex or a struct containing one copied by value is two locks that agree
  about nothing.

## JavaScript, TypeScript, Node.js

- Floating promises: async work nothing awaits; rejection paths that either kill
  the process or vanish, depending on runtime flags. Every `.then` without a
  `.catch` on a path that can reject.
- TypeScript trust boundaries: `as` casts and `any` where data actually enters —
  `JSON.parse`, network responses, `process.env` — turn the type system off at
  exactly the point it was needed.
- Event-loop blocking: synchronous fs/crypto/compression on request paths; a JSON
  stringify of something unbounded.
- Numbers: money or 64-bit ids in `number` drift past `2^53`; `===` on two
  objects compares identity, not value, and the test that "passes" this way tests
  nothing.
- Streams and emitters: an `'error'` event with no listener is a crash scheduled
  for production.

## Next.js

- The server/client boundary: secrets, database clients or server-only modules
  imported into a `"use client"` component ship to the browser; check what the
  bundle actually contains, not what the author intended.
- Caching semantics: `fetch` cache and `revalidate` flags versus the freshness
  the page claims; a route marked static that reads per-request data.
- Validation: route handlers and server actions are public endpoints — the form
  component's client-side checks are not a boundary.
- Middleware auth: does the matcher actually cover the routes the code assumes it
  covers? The gap between the two is the finding.

## UI code — any framework

Framework mechanics live in their own sections (SwiftUI above, React-family under
Next.js); this one is the interface itself, whatever renders it. Every probe here
is held to an external standard — the project's design system, WCAG numbers, the
product's own copy — because "I would have styled it differently" is not a finding.

- Tokens versus literals: a hardcoded hex or point size beside a design-token
  system is drift with a deadline; grep the literals, then ask which of the two
  sources of truth the next change will update.
- Theme coverage: diff the token tables, not the screens. A color the light mode
  defines and the dark mode never redefines is either deliberately mode-invariant
  (a brand hue) or forgotten — decide which by asking whether it still reads on
  the other ground, and file only the forgotten ones. Partial override is the
  normal architecture; asymmetry alone is not the finding.
- Contrast is computed, not eyeballed: WCAG 2.1 Level AA wants 4.5:1 for body
  text and 3:1 for large text — large meaning 18pt / 24px, or 14pt / 18.7px when
  bold — measured against the tinted ground it actually sits on. State the pair,
  the ratio, and the level you held it to (AAA is 7:1 / 4.5:1).
- The state ledger, per data-bearing view: loading, empty, error, disabled — and
  the in-flight window where a second tap double-submits. A view with only its
  happy state implemented is a finding with a count (N views, M with all states).
- Copy as contract: the label promises what the control does; error text names
  the fix, not the errno. Where UI copy contradicts actual behaviour, that is the
  comment-drift axis wearing pixels.
- i18n and length: strings concatenated in code break grammar in translation;
  layouts sized to English overflow under German labels (short strings expand
  200–300%).
- RTL is a direction problem before it is a length one: physical CSS properties
  where logical ones were needed (`margin-left` vs `margin-inline-start`),
  hardcoded `text-align: left`, icons and progress that never mirror, and bidi
  runs where a neutral character lands on the wrong side of a number. Searching
  for overflow finds none of these.
- When a preview, simulator or dev server can run, drive the real screen and say
  so; a UI claim made from code alone is honest only if it admits it never saw
  the pixels.

## Shell (bash)

- Quoting: every unquoted expansion is word-splitting and globbing on data the
  author did not choose. A filename with a space is the reproduction.
- `set -e` is not a guarantee: it is disabled inside conditionals and command
  substitutions, and a pipeline without `pipefail` reports only its last stage.
  `local var=$(cmd)` masks `cmd`'s exit status entirely.
- Destructive commands on computed paths: what does `rm -rf "$DIR/$SUB"` do when
  either variable is empty? If the answer is `rm -rf /`, that is the finding.
- Temp files: `mktemp` versus predictable names; test-then-use races on files
  another process can touch.

## SQL — MySQL, SQLite

- Injection: any query text concatenated from input — including `ORDER BY` and
  identifier positions, which parameter binding cannot cover and which therefore
  need an allowlist.
- NULL three-valued logic: `NOT IN` against a set containing NULL matches
  nothing; `= NULL` is never true; aggregates skip NULLs — except `COUNT(*)`, which
  counts rows, and `COUNT(*)` where `COUNT(col)` was meant is the everyday version
  of this bug — each is a correct-looking query returning a wrong answer.
- Index use: a string column compared to a number, a function wrapped around the
  indexed column, mismatched collations in a join — all silently turn index scans
  into table scans. A performance claim here is an `EXPLAIN` output, not a guess.
- Transactions: the isolation level the code assumes versus the one configured;
  read-modify-write without `FOR UPDATE` or an equivalent; migrations with no
  reverse path.
- SQLite specifics: type affinity accepts anything into any column; foreign keys
  are OFF unless the connection turns them on; one writer at a time is the
  concurrency model.
- MySQL specifics: silent truncation outside strict mode; `utf8` is not UTF-8
  (`utf8mb4` is); permissive `GROUP BY` modes pick nondeterministic rows.

## Prometheus and InfluxDB

- Cardinality: any label or tag drawn from an unbounded set — user id, request
  path with embedded ids, error text — multiplies series until the store dies.
  This is the single highest-yield probe in metrics code.
- Counter vs gauge: `rate()` over a gauge is noise; counter resets unhandled
  understate; a sum of averages is not the average anyone wanted.
- Windows: a `rate()` range shorter than twice the scrape interval reads as gaps;
  staleness rendered as zero fabricates recoveries.
- Retention and downsampling: queries that silently cross a resolution boundary
  compare full-resolution data with averaged data and report the difference as a
  trend.

## GPU — WebGL, OpenGL, Vulkan, DirectX, Metal

- Lifetimes versus frames in flight: a buffer freed or overwritten while a
  previous frame's commands still read it. Per-frame ring buffers must actually
  advance per frame; check the index arithmetic, not the comment.
- Synchronization: write-then-read across passes needs a barrier, fence or hazard
  the API does not insert for you (Vulkan, DirectX 12, Metal with untracked
  resources). GL is not exempt: image load/store and SSBO writes are incoherent
  and need `glMemoryBarrier` too. The classic OpenGL/WebGL form on the fixed
  pipeline is state leaking between draw calls — whatever the last draw bound is
  what the next one gets.
- Stalls: readbacks (`glReadPixels`, buffer maps, occlusion query waits) on the
  render thread mid-frame serialize the CPU against the GPU; the symptom is a
  frame-time cliff, the mechanism is here.
- Precision: half floats where positions or ids need full; depth-range and NDC
  conventions differ across these APIs, and a port that ignores it clips or
  z-fights only on one platform.
- Shader UB: out-of-bounds indexing into uniform or storage arrays; derivatives
  or barriers under non-uniform control flow.
- Silence: these APIs fail without a word unless validation layers or debug
  callbacks are on. The baseline must say whether they were — "no errors" with
  validation off is not evidence.
