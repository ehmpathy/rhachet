/**
 * .what = is a dispatched message a CLIENT command — a `/…` slash the brain-cli itself consumes,
 *   rather than a prompt it hands to the model as a turn
 * .why = 🔴 the two take DIFFERENT paths through the queue, and the `enqueued` advisory spoke for
 *   only one of them. a prompt submitted mid-turn is genuinely held: the brain takes it when the
 *   active turn ends, and an abort (ctrl-C, crash, prune) drops it unsent. a `/…` command is
 *   consumed by the CLIENT at submit — it never enters the model's turn queue, so it is neither
 *   held behind the turn nor at risk from an abort.
 *
 *   measured 2026-09-20 against this session's own clone: `clone say --what '/model claude-sonnet-5[1m]'`
 *   returned `enqueued` with the advisory *"held behind the active turn … if that turn is aborted
 *   the hold dies with it, unsent"* — and the capture shows the client had ALREADY executed it
 *   mid-turn, two rows apart:
 *
 *       ❯ /model claude-sonnet-5[1m]
 *         ⎿  Set model to claude-sonnet-5[1m]        ← done, while the turn ran
 *
 *   ⇒ so both clauses of the advisory were false for this message class. it read as a caveat and
 *   functioned as a fabrication, which is worse than silence (rule.forbid.failhide)
 * .note = a PREFIX test, deliberately — the command set is the brain-cli's and it is pinned, but
 *   it grows with every release, so a whitelist of known slashes would go stale silently and
 *   mislabel a new command as a prompt. the `/` at the head is the one property every client
 *   command shares and no prompt does
 * .note = 🟡 NO trim, and the asymmetry of the two wrong answers is why. `asCloneDispatchFrame`
 *   writes the message as typed, and whether the client reads a space or a newline before the
 *   slash as prose is UNMEASURED — so the tie is broken on which error is cheaper:
 *   - called a PROMPT in error → the caller sees the turn-hold advisory. an over-warn: it says
 *     verify, which costs a read and misleads nobody
 *   - called a CLIENT COMMAND in error → the caller is told the client already took it. a false
 *     ASSURANCE, and the caller stops a verify they needed
 *   ⇒ so a slash anywhere but index 0 answers false, and the conservative advisory stands until a
 *   measurement says otherwise
 */
export const isBrainCliClientCommand = (input: { message: string }): boolean =>
  // a bare `/` is the client's own command PICKER rather than a command; either way the client
  // consumes it and never queues it as a turn, so the advisory distinction holds identically
  input.message.startsWith('/');
