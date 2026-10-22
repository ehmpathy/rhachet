# justification — 5.1 i001: five findings disputed

## .arch-smell-scopeleaks blocker.3 — "enroll/init/upgrade import roles/focus by file path"

the claim: enroll, init and upgrade import `@src/domain.operations/roles/focus/…` files rather
than a published contract of the roles context.

why it does not hold here:
- the repo has no per-domain facade, and its rules forbid the one shape that would make one:
  `rule.forbid.barrel-exports` ("no export forwarders") and `rule.forbid.index-ts`
- every domain op in this repo imports its peers by `@src/domain.operations/<domain>/<op>` path;
  `enroll` already imports `roles/deltas/getRoleDeltas` this way on main. the named op IS the
  contract: one exported function per file, named for what it answers (`asRoleFocusParts`
  answers "which role, which subject does this token name?")
- the reach-ins this lane rightly flagged as true leaks are repaired: blocker.1 (a relative
  `../roles/focus` import of the separator constant, now `asRoleOfTokenLenient` by `@src` path)
  and blocker.2 (the foci path, now owned by the actor domain, `actor/enrolled/getRepoAmbientRoleFociPath`)
- the token grammar is owned in exactly one place: every consumer calls `asRoleFocusParts` or a
  roles-domain transformer built on it, and none splits on `::` itself

a facade would add a forwarder file the repo's rules refuse, and change no dependency edge.

## .behavior-intent-coverage blocker.1 and ergo-friction-hazards blocker.2 — "acceptance not delivered"

the claim: the `enroll`/`init` journeys ship with no acceptance test or cli snapshot.

why it does not hold at this stone:
- this route parts execution (5.1) from verification (5.3); the 5.3 stone owns the acceptance
  proof, and its guard grades it
- the acceptance suite is written regardless: `blackbox/cli/init.focus.acceptance.test.ts` drives
  `init --roles mechanic::nope` (exit 2, names the declared subjects, writes naught) and
  `init --roles mechanic::flow` (links mechanic, records the focus, keeps every mechanic hook),
  then `+mechanic` (widens the record). it runs at 5.3 once the test keyrack is unlocked

## .arch-hazards-behavior nitpick.1 — "readFileSync outside the try escapes raw"

a read fault (EACCES, EMFILE) is not a corrupt record. the shaped `MalfunctionError` names one
fix — repair or remove the file — which is wrong advice for a permission or descriptor fault.
the raw errno names its own cause and stays loud; `setRepoAmbientRoleFoci.integration.test.ts`
case4 asserts `code === 'EACCES'`. the docblock of `getRepoAmbientRoleFoci` now states this.

## .ergo-friction-hazards nitpick.2 — "one receipt on two streams"

each command keeps every receipt it prints on one stream: init on stdout; enroll on stderr,
since its stdout belongs to the brain-cli it hands the terminal to. one stream for the focus
receipt alone would split a command's own receipts across two. both sites now say so.

## .disposition

disputed, all five. the first conflicts with two repo rules; the next two name work this stone
hands to 5.3 by the route's own design, already written; the last two are deliberate stream and
error-shape calls, now stated at their sites.
