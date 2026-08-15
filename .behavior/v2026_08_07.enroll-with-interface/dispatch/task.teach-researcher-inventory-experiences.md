# radio dispatch — queued

## route

- **via:** os.fileops (radio/gh.issues blocked for now — enqueue as a file, promote to gh.issues later)
- **into:** rhachet-roles-bhuild
- **role:** researcher
- **kind:** lesson → brief
- **status:** QUEUED
- **origin:** ehmpathy/rhachet `enroll-with-interface` 1.vision drive (2026-08-07)
- **note:** target repo flagged — wisher named both `bhuild` and `bhrain`; routed to `bhuild` (the
  original full instruction). re-target to `bhrain` if the researcher role lives there.

## title

teach the researcher to maintain an inventory of experience — catalog worked, end-to-end product experiences

## description

### the lesson

as a researcher, maintain an **inventory of experience** — a catalog of worked, end-to-end product
experiences that demonstrate what a feature MAKES POSSIBLE. each experience is a concrete, runnable
sequence (commands, interactions) plus a short note on WHY it is notable — the moves that compose, the
edge cases it exercises. capture cool experiences the moment you find them, so a feature's value is
legible through lived scenarios, not a spec alone.

### the shape

inventories follow one shape — a catalog file plus one file per case:

- `inventory.of=experience._.md` — the **catalog**: an index table, one row per case, each linked
- `inventory.of=experience.case=<slug>.md` — one file **per case**: the story + the command sequence +
  a note on why it is notable

contrast the patterns across cases — e.g. two cases that reach the same shape by different means
(clone forks vs actor composition) teach the surface more than one case alone.

### the why

a spec says what a feature does; an experience shows what it makes possible. a catalog of lived
scenarios:

- surfaces the max-boundary critipaths early — the single path that exercises the most seams at once
- doubles as an acceptance-test mandate — each experience is a critipath to exercise AND clamp
  (`rule.require.clamp-edge-cases`), so the inventory and the test suite reinforce each other
- adds to the product's story as the team finds cool compositions — the value compounds

### the ask

add a researcher brief — e.g. `howto.inventory-experiences.[guide].md` — plus a rule
`rule.require.experience-inventory-shape` (the `_.md` catalog + `case=<slug>.md` files). frame it as:
for every notable feature, catalog its worked experiences, contrast the patterns, and mandate each as
an acceptance critipath. pairs with behaver `philosophy.verification-strictness` and mechanic
`rule.require.clamp-edge-cases`.

### evidence

this drive built the first such inventory, for the actor/clone surface:
`.agent/repo=.this/role=user/briefs/actors/inventory.of=experience._.md`, with two cases that contrast —
`case=2.redteam-fan-out` (clone forks) and `case=1.surf-school-crew` (actor composition). the
`enroll-with-interface` 1.vision mandates each as an acceptance critipath to exercise and clamp.
