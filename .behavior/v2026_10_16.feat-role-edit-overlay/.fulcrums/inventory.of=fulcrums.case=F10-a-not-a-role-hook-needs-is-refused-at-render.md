# F10 — a `not` of a skill a role hook invokes is refused at render

## .the fork

when a mod's `not:` removes a skill that one of the role's own hooks invokes:

- **A — refuse at render**, name the hook, offer a shadow (taken)
- **B — warn at render, let the hook fail at runtime**
- **C — also drop the hook that names it**

## .taken, and why

A. a hook failure lands at its next event, far from the mod that caused it — the slowest and
quietest of the three outcomes. C mods hooks, which v1 refuses (hooks write `settings.of.repo.json`,
actor config). A is the only form that fails fast and teaches the fix in the same breath.

## .rework

clean. the refusal is one check at render; a switch to B is a downgrade of exit 2 to a warn.

## .confidence — 75%, and why it is short of 93

- the matcher must read hook command strings (`rhx <skill>`, `run --skill <skill>`), and their full
  set of forms is uncensused (yield question 8)
- a hook may invoke a skill indirectly (a skill that calls another); A catches only the direct name

## .risk

low — the taken branch fails fast; a wrong call is a downgrade to a warn. the residual miss, an
indirect invoke, fails at the hook's next event, which is no worse than the state before this wish.

## .where

- `1.vision.yield.md` — the refusal table, question 8, the case 9 row
- `1.vision.experience.case=9.shadow-and-not-a-skill.md` — [t4] and its stderr sketch

## .verdict

open — raised by the i004 experience-coverage lane.
