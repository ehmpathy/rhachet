import { createServer, type Server } from 'net';
import { given, then, useBeforeAll, useThen, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { getCloneSocketPath } from '../getCloneSocketPath';
import type { CloneScreenRead } from '../screen/genCloneScreenFeed';
import { CloneWireCorruptionError } from './CloneWireCorruptionError';
import { genCloneSocketServer } from './genCloneSocketServer';
import { getCloneInputStateOrBlind } from './getCloneInputStateOrBlind';

/**
 * .what = clamps that a probe fault degrades to a probe-blind reply rather than a throw
 * .why = the observe loop and the pre-dispatch baseline both reach this. a throw on either
 *   crashes a say whose message may have landed — the false-failure class this wish kills
 *   (r008-i004-b1). the dead-socket case is the clamp: getCloneInputState throws on a connect
 *   fault, so a bare probe there rejects; this wrapper must return the honest degrade instead
 */
describe('getCloneInputStateOrBlind.integration', () => {
  given('[case1] a socket path with no server behind it', () => {
    // a serial that was never bound — connectToClone faults, so getCloneInputState rejects.
    // RED before the wrapper: the probe throws. GREEN after: it degrades to probe-blind
    const socketPath = getCloneSocketPath({ serial: getUuid() })!;

    when('[t0] the input state is probed', () => {
      // clamp the trace so the transport degrade leaves a loud trail (rule.forbid.failhide),
      // captured here rather than spilled to the real stderr
      const traced: string[] = [];
      const reply = useThen('the probe resolves rather than throws', async () =>
        getCloneInputStateOrBlind({
          socketPath,
          message: 'poke',
          traceToStderr: (line) => traced.push(line),
        }),
      );

      then('it degrades to a probe-blind feed-not-live reply', () => {
        expect(reply.probe).toEqual('unsupported');
        if (reply.probe !== 'unsupported')
          throw new Error('expected an unsupported reply');
        expect(reply.reason).toEqual('feed-not-live');
      });

      then('the degrade is traced before it is returned, never silent', () => {
        expect(traced).toHaveLength(1);
        expect(traced[0]).toContain('feed-not-live');
      });
    });
  });

  given('[case2] a live server whose feed carries a classified screen', () => {
    const RULE = '─'.repeat(80);
    const ORBLIND_LINES = ['● prior turn', RULE, '❯ SENTINEL-orblind', RULE];
    const liveScreen: CloneScreenRead = {
      live: true,
      lines: ORBLIND_LINES,
      // every row BRIGHT — the box content counts as human work, so a `dirty` read is earned
      linesBright: ORBLIND_LINES,
      cursorX: 0,
      cursorY: 0,
      cols: 80,
      rows: 40,
    };
    const scene = useBeforeAll(async () => {
      const socketPath = getCloneSocketPath({ serial: getUuid() })!;
      const { ready, close } = genCloneSocketServer({
        socketPath,
        write: () => {},
        isBrainCliAlive: () => true,
        read: () => liveScreen,
        // a fixed injected screen has no async parse to drain, so the settle is a no-op here
        settle: async () => {},
      });
      await ready;
      return { socketPath, close };
    });
    afterAll(async () => scene.close());

    when('[t0] the input state is probed', () => {
      const reply = useThen('the probe resolves', async () =>
        getCloneInputStateOrBlind({
          socketPath: scene.socketPath,
          message: 'SENTINEL-orblind',
        }),
      );

      then('a healthy probe passes the capable reply through unchanged', () => {
        expect(reply.probe).toEqual('capable');
        if (reply.probe !== 'capable')
          throw new Error('expected a capable reply');
        expect(reply.state.focus).toEqual('input');
        expect(reply.state.countInInput).toEqual(1);
      });
    });
  });

  given(
    '[case3] a LIVE server that replies with a corrupt, un-parseable frame',
    () => {
      // a raw socket that answers every request with a non-json line. asCloneGetReply throws a
      // CloneWireCorruptionError on it — real wire corruption, not a transport hiccup. RED before
      // the fix: getCloneInputStateOrBlind's blanket catch folds it into a benign `feed-not-live`,
      // so the probe returns `unsupported` and a protocol defect hides forever (rule.forbid.failhide).
      // GREEN after: the wrapper re-throws the CloneWireCorruptionError, so corruption stays loud
      const scene = useBeforeAll(async () => {
        const socketPath = getCloneSocketPath({ serial: getUuid() })!;
        const server: Server = createServer((socket) => {
          socket.on('data', () => socket.write('this-is-not-json\n'));
        });
        await new Promise<void>((done) => server.listen(socketPath, done));
        return {
          socketPath,
          close: () => new Promise<void>((r) => server.close(() => r())),
        };
      });
      afterAll(async () => scene.close());

      when('[t0] the input state is probed', () => {
        // compute the discriminant INSIDE the async and return primitives — a useThen proxy is
        // itself an Object, so a `toBeInstanceOf` on the proxy reads its own constructor, never
        // the resolved value's. so the `instanceof` check runs here, where the real error is in hand
        const outcome = useThen(
          'the probe rejects rather than returns',
          async () => {
            try {
              await getCloneInputStateOrBlind({
                socketPath: scene.socketPath,
                message: 'poke',
              });
              return { threw: false, isWireCorruption: false };
            } catch (error) {
              return {
                threw: true,
                isWireCorruption: error instanceof CloneWireCorruptionError,
              };
            }
          },
        );

        then(
          'the wire-corruption fault propagates, never masked as probe-blind',
          () => {
            expect(outcome.threw).toEqual(true);
            expect(outcome.isWireCorruption).toEqual(true);
          },
        );
      });
    },
  );

  given('[case4] a LIVE server that accepts a probe but never replies', () => {
    // a raw socket that reads the request and stays silent. with `replyTimeoutMs` forwarded, the
    // probe times out at the bound and degrades probe-blind. RED before the r011-i007-n2 fix: the
    // wrapper dropped the timeout param, so the probe rode getCloneInputState's 5000ms reply
    // default and a poll cycle stalled far past its budget. GREEN after: the small bound is
    // honored, so the cycle degrades fast and the loop keeps its cadence
    const scene = useBeforeAll(async () => {
      const socketPath = getCloneSocketPath({ serial: getUuid() })!;
      const server: Server = createServer((socket) => {
        // hold the connection open, read the frame, reply never
        socket.on('data', () => {});
      });
      await new Promise<void>((done) => server.listen(socketPath, done));
      return {
        socketPath,
        close: () => new Promise<void>((r) => server.close(() => r())),
      };
    });
    afterAll(async () => scene.close());

    when('[t0] the input state is probed with a small replyTimeoutMs', () => {
      // the forwarded bound, referenced by BOTH the probe call and the elapsed assertion, so
      // the assertion is scale-tied to the bound under test rather than a decoupled magic 2000
      const forwardedBoundMs = 150;
      const outcome = useThen(
        'the probe resolves at the bound rather than the 5000ms default',
        async () => {
          const startedAt = Date.now();
          const reply = await getCloneInputStateOrBlind({
            socketPath: scene.socketPath,
            message: 'poke',
            replyTimeoutMs: forwardedBoundMs,
            // capture the degrade trace so it does not spill to the real stderr
            traceToStderr: () => undefined,
          });
          return {
            probe: reply.probe,
            reason: reply.probe === 'unsupported' ? reply.reason : null,
            elapsedMs: Date.now() - startedAt,
          };
        },
      );

      then('the forwarded bound degrades it probe-blind, fast', () => {
        expect(outcome.probe).toEqual('unsupported');
        expect(outcome.reason).toEqual('feed-not-live');
        // scale-tied to the forwarded bound (10x headroom for socket + parse overhead), which
        // also proves it rode the 150ms bound, never the 5000ms default the unforwarded probe takes
        expect(outcome.elapsedMs).toBeLessThan(forwardedBoundMs * 10);
      });
    });
  });
});
