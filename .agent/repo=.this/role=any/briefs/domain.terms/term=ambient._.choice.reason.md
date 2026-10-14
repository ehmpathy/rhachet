# domain.term: ambient — reason

## .etymology

**ambient**, from latin *ambire* "to go around". ambient is what surrounds you before you act — the air in a
room, the light already on. the ambient roles are the roles already around a repo, present before anyone
names a roleset.

keyrack already speaks this word the same way: the grove's own identity is its **ambient** identity, the one
a box holds with no explicit choice (`define.keyrack-org-scope.grove-vs-tree.md`).

its counterpart is **specific**: roles someone named, by `--roles` or in `actors.yml`.

## .the dispute it settled — 2026-09-27

"default" was overloaded two ways at once:

- **the default actor** — `actor.via.slug=.default`, the actor a bare `claude` reads
- **the default roles** — the roleset a clone gets when none is specified

one word on both halves of `{ brain, roles }` let a sentence blur them — "the default" could not say which
axis it meant, and the blur leaked into design (a vision drew two brain dir layouts for one).

the wisher's own words settled it: "even the default is enrolled — it's just enrolled statically as the
default roleset." so the repo actor is an enrolled actor, and its roles needed their own word. candidates
weighed: `resident` (says "lives with the repo", but reads as an actor trait), `ambient` (says "there when
not otherwise specified"). the wisher picked **ambient**, with **specific** as its counterpart, and retired
`default` on both axes: the roles are ambient, the actor is the repo actor.

and the wisher fixed the tie between them: "bare `rhx enroll claude` hits the repo = ambient. that's
literally the whole purpose — bare and default enrolled both grab the ambient roles." so the ambient roles
live in the repo actor, and a bare enroll lands there — as does an enroll whose `--roles` equal the ambient
set (`isRolesetAmbient`, `getOneActorOndiskExid`).

## .the extant `rolesDefault`

`computeBrainCliEnrollment` takes `rolesDefault: RoleSlug[]` (`computeBrainCliEnrollment.ts:20,71`), fed
`rolesLinked` by `invokeEnroll.ts:235`. under `rule.forbid.domain-term-synonyms` that name is now a synonym;
its conformant form is `rolesAmbient`. the rename is a separate change from the brief that coined the term.

## .invariants

- ambient and specific are properties of ROLES, never of an actor or a clone. repo, hash, and slug are
  properties of an ACTOR, never of roles. actors vs roles is the symmetry — each half of `{ brain, roles }`
  keeps its own words
- 🔴 the ambient roles live in the repo actor (`actor.via.repo=ambient`, formerly `actor.via.slug=.default`),
  and only there. a bare `rhx enroll claude` lands in the repo actor. a hash actor never holds the ambient
  roles — only specific ones
- "default" is retired on both axes. the dir name carries the settlement: namespace `repo` names the
  actor, value `ambient` names its roles
- a `+role` / `-role` delta is written against the ambient roles, and the roles it yields are specific
- 🔴 **identity by roleset.** the actor follows from the resolved roleset, never from the flags that named
  it. roles whose set equals the ambient roles ARE ambient — the **collapsed state**: a specific roleset
  that equals the ambient set collapses into ambient, the one canonical form. a bare enroll and
  `--roles mechanic,driver,ergonomist` (when that is the ambient set) both land in the repo actor. so a hash
  twin of the ambient roles cannot exist by definition, and the clamp that refuses one only guards the
  definition
