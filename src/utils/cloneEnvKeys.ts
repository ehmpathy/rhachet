/**
 * .what = the env-var keys a spawned clone carries, so a process spawned AS a
 *   clone can name itself (its serial), reach its own socket, and know how deep
 *   in the enroll chain it sits
 * .why =
 *   - a clone that self-manages (the wish's `clone whoami` + peer-reach motive)
 *     must learn its OWN address without a fragile pid/cwd match — the spawn
 *     injects these vars, and `clone whoami` reads them back
 *   - ONE home for the keys so a rename is a type error at every reader (the two
 *     spawn branches inject them; whoami reads them) rather than a silent drift
 *     across string literals
 *
 * .note = cross-layer const (utils/) — both spawn branches (the pty clone and the
 *   plain-spawn fallback) and the contract/cli whoami read it, so it depends on
 *   none of them and sits above the folder graph to dodge an enroll↔clone cycle
 */
export const CLONE_ENV_KEYS = {
  serial: 'RHACHET_CLONE_SERIAL',
  socket: 'RHACHET_CLONE_SOCKET',
  /**
   * .what = how deep in the enroll chain this clone sits — `0` for one a human
   *   enrolled, `1` for a peer that clone enrolled, and so on
   * .why = the depth budget (`asCloneEnrollDepth`) reads it to bound the chain. an
   *   ABSENT value is the honest signal for "no clone spawned this process", which
   *   is what makes a human caller depth-free rather than depth-zero
   */
  depth: 'RHACHET_CLONE_DEPTH',
  /**
   * .what = set on the re-exec'd enroll that HOSTS a detached clone — the one
   *   process that owns the pty master and the reach socket
   * .why =
   *   - the pty and the socket server are live handles INSIDE the enroller, so an
   *     `--async` enroll cannot detach by a mere return: node keeps the loop open
   *     for them, and the caller blocks forever on a session it does not watch
   *   - so an `--async` enroll re-execs itself with this key set, and the re-exec
   *     is the host. the caller reads the address off the host's stdout, reports
   *     it, and exits — the clone outlives them both
   *
   * .note = the key marks the HOST, never the clone. a clone's own identity is the
   *   serial/socket/depth trio above; this says only "you are the process that
   *   holds this one open"
   */
  hostDetached: 'RHACHET_CLONE_HOST_DETACHED',
} as const;
