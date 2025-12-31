# rhachet

![test](https://github.com/ehmpathy/rhachet/workflows/test/badge.svg)
![publish](https://github.com/ehmpathy/rhachet/workflows/publish/badge.svg)

a framework for reliable, composable, and iteratively improvable thought.

> weave threads 🧵 of thought, stitched 🪡 with a rhachet ⚙️

# purpose

rhachet makes it simple to leverage thought routes - safely, easily, and effectively.

- 🪨 **solid** routes for deterministic automation
- 🔩 **rigid** routes for augmented workflows
- 🌊 **fluid** routes for open-ended exploration

with rhachet, you can:
- declare thought routes, reusably and maintainably
- apply thought routes, observably and reliably
- compose and accumulate reusable thought skill
- assure slipless progress towards goals, like a ratchet (🎼 click, click, click)
- enable iterative improvement of skills, like a ratchet (🎼 click, click, click)

# concepts

## thought routes

thought routes describe the determinism profile of an execution path.

| route       | what                                             | when to use                          |
| ----------- | ------------------------------------------------ | ------------------------------------ |
| 🪨 **solid** | deterministic throughout                         | scripted automation, data transforms |
| 🔩 **rigid** | deterministic harness + probabilistic operations | augmented workflows, controlled ai   |
| 🌊 **fluid** | probabilistic throughout                         | exploration, open-ended problems     |

the key distinction:
- 🔩 **rigid**: you know when thought is needed, harness controls
- 🌊 **fluid**: you don't know when or what thought is needed, brain decides

## brains

brains are probabilistic imagination mechanisms that provide creative thought capabilities:

| type | what | characteristics |
| ---- | ---- | --------------- |
| **brain.atom** | single inference | stateless, one-shot |
| **brain.repl** | read-eval-print-loop | stateful, multi-turn, tool use |

brain.atom is for single-turn operations. brain.repl is for multi-turn operations.

## actors, roles, skills, briefs

rhachet organizes thought operators into a composable hierarchy:

```
actor = brain + role
role = skills + briefs
```

| concept   | what                               | example                                 |
| --------- | ---------------------------------- | --------------------------------------- |
| **actor** | a brain assuming a role            | mechanic actor (claude + mechanic role) |
| **role**  | a bundle of skills + briefs        | mechanic, reviewer, architect           |
| **skill** | an executable capability           | review, deliver, init                   |
| **brief** | context and knowledge for the role | coding standards, domain patterns       |

roles are portable - the same role can be assumed by different brains.

skills are composable - they can invoke other skills, nest thought routes, and build complexity incrementally.

briefs are cumulative - they encode institutional knowledge that improves over time.

# install

```sh
npm install rhachet
```

# use

## cli

rhachet provides cli commands for each thought route:

| command           | route   | what it does                               |
| ----------------- | ------- | ------------------------------------------ |
| `npx rhachet run` | 🪨 solid | execute a shell skill, no brain            |
| `npx rhachet act` | 🔩 rigid | execute a skill with deterministic harness |
| `npx rhachet ask` | 🌊 fluid | converse with an actor, brain decides path |

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

```sh
npx rhachet run --skill gh.workflow.logs --workflow test
```

deterministic execution, no brain involved.

### 🔩 rigid: act

```sh
npx rhachet act \
  --role mechanic --skill review \
  --input "https://github.com/org/repo/pull/9"

npx rhachet act \
  --role mechanic --skill review \
  --input "https://github.com/org/repo/pull/9" \
  --brain openai/codex
```

deterministic harness controls flow, brain operations are wrapped and validated.

### 🌊 fluid: ask

```sh
npx rhachet ask \
  --role skeptic \
  --ask "are birds real?"
```

brain decides the path, exploration is the goal.

## sdk

rhachet provides a type-safe sdk for programmatic actor usage.

| method         | route   | what it does                               |
| -------------- | ------- | ------------------------------------------ |
| `actor.run()`  | 🪨 solid | execute a shell skill, no brain            |
| `actor.act()`  | 🔩 rigid | execute a skill with deterministic harness |
| `actor.ask()`  | 🌊 fluid | converse with an actor, brain decides path |

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

```ts
await mechanic.run({
  skill: { 'gh.workflow.logs': { workflow: 'test' } },
});
```

deterministic execution, no brain involved.

### 🔩 rigid: act

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

deterministic harness controls flow, brain operations are wrapped and validated.

### 🌊 fluid: ask

```ts
await mechanic.ask({
  prompt: 'are birds real?',
});
```

brain decides the path, exploration is the goal.

# vision

build or use digital actors, who work even from your laptop, and work for anyone you choose.

distill your skills and roles iteratively, with rhachet. use them, compose them, share them, open source them. the choice is yours.

- with open source top to bottom, we can raise the floor and prosper collectively.
- with observable routes of thought, we can not only debug, but align.
- with composable thought routes, we can build incremental complexity and automate test coverage just like any code.

here's to a solarpunk future of abundance 🌞🌴
