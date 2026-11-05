# F14 — a legacy role init meets a 0444 grove

## .the fork

the wish says a 0444 home settings file gives `rhx init` exit 0 and a warn. on the lockfile pin
(rhachet-roles-ehmpathy 1.39.3), the mechanic role's own `init.claude.sh` backs up
`.claude/settings.json` twice in one second. the arrow reaches the 0444 home file, so the first
backup is 0444 and the second `cp` fails EACCES. `rhx init --roles mechanic` exits 1 on such a box.

- **A** — leave it: the defect lives in the role package's init (1.40.0 does not hit it), and
  rhachet's own writes never reach home
- **B** — rhachet runs each role init inside the settings shield, so a legacy init meets a real
  `settings.json` in the repo and never reads through the arrow

## .taken, and why

A, for now — the route is complete, and B widens the shield from hook adapters to role inits.
B is a contract change the wisher should rule on.

## .rework

clean — B wraps the role-init call in `withBrainDirSettingsShield`; no caller shape changes.

## .confidence — 70%, and why it is low

the wish's words cover this box exactly, and a human on ehmpathy ≤1.39.x with a 0444 home file
still meets a non-zero init. A is defensible only because the newer role release cures it.

## .where

- `node_modules/rhachet-roles-ehmpathy/dist/domain.roles/mechanic/inits/init.claude.permissions.sh:99`
- `.log/role=mechanic/skill=git.repo.test/what=acceptance/2026-10-26T21-08-30Z.stderr.log:192`

## .verdict

open — the director holds it for the wisher at review; it is never best-guessed past
