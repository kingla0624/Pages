# Evals for deep-review

Everything needed to check whether a change to the skill helped, hurt, or did
nothing. It exists because the first two rounds of this were run out of a
scratch directory and the scripts were gone within the day — the conclusions
survived only as prose in commit messages, and nothing could be re-run.

```
fixture/            settle-ledger — 8 files, 8 of 8 tests green, defects planted
ground-truth.mjs    proves what the fixture contains, and what only looks broken
criteria.md         the bars, and where each came from
```

## Running one

**Check the fixture first.** Everything else assumes it.

```bash
node ground-truth.mjs
```

Expect 5 defects present, 3 traps correct, exit 0. A non-zero exit means the
fixture drifted and grading against it would be measuring the wrong thing.

**The cheap gate — no agent needed.** Catches a broken bundled runner in about
fifteen seconds:

```bash
node ../scripts/mutate.mjs --root fixture --test "node --test" --src src --max 999
```

Expect `64 mutants, 41 killed, 23 survivors`.

**The full round.** Give an agent the skill and this prompt, on its own copy of
`fixture/`:

> 帮我对这个仓库做一次彻底的 code review，我要能信得过结果。

Then grade the files it wrote against `criteria.md`. For an A/B, run a second
agent on the same prompt and an identical fixture copy with no skill.

## Four rules the earlier rounds paid for

**One fixture copy per run.** Four agents against one directory corrupt each
other's evidence. Copy per run, and `diff -rq` afterwards — a run that modified
the fixture has invalidated itself.

**Fix the bars before the results land.** Written into `criteria.md`, not
adjusted once the output is visible.

**Score the reverse case too.** T1–T3 exist so that "did not fabricate" is
measurable. Without them the precision column read 100% for every run and meant
nothing, because nothing in the fixture tempted a false positive.

**A saturated column is a broken fixture.** Round 1 had every configuration at
100% detection. That says the fixture cannot discriminate, not that the subject
is good.

## What it costs

Roughly 150k–185k tokens per agent run; a two-prompt A/B is four runs. Not a
per-commit check. Worth it when a change plausibly moves behaviour — the
regression gates in `criteria.md` are exactly the behaviours that broke before.

The cheap gates — `ground-truth.mjs` and the mutation run — cost nothing and
should run on any change to the fixture or to `scripts/mutate.mjs`.

## What earlier rounds measured

Two A/B rounds, eight runs, plus three single-run verifications:

- Detection was **identical** on the round-1 fixture (single-file defects) and
  **100% vs 80%** on this one. The gap is cross-module defects
- Method discipline was **+20 points** in round 1 and **level** in round 2 —
  the baselines improved. No capability gap survived both rounds
- Severity went **backwards once**: both skilled runs dropped a low-reachability
  finding both baselines filed. That is gate R1
- Precision was level in both rounds, including with traps present
- Cost was stable at about **1.5×** a plain thorough review

The honest summary: the measured benefit is narrow, it moved between rounds, and
it would not have been visible without running this.

## Known gaps

The independent-verifier mechanism at the centre of the skill has never been
exercised — subagents cannot nest, so every graded run fell back to the degraded
serial protocol. Invoked directly the skill can fan out, so these numbers
understate it, and the mechanism most likely to matter is the one still
unmeasured.
