import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type { CloneSocketOmissionReason } from './computeCloneSocketOmissionReason';
import type { PtyPlatformSupport } from './pty/getPtyPlatformSupport';

/**
 * .what = casts a socket-omission reason into the error that reports it
 *
 * .why  = the class is the message. an absent pty addon means three different things,
 *         and to report them all as a constraint tells a human "you can fix this" when
 *         the truth may be "we must" — a report that is loud about the wrong party
 *         still hides whose defect it is (rule.forbid.failhide).
 *
 *         | omission reason | platform ships a prebuild? | class       | who fixes |
 *         |-----------------|----------------------------|-------------|-----------|
 *         | pty-absent      | supported                  | malfunction | us        |
 *         | pty-absent      | unsupported                | constraint  | caller    |
 *         | pty-absent      | unknown                    | constraint  | caller, after one diagnostic |
 *         | host-incapable  | any                        | constraint  | caller    |
 *
 * 🚨 .why the REASON alone cannot pick the class = read the first two rows. one input
 *         value (`pty-absent`) splits across BOTH exit codes, and what splits it is the
 *         platform, never the reason. that is the whole argument for two artifacts: the
 *         reason states what happened, and this states whose it is.
 *
 * .note = pure, so every row above is reachable from a unit test with no seam cut
 *         into any caller's contract.
 */
