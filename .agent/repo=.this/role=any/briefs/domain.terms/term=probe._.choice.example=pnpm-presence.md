# domain.term.choice.example: probe — the pnpm-presence probe

a **second, independent** site earned the same word, on a different subject and by the same
property — which is the test a term passes when it is discovered rather than invented.

## the site

`getPnpmPresence` asks whether pnpm can run, so the global upgrade can prefer it over npm:

```
getPnpmPresence  →  spawn('pnpm', ['--version'])
                    exit 0    → present
                    nonzero   → absent      ← the NORMAL answer, not a fault
                    silent    → unreadable  ← we hold no verdict
```

## why `probe`, and not `lookup`

**an absent pnpm is data.** a human may legitimately have only npm, so the negative answer is
the ordinary one and the caller acts on it rather than reports it. that is the property that
defines a probe in `term=probe._.choice._.md`, met exactly.

⚠️ **`lookup` is the trap here, and it is worse than an ordinary synonym.** the term file already
lists it as a forbidden synonym with a stated reason:

> `lookup` — already means "find the value for a key, and it should be there" — the exact
> opposite expectation

so a name built on `lookup` would not merely duplicate a declared word; it would assert the
**inverse** of what the call site means. a reader who trusted the name would read a nonzero
exit as an error rather than as an answer — which is the very misread `PnpmPresenceRead`'s
tri-state exists to prevent.

`lookup` was also wrong as a *description*, not only as a word. the probe once shelled out to
`which`/`where` to ask whether a file named `pnpm` sat on PATH — a real lookup, and the wrong
question: a corrupt shim resolves on PATH and then fails when invoked. `pnpm --version` asks
the question the caller actually has, and the word `probe` fit both forms because the word
names the *stance toward the miss*, never the mechanism.

## the tell that caught it

the same edit that first introduced the operation also renamed its neighbor constant
`WHICH_TIMEOUT_MS` → `PROBE_TIMEOUT_MS`. **two words for one concept, three lines apart, in one
change.** the constant reached for the canonical term while the operation reached for a
forbidden synonym.

> 🚨 a synonym is easiest to introduce in the same breath as the canonical word, because the
> concept feels named already. proximity is not consistency — check the glossary, not your
> memory.

## what this example adds to the term

`probe`'s original site (`isKeyrackFillProbeMiss`) reads a **vault**. this one reads a **host's
package managers**. two unrelated subjects, one shared property — *the miss is the path forward*
— which is evidence the word names a real domain concept rather than one operation's convenience.

## .refs
- `src/domain.operations/upgrade/execNpmInstallGlobal.ts` — `getPnpmPresence`, `PROBE_TIMEOUT_MS`
