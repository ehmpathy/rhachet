# review: has-clear-instructions

## question

are the instructions followable?

- can the foreman follow without prior context?
- are commands copy-pasteable?
- are expected outcomes explicit?

## review

reviewed: 2026-04-04 (session 2: updated with github app paths)

### step 1: can foreman follow without prior context?

**evaluated prerequisites section:**

| prerequisite | clear? | notes |
|--------------|--------|-------|
| gh cli authenticated | yes | includes verification command |
| github org access | yes | specifies what's needed |
| private key ability | yes | explains alternative |
| aws sso access | yes | clear |
| repo built | yes | includes command |
| tests pass | yes | includes command |

**assessment:** prerequisites are clear.

**evaluated sandbox section:**

| aspect | clear? | notes |
|--------|--------|-------|
| target directory | yes | `@gitroot/.temp/` |
| what goes there | yes | temp HOME, mock pem files |
| what to avoid | yes | no writes to actual paths |

**assessment:** sandbox rules are clear.

**evaluated step instructions:**

| issue | location | problem |
|-------|----------|---------|
| .temp creation absent | step 1.1 | `cd .temp` assumes directory exists |
| repo root absent | step 1.1 | doesn't say to start from repo root |

**fix applied:** updated step 1.1 to include `mkdir -p .temp` and clarify start from repo root.

### step 2: are commands copy-pasteable?

**checked each command block:**

| path | command | copy-pasteable? |
|------|---------|-----------------|
| 1 | mkdir, export HOME | yes |
| 1 | npx rhx keyrack set | yes |
| 2 | npx rhx keyrack unlock | yes |
| 2 | npx rhx keyrack get | yes |
| 3 | npx rhx keyrack set | yes |
| 4 | npx rhx keyrack set | yes |
| 5 | npx rhx keyrack set | yes |
| 6 | npx rhx keyrack set | yes |
| 7 | npx rhx keyrack set | yes |
| 8 | mkdir, cd, export, npx rhx | yes |
| 9 | same setup as path 8 | yes (references) |
| 10 | same setup as path 8 | yes (references) |
| 11 | op account list, npx rhx | yes |
| edge 1 | npx rhx keyrack set | yes |
| edge 4 | ./nonexistent.pem | not a command (it's a user input) |
| edge 5 | echo + path | partial (edge case specific) |

**assessment:** commands are copy-pasteable. edge cases are scenario descriptions, not direct commands. github app paths 8-11 are now included with copy-pasteable commands.

### step 3: are expected outcomes explicit?

**checked each expected outcome:**

| path | outcome explicit? | notes |
|------|-------------------|-------|
| 1 | yes | lists each prompt phase |
| 2 unlock | yes | lists what happens |
| 2 get | partial | says "credentials json" but no example format |
| 3 | yes | explicit negative (NOT fail) + positive |
| 4 | yes | includes example treestruct output |
| 5 | yes | explicit negative (NO prompt) + positive |
| 6 | yes | lists error content |
| 7 | yes | lists error content + alternatives |
| 8 | yes | includes treestruct example output |
| 9 | yes | auto-select behavior described |
| 10 | yes | auto-select behavior described |
| 11 | yes | storage location + success message |

**assessment:** all paths have explicit expected outcomes. github app paths 8-11 now include treestruct examples and clear pass criteria.

### step 4: found issues

#### issue 1: step 1.1 lacks .temp creation

**what was found:** `cd .temp` on line 36 assumes the directory exists. foreman would get "no such directory" error.

**how it was fixed:** added `mkdir -p .temp` before `cd .temp`.

**before:**
```bash
cd .temp
mkdir -p test-home/.keyrack test-home/.aws
export HOME=$(pwd)/test-home
```

**after:**
```bash
mkdir -p .temp
cd .temp
mkdir -p test-home/.keyrack test-home/.aws
export HOME=$(pwd)/test-home
```

**verification:** line 38 of playtest now shows `mkdir -p .temp`.

#### issue 2: step 1.1 lacks start location

**what was found:** foreman doesn't know where to run commands from. could be in any directory.

**how it was fixed:** added explicit "from repo root" clarification.

**before:** step 1.1 had no location context.

**after:** step 1.1 begins with "from repo root:" on line 35.

**verification:** line 35 of playtest now shows `from repo root:`.

#### issue 3: credentials format not shown

**what was found:** path 2 step 2.2 says credentials contain access key, secret, session token but doesn't show format.

**how it was fixed:** added example json format for credentials.

**before:**
```
**expected outcome:**
- returns credentials json (not profile name)
- credentials contain access key, secret, session token
```

**after:**
```
**expected outcome:**
- returns credentials json (not profile name)
- credentials contain access key, secret, session token
- format resembles:
  ```json
  {
    "secret": "{\"accessKeyId\":\"ASIA...\",\"secretAccessKey\":\"...\",\"sessionToken\":\"...\"}",
    "expiresAt": "2026-04-03T12:00:00Z"
  }
  ```
```

**verification:** lines 85-91 of playtest now show example credentials format.

### step 5: non-issues that hold

#### non-issue 1: edge cases are scenarios, not commands

**why it holds:** edge cases 2, 3, 4, 5 describe scenarios and expected behavior, not direct commands. this is intentional — these edges require specific conditions that can't be copy-pasted. the foreman understands these are descriptive, not executable.

#### non-issue 2: prerequisites assume some aws/gh familiarity

**why it holds:** the playtest is for a keyrack feature. foreman is expected to have basic familiarity with the tools keyrack manages (aws cli, gh cli). the prerequisites section verifies this without tutorial-level explanation.

#### non-issue 3: notes for foreman section clarifies scope

**why it holds:** the notes section now documents what was delivered — github app guided setup is complete. it cites acceptance test files that provide coverage. this gives foreman confidence in the test coverage.

### conclusion

| metric | result |
|--------|--------|
| can follow without prior context | yes (after fixes) |
| commands copy-pasteable | yes |
| expected outcomes explicit | yes (after fixes) |
| found issues | 3 |
| non-issues that hold | 3 |

**assessment:** instructions are followable. three issues found and fixed: absent .temp creation, absent start location, and absent credentials format example.

review complete.
