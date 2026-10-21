# F23 — a clone is a leaf by its door, never by its roles

## .the fork

#577 says reviewer clones are leaves, and *"the enroll that mints a reviewer marks the child
leaf"*. what makes a child a reviewer?

- **(a) the door** — a print-mode enroll (`rhx enroll … -p`) and every repl-door child
  (`rhx review`, `rhachet ask`, `rhachet act`) mints a leaf; the mark rides the child env as
  `RHACHET_CLONE_LEAF=1`, and both doors refuse a caller that carries it
- **(b) the roles** — a child enrolled with the `reviewer` role is a leaf
- **(c) the S68 patch** — a print-mode enroll is a leaf; the repl door is left as it was

## .taken — (a), and why at the time

- **(b) fails on the first case.** the ambient actor (`actor.via.repo=ambient`) carries the
  `reviewer` role, so every everyday `claude` would read as a leaf and could run no review
- **a repl child IS a reviewer** in every extant use: `rhx review` spawns one brain to answer a
  rubric and return. a repl brain that could enroll would be a reviewer that fans out, the
  defect this route exists to repair — so (c) leaves the original hole open at the third door
- **a print-mode child answers one prompt and exits** — the shape of a reviewer, and the one
  mark the enroll door can read from its own argv. the detached host re-derives it from the argv
  it replays, so no handoff key is added
- the mark is env, never disk: the catalog's sync invariant forbids a per-clone file that does
  not derive from this run, and the depth already rides env by the same reason

## .rework — clean

the leaf verdict is one transformer (`isCloneSpawnChildLeaf`); to change which doors mint a leaf
is a one-line edit there plus its cases.

## .confidence — 85%, and why it is low

an interactive enroll may also mint a reviewer (a human types *"review this"* into a session).
that clone reads as a work clone and may spawn. the vision does not say whether that is in scope.

## .where

`src/domain.operations/spawn/isCloneSpawnChildLeaf.ts` · `asCloneSpawnPlaceEnv.ts` ·
`withCloneSpawnDepthScope.ts` · `src/contract/cli/invokeEnroll.ts`

## .verdict

— (awaits the commander)
