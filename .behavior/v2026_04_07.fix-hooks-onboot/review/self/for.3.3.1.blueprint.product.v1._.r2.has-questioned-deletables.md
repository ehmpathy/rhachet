# self-review r2: has-questioned-deletables

## what i reviewed

i walked through each feature and component in the blueprint and asked:
- does this feature trace to a requirement in the criteria?
- did the wisher explicitly ask for this feature?
- can this be removed entirely?
- if we deleted this and had to add it back, would we?

---

## features: can we delete them?

### feature 1: BrainHookEvent type — add 'onTalk'

**traces to:** criteria usecase.1 "declare onTalk in role", vision requirement 1

**can we delete it?** no. this is the foundational type union that all other code depends on. TypeScript would reject any usage of `'onTalk'` without this.

**verdict:** required

---

### feature 2: RoleHooksOnBrain interface — add onTalk property

**traces to:** criteria usecase.1 "declare onTalk in role", vision requirement 1

**can we delete it?** no. this is the interface developers use in Role.build. without the `onTalk` property, TypeScript would error on any role that tries to declare onTalk hooks.

**verdict:** required

---

### feature 3: RoleHooksOnBrain.nested — add onTalk entry

**traces to:** criteria usecase.1 (implicit — hooks must hydrate correctly)

**can we delete it?** let me check... the nested map is for domain-objects automatic hydration. without it, onTalk arrays would not be properly instantiated as RoleHookOnBrain instances.

**verdict:** required for correct hydration

---

### feature 4: extractDeclaredHooks — add onTalk extraction block

**traces to:** criteria usecase.1 "settings.json contains UserPromptSubmit hook", vision requirement 3 "auto-sync on link"

**can we delete it?** no. this is how hooks get extracted for sync. without this block, onTalk hooks would be silently ignored during sync.

**verdict:** required

---

### feature 5: EVENT_MAP — add onTalk: 'UserPromptSubmit'

**traces to:** criteria usecase.1 "settings.json contains UserPromptSubmit hook", vision requirement 2 "map to UserPromptSubmit"

**can we delete it?** no. this is the forward translation from rhachet event names to claude code event names. without it, hooks would not translate correctly.

**verdict:** required

---

### feature 6: translateHookFromClaudeCode — handle UserPromptSubmit → onTalk

**traces to:** criteria usecase.2 "unlink removes hook" (implicitly needs to read extant hooks)

**can we delete it?** this is the reverse translation — when would we need it? when we read extant hooks from settings.json. if a UserPromptSubmit hook already exists (e.g., from a previous link), we need to recognize it.

**verdict:** required for read of extant hooks

---

### feature 7: ClaudeCodeSettings.hooks — add UserPromptSubmit

**traces to:** criteria usecase.1 "settings.json contains UserPromptSubmit hook"

**can we delete it?** no. this is the TypeScript schema for settings.json. without this property, the compiler would reject any attempt to read or write UserPromptSubmit hooks.

**verdict:** required

---

### feature 8: opencode parsePluginFileName — add onTalk to regex

**traces to:** vision requirement 5 "support onTalk for opencode via chat.message event"

**can we delete it?** only if we remove opencode support entirely. the vision explicitly requested opencode support.

**verdict:** required by vision scope decision

---

### feature 9: opencode getHookImplementation — add onTalk case

**traces to:** vision requirement 5 "support onTalk for opencode via chat.message event"

**can we delete it?** only if we remove opencode support entirely. the vision explicitly requested opencode support.

**verdict:** required by vision scope decision

---

## components: can we simplify them?

### component: test coverage

5 new test cases are planned. can we delete any?

| test | why it exists | deletable? |
|------|---------------|------------|
| translateHookToClaudeCode + onTalk | verifies forward translation | no — core path |
| translateHookFromClaudeCode + onTalk | verifies reverse translation | no — needed for read |
| syncOneRoleHooksIntoOneBrainRepl + onTalk | verifies extraction | no — core path |
| parsePluginFileName + onTalk | verifies regex accepts onTalk | no — needed for opencode |
| generatePluginContent + onTalk | verifies chat.message output | no — needed for opencode |

**verdict:** all tests trace to features, none are superfluous

---

### component: implementation order

the blueprint specifies an implementation order (1-7). is this necessary?

**answer:** this is documentation for execution, not a feature. it guides the sequence to avoid type errors (types first, then operations). it adds no code.

**verdict:** documentation, not bloat

---

## did we add features not in vision/criteria?

i searched the blueprint for features that do not trace to requirements:

- no extra event types (only onTalk)
- no filter support (deliberately excluded per vision)
- no PostUserPromptSubmit (deliberately excluded per vision)
- no new abstractions or utilities
- no refactors of extant code

**verdict:** no unrequested features were added

---

## summary

| feature | traces to | deletable? |
|---------|-----------|------------|
| BrainHookEvent + onTalk | vision req 1, criteria 1 | no |
| RoleHooksOnBrain.onTalk | vision req 1, criteria 1 | no |
| RoleHooksOnBrain.nested + onTalk | criteria 1 (hydration) | no |
| extractDeclaredHooks + onTalk | vision req 3, criteria 1 | no |
| EVENT_MAP + onTalk | vision req 2, criteria 1 | no |
| translateHookFromClaudeCode | criteria 2 (read extant) | no |
| ClaudeCodeSettings.UserPromptSubmit | criteria 1 | no |
| opencode parsePluginFileName | vision req 5 | no |
| opencode getHookImplementation | vision req 5 | no |

---

## verdict

**no deletable features found.**

every feature in the blueprint traces to a requirement in the vision or criteria. the blueprint is minimal — it extends extant patterns with one new event type, makes no unnecessary abstractions, and adds no features beyond what was requested.
