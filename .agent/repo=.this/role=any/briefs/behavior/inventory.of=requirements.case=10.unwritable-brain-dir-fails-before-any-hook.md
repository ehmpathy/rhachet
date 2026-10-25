# requirement: a brain dir init cannot write fails loud before any hook lands

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

`rhx init --roles …` (and `rhx upgrade`) on a repo whose actor brain dir — the dir `<repo>/.claude`
reaches — cannot be written, or whose files a role init must write cannot be written, fails loud
with an error that names the path and the fix. it fails BEFORE any role's init runs, so no role's
hook lands in `settings.of.repo.json`.

## .clamp

owed.

## .proof

owed.

## .source

the director, 2026-10-25, for `ehmpathy/rhachet#657`: on a cloud grove a fresh tree's postinstall
init failed with `Permission denied` at the mechanic init, after four other roles' hooks had landed.
