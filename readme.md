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

```sh
npm install rhachet
```

---

# 🧢 roles.<use>

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

# init roles
npx rhachet init --roles mechanic

# invoke skills
npx rhachet run --skill show.gh.test.errors

# use enrolled agents
claude # will have been enrolled as a mechanic via hooks, from init
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
  --ask "are birds real?"
```

---

## sdk

the sdk powers programmatic actor usage with strict contracts. applications and services depend on it to leverage actors for reliable, composable, and improvable thought.

### tldr

```ts
import { genActor } from 'rhachet';
import { genBrainRepl } from 'rhachet-brains-openai';
import { mechanicRole } from './domain.roles/mechanic';

// init actor
const mechanic = genActor({
  role: mechanicRole,
  brains: [genBrainRepl({ slug: 'openai/codex' })],
});

// use actor
await mechanic.ask({ prompt: 'how to simplify ...?' });        // 💧 fluid
await mechanic.act({ skill: { review: { pr } } });             // 🔩 rigid
await mechanic.run({ skill: { 'fetch.pr-comments': { pr } } }) // 🪨 solid
```

### init

#### how

generate an actor from a role with an allowlist of brains:

```ts
import { genActor } from 'rhachet';
import { genBrainRepl } from 'rhachet-brains-openai';
import { mechanicRole } from './domain.roles/mechanic';

export const mechanic = genActor({
  role: mechanicRole,
  brains: [
    genBrainRepl({ slug: 'openai/codex' }),       // default (first in list)
    genBrainRepl({ slug: 'openai/codex/mini' }),  // fast + cheap alternative
  ],
});
```

#### why

the actor interface provides:
- **strict enrollment** — brains allowlist ensures only approved brains can be used
- **isomorphic with cli** — same `.run()`, `.act()`, `.ask()` interface as cli commands
- **composition** — actors can be composed into higher-order workflows and skills
- **consistent contracts** — type-safe inputs and outputs across all thought routes

common usecases:
- create reusable skills that leverage brain capabilities
- deliver product behaviors powered by enrolled actors
- build automation pipelines with reliable, testable thought

### use

| method        | route   | what it does                               |
| ------------- | ------- | ------------------------------------------ |
| `actor.run()` | 🪨 solid | execute a shell skill, no brain            |
| `actor.act()` | 🔩 rigid | execute a skill with deterministic harness |
| `actor.ask()` | 💧 fluid | converse with an actor, brain decides path |

#### 🪨 solid: run

deterministic operations, no brain.

```ts
await mechanic.run({
  skill: { 'gh.workflow.logs': { workflow: 'test' } },
});
```

#### 🔩 rigid: act

augmented orchestration, harness controls flow, brain augments.

```ts
// uses default brain (first in allowlist)
await mechanic.act({
  skill: { review: { input: 'https://github.com/org/repo/pull/9' } },
});

// uses explicit brain (must be in allowlist)
await mechanic.act({
  brain: { repo: 'openai', slug: 'codex/mini' },
  skill: { review: { input: 'https://github.com/org/repo/pull/9' } },
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

# 🧢 roles.<add>

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

enroll a 🧠 brain with a 🧢 role → produce an 🎭 actor.

🎭 actors can:
- `.ask()` → 💧 fluid thought, brain decides the path
- `.act()` → 🔩 rigid thought, harness controls, brain augments
- `.run()` → 🪨 solid execution, no brain needed

```ts
const mechanic = genActor({
  role: mechanicRole,
  brains: [genBrainRepl({ slug: 'openai/codex' })],
});

await mechanic.ask({ prompt: 'how to simplify ...?' });        // 💧 fluid
await mechanic.act({ skill: { review: { pr } } });             // 🔩 rigid
await mechanic.run({ skill: { 'fetch-pr-comments': { pr } } }) // 🪨 solid
```

---

## .terms

### .terms.objects

| concept | emoji | what                                                    |
| ------- | ----- | ------------------------------------------------------- |
| role    | 🧢     | bundle of skills + briefs                               |
| brain   | 🧠     | inference provider (atom = one-shot, repl = multi-turn) |
| actor   | 🎭     | brain enrolled in a role                                |
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
with skill: mechanic.run({ skill: { 'fetch-pr-comments': { pr } } }) → instant, deterministic
```

skills unlock consistency. 🧠 brains are probabilistic — they won't do the same task the same way twice. 💪 skills maximize determinism and composition — via distillation of thought routes from fluid → rigid → solid.

**the determinism spectrum:**

| route   | example                                                     | determinism        |
| ------- | ----------------------------------------------------------- | ------------------ |
| 🪨 solid | fetch pr comments                                           | 100% deterministic |
| 🔩 rigid | review pr (fetch = deterministic, analysis = probabilistic) | blended            |
| 💧 fluid | "what should we refactor?"                                  | 100% probabilistic |

ideally, eject as much work as possible into 🪨 solid skills. use 🔩 rigid when you need to blend deterministic setup with probabilistic thought. reserve 💧 fluid for open-ended exploration.

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
3. **determinism** — thought routes iteratively harden from fluid → rigid → solid; reliability and efficiency compound

each skill published is a click. each brief shared is a click. each thought route hardened is a click. the ratchet only moves forward.
