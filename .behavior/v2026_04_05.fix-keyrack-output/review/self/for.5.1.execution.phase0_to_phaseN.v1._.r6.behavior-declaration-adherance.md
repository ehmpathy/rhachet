# self-review: behavior-declaration-adherance

## the question

review for adherance to the behavior declaration.

go through each file changed in this pr, line by line, and check against the behavior's vision, criteria, and blueprint:
- does the implementation match what the vision describes?
- does the implementation satisfy the criteria correctly?
- does the implementation follow the blueprint accurately?

## the review

### keyrack get --value implementation

**spec:** `--value` outputs raw secret with no final newline

**code (invokeKeyrack.ts:475):**
```ts
process.stdout.write(attemptResolved.grant.key.secret);
```

**why it holds:** `process.stdout.write()` does not append newline (unlike `console.log()`). matches spec exactly.

---

**spec:** `--value` exit 2 for not granted states

**code (invokeKeyrack.ts:468-472):**
```ts
if (attemptResolved.status !== 'granted') {
  console.error(`${attemptResolved.status}: ${attemptResolved.slug}`);
  process.exit(2);
}
```

**why it holds:** exit 2 for constraint errors. stderr shows status. matches spec.

---

**spec:** `--value` requires `--key` (single key only)

**code (invokeKeyrack.ts:369-372):**
```ts
if (outputMode === 'value' && !opts.key) {
  throw new BadRequestError('--value requires --key (single key only)');
}
```

**why it holds:** explicit validation with clear error message. matches spec.

### keyrack source implementation

**spec:** strict mode is default

**code (invokeKeyrack.ts:537):**
```ts
const isLenient = opts.lenient ?? false;
```

**why it holds:** lenient defaults to false, so strict is default. matches spec.

---

**spec:** strict mode: no stdout on failure (prevent partial eval)

**code (invokeKeyrack.ts:566-578):**
```ts
if (!isLenient && notGranted.length > 0) {
  // no stdout (prevent partial eval)
  // emit status to stderr
  for (const a of notGranted) {
    ...
    console.error(`not granted: ${slug} (${a.status})`);
  }
  console.error('');
  console.error('hint: use --lenient if partial results are acceptable');
  process.exit(2);
}
```

**why it holds:** errors go to stderr (console.error). no stdout before exit 2. matches spec.

---

**spec:** lenient mode skips absent keys silently (SDK parity)

**code (invokeKeyrack.ts:566):**
```ts
if (!isLenient && notGranted.length > 0) { ...
```

**why it holds:** the entire error block only executes when `!isLenient`. in lenient mode, we skip to export statements for granted keys. matches SDK behavior.

---

**spec:** export format uses shell-safe escape

**code (invokeKeyrack.ts:584-587):**
```ts
const escaped = asShellEscapedSecret({
  secret: attempt.grant.key.secret,
});
console.log(`export ${keyName}=${escaped}`);
```

**why it holds:** uses `asShellEscapedSecret` transformer. matches spec.

---

**spec:** `--strict` and `--lenient` mutually exclusive

**code (invokeKeyrack.ts:530-534):**
```ts
if (opts.strict && opts.lenient) {
  throw new BadRequestError(
    '--strict and --lenient are mutually exclusive',
  );
}
```

**why it holds:** explicit validation. matches spec.

### asShellEscapedSecret implementation

**spec:** single quotes for normal secrets

**code (asShellEscapedSecret.ts:39-40):**
```ts
const escaped = secret.replace(/'/g, "'\\''" );
return `'${escaped}'`;
```

**why it holds:** wraps in single quotes. escapes embedded quotes as `'\''`. matches spec.

---

**spec:** $'...' ANSI-C syntax for secrets with control chars (newlines, tabs)

**code (asShellEscapedSecret.ts:15-33):**
```ts
if (hasControlChars) {
  const escaped = secret
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(OTHER_CONTROL_CHARS, (char) => {
      const hex = char.charCodeAt(0).toString(16).padStart(2, '0');
      return `\\x${hex}`;
    });
  return `$'${escaped}'`;
}
```

**why it holds:** detects control chars, uses ANSI-C `$'...'` syntax with proper escape sequences. matches spec.

## found concerns

none. implementation matches spec in all checked areas:
- exit codes match (0 granted, 2 not granted)
- output format matches (no newline for value, export statements for source)
- modes work as specified (strict default, lenient opt-in)
- shell escape handles all edge cases (quotes, newlines, control chars)

## conclusion

**behavior declaration adherance check: PASS**

- implementation matches vision day-in-the-life scenarios
- implementation satisfies criteria correctly
- implementation follows blueprint accurately
- no deviations from spec found
