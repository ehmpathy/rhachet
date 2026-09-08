# domain.term: mask

term.chosen   = mask
term.kind     = verb
term.synonyms.forbidden:
- sanitize
- scrub
- filter
- hide
- obfuscate

## .what

**to REPLACE a value with a fixed marker, while the field around it still renders.**

a value is masked on one of two grounds — it must not be SEEN (a secret), or it must not be
COMPARED (a volatile byte). the act is identical; only the motive differs, so it is one term:

a mask keeps the LEAF and destroys only the VALUE. that pair is the whole term:

```
value: __REDACTED__     ← masked: the field is present, the bytes are not
                        ← dropped: neither the field nor the bytes (a different act)
```

⚠️ **`mask` and `drop` are opposites, and the distinction is the reason the word exists.** to drop
a field is `rule.forbid.failhide` in renderer form — the throw site looks correct, the field is
real, and only the render eats it, so a human reads a refusal that names no cause. to mask it is
the opposite: the human learns the field was there and that its value was withheld.

## .the invariant a reviewer can check

**a mask NEVER removes the leaf.** a masked field renders `<key>: __REDACTED__`; it is never
skipped, and it never renders a partial value (a prefix, a length, a fingerprint).

- ✅ `flatLeaves.push(\`${key}: ${isMasked ? '__REDACTED__' : spelled}\`)`
- ❌ `if (isMasked) continue` — that is a drop under a mask's name
- ❌ `${value.slice(0, 4)}…` — a partial value is a partial leak

## .the two motives

| motive | the marker | why the value cannot render |
|---|---|---|
| **secrecy** — a credential | `__REDACTED__` | it must not be SEEN: a terminal, a scrollback, a ci log |
| **volatility** — a nondeterministic byte | `$TESTDIR`, `__TIMESTAMP__`, `$SECRET` | it must not be COMPARED: it differs per host or per run, so a snapshot that holds it fails for a reason unrelated to the contract |

⚠️ **a volatile mask is what makes a snapshot possible, never what excuses its absence.** the
doctrine is **mask-then-snap**: a render with volatile bytes is not exempt from a snapshot — its
volatile field is replaced and the render is snapped. "this output has a temp path in it" is a
reason to mask, never a reason to skip (`rule.require.contract-snapshot-exhaustiveness`).

⚠️ **a snapshot may also CUT, and a cut is a drop, deliberately.** to mask says "a value was
here"; to cut says "this was never part of the contract". a cut is the ONE sanctioned drop, and it
is sanctioned only because the cut content carries no fact
(`term=report._.choice.reason.md` — the hollow leaf).

### the test that decides between them

**volatility does NOT decide it — both a mask and a cut act on bytes that churn.** the question is
whose bytes they are:

| ask | verdict |
|---|---|
| does the surface under test PROMISE this byte, and it merely moves? | **mask** |
| is this byte the harness's, wrapped around the surface's own render? | **cut** — it is `chrome` |

⚠️ **to mask chrome is worse than to leave it.** a `$NODE_VERSION` token in a contract snapshot
asserts *the contract holds a node version, it merely moves* — which is false, and it invites the
next reader to defend the token as though the surface emitted it. cut it, and the snapshot holds
only what a caller can act on.

that test settled the node-version case: it had been masked to `$NODE_VERSION` as a volatile byte;
it is node's uncaught-handler footer, so it is chrome, and it is now cut along with the code frame,
the `at` frames, and the name echo (see `term=chrome._.choice._.md`).

## .the two secrecy grounds, and why both

a SECRET mask decides on ONE of two independent grounds, OR'd — a leak needs both to miss:

| ground | reads | fails when |
|---|---|---|
| key-name | the FIELD's name (`secret`, `token`, `passphrase`, …) | a secret lands under `value` / `body` / `data` |
| value-shape | the VALUE's own shape (`isKeyrackSecretShaped`) | a credential has no recognizable shape |

## .a secret in a SNAPSHOT is masked even when it is synthetic

a fixture credential is not a live one, so the secrecy motive does not strictly apply — yet it is
masked anyway, on a third ground: a snapshot is a **committed, human-read artifact**, and a
credential-shaped literal in one teaches the next author that a snapped secret is normal. the
mask costs no information: `"stdout": "$SECRET"` still proves the value is the whole stream with
no byte after it, and `"secret": "$SECRET"` beside `"protection": "plaintext"` still proves the
verb emits a credential in that position — which is the fact a reviewer came for.

## .refs

the operations that decide a SECRET mask:
- `src/domain.operations/keyrack/isKeyrackSecretShaped.ts` — the value-shape ground
- `src/domain.operations/keyrack/getKeyrackBlockedReport.ts` — the key-name ground, and the OR

the operations that apply a VOLATILE mask:
- `blackbox/.test/infra/invokeRhachetCliBinary.ts` — `asSnapshotSafe` (timestamps)
- `blackbox/cli/keyrack.machine-wide-skips-manifest.acceptance.test.ts` — `asTempCwdMasked`
- `blackbox/sdk/keyrack.source.acceptance.test.ts` — `asSdkRefusalMasked`, the two acts side by
  side: it CUTS every piece of node's chrome (code frame, `at` frames, version footer, name echo)
  and MASKS the test dir inside the message the sdk itself wrote

the clamps:
- `src/domain.operations/keyrack/getKeyrackBlockedReport.test.ts` — `[case10][t0]` masks,
  `[case10][t1]` asserts ordinary context under the SAME keys is NOT masked

## .reason
see the ref-level cluster beside this choice:
- `term=mask._.choice.reason.md` — etymology, disputes, evidence

## .see also
- `term=secret._.choice._.md` — what a mask acts upon
- `term=chrome._.choice._.md` — what a mask must NOT act upon; cut it instead
- `term=notice._.choice._.md` — the other way keyrack speaks without a refusal
