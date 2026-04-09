# howto.pty-visual-space

## .what

use braille blank character (`\u2800`) for visual spacing in CLI output that must survive PTY capture.

## .why

PTY capture via `script -qec` (used in acceptance tests via `pty-with-answers.js`) collapses truly empty lines.

| approach | survives PTY? |
|----------|---------------|
| `console.log('')` | no |
| `\n` in template literal | no |
| `process.stdout.write('\n')` | no |
| `console.log('\u2800')` | yes |

the braille blank (U+2800) is categorized as a symbol, not whitespace. the PTY sees it as a line with content even though it renders visually blank.

## .when

use when you need visual separation in CLI output and:
- acceptance tests use pseudo-TTY via `pty-with-answers.js`
- the blank line must survive snapshot capture

## .pattern

```typescript
console.log('      └─ ✓ roundtrip verified');
console.log('\u2800'); // braille blank for visual space (survives PTY)
```

renders as:

```
      └─ ✓ roundtrip verified
⠀
🔐 keyrack set (org: testorg, env: test)
```

## .note

in normal terminal usage, regular newlines work fine. this is specifically for output captured by PTY-based acceptance tests.

## .see also

- `blackbox/.test/assets/pty-with-answers.js` — the PTY helper that uses `script -qec`
