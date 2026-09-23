import { MalfunctionError } from 'helpful-errors';
import { createServer, type Server, type Socket } from 'net';
import { given, then, useBeforeAll, useThen, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { getCloneSocketPath } from '../getCloneSocketPath';
import { sayClone } from './sayClone';

/**
 * .what = clamps that a corrupt ack line surfaces as a classed error on sayClone's
 *   awaited promise, never an uncaught crash + an unresolved promise
 * .why = sayClone's onFrame parses the ack inside the exchange's socket data handler.
 *   asCloneDispatchAck throws a MalfunctionError on a bad json / unknown-phase line, and
 *   an uncaught throw in that emitter callback kills the process and never settles the
 *   caller's promise (r001-i009-b1). the fix routes the parse throw to `fail`, the same
 *   shape the get twin uses (getCloneInputState). this is the RED-before / GREEN-after
 */
/**
 * .what = a raw unix server on a real clone socket path, plus a teardown that DESTROYS every
 *   connection it accepted before it closes
 * .why = 🔴 `net.Server.close()` stops new accepts and then waits for every extant connection to
 *   end, so a scene whose handler never ends its socket hangs its own `afterAll` forever. measured
 *   2026-09-18: the silent-peer case held its connection open, `close()` never resolved, and jest
 *   killed the suite at its 180s hook bound — 6 green assertions reported as a failed suite, a
 *   symptom two hops from its cause. to destroy the sockets makes the teardown deterministic
 *   whatever the handler does, so a future case cannot re-introduce the hang.
 * .note = it takes the connection handler, so each case declares only the BEHAVIOR under test —
 *   the lifecycle is shared rather than copied three ways (`rule.require.shared-test-fixtures`)
 */
const genRawCloneServer = async (input: {
  onConnect: (socket: Socket) => void;
}): Promise<{ socketPath: string; close: () => Promise<void> }> => {
  const socketPath = getCloneSocketPath({ serial: getUuid() })!;
  // .note = deliberate mutation — the accepted sockets, so teardown can end each one
  const accepted: Socket[] = [];
  const server: Server = createServer((socket) => {
    accepted.push(socket);
    input.onConnect(socket);
  });
  await new Promise<void>((done) => server.listen(socketPath, done));
  return {
    socketPath,
    close: async () => {
      for (const socket of accepted) socket.destroy();
      await new Promise<void>((done) => server.close(() => done()));
    },
  };
};

describe('sayClone.integration', () => {
  given(
    '[case1] a LIVE server that replies with a corrupt, un-parseable ack frame',
    () => {
      // a raw socket that answers every request with a non-json line. asCloneDispatchAck
      // throws a MalfunctionError on it. RED before the fix: the throw escapes onFrame into
      // the exchange's data handler, crashes uncaught, and sayClone's promise never settles.
      // GREEN after: onFrame routes the throw to `fail`, so the promise rejects with the class
      const scene = useBeforeAll(async () =>
        genRawCloneServer({
          onConnect: (socket) =>
            socket.on('data', () => socket.write('this-is-not-json\n')),
        }),
      );
      afterAll(async () => scene.close());

      when('[t0] a message is dispatched', () => {
        // compute the discriminant INSIDE the async and return primitives — a useThen proxy
        // is itself an Object, so a `toBeInstanceOf` on the proxy reads its own constructor,
        // never the resolved value's. so the `instanceof` check runs here, error in hand
        const outcome = useThen(
          'the dispatch rejects rather than hangs',
          async () => {
            try {
              await sayClone({
                socketPath: scene.socketPath,
                message: 'poke',
                connectTimeoutMs: 2000,
                wedgedTimeoutMs: 2000,
              });
              return { threw: false, isMalfunction: false };
            } catch (error) {
              return {
                threw: true,
                isMalfunction: error instanceof MalfunctionError,
              };
            }
          },
        );

        then(
          'the corrupt-ack fault propagates as a classed error, never an unresolved promise',
          () => {
            expect(outcome.threw).toEqual(true);
            expect(outcome.isMalfunction).toEqual(true);
          },
        );
      });
    },
  );

  /**
   * .what = clamps that a WEDGE report names WHICH silence it was — a peer that never acked at
   *   all, against a peer that acked `queued` and then went quiet
   * .why = 🔴 the two have opposite causes and send a reader to opposite halves of the system:
   *   an empty trail means the request was never dequeued (look at the accept path); a
   *   `['queued']` trail means it WAS dequeued and the dequeue then stalled (look at the
   *   pre-check, the write, or the event loop). measured 2026-09-18: a joker turn wedged at 30s
   *   with its marker LANDED on the brain, and the report carried `wedgedMs` alone — so which
   *   half to read had to be guessed (`rule.forbid.mechanism-inferred-from-outcome`).
   * .note = the two cases are asserted as ONE object each, so a failure names the trail it read
   *   rather than only that a number differed (`rule.require.failloud`)
   */
  given('[case2] a LIVE server that accepts and never acks at all', () => {
    const scene = useBeforeAll(async () =>
      // it accepts and answers with no frame at all — the accept-path silence
      genRawCloneServer({ onConnect: () => undefined }),
    );
    afterAll(async () => scene.close());

    when('[t0] a message is dispatched and the window elapses', () => {
      const outcome = useThen('the dispatch wedges', async () => {
        try {
          await sayClone({
            socketPath: scene.socketPath,
            message: 'poke',
            connectTimeoutMs: 2000,
            wedgedTimeoutMs: 1000,
          });
          return { threw: false, metadata: {} as Record<string, unknown> };
        } catch (error) {
          return {
            threw: true,
            metadata:
              error instanceof MalfunctionError
                ? (error.metadata as Record<string, unknown>)
                : {},
          };
        }
      });

      then('the wedge report names an EMPTY ack trail', () => {
        expect({
          threw: outcome.threw,
          reachCause: outcome.metadata.reachCause,
          acksSeen: outcome.metadata.acksSeen,
          // the silence is measured from the connect, since no ack ever re-armed the clock
          silentAtLeastTheWindow:
            typeof outcome.metadata.silentMs === 'number' &&
            outcome.metadata.silentMs >= 1000,
        }).toEqual({
          threw: true,
          reachCause: 'wedged',
          acksSeen: [],
          silentAtLeastTheWindow: true,
        });
      });
    });
  });

  given(
    '[case3] a LIVE server that acks `queued` and then goes silent for good',
    () => {
      const scene = useBeforeAll(async () =>
        // it acks the in-flight phase and never settles — the DEQUEUE-side silence. this is the
        // shape a stalled daemon presents, and the one an empty trail must not be confused with
        genRawCloneServer({
          onConnect: (socket) =>
            socket.on('data', () =>
              socket.write(`${JSON.stringify({ phase: 'queued' })}\n`),
            ),
        }),
      );
      afterAll(async () => scene.close());

      when(
        '[t0] a message is dispatched and the re-armed window elapses',
        () => {
          const outcome = useThen('the dispatch wedges', async () => {
            try {
              await sayClone({
                socketPath: scene.socketPath,
                message: 'poke',
                connectTimeoutMs: 2000,
                wedgedTimeoutMs: 1000,
              });
              return { threw: false, metadata: {} as Record<string, unknown> };
            } catch (error) {
              return {
                threw: true,
                metadata:
                  error instanceof MalfunctionError
                    ? (error.metadata as Record<string, unknown>)
                    : {},
              };
            }
          });

          then('the wedge report names the `queued` ack it did receive', () => {
            expect({
              threw: outcome.threw,
              reachCause: outcome.metadata.reachCause,
              acksSeen: outcome.metadata.acksSeen,
            }).toEqual({
              threw: true,
              reachCause: 'wedged',
              acksSeen: ['queued'],
            });
          });
        },
      );
    },
  );
});
