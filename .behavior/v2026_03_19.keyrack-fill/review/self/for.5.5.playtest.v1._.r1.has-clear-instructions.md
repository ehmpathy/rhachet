# self-review: has-clear-instructions (round 1)

## what i must verify

are the playtest instructions followable?
- can the foreman follow without prior context?
- are commands copy-pasteable?
- are expected outcomes explicit?

## verification

### can foreman follow without prior context?

**issue found**: the playtest used generic placeholders:

| before | after |
|--------|-------|
| `cd /path/to/repo/with/keyrack.yml` | `# from rhachet repo root` |
| `SOME_KEY` | `MY_API_KEY`, `REGULAR_KEY` |
| `--env test` | `--env all` |

the foreman would have been stuck: "which repo? which key? what env has keys?"

**fix applied**: use THIS repo (rhachet) as the test target.

rhachet's .agent/keyrack.yml declares:
```yaml
env.all:
  - RELOCK_REGULAR_KEY
  - REGULAR_KEY
  - MY_API_KEY
env.test:
  - AWS_PROFILE
```

the playtest now targets env=all with MY_API_KEY and REGULAR_KEY — keys that exist and are safe to test with.

### are commands copy-pasteable?

**before**: partially. generic placeholders break copy-paste.

**after**: yes. every command is directly copy-pasteable:
- `rhx keyrack fill --env all --key MY_API_KEY`
- `rhx keyrack set --key REGULAR_KEY --env all --vault os.secure`
- `rhx keyrack fill --env all --key REGULAR_KEY --refresh`

### are expected outcomes explicit?

**yes**: no changes needed. the verify sections use explicit checkboxes:
- `[ ] prompts for key value`
- `[ ] shows set output in treebucket`
- `[ ] shows "found vaulted under" with slug`
- `[ ] exits 0`

clear pass/fail per step.

### prerequisite added

added step 3: `clear daemon state: rhx keyrack relock`

without this, prior test state would cause skip behavior even on first run.

## decision: [issue found, fixed]

| issue | fix |
|-------|-----|
| generic path placeholder | use "from rhachet repo root" |
| generic key placeholder | use real keys: MY_API_KEY, REGULAR_KEY |
| wrong env (test has only AWS_PROFILE) | use env=all (has 3 test keys) |
| daemon state pollution | add prerequisite to relock |

all commands are now copy-pasteable. foreman can follow without prior context.

## lessons for next time

### what i learned

playtests that use THIS repo as the sandbox are more valuable than playtests that ask foreman to "find a repo" or "set up a test environment."

rhachet itself has test keys declared in .agent/keyrack.yml. these keys exist for exactly this purpose: to provide safe, concrete values for manual tests.

### how to remember

when i write a playtest for keyrack:
1. check .agent/keyrack.yml for available test keys
2. use real keys, not placeholders
3. add prerequisite to clear daemon state
4. target env that has keys (env.all, not env.test if test is sparse)

### the deeper truth

a playtest with placeholders is not a playtest — it is a template. the foreman must fill in blanks, which means they cannot focus on behavior verification. they are distracted by setup.

a playtest with concrete values lets the foreman focus on what matters: "does this command work as expected?"

the fix was small (replace SOME_KEY with MY_API_KEY) but the impact is large: the foreman can now run the playtest in under 60 seconds instead of 15 minutes of setup.
