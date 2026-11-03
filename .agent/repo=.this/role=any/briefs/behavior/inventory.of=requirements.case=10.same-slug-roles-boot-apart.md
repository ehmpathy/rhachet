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

today (v1.49.2) `getAllLinkedRoleRefs.ts:42` → `asRoleRefsFirstSeenPerRole.ts:7-13` keeps the first
ref per slug and drops the rest, with no notice.

## .clamp

owed — the `v2026_10_16.feat-role-edit-overlay` route builds it.

## .proof

owed.

## .source

the wisher, 2026-10-16, on the route `.behavior/v2026_10_16.feat-role-edit-overlay` (seeds S3, S4):
roles boot independently, several repos may supply the same role, and the drop is fixed in that
route.
