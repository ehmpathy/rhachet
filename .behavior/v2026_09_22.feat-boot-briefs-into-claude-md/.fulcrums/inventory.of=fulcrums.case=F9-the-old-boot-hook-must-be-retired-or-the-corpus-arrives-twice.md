# F9 — the role boot hook is retired, or the corpus arrives twice

## .fork

the chain is role manifest → the repo's tracked `.claude/settings.json` → the enroll projection. while
the hook lives, a clone gets the corpus whole in `boot.md` **and** a 2 KB preview of it through the
hook — two versions of its briefs, one of them false.

| option | verdict |
|---|---|
| a. role packages drop `onBoot` | ❌ cross-repo — a dream (S5) |
| **b. `rhx init` · `rhx upgrade` delete the synced hook** | ✅ **taken** |
| c. the enroll projection filters it | ❌ leaves the tracked file stale; a bare `claude` still fires it |
| d. defer, as #398 did | ❌ ours is "both paths engage", worse than either alone |

## .verdict — RULED (S17): (b), on both `init` and `upgrade`

- **predicate:** author is a linked role **and** the command is `roles boot` (`isRolesBootCommand`,
  every argument form: `--role X`, `--repo X --role Y`, `--if-present`).
- `assertRegistryBootHooksDeclared`, which demands the hook, is deleted — it lives in this repo.

## .grounds

- the author tag alone would also delete the `route.drive --when hook.onBoot` hook: one role authors
  both. the command conjunct keeps our own neighbour; the author conjunct keeps a human's hooks.
- the vendor prescribes the cure: *"A `SessionStart` hook that prints `AGENTS.md`: remove it."* —
  `/docs/en/hooks`.
- the drop lands in discovery (`getLinkedRolesWithHooks`), so the extant per-author reconcile deletes
  the hooks with no new delete path.

## .where

- blueprint D3 · journey [t0], [t1] · criteria usecase.3 · seeds S5, S17
