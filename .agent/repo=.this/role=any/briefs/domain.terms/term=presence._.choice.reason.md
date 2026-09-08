# domain.term.choice.reason: presence

## .etymology

from the plain english noun — *the state of a thing that is there*. it was reached for because the
operation had to be named after the QUESTION rather than after any one answer, and english already
has a noun for that question.

the alternatives all name an answer or a mechanism:

- an answer-name (`getPnpmAbsent`, `isPnpmInstalled`) fixes one outcome into the operation's name
  and reads as a boolean
- a mechanism-name (`getPnpmOnPath`) names HOW we asked, and would have gone stale the moment the
  ask changed from a PATH lookup to `pnpm --version` — which it did

`presence` survives both changes because it names neither the answer nor the ask.

## .the boolean it replaced, and why the replacement matters

the read began as a bare boolean, with the *"could not tell"* case folded into `false`. a note
beside it called the degraded answer *"the safe one"*.

🚨 that argument is wrong, and the word is what makes it visible. **a probe that timed out has not
told us pnpm is absent — it has told us naught.** to record its silence as a fact about the host is
absence of evidence read as evidence of absence (`rule.forbid.failhide`).

the cost was not hypothetical: a PATH entry on a wedged network mount would silently switch the
human to a different package manager, with the wedge surfaced nowhere. if npm then failed, they
would debug npm with no trace of the hung probe that redirected them.

so the tri-state is not a refinement of the boolean — it is the correction of a defect, and
`presence` is the noun that has room for all three answers.

## .the kin boundary, stated once

`presence` is the question; `present` / `absent` / `unreadable` are its three answers. the pair
`term=absent` and `term=unreadable` carry the two that are easy to confuse — `absent` is an ANSWER
about the world, `unreadable` is the ADMISSION that we hold none.

## .evidence

- **two independent subjects.** `getPnpmPresence` asks about a package manager;
  `asNpmInstallShellPresence` asks whether a shell was interposed. one question shape, two
  unrelated subjects — the test a discovered term passes
- **the tri-state is load-bearing at a call site.** `execNpmInstallGlobal` routes `unreadable` to
  `printPnpmPresenceUnreadableNotice` and still proceeds on npm. a boolean could not express that
  row, so the third member is exercised rather than decorative
- **the notice is clamped.** the unit row asserts the human reads *"could not tell whether pnpm is
  installed"*, and it was measured red with the branch disabled

## .disputes

none open.
