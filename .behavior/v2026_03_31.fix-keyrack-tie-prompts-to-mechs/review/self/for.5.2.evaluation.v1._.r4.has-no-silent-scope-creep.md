# review: has-no-silent-scope-creep

## question

did any scope creep into the implementation?

- did you add features not in the blueprint?
- did you change things "while you were in there"?
- did you refactor code unrelated to the wish?

## review

### step 1: identify potential scope creep

from git diff and evaluation analysis:

| change | in blueprint? | type |
|--------|--------------|------|
| acquireForSet on mech adapters | ✓ | in scope |
| deliverForGet on mech adapters | ✓ | in scope |
| mechs.supported on vault adapters | ✓ | in scope |
| github app guided setup | ✓ | in scope |
| aws sso moved to mech | ✓ | in scope |
| aws.iam.sso → aws.config rename | ✓ | in scope |
| inferKeyrackVaultFromKey extended | ✓ | in scope |
| inferKeyrackMechForSet added | ✓ | in scope |
| os.daemon mechs.supported | ✗ | **scope creep** |
| os.envvar mechs.supported | ✗ | **scope creep** |

### step 2: assess each scope creep item

#### scope creep 1: os.daemon mechs.supported

**what was added:** `mechs: { supported: ['EPHEMERAL_VIA_SESSION'] }`

**why it happened:** while you were in there, the vault interface required mechs.supported on all vaults to satisfy TypeScript. os.daemon already supported EPHEMERAL_VIA_SESSION, so the property was added.

**is it silent?** no — documented in evaluation's divergence analysis.

**decision:** [backup] — improves interface consistency, no functional change.

#### scope creep 2: os.envvar mechs.supported

**what was added:** `mechs: { supported: ['PERMANENT_VIA_REPLICA'] }`

**why it happened:** same as above — interface consistency required the property.

**is it silent?** no — documented in evaluation's divergence analysis.

**decision:** [backup] — improves interface consistency, no functional change.

### step 3: check for undocumented changes

ran `git diff --name-only origin/main -- src/` to find all changed files.

| file | documented? |
|------|-------------|
| KeyrackGrantMechanismAdapter.ts | ✓ in filediff |
| KeyrackHostVaultAdapter.ts | ✓ in filediff |
| inferKeyrackVaultFromKey.ts | ✓ in filediff |
| inferKeyrackMechForSet.ts | ✓ in filediff |
| mechAdapterReplica.ts | ✓ in filediff |
| mechAdapterGithubApp.ts | ✓ in filediff |
| mechAdapterAwsSso.ts | ✓ in filediff |
| vaultAdapterOsSecure.ts | ✓ in filediff |
| vaultAdapterOsDirect.ts | ✓ in filediff |
| vaultAdapterAwsConfig.ts | ✓ in filediff |
| vaultAdapter1Password.ts | ✓ in filediff |
| vaultAdapterOsDaemon.ts | ✓ in divergence (scope creep) |
| vaultAdapterOsEnvvar.ts | ✓ in divergence (scope creep) |
| setKeyrackKey.ts | ✓ in evaluation note |
| setKeyrackKeyHost.ts | ✓ in evaluation note |
| unlockKeyrackKeys.ts | ✓ in evaluation note |
| genContextKeyrack.ts | ✓ in evaluation note |
| genContextKeyrackGrantGet.ts | ✓ in evaluation note |
| invokeKeyrack.ts | ✓ in evaluation note |
| other orchestration files | ✓ covered by "mechanical updates" note |

no silent scope creep found. all changes are documented either in filediff tree, divergence analysis, or evaluation note about downstream consumers.

### step 4: verify no refactors unrelated to wish

the wish was: "keyrack vaults should use mech adapters, to enable each mechanism to prompt for exactly what it needs"

all changes relate to:
1. mech adapter interface (acquireForSet, deliverForGet)
2. vault adapter interface (mechs.supported)
3. composition of mech + vault
4. downstream consumers of the changed interfaces

no unrelated refactors detected.

### step 5: hostile perspective — what did i miss?

**challenge:** "you changed the dao schema but didn't mention it"

response: daoKeyrackHostManifest/schema.ts was changed to add the mech property to grants. this is a downstream consumer of the new mech interface, covered by the evaluation's "mechanical updates" note. not silent.

**challenge:** "you changed the cli but didn't mention it"

response: invokeKeyrack.ts was changed to support the new --mech flag. this is a downstream consumer, covered by the evaluation's "mechanical updates" note. not silent.

**challenge:** "you deleted inferMechFromVault.ts but didn't mention it"

response: this file was marked `[-] delete` in the blueprint filediff tree. it was deleted as planned. not scope creep — it's in scope.

**challenge:** "KeyrackHostVault.ts and KeyrackKeyGrade.ts changed but aren't listed"

response: these are domain objects that were updated to support the new mech interface. they are downstream consumers covered by the evaluation's "mechanical updates" note. not silent.

no silent scope creep found after hostile review.

### step 6: would a future maintainer be surprised?

review each scope creep item from maintainer perspective:

#### os.daemon mechs.supported

future maintainer opens vaultAdapterOsDaemon.ts:
- sees `mechs: { supported: ['EPHEMERAL_VIA_SESSION'] }`
- matches the pattern from other vault adapters
- sees EPHEMERAL_VIA_SESSION is the only mech this vault supports
- no surprise — expected interface consistency

#### os.envvar mechs.supported

future maintainer opens vaultAdapterOsEnvvar.ts:
- sees `mechs: { supported: ['PERMANENT_VIA_REPLICA'] }`
- matches the pattern from other vault adapters
- sees PERMANENT_VIA_REPLICA is appropriate for envvar storage
- no surprise — expected interface consistency

#### downstream consumer changes

future maintainer sees changes in setKeyrackKey.ts, genContextKeyrack.ts, etc:
- these files compose the vault and mech adapters
- changes are mechanical — call new interface methods
- no surprise — expected ripple from interface changes

### step 7: final verdict

| scope creep item | documented? | backed up? | would surprise maintainer? |
|------------------|-------------|------------|----------------------------|
| os.daemon mechs.supported | ✓ | ✓ | no |
| os.envvar mechs.supported | ✓ | ✓ | no |
| downstream consumers | ✓ (via note) | n/a | no |

all scope creep is:
1. documented in evaluation
2. backed up with valid rationale
3. expected by future maintainers

### conclusion

scope creep was limited to two items:
1. os.daemon mechs.supported — documented, backed up
2. os.envvar mechs.supported — documented, backed up

both were necessary for interface consistency and were explicitly documented in the evaluation's divergence analysis. no silent scope creep occurred.

review complete.
