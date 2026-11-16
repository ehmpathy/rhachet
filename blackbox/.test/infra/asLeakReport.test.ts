import { given, then, when } from 'test-fns';

import { asLeakReport } from './asLeakReport';

describe('asLeakReport', () => {
  given('[case1] a run that left processes alive', () => {
    when('[t0] two processes leaked', () => {
      const report = asLeakReport({
        runId: 'r7f3a91c2',
        leaked: [
          {
            pid: 101,
            command: 'node /repo/src/.test/assets/stubBrainCli.cjs',
            cwd: '/tmp/test-fns/rhachet/.temp/r7f3a91c2.rhachet-test-clone-flag.a1b2c3d4',
          },
          { pid: 102, command: 'node /repo/bin/run.jit enroll claude', cwd: null },
        ],
      });
      then('it opens with the qualified error header, since the test author must fix it', () => {
        expect(report).toContain('✋ ConstraintError: 2 processes outlived this acceptance run');
      });
      then('it prints the run id, so a pid with no cwd can still be matched to the run', () => {
        expect(report).toContain('each carries this run id (r7f3a91c2)');
      });
      then('it names each pid, with its cwd where the host shows one', () => {
        expect(report).toContain('├─ pid 101 = node /repo/src/.test/assets/stubBrainCli.cjs');
        expect(report).toContain('│  └─ cwd = /tmp/test-fns/rhachet/.temp/');
        expect(report).toContain('└─ pid 102');
      });
      then('it says the box is clean, and names the harness that owns a child', () => {
        expect(report).toContain('this run ended each one, so the box is clean');
        expect(report).toContain('spawn it via spawnRhachetCliBackground');
        expect(report).toMatchSnapshot();
      });
    });

    when('[t1] one process leaked', () => {
      then('the count reads singular', () => {
        const report = asLeakReport({
          runId: 'r7f3a91c2',
          leaked: [{ pid: 7, command: 'node x', cwd: null }],
        });
        expect(report).toContain('1 process outlived');
        expect(report).toContain('this run ended it, so the box is clean');
        expect(report).toContain('├─ it carries this run id (r7f3a91c2)');
        expect(report).not.toContain('each carries');
        expect(report).toContain('└─ to fix, the test that spawned it must own its child');
        expect(report).not.toContain('each one');
        expect(report).toMatchSnapshot();
      });
    });
  });
});
