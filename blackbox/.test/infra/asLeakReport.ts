import { asTreeBranchGlyphs } from './asTreeBranchGlyphs';

/**
 * .what = the report a run prints when it leaves a process alive
 * .why = a leak is a defect the test's author must fix: it turns the run red, names each process
 *   and the dir it ran in (a test's temp dir slug names the test), and names the harness that
 *   owns a child
 */
export const asLeakReport = (input: {
  runId: string;
  leaked: Array<{ pid: number; command: string; cwd: string | null }>;
}): string => {
  const count = input.leaked.length;
  return [
    `✋ ConstraintError: ${count} process${count === 1 ? '' : 'es'} outlived this acceptance run`,
    `   ├─ ${count === 1 ? 'it carries' : 'each carries'} this run id (${input.runId}), so a test of this run spawned it and did not end it`,
    '   ├─ leaked',
    ...input.leaked.flatMap((proc, index) => {
      const glyphs = asTreeBranchGlyphs({ index, total: count });
      const pidLine = `   │  ${glyphs.branch} pid ${proc.pid} = ${proc.command.slice(0, 160)}`;
      const cwdLines = proc.cwd === null ? [] : [`   │  ${glyphs.stem}└─ cwd = ${proc.cwd}`];
      return [pidLine, ...cwdLines];
    }),
    '   │',
    `   ├─ this run ended ${count === 1 ? 'it' : 'each one'}, so the box is clean`,
    `   └─ to fix, the test that spawned ${count === 1 ? 'it' : 'each one'} must own its child`,
    '      ├─ spawn it via spawnRhachetCliBackground, which ends its process group',
    "      └─ or end it in that test's own afterAll",
    '',
  ].join('\n');
};
