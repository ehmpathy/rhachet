# self-review: has-questioned-requirements

## requirements questioned

### R1: use keyrack instead of use.apikeys.sh pattern

| question | answer |
|----------|--------|
| who said this? | wisher, in 0.wish.md |
| what evidence supports it? | jest.integration.env.ts pain: requires manual `source` every terminal |
| what if we didn't? | developers keep to forget to source, unclear errors persist |
| is scope too large/small? | scope is right — focused replacement of one pattern |
| simpler way? | could improve error messages, but doesn't solve root cause |

**verdict**: requirement holds. the pain is real and keyrack solves it.

---

### R2: jest.integration.env.ts auto-fetches from keyrack

| question | answer |
|----------|--------|
| who said this? | wisher: "jest.integration.env.ts to automatically unlock the keyrack via shell spawn cli" |
| what evidence supports it? | the current code already spawns shell for testdb check; same pattern works here |
| what if we didn't? | user still needs manual step before tests |
| is scope too large/small? | minimum viable change |
| simpler way? | no — this is the simplest path to auto-fetch |

**verdict**: requirement holds.

---

### R3: default to --owner ehmpath

| question | answer |
|----------|--------|
| who said this? | wisher explicitly: "it should support fetch keys from the --owner ehmpath by default" |
| what evidence supports it? | rhachet repo is ehmpathy-maintained; typical contributors are ehmpaths |
| what if we didn't? | users must know/remember which owner to use |
| is scope too large/small? | scope is right |
| simpler way? | could infer from org: in keyrack.yml — but explicit is clearer |

**verdict**: requirement holds, but noted: keyrack.yml already has `org: ehmpathy`. could potentially infer owner from org.

---

### R4: keyrack unlock reminds to run keyrack fill if keys absent

| question | answer |
|----------|--------|
| who said this? | wisher: "rhx keyrack unlock should remind users to run rhx keyrack fill if it detects any keys that are absent" |
| what evidence supports it? | good UX to guide users to populate absent keys |
| what if we didn't? | users unlock but still have absent keys — unclear error |
| is scope too large/small? | **ISSUE**: this is a keyrack CLI enhancement, not a consumer repo change |
| simpler way? | jest.integration.env.ts can show the "run keyrack set" message |

**verdict**: **scope creep detected**.

the wisher asks for two things:
1. this repo uses keyrack (in scope)
2. keyrack CLI gets new fill feature (out of scope for this behavior)

the vision incorrectly assumed `keyrack fill` exists. it does not — only `keyrack set` exists.

**action**:
- removed `keyrack fill` references from vision
- jest.integration.env.ts will show "keyrack set" commands for absent keys (keyrack get --json already provides these)

---

### R5: eliminate use.apikeys.sh and all references

| question | answer |
|----------|--------|
| who said this? | wisher: "the goal = eliminate .agent/.../use.apikeys.sh" |
| what evidence supports it? | clean break from old pattern |
| what if we didn't? | confusion about which pattern to use |
| is scope too large/small? | clear and achievable |
| simpler way? | no — either keep it or remove it |

**verdict**: requirement holds.

---

## issues found and fixed

### issue 1: keyrack fill command doesn't exist

**found**: vision referenced `rhx keyrack fill` multiple times

**reality**: only `rhx keyrack set` exists to configure individual keys

**fix**: updated vision to reference `keyrack set` instead. the keyrack get --json output already provides the exact fix command for each absent key.

### issue 2: keyrack.yml doesn't declare required test keys

**found**: use.apikeys.json declares `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `XAI_API_KEY`

**reality**: keyrack.yml has different keys (REGULAR_KEY, MY_API_KEY, etc.)

**fix**: implementation must update keyrack.yml to declare the actual required test keys under env.test

### issue 3: JSON output format assumption was wrong

**found**: vision assumed output like `{ "keys": { "KEY": { "secret": "..." } } }`

**reality**: actual output is array of status objects with fix commands

**fix**: jest.integration.env.ts will parse the actual format returned by keyrack get --json

---

## non-issues confirmed

### keyrack get --for repo works

tested: `rhx keyrack get --for repo --env test --json` returns all keys declared for the repo with status info.

### keyrack provides fix commands

when keys are locked or absent, the JSON output includes exact commands to unlock/set them. this makes the error message ergonomics excellent.

### execSync pattern is proven

jest.integration.env.ts already uses execSync for testdb check. same pattern works for keyrack.

---

## summary

| requirement | verdict |
|-------------|---------|
| R1: use keyrack | ✓ holds |
| R2: auto-fetch in jest | ✓ holds |
| R3: --owner ehmpath | ✓ holds (could infer from org) |
| R4: keyrack fill reminder | ⚠️ scope creep — use keyrack set instead |
| R5: eliminate use.apikeys.sh | ✓ holds |

## fixes applied to vision

the following edits were made to `1.vision.md`:

1. **line 63**: changed `rhx keyrack fill` → `keyrack get shows keyrack set commands`
2. **line 78**: changed `absent key | keyrack reminds user to rhx keyrack fill` → `absent key | keyrack get shows rhx keyrack set command`
3. **lines 82-104**: replaced assumed JSON format with actual keyrack get --json output format
4. **lines 108-113**: changed user timeline to reference `keyrack set` instead of `keyrack fill`
5. **line 186**: changed `key absent from vault | rhx keyrack fill` → `key absent from vault | rhx keyrack set`
6. **line 253**: added explicit keys to declare: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `XAI_API_KEY`

## lessons learned

1. **verify CLI commands exist before referencing them** — i assumed `keyrack fill` was extant based on wisher's wish, but should have run `rhx keyrack --help` first
2. **test actual output formats** — the JSON structure i imagined was wrong; always test with real commands
3. **distinguish between "use extant feature" vs "build new feature"** — the wisher wanted both, but only the former is in scope for this behavior
