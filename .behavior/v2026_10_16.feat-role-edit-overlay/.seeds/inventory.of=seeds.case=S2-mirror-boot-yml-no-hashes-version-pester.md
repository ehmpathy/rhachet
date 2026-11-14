# S2 — mirror boot.yml, no hashes, a version that pesters onStop

## .said

> nah, no hashes and [placeholder] like that. super simple. i want it to maximallly mirror the normal boot.yml, with the exception of specification of which role (of: ehmpathy/mechanic is great) and potentially as of which version, so that it can failfast onStop and pester to update the edits (just like boot.yml budget pesters)

## .settled

the declaration is boot.yml's own shape — its sections, `say`, `ref`, `not` — plus two keys: `of`,
which names the role (`of: ehmpathy/mechanic`), and an optional version the edits were made against.
no content hashes, no per-file base records. when the installed role's version differs from the
declared one, an onStop check fails fast and asks the author to review and update the edits — the
same shape as the boot budget's onStop pester.

## .landed

- `1.vision.yield.md` — `### the declaration`, `### the version pester`
- `.fulcrums/inventory.of=fulcrums.case=F3-edit-yml-holds-of-and-bases.md` (withdrawn)
