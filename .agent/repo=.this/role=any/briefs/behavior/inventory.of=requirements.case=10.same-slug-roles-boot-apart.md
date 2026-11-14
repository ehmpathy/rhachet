# requirement: two repos that ship one role slug both boot — neither is dropped

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

when two linked repos each ship a role of the same slug (say `ehmpathy/mechanic` and
`acme/mechanic`), a clone enrolled with that slug boots both, each as its own `repo/role`. no role is
dropped from `boot.md` because another repo shipped the same slug.

- the brain-dir `boot.md` and the cli paths agree: each `repo/role` is its own role
- an enroll may pin one with the `repo/role` form (`--roles ehmpathy/mechanic`); a bare slug carries
  every repo's role of that slug
- a skill name two such roles both ship stays a refused ambiguity on `run --skill`, as today; the
  caller names `--repo`

## .clamp

`getAllLinkedRoleRefs` returns one ref per `repo/role`, every repo's role of a slug kept (the per-slug
dedupe it once ran is deleted). `asRoleRefsForEnrolledSlugs` maps a bare slug to every ref of that
slug, and `asRoleRefsInEnrollmentOrder` orders refs of one slug by repo, so a render is stable.

## .proof

- `blackbox/cli/init.same-slug-roles.acceptance.test.ts` — two packages ship `surfer`; the repo actor
  `boot.md` carries both, each boots apart on the cli, and a bare `run --skill` of a skill both ship
  is refused and names `--repo`; `[t3]` — `roles cost --all` lists one row per repo of the slug
- `src/domain.operations/init/boots/asRoleRefsForEnrolledSlugs.test.ts` `[case1]` — a bare slug two
  repos link maps to both refs, in repo order
- `src/domain.operations/init/roles/link/getAllLinkedRoleRefs.integration.test.ts` `[case7]` — a
  `.this` role with a `boot.yml` and a package role of the same slug both come back, native first
- `blackbox/cli/enroll.same-slug-roles.integration.test.ts` — the two enroll clauses:
  - `[case1]` `[t0]` — a bare `enroll claude --roles surfer` boots both repos' roles, in one actor
  - `[case1]` `[t1]` — a re-enroll of the bare slug keeps the same actor dir
  - `[case2]` — a bare-slug actor enrolled while one repo ships the slug keeps its actor dir once a
    second repo of the slug is linked, so no extant actor dir moves; it then boots both
  - `[case1]` `[t2]` — a `repo/role` pin is its own actor, and boots the named repo alone
  - `[case3]` — a `.this/role=surfer` beside a linked `alpha/surfer`: a bare enroll boots both, each
    in its own section under its own repo dir, and each boots apart on the cli by `--repo`
- `blackbox/cli/enroll.mods.integration.test.ts` `[case5]` — a mod whose bare `of:` names a slug two
  repos ship is refused, and pinned applies to the named repo alone

all green 2026-11-07.

status: proven

## .source

the wisher, 2026-10-16, on the route `.behavior/v2026_10_16.feat-role-edit-overlay` (seeds S3, S4):
roles boot independently, several repos may supply the same role, and the drop is fixed in that
route.
