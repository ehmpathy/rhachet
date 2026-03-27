# self-review: behavior-declaration-adherance

## files changed

i reviewed each code file changed in this PR against the vision and blueprint.

### file.1 = jest.integration.env.ts

| spec requirement | implementation | matches? |
|------------------|----------------|----------|
| spawn keyrack get | `execSync('npx rhx keyrack get --for repo --env test --json --owner ehmpath', ...)` | ✓ yes |
| hardcode `--owner ehmpath` | command includes `--owner ehmpath` | ✓ yes |
| use ConstraintError (not Error) | `throw new ConstraintError(...)` | ✓ yes |
| error shows unlock command | `fix: 'rhx keyrack unlock --env test --owner ehmpath'` | ✓ yes |
| error explains why owner is ehmpath | `note: 'we expect ehmpaths to work in this repo'` | ✓ yes |
| inject secrets into process.env | loop at lines 134-142 | ✓ yes |
| document passthrough | comment at lines 93-94 | ✓ yes |

**holds**: implementation matches vision exactly.

### file.2 = jest.acceptance.env.ts

same pattern as integration env. i verified:
- identical keyrack get command
- identical ConstraintError pattern
- identical process.env injection

**holds**: consistent with integration env and vision.

### file.3 = daoKeyrackHostManifest/index.ts

| spec requirement | implementation | matches? |
|------------------|----------------|----------|
| add owner param to getAllAvailableIdentities | `const getAllAvailableIdentities = (owner?: string \| null)` | ✓ yes |
| check ~/.ssh/$owner | lines 93-104 check `join(home, '.ssh', owner)` | ✓ yes |
| check AFTER ssh-agent and standard paths | owner check is last in function | ✓ yes |
| pass owner to function | caller passes `owner` at line 195 | ✓ yes |

**holds**: prikey auto-discovery implemented as fallback per blueprint.

### file.4 = package.json

| spec requirement | implementation | matches? |
|------------------|----------------|----------|
| remove test:auth command | command is gone from package.json | ✓ yes |
| no source references | `test` command no longer calls `test:auth` | ✓ yes |

**holds**: legacy references eliminated.

### file.5 = .claude/settings.json

| spec requirement | implementation | matches? |
|------------------|----------------|----------|
| remove use.apikeys.sh permission | permission entry removed | ✓ yes |

**holds**: vestigial permission cleaned up.

### file.6 = use.apikeys.* (deleted)

| spec requirement | implementation | matches? |
|------------------|----------------|----------|
| delete use.apikeys.sh | file deleted | ✓ yes |
| delete use.apikeys.json | file deleted | ✓ yes |

**holds**: legacy files eliminated.

## detailed adherance check

### vision alignment

the vision stated:
> "instead, we now have the keyrack which we can use"

implementation: jest files now use `execSync('npx rhx keyrack get ...')` instead of read from use.apikeys.json. ✓ matches.

the vision stated:
> "if the keyrack is not unlocked, it can just failfast and tell the caller to unlock the keyrack"

implementation: ConstraintError is thrown with `fix: 'rhx keyrack unlock --env test --owner ehmpath'`. ✓ matches.

the vision stated:
> "it should support getting the keys from the `--owner ehmpath` by default, since typically ehmpaths will work here"

implementation: command includes `--owner ehmpath` hardcoded. comment explains why. ✓ matches.

the vision stated:
> "rhx keyrack unlock should auto-discover prikey from ~/.ssh/$owner"

implementation: getAllAvailableIdentities now checks `~/.ssh/$owner` as fallback after standard paths. ✓ matches.

### blueprint alignment

i checked each line of the blueprint's codepath tree:

| blueprint codepath | implementation status |
|--------------------|----------------------|
| check prikey param first | lines 58-107 in daoKeyrackHostManifest |
| check ssh-agent keys | lines 67-80 |
| check standard paths | lines 82-91 |
| check ~/.ssh/$owner last | lines 93-104 |
| spawn keyrack get | jest files line 106-109 |
| parse JSON response | jest files line 110 |
| if unlocked → inject secrets | jest files lines 134-142 |
| if locked → throw ConstraintError | jest files lines 114-122 |
| if absent → throw ConstraintError | jest files lines 126-131 |

**holds**: all blueprint codepaths implemented.

## reflection

### my verification approach

i approached this adherance review by:

1. **pulled quotes from the vision** — found the exact phrases that prescribe behavior
2. **traced each quote to code** — found the line numbers where each prescription is realized
3. **checked for accidental drift** — looked for cases where implementation might subtly differ from spec

### potential deviations i looked for

| potential drift | what i checked | why it holds |
|-----------------|----------------|--------------|
| wrong owner | could have used `ehmpathy` instead of `ehmpath` | verified the exact string `--owner ehmpath` matches vision |
| wrong env | could have used `--env integration` | verified `--env test` matches blueprint |
| wrong error type | could have used generic Error | verified ConstraintError import and usage |
| wrong fallback order | could have checked `~/.ssh/$owner` first | verified ssh-agent and standard paths checked BEFORE owner path |
| omit passthrough comment | could have forgotten CI documentation | verified comment at lines 93-94 explains keyrack prefers env vars |

### why each adherance claim holds

**claim: command format adheres**

the vision says: "rhx keyrack get --for repo --env test --json --owner ehmpath"

i compared character by character. the implementation uses:
```
npx rhx keyrack get --for repo --env test --json --owner ehmpath
```

the only difference is the `npx` prefix, which is correct for a spawn from node. the flag order and values match exactly.

**claim: error type adheres**

the vision says: "failfast with ConstraintError"

i verified:
- import statement: `import { ConstraintError } from 'helpful-errors'`
- throw statements: `throw new ConstraintError(...)`

generic Error would have been incorrect. ConstraintError provides exit code 2 and the `fix` field for actionable guidance.

**claim: owner explanation adheres**

the vision says: "we expect ehmpaths to work in this repo"

i verified the error includes:
```ts
note: 'we expect ehmpaths to work in this repo'
```

this exact phrasing matches the vision. it explains why `--owner ehmpath` is hardcoded rather than configurable.

**claim: prikey fallback order adheres**

the blueprint says: "check ~/.ssh/$owner last (fallback for owner-specific key)"

i traced the function flow in daoKeyrackHostManifest/index.ts:
1. lines 67-80: ssh-agent keys checked first
2. lines 82-91: standard paths (~/.ssh/id_ed25519, etc.) checked second
3. lines 93-104: ~/.ssh/$owner checked last

if the order were reversed, users with owner-specific keys would never use ssh-agent. the fallback order ensures maximum flexibility.

### close calls

**close call 1: the `npx` prefix**

the vision shows the command without `npx`. i initially questioned whether this was a deviation. but:
- the vision shows the command as a user would type it (shell context)
- the implementation spawns from node (requires `npx` to find the binary)
- this is a context adaptation, not a deviation

**close call 2: line number drift**

the blueprint cites specific line numbers. after subsequent edits (package.json changes), line numbers shifted slightly. i verified by rereading the actual files rather than trusting cached line numbers.

### what i learned

adherance reviews require more than string matching. the vision and blueprint express intent in their context (user shell commands, high-level flow). the implementation must realize that intent in its context (node spawn, actual function structure). verifying adherance means confirming the same intent is preserved across contexts, not just that strings match.

**no issues found** — implementation adheres to behavior declaration.
