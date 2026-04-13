# review: role-standards-adherance (round 7)

## slowed down. opened each file. traced against specific briefs.

---

## rule directories checked

1. `practices/code.prod/evolvable.procedures/` — function patterns
2. `practices/code.prod/pitofsuccess.errors/` — error patterns
3. `practices/code.prod/readable.comments/` — comment style
4. `practices/lang.terms/` — terms
5. `practices/code.test/` — test patterns

---

## promptLineInput.ts (lines 1-27)

### rule.require.what-why-headers

```ts
/**
 * .what = prompts user for single line of visible input
 * .why = enables simple line-by-line prompts (e.g., choice selection)
 *
 * .note = differs from promptVisibleInput — this reads one line, not all stdin
 * .note = differs from promptHiddenInput — this shows what user types
 */
```

**verdict**: has .what, .why, and .note — follows rule ✓

### rule.require.input-context-pattern

```ts
export const promptLineInput = async (input: {
  prompt: string;
}): Promise<string> => {
```

**verdict**: uses `(input: { ... })` pattern — follows rule ✓

### rule.require.arrow-only

```ts
export const promptLineInput = async (input: ...) => {
```

**verdict**: arrow function — follows rule ✓

### rule.forbid.gerunds

checked all identifiers:
- `promptLineInput` — no gerund ✓
- `createInterface` — from node, not our code
- no variable names contain gerunds ✓

---

## mockPromptLineInput.ts (lines 1-56)

### rule.require.what-why-headers

```ts
/**
 * .what = mock for promptLineInput in tests with sequential prompts
 * .why = inferKeyrackMechForSet prompts for mech selection via stdin
 */
```

**verdict**: has .what and .why — follows rule ✓

each exported function also has .what and .why:
- `setMockPromptLineValues` — lines 22-25 ✓
- `clearMockPromptLineValues` — lines 30-33 ✓
- `genMockPromptLineInput` — lines 38-42 ✓

### rule.require.arrow-only

```ts
export const setMockPromptLineValues = (values: ...) => {
export const clearMockPromptLineValues = (): void => {
export const genMockPromptLineInput = (): { ... } => ({
```

**verdict**: all arrow functions — follows rule ✓

### rule.require.failfast

```ts
if (value === undefined) {
  throw new Error(
    'mockPromptLineInput: queue empty — call setMockPromptLineValues() before the operation',
  );
}
```

**verdict**: throws with actionable message — follows rule ✓

---

## inferKeyrackMechForSet.ts (key changes)

### rule.require.arrow-only

```ts
export const inferKeyrackMechForSet = async (input: {
  vault: KeyrackHostVaultAdapter;
}): Promise<KeyrackGrantMechanism> => {
```

**verdict**: arrow function — follows rule ✓

### rule.require.failfast

```ts
if (isNaN(choice) || choice < 1 || choice > supported.length) {
  throw new Error(
    `invalid choice: ${answer}; expected 1-${supported.length}`,
  );
}
```

**verdict**: throws on invalid input — follows rule ✓

### rule.forbid.else-branches

```ts
// single mech: auto-select
if (supported.length === 1) {
  return supported[0]!;
}

// multiple mechs: prompt via stdin
// ... no else, continues to prompt logic
```

**verdict**: early return pattern — follows rule ✓

---

## anti-patterns final check

| pattern | found in code? |
|---------|----------------|
| `function` keyword | no ✓ |
| positional args (non-input) | no ✓ |
| `else` or `else if` | no ✓ |
| swallowed errors | no ✓ |
| gerunds in names | no ✓ |

---

## verdict

**holds** — all code follows mechanic role standards. traced each rule against actual code lines. no violations.

