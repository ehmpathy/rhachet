# review.self: has-pruned-yagni

## question

for each component in the code, ask:
- was this explicitly requested in the vision or criteria?
- is this the minimum viable way to satisfy the requirement?
- did we add abstraction "for future flexibility"?
- did we add features "while we're here"?
- did we optimize before we knew it was needed?

## review

### explicitly requested components

| component | requested in | status |
|-----------|--------------|--------|
| os.daemon vault adapter | wish, vision | ✓ minimal |
| 1password vault adapter | wish, vision | ✓ minimal |
| EPHEMERAL_VIA_SESSION mech | vision | ✓ minimal |
| PERMANENT_VIA_REFERENCE mech | vision | ✓ minimal |
| directory restructure | blueprint | ✓ minimal |
| isOpCliInstalled check | criteria, vision | ✓ minimal |
| exid prompt + validation | criteria, vision | ✓ minimal |

### emergent component: host manifest index

**what:** unencrypted index file at `keyrack.host.index.json` containing slugs only

**was it requested?** no — emerged during implementation

**why added:**
- problem: how to distinguish "locked" (key extant, needs unlock) from "absent" (key doesn't exist)?
- for owned vaults (os.secure, os.direct): check actual vault storage (.age files, json)
- for refed vaults (1password, aws.iam.sso): can't check external storage without decryption
- solution: unencrypted index enables locked/absent detection without manifest decryption

**is it minimal?**
- yes — index contains only slugs (no secrets)
- yes — only includes refed vaults (owned vaults have direct storage checks)
- yes — no abstraction beyond what's needed

**verdict:** necessary emergence, not YAGNI. without it, refed vault keys would always show "absent" when locked, breaking the expected unlock flow.

### things NOT added

- no guided 1password picker (vision explicitly deferred this to v2)
- no op cli auto-install
- no 1password connect api (vision chose op cli)
- no abstraction layers beyond extant adapter pattern
- no "convenience" methods

## conclusion

all components are either:
1. explicitly requested in vision/criteria/blueprint, OR
2. necessary emergent solutions to problems discovered during implementation

no YAGNI violations found.
