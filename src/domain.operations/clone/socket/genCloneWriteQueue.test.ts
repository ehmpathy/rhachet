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
    write: ({ message }) => {
      written.push(message);
      return { delivered: true };
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
        force: false,
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
            write: async ({ message }) => {
              events.push(`start:${message}`);
              await new Promise<void>((r) => setTimeout(r, 20));
              events.push(`end:${message}`);
              return { delivered: true };
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
                force: false,
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
              return { delivered: true };
            },
          });

          await new Promise<void>((done) => {
            queue.enqueue({
              message: 'x',
              force: false,
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
          write: ({ message }) => {
            written.push(message);
            return { delivered: true };
          },
        });
        const reasons: string[] = [];
        queue.enqueue({
          message: 'x',
          force: false,
          onQueued: () => undefined,
          onDelivered: () => reasons.push('delivered'),
          onRejected: (reason) => reasons.push(reason),
        });
        // drain synchronously, before the setImmediate tick writes it
        queue.drain('clone-drained');
        expect(reasons).toEqual(['clone-drained']);
        expect(written).toEqual([]);
      });
    });
  });

  given('[case5] the dequeue pre-check WITHHOLDS a write', () => {
    // the write no longer always reaches the pty: the server-side pre-check at dequeue
    // may refuse (a modal, an unrecognized screen, a dirty region). the queue routes the
    // withheld outcome to onRejected with the reason, and MUST proceed to the next message
    when('[t0] the first write withholds and the second delivers', () => {
      then(
        'the withheld message is rejected with its reason, and the queue keeps its drain (V15)',
        async () => {
          const written: string[] = [];
          const queue = genCloneWriteQueue({
            write: ({ message }) => {
              if (message === 'blocked')
                return {
                  delivered: false as const,
                  reason: 'modal-holds-focus' as const,
                };
              written.push(message);
              return { delivered: true as const };
            },
          });

          const phasesByMessage: Record<string, string[]> = {};
          await new Promise<void>((done) => {
            let settled = 0;
            const track = (message: string, phase: string): void => {
              phasesByMessage[message] ??= [];
              phasesByMessage[message]!.push(phase);
              // terminal = anything past `queued` (delivered, or a reject reason)
              if (phase !== 'queued') {
                settled += 1;
                if (settled === 2) done();
              }
            };
            ['blocked', 'after'].forEach((message) =>
              queue.enqueue({
                message,
                force: false,
                onQueued: () => track(message, 'queued'),
                onDelivered: () => track(message, 'delivered'),
                onRejected: (reason) => track(message, reason),
              }),
            );
          });

          // the withheld one carries its reason; the queue did NOT go deaf
          expect(phasesByMessage['blocked']).toEqual([
            'queued',
            'modal-holds-focus',
          ]);
          expect(phasesByMessage['after']).toEqual(['queued', 'delivered']);
          expect(written).toEqual(['after']);
        },
      );
    });
  });

  given('[case6] a write THROWS mid-dequeue (a pty fault)', () => {
    // V15 — a thrown write must still ack and release the drain latch, or the clone
    // goes deaf: a healthy-on-reach clone that never drains its queue again
    when('[t0] the first write throws and the second delivers', () => {
      then(
        'the thrown message is rejected as pty-write-fault, and the queue keeps its drain (V15)',
        async () => {
          const written: string[] = [];
          // clamp the trace so the fault leaves a loud trail (rule.forbid.failhide),
          // captured here rather than spilled to the real stderr
          const traced: string[] = [];
          const queue = genCloneWriteQueue({
            write: ({ message }) => {
              if (message === 'boom') throw new Error('pty write faulted');
              written.push(message);
              return { delivered: true as const };
            },
            traceToStderr: (line) => traced.push(line),
          });

          const phasesByMessage: Record<string, string[]> = {};
          await new Promise<void>((done) => {
            let settled = 0;
            const track = (message: string, phase: string): void => {
              phasesByMessage[message] ??= [];
              phasesByMessage[message]!.push(phase);
              // terminal = anything past `queued` (delivered, or a reject reason)
              if (phase !== 'queued') {
                settled += 1;
                if (settled === 2) done();
              }
            };
            ['boom', 'after'].forEach((message) =>
              queue.enqueue({
                message,
                force: false,
                onQueued: () => track(message, 'queued'),
                onDelivered: () => track(message, 'delivered'),
                onRejected: (reason) => track(message, reason),
              }),
            );
          });

          expect(phasesByMessage['boom']).toEqual([
            'queued',
            'pty-write-fault',
          ]);
          expect(phasesByMessage['after']).toEqual(['queued', 'delivered']);
          expect(written).toEqual(['after']);

          // the demote to the mildest slug did NOT swallow the real fault — it was
          // traced first, with the thrown message intact, so a defect surfaces
          expect(traced).toHaveLength(1);
          expect(traced[0]).toContain('pty-write-fault');
          expect(traced[0]).toContain('pty write faulted');
        },
      );
    });
  });

  given(
    '[case7] a write throws a CODE DEFECT (a TypeError, not a pty fault)',
    () => {
      // a JS-defect class (TypeError) is a bug in the write / pre-check path, never a pty
      // fault. V15 forbids a rethrow here (it would wedge the drain latch), so the defect
      // STILL demotes to pty-write-fault and the queue keeps its drain — but the trace is
      // DISTINGUISHED as a defect so a debugger cannot mistake it for a benign pty fault
      // (rule.forbid.failhide, r002-i010-n2). goes RED under the pre-fix code (a defect and
      // a pty fault shared the one mild trace line)
      when(
        '[t0] the first write throws a TypeError and the second delivers',
        () => {
          then(
            'the defect is demoted (V15) yet traced as a DEFECT, distinct from a pty fault',
            async () => {
              const written: string[] = [];
              const traced: string[] = [];
              const queue = genCloneWriteQueue({
                write: ({ message }) => {
                  if (message === 'boom')
                    // a genuine code bug, not a pty errno — the exact shape the mild
                    // pty-write-fault trace must not hide behind
                    throw new TypeError("cannot read 'x' of undefined");
                  written.push(message);
                  return { delivered: true as const };
                },
                traceToStderr: (line) => traced.push(line),
              });

              const phasesByMessage: Record<string, string[]> = {};
              await new Promise<void>((done) => {
                let settled = 0;
                const track = (message: string, phase: string): void => {
                  phasesByMessage[message] ??= [];
                  phasesByMessage[message]!.push(phase);
                  if (phase !== 'queued') {
                    settled += 1;
                    if (settled === 2) done();
                  }
                };
                ['boom', 'after'].forEach((message) =>
                  queue.enqueue({
                    message,
                    force: false,
                    onQueued: () => track(message, 'queued'),
                    onDelivered: () => track(message, 'delivered'),
                    onRejected: (reason) => track(message, reason),
                  }),
                );
              });

              // V15 holds — the defect still demotes and the latch releases, so the next
              // message delivers (the queue never goes deaf)
              expect(phasesByMessage['boom']).toEqual([
                'queued',
                'pty-write-fault',
              ]);
              expect(phasesByMessage['after']).toEqual(['queued', 'delivered']);
              expect(written).toEqual(['after']);

              // the trace is DISTINGUISHED — a defect line, never the mild pty-fault line
              expect(traced).toHaveLength(1);
              expect(traced[0]).toContain('DEFECT');
              expect(traced[0]).toContain("cannot read 'x' of undefined");
              // and it does NOT read as the benign pty fault the plain-Error path traces
              expect(traced[0]).not.toContain('re-enroll remedy');
            },
          );
        },
      );
    },
  );
});
