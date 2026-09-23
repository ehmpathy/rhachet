import { asIsoTimeStamp } from 'iso-time';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { CloneOndisk } from '@src/domain.objects/CloneOndisk';

import { getCloneSocketPath } from '../getCloneSocketPath';
import type { CloneScreenRead } from '../screen/genCloneScreenFeed';
import { genCloneSocketServer } from './genCloneSocketServer';
import { getCloneSayObservation } from './getCloneSayObservation';

/**
 * .what = stand up a real clone socket server whose `get` probe reads a fixed live screen
 * .why = `getCloneSayObservation` polls the transcript AND the socket screen each cycle; a
 *   real socket with an injected `read` lets a test drive the enqueued-shape read the
 *   `enqueue` short-circuit turns on, without a brain-cli behind the pty
 */
const genObserveServer = async (input: {
  read: () => CloneScreenRead;
}): Promise<{ socketPath: string; close: () => Promise<void> }> => {
  const socketPath = getCloneSocketPath({ serial: getUuid() })!;
  const { ready, close } = genCloneSocketServer({
    socketPath,
    write: () => undefined,
    isBrainCliAlive: () => true,
    read: input.read,
    // a fixed injected screen has no async parse to drain, so the settle is a no-op here
    settle: async () => {},
  });
  await ready;
  return { socketPath, close };
};

/**
 * .what = a clone whose transcript count is a stable 0 — a temp repoPath with no actor record
 * .why = `getCloneSayObservation` relinks then counts the transcript each cycle; with no actor
 *   enrolled under this repoPath the relink no-ops and the history dir is absent, so the count
 *   reads 0 forever and the transcript NEVER rises. that pins the `released` basis off, so the
 *   only live basis is the screen probe — exactly the busy-brain case the two targets split on
 */
const genCountZeroClone = (): CloneOndisk => {
  const repoPath = genTempDir({ slug: 'sayObserve-count0' });
  return new CloneOndisk({
    serial: getUuid(),
    slug: null,
    actor: { repoPath, hash: 'aaa' },
    socketEligible: true,
    spawnedAt: asIsoTimeStamp('2026-08-10T00:00:00Z'),
    hostHash: 'h1',
    hostPid: 1,
    hostPidStartedAt: asIsoTimeStamp('2026-08-10T00:00:00Z'),
    historyDir: `${repoPath}/history`,
  });
};