export const asCloneSocketOmissionReasonError = (input: {
  socketOmissionReason: Exclude<CloneSocketOmissionReason, null>;
  ptyPlatformSupport: PtyPlatformSupport;
  /**
   * .what = the `platform-arch` host tuple, e.g. `linux-x64`
   *
   * .why  = `hostTuple`, never `platform` — `platform` is taken in this dir at a DIFFERENT
   *   grain (`getPtyPlatformSupport` branches on a bare `'linux'`). both are plain
   *   `string`, so an edit that wired `process.platform` here would compile, pass, and
   *   silently degrade the diagnostic to `linux`. the name matches `asPtyHostTuple`
   */
  hostTuple: string;
  /**
   * .what = the true on-disk path of the rhachet module that raised this
   *
   * .why  = the stale-store read, handed over rather than asked for. surfaced on the
   *   `supported` row alone — the one case where a reinstall is the named cure, and the
   *   store is the one condition under which that cure is a dead end.
   *
   * ⚠️ an INPUT, never read here, so this stays pure and every row below is pinnable from
   *   a unit test on any machine. see `getRhachetRealpathFromProcess` for the read.
   * ⚠️ nullable, because the read genuinely fails on exactly the hosts this report fires
   *   on. `null` renders AS stated ignorance — never a fabricated path, never silence.
   */
  rhachetRealpath: string | null;
}): ConstraintError | MalfunctionError => {
  // the addon ships inside our own tarball for this platform, so its absence is a broken
  // artifact or a broken install — ours to repair, never a step the caller skipped.
  //
  // ⚠️ the second clause names the ONE condition under which a reinstall does not repair
  //   it: a shim that execs from a store the package manager no longer writes to.
  // ⚠️ that condition is carried as a VALUE, never as a command — this row fires on linux,
  //   darwin, AND win32, and no one shell incantation reads a symlink on all three.
  // 🚨 the hint carries the value INLINE, and must never merely POINT at the metadata
  //   field that also holds it. the cli renders `asCliErrorJson(...)`, whose
  //   `getUndecoratedMessage` strips the metadata tail and whose `CliErrorJson` shape has
  //   no `rhachetRealpath` field — so a pointer reaches NEITHER channel. that defect is
  //   invisible to a unit test, which reads the error OBJECT where the defect lives in its
  //   RENDER; `enroll.reach.acceptance [case4]` is the clamp
  if (
    input.socketOmissionReason === 'pty-absent' &&
    input.ptyPlatformSupport === 'supported'
  )
    return new MalfunctionError(
      'the reach socket is unavailable — node-pty failed to load on a supported platform',
      {
        socketOmissionReason: input.socketOmissionReason,
        hostTuple: input.hostTuple,
        rhachetRealpath: input.rhachetRealpath,
        // the stale-store clause names the ignorance rather than a fabricated path, so a
        // reader is never sent to compare a value we do not hold. the reinstall — the cure
        // that works on the common case — is named on both branches
        hint:
          input.rhachetRealpath === null
            ? 'the prebuilt addon ships inside the rhachet tarball, so this install is damaged — reinstall rhachet. if a reinstall does not repair it, report it: we could not read where the rhx you ran loaded from, which is itself a sign the install or its filesystem is damaged'
            : `the prebuilt addon ships inside the rhachet tarball, so this install is damaged — reinstall rhachet. if a reinstall does not repair it, the rhx you just ran loaded from ${input.rhachetRealpath} — compare that against your package manager global root: a mismatch means it execs from a stale store the installer no longer writes to. report it either way`,
      },
    );

  // we could not read this host's libc, so we cannot name the party — and to guess would
  // state one of the two rows above as fact. both are plausible and they carry OPPOSITE
  // cures.
  //
  // ⚠️ so the hint names a DIAGNOSTIC, never a cure. `ldd --version` settles it in one
  //   command, and each answer routes to the row it belongs to
  //   (`rule.require.errors-name-the-fix`).
  // ⚠️ classed a CONSTRAINT because the next move is the caller's, never because we judged
  //   the defect theirs. the message says so outright
  if (
    input.socketOmissionReason === 'pty-absent' &&
    input.ptyPlatformSupport === 'unknown'
  )
    return new ConstraintError(
      "the reach socket is unavailable — node-pty failed to load, and this host's libc could not be read",
      {
        socketOmissionReason: input.socketOmissionReason,
        hostTuple: input.hostTuple,
        hint: 'we cannot tell whether the addon is absent because your install is damaged or because upstream ships no binary for your libc — run `ldd --version` to settle it: a glibc version means the install is damaged, so reinstall rhachet; "musl libc" means no binary exists, so pass --no-socket',
      },
    );

  // no upstream binary exists for this host (alpine/musl, freebsd, …). the caller cannot
  // repair that, so the only honest move named is the opt-out
  if (input.socketOmissionReason === 'pty-absent')
    return new ConstraintError(
      'the reach socket is unavailable — node-pty ships no prebuilt addon for this platform',
      {
        socketOmissionReason: input.socketOmissionReason,
        hostTuple: input.hostTuple,
        hint: 'pass --no-socket to enroll without one, or run on a glibc linux, macos, or windows host',
      },
    );

  // the host cannot open a unix socket at all (no getuid → no runtime dir, e.g. windows)
  if (input.socketOmissionReason === 'host-incapable')
    return new ConstraintError(
      'the reach socket is unavailable — this host cannot open a unix socket',
      {
        socketOmissionReason: input.socketOmissionReason,
        hostTuple: input.hostTuple,
        hint: 'run on a POSIX host with a runtime dir, or pass --no-socket to enroll without one',
      },
    );

  // .why = a GUARD, never a catch-all. the union is sealed today, so this row is
  //   unreachable — and that is why it must exist. were the last branch left open, a third
  //   omission reason (`pty-crash`, `socket-bind-failed`) would fall into the
  //   host-incapable row and be reported as a POSIX problem with a `--no-socket` cure, and
  //   no type error and no red test would mark it. a row we failed to handle is OURS,
  //   never the caller's
  return new MalfunctionError(
    'the reach socket is unavailable — and its cause could not be classified',
    {
      socketOmissionReason: input.socketOmissionReason,
      ptyPlatformSupport: input.ptyPlatformSupport,
      hostTuple: input.hostTuple,
      hint: 'this is a defect in rhachet: a socket omission reason reached asCloneSocketOmissionReasonError with no row to report it. please report it with this metadata; pass --no-socket to enroll meanwhile',
    },
  );
};
