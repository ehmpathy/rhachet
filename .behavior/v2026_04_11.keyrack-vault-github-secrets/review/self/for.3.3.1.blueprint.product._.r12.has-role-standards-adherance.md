# self-review: has-role-standards-adherance (r12)

## deeper reflection: what did r11 miss?

r11 checked main patterns. let me examine forbidden terms and additional rules.

---

## ISSUE FOUND: forbidden term in blueprint

### location

blueprint lines 31-32 use a forbidden term in comments:
```
├── [+] ghApiSetSecret.ts                            # gh api -X PUT [FORBIDDEN]
├── [+] ghApiDelSecret.ts                            # gh api -X DELETE [FORBIDDEN]
```

### rule violated

`rule.forbid.term` — never use semantically empty descriptors

### fix applied

update blueprint comments to use "communicator" (the actual grain):
```
├── [+] ghApiSetSecret.ts                            # communicator: gh api PUT
├── [+] ghApiDelSecret.ts                            # communicator: gh api DELETE
```

**why:** "communicator" describes the operation grain. the forbidden term describes no actual purpose.

---

## additional checks from r12

### rule.forbid.term=extant-alternatives

**check:** blueprint does not use forbidden alternatives

**result:** checked filediff tree, codepath tree, test tree — blueprint uses "extant" correctly, no forbidden alternatives found.

**verdict:** adheres.

### rule.require.pinned-versions

**check:** does blueprint mention pinned versions for dependencies?

blueprint line 285-286 lists dependencies without versions.

**analysis:** blueprint declares dependencies but not versions. during implementation, versions must be pinned. this is implementation detail, not blueprint requirement.

**verdict:** not a blueprint violation. implementation must pin.

### rule.require.directional-deps

**check:** do blueprint imports follow directional flow?

blueprint shows:
- domain.operations/keyrack/adapters/vaults/github.secrets/ — new files
- domain.operations/keyrack/ — update extant
- domain.objects/keyrack/ — update extant

**flow:**
- contract/ can import domain.operations/ ✓
- domain.operations/ can import domain.objects/ ✓
- domain.objects/ does not import upward ✓

**verdict:** adheres.

### rule.forbid.failhide

**check:** are errors surfaced, not hidden?

blueprint declares:
- get failfast with message
- unlock --key failfast with message
- error cases (gh auth, repo not found, permission denied) all surface

**verdict:** adheres. no error suppression.

---

## summary of r12 reflection

| check | r11 covered? | r12 finding | action |
|-------|--------------|-------------|--------|
| forbidden term in comments | no | **FOUND in lines 31-32** | **FIXED** |
| forbidden alt terms | no | not present | pass |
| pinned versions | no | impl detail | pass |
| directional deps | no | adheres | pass |
| failhide | no | adheres | pass |

**r12 found one issue:** forbidden term in blueprint comments.

**fix applied:** replaced with "communicator" in blueprint.

---

## blueprint update applied

the following lines in blueprint were updated:

**before (lines 31-32):**
comments use semantically empty descriptor

**after:**
comments use "communicator: gh api PUT" and "communicator: gh api DELETE"

---

## why the passing checks hold

### directional-deps holds because

the blueprint adds files only in domain.operations/ and domain.objects/. no contract/ changes are proposed that would create upward imports. the vault adapter pattern naturally follows directional flow — adapters live in domain.operations and import from domain.objects.

### failhide avoidance holds because

every error path in blueprint results in a failfast with a specific message. no try/catch that swallows errors is proposed. the vision explicitly states "failfast" for error cases, and blueprint adheres to this requirement.

### pinned-versions is not violated because

the blueprint is a design document, not an implementation. dependency versions are specified during `pnpm add` at implementation time. the blueprint declares what dependencies are needed and why, which is sufficient.

### forbidden-term fix works because

"communicator" is the actual grain name from define.domain-operation-grains. it tells the reader that ghApiSetSecret and ghApiDelSecret are i/o boundary operations. the previous term told the reader zero information.
