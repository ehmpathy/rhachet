import { getError, given, then, useThen, when } from 'test-fns';

import { genCloneEnrollDetached } from './genCloneEnrollDetached';

/**
 * .what = integration coverage for the detached-enroll host handshake
 * .why =
 *   - this operation is a COMMUNICATOR — it spawns a process and reads a line off its
 *     stdout — so it is graded at the integration grain against a real child, never with
 *     a mocked `spawn` (`rule.forbid.integration.mocks`)
 *   - 🔴 two of its four terminations have no coverage anywhere else in the repo. the
 *     acceptance suite drives a real `rhx enroll`, which only ever exercises the two
 *     HAPPY shapes: a host that reports an address, and a host that refuses with a
 *     non-zero code. a host that exits CLEAN with no address, and one that never answers
 *     at all, are reachable only from here
 *   - the seam that makes this testable is already in the contract: `execPath` + `argv`
 *     are inputs, so a bare `node -e` stands in for the host and no brain is spawned
 */
describe('genCloneEnrollDetached', () => {
  given('[case1] a host that prints a handoff line', () => {
    when('[t0] the caller awaits its address', () => {
      const result = useThen('it returns', async () =>
        genCloneEnrollDetached({
          execPath: process.execPath,
          argv: [
            '-e',
            `console.log(JSON.stringify({ outcome: 'baked', serial: 'abc', slug: null, socketEligible: true }))`,
          ],
          cwd: process.cwd(),
          timeoutMs: 20_000,
        }),
      );

      then(
        'the outcome is ADDRESSED and the line is handed back verbatim',
        () => {
          expect(result.outcome).toEqual('addressed');
          // the caller re-emits this line as-is for a json consumer, so a reshape here
          // would silently rewrite the machine contract
          if (result.outcome !== 'addressed') throw new Error('unreachable');
          expect(JSON.parse(result.handoff)).toEqual({
            outcome: 'baked',
            serial: 'abc',
            slug: null,
            socketEligible: true,
          });
        },
      );
    });
  });

  given('[case2] a host that REFUSES with a non-zero code', () => {
    // 🔴 the shape that carries the whole failhide cure. the host has already rendered
    //   its own cause on the stderr it inherited, so this must NOT throw — a throw makes
    //   the caller narrate a second error over the host's, and stderr then holds two json
    //   objects a machine can parse neither of
    when('[t0] the caller awaits its address', () => {
      const result = useThen('it returns rather than throws', async () =>
        genCloneEnrollDetached({
          execPath: process.execPath,
          argv: ['-e', 'process.exit(2)'],
          cwd: process.cwd(),
          timeoutMs: 20_000,
        }),
      );

      then('the outcome is SPOKE and it wears the host\u2019s code', () => {
        expect(result.outcome).toEqual('spoke');
        if (result.outcome !== 'spoke') throw new Error('unreachable');
        expect(result.code).toEqual(2);
      });
    });
  });

  given('[case3] a host that exits CLEAN having reported no address', () => {
    // nobody rendered a cause here — the host said naught and returned 0 — so this is the
    // ONLY account the caller will ever get. a silent success would report a clone that
    // was never stood up as a success (`rule.forbid.failhide`)
    when('[t0] the caller awaits its address', () => {
      // ⚠️ the error's fields are read INSIDE the callback and returned as a plain
      //   object. `useThen` hands back a proxy, and an Error's `message` is
      //   non-enumerable — a proxy read of it yields undefined, which would make every
      //   assertion here red by ABSENCE rather than by the behavior it grades
      const thrown = useThen('it throws', async () => {
        const error = await getError(
          genCloneEnrollDetached({
            execPath: process.execPath,
            argv: ['-e', 'process.exit(0)'],
            cwd: process.cwd(),
            timeoutMs: 20_000,
          }),
        );
        return {
          message: error.message,
          metadata: (
            error as unknown as { metadata: { hostExitCode: number | null } }
          ).metadata,
        };
      });

      then('it fails LOUD and names the cause', () => {
        expect(thrown.message).toContain(
          'exited before it reported an address',
        );
      });

      // 🔴 the field is `hostExitCode`, and the name is the whole point. under `code`
      //   this assertion read `undefined` — helpful-errors reserves that key, strips it
      //   from both the message and the `.metadata` getter, and re-reads it as the
      //   error's classification code. so the fact that distinguishes a clean 0 from a
      //   signal reached NO reader, and only a test that asked for it by name found out
      then(
        'the metadata carries the host exit code, so a reader can tell 0 from a signal',
        () => {
          expect(thrown.metadata.hostExitCode).toEqual(0);
        },
      );

      then('and it reaches the rendered message a human actually reads', () => {
        expect(thrown.message).toContain('hostExitCode');
      });
    });
  });

  given('[case4] a host that never answers at all', () => {
    // the bound exists so a host that hangs fails LOUD rather than hangs the caller it
    // was spawned to free. the child outlives the bound on purpose, then exits on its own
    when('[t0] the caller awaits past the bound', () => {
      // ⚠️ same proxy hazard as case3 — the error's fields are read INSIDE the
      //   callback, since a proxy read of a non-enumerable `message` yields undefined
      const thrown = useThen('it throws', async () => {
        const error = await getError(
          genCloneEnrollDetached({
            execPath: process.execPath,
            argv: ['-e', 'setTimeout(() => {}, 4000)'],
            cwd: process.cwd(),
            timeoutMs: 1_000,
          }),
        );
        return {
          message: error.message,
          metadata: (error as unknown as { metadata: { hint: string } })
            .metadata,
        };
      });

      then('it names the TIMEOUT, never a crash it did not observe', () => {
        expect(thrown.message).toContain('reported no address in time');
      });

      then('the hint says the host may still be alive', () => {
        expect(thrown.metadata.hint).toContain('clone list');
      });
    });
  });
});
