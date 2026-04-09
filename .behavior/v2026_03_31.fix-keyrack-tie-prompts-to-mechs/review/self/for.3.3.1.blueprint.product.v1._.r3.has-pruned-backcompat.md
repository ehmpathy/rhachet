# self-review r3: has-pruned-backcompat

## backwards compat directive

from the wish:
> "we want to generically refactor everything, with zero backwards compat"

this is explicit. no backwards compat shims, aliases, or migrations.

---

## blueprint audit

### 1. vault rename: aws.iam.sso → aws.config

**blueprint says:**
```
aws.iam.sso/ → aws.config/
  [-] aws.iam.sso/                 — delete directory
  [+] aws.config/                  — create directory
```

**backwards compat concern?** no.
- old directory deleted
- no alias or redirect
- no migration for extant host manifests

**verdict:** clean break, zero backcompat

---

### 2. extant aws sso flow

**from vision:**
> "aws sso works as it always did via stdout, only the internals change"

**question:** is "works as it always did" a backwards compat concern?

**analysis:**
- the wish says: "aws sso works as it always did via stdout, only the internals change"
- this refers to user-visible behavior (stdout prompts), not code compatibility
- internal restructure with same external behavior is not backwards compat
- no shims, no aliases, no deprecated code paths

**verdict:** not a backwards compat concern — same UX, new internals

---

### 3. mech adapter interface extension

**blueprint says:**
```
KeyrackGrantMechanismAdapter
├─ [○] validate
├─ [○] translate
└─ [+] promptForSet
```

**question:** is [○] for extant methods a backwards compat concern?

**analysis:**
- [○] means unchanged
- [+] means addition
- no [~] that preserves old behavior while new is added
- extant methods remain as-is, new method added
- mech adapters that don't implement promptForSet will fail (no shim)

**verdict:** additive change, not backwards compat

---

### 4. vault adapter interface extension

**blueprint says:**
```
KeyrackHostVaultAdapter
├─ [○] unlock, isUnlocked, get, del, relock
├─ [~] set
├─ [+] supportedMechs
└─ [+] checkMechCompat
```

**question:** is [~] for set a backwards compat concern?

**analysis:**
- [~] means modified
- set signature change: now receives secret from mech, not from prompt
- old vault adapters that expect to prompt will break
- no shim to support old behavior

**verdict:** not backwards compat — a break as requested

---

### 5. host manifest entries with aws.iam.sso vault

**question:** what happens to extant host manifest entries that reference aws.iam.sso?

**analysis:**
- wish says "zero backwards compat"
- old entries reference deleted vault name
- vault lookup will fail
- user must re-run keyrack set

**verdict:** correct — break extant entries, no migration

---

### 6. risks table mentions "break extant aws sso flow"

**blueprint says:**
```
| break extant aws sso flow | move logic, not rewrite; same prompts, new location |
```

**question:** is "move logic, not rewrite" a backwards compat concern?

**analysis:**
- this is about code reuse, not backwards compat
- move setupAwsSsoWithGuide logic to mech adapter
- same prompts for user experience, not for code compatibility
- no shim or alias

**verdict:** code reuse, not backwards compat

---

## summary

no backwards compat violations found.

**verified clean breaks:**
1. aws.iam.sso → aws.config — directory deleted, no alias
2. vault adapter set signature — change without shim
3. mech adapter promptForSet — required, no fallback
4. host manifest entries — will fail lookup, require re-set

**clarified non-issues:**
1. "works as it always did" — refers to UX, not code compat
2. "move logic, not rewrite" — code reuse, not backwards compat

**verdict:** blueprint adheres to "zero backwards compat" directive.
