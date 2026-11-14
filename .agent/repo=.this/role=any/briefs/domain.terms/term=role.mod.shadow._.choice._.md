# domain.term: shadow

term.chosen   = shadow          # noun: the file · verb: to shadow a held path
term.kind     = noun
term.boundary = role.mod        # a shadow is one move of a mod
term.synonyms.forbidden:
- overwrite
- replace

## .what

a **shadow** is a mod file at a path the role holds. it hides the published file at that path: the
modded view links the path to the mod file, and the boot renders the mod file in its place, tagged
`mod="shadow"`. a shadow of `x.md` also hides the published `x.md.min`, unless the mod ships its
own, since the boot prefers the minification for content.

its peers in a mod are the **add** (a file at an unheld, said path) and the **not** (a glob that
drops held files).

## .refs

- src/domain.objects/RoleModPlan.ts (`shadows`, `minsDropped`)
- src/domain.operations/mods/computeRoleModPlan.ts
- src/domain.operations/mods/getOneRoleModProvenance.ts

## .reason

- `term=role.mod.shadow._.choice.reason.md`
