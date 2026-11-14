# F16 — the `not` refusal reads the two hook forms that name a skill file

## .the fork

F10 refuses a `not` of a skill a role hook invokes. research found five hook command forms on disk:
`./node_modules/.bin/rhx <skill>`, `bash .agent/repo=X/role=Y/…sh`, `rhachet run --repo X --role Y
--init <name>`, `rhachet roles …` (framework), and `node -e "import('<pkg>')…"`. which the check
reads:

- **a — the first two**, the only forms that name a skill file (taken)
- **b — all five**, with `node -e` read as "invokes package code, never a skill"
- **c — a, plus a scan of each skill body** for a call to the not'd skill

## .taken, and why

a. `--init` reaches `inits/`, which a mod cannot touch; `roles …` is the framework; `node -e` runs
package code no mod changes. c is the indirect case F10 already names as its residual, and a body
scan is a guess at bash.

## .rework

clean. a new form is one more matcher in `computeRoleModHookConflicts`.

## .confidence — 85%, and why it is short of 93

- the census covers the repos cloned on this host; a sixth form elsewhere is unmeasured

## .risk

low — no credential, no prod write. a miss is the F10 residual: the hook fails at its next event,
no worse than the state before this wish.

## .where

- `3.3.1.blueprint.product.yield.md` — `computeRoleModHookConflicts`, usecase 9
- F10 — the refusal this narrows, and its named residual

## .verdict

ruled, taken (a) — director, 2026-11-04 15:45Z, on the commander's hand-off of the blueprint
review: only the two forms that name a skill file. the indirect case stays the F10 residual, named.
