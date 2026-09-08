# domain.term.choice.reason: refused

## .etymology

`refuse` = to decline a request that was properly made. that is exactly the condition: node-pty asks
the kernel for a pty device through `forkpty`/`openpty`/`posix_openpt`, the ask is well-formed, and
the host declines it.

**the word had to part this row from its three siblings**, which is what made the choice carry weight
rather than read as taste. all four render *"the reach socket is unavailable"* to a human, and each
names a different party:

| condition | word | who acts |
|---|---|---|
| the addon would not load, on a platform we ship a prebuild for | `absent` + `supported` | 💥 **us** — the install is damaged |
| the addon would not load, on a platform with no upstream binary | `absent` + `unsupported` | ✋ the caller — `--no-socket` |
| the addon would not load, and the libc read failed | `absent` + `unreadable` | ✋ the caller — run the diagnostic |
| **the addon LOADED, and the host gave no device** | **`refused`** | ✋ the caller — free ptys, or `--no-socket` |

⇒ the fourth row is the only one on the far side of the load, and `absent` is actively wrong for it:
the addon is present, correct, and able to run. to reuse `absent` would send a human to reinstall a
package that is already fine — the confident-wrong-cure defect the parent wish exists to retire.

## .rejected alternatives

| word | why not |
|---|---|
| **denied** | reads as a *permissions* verdict (EACCES, a policy). the common cause here is exhaustion — the host has no pty left — which is a capacity condition, not an authorization one. `denied` would name a cause we did not measure |
| **exhausted** | names ONE cause of the refusal and excludes the others. `pty.cc` also emits this class for a denied `grantpt`, a failed `tcsetattr`, and a conpty that would not launch. a word that names one member of a set cannot label the set (`rule.require.enumerate-before-you-name`) |
| **unavailable** | already in use, one layer up, for the *outcome*: *"the reach socket is unavailable"*. that sentence heads all four rows above, so to reuse the word for one row would overload it across a genus and one of its species (`rule.forbid.domain-term-ambiguity`) |
| **rejected** | this repo uses `rejected` for a review verdict (`rule.always.converge-to-terminal`). one word, two senses, two subdomains — an overload with no boundary to part them |

## .evidence

**a dimensional walk over the pty failure space.** two axes: *did the addon load?* × *what does the
host support?* the three `absent` rows are the product of `no` × three support values; `refused` is
the entire `yes` column. so the term is not one more member of a list — it is **the other half of a
walked space**, which is why a shared word for both columns could not have been right.

**the emitter's own vocabulary agrees.** node-pty's `pty.cc` prints `forkpty(3) failed.`,
`openpty(3) failed.`, `posix_openpt failed:` — every one a *call* that failed, never a *file* that was
absent. `isPtyDeviceRefusedError`'s marker set is quoted from that source, so the word and the
markers describe one concept by construction.

## .the boundary

`pty`, and it carries weight rather than decoration. **`refused` is a word many subdomains will want**
— a refused radio task, a refused permission, a refused dispatch — and none of those is this concept.
the qualified name reserves the pty sense without a claim on the bare word
(`rule.require.boundary-qualified-terms`).
