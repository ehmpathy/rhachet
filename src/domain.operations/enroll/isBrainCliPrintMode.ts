/**
 * .what = does this enroll carry a PRINT flag — so the invocation owes its caller an
 *   answer on stdout and the child will exit once it has given one?
 * .why =
 *   - a brain-cli in print mode (`-p` / `--print`) answers the prompt, writes the
 *     answer to stdout, and EXITS. every other enroll spawns a session that does not
 *     exit at all
 *   - that difference decides what the ENROLLER must do after the spawn. a session
 *     may be detached and left to outlive its caller; a print-mode child may not,
 *     because its whole output is owed to the caller that asked. so the flag is a
 *     `nature` signal the mode derivation needs, beside the tty
 *
 * 🔴 .why this names the NATURE it reads, never the mode it produces = the mode is
 *   `await`, and an input field named `awaits` would make the derivation circular —
 *   `awaits: true → 'await'` states no reason. `printMode` names the OBSERVATION
 *   (claude's `-p`), so the derivation reads as an inference rather than a restatement
 *
 * 🔴 .note = the tty cannot answer this. a guard lane runs `enroll … -p '<prompt>'`
 *   as a subprocess with no terminal, so a tty-only derivation reads `async`, detaches,
 *   and hands its caller an enroll banner where the answer was owed. that is the
 *   measured defect this predicate closes — and it is the same shape as the cure that
 *   replaced `interactive: !!isTTY`: a tty read used to answer a question the tty
 *   cannot answer (`define.invariant.clone-attendance-is-a-mode-never-a-reach`)
 */
export const isBrainCliPrintMode = (input: {
  /** the tokens forwarded verbatim to the child brain-cli */
  passthrough: string[];
}): boolean =>
  input.passthrough.some((token) => token === '-p' || token === '--print');
