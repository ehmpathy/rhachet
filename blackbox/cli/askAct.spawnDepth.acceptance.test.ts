import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = the reviewer-leaf refusal at the `rhachet ask` and `rhachet act` cli doors
 * .note = `rhx` routes `ask` and `act` to a skill lookup, so these doors are reached as
 *   `rhachet ask` / `rhachet act`; the refusal names them so, a command a reader can run
 * .why = both reach a repl brain through `actorAsk` / `actorAct`, the third spawn door.
 *   the units prove the op; this proves the contract a clone's tool shell actually calls
 *   (rule.require.test-coverage-by-grain)
 *
 * .rule = per the ehmpathy/rhachet#577 vision: every work clone may spawn one level below
 *   itself, at any depth; a reviewer clone is a leaf and may spawn no one. a repl brain's
 *   child is always a leaf
 *
 * .note = the fixture's repl brain is a stub that prints `REPL_STUB_RAN depth=<n> leaf=<m>`
 *   and calls no model, so a refusal is visible as the sentinel's absence, and a pass as its
 *   place in the chain
 * .note = the binary runs with no tty on stdin, as a clone's tool shell does
 */
describe('rhachet ask / rhachet act — a leaf caller refused, a work caller admitted (acceptance)', () => {
  const repo = useBeforeAll(async () =>
    genTestTempRepo({ fixture: 'with-repl-stub-config' }),
  );

  const argsAsk = [
    'ask',
    '--config',
    'repl-stub-config.mjs',
    '--role',
    'any',
    '--ask',
    'hi',
  ];
  const argsAct = [
    'act',
    '--config',
    'repl-stub-config.mjs',
    '--role',
    'any',
    '--skill',
    'stub',
  ];

  given('[case1] a reviewer caller — a leaf at depth 1', () => {
    when('[t0] it runs `rhachet ask`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: argsAsk,
          cwd: repo.path,
          env: { RHACHET_CLONE_DEPTH: '1', RHACHET_CLONE_LEAF: '1' },
          logOnError: false,
        }),
      );

      then('it exits 2, a constraint', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the reviewer and the repl door', () => {
        expect(result.stderr).toContain('a leaf clone may not spawn');
        expect(result.stderr).toContain(
          '`rhachet ask`, `rhachet act`',
        );
      });

      then('the brain never runs', () => {
        expect(result.stdout).not.toContain('REPL_STUB_RAN');
      });

      then('the refusal is locked to a snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] it runs `rhachet act`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: argsAct,
          cwd: repo.path,
          env: { RHACHET_CLONE_DEPTH: '1', RHACHET_CLONE_LEAF: '1' },
          logOnError: false,
        }),
      );

      then('it exits 2, a constraint', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the reviewer and the repl door', () => {
        expect(result.stderr).toContain('a leaf clone may not spawn');
        expect(result.stderr).toContain(
          '`rhachet ask`, `rhachet act`',
        );
      });

      then('the brain never runs', () => {
        expect(result.stdout).not.toContain('REPL_STUB_RAN');
      });

      then('the refusal is locked to a snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  // the stub prints its own env, so `leaf=1` there is the CHILD's mark: the repl door marks
  //   every child it spawns a leaf, whatever the caller carries
  given('[case2] a work caller at depth 1, with no leaf mark of its own', () => {
    // 🔴 the #577 case: a depth-1 work clone (a worker a top-level clone enrolled) runs its
    //   own reviews — depth refuses no one
    when('[t0] it runs `rhachet ask`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: argsAsk,
          cwd: repo.path,
          env: { RHACHET_CLONE_DEPTH: '1' },
          logOnError: false,
        }),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the brain runs at depth 2, marked a leaf', () => {
        expect(result.stdout).toContain('REPL_STUB_RAN depth=2 leaf=1');
      });

      then('the output is locked to a snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] it runs `rhachet act`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: argsAct,
          cwd: repo.path,
          env: { RHACHET_CLONE_DEPTH: '1' },
          logOnError: false,
        }),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the brain runs at depth 2, marked a leaf', () => {
        expect(result.stdout).toContain('REPL_STUB_RAN depth=2 leaf=1');
      });

      then('the output is locked to a snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3] a top-level caller at depth 0, with no leaf mark of its own', () => {
    when('[t0] it runs `rhachet ask`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: argsAsk,
          cwd: repo.path,
          env: { RHACHET_CLONE_DEPTH: '0' },
          logOnError: false,
        }),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the brain runs at depth 1, marked a leaf', () => {
        expect(result.stdout).toContain('REPL_STUB_RAN depth=1 leaf=1');
      });

      then('the output is locked to a snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] it runs `rhachet act`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: argsAct,
          cwd: repo.path,
          env: { RHACHET_CLONE_DEPTH: '0' },
          logOnError: false,
        }),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the brain runs at depth 1, marked a leaf', () => {
        expect(result.stdout).toContain('REPL_STUB_RAN depth=1 leaf=1');
      });

      then('the output is locked to a snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  // a raw `claude`'s own shell carries no depth var at all; the runner's own identity is
  //   stripped by the harness, so an empty env here is a truly unmarked caller
  given('[case4] an unmarked caller — no depth var, no leaf mark', () => {
    when('[t0] it runs `rhachet ask`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: argsAsk,
          cwd: repo.path,
          env: {},
          logOnError: false,
        }),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the brain runs at depth 1, marked a leaf — the absent var reads as 0', () => {
        expect(result.stdout).toContain('REPL_STUB_RAN depth=1 leaf=1');
      });
    });

    when('[t1] it runs `rhachet act`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: argsAct,
          cwd: repo.path,
          env: {},
          logOnError: false,
        }),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the brain runs at depth 1, marked a leaf — the absent var reads as 0', () => {
        expect(result.stdout).toContain('REPL_STUB_RAN depth=1 leaf=1');
      });
    });
  });
});
