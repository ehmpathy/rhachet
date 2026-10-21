import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { spawnProbeBetween } from '../.test/infra/spawnProbeBetween';

/**
 * .what = the repl spawn door against the REAL installed anthropic supplier, stopped at the
 *   agent-sdk's spawn call: the env it hands the claude child carries the scoped depth and the
 *   leaf mark, and a reviewer (leaf) caller is refused before the supplier spawns
 * .why = the supplier spawns its brain with no `env` option, so the child boots with whatever
 *   the sdk copies from `process.env`. this suite reads that copy from the real sdk's own spawn
 *   call, counts the spawns, and checks the restore per call — facts a live boot cannot show.
 *   the sdk is esm, which jest cannot load, so a real node child drives it
 * .rule = per the ehmpathy/rhachet#577 vision: a work clone may spawn at any depth; a repl
 *   brain's child is a reviewer, a leaf, and may spawn no one
 * .note = an integration test: the probe (`probe.replDoorRealSupplier.cjs`) intercepts
 *   `child_process.spawn` alone, records the env, and throws, so no brain boots and no token is
 *   spent. the supplier, the agent-sdk and rhachet's scope all run for real. the live boot
 *   through the same door is `replDoorRealSupplier.realnode.acceptance.test.ts`
 * .note = the probe reaches genContextBrain through the built `rhachet/brains` contract
 *   (dist/contract/sdk.brains.js), the file a consumer resolves
 * .note = the probe runs with piped stdio, so it has no tty: the env vars are what it reads, as
 *   a brain's tool shell does
 */
describe('replDoorRealSupplier.realnode.integration', () => {
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
      leaf: string | null;
      serial: string | null;
      socket: string | null;
    }>;
    envAfter: {
      depth: string | null;
      leaf: string | null;
      serial: string | null;
      socket: string | null;
    };
  };

  given('[case1] the real anthropic repl, chosen through the contract', () => {
    const report = useBeforeAll(async () => {
      // the built artifact must exist; the integration tier runs after `npm run build`
      if (!existsSync(brainsContractDistPath))
        throw new ConstraintError(
          'built contract dist sdk.brains.js absent — run `npm run build` first',
          {
            brainsContractDistPath,
            hint: 'run `npm run build` first, then re-run the suite',
          },
        );

      return spawnProbeBetween<{
        choiceRepo: string | null;
        askAtDepth0: DoorRun;
        actAtDepth0: DoorRun;
        askAtDepth1Work: DoorRun;
        askAsLeaf: DoorRun;
        actAsLeaf: DoorRun;
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

      then('the claude child reads depth 1 and the leaf mark', () => {
        expect(report.askAtDepth0.spawns[0]?.depth).toEqual('1');
        expect(report.askAtDepth0.spawns[0]?.leaf).toEqual('1');
      });

      then('the claude child holds no parent serial and no parent socket', () => {
        expect(report.askAtDepth0.spawns[0]?.serial).toEqual(null);
        expect(report.askAtDepth0.spawns[0]?.socket).toEqual(null);
      });

      then('the caller env is restored after the call', () => {
        expect(report.askAtDepth0.envAfter).toEqual({
          depth: '0',
          leaf: null,
          serial: 'serial-parent',
          socket: '/tmp/socket-parent',
        });
      });
    });

    when('[t1] a depth-0 caller calls act', () => {
      then('the claude child reads depth 1, a leaf, with no parent serial', () => {
        expect(report.actAtDepth0.spawns).toHaveLength(1);
        expect(report.actAtDepth0.spawns[0]?.depth).toEqual('1');
        expect(report.actAtDepth0.spawns[0]?.leaf).toEqual('1');
        expect(report.actAtDepth0.spawns[0]?.serial).toEqual(null);
      });
    });

    when('[t2] a depth-1 WORK caller calls ask', () => {
      // 🔴 the #577 case: a worker clone runs its own review — depth refuses no one
      then('it is admitted, and its reviewer reads depth 2', () => {
        expect(report.askAtDepth1Work.spawns).toHaveLength(1);
        expect(report.askAtDepth1Work.spawns[0]?.depth).toEqual('2');
        expect(report.askAtDepth1Work.spawns[0]?.leaf).toEqual('1');
      });

      then('no refusal fires — the only error is the probe intercept', () => {
        expect(report.askAtDepth1Work.error?.message ?? '').not.toContain(
          'a leaf clone may not spawn',
        );
      });
    });

    when('[t3] a reviewer (leaf) caller calls ask', () => {
      then('it is refused as a constraint that names the reviewer', () => {
        expect(report.askAsLeaf.error?.name).toEqual('ConstraintError');
        expect(report.askAsLeaf.error?.message).toContain(
          'a leaf clone may not spawn',
        );
      });

      then('the refusal a caller reads matches the snapshot', () => {
        expect(report.askAsLeaf.error?.message).toMatchSnapshot();
      });

      then('the supplier never spawns a child', () => {
        expect(report.askAsLeaf.spawns).toEqual([]);
      });
    });

    when('[t4] a reviewer (leaf) caller calls act', () => {
      then('it is refused and the supplier never spawns a child', () => {
        expect(report.actAsLeaf.error?.name).toEqual('ConstraintError');
        expect(report.actAsLeaf.error?.message).toEqual(
          report.askAsLeaf.error?.message,
        );
        expect(report.actAsLeaf.spawns).toEqual([]);
      });
    });
  });
});
