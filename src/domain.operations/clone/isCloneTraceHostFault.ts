/**
 * .what = whether an error is a fault of the host's os call — any errno an fs syscall returned —
 *   rather than a defect in the code that made the call
 * .why = the daemon's trace sink runs inside timers, socket handlers and pty emitters, so a throw
 *   from it is an uncaught exception that kills the clone and with it the human's pane. a write of
 *   a diagnostic must never do that for host state (a stale nfs handle, a full disk, a loop in
 *   `.agent/`), and no hand-kept list of errnos can name every one a host may return. so the
 *   test is the shape of the fault, not its code: an os call fault carries both its errno `code`
 *   and the `syscall` that returned it. a code defect (a TypeError, node's own `ERR_*` argument
 *   checks) carries no `syscall`, and still throws loud
 * .note = read off any error-shaped value, since a fault minted in another realm fails
 *   `instanceof Error`
 */
export const isCloneTraceHostFault = (input: { error: unknown }): boolean =>
  typeof input.error === 'object' &&
  input.error !== null &&
  'code' in input.error &&
  typeof input.error.code === 'string' &&
  'syscall' in input.error &&
  typeof input.error.syscall === 'string';
