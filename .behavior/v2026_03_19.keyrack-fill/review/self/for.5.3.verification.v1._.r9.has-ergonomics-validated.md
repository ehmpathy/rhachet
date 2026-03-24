# self-review: has-ergonomics-validated (round 9)

## why the ergonomics hold

this round examines each ergonomic choice and articulates why it is correct.

## input ergonomics

### `--env` is required

**planned:** required
**actual:** required
**why it holds:** explicit env prevents accidental fills. the user must consciously choose which environment to configure. this matches unlock semantics.

### `--owner` defaults to `['default']`

**planned:** defaults to `default`
**actual:** defaults to `['default']`
**why it holds:** single-owner is the common case. most users configure their personal keyrack. multi-owner requires explicit opt-in via repeated `--owner` flags.

### `--prikey` extends discovery

**planned:** extends discovered prikeys
**actual:** extends discovered prikeys
**why it holds:** prikey discovery (ssh-agent, ~/.ssh/id_ed25519) handles the common case. `--prikey` extends for edge cases. no owner-to-prikey map required — the system trials each prikey until one works.

### `--key` filters to single key

**planned:** filters to specific key
**actual:** filters to specific key
**why it holds:** enables refresh of a single credential without re-prompts for all keys. useful for rotation after compromise.

### `--refresh` forces re-prompt

**planned:** re-prompt even if set
**actual:** re-prompt even if set
**why it holds:** enables credential rotation. without this, users would need to delete keys before fill.

### `--repair` and `--allow-dangerous`

**planned:** not in original repros
**actual:** added for blocked key support
**why it holds:** blocked keys (dangerous tokens) require explicit user consent. fail-fast is the default. user must opt into knowledge via `--repair` (overwrite) or `--allow-dangerous` (accept as-is).

## output ergonomics

### header shows scope

**planned:** `keyrack fill (env: X, keys: N, owners: M)`
**actual:** `keyrack fill (env: X, keys: N, owners: M)`
**why it holds:** user sees scope before any prompts. clear expectation of work ahead.

### key header shows progress

**planned:** `key 1/2, KEYNAME`
**actual:** `key 1/2, KEYNAME, for M owner(s)`
**why it holds:** progress indicator (1/2) enables user to estimate time. "for M owners" warns that multiple prompts follow for this key.

### owner branch shows context

**planned:** `└─ owner default: ✓ set → unlock → get`
**actual:** `└─ for owner default` with nested details
**why it holds:** nested structure separates concerns. user sees which owner, then sees the operations for that owner. treebucket groups set output cleanly.

### skip message shows slug

**planned:** `already set, skip`
**actual:** `found vaulted under ehmpathy.all.API_KEY`
**why it holds:** slug reveals which key satisfied the requirement. critical for env=all fallback — user sees `.all.` in slug and understands why env=test was satisfied by env=all key.

### verification shows commands

**planned:** `✓ set → unlock → get`
**actual:** `✓ rhx keyrack unlock --key X --env Y --owner Z`
**why it holds:** user can copy-paste command to manually re-run. useful for debug. no hidden magic.

### completion shows verified count

**planned:** `keyrack fill complete (2/2 keys verified)`
**actual:** `keyrack fill complete (N/M keys verified)`
**why it holds:** N = set + skipped (verified via roundtrip or existence). M = total keys × owners. user knows success rate.

## error ergonomics

### no prikey fails fast

**planned:** `no available prikey for owner=X`
**actual:** `no available prikey for owner=X`
**why it holds:** fail-fast before any user input. user knows which owner lacks prikey. can retry with `--prikey`.

### key not found fails fast

**planned:** `key X not found in manifest for env=Y`
**actual:** `key X not found in manifest for env=Y`
**why it holds:** fail-fast before any user input. user knows the key name was invalid. typo detection.

### blocked key fails fast (unless opted out)

**planned:** not in original repros
**actual:** fails with hint for `--repair` or `--allow-dangerous`
**why it holds:** dangerous tokens require explicit consent. user must opt into knowledge. prevents silent acceptance of compromised credentials.

## decision: [ergonomics validated]

all input ergonomics match planned design.

all output ergonomics match planned design, with improvements:
- skip message now shows the actual slug
- verification shows copyable commands
- blocked key support added for safety

all error ergonomics follow fail-fast pattern.

the implementation is faithful to the planned experience, with refinements that emerged from implementation clarity.
