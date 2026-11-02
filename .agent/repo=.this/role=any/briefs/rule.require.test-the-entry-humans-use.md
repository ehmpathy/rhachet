# rule.require.test-the-entry-humans-use

> **acceptance tests reach the product the way humans do — every entry they actually use, not only the
> one the product paves. an entry no test takes is an entry no one has checked.**

an **entry** = a way a human or a process starts the product: the paved command, the raw binary under
it, an ide plugin, a ci job, a cron, a call from another repo, a bare shell with no setup.

## .why

- the paved entry is the one the author built the tests around, so it is the one that always works.
  humans arrive by every other door too — a new box, an editor, a quick command that skips the wrapper
- an untested entry fails silently: the product runs, just with less. no test goes red, so the first
  report comes from a human
- the test harness is itself an entry. a harness that sets up what a real human would not have tests a
  product no human runs

## .the test

> **"list the ways a human starts this product. which of them does an acceptance test take?"**

- every entry a human uses has a test → done
- an entry has none → add one, or state in the product that the entry is unsupported and make it
  fail loud there
- the harness supplies state a real entry lacks (a tty, a credential, a setup step) → the test
  proves the harness. take that away, or add the bare entry beside it

## .the cues

| when… | then… |
|---|---|
| every acceptance test calls the product through one wrapper | 🔴 the strongest cue. what does a human run without it? |
| the product has an alias, a launcher, or a wrapper command | the command it wraps is an entry too |
| the harness gives the run a tty, a login, or a pre-made dir | a real human may lack each one. test without |
| a bug report says "it worked when I used X, not when I used Y" | Y was an untested entry. add it |
| you add a new entry (a flag, a plugin, a subcommand) | it owes its own acceptance test |

## .the worked case — rhachet pr #600, v1.49.2

every acceptance test reached claude through `rhx enroll`, the paved entry. a plain `claude` at the
repo root — what a human types on a box without the alias, or what an ide plugin runs — had no test.
the split layout broke that entry: a plain session loaded none of the repo's settings. the suite was
green; a downstream repo found it.

the cure added the entry: `blackbox/cli/brain-config.grove-vs-repo.realbrain.acceptance.test.ts` runs a
real plain `claude` at a temp repo's root and asserts it loads the repo's settings (requirement case 10).

## .the second case — the harness was the entry

a clone's reach was "proven" through a stub harness that gave `rhx enroll` a pty. real headless enrolls
have no tty, so the reach socket never bound and every real headless clone was unreachable — a state
the harness could never show. a bare `rhx enroll` from the repo root found it at once
(`rule.require.playtest-via-real-dogfood`).

## .the boundary

| fires | does not fire |
|---|---|
| an entry humans use in practice, paved or not | an entry the product refuses loudly and says is unsupported |
| a harness that supplies state a real entry lacks | a harness that only isolates (a temp home, a cleared env) |

## .enforcement

- an entry humans use with no acceptance test, and no loud refusal = **blocker**
- an acceptance suite whose harness supplies state no real entry has, with no bare test beside it = **blocker**

## .see also

- `rule.require.playtest-via-real-dogfood` — the same demand for a byhand proof
- `rule.require.reader-table-before-a-shape-change` — each reader in the table is an entry to test
- `rule.forbid.local-facts-as-design-premises` — a harness that sets up a local fact tests that fact
