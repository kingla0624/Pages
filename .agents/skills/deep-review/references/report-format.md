# The findings register: structure and writing rules

The register is not a bug list. It is a document a reader can act on without
re-verifying it, which puts most of the burden on how each entry is written.

## Anatomy

| Section | Carries |
|---|---|
| Masthead | Project, platform, branch @ commit, lines · files. Then a standfirst: what was read, how, and the honest headline — including what is good. |
| Ledger strip | Build, Tests, Fixed, one cell per severity you actually filed, and the claim-ledger cell — its value is the confirmed count, its note carries refuted and open (`Verified 57` / `3 refuted, 1 open`); the raised total belongs in Method. Each cell has a label, a value, and a one-phrase note. |
| The register (the findings list) | The findings, highest severity first, with severity filter chips. |
| Verified correct | What was checked and found sound. |
| Method | Axes, verifier instructions, claim ledger, what was reproduced and how, and the corrections made to your own earlier claims. |

Do not drop "Verified correct" or "Method". They are what separate a register from
an unsourced list of complaints — the first shows coverage, the second shows how much
weight each entry can bear.

## A finding

```
01  Medium  Fixed  Reproduced  re-graded from High
    A base-price step lands two custom legs on one strike, and the collapse persists
    Option/State/AppModel.swift:726 · the identical loop again at :782

    Mechanism  ...
    Fails      ...
    Fixed      ...
```

**Number** entries sequentially in final severity order, so `03` is always more
serious than `40` and the numbers stay stable as reference handles.

**Badges**, in this order:

| Badge | Means |
|---|---|
| `Fixed` | Applied and mutation-verified in this pass. |
| `Open` | Neither confirmed nor refuted after verification; the entry states what would settle it. Hedged wording is legitimate here and only here. |
| `Reproduced` | Re-derived outside the reviewing agents. Keep scarce. |
| `re-graded from High` | Severity changed during verification. Always show it. |
| `Owner's call` | Real state, but the owner already decided it. Not a defect. |

## The title is a sentence, not a label

This is the rule that most changes how the report reads. A title states the wrong
behaviour, in a full sentence, so the register can be skimmed without opening
anything.

Good:

- *The strike stepper jumps a leg to the far band edge, against the button pressed*
- *Re-tapping the already-highlighted "Index" chip drops every pillar's ATM vol by 5.4 points*
- *The calendar-arb detector is only ever asserted false, so a constant-false mutant passes*
- *Sixteen of the nineteen catalog templates have no test, and the dictionary is force-unwrapped*
- *Formatters print a signed zero: "−$0.00", "−$0", "−0.0%"*

The same findings as a normal review would title them — *Stepper clamp bug*,
*Chip re-tap issue*, *Weak test assertion*, *Missing coverage*, *Formatter issue* —
carry almost no information. The reader has to open all five to learn anything.

Two patterns do most of the work:

- **Subject does wrong thing**: name the actual component, the actual action, the
  actual wrong outcome. Numbers in the title are good (`5.4 points`, `Sixteen of the
  nineteen`).
- **, and the twist**: a trailing clause carrying the part that makes it worse — the
  persistence, the inversion, the reason the existing test does not catch it.
  *"…and the collapse persists"*, *"…against the button pressed"*, *"…so a
  constant-false mutant passes"*.

Keep it to one line at reading width. If it needs two, the finding is probably two
findings.

## Location

`path/File.ext:LINE`, plus any second site of the same defect after a `·`. When a
defect is duplicated, one entry with both locations beats two entries — and the
duplication itself is usually worth its own low-severity entry.

## The blocks

Every finding has **Mechanism**. Most have **Fails**. Findings you are acting on have
**Fix** or **Fixed**. Non-defects use **Left alone** or **But deliberate**.

### Mechanism — why the code does this

The causal chain, naming the real functions in code spans. Reach for the property
that makes the failure *inevitable* rather than restating the symptom:

> Both `adjustBasePrice` and `resetMarketDefaults` rescale each custom leg by
> `newValue/oldValue` and snap to the new grid. A contraction composed with grid
> snapping is *never injective*, so two legs one grid unit apart can round together.
> There is no collision check, and the trailing `persistMarket()` commits it;
> `Leg.sanitizeForLoad` does not repair it on relaunch.

