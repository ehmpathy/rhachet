# self-review: has-questioned-deletables

## component: getAllAvailableIdentities extension

| question | answer |
|----------|--------|
| can this be removed? | no |
| if deleted and had to add back, would we? | yes |
| did we optimize something that shouldn't exist? | no |
| simplest version? | add owner param, check ~/.ssh/$owner |

**holds**: this is the core requirement from the vision — prikey auto-discovery from ~/.ssh/$owner

**why it cannot be removed**: the vision explicitly states "auto-discover prikey from ~/.ssh/$owner when --prikey not specified". without this change, users would still need to specify --prikey ~/.ssh/ehmpath every time they unlock. the whole point is to eliminate that friction.

---

## component: jest.integration.env.ts changes

| question | answer |
|----------|--------|
| can this be removed? | no |
| if deleted and had to add back, would we? | yes |
| did we optimize something that shouldn't exist? | no |
| simplest version? | spawn keyrack get, inject keys |

**holds**: this is the core behavior — tests fetch keys from keyrack automatically

**why it cannot be removed**: this is the primary deliverable of the behavior. the vision states "tests fetch keys from keyrack automatically. unlock once per session. no more source incantations." without this change, the entire behavior would have no effect.

---

## component: jest.acceptance.env.ts changes

| question | answer |
|----------|--------|
| can this be removed? | no |
| if deleted and had to add back, would we? | yes |
| did we optimize something that shouldn't exist? | no |
| simplest version? | same as integration |

**holds**: acceptance tests need same pattern

**why it cannot be removed**: the vision lists "jest.acceptance.env.ts — same changes as jest.integration.env.ts" in the files to modify. acceptance tests have the same apikeys requirements and the same legacy pattern. not updating them would leave inconsistent behavior between test types.

---

## component: keyrack.yml

| question | answer |
|----------|--------|
| can this be removed? | **YES** |
| if deleted and had to add back, would we? | no |
| did we optimize something that shouldn't exist? | yes |
| simplest version? | hardcode keys in jest.*.env.ts |

**issue found**: keyrack.yml is unnecessary indirection. the required keys are already known and specific to this repo. simpler to hardcode them directly in jest.*.env.ts where they're used.

**fix**: remove keyrack.yml from blueprint, hardcode keys array in jest.*.env.ts:
```ts
const requiredKeys = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'XAI_API_KEY'];
```

**lesson learned**: adding configuration files should be questioned. when the configuration is:
1. repo-specific (not shared across repos)
2. consumed in exactly one place (jest.*.env.ts)
3. unlikely to change frequently

then hardcoded values are simpler than a configuration file. indirection costs complexity.

---

## component: delete use.apikeys.sh

| question | answer |
|----------|--------|
| can this be removed? | no — it must be deleted |
| if deleted and had to add back, would we? | no |
| did we optimize a component that shouldn't exist? | n/a |
| simplest version? | delete entirely |

**holds**: legacy pattern elimination is required by the vision

**why it must be deleted**: the vision explicitly lists this under "files to eliminate". keeping it would leave two parallel credential systems, cause confusion, and defeat the purpose of the keyrack migration.

---

## component: delete use.apikeys.json

| question | answer |
|----------|--------|
| can this be removed? | no — it must be deleted |
| if deleted and had to add back, would we? | no |
| did we optimize a component that shouldn't exist? | n/a |
| simplest version? | delete entirely |

**holds**: legacy pattern elimination is required by the vision

**why it must be deleted**: the vision explicitly lists this under "files to eliminate". this config file is only read by the legacy jest.*.env.ts apikeys check which will be replaced. keeping it would leave dead code.

---

## summary

| component | verdict |
|-----------|---------|
| getAllAvailableIdentities extension | holds |
| jest.integration.env.ts changes | holds |
| jest.acceptance.env.ts changes | holds |
| keyrack.yml | **DELETED** — unnecessary indirection |
| delete use.apikeys.sh | holds |
| delete use.apikeys.json | holds |

## fix applied

updated blueprint to remove keyrack.yml and hardcode keys directly in jest.*.env.ts
