import { MalfunctionError } from 'helpful-errors';

/**
 * .what = the classified report a human reads when the clone's socket could not be bound
 *
 * .why  = pure, so the whole rendered report — class, sentence, and hint — is pinned by
 *   value from a unit test. it is the third member of the set `asCloneSocketOmissionReasonError`
 *   and `asPtyDeviceRefusedError` opened, and it closes the one path that had no
 *   classifier: the addon loaded, the device was granted, and the BIND then failed.
 *
 * 🚨 .why malfunction = by the time this can fire, `computeCloneSocketOmissionReason` has already
 *   cleared a socket for this enroll and `genCloneSocketServer` has already unlinked any
 *   stale path. so a bind that faults means our gate was wrong, or the path we built was —
 *   neither is a step the caller skipped, and a retry with the same request fails
 *   identically. exit 1, ours to repair (`rule.require.exit-code-semantics`).
 *
 * ⚠️ the errno is carried INLINE in the hint, never merely into metadata. `asCliErrorFrame`
 *   does render metadata unredacted, so the value would reach a screen either way — what the
 *   inline copy buys is that the ONE actionable value sits in the sentence a human reads
 *   first, rather than in a json tail they must scan to find the field that matters.
 * ⚠️ the hint names no host-specific shell token — a bind can fault on linux, darwin, AND
 *   win32, and no one incantation inspects a socket path on all three
 *   (`rule.forbid.host-specific-cures-in-hints`).
 * ⚠️ `--no-socket` is named as the way FORWARD, never as the fix. the fix is ours, and the
 *   report says so outright rather than hand the caller a workaround dressed as a cure.
 */
export const asCloneSocketBindFaultError = (input: {
  error: unknown;
  hostTuple: string;
}): MalfunctionError<{
  hostTuple: string;
  socketErrno: string | null;
  socketSyscall: string | null;
  socketError: string;
  hint: string;
}> => {
  // ⚠️ the message is read STRUCTURALLY, never behind an `instanceof Error` guard — the
  //   same realm trap its predicate documents. node mints this error in its own `net`
  //   module, so under jest an `instanceof` branch falls to `String(error)` and renders
  //   the cause with a doubled `Error: ` prefix a human never asked for
  const { code, syscall, message } = (input.error ??
    {}) as NodeJS.ErrnoException;
  const cause = typeof message === 'string' ? message : String(input.error);

  return new MalfunctionError(
    'the reach socket is unavailable — its socket could not be bound',
    {
      hostTuple: input.hostTuple,
      socketErrno: code ?? null,
      socketSyscall: syscall ?? null,
      socketError: cause,
      hint: `the pty addon loaded and the device was granted, so the socket bind should have succeeded — this is a defect in rhachet, please report it with this errno. pass --no-socket to enroll meanwhile. the bind said: \`${cause}\``,
    },
  );
};
