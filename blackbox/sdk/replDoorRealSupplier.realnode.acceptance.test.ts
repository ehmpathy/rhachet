import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { spawnProbeBetween } from '../.test/infra/spawnProbeBetween';

/**
 * .what = the repl spawn door against the REAL installed anthropic supplier: the env the
 *   agent-sdk hands the claude child carries the scoped depth, and a depth-1 caller is refused
 *   before the supplier is reached
 * .why = the supplier is an external contract: it spawns its brain with no `env` option, so the
 *   child boots with whatever the sdk copies from `process.env`. only the real supplier and the
 *   real sdk prove that copy falls inside the depth scope. the sdk is esm, which jest cannot
 *   load, so a real node child drives it (as the sibling `*.realnode.acceptance` suites do)
 * .note = the probe replaces `child_process.spawn` alone. it records the env the sdk passes to
 *   the claude child, then throws, so no brain boots and no token is spent. the recorded env is
 *   the exact env a real brain would read
 * .note = the probe reaches genContextBrain through the built `rhachet/brains` contract
 *   (dist/contract/sdk.brains.js), the file a consumer resolves (rule.require.acceptance.blackbox)
 * .note = the probe runs with piped stdio, so it has no tty: the depth var is what it reads, as
 *   a brain's tool shell does
 */
describe('replDoorRealSupplier.realnode.acceptance', () => {
  const brainsContractDistPath = join(
    __dirname,
    '..',
    '..',
    'dist',
    'contract',
    'sdk.brains.js',
  );
  const repoRoot = join(__dirname, '..', '..');
  const probePath = join(
    __dirname,
    '..',
    '.test',
    'infra',
    'probe.replDoorRealSupplier.cjs',
  );

  type DoorRun = {
    error: { name: string | null; message: string } | null;
    spawns: Array<{
      command: string;
      depth: string | null;
      serial: string | null;
      socket: string | null;
    }>;
    envAfter: {
      depth: string | null;
      serial: string | null;
      socket: string | null;
    };
  };

  given('[case1] the real anthropic repl, chosen through the contract', () => {
    const report = useBeforeAll(async () => {
      // the built artifact must exist; acceptance runs after `npm run build`
      if (!existsSync(brainsContractDistPath))
        throw new ConstraintError(
          'built contract dist sdk.brains.js absent — run `npm run build` first',
          {
            brainsContractDistPath,
            hint: 'run `npm run build` first, then re-run acceptance',
          },
        );

      return spawnProbeBetween<{
        choiceRepo: string | null;
        askAtDepth0: DoorRun;
        actAtDepth0: DoorRun;
        askAtDepth1: DoorRun;
        actAtDepth1: DoorRun;
      }>({
        args: [probePath, brainsContractDistPath],
        label: 'repl-door real-supplier',
        options: { cwd: repoRoot },
      });
    });

    then('the chosen repl is the real anthropic supplier', () => {
      expect(report.choiceRepo).toEqual('anthropic');
    });

    when('[t0] a depth-0 caller calls ask', () => {
      then('the sdk spawns exactly one claude child', () => {
        expect(report.askAtDepth0.spawns).toHaveLength(1);
      });

      then('the claude child reads depth 1', () => {
        expect(report.askAtDepth0.spawns[0]?.depth).toEqual('1');
      });

      then('the claude child holds no parent serial and no parent socket', () => {
        expect(report.askAtDepth0.spawns[0]?.serial).toEqual(null);
        expect(report.askAtDepth0.spawns[0]?.socket).toEqual(null);
      });

      then('the caller env is restored after the call', () => {
        expect(report.askAtDepth0.envAfter).toEqual({
          depth: '0',
          serial: 'serial-parent',
          socket: '/tmp/socket-parent',
        });
      });
    });

    when('[t1] a depth-0 caller calls act', () => {
      then('the claude child reads depth 1, with no parent serial', () => {
        expect(report.actAtDepth0.spawns).toHaveLength(1);
        expect(report.actAtDepth0.spawns[0]?.depth).toEqual('1');
        expect(report.actAtDepth0.spawns[0]?.serial).toEqual(null);
      });
    });

    when('[t2] a depth-1 caller calls ask', () => {
      then('it is refused as a constraint that names the limit', () => {
        expect(report.askAtDepth1.error?.name).toEqual('ConstraintError');
        expect(report.askAtDepth1.error?.message).toContain(
          'clone spawn depth limit reached',
        );
      });

      then('the refusal a caller reads matches the snapshot', () => {
        expect(report.askAtDepth1.error?.message).toMatchSnapshot();
      });

      then('the supplier never spawns a child', () => {
        expect(report.askAtDepth1.spawns).toEqual([]);
      });
    });

    when('[t3] a depth-1 caller calls act', () => {
      then('it is refused and the supplier never spawns a child', () => {
        expect(report.actAtDepth1.error?.name).toEqual('ConstraintError');
        expect(report.actAtDepth1.error?.message).toEqual(
          report.askAtDepth1.error?.message,
        );
        expect(report.actAtDepth1.spawns).toEqual([]);
      });
    });
  });
});
