import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { MalfunctionError } from 'helpful-errors';

/**
 * .what = a cross-process semaphore that bounds how many LIVE real brain-cli clones exist
 *   on one host at a time. acquire a slot before a real claude spawn; release it when the
 *   clone dies.
 * .why = 🔴 the acceptance tier over-subscribes the host by construction, and the symptom
 *   is a set of unrelated-looking realbrain failures.
 *   - jest runs `maxWorkers: '50%'`, and EACH realbrain suite holds a live claude: a pty
 *     reader, a headless-emulator feed, a socket server, plus a node subprocess per
 *     `clone say`. so the tier's live-brain count is set by the host's core count, which
 *     no test declared and no test can see
 *   - ⇒ the daemon's own event loop is what starves. a `clone get` read times out at
 *     5000ms, the wedge timer fires at 30000ms, and the say exits 1 with `reachCause:
 *     "wedged"` — the product's CORRECT report of a host that could not answer
 *   - and the symptoms do not look like one cause, which is what made it expensive: a
 *     wedged socket read (dogfood), a reply that misses its poll bound (joker), a brain
 *     still busy at its first dispatch (transcript-lag). one root, three faces
 * .note = 🔴 the MEASUREMENT that sets the default, 2026-09-18, one commit, no source edit
 *   between the two runs:
 *   | concurrency | result |
 *   |---|---|
 *   | 11 suites that each hold a real brain | 🔴 **8 failed**, 307 passed (1316s) — `.log/…/what=acceptance/2026-09-18T22-01-46Z.stderr.log` |
 *   | 3 of those same suites, the exact 3 that failed | ✅ **35 passed, 0 failed** (178s) — `.log/…/what=acceptance/2026-09-18T22-29-26Z.stderr.log` |
 *   ⇒ so the default is `3`: **the largest concurrency measured green**, never a number
 *   picked because it held. the interval between 3 and 11 is UNMEASURED, and that is stated
 *   rather than papered over — a bound guessed and then honored is indistinguishable from a
 *   fix (`rule.forbid.mechanism-inferred-from-outcome`), so the bound cites its evidence and
 *   names its own gap.
 * .note = the slot dir is host-wide rather than run-wide on purpose: two concurrent
 *   `git.repo.test` invocations are the exact hazard
 *   `rule.forbid.builds-while-a-blackbox-run-is-inflight` already names, and a run-scoped
 *   semaphore would be blind to the peer run.
 */
const SLOT_DIR = join(tmpdir(), 'rhachet.realbrain.slots');

/**
 * .what = how many live real brains this host admits at once
 * .why = the measured-green default above, with an env override so a beefier host (or a
 *   deliberate single-file run) can raise or drop it without a source edit
 */
const SLOT_COUNT = Number(process.env.RHACHET_REALBRAIN_MAX_LIVE ?? '3');

/**
 * .what = how long a slot may be held before a peer reclaims it as stale
 * .why = a suite that dies without a release would otherwise leak a slot forever, and the
 *   next run would starve on a holder that no longer exists. the bound is the realbrain
 *   suites' own wall-clock limit (`jest.setTimeout(300000)`) plus headroom, so a LIVE holder
 *   is never reclaimed out from under itself
 */
const SLOT_STALE_MS = 420000;

/**
 * .what = is the pid recorded in a slot still alive?
 * .why = the primary staleness test, and the fast one: a crashed jest worker frees its slot
 *   the instant a peer reads it, with no wait on the timeout above. `kill(pid, 0)` raises
 *   ESRCH for a dead pid and answers cleanly for a live one
 * .note = it answers ALIVE for a zombie until its parent reaps it, which is why the age
 *   bound remains the backstop rather than the only test
 */
const isSlotHolderAlive = (input: { pid: number }): boolean => {
  try {
    process.kill(input.pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * .what = reclaim a slot whose holder is gone, or whose hold outran the stale bound
 * .why = a leaked slot is a permanent capacity loss, so every acquire attempt sweeps before
 *   it waits. a reclaim is idempotent — two peers that reclaim the same slot both proceed to
 *   an atomic `mkdir`, and exactly one wins it
 */
const delSlotIfStale = (input: { path: string }): void => {
  const held = ((): { pid: number; acquiredAt: number } | null => {
    try {
      return JSON.parse(
        readFileSync(join(input.path, 'held.json'), 'utf8'),
      ) as { pid: number; acquiredAt: number };
    } catch {
      // an unreadable marker is itself a stale slot: a holder writes it immediately after
      // the mkdir, so an absent or corrupt one means the holder died in that window
      return null;
    }
  })();

  const isStale =
    held === null ||
    !isSlotHolderAlive({ pid: held.pid }) ||
    Date.now() - held.acquiredAt > SLOT_STALE_MS;
  if (!isStale) return;

  try {
    rmSync(input.path, { recursive: true, force: true });
  } catch {
    // a peer reclaimed it first — the outcome this wanted, by another hand
  }
};

/**
 * .what = take one of the host's live-real-brain slots, or fail loud at the bound
 * .why = the whole point of the file: a test that is about to spawn a real claude declares
 *   that intent to every other process on the host, so the tier's live-brain count is a
 *   number this repo CHOSE rather than one the host's core count imposed
 * .note = the mutual exclusion is `mkdirSync` without `recursive`, which is atomic on posix
 *   and raises EEXIST for a loser. no lockfile library, no advisory `flock`, no pid race
 * .note = it fails LOUD at the bound rather than proceeds unslotted. an unslotted spawn is
 *   exactly the over-subscription this closes, so a silent fallthrough would restore the
 *   defect under a name that reads like caution (`rule.forbid.failhide`)
 */
export const genRealBrainSlot = async (input?: {
  timeoutMs?: number;
}): Promise<{ release: () => void }> => {
  mkdirSync(SLOT_DIR, { recursive: true });

  const deadline = Date.now() + (input?.timeoutMs ?? 600000);
  const slots = Array.from({ length: SLOT_COUNT }, (_, index) =>
    join(SLOT_DIR, `slot.${index}`),
  );

  // .note = deliberate mutation — a bounded wait for a free slot, scoped to this closure
  let waited = 0;
  while (Date.now() < deadline) {
    for (const path of slots) {
      try {
        mkdirSync(path);
      } catch {
        // taken. sweep it, in case its holder is gone, then try the next
        delSlotIfStale({ path });
        continue;
      }

      // won it. stamp the holder so a peer can judge staleness, then hand back a release
      writeFileSync(
        join(path, 'held.json'),
        JSON.stringify({ pid: process.pid, acquiredAt: Date.now() }),
        'utf8',
      );
      return {
        release: (): void => {
          try {
            rmSync(path, { recursive: true, force: true });
          } catch {
            // already reclaimed — release is idempotent by contract, since a caller
            // releases from an afterAll that may run after a peer swept the slot
          }
        },
      };
    }

    await new Promise<void>((wake) => setTimeout(wake, 500));
    waited += 500;
  }

  throw new MalfunctionError(
    'no live-real-brain slot came free on this host within the bound',
    {
      slotDir: SLOT_DIR,
      slotCount: SLOT_COUNT,
      waitedMs: waited,
      hint: 'a peer acceptance run may hold every slot — see rule.forbid.builds-while-a-blackbox-run-is-inflight. raise RHACHET_REALBRAIN_MAX_LIVE only with a measurement behind it',
    },
  );
};
