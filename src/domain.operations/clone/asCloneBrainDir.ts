import { join } from 'node:path';

/**
 * .what = the brain dir a clone writes its transcripts under: its ACTOR's brain dir,
 *         or `<home>/.claude` for a clone spawned before that brain dir was born
 *
 * .note = this SELECTS between two extant brain dirs; it mints none. a clone has no brain
 *   dir of its own (`rule.forbid.per-clone-config`), so the name says `brain dir` rather
 *   than `config dir` — there are exactly two kinds, the repo's and the actor's
 *   (`define.brain-dir-repo-vs-actor`)
 * .why = a clone alive across the upgrade still writes under `~/.claude`; its lazy
 *        history link must look there, or `rhx clone get` reads empty for it (D8)
 *
 * .note = a `brainDirBornAt` of 0 is an fs with no birth time → the brain dir
 */
export const asCloneBrainDir = (input: {
  brainDir: string;
  brainDirBornAt: number;
  spawnedAt: number;
  home: string;
}): string => {
  if (input.brainDirBornAt === 0) return input.brainDir;
  if (input.spawnedAt < input.brainDirBornAt)
    return join(input.home, '.claude');
  return input.brainDir;
};
