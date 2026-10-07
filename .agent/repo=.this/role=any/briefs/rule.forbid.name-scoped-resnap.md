# rule.forbid.name-scoped-resnap

> **a `--resnap` is scoped by `path://` alone. never by `name://`. a name scope makes jest delete
> every snapshot it skipped.**

```sh
👍  rhx git.repo.test --what acceptance --against local --env test --mode apply --resnap --scope path://roles.cost.acceptance
👎  rhx git.repo.test --what acceptance --against local --env test --mode apply --resnap --scope path://roles.cost --scope name://case13
```

## .why — `-u` plus a name filter = every skipped snapshot reads as obsolete

`--resnap` passes jest `-u`. `name://` passes `--testNamePattern`. jest marks a snapshot obsolete
when no test in the run wrote it — and a test the name filter skipped writes none. under `-u`,
obsolete means **deleted**.

so a resnap aimed at one case rewrites that case, and silently erases the rest of the file.

🔴 **measured 2026-10-06**, `ehmpathy/rhachet` @ `beav/feat-boot-manifest-and-budget`:
`--resnap --scope name://case13` on `roles.cost.acceptance` ran 10 of 95 tests and dropped **412
lines** of snapshot. the run reported green. the loss showed up only in `git diff`.

⚠️ the green is the trap. the suite passes, because the tests that ran match their new snapshots.
the deleted entries fail no test until the next full run — which, with no snapshot left, writes
them fresh and passes again. ⇒ a regression in the skipped cases is never compared against its
prior render.

## .the repair, when it already happened

- 🔴 do NOT restore the `.snap` from the index — the staged copy may predate later fixes, and the
  restore would pin a stale render
- re-run the resnap scoped by `path://` alone, over the whole file. every snapshot regenerates from
  live code, and `git diff` on the `.snap` then shows only the changes the code made

| when… | then… |
|---|---|
| you want to resnap one case | resnap its whole FILE by path. the other cases rewrite to the same bytes |
| a name scope is useful to iterate | run it WITHOUT `--resnap`. read-only runs flag obsolete entries but delete none |
| a name-scoped run exits non-zero on `N snapshots obsolete` with 0 failed | expected, and harmless without `-u`. the full-file run is the proof of record |
| `git diff` on a `.snap` shows a mass of `-` lines after a resnap | check the scope you passed before you trust the run |

## .enforcement

- `--resnap` with a `name://` scope = **blocker**
- a `.snap` restored from the index to undo the damage = **blocker** (resnap by path instead)

## .see also

- `rule.forbid.blanket-resnap-after-rebase` — its peer, from the wide side: never resnap wider than you verified
- `rule.require.snapshot-verified-on-independent-run`
