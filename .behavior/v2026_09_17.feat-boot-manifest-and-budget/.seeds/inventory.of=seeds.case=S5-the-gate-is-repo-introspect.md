# seed S5 — the gate hooks into the introspect operation the build already runs

**caught 2026-09-18, at the `1.vision` approval gate, in answer to no question of mine.** the wisher
read the day-in-the-life and redirected the gate's position.

---

## .said

> the repo manifest introspect should fail; the role packages run a "compile" or "manifest"
> operation or "introspect" operation already in their build flow. that's where we should hook the
> budget in

*(quoted against the vision's own day-in-the-life, and specifically against its closing line: "the
trim happened at authorship, in the author's own hands, in under a minute.")*

---

## .settled

**the budget gate hooks into `repo introspect` — the operation every role package already runs in
its build flow, pre-publish.**

⇒ `invokeRepoIntrospect.ts:82-92` is **already four `assertRegistry*` guards in a row**, each
documented *"fail fast at repo introspect"*. the budget guard is the **fifth peer** at line 93:

```ts
assertRegistrySkillsExecutable({ registry });   // :83
assertRegistryBootHooksDeclared({ registry });  // :86
assertRegistryHooksNoNpx({ registry });         // :89
assertRegistryHasNoOrphanBriefs({ registry });  // :92
assertRegistryWithinBudget({ registry });       // 🔴 :93 — the new one
```

**no new mechanism, no new error shape, no new invocation for an author to learn.** `npm run build`
already reaches it via `build:complete:repo`, on the path to `prepublish`.

## 🔴 .why it is the right position, and it is not merely "earlier"

the vision's aha-line claimed the trim happens *"in the author's own hands"*. **at a boot-time gate
that claim is false**, and the vision's own measurement says why:

| the gate reads | writable by the halted party? |
|---|---|
| `.agent/repo=*/role=*/boot.yml`, in a consumer repo | 🔴 **13 of 15 are symlinks** into a version-pinned store |
| `src/domain.roles/*/boot.yml`, at introspect | ✅ **git-tracked regular files** — 3 of 3 measured in `rhachet-roles-ehmpathy` |

🔴 **git cannot track a symlink into `node_modules`.** so a spec introspect can see is writable **by
construction** — the ownership hazard `F10` found does not merely soften at this gate; it cannot
arise at all.

## 🔴 .what it says about my conduct — `F4` was posed one level too low

`F4` spent **96% confidence** — the highest in the set — on a fork whose three options were all
lines in the render path. **the right answer was absent from that set**, so no amount of confidence
in the choice could have reached it.

⇒ `rule.always.reuse-pavement-before-improvise`, failed: a four-member guard family sat in
`src/domain.operations/manifest/` with a `.why` naming this exact job, and I never looked, because
the fork I had posed did not admit the answer.

🟡 **the durable check: before you grade your confidence in a CHOICE, grade your confidence that the
OPTION SET is complete.** `rule.require.enumerate-before-you-name`, applied one level up — to
options rather than to words.

---

## .landed

- 🔴 **wish requirement 9** — the halt fires where the author can write the file
- `F4` flips from `answered, 96%` to **REFUTED then RE-DECIDED by the wisher, 99%**. it is one of
  only two rows in the inventory where the wisher displaced my **question** rather than my answer
- 🔴 `1.vision.experience.dimensions.md` gains **axis H — the GATE**, and the inventory gains six
  cells (`H1`–`H6`), of which `H2` is the walk's first genuinely **impossible** cell
- `case=8.introspect-refuses-the-build` — the demo for cell `H1`
- 🔴 **`F10`'s forward risk is closed from the other side**: an upstream author's own build refuses
  the over-budget version **before publish**, so the consumer halt F10 feared can no longer be
  produced
- ✅ **`F4`'s one stated doubt is discharged** — the per-resource loop it worried about is moot, since
  `S6` struck the per-resource list entirely
- 🔴 **the durable lesson:** a gate belongs where the halted party can act, and *"earlier in the
  pipeline"* is a proxy for that — never the criterion itself. check **who can write the file the
  halt names.**

⇒ **refined by `S7`**: introspect is **additive**, never a replacement. it is structurally blind to
every spec outside a `rhachet-roles-*` package — the route-scoped `--manifest` among them, which is
the payload this whole wish exists to fix.
