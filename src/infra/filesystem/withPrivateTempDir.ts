import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * .what = run a synchronous operation inside a fresh private 0700 temp dir, then
 *         remove the whole dir — even if the operation throws
 * .why  = the mkdtemp(0700) → use → rmSync(force, guarded) sequence was hand-rolled
 *         at three sync call sites (getOneAgentSignature, the age encrypt + decrypt
 *         wrappers), each with the same 0700-privacy rationale and the same guarded
 *         cleanup. one helper makes that lifecycle a single place to audit — so a
 *         future change to the cleanup semantics is applied once, not copied by hand
 *
 * .note = SYNC only, on purpose. the three consumers are all synchronous
 *         (execFileSync-based), so their dir must outlive a sync body and no longer.
 *         the one OTHER temp-dir site, genEphemeralSshAgent, has a fundamentally
 *         different lifecycle — it returns a teardown closure so the dir outlives the
 *         call (the agent socket lives in it) — so it is deliberately NOT a consumer
 *         here; a scope-bounded helper would delete the socket dir out from under the
 *         still-live agent
 * .note = mkdtempSync is 0700 by default, and the random suffix closes the
 *         symlink-attack shape a predictable /tmp name would open
 * .note = the cleanup runs in a guarded finally — a cleanup fault must NEVER mask the
 *         caller's original error (rule.forbid.failhide); rmSync(force) already
 *         ignores an already-absent dir
 * .note = ALSO reaps on an abrupt-stop signal, not just a thrown error or normal
 *         return. a consumer (asDecryptedSshKeyCopy) writes a DECRYPTED plaintext ssh
 *         key into this dir, then blocks synchronously up to ~120s on the gnome dialog;
 *         a Ctrl+C (SIGINT) or a kill (SIGTERM/SIGHUP) in that window would otherwise
 *         stop Node WITHOUT the finally, so the plaintext key is stranded in /tmp.
 *         genEphemeralSshAgent guards this same human-wait hazard the same way — the
 *         parity the two owe (both wrap a ~120s dialog wait on the same signal set)
 */
export const withPrivateTempDir = <T>(
  input: { prefix: string },
  use: (dir: string) => T,
): T => {
  const dir = mkdtempSync(join(tmpdir(), input.prefix));

  // the abrupt-stop signals that must reap the dir before they kill Node — the exact
  // set + shape genEphemeralSshAgent uses, for the exact same reason (a signal in the
  // dialog-wait window skips the finally, so a decrypted key is stranded on disk)
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

  // reap the dir + de-register the signal nets; idempotent by construction so the
  // finally AND a signal-time call cannot double-remove — a second rmSync(force) is a
  // no-op, and removeListener on an already-fired `once` handler is harmless. no
  // mutable latch needed (rule.require.immutable-vars)
  const cleanup = (): void => {
    for (const signal of signals) process.removeListener(signal, onSignal);
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup faults — the operation's own result/error is what matters
      // (rule.forbid.failhide); rmSync(force) already ignores an absent dir
    }
  };

  // on an abrupt-stop signal: reap first, then re-raise the same signal with its
  // default disposition (cleanup already removed this handler) so the process still
  // exits as the signal intends. node hands the signal name to the listener, so one
  // handler serves all three (mirrors genEphemeralSshAgent's onSignal)
  const onSignal = (signal: NodeJS.Signals): void => {
    cleanup();
    process.kill(process.pid, signal);
  };

  for (const signal of signals) process.once(signal, onSignal);

  try {
    return use(dir);
  } finally {
    cleanup();
  }
};
