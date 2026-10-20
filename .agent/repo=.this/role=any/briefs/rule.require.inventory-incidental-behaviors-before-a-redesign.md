# rule.require.inventory-incidental-behaviors-before-a-redesign

> **before you replace a design, list what the old one did that nobody asked for. each item is kept on
> purpose or dropped on purpose — never lost by accident.**

an **incidental behavior** = a behavior humans rely on that no requirement, test, or doc ever stated.
it held because of how the old design happened to be built, so the only record of it is the old code.

## .why

- a redesign is checked against what was asked for. an incidental behavior was never asked for, so
  no check can see it vanish — every test stays green while humans lose it
- humans do not know a behavior was incidental. to them it was just how the product works, and its
  loss is a regression
- the old design is the only witness, and the redesign deletes it. after the merge, the behavior must
  be reconstructed from a bug report

## .the test

> **"what does the old design do for its readers that no requirement names?"**

read the old design's outputs, not its intent: what files it wrote, what each reader loaded, what a
default produced, what a side effect left behind. for each item:

| the item | the move |
|---|---|
| the redesign still does it | note it, and give it a test so the next redesign sees it |
| the redesign drops it, and that is right | drop it on purpose — a recorded decision, a changelog line |
| the redesign drops it, and that is wrong | it is a requirement now. add it before the merge |

## .the cues

| when… | then… |
|---|---|
| you replace a file, a layout, a default, or a code path wholesale | 🔴 the strongest cue. inventory before you delete |
| the old design "just worked" for a case you never tested | that case is incidental. name it |
| the redesign's requirement list is written fresh, from the new design's view | it lists what the new design does. ask what the old one did |
| a migration moves data but not behavior | the behavior is the part humans notice |
| a human reports a regression the tests did not catch | an incidental behavior was lost. add it as a requirement, then fix it |

## .the worked case — rhachet pr #600, v1.49.2

before the split layout, `<repo>/.claude/settings.json` was a real file of the repo's hooks. so a
plain `claude` at the repo root loaded them through claude's project layer. no requirement said so;
it held because of where the file sat.

the split re-pointed that file at the machine's own settings. the same pr wrote a requirements
inventory, cases 1–9 — every one from the enrolled clone's view. the plain session's behavior was not
on it, so its loss passed every check. a downstream repo found it a release later.

## .the second case — inventoried, and dropped on purpose

when each actor's `settings.json` became an arrow to the machine's settings, a `/model` choice in a
clone stopped to persist: claude forks the arrow, and the next layout findsert restores it. this was
measured, put to the wisher, and ruled a deliberate drop (2026-09-28) — and the layout brief now says
so. the same kind of loss as the first case, but decided rather than found.

## .the boundary

| fires | does not fire |
|---|---|
| a design replaced or restructured | a change that adds behavior and removes none |
| a behavior visible to a human or another system | an internal detail no reader can observe |

## .enforcement

- a redesign merged with no inventory of the old design's incidental behaviors = **blocker**
- an incidental behavior dropped with no recorded decision = **blocker**

## .see also

- `rule.forbid.dropped-behavioral-requirements` — guards the requirements already stated; this finds
  the ones never stated
- `rule.require.reader-table-before-a-shape-change` — the per-reader form of the same inventory
