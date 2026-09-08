import { CLONE_SOCKET_BIND_TIMEOUT_MARK } from './constants.bind';

/**
 * .what = the syscalls the clone socket's own gate can fault on
 *
 * 🚨 .why an ALLOWLIST, never a catch-all = the caller guards a whole block, and that
 *   block runs more than the bind — `delFileSync` on the stale path, `pty.spawn`, the
 *   host wires, the raw-mode enter. so a catch with no allowlist would relabel any of
 *   those as a socket fault and name the wrong cure. this is the same discipline
 *   `isPtyDeviceRefusedError` carries, applied to the other half of the same block.
 *
 * 🚨 .why the SYSCALL field, never the message = a marker regex over `error.message`
 *   is what the pty pair had to use, because node-pty prints prose. node does not: every
 *   errno exception it mints carries a structured `syscall`, so this predicate reads the
 *   emitter's own declaration of WHICH call failed rather than a guess at how it phrased
 *   it. no locale drift, no `/failed/` that also matches a TypeError's text.
 *
 * .note = the set is CLOSED by `genCloneSocketServer`, and is exactly the three calls it
 *   makes on the path to a bound, locked-down socket:
 *   - `bind` / `listen` — `server.listen(socketPath)`; node reports a unix-socket bind
 *     fault (EADDRINUSE, EACCES, ENOENT) on `'error'`, asynchronously
 *   - `chmod` — the `chmodSync(socketPath, 0o600)` lockdown, which that server runs inside
 *     its own ready gate so the fault rejects `ready` rather than arrive past it
 *
 * ⚠️ an OVER-LENGTH path is NOT in that set, and it earns a note because it reads as though
 *   it should be. a unix address is capped at ~107 bytes of `sun_path`, and node does not
 *   report `ENAMETOOLONG` past it — it fires the `'listen'` success event, bound at a
 *   silently TRUNCATED address, so this predicate is never consulted. the
 *   lockdown's own `chmod` on the untruncated path is what then faults `ENOENT`, which DOES
 *   land here — so the classification is right while the sentence it produces names the
 *   wrong cause. the length itself is unchecked upstream (`getCloneSocketPath`).
 */
const CLONE_SOCKET_BIND_SYSCALLS: string[] = ['bind', 'listen', 'chmod'];

/**
 * .what = did the clone's socket gate fault, or is this some other throw from the block?
 *
 * .why = decides the party. by the time this can fire, `computeCloneSocketOmissionReason` has
 *   ALREADY cleared a socket for this enroll — so a bind that then faults means our gate
 *   was wrong, or the path we built was. both are ours, so a match reports as a
 *   malfunction, and a miss propagates untouched with its stack intact
 *   (`rule.forbid.failhide`)
 */
export const isCloneSocketBindFaultError = (error: unknown): boolean => {
  // 🚨 an `instanceof Error` guard here is a DEFECT. this predicate's subject is an error
  //   node mints inside its own `net` module — and under jest, node core does not share a
  //   realm with the sandbox this file loads into, so `instanceof` answers false for
  //   exactly the errors this exists to classify. it would hold in prod and fail only under
  //   test, so a real `syscall: 'listen'` / `EADDRINUSE` reaches the orchestrator
  //   UNCLASSIFIED. the read is structural end to end: it asks whether node STAMPED a
  //   syscall, which is realm-independent. `[case5]` of
  //   `genBrainCliPtyClone.integration.test.ts` is its clamp.
  //
  //   ⚠️ its peer `isPtyDeviceRefusedError` keeps its `instanceof` guard deliberately. its
  //   subject is minted by the node-pty addon, which loads INSIDE the sandbox, so the two
  //   are same-realm by construction there. one file, one reason — not a convention drift.
  if (typeof error !== 'object' || error === null) return false;

  // 🚨 the FOURTH condition this module can fault on, and the one node declares no syscall
  //   for — the bind timeout, whose whole premise is that neither event ever fired. it is
  //   read as its own mark rather than a forged `syscall` (see the const's note).
  //
  //   ⚠️ it is a SECOND allowlist entry, never a wider read. the discipline holds in full:
  //   an exact, closed marker minted by this same module, never a catch-all and never a
  //   message regex.
  if (
    (error as Record<string, unknown>)[CLONE_SOCKET_BIND_TIMEOUT_MARK] === true
  )
    return true;

  const { syscall } = error as NodeJS.ErrnoException;
  return (
    typeof syscall === 'string' && CLONE_SOCKET_BIND_SYSCALLS.includes(syscall)
  );
};
