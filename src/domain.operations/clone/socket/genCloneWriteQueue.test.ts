import { given, then, useThen, when } from 'test-fns';

import { genCloneWriteQueue } from './genCloneWriteQueue';

/**
 * .what = enqueue N messages and await all their acks
 */
const enqueueAndSettle = (input: {
  messages: string[];
  maxDepth?: number;
}): Promise<{
  written: string[];
  phasesByMessage: Record<string, string[]>;
}> => {
  const written: string[] = [];
  const phasesByMessage: Record<string, string[]> = {};
  const queue = genCloneWriteQueue({
    write: (message) => {
      written.push(message);
    },
    maxDepth: input.maxDepth,
  });

  return new Promise((done) => {
    let settled = 0;
    const track = (message: string, phase: string): void => {
      phasesByMessage[message] ??= [];
      phasesByMessage[message]!.push(phase);
      if (phase === 'delivered' || phase === 'rejected') {
        settled += 1;
        if (settled === input.messages.length)
          done({ written, phasesByMessage });
      }
    };

    // a synchronous burst — all enqueue before the first tick processes
    input.messages.forEach((message) =>
      queue.enqueue({
        message,
        onQueued: () => track(message, 'queued'),
        onDelivered: () => track(message, 'delivered'),
        onRejected: () => track(message, 'rejected'),
      }),
    );
  });
};

describe('genCloneWriteQueue', () => {
  given('[case1] three messages enqueued in a burst', () => {
    const result = useThen('all settle', async () =>
      enqueueAndSettle({ messages: ['a', 'b', 'c'] }),
    );

    when('[t0] the queue drains', () => {
      then('they are written in FIFO order (no interleave)', () => {
        expect(result.written).toEqual(['a', 'b', 'c']);
      });

      then('each message is queued then delivered', () => {
        expect(result.phasesByMessage['a']).toEqual(['queued', 'delivered']);
        expect(result.phasesByMessage['c']).toEqual(['queued', 'delivered']);
      });
    });
  });

  given('[case2] a burst past the depth cap', () => {
    const result = useThen('all settle', async () =>
      enqueueAndSettle({
        messages: ['a', 'b', 'c', 'd', 'e'],
        maxDepth: 2,
      }),
    );

    when('[t0] the queue drains', () => {
      then('the overflow messages are rejected, not written', () => {
        // with cap 2, at most 2 sit in the queue at once through the sync burst;
        // the later enqueues past the cap are rejected
        const rejected = Object.entries(result.phasesByMessage)
          .filter(([, phases]) => phases.includes('rejected'))
          .map(([message]) => message);
        expect(rejected.length).toBeGreaterThan(0);
      });

      then('no rejected message was written to the child', () => {
        const rejected = Object.entries(result.phasesByMessage)
          .filter(([, phases]) => phases.includes('rejected'))
          .map(([message]) => message);
        rejected.forEach((message) =>
          expect(result.written).not.toContain(message),
        );
      });
    });
  });

  given('[case4] an ASYNC write (the real paste-then-submit sequence)', () => {
    // the real write is two pty writes with a delay between (paste, then submit a
    // tick later). the queue MUST await it: the next message's paste cannot begin
    // while the prior submit is still unresolved, or the two interleave in the child
    when('[t0] two messages are dispatched with a delayed async write', () => {
      then(
        'write N+1 begins only AFTER write N resolves, and each is FIFO',
        async () => {
          const events: string[] = [];
          const queue = genCloneWriteQueue({
            write: async (message) => {
              events.push(`start:${message}`);
              await new Promise<void>((r) => setTimeout(r, 20));
              events.push(`end:${message}`);
            },
          });

          await new Promise<void>((done) => {
            let settled = 0;
            const onSettle = (): void => {
              settled += 1;
              if (settled === 2) done();
            };
            ['a', 'b'].forEach((message) =>
              queue.enqueue({
                message,
                onQueued: () => undefined,
                onDelivered: onSettle,
                onRejected: onSettle,
              }),
            );
          });

          // strictly serialized: a fully starts+ends before b starts (no overlap)
          expect(events).toEqual(['start:a', 'end:a', 'start:b', 'end:b']);
        },
      );

      then(
        '`delivered` fires only AFTER the async write resolves',
        async () => {
          const order: string[] = [];
          const queue = genCloneWriteQueue({
            write: async () => {
              await new Promise<void>((r) => setTimeout(r, 20));
              order.push('write-resolved');
            },
          });

          await new Promise<void>((done) => {
            queue.enqueue({
              message: 'x',
              onQueued: () => undefined,
              onDelivered: () => {
                order.push('delivered');
                done();
              },
              onRejected: () => done(),
            });
          });

          expect(order).toEqual(['write-resolved', 'delivered']);
        },
      );
    });
  });

  given('[case3] drain rejects the queued backlog', () => {
    when('[t0] a message is enqueued then the queue is drained at once', () => {
      then('the queued message is rejected with the drain reason', async () => {
        const written: string[] = [];
        const queue = genCloneWriteQueue({
          write: (message) => {
            written.push(message);
          },
        });
        const reasons: string[] = [];
        queue.enqueue({
          message: 'x',
          onQueued: () => undefined,
          onDelivered: () => reasons.push('delivered'),
          onRejected: (reason) => reasons.push(reason),
        });
        // drain synchronously, before the setImmediate tick writes it
        queue.drain('clone exited');
        expect(reasons).toEqual(['clone exited']);
        expect(written).toEqual([]);
      });
    });
  });
});
