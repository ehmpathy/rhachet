# rule.forbid.supplier-assumptions-in-the-framework

> **rhachet names no supplier's skill, role, or purpose. no special treatment to suppliers of
> roles.**

rhachet is the framework. it cannot see how a consumer uses it: which skill a supplier ships,
which role a clone carries, or why a clone was spawned. a contract, a message, a help line, or a
code comment that names one of those asserts what the framework cannot know.

## .why

- **it is false the day a supplier differs.** a supplier may ship a review skill as `rhx checkit`,
  or never ship one. a refusal that names `rhx review` then points a reader at a command that
  does not exist in their repo
- **a purpose is a guess.** rhachet sees the door a clone came through (a `-p` enroll, a repl
  brain), never the intent behind it. "a reviewer clone" claims an intent; "a leaf clone" names
  the mechanism
- **it couples the framework to one supplier.** a supplier's name in a contract makes every other
  supplier second class, and a rename in the supplier repo silently stales the framework

## .the test

> **could a supplier change, rename, or omit this name without a change to rhachet?**

yes → rhachet may not name it. name the mechanism instead.

| 👎 names a supplier or purpose | 👍 names the mechanism |
|---|---|
| `a reviewer clone may not spawn` | `a leaf clone may not spawn` |
| `a repl brain (\`rhx review\`, …)` | `a repl brain (\`rhachet ask\`, \`rhachet act\`, or a skill built on the sdk)` |
| `a -p clone is a reviewer` | `a -p clone is a leaf` |
| `the shape a route guard's level-3 peer takes` | `one prompt in, one answer out, then exit` |

## .the boundary

| a violation | not a violation |
|---|---|
| a supplier skill named in a contract, message, help, or prod comment | rhachet's own commands — `rhx enroll`, `rhachet ask`, `rhachet act` |
| a purpose inferred from a door (`reviewer`, `driver`) | a test fixture that names a stub role it declares itself |
| a branch on a supplier role name | a role name a caller passes in, echoed back as data |

## .enforcement

- a supplier skill, role, or purpose named in a rhachet contract, message, or help = **blocker**
- the same in a prod code comment = **nitpick**

## .see also

- `catalog.of=actor-clone-design._.md` — the identity model; a door, never a role, marks a leaf
- `src/domain.operations/spawn/assertCloneSpawnAllowed.test.ts` [case4] — the clamp on the refusal
