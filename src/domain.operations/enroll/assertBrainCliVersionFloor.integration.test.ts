import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { genTempDir, getError, given, then, when } from 'test-fns';

import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertBrainCliVersionFloor } from './assertBrainCliVersionFloor';

/**
 * .what = write a `claude` shim whose body is the given bash lines, return an env
 *   whose PATH finds it first
 */
const genShimEnv = (input: {
  dir: string;
  body: string;
}): NodeJS.ProcessEnv => {
  const binDir = join(input.dir, '.stub-bin');
  mkdirSync(binDir, { recursive: true });
  const shimPath = join(binDir, 'claude');
  writeFileSync(shimPath, `#!/usr/bin/env bash\n${input.body}\n`, 'utf-8');
  chmodSync(shimPath, 0o755);
  return { ...process.env, PATH: `${binDir}:/usr/bin:/bin` };
};

describe('assertBrainCliVersionFloor', () => {
  given('[case1] a brain-cli at the floor', () => {
    when('[t0] the floor is asserted', () => {
      then('it passes and returns the version', () => {
        const dir = genTempDir({ slug: 'version-floor-at' });
        const env = genShimEnv({ dir, body: 'echo "2.1.277 (Claude Code)"' });
        expect(
          assertBrainCliVersionFloor({
            bin: 'claude',
            env,
            onAbsent: 'refuse',
          }),
        ).toEqual({
          version: { major: 2, minor: 1, patch: 277 },
        });
      });
    });
  });

  given('[case2] a brain-cli above the floor', () => {
    when('[t0] the floor is asserted', () => {
      then('it passes', () => {
        const dir = genTempDir({ slug: 'version-floor-above' });
        const env = genShimEnv({ dir, body: 'echo "2.1.279 (Claude Code)"' });
        expect(
          assertBrainCliVersionFloor({ bin: 'claude', env, onAbsent: 'refuse' })
            .version?.patch,
        ).toEqual(279);
      });
    });
  });

  given('[case3] a brain-cli one patch below the floor', () => {
    when('[t0] the floor is asserted', () => {
      then(
        'a ConstraintError names the binary, version, floor and fix',
        async () => {
          const dir = genTempDir({ slug: 'version-floor-below' });
          const env = genShimEnv({ dir, body: 'echo "2.1.276 (Claude Code)"' });
          const error = await getError(() =>
            assertBrainCliVersionFloor({
              bin: 'claude',
              env,
              onAbsent: 'refuse',
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain("'claude'");
          expect(error.message).toContain('2.1.276');
          expect(error.message).toContain('2.1.277');
          expect(error.message).toContain('claude update');
        },
      );
    });

    when('[t1] the floor is asserted with onAbsent=permit', () => {
      then('it still refuses — only ABSENCE is permitted', async () => {
        const dir = genTempDir({ slug: 'version-floor-below-permit' });
        const env = genShimEnv({ dir, body: 'echo "2.1.276 (Claude Code)"' });
        const error = await getError(() =>
          assertBrainCliVersionFloor({
            bin: 'claude',
            env,
            onAbsent: 'permit',
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('2.1.276');
        expect(error.message).toContain('2.1.277');
      });
    });
  });

  given(
    '[case3b] TWO claudes on PATH — an under-floor shim wins, a newer one sits behind it',
    () => {
      /**
       * .what = the measured failure from vision case 3: a pnpm shim at 2.1.87 wins
       *   PATH while a newer 2.1.278 sits behind it
       */
      const genTwoBinaryEnv = (input: {
        dir: string;
        winnerVersion: string;
        shadowedVersion: string;
      }): { env: NodeJS.ProcessEnv; winner: string; shadowed: string } => {
        const winnerDir = join(input.dir, '.bin-winner');
        const shadowedDir = join(input.dir, '.bin-shadowed');
        mkdirSync(winnerDir, { recursive: true });
        mkdirSync(shadowedDir, { recursive: true });

        const winner = join(winnerDir, 'claude');
        const shadowed = join(shadowedDir, 'claude');
        writeFileSync(
          winner,
          `#!/usr/bin/env bash\necho "${input.winnerVersion} (Claude Code)"\n`,
          'utf-8',
        );
        writeFileSync(
          shadowed,
          `#!/usr/bin/env bash\necho "${input.shadowedVersion} (Claude Code)"\n`,
          'utf-8',
        );
        chmodSync(winner, 0o755);
        chmodSync(shadowed, 0o755);

        return {
          env: {
            ...process.env,
            PATH: `${winnerDir}:${shadowedDir}:/usr/bin:/bin`,
          },
          winner,
          shadowed,
        };
      };

      when('[t0] the floor is asserted', () => {
        then(
          'the refusal names the resolved PATH of the one it found',
          async () => {
            const dir = genTempDir({ slug: 'version-floor-two-found' });
            const { env, winner } = genTwoBinaryEnv({
              dir,
              winnerVersion: '2.1.87',
              shadowedVersion: '2.1.278',
            });
            const error = await getError(() =>
              assertBrainCliVersionFloor({
                bin: 'claude',
                env,
                onAbsent: 'refuse',
              }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain('2.1.87');
            expect(error.message).toContain(winner);
          },
        );
      });

      when(
        '[t1] a SECOND, newer claude exists elsewhere on the machine',
        () => {
          then(
            'the refusal names that path and its version, and which one wins PATH',
            async () => {
              const dir = genTempDir({ slug: 'version-floor-two-shadowed' });
              const { env, winner, shadowed } = genTwoBinaryEnv({
                dir,
                winnerVersion: '2.1.87',
                shadowedVersion: '2.1.278',
              });
              const error = await getError(() =>
                assertBrainCliVersionFloor({
                  bin: 'claude',
                  env,
                  onAbsent: 'refuse',
                }),
              );
              expect(error).toBeInstanceOf(ConstraintError);

              // the newer one, by path and by version
              expect(error.message).toContain(shadowed);
              expect(error.message).toContain('2.1.278');

              // and which of the two wins PATH
              expect(error.message).toContain('wins your PATH');
              expect(error.message).toContain(winner);
            },
          );
        },
      );

      when('[t2] the only other claude is ALSO below the floor', () => {
        then(
          'it is still reported, and the hint stays the plain upgrade',
          async () => {
            const dir = genTempDir({ slug: 'version-floor-two-both-below' });
            const { env, shadowed } = genTwoBinaryEnv({
              dir,
              winnerVersion: '2.1.87',
              shadowedVersion: '2.1.100',
            });
            const error = await getError(() =>
              assertBrainCliVersionFloor({
                bin: 'claude',
                env,
                onAbsent: 'refuse',
              }),
            );
            expect(error).toBeInstanceOf(ConstraintError);

            // presence is half the signal, so a below-floor peer is still named
            expect(error.message).toContain(shadowed);
            expect(error.message).toContain('2.1.100');

            // but no peer clears the floor, so there is no PATH-order remedy to offer
            expect(error.message).not.toContain('wins your PATH');
            expect(error.message).toContain('claude update');
          },
        );
      });
    },
  );

  given('[case4] a brain-cli absent from PATH', () => {
    when('[t0] the floor is asserted with onAbsent=refuse', () => {
      then('a ConstraintError names the install command', async () => {
        const dir = genTempDir({ slug: 'version-floor-absent' });
        const env = genShimEnv({ dir, body: 'echo "2.1.277"' });
        const error = await getError(() =>
          assertBrainCliVersionFloor({
            bin: 'claude-absent-from-path',
            env,
            onAbsent: 'refuse',
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('not found on PATH');
        expect(error.message).toContain(
          'pnpm add -g @anthropic-ai/claude-code',
        );
      });
    });

    when('[t1] the floor is asserted with onAbsent=permit', () => {
      then('it passes with a null version — the floor binds no reader', () => {
        const dir = genTempDir({ slug: 'version-floor-absent-permit' });
        const env = genShimEnv({ dir, body: 'echo "2.1.277"' });
        expect(
          assertBrainCliVersionFloor({
            bin: 'claude-absent-from-path',
            env,
            onAbsent: 'permit',
          }),
        ).toEqual({ version: null });
      });
    });
  });

  given('[case5] a probe that exits non-zero', () => {
    when('[t0] the floor is asserted', () => {
      then('a MalfunctionError names the binary and its stderr', async () => {
        const dir = genTempDir({ slug: 'version-floor-fails' });
        const env = genShimEnv({
          dir,
          body: 'echo "config corrupt" >&2\nexit 3',
        });
        const error = await getError(() =>
          assertBrainCliVersionFloor({
            bin: 'claude',
            env,
            onAbsent: 'refuse',
          }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain("'claude --version' failed");
        expect(error.message).toContain('config corrupt');
      });
    });

    when('[t1] the floor is asserted with onAbsent=permit', () => {
      then(
        'it still malfunctions — a faulted probe is no absence',
        async () => {
          const dir = genTempDir({ slug: 'version-floor-fails-permit' });
          const env = genShimEnv({
            dir,
            body: 'echo "config corrupt" >&2\nexit 3',
          });
          const error = await getError(() =>
            assertBrainCliVersionFloor({
              bin: 'claude',
              env,
              onAbsent: 'permit',
            }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain("'claude --version' failed");
        },
      );
    });
  });

  given('[case6] a probe whose output holds no clean version', () => {
    when('[t0] the floor is asserted', () => {
      then('a MalfunctionError quotes the output', async () => {
        const dir = genTempDir({ slug: 'version-floor-unparseable' });
        const env = genShimEnv({
          dir,
          body: 'echo "2.1.277-beta (Claude Code)"',
        });
        const error = await getError(() =>
          assertBrainCliVersionFloor({
            bin: 'claude',
            env,
            onAbsent: 'refuse',
          }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('2.1.277-beta (Claude Code)');
      });
    });
  });
});
