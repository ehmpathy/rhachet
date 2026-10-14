# domain.term: ambient

term.chosen      = ambient
term.kind        = adjective    # qualifies roles: "the ambient roles"
term.counterpart = specific     # "specific roles"
term.synonyms.forbidden:
- default (retired on both axes — the roles are ambient, the actor is the repo actor)
- implicit
- resident
- base (taken — `base` names the actor a derived actor extends)

## .what

the **ambient roles** are the roles a clone is enrolled with **when not otherwise specified**. they are the
repo's linked roles, there before anyone names a roleset. **specific roles** are roles someone named.

## .actors vs roles — the two axes, symmetric

an actor = `{ brain, roles }`. each half has its own vocabulary, and the two never borrow from each other:

| axis | terms | answers |
|---|---|---|
| **roles** | **ambient** · **specific** | which roles? |
| **actors** | **repo** · **hash** · **slug** | which identity holds them? |

the actor names follow the on-disk namespace: `actor.via.repo=ambient`, `actor.via.hash=<h>`,
`actor.via.slug=<s>`.

| invocation | roles | actor |
|---|---|---|
| `rhx enroll claude` — bare; also what `claude` runs, aliased | ambient | the **repo actor** |
| `rhx enroll claude --roles <exactly the ambient set>` | ambient — collapses into ambient: identity by roleset, not by flags | the repo actor |
| `rhx enroll claude --roles mechanic,architect` | specific | a **hash actor** |
| `rhx enroll claude --roles -driver` | specific — a delta over the ambient roles | a hash actor |
| `rhx clone @<slug>` | specific — declared in `actors.yml` | a **slug actor** |

🔴 **invariant: ambient roles live in the repo actor, and only there.** a bare enroll grabs the ambient roles,
so it lands in the repo actor — that is the definition, not a coincidence. a hash actor holds specific roles
only; a slug actor holds specific roles declared in `actors.yml`. "ambient" never names an actor, and "repo"
never names roles. "default" names neither — it left the vocabulary.

## .refs

- src/domain.operations/enroll/computeBrainCliEnrollment.ts  (`rolesDefault` — the prior name, see reason)
- src/contract/cli/invokeEnroll.ts:235                        (`rolesDefault: rolesLinked`)
- .agent/repo=.this/role=any/briefs/define.brain-dir-layout-is-one-for-every-actor.md

## .reason

see `term=ambient._.choice.reason.md` — why ambient, why not default, and the extant `rolesDefault`
