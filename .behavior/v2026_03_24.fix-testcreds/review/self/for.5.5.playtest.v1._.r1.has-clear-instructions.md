# review: has-clear-instructions

## question

are the instructions followable?
- can the foreman follow without prior context?
- are commands copy-pasteable?
- are expected outcomes explicit?

## review

### issues found and fixed

**issue 1: step 2 expected message was incorrect**

the original playtest said error would show:
> message: `keyrack not unlocked. unlock to run integration tests:`

but the actual message from `sourceAllKeysIntoEnv.ts` is:
> message: `some keys were not granted, yet are strictly required`

**fix:** updated step 2 expected output to match actual behavior.

**issue 2: step 5 used unit tests for CI passthrough**

unit tests don't load `jest.integration.env.ts`, so the test wouldn't verify the env var passthrough behavior at all.

**fix:** changed to use integration tests with fake env vars to verify passthrough works.

**issue 3: edgey paths had no commands**

the absent keys section described behavior but had no copy-pasteable commands.

**fix:** added explicit `rhx keyrack get --for repo --env test --owner ehmpath` command to check status.

**issue 4: step 2 assumed keys are configured in keyrack.yml**

the playtest assumed locked keyrack would cause error, but the mechanic keyrack.yml has keys commented out in env.test. with no required keys, keyrack.source() succeeds even when locked.

**fix:** rewrote step 2 to verify keyrack.source() is in place (via grep) instead of verify locked behavior. added note that explains why locked behavior won't trigger without configured keys.

**issue 5: step 2 only checked integration env file**

need to verify both jest.integration.env.ts AND jest.acceptance.env.ts have keyrack.source().

**fix:** updated step 2 to grep both files.

**issue 6: pass/fail criteria assumed locked behavior**

the criteria listed "locked keyrack → ConstraintError" but this only applies when keys are configured.

**fix:** updated pass/fail criteria to focus on verifiable outcomes: keyrack.source() is in place with correct params.

### can foreman follow without prior context?

**yes** — verified each step:

| step | context needed? | verdict |
|------|-----------------|---------|
| 1. verify legacy deleted | none - just run ls | ✓ clear |
| 2. verify keyrack.source | none - just run grep | ✓ clear |
| 3. verify unlocked | needs ssh key per prereqs | ✓ prereqs cover this |
| 4. verify acceptance | follows from step 3 | ✓ clear |
| 5. verify CI passthrough | none - env vars provided | ✓ clear |
| edgey: absent keys | none - just run commands | ✓ clear |

the prerequisites section states what's needed: rhachet installed, ssh key at ~/.ssh/ehmpath, keyrack secrets populated.

### are commands copy-pasteable?

**yes** — verified each command can be pasted and run:

| command | copy-paste safe? | notes |
|---------|------------------|-------|
| `ls -la .agent/repo=.this/role=any/skills/use.apikeys.*` | ✓ | glob works for both files |
| `grep -n "keyrack.source" jest.integration.env.ts jest.acceptance.env.ts` | ✓ | searches both files |
| `rhx keyrack unlock --env test --owner ehmpath` | ✓ | standard keyrack command |
| `npm run test:integration` | ✓ | standard npm command |
| `npm run test:acceptance` | ✓ | standard npm command |
| `rhx keyrack relock --owner ehmpath` | ✓ | standard keyrack command |
| env vars + npm run test | ✓ | single line, works in bash |
| `rhx keyrack get --for repo --env test --owner ehmpath` | ✓ | standard keyrack command |

### are expected outcomes explicit?

**yes** — verified each step has explicit pass/fail:

| step | pass criteria | fail criteria | explicit? |
|------|--------------|---------------|-----------|
| 1 | files don't exist | files exist | ✓ |
| 2 | keyrack.source() present | old pattern or missing | ✓ |
| 3 | tests execute | ConstraintError | ✓ |
| 4 | no keyrack errors | ConstraintError | ✓ |
| 5 | tests start without keyrack error | keyrack error | ✓ |
| edgey | absent keys show set hint | no hints | ✓ |

one remaining question: step 2 specifies line numbers (97 and 47) which could change. however, this is acceptable because:
- the grep output will show actual line numbers regardless
- foreman can verify the content matches even if line differs
- changed line numbers would indicate file was edited, which is noteworthy

## verdict

six issues found and fixed:
1. step 2 expected message corrected to match actual sourceAllKeysIntoEnv.ts output
2. step 5 changed from unit tests to integration tests for CI passthrough verification
3. edgey paths now has copy-pasteable commands
4. step 2 rewritten to verify keyrack.source() presence since locked behavior requires configured keys
5. step 2 now checks both jest.integration.env.ts and jest.acceptance.env.ts
6. pass/fail criteria updated to focus on verifiable outcomes

playtest is now accurate, complete, and verifiable. each step can be followed by a foreman without prior context.
