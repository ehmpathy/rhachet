# F11 — same-slug roles boot apart, a `.this` role included; a bare slug carries every repo

## .the fork

the wisher settled that same-slug roles boot independently, fixed in this wish (S3, S4). three calls
under that remain mine:

- **a — `.this/role=<x>`.** today it replaces a same-slug package role whole. (1) it boots apart, like
  every other repo (taken) · (2) it keeps its whole-role override, the one exception to "boot apart"
- **b — a bare slug in `--roles`.** (1) it carries every repo's role of that slug (taken) · (2) it is
  refused as ambiguous, like `roles boot --role`
- **c — the enrollment hash.** (1) roles hash as named, so a bare slug hashes as before and no actor
  dir moves (taken) · (2) every role hashes as `repo/role`, which moves every extant actor

## .taken, and why

- **a1** — "roles boot independently" admits no exception. the mod dir now does the targeted
  override that the `.this` collision did bluntly and in silence
- **b1** — the actor who enrolled `mechanic` meant the mechanic; with two, they get both, which is
  what an independent boot implies. a refusal would break every extant actor the day a second repo
  ships its slug
- **c1** — an identity that moves on an unrelated release breaks the sync invariant's promise that a
  slug or hash actor is stable

## .rework

**dirty.** a1 is a behavior change for any repo that relies on a `.this` override today: after it,
that repo boots two roles where it booted one. once released, a revert re-hides a role that clones
have learned to boot. b and c are clean before release.

## .risk

low: no credential, no prod write (director, ca-2675884743); behavior harm clamped by a blueprint test

## .harm

a1 changes what extant repos boot: a repo that relies on a `.this` override boots two
same-slug roles after release, and the count of such repos is unmeasured. b1 and c1 are clean before
release, but c2 would move every extant actor dir.

## .confidence — 75%, and why it is not higher

- a1 is the wisher's call (S5): a `.this` role boots beside the package role, never in its place
- b1 and c1 remain mine. the count of repos that rely on a `.this` override is unmeasured, so the
  size of a1's behavior change is too

## .where

- `1.vision.yield.md` — `### same-slug roles boot apart`, `## .what is awkward`
- `1.vision.experience.case=10.two-repos-ship-one-slug.md` `[t3]`, `[t4]`
- requirement 10

## .verdict

ruled. a1 is the wisher's (S5). b1 (a bare slug carries every repo's role) and c1 (roles hash as
named, no actor dir moves) are taken as chosen: clean before release, no credential and no prod
write. the behavior change a1 brings to repos that rely on a `.this` override is owed a measure in
research (count those repos) and a test, not a halt; it ships only on the commander's release
review. (director, ca-2675884743)
