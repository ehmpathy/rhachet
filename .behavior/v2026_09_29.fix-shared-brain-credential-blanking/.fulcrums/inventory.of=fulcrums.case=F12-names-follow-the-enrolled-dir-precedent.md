# F12 — the new operations' names follow the `actor/enrolled/` dir's own precedent

## .the fork

`rule.require.get-set-gen-verbs` sanctions `get/set/gen/del` and `as*/is*`, and asks `get` to carry `One`/`All`. the new operations may (a) follow the names their peers in `src/domain.operations/actor/enrolled/` already carry — `assertBrainAuthNotDead` beside `assertBrainCliVersionFloor` and `assertBrainCliPassthroughLeavesSystemPromptOwned`; `getBrainAuthPath` and `getBrainDirAuthPath` beside `getActorOndiskDir`, `getBrainOndiskDir`, `getActorsRootDir`, `getHomeDir`; or (b) take the rule's form, and so differ from every peer the reader meets beside them.

## .taken, and why at the time

(a).

- an `assert*` guard here is an imperative refusal: it throws a `ConstraintError` with the fix, or returns void. the dir already has two, and the enroll flow calls them at the same boundary. an `is*` form would move the throw into `invokeEnroll`, where the refusal text would sit apart from the check it explains
- the path getters derive one path from one input, the same shape as the uncardinaled path getters beside them. `getFileContentOrNull` and `getFileStatOrNull` sit in `src/infra/`, outside the rule's stated scope, and name their null in the name
- a rename of three new names would leave the dir with two conventions. a rename of the whole dir is a sweep outside this route's wish, which belongs in its own pr

## .rework

clean — a rename via `sedreplace` touches only callers, and no published contract exports these names.

## .confidence, and why it is low

70%. the rule is explicit, and the reviewers graded each at nitpick on the same precedent this cites. a council may prefer the rule's form and a dir-wide rename.

## .where

`src/domain.operations/actor/enrolled/`; review i002 r004 nitpick.1 + nitpick.2, r006 nitpick.1.
