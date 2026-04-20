# self-review: has-clear-instructions

**stone**: 5.5.playtest
**artifact**: 5.5.playtest.yield.md

---

## review checklist

### can the foreman follow without prior context?

**yes**. each playtest is self-contained:
- prerequisites section lists what to install and configure
- each playtest has goal, setup, invoke, and pass criteria
- no references to "the previous step" or assumed state

### are commands copy-pasteable?

**yes**. verified each command:
- export SECRETS='...' — valid bash, quotes escaped correctly
- npx rhachet keyrack firewall ... — full command with all flags
- cat $GITHUB_ENV — simple verification command

### are expected outcomes explicit?

**yes**. each playtest has concrete pass criteria:
- specific exit codes (0 or 2)
- specific string matches ("status": "granted", "status": "blocked")
- specific file content checks (GITHUB_ENV contains X)

---

## no issues found

the playtest document follows the pattern:
1. goal — what we verify
2. setup — export env vars
3. invoke — run command
4. pass criteria — checkboxes with specific assertions

each of the 12 playtests covers a distinct behavior. the summary checklist at the end provides quick reference.

---

## confirmation

instructions are clear and followable. ready for foreman execution.
