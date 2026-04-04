# self-review r2: has-pruned-yagni

## YAGNI review: what was not requested?

### component 1: async iterator pattern

**requested?** yes — fix must read all stdin, this is the minimal way

**minimum viable?** yes — 5 lines of code, no dependencies

**added abstraction?** no — uses raw node.js API

**verdict**: not YAGNI — this is the fix itself

### component 2: final newline trim

**requested?** implicitly — extant behavior trims newline, we preserve it

**minimum viable?** yes — one conditional slice

**added "while here"?** no — this preserves extant contract

**verdict**: not YAGNI — preserves backwards compat

### component 3: promptVisibleInput fix

**requested?** not explicitly — wisher reported bug in promptHiddenInput only

**discovered in?** research — found same bug pattern

**minimum viable?** yes — same fix, copy-paste

**should we flag?** no — to fix one and leave the other broken would be negligent

**verdict**: not YAGNI — same root cause, same fix needed

### component 4: unit tests

**requested?** yes — wisher said "lets cover with unit and acceptance tests"

**minimum viable?** yes — test only the cases in criteria

**verdict**: not YAGNI — explicitly requested

### component 5: acceptance test

**requested?** yes — same request as above

**minimum viable?** yes — one test file for keyrack multiline roundtrip

**verdict**: not YAGNI — explicitly requested

## extras check

| question | answer |
|----------|--------|
| did we add abstraction for future flexibility? | no — uses raw node.js API |
| did we add features "while here"? | no — only fix and tests |
| did we optimize before needed? | no — simplest possible pattern |
| did we add error codes or new messages? | no |
| did we add config options? | no |
| did we refactor unrelated code? | no |

## summary

the blueprint contains only:
1. the fix (2 files)
2. tests for the fix (3 files)

no YAGNI detected. ready to proceed.
