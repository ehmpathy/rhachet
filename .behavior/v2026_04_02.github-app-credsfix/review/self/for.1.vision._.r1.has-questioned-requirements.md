# self-review: has-questioned-requirements

## requirement 1: "the bug is in stdin read"

**who said this?** inferred from evidence in the wish.

**evidence**:
- jq output shows correct json (user verified inline)
- empty `privateKey` string → json stored correctly
- real RSA key (with `\n` chars) → only `"{"` stored

**what if we're wrong?**
- could be in encryption layer — but empty string went through fine
- could be in vault adapter — but same adapter worked with empty key
- could be in json parse — possible, but truncation at first char suggests stream issue

**verdict**: holds. the only variable that changed was the presence of `\n` in the privateKey value. stdin handler is the most likely culprit.

## requirement 2: "fix should preserve all stdin content"

**is the scope too large?**
no — this is the minimal fix. we're not add features, just correct a defect.

**could we achieve the goal simpler?**
possibly — but we need to trace the code to find where truncation occurs. the vision correctly identifies this as research needed.

**verdict**: holds. scope is appropriate.

## requirement 3: "add unit and acceptance tests"

**is this needed?**
yes — without tests, regression is likely. the bug was silent (set reported success despite stored garbage).

**is scope too large?**
no — tests are essential for this type of fix. they also serve as specification.

**verdict**: holds.

## requirement 4: "no api changes needed"

**what if this is wrong?**
if stdin handler is fundamentally broken, we might need to change the contract (e.g., require base64 encode).

**but**: the contract is "pipe json, get json back". this is correct. the implementation is wrong.

**verdict**: holds. the contract is fine; implementation needs a fix.

## potential absent requirements

**silent failure validation**: the vision mentions that `keyrack set` reports success even when it stored garbage. should we add validation that stored content matches input?

**answer**: out of scope for this fix. noted in vision as "potential improvement". the primary goal is to fix truncation, not add validation.

## summary

all requirements hold. no issues found. the vision correctly identifies:
1. the symptom (truncation)
2. the hypothesis (stdin newline handler)
3. the fix approach (preserve full stream)
4. the tests needed (unit + acceptance with multiline content)