describe('getCloneSayObservation.integration', () => {
  // the `enqueued`-shape grid — our message scrolled ABOVE a CLEAR box fenced by a rule pair,
  // with a busy brain that never writes a user turn to the transcript. so focus is `input`,
  // the region is `clear`, the screen count rises 0 → 1, and the transcript count stays 0
  const RULE = '─'.repeat(80);
  const MESSAGE = 'SENTINEL-observe';
  const ENQUEUED_LINES = [`❯ ${MESSAGE}`, '● still at work', RULE, '❯ ', RULE];
  const enqueuedScreen: CloneScreenRead = {
    live: true,
    lines: ENQUEUED_LINES,
    // every row BRIGHT — the box is empty on its own text, so `clear` is earned by emptiness
    // rather than by a dim blank, which keeps the `enqueued` verdict keyed to the count rise
    linesBright: ENQUEUED_LINES,
    cursorX: 0,
    cursorY: 0,
    cols: 80,
    rows: 40,
  };
  const baseline = { transcriptCount: 0, countInInput: 0, countOnScreen: 0 };

  given(
    '[case1] a busy brain — the message sits enqueued, the transcript never rises',
    () => {
      when('[t0] observed with target `enqueue` (the default bar)', () => {
        const scene = useBeforeAll(async () => {
          const server = await genObserveServer({
            read: () => enqueuedScreen,
          });
          const clone = genCountZeroClone();
          const timeoutMs = 3000;
          const startedAt = Date.now();
          const { observation } = await getCloneSayObservation({
            repoPath: clone.actor.repoPath,
            clone,
            socketPath: server.socketPath,
            message: MESSAGE,
            baseline,
            target: 'enqueue',
            timeoutMs,
          });
          const elapsedMs = Date.now() - startedAt;
          await server.close();
          return { observation, elapsedMs, timeoutMs };
        });

        then(
          'the verdict-basis is the enqueued shape — no transcript rise, screen count rose',
          () => {
            expect(scene.observation.transcriptRose).toBe(false);
            expect(scene.observation.screen).toEqual({
              focus: 'input',
              input: 'clear',
              countInInputRose: false,
              countOnScreenRose: true,
              // `false` — this grid carries NO queue hint row, deliberately (see ENQUEUED_LINES).
              // so what this case clamps is the COUNT-RISE basis for `enqueued`, which stands on
              // its own: `transcriptRose: false` means `release` cannot fire whatever `queued`
              // reads. the HINT basis — a rise beside a non-empty queue, the pair that parts
              // `enqueued` from `released` — is clamped by computeCloneSayVerdict's units and,
              // against a live brain, by clone.screen-dogfood.realbrain
              queued: false,
            });
          },
        );

        then(
          'it short-circuits BEFORE the poll budget is exhausted — the enqueue target returns early',
          () => {
            // the deterministic fact this pins: the loop returns on the enqueued shape at
            // cyclesElapsed >= 1 (cycle 0 defers per the case=5 race-guard), so it returns
            // BEFORE the bound rather than at it. the `release` twin below proves the
            // opposite branch polls to `elapsed >= timeout`, so this asserts a strict-under
            // against the SAME large bound — it reddens only when the short-circuit genuinely
            // does not fire, never on scheduler jitter (a small wall-clock bound would)
            expect(scene.elapsedMs).toBeLessThan(scene.timeoutMs);
          },
        );
      });

      when(
        '[t1] observed with target `release` (raise the bar to a taken turn)',
        () => {
          const scene = useBeforeAll(async () => {
            const server = await genObserveServer({
              read: () => enqueuedScreen,
            });
            const clone = genCountZeroClone();
            const timeoutMs = 800;
            const startedAt = Date.now();
            const { observation } = await getCloneSayObservation({
              repoPath: clone.actor.repoPath,
              clone,
              socketPath: server.socketPath,
              message: MESSAGE,
              baseline,
              target: 'release',
              timeoutMs,
            });
            const elapsedMs = Date.now() - startedAt;
            await server.close();
            return { observation, elapsedMs, timeoutMs };
          });

          then(
            'the enqueued shape does NOT satisfy release — it polls to the bound',
            () => {
              // release ignores the enqueued short-circuit and returns only when the deadline
              // is reached, so elapsed is at least the bound. this is the branch this test
              // clamps: the SAME enqueued-shape read that returns `enqueue` early exhausts the
              // poll under `release`, since release owes a transcript rise the busy brain never
              // gives
              expect(scene.elapsedMs).toBeGreaterThanOrEqual(scene.timeoutMs);
            },
          );

          then(
            'the residual read is still the enqueued shape — the transcript never rose',
            () => {
              expect(scene.observation.transcriptRose).toBe(false);
              expect(scene.observation.screen).toEqual({
                focus: 'input',
                input: 'clear',
                countInInputRose: false,
                countOnScreenRose: true,
                // `false` — no hint row on this grid, same as [t0]. it is load-free here: the
                // `release` target owes a transcript rise, and this brain never gives one, so
                // the poll exhausts on the transcript alone
                queued: false,
              });
            },
          );
        },
      );
    },
  );

  given(
    '[case2] a probe-blind peer — the feed is not live, so no screen read ever lands',
    () => {
      // a live socket whose read reports `feed-not-live` every cycle (an older daemon
      // with no emulator, or a feed not yet attached). the probe degrades probe-blind, so the
      // screen basis stays null and the transcript never rises against a count-zero clone —
      // the mid-loop probe-blind branch, proven direct here rather than only end-to-end
      const notLiveScreen: CloneScreenRead = {
        live: false,
        reason: 'feed-not-live',
      };

      when('[t0] observed with target `enqueue` to a small bound', () => {
        const scene = useBeforeAll(async () => {
          const server = await genObserveServer({
            read: () => notLiveScreen,
          });
          const clone = genCountZeroClone();
          const timeoutMs = 800;
          const startedAt = Date.now();
          const { observation } = await getCloneSayObservation({
            repoPath: clone.actor.repoPath,
            clone,
            socketPath: server.socketPath,
            message: MESSAGE,
            baseline,
            target: 'enqueue',
            timeoutMs,
          });
          const elapsedMs = Date.now() - startedAt;
          await server.close();
          return { observation, elapsedMs, timeoutMs };
        });

        then(
          'the residual is the honest probe-blind degrade — a null screen, feed-not-live',
          () => {
            // this is the branch this case clamps: a probe-blind read never satisfies the
            // enqueue short-circuit (its screen is null, not the enqueued shape), so the loop
            // polls to the bound and hands back the null-screen residual `unreadable` rests
            // on (V7) — never a false `absent` read off a blank grid
            expect(scene.observation.transcriptRose).toBe(false);
            expect(scene.observation.screen).toBeNull();
            expect(scene.observation.probeReason).toEqual('feed-not-live');
          },
        );

        then('it polls to the bound rather than short-circuits early', () => {
          expect(scene.elapsedMs).toBeGreaterThanOrEqual(scene.timeoutMs);
        });
      });
    },
  );
});
