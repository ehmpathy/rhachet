# rule.forbid.unscoped-process-kills

## .what

never invoke or propose a pattern-matched process kill — `pkill -f`, `killall`, `pkill -P`, or
any `kill` whose target is derived from a cmdline match rather than from a pid this session
itself created and owns.

there is no "narrow enough" pattern. the rule is the whole class.

## .why

`pkill -f` matches against the cmdline of **every process on the box**, with **no worktree
bound**. that is the defect: the blast radius is the machine, while the intent was one
worktree.

a pattern that looks specific against the current machine-state is not specific against the
fleet's. `jest.*some.skill` matches one runaway today; tomorrow six other crews run jest
concurrently and the same pattern reaps their work. **a kill's safety cannot be judged from the
process table you happen to observe** — you would infer it from a snapshot of shared state you
do not own.

it is not on the paved-safe allowlist, and there is **no repo-scoped process verb** to reach for
instead. so no form of it is approvable, and a "but this pattern is safe" appeal is the same
request re-spelled.

## .the steer — orphans are not on the critical path

a leftover process almost never blocks you. it is idle-but-resident: it consumes no budget, it
holds no lock you need, and it is visible to the human as an open item. so:

- do not block on it
- do not spend turns on it
- do not ask a second time once declined

return to the route. the orphan will still be there if a human later grants the kill.

## .the corollary — a dogfood that CREATES the hazard is not a dogfood

`rule.require.clamp-edge-cases` demands you prove a clamp goes red under the un-fixed defect.
but when the defect **is** an unbounded resource spawn, the revert performs the very runaway the
fix exists to prevent — on a shared box.

do not run that revert. prove the teeth another way, and **declare the substitution** so the gap
is stated rather than silent:

1. **one-producer proof** — grep that the asserted string has exactly one producer in the tree,
   so the assert cannot be green unless that gate fired
2. **revert a safe twin** — an adjacent assert whose revert is cheap and bounded (an off-by-one
   `>` → `>=` flip on the same gate) proves the gate is read at all
3. **write a `.note.teeth`** on the row that names which of these it relied on, and why the
   direct revert was refused

a clamp whose teeth were assumed is worth less than one whose teeth are argued on the record.

## .examples

### 👎 bad — the blast radius is the box

```bash
pkill -f 'some.skill.name'    # every match on the host, any worktree, any crew
pkill -f 'jest.*some.skill'   # "narrow" only against today's process table
```

### 👍 good — leave it, and carry on

```
the orphan procs are surfaced to the human as an open item, with their count
and their command. they are idle, they cost no budget, and the route continues
without them.
```

## .enforcement

- any `pkill` / `killall` / cmdline-pattern kill = **blocker**
- a re-raise of a declined kill, in any form = **blocker**
- a revert-dogfood that performs an unbounded spawn = **blocker** (use the substitutions above)

## .see also

- `rule.require.clamp-edge-cases` — the teeth requirement this scopes
- `rule.forbid.reads-outside-the-repo` — the same "no worktree bound" hazard, on the read side
- `rule.always.spend-own-levers-before-escalation` — why the orphan is the human's item, not a block
