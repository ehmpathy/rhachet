# domain.term.choice.reason: unreadable

## .etymology

from *able to be read* — negated. the word was chosen because it names the READ, never the world.
that is the one property the concept needs: every rejected alternative makes a claim about the
subject, and this word makes a claim only about our knowledge of it.

the negation is deliberate too. `unreadable` cannot be mistaken for a value the way `unknown` can;
it says plainly that the ATTEMPT is what came back empty.

## .why it exists at all

the read began as a bare boolean, with *"could not tell"* folded into `false`, justified by a note
that called the degraded answer *"the safe one"*.

🚨 that is the defect this word retires. a probe on a wedged network mount would return `false`,
the upgrade would silently switch package managers, and the wedge would surface nowhere. if the
fallback then failed, the human would debug the fallback with no trace of the hung probe that
redirected them.

so `unreadable` is not a nicety of vocabulary. it is the member that forces every caller to decide
what to do about the third case rather than inherit a default nobody chose — which is exactly what
`rule.require.get-set-gen-verbs` means when it says a tri-state takes a `get*` name over an `is*`.

## .the boundary with `absent`, and why the two must not merge

`absent` describes the WORLD: the subject is not there. `unreadable` describes a READ: we asked and
learned naught.

the tell that they are distinct is that they route differently. both proceed on the fallback, so a
reader might call the split cosmetic — but only `unreadable` prints. that asymmetry is the failhide
cure made concrete: *"you have no pnpm"* is ordinary, while *"your PATH never answered"* is a host
fault that will bite the human again elsewhere.

## .why a retry, and why it does not weaken the word

`getPnpmPresence` re-probes once before it concludes `unreadable`, because a wedged mount is
transient by construction — one that hangs at t=0 may answer at t=11.

that retry does not soften the term. it makes the admission *earned*: `unreadable` means we asked
twice and learned naught both times, so the word carries more weight, not less.

## .evidence

- **the third member is exercised, never decorative.** `execNpmInstallGlobal` routes it to a notice
  and still proceeds; the unit row asserts the human reads *"could not tell whether pnpm is
  installed"*, measured red with the branch disabled
- **the notice names the DATUM, never a command.** it reaches darwin, linux and win32, so it says
  `PATH` rather than any shell incantation (`rule.forbid.host-specific-cures-in-hints`)
- **three distinct causes reach this one state** — a spawn error, a signal death, and a null exit
  status. that is why a cause-name like `timedout` was rejected: it would be false on two of them

## .the boundary with `unknown`, and why it is a SPLIT rather than a forbid

`unknown` was listed as a forbidden synonym when this cluster was first written, on the grounds that
it is *"too broad"*. that verdict was wrong, and a third instance is what exposed it.

the axis is **which subject the word is about**: `unreadable` reports a PROBE'S OUTCOME, `unknown`
reports a KNOWLEDGE STATE. a verdict can be absent because an INPUT was unreadable, with no probe of
its own subject ever attempted — and no word but `unknown` fits that, since to call it `unreadable`
would assert a probe that never ran.

⇒ so the two are distinct concepts under `rule.forbid.domain-term-ambiguity`'s own test, and the
repair for the original overload is a **split**, never a rename. `unknown` comes off the forbidden
list; the decision rule lives in `._.choice._.md`.

## .disputes

### dispute: `Libc`'s third member — raised 2026-09-02 — status: RESOLVED (renamed to `unreadable`)

- raised.by  = the `enroll-impl-arch-defects` peer lane, i040/r011 (as a nitpick about three
  sentinel words across two domains)
- claim      = `Libc = 'glibc' | 'musl' | 'unknown'` should read `'unreadable'`. `getLibcFromProcess`
  runs a real probe (`process.report.getReport()`) against libc itself, so by the boundary rule
  above the third member names a probe outcome and takes `unreadable`
- counter    = the rename touches ~8 files for no behavior change, and the arch review lanes already
  overflow their context budget on a 115-file diff. the cost is real and lands on the one gate that
  is already unable to run
- resolution = **the claim prevailed; `Libc` now reads `'glibc' | 'musl' | 'unreadable'`.** the
  counter was a cost, never an argument about the word — and the cost expired one round later when
  the arch lane ran to approval. renamed at i042; the compiler found every site
  (`.fulcrums/inventory.of=fulcrums.case=F6-libc-third-member-word.md` records the reversal)

⇒ ⚠️ **the lesson the round leaves: a counter that is a COST has an expiry, and a resolution that
rests on one is a deferral dressed as a verdict.** this entry said so itself — it named the trigger
— which is the only reason a later reviewer could cite it back and close the fork.
