# self-review r2: has-questioned-questions

## triage of open questions

### question 1: should `--value` be a flag or output mode like `--output value`?

**can we answer via logic?** yes.

**analysis:**

`--value` as flag:
```bash
rhx keyrack get --key X --value
```

`--output value` pattern:
```bash
rhx keyrack get --key X --output value
rhx keyrack get --key X --output json
rhx keyrack get --key X --output human
```

**consideration:**
- `keyrack get` already has `--json` flag (not `--output json`)
- consistency suggests `--value` as flag, parallel to `--json`
- `--output` pattern adds future flexibility (more output modes)

**decision:** [answered]

use `--value` as flag for consistency with extant `--json` flag. both are output mode switches. could add `--output` later as unification if needed.

---

### question 2: should `source` support `--for repo` syntax or just default to repo?

**can we answer via logic?** yes.

**analysis:**

`--for repo` explicit:
```bash
rhx keyrack source --for repo --env test
rhx keyrack source --key X --env test
```

implicit default to repo:
```bash
rhx keyrack source --env test          # all repo keys
rhx keyrack source --key X --env test  # single key
```

**consideration:**
- `keyrack get` uses `--for repo` vs `--key X` distinction
- for `source`, primary usecase is all repo keys (matches sdk)
- `--for repo` adds verbosity for the common case
- omit `--for` = all repo keys is intuitive

**decision:** [answered]

no `--for repo` for source. behavior:
- `source` (no --key): all repo keys (sdk parity, common case)
- `source --key X`: single key (wish request, cli ergonomics)

simpler, less verbose, intuitive.

---

### question 3: should lenient mode emit notices to stderr for skipped keys?

**can we answer via logic?** yes.

**analysis:**

with notices:
```bash
$ eval "$(rhx keyrack source --env test --lenient)"
# stderr: ⚠️ API_KEY: skipped (not granted)
# stdout: export OTHER_KEY='secret'
```

without notices:
```bash
$ eval "$(rhx keyrack source --env test --lenient)"
# stdout: export OTHER_KEY='secret'
```

**consideration:**
- stdout must be clean for `eval` (notices would break eval)
- stderr is appropriate for notices
- sdk's lenient mode is silent (no notices)
- explicit feedback helps debug

**decision:** [answered]

emit notices to stderr in lenient mode. format:
```
stderr: ⚠️ ehmpathy.test.API_KEY: skipped (not granted)
stdout: export OTHER_KEY='secret'
```

rationale: stderr doesn't break eval, helps debug why keys absent.

---

### question 4 (from r1 review): is `source --key` cli extension or sdk parity?

**can we answer via extant code?** yes.

**sdk code review confirmed:** sdk's `sourceAllKeysIntoEnv` has no `--key` option.

**decision:** [answered]

`source --key` is CLI extension beyond SDK:
- sdk: sources ALL repo keys, no filter
- cli: supports `--key` for single key (wish request)
- cli: supports no `--key` for all keys (sdk parity)

document in vision as cli ergonomics enhancement.

---

### question 5 (new): should vision update to reflect these answers?

**decision:** [answered]

yes. update vision "open questions" section to mark all as [answered] and incorporate decisions.

---

## issues found and fixes

### issue: vision has 3 questions marked "for wisher" but all can be answered via logic

**fix:** update vision to mark all as [answered] with rationale.

---

## summary

all open questions can be resolved via logic or code review. no questions require wisher input or external research. vision should be updated to reflect these answers.
