# F30 — the git root is the nearest `.git`

## .fork

`getGitRepoRootOrNull` called `rhachet-artifact-git`'s `getGitRepoRoot`. that path costs about 570
module loads through a barrel, and it resolves a nested worktree (`.claude/worktrees/feat`, which
holds a `.git` file) to the enclosing repo.

| option | |
|---|---|
| a. keep the package call | pay about 570 loads per cli call, and keep the nested-worktree defect |
| b. walk up to the nearest `.git`, dir or file | no package import. a nested worktree resolves to itself |
| c. shell out to `git rev-parse --show-toplevel` | correct, but it spawns a child per call |

## .verdict — TAKEN, 85%, rework clean

(b). the nearest `.git` is what git itself treats as the root. both a `.git` dir (a repo) and a
`.git` file (a worktree or a submodule) end the walk. the defect and the thin entry went upstream
as `ehmpathy/rhachet-artifact-git#19` and `#20`.

## .why the confidence is not higher

this changes semantics for a caller that ran inside a nested worktree and relied on the enclosing
root. no such caller was found in `src/`. a submodule now resolves to itself too, which matches git.

## .rework

clean: one transformer, a call back to the package once it ships #19 and #20.

## .where

- `src/infra/git/getGitRepoRootOrNull.ts` · its integration test `[case3]`
