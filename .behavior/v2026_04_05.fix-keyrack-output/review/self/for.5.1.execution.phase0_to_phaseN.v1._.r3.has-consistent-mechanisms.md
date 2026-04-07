# self-review: has-consistent-mechanisms

## the question

review for new mechanisms that duplicate extant functionality.

unless the ask was to refactor, be consistent with extant mechanisms.

for each new mechanism in the code, ask:
- does the codebase already have a mechanism that does this?
- do we duplicate extant utilities or patterns?
- could we reuse an extant component instead of a new one?

## the review

### search for extant shell escape utilities

**search performed:**
```
grep -ri "shell.*escape|escape.*shell|shellEscape" src/
```

**results:** no extant shell escape utilities found. the only matches are from my new `asShellEscapedSecret.ts` file.

**related but different:** `src/infra/withStdoutPrefix.ts` handles ANSI escape sequences for terminal output — this is for terminal color/format, not shell-safe string escape. different concern entirely.

**why it holds:** `asShellEscapedSecret` is a new capability. no extant mechanism to reuse.

### search for extant output mode patterns

**search performed:**
```
grep "\.option\('--json'" src/contract/cli/
```

**results:** `--json` flag is used 12 times across keyrack commands. this is the extant pattern for robot-readable output.

**my implementation follows this pattern:**
- preserved `--json` as shorthand (line 346)
- added `--output <mode>` as extension (line 347-350)
- logic: `opts.output ?? (opts.json ? 'json' : 'vibes')` (line 365-367)

**why it holds:** I extended the extant `--json` pattern rather than replacing it. both `--json` and `--output json` work. consistent with codebase conventions.

### search for extant source/export patterns

**search performed:**
```
grep -ri "export.*statement|source.*env" src/
```

**results:** no extant CLI command that outputs shell export statements.

**why it holds:** `keyrack source` is a new capability. no extant mechanism to reuse.

### new mechanisms summary

| mechanism | extant alternative? | action |
|-----------|---------------------|--------|
| `asShellEscapedSecret` | none found | new transformer, justified |
| `--output <mode>` | extends `--json` pattern | consistent with extant |
| `keyrack source` | none found | new command, justified |

## found concerns

none. each new mechanism either:
1. has no extant alternative (shell escape, source command)
2. extends extant patterns consistently (`--output` extends `--json`)

## conclusion

**consistent mechanisms check: PASS**

- no duplication of extant utilities
- new patterns extend rather than replace extant conventions
- `--json` shorthand preserved for backwards compatibility with extant scripts
