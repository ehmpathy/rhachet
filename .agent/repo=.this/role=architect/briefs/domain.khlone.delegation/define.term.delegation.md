# delegation

## .what

delegation is the mechanism which enables us to delegate agency to actors.

delegation is composed of:
- **distillation** — harden reusable thought routes (roles, skills, briefs)
- **enrollment** — durable adherence of a brain to a distilled role
- **specialization** — specialized roles paired with specialized brains
- **isolation** — *where* fulfillment happens (same context vs isolated subprocess)
- **verification** — confirm the delegated work was delivered as expected
- **fulfillment** — invoke the enrolled actor to fulfill a distilled objective

## .why

delegation enables trust at scale:
- distillation makes behavior repeatable
- enrollment makes adherence durable
- specialization makes capability focused
- isolation makes context bounded
- verification makes outcomes observable
- fulfillment makes agency transferable

without delegation, every task requires direct supervision. with delegation, tasks can be distributed to actors who reliably fulfill them.

## .components

### distillation

distillation hardens thought routes from 💧 fluid → 🔩 rigid → 🪨 solid.

| artifact | what it distills                    |
| -------- | ----------------------------------- |
| role     | a persona with skills and briefs    |
| skill    | a reusable thought route            |
| brief    | curated knowledge that shapes thought |

distillation increases determinism. the more distilled, the more repeatable and efficient.

see `define.term.skill.thought-routes.md` for the determinism spectrum.

### enrollment

enrollment binds a brain to a distilled role.

```
brain + role = actor
```

enrollment is **durable** — the actor adheres to the role across invocations:
- briefs shape every exchange
- skills define available capabilities
- the role's constraints persist

enrollment enables trust: you know what the actor will do because you know what role it adheres to.

### specialization

specialization pairs the right role with the right brain for the task.

| dimension | specialization axis                        |
| --------- | ------------------------------------------ |
| role      | mechanic, designer, reviewer, etc          |
| brain     | claude, gpt, gemini, local model, etc      |

specialization enables efficiency:
- roles encode domain expertise
- brains provide inference capability
- the right pair maximizes quality per cost

### isolation

isolation determines *where* fulfillment happens.

| isolation mode | what it means                              |
| -------------- | ------------------------------------------ |
| same context   | fulfillment in current context window      |
| isolated       | fulfillment in subprocess with own context |

isolation is orthogonal to enrollment:
- you can isolate without role change (background task, same persona)
- you can enroll without isolation (shift role in-place)

isolation enables bounded context: subprocess has its own context window, results summarize back.

see `define.term.role.enrollment-vs-isolation.md` for the full matrix.

### verification

verification confirms the delegated work was delivered as expected.

| verification type | what it checks                          |
| ----------------- | --------------------------------------- |
| output shape      | result matches expected schema          |
| behavior          | fulfillment followed expected path      |
| quality           | output meets acceptance criteria        |
| cost              | time and tokens within budget           |

verification enables trust: you can confirm delivery without repeat of the work.

weaves enable verification — they capture the full fulfillment for inspection.

### fulfillment

fulfillment invokes the enrolled actor to fulfill a distilled objective.

```
fulfillment = {
  actor: enrolled brain + distilled role,
  objective: distilled goal,
  skill: distilled thought route,
  verification: expected outcome,
}
```

fulfillment combines all components:
1. **distillation** provided the skill and role
2. **enrollment** bound the brain to the role
3. **specialization** selected the right actor for the task
4. **isolation** determined the execution context
5. **verification** will confirm delivery
6. **fulfillment** transfers agency to the actor

## .the delegation chain

```
distill → enroll → specialize → isolate → fulfill → verify
   │         │          │          │          │         │
   ▼         ▼          ▼          ▼          ▼         ▼
 skill    actor      match      context   invoke    confirm
 role     ready      task       bounded   agency    delivery
 brief
```

each step builds on the previous:
- you can't enroll without a distilled role
- you can't specialize without enrolled actors
- you can't isolate without a specialized match
- you can't fulfill without an isolation decision
- you can't verify without fulfillment output

## .delegation vs direct work

| dimension     | direct work           | delegated work              |
| ------------- | --------------------- | --------------------------- |
| supervision   | constant              | minimal (verify at end)     |
| repeatability | varies                | high (distilled)            |
| scale         | limited by attention  | limited by actors available |
| trust         | self-trust            | role + verification trust   |

delegation trades direct control for scale. the trade is worth it when distillation and verification are strong.

## .see also

- `define.term.skill.thought-routes.md` — distillation and the determinism spectrum
- `define.term.weave.threads.md` — weaves enable verification via observation
- `define.perspectives.brain_vs_weave_vs_skill.md` — the three perspectives
