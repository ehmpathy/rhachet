# F13 — the signed-in 1password read is out of this wish's scope

**the fork** — whether this branch owes proof that a signed-in `op read` works against the real
service. (a) build that proof here · (b) leave the 1password vault as the
branch base has it, and dispute the ask as out of scope.

**taken** — (b), and the wisher ruled it so. the wish is an org allowlist in the keyrack manifest:
which orgs a repo may address. it touches no vault adapter. this branch changes no 1password source
or test; `src/domain.operations/keyrack/adapters/vaults/1password/` matches the branch base. a vault's
signed-in read is that vault's own contract, and its coverage belongs to a change that touches it.
`origin/main` already carries its own 1password work, which this branch takes on rebase.

**why not (a)** — it needs a human-owned 1password account and a token, buys no proof of the
allowlist, and widens the diff into a vault this wish never opened.

**rework** — clean. this branch holds no 1password change to revert.

**confidence** — 95%. the wisher settled it.

**where** — `src/domain.operations/keyrack/adapters/vaults/1password/` (unchanged from the base).

**verdict** — ruled by the wisher: out of scope.
