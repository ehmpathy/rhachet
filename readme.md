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

# install

```sh
npm install rhachet
```

# use

## cli

rhachet provides cli commands for each thought route

| command           | route   | what it does                               |
| ----------------- | ------- | ------------------------------------------ |
| `npx rhachet run` | 🪨 solid | execute a shell skill, no brain            |
| `npx rhachet act` | 🔩 rigid | execute a skill with deterministic harness |
| `npx rhachet ask` | 💧 fluid | converse with an actor, brain decides path |

### setup

rhachet looks for `@gitroot/rhachet.use.ts`:

```ts
// rhachet.use.ts
import { getRoleRegistry as getBhrainRegistry } from 'rhachet-roles-bhrain';
import { getRoleRegistry as getEhmpathyRegistry } from 'rhachet-roles-ehmpathy';

export const getRoleRegistries = () => [
  getBhrainRegistry(),
  getEhmpathyRegistry(),
];
```

### 🪨 solid: run

deterministic operations, no brain.

```sh
npx rhachet run --skill gh.workflow.logs --workflow test
```

### 🔩 rigid: act

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

### 💧 fluid: ask

probabilistic exploration, brain decides the path.

```sh
npx rhachet ask \
  --role skeptic \
  --ask "are birds real?"
```

## sdk

rhachet provides a type-safe sdk for programmatic actor usage.

| method        | route   | what it does                               |
| ------------- | ------- | ------------------------------------------ |
| `actor.run()` | 🪨 solid | execute a shell skill, no brain            |
| `actor.act()` | 🔩 rigid | execute a skill with deterministic harness |
| `actor.ask()` | 💧 fluid | converse with an actor, brain decides path |

### setup

generate an actor from a role with an allowlist of brains:

```ts
import { genActor } from 'rhachet';
import { genBrainRepl } from 'rhachet-brains-openai';
import { mechanicRole } from './roles/mechanic';

export const mechanic = genActor({
  role: mechanicRole,
  brains: [
    genBrainRepl({ slug: 'openai/codex' }),       // default (first in list)
    genBrainRepl({ slug: 'openai/codex/mini' }),  // fast + cheap alternative
  ],
});
```

the `brains` allowlist:
- defines which brains this actor supports
- first brain is the default (used when no explicit brain is provided)
- ensures only allowlisted brains can be used

### 🪨 solid: run

deterministic operations, no brain.

```ts
await mechanic.run({
  skill: { 'gh.workflow.logs': { workflow: 'test' } },
});
```

### 🔩 rigid: act

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

### 💧 fluid: ask

probabilistic exploration, brain decides the path.

```ts
await skeptic.ask({
  prompt: 'are birds real?',
});
```

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

**🪐 analogy: concept planets**

🧠 brains navigate concept space like ships navigate galactic space.

📚 briefs register concept planets. each planet has gravity that pulls the brain's thought toward it.

ask an unenrolled brain to review code. it drifts toward whatever concepts it absorbed — java idioms, verbose comments, patterns you've never used.

enroll that brain with a mechanic role. the 📚 briefs register concept planets:
- 🪐 "arrow functions only"
- 🪐 "input-context pattern"
- 🪐 "fail fast via HelpfulError"

these planets now have immense gravity. the brain's thought bends toward them. it reviews code the way your team reviews code — because enrollment shaped the gravity of the concepts it navigates to.

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

# vision

build or use digital actors, who work even from your laptop, and work for anyone you choose.

distill your skills and roles iteratively, with rhachet. use them, compose them, share them, open source them. the choice is yours.

- with open source top to bottom, we can raise the floor and prosper collectively.
- with observable routes of thought, we can not only debug, but align.
- with composable thought routes, we can build incremental complexity and automate test coverage just like any code.

here's to a solarpunk future of abundance 🌞🌴
