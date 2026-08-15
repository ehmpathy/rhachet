/**
 * .what = the env-var keys a spawned clone carries, so a process spawned AS a
 *   clone can name itself (its serial) and reach its own socket
 * .why =
 *   - a clone that self-manages (the wish's `clone whoami` + peer-reach motive)
 *     must learn its OWN address without a fragile pid/cwd match — the spawn
 *     injects these two vars, and `clone whoami` reads them back
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
} as const;
