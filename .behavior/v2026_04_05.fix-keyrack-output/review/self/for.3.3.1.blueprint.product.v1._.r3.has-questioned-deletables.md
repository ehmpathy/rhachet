# self-review r3: has-questioned-deletables (deep reflection)

## deeper look at formatKeyrackSourceOutput.ts

in r2, I concluded "keep for testability and consistency." let me question harder.

### could we inline it?

yes. the inline version is ~6 lines:

```ts
for (const attempt of attempts) {
  if (attempt.status !== 'granted') continue;
  const keyName = attempt.grant.slug.split('.').pop()!;
  const escaped = asShellEscapedSecret({ secret: attempt.grant.key.secret });
  console.log(`export ${keyName}=${escaped}`);
}
```

### what do we gain by extraction?

| benefit | weight |
|---------|--------|
| unit test speed | low — 6 lines, acceptance tests suffice |
| readability | low — 6 lines inline is readable |
| consistency with formatKeyrackGetOneOutput | medium — extant pattern |

### what do we lose by extraction?

| cost | weight |
|------|--------|
| one more file | low |
| indirection | low |

### the honest question

"if we deleted formatKeyrackSourceOutput and had to add it back, would we?"

**answer:** probably not immediately. we'd inline it, run acceptance tests, and only extract if:
1. the format became more complex
2. we needed to reuse it elsewhere
3. the inline version became unwieldy

### verdict

**delete formatKeyrackSourceOutput.ts from blueprint.**

rationale:
- 6 lines is not worth extraction
- shell escape (the complex part) is already extracted
- acceptance tests verify the output format
- YAGNI — extract when we need it, not before

## updated blueprint diff

before:
```
├─ [+] asShellEscapedSecret.ts
├─ [+] formatKeyrackSourceOutput.ts
```

after:
```
├─ [+] asShellEscapedSecret.ts
```

the source command action handler inlines the format logic.

## issue found and fixed

| issue | fix |
|-------|-----|
| formatKeyrackSourceOutput.ts is premature extraction | delete from blueprint, inline in action handler |

### fix applied

updated 3.3.1.blueprint.product.v1.i1.md:
1. removed `[+] formatKeyrackSourceOutput.ts` from filediff tree
2. updated codepath tree to inline format logic in action handler
3. removed transformer section for formatKeyrackSourceOutput.ts
4. removed unit test section for formatKeyrackSourceOutput.test.ts
5. updated implementation order to remove step 2

## why asShellEscapedSecret.ts holds

asked the same question: "if we deleted this and had to add it back, would we?"

**answer:** yes, immediately.

rationale:
- shell escape logic is genuinely complex (~15 lines with edge cases)
- single quote escape: `'sec'\''ret'`
- newline handling: `$'line1\nline2'`
- backslash preservation: correct escaping matters for security
- reused by any shell output (source command now, possibly others later)
- failure mode is security risk (injection via malformed output)

this passes the extraction bar because:
1. complexity is non-trivial
2. correctness matters (security boundary)
3. unit tests justify the isolation
4. reuse is likely (any shell-facing output)

## what I learned

"testability and consistency" are not sufficient reasons to extract.
the bar for extraction: "would we add it back if deleted?"

two outcomes this round:
- formatKeyrackSourceOutput.ts: 6 lines, complex part extracted → delete
- asShellEscapedSecret.ts: 15 lines, security-critical, reusable → keep

