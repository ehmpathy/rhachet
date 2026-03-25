# self-review r4: has-preserved-test-intentions

## fourth pass: document intentional test changes

r3 concluded "holds" — but missed the 1password adapter test changes. let me document them.

---

## 1password adapter test changes (intentional)

the 1password adapter tests changed intentionally per vision/blueprint:

### before (on main branch)

```typescript
given('[case3] set is not supported', () => {
  then('throws error about unsupported operation', async () => {
    // ...threw UnexpectedCodePathError
  });
});

given('[case4] del is not supported', () => {
  then('throws error about unsupported operation', async () => {
    // ...threw UnexpectedCodePathError
  });
});
```

### after (current implementation)

```typescript
given('[case3] del is a noop (1password is refed vault)', () => {
  then('completes without error (keyrack only removes manifest entry)', async () => {
    // ...del returns void, no error
  });
});

given('[case5] set validates exid format', () => {
  then('throws BadRequestError about invalid format', async () => {
    // ...validates exid, throws on invalid format
  });
});
```

---

## why this is valid

the requirements changed per vision.stone:

> **refed vault behavior**
>
> keyrack can't create or delete items in 1password — 1password is a refed vault, not owned.
>
> **resolution:** `keyrack del` removes the pointer from keyrack (the host manifest entry). the 1password item remains untouched.

the blueprint documents this:

> **vaultAdapter1Password.set**
> ```typescript
> /**
>  * .what = prompts for exid, validates roundtrip, returns exid
>  * .why = 1password is source of truth, keyrack stores pointer
>  */
> set: async (input) => Promise<{ exid: string }>
> ```

the tests now reflect the documented behavior:
- `del` is a noop in the adapter (manifest removal is handled by delKeyrackKeyHost)
- `set` validates exid format and prompts for op://uri

---

## approval chain

| document | approves |
|----------|----------|
| wish.md | "set should verify that 1password cli is setup... and then should simply set into the host manifest the exid" |
| vision.stone | "keyrack del removes the pointer from keyrack... the 1password item remains untouched" |
| blueprint | "set() with exid prompt, isOpCliInstalled check, roundtrip validation" |

the test changes are not weakened assertions — they are updated assertions that match updated requirements.

---

## forbidden patterns: none found

| forbidden pattern | found? | notes |
|-------------------|--------|-------|
| weakened assertions to make tests pass | no | assertions changed to match new requirements |
| removed test cases that "no longer apply" | no | cases were replaced with new requirement cases |
| changed expected values to match broken output | no | expected values match documented behavior |
| deleted tests that fail instead of fix code | no | tests were rewritten per blueprint |

---

## conclusion

test intentions were preserved where applicable, and intentionally updated where requirements changed:

1. vault adapter tests were reorganized into subdirectories (not deleted)
2. new tests were added for new functionality
3. 1password adapter tests changed because 1password is now a refed vault (per vision/blueprint)
4. the test changes have documented approval in wish.md, vision.stone, and blueprint

holds.

