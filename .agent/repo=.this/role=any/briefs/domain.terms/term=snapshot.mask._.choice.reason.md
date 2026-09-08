# domain.term.choice.reason: mask

## .etymology

**`mask` is taken from the sense a painter's masking tape has: a covering laid over a region so the
work around it proceeds, then lifted to reveal the region untouched.** the fit is precise on three
counts:

1. **it covers, never removes.** the masked region is still THERE — its edges, its size, and its
   neighbors all survive. that is the whole property a snapshot needs
2. **it is applied for the sake of what surrounds it.** you mask a window to paint the frame. we
   mask a stamp to snap the screen
3. **it is temporary and legible.** a reader sees `$TIMESTAMP` and knows both *what sat there* and
   *why it could not be pinned*

⇒ the first carries the load. a deletion would let a neighbor drift into the gap unseen; a
placeholder makes that drift a diff.

## 🚨 .the evidence — one comment reached for BOTH words, correctly, in one sentence

`blackbox/sdk/keyrack.aws-params.acceptance.test.ts:165`:

```ts
// redact the secret + mask volatile grant fields for a stable contract snapshot
```

**that is a domain expert's instinct, captured verbatim.** the author was not asked to distinguish
the two and distinguished them anyway, because the two acts genuinely differ:

- the **secret** must not be carried at all → **redact**
- the **grant fields** must be carried, in place, with their value unpinnable → **mask**

⇒ so the split is not a preference imposed on the corpus. it is a distinction the corpus already
makes, which had no cluster to record it — the exact condition
`rule.forbid.domain-term-inconsistency` names.

## .the drift, measured

| word | sites | verdict |
|---|---|---|
| `mask*` in contract names | `maskKeyrackGrantVolatiles`, `maskArmorBody`, `maskBodyKeepPrefix`, `maskInGithubLogs` | ✅ every one is the placeholder sense |
| `redact` as `HelpfulError.redact` | ~20 in `src/` | ✅ the field-strip sense, third-party api |
| *"redact timestamps for stable snapshots"* | 8 prose comments in `blackbox/cli/keyrack.*` | 🔴 **the drift.** a timestamp gets a placeholder — that is a mask |

⚠️ **the drift is in PROSE, never in a contract**, so it is left in place until disturbed.
`rule.forbid.domain-term-synonyms` binds contracts and permits a comment to reach for an alternate
word; and its own no-mass-rewrite clause forbids a sweep. a reader who edits one of those eight
comments takes the canonical word on the way through.

## 🚨 .the incident that proves a mask needs its own read

**2026-09-07, `v2026_08_25.fix-node-pty-install`, `asAbsoluteInitScreen`.** a review blocker held
that the absolute-form `init` screen was the one case of 27 with no snapshot. the repair was a
mask, then a `--resnap`. **the suite went green, and the written screen carried two defects:**

| defect | what the placeholder actually wrote |
|---|---|
| the stamp pattern over-consumed | `.claude/settings.$TIMESTAMPbak.json` — a `.` silently eaten |
| 🔴 **the counts were never masked at all** | `271 brief(s)` · `88 skill(s)` · `23 init(s)` — the very spans the blocker was about |

the second is the sharp one. the pattern had been guessed as `briefs = N`; the real render is
`N brief(s)`, so it matched none of them. **the mask written to answer the blocker did not touch
the fields the blocker named, and a green run cannot tell the difference** — a first snapshot is a
CLAIM that the output is correct, never a regression check.

⇒ so the term carries a discipline, not merely a word: **a mask is verified by a human read of the
written screen, never by the run that wrote it.** a pattern authored against a remembered render is
an instrument shaped by its expected answer.

## .the rejected words, and why each was rejected

| word | why not |
|---|---|
| **`redact`** | a live `helpful-errors` api verb in a different sense (strip a field from a payload). a second sense is the overload `rule.forbid.domain-term-ambiguity` forbids — and the api is not ours to rename |
| **`scrub`** | implies removal and a moral valence (something dirty). a volatile stamp is neither dirty nor removed. live in one prose comment as a near-word, never in a contract |
| **`sanitize`** | same removal implication, plus a settled security sense (defang untrusted input) that collides on a repo which really does gate terminal escapes (`isSafeCloneDispatchInput`) |
| **`anonymize`** | names a privacy act; most masked spans here are paths and stamps, which are not identities |

⚠️ one further candidate was never weighed, because it is forbidden repo-wide already — see
`.agent/repo=ehmpathy/role=mechanic/briefs/practices/lang.terms/` for the barred-term set. its
stated defect (a word that conflates format, canonical, defang, scale, case, and encode) is exactly
what this cluster exists to prevent for `mask`.

## .disputes

none open.

⚠️ **the one a later reader may raise, pre-empted:** *"github's `::add-mask::` hides a SECRET, so
does `mask` not already mean removal?"* — no. `::add-mask::` is github's own workflow command,
inherited verbatim in `maskInGithubLogs`, and even there the act is a substitution (`***`), never a
deletion. it sits outside this term's `snapshot` boundary, which is precisely what the boundary
qualifier is for.

## .the boundary qualifier

`term.boundary = snapshot`. the test — *"$word, of WHAT?"* — answers in one word: a mask **of a
snapshot**. every site in the `.refs` is snapped, and the boundary does real work: it excludes
github's log mask (a ci concern) and the prose sense of *conceal* (`rule.forbid.failhide`), neither
of which is about a pinned screen.
