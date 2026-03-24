# self-review r2: has-ergonomics-reviewed

## deeper reflection on ergonomics

i paused. re-read the experience reproduction document line by line. questioned each assumption.

### input ergonomics: re-examined

#### `--env` is required — why?

could we infer `--env` from the manifest? if keyrack.yml only declares env.test keys, `--env test` is the only valid choice.

**examined deeper:** no. the manifest may declare keys for multiple environments. a required `--env` forces the user to be explicit about intent. this is correct — explicit over magic.

**verdict: holds.** required inputs should be explicit.

#### `--owner` defaults to `default` — is this pit of success?

a user who runs `rhx keyrack fill --env test` without `--owner` fills only their personal keyrack. is this intuitive?

**examined deeper:** yes. the common case is single-owner. if you need multi-owner, you specify it. this follows pit of success principle: pull into inferred happy path, allow expression of differences.

**verdict: holds.** default to common case.

#### `--prikey` extends pool without owner pair — does this cause confusion?

the user supplies `--prikey ~/.ssh/ehmpath` but doesn't say "this is for owner=ehmpath". the system tries each prikey against each owner.

**examined deeper:** this is actually more flexible. the user may not know which prikey goes with which owner (especially if they have many). the system figures it out. clear output ("trial prikey ~/.ssh/ehmpath against owner=ehmpath... ✓") makes the process visible.

**alternative considered:** `--owner ehmpath:~/.ssh/ehmpath` syntax. rejected — adds complexity, breaks repeat flag semantics, and forces user to know the pair.

**verdict: holds.** flexibility over forced pair.

### output ergonomics: re-examined

#### tree output with nested sub-command output

the vision shows keyrack set output nested within a treebucket. is this readable?

**examined deeper:** yes. the outer structure shows the fill progress. the inner bucket shows the set details. user can scan the outer tree for ✓/✗, then drill into details if needed.

**verdict: holds.** hierarchical output matches hierarchical operation.

#### `✓ already set, skip` vs `⏭ skipped`

which is clearer? the current design says "✓ already set, skip".

**examined deeper:** the ✓ indicates success (the key is configured). "already set, skip" explains why no action was taken. this is more informative than just "skipped".

**verdict: holds.** explain the reason, not just the action.

#### error messages with hints

the design shows: `✗ no available prikey for owner=ehmpath` followed by `hint: supply --prikey path/to/key or ensure key is in ssh-agent`.

**examined deeper:** good. the error says what's wrong; the hint says what to do. actionable errors are pit of success.

**verdict: holds.** errors should be actionable.

### friction points: deeper search

#### friction: repeated value entry for same key across owners

when the value is identical across owners, to enter it twice is tedious.

**examined deeper:** but when values differ, separate prompts are correct. we can't know in advance. to accept redundancy preserves correctness.

**future enhancement:** could add `--same-value` flag to copy first owner's value to others. not for v1 — keep it simple.

**verdict: acceptable tradeoff.** correctness over convenience.

#### friction: no automation path

the command needs user presence to enter values. what if the user wants to pipe from a secret manager?

**examined deeper:** this is v1. interactive is the primary usecase. automation (stdin pipe, --value flag) can be added later.

**verdict: noted for future.** not a v1 blocker.

#### friction: vault inference should warn

if vault is inferred, user should know. the premortem reflection already identified this.

**examined deeper:** the design should include a warn when vault is inferred. check the vision... yes, this is mentioned as a mitigation.

**verdict: mitigated.** design includes the warn.

---

## conclusion

all ergonomics examined in depth:
- required inputs are explicit (good)
- optional inputs have sensible defaults (good)
- complex cases are expressible (good)
- outputs are hierarchical and actionable (good)
- friction points are either acceptable tradeoffs or mitigated

no issues found that need to be fixed before implementation.
