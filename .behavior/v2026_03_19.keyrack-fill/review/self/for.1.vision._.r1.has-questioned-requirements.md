# self-review: has-questioned-requirements

## requirements questioned

### requirement 1: `keyrack fill` command itself

| question | answer |
|----------|--------|
| who said this was needed? | wisher, in 0.wish.md |
| evidence? | adhoc example shows repos write custom fill commands |
| what if we didn't do this? | repos continue to duplicate this pattern |
| scope correct? | yes — one command to fill keys from manifest |
| simpler way? | no — shell alias wouldn't be manifest-driven |

**verdict: HOLDS** — clear need, direct from wish, right scope

---

### requirement 2: `--env` flag (required)

| question | answer |
|----------|--------|
| who said? | derived from wish example `--env test` |
| evidence? | keys are grouped by env (env.test, env.prod) in keyrack.yml |
| what if not required? | could default to "all" but ambiguous |
| simpler? | no — explicit is correct |

**verdict: HOLDS** — explicit env selection is correct

---

### requirement 3: `--owner` flag (repeatable)

| question | answer |
|----------|--------|
| who said? | wish explicitly: `--owner default --owner ehmpath` |
| evidence? | adhoc fills both user and ehmpath keyracks |
| what if single-only? | users run command twice |

**verdict: HOLDS** — direct from wish

---

### requirement 4: `--prikey` flag (repeatable, disconnected from owner)

| question | answer |
|----------|--------|
| who said? | wish explicitly describes this mechanism |
| evidence? | each owner's host manifest encrypted with a prikey |
| what if we didn't have this? | can't decrypt non-default owner manifests |
| simpler way? | could require `--prikey ehmpath=~/.ssh/ehmpath` map format |

**issue found: disconnection feels awkward**

the wish says prikeys are "not ordered in any relationship when supplied" — system tries each against each owner. this is flexible but may confuse users.

**verdict: HOLDS (with noted awkwardness)** — direct from wish, documented in "what is awkward"

---

### requirement 5: `--key` flag for single key

| question | answer |
|----------|--------|
| who said? | inferred from adhoc's `--refresh SQUARESPACE_PASSWORD` |
| evidence? | sometimes you want to update one key |
| necessary? | yes — targeted updates are common |

**verdict: HOLDS** — reasonable ergonomic addition

---

### requirement 6: `--refresh` flag

| question | answer |
|----------|--------|
| who said? | inferred from adhoc's `--refresh @all` |
| evidence? | idempotency should be default, refresh is override |

**verdict: HOLDS** — matches adhoc pattern

---

### requirement 7: inner loop on owners

| question | answer |
|----------|--------|
| who said? | wish explicitly states this |
| evidence? | "do the owner on the inner loop, so that if the user can repeat the steps" |

**verdict: HOLDS** — explicit in wish

---

### requirement 8: roundtrip verification (set → unlock → get)

| question | answer |
|----------|--------|
| who said? | wish explicitly: "set it, unlock it, get it to verify that it is roundtrip usable" |

**verdict: HOLDS** — explicit in wish

---

### requirement 9: vault fallback to os.secure

| question | answer |
|----------|--------|
| who said? | wish: "fallback to replica os.secure when not prescribed and not inferrable" |
| what is "replica"? | unclear — may have specific semantic |

**issue found: "replica" term unclear**

the wish says "fallback to replica os.secure" — i simplified to just "os.secure" in the vision. need to clarify with wisher what "replica" implies.

**verdict: QUESTIONABLE** — added to "questions for wisher"

---

## issues found

### issue 1: "replica os.secure" not understood

**what:** wish says "fallback to replica os.secure" but i don't understand what "replica" implies here

**fix:** added to questions for wisher in vision doc

---

### issue 2: clarity on which owner (output format)

**what:** wish says "just make it super clear which owner its for that they are asked to set into"

**review:** the vision's timeline shows `[default]` and `[ehmpath]` prefixes on each prompt — this captures the requirement

**verdict:** already addressed in timeline example

---

## non-issues confirmed

| requirement | why it holds |
|-------------|--------------|
| keyrack fill command | direct from wish, eliminates duplication |
| --env required | explicit better than magic |
| --owner repeatable | direct from wish |
| --prikey repeatable | direct from wish (with noted awkwardness) |
| --key single key | reasonable ergonomic addition |
| --refresh override | matches adhoc pattern |
| inner loop on owners | explicit in wish |
| roundtrip verification | explicit in wish |

---

## summary

9 requirements questioned. 8 hold clearly. 1 needs clarification ("replica os.secure"). no scope creep detected. vision aligns with wish.
