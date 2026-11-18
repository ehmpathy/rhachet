# F2 · rhachet ships the drift command; a role declares the onStop hook

## .the fork

- **a.** rhachet writes the onStop hook into every actor's settings itself
- **b.** rhachet ships the mechanism, `rhx clone boot drift --when hook.onStop`; a role declares the
  hook, and rhachet relays it as for any role hook
- **c.** fold the nudge into the one framework hook allowed, the `.this` budget gate
  (`roles cost --all --when hook.onStop`)

## .taken = b

- (a) is a blocker under `rule.forbid.framework-owned-hooks`: no role declares it, so no consumer can
  unlink it
- (c) fires only where a `.this` role declares a budget, and the rule names "it is like the budget
  gate" as the trap to refuse

## .open = which role

`.agent/repo=.this/role=any` declares no hooks today (it holds a `boot.yml` and skills only), so the
dogfood here needs either a packaged role that carries the hook, or a `.this` hook declaration feature.
candidates: the bhrain `driver` (a long route is where drift accrues; but a peer drops `-driver`), or
the rhachet-owned role (`rhachet-roles-rhachet`). this repo ships the command either way; the
declaration is a one-line add in whichever role the wisher names.

## .rework = clean

a hook declaration line in one role.

## .confidence = 50%, why

the rule settles (b) over (a) and (c); it does not name the role.

## .where

`1.vision.yield.md` § the reminder · § open questions

## .verdict

owed, from the wisher.
