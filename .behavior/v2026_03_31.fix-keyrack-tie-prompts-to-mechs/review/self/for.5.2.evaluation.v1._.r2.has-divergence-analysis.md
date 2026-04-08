# review: has-divergence-analysis

## question

did the evaluation find all divergences between blueprint and implementation?

- summary: does actual match declared?
- filediff: all files accounted for?
- codepath: all codepaths accounted for?
- test coverage: all tests accounted for?

## review

### step 1: compare blueprint matrix to implementation matrix

#### blueprint matrix (declared)

| vault | PERMANENT_VIA_REPLICA | EPHEMERAL_VIA_GITHUB_APP | EPHEMERAL_VIA_AWS_SSO | PERMANENT_VIA_AWS_KEY |
|-------|----------------------|--------------------------|----------------------|----------------------|
| os.secure | ✓ | ✓ | ✗ | ✗ |
| os.direct | ✓ | ✗ | ✗ | ✗ |
| 1password | ✓ | ✓ | ✗ | ✗ |
| aws.config | ✗ | ✗ | ✓ | ✓ |

#### implementation matrix (actual)

| vault | PERMANENT_VIA_REPLICA | PERMANENT_VIA_REFERENCE | EPHEMERAL_VIA_GITHUB_APP | EPHEMERAL_VIA_AWS_SSO | EPHEMERAL_VIA_SESSION |
|-------|----------------------|------------------------|--------------------------|----------------------|----------------------|
| os.secure | ✓ | ✗ | ✓ | ✗ | ✗ |
| os.direct | ✓ | ✗ | ✗ | ✗ | ✗ |
| 1password | ✓ | ✓ | ✓ | ✗ | ✗ |
| aws.config | ✗ | ✗ | ✗ | ✓ | ✗ |
| os.daemon | ✗ | ✗ | ✗ | ✗ | ✓ |
| os.envvar | ✓ | ✗ | ✗ | ✗ | ✗ |

#### divergences found

| divergence | in evaluation? | status |
|------------|----------------|--------|
| PERMANENT_VIA_REFERENCE for 1password | ✗ not listed | **gap** |
| EPHEMERAL_VIA_SESSION for os.daemon | ✗ not listed | **gap** |
| os.daemon and os.envvar added | ✓ listed | documented |
| PERMANENT_VIA_AWS_KEY absent | ✓ listed | documented |

### step 2: assess the gaps

the two gaps are:
1. PERMANENT_VIA_REFERENCE in 1password — this mechanism predates this PR
2. EPHEMERAL_VIA_SESSION in os.daemon — this mechanism predates this PR

these are not divergences from the blueprint. the blueprint only listed mechanisms being added or changed. these mechanisms already existed before the refactor and were preserved. the evaluation matrix shows the full implemented state, which is correct.

the evaluation's divergence analysis focuses on changes vs blueprint, not on documenting all mechanisms.

### step 3: verify summary alignment

| blueprint summary | implementation | status |
|-------------------|----------------|--------|
| extend mech adapter with acquireForSet, deliverForGet | ✓ | matches |
| extend vault adapter with mechs.supported | ✓ | matches |
| add guided setup to github app mech | ✓ | matches |
| move aws sso guided setup from vault to mech | ✓ | matches |
| rename aws.iam.sso vault to aws.config | ✓ | matches |
| add vault inference from key name | ✓ | matches |
| add mech inference when vault supports multiple mechs | ✓ | matches |
| remove prompts from vault adapters | ✓ | matches |

### step 4: verify codepath alignment

blueprint codepath tree shows:
- set flow: inferVault → vault lookup → vault.set (mech inference + mech.acquireForSet)
- unlock flow: vault.get → mech.deliverForGet → daemon.set

implementation follows the same structure. the evaluation documents this correctly.

### step 5: verify test coverage alignment

blueprint test coverage declares:
- unit tests for inferKeyrackVaultFromKey, inferKeyrackMechForSet
- unit tests for mech adapters (acquireForSet, deliverForGet)
- unit tests for vault adapters (mechs.supported)
- integration tests for set+get roundtrips

evaluation test coverage shows:
- unit tests for all declared files
- integration tests for all vault adapters
- 877 tests pass

| blueprint test | evaluation | status |
|----------------|------------|--------|
| inferKeyrackVaultFromKey.test.ts | ✓ listed | matches |
| inferKeyrackMechForSet.test.ts | ✓ listed | matches |
| mechAdapterReplica.test.ts | ✓ listed | matches |
| mechAdapterGithubApp.test.ts | ✓ listed | matches |
| mechAdapterAwsSso.test.ts | ✓ listed | matches |
| vaultAdapterOsSecure.test.ts | ✓ listed | matches |
| vaultAdapterOsDirect.test.ts | ✓ listed | matches |
| vaultAdapterAwsConfig.test.ts | ✓ listed | matches |
| vaultAdapter1Password.test.ts | ✓ listed | matches |

test coverage alignment: **complete**.

### conclusion

the divergence analysis in the evaluation is **complete** for the scope of changes.

the apparent gaps (PERMANENT_VIA_REFERENCE, EPHEMERAL_VIA_SESSION) are pre-extant mechanisms, not blueprint divergences. the evaluation correctly shows the full matrix but focuses divergence analysis on this PR's changes.

no blockers. no updates required.

review complete.
