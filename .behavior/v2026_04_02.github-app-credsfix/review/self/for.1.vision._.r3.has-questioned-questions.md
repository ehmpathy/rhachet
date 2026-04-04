# self-review r3: has-questioned-questions (code-confirmed)

## questions answered via code inspection

### question 1: where does truncation occur?

**answered via code**: `src/infra/promptHiddenInput.ts` line 23

```ts
rl.once('line', (line) => {
  // ...returns ONLY the first line
});
```

when stdin is piped (not TTY), the code uses `readline.once('line', ...)` which reads exactly ONE line, then returns. multi-line input is truncated.

**status**: [answered] — root cause confirmed in code.

### question 2: is it readline vs read-all?

**answered via code**: yes, confirmed.

the bug is `rl.once('line', ...)` — reads one line only. the fix is to read ALL stdin content when piped.

**status**: [answered] — hypothesis confirmed.

### question 3: are there other code paths affected?

**answered via code**: yes — `promptVisibleInput.ts` has identical bug.

```ts
// src/infra/promptVisibleInput.ts line 21
rl.once('line', (line) => {
  // same bug — only reads first line
});
```

**status**: [answered] — both prompt functions affected.

### question 4: where does keyrack code live?

**answered via code**: this repo (rhachet).

- `src/infra/promptHiddenInput.ts` — stdin reader (bug location)
- `src/domain.operations/keyrack/adapters/vaults/os.secure/vaultAdapterOsSecure.ts` — uses promptHiddenInput

**status**: [answered] — no external packages involved.

## updated research items

original research list:
1. ~~trace stdin handler~~ → [answered] found in promptHiddenInput.ts
2. ~~find where json gets parsed~~ → [answered] not relevant; truncation happens before json parse
3. ~~grep for other stdin patterns~~ → [answered] found promptVisibleInput.ts
4. add unit tests with multiline json input → [research] still needed
5. add acceptance test with RSA-like content → [research] still needed

## action: update vision with answered questions

the vision should be updated to reflect these findings. questions 1-4 are now [answered].

## fix approach confirmed

the fix is to change both `promptHiddenInput.ts` and `promptVisibleInput.ts`:
- when stdin is piped, read ALL content (not just first line)
- options: accumulate via `rl.on('line')` or use stream read

## summary

all 4 questions answered via code inspection:
1. truncation in `promptHiddenInput.ts` line 23
2. caused by `readline.once('line', ...)` pattern
3. `promptVisibleInput.ts` has same bug
4. code is in this repo (rhachet)

no questions remain for [wisher] or [research] regarding root cause. only test authorship remains.
