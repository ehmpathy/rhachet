# rule.require.a-stub-refuses-what-its-subject-refuses

> **a stub that accepts every input proves only that a child spawned — never that a VIABLE one did.**

when a test asset stands in for a real dependency, it must **refuse** the inputs that dependency
refuses. a stub that shrugs at a malformed input is not a lenient stub; it is an instrument with the
one measurement removed that the suite needed.

## .why — the acceptance tier goes green while the product is broken

the failure is not that a stub is imperfect. it is that a stub's **leniency is invisible**, so a
suite reports coverage it does not have:

- the real dependency refuses input `X` and exits
- the stub accepts `X` and stays alive
- ⇒ every acceptance case passes, and **no case COULD have failed**
- the defect ships, and the suite's green is what made it shippable

🔴 **the suite does not merely miss the defect — it argues against its existence.** a driver who asks
*"would a test have caught this?"* reads a green tier and concludes the code is fine.

## .the measured case

`src/.test/assets/stubBrainCli.cjs` ignored `process.argv` entirely, where a real brain-cli answers
`error: unknown option '--async'` and **exits**.

meanwhile `getBrainCliPassthroughArgs` leaked `--watch` and `--async` into the child argv. against a
real brain-cli that is fatal, and it cascades: the pty child dies → `finalize` unlinks the socket →
the detached host's loop drains → the host exits. ⇒ **enroll handed back an address, and every `say`
to it read `DEAD` seconds later** (measured 2026-09-17, four clones, one per flag form).

the acceptance tier was green throughout. what it asserted was `socketEligible: true` — a flag the
**enroller writes about its own intent**, before the death — so no assertion in it was capable of
disagreement.

## .the two halves of the cure, and both are owed

| half | what it fixes |
|---|---|
| the stub refuses an unknown option, exactly as the real cli does | the instrument can now disagree |
| the acceptance case asserts the clone **ANSWERS** a `say` | the assertion now reads a reach, never a flag |

⇒ **the second half is what the first half makes possible.** a stub that cannot die makes an
answer-assertion vacuous; an answer-assertion against a stub that can die is a real reach test.

## .the test

> **name an input the real dependency refuses. does the stub refuse it too?**

- yes → the stub can disagree with the product
- no → every case that routes that input is vacuous, whatever it asserts

and its companion, for the assertion:

> **does this assertion read a FLAG the product wrote about itself, or a BEHAVIOR of the product?**

a flag is written before the failure it should have caught. only a behavior is written after.

| when… | then… |
|---|---|
| you write a stub for a cli, an sdk, or a service | 🔴 the strongest cue. list what the real one refuses, first |
| a stub ignores an input channel entirely — argv, env, headers, a body | that channel is unmeasured, and the suite will not say so |
| an assertion reads a field the product set about its own intent | the product cannot report its own later death. assert a behavior |
| you ask *"why did the tier not catch this?"* | check the stub before you check the cases |
| a suite is green and a manual run is broken | the stub is the first place to look |
| a stub grows a new accepted input | ask what the real one does with it |

## .the boundary

| a violation | not a violation |
|---|---|
| a stub that ignores an input channel its subject validates | a stub with a smaller feature set, declared in its docblock |
| a stub that cannot fail in any way its subject fails | a stub that fails differently but **does** fail |
| an acceptance assertion on a self-written intent flag | an assertion on an intent flag **beside** a behavior assertion |

**the line that parts them: could this stub ever make a case go red for a defect the product has?**
no → it is a prop, and every case around it is theater.

## .enforcement

- a stub that accepts an input its subject refuses, with no note of the gap = **blocker**
- an acceptance case whose only assertion is a flag the product wrote about its own intent =
  **blocker**
- a stub with a declared smaller feature set, stated in its docblock = **false positive**

## .see also

- `src/.test/assets/stubBrainCli.cjs` — the cured stub, with the cascade in its docblock
- `src/contract/cli/invokeEnroll.test.ts` — the drift clamp that ties the two flag lists together
- `rule.forbid.faked-or-quarantined-acceptance` — the peer: a skipped case lies the same way
- `rule.require.clamp-edge-cases` (ehmpathy/mechanic) — prove the clamp bites, by mutation
