import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = acceptance tests for the two shell dispatchers — `bin/run`'s fast-path routing
 *         table, and `bin/rhx`'s short-circuit table
 * .why = a roles subcommand is registered on both the bun and jit entries, so a lost route
 *   falls through to jit and still works, only slower; the table is the contract
 */
describe('shell dispatch', () => {
  const PATH_BIN = resolve(__dirname, '../../bin');

  given('[case1] the roles fast-path routing table', () => {
    // a plain sync read: a `useBeforeAll` proxy does not coerce to a string inside a regex
    const dispatcher = readFileSync(resolve(PATH_BIN, 'run'), 'utf-8');

    when('[t0] read', () => {
      then('every fast-path roles subcommand is routed to run.bun', () => {
        // pin the dispatcher's roles route table
        const [, caseRoles] =
          /roles\)\s*\n\s*case "\$2" in\s*\n\s*([^)]+)\)/.exec(dispatcher) ?? [];
        expect(caseRoles).toBeDefined();
        expect(
          caseRoles!
            .split('|')
            .map((one) => one.trim())
            .sort(),
        ).toEqual(['boot', 'cost']);
      });

      then('the same two verbs are routed as TOP-LEVEL aliases', () => {
        // the alias set and the fast-path set are the same two verbs
        const [, caseAlias] =
          /\n\s{2}([a-z|]+)\)\s*\n\s*# the short alias/.exec(dispatcher) ?? [];
        expect(caseAlias).toBeDefined();
        expect(
          caseAlias!
            .split('|')
            .map((one) => one.trim())
            .sort(),
        ).toEqual(['boot', 'cost']);
      });
    });
  });

  given('[case2] the bun binary the route points at', () => {
    when('[t0] run.bun roles cost --help', () => {
      const result = useBeforeAll(async () =>
        spawnSync(resolve(PATH_BIN, 'run.bun'), ['roles', 'cost', '--help'], {
          encoding: 'utf-8',
        }),
      );

      then('it serves the command — the route leads somewhere real', () => {
        // .note = `run.bun` defers to jit for any command it does not know, so exit 0 alone
        //   does not prove the bun entry served it — the next assertion does
        expect(result.status).toEqual(0);
      });

      then('it is the BUN entry that answered, not a jit fallthrough', () => {
        // the bun roles entry (`invoke.bun.entry.roles.ts`) describes one command; jit, the whole cli
        expect(result.stdout).toContain('roles cost');
        expect(result.stdout).not.toContain('weave threads');
      });

      then('the help render matches its snapshot', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT; pins the help text itself
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-run-bun-roles-cost-help',
        );
      });
    });

    when('[t1] run.bun roles boot --help', () => {
      const result = useBeforeAll(async () =>
        spawnSync(resolve(PATH_BIN, 'run.bun'), ['roles', 'boot', '--help'], {
          encoding: 'utf-8',
        }),
      );

      then('it serves the command from the bun entry', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('roles boot');
        expect(result.stdout).not.toContain('weave threads');
      });

      then('it lists every option a caller may pass', () => {
        // the option contract this behavior changed: --manifest/--what, --subject, --if-present
        expect(result.stdout).toContain('--manifest, --what <path>');
        expect(result.stdout).toContain('--subject <slugs>');
        expect(result.stdout).toContain('--if-present');
      });

      then('the help render matches its snapshot', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT; pins the help text itself
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-run-bun-roles-boot-help',
        );
      });
    });
  });

  /**
   * .what = `rhx` proxies all it does not short-circuit to `run --skill`, so `boot` and `cost`
   *   need their own routes
   * .why = the over-budget halt names `rhx cost` as its remedy (`rule.require.errors-name-the-fix`)
   */
  given('[case3] the rhx alias table', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-registry' }),
    );

    when('[t0] rhx boot --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('it reaches roles boot, rather than a skill lookup', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('<stats>');
        expect(result.stderr).not.toContain('no skill');
      });

      then('the alias renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-rhx-boot-alias',
        );
      });
    });

    when('[t1] rhx cost --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['cost', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('it reaches roles cost, rather than a skill lookup', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('where the tokens go');
        expect(result.stderr).not.toContain('no skill');
      });

      then('the alias renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-rhx-cost-alias',
        );
      });
    });

    when('[t2] the long form, for comparison', () => {
      const resultAlias = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['cost', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );
      const resultLong = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('the alias and the long form emit ONE identical render', () => {
        // the alias splices the group back in, so it declares no second contract
        expect(resultAlias.stdout).toEqual(resultLong.stdout);
      });
    });
  });
});
