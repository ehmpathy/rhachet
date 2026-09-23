/**
 * .what = the argv a detached enroll host is re-execed with — the caller's own argv,
 *   with a `--reason @stdin` swapped for the motive the caller already read
 * .why =
 *   - a detached enroll re-execs THIS cli as the host, so the argv is replayed
 *     verbatim by default. that is right for every flag the host can act on itself
 *   - 🔴 `@stdin` is the exception, and it fails SILENTLY. the caller drains the pipe
 *     before it detaches, and the host is spawned with `stdin: 'ignore'` — so a host
 *     handed `--reason @stdin` reads an empty pipe, and the audit records no motive
 *     for an enroll whose caller supplied one. a lost motive is invisible at the
 *     moment it is lost and only surfaces when someone asks why a clone exists
 *   - named rather than inlined: the swap must handle BOTH commander spellings, and a
 *     two-form scan at a call site is decode friction in an orchestrator
 *     (`rule.forbid.decode-friction-in-orchestrators`)
 *
 * .note = only `@stdin` is rewritten. a literal `--reason "<text>"` already replays
 *   correctly, so it is left exactly as the caller typed it — the host then renders
 *   the same audit line either way
 */
export const asCloneDetachHostArgv = (input: {
  /** the caller's own argv tail — `process.argv.slice(1)` */
  argv: string[];
  /** the motive the caller resolved, already drained from the pipe if it came from one */
  reason: string | null;
}): string[] => {
  // with no motive in hand there is no value to substitute — a host handed
  // `--reason @stdin` and an empty pipe records null, which is what the caller read
  const { reason } = input;
  if (reason === null) return input.argv;

  return input.argv.map((arg, index) => {
    // the space form: `--reason @stdin` — this element is the VALUE of the flag
    if (arg === '@stdin' && input.argv[index - 1] === '--reason') return reason;

    // the equals form: `--reason=@stdin` — flag and value in one element
    if (arg === '--reason=@stdin') return `--reason=${reason}`;

    return arg;
  });
};
