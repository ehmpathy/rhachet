import { genTempDir, given, then, when } from 'test-fns';

import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getOneBootBudgetRung } from './getOneBootBudgetRung';

/**
 * .what = clamps the one decision requirement 8 turns on — refuse, or merely say
 * .why = `isBootSpecForeign` is clamped beside this file, and it answers a different question:
 *        *"who owns this spec?"*. this operation answers *"so what rung does a breach land on?"*,
 *        and the two arms it adds on top are its own — the budget short-circuit, and the
 *        ownership-to-rung mapping.
 *
 * 🔴 .why an integration tier: one arm lstats, driven by real files
 *   (`rule.forbid.unit.remote-boundaries`, `rule.forbid.integration.mocks`)
 */
describe('getOneBootBudgetRung (integration)', () => {
  const testDir = genTempDir({ slug: 'getOneBootBudgetRung' });

  /**
   * 🔴 .what = the short-circuit must return BEFORE the syscall, never merely before the halt
   * .why = an unbudgeted boot renders as it does today (requirement 4), with no lstat
   * .note = the spec's parent component is a regular file, so an lstat above the short-circuit
   *   raises `ENOTDIR` (`define.statsync-and-lstatsync-suppress-different-errnos`)
   */
  given(
    '[case1] a spec that declares NO budget, at an unstattable path',
    () => {
      // `role=guest` is written as a FILE, so the spec path below has a regular file as its
      // parent component — `lstatSync` raises `ENOTDIR`, which the suppression does not absorb
      const pathRoleAsFile = resolve(testDir, '.agent/repo=vendor/role=guest');
      const pathToSpec = resolve(pathRoleAsFile, 'boot.yml');

      when('[t0] the rung is read', () => {
        then('it is halt, and the filesystem was never touched', () => {
          mkdirSync(resolve(testDir, '.agent/repo=vendor'), {
            recursive: true,
          });
          writeFileSync(pathRoleAsFile, 'a file where a role dir would sit');

          // 🔴 it RETURNS rather than raises. a raise here is the lstat moved above the
          //    short-circuit — the edit requirement 4 forbids
          expect(
            getOneBootBudgetRung({ budget: null, pathToSpec, cwd: testDir }),
          ).toEqual('halt');
        });
      });
    },
  );

  /**
   * .what = an unbudgeted spec halts REGARDLESS of who owns it
   * .why = the two arms are ordered, and the order is a contract rather than a convenience: a
   *        spec with no cap has no breach to rung, so ownership cannot reach the answer. an
   *        `isForeign` test lifted above the budget check would warn here, and a warn on a
   *        boot that declared no budget is a line requirement 4 forbids outright.
   */
  given('[case1b] a FOREIGN spec that declares no budget', () => {
    const dirRole = resolve(testDir, '.agent/repo=vendor/role=tenant');
    const dirStore = resolve(testDir, 'store');
    const pathToSpec = resolve(dirRole, 'boot.yml');
    const pathToTarget = resolve(dirStore, 'tenant.boot.yml');

    when('[t0] the rung is read', () => {
      then('it HALTS — ownership does not reach an absent budget', () => {
        mkdirSync(dirRole, { recursive: true });
        mkdirSync(dirStore, { recursive: true });
        writeFileSync(pathToTarget, 'always:\n  briefs:\n    say: []\n');
        symlinkSync(pathToTarget, pathToSpec);

        expect(
          getOneBootBudgetRung({ budget: null, pathToSpec, cwd: testDir }),
        ).toEqual('halt');
      });
    });
  });

  given('[case2] a budgeted spec this repo OWNS', () => {
    const dirRole = resolve(testDir, '.agent/repo=.this/role=any');
    const pathToSpec = resolve(dirRole, 'boot.yml');

    when('[t0] the rung is read', () => {
      then('it HALTS — every remedy is theirs to take', () => {
        mkdirSync(dirRole, { recursive: true });
        writeFileSync(pathToSpec, 'budget:\n  tokens: 5000\n');

        expect(
          getOneBootBudgetRung({
            budget: { tokens: 5000 },
            pathToSpec,
            cwd: testDir,
          }),
        ).toEqual('halt');
      });
    });
  });

  given('[case3] a budgeted spec a linked role OWNS', () => {
    const dirRole = resolve(testDir, '.agent/repo=vendor/role=lodger');
    const dirStore = resolve(testDir, 'store');
    const pathToSpec = resolve(dirRole, 'boot.yml');
    const pathToTarget = resolve(dirStore, 'vendor.boot.yml');

    when('[t0] the rung is read', () => {
      then(
        'it WARNS — a halt would name a file the caller cannot write',
        () => {
          // 🔴 the whole of requirement 8, at the one line that decides it. a `halt` here stops a
          //    boot on five remedies that each need a write inside a version-pinned store
          mkdirSync(dirRole, { recursive: true });
          mkdirSync(dirStore, { recursive: true });
          writeFileSync(pathToTarget, 'budget:\n  tokens: 20\n');
          symlinkSync(pathToTarget, pathToSpec);

          expect(
            getOneBootBudgetRung({
              budget: { tokens: 20 },
              pathToSpec,
              cwd: testDir,
            }),
          ).toEqual('warn');
        },
      );
    });
  });

  given('[case4] a budgeted route manifest, symlinked within this repo', () => {
    const dirRoute = resolve(testDir, '.behavior/v2026_09_17.some-feature');
    const dirStore = resolve(testDir, 'store');
    const pathToSpec = resolve(dirRoute, 'boot.yml');
    const pathToTarget = resolve(dirStore, 'route.boot.yml');

    when('[t0] the rung is read', () => {
      then(
        'it HALTS — the symlink test is bounded to the role coordinate',
        () => {
          // 🔴 the cell a bare `isSymbolicLink()` gets wrong, carried up to the RUNG grain. this
          //    repo links within itself, so an unbounded test would downgrade the halt this repo
          //    owes its own route manifest into a warn nobody acts on
          mkdirSync(dirRoute, { recursive: true });
          mkdirSync(dirStore, { recursive: true });
          writeFileSync(pathToTarget, 'budget:\n  tokens: 5000\n');
          symlinkSync(pathToTarget, pathToSpec);

          expect(
            getOneBootBudgetRung({
              budget: { tokens: 5000 },
              pathToSpec,
              cwd: testDir,
            }),
          ).toEqual('halt');
        },
      );
    });
  });
});
