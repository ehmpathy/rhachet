# self-review: has-questioned-deletables

## stone
3.3.1.blueprint.product.v1

## question
for each component in the blueprint, did i question whether it can be deleted?

## review

### isOpCliInstalled.ts — can it be deleted?

**answer:** no.

**why:** the vision says "op cli not installed → failfast exit 2 with instructions". we need to detect op cli presence before 1password operations. without this check, users would see cryptic `command not found` errors instead of guided install instructions.

**alternative considered:** inline the check in vaultAdapter1Password.set(). rejected because: the check is reused in unlock and get flows too, and separation enables unit test without a mock of the entire adapter.

### EPHEMERAL_SESSION mech — can it be deleted?

**answer:** no.

**why:** the vision says "mech=EPHEMERAL_SESSION" for os.daemon. we need to distinguish ephemeral daemon keys from other ephemeral keys (e.g., EPHEMERAL_VIA_GITHUB_APP). the mech tells the user how the key was obtained and what its lifespan is.

**alternative considered:** reuse an extant mech. rejected because: no extant mech means "ephemeral, user-entered, session-scoped". closest is EPHEMERAL_VIA_GITHUB_APP but that implies github app auth.

### PERMANENT_VIA_EXID mech — can it be deleted?

**answer:** no.

**why:** the vision says "mech=PERMANENT_VIA_EXID" for 1password. we need to indicate that keyrack stores a permanent pointer to an external source of truth. the mech tells the user where the key lives and how to update it.

**alternative considered:** reuse PERMANENT_VIA_REPLICA. rejected because: replica means keyrack owns and stores the secret. 1password stores only the exid (pointer).

### skip host/repo manifest for os.daemon — can it be deleted?

**answer:** no.

**why:** the vision says "no disk writes" for os.daemon. if we write to manifest, we persist metadata about the key (slug, env, vault). this violates the "pure ephemeral" principle — even metadata should not persist.

**alternative considered:** write manifest but mark as ephemeral. rejected because: manifest entries outlive the session. next unlock would find the entry but not the key.

### roundtrip validation via `op read` — can it be deleted?

**answer:** no.

**why:** the vision says "broken exids fail fast at set time, not unlock time". roundtrip validation confirms: op cli works, exid format is valid, item exists, user has access. without this, users would encounter errors hours later at unlock time.

**alternative considered:** validate only exid format (regex). rejected because: format validation doesn't confirm the item exists or user has access.

## verdict

all components are necessary. no deletables found.
