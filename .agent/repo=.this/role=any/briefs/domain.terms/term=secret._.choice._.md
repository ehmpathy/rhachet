# domain.term: secret

term.chosen   = secret
term.kind     = noun
term.synonyms.forbidden:
- password
- token
- passphrase
- privatekey
- sensitive

## .what

**the VALUE a keyrack protects — the bytes that must never reach a terminal or a log.**

`secret` names the value's HAZARD CLASS, and no other facet of it. it is deliberately narrower
than the three words it sits beside, and the four are not interchangeable:

| term | names | example |
|---|---|---|
| `key` | the ADDRESS of a credential on the rack | `GITHUB_TOKEN` |
| `slug` | the fully-qualified address | `@all.camp.GITHUB_TOKEN` |
| `grant` | the resolved credential RECORD — address, source, env, org, expiry | `KeyrackKeyGrant` |
| **`secret`** | **the VALUE itself, as a leak hazard** | `ghs_16C7e42F…` |

⚠️ **`secret` is used ONLY where the leak hazard is the subject.** a keyrack operation that
addresses, resolves, sweeps, or renders a credential says `key` / `slug` / `grant`. one that asks
*"may this be printed?"* says `secret`. that is the whole boundary, and it is what keeps the word
from a slide into a fourth synonym for `credential`.

## .the invariant a reviewer can check

**a `secret` is never rendered.** any operation whose name carries `secret` exists to keep a value
OUT of an output stream — so its answer is a mask decision, never the value.

- ✅ `isKeyrackSecretShaped({ value }): boolean` — answers *may this be printed?*, returns no value
- ❌ `getKeyrackSecret({ slug }): string` — a read, so it is a `grant`, not a `secret`

## .why not `token`, `password`, `passphrase`

each names ONE KIND of secret, so each is a hyponym rather than a synonym. the render mask's own
key-name regex tests for all three *as instances of* the class this word names
(`/secret|password|passphrase|token|credential|prikey|privatekey/i`) — which is exactly the
evidence that `secret` is the class and they are its members.

⚠️ to name the class after one member is the mis-key that made a key-name mask look sufficient in
the first place: `token` reads as complete until a value lands under `value` or `data`.

## .refs

the operation the term is declared on:
- `src/domain.operations/keyrack/isKeyrackSecretShaped.ts`

the render this exists to protect, and the one place every keyrack refusal converges:
- `src/domain.operations/keyrack/getKeyrackBlockedReport.ts` — the two masks, OR'd

the clamps:
- `src/domain.operations/keyrack/isKeyrackSecretShaped.test.ts` — `[case1]` masked, `[case2]` the
  real context that must SURVIVE the mask
- `src/domain.operations/keyrack/getKeyrackBlockedReport.test.ts` — `[case10]`

## .reason
see the ref-level cluster beside this choice:
- `term=secret._.choice.reason.md` — etymology, disputes, evidence

## .see also
- `term=mask._.choice._.md` — the operation performed ON a secret
- `term=held._.choice._.md` — what the rack does with a credential, as distinct from its value
