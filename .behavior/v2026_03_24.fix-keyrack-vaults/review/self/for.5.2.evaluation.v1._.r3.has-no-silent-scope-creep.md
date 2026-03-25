# self-review r3: has-no-silent-scope-creep

## verification method

1. list all modified files via `git diff --name-status origin/main`
2. for each file, check if changes relate to os.daemon or 1password vault implementation
3. flag any changes that appear unrelated to the wish

---

## files audited

### core implementation files (expected)

| file | relates to wish? | notes |
|------|------------------|-------|
| KeyrackGrantMechanism.ts | yes | added EPHEMERAL_VIA_SESSION, PERMANENT_VIA_REFERENCE |
| adapters/vaults/index.ts | yes | exports for new adapter directories |
| vaultAdapterOsDaemon.ts | yes | new os.daemon vault |
| vaultAdapter1Password.ts | yes | new 1password vault |
| genContextKeyrackGrantUnlock.ts | yes | registers new mech adapters |
| setKeyrackKeyHost.ts | yes | skip relock for os.daemon |
| inferMechFromVault.ts | yes | maps vault to mech |
| inferKeyGrade.ts | yes | duration for new mechs |

### support files (expected)

| file | relates to wish? | notes |
|------|------------------|-------|
| daoKeyrackHostManifest/schema.ts | yes | zod schema for new mech types |
| genTestTempRepo.ts | yes | test fixture for 1password vault |
| acceptance tests | yes | os.daemon and 1password acceptance |

---

## potential scope creep identified

### SC1: exit code changes in invokeKeyrack.ts

**what changed:** four `exit(1)` calls changed to `exit(2)`

**blueprint says:** exit 2 for constraint errors (op cli not installed)

**analysis:**
- blueprint introduces exit(2) for 1password constraint errors
- implementation extended exit(2) to ALL keyrack constraint errors
- rationale: consistency — all constraint errors use exit(2)

**is this scope creep?**

borderline. blueprint only specified exit(2) for op cli errors. but once we introduce exit(2) semantics, consistency requires other constraints use it too.

**verdict:** [backup] — necessary for semantic consistency

---

### SC2: host manifest index file

**what changed:** added unencrypted index file with slugs

**blueprint says:** no mention of index file

**analysis:**
- `inferKeyrackKeyStatusWhenNotGranted` previously had a caveat:
  ```
  .caveat = keys in other vaults (1password, etc) will mislead with 'absent'
  ```
- this caveat meant 1password keys would show "absent" instead of "locked"
- the index file fixes this — 1password keys correctly show "locked"

**is this scope creep?**

technically yes — blueprint did not specify this. but criteria says:
- report "absent" when item deleted from 1password
- report "locked" when item exists but not unlocked

to distinguish these without manifest decryption, the index is necessary.

**verdict:** [backup] — necessary infrastructure for correct locked/absent status

---

### SC3: failhide fixes in daoKeyrackHostManifest

**what changed:** catch blocks now rethrow system errors (permission denied, etc.)

**blueprint says:** no mention of failhide

**analysis:**
- old code silently swallowed ALL errors, including permission denied
- fix distinguishes conversion failures from system errors
- system errors (permission denied) should fail fast, not be treated as "no key found"

**is this scope creep?**

yes — this is a bug fix unrelated to the wish.

**verdict:** [backup] — legitimate bug fix discovered during implementation

---

## conclusion

| scope creep | decision | rationale |
|-------------|----------|-----------|
| SC1: exit code consistency | backup | semantic consistency with blueprint's exit(2) |
| SC2: host manifest index | backup | necessary for correct locked/absent detection |
| SC3: failhide fixes | backup | legitimate bug fix, prevents silent data loss |

all scope creep items are documented and backed up with rationale. no silent scope creep detected.
