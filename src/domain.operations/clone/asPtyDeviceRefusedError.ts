import { ConstraintError } from 'helpful-errors';

/**
 * .what = the classified report a human reads when the HOST refused node-pty a device
 *
 * .why  = pure, so the whole rendered report — class, sentence, and hint — is pinned by
 *   value from a unit test. it mirrors `asCloneSocketOmissionReasonError`, which owns the same
 *   decisions for the addon-ABSENT path.
 *
 * .why constraint = the next move is the caller's — pass `--no-socket`, or free the pty
 *   devices this host is out of. a retry with the same request fails identically
 *   (`rule.require.exit-code-semantics`)
 *
 * 🚨 node-pty's own words are carried INLINE in the hint, never merely into metadata —
 *   `asCliErrorJson` strips the metadata tail from the human frame.
 * ⚠️ the quoted cause is LAST, and NO character follows it. node-pty terminates its
 *   messages inconsistently — `pty.cc` prints `forkpty(3) failed.` with a period and
 *   `posix_spawn failed: <strerror>` without one — so punctuation appended after it
 *   renders `failed..` on half the marker set. terminal position is right for both by
 *   construction (`rule.forbid.snapshot-visual-blemishes`).
 * ⚠️ the hint names no host-specific shell token — this report fires on linux, darwin,
 *   AND win32 (`rule.forbid.host-specific-cures-in-hints`).
 * ⚠️ the metadata generic is spelled out rather than left to the bare `ConstraintError`
 *   default. `HelpfulError`'s `metadata` getter is a conditional type over `TMetadata`, so
 *   the class is INVARIANT in it — a bare annotation does not widen the payload, it fails
 *   to compile.
 */
export const asPtyDeviceRefusedError = (input: {
  error: unknown;
  hostTuple: string;
}): ConstraintError<{
  hostTuple: string;
  ptyError: string;
  hint: string;
}> => {
  const cause =
    input.error instanceof Error ? input.error.message : String(input.error);

  return new ConstraintError(
    'the reach socket is unavailable — the pty device could not be allocated',
    {
      hostTuple: input.hostTuple,
      ptyError: cause,
      hint: `node-pty loaded but could not allocate a pty on this host, so this is a host condition rather than a damaged install — pass --no-socket to enroll without a reach socket. node-pty said: \`${cause}\``,
    },
  );
};
