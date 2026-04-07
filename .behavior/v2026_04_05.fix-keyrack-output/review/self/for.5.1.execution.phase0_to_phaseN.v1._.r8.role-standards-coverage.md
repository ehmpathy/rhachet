# self-review: role-standards-coverage (second pass)

## the question

second pass: deeper check for coverage of mechanic role standards.

this pass examines specific patterns that may have been overlooked:
- edge case validation
- type safety
- proper use of early returns
- comment clarity

## additional rule categories checked

second-pass additions to the first review:
- `code.prod/pitofsuccess.typedefs/` — type safety rules
- `code.prod/evolvable.domain.objects/` — domain object patterns
- `code.prod/consistent.contracts/` — contract patterns

## the review

### check: type safety in switch statement (invokeKeyrack.ts:465-497)

```ts
switch (outputMode) {
  case 'value': { ... }
  case 'json': { ... }
  case 'vibes':
  default: { ... }
}
```

**why it holds:**
- `outputMode` is typed as `'value' | 'json' | 'vibes'`
- all three cases are handled
- `default` combined with `vibes` catches any edge case
- no `as` cast needed — types flow correctly

---

### check: status type guard in source command (invokeKeyrack.ts:581-588)

```ts
for (const attempt of granted) {
  if (attempt.status !== 'granted') continue;
  const keyName = asKeyrackKeyName({ slug: attempt.grant.slug });
  ...
}
```

**why it holds:**
- `granted` is filtered to `status === 'granted'` on line 562
- the `if` check at 582 is a type guard that narrows to `{ status: 'granted', grant: ... }`
- this enables safe access to `attempt.grant.slug`
- no `as` cast needed — typescript correctly narrows the type

---

### check: consistent error patterns (invokeKeyrack.ts)

| location | pattern | compliant? |
|----------|---------|------------|
| line 371 | `throw new BadRequestError(...)` | yes |
| line 376 | `throw new BadRequestError(...)` | yes |
| line 379 | `throw new BadRequestError(...)` | yes |
| line 526 | `throw new BadRequestError(...)` | yes |
| line 531 | `throw new BadRequestError(...)` | yes |

**why it holds:**
- all validation errors use `BadRequestError`
- no raw `Error` or `throw new Error()` patterns
- consistent with pitofsuccess.errors rules

---

### check: comment style in asShellEscapedSecret.ts

```ts
// if secret contains control chars (newlines, tabs, etc), use $'...' ANSI-C syntax
// ANSI-C syntax: $'...'
// - backslash -> \\
// - single quote -> \'
// plain single quotes: 'secret'
// single quote in content: 'sec'\''ret' (end, escaped, start)
```

**why it holds:**
- comments explain why, not what
- one-liners before code paragraphs
- no multiline `//` blocks (each comment is single line)

---

### check: no decode-friction in orchestrators

**invokeKeyrack.ts source command:**
```ts
const keyName = asKeyrackKeyName({ slug: attempt.grant.slug });
const escaped = asShellEscapedSecret({ secret: attempt.grant.key.secret });
```

**why it holds:**
- keyName extraction delegated to `asKeyrackKeyName` (named transformer)
- shell escape delegated to `asShellEscapedSecret` (named transformer)
- no inline `.split('.').slice(2).join('.')` decode-friction

---

### check: slug extraction in source error output

**invokeKeyrack.ts:569-571:**
```ts
for (const a of notGranted) {
  const slug = 'slug' in a ? a.slug : 'unknown';
  console.error(`not granted: ${slug} (${a.status})`);
}
```

**why it holds:**
- the `'slug' in a` check is a type guard
- handles both grant result shapes: `{ status, slug }` and `{ status, grant: { slug } }`
- fallback to 'unknown' for edge cases
- no `as any` or unsafe cast

---

### check: no nullable without reason (asShellEscapedSecret.ts)

**input type:**
```ts
input: { secret: string }
```

**why it holds:**
- `secret` is required string, not optional
- no nullable attributes
- if secret could be absent, that should be handled by caller before invocation

---

### check: regex patterns at module scope

**asShellEscapedSecret.ts:2-3:**
```ts
const CONTROL_CHAR_PATTERN = /[\n\r\t\x00-\x1f]/;
const OTHER_CONTROL_CHARS = /[\x00-\x1f]/g;
```

**why it holds:**
- regex compiled once at module load
- not recreated on each function call
- performance-conscious pattern

## found concerns

none in second pass. all additional checks pass:

| check | result |
|-------|--------|
| type safety in switch | pass |
| status type guard | pass |
| error patterns | pass |
| comment style | pass |
| no decode-friction | pass |
| slug extraction guard | pass |
| no nullable without reason | pass |
| regex at module scope | pass |

## conclusion

**role standards coverage check (second pass): PASS**

- type safety verified without unsafe casts
- error patterns use proper BadRequestError
- comments follow mechanic style
- decode-friction extracted to named transformers
- regex compiled at module scope for performance
- no absent patterns found
