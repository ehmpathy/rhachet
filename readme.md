# rhachet

![test](https://github.com/ehmpathy/rhachet/workflows/test/badge.svg)
![publish](https://github.com/ehmpathy/rhachet/workflows/publish/badge.svg)

a framework for reliable, composable, and iteratively improvable thought.

use 🧢 roles & add 🧠 brains to produce 🎭 actors who clone thought routes.

```
🧢 roles (💪 skills + 📚 briefs)
  + 🧠 brains
  = 🎭 actors
      → 💧 .ask() to think
      → 🔩 .act() on your behalf
      → 🪨 .run() curated executables
```

---

# install

to install locally, with cli use via `npx rhachet` and `npx rhx`,

```sh
# via pnpm
pnpm add rhachet

# via npm
npm install rhachet
```

to install globally, with cli use via `rhachet` and `rhx`,

```sh
# via pnpm
pnpm add -g rhachet

# via npm
npm install -g rhachet
```

---

# entry points

rhachet provides multiple entry points for optimal load times:

| entry point        | what                                | when to use                              |
| ------------------ | ----------------------------------- | ---------------------------------------- |
| `rhachet`          | full SDK                            | need stitchers, templates, full features |
| `rhachet/brains`   | brain objects + operations          | brain discovery, context creation        |
| `rhachet/actors`   | actor + role objects + operations   | actor creation, role operations          |

## lightweight imports

```ts
// full SDK — loads all modules
import { genActor, genContextBrain, Stitcher } from 'rhachet';

// brain-focused — loads only brain-related code
import { genContextBrain, BrainAtom, BrainRepl } from 'rhachet/brains';

// actor-focused — loads only actor + role code
import { genActor, Actor, Role } from 'rhachet/actors';
```

use the lightweight entry points when you only need a subset of rhachet functionality. this significantly improves import time for applications that don't need stitchers, templates, or weave composition.

---

# 🧢 `roles.<use>`

if you want to use rhachet, you want to use roles.

there's two ways to use roles. via `cli` and via `sdk`. both are described below.

---

## cli

humans have brains. robots have brains. who would have thought they'd need the same briefs and skills to work well?

the cli powers the most common usecase for rhachet. robots and humans depend on it in day to day operations via their roles.

### tldr

```sh
# install role repos
npm install rhachet-roles-ehmpathy

# init roles (sets defaults for the repo)
npx rhachet init --roles mechanic

# invoke skills
npx rhachet run --skill show.gh.test.errors

# use enrolled agents (boots with default roles from init)
claude

# spawn with specific roles (overrides defaults)
rhx enroll claude --roles mechanic           # only mechanic
rhx enroll claude --roles +architect         # defaults + architect
rhx enroll claude --roles -driver            # defaults - driver
```

### init

#### how

install a rhachet-roles package and run init:

```sh
# install the role repos you'd like to use. e.g.,
npm install rhachet-roles-ehmpathy rhachet-roles-bhuild rhachet-roles-bhrain

# initialize the roles, to make them available for use to agents in the repo
npx rhachet init --roles mechanic behaver reviewer
```

if the same role name exists in multiple packages, use `$repo/$role` syntax to disambiguate

```sh
# init the role repos with repo disambiguation. e.g.,
npx rhachet init --roles ehmpathy/mechanic bhuild/behaver bhrain/reviewer
```

after init, any agents you spawn in the repo will boot with those roles. rhachet configures your brain-repls via hooks (e.g., in `.claude/settings.json`) so enrollment happens automatically and resiliently.

#### why

the `.agent/` directory is a curated & shared source of truth. robots get their briefs and skills from here. so can humans.

**zero magic. full transparency.**

```
.agent/
  repo=.this/              # roles specific to this repo
    role=any/
      readme.md            # ← you can read this
      briefs/              # ← and these (which robots boot with)
      skills/              # ← and these (which robots exec from)
  repo=ehmpathy/           # roles linked from rhachet-roles-ehmpathy
    role=mechanic/  →      # symlink to node_modules/...
                           # ← same exact structure as above
```

browse the same briefs robots get booted with. invoke the same skills they dispatch. edit and iterate — changes take effect immediately.

### enroll

#### how

spawn a brain with specific roles via `rhx enroll`:

```sh
rhx enroll <brain> --roles <spec> [passthrough args...]
```

the `--roles` spec supports three modes:

| mode | syntax | example | result |
| ---- | ------ | ------- | ------ |
| replace | `role` or `role1,role2` | `--roles mechanic` | only mechanic |
| append | `+role` | `--roles +architect` | defaults + architect |
| subtract | `-role` | `--roles -driver` | defaults - driver |
| mixed | `+role1,-role2` | `--roles +architect,-driver` | defaults + architect - driver |

```sh
# spawn with only mechanic role (replace mode)
rhx enroll claude --roles mechanic

# spawn with defaults plus architect (append mode)
rhx enroll claude --roles +architect

# spawn with defaults minus driver (subtract mode)
rhx enroll claude --roles -driver

# spawn with specific combo (replace mode)
rhx enroll claude --roles mechanic,ergonomist

# passthrough args to brain
rhx enroll claude --roles mechanic --resume

# pass a prompt directly
rhx enroll claude --roles mechanic "review this code"
```

beyond `--roles`, `enroll` accepts:

| flag | what | example |
| ---- | ---- | ------- |
| `--as @:<slug>` | name the spawned clone with a stable handle, to `say`/`get` it by `@:<slug>` later | `rhx enroll claude --as @:driver` |
| `--reason <text>` | record WHY this enrollment happened in the actor's audit log (accepts `@stdin`) | `rhx enroll claude --reason "nightly cron"` |
| `--no-socket` | skip the reach socket — spawn the brain plain, no `say`/`get` | `rhx enroll claude --no-socket` |
| `--output <mode>` | `tree` (default, human) or `json` (a machine handoff of the clone's serial + reachability) | `rhx enroll claude --output json` |

```sh
# name the clone so a cron can reach it later
rhx enroll claude --roles mechanic --as @:driver

# record the motive; a supervisor reads the serial back as json
rhx enroll claude --reason "nightly cron" --output json
```

a bare `rhx enroll <brain>` with no `--as` still prints the clone's own `@:<serial>` to stderr,
so you can reach your own clone without a second command. reach the spawned clone with
`rhx clone say`/`get` (see the `clone` section below).

#### why

`init` sets the default roles for a repo — every agent spawned inherits those roles automatically.

`enroll` lets you override those defaults for a single session:

- **focus** — spawn a mechanic-only clone when you just need code, no driver workflow briefs cluttering context
- **specialization** — add architect role for a deep refactor without changing repo defaults
- **isolation** — the enrolled brain boots with *only* the specified roles' hooks, no inheritance from user or project configs

under the hood:
1. generates a unique config (`.claude/settings.enroll.$hash.json`)
2. filters hooks to only the specified roles
3. spawns with `--setting-sources local` to skip all default configs

### clone

#### how

an actor is a recipe; bake it into a clone, then talk with the clone easily (from any process, not just the keyboard):

**talk** — list, message, observe, self-identify, prune:

```bash
rhx actor list                                 # actors (the identities)
rhx clone list                                 # clones + state (LIVE|DEAF|DEAD)
rhx clone say @:<serial|slug> --what <m>        # dispatch a message (single-line; --what @stdin ok)
rhx clone get @:<serial|slug> --tail 40         # observe (--tail all = whole log; --format blocks|raw)
rhx clone whoami                                # from within a clone: its own address
rhx clone prune [@<actor>] [--older-than <dur>] # reap dead clones (plan by default; --mode apply)
```

`clone get` renders a directioned conversation (`🎙️` say / `🎧` reply turns) by default; `--format raw`
keeps the verbatim pipe-clean stream a comms relay forwards.

`clone prune` is plan-by-default (a safe preview); `--mode apply` reaps. it NEVER prunes a LIVE clone,
nor a cross-host clone whose pid it cannot verify.

every talk verb takes `--output tree|json` (default `tree`): `json` emits a machine shape a
cron/comms consumer reads by field, never by tree-glyph. `whoami --output json` also carries the
clone's own `actorHash`, so a clone can `clone list @<actorHash>` to enumerate its peers.

**bake** — make, fork, or wake _(planned — the [`rhx clone` dream](.dream/2026_08_07.clone-actor-from-actors-yml.dream.md); NOT yet registered. today a clone is baked by `rhx enroll`)_:

```bash
rhx clone make @<slug>          [--as @:<slug>]   # (planned) from a declared actor
rhx clone fork @:<serial|slug>  [--as @:<slug>]   # (planned) from an extant clone
rhx clone wake @:<serial|slug>                    # (planned) reopen an extant clone
```

address an actor with `@<slug>` (≡ `actor://<slug>`) and a clone with `@:<serial>` (≡
`clone://<serial>`) or `@:<slug>` (≡ `clone://<slug>`) — the actor is the unmarked base, the clone
wears the `:` grain-marker, and it answers to two bodies: its **serial** (the primary ref, always
present) or its **slug** (the `--as` unique ref, if named).

howtos — **[use clones](.agent/repo=.this/role=user/briefs/actors/howto.use.clones.md)** ·
**[author actors.yml](.agent/repo=.this/role=user/briefs/actors/howto.author-actors-yml.md)** ·
**[address sigils](.agent/repo=.this/role=any/briefs/define.address-sigils.md)** ·
**[experience inventory](.agent/repo=.this/role=user/briefs/actors/inventory.of=experience._.md)**.

#### why

`enroll` spawns the **same exact clone** — equally addressable by any process, not just the keyboard —
it is simply based on a **default or ad-hoc actor** (anonymous, hash-derived). `clone` enables
**reusable actors** (declared by slug in `actors.yml`, **beyond** default and ad-hoc), so every actor is
addressable and any process can reach it:

- **talk from anywhere** — a cron or comms handler can `say` into a live clone and `get` its output, no terminal takeover
- **per-brain safety** — the interface scopes control to one brain-cli, not your whole terminal (e.g., kitty, tmux)
- **recipe reuse** — declare an actor once in `actors.yml`, bake many clones from it that stay in sync

### use

| command           | route   | what it does                               |
| ----------------- | ------- | ------------------------------------------ |
| `npx rhachet run` | 🪨 solid | execute a shell skill, no brain            |
| `npx rhachet act` | 🔩 rigid | execute a skill with deterministic harness |
| `npx rhachet ask` | 💧 fluid | converse with an actor, brain decides path |

#### 🪨 solid: run

deterministic operations, no brain.

```sh
npx rhachet run --skill gh.workflow.logs --workflow test
```

**shorthand: `rhx`**

`rhx` is an alias for `rhachet run --skill`

```sh
npx rhx gh.workflow.logs --workflow test
```

#### 🔩 rigid: act

augmented orchestration, harness controls flow, brain augments.

```sh
npx rhachet act \
  --role mechanic --skill review \
  --input "https://github.com/org/repo/pull/9"

npx rhachet act \
  --role mechanic --skill review \
  --input "https://github.com/org/repo/pull/9" \
  --brain openai/codex
```

#### 💧 fluid: ask

probabilistic exploration, brain decides the path.

```sh
npx rhachet ask \
  --role skeptic \
  --say "are birds real?"
```

---

## sdk

the sdk powers programmatic clone usage with strict contracts. applications and services depend on it to leverage clones for reliable, composable, and improvable thought. an **actor** is the recipe (a brain enrolled with roles); a **clone** is the live embodiment you engage.

### tldr

```ts
import { genActor, genClone } from 'rhachet';
import { genBrainRepl } from 'rhachet-brains-openai';
import { surfCoachRole } from './domain.roles/surf-coach';
import { lifeguardRole } from './domain.roles/lifeguard';

// `longboarder` is an actor — the recipe: a list of roles enrolled with an allowlist of brains
const longboarder = genActor({
  roles: [surfCoachRole, lifeguardRole],
  brains: [genBrainRepl({ slug: 'openai/codex' })],
});

// `waikiki9am` is a clone — a live run baked from the `longboarder` actor
const waikiki9am = genClone({ actor: longboarder });
await waikiki9am.ask({ prompt: 'how do i coach a faster pop-up?' });   // 💧 fluid
await waikiki9am.act({ skill: { 'plan.session': { level: 'beginner' } } }); // 🔩 rigid
await waikiki9am.run({ skill: { 'waves.report': { spot: 'waikiki' } } })    // 🪨 solid
```

### init

#### how

first declare an actor (the recipe — a list of roles + an allowlist of brains), then bake a clone from it:

```ts
import { genActor, genClone } from 'rhachet';
import { genBrainRepl } from 'rhachet-brains-openai';
import { surfCoachRole } from './domain.roles/surf-coach';
import { lifeguardRole } from './domain.roles/lifeguard';

// `longboarder` — the actor: the durable recipe (named for its composite specialty, not any role slug)
export const longboarder = genActor({
  roles: [surfCoachRole, lifeguardRole],
  brains: [
    genBrainRepl({ slug: 'openai/codex' }),       // default (first in list)
    genBrainRepl({ slug: 'openai/codex/mini' }),  // fast + cheap alternative
  ],
});

// `waikiki9am` — a clone: a live run you engage (named for the run, not a role or a person)
export const waikiki9am = genClone({ actor: longboarder });
```

#### why

the clone interface provides:
- **strict enrollment** — brains allowlist ensures only approved brains can be used
- **isomorphic with cli** — same `.run()`, `.act()`, `.ask()` interface as cli commands
- **composition** — clones can be composed into higher-order workflows and skills
- **consistent contracts** — type-safe inputs and outputs across all thought routes

common usecases:
- create reusable skills that leverage brain capabilities
- deliver product behaviors powered by enrolled clones
- build automation pipelines with reliable, testable thought

### use

| method        | route   | what it does                               |
| ------------- | ------- | ------------------------------------------ |
| `clone.run()` | 🪨 solid | execute a shell skill, no brain            |
| `clone.act()` | 🔩 rigid | execute a skill with deterministic harness |
| `clone.ask()` | 💧 fluid | converse with a clone, brain decides path  |

#### 🪨 solid: run

deterministic operations, no brain.

```ts
await waikiki9am.run({
  skill: { 'waves.report': { spot: 'waikiki' } },
});
```

#### 🔩 rigid: act

augmented orchestration, harness controls flow, brain augments.

```ts
// uses default brain (first in allowlist)
await waikiki9am.act({
  skill: { 'plan.session': { level: 'beginner', students: 6 } },
});

// uses explicit brain (must be in allowlist)
await waikiki9am.act({
  brain: { repo: 'openai', slug: 'codex/mini' },
  skill: { 'plan.session': { level: 'beginner', students: 6 } },
});
```

#### 💧 fluid: ask

probabilistic exploration, brain decides the path.

```ts
await skeptic.ask({
  prompt: 'are birds real? or are they just government drones 🤔',
});
```

---

# 🧢 `roles.<add>`

## collocated roles

create directly in `.agent/repo=.this/`. zero dependencies. instant experimentation.

### default: `role=any`

`repo=.this/role=any/` is created whenever rhachet is linked in a repo. it applies to anyone who works in the repo — human or robot. use it for repo-wide briefs and skills.

### custom: `role=$name`

create custom roles for scoped briefs and skills:

| role           | purpose                                           |
| -------------- | ------------------------------------------------- |
| `role=human`   | briefs & skills applicable only to humans         |
| `role=robot`   | briefs & skills applicable only to robots         |
| `role=dbadmin` | briefs & skills for database administration scope |

custom roles are opt-in — irrelevant by default, enrolled when needed.

```
.agent/repo=.this/
  role=any/        # default, applies to everyone
  role=human/      # human-specific
  role=robot/      # robot-specific
  role=dbadmin/    # scoped to db work
```

## published roles

to share roles via npm as a `rhachet-roles-*` package, generate a `rhachet.repo.yml` manifest.

### generate manifest

run `repo introspect` to generate the manifest from your package's `getRoleRegistry` export

```sh
npx rhachet repo introspect
# creates rhachet.repo.yml at package root
```

preview before write:

```sh
npx rhachet repo introspect --output -
# outputs yaml to stdout
```

### rhachet.repo.yml schema

the manifest describes your roles for package-based discovery:

```yaml
slug: ehmpathy
readme: readme.md
roles:
  - slug: mechanic
    readme: roles/mechanic/readme.md
    briefs:
      dirs: roles/mechanic/briefs
    skills:
      dirs: roles/mechanic/skills
    inits:
      dirs: roles/mechanic/inits
```

| field               | what                                    |
| ------------------- | --------------------------------------- |
| `slug`              | unique identifier for the repo          |
| `readme`            | path to repo readme relative to root    |
| `roles`             | list of role definitions                |
| `roles.slug`        | unique identifier for the role          |
| `roles.readme`      | path to role readme                     |
| `roles.briefs.dirs` | path(s) to briefs directories           |
| `roles.skills.dirs` | path(s) to skills directories           |
| `roles.inits.dirs`  | path(s) to inits directories (optional) |

---

# 🧠 `brains.<use>`

brains are thought mechanisms. install a supplier, use it directly or via context.

### tldr

```sh
npm install rhachet-brains-anthropic
```

```ts
import { genContextBrain } from 'rhachet/brains';

const context = await genContextBrain({ choice: 'anthropic/claude-sonnet' });
const result = await context.brain.repl.act({ prompt: 'review the pull request', ... });
```

### chose

see [howto.use.brain.genContextBrain](.agent/repo=.this/role=user/briefs/brains/howto.use.brain.genContextBrain.md) for full docs.

#### 🔭 discovered brains

auto-discover installed `rhachet-brains-*` packages. useful when you want skills that work with any brain supplier.

```ts
import { genContextBrain } from 'rhachet/brains';

const context = await genContextBrain({ choice: 'anthropic/claude-sonnet' });
const result = await context.brain.repl.ask({ prompt: 'hello', ... });
```

#### 🔬 imported brains

pass brains directly. no discovery. synchronous.

```ts
import { genContextBrain } from 'rhachet/brains';
import { genBrainRepl } from 'rhachet-brains-anthropic';

// direct
const repl = genBrainRepl({ slug: 'anthropic/claude-sonnet' });
const result = await repl.ask({ prompt: 'hello', ... });

// via context
const context = genContextBrain({ brains: { repls: [repl] }, choice: 'anthropic/claude-sonnet' });
const result = await context.brain.repl.ask({ prompt: 'hello', ... });
```

### use

#### 🔍 brain.atom.ask

```ts
const result = await context.brain.atom.ask({ role, prompt: 'summarize the changes', ... });
```

#### 🔍 brain.repl.ask

```ts
const result = await context.brain.repl.ask({ role, prompt: 'what needs refactor?', ... });
```

#### 🔨 brain.repl.act

```ts
const result = await context.brain.repl.act({ role, prompt: 'review the pull request', ... });
```

#### inputs

| input | what | docs |
| ----- | ---- | ---- |
| `role` | the role persona for the brain | [howto.use.brain.role](.agent/repo=.this/role=user/briefs/brains/howto.use.brain.role.md) |
| `prompt` | the prompt to send | [howto.use.brain.prompt](.agent/repo=.this/role=user/briefs/brains/howto.use.brain.prompt.md) |
| `plugs` | tools, memory, etc | [howto.use.brain.plugs](.agent/repo=.this/role=user/briefs/brains/howto.use.brain.plugs.md) |
| `schema` | output schema for structured responses | [howto.use.brain.schema](.agent/repo=.this/role=user/briefs/brains/howto.use.brain.schema.md) |
| `on` | episode continuation | [howto.use.brain.on](.agent/repo=.this/role=user/briefs/brains/howto.use.brain.on.md) |
| `hooks` | brain lifecycle hooks | [howto.use.brain.hooks](.agent/repo=.this/role=user/briefs/brains/howto.use.brain.hooks.md) |
```

### grains

rhachet recognizes two brain grains:

| grain      | symbol | what                 | tool execution            |
| ---------- | ------ | -------------------- | ------------------------- |
| BrainAtom  | ○      | single inference     | outputs invocations       |
| BrainRepl  | ↻      | read-eval-print-loop | executes tools internally |

○ atoms are stateless. one turn in, one turn out. ↻ repls loop until complete.

### tool use

brains can call tools. see brief: [howto.use.brain.tools.md](.agent/repo=.this/role=user/briefs/brains/howto.use.brain.tools.md)

---

# 🧠 `brains.<add>`

## supplier packages

publish brain suppliers as `rhachet-brains-*` packages.

| package | provider | atoms | repls |
| ------- | -------- | ----- | ----- |
| `rhachet-brains-anthropic` | anthropic (claude) | ✓ | ✓ |
| `rhachet-brains-openai` | openai (gpt, codex) | ✓ | ✓ |
| `rhachet-brains-xai` | xai (grok) | ✓ | - |
| `rhachet-brains-chutes` | chutes.ai | ✓ | - |
| `rhachet-brains-bhrain` | bhrain arch1 | - | ✓ |

## create a supplier

create a `BrainAtom` or `BrainRepl` that wraps your inference provider.

see brief: [howto.for.suppliers.md](.agent/repo=.this/role=user/briefs/brains/howto.for.suppliers.md)

---

# concepts

## .tldr

```
🧢 roles (💪 skills + 📚 briefs)
  + 🧠 brains
  = 🎭 actors
      → 💧 .ask() to think
      → 🔩 .act() on your behalf
      → 🪨 .run() curated executables
```

---

## .usage

### step 1: create or reuse roles

a 🧢 role bundles 💪 skills and 📚 briefs:
- 💪 skills = executable capabilities (e.g., `fetch-pr-comments.sh`, `review.rigid.ts`)
- 📚 briefs = curated knowledge (e.g., `rule.require.arrow-functions.md`, `define.input-context-pattern.md`)

create your own roles, or reuse roles published as `rhachet-roles-*` packages.

the spec is light: a readme, a briefs dir, a skills dir. that's it.

### step 2: enroll brains to create actors

a 🧠 brain is an inference provider (openai, anthropic, etc).

enroll a 🧠 brain with a 🧢 role → produce an 🎭 actor (the recipe); bake it into a 😶 clone (the live embodiment) to engage.

😶 clones can:
- `.ask()` → 💧 fluid thought, brain decides the path
- `.act()` → 🔩 rigid thought, harness controls, brain augments
- `.run()` → 🪨 solid execution, no brain needed

```ts
const longboarder = genActor({
  roles: [surfCoachRole, lifeguardRole],
  brains: [genBrainRepl({ slug: 'openai/codex' })],
});

const waikiki9am = genClone({ actor: longboarder });
await waikiki9am.ask({ prompt: 'how do i coach a faster pop-up?' });     // 💧 fluid
await waikiki9am.act({ skill: { 'plan.session': { level: 'beginner' } } }); // 🔩 rigid
await waikiki9am.run({ skill: { 'waves.report': { spot: 'waikiki' } } })    // 🪨 solid
```

---

## .terms

### .terms.objects

| concept | emoji | what                                                    |
| ------- | ----- | ------------------------------------------------------- |
| role    | 🧢     | bundle of skills + briefs                               |
| brain   | 🧠     | inference provider (atom = one-shot, repl = multi-turn) |
| actor   | 🎭     | a recipe — a brain enrolled with roles                  |
| clone   | 😶     | a live embodiment of an actor                           |
| skill   | 💪     | executable capability                                   |
| brief   | 📚     | curated knowledge                                       |

### .terms.brain.grains

🧠 brains are inference providers that enable probabilistic thought:

| grain      | symbol | what                 | characteristics                | example                          |
| ---------- | ------ | -------------------- | ------------------------------ | -------------------------------- |
| brain.atom | ○      | single inference     | stateless, one-shot            | claude/haiku, openai/gpt-4o-mini |
| brain.repl | ↻      | read-eval-print-loop | stateful, multi-turn, tool use | claude/code, openai/codex        |

○ brain.atom is for single-turn operations. ↻ brain.repl is for multi-turn operations.

### .terms.thought.routes

| route | emoji | what                                      | when                               |
| ----- | ----- | ----------------------------------------- | ---------------------------------- |
| solid | 🪨     | deterministic throughout                  | faster, cheaper, reliable          |
| rigid | 🔩     | deterministic harness + probabilistic ops | you control flow, brain fills gaps |
| fluid | 💧     | probabilistic throughout                  | brain decides the path             |

### .terms.actor.verbs

| method   | route | what                          |
| -------- | ----- | ----------------------------- |
| `.run()` | 🪨     | execute skill, no brain       |
| `.act()` | 🔩     | execute skill, brain augments |
| `.ask()` | 💧     | converse, brain decides path  |


---

## .enrollment

to enroll = pair a 🧠 brain with a 🧢 role → produce an 🎭 actor.

### why it works

🧢 roles are portable. the same role works with any brain:

```
mechanic role + openai    → mechanic actor (openai-powered)
mechanic role + anthropic → mechanic actor (anthropic-powered)
```

🧠 brains are swappable. upgrade, downgrade, or switch — the role stays the same.

this separation means:
- 🧢 roles encode institutional knowledge that improves over time
- 🧠 brains can be swapped without any change to the role
- 🎭 actors inherit skills + briefs, powered by whichever brain is enrolled

define a role once, enroll any brain, clone that thought.

### 📚 briefs flavor the brain

📚 briefs change the perspective and preferences of the enrolled 🧠 brain. they suffix the system prompt to flavor how the brain thinks.

briefs supply knowledge about:
- tone (e.g., "use lowercase prose")
- terms (e.g., "call it 'customer', never 'user' or 'client'")
- patterns (e.g., "always use input-context pattern")
- rules (e.g., "never use gerunds")

briefs are suffixed to every system prompt and survive compaction — reliable enrollment.

> **🪐 analogy: concept planets**
>
> 🧠 brains navigate concept space like ships navigate galactic space.
>
> 📚 briefs register concept planets. each planet has gravity that pulls the brain's thought toward it.
>
> ask an unenrolled brain to review code. it drifts toward whatever concepts it absorbed — java idioms, verbose comments, patterns you've never used.
>
> enroll that brain with a mechanic role. the 📚 briefs register concept planets:
> - 🪐 "arrow functions only"
> - 🪐 "input-context pattern"
> - 🪐 "fail fast via HelpfulError"
>
> these planets now have immense gravity. the brain's thought bends toward them. it reviews code the way your team reviews code — because enrollment shaped the gravity of the concepts it navigates to.

### 💪 skills curate the skillset

💪 skills offload work from imagine-cost to compute-cost:
- imagine-cost = time + tokens to imagine how to do a task
- compute-cost = deterministic executable, instant and free

example:
```
wout skill: "please fetch the pr comments" → brain imagines how, calls gh api, parses response
with skill: clone.run({ skill: { 'fetch-pr-comments': { pr } } }) → instant, deterministic
```

skills unlock consistency. 🧠 brains are probabilistic — they won't do the same task the same way twice. 💪 skills maximize determinism and composition — via distillation of thought routes from fluid → rigid → solid.

**the determinism spectrum:**

| route   | example                                                     | determinism        |
| ------- | ----------------------------------------------------------- | ------------------ |
| 🪨 solid | fetch pr comments                                           | 100% deterministic |
| 🔩 rigid | review pr (fetch = deterministic, analysis = probabilistic) | blended            |
| 💧 fluid | "what should we refactor?"                                  | 100% probabilistic |

ideally, crystallize as much work as possible into 🪨 solid skills. use 🔩 rigid when you need to blend deterministic setup with probabilistic thought. reserve 💧 fluid for open-ended exploration.

---

# sophi

### vision

digital actors that run from anywhere, for anyone.

distill portable, durable roles with rhachet. compose them, share them, open source them.

- open source top to bottom — to raise the floor and spread prosperity.
- observable thought routes — to not only debug, but align.
- composable thought routes — for iterative improvement and testable guarantees.

here's to a solarpunk future of distributed abundance 🌞🌴

### why "rhachet"?

the name reflects a dual ratchet metaphor:

1. to **ratchet iterative improvement** — slipless iterative improvement of capabilities via roles, briefs, and skills. each iteration builds on the last, externalized and durable.

2. to **ratchet distributed abundance** — rhachet unlocks the distribution of "brains that build brains". when anyone can enroll any brain to execute any skill, access to postlabor abundance spreads irreversibly.

for the philosophy behind distributed abundance, see the [postlabor briefs](.agent/repo=.this/role=ecologist/briefs/postlabor/).

### how "ratchet"?

1. **externalization** — knowledge systematically externalized in skills and briefs, outside of the internalized knowledge of any single brain
2. **enrollment** — any brain durably enrolled to execute any skill via roles; portable across brains, composable across roles
3. **crystallization** — thought routes iteratively harden from fluid → rigid → solid; reliability and efficiency compound with increased determinism

each skill published is a click. each brief shared is a click. each thought route hardened is a click. the ratchet only moves forward.
