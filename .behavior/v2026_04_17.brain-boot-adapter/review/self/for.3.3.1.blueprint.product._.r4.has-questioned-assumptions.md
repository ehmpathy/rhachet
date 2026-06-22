# self-review: has-questioned-assumptions

## stone

3.3.1.blueprint.product

## review round

r4

## check

has-questioned-assumptions

---

## assumptions identified

### assumption.1 = CLAUDE_CONFIG_DIR env var works

**what we assume:** the `CLAUDE_CONFIG_DIR` env var makes Claude Code read CLAUDE.md from that directory

**evidence:** verified empirically in wish (0.wish.md, "Empirically verified (2026-04-17)")

**what if opposite were true:** feature would not work

**verdict:** VALID — empirically verified

---

### assumption.2 = CLAUDE.md loads at position 2

**what we assume:** CLAUDE.md loads before dynamic content (cwd, git status)

**evidence:** research [9] Claude Code Camp: "CLAUDE.md is injected as a system-reminder in messages, before environment info"

**what if opposite were true:** no cache benefit — would be same as hooks

**verdict:** VALID — research-backed

---

### assumption.3 = bootRoleResources stdout can be captured

**what we assume:** we can capture bootRoleResources stdout to a string

**evidence:** bootRoleResources uses console.log; stdout can be captured via child_process

**simpler approach:** call bootRoleResources with modified output target?

**question:** should bootRoleResources return string instead of print?

**verdict:** VALID but flagged — current design captures stdout. alternative: refactor bootRoleResources to return string. YAGNI for now.

---

### assumption.4 = 5-min cache TTL is sufficient

**what we assume:** 5-min TTL provides cache benefit

**evidence:** research confirms 5-min is current default; 1-hour deferred as optimization

**what if opposite were true:** would still get benefit within 5-min window

**verdict:** VALID — even pessimistic case provides benefit

---

### assumption.5 = same roles = same CLAUDE.md = shared cache

**what we assume:** two sessions with same roles share cache

**evidence:** CLAUDE.md content is deterministic for same role set

**question:** is boot order deterministic?

**analysis:** blueprint specifies "published roles first, local roles last" — deterministic

**verdict:** VALID — order is deterministic

---

### assumption.6 = .credentials.json symlink works

**what we assume:** symlink to ~/.claude/.credentials.json provides auth

**evidence:** verified in wish research

**verdict:** VALID — verified

---

### assumption.7 = config dir can be committed to git

**what we assume:** default config can be committed; scoped configs should not be

**evidence:** criteria specifies this behavior

**question:** should CLAUDE.md be committed? it contains all briefs

**analysis:** briefs are already in repo (in .agent/). CLAUDE.md is derived artifact. could regenerate from source. but commit saves regeneration time for new clones.

**verdict:** VALID — commit default, gitignore scoped

---

### assumption.8 = no CLI flag for CLAUDE.md location

**what we assume:** only CLAUDE_CONFIG_DIR env var works, no CLI flag

**evidence:** web search confirmed: "There is no --claude-md or similar CLI flag"

**simpler approach:** none — env var is the only mechanism

**verdict:** VALID — research-confirmed

---

## found issues

none — all assumptions are either verified or flagged as acceptable.

### r4 update: new assumptions from BrainCliConfigAdapter

#### assumption.9 = unified adapter is simpler than separate adapters

**what we assume:** BrainCliConfigAdapter with daos: { hooks, boots, choice } is simpler than separate BrainHooksAdapter + BrainBootsAdapter

**analysis:**
- user explicitly requested unification ("deprecate BrainHooksAdapter")
- unification reduces lookup functions from 2 to 1
- unification co-locates related config (hooks, boots, CLI invocation)

**verdict:** VALID — user-directed simplification

#### assumption.10 = opencode brain needs BrainCliConfigAdapter

**what we assume:** opencode brain should also migrate to BrainCliConfigAdapter

**question:** does opencode support boots? choice?

**analysis:**
- opencode may not have OPENCODE.md equivalent (no boots)
- opencode CLI invocation is different (different choice)
- daos can return null/noop for unsupported features

