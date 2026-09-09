# Criteria

Fixed before a run returns, never after. Adjusting a bar once you have seen the
output is how an eval starts confirming what you already believed.

Grade from the deliverable files, not from what the run says it did. Every round
so far has had at least one run whose summary omitted something its own register
contained, or claimed something the files did not support.

## Regression gates — all must hold

These five behaviours were each broken once, fixed, and confirmed by a fresh
run. They are the reason this directory exists: they are known to be load-
bearing, and known to be reachable from specific sentences in the skill. Any
edit to `SKILL.md` — a trim above all — has to leave every one of them firing.

| | Gate | Where it came from |
|---|---|---|
| R1 | `averagePositionCents` is **filed as an entry, graded Low**, with "no reachable path" stated | Both round-2 skilled runs dropped it entirely while both baselines filed it. The severity rule capped existence instead of severity |
| R2 | Method **names the verification protocol** — independent verifiers, or the degraded serial one | Phase 4 had no degraded protocol; every run invented one |
| R3 | Verified correct opens with **one disposition per standing lens** (swept-clean / filed / not-applicable / unswept) | The lens rule lived only in phase 2 and never reached the report. The unwalked performance lens cost a real finding |
| R4 | Sweeps distinguish **exhaustive from a declared sampling frame** | Unbounded domains were being reported as if swept exhaustively |
| R5 | The claim ledger uses **raised / confirmed / refuted / open** and no fifth word | "Survived" was drifting in as a separate state |

Two more that are cheap to check and catch a broken toolchain:

| | Gate |
|---|---|
| R6 | The bundled `scripts/mutate.mjs` ran — expect **64 mutants, 41 killed, 23 survivors** on this fixture — and no hand-rolled harness replaced it |
| R7 | Baseline reported accurately: **8 of 8 tests passing**, not a git repository, no build step |

## Detection — what the fixture actually contains

Run `node ground-truth.mjs` first. It proves each of these, and exits non-zero
if the fixture has drifted out from under the criteria.

| | Defect | Notes for grading |
|---|---|---|
| X1 | `settle.js` strips the fee sign with `Math.abs`; the `kind` field its comment credits is never read | **Grade the contradiction, not the verdict.** Which side is the bug — the code or the comment — is undecidable from the repository: a round-2 baseline argued the current behaviour is economically right, re-measurement agreed, and the trial's own ground truth had it wrong. Either verdict scores; missing the contradiction does not |
| X2 | Two individually valid orders net to zero, and `netOrders` divides by it | `NaN` at equal prices, `-Infinity` otherwise |
| X3 | The 8-character display truncation is used as the ledger key | Distinct symbols merge |
| X4 | `isBalanced` cannot return false for a ledger `post()` built | Wording varies — "tautological", "only checks the last row" — both name the same hole |
| R1 | `averagePositionCents` returns `NaN` on an empty book, with no caller in `src` | Also gate R1 above: filing it is the point, and Low is the ceiling |

Cross-module by design: X1, X2 and X3 are each correct in the file you are
reading and wrong in composition. Single-file review finds X4 and R1 and stops.

## Precision — three passages that must NOT be filed

Correct code that reads as defective. Filing one is a scored miss, and the
reverse gate matters more than the forward one: adding review probes risks
manufacturing findings, and nothing else in this directory measures that.

| | Trap | The tempting misreading |
|---|---|---|
| T1 | `===` in `isBalanced` | "Float equality on money." The amounts are integer cents; the real defect on that line is X4 |
| T2 | `allocate`'s `Math.sign`/`Math.abs` | "Sign handling looks wrong." It sums back exactly, 60,006 pairs, negatives included |
| T3 | `balanceColumn`'s `i <= lastIndex` | "Off-by-one." `lastIndex` is documented inclusive and callers pass `length - 1` |

A run that engages a trap and refutes it with measurement scores the same as one
that never raises it. What fails is filing it as a defect.

## Findings that are real but unplanted

Runs have surfaced these, and each was independently re-measured and held.
Reporting one is not a false positive:

- The fee tier is non-monotonic: $1,000.00 costs 250c, $1,000.01 costs 120c
- `postAll` is quadratic — it rebuilds the array per entry
- `settleBatch` validates nothing, so a string quantity concatenates
- `validateOrder` accepts fractional cents
- The fee depends on how orders are chunked into batches — **found by both
  skilled runs and neither baseline**, the only measured detection advantage in
  two rounds, and it did not recur in a later single run

## What a result does and does not license

Detection saturated at 100% on both configurations in round 1. That is a
**failure of the fixture**, not evidence the subject is good — a column where
everything passes has no discriminating power and supports no conclusion.

Two prompts, one run each, is enough to see a group flip sign between rounds and
not enough to put an error bar on any single number.
