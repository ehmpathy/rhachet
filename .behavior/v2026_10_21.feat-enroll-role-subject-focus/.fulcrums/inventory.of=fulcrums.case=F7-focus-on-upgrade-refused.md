# F7 — a focus on `upgrade --roles` is refused, not stripped

## .the fork

`rhx upgrade --roles mechanic::flow`. upgrade's `--roles` names packages to upgrade
(`invokeUpgrade.ts:19-21`), and a package has no focus. two answers:

- (a) refuse at exit 2; the hint names `rhx upgrade --roles mechanic`, and says every actor
  focused on mechanic re-renders at its focus
- (b) strip the focus and upgrade `mechanic`

## .taken — (a), and why at the time

a stripped focus reads as "upgrade only the flow part", which no command can do. the caller who
typed it holds a wrong model of upgrade, and a refusal that names the right form corrects the
model at the cost of one retry. (b) would succeed in silence on a request it did not honor.

## .rework — clean

one branch in the upgrade arg path. a swap to (b) is a one-line strip; no caller or later stone
leans on the refusal.

## .confidence — 70%, and why it is low

(b) is the friendlier answer to a caller who knows exactly what upgrade does and typed the focus
from habit. the wish never names upgrade, so this is a call the wisher may weigh differently.

## .where

`1.vision.experience.case=_.md` cell U2 · `1.vision.yield.md` contract row **where**.

## .verdict

open.