"Never injective" is the whole finding. Everything else follows from it. Look for the
one sentence like that in each finding and lead with it.

### Fails — the concrete failing case

Real values, and how far it is from a default state, counted:

> Reachable in **one "−" tap from an ordinary session, three from a fresh install**:
> chain-tap 125 and 127.5 into a custom, then Base price "−" once (100 → 95) — both
> become 120. An exhaustive sweep
> of every reachable transition found **50** colliding strike pairs: every downward
> step collapses two, and 145 → 150 (grid 2.5 → 5) collapses sixteen at once.

Three things earn their place: a specific reproduction with numbers, a reachability
count, and a sweep total. If a block has none of them it is prose, not evidence, and
the finding is not ready to file above Low.

Also state the consequence when it is not obvious: *"Same-sign legs become a doubled
position; opposite-sign legs become identically zero payoff and zero cost."*

### Fix / Fixed — what changes, and what must keep working

Name the invariants the fix preserves, not just what it changes. A fix described only
by what it breaks is indistinguishable from a regression:

> Legs the rescale collides are reopened onto the next free grid slot in ascending
> strike order, so a two-leg spread keeps its exact width. Only legs of the same
> *instrument and expiry* compete, so a straddle's call and put stay together.
> Post-fix sweep: **0** collisions over 14,596 cases, no order inversions.

Close with the after-number beside the before-number. `50 → 0 over 14,596 cases` is
the sentence the reader was waiting for.

## Severity

| | Bar |
|---|---|
| **High** | Reachable in ordinary use and destroys data, money, or correctness with no recovery. Expect to file none. If you have one, it should already have been reproduced — and, when the user asked for fixes, fixed first. |
| **Medium** | Real, reachable, and worth scheduling. Wrong output, silent data corruption a user could hit, tests that cannot fail. |
| **Low** | Polish, drift, duplication, missing coverage, copy that contradicts behaviour — and anything real whose reachable path you could not find. Genuinely worth listing: most registers are mostly Low, and that is a healthy shape. |

If a severity cannot be defended with a reachability count, it is one level too high.
The floor of that rule is Low and filed, never dropped — say on the entry that no
reachable path was found, and let the reader weigh it. Silence reads as "not present",
which is the one thing you know is untrue.

## Verified correct

Open the section with the **lens dispositions** — one line covering every standing
lens (security, performance, architecture, readability and conventions, and
product/UI when an interface exists), each dispatched one of four ways: swept and
clean (name the sweep and its size), findings filed (name the entries), not
applicable (name why), or unswept (name what stopped it). The reader must be able to
tell an unswept lens from a clean one at a glance; without this line, silence claims
clearance it never earned. Keep these dispositions above and outside the itemised
checks — they are a coverage statement, not derivations, and filing them under a
derivations heading claims a rigour they do not have.

Then group the itemised checks under a heading naming the standard, e.g. *Derived
independently, not read off the comments*. Each item: bolded subject, then what it
was checked against and the tolerance it held to.

> **Black–Scholes–Merton.** Price and all five greeks confirmed against central finite
> differences for both kinds; put–call parity to 1e-9; theta per calendar day, vega
> per vol point, rho per rate point, gamma's denominator all correct.

Vague reassurance ("the math looks right") is worse than saying nothing — it claims
coverage without evidence.

## Method, and recording your own corrections

The Method section carries the axes, what verifiers were told to do, and the claim
ledger. It also carries your errors, in plain terms:

> All four were confirmed, **and all four were over-graded on the first pass**. Two
> other first-pass claims were wrong on detail and are corrected in place — the suite
> has 44 test symbols, not 45, and entries 01 and 02 are reachable in one tap from an
> ordinary session, not the nine and ten I first wrote.

Correct in place rather than appending errata, and say in Method what was corrected.
A register that never corrects itself has not been checked hard enough to be trusted,
and a careful reader knows it.

## Voice

Plain declarative sentences. Numbers in `<span class="num">` so they carry visual
weight. Identifiers in `<code>`. Never hedge a confirmed claim —
"appears to" and "may" belong only on entries genuinely marked open, and one honest
`Open question` entry is better than ten hedged ones.
