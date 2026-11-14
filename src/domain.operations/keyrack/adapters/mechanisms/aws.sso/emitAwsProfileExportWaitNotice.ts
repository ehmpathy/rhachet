/**
 * .what = tell the human, once per wait, that this process waits on a peer's aws export of one
 *   profile
 * .why = the wait may last minutes behind a hung peer (the hang guard, then the lease). a silent
 *   `rhx keyrack unlock` that long reads as a hang
 *
 * .note = stderr, like `emitRepoMutexWaitNotice`, so stdout stays whole for any caller that
 *   parses it; it names the profile only, never a credential
 * .note = it names the wait bound and the lease, so a human behind a killed peer knows the wait
 *   ends on its own
 */
export const emitAwsProfileExportWaitNotice = (input: {
  profile: string;
  waitWords: string;
  leaseWords: string;
}): void => {
  process.stderr.write(
    `ℹ another process exports aws credentials for profile ${input.profile}; this one will wait for it, up to ${input.waitWords} (if the other process was killed, the wait ends on its own within ${input.leaseWords})\n`,
  );
};
