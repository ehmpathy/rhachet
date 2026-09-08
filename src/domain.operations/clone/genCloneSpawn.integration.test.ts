import { ConstraintError, MalfunctionError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';
import { getUuid } from 'uuid-fns';

import { genCloneSpawn } from './genCloneSpawn';
import { getCloneSocketPath } from './getCloneSocketPath';
import type { PtyCloneHost } from './pty/genBrainCliPtyClone';
import type { PtyModule } from './pty/getPtyModuleOrNull';
import { isPtyDeviceRefusedError } from './pty/isPtyDeviceRefusedError';
import { isCloneSocketBindFaultError } from './socket/isCloneSocketBindFaultError';

/**
 * .what = the two-allowlist catch in `genCloneSpawn` — which class each fault shape
 *   reaches a human as, and the gate that decides whether the pty branch is entered
 *
 * 🚨 .why it is its own file = the dispatch was exercised only TRANSITIVELY, through
 *   `genCloneOndisk` and `genBrainCliPtyClone`. so the row that mattered most — a throw
 *   that neither allowlist recognizes, which must propagate with its own stack — had no
 *   direct assertion, and `rule.forbid.failhide` names exactly that as the hazard.
 *
 * ⚠️ it is an integration test because the pty branch calls `delFileSync` on the socket
 *   path before it spawns — a filesystem boundary, so the unit tier is closed to it
 *   (`rule.forbid.unit.remote-boundaries`).
 *
 * ⚠️ the dogfood, with its reach stated (`rule.require.clamp-edge-cases`):
 *
 *   | mutation of the catch                 | this file |
 *   |---------------------------------------|-----------|
 *   | the bind allowlist is short-circuited  | 🔴 1 red — `[case1]`, the fault reaches a human unclassified |
 *   | the `neither → rethrow` guard is dropped | 🔴 2 red — `[case3]`, ours relabeled as the host's |
 *   | both restored                          | 🟢 8 green |
 */
describe('genCloneSpawn', () => {
  /**
   * .what = a pty whose `spawn` throws the given error, synchronously
   * .why = `genBrainCliPtyClone` wraps `pty.spawn` in no try/catch, so a throw here
   *   arrives at `genCloneSpawn`'s catch exactly as a real host refusal would
   */
  const genPtyThatThrows = (error: Error): PtyModule =>
    ({
      spawn: () => {
        throw error;
      },
    }) as unknown as PtyModule;

  const genErrnoError = (input: {
    message: string;
    code: string;
    syscall: string;
  }): Error => {
    const error = new Error(input.message) as NodeJS.ErrnoException;
    error.code = input.code;
    error.syscall = input.syscall;
    return error;
  };

  const host: PtyCloneHost = {
    writeOut: () => undefined,
    onIn: () => () => undefined,
    onResize: () => () => undefined,
    onSignal: () => () => undefined,
    size: () => ({ cols: 80, rows: 24 }),
    setRawMode: () => () => undefined,
  } as unknown as PtyCloneHost;

  const genSpawnInput = (input: { pty: PtyModule | null }) => {
    const serial = getUuid();
    return {
      command: process.execPath,
      args: ['-e', ''],
      cwd: genTempDir({ slug: `clonespawn-${serial}` }),
      serial,
      socketPath: getCloneSocketPath({ serial })!,
      socketEligible: true,
      pty: input.pty,
    };
  };

  given('[case1] a fault the SOCKET GATE raised — ours', () => {
    const scene = useBeforeAll(async () => ({
      error: await getError(
        genCloneSpawn(
          genSpawnInput({
            pty: genPtyThatThrows(
              genErrnoError({
                message:
                  'listen EADDRINUSE: address already in use /run/x.sock',
                code: 'EADDRINUSE',
                syscall: 'listen',
              }),
            ),
          }),
          { host },
        ),
      ),
    }));

    when('[t0] it escapes the guarded block', () => {
      then('it reaches a human as a malfunction — exit 1, ours to fix', () => {
        expect(scene.error).toBeInstanceOf(MalfunctionError);
      });
    });
  });

  given('[case2] a fault the HOST raised — a refused pty device', () => {
    const scene = useBeforeAll(async () => ({
      error: await getError(
        genCloneSpawn(
          genSpawnInput({
            pty: genPtyThatThrows(new Error('forkpty(3) failed.')),
          }),
          { host },
        ),
      ),
    }));

    when('[t0] it escapes the guarded block', () => {
      then(
        'it reaches a human as a constraint — exit 2, the caller amends',
        () => {
          expect(scene.error).toBeInstanceOf(ConstraintError);
        },
      );
    });
  });

  given('[case3] a throw that NEITHER allowlist recognizes', () => {
    // 🚨 the row the file exists for. a catch that relabeled this would name the wrong
    //   party in the one place a human reads
    const raw = new Error('a defect of ours with no marker at all');
    const scene = useBeforeAll(async () => ({
      error: await getError(
        genCloneSpawn(genSpawnInput({ pty: genPtyThatThrows(raw) }), { host }),
      ),
    }));

    when('[t0] it escapes the guarded block', () => {
      then('the SAME error propagates, unwrapped and unclassified', () => {
        expect(scene.error).toBe(raw);
      });

      then('it is neither of the two reported classes', () => {
        expect(scene.error).not.toBeInstanceOf(MalfunctionError);
        expect(scene.error).not.toBeInstanceOf(ConstraintError);
      });
    });
  });

  given('[case4] the docblock claims the two allowlists are DISJOINT', () => {
    // the claim is *by construction* — one reads node's structured `syscall`, the other
    // reads node-pty's prose — so their ORDER decides no outcome. a fixture that satisfied
    // both would make the order decide an outcome and silently void that claim
    const FIXTURES: Error[] = [
      genErrnoError({
        message: 'listen EADDRINUSE: address already in use /run/x.sock',
        code: 'EADDRINUSE',
        syscall: 'listen',
      }),
      genErrnoError({
        message: 'bind ENOENT: no such file or directory',
        code: 'ENOENT',
        syscall: 'bind',
      }),
      new Error('forkpty(3) failed.'),
      new Error('posix_openpt failed: Resource temporarily unavailable'),
      new Error('Cannot launch conpty'),
      new Error('a defect of ours with no marker at all'),
    ];

    when('[t0] every fixture is put to both classifiers', () => {
      then('no fixture satisfies both', () => {
        for (const error of FIXTURES)
          expect({
            message: error.message,
            both:
              isCloneSocketBindFaultError(error) &&
              isPtyDeviceRefusedError(error),
          }).toEqual({ message: error.message, both: false });
      });
    });
  });

  given(
    '[case5] the gate that decides whether the pty branch runs at all',
    () => {
      // all three must hold; any one absent means a PLAIN spawn, never a throw
      when('[t0] the addon is absent', () => {
        then('it spawns plain and the handle carries no socket', async () => {
          const clone = await genCloneSpawn(genSpawnInput({ pty: null }), {
            host,
          });
          expect(clone.socketPath).toBeNull();
          await clone.dispose();
        });
      });

      when('[t1] the caller gate cleared no socket', () => {
        then('it spawns plain even with the addon in hand', async () => {
          const clone = await genCloneSpawn(
            {
              ...genSpawnInput({
                pty: genPtyThatThrows(new Error('forkpty(3) failed.')),
              }),
              socketEligible: false,
            },
            { host },
          );
          expect(clone.socketPath).toBeNull();
          await clone.dispose();
        });
      });

      when('[t2] the host can name no socket path', () => {
        then('it spawns plain — the pty is never reached', async () => {
          const clone = await genCloneSpawn(
            {
              ...genSpawnInput({
                pty: genPtyThatThrows(new Error('forkpty(3) failed.')),
              }),
              socketPath: null,
            },
            { host },
          );
          expect(clone.socketPath).toBeNull();
          await clone.dispose();
        });
      });
    },
  );
});
