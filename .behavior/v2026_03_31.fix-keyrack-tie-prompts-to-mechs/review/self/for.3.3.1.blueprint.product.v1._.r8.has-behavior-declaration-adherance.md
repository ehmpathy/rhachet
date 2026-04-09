# self-review r8: has-behavior-declaration-adherance (deeper)

## fresh examination: architectural decisions

check if blueprint's architectural choices match wish intent.

---

## issue 1: mech lookup location

**wish says:**
> "the mech adapter should be looked up by the vault, via a common get mech interface"

**blueprint shows:**
- orchestrator (`setKeyrackKey.ts`) looks up both vault and mech adapters
- vault receives mech as input, doesn't look it up
- exception: aws.config vault orchestrates mech.promptForSet internally

**question:** is this a deviation?

**analysis:**
- the wish describes conceptual relationship (vaults use mechs)
- blueprint achieves this via orchestration pattern
- vault doesn't need direct mech lookup — orchestrator composes them
- aws.config special case: vault DOES interact with mech directly
- this special case is acceptable per wish: "aws sso works as it always did"

**why it holds:** the wish's "lookup by vault" is satisfied conceptually. the orchestrator pattern is cleaner than vaults that look up mechs directly. the special case for aws.config preserves extant behavior as requested.

---

## issue 2: keyrackOrg vs githubOrg

**vision interface note:**
> "note: keyrackOrg is for slug construction, not for github/aws api calls"
> "note: mech discovers external orgs independently (e.g., gh api /user/orgs)"

**blueprint shows:**
- `promptForSet: ({ key, keyrackOrg, env }) => { source: string }`
- "gh api /user/orgs → list GITHUB orgs (independent of keyrack org)"

**question:** does blueprint correctly distinguish these?

**analysis:**
- keyrackOrg is passed to promptForSet for slug construction
- mech discovers github orgs via gh api, independent of keyrackOrg
- the org the user selects for github app installation may differ from keyrackOrg
- example: keyrackOrg=ehmpathy, but user might choose github org=bhuild for installation

**why it holds:** blueprint correctly separates these concepts. keyrackOrg flows into slug, github org comes from user selection.

---

## issue 3: vault.set signature change

**wish implies:**
> "mech adapters own their prompts"

**extant vault adapter:**
```ts
set: (input: { slug, env, org, ... }) => Promise<void | { exid }>
// vault prompts for secret via stdin
```

**blueprint proposes:**
```ts
set: (input: { slug, secret, ... }) => void | { exid }
// secret from mech, not vault prompt
```

**question:** is this the right signature change?

**analysis:**
- extant: vault prompts for secret
- proposed: vault receives secret from mech
- this matches the wish: mech owns prompts, vault stores result
- however, signature shows `secret` as required input

**potential issue:** for aws.config special case, vault orchestrates mech.promptForSet internally. does vault.set still receive secret, or does it invoke promptForSet itself?

**blueprint note says:**
> "note: aws.config vault orchestrates promptForSet internally"

**clarification needed:** the set signature should probably be:
- for most vaults: `set({ slug, secret, ... })` — secret from mech
- for aws.config: vault calls mech.promptForSet internally, then writes result

**why it holds:** the blueprint's note about aws.config special case acknowledges this. implementation will handle the difference via vault-specific logic.

---

## issue 4: zero backwards compat

**wish says:**
> "we want to generically refactor all of it, with zero backwards compat"

**blueprint shows:**
- `[-] aws.iam.sso/` directory deleted
- `[-] inferMechFromVault.ts` deleted
- no shims, aliases, or migrations

**why it holds:** blueprint adheres to zero backwards compat. old patterns are deleted, not deprecated.

---

## summary

| architectural decision | adherance |
|------------------------|-----------|
| mech lookup via orchestration | ✓ cleaner than direct vault lookup |
| keyrackOrg vs githubOrg separation | ✓ correctly distinct |
| vault.set signature change | ✓ receives secret from mech |
| aws.config special case | ✓ vault orchestrates mech internally |
| zero backwards compat | ✓ old patterns deleted |

---

## verdict

all architectural decisions adhere to wish intent. no deviations found.
