# self-review r2: has-questioned-deletables

## features review

### feature: `--value` flag

| question | answer |
|----------|--------|
| traces to requirement? | ✅ wish: "keyrack should support rhx keyrack get --value" |
| wisher asked for it? | ✅ explicitly |
| assumed it was needed? | no |
| verdict | **keep** — explicitly requested |

### feature: `--output <mode>`

| question | answer |
|----------|--------|
| traces to requirement? | ✅ vision: "--output is the full format, --value is an alias" |
| wisher asked for it? | ✅ explicitly in vision Q&A |
| assumed it was needed? | no |
| verdict | **keep** — explicitly requested as the full format |

### feature: `keyrack source`

| question | answer |
|----------|--------|
| traces to requirement? | ✅ wish: "support rhx keyrack source --key xyz" |
| wisher asked for it? | ✅ explicitly |
| assumed it was needed? | no |
| verdict | **keep** — explicitly requested |

### feature: `--strict` mode

| question | answer |
|----------|--------|
| traces to requirement? | ✅ wish: "with --strict mode, in a way that matches the sdk" |
| wisher asked for it? | ✅ explicitly |
| assumed it was needed? | no |
| verdict | **keep** — explicitly requested |

### feature: `--lenient` mode

| question | answer |
|----------|--------|
| traces to requirement? | ✅ vision: SDK parity requires lenient mode as alternative |
| wisher asked for it? | implicit (SDK has lenient, wish says "match the sdk") |
| assumed it was needed? | no — SDK parity mandates it |
| verdict | **keep** — SDK parity requirement |

## components review

### component: `asShellEscapedSecret.ts`

| question | answer |
|----------|--------|
| can be removed? | no — shell escape logic is required for source command |
| if deleted and had to add back, would we? | yes — shell escape is complex (quotes, newlines, backslashes) |
| did we optimize what shouldn't exist? | no — shell escape is fundamental to the feature |
| simplest version that works? | this is the simplest — pure transformer with escape rules |
| verdict | **keep** — required for shell-safe output |

### component: `formatKeyrackSourceOutput.ts`

| question | answer |
|----------|--------|
| can be removed? | technically yes — could inline in invokeKeyrack.ts |
| if deleted and had to add back, would we? | probably yes — for testability |
| did we optimize what shouldn't exist? | no |
| simplest version that works? | inline would be simpler but less testable |

**deeper analysis:**

the format logic is simple:
```ts
attempts
  .filter(a => a.status === 'granted')
  .map(a => `export ${keyName}='${escape(secret)}'`)
  .join('\n')
```

arguments to retain:
1. unit testability — pure transformer easier to test than CLI code
2. consistency — follows extant `formatKeyrackGetOneOutput` pattern
3. separation — format logic separate from CLI orchestration

arguments to delete:
1. one fewer file
2. logic is simple enough to inline

**verdict:** **keep** — testability and consistency outweigh the cost of one file

## issues found

none.

## why it holds

all features trace to explicit requirements:
- `--value` → wish
- `--output <mode>` → vision Q&A
- `keyrack source` → wish
- `--strict` → wish
- `--lenient` → SDK parity (wish says "match the sdk")

all components are required:
- `asShellEscapedSecret.ts` — complex escape logic belongs in transformer
- `formatKeyrackSourceOutput.ts` — kept for testability and consistency

no features or components were added without traceability.

