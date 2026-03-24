# self-review r1: has-ergonomics-reviewed

## verification: ergonomics reviewed

### input ergonomics

| input | ergonomics check | notes |
|-------|------------------|-------|
| `--env test` (required) | ✓ natural | explicit is better than magic; user knows which env |
| `--owner` (optional, defaults to `default`) | ✓ convenient | single-owner is common case; no flag needed |
| `--owner X --owner Y` (repeatable) | ✓ expressive | multi-owner in one command |
| `--prikey path` (optional, repeatable) | ✓ expressive | extends pool, no forced pairing with owner |
| `--key NAME` (optional) | ✓ expressive | filter to single key when needed |
| `--refresh` (optional flag) | ✓ expressive | explicit intent to overwrite |

**no friction found.** inputs follow pit of success:
- required inputs are explicit (--env)
- optional inputs have sensible defaults (--owner default)
- complex cases are expressible (multi-owner, specific key)

### output ergonomics

| output | ergonomics check | notes |
|--------|------------------|-------|
| tree with key × owner progress | ✓ natural | visual, scannable, shows progression |
| `✓ set → unlock → get` | ✓ natural | shows verification sequence |
| `✓ already set, skip` | ✓ natural | clear idempotency feedback |
| exit 0 on success | ✓ composable | automation can depend on exit code |
| exit 1 on failure | ✓ composable | automation can detect failure |
| error with hint | ✓ helpful | actionable guidance |

**no friction found.** outputs are clear and actionable.

### pit of success principles

| principle | check | evidence |
|-----------|-------|----------|
| intuitive design | ✓ | "fill" is clear verb; minimal flags for common case |
| convenient | ✓ | defaults to owner=default; infers vault when not prescribed |
| expressive | ✓ | multi-owner, specific key, refresh all supported |
| composable | ✓ | exit codes enable composition with other commands |
| lower trust contracts | ✓ | validates prikey availability, key existence at boundaries |
| deeper behavior | ✓ | partial fill, skip configured, idempotent re-runs |

### awkward areas examined

#### examined: prikey not paired with owner

the `--prikey` flag extends the pool without explicit owner association. could this confuse users?

**verdict: holds.** the system tries each prikey against each owner until one works. this is flexible — user doesn't need to know which prikey goes with which owner. clear log output ("trial prikey ~/.ssh/ehmpath against owner=ehmpath... ✓") makes the process visible.

#### examined: inner loop on owners means repeated prompts

for the same key, user enters value once per owner. if values are identical, this is redundant.

**verdict: acceptable tradeoff.** values may differ per owner (different tokens). future enhancement could add `--same-value` flag, but for v1, correctness over convenience. the prompt clearly shows which owner, so no confusion.

#### examined: vault inference may surprise

if key has no prescribed vault, system infers or falls back to os.secure.

**verdict: mitigated.** warn when vault inferred: "no vault prescribed for KEY, infer os.secure". user sees what happened.

---

## conclusion

all ergonomics checks pass:
- inputs are natural, convenient, expressive
- outputs are clear, composable, helpful
- awkward areas were examined and either hold or have mitigations

no issues found.
