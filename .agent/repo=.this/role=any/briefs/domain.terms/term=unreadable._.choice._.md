# domain.term: unreadable

term.chosen   = unreadable
term.kind     = adj
term.synonyms.forbidden:
- failed
- timedout
- indeterminate
- unavailable

## .what

**the probe ran and established no answer.** an admission that we hold no verdict — never a fact
about the world.

## ⚠️ .the boundary — `absent` is an ANSWER, `unreadable` is the ABSENCE of one

this is the whole reason the word exists, and the pair is easy to collapse:

| term | means | is it a fact about the host? |
|------|-------|------------------------------|
| `absent` | it is not there | ✅ yes — a real answer |
| **`unreadable`** | we could not tell whether it is there | ❌ no — we hold no verdict |

🚨 **to fold `unreadable` into `absent` is `rule.forbid.failhide`.** a probe that timed out has not
told us the subject is absent — it has told us naught, and to record its silence as absence is
absence of evidence read as evidence of absence.

the two also route differently, which is what makes the split load-bearing rather than decorative:
`absent` is ordinary and the caller acts on it silently; `unreadable` is a host fault and the human
is TOLD, even though the caller proceeds either way.

## 🔴 .the second boundary — `unknown` is the DOWNSTREAM of `unreadable`, not its synonym

the two words look interchangeable and are not. the axis is **which subject the word is about**:

| term | the claim | about |
|------|-----------|-------|
| **`unreadable`** | a probe ran against this subject and returned naught | the **probe's outcome** |
| **`unknown`** | we hold no verdict about this subject | our **knowledge state** |

⚠️ **every `unreadable` yields an `unknown` downstream; the reverse does not hold.** a verdict can be
absent because an INPUT was unreadable, with no probe of its own subject ever attempted.

⇒ the test, for a third member you are about to name: **did a probe run against THIS subject?**

- yes, and it returned naught → **`unreadable`**
- no — the verdict is absent because an input was → **`unknown`**

the two extant instances sit on either side of it, which is what proves the axis carries load:

| the union | a probe of its own subject? | the word |
|-----------|------------------------------|----------|
| `PnpmPresenceRead` | ✅ the presence probe ran and wedged | `unreadable` |
| `Libc` | ✅ `process.report.getReport()` ran and told us naught | `unreadable` |
| `PtyPlatformSupport` | ❌ derived — absent because `libc` was | `unknown` |

⚠️ **the last two sit on ADJACENT LINES in one file** and that is worth a look, because it reads
like a typo:

```ts
// getPtyPlatformSupport.ts
if (input.libc === 'unreadable') return 'unknown';
```

⇒ that line is the boundary in one statement: the probe's outcome comes IN, the knowledge state
goes OUT. a reader who "fixes" either word to match the other has collapsed the split.

## .the shape

`unreadable` is the third member of a presence read (see `term=presence`), never a standalone flag:

```ts
// getPnpmPresence.ts
export type PnpmPresenceRead = 'present' | 'absent' | 'unreadable';
```

## .why not `failed` / `timedout` / `indeterminate` / `unavailable`

- `failed` — invites the reader to report it as an error and halt. it is a fact to ROUTE on: the
  upgrade proceeds on npm, because a wedged probe is no reason to refuse an install npm can perform
- `timedout` — names one CAUSE, not the state. a signal death and a null exit status are equally
  unreadable, so a cause-name would be false on two of the three paths that reach here
- `indeterminate` — jargon; it says the same as `unknown` in longer words
- `unavailable` — implies the subject exists and is withheld. already forbidden on `term=absent`
  for that reason, and it makes a claim about the world this word must not make

## .refs
- `src/domain.operations/upgrade/getPnpmPresence.ts`  # the union member itself
- `src/domain.operations/upgrade/execNpmInstallGlobal.ts`  # the retry the member drives
- `src/domain.operations/upgrade/printPnpmPresenceUnreadableNotice.ts`  # what the human is told
- `src/domain.operations/clone/pty/asLibcFromReport.ts`  # `Libc`'s third member
- `src/domain.operations/clone/pty/getPtyPlatformSupport.ts`  # the `unknown` side, one line apart

## .reason
see the ref-level cluster beside this choice:
- `term=unreadable._.choice.reason.md` — etymology, the failhide it retires, evidence
