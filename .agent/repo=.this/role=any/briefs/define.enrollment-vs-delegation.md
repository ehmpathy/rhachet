# enrollment vs delegation

## .what

two orthogonal concepts for agent behavior that systems often conflate:

| concept        | definition                                                                |
| -------------- | ------------------------------------------------------------------------- |
| **enrollment** | *who* executes — the active role, persona, knowledge, or constraints      |
| **delegation** | *where* execution happens — isolated context, subprocess, separate thread |

## .why

to conflate these concepts reduces architectural flexibility:

- sometimes you want **delegation without role change** — run a task in the background with the same persona
- sometimes you want **role change without delegation** — shift persona in-place without a subprocess spawn

systems that couple enrollment and delegation force you into a single quadrant of the possibility space.

## .how

### the full matrix

|                    | same context         | isolated context            |
| ------------------ | -------------------- | --------------------------- |
| **same role**      | normal execution     | delegate for isolation only |
| **different role** | enroll role in-place | delegate + enroll (coupled) |

### enrollment (role activation)

enrollment changes *who* the agent is — its knowledge, constraints, and behavior patterns.

```bash
# enroll a role into the current context
rhachet roles boot --role mechanic
```

effects:
- briefs load into context (knowledge)
- skills become available (capabilities)
- practices shape behavior (constraints)
- no new subprocess spawned
- conversation continues in same thread

### delegation (execution isolation)

delegation changes *where* work happens — a subprocess spawn with its own context window.

```bash
# delegate to a subagent (claude code style)
Task tool → subagent_type: "Explore"
```

effects:
- new context window created
- execution isolated from main thread
- results summarized back to caller
- may or may not include role change

## .examples

### 👍 decoupled (flexible)

```
# enroll without delegate
"think like a security reviewer now" → role shifts, same context

# delegate without enroll
"run this in background" → isolation, same persona

# delegate with enroll
"have the researcher search for X" → isolation + role
```

### 👎 coupled (inflexible)

```
# claude code subagents
want explorer behavior? → must spawn subprocess
want same context? → can't use explorer role
```

## .architectural insight

the coupled pattern often emerges because:
1. isolation provides a natural boundary for role configuration
2. system prompts are easiest to inject at subprocess creation
3. simpler mental model for users ("subagent = specialized helper")

but the cost is lost flexibility — you cannot mix and match enrollment and delegation independently.

## .recommendation

design systems where:
- roles can enroll into any execution context
- delegation can happen with or without role change
- the two dimensions remain orthogonal choices

this enables all four quadrants of the matrix and maximizes architectural flexibility.
