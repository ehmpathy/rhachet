# thought routes = 🪨 solid vs 🔩 rigid vs 💧 fluid

## .what

skills prescribe thought routes

a thought route distills a reusable path of thought, along a categorizable level of determinism

three archetypes:
- 🪨 **solid** = deterministic throughout
- 🔩 **rigid** = deterministic entrypoint, mixed operations + orchestration
- 💧 **fluid** = probabilistic throughout

## .why

- clarifies reliability, reproducibility, and testability tradeoffs
- guides architectural decisions on where to introduce probabilistic operations
- clarifies expectations for outputs and retry semantics

## .harden

to harden a thought route = to move it toward 🪨 solid on the determinism spectrum

```
💧 fluid → 🔩 rigid → 🪨 solid
   less hardened → more hardened
```

the more hardened a route, the greater the gains:

| gain            | mechanism                        | why                                           |
| --------------- | -------------------------------- | --------------------------------------------- |
| **trust**       | repeatability via determinism    | same input → same output, every time          |
| **efficiency**  | compute cost vs imagine cost     | deterministic ops are instant; llm calls cost |
| **testability** | assertions via reproducibility   | deterministic behavior can be fully tested    |

### trust via repeatability

- 🪨 solid routes produce identical output for identical input
- 🔩 rigid routes produce bounded variance within deterministic harness
- 💧 fluid routes produce unbounded variance — brain decides

repeatability enables trust: you know what you'll get.

### efficiency via compute

- **imagine cost** = time + tokens to have brain figure out what to do
- **compute cost** = cpu cycles to execute deterministic logic

```
💧 fluid:  high imagine cost, low compute cost
🔩 rigid:  mixed imagine + compute cost
🪨 solid:  zero imagine cost, pure compute cost
```

to harden a route = to shift work from imagine-cost to compute-cost.

the ideal path: start 💧 fluid (explore), then harden to 🔩 rigid (control), then harden to 🪨 solid (optimize).

---

# summary

## comparison

| aspect             | 🪨 solid       | 🔩 rigid            | 💧 fluid       |
| ------------------ | ------------- | ------------------ | ------------- |
| entrypoint         | deterministic | deterministic      | probabilistic |
| operations         | deterministic | mixed (det + prob) | probabilistic |
| orchestration      | deterministic | mixed (det + prob) | probabilistic |
| testable.behavior  | complete      | partial            | minimal       |
| testable.mechanism | complete      | partial            | none          |

---

## design guidance

### prefer 🪨 solid when possible
- solid routes are easiest to test, debug, and trust
- if a task can be fully deterministic, make it deterministic

### use 🔩 rigid for augmentation
- when you know when thought is needed, harness controls
- keep the harness deterministic
- isolate probabilistic operations
- validate outputs before continuation

### use 💧 fluid for exploration
- when you don't know when or what thought is needed, brain decides
- when the path is unknown
- accept variance as a feature, not a bug

---

## relationship to the rhachet cli

| command           | typical route | why                                                                 |
| ----------------- | ------------- | ------------------------------------------------------------------- |
| `npx rhachet run` | 🪨 solid       | shell skill execution, no brain                                     |
| `npx rhachet act` | 🔩 rigid       | skill with deterministic harness, possible probabilistic operations |
| `npx rhachet ask` | 💧 fluid       | conversational brain.repl, brain decides path                       |


---

# details

## 🪨 solid routes

### .what
- deterministic entrypoint
- deterministic operations
- deterministic orchestration
- output is reproducible given same input

### .characteristics
- no brain.atom or brain.repl invocations
- pure functions, shell commands, data transforms
- testable.behavior (complete) + testable.mechanism (complete)

### .example
```sh
# invoke a shell command to read github actions errors and log them out
gh.workflow.errors.sh --workflow test
```

### .when to use
- data retrieval
- file operations
- deterministic transforms
- scripted automation

---

## 🔩 rigid routes

### .what
- deterministic entrypoint
- mixed operations (deterministic + probabilistic)
- mixed orchestration (deterministic harness, brain may orchestrate within)

### .characteristics
- contains brain.atom or brain.repl invocations
- probabilistic operations are wrapped in deterministic harness
- harness controls top-level flow; brain may orchestrate sub-flows
- outputs vary per invocation but within bounded expectations
- testable.behavior (partial) + testable.mechanism (partial)

### .example
```sh
# 1. deterministic operation: fetch gh actions errors
errors=$(gh.workflow.errors.sh --workflow test)

# 2. probabilistic operation: brain.atom summarizes (harness proceeds regardless)
summary=$(brain.atom.ask "summarize these errors" --input "$errors" --schema "{ description, trace, recommendation }[]")

# 3. probabilistic operation + orchestration: brain.repl executes (brain decides sub-path)
brain.repl.act "fix these errors and push" --input "$summary"
```

### .when to use
- workflows that combine data retrieval + ai analysis
- skills that need ai thought within a controlled flow
- multi-step automations with ai-assisted decisions

---

## 💧 fluid routes

### .what
- probabilistic entrypoint (brain receives prompt)
- probabilistic operations (brain decides what to invoke)
- probabilistic orchestration (brain decides the path)

### .characteristics
- brain.repl is the entrypoint (conversational)
- brain chooses which tools/skills to invoke and in what order
- output is highly variable
- testable.behavior (minimal) + testable.mechanism (none)

### .example
```sh
# ask a brain.repl to grab the gh actions errors and fix them
# brain decides: maybe it runs gh cli, maybe it asks for clarification, maybe it fixes directly
npx rhachet ask --role mechanic --ask "grab the gh actions errors and fix them"
```

### .when to use
- exploratory tasks
- open-ended problems
- interactive conversations
- tasks where the optimal path is unknown
