/** the brain-cli flags that pick a prior session back up (claude-code 2.1.327 `--help`) */
const RESUME_FLAGS = ['--resume', '-r', '--continue', '-c', '--from-pr'];

/** the long resume flags that also take their value inline, as `--flag=<value>` */
const RESUME_FLAGS_INLINE = ['--resume=', '--from-pr='];

/**
 * .what = whether a spawn argv picks a prior session back up (`--resume`, `-r`, `--continue`,
 *         `-c`, `--from-pr`)
 * .why = a resumed session replays the system prompt it first recorded (`rhx boot.resume.probe`),
 *        so its boot is that session's, never the boot of this spawn; the spawn must not record
 *        a revision it does not hold
 * .note = the inline `--resume=<id>` and `--from-pr=<pr>` forms count too
 * .note = `--session-id <uuid>` names a NEW session, so it is no resume
 */
export const isBrainCliSpawnArgsResume = (input: { args: string[] }): boolean =>
  input.args.some(
    (arg) =>
      RESUME_FLAGS.includes(arg) ||
      RESUME_FLAGS_INLINE.some((prefix) => arg.startsWith(prefix)),
  );
