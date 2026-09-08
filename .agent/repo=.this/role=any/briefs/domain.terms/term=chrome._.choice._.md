# domain.term: chrome

term.chosen   = chrome
term.kind     = noun
term.synonyms.forbidden:
- noise
- debug noise
- boilerplate
- wrapper
- harness output
- cruft
- decoration

## .what

**the bytes a HARNESS wraps around a subject's own render.**

when a surface is exercised through a harness — a node subprocess, a shell, a test runner, a ci
log — that harness adds bytes of its own. those bytes are chrome. they surround the render and
are not part of it.

```
/path/to/file.js:11                      ← chrome (node's code frame)
    throw new ConstraintError('…', {
          ^
                                         ← chrome (node's separator)
ConstraintError: ✋ ConstraintError: …    ← the first `ConstraintError:` is chrome (node's name
                                            echo); the rest is the SUBJECT's own render
{ "reach": "…", "hint": "…" }            ← subject
    at Module._compile (node:internal/…) ← chrome (node's stack frames)
                                         ← chrome
Node.js v22.21.0                         ← chrome (node's footer)
```

## .the test — whose bytes are these?

> **would the surface have emitted this byte if a caller had invoked it directly?**

- **no** → chrome. it exists because of HOW the surface was reached, not WHAT it said
- **yes** → the subject's render, however ugly or volatile it is

⚠️ **volatility is not the test.** chrome churns, but so does a temp dir the subject itself
printed. the axis is authorship, not stability.

## .the invariant a reviewer can check

**chrome is CUT from a contract snapshot; it is never masked.**

a mask asserts *the contract holds this value, it merely moves*. that claim is false of chrome, so
a `$NODE_VERSION` token in a committed snapshot is a lie about the contract — and it invites the
next reader to defend the token as though the surface emitted it. see
`term=mask._.choice._.md` for the cut-vs-mask test this pairs with.

- ✅ node's `Node.js v22.21.0` footer → cut
- ❌ node's `Node.js v22.21.0` footer → masked to `$NODE_VERSION`
- ✅ a temp dir inside the subject's OWN message → masked to `$TESTDIR` (subject, not chrome)

## .chrome is not `debug noise`

`rule.forbid.snapshot-visual-blemishes` names *debug noise* — its example is
`DEBUG: internal state = { x: 1 }`, an internal-state dump the SUBJECT emitted and should not
have. the two are opposites in authorship and in remedy:

| | who wrote it | the remedy |
|---|---|---|
| **chrome** | the harness | cut it from the snapshot; the surface is correct as it stands |
| **debug noise** | the subject | fix the surface; the snapshot merely revealed it |

to call chrome "debug noise" points the repair at the wrong layer — at a renderer that is correct.

## .refs

the operation that cuts chrome:
- `blackbox/sdk/keyrack.source.acceptance.test.ts` — `asSdkRefusalMasked`, which cuts all four
  pieces of node's uncaught-handler chrome and masks only what the sdk itself wrote

the clamp:
- the same file, `[case9][t0]` — the two rows that snap the sdk's render per channel. the cut is
  what makes those bytes stable enough to snap at all

## .reason
see the ref-level cluster beside this choice:
- `term=chrome._.choice.reason.md` — etymology, disputes, evidence

## .see also
- `term=mask._.choice._.md` — the act chrome must NOT receive
- `term=report._.choice.reason.md` — the hollow leaf, the other fact-free byte a render drops
