# self-review r4: has-questioned-requirements

fresh eyes pass after aws.credentials → aws.config rename and spec creation.

---

## review of requirements

### requirement 1: EPHEMERAL_VIA_GITHUB_APP guided setup

**current state in vision:** ✓ fully specified

- org selection from api
- app selection from api
- pem path input
- json blob produced by mech
- vault stores blob
- unlock transforms to ghs_ token

**verification:** usecase 1 and usecase 2 demonstrate the flow with os.secure and 1password respectively.

---

### requirement 2: mechs portable across vaults

**current state in vision:** ✓ fully specified

- EPHEMERAL_VIA_GITHUB_APP works with os.secure, 1password
- mech adapter drives prompts, vault just stores
- compatibility matrix shows valid combinations

**verification:** "the aha moment" section explicitly states this portability.

---

### requirement 3: aws sso experience unchanged (internals restructured)

**current state in vision:** ✓ fully specified

- usecase 3 shows unchanged external contract
- prompts move from vault adapter to mech adapter
- vault renamed to aws.config (per ~/.aws/config storage location)
- mech inference prompts when multiple mechs valid

**verification:** timeline matches extant behavior, only internal ownership changes.

---

### requirement 4: os.direct forbidden for ephemeral mechs

**current state in vision:** ✓ fully specified

- pit of success table: "os.direct + ephemeral mechs → fail-fast: os.direct cannot secure source keys"
- compatibility matrix shows os.direct only supports PERMANENT_VIA_REPLICA

**verification:** clear error + suggested alternatives required in "what is awkward" section.

---

### requirement 5: mech inference adapters

**current state in vision:** ✓ fully specified

- when --mech not supplied and multiple mechs valid, prompt via stdin
- example shows AWS_PROFILE with aws sso vs aws key choice
- mech inference as domain.operation invoked by vault

**verification:** "what is awkward" section shows exact prompt format.

---

### requirement 6: vault renamed to aws.config

**current state in vision:** ✓ fully specified

- aws.iam.sso → aws.config throughout
- rationale: named after ~/.aws/config storage location
- noted in assumptions section

**verification:** usecase 3, open questions, compatibility matrix all use aws.config.

---

## alignment with spec

checked `define.vault-mech-adapters.md`:

| vision claim | spec alignment |
|--------------|----------------|
| vault owns storage | ✓ vault adapter table |
| mech owns prompts + transform | ✓ mech adapter table |
| set flow: mech → vault | ✓ set flow diagram |
| unlock flow: vault → mech → daemon | ✓ unlock flow diagram |
| aws.config vault | ✓ consistent |
| mech inference | ✓ inference section |

---

## summary

all requirements verified. vision and spec aligned after rename.

| requirement | status |
|-------------|--------|
| github app guided setup | ✓ |
| mech portability | ✓ |
| aws sso unchanged (externally) | ✓ |
| os.direct ephemeral forbidden | ✓ |
| mech inference adapters | ✓ |
| vault rename to aws.config | ✓ |

---

## fixes applied in r4

### fix 1: verified aws.config rename throughout

all instances of aws.credentials → aws.config. spec and vision aligned.

### fix 2: verified mech inference description

both documents describe mech inference as domain.operation invoked by vault when --mech not supplied.

### fix 3: verified unlock flow

spec includes unlock flow showing vault → mech → daemon transformation chain.
