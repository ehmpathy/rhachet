# self-review r2: has-clear-instructions

## deeper pass: verify instructions are truly followable

r1 documented all criteria are met. this pass verifies by walkthrough.

---

## walkthrough: foreman without prior context

a foreman opens the playtest. what do they see?

### prerequisites section

```
- rhachet cli installed (`npx rhachet` or `rhx`)
- 1password cli installed (`op --version`)
- 1password cli authenticated (`op whoami`)
- a test 1password item with a credential field (or create one in this playtest)
```

**is this clear?** yes.
- rhachet cli: shows both `npx rhachet` and `rhx` aliases
- 1password cli: shows verification command `op --version`
- 1password auth: shows verification command `op whoami`
- test item: explains it can be created in the playtest

### first command the foreman runs

```sh
rhx keyrack set --key PLAYTEST_DAEMON_KEY --vault os.daemon --env test
```

**is this exact?** yes. no placeholders, no variables to substitute.

**does it explain what happens?** yes. numbered steps:
1. enter a test secret when prompted
2. verify output shows specific fields

### pass criteria

```
**pass if:** output contains `mech: EPHEMERAL_VIA_SESSION` and `vault: os.daemon`
```

**is this observable?** yes. foreman can grep or visually scan for these strings.

---

## walkthrough: 1password setup

the playtest explains how to create a test item:

```
### setup: create a test item in 1password

if you don't have a test item, create one via 1password app:
- vault: any vault you have access to
- item name: `playtest-credential`
- field: `credential` with value `op-test-secret-456`

note the uri: `op://{vault-name}/playtest-credential/credential`
```

**is this clear?** yes.
- tells foreman where to create (any vault)
- tells foreman what to name it
- tells foreman what field to add
- shows the uri format to note

---

## walkthrough: edge cases

### edge 3.1: op cli not installed

```sh
# backup op
sudo mv /usr/local/bin/op /usr/local/bin/op.bak

# attempt set
rhx keyrack set --key TEST_KEY --vault 1password --env test

# restore op
sudo mv /usr/local/bin/op.bak /usr/local/bin/op
```

**is this practical?** conditional. the playtest says "if you can temporarily rename `op` to test" — acknowledges this may not be possible for all foremans.

**pass criteria?** clear: "error message includes install instructions and exits with code 2"

---

## no issues found

| criteria | holds | why |
|----------|-------|-----|
| foreman can follow without prior context | yes | prerequisites list all deps with verification commands |
| commands are copy-pasteable | yes | all commands are exact, no placeholders |
| expected outcomes are explicit | yes | each step has "pass if:" with specific strings to look for |

---

## conclusion

instructions are clear and followable. no issues found.

holds.
