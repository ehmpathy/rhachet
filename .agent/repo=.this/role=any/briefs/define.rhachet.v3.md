# rhachet

## .what

rhachet is a framework for reliable thought.

register 🧢 roles && add 🧠 brains to produce 🎭 actors who clone that thought.

## .how

### step 1: create or reuse 🧢 roles

a 🧢 role bundles 💪 skills and 📚 briefs:
- 💪 skills = executable capabilities (e.g., `fetch-pr-comments.sh`, `review.act.ts`)
- 📚 briefs = curated knowledge (e.g., `rule.require.arrow-functions.md`, `define.input-context-pattern.md`)

create your own roles, or reuse roles published as `rhachet-roles-*` packages.

the spec is light: a readme, a briefs dir, a skills dir. that's it.

### step 2: enroll 🧠 brains to create 🎭 actors

a 🧠 brain is an inference provider (openai, anthropic, etc).

enroll a 🧠 brain with a 🧢 role → produce an 🎭 actor.

🎭 actors can:
- `.ask()` → 💧 fluid thought, brain decides the path
- `.act()` → 🔩 rigid thought, harness controls, brain augments
- `.run()` → 🪨 solid execution, no brain needed

```ts
const mechanic = genActor({
  role: mechanicRole,
  brains: [openai('gpt-4o')],
});

await mechanic.ask({ prompt: 'what needs refactor?' });        // 💧 fluid
await mechanic.act({ skill: { review: { pr } } });             // 🔩 rigid
await mechanic.run({ skill: { 'fetch-pr-comments': { pr } } }) // 🪨 solid
```

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

### .terms.objects

| concept | emoji | what                                                    |
| ------- | ----- | ------------------------------------------------------- |
| role    | 🧢     | bundle of skills + briefs                               |
| brain   | 🧠     | inference provider (atom = one-shot, repl = multi-turn) |
| actor   | 🎭     | brain enrolled in a role                                |
| skill   | 💪     | executable capability                                   |
| brief   | 📚     | curated knowledge                                       |

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
