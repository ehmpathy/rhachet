# domain.term: presence

term.chosen   = presence
term.kind     = noun
term.synonyms.forbidden:
- availability
- existence
- installed
- status

## .what

**whether a thing is there, as one read can establish it.** the noun names the SUBJECT of a probe
— not the answer. so a presence read may come back `present`, `absent`, or `unreadable`.

that last member is the point of the word. a boolean would name the same subject and forbid the
third answer, which is why every presence read in this repo is a tri-state.

## ⚠️ .the boundary — `presence` is the QUESTION, `absent` is one ANSWER

the two are kin, not synonyms, and they sit at different grains:

```
presence   : the question — "is it there?"          ← what a probe asks
present    : one answer — it is there
absent     : one answer — it is not there           ← see term=absent
unreadable : no answer — the ask returned naught    ← see term=unreadable
```

a name built on the answer (`getPnpmAbsent`) would fix one outcome into the operation's own name
and read as a boolean, which is exactly the collapse the tri-state exists to prevent.

## .the shape

a presence read is a declared union, never a boolean, and the union is named `$Noun PresenceRead`:

```ts
// getPnpmPresence.ts
export type PnpmPresenceRead = 'present' | 'absent' | 'unreadable';
export const getPnpmPresence = (): PnpmPresenceRead => …
```

## .the second site — evidence it names a real concept

`asNpmInstallShellPresence` asks whether a **shell** was interposed between us and the package
manager. a different subject entirely, same question shape — *"is it there?"* — which is the test
a term passes when it is discovered rather than invented.

## .why not `availability` / `existence` / `installed` / `status`

each smuggles in a claim the bare question does not support:

- `availability` — implies the thing exists but may be **withheld**. `unavailable` is already
  forbidden on `term=absent` for that reason; the same objection applies one grain up
- `existence` — claims a universal scope. presence is scoped to **one host at one moment**, the
  same reason `nonexistent` is forbidden on `term=absent`
- `installed` — names HOW it got there, and is package-manager jargon. a binary on PATH by any
  other route is equally present
- `status` — generic; every state in the repo is a status, so the word tells a reader naught about
  which question was asked

## .refs
- `src/domain.operations/upgrade/getPnpmPresence.ts`  # `getPnpmPresence`, `PnpmPresenceRead`
- `src/domain.operations/upgrade/asNpmInstallShellPresence.ts`  # the second, independent subject
- `src/domain.operations/upgrade/printPnpmPresenceUnreadableNotice.ts`  # the notice for the third answer
- `src/domain.operations/upgrade/execNpmInstallGlobal.ts`  # `asPackageManagerFromPresence` — the policy a read decides

## .reason
see the ref-level cluster beside this choice:
- `term=presence._.choice.reason.md` — etymology, the boolean it replaced, evidence
