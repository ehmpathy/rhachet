# self-review r8: has-consistent-conventions

## review for divergence from extant names and patterns

### extant name conventions in keyrack

| location | pattern | examples |
|----------|---------|----------|
| `domain.operations/keyrack/` | `asKeyrackKey{Part}` | asKeyrackKeyOrg, asKeyrackKeyEnv, asKeyrackKeyName, asKeyrackKeySlug |
| `domain.operations/keyrack/cli/` | `format{What}Output` | formatKeyrackGetOneOutput, formatKeyrackGetAllOutput |
| `domain.operations/keyrack/cli/` | `emit{What}` | emitKeyrackKeyBranch, formatKeyrackKeyBranch |

### blueprint name choices

| proposed name | location | purpose |
|---------------|----------|---------|
| `asShellEscapedSecret` | `domain.operations/keyrack/cli/` | shell escape transformer |
| `--output <mode>` | invokeKeyrack.ts | output mode option |
| `--value` | invokeKeyrack.ts | alias for --output value |
| `source` | keyrack subcommand | output export statements |
| `--strict` / `--lenient` | source options | mode flags |

---

## deep analysis: asShellEscapedSecret name

**question:** should this be `asKeyrackShellEscapedSecret` to match extant `asKeyrackKey*` transformers?

### the alternative: what if we named it `asKeyrackShellEscapedSecret`?

this would:
- add 7 characters to every call site
- imply the function is keyrack-specific (it's not — it escapes any string)
- create confusion: "why is shell escape a keyrack concern?"
- break the pattern: extant `asKeyrackKey*` transformers take keyrack slugs as input

### extant pattern analysis

```ts
// extant: input is keyrack slug
asKeyrackKeyOrg({ slug: 'ehmpathy.test.API_KEY' })   // → 'ehmpathy'
asKeyrackKeyEnv({ slug: 'ehmpathy.test.API_KEY' })   // → 'test'
asKeyrackKeyName({ slug: 'ehmpathy.test.API_KEY' })  // → 'API_KEY'

// proposed: input is generic string
asShellEscapedSecret({ secret: "sec'ret" })          // → "'sec'\\''ret'"
```

the "Keyrack" prefix in extant names describes the **input domain** — a keyrack slug. the proposed function takes a generic string, not a keyrack-specific type.

### the alternative: what if we named it `escapeSecretForShell`?

this would:
- break the `as{Output}` transformer convention
- use a verb prefix instead of `as` (inconsistent with `asKeyrackKeyOrg`)
- read as an imperative command rather than a transformation

### why the extant pattern holds

| convention | extant example | proposed follows? |
|------------|---------------|-------------------|
| `as{Transform}{Subject}` | asKeyrackKeyOrg | yes: as[ShellEscaped][Secret] |
| subject describes output | "Org" = string org name | yes: "Secret" = escaped string |
| transform describes change | "KeyOrg" = extract from slug | yes: "ShellEscaped" = escape for shell |

**verdict:** `asShellEscapedSecret` is correct. follows `as{Transform}{Subject}` pattern. no Keyrack prefix because input is generic string.

---

## deep analysis: CLI option names

### the alternative: what if we used `--format` instead of `--output`?

this would:
- conflict with common `--format` conventions (often means "pretty" vs "raw")
- be less descriptive: "format" implies appearance, "output" implies mode
- extant `--json` is already about output mode, not format

### the alternative: what if we used `--raw` instead of `--value`?

this would:
- be ambiguous: "raw" could mean unformatted JSON, unquoted text, etc.
- not match the blueprint's semantics: we output the **value**, not a "raw" form
- `--value` is explicit: "give me the value"

### extant pattern analysis

```
# extant
--json              boolean flag for JSON output

# proposed
--output <mode>     explicit mode selection
--value             boolean alias for --output value
--json              preserved as alias for --output json
```

the pattern is additive:
- `--json` (extant boolean) continues to work
- `--output json` is the explicit equivalent
- `--output value` and `--output vibes` extend the pattern

**verdict:** `--output` is correct. `--value` as alias matches `--json` as alias.

---

## deep analysis: source command structure

### the alternative: what if we used `keyrack get --output shell`?

this would:
- overload `get` with a fundamentally different operation
- `get` retrieves one or more keys; `source` emits export statements
- users would expect `--output shell` to output shell-formatted info, not eval-ready exports
- `source .env` is a shell idiom — `keyrack source` matches this mental model

### the alternative: what if we used `keyrack export`?

this would:
- conflict with shell semantics: `export VAR=x` is a shell builtin
- `export` as a noun/verb is overloaded in code
- `source` is clearer: "produce output to be sourced"

### extant verb analysis

| verb | operation type | pattern |
|------|---------------|---------|
| get | retrieve data | returns grant(s) |
| set | mutate state | writes to vault |
| del | remove state | removes from vault |
| unlock | change session | unlocks keys |
| source | **produce output** | emits export statements |

`source` fits the pattern: it's a distinct operation type (produce eval-ready output).

**verdict:** `source` is correct. matches shell idiom, distinct from `get`.

---

## deep analysis: strict/lenient mode names

### the alternative: what if we used `--fail-fast` / `--continue`?

this would:
- break SDK parity (SDK uses `mode: 'strict' | 'lenient'`)
- `--fail-fast` implies speed, not policy
- `--continue` is ambiguous: continue from what?

### the alternative: what if we used `--mode strict` / `--mode lenient`?

this would:
- require extra characters: `--mode strict` vs `--strict`
- be less ergonomic for the common case (strict is default anyway)
- boolean flags are CLI idiom for binary choices

### SDK parity check

| SDK | CLI | match? |
|-----|-----|--------|
| `mode: 'strict'` | `--strict` | yes (term matches) |
| `mode: 'lenient'` | `--lenient` | yes (term matches) |
| strict is default | strict is default | yes |
| lenient skips silently | lenient skips silently | yes |

**verdict:** `--strict` / `--lenient` is correct. terms match SDK, flags follow CLI idiom.

---

## issues found

none.

## why it holds

all name choices follow extant conventions and have clear justification:

1. **asShellEscapedSecret** — `as{Transform}{Subject}` pattern. no Keyrack prefix because input is generic string, not keyrack slug. alternatives (`asKeyrackShellEscapedSecret`, `escapeSecretForShell`) would violate patterns or imply wrong semantics.

2. **--output option** — additive superset of `--json`. alternatives (`--format`, `--raw`) are ambiguous or conflict with conventions.

3. **source subcommand** — matches `source .env` shell idiom. alternatives (`get --output shell`, `export`) overload verbs or conflict with shell builtins.

4. **--strict/--lenient flags** — exact SDK term match. alternatives (`--fail-fast`, `--mode strict`) would break parity or reduce ergonomics.

no divergence from extant conventions. all alternatives were considered and rejected for specific reasons.
