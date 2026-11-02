# F8 — a part-way init re-renders the boots before it syncs the hooks, as the clean path does

- **fork:** on a part-way fault under `--hooks`, (a) sync the hooks to the linked roles alone, then
  rethrow — the blueprint's gate order (`3.blueprint.yield.md`, role loop row); or (b) run the same
  boots-then-hooks step the clean path runs (`syncBootsThenHooks`), then rethrow
- **taken:** (b). the hook sync writes the boot hooks, and a boot hook reads `boot.md`. under (a) a
  fresh clone whose first role init fails gets boot hooks that point at a `boot.md` no step rendered,
  so every next session boots with no briefs. the clean path already holds the rule "a repo never
  drops its boot hooks before boot.md exists" (`invokeInit.ts`, the boot sync note); (b) keeps one
  order for both paths, so the part-way path cannot drift from it
- **why (a) is a real contender:** it is what the blueprint wrote, and it is the smaller act: a
  part-way run that also re-renders boots does more work in a run that already failed, and a boot
  fault there is reported beside the role fault rather than alone
- **rework:** clean — the catch calls `syncHooksForLinkedRoles` in place of `syncBootsThenHooks`; the
  clamp (`init.preflight.acceptance` [case3]) asserts the hook sync line either way
- **confidence:** 75%. it changes which steps a failed run takes, so it is the commander's (seed S1)
- **where:** `src/contract/cli/invokeInit.ts` — `syncBootsThenHooks`, and its call in the absolute
  mode catch
- **verdict:** —