**verdict:** FLAGGED — opencode adapter may have partial dao support. implementation should handle gracefully.

#### assumption.11 = daos.choice.cli is static (not async)

**what we assume:** cli.command, cli.configEnvVar are static strings, cli.args is sync function

**analysis from blueprint interface:**
```typescript
cli: {
  command: string;           // static
  configEnvVar: string;      // static
  args(input: { configPath: string }): string[];  // sync function
};
```

**question:** should these be async? could command/env var need async resolution?

**evidence against async:**
- CLI commands are fixed per brain ('claude', 'opencode')
- env var names are fixed per brain
- no known use case for dynamic resolution

**verdict:** VALID — sync is appropriate, no async overhead needed

#### assumption.12 = BrainChoiceDao.set handles both settings.json and credentials

**what we assume:** daos.choice.set writes settings.json AND creates credentials symlink

**question:** should these be separate operations?

**analysis:**
- both are part of "choice config" for a scope
- always done together (no use case for one without other)
- separation would add complexity without benefit

**verdict:** VALID — bundled operation is appropriate

#### assumption.13 = adapter.slug matches brain positional arg

**what we assume:** adapter.slug ('claude-code') maps to CLI positional ('claude')

**analysis from blueprint:**
- invokeInit takes $brain positional arg
- lookups getBrainCliConfigAdapterByConfigImplicit by brain slug
- adapter.slug may differ from CLI arg ('claude-code' vs 'claude')

**question:** is there a map layer? or should slug match exactly?

**evidence:** extant getBrainHooksAdapterByConfigImplicit handles this map

**verdict:** VALID — map layer already exists in lookup function

---

## holds (non-issues)

### hold.1 = bootRoleResources stdout capture is acceptable

flagged assumption.3 as potential refactor target, but YAGNI applies:
- current stdout capture works
- refactor would touch stable code
- defer until we need return-string behavior

### hold.2 = committed CLAUDE.md is acceptable

flagged in assumption.7 — CLAUDE.md is derived from briefs that are already committed. commit of derived artifact is acceptable because:
- enables zero-setup after clone
- same pattern as compiled assets in some repos
- team explicitly requested "clone and go" workflow

---

## verdict

**pass** — 13 assumptions identified (8 original + 5 from r4 update on BrainCliConfigAdapter). all verified or explicitly flagged:
- assumption.10: opencode partial dao support flagged for implementation attention
- assumptions 11-13: BrainChoiceDao.cli interface assumptions validated

---

## session review: 2026-04-23

verified against current blueprint (3.3.1.blueprint.product.yield.md):

### blueprint evolution noted

blueprint now specifies:
- `daos: { boots, hooks, auth, prefs }` (not `{ hooks, boots, choice }`)
- BrainCli entity handles spawn (not daos.choice.cli)
- vision-to-blueprint deviations explicitly documented

### assumptions still valid

| assumption | still valid? | verification |
|------------|--------------|--------------|
| CLAUDE_CONFIG_DIR env var | yes | documented in CLI contract changes |
| CLAUDE.md at position 2 | yes | summary references position 2 |
| 5-min cache TTL | yes | deferred 1-hour as optimization |
| boot order deterministic | yes | boot order section unchanged |
| opencode partial support | yes | adapter pattern supports per-brain daos |

### new assumptions to add (2026-04-23)

| assumption | evidence |
|------------|----------|
| BrainCli.spawn replaces choice.cli | vision-to-blueprint deviations table |
| auth dao handles credentials | split from choice for distinct lifecycle |
| prefs dao handles settings.json | split from choice for distinct lifecycle |

all assumptions traced to blueprint sections.

**confirmed pass**.

### found issues (2026-04-23)

#### issue.r4.1 = stale daos name in review

**problem:** r4 originally referenced `daos: { hooks, boots, choice }` but blueprint evolved to `daos: { boots, hooks, auth, prefs }`

**fix:** updated session review to note blueprint evolution and add assumptions for new structure (auth dao, prefs dao, BrainCli.spawn)

**status:** FIXED in this session
