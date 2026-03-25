# self-review: has-pruned-yagni (revision 3)

## stone
3.3.1.blueprint.product.v1

## context
revision 2 flagged grades/inferKeyGrade.ts as potentially YAGNI. this revision resolves and fixes that issue.

## issue found

**component:** grades/inferKeyGrade.ts

**decision:** remove from blueprint.

**why:** the vision and criteria focus on set/unlock/get flows. grade inference is not mentioned. if grade inference breaks with new vaults, tests will fail and we can add it then.

**YAGNI principle applied:** don't add changes "just in case". add when tests prove the need.

## fix applied

removed from blueprint filediff tree:
```
│  └─ [~] grades/inferKeyGrade.ts               # verify os.daemon and 1password grades
```

edited 3.3.1.blueprint.product.v1.i1.md to remove this line.

**how to remember:** if a component isn't mentioned in vision or criteria, question whether it belongs in the blueprint. default to removal.

## all other components

reviewed in r2 — all hold as needed per vision and criteria.

## verdict

one YAGNI component found and removed: grades/inferKeyGrade.ts

blueprint is now minimal and aligned with vision+criteria.
