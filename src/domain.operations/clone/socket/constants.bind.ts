/**
 * .what = the constants the clone socket's BIND LIFECYCLE owns — its liveness bound and
 *   the marker that names a bind that never reported
 *
 * .why a file of their own = their peers in `./constants` all tune the WIRE — how a
 *   dispatch types into the pty, how long it pauses before the submit, how large a frame
 *   or a queue may grow. these two answer a different question entirely: how long a bind
 *   may take, and how a bind timeout is recognized once it fires. one flat file mixed two
 *   concern families that share no reader.
 *
 * ⚠️ they stay TOGETHER, and in a file neither half owns. the producer
 *   (`genCloneSocketServer`) and the reader (`isCloneSocketBindFaultError`) must agree on
 *   one key, so the const cannot live beside either — whichever side did not own it would
 *   import from the other, and a rename would be a one-way break. a shared owner makes a
 *   rename break BOTH sides at compile time.
 */

/**
 * .what = the max time a clone socket's bind may take before it is called stalled and
 *   the `ready` promise rejects
 * .why =
 *   - libuv reports a unix bind as EITHER a success event or a fault event, under every
 *     condition we can name. this bounds the third outcome — NEITHER — which would
 *     otherwise hang an enroll forever behind an already-spawned brain-cli: no report,
 *     no exit, and a child that holds the host's pty invisibly
 *   - the value is generous BY DESIGN. a unix bind is a filesystem operation measured in
 *     microseconds, so a threshold three orders of magnitude above that cannot kill a
 *     healthy-but-slow bind — which is the one hazard a bind timeout carries, and the
 *     reason it was deferred while each caller raced the bind for itself
 *   - it is a LIVENESS bound, never a latency budget: no healthy path should ever come
 *     within sight of it, so it may be raised freely and must never be tuned downward
 *     toward the real bind cost
 */
export const CLONE_SOCKET_BIND_TIMEOUT_MS = 10_000;

/**
 * .what = the own-property `genCloneSocketServer` stamps on the error it mints when the
 *   bind timeout fires, and the property `isCloneSocketBindFaultError` reads to recognize
 *   it as one of ITS faults
 *
 * 🚨 .why a marker of OUR OWN, never a forged `syscall` = the predicate's whole discipline
 *   is that it reads node's structured `syscall` — *"the emitter's own declaration of WHICH
 *   call failed."* the timeout's defining condition is that NO call declared anything, in
 *   either direction. so to stamp `syscall: 'bind'` would forge that field to assert a bind
 *   syscall failed, corrupt the one field the predicate trusts, and put a false claim into
 *   the metadata a human reads. a separate own-property asserts what is true instead.
 *
 * ⚠️ .why a property and not an error CLASS = `isCloneSocketBindFaultError` documents, from
 *   a measured defect, that an `instanceof` read is realm-dependent and answers false under
 *   jest for exactly the errors it exists to classify. a plain own-property read is
 *   realm-independent, which is the same reason the syscall read is structural.
 */
export const CLONE_SOCKET_BIND_TIMEOUT_MARK = 'cloneSocketBindTimeout' as const;
