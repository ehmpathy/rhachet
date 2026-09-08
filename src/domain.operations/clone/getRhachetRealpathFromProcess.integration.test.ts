import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { spawnSync } from 'node:child_process';
import { existsSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { getRhachetRealpathFromProcess } from './getRhachetRealpathFromProcess';

/**
 * .what = the path to tsx's own cli entry, inside the tsx WE depend on
 *
 * .why  = `npx tsx` is a PATH lookup with a network fallback, so `[case2]`'s child
 *   would be non-deterministic on a cold or offline host. this names the entry off the
 *   package we already declare, so no registry read is possible
 *
 * .note = it throws rather than falls back to `npx` (`rule.forbid.failhide`)
 */
const getTsxCliPath = (): string => {
  const cli = join(
    dirname(require.resolve('tsx/package.json')),
    'dist/cli.mjs',
  );
  if (!existsSync(cli))
    ConstraintError.throw('tsx cli is absent from node_modules', {
      expectedAt: cli,
      hint: 'this clamp runs its probe through our own tsx rather than `npx tsx`, so tsx must be installed; run `pnpm install`',
    });
  return cli;
};

/**
 * .what = clamps `getRhachetRealpathFromProcess`, the ambient read that feeds the
 *   stale-store escape in `asCloneSocketOmissionReasonError`'s MalfunctionError row
 *
 * .why  = the datum exists for exactly ONE condition: a rhachet reached THROUGH A
 *   SYMLINK, so the path a human compares against their package manager's global
 *   root is the real one rather than the link
 *
 * ⚠️ under jest `__filename` is never a symlink, so `realpathSync` does no work and
 *   every `[case1]` row stays green with the call REMOVED. `[case2]` is the only case
 *   that carries the claim, and it is why this file spawns a child at all
 */
describe('getRhachetRealpathFromProcess.integration', () => {
  given('[case1] the module loaded in-process, by jest', () => {
    when('[t0] the realpath is read', () => {
      then('it returns an absolute path present on disk', () => {
        const path = getRhachetRealpathFromProcess()!;
        expect(isAbsolute(path)).toEqual(true);
        expect(existsSync(path)).toEqual(true);
      });

      then('it returns THIS module, never a neighbor', () => {
        expect(getRhachetRealpathFromProcess()).toContain(
          'getRhachetRealpathFromProcess',
        );
      });

      then('the path it returns is already fully resolved', () => {
        // a realpath of a realpath is the same path; a partly-expanded return
        // would differ here
        const path = getRhachetRealpathFromProcess()!;
        expect(realpathSync(path)).toEqual(path);
      });
    });
  });

  given('[case1b] a filesystem on which the realpath read FAILS', () => {
    when('[t0] the read throws', () => {
      then('it yields NULL — it must never destroy its caller`s report', () => {
        // 🚨 this read is INLINE while `asCloneSocketOmissionReasonError` constructs the
        //   classified socket report, so a throw here means the report is never
        //   built at all: a bare fs error propagates and the human reads a raw stack
        //   trace instead of the report
        //
        // ⚠️ the fixture carries `errno` as well as `code`, because that is the shape
        //   node raises — `uvException` stamps both. `code` alone is a shape the
        //   filesystem never produces, so it would agree with a predicate that reads
        //   `code`; `[case1c]` drives the real thing
        const read = (): string => {
          throw Object.assign(new Error('ENOENT: no such file or directory'), {
            code: 'ENOENT',
            errno: -2,
            syscall: 'lstat',
          });
        };
        expect(getRhachetRealpathFromProcess({ read })).toEqual(null);
      });

      then('a DEFECT is rethrown — only the filesystem earns a null', () => {
        // 🚨 the allowlist half of `rule.forbid.failhide`. an error with no errno
        //   did not come from the filesystem, so a `null` would report "the path is
        //   unreadable" about a host whose path is fine
        const read = (): string => {
          throw new TypeError('read is not a function');
        };
        expect(() => getRhachetRealpathFromProcess({ read })).toThrow(
          TypeError,
        );
      });

      then('a NON-throw read is still returned untouched', () => {
        // the guard must not swallow the happy path with the sad one
        expect(
          getRhachetRealpathFromProcess({ read: () => '/real/rhachet.js' }),
        ).toEqual('/real/rhachet.js');
      });
    });
  });

  /**
   * .what = the allowlist's OWN boundary — which error shapes earn a `null`, measured
   *   against node's real errors rather than against a memory of them
   *
   * ⚠️ the shape that parts the two families is an error WITH a string code and NO
   *   errno: node's whole `ERR_*` family. it must be rethrown, never nulled — a
   *   `null` there is a fabricated admission about a host whose path is fine
   *   (`rule.forbid.failhide`). a bare `TypeError` carries no code, so it never
   *   reaches that boundary
   *
   * .note = the fs rows call the REAL filesystem rather than a synthetic errno, so
   *   they measure that node does stamp a numeric `errno` on an fs fault. a hand-built
   *   `{ code, errno }` would assert only that this file agrees with itself. paths
   *   derive from `__dirname`, so they do not move with the cwd
   *   (`rule.require.hermetic-tests`).
   */
  given('[case1c] errors that carry a CODE but no errno', () => {
    when('[t0] a real filesystem fault is raised', () => {
      then('an ENOENT yields null', () => {
        const absent = join(__dirname, 'nonexistent-xyz');
        expect(
          getRhachetRealpathFromProcess({ read: () => realpathSync(absent) }),
        ).toEqual(null);
      });

      then('an ENOTDIR yields null — an errno the old list never named', () => {
        // a file treated as a directory — a second errno, so the guard is a SHAPE
        // rather than an enumeration of ENOENT/EACCES
        const throughFile = join(__filename, 'nope');
        expect(
          getRhachetRealpathFromProcess({
            read: () => realpathSync(throughFile),
          }),
        ).toEqual(null);
      });

      then('the fs faults above really do carry a numeric errno', () => {
        // the premise the predicate rests on, asserted rather than assumed: if node
        // stopped to stamp `errno`, every row above would pass for the wrong reason
        const absent = join(__dirname, 'nonexistent-xyz');
        const error = (() => {
          try {
            realpathSync(absent);
            return null;
          } catch (caught) {
            return caught as NodeJS.ErrnoException;
          }
        })();
        expect(typeof error?.errno).toEqual('number');
        expect(error?.code).toEqual('ENOENT');
      });

      then(
        'a real fs fault is a plain object, NOT an `instanceof Error`',
        () => {
          // 🚨 a fact about the HARNESS rather than about node. jest loads `node:fs`
          //   outside the vm context it runs this file in, so an error the filesystem
          //   raises is an instance of the OUTER realm's `Error`. an `instanceof
          //   Error` in the guard is therefore FALSE for the one input the guard
          //   exists to catch — it holds in prod and breaks under every harness that
          //   does not share a realm
          const absent = join(__dirname, 'nonexistent-xyz');
          const error = (() => {
            try {
              realpathSync(absent);
              return null;
            } catch (caught) {
              return caught;
            }
          })();
          expect(error instanceof Error).toEqual(false);
          expect(Object.prototype.toString.call(error)).toEqual(
            '[object Error]',
          );
        },
      );
    });

    when('[t1] a coded DEFECT is raised, with no errno', () => {
      then('an ERR_* from node itself is RETHROWN, never nulled', () => {
        // 🚨 a NUL byte is rejected by node's own argument checks before any syscall
        //   — `ERR_INVALID_ARG_VALUE`, a string `code` with no errno. the mutation
        //   that reddens this: the predicate back to `typeof code === 'string'`
        //
        // ⚠️ a NUL byte, never the obvious `realpathSync(123)`: node COERCES the
        //   number and runs a real `lstat '123'`, so it raises ENOENT — an fs fault,
        //   the opposite of what this row is for
        const read = (): string => realpathSync('\0') as string;
        expect(() => getRhachetRealpathFromProcess({ read })).toThrow(
          /ERR_INVALID_ARG_VALUE|null bytes/,
        );
      });

      then('the ERR_* above really does lack an errno', () => {
        // the other half of the premise: the family this guard must NOT catch is
        // parted from the fs family by exactly this field
        const error = (() => {
          try {
            realpathSync('\0');
            return null;
          } catch (caught) {
            return caught as NodeJS.ErrnoException;
          }
        })();
        expect(error?.code).toEqual('ERR_INVALID_ARG_VALUE');
        expect(typeof error?.errno).not.toEqual('number');
      });

      then('a coded error from an INJECTED reader is rethrown too', () => {
        // `read` is injectable, so a caller's own coded defect must not reach the
        // human as a diagnosis about their filesystem
        const read = (): string => {
          throw Object.assign(new Error('reader misconfigured'), {
            code: 'ERR_INVALID_STATE',
          });
        };
        expect(() => getRhachetRealpathFromProcess({ read })).toThrow(
          'reader misconfigured',
        );
      });
    });
  });

  /**
   * .what = the symlink-follow half — the branch the stale-store hint exists for
   *
   * .how  = a temp dir holds a symlink to the real source dir, and a probe imports
   *   the module THROUGH that link
   *
   * ⚠️ `NODE_OPTIONS=--preserve-symlinks` is what gives the case teeth: without it
   *   node canonicalizes the specifier itself, so `__filename` arrives already-real,
   *   `realpathSync` is a no-op, and a REMOVED call grades green. with it,
   *   `__filename` IS the linked path, so the call is the only step that can produce
   *   the real one
   */
  given('[case2] the module reached through a symlinked directory', () => {
    const scene = useBeforeAll(async () => {
      const realDir = __dirname;
      const realModule = realpathSync(
        join(realDir, 'getRhachetRealpathFromProcess.ts'),
      );

      const base = genTempDir({ slug: 'getRhachetRealpath-symlink' });
      const linkDir = join(base, 'linked-clone');
      symlinkSync(realDir, linkDir);

      const probe = join(base, 'probe.ts');
      writeFileSync(
        probe,
        [
          `import { getRhachetRealpathFromProcess } from '${linkDir}/getRhachetRealpathFromProcess';`,
          'process.stdout.write(getRhachetRealpathFromProcess());',
        ].join('\n'),
      );

      // 🚨 tsx is looked up in OUR OWN tree, never invoked as `npx tsx`: `npx` FALLS
      //   BACK TO A NETWORK FETCH when the name is absent locally, so the decisive row
      //   below could fail — or hang to its bound — for a cause with no relation to the
      //   code under test (`rule.require.hermetic-tests`)
      const result = spawnSync(process.execPath, [getTsxCliPath(), probe], {
        encoding: 'utf-8',
        cwd: base,
        env: { ...process.env, NODE_OPTIONS: '--preserve-symlinks' },
        timeout: 120_000,
      });

      return { realModule, linkDir, result };
    });

    when('[t0] the probe reports the path', () => {
      then('the probe ran clean', () => {
        expect(scene.result.status).toEqual(0);
      });

      then('it returns the REAL path, never the symlinked one', () => {
        expect(scene.result.stdout.trim()).toEqual(scene.realModule);
      });

      then('the link hop is absent from the reported path', () => {
        // 🚨 the assertion with teeth: drop `realpathSync` and the probe reports
        // the linked path, so this row reddens while every [case1] row stays green
        expect(scene.result.stdout.trim()).not.toContain('linked-clone');
      });
    });
  });
});
