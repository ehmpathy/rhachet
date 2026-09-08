# domain.term.choice.reason: fault

## .etymology

from the **fault / error / failure** chain of dependability engineers, where the three are distinct
by construction: a *fault* is the defective condition, an *error* is the wrong state it produces, a
*failure* is the observable deviation. we adopt only the first link, and we bind it to a narrower
question than that literature asks — **whose** condition — because that is the question a catch has
to answer.

the word also carries its plain-english sense of blame (*"the fault is not yours"*), which is
exactly the sense the split turns on. `error` carries no blame at all, which is why it cannot do
this job.

## .evidence — three review lanes converged on the boundary, independently

`getRhachetRealpathFromProcess` shipped a bare `catch { return null }` under a long docblock that
defended the unconditional shape, since a throw there would destroy the report it decorates. three
scoped peer lanes raised it as a blocker in one round, from three different rubrics:

| lane | rubric | what it named |
|------|--------|---------------|
| r2 | `rule.forbid.failhide` (mechanic) | no allowlist; the rule's carve-out demands one |
| r6 | `rule.forbid.maintenance-hazards` (behaver) | a confident wrong diagnosis that masks the real defect |
| r7 | `rule.forbid.behavior-hazards` (behaver) | a bug in this code rendered to a human as *"your install is damaged"* |

r7 named the repair the other two implied: catch only what carries a filesystem `code`, and let
every other throw propagate.

⚠️ **the docblock's objection was half right, and that is what the word settles.** it argued that a
closed list of codes (ENOENT / EACCES / ELOOP) would rethrow on an overlay fs or a chroot — the
exotic hosts the guard exists for — and it was correct. what it missed is that the set to allowlist
was never a set of *codes*; it is the set of *faults*. read by shape, the allowlist stays open at
the errno axis and closed at the blame axis, so both objections are answered at once.

## .the disputes

no dispute is open. the word was coined rather than argued, because the concept had no prior name
here — the codebase held `unreadable` for the VERDICT and no word at all for the CAUSE, which is
precisely why the catch could be written unconditionally with nobody able to name what was wrong.

## .the invariant

> a catch may answer a **fault** with data. it must rethrow a **defect**.

checkable: a `catch` whose body returns a value on every path, with no membership test that
separates the two, violates it.

## .see also

- `term=unreadable._.choice._.md` — the verdict a fault yields
- `term=probe._.choice._.md` — the read whose absent answer is expected; a probe's miss is data,
  a probe's fault is a host condition
- `rule.forbid.failhide` (ehmpathy/mechanic) — the rule the split satisfies
