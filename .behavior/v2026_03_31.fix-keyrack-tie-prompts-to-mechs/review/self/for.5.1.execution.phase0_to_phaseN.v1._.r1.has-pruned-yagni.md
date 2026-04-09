# review: has-pruned-yagni

## question

for each component in the code, ask:
- was this explicitly requested in the vision or criteria?
- is this the minimum viable way to satisfy the requirement?
- did we add abstraction "for future flexibility"?
- did we add features "while we're here"?
- did we optimize before we knew it was needed?

## review

### mech adapters

#### mechAdapterReplica

| aspect | evaluation |
|--------|------------|
| acquireForSet | requested in blueprint "mech adapter interface (target)" |
| deliverForGet | requested in roadmap "1.4 rename translate → deliverForGet" |
| TTY detection | requested implicitly — non-interactive mode needs piped input |
| LONG_LIVED_PATTERNS validation | extant behavior preserved, not new |
| minimum viable? | yes — prompts once, returns source, identity transform |

**verdict:** no yagni

#### mechAdapterGithubApp

| aspect | evaluation |
|--------|------------|
| acquireForSet with org→app→pem flow | requested in vision "which of the orgs to target?" |
| gh cli detection + fallback | requested in vision "gh cli unavailable fallback" |
| auto-select single org/app | requested in criteria usecase.7 and usecase.8 |
| deliverForGet with createAppAuth | extant behavior preserved, renamed from translate |
| minimum viable? | yes — only prompts needed for guided setup |

**verdict:** no yagni

#### mechAdapterAwsSso

| aspect | evaluation |
|--------|------------|
| acquireForSet delegates to setupAwsSsoWithGuide | requested in roadmap "1.3 move logic from setupAwsSsoWithGuide.ts" |
| deliverForGet exports credentials | extant behavior preserved, renamed from translate |
| minimum viable? | yes — reuses extant setup logic |

**verdict:** no yagni

### vault adapters

#### vaultAdapterOsSecure

| aspect | evaluation |
|--------|------------|
| mechs.supported | requested in blueprint "vault adapter interface (target)" |
| set calls inferKeyrackMechForSet | requested in roadmap "3.3 vault.set encapsulates mech calls" |
| set calls mech.acquireForSet | requested in blueprint codepath tree |
| get calls mech.deliverForGet | requested in blueprint codepath tree |
| getMechAdapter function | minimum lookup — no abstraction overhead |
| minimum viable? | yes — each method does exactly one thing |

**verdict:** no yagni

#### vaultAdapterOsDirect

| aspect | evaluation |
|--------|------------|
| mechs.supported: ['PERMANENT_VIA_REPLICA'] | requested in criteria usecase.5 "os.direct cannot secure source keys" |
| set calls mech.acquireForSet | requested in blueprint |
| fail-fast for ephemeral mechs | requested in criteria usecase.5 |
| minimum viable? | yes — only supports permanent mechs as required |

**verdict:** no yagni

#### vaultAdapterAwsConfig

| aspect | evaluation |
|--------|------------|
| mechs.supported: ['EPHEMERAL_VIA_AWS_SSO'] | requested in criteria usecase.6 |
| set calls mech.acquireForSet when TTY | requested in blueprint |
| get calls mech.deliverForGet | requested in blueprint |
| validateSsoSession function | minimum for session check |
| triggerSsoLogin function | minimum for browser auth |
| minimum viable? | yes — pure storage backend with sso operations |

**verdict:** no yagni

#### vaultAdapterOsDaemon

| aspect | evaluation |
|--------|------------|
| mechs.supported: ['EPHEMERAL_VIA_SESSION'] | requested in roadmap "2.6" |
| set prompts directly (no mech adapter call) | acceptable — daemon IS the session mech |
| minimum viable? | yes — special case justified (session storage) |

**note:** os.daemon does not call mech.acquireForSet because EPHEMERAL_VIA_SESSION is a special case where the daemon itself is the mechanism. the source credential = the secret (identity transform). no guided setup needed beyond simple prompt.

**verdict:** no yagni

### domain operations

#### inferKeyrackMechForSet

| aspect | evaluation |
|--------|------------|
| auto-select single mech | requested in criteria "when vault supports one mech" |
| prompt via stdin for multiple | requested in criteria usecase.3 and vision "mech inference adapters" |
| non-TTY error | requested implicitly — fail-fast when cannot prompt |
| minimum viable? | yes — 40 lines, single responsibility |

**verdict:** no yagni

### extras not found

reviewed all changed files:
- no utility functions added "for future flexibility"
- no abstractions beyond what was needed
- no optimization before profiling
- no features added "while we're here"

### patterns confirmed

| pattern | status |
|---------|--------|
| vault.set encapsulates mech.acquireForSet | ✓ implemented |
| vault.get encapsulates mech.deliverForGet | ✓ implemented |
| vaults expose mechs.supported | ✓ implemented |
| incompatible mech = fail-fast with alternatives | ✓ implemented |
| single mech = auto-select | ✓ implemented |
| multiple mechs = prompt via stdin | ✓ implemented |

### conclusion

no yagni detected. implementation is minimum viable.

each component exists because it was explicitly requested in the vision, criteria, or blueprint. no extras were added.
