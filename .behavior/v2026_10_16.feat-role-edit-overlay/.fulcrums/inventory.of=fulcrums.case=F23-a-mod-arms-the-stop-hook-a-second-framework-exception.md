# F23 — a mod arms the stop hook: a second framework exception, or a pester at boot alone

## .the fork

`rule.forbid.framework-owned-hooks` sanctions one framework-owned hook, the `.this` budget gate, and
says no peer may copy its path. the mods pester (F4, the wisher's ask in S2: pester at stop, as a
budget does) rides that same `roles cost --all --when hook.onStop` entry, and a mod alone arms it
(the i003 r011 blocker.1 repair, graded urgent).

two reviewers now demand opposites:

- r011 (i003) — a mod alone must arm the stop hook, or a moved release ships with no word
- r001 (i004, re-raised i005) — a mod must not arm a framework hook; the rule names one exception
  and it is the budget. i005 adds that the mod dir is not a human-declared role and that the rule
  answers this call already; the second half is the wisher's to rule, since the S2 ask and the rule
  are both the wisher's words

the choices:

- **a — amend the rule to name a second exception, the mod pin** (taken, as built). a mod keeps
  every property the rule protects: a human asked (the mod dir and its `of:` pin, in the repo's own
  tree), a coordinate (`repo=.mods/role=$slug`), a consumer can switch it off (delete the mod; the
  next `init --hooks` removes the entry), one sweep per repo
- **b — drop the stop arm for a mod alone, and pester at boot only.** the boot already fires per
  role per session (the rule's corollary), and the `<mod of="… (installed X)">` notice already names
  a moved version there. a refused or stale mod already fails its boot. what is lost: a drift that
  lands with no boot of that role in the session goes unnamed until the next boot
- **c — a mod declares its own hook** in its `boot.yml`. no such hook surface exists for a mod today

## .taken, and why

a. the wisher asked for a stop-time pester (S2), and the gate's four properties hold for a mod as
they hold for a budget. but the rule is the repo's, and only the wisher amends it; so the call is
reserved, never argued down by a `.taken`.

## .rework

clean. (b) is a deletion of the `.mods` carrier in `getAllRepoThisRolesWithHooks` plus one test; (a)
is a brief edit to `rule.forbid.framework-owned-hooks`.

## .confidence — 60%, and why it is low

- the rule says *"it is like the budget gate" is the trap to refuse*, which is this argument word for
  word
- (b) loses less than it seems: every refusal and stale view already fails a boot

## .where

- `src/domain.operations/brains/getAllRepoThisRolesWithHooks.ts`
- `.agent/repo=.this/role=any/briefs/rule.forbid.framework-owned-hooks.md`

## .verdict

**(a)**, by the commander, 2026-11-17 (seed S11), in his #702 review. it reverses the director's
**(b)** of 2026-11-09 (seed S9).

- a drifted mod pin holds the stop, as a boot budget breach does, so a clone that never boots the
  modded role still learns of the drift
- the framework-owned-hooks rule names the mod pin as the second arm of its one exception, the
  repo-wide stop sweep
- as built, the sweep stays one entry per repo, authored by a `.this` role: the first budgeted one,
  else `role=any`. a mod is never a hook author (`repo=.mods/role=$slug` stays reserved, per
  requirement 20), which narrows option (a)'s coordinate above
- a refused or stale mod is still the boot's and the render's to refuse; the stop holds on a pin
  drift alone

## .concerns this verdict settles

- `arch-hazards-behavior` (r7) nitpick.3, *"the stop sweep read view state without the lock"*: under
  (a) the sweep reads each mod's state again, with no lock. a read that lands mid-render refuses,
  and a refused mod is no drift, so the worst case is one stop that misses the pester, never a false
  hold; the next stop reads it. held as a deliberate tradeoff: a lock on every stop costs every
  session, and the miss costs one stop