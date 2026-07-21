/**
 * .what = slices the deterministic incremental summary block from CLI stdout
 * .why = the add-path also prints link/init output that embeds volatile parts
 *        (package version, brief/skill counts, a timestamped backup filename), so
 *        a full-stdout snapshot would be flaky; the "🔧 init roles (incremental)"
 *        summary tree (plus any keys/hooks output that follows) is deterministic and
 *        is the incremental output contract
 *
 * .note = masks the temp dir so the snapshot is stable across runs. shared by the
 *   init.incremental and rhx-alias acceptance suites (rule.require.shared-test-fixtures)
 */
export const asSummaryBlock = (input: {
  stdout: string;
  dir: string;
}): string => {
  const marker = '🔧 init roles (incremental)';
  const start = input.stdout.indexOf(marker);
  const block = start === -1 ? input.stdout : input.stdout.slice(start);
  return block.split(input.dir).join('$TESTDIR');
};
