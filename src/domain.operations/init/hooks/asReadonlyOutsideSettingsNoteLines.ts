import { relative } from 'node:path';

/**
 * .what = one `⚠️ left a read-only file outside the repo untouched` block per distinct target
 * .why = the human locked that file; the note says init reached it and wrote naught there.
 *   every actor's arrow reaches the one grove, so the block prints once per target, never once
 *   per actor or per role
 * .note = no target → no block; the caller prints naught
 */
export const asReadonlyOutsideSettingsNoteLines = (input: {
  repoPath: string;
  targets: { path: string; landsAt: string }[];
}): string[] => {
  // the first target per realpath; every other actor that reaches it is the same note
  const targetsDistinct = input.targets.filter(
    (target, index, all) =>
      all.findIndex((other) => other.landsAt === target.landsAt) === index,
  );
  return targetsDistinct.flatMap((target) => [
    '⚠️ left a read-only file outside the repo untouched',
    `   ├─ path = ${relative(input.repoPath, target.path)}`,
    `   ├─ lands at = ${target.landsAt} (read-only)`,
    "   └─ hint = naught to do; the actor's hooks live in its settings.of.repo.json, and rhachet never writes outside the repo",
    '',
  ]);
};
